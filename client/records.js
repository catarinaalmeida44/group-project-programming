// Your best times, kept in this browser (see storage.js).
//
// For each track we keep two numbers: the fastest whole race and the fastest
// single lap. They are counted in steps of the game (60 a second), like every
// time in the rules, so they are exact whole numbers.
//
// These are personal records, not a leaderboard shared between players. The
// race runs in your browser, so anyone could change them; that is fine for
// your own records and is why they are never sent to the server. A shared
// leaderboard needs accounts and races run by the server (PROJECT_BRIEF.md,
// section 6).

import { STEP_SECONDS } from "../shared/physics.js";
import { formatTime } from "./format.js";
import { readSaved, writeSaved } from "./storage.js";

const STORAGE_KEY = "kart-best-times";

/** A time we are willing to keep: a whole number of steps, more than zero. */
function isSteps(value) {
  return Number.isSafeInteger(value) && value > 0;
}

/**
 * The best times for one track: { raceSteps, lapSteps }, each a number of
 * steps, or null if there is none yet. A saved value that is not a sensible
 * time is ignored.
 */
export function bestTimesFor(storage, trackName) {
  const saved = readSaved(storage, STORAGE_KEY) ?? {};
  const entry = Object.hasOwn(saved, trackName) ? saved[trackName] : null;
  return {
    raceSteps: isSteps(entry?.raceSteps) ? entry.raceSteps : null,
    lapSteps: isSteps(entry?.lapSteps) ? entry.lapSteps : null,
  };
}

/**
 * The race time and the fastest lap of a finished race, from the step count
 * at the end of each lap ([480, 1000, 1500] means the laps ended at those
 * steps). Gives null for anything that is not a whole race of "laps" laps:
 * too few or too many laps, times that are not whole positive numbers, or a
 * lap that ends before the one before it.
 */
export function finishedRaceTimes(lapEnds, laps) {
  if (!Array.isArray(lapEnds) || lapEnds.length !== laps || laps < 1) {
    return null;
  }
  let fastestLap = Infinity;
  for (let i = 0; i < lapEnds.length; i++) {
    const end = lapEnds[i];
    const start = i === 0 ? 0 : lapEnds[i - 1];
    if (!isSteps(end) || end <= start) {
      return null;
    }
    fastestLap = Math.min(fastestLap, end - start);
  }
  return { raceSteps: lapEnds[lapEnds.length - 1], lapSteps: fastestLap };
}

/**
 * Remembers a finished race if it beats the best race time or the best lap
 * on that track. Gives back what happened:
 *   { newBestRace, newBestLap, saved }
 * An unfinished or impossible race changes nothing.
 */
export function recordFinishedRace(storage, track, lapEnds) {
  const nothing = { newBestRace: false, newBestLap: false, saved: false };
  const times = finishedRaceTimes(lapEnds, track.laps);
  if (times === null) {
    return nothing;
  }
  const best = bestTimesFor(storage, track.name);
  const newBestRace = best.raceSteps === null || times.raceSteps < best.raceSteps;
  const newBestLap = best.lapSteps === null || times.lapSteps < best.lapSteps;
  if (!newBestRace && !newBestLap) {
    return nothing;
  }

  const all = readSaved(storage, STORAGE_KEY) ?? {};
  all[track.name] = {
    raceSteps: newBestRace ? times.raceSteps : best.raceSteps,
    lapSteps: newBestLap ? times.lapSteps : best.lapSteps,
  };
  return { newBestRace, newBestLap, saved: writeSaved(storage, STORAGE_KEY, all) };
}

/** A best time as text for the Leaderboard panel: "0:24.30", or a dash if there is none. */
export function bestTimeText(steps) {
  return steps === null ? "–" : formatTime(steps * STEP_SECONDS);
}
