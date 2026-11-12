// A short straight strip of road used by several test files. It is not a
// test itself.
//
// On this track, holding the gas key and nothing else finishes a one-lap
// race in about a second: the kart starts on the left, drives right through
// two checkpoints, and reaches the finish line at the far end. Tests of a
// whole online race can then run in real time and still be short.
//
// A real track is a loop. This one is not, and it does not need to be: the
// lap rule only asks that the checkpoints are passed in order.
//
//     column   0123456789
//              ##########
//              #.S.1.2.F#     S start   1, 2 checkpoints   F finish line
//              ##########     (three rows of road, so two karts fit side by side)

import { createTrack } from "../shared/track.js";

export function sprintTrackDescription(name = "Sprint test track") {
  return {
    name,
    tileSize: 48,
    laps: 1,
    map: [
      "##########",
      "#........#",
      "#........#",
      "#........#",
      "##########",
    ],
    start: { column: 2, row: 2, angle: 0 }, // pointing right
    checkpoints: [
      { name: "finish line", column: 8, row: 1, columns: 1, rows: 3 },
      { name: "first", column: 4, row: 1, columns: 1, rows: 3 },
      { name: "second", column: 6, row: 1, columns: 1, rows: 3 },
    ],
  };
}

/** A fresh sprint track. Two calls give two different tracks, for tests with two rooms. */
export function createSprintTrack(name) {
  return createTrack(sprintTrackDescription(name));
}
