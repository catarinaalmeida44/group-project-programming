// Accounts: the rules for signing up, signing in, staying signed in, saving
// race results and reading the leaderboard.
//
// This file decides. It does not talk to the internet (that is api.js) and
// it does not write database questions (that is store.js). It is handed a
// "store" and a clock, so the tests can give it a pretend store and move
// the clock forward by ten minutes or seven days in an instant.
//
// HOW STAYING SIGNED IN WORKS
// After a correct password the server makes up a long random "ticket" and
// gives it to the browser in a cookie. The browser sends it back with every
// later request, and that is how the server knows who is asking. The server
// keeps only a scrambled copy of the ticket: someone who could read our
// database would still not be able to use anyone's ticket. A ticket stops
// working after seven days, or at once when the player signs out.

import { createHash, randomBytes } from "node:crypto";
import { checkUsername, checkPassword, usernameKey, PASSWORD_MAX } from "../shared/account-rules.js";
import { hashPassword, passwordMatches, pretendToCheck } from "./passwords.js";

export const SESSION_DAYS = 7;
/** After this many wrong passwords in a row, the account is locked for a while. */
export const WRONG_PASSWORDS_ALLOWED = 5;
export const LOCK_MINUTES = 10;
/** How many players the leaderboard shows. */
export const LEADERBOARD_SIZE = 10;
/**
 * The leaderboard of a track is reused for this long, so that many visitors
 * do not become many questions to the database. It is thrown away at once
 * when a new result is saved or an account is deleted.
 */
export const LEADERBOARD_FRESH_MS = 30_000;

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const no = (code, message) => ({ ok: false, code, message });
// The same answer for a name that does not exist and for a wrong password,
// so that trying names does not reveal which ones are taken.
const WRONG_LOGIN = no("wrong_login", "Wrong user name or password.");

/** The scrambled form of a ticket, which is what we keep. */
function scrambleTicket(ticket) {
  return createHash("sha256").update(ticket).digest("hex");
}

/** Does this look like a ticket we could have made? Saves asking the database about rubbish. */
function looksLikeATicket(ticket) {
  return typeof ticket === "string" && /^[A-Za-z0-9_-]{40,50}$/.test(ticket);
}

/** A whole number of steps we are willing to save: more than zero and not absurdly large. */
function isSteps(value) {
  return Number.isSafeInteger(value) && value > 0 && value < 60 * 60 * 60 * 24; // under a day of game time
}

/**
 * Makes the account rules.
 *   store      where players, sessions and results are kept (store.js)
 *   now        the clock. Only the tests change it
 *   passwords  how passwords are scrambled and checked. Only the tests change
 *              it, for a quick pretend scrambler: the real one is slow on
 *              purpose, and has tests of its own
 */
export function createAccounts(
  store,
  { now = Date.now, passwords = { hash: hashPassword, matches: passwordMatches, pretend: pretendToCheck } } = {},
) {
  const boards = new Map(); // track -> { at, races, laps }: the leaderboards read a moment ago
  let tablesReady = null; //   a promise, so the tables are only created once

  /**
   * Makes sure the database tables exist before the first question. If the
   * database could not be reached, it is tried again at the next question,
   * so a database that was asleep when the server started is no problem.
   */
  function ready() {
    if (tablesReady === null) {
      tablesReady = store.ensureTables().catch((error) => {
        tablesReady = null;
        throw error;
      });
    }
    return tablesReady;
  }

  /** The ten fastest races and laps of a track, read from the database at most once in a while. */
  async function boardOf(track) {
    const kept = boards.get(track);
    if (kept !== undefined && now() - kept.at < LEADERBOARD_FRESH_MS) {
      return kept;
    }
    const ranked = (rows) => rows.map((row, index) => ({ rank: index + 1, username: row.username, steps: row.steps }));
    const fresh = {
      at: now(),
      races: ranked(await store.bestRaces(track, LEADERBOARD_SIZE)),
      laps: ranked(await store.bestLaps(track, LEADERBOARD_SIZE)),
    };
    boards.set(track, fresh);
    return fresh;
  }

  function lockedAnswer(lockedUntil) {
    const minutes = Math.max(1, Math.ceil((lockedUntil - now()) / MINUTE_MS));
    return no("locked", `Too many wrong passwords. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`);
  }

  /**
   * Checks a password for a player we already found. Counts wrong tries and
   * locks the account after too many. Gives null if the password is right,
   * or the answer to send back if it is not.
   */
  async function refuseUnlessPasswordIsRight(player, password) {
    if (player.lockedUntil !== null && player.lockedUntil > now()) {
      return lockedAnswer(player.lockedUntil); // locked: not even the right password works
    }
    if (await passwords.matches(password, player.passwordHash)) {
      if (player.failedLogins > 0 || player.lockedUntil !== null) {
        await store.clearFailedLogins(player.id);
      }
      return null;
    }
    const wrongTries = await store.addFailedLogin(player.id);
    if (wrongTries >= WRONG_PASSWORDS_ALLOWED) {
      const lockedUntil = now() + LOCK_MINUTES * MINUTE_MS;
      await store.lockPlayer(player.id, lockedUntil);
      return lockedAnswer(lockedUntil);
    }
    return WRONG_LOGIN;
  }

  return {
    /** Creates the database tables if needed. Run when the server starts, and again by itself before any question if that failed. */
    ensureTables: ready,

    /**
     * Makes a new account. Gives { ok: true, player: { id, username } }, or
     * { ok: false, code, message } when the name or the password breaks the
     * rules or the name is taken.
     */
    async signUp(username, password) {
      const nameProblem = checkUsername(username);
      if (nameProblem !== null) {
        return no("invalid_username", nameProblem);
      }
      const passwordProblem = checkPassword(password);
      if (passwordProblem !== null) {
        return no("invalid_password", passwordProblem);
      }
      await ready();
      const passwordHash = await passwords.hash(password);
      const player = await store.addPlayer({ username, usernameKey: usernameKey(username), passwordHash });
      if (player === null) {
        return no("username_taken", "Someone already has that user name. Choose another one.");
      }
      return { ok: true, player };
    },

    /** Checks a user name and password. Gives { ok: true, player } or { ok: false, code, message }. */
    async logIn(username, password) {
      // A name or password that could never have been accepted at sign-up
      // cannot be right. No need to ask the database or to scramble anything.
      if (
        checkUsername(username) !== null ||
        typeof password !== "string" ||
        password.length === 0 ||
        password.length > PASSWORD_MAX
      ) {
        return WRONG_LOGIN;
      }
      await ready();
      const player = await store.findPlayerByKey(usernameKey(username));
      if (player === null) {
        await passwords.pretend(password); // take as long as a real check would
        return WRONG_LOGIN;
      }
      const refusal = await refuseUnlessPasswordIsRight(player, password);
      return refusal ?? { ok: true, player: { id: player.id, username: player.username } };
    },

    /** Makes a ticket for a player who just signed in, and gives it back to be put in a cookie. */
    async startSession(playerId) {
      const ticket = randomBytes(32).toString("base64url");
      await ready();
      await store.deleteExpiredSessions(now()); // tidy up old ones while we are here
      await store.addSession({
        tokenHash: scrambleTicket(ticket),
        playerId,
        expiresAt: now() + SESSION_DAYS * DAY_MS,
      });
      return ticket;
    },

    /** Whose ticket is this? Gives { id, username }, or null for no ticket, an unknown one or one that has run out. */
    async playerForSession(ticket) {
      if (!looksLikeATicket(ticket)) {
        return null;
      }
      const tokenHash = scrambleTicket(ticket);
      await ready();
      const session = await store.findSession(tokenHash);
      if (session === null) {
        return null;
      }
      if (session.expiresAt <= now()) {
        await store.deleteSession(tokenHash);
        return null;
      }
      const player = await store.findPlayerById(session.playerId);
      return player === null ? null : { id: player.id, username: player.username };
    },

    /** Signs out: the ticket stops working at once. */
    async endSession(ticket) {
      if (looksLikeATicket(ticket)) {
        await ready();
        await store.deleteSession(scrambleTicket(ticket));
      }
    },

    /**
     * Deletes a player's account with all their sessions and results. The
     * password is checked again, with the same lock after too many wrong tries.
     */
    async deleteAccount(playerId, password) {
      await ready();
      const player = await store.findPlayerById(playerId);
      if (player === null) {
        return no("not_signed_in", "You are not signed in.");
      }
      if (typeof password !== "string" || password.length === 0 || password.length > PASSWORD_MAX) {
        return no("wrong_login", "That is not your password.");
      }
      const refusal = await refuseUnlessPasswordIsRight(player, password);
      if (refusal !== null) {
        return refusal.code === "wrong_login" ? no("wrong_login", "That is not your password.") : refusal;
      }
      await store.deletePlayer(playerId);
      boards.clear(); // their times must leave every leaderboard at once
      return { ok: true };
    },

    /**
     * Saves the result of a race the server ran. Only server code calls
     * this: there is no way for a browser to send a result. Says false, and
     * saves nothing, for numbers that cannot be a real result.
     */
    async saveResult({ playerId, track, raceSteps, bestLapSteps, position }) {
      const sensible =
        Number.isSafeInteger(playerId) &&
        typeof track === "string" &&
        track.length > 0 &&
        isSteps(raceSteps) &&
        isSteps(bestLapSteps) &&
        bestLapSteps <= raceSteps &&
        Number.isSafeInteger(position) &&
        position >= 1 &&
        position <= 100;
      if (!sensible) {
        return false;
      }
      await ready();
      await store.addResult({ playerId, track, mode: "online", raceSteps, bestLapSteps, position });
      boards.delete(track); // the next visitor of this leaderboard sees the new result
      return true;
    },

    /**
     * The leaderboard of one track:
     *   races, laps  the ten fastest, one row per player: [{ rank, username, steps }]
     *   mine         the asking player's own best and rank, or null
     * Only user names and times leave this function. Nothing else about a
     * player is ever shown to others.
     */
    async leaderboard(track, playerId = null) {
      await ready();
      const { races, laps } = await boardOf(track);
      let mine = null;
      if (playerId !== null) {
        const best = await store.myBest(track, playerId);
        if (best.race !== null && best.lap !== null) {
          mine = {
            raceRank: best.race.rank,
            raceSteps: best.race.steps,
            lapRank: best.lap.rank,
            lapSteps: best.lap.steps,
          };
        }
      }
      return { races, laps, mine };
    },
  };
}
