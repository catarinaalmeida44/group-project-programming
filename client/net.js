// Showing an online race smoothly.
//
// The server sends the state of all karts 30 times a second, but the screen
// shows 60 pictures a second, and the internet delivers the updates at
// slightly uneven moments. Drawing each update as it arrives would make the
// karts jump.
//
// So the browser shows the race a little in the past. For every picture it
// finds the two updates on either side of that moment and draws each kart
// at the right point between them. This is the "gliding" of karts between
// updates.
//
// HOW FAR IN THE PAST
// The further in the past, the later a key press shows on the screen: that
// is the "lag" a player feels. But if the picture runs too close to the
// present, one update that arrives late leaves nothing to glide towards,
// and the karts stop for a moment. So the page measures how late updates
// arrive on this connection and keeps just enough spare: 4 steps (a
// fifteenth of a second) on a steady connection, where updates are at most
// one step late, and up to 6 steps (a tenth of a second) on an uneven one.
// Until 19 November 2026 it was always 6, with 20 updates a second.
// (Measured that day from Catarina's laptop: the live server's updates
// arrive at most about one step late.)
//
// This file is only arithmetic and bookkeeping, so it can be tested. The
// connection itself is opened in online.js.

import { STEP_SECONDS } from "../shared/physics.js";
import { formatTime } from "./format.js";

/** How far in the past the race is shown on a steady connection, in steps of the game. 4 steps = a fifteenth of a second. */
export const DELAY_STEPS = 4;
/** The furthest in the past it is ever shown, on a connection that delivers unevenly. 6 steps = a tenth of a second. */
export const DELAY_STEPS_MOST = 6;
/**
 * How quickly a late update is forgotten: each update that arrives on time
 * shrinks the remembered lateness to this share. It halves in a little over
 * two seconds, and after ten seconds of steady updates almost nothing of it
 * is left. Slow on purpose: a connection that hiccups every few seconds
 * should keep its spare instead of stopping the karts at every hiccup.
 */
export const LATENESS_FADES = 0.99;
/** Beyond the worst lateness seen lately, the page keeps this one step more. */
const SPARE_STEPS = 1;

const STEPS_PER_SECOND = 60;
const UPDATES_TO_KEEP = 30; //  one second's worth
const COAST_STEPS = 12; //      if updates stop arriving, keep moving this long, then hold still
const JUMP_STEPS = 30; //       if we are this far off, jump instead of gliding there
const CATCH_UP = 0.1; //        share of a small timing error corrected in each picture

/**
 * A kart at top speed moves about 18 units between two updates. One that
 * is further than this from where it was has not driven there: it was put
 * somewhere else, for example back on the grid at a race start. It is then
 * shown in its new spot at once, instead of sliding across the track.
 */
export const JUMP_DISTANCE = 100;

/** A value part of the way from "from" to "to". share 0 gives from, share 1 gives to. */
export function blend(from, to, share) {
  return from + (to - from) * share;
}

/** The same for directions, going the short way round the circle. */
export function blendAngle(from, to, share) {
  const turn = Math.atan2(Math.sin(to - from), Math.cos(to - from)); // between half a turn left and right
  return from + turn * share;
}

/**
 * The karts part of the way between two updates.
 * Every kart in the newer update is shown. A kart that is also in the older
 * update is drawn between its two positions. A kart that just joined, or
 * that was put somewhere else on the track, is drawn where the newer
 * update has it.
 */
export function blendKarts(olderKarts, newerKarts, share) {
  return newerKarts.map((newer) => {
    const older = olderKarts.find((kart) => kart.id === newer.id);
    if (older === undefined) {
      return newer;
    }
    if (Math.hypot(newer.x - older.x, newer.y - older.y) > JUMP_DISTANCE) {
      return newer;
    }
    return {
      ...newer,
      x: blend(older.x, newer.x, share),
      y: blend(older.y, newer.y, share),
      angle: blendAngle(older.angle, newer.angle, share),
      vx: blend(older.vx, newer.vx, share),
      vy: blend(older.vy, newer.vy, share),
    };
  });
}

/**
 * The karts at one moment of game time (a step number, possibly between two
 * whole steps), worked out from a list of updates sorted oldest first.
 * Before the oldest update it gives the oldest. After the newest it gives
 * the newest: the karts hold still instead of guessing.
 */
export function kartsAtStep(updates, step) {
  if (updates.length === 0) {
    return null;
  }
  let older = null;
  let newer = null;
  for (const update of updates) {
    if (update.step <= step) {
      older = update;
    } else {
      newer = update;
      break;
    }
  }
  if (older === null) {
    return newer.karts;
  }
  if (newer === null) {
    return older.karts;
  }
  const share = (step - older.step) / (newer.step - older.step);
  return blendKarts(older.karts, newer.karts, share);
}

/**
 * Keeps the latest updates from the server and answers, for every picture,
 * "where are the karts now?".
 *   add(update, now)  store an update that just arrived
 *   advance(now)      the karts to draw at this moment, or null before the first update
 *   delaySteps()      how far in the past the race is shown right now, in
 *                     steps: from DELAY_STEPS to DELAY_STEPS_MOST
 * "now" is the browser's clock in thousandths of a second.
 */
export function createPlayback() {
  const updates = []; // oldest first
  let newestArrivedAt = 0;
  let showingStep = null; // the moment of game time being shown
  let lastAdvance = 0;
  let lateSteps = 0; //      how late updates have been arriving lately, in steps
  let stepsApart = 2; //     how many steps lie between two updates (the server sends every second step)

  /**
   * The delay in use. To always have an update to glide towards, the
   * picture must be at least this far in the past: the steps between two
   * updates, plus the worst lateness seen lately, plus one step to spare.
   * Never less than DELAY_STEPS and never more than DELAY_STEPS_MOST.
   */
  function delaySteps() {
    const needed = stepsApart + lateSteps + SPARE_STEPS;
    return Math.min(Math.max(needed, DELAY_STEPS), DELAY_STEPS_MOST);
  }

  return {
    delaySteps,

    add(update, now) {
      const newest = updates[updates.length - 1];
      if (newest !== undefined && update.step <= newest.step) {
        return; // older than what we already have: ignore it
      }
      if (newest !== undefined) {
        // How much later did this update arrive than its step number says
        // it should, counting from the one before? On a steady connection:
        // not at all. The worst lateness is remembered and fades slowly.
        const arrivedAfterSteps = ((now - newestArrivedAt) / 1000) * STEPS_PER_SECOND;
        const apart = update.step - newest.step;
        const late = arrivedAfterSteps - apart;
        lateSteps = Math.max(late, lateSteps * LATENESS_FADES, 0);
        // A gap of seconds (the tab was asleep) says nothing about the connection.
        if (late > JUMP_STEPS) {
          lateSteps = 0;
        }
        // How far apart the server's updates are, counted in its own steps:
        // 2 today. (An update that was lost on the way makes one pair look
        // further apart; the next pair puts it right.)
        if (apart <= DELAY_STEPS_MOST) {
          stepsApart = apart;
        }
      }
      updates.push(update);
      if (updates.length > UPDATES_TO_KEEP) {
        updates.shift();
      }
      newestArrivedAt = now;
    },

    advance(now) {
      if (updates.length === 0) {
        return null;
      }
      const newest = updates[updates.length - 1];

      // Where the server probably is right now: the newest update, plus the
      // time since it arrived. Then step back by the delay.
      const sinceNewest = Math.min(((now - newestArrivedAt) / 1000) * STEPS_PER_SECOND, COAST_STEPS);
      const wanted = newest.step + sinceNewest - delaySteps();

      if (showingStep === null || Math.abs(wanted - showingStep) > JUMP_STEPS) {
        showingStep = wanted;
      } else {
        // Move on at the normal speed of time, and gently correct small errors.
        showingStep += ((now - lastAdvance) / 1000) * STEPS_PER_SECOND;
        showingStep += (wanted - showingStep) * CATCH_UP;
      }
      lastAdvance = now;
      return kartsAtStep(updates, showingStep);
    },
  };
}

/**
 * Updates normally arrive 30 times a second. If none has arrived for this
 * long, something is wrong, and we say so.
 */
export const QUIET_AFTER_MS = 2000;

/**
 * The line under the track on the online page.
 *   status             what we last learned about the connection ("Connected. You are the red kart.")
 *   connected          does the browser believe the connection is open
 *   playerCount        how many karts the last update showed
 *   sinceLastUpdateMs  how long ago the last update arrived
 *
 * Why "the server has gone quiet" is needed: when our server stops or cuts
 * a connection, the browser can go on believing it is connected for 10 to
 * 20 seconds, because the news has to pass through the hosting company's
 * network. During that time no updates arrive and the karts stand still.
 * Without this line the page would say "Connected" over a frozen race.
 */
export function statusLine({ status, connected, playerCount, sinceLastUpdateMs }) {
  if (!connected) {
    return status;
  }
  if (sinceLastUpdateMs > QUIET_AFTER_MS) {
    return "The server has gone quiet. If the karts stay still, reload the page to join again.";
  }
  if (!(playerCount >= 1)) {
    return status; // connected, but no update has shown any kart yet
  }
  const players = playerCount === 1 ? "You are alone here" : `${playerCount} players here`;
  return `${status} ${players}.`;
}

/**
 * Checks one message from the server. Gives the message if it is one this
 * page understands, or null. The page must not break on a strange message.
 */
export function readServerMessage(text) {
  let message;
  try {
    message = JSON.parse(text);
  } catch {
    return null;
  }
  if (message === null || typeof message !== "object") {
    return null;
  }
  if (message.type === "welcome" && Number.isInteger(message.id)) {
    return message;
  }
  if (message.type === "state" && Number.isFinite(message.step) && Array.isArray(message.karts)) {
    return message;
  }
  if (message.type === "full") {
    return message;
  }
  if (message.type === "elsewhere") {
    return { type: "elsewhere" }; // this player joined the room again from somewhere else
  }
  if (message.type === "account" && (message.username === null || typeof message.username === "string")) {
    return message;
  }
  if (message.type === "names" && message.names !== null && typeof message.names === "object" && !Array.isArray(message.names)) {
    // Keep only what looks like a player number with a user name. Anything
    // else in the list is dropped, so a strange list cannot break the page.
    const names = new Map();
    for (const [id, name] of Object.entries(message.names)) {
      if (/^[0-9]{1,9}$/.test(id) && typeof name === "string" && /^[A-Za-z0-9_]{3,16}$/.test(name)) {
        names.set(Number(id), name);
      }
    }
    return { type: "names", names };
  }
  if (
    message.type === "saved" &&
    typeof message.saved === "boolean" &&
    Number.isInteger(message.position) &&
    message.position >= 1 &&
    Number.isInteger(message.raceSteps) &&
    message.raceSteps > 0
  ) {
    return message;
  }
  return null;
}

/** At most this many banana peels are taken from one update. A real update has far fewer. */
const MOST_BANANAS_SHOWN = 60;

/**
 * The banana peels in an update from the server, checked: a list of
 * { x, y }. Anything in the list that is not a spot on the track is left
 * out, and an update without a usable list gives none. The page must not
 * break on a strange message.
 */
export function bananasOf(update) {
  if (!Array.isArray(update?.bananas)) {
    return [];
  }
  return update.bananas
    .filter((banana) => banana !== null && typeof banana === "object" && Number.isFinite(banana.x) && Number.isFinite(banana.y))
    .slice(0, MOST_BANANAS_SHOWN)
    .map((banana) => ({ x: banana.x, y: banana.y }));
}

const MOST_WALKERS_SHOWN = 40;

/**
 * The walkers in an update from the server, checked: a list of
 * { time, downSteps }, in the form shared/walkers.js uses (the server calls
 * the second number "down"). An update without a usable list gives none,
 * and an entry that is not two numbers becomes a walker at the start of
 * its round, so that the others keep their places in the list.
 */
export function walkersOf(update) {
  if (!Array.isArray(update?.walkers)) {
    return [];
  }
  return update.walkers.slice(0, MOST_WALKERS_SHOWN).map((walker) => ({
    time: Number.isFinite(walker?.time) && walker.time >= 0 ? walker.time : 0,
    downSteps: Number.isFinite(walker?.down) && walker.down > 0 ? walker.down : 0,
  }));
}

/**
 * The line on the online page about the player's account.
 *   account  the last "account" message from the server, or null before it arrived
 *   saved    the last "saved" message from the server, or null
 *
 * A guest can race like anyone else. Only the results of signed-in players
 * are written to the shared leaderboard, and the server does that by itself
 * when they finish: this page never sends a time.
 */
export function accountLine(account, saved) {
  if (account === null) {
    return "";
  }
  if (account.username === null) {
    return "You are playing as a guest: your results are not saved. Sign in from the menu to appear on the leaderboard.";
  }
  const who = `Signed in as ${account.username}.`;
  if (saved === null) {
    return `${who} When you finish a race, your time is saved to the leaderboard.`;
  }
  if (!saved.saved) {
    return `${who} Your last result could not be saved: the database did not answer.`;
  }
  return `${who} Saved to the leaderboard: ${placeText(saved.position)} place, ${formatTime(saved.raceSteps * STEP_SECONDS)}.`;
}

/**
 * The line on the online page that says who else is in the room.
 *   names      the user names of the signed-in players, by player number (a Map)
 *   playerIds  the numbers of everyone in the room: on the track or watching
 *   myId       this player's own number
 * Gives "" when nobody else is there. Guests have no name, so they are counted.
 *   "With you: Rui."   "With you: Bea, Rui and 2 guests."   "With you: 1 guest."
 */
export function othersLine(names, playerIds, myId) {
  const others = playerIds.filter((id) => id !== myId);
  const named = others.filter((id) => names.has(id)).map((id) => names.get(id));
  const guests = others.length - named.length;
  const parts = [...named];
  if (guests > 0) {
    parts.push(guests === 1 ? "1 guest" : `${guests} guests`);
  }
  if (parts.length === 0) {
    return "";
  }
  const last = parts.pop();
  return parts.length === 0 ? `With you: ${last}.` : `With you: ${parts.join(", ")} and ${last}.`;
}

/** 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 11 -> "11th", 21 -> "21st". */
export function placeText(position) {
  const lastTwo = position % 100;
  const last = position % 10;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${position}th`;
  }
  return `${position}${last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th"}`;
}
