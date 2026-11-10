// Tests for server/online.js: real live connections to a real copy of our
// server, running on this computer.
//
// Each test starts a fresh server with a room for three players, connects
// one or more pretend browsers to it, and looks at what they receive.
//
// These tests take a little longer than the others, because they wait for
// the server's clock, which runs in real time.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import net from "node:net";
import crypto from "node:crypto";
import WebSocket from "ws";
import { createApp } from "../server/app.js";
import { attachOnlinePlay, ONLINE_ADDRESS, MAX_MESSAGES_PER_SECOND } from "../server/online.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

const ROOM_SIZE = 3;
const GOODBYE_WAIT = 300; // thousandths of a second the test server waits before hanging up on someone it sent away
const BROKE_THE_RULES = 1008;
const GAS = { type: "keys", gas: true, brake: false, left: false, right: false };
const NO_KEYS = { type: "keys", gas: false, brake: false, left: false, right: false };

let app;
let online;
let port;
let browsers;

beforeEach(async () => {
  app = createApp();
  online = attachOnlinePlay(app, {
    track: TEST_OVAL,
    character: TEST_DRIVER,
    maxPlayers: ROOM_SIZE,
    goodbyeWaitMs: GOODBYE_WAIT,
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  port = app.address().port;
  browsers = [];
});

afterEach(async () => {
  for (const browser of browsers) {
    // Normal pretend browsers have terminate(). The "deaf" ones have destroy().
    (browser.socket.terminate ?? browser.socket.destroy).call(browser.socket);
  }
  online.close();
  await new Promise((resolve) => app.close(resolve));
});

/**
 * Connects a pretend browser. Gives back, once the server has answered:
 *   first        the first message the server sent ("welcome" or "full")
 *   send(x)      sends an object (as our page would) or a raw text
 *   next(test)   waits for the next message for which test(message) is true
 *   closed       resolves with { code, reason } when the connection closes
 * Fails if the server refuses the connection.
 */
function connect({ address = ONLINE_ADDRESS, origin } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}${address}`, origin ? { origin } : {});
    const waiting = []; // tests waiting for a message
    const browser = {
      socket,
      first: null,
      send(message) {
        socket.send(typeof message === "string" ? message : JSON.stringify(message));
      },
      next(test, milliseconds = 3000) {
        return new Promise((found, gaveUp) => {
          const timer = setTimeout(() => gaveUp(new Error("No such message arrived in time")), milliseconds);
          waiting.push({ test, found, timer });
        });
      },
      closed: new Promise((done) => {
        socket.on("close", (code, reason) => done({ code, reason: reason.toString() }));
      }),
    };
    browsers.push(browser);

    socket.on("message", (data) => {
      const message = JSON.parse(data.toString());
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
    socket.on("error", reject); // refused before the connection opened
  });
}

/**
 * Connects a "deaf" browser: one that can send, but never reacts to anything
 * the server sends. In particular it never answers when the server says
 * goodbye. A broken or hostile program can behave like this, and on the
 * internet a goodbye can also simply fail to arrive.
 *
 * A normal browser tool always answers a goodbye by itself, so this one
 * speaks the connection's own language by hand.
 * Gives back:
 *   send(text)   sends a text message
 *   hungUp       resolves when the server has cut the connection
 */
function connectDeaf() {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1");
    const key = crypto.randomBytes(16).toString("base64");
    socket.on("error", reject);
    socket.on("connect", () => {
      // The request a browser sends to turn a normal connection into a live one.
      socket.write(
        `GET ${ONLINE_ADDRESS} HTTP/1.1\r\n` +
          `Host: 127.0.0.1:${port}\r\n` +
          "Upgrade: websocket\r\nConnection: Upgrade\r\n" +
          `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`,
      );
    });
    const hungUp = new Promise((done) => socket.on("close", done));
    socket.once("data", (answer) => {
      if (!answer.toString().startsWith("HTTP/1.1 101")) {
        reject(new Error("The server did not accept the live connection"));
        return;
      }
      socket.on("data", () => {}); // receive everything, react to nothing
      browsers.push({ socket }); // so it is tidied away after the test
      resolve({
        socket,
        hungUp,
        send(text) {
          // One text message in the connection's format: a marker, the
          // length, a 4-byte mask, and the text scrambled with that mask.
          const payload = Buffer.from(text);
          const mask = crypto.randomBytes(4);
          const scrambled = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
          socket.write(Buffer.concat([Buffer.from([0x81, 0x80 | payload.length]), mask, scrambled]));
        },
      });
    });
  });
}

/** Tests for next(): an update that mentions this many karts. */
const stateWith = (count) => (message) => message.type === "state" && message.karts.length === count;

/** One player's kart in an update. */
const kartIn = (update, id) => update.karts.find((kart) => kart.id === id);

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

describe("connecting", () => {
  it("welcomes a browser with a player number, a place and the name of the track", async () => {
    const browser = await connect();
    expect(browser.first.type).toBe("welcome");
    expect(Number.isInteger(browser.first.id)).toBe(true);
    expect(browser.first.place).toBe(0);
    expect(browser.first.track).toBe(TEST_OVAL.name);
  });

  it("gives two browsers different player numbers and places", async () => {
    const first = await connect();
    const second = await connect();
    expect(second.first.id).not.toBe(first.first.id);
    expect(second.first.place).not.toBe(first.first.place);
  });

  it("accepts a browser whose page came from our own site", async () => {
    const browser = await connect({ origin: `http://127.0.0.1:${port}` });
    expect(browser.first.type).toBe("welcome");
  });

  it("sends updates about 20 times a second", async () => {
    const browser = await connect();
    await browser.next(stateWith(1));
    let updates = 0;
    browser.socket.on("message", () => updates++);
    await pause(500);
    // Half a second should bring about 10. Allow plenty of slack for a busy computer.
    expect(updates).toBeGreaterThanOrEqual(5);
    expect(updates).toBeLessThanOrEqual(15);
  });
});

describe("driving together", () => {
  it("lets two browsers see each other's kart move", async () => {
    const driver = await connect();
    const watcher = await connect();
    const before = await watcher.next(stateWith(2));
    const driverStart = kartIn(before, driver.first.id);
    const watcherStart = kartIn(before, watcher.first.id);

    driver.send(GAS);

    // The watcher's browser is told that the driver's kart has moved...
    const seenByWatcher = await watcher.next(
      (message) => message.type === "state" && kartIn(message, driver.first.id)?.x > driverStart.x + 20,
    );
    // ...while the watcher's own kart has stayed where it was.
    expect(kartIn(seenByWatcher, watcher.first.id).x).toBe(watcherStart.x);
    expect(kartIn(seenByWatcher, watcher.first.id).y).toBe(watcherStart.y);

    // And the driver's browser is told the same about its own kart.
    const seenByDriver = await driver.next(
      (message) => message.type === "state" && kartIn(message, driver.first.id)?.x > driverStart.x + 20,
    );
    expect(kartIn(seenByDriver, driver.first.id).steps).toBeGreaterThan(0);
  });

  it("lets each connection drive only its own kart, even when it names another player", async () => {
    const victim = await connect();
    const cheat = await connect();
    const before = await cheat.next(stateWith(2));
    const victimStart = kartIn(before, victim.first.id);
    const cheatStart = kartIn(before, cheat.first.id);

    // The cheat presses the gas and claims to be the victim.
    cheat.send({ ...GAS, id: victim.first.id, player: victim.first.id });

    const after = await cheat.next(
      (message) => message.type === "state" && kartIn(message, cheat.first.id)?.x > cheatStart.x + 20,
    );
    expect(kartIn(after, victim.first.id).x).toBe(victimStart.x);
    expect(kartIn(after, victim.first.id).steps).toBe(0);
  });

  it("puts a kart back at its start when its browser asks to restart", async () => {
    const browser = await connect();
    const start = kartIn(await browser.next(stateWith(1)), browser.first.id);

    browser.send(GAS);
    await browser.next((message) => message.type === "state" && message.karts[0].x > start.x + 20);

    browser.send(NO_KEYS);
    browser.send({ type: "restart" });
    const after = await browser.next((message) => message.type === "state" && message.karts[0].steps === 0);
    expect(after.karts[0].x).toBe(start.x);
    expect(after.karts[0].y).toBe(start.y);
  });

  it("takes a kart off the track when its browser leaves", async () => {
    const stays = await connect();
    const leaves = await connect();
    await stays.next(stateWith(2));

    leaves.socket.close();

    const after = await stays.next(stateWith(1));
    expect(after.karts[0].id).toBe(stays.first.id);
  });

  it("stops its clock when the last browser leaves, and starts it again for the next one", async () => {
    const first = await connect();
    await first.next(stateWith(1));
    first.socket.close();
    await first.closed;
    await pause(50);

    const stepsWhenEmpty = online.room.stepCount();
    await pause(150);
    expect(online.room.stepCount()).toBe(stepsWhenEmpty);

    const second = await connect();
    await second.next(stateWith(1));
    await pause(100);
    expect(online.room.stepCount()).toBeGreaterThan(stepsWhenEmpty);
  });
});

describe("what the server refuses", () => {
  it("disconnects a browser that sends something it does not understand", async () => {
    const notUnderstood = [
      "hello",
      '{"type":"teleport","x":900,"y":80}',
      '{"type":"keys","gas":"true","brake":false,"left":false,"right":false}',
      '{"type":"keys","gas":true}',
      "[]",
    ];
    for (const text of notUnderstood) {
      const browser = await connect();
      browser.send(text);
      const { code } = await browser.closed;
      expect(code, text).toBe(BROKE_THE_RULES);
    }
  });

  it("does not move a kart for a message it did not understand", async () => {
    const watcher = await connect();
    const cheat = await connect();
    const before = await watcher.next(stateWith(2));
    const watcherStart = kartIn(before, watcher.first.id);

    cheat.send('{"type":"teleport","x":900,"y":80}');
    await cheat.closed;

    // The cheat is gone from the track, and nothing else moved.
    const after = await watcher.next(stateWith(1));
    expect(kartIn(after, watcher.first.id).x).toBe(watcherStart.x);
  });

  it("takes a rule-breaker's kart off the track at once, even if its browser never answers the goodbye", async () => {
    // Found on the live server: the server said goodbye and then waited for
    // an answer that did not come, and the kart stayed on the track.
    const watcher = await connect();
    const deaf = await connectDeaf();
    await watcher.next(stateWith(2));

    deaf.send("hello"); // not a message the server understands

    await watcher.next(stateWith(1), 250); // gone within a quarter of a second
    expect(online.room.playerCount()).toBe(1);
    deaf.socket.destroy();
  });

  it("hangs up on a rule-breaker that does not leave by itself", async () => {
    const deaf = await connectDeaf();
    deaf.send("hello");
    const result = await Promise.race([
      deaf.hungUp.then(() => "the server hung up"),
      pause(GOODBYE_WAIT + 1500).then(() => "still connected"),
    ]);
    expect(result).toBe("the server hung up");
  });

  it("hangs up on a player it turned away from a full room, even if their browser never answers", async () => {
    for (let player = 0; player < ROOM_SIZE; player++) {
      await connect();
    }
    const deaf = await connectDeaf(); // one too many
    const result = await Promise.race([
      deaf.hungUp.then(() => "the server hung up"),
      pause(GOODBYE_WAIT + 1500).then(() => "still connected"),
    ]);
    expect(result).toBe("the server hung up");
    expect(online.room.playerCount()).toBe(ROOM_SIZE);
  });

  it("disconnects a browser that sends data that is not text", async () => {
    const browser = await connect();
    browser.socket.send(Buffer.from([1, 2, 3, 4]));
    const { code } = await browser.closed;
    expect(code).toBe(BROKE_THE_RULES);
  });

  it("disconnects a browser that sends a message far too long", async () => {
    const browser = await connect();
    browser.send(JSON.stringify(GAS).padEnd(5000, " "));
    const { code } = await browser.closed;
    expect(code).not.toBe(1000); // not a normal goodbye
    expect(online.room.playerCount()).toBe(0);
  });

  it("disconnects a browser that sends more messages in a second than a player could", async () => {
    const browser = await connect();
    for (let message = 0; message < MAX_MESSAGES_PER_SECOND + 10; message++) {
      browser.send(message % 2 === 0 ? GAS : NO_KEYS);
    }
    const { code, reason } = await browser.closed;
    expect(code).toBe(BROKE_THE_RULES);
    expect(reason).toBe("Too many messages");
  });

  it("keeps a browser that sends a normal number of messages", async () => {
    const browser = await connect();
    for (let message = 0; message < 20; message++) {
      browser.send(message % 2 === 0 ? GAS : NO_KEYS);
    }
    await pause(200);
    expect(browser.socket.readyState).toBe(WebSocket.OPEN);
  });

  it("turns a player away when the room is full, and lets one in when a place frees up", async () => {
    const players = [];
    for (let player = 0; player < ROOM_SIZE; player++) {
      players.push(await connect());
    }

    const oneTooMany = await connect();
    expect(oneTooMany.first.type).toBe("full");
    await oneTooMany.closed;
    expect(online.room.playerCount()).toBe(ROOM_SIZE);

    players[0].socket.close();
    await players[0].closed;
    await players[1].next(stateWith(ROOM_SIZE - 1));

    const newcomer = await connect();
    expect(newcomer.first.type).toBe("welcome");
  });

  it("refuses a live connection to any other address", async () => {
    await expect(connect({ address: "/" })).rejects.toThrow();
    await expect(connect({ address: "/play/extra" })).rejects.toThrow();
    await expect(connect({ address: "/health" })).rejects.toThrow();
    expect(online.room.playerCount()).toBe(0);
  });

  it("refuses a connection started by a page on someone else's website", async () => {
    await expect(connect({ origin: "https://some-other-site.example" })).rejects.toThrow();
    await expect(connect({ origin: "not a web address" })).rejects.toThrow();
    expect(online.room.playerCount()).toBe(0);
  });

  it("still answers normal page requests while online play is switched on", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
