// Tests for the big screen in the corner of the Hovione Atrium on the Nova
// lap, with its notice from the IT help desk (added on 18 November 2026).
//
// The screen is a picture that stands up (a "fence" in
// client/nova-lap-buildings.js) with words painted on it
// (client/wall-art.js). It slants across the corner, and the squares behind
// it are wall, so no kart drives through it. These tests check where it
// stands, that karts cannot get behind it, that it is not in the way of the
// lap, and what it says.

import { describe, it, expect } from "vitest";
import { NOVA_LAP_FENCES, NOVA_LAP_BLOCKS, NOVA_LAP_SOLID } from "../client/nova-lap-buildings.js";
import { NOVA_LAP_LOOK } from "../client/nova-lap-look.js";
import { WALL_ART } from "../client/wall-art.js";
import { createScenery } from "../client/scenery.js";
import { NOVA_LAP } from "../shared/tracks/nova-lap.js";

const screen = NOVA_LAP_FENCES.find((fence) => fence.name === "IT help desk screen");
const art = WALL_ART["it-screen"];

/** The inside of the atrium, in squares: [left, top, right, bottom] (nova-lap-ground.js). */
const ATRIUM = [54, 4, 76, 20];

/**
 * A pretend drawing surface that only remembers the words written on it.
 * Everything else a picture asks of it (rectangles, colours, lines) does
 * nothing. A letter counts as 0.6 of its font size wide.
 */
function wordsPaintedBy(recipe) {
  const words = [];
  let font = "10px sans-serif";
  const surface = new Proxy(
    {},
    {
      get(_, name) {
        if (name === "fillText") {
          return (text, x, y) => words.push({ text, x, y, size: Number.parseFloat(/([\d.]+)px/.exec(font)[1]) });
        }
        if (name === "measureText") {
          return (text) => ({ width: text.length * 0.6 * Number.parseFloat(/([\d.]+)px/.exec(font)[1]) });
        }
        if (name === "createLinearGradient" || name === "createRadialGradient") {
          return () => ({ addColorStop() {} });
        }
        if (name === "font") {
          return font;
        }
        return () => {};
      },
      set(_, name, value) {
        if (name === "font") {
          font = value;
        }
        return true;
      },
    },
  );
  recipe.paint(surface, recipe.length, recipe.height);
  return words;
}

describe("the big screen in the atrium: where it stands", () => {
  it("is there, with a picture of its own", () => {
    expect(screen).toBeDefined();
    expect(screen.art).toBe("it-screen");
    expect(art).toBeDefined();
  });

  it("stands inside the atrium, in its south-east corner: on the left of the doors to the terrace as you leave", () => {
    for (const [column, row] of [screen.from, screen.to]) {
      expect(column).toBeGreaterThan(ATRIUM[0]);
      expect(column).toBeLessThan(ATRIUM[2]);
      expect(row).toBeGreaterThan(ATRIUM[1]);
      expect(row).toBeLessThan(ATRIUM[3]);
      // In the quarter of the hall nearest that corner.
      expect(column).toBeGreaterThan((ATRIUM[0] + ATRIUM[2]) / 2);
      expect(row).toBeGreaterThan((ATRIUM[1] + ATRIUM[3]) / 2);
    }
    // East of the doors to the terrace, which are at columns 65 to 69.
    const doors = NOVA_LAP_BLOCKS.find((block) => block.name === "atrium, over the doors to the terrace");
    expect(Math.min(screen.from[0], screen.to[0])).toBeGreaterThan(doors.rect[2]);
  });

  it("slants across the corner, as far along one wall as along the other", () => {
    const across = Math.abs(screen.to[0] - screen.from[0]);
    const down = Math.abs(screen.to[1] - screen.from[1]);
    expect(across).toBeGreaterThan(2);
    expect(across).toBeCloseTo(down);
  });

  it("is read from the hall: its picture faces away from the corner", () => {
    // A fence is read from the side on which "from" is its left end. That
    // side is found the same way as in client/scenery.js.
    const length = Math.hypot(screen.to[0] - screen.from[0], screen.to[1] - screen.from[1]);
    const outward = [-(screen.to[1] - screen.from[1]) / length, (screen.to[0] - screen.from[0]) / length];
    expect(outward[0]).toBeLessThan(0); // towards the west
    expect(outward[1]).toBeLessThan(0); // and the north: the middle of the hall
  });

  it("stands on the floor and fits under the gallery, with its picture as long as it is", () => {
    expect(screen.base ?? 0).toBe(0);
    const gallery = NOVA_LAP_BLOCKS.find((block) => block.name === "gallery, south");
    expect(screen.top).toBeLessThan(gallery.base);
    expect(screen.top).toBeGreaterThan(3); // a BIG screen
    expect(art.height).toBe(screen.top);
    const metres = Math.hypot(screen.to[0] - screen.from[0], screen.to[1] - screen.from[1]) * 3; // a square is 3 metres
    expect(Math.abs(art.length - metres)).toBeLessThan(0.1);
    expect(art.fits).toBe(true);
    expect(art.inside).toBe(true); // it gives its own light: never darkened as a wall in the shade
  });

  it("is accepted by the scenery, and cut into strips like every other fence", () => {
    const scenery = createScenery(NOVA_LAP, NOVA_LAP_LOOK.scenery);
    const strips = scenery.strips.filter((strip) => strip.art === "it-screen");
    expect(strips.length).toBeGreaterThan(3);
    expect(strips.every((strip) => strip.bothSides)).toBe(true);
  });
});

describe("the big screen in the atrium: what karts can NOT do", () => {
  const letter = (column, row) => NOVA_LAP.map[row][column];
  /** Which side of the screen's line a point is on: above zero is behind it, in the corner. */
  const behind = (column, row) => column + row - (screen.from[0] + screen.from[1]);

  it("cannot drive behind it: every square whose middle is behind the screen is wall", () => {
    let checked = 0;
    for (let row = 16; row < ATRIUM[3]; row++) {
      for (let column = 72; column < ATRIUM[2]; column++) {
        if (behind(column + 0.5, row + 0.5) > 0) {
          checked++;
          expect(letter(column, row), `column ${column}, row ${row}`).toBe("#");
        }
      }
    }
    expect(checked).toBe(6);
  });

  it("can still drive up to it: the squares in front of it are floor", () => {
    for (const [column, row] of [[72, 18], [73, 17], [74, 16], [72, 16], [71, 18]]) {
      expect(behind(column + 0.5, row + 0.5)).toBeLessThan(0);
      expect(letter(column, row), `column ${column}, row ${row}`).not.toBe("#");
    }
  });

  it("makes wall of the corner behind it only: three steps of squares, nothing more", () => {
    const corner = NOVA_LAP_SOLID.filter(([left, top, right, bottom]) => left >= 73 && top >= 17 && right <= 76 && bottom <= 20);
    const squares = new Set();
    for (const [left, top, right, bottom] of corner) {
      for (let row = top; row < bottom; row++) {
        for (let column = left; column < right; column++) {
          squares.add(`${column} ${row}`);
        }
      }
    }
    expect([...squares].sort()).toEqual(["73 19", "74 18", "74 19", "75 17", "75 18", "75 19"]);
  });

  it("is not in the way of the lap: the way round stays far from it", () => {
    const middle = [(screen.from[0] + screen.to[0]) / 2, (screen.from[1] + screen.to[1]) / 2];
    for (const [column, row] of NOVA_LAP_LOOK.route) {
      expect(Math.hypot(column - middle[0], row - middle[1]), `route point ${column}, ${row}`).toBeGreaterThan(6);
    }
  });
});

describe("the big screen in the atrium: what it says", () => {
  const words = wordsPaintedBy(art);
  const texts = words.map((word) => word.text);

  it("is a notice from the IT help desk", () => {
    expect(texts).toContain("IT HELP DESK");
    expect(texts.some((text) => /IT Help Desk team/.test(text))).toBe(true);
  });

  it("regrets to inform you that, unfortunately, Moodle is down", () => {
    expect(texts).toContain("We regret to inform you that, unfortunately,");
    expect(texts).toContain("MOODLE IS DOWN.");
  });

  it("writes the news biggest, so it can be read from a kart", () => {
    const news = words.find((word) => word.text === "MOODLE IS DOWN.");
    for (const word of words) {
      expect(word.size, word.text).toBeLessThanOrEqual(news.size);
    }
    expect(news.size / 1.38).toBeGreaterThan(0.6); // capital letters more than 60 centimetres tall
  });

  it("keeps every line on the screen: none starts or ends outside the picture", () => {
    for (const word of words) {
      const width = word.text.length * 0.6 * word.size;
      expect(word.y, word.text).toBeGreaterThan(0);
      expect(word.y, word.text).toBeLessThan(art.height - 0.5); // above the foot of the cabinet
      expect(word.x, word.text).toBeGreaterThan(0);
      expect(word.x, word.text).toBeLessThan(art.length);
      expect(width, word.text).toBeLessThan(art.length);
    }
  });

  it("makes a line smaller rather than letting it run off the screen, whatever the font", () => {
    // With letters twice as wide as usual, the long lines would not fit at
    // their normal size: they must come out smaller, not cut off.
    const wide = [];
    let font = "";
    const surface = new Proxy(
      {},
      {
        get(_, name) {
          if (name === "fillText") {
            return (text) => wide.push({ text, size: Number.parseFloat(/([\d.]+)px/.exec(font)[1]) });
          }
          if (name === "measureText") {
            return (text) => ({ width: text.length * 1.2 * Number.parseFloat(/([\d.]+)px/.exec(font)[1]) });
          }
          if (name === "createLinearGradient") {
            return () => ({ addColorStop() {} });
          }
          return name === "font" ? font : () => {};
        },
        set(_, name, value) {
          if (name === "font") {
            font = value;
          }
          return true;
        },
      },
    );
    art.paint(surface, art.length, art.height);
    const news = wide.find((word) => word.text === "MOODLE IS DOWN.");
    expect(news.text.length * 1.2 * news.size).toBeLessThanOrEqual(art.length);
    expect(news.size).toBeLessThan(words.find((word) => word.text === "MOODLE IS DOWN.").size);
  });
});
