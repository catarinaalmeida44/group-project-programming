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
