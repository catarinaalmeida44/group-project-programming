// Tests for server/store.js against the REAL database.
//
// Like db-live.test.js, they only run when the secret address of the
// database is available:
//
//     npm run test:database
//
// With plain "npm test", and on GitHub, there is no address and they are
// skipped. Nothing here ever prints the address.
//
// They NEVER touch the real players, sessions or results. Every table they
// use has a name that starts with "test_", and is removed at the end. The
// store itself refuses to remove tables without such a prefix.
//
// The checks are the same list that runs on the pretend store in
// store.test.js (store-contract.js). Passing both is what lets us trust
// the quick tests that use the pretend store.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { describeAStore } from "./store-contract.js";
import { createStore } from "../server/store.js";
import { createAccounts } from "../server/accounts.js";

const address = process.env.DATABASE_URL;
const haveDatabase = typeof address === "string" && address.trim() !== "";
const WAIT = 30_000; // the free database may be asleep and need a moment to wake

if (haveDatabase) {
  const pool = new pg.Pool({ connectionString: address, max: 3, connectionTimeoutMillis: 10_000 });
  afterAll(async () => {
    await pool.end();
  }, WAIT);

  describeAStore(
    "the real store, on the real database, in test tables of its own",
    async () => {
      const store = createStore(pool, { prefix: "test_" });
      await store.dropTables(); // in case an earlier run was interrupted
      return store;
    },
    WAIT,
  );

  describe("a whole visit on the real database, with the real password scrambler", () => {
    const store = createStore(pool, { prefix: "test_visit_" });
    const accounts = createAccounts(store);

    beforeAll(async () => {
      await store.dropTables();
    }, WAIT);

    afterAll(async () => {
      await store.dropTables();
    }, WAIT);

    it("signs up, signs in, races, reads the leaderboard, signs out and deletes the account", async () => {
      const signedUp = await accounts.signUp("Test_Ana", "correct horse battery");
      expect(signedUp.ok).toBe(true);
      expect((await accounts.signUp("test_ana", "another password")).code).toBe("username_taken");

      // The password is not in the database in a readable form.
      const row = await pool.query("SELECT password_hash FROM test_visit_players WHERE username_key = $1", ["test_ana"]);
      expect(row.rows[0].password_hash.startsWith("scrypt$")).toBe(true);
      expect(row.rows[0].password_hash).not.toContain("correct horse battery");

      expect((await accounts.logIn("Test_Ana", "wrong password")).code).toBe("wrong_login");
      const signedIn = await accounts.logIn("TEST_ANA", "correct horse battery");
      expect(signedIn.ok).toBe(true);

      const ticket = await accounts.startSession(signedIn.player.id);
      expect(await accounts.playerForSession(ticket)).toEqual({ id: signedIn.player.id, username: "Test_Ana" });
      // The ticket is not in the database in a usable form either.
      const sessions = await pool.query("SELECT token_hash FROM test_visit_sessions");
      expect(sessions.rows).toHaveLength(1);
      expect(sessions.rows[0].token_hash).not.toBe(ticket);

      expect(await accounts.saveResult({ playerId: signedIn.player.id, track: "campus-loop", raceSteps: 1800, bestLapSteps: 590, position: 1 })).toBe(true);
      expect(await accounts.leaderboard("campus-loop", signedIn.player.id)).toEqual({
        races: [{ rank: 1, username: "Test_Ana", steps: 1800 }],
        laps: [{ rank: 1, username: "Test_Ana", steps: 590 }],
        mine: { raceRank: 1, raceSteps: 1800, lapRank: 1, lapSteps: 590 },
      });

      await accounts.endSession(ticket);
      expect(await accounts.playerForSession(ticket)).toBe(null);

      expect(await accounts.deleteAccount(signedIn.player.id, "correct horse battery")).toEqual({ ok: true });
      expect((await accounts.leaderboard("campus-loop")).races).toEqual([]);
      expect((await pool.query("SELECT count(*)::int AS rows FROM test_visit_race_results")).rows[0].rows).toBe(0);
    }, WAIT * 2);

    it("refuses a result for a player who does not exist: the database itself says no", async () => {
      await expect(
        accounts.saveResult({ playerId: 999999, track: "campus-loop", raceSteps: 1800, bestLapSteps: 590, position: 1 }),
      ).rejects.toThrow();
      expect((await pool.query("SELECT count(*)::int AS rows FROM test_visit_race_results")).rows[0].rows).toBe(0);
    }, WAIT);
  });
}

describe.skipIf(haveDatabase)("the real store (skipped)", () => {
  it("is not tested here, because no database address is set. Run: npm run test:database", () => {
    expect(haveDatabase).toBe(false);
  });
});
