// Tests for choosing a track in the menu: client/track-list.js (what each
// track's card says) and client/mini-map.js (the small map on the card).
//
// There is no browser here. The storage is a pretend one, as in
// records.test.js, and the canvas the map is painted on is a pretend one
// that writes down what was painted.

import { describe, it, expect } from "vitest";
import { trackAddress, lapsText, practiceBests, trackCards, RACE_KINDS, NO_TIME } from "../client/track-list.js";
import { mapPictureSize, rowRuns, finishTiles, paintMiniMap, MAP_COLOURS } from "../client/mini-map.js";
import { chooseTrack } from "../client/track-choice.js";
import { recordFinishedRace } from "../client/records.js";
import { TRACKS } from "../shared/tracks/index.js";
import { createTrack } from "../shared/track.js";
import { smallTrackDescription } from "./small-track.js";

function fakeStorage(saved = {}) {
  const texts = { ...saved };
  return {
    texts,
    getItem: (key) => (key in texts ? texts[key] : null),
    setItem: (key, value) => {
      texts[key] = String(value);
    },
  };
}

const brokenStorage = {
  getItem: () => {
    throw new Error("storage switched off");
  },
  setItem: () => {
    throw new Error("storage full");
  },
};

describe("the cards for choosing a track", () => {
  it("has one card for every track in the list, in the same order", () => {
    for (const kind of ["single", "online"]) {
      const cards = trackCards(TRACKS, fakeStorage(), kind);
      expect(cards.map((card) => card.shortName)).toEqual(Object.keys(TRACKS));
      for (const card of cards) {
        expect(card.track).toBe(TRACKS[card.shortName]);
        expect(card.name).toBe(TRACKS[card.shortName].name);
      }
    }
  });

  it("says how many laps a race on the track has", () => {
    const [oval] = trackCards({ "test-oval": TRACKS["test-oval"] }, null, "single");
    expect(oval.laps).toBe("3 laps");
    expect(lapsText(1)).toBe("1 lap");
    expect(lapsText(2)).toBe("2 laps");
  });

  it("leads each card of a single race to the race page, and the race page opens that very track", () => {
    for (const card of trackCards(TRACKS, null, "single")) {
      expect(card.address).toBe(`/race.html?track=${card.shortName}`);
      // The part of the address from the question mark on, as the race page reads it.
      const search = new URL(card.address, "http://localhost").search;
      expect(chooseTrack(search), card.shortName).toBe(TRACKS[card.shortName]);
    }
  });

  it("leads each card of an online race to the online page, with the same choice of track", () => {
    for (const card of trackCards(TRACKS, null, "online")) {
      expect(card.address).toBe(`/online.html?track=${card.shortName}`);
      const search = new URL(card.address, "http://localhost").search;
      expect(chooseTrack(search), card.shortName).toBe(TRACKS[card.shortName]);
    }
  });

  it("shows a track that is added to the list later, without any other change", () => {
    const newTrack = createTrack({ ...smallTrackDescription(), name: "Library sprint" });
    const longerList = { ...TRACKS, "library-sprint": newTrack };
    const cards = trackCards(longerList, null, "single");
    const card = cards[cards.length - 1];
    expect(cards).toHaveLength(Object.keys(TRACKS).length + 1);
    expect(card.name).toBe("Library sprint");
    expect(card.laps).toBe("2 laps");
    expect(card.address).toBe("/race.html?track=library-sprint");
    expect(trackCards(longerList, null, "online")[cards.length - 1].address).toBe("/online.html?track=library-sprint");
  });

  it("makes any short name safe to put in an address", () => {
    expect(trackAddress("single", "a b&c=d")).toBe("/race.html?track=a%20b%26c%3Dd");
    expect(trackAddress("online", "x#y?z")).toBe("/online.html?track=x%23y%3Fz");
  });

  it("refuses a kind of race that does not exist", () => {
    for (const kind of ["cup", "", "Single", undefined, null, "constructor", "__proto__"]) {
      expect(() => trackAddress(kind, "test-oval"), String(kind)).toThrow(/no kind of race/);
      expect(() => trackCards(TRACKS, null, kind), String(kind)).toThrow(/no kind of race/);
    }
  });

  it("has a title, a sentence and a button word for each kind of race", () => {
    expect(Object.keys(RACE_KINDS)).toEqual(["single", "online"]);
    for (const words of Object.values(RACE_KINDS)) {
      for (const text of [words.title, words.lead, words.go]) {
        expect(typeof text).toBe("string");
        expect(text).not.toBe("");
      }
    }
    // The online sentence is honest about whose times are saved.
    expect(RACE_KINDS.online.lead).toContain("signed-in");
  });
});

describe("your own best times on a card", () => {
  const OVAL = TRACKS["test-oval"];
  const CAMPUS = TRACKS["campus-loop"];

  it("says there is no time yet on a track you never finished", () => {
    expect(practiceBests(fakeStorage(), OVAL)).toEqual({ race: NO_TIME, lap: NO_TIME, any: false });
  });

  it("shows the best race and the best lap after a finished race", () => {
    const storage = fakeStorage();
    recordFinishedRace(storage, OVAL, [600, 1080, 1620]); // laps of 10, 8 and 9 seconds
    expect(practiceBests(storage, OVAL)).toEqual({ race: "0:27.00", lap: "0:08.00", any: true });
  });

  it("keeps each track's times on its own card", () => {
    const storage = fakeStorage();
    recordFinishedRace(storage, OVAL, [600, 1200, 1800]);
    const cards = trackCards(TRACKS, storage, "single");
    expect(cards.find((card) => card.track === OVAL).best.race).toBe("0:30.00");
    expect(cards.find((card) => card.track === CAMPUS).best).toEqual({ race: NO_TIME, lap: NO_TIME, any: false });
  });

  it("ignores saved times that are not sensible (for example edited by hand)", () => {
    for (const bad of [0, -5, 12.5, "1800", null, "<b>fast</b>", { steps: 1 }]) {
      const saved = JSON.stringify({ [OVAL.name]: { raceSteps: bad, lapSteps: bad } });
      const storage = fakeStorage({ "kart-best-times": saved });
      expect(practiceBests(storage, OVAL)).toEqual({ race: NO_TIME, lap: NO_TIME, any: false });
    }
  });

  it("still makes the cards when the browser gives no storage, or a broken one", () => {
    for (const storage of [null, brokenStorage]) {
      const cards = trackCards(TRACKS, storage, "single");
      expect(cards).toHaveLength(Object.keys(TRACKS).length);
      expect(cards[0].best).toEqual({ race: NO_TIME, lap: NO_TIME, any: false });
    }
  });
});

describe("the size of the small map", () => {
  it("draws every tile as a whole number of pixels", () => {
    for (const [columns, rows] of [[30, 18], [64, 62], [7, 5], [1, 1], [333, 7]]) {
      const { tile, width, height } = mapPictureSize(columns, rows);
      expect(Number.isInteger(tile)).toBe(true);
      expect(tile).toBeGreaterThanOrEqual(1);
      expect(width).toBe(columns * tile);
      expect(height).toBe(rows * tile);
    }
  });

  it("makes the picture big enough to stay sharp, whatever the size of the track", () => {
    for (const track of Object.values(TRACKS)) {
      const { width, height } = mapPictureSize(track.columns, track.rows);
      expect(Math.max(width, height)).toBeGreaterThanOrEqual(480);
    }
  });

  it("never makes a tile smaller than one pixel, even on a giant track", () => {
    expect(mapPictureSize(5000, 3000)).toEqual({ tile: 1, width: 5000, height: 3000 });
  });
});

describe("splitting a row of the map into stretches of the same ground", () => {
  it("gives each stretch with its letter, where it starts and how long it is", () => {
    expect(rowRuns("##..,")).toEqual([
      { letter: "#", start: 0, length: 2 },
      { letter: ".", start: 2, length: 2 },
      { letter: ",", start: 4, length: 1 },
    ]);
    expect(rowRuns("....")).toEqual([{ letter: ".", start: 0, length: 4 }]);
    expect(rowRuns("")).toEqual([]);
  });

  it("covers every tile of every row of the real tracks exactly once", () => {
    for (const track of Object.values(TRACKS)) {
      for (const row of track.map) {
        const runs = rowRuns(row);
        expect(runs.reduce((sum, run) => sum + run.length, 0)).toBe(row.length);
        // Put the stretches back together: it must give the row again.
        expect(runs.map((run) => run.letter.repeat(run.length)).join("")).toBe(row);
      }
    }
  });
});

describe("the finish line on the small map", () => {
  it("is the road under the first checkpoint, without the grass beside it", () => {
    // On the test oval the finish line covers rows 1 to 5 of column 14, and row 5 is grass.
    expect(finishTiles(TRACKS["test-oval"])).toEqual([
      { column: 14, row: 1 },
      { column: 14, row: 2 },
      { column: 14, row: 3 },
      { column: 14, row: 4 },
    ]);
  });

  it("is never painted on a wall or on grass, on any track", () => {
    for (const track of Object.values(TRACKS)) {
      const tiles = finishTiles(track);
      expect(tiles.length).toBeGreaterThan(0);
      for (const { column, row } of tiles) {
        expect(track.map[row][column]).toBe(".");
      }
    }
  });
});

describe("painting the small map", () => {
  /** A pretend canvas. It writes down every rectangle and circle painted on it, with its colour. */
  function fakeCanvas() {
    const painted = { rectangles: [], circles: [] };
    const context = {
      fillStyle: "",
      fillRect(x, y, width, height) {
        painted.rectangles.push({ colour: this.fillStyle, x, y, width, height });
      },
      beginPath() {},
      arc(x, y, radius) {
        painted.circles.push({ colour: this.fillStyle, x, y, radius });
      },
      fill() {},
    };
    return { width: 0, height: 0, getContext: () => context, painted };
  }

  /** How many tiles of a track have this letter. */
  function countTiles(track, letter) {
    return track.map.join("").split(letter).length - 1;
  }

  /** The area painted in one colour, in pixels. */
  function areaOf(painted, colour) {
    return painted.rectangles
      .filter((rectangle) => rectangle.colour === colour)
      .reduce((sum, { width, height }) => sum + width * height, 0);
  }

  it("makes the canvas exactly as big as the picture", () => {
    for (const track of Object.values(TRACKS)) {
      const canvas = fakeCanvas();
      paintMiniMap(canvas, track);
      const { width, height } = mapPictureSize(track.columns, track.rows);
      expect(canvas.width).toBe(width);
      expect(canvas.height).toBe(height);
    }
  });

  it("paints all the road and all the grass, and nothing where there is a wall", () => {
    for (const track of Object.values(TRACKS)) {
      const canvas = fakeCanvas();
      paintMiniMap(canvas, track);
      const { tile } = mapPictureSize(track.columns, track.rows);
      expect(areaOf(canvas.painted, MAP_COLOURS["."])).toBe(countTiles(track, ".") * tile * tile);
      expect(areaOf(canvas.painted, MAP_COLOURS[","])).toBe(countTiles(track, ",") * tile * tile);

      // Every rectangle lies on tiles that are not wall.
      for (const { x, y, width } of canvas.painted.rectangles) {
        const row = track.map[y / tile];
        expect(row.slice(x / tile, (x + width) / tile)).not.toContain("#");
      }
    }
  });

  it("marks the start with one dot, at the place the karts start", () => {
    const track = TRACKS["test-oval"];
    const canvas = fakeCanvas();
    paintMiniMap(canvas, track);
    const { tile } = mapPictureSize(track.columns, track.rows);
    expect(canvas.painted.circles).toHaveLength(1);
    // The test oval starts in the middle of column 13, row 2: just behind the
    // finish line, which is column 14. (Until 12 November 2026 the start was
    // column 16, just after the line.)
    expect(canvas.painted.circles[0].x).toBe(13.5 * tile);
    expect(canvas.painted.circles[0].y).toBe(2.5 * tile);
  });
});
