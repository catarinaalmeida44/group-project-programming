// Is this a result a single race could really have had?
//
// An online race is run by our server, so the server knows the result. A
// single race is run by the player's own browser (client/main.js), and the
// browser reports it afterwards. The server cannot watch that race. A
// player who knows how could send any numbers.
//
// So a reported single race is treated differently from an online one:
//   - It is saved as "single" and only ever shown to the player themselves,
//     in their own stats. It NEVER counts for the shared leaderboard
//     (store.js leaves those rows out).
//   - Before it is saved, the numbers must at least make sense: that is
//     this file. A report that fails is refused and nothing is saved.
//
// What a browser can still fake: a believable time it did not drive. That
// only changes what that one player sees about themselves.

import { TRACKS } from "../shared/tracks/index.js";
import { isCharacterId } from "../shared/cast.js";
import { COMPUTER_KARTS } from "../shared/practice-race.js";
import { topSpeedOf, STEP_SECONDS } from "../shared/physics.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { routePoints } from "../client/route.js";
import { lookOfTrack } from "../client/track-looks.js";

/** No single race lasts longer than this: an hour, in steps of the game. */
export const LONGEST_RACE_STEPS = 60 * 60 * 60;

/**
 * No kart is believed to be this many times faster than top speed along
 * the road. Two leaves room for cutting corners and for the extra speed
 * after a ramp, and still refuses a "race" of a few seconds.
 */
export const FASTER_THAN_TOP_SPEED = 2;

/** How long the way round a track is, along the middle of the road, in units. Null if the track's look has no route. */
function lapLength(track) {
  const line = routePoints(track, lookOfTrack(track).route);
  if (line === null) {
    return null;
  }
  let length = 0;
  for (let i = 0; i < line.length; i++) {
    const next = line[(i + 1) % line.length]; // after the last point comes the first
    length += Math.hypot(next.x - line[i].x, next.y - line[i].y);
  }
  return length;
}

/**
 * The shortest whole race on a track that we believe, in steps: all its
 * laps at FASTER_THAN_TOP_SPEED times the top speed of a kart. A track
 * without a route gets the smallest number possible, one step for each lap.
 */
export function fastestBelievableSteps(track) {
  const length = lapLength(track);
  if (length === null) {
    return track.laps;
  }
  const unitsPerStep = topSpeedOf(TEST_DRIVER) * STEP_SECONDS * FASTER_THAN_TOP_SPEED;
  return Math.max(track.laps, Math.floor((track.laps * length) / unitsPerStep));
}

const isWholeFrom1 = (value, highest) => Number.isSafeInteger(value) && value >= 1 && value <= highest;

/**
 * Looks at a reported single race. Gives null if it could be real, or a
 * short reason (for our own log and the tests, not shown to players).
 *   result  { track, raceSteps, bestLapSteps, position, character }
 *   tracks  the list of tracks. Only the tests change it
 */
export function singleResultProblem(result, tracks = TRACKS) {
  if (result === null || typeof result !== "object") {
    return "not a result";
  }
  const { track, raceSteps, bestLapSteps, position, character } = result;
  if (typeof track !== "string" || !Object.hasOwn(tracks, track)) {
    return "no such track";
  }
  const theTrack = tracks[track];
  if (!isWholeFrom1(raceSteps, LONGEST_RACE_STEPS) || !isWholeFrom1(bestLapSteps, LONGEST_RACE_STEPS)) {
    return "times must be whole numbers of steps, from 1 up to an hour";
  }
  // The best lap is the shortest of the laps, and the laps add up to the
  // race. So the best lap, once for each lap, can never be more than the race.
  if (bestLapSteps * theTrack.laps > raceSteps) {
    return "the best lap is too long for this race time";
  }
  if (raceSteps < fastestBelievableSteps(theTrack)) {
    return "no kart is that fast";
  }
  // The player and the computer karts: nobody can be 7th of 6.
  if (!isWholeFrom1(position, COMPUTER_KARTS + 1)) {
    return "no such place";
  }
  if (character !== null && character !== undefined && !isCharacterId(character)) {
    return "no such character";
  }
  return null;
}
