// One racer in a race: the kart and its lap progress together.
//
// stepRacer() is the one function that moves a racer forward by one step of
// game time. It puts the other rule files together, in this order:
//   1. look at the ground under the kart        (track.js)
//   2. move the kart                            (physics.js)
//   3. bounce it off any wall it ran into       (track.js)
//   4. update its checkpoints, laps and time    (laps.js)
//
// The browser uses it for practice. The server will use it for online races.

import { createKart, stepKart } from "./physics.js";
import { surfaceAt, bounceOffWalls } from "./track.js";
import { createProgress, updateProgress } from "./laps.js";

/** For walls, a kart is treated as a circle this many units across, from the middle to the edge. */
export const KART_RADIUS = 10;

/** A racer waiting at the start of a track. */
export function createRacer(track) {
  return {
    kart: createKart(track.start.x, track.start.y, track.start.angle),
    progress: createProgress(),
  };
}

/**
 * Moves a racer forward by one step and gives back the new racer.
 * Once the racer has finished, the keys are ignored and the kart rolls to a stop.
 */
export function stepRacer(track, racer, input, character) {
  const keys = racer.progress.finished ? {} : input;
  const surface = surfaceAt(track, racer.kart.x, racer.kart.y);
  const moved = stepKart(racer.kart, keys, character, surface);
  const kart = bounceOffWalls(track, moved, KART_RADIUS);
  const progress = updateProgress(racer.progress, kart, track);
  return { ...racer, kart, progress };
}
