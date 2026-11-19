// Tests for the rule the team added on 19 November 2026: a signed-in player
// has ONE kart in a room (server/online.js). When they join the room a
// second time, from another tab or another computer, the new connection
// stays and the older one is told why and sent away.
//
// Why: a forgotten tab kept a second kart on the grid under the same name.
// It took a place, could be the host, and held up the end of every race.
//
// Like online-accounts.test.js, these use real live connections to a real
// copy of our server on this computer, with accounts in a pretend store.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { createApp } from "../server/app.js";
import { attachOnlinePlay, ONLINE_ADDRESS } from "../server/online.js";
import { createAccounts } from "../server/accounts.js";
import { SESSION_COOKIE } from "../server/api.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { createMemoryStore } from "./memory-store.js";
import { createSprintTrack } from "./sprint-track.js";
import { readServerMessage } from "../client/net.js";
import { afterClose, linkCard } from "../client/link.js";

const quickPasswords = {
  hash: async (password) => `scrambled(${password})`,
  matches: async (password, stored) => stored === `scrambled(${password})`,
  pretend: async () => {},
};

let app;
let online;
let port;
let accounts;
let browsers;

beforeEach(async () => {
  accounts = createAccounts(createMemoryStore(), { passwords: quickPasswords });
  const sprint = createSprintTrack("Sprint test track");
  const other = createSprintTrack("Other test track");
  app = createApp({ accounts });
  online = attachOnlinePlay(app, { track: sprint, tracks: { sprint, other }, character: TEST_DRIVER, maxPlayers: 5, accounts, goodbyeWaitMs: 300 });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  port = app.address().port;
  browsers = [];
});

afterEach(async () => {
  for (const browser of browsers) {
    browser.socket.terminate();
  }
  online.close();
  await new Promise((resolve) => app.close(resolve));
});

/** Makes an account and signs it in. Gives the cookie a browser would send. */
async function signedIn(username) {
  const { player } = await accounts.signUp(username, "a-long-password");
  return `${SESSION_COOKIE}=${await accounts.startSession(player.id)}`;
}

/**
 * Connects a pretend browser, with a cookie if one is given. Gives back,
 * once the server has welcomed it: { id, messages, next(test), closed }.
 */
function connect({ address = ONLINE_ADDRESS, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}${address}`, cookie ? { headers: { Cookie: cookie } } : {});
    const waiting = [];
    const browser = {
      socket,
      id: null,
      messages: [],
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
      if (message.type === "welcome") {
        browser.id = message.id;
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
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
/** Is this connection still open a moment later? */
async function staysOpen(browser) {
  await pause(250);
  return browser.socket.readyState === WebSocket.OPEN;
}

describe("a signed-in player who joins a room twice", () => {
  it("keeps the newer connection, and the older one is told why and closed", async () => {
    const cookie = await signedIn("Ana");
    const older = await connect({ cookie });
    await older.next(ofType("account"));
    const newer = await connect({ cookie });

    expect(await older.next(ofType("elsewhere"))).toEqual({ type: "elsewhere" });
    expect((await older.closed).code).toBe(1000); // closed on purpose: nothing went wrong
    expect(await newer.next(ofType("account"))).toEqual({ type: "account", username: "Ana" });
    expect(await staysOpen(newer)).toBe(true);
  });

  it("leaves one kart in the room, not two, and one name", async () => {
    const cookie = await signedIn("Ana");
    const older = await connect({ cookie });
    await older.next(ofType("account"));
    const newer = await connect({ cookie });
    await older.closed;

    expect(online.room.playerCount()).toBe(1);
    const state = await newer.next((message) => message.type === "state" && message.karts.length === 1);
    expect(state.karts[0].id).toBe(newer.id);
    const names = await newer.next((message) => message.type === "names" && Object.keys(message.names).length === 1);
    expect(names.names).toEqual({ [newer.id]: "Ana" });
  });

  it("takes the older kart off the track at once, without waiting for its browser to answer", async () => {
    const cookie = await signedIn("Ana");
    const older = await connect({ cookie });
    await older.next(ofType("account"));
    const newer = await connect({ cookie });
    await newer.next(ofType("account"));
    expect(online.room.playerCount()).toBe(1); // already, whatever the older browser does
  });

  it("works again and again: a third tab sends the second away", async () => {
    const cookie = await signedIn("Ana");
    const first = await connect({ cookie });
    await first.next(ofType("account"));
    const second = await connect({ cookie });
    await first.closed;
    await second.next(ofType("account"));
    const third = await connect({ cookie });
    await second.next(ofType("elsewhere"));
    await second.closed;
    expect(await staysOpen(third)).toBe(true);
    expect(online.room.playerCount()).toBe(1);
  });
});

describe("who is NOT sent away", () => {
  it("two different signed-in players in the same room", async () => {
    const ana = await connect({ cookie: await signedIn("Ana") });
    const rui = await connect({ cookie: await signedIn("Rui") });
    await ana.next(ofType("account"));
    await rui.next(ofType("account"));
    expect(await staysOpen(ana)).toBe(true);
    expect(await staysOpen(rui)).toBe(true);
    expect(online.room.playerCount()).toBe(2);
    expect(ana.messages.some(ofType("elsewhere"))).toBe(false);
  });

  it("two guests, even from the same computer: a guest has no name to be recognised by", async () => {
    const one = await connect();
    const two = await connect();
    await one.next(ofType("account"));
    await two.next(ofType("account"));
    expect(await staysOpen(one)).toBe(true);
    expect(await staysOpen(two)).toBe(true);
    expect(online.room.playerCount()).toBe(2);
  });

  it("a guest, when a signed-in player joins", async () => {
    const guest = await connect();
    const ana = await connect({ cookie: await signedIn("Ana") });
    await ana.next(ofType("account"));
    expect(await staysOpen(guest)).toBe(true);
    expect(online.room.playerCount()).toBe(2);
  });

  it("the same player in the rooms of two different tracks: it is one kart in each room", async () => {
    const cookie = await signedIn("Ana");
    const here = await connect({ cookie, address: `${ONLINE_ADDRESS}?track=sprint` });
    const there = await connect({ cookie, address: `${ONLINE_ADDRESS}?track=other` });
    await here.next(ofType("account"));
    await there.next(ofType("account"));
    expect(await staysOpen(here)).toBe(true);
    expect(await staysOpen(there)).toBe(true);
    expect(online.rooms.sprint.playerCount()).toBe(1);
    expect(online.rooms.other.playerCount()).toBe(1);
  });

  it("a cookie that is not a real ticket: that browser is a guest like any other", async () => {
    const one = await connect({ cookie: `${SESSION_COOKIE}=not-a-real-ticket` });
    const two = await connect({ cookie: `${SESSION_COOKIE}=not-a-real-ticket` });
    await two.next(ofType("account"));
    expect(await staysOpen(one)).toBe(true);
    expect(online.room.playerCount()).toBe(2);
  });
});

describe("what the page does with it", () => {
  it("understands the message, and takes nothing else from it", () => {
    expect(readServerMessage('{"type":"elsewhere"}')).toEqual({ type: "elsewhere" });
    expect(readServerMessage('{"type":"elsewhere","then":"<b>do this</b>"}')).toEqual({ type: "elsewhere" });
  });

  it("does NOT come back by itself, or the two tabs would throw each other out for ever", () => {
    expect(afterClose({ code: 1000, toldFull: false, toldElsewhere: true, leaving: false })).toBe("elsewhere");
  });

  it("says so on a card, with a button to play here instead", () => {
    const card = linkCard({ state: "elsewhere" });
    expect(card.title).toBe("You are playing somewhere else");
    expect(card.text).toContain("one kart for each player");
    expect(card.button).toBe("Play here instead");
  });
});
