// The words of the "Game settings" card and of the label in the corner of an
// online room, and what the browser remembers for a single race and a
// two-player race (client/game-settings-view.js). No browser is needed.

import { describe, it, expect } from "vitest";
import {
  CARD_MODES,
  CONFIRM_WORDS,
  readGameChoice,
  saveGameChoice,
  cardWords,
  limitRow,
  computersRow,
  levelRow,
  settingsSummary,
  roomLabel,
} from "../client/game-settings-view.js";
import { readLevel } from "../client/difficulty.js";

/** A pretend browser storage: a Map behind getItem and setItem. */
function pretendStorage(start = {}) {
  const kept = new Map(Object.entries(start));
  return { getItem: (key) => (kept.has(key) ? kept.get(key) : null), setItem: (key, value) => kept.set(key, value), kept };
}

/** A storage that refuses every write, like a full one or some private windows. */
const refusing = {
  getItem: () => null,
  setItem: () => {
    throw new Error("no room");
  },
};

describe("what the browser remembers of the game settings", () => {
  it("is computer karts on, at the normal level, when nothing was saved", () => {
    expect(readGameChoice(pretendStorage())).toEqual({ computers: true, level: "normal" });
  });

  it("is the same when the browser has no storage at all", () => {
    expect(readGameChoice(null)).toEqual({ computers: true, level: "normal" });
  });

  it("is what was saved", () => {
    const storage = pretendStorage();
    expect(saveGameChoice(storage, { computers: false, level: "hard" })).toBe(true);
    expect(readGameChoice(storage)).toEqual({ computers: false, level: "hard" });
    saveGameChoice(storage, { computers: true, level: "easy" });
    expect(readGameChoice(storage)).toEqual({ computers: true, level: "easy" });
  });

  it("shares the level with the single race's own level, so both always agree", () => {
    const storage = pretendStorage();
    saveGameChoice(storage, { computers: true, level: "hard" });
    expect(readLevel(storage)).toBe("hard");
  });

  it("reads something strange in the storage as computer karts on", () => {
    for (const saved of ['{"on":"no"}', '{"on":0}', "broken", "[false]", '{"off":true}']) {
      expect(readGameChoice(pretendStorage({ "kart-computers": saved })).computers, saved).toBe(true);
    }
    expect(readGameChoice(pretendStorage({ "kart-computers": '{"on":false}' })).computers).toBe(false);
  });

  it("refuses to save anything that is not a true or false with one of the three levels", () => {
    const storage = pretendStorage();
    for (const choice of [null, {}, { computers: true }, { computers: "yes", level: "easy" }, { computers: true, level: "medium" }, "easy"]) {
      expect(() => saveGameChoice(storage, choice)).toThrow();
    }
    expect(storage.kept.size).toBe(0); // nothing was written
  });

  it("says so when the browser refused to keep it", () => {
    expect(saveGameChoice(refusing, { computers: false, level: "easy" })).toBe(false);
    expect(saveGameChoice(null, { computers: false, level: "easy" })).toBe(false);
  });
});

describe("the top of the card", () => {
  it("exists for the three kinds of race, and for nothing else", () => {
    expect(CARD_MODES).toEqual(["online", "single", "double"]);
    for (const mode of CARD_MODES) {
      const words = cardWords(mode);
      expect(words.title).not.toBe("");
      expect(words.lead).not.toBe("");
    }
    expect(() => cardWords("cup")).toThrow();
    expect(() => cardWords(undefined)).toThrow();
  });

  it("tells the first person in an online room that they are the host, and calls it starting an online game", () => {
    const words = cardWords("online", true);
    expect(words.badge).toBe("You are the host");
    expect(words.title).toBe("Start online game");
    expect(words.lead).toMatch(/first in the room/);
  });

  it("is simply 'Game settings' when the host opens it again between races", () => {
    const words = cardWords("online", false);
    expect(words.badge).toBe("You are the host");
    expect(words.title).toBe("Game settings");
    expect(words.lead).toMatch(/next race/);
  });

  it("names the kind of race on the other two pages, and says that a change starts the race again", () => {
    expect(cardWords("single").badge).toBe("Single race");
    expect(cardWords("double").badge).toBe("Two players");
    expect(cardWords("single").lead).toMatch(/starts the race again/);
    expect(cardWords("double").lead).toMatch(/starts the race again/);
  });

  it("has a button that says what it does", () => {
    expect(CONFIRM_WORDS).toBe("Confirm game settings");
  });
});

describe("the row 'Players' of the card", () => {
  it("offers 2 to 6, with the chosen one pressed", () => {
    const row = limitRow(4, 1);
    expect(row.choices.map((choice) => choice.most)).toEqual([2, 3, 4, 5, 6]);
    expect(row.choices.filter((choice) => choice.pressed).map((choice) => choice.most)).toEqual([4]);
    expect(row.choices.every((choice) => choice.allowed)).toBe(true);
  });

  it("does not allow fewer than the people who are already in the room, and says why", () => {
    const row = limitRow(6, 4);
    expect(row.choices.filter((choice) => !choice.allowed).map((choice) => choice.most)).toEqual([2, 3]);
    expect(row.hint).toMatch(/4 are here now, so not fewer than 4/);
  });

  it("says nothing about the people here while every number can be picked", () => {
    expect(limitRow(6, 1).hint).toBe("At most this many people in the room.");
    expect(limitRow(6, 2).hint).toBe("At most this many people in the room.");
  });
});

describe("the row 'Computer karts' of the card", () => {
  it("is On or Off, one of them pressed", () => {
    expect(computersRow(true, "online").choices).toEqual([
      { on: true, words: "On", pressed: true },
      { on: false, words: "Off", pressed: false },
    ]);
    expect(computersRow(false, "online").choices.find((choice) => choice.pressed).words).toBe("Off");
  });

  it("says that they fill the race up to six karts", () => {
    for (const mode of CARD_MODES) {
      expect(computersRow(true, mode).hint).toBe("They fill the race up to six karts.");
    }
  });

  it("says who is left when they are off, for each kind of race", () => {
    expect(computersRow(false, "online").hint).toBe("Only people race.");
    expect(computersRow(false, "single").hint).toBe("You race alone, against the clock.");
    expect(computersRow(false, "double").hint).toBe("Only the two of you race.");
  });
});

describe("the row 'Their level' of the card", () => {
  it("is Easy, Normal or Hard, in the words of the single race", () => {
    const row = levelRow("hard", true);
    expect(row.choices.map((choice) => choice.words)).toEqual(["Easy", "Normal", "Hard"]);
    expect(row.choices.find((choice) => choice.pressed).level).toBe("hard");
    expect(row.usable).toBe(true);
  });

  it("cannot be used while computer karts are off: there is nobody to set it for", () => {
    expect(levelRow("normal", false).usable).toBe(false);
  });
});

describe("the settings in one line", () => {
  it("say the level of the computer karts", () => {
    expect(settingsSummary({ computers: true, level: "easy", most: 6 })).toBe("Computer karts: Easy");
    expect(settingsSummary({ computers: true, level: "hard", most: 6 })).toBe("Computer karts: Hard");
  });

  it("say when there are none", () => {
    expect(settingsSummary({ computers: false, level: "hard", most: 6 })).toBe("No computer karts");
  });

  it("put the limit first online, but only when the host lowered it", () => {
    expect(settingsSummary({ computers: true, level: "normal", most: 4 }, { withLimit: true })).toBe("Up to 4 players · Computer karts: Normal");
    expect(settingsSummary({ computers: false, level: "normal", most: 2 }, { withLimit: true })).toBe("Up to 2 players · No computer karts");
    expect(settingsSummary({ computers: true, level: "normal", most: 6 }, { withLimit: true })).toBe("Computer karts: Normal");
  });

  it("leave the limit out where there is none to speak of (single race, two players)", () => {
    expect(settingsSummary({ computers: true, level: "normal", most: 4 })).toBe("Computer karts: Normal");
  });
});

describe("the label in the corner of an online room", () => {
  const settings = { computers: true, level: "hard", most: 4 };
  const open = { phase: "open", countdownSteps: 0, host: 3, watching: [] };
  const names = new Map([[3, "Ana"]]);

  it("tells the host that they are the host, and gives them the button", () => {
    const label = roomLabel({ race: open, myId: 3, names, settings });
    expect(label).toEqual({ mine: true, who: "You are the host", summary: "Up to 4 players · Computer karts: Hard" });
  });

  it("tells everyone else who the host is, by user name, without the button", () => {
    const label = roomLabel({ race: open, myId: 5, names, settings });
    expect(label.mine).toBe(false);
    expect(label.who).toBe("Host: Ana");
    expect(label.summary).toBe("Up to 4 players · Computer karts: Hard");
  });

  it("calls a host who is not signed in a guest", () => {
    expect(roomLabel({ race: open, myId: 5, names: new Map(), settings }).who).toBe("Host: a guest");
    expect(roomLabel({ race: open, myId: 5, names: null, settings }).who).toBe("Host: a guest");
  });

  it("is not there once a race has been started: the picture belongs to the race", () => {
    for (const phase of ["countdown", "racing", "finished"]) {
      expect(roomLabel({ race: { ...open, phase }, myId: 3, names, settings })).toBeNull();
    }
  });

  it("is not there before we know our number or who the host is", () => {
    expect(roomLabel({ race: open, myId: null, names, settings })).toBeNull();
    expect(roomLabel({ race: { ...open, host: null }, myId: 3, names, settings })).toBeNull();
  });
});
