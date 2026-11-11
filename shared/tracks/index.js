// The list of all tracks, each with a short name that can go in a web address
// (for example race.html?track=campus-loop).
//
// A new track is added here, so that the pages that choose a track find it.

import { TEST_OVAL } from "./test-oval.js";
import { CAMPUS_LOOP } from "./campus-loop.js";

export const TRACKS = Object.freeze({
  "test-oval": TEST_OVAL,
  "campus-loop": CAMPUS_LOOP,
});

/** The track used when none is chosen, or when the chosen one does not exist. */
export const DEFAULT_TRACK = "test-oval";
