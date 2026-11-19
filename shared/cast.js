// The cast: the characters a player can be.
//
// Each character is a real person who said yes to being in the game (see
// docs/diary/pedro.md, 17 November 2026). A character has:
//   id     a short name used inside the code and in messages, such as "pcp".
//          Only small letters, so it is safe to put in a file name.
//   name   the name shown on the page
//   look   the colours of the kart, the helmet and the suit, as the three
//          numbers of shared/kart-looks.js. The colours those numbers stand
//          for are listed in client/kart-choice.js. The names in the
//          comments below are those colours.
//
// The face of each character is the picture client/faces/<id>.jpg. Faces
// are shown when choosing a character, never in the race itself: in the
// race the driver wears a helmet.
//
// A character changes only how a kart looks. Every character drives the
// same way (shared/characters.js has the one driver everybody uses).
//
// Online, a character can belong to only one player in a room at a time
// (server/room.js checks that). This list is shared, so the browser and the
// server agree on which characters exist.

import { isLookChoice } from "./kart-looks.js";

export const CAST = Object.freeze(
  [
    //                                                kart     helmet   suit
    { id: "dean", name: "Dean", look: { body: 9, helmet: 3, suit: 0 } }, //  black, green, white (the helmet was white until 18 November 2026: Catarina asked for a pop of green)
    { id: "ricardo", name: "Professor Ricardo Pereira", look: { body: 5, helmet: 1, suit: 1 } }, // orange, blue, navy
    { id: "ro", name: "Ró Versos", look: { body: 7, helmet: 2, suit: 5 } }, //  pink, yellow, yellow
    { id: "cici", name: "Cici Boss", look: { body: 1, helmet: 7, suit: 1 } }, // blue, pink, navy
    { id: "franfon", name: "FranFon", look: { body: 3, helmet: 2, suit: 4 } }, // green, yellow, green (all black until 19 November 2026: Francisco asked for green with a yellow helmet)
    { id: "pcp", name: "PCP", look: { body: 0, helmet: 2, suit: 3 } }, //  red, yellow, red (like a Ferrari)
  ].map((character) => Object.freeze({ ...character, look: Object.freeze(character.look) })),
);

/** Is this the id of a character in the cast? Only an exact id counts: "PCP" or " pcp" do not. */
export function isCharacterId(id) {
  return typeof id === "string" && CAST.some((character) => character.id === id);
}

/** The character with this id, or null if there is none. */
export function characterById(id) {
  return isCharacterId(id) ? CAST.find((character) => character.id === id) : null;
}

/**
 * The first character in the cast whose id is not in "taken", or null if
 * every one is taken.
 */
export function firstFreeCharacter(taken) {
  const takenIds = new Set(taken);
  return CAST.find((character) => !takenIds.has(character.id)) ?? null;
}

// A mistake in the list above stops the game at once, instead of showing a
// kart in colours that do not exist.
for (const character of CAST) {
  if (!/^[a-z]+$/.test(character.id) || !isLookChoice(character.look)) {
    throw new Error(`shared/cast.js: the character "${character.id}" is not written correctly`);
  }
}
