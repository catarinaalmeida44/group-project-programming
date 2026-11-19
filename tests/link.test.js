// Tests for what the game does while the server is slow to answer, or
// cannot be reached:
//   client/waking.js   the words for "the server is waking up"
//   client/link.js     the online page: when to try to connect again, and
//                      what the card over the picture says
//   client/account-api.js  a question to the server that is never answered
//   client/leaderboard.js  the Leaderboard panel while it waits
//   client/online.html     the card that online.js fills in is really there
//
// Our server falls asleep when nobody has used it for 15 minutes, and takes
// up to a minute to wake up (waking.js explains). None of this needs a
// browser or a server: it is words, numbers and pretend clocks.

import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { waitingWords, SLOW_AFTER_MS, WAKE_SECONDS, WAKING_SENTENCE } from "../client/waking.js";
import {
  linkCard,
  afterClose,
  retryWaitMs,
  CARD_AFTER_MS,
  LONGER_THAN_USUAL_MS,
  GIVE_UP_AFTER_MS,
  LOST_AFTER_QUIET_MS,
  BROKE_THE_RULES,
} from "../client/link.js";
import { QUIET_AFTER_MS } from "../client/net.js";
import { createAccountApi, ANSWER_WITHIN_MS } from "../client/account-api.js";
import { createLeaderboard } from "../client/leaderboard.js";
import { sharedBoards, LOADING_TEXT } from "../client/leaderboard-view.js";
import { CHECKING_TEXT, CHECKING_SLOW_TEXT, SIGNING_OUT_SLOW_TEXT } from "../client/account-view.js";

const read = (name) => readFileSync(new URL(`../client/${name}`, import.meta.url), "utf8");

describe("the words for a server that is waking up", () => {
  it("says only the plain words at first", () => {
    expect(waitingWords("Signing in…", 0)).toBe("Signing in…");
    expect(waitingWords("Signing in…", SLOW_AFTER_MS - 1)).toBe("Signing in…");
  });

  it("adds that the server is waking up once the wait is a few seconds long", () => {
    expect(waitingWords("Signing in…", SLOW_AFTER_MS)).toBe(`Signing in… ${WAKING_SENTENCE}`);
    expect(waitingWords("Signing in…", 40_000)).toContain("waking up");
  });

  it("says how long that can take", () => {
    expect(WAKING_SENTENCE).toContain("minute");
    expect(WAKE_SECONDS).toBe(60);
  });

  it("treats a strange time as 'only just started'", () => {
    for (const strange of [undefined, null, NaN, "long", -5]) {
      expect(waitingWords("Loading…", strange), String(strange)).toBe("Loading…");
    }
  });

  it("is what the account corner and the sign-out button say when they wait long", () => {
    expect(CHECKING_SLOW_TEXT).toContain(CHECKING_TEXT);
    expect(CHECKING_SLOW_TEXT).toContain(WAKING_SENTENCE);
    expect(CHECKING_SLOW_TEXT).toContain("You can already race"); // a single race needs no server
    expect(SIGNING_OUT_SLOW_TEXT).toContain(WAKING_SENTENCE);
  });
});

describe("the online page: when to try to connect again", () => {
  it("tries again soon at first, then every five seconds", () => {
    expect(retryWaitMs(1)).toBe(500);
    expect(retryWaitMs(2)).toBe(1000);
    expect(retryWaitMs(3)).toBe(2000);
    expect(retryWaitMs(4)).toBe(3000);
    expect(retryWaitMs(5)).toBe(5000);
    expect(retryWaitMs(6)).toBe(5000);
    expect(retryWaitMs(500)).toBe(5000);
  });

  it("never gives a strange wait, whatever it is asked", () => {
    for (const strange of [0, -3, 1.5, NaN, undefined, null, "many"]) {
      expect(retryWaitMs(strange), String(strange)).toBe(500);
    }
  });

  it("tries again by itself when the connection failed or was lost", () => {
    expect(afterClose({ code: 1006, toldFull: false, leaving: false })).toBe("again"); // 1006: cut off without a goodbye
    expect(afterClose({ code: 1001, toldFull: false, leaving: false })).toBe("again"); // 1001: the server is going away
    expect(afterClose({ code: undefined, toldFull: false, leaving: false })).toBe("again");
  });

  it("does NOT try again when the player is leaving the page", () => {
    expect(afterClose({ code: 1000, toldFull: false, leaving: true })).toBe("stop");
    expect(afterClose({ code: 1006, toldFull: true, leaving: true })).toBe("stop");
  });

  it("does NOT try again by itself when the room is full: the card offers a button", () => {
    expect(afterClose({ code: 1013, toldFull: true, leaving: false })).toBe("full");
  });

  it("does NOT try again by itself when the server sent this browser away", () => {
    expect(afterClose({ code: BROKE_THE_RULES, toldFull: false, leaving: false })).toBe("sentAway");
  });

  it("gives up after a while, but not before a waking server has had its minute", () => {
    expect(GIVE_UP_AFTER_MS).toBeGreaterThan(WAKE_SECONDS * 1000);
    expect(LOST_AFTER_QUIET_MS).toBeGreaterThan(QUIET_AFTER_MS); // first "gone quiet", only later "lost"
  });
});

describe("the online page: the card over the picture", () => {
  const connecting = (waitedMs, more = {}) => linkCard({ state: "connecting", waitedMs, ...more });

  it("shows no card while all is well in the room", () => {
    expect(linkCard({ state: "joined", quietMs: 0 })).toBe(null);
    expect(linkCard({ state: "joined", quietMs: QUIET_AFTER_MS })).toBe(null);
  });

  it("shows no card for a connection that is made quickly, so it does not flash", () => {
    expect(connecting(0)).toBe(null);
    expect(connecting(CARD_AFTER_MS - 1)).toBe(null);
  });

  it("says 'Connecting' when it takes a little longer", () => {
    const card = connecting(CARD_AFTER_MS);
    expect(card.title).toBe("Connecting…");
    expect(card.share).toBe(null); // no road yet
    expect(card.button).toBe(null);
  });

  it("says the server is waking up after a few seconds, and that the player need not do anything", () => {
    const card = connecting(SLOW_AFTER_MS);
    expect(card.title).toBe("The server is waking up");
    expect(card.text).toContain("up to a minute");
    expect(card.text).toContain("by itself");
    expect(card.button).toBe(null); // nothing to press: the page tries again by itself
  });

  it("counts the seconds, and the little kart drives along its road for a minute", () => {
    expect(connecting(14_600).waited).toBe("Waiting for 14 s");
    expect(connecting(30_000).share).toBeCloseTo(0.5, 5);
    expect(connecting(60_000).share).toBe(1);
    expect(connecting(100_000).share).toBe(1); // it stops at the end of the road
  });

  it("says that it is taking longer than usual once the minute is well over, and keeps trying", () => {
    expect(connecting(LONGER_THAN_USUAL_MS - 1).title).toBe("The server is waking up");
    const card = connecting(LONGER_THAN_USUAL_MS);
    expect(card.title).toBe("Still waking up");
    expect(card.text).toContain("longer than usual");
    expect(card.button).toBe(null);
    expect(LONGER_THAN_USUAL_MS).toBeGreaterThan(WAKE_SECONDS * 1000);
    expect(LONGER_THAN_USUAL_MS).toBeLessThan(GIVE_UP_AFTER_MS);
  });

  it("says 'Connection lost' when the player was in the room before", () => {
    const soon = connecting(CARD_AFTER_MS, { wasInRoom: true });
    expect(soon.title).toBe("Connection lost");
    expect(soon.text).toContain("Joining the room again");
    const later = connecting(10_000, { wasInRoom: true });
    expect(later.title).toBe("Connection lost");
    expect(later.text).toContain("by itself");
    expect(later.text).toContain("watch"); // back during a race: you watch it and drive in the next one
    expect(later.waited).toBe("Waiting for 10 s");
  });

  it("says so when the computer has no internet, at once", () => {
    const card = connecting(0, { online: false });
    expect(card.title).toBe("No internet connection");
    expect(card.button).toBe(null);
  });

  it("warns when the server goes quiet in the room", () => {
    const card = linkCard({ state: "joined", quietMs: QUIET_AFTER_MS + 1 });
    expect(card.title).toBe("The server has gone quiet");
    expect(card.button).toBe(null);
  });

  it("offers a button when the room is full, the server sent us away, or the page gave up", () => {
    expect(linkCard({ state: "full" })).toMatchObject({ title: "The room is full", button: "Try again" });
    expect(linkCard({ state: "sentAway" })).toMatchObject({ title: "The server closed the connection", button: "Join again" });
    expect(linkCard({ state: "gaveUp" })).toMatchObject({ title: "The server cannot be reached", button: "Try again" });
  });

  it("never shows a raw error, a code or a web address", () => {
    const cards = [
      connecting(1000),
      connecting(5000),
      connecting(5000, { wasInRoom: true }),
      connecting(0, { online: false }),
      linkCard({ state: "joined", quietMs: 5000 }),
      linkCard({ state: "full" }),
      linkCard({ state: "sentAway" }),
      linkCard({ state: "gaveUp" }),
    ];
    for (const card of cards) {
      const words = `${card.title} ${card.text} ${card.waited} ${card.button ?? ""}`;
      expect(words, words).not.toMatch(/error|undefined|null|NaN|WebSocket|ws:|wss:|http|10[01][0-9]|\{|\}/i);
    }
  });

  it("does not break on a strange waiting time", () => {
    for (const strange of [undefined, null, NaN, -1, "soon", Infinity]) {
      expect(() => connecting(strange), String(strange)).not.toThrow();
    }
    expect(connecting(NaN)).toBe(null);
  });
});

describe("the online page has the card that online.js fills in", () => {
  const page = read("online.html");
  const code = read("online.js");

  it("has every part of the page that online.js asks for by name", () => {
    const asked = [...code.matchAll(/getElementById\("([^"]+)"\)/g)].map((match) => match[1]);
    expect(asked).toContain("link-card");
    expect(asked).toContain("link-again");
    for (const id of asked) {
      expect(page, id).toContain(`id="${id}"`);
    }
  });

  it("starts with the card hidden, and offers a way back to the menu beside its button", () => {
    expect(page).toMatch(/<div id="link-card" class="link-veil" hidden>/);
    expect(page).toMatch(/<div id="link-actions" class="link-actions" hidden>[\s\S]*?<a class="button" href="\/">Back to the menu<\/a>/);
  });

  it("no longer asks the player to reload the page", () => {
    expect(code).not.toMatch(/Reload the page|reload the page to/i);
  });
});

describe("a question to the server that is never answered", () => {
  it("is given up after a while, and answered as 'could not be reached'", async () => {
    // A pretend server that never answers, but lets itself be called off, like the browser's own fetch.
    const never = (address, options) =>
      new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new Error("called off")));
      });
    const api = createAccountApi(never, { answerWithinMs: 20 });
    const answer = await api.logIn("ana_1", "a-long-password");
    expect(answer.ok).toBe(false);
    expect(answer.code).toBe("offline");
    expect(answer.message).toBe("The server could not be reached. Try again in a moment.");
    expect((await api.getMe()).available).toBe(false);
  });

  it("says the server is starting up when the hosting company answers in its place", async () => {
    // Not our format, and one of the numbers a hosting company uses for "the server behind me is not up".
    for (const status of [502, 503, 504]) {
      const api = createAccountApi(async () => ({
        status,
        json: async () => {
          throw new Error("this is a web page, not our format");
        },
      }));
      const answer = await api.logIn("ana_1", "a-long-password");
      expect(answer, String(status)).toEqual({ ok: false, code: "offline", message: "The server is starting up. Try again in a minute." });
    }
  });

  it("still shows our own server's sentence when it is our server that says 'not available'", async () => {
    const ours = { ok: false, code: "unavailable", message: "Accounts could not be reached just now. Try again in a moment." };
    const api = createAccountApi(async () => ({ status: 503, json: async () => ours }));
    expect(await api.logIn("ana_1", "a-long-password")).toEqual(ours);
  });

  it("waits long enough for a server that is waking up", () => {
    expect(ANSWER_WITHIN_MS).toBeGreaterThan(WAKE_SECONDS * 1000);
  });

  it("does not call off a question that was answered in time", async () => {
    let signal = null;
    const quick = async (address, options) => {
      signal = options.signal;
      return { json: async () => ({ ok: true, signedIn: false }) };
    };
    const api = createAccountApi(quick, { answerWithinMs: 20 });
    expect(await api.getMe()).toEqual({ available: true, signedIn: false, username: null });
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(signal.aborted).toBe(false);
  });
});

describe("the Leaderboard panel while it waits", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("says the server is waking up when told the wait is long", () => {
    expect(sharedBoards({ loading: true, slow: false, answer: null, me: null }).text).toBe(LOADING_TEXT);
    expect(sharedBoards({ loading: true, slow: true, answer: null, me: null })).toEqual({
      kind: "loading",
      text: `${LOADING_TEXT} ${WAKING_SENTENCE}`,
    });
  });

  it("says so by itself after a few seconds without an answer, and shows the boards when it comes", async () => {
    vi.useFakeTimers();
    let answerNow = null;
    const api = { getLeaderboard: () => new Promise((resolve) => (answerNow = resolve)) };
    const views = [];
    const tracks = { "test-oval": { name: "Test oval" } };
    const leaderboard = createLeaderboard({ api, storage: null, tracks, show: (view) => views.push(view) });

    const loaded = leaderboard.load();
    expect(views.at(-1).shared.text).toBe(LOADING_TEXT);
    await vi.advanceTimersByTimeAsync(SLOW_AFTER_MS - 1);
    expect(views.at(-1).shared.text).toBe(LOADING_TEXT);
    await vi.advanceTimersByTimeAsync(1);
    expect(views.at(-1).shared.text).toBe(`${LOADING_TEXT} ${WAKING_SENTENCE}`);

    answerNow({ ok: true, track: "test-oval", races: [], laps: [], mine: null });
    await loaded;
    expect(views.at(-1).shared.kind).toBe("ready");
  });

  it("does not say so when the answer came quickly", async () => {
    vi.useFakeTimers();
    const api = { getLeaderboard: async () => ({ ok: true, track: "test-oval", races: [], laps: [], mine: null }) };
    const views = [];
    const leaderboard = createLeaderboard({ api, storage: null, tracks: { "test-oval": { name: "Test oval" } }, show: (view) => views.push(view) });
    await leaderboard.load();
    const shownBefore = views.length;
    await vi.advanceTimersByTimeAsync(SLOW_AFTER_MS * 2);
    expect(views).toHaveLength(shownBefore); // nothing more was shown: the wait was called off
    expect(views.at(-1).shared.kind).toBe("ready");
  });
});
