// Tests for leaving online play: a player who left must not stay on the
// track as a "ghost" kart.
//
// A kart goes when its browser's connection closes (server/online.js). Two
// things can keep a ghost on the track:
//   - a browser that vanished without closing (a closed lid, lost Wi-Fi):
//     the server's still-there check must notice it soon
//   - a page that was left but kept its connection: client/page-life.js
//     makes the page close it (tested in page-life.test.js)
//
// These tests start a real copy of the server with real live connections.
// The still-there check runs every fifth of a second here, instead of every
// 5 seconds, so the tests do not have to wait.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { createApp } from "../server/app.js";
import { attachOnlinePlay, ONLINE_ADDRESS, STILL_THERE_CHECK_MS } from "../server/online.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

const CHECK_MS = 200;

let app;
let online;
let port;
let sockets;

beforeEach(async () => {
  app = createApp();
  online = attachOnlinePlay(app, {
    track: TEST_OVAL,
    character: TEST_DRIVER,
    maxPlayers: 8,
    goodbyeWaitMs: 300,
    stillThereCheckMs: CHECK_MS,
  });
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

/**
 * Connects a pretend browser and waits for its welcome.
 * "answersChecks: false" makes one that never answers the server's
 * still-there check, like a laptop whose lid was closed.
 */
function connect({ answersChecks = true } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}${ONLINE_ADDRESS}`, { autoPong: answersChecks });
    sockets.push(socket);
    socket.once("message", () => resolve(socket));
    socket.on("error", reject);
  });
}

/** Closes a pretend browser the polite way, as a page does when it is left, and waits until it is closed. */
function leave(socket) {
  return new Promise((resolve) => {
    socket.once("close", resolve);
    socket.close(1000, "left the page");
  });
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Waits until the room has this many players, or gives up after "milliseconds". Gives the last count. */
async function waitForPlayers(count, milliseconds) {
  const giveUpAt = Date.now() + milliseconds;
  while (online.room.playerCount() !== count && Date.now() < giveUpAt) {
    await pause(20);
  }
  return online.room.playerCount();
}

describe("a player who left", () => {
  it("does not stay on the track: the kart goes as soon as the page says goodbye", async () => {
    const browser = await connect();
    expect(online.room.playerCount()).toBe(1);
    await leave(browser);
    expect(await waitForPlayers(0, 500)).toBe(0);
  });

  it("leaves exactly one kart after going away and coming back, round after round", async () => {
    // Menu, online, menu, online... as in the bug report: never two karts for one player.
    let browser = await connect();
    for (let round = 0; round < 3; round++) {
      await leave(browser);
      browser = await connect();
      expect(await waitForPlayers(1, 500)).toBe(1);
    }
  });

  it("is removed by the still-there check when the browser vanished without a goodbye", async () => {
    await connect({ answersChecks: false });
    expect(online.room.playerCount()).toBe(1);
    // Removed at the latest at the second check after it stopped answering.
    expect(await waitForPlayers(0, 2 * CHECK_MS + 300)).toBe(0);
  });

  it("does not take the others with it: a player who answers the checks stays", async () => {
    await connect({ answersChecks: false });
    await connect();
    await pause(5 * CHECK_MS); // five checks
    expect(online.room.playerCount()).toBe(1);
  });
});

describe("how often the server checks", () => {
  it("checks every 5 seconds: a ghost lasts at most about 10 seconds, and a slow answer still has time", () => {
    expect(STILL_THERE_CHECK_MS).toBe(5000);
  });
});
