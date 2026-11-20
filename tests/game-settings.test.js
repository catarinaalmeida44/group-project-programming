// The game settings: what they may be, and what a host may change
// (shared/game-settings.js), and how the server reads them from a browser
// (server/messages.js).

import { describe, it, expect } from "vitest";
import {
  MOST_PLAYERS,
  FEWEST_PLAYERS,
  DEFAULT_GAME_SETTINGS,
  isPlayerLimit,
  cleanGameSettings,
  readGameSettings,
  settingsAfter,
  playerLimitChoices,
} from "../shared/game-settings.js";
import { MAX_PLAYERS } from "../server/room.js";
import { readClientMessage, MAX_MESSAGE_LENGTH } from "../server/messages.js";
import { LEVELS } from "../shared/computer-driver.js";

const GOOD = { computers: false, level: "hard", most: 4 };

describe("the numbers of the game settings", () => {
  it("allow as many people as the room itself takes: six", () => {
    expect(MOST_PLAYERS).toBe(MAX_PLAYERS);
    expect(MOST_PLAYERS).toBe(6);
  });

  it("never allow a room for one person", () => {
    expect(FEWEST_PLAYERS).toBe(2);
  });

  it("start with computer karts on, at the normal level, and the room open to six", () => {
    expect(DEFAULT_GAME_SETTINGS).toEqual({ computers: true, level: "normal", most: 6 });
    expect(cleanGameSettings(DEFAULT_GAME_SETTINGS)).toEqual(DEFAULT_GAME_SETTINGS);
  });

  it("cannot be changed by mistake", () => {
    expect(Object.isFrozen(DEFAULT_GAME_SETTINGS)).toBe(true);
  });
});

describe("a limit on the people in a room", () => {
  it("is a whole number from 2 to 6", () => {
    for (const most of [2, 3, 4, 5, 6]) {
      expect(isPlayerLimit(most)).toBe(true);
    }
  });

  it("is refused when it is too small, too big, not whole or not a number", () => {
    for (const most of [1, 0, -2, 7, 60, 2.5, "4", null, undefined, NaN, Infinity, true, [4]]) {
      expect(isPlayerLimit(most)).toBe(false);
    }
  });
});

describe("settings sent by a browser", () => {
  it("get through when all three parts are right", () => {
    expect(cleanGameSettings(GOOD)).toEqual(GOOD);
    for (const level of LEVELS) {
      expect(cleanGameSettings({ ...GOOD, level })).toEqual({ ...GOOD, level });
    }
  });

  it("are built fresh, so anything extra is dropped", () => {
    const cleaned = cleanGameSettings({ ...GOOD, type: "settings", kick: 3, host: 1 });
    expect(cleaned).toEqual(GOOD);
    expect(cleaned).not.toBe(GOOD);
  });

  it("are refused when a part is missing", () => {
    expect(cleanGameSettings({ level: "hard", most: 4 })).toBeNull();
    expect(cleanGameSettings({ computers: true, most: 4 })).toBeNull();
    expect(cleanGameSettings({ computers: true, level: "hard" })).toBeNull();
    expect(cleanGameSettings({})).toBeNull();
  });

  it("are refused when computer karts are not exactly true or false", () => {
    for (const computers of ["true", 1, 0, null, "on", "yes"]) {
      expect(cleanGameSettings({ ...GOOD, computers })).toBeNull();
    }
  });

  it("are refused for a level that is not one of the three words", () => {
    for (const level of ["medium", "Easy", "HARD", "", "impossible", 2, null, ["easy"]]) {
      expect(cleanGameSettings({ ...GOOD, level })).toBeNull();
    }
  });

  it("are refused for a limit out of range", () => {
    for (const most of [1, 7, 0, -1, 3.5, "3", null]) {
      expect(cleanGameSettings({ ...GOOD, most })).toBeNull();
    }
  });

  it("are refused when they are not a list of parts at all", () => {
    for (const value of [null, undefined, "settings", 4, true]) {
      expect(cleanGameSettings(value)).toBeNull();
    }
  });
});

describe("settings a page shows", () => {
  it("are what the server said, when that is usable", () => {
    expect(readGameSettings(GOOD)).toEqual(GOOD);
  });

  it("are the defaults when the server said nothing usable, so the page does not break", () => {
    for (const value of [undefined, null, {}, { computers: true }, { ...GOOD, most: 99 }, "x"]) {
      expect(readGameSettings(value)).toEqual(DEFAULT_GAME_SETTINGS);
    }
  });

  it("are a copy: changing them does not change the defaults", () => {
    const shown = readGameSettings(null);
    shown.most = 2;
    expect(DEFAULT_GAME_SETTINGS.most).toBe(6);
  });
});

describe("what a host may change", () => {
  const before = { computers: true, level: "normal", most: 6 };

  it("is everything, when the limit still fits the people who are here", () => {
    expect(settingsAfter(before, { computers: false, level: "easy", most: 3 }, 3)).toEqual({ computers: false, level: "easy", most: 3 });
    expect(settingsAfter(before, { computers: false, level: "easy", most: 2 }, 1)).toEqual({ computers: false, level: "easy", most: 2 });
  });

  it("is never a limit below the people who are already in the room: nobody is thrown out", () => {
    const after = settingsAfter(before, { computers: true, level: "normal", most: 2 }, 3);
    expect(after.most).toBe(6); // stays as it was
  });

  it("still takes the rest of what was asked when the limit is refused", () => {
    const after = settingsAfter({ computers: true, level: "normal", most: 4 }, { computers: false, level: "hard", most: 2 }, 4);
    expect(after).toEqual({ computers: false, level: "hard", most: 4 });
  });

  it("can raise the limit again", () => {
    expect(settingsAfter({ ...before, most: 3 }, { ...before, most: 5 }, 3).most).toBe(5);
  });

  it("does not change the settings it was given", () => {
    const current = { ...before };
    settingsAfter(current, { computers: false, level: "hard", most: 2 }, 1);
    expect(current).toEqual(before);
  });
});

describe("the limits a host can pick from", () => {
  it("are 2, 3, 4, 5 and 6", () => {
    expect(playerLimitChoices(1).map((choice) => choice.most)).toEqual([2, 3, 4, 5, 6]);
  });

  it("are all allowed for a host who is alone, or with one other", () => {
    expect(playerLimitChoices(1).every((choice) => choice.allowed)).toBe(true);
    expect(playerLimitChoices(2).every((choice) => choice.allowed)).toBe(true);
  });

  it("leave out the numbers below the people who are here", () => {
    expect(playerLimitChoices(4)).toEqual([
      { most: 2, allowed: false },
      { most: 3, allowed: false },
      { most: 4, allowed: true },
      { most: 5, allowed: true },
      { most: 6, allowed: true },
    ]);
  });

  it("leave only six for a full room", () => {
    expect(playerLimitChoices(6).filter((choice) => choice.allowed)).toEqual([{ most: 6, allowed: true }]);
  });
});

describe("the settings message a browser may send", () => {
  const text = (message) => JSON.stringify(message);

  it("is read when it has exactly the three parts", () => {
    expect(readClientMessage(text({ type: "settings", ...GOOD }))).toEqual({ type: "settings", settings: GOOD });
  });

  it("fits in the longest message a browser may send", () => {
    const longest = text({ type: "settings", computers: false, level: "normal", most: 6 });
    expect(longest.length).toBeLessThan(MAX_MESSAGE_LENGTH);
  });

  it("drops anything extra a browser added", () => {
    const read = readClientMessage(text({ type: "settings", ...GOOD, host: 3, kick: [1, 2] }));
    expect(read).toEqual({ type: "settings", settings: GOOD });
  });

  it("is refused when a part is missing or wrong", () => {
    expect(readClientMessage(text({ type: "settings" }))).toBeNull();
    expect(readClientMessage(text({ type: "settings", ...GOOD, level: "medium" }))).toBeNull();
    expect(readClientMessage(text({ type: "settings", ...GOOD, most: 1 }))).toBeNull();
    expect(readClientMessage(text({ type: "settings", ...GOOD, most: 7 }))).toBeNull();
    expect(readClientMessage(text({ type: "settings", ...GOOD, computers: "yes" }))).toBeNull();
  });

  it("cannot be hidden inside a list of settings", () => {
    expect(readClientMessage(text({ type: "settings", settings: GOOD }))).toBeNull();
  });

  it("leaves the older computer karts message as it was", () => {
    expect(readClientMessage(text({ type: "computers", on: false }))).toEqual({ type: "computers", on: false });
  });
});
