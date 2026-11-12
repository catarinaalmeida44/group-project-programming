// Runs the list of checks in store-contract.js on the pretend store that the
// other tests use (tests/memory-store.js). The same list runs on the real
// database in db-live.test.js.

import { describe, it, expect } from "vitest";
import { describeAStore } from "./store-contract.js";
import { createMemoryStore } from "./memory-store.js";
import { createStore } from "../server/store.js";

describeAStore("the pretend store kept in memory", () => createMemoryStore());

describe("the real store, without a database", () => {
  /** A pretend database connection that writes down every question. */
  function pretendPool() {
    const asked = [];
    return {
      asked,
      query: async (text, values) => {
        asked.push({ text, values });
        return { rows: [] };
      },
    };
  }

  it("refuses a table prefix that is anything but small letters and underscores", () => {
    for (const prefix of ["test; DROP TABLE players; --", "Test_", "a-b", "a b", "x".repeat(21), 42, null]) {
      expect(() => createStore(pretendPool(), { prefix })).toThrow(/prefix/);
    }
    expect(() => createStore(pretendPool(), { prefix: "test_" })).not.toThrow();
    expect(() => createStore(pretendPool())).not.toThrow();
  });

  it("refuses to remove the real tables", async () => {
    const pool = pretendPool();
    await expect(createStore(pool).dropTables()).rejects.toThrow(/real tables/);
    expect(pool.asked).toHaveLength(0);
  });

  it("never writes a value into the text of a question", async () => {
    const pool = pretendPool();
    const store = createStore(pool, { prefix: "test_" });
    const marker = "MARKER_VALUE_9f3a";
    await store.addPlayer({ username: marker, usernameKey: marker, passwordHash: marker }).catch(() => {});
    await store.findPlayerByKey(marker);
    await store.addSession({ tokenHash: marker, playerId: 1, expiresAt: 5 });
    await store.findSession(marker);
    await store.deleteSession(marker);
    await store.addResult({ playerId: 1, track: marker, mode: marker, raceSteps: 10, bestLapSteps: 5, position: 1 });
    await store.bestRaces(marker, 10);
    await store.bestLaps(marker, 10);
    await store.myBest(marker, 1);

    expect(pool.asked.length).toBeGreaterThan(8);
    for (const question of pool.asked) {
      expect(question.text).not.toContain(marker); // only ever in the separate list of values
      expect(JSON.stringify(question.values)).toContain(marker);
    }
  });

  it("puts every table under the prefix, so tests can never touch the real tables", async () => {
    const pool = pretendPool();
    const store = createStore(pool, { prefix: "test_" });
    await store.ensureTables();
    await store.findPlayerById(1);
    await store.deleteExpiredSessions(5);
    await store.dropTables();
    for (const question of pool.asked) {
      // Every table name mentioned must start with the prefix.
      const names = question.text.match(/\b(?:test_)?(?:players|sessions|race_results)\b/g) ?? [];
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        expect(name.startsWith("test_"), question.text).toBe(true);
      }
    }
  });
});
