// What the online page tells a player about the race: the countdown, who
// may start, and whether they are racing or watching.
//
// The server decides all of this (server/room.js) and sends it with every
// update, as the "race" part. This file only turns it into words for the
// page. It is plain arithmetic and text, so it can be tested without a
// browser. The page itself is online.js.

import { countdownAt } from "../shared/countdown.js";
import { STEP_SECONDS } from "../shared/physics.js";
import { FINISH_WINDOW_STEPS } from "../shared/race-time.js";
import { formatTime } from "./format.js";
import { standings } from "./standings.js";

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

/**
 * How many steps are left until the race is over for everyone, from an
 * update of the server ("endsIn"), checked. Gives null when no race is
 * being driven, or when the update says nothing usable.
 */
export function readEndsIn(update) {
  const endsIn = update?.endsIn;
  return Number.isInteger(endsIn) && endsIn >= 0 ? endsIn : null;
}

/**
 * The short notice at the top of the picture while a race is running out:
 * "The race ends in 1:42", and in the last minute "The race ends in 42 s".
 * Gives "" while there is plenty of time, which is until the first kart has
 * finished: from then on the others have FINISH_WINDOW_STEPS left.
 */
export function timeLeftNotice(race, endsIn) {
  if (race.phase !== "racing" || endsIn === null || endsIn > FINISH_WINDOW_STEPS) {
    return "";
  }
  const seconds = Math.ceil(endsIn * STEP_SECONDS);
  const left = seconds > 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : `${seconds} s`;
  return `The race ends in ${left}`;
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
 * The kart a watcher's camera is on.
 *
 * It is the kart in first place at the moment the watcher arrives: the one
 * that has passed the most checkpoints, as in standings.js. The camera then
 * stays with that kart, so the picture does not jump from one kart to
 * another each time two of them swap places. When that kart has finished or
 * has left, the camera moves to whoever leads among the karts still
 * driving, and when nobody is driving any more it shows the winner.
 * (Until 19 November 2026 the page used kartToWatch() above, which took
 * the first kart in the list whenever all were on the same lap.)
 *   karts        the karts of the race
 *   track        the track
 *   followingId  the number of the kart the camera is on now, or null
 * Gives the kart, or undefined when there are no karts.
 */
export function kartToFollow(karts, track, followingId) {
  const usable = Array.isArray(karts) ? karts.filter((kart) => kart !== null && typeof kart === "object") : [];
  const followed = usable.find((kart) => kart.id === followingId);
  if (followed !== undefined && followed.finished !== true) {
    return followed;
  }
  const order = standings(usable, track);
  return order.find((kart) => kart.finished !== true) ?? order[0];
}

/** What the banner says for a moment when a watcher presses a driving key. */
export const KEYS_LATER_TEXT = "Your keys do nothing yet: you drive in the next race.";

/**
 * The banner across the top of the picture for someone who arrived during a
 * race. Without it the picture looks exactly as if they were driving: a
 * kart from behind, in the middle of the screen. It is someone else's.
 *   race, myId   as for raceView() below
 *   watchedName  whose kart the camera is on: a player's user name or a
 *                character's name, or null when it has no name
 *   pressedKey   true for a moment after the watcher pressed a driving key
 * Gives null when this player is not watching a race that is on, or
 * { title, text }: the title goes in big letters.
 */
export function watchBanner({ race, myId, watchedName = null, pressedKey = false }) {
  const raceIsOn = race.phase === "countdown" || race.phase === "racing";
  if (!raceIsOn || !isWatching(race, myId)) {
    return null;
  }
  const named = typeof watchedName === "string" && watchedName !== "";
  const camera = named ? `The camera is on ${watchedName}. ` : "";
  return {
    title: "A race is on: you are watching",
    text: pressedKey === true ? KEYS_LATER_TEXT : `${camera}A new race starts when this one is over, and you join it.`,
  };
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
    // Waiting for the host: every kart stands on the grid and keys do nothing.
    return {
      message: "",
      big: false,
      line: host
        ? "You are the host: press Enter to start a race for everyone here. Nobody can move before that."
        : "Waiting for the host to start a race. Your kart stays on the grid until then.",
    };
  }

  // In a race, past the countdown. A race that has begun is driven to its
  // end: the host can only start the next one once this one is over.
  const over = race.phase === "finished";
  const nextRace = host ? "Press Enter to start the next race." : "Waiting for the host to start the next race.";
  if (mine?.finished === true) {
    const whatNow = over || !host ? nextRace : "You can start the next race when this one is over.";
    return { message: `${finishedIn(mine)} ${whatNow}`, big: false, line: "" };
  }
  if (over) {
    // The time ran out before this player finished.
    return { message: `Time is up: the race is over. ${nextRace}`, big: false, line: "" };
  }
  return { message: "", big: false, line: "" };
}

/**
 * Do this player's arrow keys move their kart right now, as far as the
 * server's rules go (server/room.js)? Only in a race after GO, in their own
 * kart, before they finish, and not while it spins after a banana. Not while
 * waiting for the host, not during 3, 2, 1, not when watching, and not once
 * the race is over. The page uses it so that the kart only leans, the
 * engine only revs and the next checkpoint is only lit when the keys really
 * do something.
 */
export function keysWork(race, mine) {
  return race.phase === "racing" && mine !== undefined && mine.finished !== true && !(mine.spin > 0);
}

const WATCHING_LINE = "A race is on. You are watching the kart in front, and you will join at the next start.";

function finishedIn(kart) {
  return `Finished in ${formatTime(kart.steps * STEP_SECONDS)}.`;
}
