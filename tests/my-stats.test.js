// Tests for a player's own stats, from the rules down to the addresses:
//
//   server/accounts.js   saving a single race, and working out the stats
//   server/api.js        GET /api/stats, POST /api/single-result,
//                        GET /api/my-results.csv
//   server/online.js     the character driven is saved with an online result
//   server/store.js      a results table made before 19 November 2026 gets
//                        the new column
//
// Most of them are things that must NOT be possible: reading someone else's
// stats, saving a race for someone else, a single race on the shared
// leaderboard, a race that cannot be real, a flood of made-up races.
//
// The server here is a real copy of ours on this computer. Behind it sits
// the pretend store kept in memory, so no database is needed.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import http from "node:http";
import WebSocket from "ws";
import { createApp } from "../server/app.js";
import { attachOnlinePlay, ONLINE_ADDRESS } from "../server/online.js";
import { createAccounts, RESULTS_READ } from "../server/accounts.js";
import { createStore } from "../server/store.js";
import { SESSION_COOKIE, STATS_TRACK, RESULTS_FILE_NAME, TRIES_PER_MINUTE } from "../server/api.js";
import { fastestBelievableSteps } from "../server/single-results.js";
import { CSV_COLUMNS } from "../server/stats.js";
import { createAccountApi } from "../client/account-api.js";
import { TRACKS } from "../shared/tracks/index.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { createMemoryStore } from "./memory-store.js";
import { createSprintTrack } from "./sprint-track.js";

const SECOND = 1000;
const NOVA = TRACKS["nova-lap"];
/** A single race nothing is wrong with: three minutes on the Nova lap. */
const RACE_STEPS = 60 * 180;
const GOOD = { track: "nova-lap", raceSteps: RACE_STEPS, bestLapSteps: Math.floor(RACE_STEPS / NOVA.laps) - 100, position: 2, character: "dean" };

const quickPasswords = {
  hash: async (password) => `scrambled(${password})`,
  matches: async (password, stored) => stored === `scrambled(${password})`,
  pretend: async () => {},
};

let store;
let accounts;
let time; // what the pretend clock says, in milliseconds

function freshAccounts() {
  store = createMemoryStore();
  time = 1_800_000_000_000;
  accounts = createAccounts(store, { now: () => time, passwords: quickPasswords });
}

/** Makes an account. Gives its player: { id, username }. */
async function player(username) {
  return (await accounts.signUp(username, "12345678")).player;
}

describe("the rules for a player's own stats", () => {
  beforeEach(freshAccounts);

  it("the stats track is the Nova lap, and it exists", () => {
    expect(STATS_TRACK).toBe("nova-lap");
    expect(Object.hasOwn(TRACKS, STATS_TRACK)).toBe(true);
  });

  it("a player who has not raced has empty stats and no rank", async () => {
    const ana = await player("Ana");
    expect(await accounts.statsOf(ana.id, "nova-lap")).toEqual({
      races: 0,
      online: 0,
      single: 0,
      wins: 0,
      podiums: 0,
      bestRaces: [],
      bestLap: null,
      favourite: null,
      lastAt: null,
      rank: null,
    });
  });

  it("an online race the server ran is counted, with the character driven", async () => {
    const ana = await player("Ana");
    expect(await accounts.saveResult({ playerId: ana.id, track: "nova-lap", raceSteps: 9000, bestLapSteps: 2900, position: 1, character: "cici" })).toBe(true);
    const stats = await accounts.statsOf(ana.id, "nova-lap");
    expect(stats.races).toBe(1);
    expect(stats.online).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.bestRaces).toHaveLength(1);
    expect(stats.bestRaces[0]).toMatchObject({ steps: 9000, mode: "online", character: "cici" });
    expect(stats.favourite).toEqual({ character: "cici", races: 1, counted: 1 });
    expect(stats.rank).toEqual({ race: 1, lap: 1 });
  });

  it("an online result still saves when no character comes with it, or one that is not in the cast", async () => {
    const ana = await player("Ana");
    for (const character of [undefined, null, "mario", 7, "toString"]) {
      const saved = await accounts.saveResult({ playerId: ana.id, track: "nova-lap", raceSteps: 9000, bestLapSteps: 2900, position: 3, character });
      expect(saved, String(character)).toBe(true);
    }
    const rows = await store.resultsOf(ana.id, 10);
    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.character === null)).toBe(true); // saved as "none", never as the made-up name
    expect((await accounts.statsOf(ana.id, "nova-lap")).favourite).toBe(null);
  });

  it("a single race is saved as 'single' and counted in the stats", async () => {
    const ana = await player("Ana");
    expect(await accounts.saveSingleResult({ playerId: ana.id, ...GOOD })).toEqual({ ok: true });
    expect(await store.resultsOf(ana.id, 10)).toMatchObject([{ ...GOOD, mode: "single" }]);
    const stats = await accounts.statsOf(ana.id, "nova-lap");
    expect(stats.races).toBe(1);
    expect(stats.single).toBe(1);
    expect(stats.online).toBe(0);
    expect(stats.podiums).toBe(1);
    expect(stats.favourite.character).toBe("dean");
  });

  it("a single race NEVER reaches the shared leaderboard, and gives no rank", async () => {
    const ana = await player("Ana");
    const rui = await player("Rui");
    await accounts.saveResult({ playerId: rui.id, track: "nova-lap", raceSteps: 12000, bestLapSteps: 3900, position: 1 });
    // Ana reports a single race that is faster than Rui's online one.
    expect((await accounts.saveSingleResult({ playerId: ana.id, ...GOOD })).ok).toBe(true);

    const board = await accounts.leaderboard("nova-lap", ana.id);
    expect(board.races).toEqual([{ rank: 1, username: "Rui", steps: 12000 }]);
    expect(board.laps).toEqual([{ rank: 1, username: "Rui", steps: 3900 }]);
    expect(board.mine).toBe(null);
    expect((await accounts.statsOf(ana.id, "nova-lap")).rank).toBe(null);
    // In her own stats it is her best time all the same.
    expect((await accounts.statsOf(ana.id, "nova-lap")).bestRaces[0].steps).toBe(GOOD.raceSteps);
  });

  it("saving a single race does not throw away the leaderboard that was just read", async () => {
    const ana = await player("Ana");
    await accounts.leaderboard("nova-lap");
    const asked = vi.spyOn(store, "bestRaces");
    await accounts.saveSingleResult({ playerId: ana.id, ...GOOD });
    await accounts.leaderboard("nova-lap");
    expect(asked).not.toHaveBeenCalled(); // nothing on it can have changed
  });

  it("a single race that cannot be real is refused, and nothing is saved", async () => {
    const ana = await player("Ana");
    const fastest = fastestBelievableSteps(NOVA);
    const wrong = [
      { track: "rainbow-road" },
      { track: "toString" },
      { raceSteps: 0 },
      { raceSteps: -5 },
      { raceSteps: 1.5 },
      { raceSteps: "10800" },
      { raceSteps: fastest - 1, bestLapSteps: 1 }, // no kart is that fast
      { raceSteps: NOVA.laps, bestLapSteps: 1 },
      { bestLapSteps: GOOD.raceSteps }, // a best lap as long as the whole race
      { bestLapSteps: 0 },
      { position: 0 },
      { position: 7 },
      { position: 1.5 },
      { character: "mario" },
      { character: "PCP" },
    ];
    for (const change of wrong) {
      const answer = await accounts.saveSingleResult({ playerId: ana.id, ...GOOD, ...change });
      expect(answer, JSON.stringify(change)).toEqual({ ok: false, code: "invalid_result", message: "That is not a result of a single race." });
    }
    for (const playerId of [undefined, null, "1", 1.5, NaN]) {
      expect((await accounts.saveSingleResult({ ...GOOD, playerId })).code, String(playerId)).toBe("invalid_result");
    }
    expect(store.countResults()).toBe(0);
  });

  it("a second single race is refused until the reported race could have been driven", async () => {
    const ana = await player("Ana");
    expect((await accounts.saveSingleResult({ playerId: ana.id, ...GOOD })).ok).toBe(true);

    // Three minutes of racing reported again one second later: not possible.
    time += 1 * SECOND;
    expect((await accounts.saveSingleResult({ playerId: ana.id, ...GOOD })).code).toBe("too_soon");
    // Still not after two minutes and fifty-nine seconds in all.
    time += 178 * SECOND;
    expect((await accounts.saveSingleResult({ playerId: ana.id, ...GOOD })).code).toBe("too_soon");
    expect(store.countResults()).toBe(1);
    // After three minutes it is.
    time += 1 * SECOND;
    expect((await accounts.saveSingleResult({ playerId: ana.id, ...GOOD })).ok).toBe(true);
    expect(store.countResults()).toBe(2);
  });

  it("a flood of made-up single races saves one row, not thousands", async () => {
    const ana = await player("Ana");
    const answers = await Promise.all(Array.from({ length: 200 }, () => accounts.saveSingleResult({ playerId: ana.id, ...GOOD })));
    expect(answers.filter((answer) => answer.ok)).toHaveLength(1);
    expect(answers.filter((answer) => answer.code === "too_soon")).toHaveLength(199);
    expect(store.countResults()).toBe(1);
  });

  it("one player's wait does not hold up another player", async () => {
    const ana = await player("Ana");
    const rui = await player("Rui");
    expect((await accounts.saveSingleResult({ playerId: ana.id, ...GOOD })).ok).toBe(true);
    expect((await accounts.saveSingleResult({ playerId: rui.id, ...GOOD })).ok).toBe(true);
  });

  it("an online race is never held up by the wait for single races", async () => {
    const ana = await player("Ana");
    await accounts.saveSingleResult({ playerId: ana.id, ...GOOD });
    expect(await accounts.saveResult({ playerId: ana.id, track: "nova-lap", raceSteps: 9000, bestLapSteps: 2900, position: 1 })).toBe(true);
    expect(await accounts.saveResult({ playerId: ana.id, track: "nova-lap", raceSteps: 9100, bestLapSteps: 2900, position: 1 })).toBe(true);
  });

  it("a single race that the database could not save does not count as the last one", async () => {
    const ana = await player("Ana");
    const realAddResult = store.addResult;
    store.addResult = () => Promise.reject(new Error("the database is asleep"));
    await expect(accounts.saveSingleResult({ playerId: ana.id, ...GOOD })).rejects.toThrow("asleep");
    store.addResult = realAddResult;
    // The same race can be sent again at once.
    expect((await accounts.saveSingleResult({ playerId: ana.id, ...GOOD })).ok).toBe(true);
    expect(store.countResults()).toBe(1);
  });

  it("stats are about one player only: nothing of anyone else's is in them", async () => {
    const ana = await player("Ana");
    const rui = await player("Rui");
    await accounts.saveResult({ playerId: rui.id, track: "nova-lap", raceSteps: 8000, bestLapSteps: 2500, position: 1, character: "pcp" });
    await accounts.saveResult({ playerId: ana.id, track: "nova-lap", raceSteps: 9000, bestLapSteps: 2900, position: 2, character: "ro" });
    const stats = await accounts.statsOf(ana.id, "nova-lap");
    expect(stats.races).toBe(1);
    expect(stats.wins).toBe(0);
    expect(stats.bestRaces.map((best) => best.steps)).toEqual([9000]);
    expect(stats.favourite.character).toBe("ro");
    expect(stats.rank).toEqual({ race: 2, lap: 2 });
    expect(JSON.stringify(stats)).not.toContain("Rui");
  });

  it("deleting the account takes the races away, and lets the name start again from nothing", async () => {
    const ana = await player("Ana");
    await accounts.saveSingleResult({ playerId: ana.id, ...GOOD });
    expect((await accounts.deleteAccount(ana.id, "12345678")).ok).toBe(true);
    expect(await accounts.resultsOf(ana.id)).toEqual([]);
    expect(store.countResults()).toBe(0);
  });

  it("reads a limited number of races, so one question to the database cannot grow without end", async () => {
    const ana = await player("Ana");
    const asked = vi.spyOn(store, "resultsOf");
    await accounts.statsOf(ana.id, "nova-lap");
    await accounts.resultsOf(ana.id);
    expect(RESULTS_READ).toBeGreaterThanOrEqual(1000);
    expect(asked.mock.calls).toEqual([
      [ana.id, RESULTS_READ],
      [ana.id, RESULTS_READ],
    ]);
  });
});

// ---- The addresses, with a real copy of the server ----

describe("the addresses for a player's own stats", () => {
  let app;
  let port;

  beforeEach(async () => {
    freshAccounts();
    app = createApp({ accounts, now: () => time });
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    port = app.address().port;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await new Promise((resolve) => app.close(resolve));
  });

  /** Sends one request. Gives { status, headers, body, json }. */
  function ask(method, address, { body, cookie, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      const text = body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body);
      const allHeaders = { ...headers };
      if (text !== undefined && allHeaders["Content-Type"] === undefined) {
        allHeaders["Content-Type"] = "application/json";
      }
      if (cookie !== undefined) {
        allHeaders.Cookie = cookie;
      }
      const request = http.request({ host: "127.0.0.1", port, path: address, method, headers: allHeaders, agent: false }, (response) => {
        let received = "";
        response.setEncoding("utf8");
        response.on("data", (piece) => (received += piece));
        response.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(received);
          } catch {
            // not JSON: leave it as null
          }
          resolve({ status: response.statusCode, headers: response.headers, body: received, json });
        });
      });
      request.on("error", reject);
      request.end(text);
    });
  }

  /** Makes an account and signs it in. Gives { player, cookie }. */
  async function signedIn(username) {
    const { player: made } = await accounts.signUp(username, "12345678");
    const ticket = await accounts.startSession(made.id);
    return { player: made, cookie: `${SESSION_COOKIE}=${ticket}` };
  }

  describe("GET /api/stats", () => {
    it("gives a signed-in player their own stats on the Nova lap", async () => {
      const ana = await signedIn("Ana");
      await accounts.saveResult({ playerId: ana.player.id, track: "nova-lap", raceSteps: 9000, bestLapSteps: 2900, position: 1, character: "cici" });
      const answer = await ask("GET", "/api/stats", { cookie: ana.cookie });
      expect(answer.status).toBe(200);
      expect(answer.json.ok).toBe(true);
      expect(answer.json.track).toBe("nova-lap");
      expect(answer.json.trackName).toBe(NOVA.name);
      expect(answer.json.stats).toMatchObject({ races: 1, online: 1, single: 0, wins: 1, podiums: 1, rank: { race: 1, lap: 1 } });
      expect(answer.json.stats.favourite).toEqual({ character: "cici", races: 1, counted: 1 });
      expect(answer.headers["cache-control"]).toBe("no-store");
    });

    it("refuses a visitor who is not signed in", async () => {
      const made = [undefined, `${SESSION_COOKIE}=${"A".repeat(43)}`, `${SESSION_COOKIE}=`, "something=else"];
      for (const cookie of made) {
        const answer = await ask("GET", "/api/stats", { cookie });
        expect(answer.status, String(cookie)).toBe(401);
        expect(answer.json).toEqual({ ok: false, code: "not_signed_in", message: "You are not signed in." });
      }
    });

    it("refuses the ticket of a player who signed out", async () => {
      const ana = await signedIn("Ana");
      await accounts.endSession(ana.cookie.split("=")[1]);
      expect((await ask("GET", "/api/stats", { cookie: ana.cookie })).status).toBe(401);
    });

    it("cannot be asked for another player's stats: whatever the address says, the ticket decides", async () => {
      const ana = await signedIn("Ana");
      const rui = await signedIn("Rui");
      await accounts.saveResult({ playerId: rui.player.id, track: "nova-lap", raceSteps: 8000, bestLapSteps: 2500, position: 1, character: "pcp" });
      const tries = [
        "/api/stats?player=Rui",
        `/api/stats?playerId=${rui.player.id}`,
        `/api/stats?id=${rui.player.id}&username=Rui`,
        "/api/stats?track=test-oval",
      ];
      for (const address of tries) {
        const answer = await ask("GET", address, { cookie: ana.cookie });
        // Each of these is simply not a known address (the part after "?" belongs to none of ours), or Ana's own empty stats.
        if (answer.status === 200) {
          expect(answer.json.stats.races, address).toBe(0);
          expect(answer.json.track, address).toBe("nova-lap");
        }
        expect(answer.body, address).not.toContain("8000");
        expect(answer.body, address).not.toContain("pcp");
      }
      expect((await ask("GET", `/api/stats/${rui.player.id}`, { cookie: ana.cookie })).status).toBe(404);
    });

    it("only answers a GET", async () => {
      const ana = await signedIn("Ana");
      for (const method of ["POST", "PUT", "DELETE"]) {
        expect((await ask(method, "/api/stats", { cookie: ana.cookie, body: {} })).status, method).toBe(405);
      }
    });

    it("says accounts are not available on a server without a database", async () => {
      await new Promise((resolve) => app.close(resolve));
      app = createApp({ accounts: null });
      await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
      port = app.address().port;
      for (const address of ["/api/stats", "/api/my-results.csv"]) {
        const answer = await ask("GET", address);
        expect(answer.status, address).toBe(503);
        expect(answer.json.code, address).toBe("unavailable");
      }
      expect((await ask("POST", "/api/single-result", { body: GOOD })).status).toBe(503);
    });

    it("answers calmly when the database cannot be reached, without saying why", async () => {
      const ana = await signedIn("Ana");
      const silence = vi.spyOn(console, "error").mockImplementation(() => {});
      store.resultsOf = () => Promise.reject(new Error("could not reach secret-host.example"));
      const answer = await ask("GET", "/api/stats", { cookie: ana.cookie });
      expect(answer.status).toBe(503);
      expect(answer.json.code).toBe("unavailable");
      expect(answer.body).not.toContain("secret-host");
      expect(silence).toHaveBeenCalled();
    });
  });

  describe("POST /api/single-result", () => {
    it("saves a signed-in player's single race, under their own account", async () => {
      const ana = await signedIn("Ana");
      const answer = await ask("POST", "/api/single-result", { cookie: ana.cookie, body: GOOD });
      expect(answer.status).toBe(201);
      expect(answer.json).toEqual({ ok: true });
      expect(await store.resultsOf(ana.player.id, 10)).toMatchObject([{ ...GOOD, mode: "single" }]);
    });

    it("saves nothing for a visitor who is not signed in", async () => {
      const answer = await ask("POST", "/api/single-result", { body: GOOD });
      expect(answer.status).toBe(401);
      expect(answer.json.code).toBe("not_signed_in");
      expect(store.countResults()).toBe(0);
    });

    it("cannot save a race for someone else: a player named in the message is ignored", async () => {
      const ana = await signedIn("Ana");
      const rui = await signedIn("Rui");
      const body = { ...GOOD, playerId: rui.player.id, player: "Rui", username: "Rui", id: rui.player.id, mode: "online" };
      expect((await ask("POST", "/api/single-result", { cookie: ana.cookie, body })).status).toBe(201);
      expect(await store.resultsOf(rui.player.id, 10)).toEqual([]);
      const anas = await store.resultsOf(ana.player.id, 10);
      expect(anas).toHaveLength(1);
      expect(anas[0].mode).toBe("single"); // and it cannot call itself an online race
      expect((await accounts.leaderboard("nova-lap")).races).toEqual([]);
    });

    it("refuses a race that cannot be real with 400, and saves nothing", async () => {
      const ana = await signedIn("Ana");
      for (const change of [{ track: "rainbow-road" }, { raceSteps: 3, bestLapSteps: 1 }, { position: 9 }, { character: "mario" }, { raceSteps: "fast" }]) {
        const answer = await ask("POST", "/api/single-result", { cookie: ana.cookie, body: { ...GOOD, ...change } });
        expect(answer.status, JSON.stringify(change)).toBe(400);
        expect(answer.json.code, JSON.stringify(change)).toBe("invalid_result");
      }
      expect((await ask("POST", "/api/single-result", { cookie: ana.cookie, body: {} })).status).toBe(400);
      expect(store.countResults()).toBe(0);
    });

    it("refuses a second race sent straight after the first with 429", async () => {
      const ana = await signedIn("Ana");
      expect((await ask("POST", "/api/single-result", { cookie: ana.cookie, body: GOOD })).status).toBe(201);
      const again = await ask("POST", "/api/single-result", { cookie: ana.cookie, body: GOOD });
      expect(again.status).toBe(429);
      expect(again.json.code).toBe("too_soon");
      expect(store.countResults()).toBe(1);
    });

    it("refuses a request started by a page of another website", async () => {
      const ana = await signedIn("Ana");
      const answer = await ask("POST", "/api/single-result", { cookie: ana.cookie, body: GOOD, headers: { Origin: "https://evil.example" } });
      expect(answer.status).toBe(403);
      expect(store.countResults()).toBe(0);
    });

    it("refuses anything that is not our format, and only answers a POST", async () => {
      const ana = await signedIn("Ana");
      expect((await ask("POST", "/api/single-result", { cookie: ana.cookie, body: "track=nova-lap", headers: { "Content-Type": "text/plain" } })).status).toBe(415);
      expect((await ask("POST", "/api/single-result", { cookie: ana.cookie, body: "{not json" })).status).toBe(400);
      expect((await ask("POST", "/api/single-result", { cookie: ana.cookie, body: "[1,2]" })).status).toBe(400);
      expect((await ask("GET", "/api/single-result", { cookie: ana.cookie })).status).toBe(405);
      expect(store.countResults()).toBe(0);
    });

    it("stops one computer that sends too many in a minute", async () => {
      const ana = await signedIn("Ana");
      const allowed = TRIES_PER_MINUTE["/api/single-result"];
      let last;
      for (let i = 0; i <= allowed; i++) {
        last = await ask("POST", "/api/single-result", { cookie: ana.cookie, body: { ...GOOD, position: 9 } });
      }
      expect(last.status).toBe(429);
      expect(last.json.code).toBe("too_many_attempts");
    });
  });

  describe("GET /api/my-results.csv", () => {
    it("gives a signed-in player a file of their own races, to save", async () => {
      const ana = await signedIn("Ana");
      await accounts.saveResult({ playerId: ana.player.id, track: "nova-lap", raceSteps: 5007, bestLapSteps: 1620, position: 1, character: "ro" });
      await accounts.saveSingleResult({ playerId: ana.player.id, ...GOOD });

      const answer = await ask("GET", "/api/my-results.csv", { cookie: ana.cookie });
      expect(answer.status).toBe(200);
      expect(answer.headers["content-type"]).toBe("text/csv; charset=utf-8");
      expect(answer.headers["content-disposition"]).toBe(`attachment; filename="${RESULTS_FILE_NAME}"`);
      expect(answer.headers["cache-control"]).toBe("no-store");
      expect(answer.headers["x-content-type-options"]).toBe("nosniff");

      // The invisible mark first, so that Excel reads "Ró" as "Ró".
      expect(answer.body.charCodeAt(0)).toBe(0xfeff);
      const lines = answer.body.slice(1).trimEnd().split("\r\n");
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe(CSV_COLUMNS.map((name) => `"${name}"`).join(","));
      expect(lines[1]).toContain('"single race"'); // the newest first
      expect(lines[1]).toContain(`"${NOVA.name}"`);
      expect(lines[2]).toContain('"online"');
      expect(lines[2]).toContain('"1:23.45"');
      expect(lines[2]).toContain('"Ró Versos"');
    });

    it("has races on every track, not only the Nova lap", async () => {
      const ana = await signedIn("Ana");
      await accounts.saveResult({ playerId: ana.player.id, track: "test-oval", raceSteps: 1500, bestLapSteps: 480, position: 1 });
      const answer = await ask("GET", "/api/my-results.csv", { cookie: ana.cookie });
      expect(answer.body).toContain(`"${TRACKS["test-oval"].name}"`);
    });

    it("is only the line of column names for a player who has not raced", async () => {
      const ana = await signedIn("Ana");
      const answer = await ask("GET", "/api/my-results.csv", { cookie: ana.cookie });
      expect(answer.status).toBe(200);
      expect(answer.body.slice(1).trimEnd().split("\r\n")).toHaveLength(1);
    });

    it("never has anything of another player in it", async () => {
      const ana = await signedIn("Ana");
      const rui = await signedIn("Rui");
      await accounts.saveResult({ playerId: rui.player.id, track: "nova-lap", raceSteps: 8000, bestLapSteps: 2500, position: 1, character: "pcp" });
      for (const address of ["/api/my-results.csv", `/api/my-results.csv?player=${rui.player.id}`, "/api/my-results.csv?username=Rui"]) {
        const answer = await ask("GET", address, { cookie: ana.cookie });
        expect(answer.body, address).not.toContain("PCP");
        expect(answer.body, address).not.toContain("Rui");
        expect(answer.body, address).not.toContain("2:13.33"); // Rui's time
      }
    });

    it("has no user name, password or ticket in it", async () => {
      const ana = await signedIn("Ana");
      await accounts.saveSingleResult({ playerId: ana.player.id, ...GOOD });
      const answer = await ask("GET", "/api/my-results.csv", { cookie: ana.cookie });
      expect(answer.body).not.toContain("Ana");
      expect(answer.body).not.toContain("scrambled");
      expect(answer.body).not.toContain("12345678");
      expect(answer.body).not.toContain(ana.cookie.split("=")[1]);
    });

    it("refuses a visitor who is not signed in, and sends no file", async () => {
      const answer = await ask("GET", "/api/my-results.csv");
      expect(answer.status).toBe(401);
      expect(answer.json.code).toBe("not_signed_in");
      expect(answer.headers["content-disposition"]).toBe(undefined);
    });
  });

  describe("the page's own way of asking (client/account-api.js)", () => {
    /** The functions of account-api.js, talking to this test server as one browser would. */
    function apiFor(cookie) {
      return createAccountApi((address, options) =>
        fetch(`http://127.0.0.1:${port}${address}`, { ...options, headers: { ...options.headers, ...(cookie ? { Cookie: cookie } : {}) } }),
      );
    }

    it("reads the stats and saves a single race", async () => {
      const ana = await signedIn("Ana");
      const api = apiFor(ana.cookie);
      expect(await api.saveSingleResult(GOOD)).toEqual({ ok: true });
      const answer = await api.getStats();
      expect(answer.ok).toBe(true);
      expect(answer.trackName).toBe(NOVA.name);
      expect(answer.stats.single).toBe(1);
    });

    it("gives a calm answer, never an error, for a visitor and for a server that is not there", async () => {
      expect((await apiFor(undefined).getStats()).code).toBe("not_signed_in");
      expect((await apiFor(undefined).saveSingleResult(GOOD)).code).toBe("not_signed_in");
      const nowhere = createAccountApi(() => Promise.reject(new Error("no network")));
      expect((await nowhere.getStats()).code).toBe("offline");
      expect((await nowhere.saveSingleResult(GOOD)).code).toBe("offline");
    });
  });
});

// ---- An online race: the character driven is saved with the result ----

describe("the character of an online race", () => {
  const GAS = { type: "keys", gas: true, brake: false, left: false, right: false };
  let app;
  let online;
  let port;
  let sockets;

  beforeEach(async () => {
    freshAccounts();
    accounts = createAccounts(store, { passwords: quickPasswords }); // the real clock: a race is run
    const sprint = createSprintTrack("Sprint test track");
    app = createApp({ accounts });
    online = attachOnlinePlay(app, { track: sprint, tracks: { sprint }, character: TEST_DRIVER, maxPlayers: 5, accounts, goodbyeWaitMs: 300 });
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    port = app.address().port;
    sockets = [];
  });

  afterEach(async () => {
    for (const socket of sockets) {
      socket.terminate();
    }
    online.close();
    await new Promise((resolve) => app.close(resolve));
  });

  /** Connects a pretend browser. Gives { send, next(test) } once the server has welcomed it. */
  function connect(cookie) {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}${ONLINE_ADDRESS}`, { headers: { Cookie: cookie } });
      sockets.push(socket);
      const messages = [];
      const waiting = [];
      const browser = {
        send: (message) => socket.send(JSON.stringify(message)),
        next(test, milliseconds = 15000) {
          const already = messages.find(test);
          if (already !== undefined) {
            return Promise.resolve(already);
          }
          return new Promise((found, gaveUp) => {
            const timer = setTimeout(() => gaveUp(new Error("No such message arrived in time")), milliseconds);
            waiting.push({ test, found, timer });
          });
        },
      };
      socket.on("message", (data) => {
        const message = JSON.parse(data.toString());
        messages.push(message);
        if (messages.length === 1) {
          resolve(browser);
        }
        for (const waiter of [...waiting]) {
          if (waiter.test(message)) {
            clearTimeout(waiter.timer);
            waiting.splice(waiting.indexOf(waiter), 1);
            waiter.found(message);
          }
        }
      });
      socket.on("error", reject);
    });
  }

  /** Signs a new player in, lets them pick a character (or none), and races to the finish. Gives the player. */
  async function raceAs(username, character) {
    const { player: made } = await accounts.signUp(username, "12345678");
    const ticket = await accounts.startSession(made.id);
    const browser = await connect(`${SESSION_COOKIE}=${ticket}`);
    await browser.next((message) => message.type === "account");
    if (character !== undefined) {
      browser.send({ type: "character", id: character });
    }
    await browser.next((message) => message.type === "state");
    browser.send({ type: "start" });
    browser.send(GAS);
    await browser.next((message) => message.type === "saved");
    return made;
  }

  it("is saved with the result, and becomes the most played character in the stats", async () => {
    const ana = await raceAs("Ana", "cici");
    const rows = await store.resultsOf(ana.id, 10);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ track: "sprint", mode: "online", position: 1, character: "cici" });
    expect((await accounts.statsOf(ana.id, "sprint")).favourite).toEqual({ character: "cici", races: 1, counted: 1 });
  }, 20000);

  it("is saved as none for a player who never chose one", async () => {
    const ana = await raceAs("Ana", undefined);
    const rows = await store.resultsOf(ana.id, 10);
    expect(rows).toHaveLength(1);
    expect(rows[0].character).toBe(null);
  }, 20000);
});

// ---- The real store's questions, without a database ----

describe("the results table, for a database that was made before 19 November 2026", () => {
  /** A pretend database connection that writes down every question. */
  function pretendPool() {
    const asked = [];
    return { asked, query: async (text, values) => (asked.push({ text, values }), { rows: [] }) };
  }

  it("gets the character column when the server starts, in a way that is safe to run every time", async () => {
    const pool = pretendPool();
    await createStore(pool, { prefix: "test_" }).ensureTables();
    const texts = pool.asked.map((question) => question.text.replace(/\s+/g, " "));
    const adding = texts.findIndex((text) => text.includes("ALTER TABLE test_race_results ADD COLUMN IF NOT EXISTS character text"));
    const creating = texts.findIndex((text) => text.includes("CREATE TABLE IF NOT EXISTS test_race_results"));
    expect(creating).toBeGreaterThanOrEqual(0);
    expect(adding).toBeGreaterThan(creating); // only after the table is sure to exist
    // Starting the server never removes or rewrites anything in a table
    // that holds players' data: it only makes what is missing.
    for (const text of texts) {
      expect(text).toMatch(/^ ?(CREATE TABLE IF NOT EXISTS|CREATE INDEX IF NOT EXISTS|ALTER TABLE \S+ ADD COLUMN IF NOT EXISTS) /);
    }
  });

  it("the leaderboard questions only count races the server ran", async () => {
    const pool = pretendPool();
    const real = createStore(pool, { prefix: "test_" });
    await real.bestRaces("nova-lap", 10);
    await real.bestLaps("nova-lap", 10);
    await real.myBest("nova-lap", 1);
    expect(pool.asked).toHaveLength(4);
    for (const question of pool.asked) {
      expect(question.text).toContain("mode = 'online'");
    }
  });

  it("the character and the list of races go to the database as separate values, never inside the question", async () => {
    const pool = pretendPool();
    const real = createStore(pool, { prefix: "test_" });
    const marker = "MARKER_VALUE_7c1e";
    await real.addResult({ playerId: 1, track: "nova-lap", mode: "single", raceSteps: 10, bestLapSteps: 3, position: 1, character: marker });
    await real.resultsOf(31337, 4242);
    expect(pool.asked[0].text).not.toContain(marker);
    expect(pool.asked[0].values).toContain(marker);
    expect(pool.asked[1].text).not.toContain("31337");
    expect(pool.asked[1].text).not.toContain("4242");
    expect(pool.asked[1].values).toEqual([31337, 4242]);
    // A result saved without a character is saved with "none".
    await real.addResult({ playerId: 1, track: "nova-lap", mode: "online", raceSteps: 10, bestLapSteps: 3, position: 1 });
    expect(pool.asked[2].values.at(-1)).toBe(null);
  });
});
