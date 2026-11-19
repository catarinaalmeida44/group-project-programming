// Tests for client/stats-view.js: a player's own stats as words for the
// card in "Your account", and what the single race page says about saving.
//
// No browser and no server here: numbers go in, words come out.

import { describe, it, expect } from "vitest";
import {
  statsWords,
  raceTag,
  winsLine,
  dayText,
  statsProblemText,
  singleSavedText,
  NO_RACES_TEXT,
  WHAT_COUNTS_TEXT,
  STATS_LOADING_TEXT,
} from "../client/stats-view.js";
import { statsFrom } from "../server/stats.js";
import { CAST } from "../shared/cast.js";
import { LEVELS } from "../shared/computer-driver.js";
import { LEVEL_WORDS } from "../client/difficulty.js";

// Midday, so that the day is the same in every time zone a laptop could be set to.
const NOV_19 = new Date(2026, 10, 19, 12, 0).getTime();
const NOV_18 = new Date(2026, 10, 18, 12, 0).getTime();

/** Stats as the server sends them. Give only what matters for the test. */
function stats(change = {}) {
  return {
    races: 12,
    online: 8,
    single: 4,
    wins: 3,
    podiums: 7,
    winsBy: { online: 1, easy: 1, normal: 0, hard: 1, other: 0 },
    bestRaces: [
      { steps: 5007, mode: "online", level: null, at: NOV_19, character: "cici" },
      { steps: 5106, mode: "single", level: "hard", at: NOV_18, character: "pcp" },
      { steps: 5206, mode: "online", level: null, at: NOV_19, character: null },
    ],
    bestLap: { steps: 1620, mode: "single", level: "easy", at: NOV_18 },
    favourite: { character: "cici", races: 5, counted: 12 },
    lastAt: NOV_19,
    rank: { race: 2, lap: 1 },
    ...change,
  };
}

describe("the three big numbers", () => {
  it("are the races, the wins and the podiums", () => {
    expect(statsWords(stats()).numbers).toEqual([
      { label: "Races", value: "12" },
      { label: "Wins", value: "3" },
      { label: "Podiums", value: "7" },
    ]);
  });

  it("say 'Race', 'Win' and 'Podium' for exactly one", () => {
    expect(statsWords(stats({ races: 1, wins: 1, podiums: 1 })).numbers.map((each) => each.label)).toEqual(["Race", "Win", "Podium"]);
    expect(statsWords(stats({ races: 2, wins: 0, podiums: 0 })).numbers.map((each) => each.label)).toEqual(["Races", "Wins", "Podiums"]);
  });

  it("are three zeros when there is nothing to show, instead of breaking", () => {
    for (const nothing of [null, undefined, {}]) {
      const words = statsWords(nothing);
      expect(words.numbers.map((each) => each.value)).toEqual(["0", "0", "0"]);
      expect(words.empty).toBe(true);
      expect(words.best).toEqual([]);
      expect(words.bestLap).toBe(null);
      expect(words.favourite).toBe(null);
      expect(words.kinds).toBe("");
    }
  });
});

describe("the best times", () => {
  it("are shown as on the race clock, first to third, each with its little label, its day and its character", () => {
    expect(statsWords(stats()).best).toEqual([
      { place: 1, time: "1:23.45", tag: { text: "Online", kind: "online" }, detail: "19 Nov 2026 · Cici Boss" },
      { place: 2, time: "1:25.10", tag: { text: "on Hard", kind: "hard" }, detail: "18 Nov 2026 · PCP" },
      { place: 3, time: "1:26.76", tag: { text: "Online", kind: "online" }, detail: "19 Nov 2026" }, // a race that did not note the character
    ]);
  });

  it("leave out a character that is not in the cast", () => {
    const words = statsWords(stats({ bestRaces: [{ steps: 5007, mode: "online", level: null, at: NOV_19, character: "mario" }] }));
    expect(words.best[0].detail).toBe("19 Nov 2026");
  });

  it("show the best lap with its little label and its day", () => {
    expect(statsWords(stats()).bestLap).toEqual({ time: "0:27.00", tag: { text: "on Easy", kind: "easy" }, detail: "18 Nov 2026" });
    expect(statsWords(stats({ bestLap: null })).bestLap).toBe(null);
  });

  it("say how many races were online and how many single", () => {
    expect(statsWords(stats()).kinds).toBe("8 online · 4 single races");
    expect(statsWords(stats({ online: 0, single: 1, races: 1 })).kinds).toBe("0 online · 1 single race");
  });
});

// Added the same evening, asked for by Catarina: a win on Easy counts, and
// "a little thing on the side" says which level it was. The words are the
// ones on Rodrigo's buttons of the race page: Easy, Normal, Hard.
describe("the little label beside a time", () => {
  it("says 'on Easy', 'on Normal' or 'on Hard' for a single race at that level", () => {
    expect(raceTag("single", "easy")).toEqual({ text: "on Easy", kind: "easy" });
    expect(raceTag("single", "normal")).toEqual({ text: "on Normal", kind: "normal" });
    expect(raceTag("single", "hard")).toEqual({ text: "on Hard", kind: "hard" });
  });

  it("uses the very words of the buttons on the race page", () => {
    for (const level of LEVELS) {
      expect(raceTag("single", level).text).toBe(`on ${LEVEL_WORDS[level]}`);
    }
  });

  it("says 'Online' for an online race, whatever level comes with it", () => {
    for (const level of [null, undefined, "easy", "hard"]) {
      expect(raceTag("online", level)).toEqual({ text: "Online", kind: "online" });
    }
  });

  it("says 'Single race' for a single race that noted no level, or something that is not one", () => {
    for (const level of [null, undefined, "", "Easy", "medium", "toString", 3]) {
      expect(raceTag("single", level), String(level)).toEqual({ text: "Single race", kind: "single" });
    }
  });

  it("only ever gives one of five kinds, which the page turns into a colour", () => {
    const kinds = new Set();
    for (const mode of ["online", "single", "something-else"]) {
      for (const level of [null, "easy", "normal", "hard", "<b>bold</b>"]) {
        kinds.add(raceTag(mode, level).kind);
      }
    }
    expect([...kinds].sort()).toEqual(["easy", "hard", "normal", "online", "single"]);
  });
});

describe("the line about where the wins come from", () => {
  it("names each kind that has a win", () => {
    expect(statsWords(stats()).winsLine).toBe("3 wins: 1 online · 1 on Easy · 1 on Hard");
    expect(winsLine(6, { online: 0, easy: 2, normal: 3, hard: 1, other: 0 })).toBe("6 wins: 2 on Easy · 3 on Normal · 1 on Hard");
  });

  it("says 'win' for exactly one", () => {
    expect(winsLine(1, { online: 0, easy: 1, normal: 0, hard: 0, other: 0 })).toBe("1 win: 1 on Easy");
  });

  it("mentions wins in older single races that noted no level", () => {
    expect(winsLine(3, { online: 1, easy: 0, normal: 0, hard: 0, other: 2 })).toBe("3 wins: 1 online · 2 in single races");
  });

  it("is empty without a win, or when the server sent no such numbers", () => {
    expect(winsLine(0, { online: 0, easy: 0, normal: 0, hard: 0, other: 0 })).toBe("");
    expect(winsLine(2, null)).toBe("");
    expect(winsLine(2, undefined)).toBe("");
    expect(statsWords(stats({ wins: 0 })).winsLine).toBe("");
    expect(statsWords(null).winsLine).toBe("");
  });
});

describe("the sentence about the shared leaderboard", () => {
  it("gives the player's places", () => {
    expect(statsWords(stats()).rank).toBe("On the shared leaderboard: 2nd fastest race, 1st fastest lap.");
    expect(statsWords(stats({ rank: { race: 11, lap: 23 } })).rank).toBe("On the shared leaderboard: 11th fastest race, 23rd fastest lap.");
  });

  it("says how to get on it for a player with single races only", () => {
    expect(statsWords(stats({ rank: null })).rank).toBe("Not on the shared leaderboard yet: finish an online race to get on it.");
  });
});

describe("the character driven most", () => {
  it("is named, with how many of the player's races it was driven in", () => {
    expect(statsWords(stats()).favourite).toEqual({ id: "cici", name: "Cici Boss", line: "Driven in 5 of your 12 races" });
    expect(statsWords(stats({ races: 1, favourite: { character: "ro", races: 1, counted: 1 } })).favourite.line).toBe("Driven in 1 of your 1 race");
  });

  it("says so when older races did not note the character", () => {
    const words = statsWords(stats({ favourite: { character: "pcp", races: 2, counted: 3 } }));
    expect(words.favourite.line).toBe("Driven in 2 of the 3 races that noted the character");
    expect(statsWords(stats({ favourite: { character: "pcp", races: 1, counted: 1 } })).favourite.line).toBe(
      "Driven in 1 of the 1 race that noted the character",
    );
  });

  it("is nobody when no race noted one, or the name is not in the cast", () => {
    expect(statsWords(stats({ favourite: null })).favourite).toBe(null);
    expect(statsWords(stats({ favourite: { character: "mario", races: 9, counted: 9 } })).favourite).toBe(null);
    expect(statsWords(stats({ favourite: { character: "toString", races: 9, counted: 9 } })).favourite).toBe(null);
  });

  it("can be every character of the cast, by its own name", () => {
    for (const { id, name } of CAST) {
      expect(statsWords(stats({ favourite: { character: id, races: 1, counted: 12 } })).favourite).toMatchObject({ id, name });
    }
  });
});

describe("the words for what the server really sends", () => {
  it("fit the server's own stats, from a list of races to the card", () => {
    const rows = [
      { track: "nova-lap", mode: "online", raceSteps: 6000, bestLapSteps: 1900, position: 1, character: "dean", at: NOV_18 },
      { track: "nova-lap", mode: "single", raceSteps: 5400, bestLapSteps: 1700, position: 4, character: "dean", at: NOV_19 },
    ];
    const words = statsWords({ ...statsFrom(rows, "nova-lap"), rank: { race: 1, lap: 1 } });
    expect(words.empty).toBe(false);
    expect(words.numbers.map((each) => each.value)).toEqual(["2", "1", "1"]);
    expect(words.best.map((best) => best.time)).toEqual(["1:30.00", "1:40.00"]);
    expect(words.bestLap.time).toBe("0:28.33");
    expect(words.favourite).toEqual({ id: "dean", name: "Dean", line: "Driven in 2 of your 2 races" });
    expect(words.kinds).toBe("1 online · 1 single race");
  });

  it("are 'no races yet' for a player who has not raced", () => {
    const words = statsWords({ ...statsFrom([], "nova-lap"), rank: null });
    expect(words.empty).toBe(true);
    expect(NO_RACES_TEXT).toContain("No races yet");
  });
});

describe("a day", () => {
  it("is written the same way everywhere: day, short month, year", () => {
    expect(dayText(NOV_19)).toBe("19 Nov 2026");
    expect(dayText(new Date(2027, 0, 3, 12, 0).getTime())).toBe("3 Jan 2027");
  });

  it("is nothing for a moment that is none", () => {
    for (const nothing of [null, undefined, NaN, "yesterday", {}, Infinity]) {
      expect(dayText(nothing), String(nothing)).toBe("");
    }
  });
});

describe("the fixed sentences", () => {
  it("say what counts where", () => {
    expect(WHAT_COUNTS_TEXT).toContain("Single races count here");
    expect(WHAT_COUNTS_TEXT).toContain("only counts online races");
    expect(STATS_LOADING_TEXT).toBe("Loading your stats…");
  });

  it("pass the server's own sentence on when the stats could not be read, or give a calm one", () => {
    expect(statsProblemText("The server could not be reached. Try again in a moment.")).toBe("The server could not be reached. Try again in a moment.");
    for (const nothing of [undefined, null, "", 42, {}]) {
      expect(statsProblemText(nothing)).toBe("Your stats could not be loaded. Try again in a moment.");
    }
  });
});

describe("what the single race page says about saving the race", () => {
  it("says it was saved", () => {
    expect(singleSavedText({ ok: true })).toBe(" Saved to your stats.");
  });

  it("says nothing to a guest, or on a server without accounts: nothing was promised", () => {
    expect(singleSavedText({ ok: false, code: "not_signed_in", message: "You are not signed in." })).toBe("");
    expect(singleSavedText({ ok: false, code: "unavailable", message: "Accounts are not available." })).toBe("");
  });

  it("says nothing while the server has not answered", () => {
    expect(singleSavedText(null)).toBe("");
    expect(singleSavedText(undefined)).toBe("");
  });

  it("says honestly when the race was not saved", () => {
    expect(singleSavedText({ ok: false, code: "offline", message: "x" })).toBe(" Not saved to your stats: the server could not be reached.");
    for (const code of ["invalid_result", "too_soon", "too_many_attempts", "something_new"]) {
      expect(singleSavedText({ ok: false, code, message: "x" }), code).toBe(" Not saved to your stats.");
    }
  });
});
