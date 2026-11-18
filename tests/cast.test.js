// Tests for shared/cast.js (the characters a player can be) and
// client/cast-choice.js (remembering your character in the browser, its
// face, its colours, and what the online page says about it).

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { CAST, isCharacterId, characterById, firstFreeCharacter } from "../shared/cast.js";
import { isLookChoice } from "../shared/kart-looks.js";
import { COLOURS } from "../client/kart-choice.js";
import { readCharacter, saveCharacter, faceOf, lookOfCharacter, characterNote } from "../client/cast-choice.js";

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

const NOT_IDS = [null, undefined, "", "PCP", " pcp", "pcp ", "mario", "faces/pcp", "../pcp", 1, true, {}, ["pcp"], { id: "pcp" }];

/** The names of the three colours of a character, as the menu calls them. */
function colourNames(id) {
  const { look } = characterById(id);
  return [COLOURS.body[look.body].name, COLOURS.helmet[look.helmet].name, COLOURS.suit[look.suit].name];
}

describe("the cast", () => {
  it("has the six characters, in the order of the menu", () => {
    expect(CAST.map((character) => character.name)).toEqual([
      "Dean",
      "Professor Ricardo Pereira",
      "Ró Versos",
      "Cici Boss",
      "FranFon",
      "PCP",
    ]);
  });

  it("gives every character its own id, made of small letters only", () => {
    const ids = CAST.map((character) => character.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z]+$/);
    }
  });

  it("gives every character colours that a kart can have", () => {
    for (const character of CAST) {
      expect(isLookChoice(character.look), character.id).toBe(true);
    }
  });

  it("paints each character in the colours the team chose", () => {
    expect(colourNames("dean")).toEqual(["Black", "Green", "White"]); // the helmet was white until 18 November 2026: Catarina asked for a pop of green
    expect(colourNames("ricardo")).toEqual(["Orange", "Blue", "Navy"]);
    expect(colourNames("ro")).toEqual(["Pink", "Yellow", "Yellow"]);
    expect(colourNames("cici")).toEqual(["Blue", "Pink", "Navy"]);
    expect(colourNames("franfon")).toEqual(["Black", "Black", "Black"]);
    expect(colourNames("pcp")).toEqual(["Red", "Yellow", "Red"]);
  });

  it("has a face picture for every character, and no other faces", () => {
    for (const character of CAST) {
      expect(existsSync(new URL(`../client/${faceOf(character.id)}`, import.meta.url)), character.id).toBe(true);
    }
    // A face in the folder without a character would be a photo on the
    // internet that the game never uses.
    const files = readdirSync(new URL("../client/faces/", import.meta.url)).sort();
    expect(files).toEqual(CAST.map((character) => `${character.id}.jpg`).sort());
  });

  it("keeps every face picture small, so the menu opens quickly", () => {
    for (const character of CAST) {
      const bytes = readFileSync(new URL(`../client/${faceOf(character.id)}`, import.meta.url));
      expect(bytes.length, character.id).toBeLessThan(40_000);
      // A JPEG picture starts with these two bytes.
      expect([bytes[0], bytes[1]], character.id).toEqual([0xff, 0xd8]);
    }
  });

  it("cannot be changed while the game runs", () => {
    expect(Object.isFrozen(CAST)).toBe(true);
    expect(() => {
      CAST[0].look.body = 0;
    }).toThrow();
    expect(characterById("dean").look.body).toBe(9);
  });

  it("knows its ids, and only exactly those", () => {
    for (const character of CAST) {
      expect(isCharacterId(character.id)).toBe(true);
      expect(characterById(character.id)).toBe(character);
    }
    for (const notAnId of NOT_IDS) {
      expect(isCharacterId(notAnId), JSON.stringify(notAnId)).toBe(false);
      expect(characterById(notAnId), JSON.stringify(notAnId)).toBe(null);
    }
  });
});

describe("the first free character", () => {
  it("is the first in the list when nobody has one", () => {
    expect(firstFreeCharacter([]).id).toBe("dean");
  });

  it("skips the ones that are taken", () => {
    expect(firstFreeCharacter(["dean", "ricardo"]).id).toBe("ro");
    expect(firstFreeCharacter(["ro", "dean"]).id).toBe("ricardo");
  });

  it("is nobody when every character is taken", () => {
    expect(firstFreeCharacter(CAST.map((character) => character.id))).toBe(null);
  });
});

describe("remembering your character in the browser", () => {
  it("has no character before one is chosen", () => {
    expect(readCharacter(fakeStorage())).toBe(null);
  });

  it("gives back the character that was saved", () => {
    const storage = fakeStorage();
    expect(saveCharacter(storage, "cici")).toBe(true);
    expect(readCharacter(storage).name).toBe("Cici Boss");
    expect(saveCharacter(storage, "pcp")).toBe(true);
    expect(readCharacter(storage).name).toBe("PCP");
  });

  it("refuses to save a character that is not in the cast", () => {
    const storage = fakeStorage();
    for (const notAnId of NOT_IDS) {
      expect(() => saveCharacter(storage, notAnId), JSON.stringify(notAnId)).toThrow();
    }
    expect(storage.kept).toEqual({});
  });

  it("treats anything strange read back as no character", () => {
    for (const text of ["", "pcp", "{}", '{"id":"mario"}', '{"id":"PCP"}', '{"id":["pcp"]}', '["pcp"]', "{broken"]) {
      expect(readCharacter(fakeStorage({ character: text })), text).toBe(null);
    }
  });

  it("does not break when the browser keeps nothing", () => {
    expect(readCharacter(null)).toBe(null);
    expect(readCharacter(brokenStorage)).toBe(null);
    expect(saveCharacter(null, "dean")).toBe(false);
    expect(saveCharacter(brokenStorage, "dean")).toBe(false);
  });
});

describe("a character's face and colours", () => {
  it("finds the face picture by the character's id", () => {
    expect(faceOf("pcp")).toBe("faces/pcp.jpg");
  });

  it("gives no picture for anything that is not a character, so no other file can be asked for", () => {
    for (const notAnId of NOT_IDS) {
      expect(faceOf(notAnId), JSON.stringify(notAnId)).toBe(null);
    }
  });

  it("paints the kart in the character's colours", () => {
    expect(lookOfCharacter("pcp")).toMatchObject({ body: COLOURS.body[0].colour, helmet: COLOURS.helmet[2].colour, suit: COLOURS.suit[3].colour });
    expect(lookOfCharacter("mario")).toBe(null);
  });
});

describe("what the online page says about your character", () => {
  it("says nothing when you chose no character", () => {
    expect(characterNote(null, { id: 1, character: "dean" })).toBe(null);
    expect(characterNote("mario", { id: 1, character: "dean" })).toBe(null);
  });

  it("says nothing while your kart is not shown", () => {
    expect(characterNote("pcp", undefined)).toBe(null);
    expect(characterNote("pcp", null)).toBe(null);
  });

  it("says who you are when you got the character you chose", () => {
    expect(characterNote("pcp", { id: 1, character: "pcp" })).toBe("You are PCP.");
  });

  it("says so when someone else already had your character, and who you are instead", () => {
    expect(characterNote("pcp", { id: 2, character: "dean" })).toBe("Someone in this room is already PCP, so you are Dean.");
  });

  it("says so when every character was taken", () => {
    expect(characterNote("pcp", { id: 7 })).toMatch(/plain kart/);
  });
});
