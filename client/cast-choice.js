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

/** Where the picture of a character's face is, or null for an id that is not in the cast. */
export function faceOf(id) {
  return characterById(id) === null ? null : `faces/${id}.jpg`;
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
