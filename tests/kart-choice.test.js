// Tests for shared/kart-looks.js (which choices of kart colours are allowed)
// and client/kart-choice.js (the colours themselves, and remembering the
// choice in the browser).
//
// A choice travels: from the menu into the browser's storage, and from the
// browser to the server and on to other players. At each of those steps
// someone could have changed it, so each step checks it again. Most of
// these tests are about choices that must be refused.

import { describe, it, expect } from "vitest";
import { LOOK_PARTS, isLookChoice, cleanLookChoice } from "../shared/kart-looks.js";
import { COLOURS, PARTS, PART_NAMES, FIRST_CHOICE, lookFromChoice, readChoice, saveChoice } from "../client/kart-choice.js";
import { isLook, lookOf, LOOKS } from "../client/kart-shape.js";

/** A pretend browser storage that keeps texts in memory. */
function fakeStorage(start = {}) {
  const kept = { ...start };
  return {
    getItem: (key) => (key in kept ? kept[key] : null),
    setItem: (key, value) => {
      kept[key] = String(value);
    },
    kept,
  };
}

const brokenStorage = {
  getItem() {
    throw new Error("storage is switched off");
  },
  setItem() {
    throw new Error("storage is switched off");
  },
};

const NOT_ALLOWED = [
  null,
  undefined,
  "red",
  7,
  [0, 0, 0],
  {},
  { body: 0, helmet: 0 }, //                              a part is missing
  { body: -1, helmet: 0, suit: 0 },
  { body: LOOK_PARTS.body, helmet: 0, suit: 0 }, //       one past the last colour
  { body: 0, helmet: 0, suit: LOOK_PARTS.suit },
  { body: 0.5, helmet: 0, suit: 0 },
  { body: "0", helmet: 0, suit: 0 }, //                   a text, not a number
  { body: NaN, helmet: 0, suit: 0 },
  { body: Infinity, helmet: 0, suit: 0 },
  { body: "#e23d3d", helmet: "#ffffff", suit: "#000000" }, // colours instead of numbers
  { body: { valueOf: () => 1 }, helmet: 0, suit: 0 },
];

describe("which choices of kart are allowed", () => {
  it("allows a whole number for each part, from the first colour to the last", () => {
    expect(isLookChoice({ body: 0, helmet: 0, suit: 0 })).toBe(true);
    expect(isLookChoice({ body: LOOK_PARTS.body - 1, helmet: LOOK_PARTS.helmet - 1, suit: LOOK_PARTS.suit - 1 })).toBe(true);
  });

  it("refuses everything else", () => {
    for (const choice of NOT_ALLOWED) {
      expect(isLookChoice(choice), JSON.stringify(choice)).toBe(false);
      expect(cleanLookChoice(choice), JSON.stringify(choice)).toBe(null);
    }
  });

  it("gives back a fresh copy with only the three numbers, dropping anything that came along", () => {
    const sent = { body: 2, helmet: 3, suit: 1, name: "<b>Ana</b>", look: { body: "#000000" }, admin: true };
    const clean = cleanLookChoice(sent);
    expect(clean).toEqual({ body: 2, helmet: 3, suit: 1 });
    expect(clean).not.toBe(sent);
  });

  it("is not fooled by numbers that only an object's family has", () => {
    const sneaky = Object.create({ body: 1, helmet: 1, suit: 1 }); // the numbers are inherited, not its own
    expect(cleanLookChoice(sneaky)).toEqual({ body: 1, helmet: 1, suit: 1 }); // still only numbers in range come out
    expect(Object.keys(cleanLookChoice(sneaky))).toEqual(["body", "helmet", "suit"]);
  });
});

describe("the colours to choose from", () => {
  it("has exactly as many colours for each part as the rule says", () => {
    expect(PARTS).toEqual(["body", "helmet", "suit"]);
    for (const part of PARTS) {
      expect(COLOURS[part], part).toHaveLength(LOOK_PARTS[part]);
      expect(PART_NAMES[part]).toMatch(/^[A-Z][a-z]+$/);
    }
  });

  it("gives every colour a name to read out and a colour the canvas can use, with no two the same in a list", () => {
    for (const part of PARTS) {
      for (const { name, colour } of COLOURS[part]) {
        expect(name).toMatch(/^[A-Z][a-z]+$/);
        expect(colour).toMatch(/^#[0-9a-f]{6}$/);
      }
      expect(new Set(COLOURS[part].map((each) => each.colour)).size).toBe(COLOURS[part].length);
      expect(new Set(COLOURS[part].map((each) => each.name)).size).toBe(COLOURS[part].length);
    }
  });
});

describe("turning a choice into a look", () => {
  it("makes a look the painter accepts, for every possible choice", () => {
    for (let body = 0; body < LOOK_PARTS.body; body++) {
      for (let helmet = 0; helmet < LOOK_PARTS.helmet; helmet++) {
        for (let suit = 0; suit < LOOK_PARTS.suit; suit++) {
          const look = lookFromChoice({ body, helmet, suit });
          expect(isLook(look), `${body},${helmet},${suit}`).toBe(true);
          expect(look.body).toBe(COLOURS.body[body].colour);
          expect(look.helmet).toBe(COLOURS.helmet[helmet].colour);
          expect(look.suit).toBe(COLOURS.suit[suit].colour);
        }
      }
    }
  });

  it("always gives the trim and the helmet stripe a colour that stands out", () => {
    for (let body = 0; body < LOOK_PARTS.body; body++) {
      for (let helmet = 0; helmet < LOOK_PARTS.helmet; helmet++) {
        const look = lookFromChoice({ body, helmet, suit: 0 });
        expect(look.trim).not.toBe(look.body);
        expect(look.stripe).not.toBe(look.helmet);
      }
    }
    // Pale trim on a dark kart, dark trim on a pale one.
    const white = COLOURS.body.findIndex((each) => each.name === "White");
    const black = COLOURS.body.findIndex((each) => each.name === "Black");
    expect(lookFromChoice({ body: white, helmet: 0, suit: 0 }).trim).toBe("#1d2733");
    expect(lookFromChoice({ body: black, helmet: 0, suit: 0 }).trim).toBe("#f4f6f8");
  });

  it("gives no look for a choice that is not allowed", () => {
    for (const choice of NOT_ALLOWED) {
      expect(lookFromChoice(choice), JSON.stringify(choice)).toBe(null);
    }
  });

  it("gives a kart that carries a chosen look that look, and a kart without one the look of its place", () => {
    const chosen = lookFromChoice({ body: 6, helmet: 2, suit: 1 });
    expect(lookOf({ place: 3, look: chosen })).toBe(chosen);
    expect(lookOf({ place: 3, look: lookFromChoice(null) })).toBe(LOOKS[3]);
  });
});

describe("remembering the choice in the browser", () => {
  it("has none for a player who never chose", () => {
    expect(readChoice(fakeStorage())).toBe(null);
  });

  it("remembers a choice", () => {
    const storage = fakeStorage();
    expect(saveChoice(storage, { body: 6, helmet: 2, suit: 1 })).toBe(true);
    expect(readChoice(storage)).toEqual({ body: 6, helmet: 2, suit: 1 });
  });

  it("refuses to save a choice that is not allowed, and keeps the old one", () => {
    const storage = fakeStorage();
    saveChoice(storage, FIRST_CHOICE);
    for (const choice of NOT_ALLOWED) {
      expect(() => saveChoice(storage, choice), JSON.stringify(choice)).toThrow(/not a kart/);
    }
    expect(readChoice(storage)).toEqual({ ...FIRST_CHOICE });
  });

  it("ignores saved text that was changed by hand into something that is not a choice", () => {
    const changed = ["", "not json", "null", "[1,2,3]", '{"body":99,"helmet":0,"suit":0}', '{"body":"0","helmet":0,"suit":0}', '{"body":1}'];
    for (const text of changed) {
      expect(readChoice(fakeStorage({ "kart-look": text })), text).toBe(null);
    }
  });

  it("drops anything extra that was added to the saved choice by hand", () => {
    const storage = fakeStorage({ "kart-look": '{"body":1,"helmet":2,"suit":3,"speed":999}' });
    expect(readChoice(storage)).toEqual({ body: 1, helmet: 2, suit: 3 });
  });

  it("does not break in a browser that refuses storage, or has none", () => {
    expect(readChoice(null)).toBe(null);
    expect(readChoice(brokenStorage)).toBe(null);
    expect(saveChoice(null, FIRST_CHOICE)).toBe(false);
    expect(saveChoice(brokenStorage, FIRST_CHOICE)).toBe(false);
  });

  it("starts a first-time player on a choice that is allowed", () => {
    expect(isLookChoice(FIRST_CHOICE)).toBe(true);
  });
});
