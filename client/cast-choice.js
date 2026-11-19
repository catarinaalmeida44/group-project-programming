// Your character: which one you chose, its face, its colours, and what to
// tell you online when someone else already has it.
//
// The list of characters is in shared/cast.js. This file connects it to the
// browser: it remembers your choice in this browser's storage (storage.js),
// so it is still there on the next visit, and turns a character into the
// "look" that kart-shape.js paints.
//
// The choice is saved as { id: "pcp" }. Anything else read back, such as an
// id that is not in the cast, counts as "no choice".

import { characterById } from "../shared/cast.js";
import { lookFromChoice } from "./kart-choice.js";
import { readSaved, writeSaved } from "./storage.js";

const STORAGE_KEY = "character";

/** The character saved in this browser, or null if there is none or it is not one in the cast. */
export function readCharacter(storage) {
  return characterById(readSaved(storage, STORAGE_KEY)?.id);
}

/**
 * Remembers a character. Refuses an id that is not in the cast. Gives true
 * if it was saved, false if the browser refused.
 */
export function saveCharacter(storage, id) {
  if (characterById(id) === null) {
    throw new Error("That is not a character anyone can choose.");
  }
  return writeSaved(storage, STORAGE_KEY, { id });
}

// ---- The second driver of a two-player race ----
// Two people on one computer each choose a character. The first one is the
// character above. The second is remembered next to it, under its own name.

const SECOND_STORAGE_KEY = "character-2";

/** The second driver's character saved in this browser, or null if there is none or it is not one in the cast. */
export function readSecondCharacter(storage) {
  return characterById(readSaved(storage, SECOND_STORAGE_KEY)?.id);
}

/** Remembers the second driver's character. Refuses an id that is not in the cast. Gives true if it was saved. */
export function saveSecondCharacter(storage, id) {
  if (characterById(id) === null) {
    throw new Error("That is not a character anyone can choose.");
  }
  return writeSaved(storage, SECOND_STORAGE_KEY, { id });
}

/**
 * The first character of the list that is not "taken": what a driver gets
 * when the one they wanted is already the other driver's. "cast" is the list
 * of characters (shared/cast.js).
 */
export function firstOther(cast, taken) {
  return cast.find((character) => character.id !== taken) ?? null;
}

/**
 * The characters of the two drivers of a two-player race, as two ids that
 * are never the same: what each chose in the menu, or, where nothing usable
 * was chosen, the first character that is still free. The page uses it so
 * that a race can always start, even when the address was opened directly.
 */
export function twoCharacters(storage, cast) {
  const first = readCharacter(storage)?.id ?? cast[0].id;
  const wanted = readSecondCharacter(storage)?.id ?? null;
  const second = wanted !== null && wanted !== first ? wanted : firstOther(cast, first).id;
  return [first, second];
}

/** Where the picture of a character's face is, or null for an id that is not in the cast. */
export function faceOf(id) {
  return characterById(id) === null ? null : `faces/${id}.jpg`;
}

/**
 * The colour of each character's hair, for the head round the face when a
 * character is shown standing (pilot-shape.js). Taken by eye from the photos.
 */
const HAIR = Object.freeze({
  dean: "#2b2420",
  ricardo: "#2a221d",
  ro: "#2e231c",
  cici: "#e3dccb",
  franfon: "#2a201a",
  pcp: "#2b2019",
});

/** The colour of a character's hair, or null for an id that is not in the cast. */
export function hairOf(id) {
  return characterById(id) === null ? null : HAIR[id];
}

/**
 * The characters with long hair. The other head pictures end at the chin.
 * Theirs goes on below it, with the hair that hangs over the shoulders:
 * "below" says how much of the picture is below the chin, as a share of the
 * head (from the top of the hair to the chin). kart-paint.js paints the
 * head as big as everybody else's and lets the rest hang down.
 * Cici Boss: her head was first cut as an oval from a photo that ended
 * under her lip, and looked like an egg. On 18 November 2026 she sent the
 * whole photo, and her head was cut again from it, hair and chin included.
 */
const LONG_HAIR = Object.freeze({
  cici: Object.freeze({ below: 0.497 }),
});

/** How far a character's head picture goes on below the chin ({ below }), or null for short hair or an id that is not in the cast. */
export function longHairOf(id) {
  return characterById(id) === null ? null : (LONG_HAIR[id] ?? null);
}

/**
 * Where the picture of a character's head is: the head cut out of the photo,
 * with the background made see-through. Painted on the standing pilot
 * (pilot-shape.js). Null for an id that is not in the cast.
 */
export function headOf(id) {
  return characterById(id) === null ? null : `heads/${id}.png`;
}

/** Each character's own dance (the dances are in pilot-shape.js). */
const DANCE = Object.freeze({
  dean: "floss", //     "clap" until 18 November 2026
  ricardo: "dab", //    "robot" until 18 November 2026
  ro: "griddy", //      "drive" until 18 November 2026: he asked for this one
  cici: "gangnam", //   "wave" until 18 November 2026: she asked for this one
  franfon: "golf", // "plane" until 19 November 2026: he asked for a golf swing
  pcp: "siu",
});

/** A character's own dance, or null for an id that is not in the cast. */
export function danceOf(id) {
  return characterById(id) === null ? null : DANCE[id];
}

/** What each dance is called on the page ("Signature move" in "Choose your character"). */
const DANCE_NAMES = Object.freeze({
  clap: "The big clap",
  robot: "The robot",
  drive: "Hands on the wheel",
  wave: "The wave",
  plane: "The aeroplane",
  siu: "The siu",
  gangnam: "Gangnam style",
  griddy: "The griddy",
  floss: "The floss",
  dab: "The dab",
  golf: "The hole in one",
});

/** The name of a character's dance, to show on the page, or null for an id that is not in the cast. */
export function danceNameOf(id) {
  return characterById(id) === null ? null : DANCE_NAMES[DANCE[id]];
}

/** The colours of a character's kart, ready to paint, or null for an id that is not in the cast. */
export function lookOfCharacter(id) {
  const character = characterById(id);
  return character === null ? null : lookFromChoice(character.look);
}

/**
 * The sentence the online page shows about your character, once the server
 * has said which one you have.
 *   wantedId  the character you chose in the menu, or null
 *   mine      your kart, as the server sent it, or undefined while you have
 *             no kart on the track (for example while you are watching)
 * Gives null when there is nothing to say: you chose no character, or the
 * server has not shown your kart yet.
 */
export function characterNote(wantedId, mine) {
  const wanted = characterById(wantedId);
  if (wanted === null || mine === undefined || mine === null) {
    return null;
  }
  const got = characterById(mine.character);
  if (got !== null && got.id === wanted.id) {
    return `You are ${wanted.name}.`;
  }
  if (got !== null) {
    return `Someone in this room is already ${wanted.name}, so you are ${got.name}.`;
  }
  return `Someone in this room is already ${wanted.name}, and every other character is taken too, so you drive a plain kart.`;
}
