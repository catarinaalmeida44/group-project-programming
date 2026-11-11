// Tests for client/race-view.js (what the online page tells a player about
// the race) and for the Enter key in client/keyboard.js.

import { describe, it, expect } from "vitest";
import { readRace, isWatching, kartToWatch, raceView } from "../client/race-view.js";
import { createKeyboard } from "../client/keyboard.js";
import { COUNTDOWN_STEPS, GO_STEPS } from "../shared/countdown.js";

const OPEN = { phase: "open", countdownSteps: 0, host: null, watching: [] };

/** A race as the server describes it, with some parts changed. */
function race(changes = {}) {
  return { phase: "open", countdownSteps: 0, host: 1, watching: [], ...changes };
}

/** A kart as it appears in an update. */
function kart(id, more = {}) {
  return { id, place: 0, x: 0, y: 0, angle: 0, vx: 0, vy: 0, lapsDone: 0, steps: 0, finished: false, ...more };
}

describe("reading the race part of an update", () => {
  it("gives the phase, the countdown, the host and who is watching", () => {
    const update = { type: "state", race: { phase: "racing", countdownSteps: 200, host: 3, watching: [5, 6] } };
    expect(readRace(update)).toEqual({ phase: "racing", countdownSteps: 200, host: 3, watching: [5, 6] });
  });

  it("accepts a room with no host, which is an empty room", () => {
    expect(readRace({ race: race({ host: null }) }).host).toBe(null);
  });

  it("drops anything extra in the race part", () => {
    const update = { race: { ...race(), winner: 2, secret: "x" } };
    expect(Object.keys(readRace(update)).sort()).toEqual(["countdownSteps", "host", "phase", "watching"]);
  });

  it("treats an update with no race part as an open room", () => {
    expect(readRace({ type: "state", step: 1, karts: [] })).toEqual(OPEN);
    expect(readRace(null)).toEqual(OPEN);
    expect(readRace(undefined)).toEqual(OPEN);
  });

  it("treats a strange race part as an open room instead of breaking", () => {
    for (const strange of [
      "racing",
      42,
      null,
      [],
      race({ phase: "party" }),
      race({ phase: undefined }),
      race({ countdownSteps: -1 }),
      race({ countdownSteps: 1.5 }),
      race({ countdownSteps: "180" }),
      race({ host: "me" }),
      race({ watching: "nobody" }),
      race({ watching: [1, "2"] }),
    ]) {
      expect(readRace({ race: strange }), JSON.stringify(strange)).toEqual(OPEN);
    }
  });
});

describe("watching", () => {
  it("knows whether a player is watching", () => {
    expect(isWatching(race({ watching: [4, 7] }), 7)).toBe(true);
    expect(isWatching(race({ watching: [4, 7] }), 1)).toBe(false);
    expect(isWatching(race(), 1)).toBe(false);
  });

  it("follows the kart that has done the most laps", () => {
    const karts = [kart(1, { lapsDone: 0 }), kart(2, { lapsDone: 2 }), kart(3, { lapsDone: 1 })];
    expect(kartToWatch(karts).id).toBe(2);
  });

  it("follows the first kart when several have done the same laps", () => {
    expect(kartToWatch([kart(5), kart(6)]).id).toBe(5);
  });

  it("has no kart to follow when there are none", () => {
    expect(kartToWatch([])).toBe(undefined);
  });
});

describe("what the page says before a race", () => {
  it("tells the host how to start", () => {
    const view = raceView({ race: race({ host: 1 }), myId: 1, mine: kart(1) });
    expect(view.line).toContain("press Enter");
    expect(view.message).toBe("");
    expect(view.big).toBe(false);
  });

  it("tells everyone else to wait for the host, and never to press Enter", () => {
    const view = raceView({ race: race({ host: 1 }), myId: 2, mine: kart(2) });
    expect(view.line).toContain("Waiting for the host");
    expect(view.line).not.toContain("Enter");
  });

  it("shows the finish time of a free drive, with R to go again", () => {
    const view = raceView({ race: race(), myId: 2, mine: kart(2, { finished: true, steps: 600 }) });
    expect(view.message).toBe("Finished in 0:10.00. Press R to go again.");
  });
});

describe("what the page says during the countdown and the race", () => {
  it("shows 3, 2, 1 as a big number, to racers and to watchers alike", () => {
    const counting = (steps) => race({ phase: "countdown", countdownSteps: steps, watching: [9] });
    expect(raceView({ race: counting(0), myId: 1, mine: kart(1) })).toMatchObject({ message: "3", big: true });
    expect(raceView({ race: counting(60), myId: 1, mine: kart(1) })).toMatchObject({ message: "2", big: true });
    expect(raceView({ race: counting(179), myId: 1, mine: kart(1) })).toMatchObject({ message: "1", big: true });
    expect(raceView({ race: counting(60), myId: 9, mine: undefined })).toMatchObject({ message: "2", big: true });
  });

  it("shows GO! at the start of the race, then nothing", () => {
    const racing = (steps) => race({ phase: "racing", countdownSteps: steps });
    expect(raceView({ race: racing(COUNTDOWN_STEPS), myId: 1, mine: kart(1) })).toMatchObject({
      message: "GO!",
      big: true,
    });
    expect(raceView({ race: racing(COUNTDOWN_STEPS + GO_STEPS), myId: 1, mine: kart(1) })).toEqual({
      message: "",
      big: false,
      line: "",
    });
  });

  it("does not offer R during a race", () => {
    const racing = race({ phase: "racing", countdownSteps: 1000 });
    const finished = raceView({ race: racing, myId: 2, mine: kart(2, { finished: true, steps: 600 }) });
    expect(finished.message).toContain("Finished in 0:10.00.");
    expect(finished.message).not.toContain("Press R");
    expect(finished.message).toContain("Waiting for the host");
  });

  it("tells a finished host how to start the next race", () => {
    const racing = race({ phase: "racing", countdownSteps: 1000, host: 1 });
    const view = raceView({ race: racing, myId: 1, mine: kart(1, { finished: true, steps: 600 }) });
    expect(view.message).toContain("Press Enter to start the next race.");
  });

  it("tells someone who joined during a race that they are watching", () => {
    const racing = race({ phase: "racing", countdownSteps: 1000, watching: [9] });
    const view = raceView({ race: racing, myId: 9, mine: undefined });
    expect(view.line).toContain("You are watching");
    expect(view.message).toBe("");
  });

  it("tells a watcher when the race is over", () => {
    const over = race({ phase: "finished", countdownSteps: 5000, watching: [9] });
    expect(raceView({ race: over, myId: 9, mine: undefined }).line).toContain("The race is over");
  });
});

describe("the Enter key", () => {
  function setUp() {
    const fakeWindow = new EventTarget();
    let starts = 0;
    let restarts = 0;
    const keyboard = createKeyboard(fakeWindow, {
      onStart: () => starts++,
      onRestart: () => restarts++,
    });
    const press = (key, extra = {}) =>
      fakeWindow.dispatchEvent(Object.assign(new Event("keydown"), { key, ...extra }));
    return { keyboard, press, starts: () => starts, restarts: () => restarts };
  }

  it("asks for a race start", () => {
    const { press, starts } = setUp();
    press("Enter");
    expect(starts()).toBe(1);
  });

  it("asks only once while Enter is held down", () => {
    const { press, starts } = setUp();
    press("Enter");
    press("Enter", { repeat: true });
    press("Enter", { repeat: true });
    expect(starts()).toBe(1);
  });

  it("is not a driving key and not a restart", () => {
    const { keyboard, press, restarts } = setUp();
    press("Enter");
    expect(keyboard.isDriving()).toBe(false);
    expect(restarts()).toBe(0);
  });

  it("is the only key that asks for a start", () => {
    const { press, starts } = setUp();
    for (const key of [" ", "s", "S", "r", "v", "ArrowUp", "Escape", "enter"]) {
      press(key);
    }
    expect(starts()).toBe(0);
  });

  it("does nothing on a page that does not use it, such as practice", () => {
    const fakeWindow = new EventTarget();
    createKeyboard(fakeWindow);
    expect(() => fakeWindow.dispatchEvent(Object.assign(new Event("keydown"), { key: "Enter" }))).not.toThrow();
  });
});
