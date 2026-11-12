// Your own kart: the colours a player can choose, and remembering the choice.
//
// A choice is three numbers, one for each part: which kart colour, which
// helmet colour, which suit colour (the rule is in shared/kart-looks.js).
// This file has the lists of colours those numbers stand for, turns a
// choice into a "look" that kart-shape.js can paint, and keeps the choice
// in this browser (storage.js), so it is still there on the next visit.
//
// A player who never chose anything has no choice saved. Their kart then
// gets the look of its starting place, as before.

import { LOOK_PARTS, isLookChoice, cleanLookChoice } from "../shared/kart-looks.js";
import { readSaved, writeSaved } from "./storage.js";

const STORAGE_KEY = "kart-look";

const PAINT = [
  { name: "Red", colour: "#e23d3d" },
  { name: "Blue", colour: "#2f7fe0" },
  { name: "Yellow", colour: "#f0c330" },
  { name: "Green", colour: "#3fb563" },
  { name: "Purple", colour: "#9a55d6" },
  { name: "Orange", colour: "#ef8a2b" },
  { name: "Teal", colour: "#2fc4c4" },
  { name: "Pink", colour: "#e667a8" },
  { name: "White", colour: "#eef1f4" },
  { name: "Black", colour: "#2b3138" },
];

/** The colours to choose from, for each part, in the order of their numbers. */
export const COLOURS = Object.freeze({
  body: PAINT,
  helmet: PAINT,
  suit: [
    { name: "White", colour: "#f4f6f8" },
    { name: "Navy", colour: "#1c2f5a" },
    { name: "Black", colour: "#1d2733" },
    { name: "Red", colour: "#c8372f" },
    { name: "Green", colour: "#2f8f4e" },
    { name: "Yellow", colour: "#e9bd2c" },
  ],
});

/** What each part is called on the page. */
export const PART_NAMES = Object.freeze({ body: "Kart", helmet: "Helmet", suit: "Suit" });

const PALE = "#f4f6f8";
const DARK = "#1d2733";

/** Is this colour light enough that white on it would be hard to see? */
function isLight(colour) {
  const part = (start) => parseInt(colour.slice(start, start + 2), 16);
  // How bright the eye finds it: green counts most, blue least.
  return part(1) * 0.299 + part(3) * 0.587 + part(5) * 0.114 > 165;
}

/**
 * The look for a choice: the three chosen colours, and two more that are
 * worked out so that they can always be seen. The trim (the front wing and
 * the number plate) is pale on a dark kart and dark on a pale one. The
 * stripe on the helmet takes the kart's colour, unless the helmet already
 * has that colour.
 * Gives null for a choice that is not allowed.
 */
export function lookFromChoice(choice) {
  if (!isLookChoice(choice)) {
    return null;
  }
  const body = COLOURS.body[choice.body].colour;
  const helmet = COLOURS.helmet[choice.helmet].colour;
  const suit = COLOURS.suit[choice.suit].colour;
  return {
    body,
    helmet,
    suit,
    trim: isLight(body) ? DARK : PALE,
    stripe: body !== helmet ? body : isLight(helmet) ? DARK : PALE,
  };
}

/** The choice saved in this browser, or null if there is none or it is not one that is allowed. */
export function readChoice(storage) {
  return cleanLookChoice(readSaved(storage, STORAGE_KEY));
}

/**
 * Remembers a choice. Refuses one that is not allowed. Gives true if it
 * was saved, false if the browser refused.
 */
export function saveChoice(storage, choice) {
  const clean = cleanLookChoice(choice);
  if (clean === null) {
    throw new Error("That is not a kart anyone can choose.");
  }
  return writeSaved(storage, STORAGE_KEY, clean);
}

/** A choice to begin with, for a player who opens the panel for the first time: the red kart. */
export const FIRST_CHOICE = Object.freeze({ body: 0, helmet: 0, suit: 0 });

/** The parts, in the order they are shown, each with how many colours it has. */
export const PARTS = Object.freeze(Object.keys(LOOK_PARTS));
