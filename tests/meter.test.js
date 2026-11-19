// Tests for client/meter.js, the connection meter of the online page, and
// for the L key that shows and hides it (client/keyboard.js).
//
// The meter counts updates, pictures and answer times, and says in one
// sentence why the game may feel slow. No browser here: times go in, numbers
// and words come out.

import { describe, it, expect } from "vitest";
import {
  createMeter,
  meterWords,
  verdictOf,
  VERDICTS,
  WINDOW_MS,
  ANSWERS_KEPT,
  SLOW_ANSWER_MS,
  LONG_GAP_MS,
  FEW_UPDATES,
  FEW_PICTURES,
} from "../client/meter.js";
import { createKeyboard } from "../client/keyboard.js";
import { STEPS_PER_UPDATE } from "../server/room.js";
import { DELAY_STEPS } from "../client/net.js";

/**
 * A meter after some seconds of a race: an update every "updateEveryMs", a
 * picture every "pictureEveryMs", and the given answer times.
 * Gives the meter and the moment it was last told something.
 */
function after(seconds, { updateEveryMs = 1000 / 30, pictureEveryMs = 1000 / 60, answers = [70, 72, 68] } = {}) {
  const meter = createMeter();
  const end = seconds * 1000;
  if (updateEveryMs !== null) {
    for (let now = 0; now <= end; now += updateEveryMs) {
      meter.update(now);
    }
  }
  if (pictureEveryMs !== null) {
    for (let now = 0; now <= end; now += pictureEveryMs) {
      meter.picture(now);
    }
  }
  for (const ms of answers) {
    meter.answer(ms);
  }
  return { meter, now: end };
}

/** A reading with nothing wrong in it. Give only what matters for the test. */
function reading(change = {}) {
  return { answerMs: 70, updatesPerSecond: 30, longestGapMs: 40, picturesPerSecond: 60, keyToScreenMs: 160, ...change };
}

describe("what the meter counts", () => {
  it("is all empty before anything happened", () => {
    expect(createMeter().read(1000)).toEqual({
      answerMs: null,
      updatesPerSecond: 0,
      longestGapMs: null,
      picturesPerSecond: 0,
      keyToScreenMs: null,
    });
  });

  it("counts the updates and the pictures of the last two seconds, as a number a second", () => {
    const { meter, now } = after(5);
    const numbers = meter.read(now);
    expect(WINDOW_MS).toBe(2000);
    expect(Math.round(numbers.updatesPerSecond)).toBe(30);
    expect(Math.round(numbers.picturesPerSecond)).toBe(60);
  });

  it("forgets what is older than two seconds", () => {
    const { meter, now } = after(5);
    const later = meter.read(now + 3000); // three seconds in which nothing arrived
    expect(later.updatesPerSecond).toBe(0);
    expect(later.picturesPerSecond).toBe(0);
    expect(later.longestGapMs).toBe(null);
  });

  it("gives the longest wait between two updates", () => {
    const meter = createMeter();
    for (const at of [0, 33, 67, 100, 400, 433, 467]) {
      meter.update(at); // a wait of 300 between the fourth and the fifth
    }
    expect(meter.read(470).longestGapMs).toBe(300);
  });

  it("counts the wait since the newest update too, so a connection that has just gone quiet shows at once", () => {
    const meter = createMeter();
    for (const at of [0, 33, 67, 100]) {
      meter.update(at);
    }
    expect(meter.read(900).longestGapMs).toBe(800);
  });

  it("gives the middle one of the newest answer times, so one slow answer does not count", () => {
    const meter = createMeter();
    for (const ms of [70, 900, 72]) {
      meter.answer(ms);
    }
    expect(meter.read(0).answerMs).toBe(72);
  });

  it("only keeps the newest answers", () => {
    const meter = createMeter();
    for (const ms of [500, 500, 500, 500, 500, 60, 61, 62, 63, 64]) {
      meter.answer(ms);
    }
    expect(ANSWERS_KEPT).toBe(5);
    expect(meter.read(0).answerMs).toBe(62);
  });

  it("leaves out an answer that never came, and anything that is not a time", () => {
    const meter = createMeter();
    for (const ms of [null, undefined, NaN, -5, "70", Infinity]) {
      meter.answer(ms);
    }
    expect(meter.read(0).answerMs).toBe(null);
    meter.answer(80);
    expect(meter.read(0).answerMs).toBe(80);
  });

  it("starts afresh when the connection was lost, but goes on counting pictures", () => {
    const { meter, now } = after(3);
    meter.forget();
    const numbers = meter.read(now);
    expect(numbers.updatesPerSecond).toBe(0);
    expect(numbers.answerMs).toBe(null);
    expect(Math.round(numbers.picturesPerSecond)).toBe(60);
  });
});

describe("from a key press to the screen", () => {
  it("adds up the way there and back, the wait for an update, how far in the past the race is shown, and the next picture", () => {
    const { meter, now } = after(5, { answers: [70] });
    const { keyToScreenMs } = meter.read(now, DELAY_STEPS);
    // 70 there and back + about 17 (half of 33) + 67 (4 steps) + about 8 (half of 17).
    expect(keyToScreenMs).toBeGreaterThan(155);
    expect(keyToScreenMs).toBeLessThan(170);
  });

  it("was about a fifth of a second with the numbers until 19 November 2026: 20 updates a second, 6 steps in the past", () => {
    const { meter, now } = after(5, { answers: [70], updateEveryMs: 50 });
    const { keyToScreenMs } = meter.read(now, 6);
    expect(keyToScreenMs).toBeGreaterThan(195);
    expect(keyToScreenMs).toBeLessThan(210);
  });

  it("is shorter now than it was, on the same connection", () => {
    const before = after(5, { answers: [70], updateEveryMs: 50 });
    const today = after(5, { answers: [70], updateEveryMs: (1000 / 60) * STEPS_PER_UPDATE });
    const was = before.meter.read(before.now, 6).keyToScreenMs;
    const is = today.meter.read(today.now, DELAY_STEPS).keyToScreenMs;
    expect(was - is).toBeGreaterThan(35); // about 40 thousandths of a second less
  });

  it("is not guessed while the server has not answered the timing question", () => {
    const { meter, now } = after(3, { answers: [] });
    expect(meter.read(now, DELAY_STEPS).keyToScreenMs).toBe(null);
  });
});

describe("the one sentence", () => {
  it("says all is fine when nothing is wrong", () => {
    expect(verdictOf(reading())).toBe(VERDICTS.fine);
    const { meter, now } = after(5);
    expect(verdictOf(meter.read(now, DELAY_STEPS))).toBe(VERDICTS.fine);
  });

  it("says it is still measuring before anything was counted", () => {
    expect(verdictOf(createMeter().read(0))).toBe(VERDICTS.waiting);
  });

  it("says the server is silent when pictures are drawn but no update arrives", () => {
    expect(verdictOf(reading({ updatesPerSecond: 0, longestGapMs: null }))).toBe(VERDICTS.silent);
  });

  it("blames this computer when it draws too few pictures", () => {
    expect(verdictOf(reading({ picturesPerSecond: FEW_PICTURES - 1 }))).toBe(VERDICTS.slowComputer);
    expect(verdictOf(reading({ picturesPerSecond: FEW_PICTURES }))).toBe(VERDICTS.fine);
  });

  it("blames the connection when the way to the server is slow", () => {
    expect(verdictOf(reading({ answerMs: SLOW_ANSWER_MS + 1 }))).toBe(VERDICTS.slowAnswer);
    expect(verdictOf(reading({ answerMs: SLOW_ANSWER_MS }))).toBe(VERDICTS.fine);
  });

  it("blames the connection when updates are missing or arrive unevenly", () => {
    expect(verdictOf(reading({ updatesPerSecond: FEW_UPDATES - 1 }))).toBe(VERDICTS.uneven);
    expect(verdictOf(reading({ longestGapMs: LONG_GAP_MS + 1 }))).toBe(VERDICTS.uneven);
    expect(verdictOf(reading({ longestGapMs: LONG_GAP_MS }))).toBe(VERDICTS.fine);
  });

  it("names the computer first when several things are wrong: that is the one a player can fix at once", () => {
    const allBad = reading({ picturesPerSecond: 20, answerMs: 400, updatesPerSecond: 10, longestGapMs: 500 });
    expect(verdictOf(allBad)).toBe(VERDICTS.slowComputer);
    expect(verdictOf({ ...allBad, picturesPerSecond: 60 })).toBe(VERDICTS.slowAnswer);
  });

  it("does not blame anyone for a slow answer that has not been measured", () => {
    expect(verdictOf(reading({ answerMs: null, keyToScreenMs: null }))).toBe(VERDICTS.fine);
  });

  it("never blames the game or the other players", () => {
    for (const sentence of Object.values(VERDICTS)) {
      expect(sentence).not.toMatch(/players|karts are too many|bug/i);
    }
    expect(VERDICTS.slowAnswer).toContain("not the game");
    expect(VERDICTS.uneven).toContain("not the game");
  });
});

describe("the meter as words", () => {
  it("has five short lines and the sentence", () => {
    const words = meterWords(reading());
    expect(words.rows).toEqual([
      { label: "Server and back", value: "70 ms", poor: false },
      { label: "Updates a second", value: "30", poor: false },
      { label: "Longest wait", value: "40 ms", poor: false },
      { label: "Pictures a second", value: "60", poor: false },
      { label: "Key to screen", value: "about 160 ms", poor: false },
    ]);
    expect(words.verdict).toBe(VERDICTS.fine);
  });

  it("keeps every line short, so the box stays small on the picture", () => {
    const longest = reading({ answerMs: 9999, updatesPerSecond: 30, longestGapMs: 9999, picturesPerSecond: 144, keyToScreenMs: 9999 });
    for (const { label, value } of meterWords(longest).rows) {
      expect(`${label} ${value}`.length).toBeLessThanOrEqual(30);
    }
  });

  it("marks exactly the numbers that are a problem", () => {
    const poorOnes = (change) => meterWords(reading(change)).rows.filter((row) => row.poor).map((row) => row.label);
    expect(poorOnes({ answerMs: 300 })).toEqual(["Server and back"]);
    expect(poorOnes({ longestGapMs: 400 })).toEqual(["Longest wait"]);
    expect(poorOnes({ updatesPerSecond: 12 })).toEqual(["Updates a second"]);
    expect(poorOnes({ picturesPerSecond: 22 })).toEqual(["Pictures a second"]);
    expect(poorOnes({})).toEqual([]);
  });

  it("shows a dash for what has not been measured", () => {
    const words = meterWords(createMeter().read(0));
    expect(words.rows.map((row) => row.value)).toEqual(["–", "0", "–", "0", "–"]);
    expect(words.verdict).toBe(VERDICTS.waiting);
  });

  it("shows whole numbers only: nobody needs the decimals", () => {
    const words = meterWords(reading({ answerMs: 70.49, updatesPerSecond: 29.5, longestGapMs: 41.7, picturesPerSecond: 59.6, keyToScreenMs: 161.2 }));
    expect(words.rows.map((row) => row.value)).toEqual(["70 ms", "30", "42 ms", "60", "about 161 ms"]);
  });
});

describe("the L key", () => {
  /** Something that can be listened to, like a window: send(type, event) plays an event. */
  function listenable() {
    const listeners = {};
    return {
      addEventListener(type, listener) {
        (listeners[type] ??= []).push(listener);
      },
      send(type, event = {}) {
        for (const listener of listeners[type] ?? []) {
          listener(event);
        }
      },
    };
  }
  const press = (target, key, more = {}) => target.send("keydown", { key, preventDefault() {}, ...more });

  it("shows or hides the meter, in small or capital letters", () => {
    const window = listenable();
    let times = 0;
    createKeyboard(window, { onMeter: () => times++ });
    press(window, "l");
    press(window, "L");
    expect(times).toBe(2);
  });

  it("does not switch it again while held down", () => {
    const window = listenable();
    let times = 0;
    createKeyboard(window, { onMeter: () => times++ });
    press(window, "l");
    press(window, "l", { repeat: true });
    expect(times).toBe(1);
  });

  it("leaves Ctrl+L, Cmd+L and Alt+L to the browser", () => {
    const window = listenable();
    let times = 0;
    createKeyboard(window, { onMeter: () => times++ });
    press(window, "l", { ctrlKey: true });
    press(window, "l", { metaKey: true });
    press(window, "L", { altKey: true });
    expect(times).toBe(0);
  });

  it("is not a driving key, and no other key shows the meter", () => {
    const window = listenable();
    let times = 0;
    const keyboard = createKeyboard(window, { onMeter: () => times++ });
    press(window, "l");
    expect(keyboard.input()).toEqual({ gas: false, brake: false, left: false, right: false });
    for (const key of ["r", "v", "m", "f", "Enter", "ArrowUp", "k", "Escape"]) {
      press(window, key);
    }
    expect(times).toBe(1);
  });

  it("does nothing on a page that does not ask for it, such as the single race", () => {
    const window = listenable();
    createKeyboard(window, {});
    expect(() => press(window, "l")).not.toThrow();
  });
});
