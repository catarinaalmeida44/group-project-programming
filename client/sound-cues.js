// Which sound belongs to which moment of a race.
//
// The sounds themselves are made in sound.js, which needs a browser and
// loudspeakers. This file decides WHEN each one is due and how the engine
// should sound right now. It is plain arithmetic, so it can be tested.
//
// For every picture, a race page hands over a few facts about the player's
// kart (see watchForSounds below). This file compares them with the facts
// of the picture before and answers with
//   cues    the short sounds that are due now: a beep, a bump, a jingle
//   engine  how the engine and the tyres should sound at this moment
//
// Sound changes nothing about a race. It is made in the browser from what
// the rules have already worked out, on the practice page and online alike.

import { readSaved, writeSaved } from "./storage.js";

// ---------------------------------------------------------------------------
// NUMBERS TO TUNE BY EAR
// ---------------------------------------------------------------------------

/** The speed at which the engine reaches its highest note, in units per second. */
const ENGINE_TOP_SPEED = 360;
/**
 * A kart cannot speed up or brake harder than about 600 units per second
 * every second by itself (shared/physics.js). A change of speed quicker
 * than this, in units per second every second, was a knock.
 */
const KNOCK_FROM = 1100;
/** A knock that changes the speed by this much, in units per second, is played at full strength. */
const FULL_KNOCK = 180;
/** No second knock is played for this long, in seconds: grinding along a wall is one noise, not twenty. */
const KNOCK_PAUSE = 0.18;
/** Another kart this near (in units, middle to middle) means the knock was a kart and not a wall. Two karts touch at 20. */
const KART_NEAR = 30;
/** A kart that moved further than this in one picture was put somewhere else (back on the grid): that is not a knock. */
const JUMP = 100;
/** For this long after taking off from a ramp, in seconds, no knock is played: the ramp's push is not one. */
const TAKE_OFF_QUIET = 0.25;
/** A sideways slide this fast, in units per second, makes the tyres squeal at full strength. */
const FULL_SLIDE = 140;

// ---------------------------------------------------------------------------

/** The engine of a kart that is not there: silent. */
export const NO_ENGINE = Object.freeze({ running: false, pitch: 0, throttle: 0, grass: 0, skid: 0 });

/**
 * How the engine and the tyres of a kart should sound right now.
 *   kart      { vx, vy, angle }, or null when there is no kart to hear
 *   gas       is the gas key held?
 *   onGrass   is the kart on grass?
 *   spinning  is it spinning out after a banana?
 * Gives { running, pitch, throttle, grass, skid }, each from 0 to 1:
 *   pitch     how high the engine sings: 0 standing still, 1 at top speed
 *   throttle  1 while the gas is held (a fuller sound), else 0
 *   grass     how loud the rumble of grass under the wheels is
 *   skid      how loud the tyres squeal: sliding sideways, or spinning
 */
export function engineOf({ kart, gas = false, onGrass = false, spinning = false }) {
  if (!isKart(kart)) {
    return NO_ENGINE;
  }
  const speed = Math.hypot(kart.vx, kart.vy);
  const share = Math.min(speed / ENGINE_TOP_SPEED, 1);
  // How fast the kart moves sideways, across the direction it points.
  const angle = Number.isFinite(kart.angle) ? kart.angle : 0;
  const sideways = Math.abs(-kart.vx * Math.sin(angle) + kart.vy * Math.cos(angle));
  return {
    running: true,
    pitch: share,
    throttle: gas === true && !spinning ? 1 : 0,
    grass: onGrass === true ? share : 0,
    skid: spinning === true ? Math.max(0.6, share) : Math.min(sideways / FULL_SLIDE, 1) * (share > 0.15 ? 1 : 0),
  };
}

/**
 * Watches one race for moments that have a sound. Gives a function to call
 * for every picture with the facts of that moment and the time since the
 * picture before, in seconds:
 *
 *   label     what the countdown shows: "3", "2", "1", "GO!" or ""
 *   kart      the kart to listen to: { x, y, vx, vy, angle }, or null
 *   gas       is the gas key held?
 *   onGrass   is the kart on grass?
 *   spinning  is it spinning out?
 *   lapsDone  how many laps it has completed
 *   laps      how many laps the race has
 *   finished  has it finished?
 *   warning   is a warning on the screen ("wrong way", "missed checkpoint")?
 *   others    the other karts on the track: [{ x, y }]
 *   air       how many more steps the kart is in the air after a ramp (0 on the ground)
 *   walkersDownNear  how many walkers sit on the ground close to the kart
 *
 * It answers { cues, engine }. "cues" is a list of { name, strength }:
 *   "count"     a number of the countdown appeared
 *   "go"        GO!
 *   "lap"       a lap was completed
 *   "lastLap"   the lap before the last was completed: the last lap begins
 *   "finish"    the kart finished the race
 *   "spin"      the kart slipped on a banana
 *   "bumpKart"  it knocked into another kart ("strength" from 0 to 1)
 *   "bumpWall"  it knocked into a wall
 *   "warning"   a warning came up
 *   "jump"      the kart took off from a ramp
 *   "oops"      a walker close to the kart toppled over
 * The very first picture never has a cue: there is nothing to compare it with.
 */
export function watchForSounds() {
  let before = null; //   the facts of the picture before
  let sinceKnock = 1; //  seconds since the last knock that was played
  let sinceTakeOff = 1; // seconds since the kart last took off from a ramp

  return (facts, frameSeconds) => {
    const now = {
      label: typeof facts?.label === "string" ? facts.label : "",
      kart: isKart(facts?.kart) ? facts.kart : null,
      spinning: facts?.spinning === true,
      lapsDone: Number.isInteger(facts?.lapsDone) ? facts.lapsDone : 0,
      laps: Number.isInteger(facts?.laps) ? facts.laps : 0,
      finished: facts?.finished === true,
      warning: facts?.warning === true,
      air: Number.isFinite(facts?.air) && facts.air > 0 ? facts.air : 0,
      downNear: Number.isInteger(facts?.walkersDownNear) && facts.walkersDownNear > 0 ? facts.walkersDownNear : 0,
    };
    const engine = engineOf({ kart: now.kart, gas: facts?.gas, onGrass: facts?.onGrass, spinning: now.spinning });
    const cues = [];
    const seconds = Number.isFinite(frameSeconds) && frameSeconds > 0 ? frameSeconds : 0;
    sinceKnock += seconds;
    sinceTakeOff += seconds;

    if (before !== null) {
      if (now.label !== before.label && now.label !== "") {
        cues.push({ name: now.label === "GO!" ? "go" : "count", strength: 1 });
      }
      if (now.finished && !before.finished) {
        cues.push({ name: "finish", strength: 1 });
      } else if (now.lapsDone > before.lapsDone && !now.finished) {
        cues.push({ name: now.lapsDone === now.laps - 1 ? "lastLap" : "lap", strength: 1 });
      }
      if (now.spinning && !before.spinning) {
        cues.push({ name: "spin", strength: 1 });
      }
      if (now.warning && !before.warning) {
        cues.push({ name: "warning", strength: 1 });
      }
      if (now.air > 0 && before.air === 0) {
        cues.push({ name: "jump", strength: 1 });
        sinceTakeOff = 0;
      }
      if (now.downNear > before.downNear) {
        cues.push({ name: "oops", strength: 1 });
      }

      const knock = knockBetween(before.kart, now.kart, seconds);
      // (A ramp throws the kart forward: that sudden speed is not a knock.)
      if (knock > 0 && sinceKnock >= KNOCK_PAUSE && !now.spinning && sinceTakeOff >= TAKE_OFF_QUIET) {
        sinceKnock = 0;
        const others = Array.isArray(facts?.others) ? facts.others : [];
        const kartNear = others.some((other) => isSpot(other) && Math.hypot(other.x - now.kart.x, other.y - now.kart.y) <= KART_NEAR);
        cues.push({ name: kartNear ? "bumpKart" : "bumpWall", strength: knock });
      }
    }

    before = now;
    return { cues, engine };
  };
}

/**
 * How hard a kart was knocked between two pictures: 0 for not at all, up
 * to 1. A knock is a change of speed far quicker than driving or braking
 * can make. A kart that was put somewhere else is not a knock.
 */
export function knockBetween(kartBefore, kartNow, seconds) {
  if (!isKart(kartBefore) || !isKart(kartNow) || !(seconds > 0)) {
    return 0;
  }
  if (Math.hypot(kartNow.x - kartBefore.x, kartNow.y - kartBefore.y) > JUMP) {
    return 0;
  }
  const change = Math.abs(Math.hypot(kartNow.vx, kartNow.vy) - Math.hypot(kartBefore.vx, kartBefore.vy));
  if (change / seconds < KNOCK_FROM) {
    return 0;
  }
  return Math.min(Math.max(change / FULL_KNOCK, 0.2), 1);
}

function isSpot(thing) {
  return thing !== null && typeof thing === "object" && Number.isFinite(thing.x) && Number.isFinite(thing.y);
}

function isKart(thing) {
  return isSpot(thing) && Number.isFinite(thing.vx) && Number.isFinite(thing.vy);
}

// ---------------------------------------------------------------------------
// The player's choice: sound on or off. Kept in this browser (storage.js).
// ---------------------------------------------------------------------------

const STORAGE_KEY = "kart-sound";

/** Does the player want sound? Yes, unless they switched it off. A saved value that is not a plain yes or no is ignored. */
export function readSoundOn(storage) {
  const saved = readSaved(storage, STORAGE_KEY);
  return saved === null || saved.on !== false;
}

/** Remembers the choice. Gives true if it was saved, false if the browser refused. Anything but an exact "true" counts as off. */
export function saveSoundOn(storage, on) {
  return writeSaved(storage, STORAGE_KEY, { on: on === true });
}
