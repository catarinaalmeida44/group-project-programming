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

    // Added on 13 November 2026, for changing a password.
    it("replaces one player's scrambled password and nobody else's", async () => {
      expect(await store.setPasswordHash(rui.id, "new-hash-of-rui")).toBe(true);
      expect((await store.findPlayerById(rui.id)).passwordHash).toBe("new-hash-of-rui");
      expect((await store.findPlayerById(ana.id)).passwordHash).toBe("hash-of-ana");
      expect(await store.setPasswordHash(999999, "x")).toBe(false); // nobody there: nothing changed
      // A scrambled password that looks like a database command is kept as plain text.
      const nasty = "x', failed_logins = 99 --";
      expect(await store.setPasswordHash(rui.id, nasty)).toBe(true);
      const found = await store.findPlayerById(rui.id);
      expect(found.passwordHash).toBe(nasty);
      expect(found.failedLogins).toBe(0);
      await store.setPasswordHash(rui.id, "hash-of-rui");
    }, timeout);

    it("removes a player's other sessions and keeps the one named, and never touches another player's", async () => {
      const later = 1_900_000_000_000;
      await store.addSession({ tokenHash: "ana-laptop", playerId: ana.id, expiresAt: later });
      await store.addSession({ tokenHash: "ana-phone", playerId: ana.id, expiresAt: later });
      await store.addSession({ tokenHash: "ana-tablet", playerId: ana.id, expiresAt: later });
      await store.addSession({ tokenHash: "rui-laptop", playerId: rui.id, expiresAt: later });

      await store.deleteOtherSessions(ana.id, "ana-laptop");
      expect(await store.findSession("ana-laptop")).not.toBe(null);
      expect(await store.findSession("ana-phone")).toBe(null);
      expect(await store.findSession("ana-tablet")).toBe(null);
      expect(await store.findSession("rui-laptop")).not.toBe(null);

      // Naming another player's session keeps nothing of one's own, and does not remove theirs.
      await store.addSession({ tokenHash: "ana-phone", playerId: ana.id, expiresAt: later });
      await store.deleteOtherSessions(ana.id, "rui-laptop");
      expect(await store.findSession("ana-laptop")).toBe(null);
      expect(await store.findSession("ana-phone")).toBe(null);
      expect(await store.findSession("rui-laptop")).not.toBe(null);

      // With no session named, all of that player's sessions go.
      await store.addSession({ tokenHash: "rui-phone", playerId: rui.id, expiresAt: later });
      await store.deleteOtherSessions(rui.id, null);
      expect(await store.findSession("rui-laptop")).toBe(null);
      expect(await store.findSession("rui-phone")).toBe(null);
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

    // Added on 15 November 2026, for email and the links we send by email.
    it("gives a player an email address, finds the player by it, and takes it away again", async () => {
      expect(await store.emailOf(ana.id)).toBe(null);
      expect(await store.findPlayerByEmailKey("ana@example.com")).toBe(null);

      expect(await store.setEmail(ana.id, "Ana@Example.com", "ana@example.com")).toBe(true);
      expect(await store.emailOf(ana.id)).toBe("Ana@Example.com"); // kept the way it was typed
      expect((await store.findPlayerByEmailKey("ana@example.com")).id).toBe(ana.id);
      expect(await store.emailOf(rui.id)).toBe(null); // nobody else got one
      // What the rest of the code sees of a player has not changed: no email in it.
      expect(Object.keys(await store.findPlayerById(ana.id)).sort()).toEqual(
        ["failedLogins", "id", "lockedUntil", "passwordHash", "username"].sort(),
      );

      await store.clearEmail(ana.id);
      expect(await store.emailOf(ana.id)).toBe(null);
      expect(await store.findPlayerByEmailKey("ana@example.com")).toBe(null);
      expect(await store.emailOf(999999)).toBe(null); // nobody there
    }, timeout);

    it("refuses the same email address for a second player, and lets many players have none", async () => {
      expect(await store.setEmail(ana.id, "shared@example.com", "shared@example.com")).toBe(true);
      expect(await store.setEmail(rui.id, "SHARED@example.com", "shared@example.com")).toBe(false);
      expect(await store.emailOf(rui.id)).toBe(null);
      expect((await store.findPlayerByEmailKey("shared@example.com")).id).toBe(ana.id);
      // Setting one's own address again is fine, and so is a player who does not exist: nothing happens.
      expect(await store.setEmail(ana.id, "shared@example.com", "shared@example.com")).toBe(true);
      expect(await store.setEmail(999999, "x@example.com", "x@example.com")).toBe(false);
      // An address that looks like a database command is kept as plain text.
      const nasty = "x'; DROP TABLE players; --@example.com";
      expect(await store.setEmail(rui.id, nasty, nasty)).toBe(true);
      expect(await store.emailOf(rui.id)).toBe(nasty);
      await store.clearEmail(rui.id);
      await store.clearEmail(ana.id);
      // Two players without an address do not clash.
      expect(await store.emailOf(ana.id)).toBe(null);
      expect(await store.emailOf(rui.id)).toBe(null);
    }, timeout);

    it("keeps a link until it is taken, and gives it out exactly once", async () => {
      const link = { tokenHash: "link-1", playerId: ana.id, kind: "reset_password", email: null, expiresAt: 1_800_000_900_000, createdAt: 1_800_000_000_000 };
      await store.addEmailLink(link);
      await store.addEmailLink({ ...link, tokenHash: "link-2", kind: "confirm_email", email: "ana@example.com" });

      expect(await store.takeEmailLink("no-such-link")).toBe(null);
      expect(await store.takeEmailLink("link-1")).toEqual({ playerId: ana.id, kind: "reset_password", email: null, expiresAt: 1_800_000_900_000 });
      expect(await store.takeEmailLink("link-1")).toBe(null); // used up
      expect(await store.takeEmailLink("link-2")).toEqual({ playerId: ana.id, kind: "confirm_email", email: "ana@example.com", expiresAt: 1_800_000_900_000 });

      // Two people using the same link at the same moment: exactly one gets it.
      await store.addEmailLink({ ...link, tokenHash: "link-3" });
      const both = await Promise.all([store.takeEmailLink("link-3"), store.takeEmailLink("link-3")]);
      expect(both.filter((taken) => taken !== null)).toHaveLength(1);
    }, timeout);

    it("counts a player's unused links of one kind since a moment, and removes them by kind and by age", async () => {
      const at = (createdAt, tokenHash, playerId, kind) => ({ tokenHash, playerId, kind, email: null, expiresAt: createdAt + 1_800_000, createdAt });
      await store.addEmailLink(at(1_800_000_000_000, "old-reset", ana.id, "reset_password"));
      await store.addEmailLink(at(1_800_003_000_000, "new-reset-1", ana.id, "reset_password"));
      await store.addEmailLink(at(1_800_003_500_000, "new-reset-2", ana.id, "reset_password"));
      await store.addEmailLink(at(1_800_003_500_000, "new-confirm", ana.id, "confirm_email"));
      await store.addEmailLink(at(1_800_003_500_000, "rui-reset", rui.id, "reset_password"));

      expect(await store.countEmailLinksSince(ana.id, "reset_password", 1_800_002_000_000)).toBe(2);
      expect(await store.countEmailLinksSince(ana.id, "reset_password", 1_799_999_999_999)).toBe(3);
      expect(await store.countEmailLinksSince(ana.id, "confirm_email", 0)).toBe(1);
      expect(await store.countEmailLinksSince(rui.id, "reset_password", 0)).toBe(1);
      expect(await store.countEmailLinksSince(999999, "reset_password", 0)).toBe(0);

      await store.deleteOldEmailLinks(1_800_001_000_000); // older than this go, whoever they belong to
      expect(await store.takeEmailLink("old-reset")).toBe(null);
      expect(await store.countEmailLinksSince(ana.id, "reset_password", 0)).toBe(2);

      await store.deleteEmailLinks(ana.id, "reset_password"); // only that kind, only that player
      expect(await store.countEmailLinksSince(ana.id, "reset_password", 0)).toBe(0);
      expect(await store.countEmailLinksSince(ana.id, "confirm_email", 0)).toBe(1);
      expect(await store.countEmailLinksSince(rui.id, "reset_password", 0)).toBe(1);
      await store.deleteEmailLinks(ana.id, "confirm_email");
      await store.deleteEmailLinks(rui.id, "reset_password");
    }, timeout);

    it("takes a deleted player's links away with them, and frees their email address", async () => {
      const temp = await store.addPlayer({ username: "Temp", usernameKey: "temp", passwordHash: "h" });
      await store.setEmail(temp.id, "temp@example.com", "temp@example.com");
      await store.addEmailLink({ tokenHash: "temp-link", playerId: temp.id, kind: "reset_password", email: null, expiresAt: 1_900_000_000_000, createdAt: 1_800_000_000_000 });
      await store.deletePlayer(temp.id);
      expect(await store.takeEmailLink("temp-link")).toBe(null);
      expect(await store.findPlayerByEmailKey("temp@example.com")).toBe(null);
      expect(await store.setEmail(ana.id, "temp@example.com", "temp@example.com")).toBe(true);
      await store.clearEmail(ana.id);
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
