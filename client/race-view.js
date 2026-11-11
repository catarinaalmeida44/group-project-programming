// What the online page tells a player about the race: the countdown, who
// may start, and whether they are racing or watching.
//
// The server decides all of this (server/room.js) and sends it with every
// update, as the "race" part. This file only turns it into words for the
// page. It is plain arithmetic and text, so it can be tested without a
// browser. The page itself is online.js.

import { countdownAt } from "../shared/countdown.js";
import { STEP_SECONDS } from "../shared/physics.js";
import { formatTime } from "./format.js";

const PHASES = ["open", "countdown", "racing", "finished"];

/** What the page assumes when an update says nothing usable about the race. */
const NO_RACE = { phase: "open", countdownSteps: 0, host: null, watching: [] };

/**
 * The "race" part of an update from the server, checked.
 * Gives { phase, countdownSteps, host, watching }. If any part is missing
 * or strange it gives the answer for an open room instead: the page must
 * not break on a strange message.
 */
export function readRace(update) {
  const race = update?.race;
  if (race === null || typeof race !== "object") {
    return NO_RACE;
  }
  const { phase, countdownSteps, host, watching } = race;
  const usable =
    PHASES.includes(phase) &&
    Number.isInteger(countdownSteps) &&
    countdownSteps >= 0 &&
    (host === null || Number.isInteger(host)) &&
    Array.isArray(watching) &&
    watching.every((id) => Number.isInteger(id));
  return usable ? { phase, countdownSteps, host, watching: [...watching] } : NO_RACE;
}

/** Is this player watching the race instead of driving in it? */
export function isWatching(race, myId) {
  return race.watching.includes(myId);
}

/**
 * The kart a watcher's camera follows: the one that has done the most laps.
 * When several have done the same, the first in the list. Gives undefined
 * when there are no karts.
 */
export function kartToWatch(karts) {
  let leader;
  for (const kart of karts) {
    if (leader === undefined || kart.lapsDone > leader.lapsDone) {
      leader = kart;
    }
  }
  return leader;
}

/**
 * What to show a player about the race.
 *   race   from readRace()
 *   myId   this player's number
 *   mine   this player's own kart in the latest update, or undefined when watching
 *
 * Gives { message, big, line }:
 *   message  the text in the middle of the track ("" for none)
 *   big      true when the message is the countdown, shown as one big number
 *   line     a sentence for the line under the track ("" for none)
 */
export function raceView({ race, myId, mine }) {
  const host = race.host === myId;
  const watching = isWatching(race, myId);
  const inRace = race.phase === "countdown" || race.phase === "racing";

  // The countdown is the same for everyone, racing or watching.
  if (inRace) {
    const { label } = countdownAt(race.countdownSteps);
    if (label !== "") {
      return { message: label, big: true, line: watching ? WATCHING_LINE : "" };
    }
  }

  if (watching) {
    const line =
      race.phase === "finished"
        ? `The race is over. ${host ? "Press Enter to start the next one." : "You will join the next one."}`
        : WATCHING_LINE;
    return { message: "", big: false, line };
  }

  if (race.phase === "open") {
    const finished = mine?.finished === true;
    return {
      message: finished ? `${finishedIn(mine)} Press R to go again.` : "",
      big: false,
      line: host
        ? "You are the host: press Enter to start a race for everyone here."
        : "Waiting for the host to start a race. You can drive around meanwhile.",
    };
  }

  // In a race, past the countdown.
  const nextRace = host ? "Press Enter to start the next race." : "Waiting for the host to start the next race.";
  if (mine?.finished === true) {
    return { message: `${finishedIn(mine)} ${nextRace}`, big: false, line: "" };
  }
  return { message: "", big: false, line: race.phase === "finished" ? nextRace : "" };
}

const WATCHING_LINE = "A race is on. You are watching the kart in front, and you will join at the next start.";

function finishedIn(kart) {
  return `Finished in ${formatTime(kart.steps * STEP_SECONDS)}.`;
}
