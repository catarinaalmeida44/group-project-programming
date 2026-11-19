// Tests for server/stats.js: a player's own stats, worked out from the list
// of their saved races, and that list written out as a file for a
// spreadsheet ("Download my results").
//
// No server and no database here: plain lists go in, plain answers come out.

import { describe, it, expect } from "vitest";
import { statsFrom, resultsAsCsv, csvCell, CSV_COLUMNS, BEST_TIMES_SHOWN } from "../server/stats.js";
import { CAST } from "../shared/cast.js";

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 10, 19, 16, 5); // 19 November 2026, 16:05

/** One saved race. Give only what matters for the test. */
function race(change = {}) {
  return { track: "nova-lap", mode: "online", raceSteps: 6000, bestLapSteps: 1900, position: 2, character: "dean", level: null, at: START, ...change };
}

describe("a player's stats", () => {
  it("are all zero and empty for a player who has not raced", () => {
    expect(statsFrom([], "nova-lap")).toEqual({
      races: 0,
      online: 0,
      single: 0,
      wins: 0,
      podiums: 0,
      winsBy: { online: 0, easy: 0, normal: 0, hard: 0, other: 0 },
      bestRaces: [],
      bestLap: null,
      favourite: null,
      lastAt: null,
    });
  });

  it("count the races, and how many were online and how many single", () => {
    const stats = statsFrom([race(), race({ mode: "single" }), race({ mode: "single" })], "nova-lap");
    expect(stats.races).toBe(3);
    expect(stats.online).toBe(1);
    expect(stats.single).toBe(2);
  });

  it("count a win only for first place, and a podium for the first three", () => {
    const stats = statsFrom([1, 1, 2, 3, 4, 6].map((position) => race({ position })), "nova-lap");
    expect(stats.wins).toBe(2);
    expect(stats.podiums).toBe(4);
  });

  it("only look at the track asked for", () => {
    const rows = [race({ raceSteps: 5000 }), race({ track: "test-oval", raceSteps: 800, position: 1, character: "pcp" })];
    const stats = statsFrom(rows, "nova-lap");
    expect(stats.races).toBe(1);
    expect(stats.wins).toBe(0);
    expect(stats.bestRaces.map((best) => best.steps)).toEqual([5000]);
    expect(stats.favourite.character).toBe("dean");
    expect(statsFrom(rows, "a-track-nobody-raced").races).toBe(0);
  });

  it("list the three fastest races, fastest first, each with its kind, its day and its character", () => {
    const rows = [
      race({ raceSteps: 6100, at: START }),
      race({ raceSteps: 5800, at: START + DAY, mode: "single", level: "hard", character: "pcp" }),
      race({ raceSteps: 6400, at: START + 2 * DAY }),
      race({ raceSteps: 5900, at: START + 3 * DAY, character: "cici" }),
    ];
    const stats = statsFrom(rows, "nova-lap");
    expect(BEST_TIMES_SHOWN).toBe(3);
    expect(stats.bestRaces).toEqual([
      { steps: 5800, mode: "single", level: "hard", at: START + DAY, character: "pcp" },
      { steps: 5900, mode: "online", level: null, at: START + 3 * DAY, character: "cici" },
      { steps: 6100, mode: "online", level: null, at: START, character: "dean" },
    ]);
  });

  it("list fewer than three when there are fewer races", () => {
    expect(statsFrom([race(), race()], "nova-lap").bestRaces).toHaveLength(2);
  });

  it("put the race driven first in front when two have exactly the same time", () => {
    const rows = [race({ raceSteps: 5000, at: START + DAY, character: "pcp" }), race({ raceSteps: 5000, at: START, character: "ro" })];
    expect(statsFrom(rows, "nova-lap").bestRaces.map((best) => best.character)).toEqual(["ro", "pcp"]);
  });

  it("give the fastest single lap, which can come from a slower race", () => {
    const rows = [
      race({ raceSteps: 5000, bestLapSteps: 1700, at: START }),
      race({ raceSteps: 7000, bestLapSteps: 1500, at: START + DAY, mode: "single", level: "easy" }),
    ];
    expect(statsFrom(rows, "nova-lap").bestLap).toEqual({ steps: 1500, mode: "single", level: "easy", at: START + DAY });
  });

  it("say when the newest race was saved", () => {
    const rows = [race({ at: START + DAY }), race({ at: START + 3 * DAY }), race({ at: START })];
    expect(statsFrom(rows, "nova-lap").lastAt).toBe(START + 3 * DAY);
  });

  it("do not change the list they were given", () => {
    const rows = [race({ raceSteps: 7000 }), race({ raceSteps: 5000 })];
    const before = JSON.stringify(rows);
    statsFrom(rows, "nova-lap");
    expect(JSON.stringify(rows)).toBe(before);
  });
});

// Added the same evening: Rodrigo's Easy, Normal and Hard for the computer
// karts of a single race. A win on Easy counts like any other (Catarina's
// decision), and the stats say which were which.
describe("the level of the computer karts", () => {
  it("says where the wins come from: online, and on each level", () => {
    const rows = [
      race({ position: 1 }), // online
      race({ position: 1 }), // online
      race({ position: 1, mode: "single", level: "easy" }),
      race({ position: 1, mode: "single", level: "hard" }),
      race({ position: 1, mode: "single", level: "hard" }),
      race({ position: 2, mode: "single", level: "normal" }), // not a win
      race({ position: 4, mode: "single", level: "easy" }), //   not a win
    ];
    const stats = statsFrom(rows, "nova-lap");
    expect(stats.wins).toBe(5); // a win on Easy counts like any other
    expect(stats.winsBy).toEqual({ online: 2, easy: 1, normal: 0, hard: 2, other: 0 });
  });

  it("always adds up to the number of wins", () => {
    const rows = [
      race({ position: 1 }),
      race({ position: 1, mode: "single", level: "normal" }),
      race({ position: 1, mode: "single", level: null }), //    saved before levels existed
      race({ position: 1, mode: "single", level: "medium" }), // not a level
    ];
    const { wins, winsBy } = statsFrom(rows, "nova-lap");
    expect(winsBy).toEqual({ online: 1, easy: 0, normal: 1, hard: 0, other: 2 });
    expect(Object.values(winsBy).reduce((sum, each) => sum + each, 0)).toBe(wins);
  });

  it("is passed on with a best time and the best lap, for a single race only", () => {
    const rows = [
      race({ raceSteps: 5000, bestLapSteps: 1600, mode: "single", level: "easy" }),
      race({ raceSteps: 5100, bestLapSteps: 1500, mode: "online", level: "hard" }), // an online race has no level, whatever its row says
    ];
    const stats = statsFrom(rows, "nova-lap");
    expect(stats.bestRaces.map((best) => best.level)).toEqual(["easy", null]);
    expect(stats.bestLap.level).toBe(null);
  });

  it("is none for anything that is not exactly easy, normal or hard", () => {
    for (const level of [null, undefined, "", "Easy", "HARD", "medium", "toString", 2, {}]) {
      const stats = statsFrom([race({ mode: "single", level })], "nova-lap");
      expect(stats.bestRaces[0].level, String(level)).toBe(null);
    }
  });
});

describe("the character driven most", () => {
  it("is the one with the most races", () => {
    const rows = ["dean", "pcp", "pcp", "cici", "pcp", "dean"].map((character) => race({ character }));
    expect(statsFrom(rows, "nova-lap").favourite).toEqual({ character: "pcp", races: 3, counted: 6 });
  });

  it("is the one driven most recently when two have the same number of races", () => {
    const rows = [
      race({ character: "dean", at: START }),
      race({ character: "ro", at: START + DAY }),
      race({ character: "dean", at: START + 2 * DAY }),
      race({ character: "ro", at: START + 3 * DAY }),
    ];
    expect(statsFrom(rows, "nova-lap").favourite).toEqual({ character: "ro", races: 2, counted: 4 });
  });

  it("leaves out races that have no character, and says how many it could count", () => {
    // Races saved before 19 November 2026 have no character.
    const rows = [race({ character: null }), race({ character: null }), race({ character: null }), race({ character: "franfon" })];
    expect(statsFrom(rows, "nova-lap").favourite).toEqual({ character: "franfon", races: 1, counted: 4 - 3 });
  });

  it("is nobody when no race has a character", () => {
    expect(statsFrom([race({ character: null }), race({ character: undefined })], "nova-lap").favourite).toBe(null);
  });

  it("ignores anything that is not a character of the cast", () => {
    const rows = [
      race({ character: "mario" }),
      race({ character: "mario" }),
      race({ character: "PCP" }), // only the exact id counts
      race({ character: "toString" }),
      race({ character: 7 }),
      race({ character: "ricardo" }),
    ];
    const stats = statsFrom(rows, "nova-lap");
    expect(stats.favourite).toEqual({ character: "ricardo", races: 1, counted: 1 });
    // And such a name is not passed on with a best time either.
    expect(stats.bestRaces.every((best) => best.character === null || best.character === "ricardo")).toBe(true);
  });

  it("can be every character of the cast", () => {
    for (const { id } of CAST) {
      expect(statsFrom([race({ character: id })], "nova-lap").favourite.character).toBe(id);
    }
  });
});

describe("the file of a player's results", () => {
  const TRACK_NAMES = { "nova-lap": "Nova lap", "test-oval": "Test oval" };

  /** The file as rows of cells, read back the way a spreadsheet would. */
  function cellsOf(file) {
    return file
      .trimEnd()
      .split("\r\n")
      .map((line) => line.match(/("([^"]|"")*"|[^,]*)(,|$)/g).slice(0, CSV_COLUMNS.length).map((cell) => cell.replace(/,$/, "")));
  }

  it("starts with the names of the columns, and has one line for each race in the order given", () => {
    const file = resultsAsCsv([race({ raceSteps: 5000 }), race({ raceSteps: 6000 })], TRACK_NAMES);
    const lines = file.trimEnd().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(CSV_COLUMNS.map((name) => `"${name}"`).join(","));
    expect(cellsOf(file)[1][7]).toBe("83333");
    expect(cellsOf(file)[2][7]).toBe("100000");
    expect(file.endsWith("\r\n")).toBe(true);
  });

  it("is only the line of column names for a player who has not raced", () => {
    expect(resultsAsCsv([], TRACK_NAMES).trimEnd().split("\r\n")).toHaveLength(1);
  });

  it("writes each race as: day, track, kind, level, place, the two times as on the screen and as whole numbers, character", () => {
    const row = race({ mode: "single", level: "hard", raceSteps: 5007, bestLapSteps: 1620, position: 3, character: "ro", at: START });
    expect(cellsOf(resultsAsCsv([row], TRACK_NAMES))[1]).toEqual([
      '"2026-11-19 16:05"',
      '"Nova lap"',
      '"single race"',
      '"Hard"',
      "3",
      '"1:23.45"',
      '"0:27.00"',
      "83450",
      "27000",
      '"Ró Versos"',
    ]);
  });

  it("calls a race the server ran 'online'", () => {
    expect(cellsOf(resultsAsCsv([race({ mode: "online" })], TRACK_NAMES))[1][2]).toBe('"online"');
  });

  it("names the level of the computer karts as on the buttons of the race page: Easy, Normal, Hard", () => {
    const levelCell = (change) => cellsOf(resultsAsCsv([race({ mode: "single", ...change })], TRACK_NAMES))[1][3];
    expect(levelCell({ level: "easy" })).toBe('"Easy"');
    expect(levelCell({ level: "normal" })).toBe('"Normal"');
    expect(levelCell({ level: "hard" })).toBe('"Hard"');
  });

  it("leaves the level empty for an online race, an older single race, and anything that is not a level", () => {
    const levelCell = (change) => cellsOf(resultsAsCsv([race(change)], TRACK_NAMES))[1][3];
    expect(levelCell({ mode: "online", level: "hard" })).toBe('""');
    for (const level of [null, undefined, "medium", "=1+1", "toString"]) {
      expect(levelCell({ mode: "single", level }), String(level)).toBe('""');
    }
  });

  it("leaves the character empty when the race has none or the name is not in the cast", () => {
    for (const character of [null, undefined, "mario", "=1+1"]) {
      expect(cellsOf(resultsAsCsv([race({ character })], TRACK_NAMES))[1][9], String(character)).toBe('""');
    }
  });

  it("keeps the short name of a track that is not in the list of names", () => {
    expect(cellsOf(resultsAsCsv([race({ track: "campus-loop" })], TRACK_NAMES))[1][1]).toBe('"campus-loop"');
    // A name like "toString" or "constructor" is not taken for a track either.
    expect(cellsOf(resultsAsCsv([race({ track: "toString" })], TRACK_NAMES))[1][1]).toBe('"toString"');
  });

  it("writes every line with the same number of cells as there are columns", () => {
    const file = resultsAsCsv([race(), race({ character: null }), race({ track: 'a "quoted", track' })], TRACK_NAMES);
    for (const cells of cellsOf(file)) {
      expect(cells).toHaveLength(CSV_COLUMNS.length);
    }
  });
});

describe("one cell of the file", () => {
  it("puts a text between quotation marks", () => {
    expect(csvCell("Nova lap")).toBe('"Nova lap"');
    expect(csvCell("")).toBe('""');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it("writes a whole number as it is", () => {
    expect(csvCell(3)).toBe("3");
    expect(csvCell(83450)).toBe("83450");
  });

  it("keeps a comma, a quotation mark or a new line inside its cell", () => {
    expect(csvCell("one, two")).toBe('"one, two"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
  });

  it("stops a text from being taken for a formula by a spreadsheet", () => {
    for (const start of ["=", "+", "-", "@", "\t", "\r"]) {
      const cell = csvCell(`${start}SUM(A1:A9)`);
      expect(cell.startsWith(`"'${start}`), JSON.stringify(start)).toBe(true);
    }
    expect(csvCell('=HYPERLINK("http://evil.example","click")')).toBe('"\'=HYPERLINK(""http://evil.example"",""click"")"');
  });

  it("writes a number that is not whole as text, never as something else", () => {
    expect(csvCell(1.5)).toBe('"1.5"');
    expect(csvCell(-2.5)).toBe('"\'-2.5"');
  });
});
