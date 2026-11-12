// Tests for server/accounts.js: the rules for signing up, signing in,
// staying signed in, deleting an account, saving results and the leaderboard.
//
// They use a pretend store kept in memory, a pretend clock that the tests
// move forward by hand, and a quick pretend password scrambler (the real one
// is slow on purpose, and is tested in passwords.test.js).

import { describe, it, expect, beforeEach } from "vitest";
import {
  createAccounts,
  SESSION_DAYS,
  WRONG_PASSWORDS_ALLOWED,
  LOCK_MINUTES,
  LEADERBOARD_SIZE,
} from "../server/accounts.js";
import { createMemoryStore } from "./memory-store.js";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

let store;
let accounts;
let time; //           what the pretend clock says, in milliseconds
let pretendChecks; //  how often the "take as long as a real check" work was done

beforeEach(() => {
  store = createMemoryStore();
  time = 1_800_000_000_000;
  pretendChecks = 0;
  accounts = createAccounts(store, {
    now: () => time,
    passwords: {
      hash: async (password) => `scrambled(${password})`,
      matches: async (password, stored) => stored === `scrambled(${password})`,
      pretend: async () => {
        pretendChecks++;
      },
    },
  });
});

/** Makes an account and gives back the player. */
async function signUp(username = "Ana", password = "12345678") {
  const answer = await accounts.signUp(username, password);
  expect(answer.ok, JSON.stringify(answer)).toBe(true);
  return answer.player;
}

/** Tries a wrong password a number of times and gives the last answer. */
async function wrongPasswords(times, username = "Ana") {
  let answer;
  for (let attempt = 0; attempt < times; attempt++) {
    answer = await accounts.logIn(username, "wrong-password");
  }
  return answer;
}

describe("signing up", () => {
  it("makes an account that can then sign in", async () => {
    const player = await signUp("Ana", "12345678");
    expect(player.username).toBe("Ana");
    const answer = await accounts.logIn("Ana", "12345678");
    expect(answer).toEqual({ ok: true, player: { id: player.id, username: "Ana" } });
  });

  it("keeps a scrambled password, never the password itself", async () => {
    const real = createAccounts(store); // with the real scrambler, once
    await real.signUp("Bea", "a real password 123");
    const kept = (await store.findPlayerByKey("bea")).passwordHash;
    expect(kept).not.toContain("a real password 123");
    expect(kept.startsWith("scrypt$")).toBe(true);
    expect((await real.logIn("Bea", "a real password 123")).ok).toBe(true);
    expect((await real.logIn("Bea", "a real password 124")).ok).toBe(false);
  });

  it("refuses a user name that breaks the rules, and says why", async () => {
    for (const name of ["ab", "x".repeat(17), "ana maria", "<script>", "", undefined, 42]) {
      const answer = await accounts.signUp(name, "12345678");
      expect(answer.ok, String(name)).toBe(false);
      expect(answer.code).toBe("invalid_username");
      expect(answer.message.length).toBeGreaterThan(10);
    }
  });

  it("refuses a password that is too short, too long or not text", async () => {
    for (const password of ["1234567", "", "x".repeat(201), undefined, 12345678]) {
      const answer = await accounts.signUp("Ana", password);
      expect(answer.ok).toBe(false);
      expect(answer.code).toBe("invalid_password");
    }
    expect(await store.findPlayerByKey("ana")).toBe(null); // nothing was created
  });

  it("refuses a name that is taken, also when only the capitals differ", async () => {
    await signUp("Ana");
    for (const name of ["Ana", "ana", "ANA"]) {
      const answer = await accounts.signUp(name, "another-password");
      expect(answer.code, name).toBe("username_taken");
    }
    // The first account still has its own password.
    expect((await accounts.logIn("Ana", "12345678")).ok).toBe(true);
    expect((await accounts.logIn("Ana", "another-password")).ok).toBe(false);
  });

  it("lets exactly one win when two sign up with the same name at the same moment", async () => {
    const both = await Promise.all([accounts.signUp("Twin", "12345678"), accounts.signUp("twin", "87654321")]);
    expect(both.filter((answer) => answer.ok)).toHaveLength(1);
    expect(both.find((answer) => !answer.ok).code).toBe("username_taken");
  });
});

describe("signing in", () => {
  beforeEach(() => signUp("Ana", "12345678"));

  it("accepts the right password, whatever capitals the name is typed in", async () => {
    expect((await accounts.logIn("ana", "12345678")).ok).toBe(true);
    expect((await accounts.logIn("ANA", "12345678")).player.username).toBe("Ana"); // shown as its owner typed it
  });

  it("gives exactly the same answer for a wrong password and for a name that does not exist", async () => {
    const wrongPassword = await accounts.logIn("Ana", "wrong-password");
    const noSuchName = await accounts.logIn("Nobody", "12345678");
    expect(wrongPassword).toEqual({ ok: false, code: "wrong_login", message: "Wrong user name or password." });
    expect(noSuchName).toEqual(wrongPassword);
  });

  it("takes as long for a name that does not exist as for a real one", async () => {
    await accounts.logIn("Nobody", "12345678");
    expect(pretendChecks).toBe(1); // the same amount of scrambling work was done and thrown away
    await accounts.logIn("Ana", "wrong-password");
    expect(pretendChecks).toBe(1); // a real check needs no pretending
  });

  it("refuses a password that only differs in capitals or a space", async () => {
    await signUp("Rui", "Secret Pass");
    for (const password of ["secret pass", "Secret Pass ", " Secret Pass", "SecretPass"]) {
      expect((await accounts.logIn("Rui", password)).ok, password).toBe(false);
    }
  });

  it("says 'wrong' at once to names and passwords that could never be right", async () => {
    const nonsense = [
      ["a", "12345678"],
      ["ana'; DROP TABLE players; --", "12345678"],
      [undefined, "12345678"],
      ["Ana", ""],
      ["Ana", undefined],
      ["Ana", 12345678],
      ["Ana", "x".repeat(201)],
      [{}, []],
    ];
    for (const [name, password] of nonsense) {
      expect((await accounts.logIn(name, password)).code).toBe("wrong_login");
    }
    expect(pretendChecks).toBe(0);
    expect((await store.findPlayerByKey("ana")).failedLogins).toBe(0); // none of that counted against Ana
  });
});

describe("too many wrong passwords", () => {
  beforeEach(() => signUp("Ana", "12345678"));

  it("allows four wrong tries, and locks the account at the fifth", async () => {
    expect((await wrongPasswords(WRONG_PASSWORDS_ALLOWED - 1)).code).toBe("wrong_login");
    expect((await accounts.logIn("Ana", "wrong-password")).code).toBe("locked");
    expect(WRONG_PASSWORDS_ALLOWED).toBe(5);
  });

  it("refuses even the right password while the account is locked, and says how long to wait", async () => {
    await wrongPasswords(WRONG_PASSWORDS_ALLOWED);
    const answer = await accounts.logIn("Ana", "12345678");
    expect(answer.ok).toBe(false);
    expect(answer.code).toBe("locked");
    expect(answer.message).toBe("Too many wrong passwords. Try again in 10 minutes.");
    expect(LOCK_MINUTES).toBe(10);
  });

  it("counts the waiting time down, and never says zero minutes", async () => {
    await wrongPasswords(WRONG_PASSWORDS_ALLOWED);
    time += 6.5 * MINUTE;
    expect((await accounts.logIn("Ana", "12345678")).message).toContain("in 4 minutes");
    time += 3.4 * MINUTE;
    expect((await accounts.logIn("Ana", "12345678")).message).toContain("in 1 minute.");
  });

  it("does not make the wait longer when someone keeps trying during the lock", async () => {
    await wrongPasswords(WRONG_PASSWORDS_ALLOWED);
    time += 5 * MINUTE;
    await wrongPasswords(20);
    time += 5 * MINUTE; // ten minutes after the lock began
    expect((await accounts.logIn("Ana", "12345678")).ok).toBe(true);
  });

  it("opens again after ten minutes, with a fresh count", async () => {
    await wrongPasswords(WRONG_PASSWORDS_ALLOWED);
    time += LOCK_MINUTES * MINUTE - 1;
    expect((await accounts.logIn("Ana", "12345678")).code).toBe("locked");
    time += 1;
    expect((await accounts.logIn("Ana", "12345678")).ok).toBe(true);
    expect((await wrongPasswords(WRONG_PASSWORDS_ALLOWED - 1)).code).toBe("wrong_login"); // four more are allowed again
  });

  it("starts the count again after a correct password", async () => {
    await wrongPasswords(WRONG_PASSWORDS_ALLOWED - 1);
    expect((await accounts.logIn("Ana", "12345678")).ok).toBe(true);
    expect((await wrongPasswords(WRONG_PASSWORDS_ALLOWED - 1)).code).toBe("wrong_login");
  });

  it("locks only the account that was attacked", async () => {
    await signUp("Rui", "rui-password");
    await wrongPasswords(WRONG_PASSWORDS_ALLOWED, "Ana");
    expect((await accounts.logIn("Rui", "rui-password")).ok).toBe(true);
  });
});

describe("staying signed in", () => {
  let ana;
  beforeEach(async () => {
    ana = await signUp("Ana", "12345678");
  });

  it("gives a ticket that says who the player is", async () => {
    const ticket = await accounts.startSession(ana.id);
    expect(await accounts.playerForSession(ticket)).toEqual({ id: ana.id, username: "Ana" });
  });

  it("makes long tickets that are different every time", async () => {
    const tickets = new Set();
    for (let i = 0; i < 20; i++) {
      const ticket = await accounts.startSession(ana.id);
      expect(ticket).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 random bytes
      tickets.add(ticket);
    }
    expect(tickets.size).toBe(20);
  });

  it("keeps only a scrambled copy of the ticket", async () => {
    const ticket = await accounts.startSession(ana.id);
    expect(await store.findSession(ticket)).toBe(null); // the ticket itself is not what is stored
    expect(store.countSessions()).toBe(1);
  });

  it("gives nobody for no ticket, a made-up ticket or rubbish", async () => {
    await accounts.startSession(ana.id);
    const madeUp = "A".repeat(43);
    for (const ticket of [undefined, null, "", "abc", madeUp, "x".repeat(5000), 12345, {}, "../../etc/passwd", "a b c"]) {
      expect(await accounts.playerForSession(ticket)).toBe(null);
    }
  });

  it("stops working after seven days, to the millisecond", async () => {
    const ticket = await accounts.startSession(ana.id);
    time += SESSION_DAYS * DAY - 1;
    expect(await accounts.playerForSession(ticket)).not.toBe(null);
    time += 1;
    expect(await accounts.playerForSession(ticket)).toBe(null);
    expect(store.countSessions()).toBe(0); // and it was thrown away
    expect(SESSION_DAYS).toBe(7);
  });

  it("stops working at once when the player signs out, on that browser only", async () => {
    const laptop = await accounts.startSession(ana.id);
    const phone = await accounts.startSession(ana.id);
    await accounts.endSession(laptop);
    expect(await accounts.playerForSession(laptop)).toBe(null);
    expect(await accounts.playerForSession(phone)).not.toBe(null);
  });

  it("does not mind signing out with no ticket or a made-up one", async () => {
    const ticket = await accounts.startSession(ana.id);
    for (const rubbish of [undefined, "", "abc", "B".repeat(43)]) {
      await accounts.endSession(rubbish);
    }
    expect(await accounts.playerForSession(ticket)).not.toBe(null);
  });

  it("tidies away tickets that have run out when someone signs in", async () => {
    await accounts.startSession(ana.id);
    await accounts.startSession(ana.id);
    time += SESSION_DAYS * DAY + 1;
    await accounts.startSession(ana.id);
    expect(store.countSessions()).toBe(1);
  });
});

describe("deleting an account", () => {
  let ana;
  beforeEach(async () => {
    ana = await signUp("Ana", "12345678");
  });

  it("removes the account, its tickets and its results, and frees the name", async () => {
    const ticket = await accounts.startSession(ana.id);
    await accounts.saveResult({ playerId: ana.id, track: "campus-loop", raceSteps: 1800, bestLapSteps: 590, position: 1 });

    expect(await accounts.deleteAccount(ana.id, "12345678")).toEqual({ ok: true });

    expect(await accounts.playerForSession(ticket)).toBe(null);
    expect((await accounts.logIn("Ana", "12345678")).code).toBe("wrong_login");
    expect((await accounts.leaderboard("campus-loop")).races).toEqual([]);
    expect(store.countResults()).toBe(0);
    expect((await accounts.signUp("Ana", "a-new-password")).ok).toBe(true);
  });

  it("refuses without the right password, and keeps everything", async () => {
    for (const password of ["wrong-password", "", undefined, "x".repeat(201)]) {
      const answer = await accounts.deleteAccount(ana.id, password);
      expect(answer).toEqual({ ok: false, code: "wrong_login", message: "That is not your password." });
    }
    expect((await accounts.logIn("Ana", "12345678")).ok).toBe(true);
  });

  it("locks after five wrong passwords, like signing in", async () => {
    let answer;
    for (let attempt = 0; attempt < WRONG_PASSWORDS_ALLOWED; attempt++) {
      answer = await accounts.deleteAccount(ana.id, "wrong-password");
    }
    expect(answer.code).toBe("locked");
    expect((await accounts.deleteAccount(ana.id, "12345678")).code).toBe("locked");
    expect((await store.findPlayerById(ana.id)).username).toBe("Ana");
  });

  it("only ever deletes the player it was asked about", async () => {
    const rui = await signUp("Rui", "rui-password");
    await accounts.deleteAccount(ana.id, "12345678");
    expect((await accounts.logIn("Rui", "rui-password")).ok).toBe(true);
    // And Ana's password does not delete Rui's account.
    expect((await accounts.deleteAccount(rui.id, "12345678")).code).toBe("wrong_login");
  });

  it("says 'not signed in' for a player who does not exist", async () => {
    expect((await accounts.deleteAccount(999999, "12345678")).code).toBe("not_signed_in");
  });
});

describe("saving a race result", () => {
  let ana;
  beforeEach(async () => {
    ana = await signUp("Ana", "12345678");
  });

  it("saves the result of a finished race", async () => {
    const saved = await accounts.saveResult({ playerId: ana.id, track: "campus-loop", raceSteps: 1800, bestLapSteps: 590, position: 2 });
    expect(saved).toBe(true);
    expect((await accounts.leaderboard("campus-loop")).races).toEqual([{ rank: 1, username: "Ana", steps: 1800 }]);
  });

  it("refuses numbers that cannot be a real result, and saves nothing", async () => {
    const good = { playerId: ana.id, track: "campus-loop", raceSteps: 1800, bestLapSteps: 590, position: 1 };
    const impossible = [
      { raceSteps: 0 },
      { raceSteps: -5 },
      { raceSteps: 1800.5 },
      { raceSteps: NaN },
      { raceSteps: Infinity },
      { raceSteps: "1800" },
      { raceSteps: 60 * 60 * 60 * 24 }, //     a whole day
      { bestLapSteps: 0 },
      { bestLapSteps: 1801 }, //               a lap longer than the whole race
      { position: 0 },
      { position: 1.5 },
      { position: 101 },
      { track: "" },
      { track: undefined },
      { playerId: "1" },
      { playerId: undefined },
    ];
    for (const change of impossible) {
      expect(await accounts.saveResult({ ...good, ...change }), JSON.stringify(change)).toBe(false);
    }
    expect(store.countResults()).toBe(0);
  });
});

describe("the leaderboard", () => {
  /** Makes a number of players, each with one race. Player 1 is the fastest. */
  async function race(players, track = "campus-loop") {
    const made = [];
    for (let number = 1; number <= players; number++) {
      const player = await signUp(`Player_${number}`, "12345678");
      await accounts.saveResult({
        playerId: player.id,
        track,
        raceSteps: 1000 + number * 10,
        bestLapSteps: 400 - number,
        position: number,
      });
      made.push(player);
    }
    return made;
  }

  it("is empty before anyone has raced", async () => {
    expect(await accounts.leaderboard("campus-loop")).toEqual({ races: [], laps: [], mine: null });
  });

  it("numbers the rows from 1, fastest first", async () => {
    await race(3);
    const board = await accounts.leaderboard("campus-loop");
    expect(board.races).toEqual([
      { rank: 1, username: "Player_1", steps: 1010 },
      { rank: 2, username: "Player_2", steps: 1020 },
      { rank: 3, username: "Player_3", steps: 1030 },
    ]);
    // In this pretend race the later players have the faster laps.
    expect(board.laps.map((row) => row.username)).toEqual(["Player_3", "Player_2", "Player_1"]);
  });

  it("shows the ten fastest and no more", async () => {
    await race(12);
    const board = await accounts.leaderboard("campus-loop");
    expect(board.races).toHaveLength(LEADERBOARD_SIZE);
    expect(board.laps).toHaveLength(LEADERBOARD_SIZE);
    expect(LEADERBOARD_SIZE).toBe(10);
    expect(board.races.at(-1).username).toBe("Player_10");
  });

  it("shows a player once, with their best time, however often they raced", async () => {
    const [ana] = await race(1);
    for (const raceSteps of [1500, 900, 1200]) {
      await accounts.saveResult({ playerId: ana.id, track: "campus-loop", raceSteps, bestLapSteps: 300, position: 1 });
    }
    expect((await accounts.leaderboard("campus-loop")).races).toEqual([{ rank: 1, username: "Player_1", steps: 900 }]);
  });

  it("keeps each track apart", async () => {
    await race(2, "campus-loop");
    expect((await accounts.leaderboard("test-oval")).races).toEqual([]);
  });

  it("tells a signed-in player their own best and rank, even outside the top ten", async () => {
    const players = await race(12);
    const twelfth = players[11];
    const board = await accounts.leaderboard("campus-loop", twelfth.id);
    expect(board.mine).toEqual({ raceRank: 12, raceSteps: 1120, lapRank: 1, lapSteps: 388 });
    expect(board.races.some((row) => row.username === "Player_12")).toBe(false);
  });

  it("tells nothing about 'mine' to a guest, or to a player with no result on that track", async () => {
    const [first] = await race(2);
    expect((await accounts.leaderboard("campus-loop")).mine).toBe(null);
    expect((await accounts.leaderboard("test-oval", first.id)).mine).toBe(null);
    const newcomer = await signUp("Newcomer", "12345678");
    expect((await accounts.leaderboard("campus-loop", newcomer.id)).mine).toBe(null);
  });

  it("lets nothing but ranks, names and times out", async () => {
    await race(2);
    const board = await accounts.leaderboard("campus-loop");
    for (const row of [...board.races, ...board.laps]) {
      expect(Object.keys(row).sort()).toEqual(["rank", "steps", "username"]);
    }
    expect(JSON.stringify(board)).not.toContain("scrambled");
  });
});
