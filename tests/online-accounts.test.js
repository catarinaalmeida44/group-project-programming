// Tests for the parts of server/online.js that have to do with accounts and
// with one room per track: who a connection belongs to, saving the result of
// a finished race, and what must never be saved.
//
// Like online.test.js, these use real live connections to a real copy of
// our server on this computer. Races are run on a short straight test track
// (sprint-track.js) so that a whole race, countdown included, takes about
// five seconds. Accounts are kept in the pretend store in memory.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import WebSocket from "ws";
import { createApp } from "../server/app.js";
import { attachOnlinePlay, ONLINE_ADDRESS } from "../server/online.js";
import { createAccounts } from "../server/accounts.js";
import { SESSION_COOKIE } from "../server/api.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { createMemoryStore } from "./memory-store.js";
import { createSprintTrack } from "./sprint-track.js";

const GAS = { type: "keys", gas: true, brake: false, left: false, right: false };
const BROKE_THE_RULES = 1008;
const RACE_TIMEOUT = 20000; // a race takes about five seconds; allow plenty for a busy computer

const quickPasswords = {
  hash: async (password) => `scrambled(${password})`,
  matches: async (password, stored) => stored === `scrambled(${password})`,
  pretend: async () => {},
};

let app;
let online;
let port;
let store;
let accounts;
let browsers;

/** Starts a server with two rooms: "sprint" (also the room at /play) and "other". */
async function startServer({ withAccounts = true } = {}) {
  store = createMemoryStore();
  accounts = withAccounts ? createAccounts(store, { passwords: quickPasswords }) : null;
  const sprint = createSprintTrack("Sprint test track");
  const other = createSprintTrack("Other test track");
  app = createApp({ accounts });
  online = attachOnlinePlay(app, {
    track: sprint,
    tracks: { sprint, other },
    character: TEST_DRIVER,
    maxPlayers: 5,
    accounts,
    goodbyeWaitMs: 300,
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  port = app.address().port;
  browsers = [];
}

beforeEach(() => startServer());

afterEach(async () => {
  vi.restoreAllMocks();
  for (const browser of browsers) {
    browser.socket.terminate();
  }
  online.close();
  await new Promise((resolve) => app.close(resolve));
});

/** Makes an account and signs it in. Gives { player, cookie }: the cookie is what the browser would send. */
async function signedIn(username) {
  const { player } = await accounts.signUp(username, "12345678");
  const ticket = await accounts.startSession(player.id);
  return { player, cookie: `${SESSION_COOKIE}=${ticket}` };
}

/**
 * Connects a pretend browser, with a cookie if one is given. Gives back,
 * once the server has welcomed it:
 *   first        the first message the server sent
 *   messages     every message received so far
 *   send(x)      sends an object (as our page would) or a raw text
 *   next(test)   waits for a message for which test(message) is true. One
 *                that already arrived counts too
 *   closed       resolves with { code } when the connection closes
 */
function connect({ address = ONLINE_ADDRESS, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}${address}`, cookie ? { headers: { Cookie: cookie } } : {});
    const waiting = [];
    const browser = {
      socket,
      first: null,
      messages: [],
      send(message) {
        socket.send(typeof message === "string" ? message : JSON.stringify(message));
      },
      next(test, milliseconds = 3000) {
        const already = browser.messages.find(test);
        if (already !== undefined) {
          return Promise.resolve(already);
        }
        return new Promise((found, gaveUp) => {
          const timer = setTimeout(() => gaveUp(new Error("No such message arrived in time")), milliseconds);
          waiting.push({ test, found, timer });
        });
      },
      closed: new Promise((done) => socket.on("close", (code) => done({ code }))),
    };
    browsers.push(browser);
    socket.on("message", (data) => {
      const message = JSON.parse(data.toString());
      browser.messages.push(message);
      if (browser.first === null) {
        browser.first = message;
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

const ofType = (type) => (message) => message.type === type;
const inPhase = (phase) => (message) => message.type === "state" && message.race.phase === phase;
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** The host starts a race, every browser given holds the gas, and we wait until the race is over. */
async function raceToTheEnd(host, others = []) {
  await host.next(ofType("state"));
  host.send({ type: "start" });
  for (const browser of [host, ...others]) {
    browser.send(GAS);
  }
  return host.next(inPhase("finished"), RACE_TIMEOUT - 5000);
}

describe("who a live connection belongs to", () => {
  it("tells a signed-in browser its user name, after the welcome", async () => {
    const { cookie } = await signedIn("Ana");
    const browser = await connect({ cookie });
    expect(browser.first.type).toBe("welcome"); // the welcome still comes first
    expect(await browser.next(ofType("account"))).toEqual({ type: "account", username: "Ana" });
  });

  it("tells a browser without a cookie that it is a guest", async () => {
    const browser = await connect();
    expect(await browser.next(ofType("account"))).toEqual({ type: "account", username: null });
  });

  it("treats a made-up cookie, and the ticket of someone who signed out, as a guest", async () => {
    const { cookie } = await signedIn("Ana");
    await accounts.endSession(cookie.split("=")[1]); // Ana signs out
    for (const tried of [cookie, `${SESSION_COOKIE}=${"A".repeat(43)}`, `${SESSION_COOKIE}=`, "something=else"]) {
      const browser = await connect({ cookie: tried });
      expect((await browser.next(ofType("account"))).username, tried).toBe(null);
    }
  });

  it("lets a guest in as a guest when the database cannot be asked", async () => {
    const { cookie } = await signedIn("Ana");
    const silence = vi.spyOn(console, "error").mockImplementation(() => {});
    store.findSession = () => Promise.reject(new Error("the database is asleep"));
    const browser = await connect({ cookie });
    expect(browser.first.type).toBe("welcome");
    expect((await browser.next(ofType("account"))).username).toBe(null);
    expect(silence).toHaveBeenCalled();
  });
});

describe("saving the result of a finished race", () => {
  it("saves a signed-in player's result, tells them, and shows it on the leaderboard", async () => {
    const { player, cookie } = await signedIn("Ana");
    const browser = await connect({ cookie });

    const end = await raceToTheEnd(browser);
    const saved = await browser.next(ofType("saved"));

    const kart = end.karts.find((each) => each.id === browser.first.id);
    expect(saved).toEqual({ type: "saved", saved: true, position: 1, raceSteps: kart.steps, bestLapSteps: kart.steps });
    expect(store.countResults()).toBe(1);
    expect(await store.myBest("sprint", player.id)).toEqual({
      race: { steps: kart.steps, rank: 1 },
      lap: { steps: kart.steps, rank: 1 },
    });

    expect((await accounts.leaderboard("sprint")).races).toEqual([{ rank: 1, username: "Ana", steps: kart.steps }]);
  }, RACE_TIMEOUT);

  it("saves each signed-in racer under their own name, with their own position", async () => {
    const ana = await signedIn("Ana");
    const rui = await signedIn("Rui");
    const host = await connect({ cookie: ana.cookie });
    const other = await connect({ cookie: rui.cookie });
    await host.next((message) => message.type === "state" && message.karts.length === 2);

    await host.next(ofType("state"));
    host.send({ type: "start" });
    host.send(GAS);
    await host.next(inPhase("racing"), 8000);
    await pause(300); // Rui sets off a little later
    other.send(GAS);

    const savedForAna = await host.next(ofType("saved"), RACE_TIMEOUT - 8000);
    const savedForRui = await other.next(ofType("saved"), RACE_TIMEOUT - 8000);

    expect(savedForAna.position).toBe(1);
    expect(savedForRui.position).toBe(2);
    expect(savedForRui.raceSteps).toBeGreaterThan(savedForAna.raceSteps);
    expect((await store.myBest("sprint", ana.player.id)).race.steps).toBe(savedForAna.raceSteps);
    expect((await store.myBest("sprint", rui.player.id)).race.steps).toBe(savedForRui.raceSteps);
    expect(store.countResults()).toBe(2);
  }, RACE_TIMEOUT);

  it("saves nothing for a guest, and sends them no 'saved' message", async () => {
    const browser = await connect();
    await raceToTheEnd(browser);
    await pause(300);
    expect(store.countResults()).toBe(0);
    expect(browser.messages.filter(ofType("saved"))).toEqual([]);
  }, RACE_TIMEOUT);

  it("saves nothing for laps driven while the room is open, without a race", async () => {
    const { cookie } = await signedIn("Ana");
    const browser = await connect({ cookie });
    await browser.next(ofType("account"));
    browser.send(GAS); // nobody pressed Enter: this is free driving
    await browser.next((message) => message.type === "state" && message.karts[0]?.finished === true, 8000);
    await pause(300);
    expect(store.countResults()).toBe(0);
    expect(browser.messages.filter(ofType("saved"))).toEqual([]);
  }, RACE_TIMEOUT);

  it("tells the player when the result could not be saved, and the room carries on", async () => {
    const { cookie } = await signedIn("Ana");
    const browser = await connect({ cookie });
    await browser.next(ofType("account"));
    const silence = vi.spyOn(console, "error").mockImplementation(() => {});
    store.addResult = () => Promise.reject(new Error("the database is asleep at secret-host.example"));

    const end = await raceToTheEnd(browser);
    const saved = await browser.next(ofType("saved"));

    expect(saved.saved).toBe(false);
    expect(JSON.stringify(saved)).not.toContain("secret-host");
    expect(silence).toHaveBeenCalled();
    // The room still works: the host can start the next race.
    browser.send({ type: "start" });
    await browser.next((message) => inPhase("countdown")(message) && message.step > end.step);
    expect(online.room.phase()).toBe("countdown");
  }, RACE_TIMEOUT);

  it("does not save for an account that was deleted while its owner was racing", async () => {
    const { player, cookie } = await signedIn("Ana");
    const browser = await connect({ cookie });
    await browser.next(ofType("account"));
    await store.deletePlayer(player.id);
    const realAddResult = store.addResult;
    // The real database refuses a result for a player who no longer exists. The pretend store has to be told to.
    store.addResult = () => Promise.reject(new Error("no such player"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await raceToTheEnd(browser);
    expect((await browser.next(ofType("saved"))).saved).toBe(false);
    store.addResult = realAddResult;
    expect(store.countResults()).toBe(0);
  }, RACE_TIMEOUT);

  it("works without accounts: everyone is a guest and the race still runs", async () => {
    online.close();
    await new Promise((resolve) => app.close(resolve));
    await startServer({ withAccounts: false });

    const browser = await connect({ cookie: `${SESSION_COOKIE}=${"A".repeat(43)}` });
    expect((await browser.next(ofType("account"))).username).toBe(null);
    const end = await raceToTheEnd(browser);
    expect(end.karts[0].finished).toBe(true);
    expect(browser.messages.filter(ofType("saved"))).toEqual([]);
  }, RACE_TIMEOUT);
});

describe("a browser cannot send in a result itself", () => {
  it("is sent away for any message about results, times or accounts, and nothing is saved", async () => {
    const { cookie } = await signedIn("Ana");
    const made = [
      { type: "saved", saved: true, position: 1, raceSteps: 1, bestLapSteps: 1 },
      { type: "result", track: "sprint", raceSteps: 1, bestLapSteps: 1, position: 1 },
      { type: "finish", steps: 1 },
      { type: "account", username: "Rui" },
    ];
    for (const message of made) {
      const browser = await connect({ cookie });
      browser.send(message);
      expect((await browser.closed).code, JSON.stringify(message)).toBe(BROKE_THE_RULES);
    }
    expect(store.countResults()).toBe(0);
  });

  it("drops anything extra added to a real message: claiming to have finished changes nothing", async () => {
    const { cookie } = await signedIn("Ana");
    const browser = await connect({ cookie });
    await browser.next(ofType("state"));
    browser.send({ type: "start" });
    await browser.next(inPhase("countdown"));

    // A real "no keys held" message, with a made-up result added to it.
    browser.send({ type: "keys", gas: false, brake: false, left: false, right: false, finished: true, raceSteps: 1, position: 1 });
    await pause(500);

    const update = await browser.next((message) => message.type === "state" && message.step > 20);
    expect(update.karts[0].finished).toBe(false);
    expect(update.karts[0].lapsDone).toBe(0);
    expect(store.countResults()).toBe(0);
    expect(browser.messages.filter(ofType("saved"))).toEqual([]);
  });
});

describe("one room for each track", () => {
  it("puts browsers that ask for different tracks in different rooms", async () => {
    const onSprint = await connect({ address: "/play?track=sprint" });
    const onOther = await connect({ address: "/play?track=other" });

    expect(onSprint.first.track).toBe("Sprint test track");
    expect(onOther.first.track).toBe("Other test track");
    await pause(300);
    const seenOnSprint = await onSprint.next((message) => message.type === "state" && message.step > 5);
    expect(seenOnSprint.karts).toHaveLength(1); // the other browser's kart is not here
    expect(online.rooms.sprint.playerCount()).toBe(1);
    expect(online.rooms.other.playerCount()).toBe(1);
  });

  it("uses the room of the main track for the plain address", async () => {
    await connect();
    await connect({ address: "/play?track=sprint" });
    expect(online.room).toBe(online.rooms.sprint);
    expect(online.room.playerCount()).toBe(2);
  });

  it("starts a race in one room without touching the other", async () => {
    const onSprint = await connect({ address: "/play?track=sprint" });
    const onOther = await connect({ address: "/play?track=other" });
    await onSprint.next(ofType("state"));
    onSprint.send({ type: "start" });
    await onSprint.next(inPhase("countdown"));
    await pause(200);
    expect(online.rooms.sprint.phase()).toBe("countdown");
    expect(online.rooms.other.phase()).toBe("open");
    expect(onOther.messages.some(inPhase("countdown"))).toBe(false);
  });

  it("refuses a track that does not exist, and anything else after the question mark", async () => {
    for (const address of [
      "/play?track=moon",
      "/play?track=",
      "/play?track=constructor",
      "/play?track=__proto__",
      "/play?track=Sprint",
      "/play?other=sprint",
      "/play/sprint",
      "/playtrack=sprint",
    ]) {
      await expect(connect({ address }), address).rejects.toThrow();
    }
    expect(online.rooms.sprint.playerCount()).toBe(0);
    expect(online.rooms.other.playerCount()).toBe(0);
  });

  it("saves a result under the track of the room it was driven in", async () => {
    const { player, cookie } = await signedIn("Ana");
    const browser = await connect({ address: "/play?track=other", cookie });
    await raceToTheEnd(browser);
    await browser.next(ofType("saved"));
    expect((await store.myBest("other", player.id)).race).not.toBe(null);
    expect((await store.myBest("sprint", player.id)).race).toBe(null);
  }, RACE_TIMEOUT);
});
