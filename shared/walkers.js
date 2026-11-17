// Walkers: people who walk across the track, from one door to another.
//
// A track can list walkers, each with a path (track.js checks them). A
// walker walks its path to the end, goes inside for a moment, comes out
// again, walks back, goes inside at the other end, and so on, for ever.
//
// A kart that drives into a walker loses most of its speed, and the walker
// topples over: it sits on the ground for a moment, seeing stars, and then
// gets up and walks on. Nobody is hurt. A walker that is inside a building,
// or already sitting on the ground, cannot be bumped.
//
// The browser and the server both use this file.
//
// What is remembered about each walker, from one step to the next:
//   time       how many steps it has been walking and waiting. Its own
//              clock: it stands still while the walker sits on the ground
//   downSteps  how many more steps it sits on the ground. 0 when it is up
// Where a walker is follows from its path and its clock alone: walkerAt().
//
// WHO TOPPLES A WALKER (stepWalkers)
// A kart topples a walker when all of these are true:
//   - the walker is outside and standing up
//   - the kart is on the ground: one that is in the air after a ramp
//     (ramps.js) flies over people's heads
//   - the kart moves faster than TOPPLE_SPEED. A kart that creeps along
//     only nudges the walker, and nothing happens
//   - the circle of the kart and the circle of the walker overlap
// A kart that is spinning out, or has finished the race, topples a walker
// like any other: it is moving. A walker is never a wall: karts drive
// through the spot where one sits or stands. All that a walker costs is
// speed, and only when it is toppled.
//
// Nothing here is left to chance and nothing looks at a clock: the same
// walkers and the same karts always give the same answer.

import { speedOf } from "./physics.js";
import { KART_RADIUS } from "./race.js";

// ---------------------------------------------------------------------------
// NUMBERS TO TUNE BY PLAYTESTING
// ---------------------------------------------------------------------------

/** How fast a walker walks, in units per second. */
export const WALKER_SPEED = 38;
/** A walker is treated as a circle of this radius, in units. */
export const WALKER_RADIUS = 7;
/** How long a walker stays inside a building before coming out again, in steps. */
export const INSIDE_STEPS = 150;
/** How long a toppled walker sits on the ground, in steps. */
export const DOWN_STEPS = 132;
/** A kart has to move faster than this (units per second) to topple a walker. A slow walk for a kart: a fifth of a middle top speed. */
export const TOPPLE_SPEED = 60;
/** A kart that topples a walker keeps this share of its speed, and its direction. */
export const SPEED_KEPT_AFTER_WALKER = 0.4;

const STEPS_PER_SECOND = 60;

// ---------------------------------------------------------------------------

/** The walkers of a track at the start of a race: all up, all clocks at zero. */
export function createWalkers(track) {
  return (track.walkers ?? []).map(() => ({ time: 0, downSteps: 0 }));
}

/**
 * Where walker number "number" of a track is, and what it is doing:
 *   x, y       where it is, in units
 *   angle      the direction it walks in (or last walked in), like a kart's
 *   outside    false while it is inside a building: it is not on the track then
 *   down       true while it sits on the ground
 *   downShare  from 0 (just toppled) to 1 (about to get up). 0 when it is up
 * "walker" is what is remembered about it: { time, downSteps }.
 * Gives null for a number the track has no walker for.
 */
export function walkerAt(track, number, walker) {
  const route = track.walkers?.[number];
  if (route === undefined || walker === undefined || walker === null) {
    return null;
  }
  const perStep = WALKER_SPEED / STEPS_PER_SECOND;
  const walkSteps = Math.ceil(route.length / perStep); // steps to walk the path once
  const round = 2 * (walkSteps + INSIDE_STEPS); //       there, inside, back, inside
  const time = Number.isFinite(walker.time) ? walker.time : 0;
  const clock = (((time + route.startShare * round) % round) + round) % round;

  // Which part of its round it is in, and how far along the path it has walked.
  let along;
  let forwards = true;
  let outside = true;
  if (clock < walkSteps) {
    along = clock * perStep;
  } else if (clock < walkSteps + INSIDE_STEPS) {
    along = route.length;
    outside = false;
  } else if (clock < 2 * walkSteps + INSIDE_STEPS) {
    along = route.length - (clock - walkSteps - INSIDE_STEPS) * perStep;
    forwards = false;
  } else {
    along = 0;
    forwards = false;
    outside = false;
  }
  along = Math.min(Math.max(along, 0), route.length);

  // Walk along the stretches of the path until "along" is used up.
  let left = along;
  let spot = { x: route.points[0].x, y: route.points[0].y, angle: 0 };
  for (let i = 1; i < route.points.length; i++) {
    const from = route.points[i - 1];
    const to = route.points[i];
    const stretch = Math.hypot(to.x - from.x, to.y - from.y);
    const direction = Math.atan2(to.y - from.y, to.x - from.x);
    if (left <= stretch || i === route.points.length - 1) {
      const share = Math.min(left / stretch, 1);
      spot = { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share, angle: direction };
      break;
    }
    left -= stretch;
  }
  const downSteps = walker.downSteps > 0 ? walker.downSteps : 0;
  return {
    x: spot.x,
    y: spot.y,
    angle: forwards ? spot.angle : spot.angle + Math.PI, // on the way back it faces the other way
    outside,
    down: downSteps > 0,
    downShare: downSteps > 0 ? 1 - Math.min(downSteps, DOWN_STEPS) / DOWN_STEPS : 0,
  };
}

/**
 * One step of the walkers of a race, from GO on. Call it after the racers
 * have been moved.
 *   1. The clocks. A walker that sits on the ground sits one step less, and
 *      its own clock stands still. Every other walker's clock moves on by
 *      one step, which walks it a little further (or keeps it waiting inside).
 *   2. The bumps, with every walker where it is after that. A kart that
 *      topples a walker (see WHO TOPPLES A WALKER at the top) keeps
 *      SPEED_KEPT_AFTER_WALKER of its speed, in the same direction, and the
 *      walker sits down for DOWN_STEPS.
 *
 *   walkers  what is remembered about each walker: [{ time, downSteps }],
 *            in the order of the track's walkers (see createWalkers)
 *   racers   the racers whose karts are on the track (race.js)
 *
 * Gives { walkers, racers, hits }:
 *   walkers  the walkers one step later: always one for each walker of the track
 *   racers   the racers, in the same order. Only the karts of those that
 *            toppled someone have changed. Laps and clocks are never touched
 *   hits     who toppled whom in this step: [{ racer, walker }], each the
 *            place in its list (0 is the first)
 * Nothing it was given is changed.
 *
 * A walker can be toppled by only one kart in a step: the first in the list
 * that reaches it. A kart can topple several walkers in one step, but loses
 * speed only once.
 *
 * A race must never stop because of its walkers. So a list that is too
 * short, too long, or not a list at all is put right instead of refused:
 * a walker that is missing starts afresh, and extra ones are left out.
 */
export function stepWalkers(track, walkers, racers) {
  const given = Array.isArray(walkers) ? walkers : [];
  const routes = track.walkers ?? [];

  // 1. The clocks.
  const after = routes.map((route, number) => {
    const { time, downSteps } = tidyWalker(given[number]);
    return downSteps > 0 ? { time, downSteps: Math.max(0, downSteps - 1) } : { time: time + 1, downSteps: 0 };
  });

  // 2. The bumps. Each kart is judged by the speed it came with, so a kart
  //    that topples two walkers in one step is not too slow for the second.
  const hits = [];
  after.forEach((walker, number) => {
    const spot = walkerAt(track, number, walker);
    if (spot === null || !spot.outside || spot.down) {
      return; // inside a building or already on the ground: nobody can bump it
    }
    const racer = racers.findIndex((each) => topples(each, spot));
    if (racer !== -1) {
      hits.push({ racer, walker: number });
      after[number] = { ...walker, downSteps: DOWN_STEPS };
    }
  });
  if (hits.length === 0) {
    return { walkers: after, racers, hits };
  }

  const slowed = racers.map((racer, index) => {
    if (!hits.some((hit) => hit.racer === index)) {
      return racer;
    }
    const { kart } = racer;
    return {
      ...racer,
      kart: { ...kart, vx: kart.vx * SPEED_KEPT_AFTER_WALKER, vy: kart.vy * SPEED_KEPT_AFTER_WALKER },
    };
  });
  return { walkers: after, racers: slowed, hits };
}

/**
 * Where the walkers are that a driver has to steer round: the { x, y } of
 * every walker that is outside and standing up. One that is inside a
 * building or sits on the ground is in nobody's way and is left out.
 * The computer karts use this to drive round people as they do round bananas.
 */
export function walkerSpots(track, walkers) {
  const given = Array.isArray(walkers) ? walkers : [];
  const spots = [];
  (track.walkers ?? []).forEach((route, number) => {
    const spot = walkerAt(track, number, tidyWalker(given[number]));
    if (spot !== null && spot.outside && !spot.down) {
      spots.push({ x: spot.x, y: spot.y });
    }
  });
  return spots;
}

/** Does this racer topple a walker that stands at this spot? (The rules about the kart, from the top of this file.) */
function topples(racer, spot) {
  if (racer.airSteps > 0) {
    return false; // in the air: it flies over
  }
  if (!(speedOf(racer.kart) > TOPPLE_SPEED)) {
    return false; // creeping along: only a nudge
  }
  return Math.hypot(spot.x - racer.kart.x, spot.y - racer.kart.y) < KART_RADIUS + WALKER_RADIUS;
}

/**
 * What is remembered about one walker, with anything strange put right: a
 * clock that is not a number counts as 0, and so does a count of steps on
 * the ground that is not a number above zero. A walker that is missing
 * altogether starts afresh.
 */
function tidyWalker(walker) {
  return {
    time: Number.isFinite(walker?.time) ? walker.time : 0,
    downSteps: Number.isFinite(walker?.downSteps) && walker.downSteps > 0 ? walker.downSteps : 0,
  };
}
