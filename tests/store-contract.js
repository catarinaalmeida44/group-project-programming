// One list of checks for a store, used twice. It is not a test file itself.
//
//   tests/store.test.js    runs it on the pretend store kept in memory
//   tests/db-live.test.js  runs it on the real store, against the database
//
// If both pass the same checks, the rules tested with the pretend store can
// be trusted to behave the same way with the real one.

import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * "makeStore" gives a fresh, empty store (it may take a moment: it is awaited).
 * "timeout" is how long each check may take, for the real database.
 */
export function describeAStore(name, makeStore, timeout = 5000) {
  describe(name, () => {
    let store;
    let ana;
    let rui;

    beforeAll(async () => {
      store = await makeStore();
      await store.ensureTables();
      ana = await store.addPlayer({ username: "Ana", usernameKey: "ana", passwordHash: "hash-of-ana" });
      rui = await store.addPlayer({ username: "Rui_7", usernameKey: "rui_7", passwordHash: "hash-of-rui" });
    }, timeout * 6);

    afterAll(async () => {
      await store?.dropTables();
    }, timeout * 6);

    it("can create its tables twice without harm", async () => {
      await store.ensureTables();
      expect((await store.findPlayerByKey("ana")).username).toBe("Ana");
    }, timeout);

    it("adds a player and finds them again, by name and by number", async () => {
      expect(ana.username).toBe("Ana");
      expect(Number.isInteger(ana.id)).toBe(true);
      expect(await store.findPlayerByKey("ana")).toEqual({
        id: ana.id,
        username: "Ana",
        passwordHash: "hash-of-ana",
        failedLogins: 0,
        lockedUntil: null,
      });
      expect((await store.findPlayerById(rui.id)).username).toBe("Rui_7");
    }, timeout);

    it("gives nothing for a player who does not exist", async () => {
      expect(await store.findPlayerByKey("nobody")).toBe(null);
      expect(await store.findPlayerById(999999)).toBe(null);
    }, timeout);

    it("refuses a second player with the same name in small letters", async () => {
      const again = await store.addPlayer({ username: "ANA", usernameKey: "ana", passwordHash: "x" });
      expect(again).toBe(null);
      expect((await store.findPlayerByKey("ana")).passwordHash).toBe("hash-of-ana"); // the first one is untouched
    }, timeout);

    it("lets exactly one in when two ask for the same new name at the same moment", async () => {
      const both = await Promise.all([
        store.addPlayer({ username: "Twin", usernameKey: "twin", passwordHash: "a" }),
        store.addPlayer({ username: "TWIN", usernameKey: "twin", passwordHash: "b" }),
      ]);
      expect(both.filter((player) => player !== null)).toHaveLength(1);
    }, timeout);

    it("keeps a name that looks like a database command as plain text", async () => {
      const nasty = "x'; DROP TABLE players; --";
      const player = await store.addPlayer({ username: nasty, usernameKey: nasty, passwordHash: "h" });
      expect((await store.findPlayerByKey(nasty)).username).toBe(nasty);
      expect((await store.findPlayerByKey("ana")).username).toBe("Ana"); // everything is still there
      await store.deletePlayer(player.id);
    }, timeout);

    it("counts wrong passwords, locks, and clears", async () => {
      expect(await store.addFailedLogin(rui.id)).toBe(1);
      expect(await store.addFailedLogin(rui.id)).toBe(2);
      await store.lockPlayer(rui.id, 1_800_000_000_000);
      let found = await store.findPlayerById(rui.id);
      expect(found.lockedUntil).toBe(1_800_000_000_000);
      expect(found.failedLogins).toBe(0);

      await store.clearFailedLogins(rui.id);
      found = await store.findPlayerById(rui.id);
      expect(found.lockedUntil).toBe(null);
      expect(found.failedLogins).toBe(0);
      expect(await store.addFailedLogin(999999)).toBe(0); // nobody there: nothing counted
    }, timeout);

    it("keeps a session and gives it back, and forgets it when asked", async () => {
      await store.addSession({ tokenHash: "ticket-1", playerId: ana.id, expiresAt: 1_800_000_000_000 });
      expect(await store.findSession("ticket-1")).toEqual({ playerId: ana.id, expiresAt: 1_800_000_000_000 });
      expect(await store.findSession("some-other-ticket")).toBe(null);
      await store.deleteSession("ticket-1");
      expect(await store.findSession("ticket-1")).toBe(null);
    }, timeout);

    it("removes only the sessions that have run out", async () => {
      await store.addSession({ tokenHash: "old", playerId: ana.id, expiresAt: 1_700_000_000_000 });
      await store.addSession({ tokenHash: "new", playerId: ana.id, expiresAt: 1_900_000_000_000 });
      await store.deleteExpiredSessions(1_800_000_000_000);
      expect(await store.findSession("old")).toBe(null);
      expect(await store.findSession("new")).not.toBe(null);
      await store.deleteSession("new");
    }, timeout);

    it("lists each player once on a leaderboard, with their best time, fastest first", async () => {
      const add = (player, raceSteps, bestLapSteps, track = "campus-loop") =>
        store.addResult({ playerId: player.id, track, mode: "online", raceSteps, bestLapSteps, position: 1 });
      await add(ana, 2000, 700);
      await add(ana, 1800, 650); // Ana's best race
      await add(ana, 1900, 600); // Ana's best lap, in a slower race
      await add(rui, 1700, 640); // Rui's only race: faster race, slower lap
      await add(rui, 900, 300, "test-oval"); // another track: must not show up

      expect(await store.bestRaces("campus-loop", 10)).toEqual([
        { username: "Rui_7", steps: 1700 },
        { username: "Ana", steps: 1800 },
      ]);
      expect(await store.bestLaps("campus-loop", 10)).toEqual([
        { username: "Ana", steps: 600 },
        { username: "Rui_7", steps: 640 },
      ]);
      expect(await store.bestRaces("campus-loop", 1)).toHaveLength(1);
      expect(await store.bestRaces("a-track-nobody-raced", 10)).toEqual([]);
    }, timeout);

    it("gives one player's own best and rank", async () => {
      expect(await store.myBest("campus-loop", ana.id)).toEqual({
        race: { steps: 1800, rank: 2 },
        lap: { steps: 600, rank: 1 },
      });
      expect(await store.myBest("a-track-nobody-raced", ana.id)).toEqual({ race: null, lap: null });
    }, timeout);

    it("orders players with exactly the same time by name, so the order never changes between visits", async () => {
      const bea = await store.addPlayer({ username: "Bea", usernameKey: "bea", passwordHash: "h" });
      await store.addResult({ playerId: bea.id, track: "campus-loop", mode: "online", raceSteps: 1800, bestLapSteps: 900, position: 2 });
      const races = await store.bestRaces("campus-loop", 10);
      expect(races.map((row) => row.username)).toEqual(["Rui_7", "Ana", "Bea"]);
      // Two players share second place: both are "rank 2" in their own view.
      expect((await store.myBest("campus-loop", bea.id)).race.rank).toBe(2);
      await store.deletePlayer(bea.id);
    }, timeout);

    it("takes a deleted player's sessions and results away with them", async () => {
      await store.addSession({ tokenHash: "rui-ticket", playerId: rui.id, expiresAt: 1_900_000_000_000 });
      await store.deletePlayer(rui.id);
      expect(await store.findPlayerById(rui.id)).toBe(null);
      expect(await store.findSession("rui-ticket")).toBe(null);
      expect(await store.bestRaces("campus-loop", 10)).toEqual([{ username: "Ana", steps: 1800 }]);
      expect(await store.bestRaces("test-oval", 10)).toEqual([]);
    }, timeout);

    it("lets the name of a deleted player be used again", async () => {
      const newRui = await store.addPlayer({ username: "rui_7", usernameKey: "rui_7", passwordHash: "new" });
      expect(newRui).not.toBe(null);
      expect(newRui.id).not.toBe(rui.id);
    }, timeout);
  });
}
