// Computer karts in an online room, over a real live connection
// (server/online.js with server/computer-players.js).

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { createApp } from "../server/app.js";
import { attachOnlinePlay, ONLINE_ADDRESS } from "../server/online.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

let app;
let online;
let port;
let browsers;
let saves;
let lastNames = null; // the last list of names any pretend browser was sent

/** Opens online play on the test oval. "computerKarts" as the real server gives it, unless a test says otherwise. */
async function open({ computerKarts = true } = {}) {
  app = createApp();
  saves = [];
  // Pretend accounts: each browser is signed in as its own player (Ana1,
  // Ana2 ...: one kart per signed-in player), and every result that would be
  // written to the leaderboard is written down here instead.
  let signedIn = 0;
  const accounts = {
    playerForSession: () => {
      signedIn++;
      return Promise.resolve({ id: signedIn, username: `Ana${signedIn}` });
    },
    saveResult: (result) => {
      saves.push(result);
      return Promise.resolve(true);
    },
  };
  online = attachOnlinePlay(app, {
    track: TEST_OVAL,
    tracks: { "test-oval": TEST_OVAL },
    character: TEST_DRIVER,
    accounts, // the room takes as many players as the real one: six
    computerKarts,
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  port = app.address().port;
}

beforeEach(() => {
  browsers = [];
});

afterEach(async () => {
  for (const browser of browsers) {
    browser.socket.terminate();
  }
  online.close();
  await new Promise((resolve) => app.close(resolve));
});

/** A pretend browser: send(x), next(test) waits for a message, latest is the newest update. */
function connect() {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}${ONLINE_ADDRESS}`);
    const waiting = [];
    const browser = {
      socket,
      first: null,
      latest: null,
      send: (message) => socket.send(JSON.stringify(message)),
      next(test, milliseconds = 4000) {
        return new Promise((found, gaveUp) => {
          const timer = setTimeout(() => gaveUp(new Error("No such message arrived in time")), milliseconds);
          waiting.push({ test, found, timer });
        });
      },
    };
    browsers.push(browser);
    socket.on("message", (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === "state") {
        browser.latest = message;
      }
      if (message.type === "names") {
        lastNames = message.names;
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

describe("computer karts online", () => {
  it("fill the race up to six karts when the host starts it, as the characters nobody is", async () => {
    await open();
    const host = await connect();
    host.send({ type: "character", id: "ro" });
    await pause(100);
    host.send({ type: "start" });
    const counting = await host.next(state((message) => message.race.phase === "countdown"));
    expect(counting.karts).toHaveLength(6);
    expect(counting.computers.on).toBe(true);
    expect(counting.computers.karts).toHaveLength(5);
    const characters = counting.karts.map((kart) => kart.character);
    expect(new Set(characters).size).toBe(6); // every character once
    expect(counting.karts.find((kart) => kart.id === host.first.id).character).toBe("ro");
  });

  it("are never listed as signed-in players", async () => {
    await open();
    const host = await connect();
    await pause(300); // the server looks up who is signed in, then sends the names
    expect(lastNames).toEqual({ [host.first.id]: "Ana1" });
    host.send({ type: "start" });
    const counting = await host.next(state((message) => message.race.phase === "countdown"));
    await pause(300); // time for any list of names sent at the start to arrive
    expect(counting.computers.karts).toHaveLength(5);
    // The last list of names the server sent still has only Ana1.
    expect(lastNames).toEqual({ [host.first.id]: "Ana1" });
  });

  it("are not there when the server was not asked for them (the tests of the room before)", async () => {
    await open({ computerKarts: false });
    const host = await connect();
    host.send({ type: "start" });
    const counting = await host.next(state((message) => message.race.phase === "countdown"));
    expect(counting.karts).toHaveLength(1);
    expect(counting.computers).toEqual({ on: false, karts: [] });
  });

  it("can be switched off by the host before a race", async () => {
    await open();
    const host = await connect();
    host.send({ type: "computers", on: false });
    await host.next(state((message) => message.computers.on === false));
    host.send({ type: "start" });
    const counting = await host.next(state((message) => message.race.phase === "countdown"));
    expect(counting.karts).toHaveLength(1);
    expect(counting.computers.karts).toEqual([]);
  });

  it("cannot be switched by someone who is not the host", async () => {
    await open();
    const host = await connect();
    const other = await connect();
    other.send({ type: "computers", on: false });
    await pause(300);
    expect(other.latest.computers.on).toBe(true);
    expect(host.latest.computers.on).toBe(true);
  });

  it("cannot be switched by the host during a race", async () => {
    await open();
    const host = await connect();
    host.send({ type: "start" });
    await host.next(state((message) => message.race.phase === "countdown"));
    host.send({ type: "computers", on: false });
    await pause(300);
    expect(host.latest.computers.on).toBe(true);
    expect(host.latest.computers.karts).toHaveLength(5);
  });

  it("leave when the last person leaves, so the room is empty again", async () => {
    await open();
    const host = await connect();
    host.send({ type: "start" });
    await host.next(state((message) => message.race.phase === "countdown"));
    expect(online.room.playerCount()).toBe(6);
    host.socket.close();
    await pause(300);
    expect(online.room.playerCount()).toBe(0);
  });

  it("race to the end, but their results are never saved: only people's are", async () => {
    await open();
    const host = await connect();
    host.send({ type: "start" });
    await host.next(
      state((message) => message.computers.karts.length === 5 && message.karts.filter((kart) => kart.finished).length === 5),
      60000,
    );
    await pause(200);
    expect(saves).toEqual([]); // the person has not finished, and computer karts are never saved
  }, 70000);

  it("make way for a person who arrives at a full room during a race: one leaves, the person watches", async () => {
    await open();
    const host = await connect();
    host.send({ type: "start" });
    await host.next(state((message) => message.race.phase === "countdown"));
    expect(online.room.playerCount()).toBe(6); // full: one person and five computer karts
    const late = await connect();
    expect(late.first.type).not.toBe("full");
    const watching = await late.next(state((message) => message.race.watching.includes(late.first.id)));
    expect(watching.computers.karts).toHaveLength(4);
    expect(watching.karts).toHaveLength(5); // the race goes on with the others
  });

  it("all leave when a person arrives at a full room between races, and new ones fill the next race", async () => {
    await open();
    const host = await connect();
    host.send({ type: "start" });
    await host.next(state((message) => message.race.phase === "countdown"));
    // End the race the quick way: the only person leaves, so the computer karts go and the room opens again.
    host.socket.close();
    await pause(300);
    expect(online.room.playerCount()).toBe(0);
    const first = await connect();
    const second = await connect();
    expect(second.first.type).not.toBe("full");
    first.send({ type: "start" });
    const counting = await first.next(state((message) => message.race.phase === "countdown"));
    expect(counting.computers.karts).toHaveLength(4);
    expect(counting.karts).toHaveLength(6);
  });
});
