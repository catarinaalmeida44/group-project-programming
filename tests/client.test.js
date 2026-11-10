// Tests for the parts of the browser code that can be tested without a
// browser: turning a time into text (client/format.js) and turning key
// presses into driving input (client/keyboard.js).
//
// The drawing (client/draw.js) and the game loop (client/main.js) need a
// real page, so they are checked by eye in a browser instead.

import { describe, it, expect } from "vitest";
import { formatTime } from "../client/format.js";
import { inputFromKeys, createKeyboard } from "../client/keyboard.js";
import { lapTimesText, VIEW_NAMES, createHud } from "../client/hud.js";
import { VIEWS } from "../client/camera.js";

describe("the numbers around the track", () => {
  it("shows nothing for lap times before the first lap is finished", () => {
    expect(lapTimesText([])).toBe("");
  });

  it("shows how long each finished lap took, not the time on the clock when it ended", () => {
    // Lap 1 ended at step 240 (4 seconds). Lap 2 ended at step 600 (10 seconds), so it took 6.
    expect(lapTimesText([240])).toBe("Lap 1: 0:04.00");
    expect(lapTimesText([240, 600])).toBe("Lap 1: 0:04.00   Lap 2: 0:06.00");
  });

  it("has a name for every camera view", () => {
    for (const view of VIEWS) {
      expect(typeof VIEW_NAMES[view]).toBe("string");
    }
  });

  it("fills in the lap, the clock, the camera name, the lap times and the message", () => {
    // A stand-in for the page: it hands out one "element" per name and remembers them.
    const elements = {};
    const fakePage = { getElementById: (name) => (elements[name] ??= { textContent: "" }) };
    const show = createHud(fakePage);

    show({ lap: 2, laps: 3, steps: 600, lapSteps: [240], view: "chase", message: "Hello" });

    expect(elements.lap.textContent).toBe(2);
    expect(elements.laps.textContent).toBe(3);
    expect(elements.time.textContent).toBe("0:10.00");
    expect(elements.view.textContent).toBe("Behind the kart");
    expect(elements["lap-times"].textContent).toBe("Lap 1: 0:04.00");
    expect(elements.message.textContent).toBe("Hello");
  });
});

describe("showing a race time", () => {
  it("shows minutes, seconds and hundredths", () => {
    expect(formatTime(0)).toBe("0:00.00");
    expect(formatTime(5.5)).toBe("0:05.50");
    expect(formatTime(24.27)).toBe("0:24.27");
    expect(formatTime(83.45)).toBe("1:23.45");
    expect(formatTime(600)).toBe("10:00.00");
  });

  it("cuts the time off at hundredths instead of rounding up, like a stopwatch", () => {
    expect(formatTime(59.999)).toBe("0:59.99");
    expect(formatTime(0.009)).toBe("0:00.00");
  });

  it("is exact for times that come from counting steps of the game", () => {
    expect(formatTime(60 / 60)).toBe("0:01.00"); //   60 steps
    expect(formatTime(90 / 60)).toBe("0:01.50"); //   90 steps
    expect(formatTime(1456 / 60)).toBe("0:24.26"); // 24.2666... seconds
    expect(formatTime(0.29)).toBe("0:00.29"); //      0.29 * 100 is 28.999999999999996 in a computer
  });

  it("shows dashes for anything that is not a sensible time", () => {
    for (const notATime of [-1, NaN, Infinity, "12", undefined, null]) {
      expect(formatTime(notATime)).toBe("-:--.--");
    }
  });
});

describe("turning held keys into driving input", () => {
  it("maps the four arrow keys to gas, brake, left and right", () => {
    expect(inputFromKeys(new Set(["ArrowUp"]))).toEqual({ gas: true, brake: false, left: false, right: false });
    expect(inputFromKeys(new Set(["ArrowDown"]))).toEqual({ gas: false, brake: true, left: false, right: false });
    expect(inputFromKeys(new Set(["ArrowLeft"]))).toEqual({ gas: false, brake: false, left: true, right: false });
    expect(inputFromKeys(new Set(["ArrowRight"]))).toEqual({ gas: false, brake: false, left: false, right: true });
  });

  it("reports several keys held together", () => {
    expect(inputFromKeys(new Set(["ArrowUp", "ArrowRight"]))).toEqual({
      gas: true,
      brake: false,
      left: false,
      right: true,
    });
  });

  it("ignores every other key", () => {
    expect(inputFromKeys(new Set(["a", " ", "Enter", "arrowup"]))).toEqual({
      gas: false,
      brake: false,
      left: false,
      right: false,
    });
  });
});

describe("listening to the keyboard", () => {
  /** A stand-in for the browser window, a keyboard listening to it, and a count of restarts. */
  function setUp() {
    const fakeWindow = new EventTarget();
    let restarts = 0;
    let drives = 0;
    let viewChanges = 0;
    const keyboard = createKeyboard(fakeWindow, {
      onRestart: () => restarts++,
      onDrive: () => drives++,
      onView: () => viewChanges++,
    });

    /** Pretends the player did something with a key. Gives back the event, to inspect it. */
    function send(type, key, extra = {}) {
      const event = Object.assign(new Event(type, { cancelable: true }), { key, ...extra });
      fakeWindow.dispatchEvent(event);
      return event;
    }
    return {
      keyboard,
      send,
      restarts: () => restarts,
      drives: () => drives,
      viewChanges: () => viewChanges,
    };
  }

  it("changes the camera view when V is pressed, in capitals or not", () => {
    const { send, viewChanges, restarts } = setUp();
    send("keydown", "v");
    send("keydown", "V");
    expect(viewChanges()).toBe(2);
    expect(restarts()).toBe(0);
  });

  it("changes the view only once while V is held down", () => {
    const { send, viewChanges } = setUp();
    send("keydown", "v");
    send("keydown", "v", { repeat: true });
    send("keydown", "v", { repeat: true });
    expect(viewChanges()).toBe(1);
  });

  it("does not count V as a driving key", () => {
    const { keyboard, send, drives } = setUp();
    send("keydown", "v");
    expect(keyboard.isDriving()).toBe(false);
    expect(drives()).toBe(0);
  });

  it("keeps the arrow keys working while a driving key repeats", () => {
    // A held arrow key sends "repeat" presses. They must not be ignored.
    const { keyboard, send } = setUp();
    send("keydown", "ArrowUp");
    send("keydown", "ArrowUp", { repeat: true });
    expect(keyboard.input().gas).toBe(true);
  });

  it("tells the game at once when a driving key goes down, even for the shortest tap", () => {
    const { keyboard, send, drives } = setUp();
    send("keydown", "ArrowUp");
    send("keyup", "ArrowUp"); // released straight away
    expect(drives()).toBe(1);
    expect(keyboard.isDriving()).toBe(false);
  });

  it("does not tell the game to start for keys that do not drive", () => {
    const { send, drives } = setUp();
    send("keydown", "a");
    send("keydown", "r");
    send("keydown", "Enter");
    expect(drives()).toBe(0);
  });

  it("works when the game gives it nothing to do for any key", () => {
    const fakeWindow = new EventTarget();
    const keyboard = createKeyboard(fakeWindow);
    for (const key of ["ArrowUp", "r", "v"]) {
      fakeWindow.dispatchEvent(Object.assign(new Event("keydown"), { key }));
    }
    expect(keyboard.input().gas).toBe(true);
  });

  it("holds no keys at the start", () => {
    const { keyboard } = setUp();
    expect(keyboard.isDriving()).toBe(false);
    expect(keyboard.input().gas).toBe(false);
  });

  it("holds a key from the moment it goes down until it comes up", () => {
    const { keyboard, send } = setUp();
    send("keydown", "ArrowUp");
    expect(keyboard.input().gas).toBe(true);
    expect(keyboard.isDriving()).toBe(true);

    send("keyup", "ArrowUp");
    expect(keyboard.input().gas).toBe(false);
    expect(keyboard.isDriving()).toBe(false);
  });

  it("keeps the other keys held when one of them is released", () => {
    const { keyboard, send } = setUp();
    send("keydown", "ArrowUp");
    send("keydown", "ArrowLeft");
    send("keyup", "ArrowLeft");
    expect(keyboard.input()).toEqual({ gas: true, brake: false, left: false, right: false });
  });

  it("stops the arrow keys from scrolling the page, and leaves other keys alone", () => {
    const { send } = setUp();
    expect(send("keydown", "ArrowDown").defaultPrevented).toBe(true);
    expect(send("keydown", "a").defaultPrevented).toBe(false);
    expect(send("keydown", "F5").defaultPrevented).toBe(false);
  });

  it("starts again when R is pressed, in capitals or not", () => {
    const { send, restarts } = setUp();
    send("keydown", "r");
    send("keydown", "R");
    expect(restarts()).toBe(2);
  });

  it("starts again only once while R is held down", () => {
    const { send, restarts } = setUp();
    send("keydown", "r");
    send("keydown", "r", { repeat: true });
    send("keydown", "r", { repeat: true });
    expect(restarts()).toBe(1);
  });

  it("does not count other keys as driving, and does not restart for them", () => {
    const { keyboard, send, restarts } = setUp();
    send("keydown", "a");
    send("keydown", " ");
    send("keydown", "Enter");
    expect(keyboard.isDriving()).toBe(false);
    expect(restarts()).toBe(0);
  });

  it("lets go of every key when the player switches to another window", () => {
    const { keyboard, send } = setUp();
    send("keydown", "ArrowUp");
    send("keydown", "ArrowRight");
    send("blur");
    expect(keyboard.isDriving()).toBe(false);
    expect(keyboard.input()).toEqual({ gas: false, brake: false, left: false, right: false });
  });

  it("ignores a key event that carries no key name", () => {
    const { keyboard, send, restarts } = setUp();
    send("keydown", undefined);
    expect(keyboard.isDriving()).toBe(false);
    expect(restarts()).toBe(0);
  });
});
