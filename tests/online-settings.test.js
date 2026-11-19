// The game settings of an online room: the host chooses computer karts or
// not, how good they are, and at most how many people (server/online.js with
// shared/game-settings.js). The second half runs over a real live connection.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { createApp } from "../server/app.js";
import { attachOnlinePlay, ONLINE_ADDRESS } from "../server/online.js";
import { createComputerPlayers } from "../server/computer-players.js";
import { createRoom } from "../server/room.js";
import { createCastKeeper } from "../server/cast-keeper.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { lookOfTrack } from "../client/track-looks.js";
import { routePoints } from "../client/route.js";

const LINE = routePoints(TEST_OVAL, lookOfTrack(TEST_OVAL).route);

// ---------------------------------------------------------------------------
// The level of the computer karts, without any network
// ---------------------------------------------------------------------------

/**
 * One person and five computer karts at this level race on the test oval,
 * always with the same bananas and the same moods. Gives the race times of
 * the computer karts added together, in steps.
 */
function computerTimesAt(level) {
  const room = createRoom(TEST_OVAL, TEST_DRIVER, 8, () => 5);
  const cast = createCastKeeper();
  const host = room.addPlayer().id;
  const computers = createComputerPlayers(TEST_OVAL, LINE, TEST_DRIVER);
  const added = level === undefined ? computers.fill(room, cast, 6, 5) : computers.fill(room, cast, 6, 5, level);
  expect(added).toBe(5);
  expect(room.startRace(host)).toBe(true);
  const kartOf = (id) => room.snapshot().karts.find((kart) => kart.id === id);
  for (let step = 0; step < 120 * 60 && room.phase() !== "finished"; step++) {
    computers.drive(room);
    room.step();
    if (computers.ids().every((id) => kartOf(id).finished)) {
      break;
    }
  }
  const karts = computers.ids().map(kartOf);
  expect(karts.every((kart) => kart.finished)).toBe(true);
  return karts.reduce((sum, kart) => sum + kart.steps, 0);
}

describe("the level of the computer karts in an online room", () => {
  it("makes them faster on Hard than on Normal, and slower on Easy", () => {
    const easy = computerTimesAt("easy");
    const normal = computerTimesAt("normal");
    const hard = computerTimesAt("hard");
    expect(hard).toBeLessThan(normal);
    expect(normal).toBeLessThan(easy);
  });

  it("is Normal when none is given: they drive as they always did", () => {
    expect(computerTimesAt(undefined)).toBe(computerTimesAt("normal"));
  });

  it("is refused when it is not one of the three levels, and nobody is added", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER, 8, () => 5);
    const cast = createCastKeeper();
    room.addPlayer();
    const computers = createComputerPlayers(TEST_OVAL, LINE, TEST_DRIVER);
    for (const level of ["medium", "Hard", "", null, 2]) {
      expect(() => computers.fill(room, cast, 6, 5, level)).toThrow(RangeError);
    }
    expect(room.playerCount()).toBe(1);
    expect(computers.ids()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The settings of a room, over a real live connection
// ---------------------------------------------------------------------------

let app;
let online;
let port;
let browsers;
let nextAccount; // the account the next pretend browser is signed in as, or null for a guest

async function open() {
  app = createApp();
  nextAccount = null;
  const accounts = {
    playerForSession: () => Promise.resolve(nextAccount),
    saveResult: () => Promise.resolve(true),
  };
  online = attachOnlinePlay(app, {
    track: TEST_OVAL,
    tracks: { "test-oval": TEST_OVAL },
    character: TEST_DRIVER,
    accounts,
    computerKarts: true, // as the real server gives it
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  port = app.address().port;
}

beforeEach(async () => {
  browsers = [];
  await open();
});

afterEach(async () => {
  for (const browser of browsers) {
    browser.socket.terminate();
  }
  online.close();
  await new Promise((resolve) => app.close(resolve));
});

/** A pretend browser: send(x), next(test) waits for a message, latest is the newest update, heard is everything it was told. */
function connect() {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}${ONLINE_ADDRESS}`);
    const waiting = [];
    const browser = {
      socket,
      first: null,
      latest: null,
      heard: [],
      closed: false,
      send: (message) => socket.send(JSON.stringify(message)),
      next(test, milliseconds = 4000) {
        return new Promise((found, gaveUp) => {
          const timer = setTimeout(() => gaveUp(new Error("No such message arrived in time")), milliseconds);
          waiting.push({ test, found, timer });
        });
      },
    };
    browsers.push(browser);
    socket.on("close", () => {
      browser.closed = true;
    });
    socket.on("message", (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === "state") {
        browser.latest = message;
      } else {
        browser.heard.push(message.type);
      }
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

const state = (test) => (message) => message.type === "state" && test(message);
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const DEFAULTS = { computers: true, level: "normal", most: 6 };

describe("the game settings of an online room", () => {
  it("are in every update, and start as computer karts on, Normal, six people", async () => {
    const host = await connect();
    const update = await host.next(state(() => true));
    expect(update.settings).toEqual(DEFAULTS);
    expect(update.computers.on).toBe(true); // the older way of saying it still agrees
  });

  it("are changed by the host, all three at once, and everyone in the room sees it", async () => {
    const host = await connect();
    const other = await connect();
    host.send({ type: "settings", computers: false, level: "hard", most: 4 });
    const wanted = { computers: false, level: "hard", most: 4 };
    const seen = await other.next(state((message) => message.settings.most === 4));
    expect(seen.settings).toEqual(wanted);
    expect(seen.computers.on).toBe(false);
    await host.next(state((message) => message.settings.most === 4));
    expect(host.latest.settings).toEqual(wanted);
  });

  it("are not changed by someone who is not the host", async () => {
    const host = await connect();
    const other = await connect();
    other.send({ type: "settings", computers: false, level: "easy", most: 2 });
    await pause(300);
    expect(host.latest.settings).toEqual(DEFAULTS);
    expect(other.latest.settings).toEqual(DEFAULTS);
    expect(other.closed).toBe(false); // it is a message a browser may send: nobody is thrown out for it
  });

  it("are not changed by the host during a race", async () => {
    const host = await connect();
    host.send({ type: "start" });
    await host.next(state((message) => message.race.phase === "countdown"));
    host.send({ type: "settings", computers: false, level: "easy", most: 2 });
    await pause(300);
    expect(host.latest.settings).toEqual(DEFAULTS);
    expect(host.latest.computers.karts).toHaveLength(5);
  });

  it("with computer karts switched off, give a race with people only", async () => {
    const host = await connect();
    host.send({ type: "settings", computers: false, level: "normal", most: 6 });
    await host.next(state((message) => message.settings.computers === false));
    host.send({ type: "start" });
    const counting = await host.next(state((message) => message.race.phase === "countdown"));
    expect(counting.karts).toHaveLength(1);
    expect(counting.computers.karts).toEqual([]);
  });

  it("still fill the race to six karts when the room is limited to fewer people", async () => {
    const host = await connect();
    host.send({ type: "settings", computers: true, level: "easy", most: 2 });
    await host.next(state((message) => message.settings.most === 2));
    host.send({ type: "start" });
    const counting = await host.next(state((message) => message.race.phase === "countdown"));
    expect(counting.karts).toHaveLength(6);
    expect(counting.computers.karts).toHaveLength(5);
  });

  it("send a strange settings message away with its sender, like any other strange message", async () => {
    const host = await connect();
    host.send({ type: "settings", computers: true, level: "medium", most: 4 });
    await pause(300);
    expect(host.closed).toBe(true);
  });
});

describe("the limit on the people in an online room", () => {
  it("turns away whoever arrives when the room has that many people", async () => {
    const host = await connect();
    host.send({ type: "settings", computers: true, level: "normal", most: 2 });
    await host.next(state((message) => message.settings.most === 2));
    const second = await connect();
    expect(second.first.type).toBe("welcome");
    const third = await connect();
    expect(third.first.type).toBe("full");
    await pause(100);
    expect(online.room.playerCount()).toBe(2);
  });

  it("cannot be set below the people who are already in the room: nobody is thrown out", async () => {
    const host = await connect();
    const second = await connect();
    const third = await connect();
    host.send({ type: "settings", computers: false, level: "hard", most: 2 });
    // The rest of what was asked counts, the limit stays as it was.
    const seen = await host.next(state((message) => message.settings.level === "hard"));
    expect(seen.settings).toEqual({ computers: false, level: "hard", most: 6 });
    await pause(200);
    expect(online.room.playerCount()).toBe(3);
    expect(second.closed).toBe(false);
    expect(third.closed).toBe(false);
  });

  it("can be set to exactly the people who are here, and then nobody else gets in", async () => {
    const host = await connect();
    await connect();
    await connect();
    host.send({ type: "settings", computers: true, level: "normal", most: 3 });
    await host.next(state((message) => message.settings.most === 3));
    const fourth = await connect();
    expect(fourth.first.type).toBe("full");
  });

  it("can be raised again, and then the next person gets in", async () => {
    const host = await connect();
    host.send({ type: "settings", computers: true, level: "normal", most: 2 });
    await host.next(state((message) => message.settings.most === 2));
    await connect();
    expect((await connect()).first.type).toBe("full");
    host.send({ type: "settings", computers: true, level: "normal", most: 3 });
    await host.next(state((message) => message.settings.most === 3));
    expect((await connect()).first.type).toBe("welcome");
  });

  it("does not count computer karts: during a race a person still gets in, to watch", async () => {
    const host = await connect();
    host.send({ type: "settings", computers: true, level: "normal", most: 2 });
    await host.next(state((message) => message.settings.most === 2));
    host.send({ type: "start" });
    await host.next(state((message) => message.race.phase === "countdown"));
    expect(online.room.playerCount()).toBe(6); // one person and five computer karts
    const late = await connect();
    expect(late.first.type).toBe("welcome");
    const watching = await late.next(state((message) => message.race.watching.includes(late.first.id)));
    expect(watching.computers.karts).toHaveLength(4); // one made way
    expect((await connect()).first.type).toBe("full"); // two people: the limit
  });

  it("goes back to six, with the other defaults, when the last person leaves", async () => {
    const host = await connect();
    host.send({ type: "settings", computers: false, level: "hard", most: 2 });
    await host.next(state((message) => message.settings.most === 2));
    host.socket.close();
    await pause(300);
    expect(online.room.playerCount()).toBe(0);
    const next = await connect();
    const update = await next.next(state(() => true));
    expect(update.settings).toEqual(DEFAULTS);
  });

  it("is kept when the host leaves and someone else becomes the host", async () => {
    const host = await connect();
    const second = await connect();
    host.send({ type: "settings", computers: false, level: "hard", most: 3 });
    await second.next(state((message) => message.settings.most === 3));
    host.socket.close();
    const after = await second.next(state((message) => message.race.host === second.first.id));
    expect(after.settings).toEqual({ computers: false, level: "hard", most: 3 });
  });

  it("lets a signed-in player who is already in the room come back: their older kart leaves", async () => {
    const host = await connect();
    host.send({ type: "settings", computers: true, level: "normal", most: 2 });
    await host.next(state((message) => message.settings.most === 2));
    nextAccount = { id: 7, username: "Ana" };
    const ana = await connect();
    await pause(200); // the server looks up who she is
    // Ana's page lost the connection and joins again while her old kart is still in the room.
    const anaAgain = await connect();
    expect(anaAgain.first.type).toBe("welcome");
    await pause(300);
    expect(ana.heard).toContain("elsewhere");
    expect(ana.closed).toBe(true);
    expect(online.room.playerCount()).toBe(2);
  });

  it("still turns away a different signed-in player, and a guest, at a room that has reached its limit", async () => {
    const host = await connect();
    host.send({ type: "settings", computers: true, level: "normal", most: 2 });
    await host.next(state((message) => message.settings.most === 2));
    nextAccount = { id: 7, username: "Ana" };
    await connect();
    await pause(200);
    nextAccount = { id: 8, username: "Rui" };
    expect((await connect()).first.type).toBe("full");
    nextAccount = null;
    expect((await connect()).first.type).toBe("full");
    await pause(100);
    expect(online.room.playerCount()).toBe(2);
  });
});
