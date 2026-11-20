// The list of all tracks, each with a short name that can go in a web address
// (for example race.html?track=nova-lap).
//
// A new track is added here, so that the pages that choose a track find it.
//
// There are two: the Nova lap, which is the track of the game, and the test
// oval, a plain loop that is quick to drive and that most of the automatic
// tests use. (Until 20 November 2026 there was a third, the campus loop, our
// first campus track. The team took it out once the Nova lap had replaced it.)

//
// The campus loop's map is still in this folder (campus-loop.js, with its
// storeys), although nobody can choose it: many tests of the rules are driven
// on it, because it has real corners that the test oval does not have.

import { TEST_OVAL } from "./test-oval.js";
import { CAMPUS_LOOP } from "./campus-loop.js";
import { CAMPUS_LOOP_STOREYS } from "./campus-loop-storeys.js";
import { NOVA_LAP } from "./nova-lap.js";

export const TRACKS = Object.freeze({
  "test-oval": TEST_OVAL,
  "nova-lap": NOVA_LAP,
});

/** The track used when none is chosen, or when the chosen one does not exist. */
export const DEFAULT_TRACK = "test-oval";

// How tall the buildings of a track are, for the picture only: pairs of a
// track and its storeys. A track that is not here has flat walls. (The Nova
// lap has scenery of its own instead: client/scenery.js.) The only one left
// is the campus loop, which is no longer in the list of tracks above and is
// kept for the tests.
const STOREYS = Object.freeze([[CAMPUS_LOOP, CAMPUS_LOOP_STOREYS]]);

/** The storeys of a track, or null if its walls are flat. */
export function storeysOf(track) {
  const pair = STOREYS.find(([listed]) => listed === track);
  return pair === undefined ? null : pair[1];
}
