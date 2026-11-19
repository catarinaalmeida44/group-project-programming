// Tests for what someone who arrives during a race is shown, since 19
// November 2026 (client/race-view.js with client/computers-switch.js):
//   - the camera is on a person's kart, never on a computer kart
//   - the left and right arrows move it to another person
// The older tests of the camera and the banner are in watching.test.js.

import { describe, it, expect, vi } from "vitest";
import { kartToFollow, peopleToWatch, nextToWatch, watchBanner, SWITCH_TEXT, KEYS_LATER_TEXT } from "../client/race-view.js";
import { computerIdsOf } from "../client/computers-switch.js";
import { createKeyboard } from "../client/keyboard.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

/** A kart that has passed this many checkpoints, somewhere on the track. */
const kart = (id, passed, more = {}) => ({ id, passed, x: 300 + id, y: 300, finished: false, steps: 1000, ...more });

describe("the kart a watcher's camera is on, in a race with computer karts", () => {
  it("is the person who is furthest ahead, even when a computer kart leads the race", () => {
    const karts = [kart(1, 2), kart(2, 4), kart(3, 9), kart(4, 8)];
    expect(kartToFollow(karts, TEST_OVAL, null, [3, 4]).id).toBe(2);
  });

  it("never stays on a computer kart, even if the camera was on it", () => {
    const karts = [kart(1, 2), kart(3, 9)];
    expect(kartToFollow(karts, TEST_OVAL, 3, [3]).id).toBe(1);
  });

  it("stays with the person it is on while they drive", () => {
    const karts = [kart(1, 2), kart(2, 4), kart(3, 9)];
    expect(kartToFollow(karts, TEST_OVAL, 1, [3]).id).toBe(1);
  });

  it("moves to another person, not to a computer kart, when its person has finished", () => {
    const karts = [kart(1, 2), kart(2, 9, { finished: true }), kart(3, 8)];
    expect(kartToFollow(karts, TEST_OVAL, 2, [3]).id).toBe(1);
  });

  it("shows the person who did best when no person is driving any more", () => {
    const karts = [kart(1, 9, { finished: true, steps: 2000 }), kart(2, 9, { finished: true, steps: 1800 }), kart(3, 5)];
    expect(kartToFollow(karts, TEST_OVAL, null, [3]).id).toBe(2);
  });

  it("falls back on a computer kart only when there is no person's kart at all", () => {
    expect(kartToFollow([kart(3, 5), kart(4, 7)], TEST_OVAL, null, [3, 4]).id).toBe(4);
  });

  it("is as before when nothing is said about computer karts", () => {
    const karts = [kart(1, 2), kart(2, 5), kart(3, 4)];
    expect(kartToFollow(karts, TEST_OVAL, null).id).toBe(2);
    expect(kartToFollow(karts, TEST_OVAL, null, null).id).toBe(2);
  });
});

describe("the people a watcher can choose between", () => {
  it("are the people still driving, the one in front first", () => {
    const karts = [kart(1, 2), kart(2, 5), kart(3, 9), kart(4, 3)];
    expect(peopleToWatch(karts, TEST_OVAL, [3]).map((each) => each.id)).toEqual([2, 4, 1]);
  });

  it("leave out whoever has finished", () => {
    const karts = [kart(1, 2), kart(2, 9, { finished: true })];
    expect(peopleToWatch(karts, TEST_OVAL, []).map((each) => each.id)).toEqual([1]);
  });

  it("are nobody for an empty or strange list", () => {
    expect(peopleToWatch([], TEST_OVAL, [])).toEqual([]);
    expect(peopleToWatch(null, TEST_OVAL, [])).toEqual([]);
  });
});

describe("moving the camera to another player", () => {
  const karts = [kart(1, 2), kart(2, 5), kart(3, 9), kart(4, 3)]; // in order: 2, 4, 1 (3 is a computer kart)

  it("goes to the next one behind with the right arrow", () => {
    expect(nextToWatch(karts, TEST_OVAL, 2, 1, [3])).toBe(4);
    expect(nextToWatch(karts, TEST_OVAL, 4, 1, [3])).toBe(1);
  });

  it("goes to the next one in front with the left arrow", () => {
    expect(nextToWatch(karts, TEST_OVAL, 1, -1, [3])).toBe(4);
    expect(nextToWatch(karts, TEST_OVAL, 4, -1, [3])).toBe(2);
  });

  it("goes round: after the last comes the first, and before the first the last", () => {
    expect(nextToWatch(karts, TEST_OVAL, 1, 1, [3])).toBe(2);
    expect(nextToWatch(karts, TEST_OVAL, 2, -1, [3])).toBe(1);
  });

  it("never lands on a computer kart, however often the key is pressed", () => {
    let on = 2;
    for (let press = 0; press < 12; press++) {
      on = nextToWatch(karts, TEST_OVAL, on, 1, [3]);
      expect(on).not.toBe(3);
    }
  });

  it("starts with the person in front when the camera was on nobody who can be chosen", () => {
    expect(nextToWatch(karts, TEST_OVAL, null, 1, [3])).toBe(2);
    expect(nextToWatch(karts, TEST_OVAL, 3, 1, [3])).toBe(2);
  });

  it("changes nothing when there is only one person to watch, or none", () => {
    expect(nextToWatch([kart(1, 2), kart(3, 9)], TEST_OVAL, 1, 1, [3])).toBe(1);
    expect(nextToWatch([], TEST_OVAL, null, 1, [])).toBe(null);
    expect(nextToWatch([kart(1, 2), kart(2, 9, { finished: true })], TEST_OVAL, 1, 1, [])).toBe(1);
  });
});

describe("the banner, when there is more than one player to watch", () => {
  const racing = { phase: "racing", countdownSteps: 400, host: 1, watching: [7] };

  it("says which keys move the camera", () => {
    const banner = watchBanner({ race: racing, myId: 7, watchedName: "Ana", canSwitch: true });
    expect(banner.text).toBe(`The camera is on Ana. ${SWITCH_TEXT} You join the next race.`);
    expect(SWITCH_TEXT).toMatch(/←/);
    expect(SWITCH_TEXT).toMatch(/→/);
  });

  it("does not offer the keys when there is nobody else to watch", () => {
    const banner = watchBanner({ race: racing, myId: 7, watchedName: "Ana" });
    expect(banner.text).not.toMatch(/←/);
    expect(banner.text).toBe("The camera is on Ana. A new race starts when this one is over, and you join it.");
  });

  it("still says that a driving key does nothing, for a moment after one was pressed", () => {
    const banner = watchBanner({ race: racing, myId: 7, watchedName: "Ana", canSwitch: true, pressedKey: true });
    expect(banner.text).toBe(KEYS_LATER_TEXT);
  });
});

describe("the computer karts named in an update", () => {
  it("are their player numbers", () => {
    expect(computerIdsOf({ computers: { on: true, karts: [4, 5, 6] } })).toEqual([4, 5, 6]);
  });

  it("are a copy: changing it does not change the update", () => {
    const update = { computers: { on: true, karts: [4] } };
    computerIdsOf(update).push(9);
    expect(update.computers.karts).toEqual([4]);
  });

  it("are none when the update says nothing usable about them", () => {
    for (const update of [null, undefined, {}, { computers: null }, { computers: { on: true } }, { computers: { on: true, karts: ["4"] } }]) {
      expect(computerIdsOf(update)).toEqual([]);
    }
  });
});

describe("what the keyboard tells the page about a driving key", () => {
  /** A pretend window: remembers who listens, and lets a test press keys. */
  function pretendWindow() {
    const listeners = {};
    return {
      addEventListener: (kind, listener) => {
        listeners[kind] = listener;
      },
      press: (key, more = {}) => listeners.keydown({ key, preventDefault: () => {}, ...more }),
    };
  }

  it("is which key went down, and that it is a fresh press", () => {
    const target = pretendWindow();
    const onDrive = vi.fn();
    createKeyboard(target, { onDrive });
    target.press("ArrowLeft");
    expect(onDrive).toHaveBeenLastCalledWith("ArrowLeft", false);
    target.press("ArrowRight");
    expect(onDrive).toHaveBeenLastCalledWith("ArrowRight", false);
  });

  it("says so when the key is only being held down, so one long press counts once", () => {
    const target = pretendWindow();
    const onDrive = vi.fn();
    createKeyboard(target, { onDrive });
    target.press("ArrowRight", { repeat: true });
    expect(onDrive).toHaveBeenLastCalledWith("ArrowRight", true);
  });
});
