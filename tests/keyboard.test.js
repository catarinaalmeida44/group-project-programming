// Tests for client/keyboard.js: which keys drive, on the usual pages and on
// the two-player page, where two people share one keyboard.

import { describe, it, expect, vi } from "vitest";
import { createKeyboard, inputFromKeys, inputFromLetterKeys, LETTER_DRIVING_KEYS } from "../client/keyboard.js";

const NONE = { gas: false, brake: false, left: false, right: false };

/** A pretend window: remembers who listens, and lets a test press and release keys. */
function pretendWindow() {
  const listeners = {};
  let prevented = 0;
  return {
    addEventListener: (kind, listener) => {
      listeners[kind] = listener;
    },
    down: (key, more = {}) =>
      listeners.keydown({
        key,
        preventDefault: () => {
          prevented++;
        },
        ...more,
      }),
    up: (key) => listeners.keyup({ key }),
    blur: () => listeners.blur(),
    prevented: () => prevented,
  };
}

describe("the arrow keys", () => {
  it("are gas, brake, left and right", () => {
    expect(inputFromKeys(new Set(["ArrowUp", "ArrowLeft"]))).toEqual({ gas: true, brake: false, left: true, right: false });
    expect(inputFromKeys(new Set(["ArrowDown", "ArrowRight"]))).toEqual({ gas: false, brake: true, left: false, right: true });
    expect(inputFromKeys(new Set())).toEqual(NONE);
  });

  it("are held from the moment they go down until they come up", () => {
    const target = pretendWindow();
    const keyboard = createKeyboard(target);
    target.down("ArrowUp");
    target.down("ArrowRight");
    expect(keyboard.input()).toEqual({ gas: true, brake: false, left: false, right: true });
    expect(keyboard.isDriving()).toBe(true);
    target.up("ArrowUp");
    expect(keyboard.input()).toEqual({ gas: false, brake: false, left: false, right: true });
    target.up("ArrowRight");
    expect(keyboard.isDriving()).toBe(false);
  });

  it("do not scroll the page", () => {
    const target = pretendWindow();
    createKeyboard(target);
    target.down("ArrowDown");
    expect(target.prevented()).toBe(1);
  });

  it("are all let go when the player switches to another window", () => {
    const target = pretendWindow();
    const keyboard = createKeyboard(target, {}, { twoPlayers: true });
    target.down("ArrowUp");
    target.down("w");
    target.blur();
    expect(keyboard.input()).toEqual(NONE);
    expect(keyboard.letterInput()).toEqual(NONE);
    expect(keyboard.isDriving()).toBe(false);
  });
});

describe("W, A, S and D on the usual pages (single race, online)", () => {
  it("are not driving keys: they do nothing at all", () => {
    const target = pretendWindow();
    const onDrive = vi.fn();
    const keyboard = createKeyboard(target, { onDrive });
    for (const key of ["w", "a", "s", "d", "W"]) {
      target.down(key);
    }
    expect(keyboard.letterInput()).toEqual(NONE);
    expect(keyboard.input()).toEqual(NONE);
    expect(keyboard.isDriving()).toBe(false);
    expect(onDrive).not.toHaveBeenCalled();
  });
});

describe("W, A, S and D on the two-player page", () => {
  const two = { twoPlayers: true };

  it("are the four letters, in the shape of the arrow keys", () => {
    expect(LETTER_DRIVING_KEYS).toEqual(["w", "a", "s", "d"]);
    expect(inputFromLetterKeys(new Set(["w", "a"]))).toEqual({ gas: true, brake: false, left: true, right: false });
    expect(inputFromLetterKeys(new Set(["s", "d"]))).toEqual({ gas: false, brake: true, left: false, right: true });
  });

  it("drive the second kart, held from down to up", () => {
    const target = pretendWindow();
    const keyboard = createKeyboard(target, {}, two);
    target.down("w");
    target.down("d");
    expect(keyboard.letterInput()).toEqual({ gas: true, brake: false, left: false, right: true });
    target.up("w");
    expect(keyboard.letterInput()).toEqual({ gas: false, brake: false, left: false, right: true });
    target.up("d");
    expect(keyboard.isDriving()).toBe(false);
  });

  it("never move the kart that is driven with the arrows, and the arrows never move theirs", () => {
    const target = pretendWindow();
    const keyboard = createKeyboard(target, {}, two);
    target.down("w");
    target.down("a");
    expect(keyboard.input()).toEqual(NONE);
    target.up("w");
    target.up("a");
    target.down("ArrowUp");
    target.down("ArrowLeft");
    expect(keyboard.letterInput()).toEqual(NONE);
  });

  it("work for both drivers at the same moment", () => {
    const target = pretendWindow();
    const keyboard = createKeyboard(target, {}, two);
    target.down("w");
    target.down("ArrowUp");
    target.down("a");
    target.down("ArrowRight");
    expect(keyboard.letterInput()).toEqual({ gas: true, brake: false, left: true, right: false });
    expect(keyboard.input()).toEqual({ gas: true, brake: false, left: false, right: true });
  });

  it("work with Caps Lock on, and a key pressed with it and released without it does not stay stuck", () => {
    const target = pretendWindow();
    const keyboard = createKeyboard(target, {}, two);
    target.down("W");
    expect(keyboard.letterInput().gas).toBe(true);
    target.up("w");
    expect(keyboard.letterInput().gas).toBe(false);
    target.down("d");
    target.up("D");
    expect(keyboard.letterInput().right).toBe(false);
  });

  it("tell the page that a driving key went down, so the countdown starts for either driver", () => {
    const target = pretendWindow();
    const onDrive = vi.fn();
    createKeyboard(target, { onDrive }, two);
    target.down("s");
    expect(onDrive).toHaveBeenLastCalledWith("s", false);
    target.down("s", { repeat: true });
    expect(onDrive).toHaveBeenLastCalledWith("s", true);
  });

  it("are left to the browser together with Ctrl, Cmd or Alt (Ctrl+S, Ctrl+W ...)", () => {
    const target = pretendWindow();
    const keyboard = createKeyboard(target, {}, two);
    target.down("s", { ctrlKey: true });
    target.down("w", { metaKey: true });
    target.down("d", { altKey: true });
    expect(keyboard.letterInput()).toEqual(NONE);
  });

  it("leave the other letter keys as they were: R, V, M and F still do their things", () => {
    const target = pretendWindow();
    const actions = { onRestart: vi.fn(), onView: vi.fn(), onSound: vi.fn(), onFullScreen: vi.fn() };
    createKeyboard(target, actions, two);
    target.down("r");
    target.down("v");
    target.down("m");
    target.down("f");
    for (const action of Object.values(actions)) {
      expect(action).toHaveBeenCalledTimes(1);
    }
  });
});

describe("the other keys", () => {
  it("act once for a key that is held down", () => {
    const target = pretendWindow();
    const onRestart = vi.fn();
    createKeyboard(target, { onRestart });
    target.down("r");
    target.down("r", { repeat: true });
    target.down("r", { repeat: true });
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it("start a race with Enter", () => {
    const target = pretendWindow();
    const onStart = vi.fn();
    createKeyboard(target, { onStart });
    target.down("Enter");
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("do nothing for something that is not a real key press", () => {
    const target = pretendWindow();
    const onDrive = vi.fn();
    const keyboard = createKeyboard(target, { onDrive });
    expect(() => target.down(undefined)).not.toThrow();
    expect(keyboard.isDriving()).toBe(false);
    expect(onDrive).not.toHaveBeenCalled();
  });
});
