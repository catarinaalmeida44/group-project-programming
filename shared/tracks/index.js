// The list of all tracks, each with a short name that can go in a web address
// (for example race.html?track=campus-loop).
//
// A new track is added here, so that the pages that choose a track find it.

import { TEST_OVAL } from "./test-oval.js";
import { CAMPUS_LOOP } from "./campus-loop.js";
import { CAMPUS_LOOP_STOREYS } from "./campus-loop-storeys.js";

export const TRACKS = Object.freeze({
  "test-oval": TEST_OVAL,
  "campus-loop": CAMPUS_LOOP,
});

/** The track used when none is chosen, or when the chosen one does not exist. */
export const DEFAULT_TRACK = "test-oval";

// How tall the buildings of each track are, for the picture only. A track
// that is not listed here has flat walls.
const STOREYS = Object.freeze({
  "campus-loop": CAMPUS_LOOP_STOREYS,
});

/** The storeys of a track from the list above, or null if its walls are flat. */
export function storeysOf(track) {
  for (const [shortName, listed] of Object.entries(TRACKS)) {
    if (listed === track && Object.hasOwn(STOREYS, shortName)) {
      return STOREYS[shortName];
    }
  }
  return null;
}
