// The time of day of a race: morning, afternoon, sunset or night.
//
// The player chooses it in Settings, and this browser remembers it
// (storage.js). Every track looks as it always did in the afternoon; the
// other times change its look (track-looks.js) before the painter is made:
//   the sky      its colours, where the sun stands and how high, the colour
//                of its glow; at night a moon and stars
//   the haze     the colour far things fade into
//   the horizon  the hills, the sea and the beach take on the light
//   the light    a colour laid over the ground, the buildings and the karts
//                (draw.js): warm at sunset, dark blue at night
//   shadows      long at sunset, short at night (where a track has its own sun)
// It is only a picture: no rule, lap or time changes, and every player in a
// race may see a different time of day.
//
// Only colours and sums, so it is tested (tests/time-of-day.test.js).

import { readSaved, writeSaved } from "./storage.js";

/** The times of day, in the order Settings shows them. */
export const TIMES = Object.freeze(["morning", "afternoon", "sunset", "night"]);

/** The time of day when none was chosen: the game as it always looked. */
export const DEFAULT_TIME = "afternoon";

/** The words for each time in Settings. */
export const TIME_WORDS = Object.freeze({ morning: "Morning", afternoon: "Afternoon", sunset: "Sunset", night: "Night" });

/** The end of the sentence "Races will be ..." for each time. */
export const TIME_SENTENCE = Object.freeze({
  morning: "in the morning",
  afternoon: "in the afternoon",
  sunset: "at sunset",
  night: "at night",
});

// Directions on the map are angles: 0 is east, a quarter turn (1.57) south,
// half a turn (3.14) west. Carcavelos faces the sea to the south, so the sun
// rises over Lisbon in the east and sets over the sea in the west.
const EAST_SOUTH_EAST = 0.35;
const WEST_SOUTH_WEST = 2.85;

/** How each time of day differs from the afternoon. */
export const TIME_LOOKS = Object.freeze({
  morning: Object.freeze({
    sky: { top: "#3f8ad9", low: "#f6e6cf", sunTowards: EAST_SOUTH_EAST, sunHeight: 0.3, glow: "255, 238, 205", cloud: "rgba(255, 246, 236, 0.88)" },
    haze: "#efe6d8",
    horizonTint: { colour: "#f3d9b8", amount: 0.15 },
    light: { colour: "rgb(255, 205, 160)", alpha: 0.08 },
    shadows: 1.7,
  }),
  sunset: Object.freeze({
    sky: { top: "#344a97", low: "#ffae66", sunTowards: WEST_SOUTH_WEST, sunHeight: 0.07, glow: "255, 165, 85", cloud: "rgba(255, 170, 150, 0.85)" },
    haze: "#f2b384",
    horizonTint: { colour: "#ff9a5a", amount: 0.3 },
    light: { colour: "rgb(255, 120, 45)", alpha: 0.17 },
    shadows: 3,
  }),
  night: Object.freeze({
    sky: { top: "#04071a", low: "#1b2a58", sunTowards: 1.9, sunHeight: 0.62, glow: "205, 220, 255", moon: true, stars: true, clouds: 2, cloud: "rgba(60, 72, 110, 0.7)" },
    haze: "#1b2a58",
    horizonTint: { colour: "#0e1838", amount: 0.6 },
    light: { colour: "rgb(8, 16, 52)", alpha: 0.55 },
    shadows: 0.5,
  }),
});

const STORAGE_KEY = "kart-time-of-day";

/** Is this one of the times of day? Only the exact words. */
export function isTimeOfDay(time) {
  return typeof time === "string" && TIMES.includes(time);
}

/** The time of day this browser remembers, or the afternoon if none (or something that is not a time) was saved. */
export function readTimeOfDay(storage) {
  const saved = readSaved(storage, STORAGE_KEY)?.time;
  return isTimeOfDay(saved) ? saved : DEFAULT_TIME;
}

/** Remembers a time of day. Refuses anything that is not one. Gives true if it was saved, false if the browser refused. */
export function saveTimeOfDay(storage, time) {
  if (!isTimeOfDay(time)) {
    throw new Error(`There is no time of day called "${time}". The times are: ${TIMES.join(", ")}.`);
  }
  return writeSaved(storage, STORAGE_KEY, { time });
}

/**
 * A colour written as "#rrggbb", mixed with another: amount 0 gives the
 * first colour, 1 the second. A colour written any other way (with a name,
 * or "rgba(...)") is given back as it is.
 */
export function mixColours(colour, towards, amount) {
  const parse = (hex) => (/^#[0-9a-f]{6}$/i.test(hex) ? [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)) : null);
  const from = parse(colour);
  const to = parse(towards);
  if (from === null || to === null) {
    return colour;
  }
  const share = Math.min(Math.max(amount, 0), 1);
  return `#${from.map((value, index) => Math.round(value + (to[index] - value) * share).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * A track's look at a time of day. The afternoon gives the look back
 * unchanged. Nothing given is changed: a new look is made.
 */
export function lookAtTime(look, time) {
  if (!isTimeOfDay(time)) {
    throw new Error(`There is no time of day called "${time}".`);
  }
  const change = TIME_LOOKS[time];
  if (change === undefined) {
    return look; // the afternoon
  }
  const tint = (colour) => mixColours(colour, change.horizonTint.colour, change.horizonTint.amount);
  const changed = {
    ...look,
    sky: { ...look.sky, ...change.sky, clouds: change.sky.clouds ?? look.sky.clouds },
    haze: change.haze,
    beyond: tint(look.beyond),
    far: (look.far ?? []).map((band) => ({ ...band, colour: tint(band.colour), ...(band.roof ? { roof: tint(band.roof) } : {}) })),
    light: change.light,
  };
  if (look.shore) {
    changed.shore = { ...look.shore, bands: look.shore.bands.map((band) => ({ ...band, colour: tint(band.colour) })) };
  }
  if (look.sun?.reach) {
    // Shadows fall away from where the sun (or the moon) now stands, longer
    // or shorter than in the afternoon.
    const length = Math.hypot(look.sun.reach.x, look.sun.reach.y) * change.shadows;
    const away = changed.sky.sunTowards + Math.PI;
    changed.sun = { ...look.sun, reach: { x: Math.cos(away) * length, y: Math.sin(away) * length } };
  }
  return changed;
}
