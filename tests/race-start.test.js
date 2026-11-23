// Tests for how a race is started: Enter starts the countdown in every kind
// of race (a single race, two players on one keyboard, online), and a
// driving key never does. (Until 23 November 2026 a single race and a
// two-player race started at the first driving key.)
//
// The two pages that start a race by themselves, client/main.js and
// client/double.js, need a real browser, so they have no tests that run them.
// What can be checked without a browser is checked here:
//   - what the keyboard tells a page                  (client/keyboard.js)
//   - the words each kind of race shows                (client/race-view.js,
//     client/double-view.js, client/how-to-play.js)
//   - that both pages give their "start" to Enter and to nothing else, by
//     reading their text, as tests/menu-page.test.js does for the menu

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createKeyboard } from "../client/keyboard.js";
import { START_KEY, SINGLE_START_WORDS } from "../client/race-view.js";
import { START_WORDS, halfMessage } from "../client/double-view.js";
import { howToPlayWords, PAGE_MODES } from "../client/how-to-play.js";

const CLIENT_FOLDER = new URL("../client/", import.meta.url);
const read = (name) => readFileSync(new URL(name, CLIENT_FOLDER), "utf8");

/** A pretend window: remembers who listens, and lets a test press keys. */
function pretendWindow() {
  const listeners = {};
  return {
    addEventListener: (kind, listener) => {
      listeners[kind] = listener;
    },
    down: (key, more = {}) => listeners.keydown({ key, preventDefault: () => {}, ...more }),
  };
}

/** A keyboard on a pretend window that counts what it tells the page. */
function setUp(options) {
  const target = pretendWindow();
  const onStart = vi.fn();
  const onDrive = vi.fn();
  const onRestart = vi.fn();
  const keyboard = createKeyboard(target, { onStart, onDrive, onRestart }, options);
  return { target, keyboard, onStart, onDrive, onRestart };
}

const ARROWS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
const LETTERS = ["w", "a", "s", "d", "W", "A", "S", "D"];
const TWO_PLAYERS = { twoPlayers: true };

describe("the key that starts a race", () => {
  it("is Enter", () => {
    expect(START_KEY).toBe("Enter");
  });

  it("is the key each kind of race asks for before the countdown", () => {
    // A single race.
    expect(SINGLE_START_WORDS).toContain("Enter");
    // Two players: both halves say it.
    expect(halfMessage({ started: false }).text).toBe(START_WORDS);
    expect(START_WORDS).toContain("Enter");
    // Online, the host is told to press Enter too: that has its own tests,
    // "what the page says before a race" in tests/race-view.test.js.
  });

  it("is never said to be an arrow key or a driving key", () => {
    for (const words of [SINGLE_START_WORDS, START_WORDS]) {
      expect(words).not.toMatch(/arrow|driving key|any key/i);
    }
  });

  it("is in the How to play card of every race page", () => {
    for (const mode of PAGE_MODES) {
      const enter = howToPlayWords(mode).keys.filter((each) => each.key === "Enter");
      expect(enter, mode).toHaveLength(1);
      expect(enter[0].does, mode).toMatch(/^Start/);
    }
    // Only online is it the host's key. Alone or with two players, anyone at the keyboard starts.
    const does = (mode) => howToPlayWords(mode).keys.find((each) => each.key === "Enter").does;
    expect(does("online")).toMatch(/host/);
    expect(does("single")).not.toMatch(/host/);
    expect(does("double")).not.toMatch(/host/);
  });

  it("comes before R in that card, where a race can be started again", () => {
    for (const mode of ["single", "double"]) {
      const keys = howToPlayWords(mode).keys.map((each) => each.key);
      expect(keys.indexOf("Enter"), mode).toBeGreaterThanOrEqual(0);
      expect(keys.indexOf("Enter"), mode).toBeLessThan(keys.indexOf("R"));
    }
  });
});

describe("what the keyboard tells a race page about starting", () => {
  it("asks for a start when Enter goes down, on the usual pages and on the two-player page", () => {
    for (const options of [undefined, TWO_PLAYERS]) {
      const { target, onStart } = setUp(options);
      target.down("Enter");
      expect(onStart).toHaveBeenCalledTimes(1);
    }
  });

  it("asks once while Enter is held down", () => {
    const { target, onStart } = setUp(TWO_PLAYERS);
    target.down("Enter");
    target.down("Enter", { repeat: true });
    target.down("Enter", { repeat: true });
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("never asks for a start when an arrow key goes down, tapped or held", () => {
    const { target, onStart, onDrive } = setUp();
    for (const key of ARROWS) {
      target.down(key);
      target.down(key, { repeat: true });
    }
    expect(onStart).not.toHaveBeenCalled();
    expect(onDrive).toHaveBeenCalledTimes(ARROWS.length * 2); // the page still hears about them, as driving keys
  });

  it("never asks for a start when W, A, S or D goes down, with two players", () => {
    const { target, onStart, onDrive } = setUp(TWO_PLAYERS);
    for (const key of LETTERS) {
      target.down(key);
      target.down(key, { repeat: true });
    }
    expect(onStart).not.toHaveBeenCalled();
    expect(onDrive).toHaveBeenCalledTimes(LETTERS.length * 2);
  });

  it("never asks for a start for any other key", () => {
    for (const options of [undefined, TWO_PLAYERS]) {
      const { target, onStart } = setUp(options);
      for (const key of ["r", "R", "v", "m", "f", "l", " ", "Escape", "Tab", "Shift", "Backspace", "e", "1", "enter", "Return", ""]) {
        target.down(key);
      }
      target.down(undefined); // not a real key press
      expect(onStart).not.toHaveBeenCalled();
    }
  });

  it("does not take Enter for a driving key or for 'start again'", () => {
    const { target, keyboard, onDrive, onRestart } = setUp(TWO_PLAYERS);
    target.down("Enter");
    expect(onDrive).not.toHaveBeenCalled();
    expect(onRestart).not.toHaveBeenCalled();
    expect(keyboard.isDriving()).toBe(false);
    expect(keyboard.input()).toEqual({ gas: false, brake: false, left: false, right: false });
    expect(keyboard.letterInput()).toEqual({ gas: false, brake: false, left: false, right: false });
  });
});

describe("the two pages that start a race themselves", () => {
  const pages = ["main.js", "double.js"];

  it("give their start to Enter", () => {
    for (const name of pages) {
      expect(read(name), name).toMatch(/\bonStart: start\b/);
    }
  });

  it("do not start at a driving key, pressed or held", () => {
    for (const name of pages) {
      const text = read(name);
      expect(text, name).not.toMatch(/\bonDrive: start\b/);
      // Until 23 November 2026 each picture also started the race when a
      // driving key was held ("if (!started && keyboard.isDriving()) start()").
      expect(text, name).not.toMatch(/isDriving\(\)\s*\)\s*\{\s*start\(\)/);
      // Nothing in the page calls start() itself: only Enter does, through the keyboard.
      expect(text.match(/(?<![.\w])start\(\);/g), name).toBeNull();
    }
  });

  it("still keep the race waiting while a card is over the picture", () => {
    for (const name of pages) {
      expect(read(name), name).toMatch(/function start\(\) \{\s*if \(settingsCard\.isOpen\(\) \|\| howToPlay\.isOpen\(\)\) \{\s*return;/);
    }
  });

  it("show the words that ask for Enter, and not the old ones", () => {
    expect(read("main.js")).toContain("SINGLE_START_WORDS");
    for (const name of pages) {
      expect(read(name), name).not.toMatch(/Press an arrow key|Press a driving key/);
    }
  });

  it("say under the picture that Enter starts the countdown", () => {
    for (const name of ["race.html", "double.html"]) {
      expect(read(name), name).toContain("<kbd>Enter</kbd> starts the countdown");
    }
  });
});
