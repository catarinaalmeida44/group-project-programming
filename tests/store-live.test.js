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

  // Added on 19 November 2026. The live database already has a results
  // table, made before the game noted which character a player drove. This
  // makes such a table by hand, with a race in it, and then starts the store
  // the way the server does: the table must get the new column, and the old
  // race must still be there, exactly as it was.
  describe("a results table that was made before 19 November 2026", () => {
    const store = createStore(pool, { prefix: "test_old_" });
    let playerId;

    beforeAll(async () => {
      await store.dropTables();
      // The tables as server/store.js made them until 19 November 2026.
      await pool.query(
        `CREATE TABLE test_old_players (
           id serial PRIMARY KEY,
           username text NOT NULL,
           username_key text NOT NULL UNIQUE,
           password_hash text NOT NULL,
           failed_logins integer NOT NULL DEFAULT 0,
           locked_until timestamptz,
           created_at timestamptz NOT NULL DEFAULT now()
         )`,
      );
      await pool.query(
        `CREATE TABLE test_old_race_results (
           id serial PRIMARY KEY,
           player_id integer NOT NULL REFERENCES test_old_players(id) ON DELETE CASCADE,
           track text NOT NULL,
           mode text NOT NULL,
           race_steps integer NOT NULL CHECK (race_steps > 0),
           best_lap_steps integer NOT NULL CHECK (best_lap_steps > 0),
           position integer NOT NULL CHECK (position > 0),
           created_at timestamptz NOT NULL DEFAULT now()
         )`,
      );
      const made = await pool.query(
        "INSERT INTO test_old_players (username, username_key, password_hash) VALUES ('Old_Ana', 'old_ana', 'h') RETURNING id",
      );
      playerId = made.rows[0].id;
      await pool.query(
        "INSERT INTO test_old_race_results (player_id, track, mode, race_steps, best_lap_steps, position) VALUES ($1, 'nova-lap', 'online', 9000, 2900, 2)",
        [playerId],
      );
    }, WAIT * 2);

    afterAll(async () => {
      await store.dropTables();
    }, WAIT);

    it("has no character or level column before the server starts", async () => {
      const columns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'test_old_race_results'");
      expect(columns.rows.map((row) => row.column_name)).not.toContain("character");
      expect(columns.rows.map((row) => row.column_name)).not.toContain("level");
    }, WAIT);

    it("gets the two columns when the store starts, keeps the old race as it was, and is not harmed by starting twice", async () => {
      await store.ensureTables();
      await store.ensureTables();
      const columns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'test_old_race_results'");
      expect(columns.rows.map((row) => row.column_name)).toContain("character");
      expect(columns.rows.map((row) => row.column_name)).toContain("level");

      const mine = await store.resultsOf(playerId, 10);
      expect(mine.map(({ at, ...rest }) => rest)).toEqual([
        { track: "nova-lap", mode: "online", raceSteps: 9000, bestLapSteps: 2900, position: 2, character: null, level: null },
      ]);
      // The old race still counts for the leaderboard.
      expect(await store.bestRaces("nova-lap", 10)).toEqual([{ username: "Old_Ana", steps: 9000 }]);
    }, WAIT);

    it("then saves a new race with its character and its level, next to the old one", async () => {
      await store.addResult({ playerId, track: "nova-lap", mode: "single", raceSteps: 8000, bestLapSteps: 2500, position: 1, character: "cici", level: "hard" });
      const mine = await store.resultsOf(playerId, 10);
      expect(mine.map((row) => row.character)).toEqual(["cici", null]);
      expect(mine.map((row) => row.level)).toEqual(["hard", null]);
      expect(await store.bestRaces("nova-lap", 10)).toEqual([{ username: "Old_Ana", steps: 9000 }]); // the single race is not on it
    }, WAIT);
  });
}

describe.skipIf(haveDatabase)("the real store (skipped)", () => {
  it("is not tested here, because no database address is set. Run: npm run test:database", () => {
    expect(haveDatabase).toBe(false);
  });
});
