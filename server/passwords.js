// Passwords: how they are kept, and how one is checked.
//
// We never keep a password. We keep a "hash" of it: the result of putting
// the password through a one-way scrambler. From the hash nobody can work
// the password back out, not even us. To check a password at sign-in we
// scramble what was typed in the same way and compare the two results.
//
// The scrambler is "scrypt", which comes with Node.js. It is slow and uses
// a lot of memory on purpose: someone who stole our database would have to
// spend that time and memory again for every guess at every password.
//
// Each password also gets its own random "salt", mixed in before scrambling.
// Two players with the same password therefore get different hashes, and a
// ready-made list of scrambled common passwords is useless against us.
//
// WHAT IS STORED, as one line of text:
//     scrypt$32768$8$1$<salt>$<hash>
// The three numbers are how hard the scrambling was. They are stored with
// every hash, so we can make new ones harder later and still check old ones.

import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";

const COST = 32768; //     how many rounds of work (must be a power of two)
const BLOCK_SIZE = 8; //   how much memory each round uses
const PARALLEL = 1;
const HASH_BYTES = 64;
const SALT_BYTES = 16;
// scrypt needs about 128 * COST * BLOCK_SIZE bytes of memory: 32 MB here.
// Node.js refuses more than 32 MB unless told it is allowed.
const MEMORY_ALLOWED = 64 * 1024 * 1024;

/** Runs scrypt, as a promise. It runs beside the game, so races are not held up while it works. */
function scramble(password, salt, cost, blockSize, parallel, bytes) {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      bytes,
      { N: cost, r: blockSize, p: parallel, maxmem: MEMORY_ALLOWED },
      (error, hash) => (error ? reject(error) : resolve(hash)),
    );
  });
}

/** Turns a password into the line of text we store. */
export async function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scramble(password, salt, COST, BLOCK_SIZE, PARALLEL, HASH_BYTES);
  return ["scrypt", COST, BLOCK_SIZE, PARALLEL, salt.toString("base64"), hash.toString("base64")].join("$");
}

/**
 * Is this the password that was stored? Gives true or false, never an error:
 * a stored line that is damaged or of an unknown kind is simply "no".
 */
export async function passwordMatches(password, stored) {
  if (typeof password !== "string" || typeof stored !== "string") {
    return false;
  }
  const [kind, cost, blockSize, parallel, salt, hash] = stored.split("$");
  const numbers = [Number(cost), Number(blockSize), Number(parallel)];
  if (kind !== "scrypt" || !numbers.every((number) => Number.isInteger(number) && number > 0)) {
    return false;
  }
  // Refuse settings far harder than ours: a damaged line must not make the server work for minutes.
  if (numbers[0] > COST * 4 || numbers[1] > BLOCK_SIZE * 2 || numbers[2] > 4) {
    return false;
  }
  try {
    const expected = Buffer.from(hash ?? "", "base64");
    if (expected.length === 0) {
      return false;
    }
    const actual = await scramble(password, Buffer.from(salt ?? "", "base64"), ...numbers, expected.length);
    // Compare in a way that takes the same time whether the first or the
    // last byte differs, so the time taken tells an attacker nothing.
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Does the same amount of work as checking a password, and throws the
 * result away. Used when someone signs in with a user name that does not
 * exist: answering faster in that case would reveal which names are taken.
 */
export async function pretendToCheck(password) {
  await scramble(String(password), Buffer.alloc(SALT_BYTES), COST, BLOCK_SIZE, PARALLEL, HASH_BYTES).catch(() => {});
}
