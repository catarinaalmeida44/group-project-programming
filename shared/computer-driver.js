// Computer karts: how they decide what to do.
//
// A computer kart drives by the same rules as a player. It cannot do anything
// a player cannot: it "presses" the same four keys (gas, brake, left, right)
// and race.js moves it exactly as it would move a player's kart.
//
// How it decides is called utility AI. Many times a second, for every
// computer kart:
//   1. LOOK AROUND   lookAround(): where does the road go next, how sharp is
//                    the next bend, is a kart in front, is a banana on the
//                    way, has the kart got stuck?
//   2. SCORE         scoreActions(): every possible action gets a score from
//                    0 (pointless now) to 1 (urgent now):
//                      follow    follow the racing line (always a little)
//                      brake     slow down for a sharp bend
//                      overtake  pass a slower kart in front, on the side
//                                where there is room
//                      dodge     steer round a banana on the way
//                      recover   back away from a wall after getting stuck
//   3. CHOOSE        the action with the highest score wins.
//   4. KEYS          keysFor(): the chosen action becomes keys to press.
//
// Every computer kart has a personality: a few numbers that weigh its
// scores. A daring driver overtakes eagerly and brakes late. A careful one
// keeps its distance and brakes early. "pace" is how close to its top speed
// it dares to drive, so the karts do not all go equally fast.
//
// The racing line is a list of points along the middle of the road, in the
// order the track is driven: { x, y } in units of track. The page takes it
// from the look of the track (client/track-looks.js), the same points the
// arrows on the road use.
//
// Everything here is plain arithmetic: no random numbers, no clock. The same
// race always gives the same decisions, so every decision can be tested.

import { speedOf, topSpeedOf } from "./physics.js";
import { tileKindAt } from "./track.js";

// ---- Numbers to tune (units of track, steps of 1/60 second) ----

/** The kart aims at a point this far ahead on the racing line, plus a little more the faster it goes. */
export const LOOK_AHEAD = 80;
const LOOK_AHEAD_PER_SPEED = 0.25; // extra units of look-ahead for every unit per second of speed

/** A kart or a banana further ahead than this is not taken into account. */
export const SEE_KARTS = 150;
export const SEE_BANANAS = 220;

/** How far to the side a kart or a banana may be and still count as "on the way". */
export const IN_THE_WAY = 34;

/** To overtake or to dodge, the kart aims this far to the side of the racing line. */
export const SIDE_STEP = 52;

/** A kart slower than this while it wants to go forwards is "not moving". */
const STUCK_SPEED = 25;

/** After this many steps of not moving, the kart counts as stuck (0.75 seconds). */
export const STUCK_STEPS = 45;

/** When stuck, the kart backs away for this many steps (0.8 seconds). */
export const RECOVER_STEPS = 48;

/** Steering: a difference of direction smaller than this is "straight on" (radians). */
const STRAIGHT_ENOUGH = 0.05;

/** "follow" always scores this much, so there is always something to do. */
export const FOLLOW_SCORE = 0.3;

// ---- The personalities ----

/**
 * The ways a computer kart can drive. A personality changes only how the
 * kart decides, never the kart itself: every kart has the same top speed.
 *   daring  0 to 1: how eagerly it overtakes, and how fast it takes bends
 *   care    0 to 1: how early it brakes and how eagerly it dodges bananas
 *   pace    how close to its top speed it drives on a straight (0.8 to 1)
 */
export const PERSONALITIES = Object.freeze(
  [
    { name: "Daredevil", daring: 0.95, care: 0.2, pace: 0.97 },
    { name: "Steady", daring: 0.5, care: 0.5, pace: 0.94 },
    { name: "Careful", daring: 0.2, care: 0.95, pace: 0.9 },
    { name: "Hunter", daring: 0.8, care: 0.4, pace: 0.92 },
    { name: "Smooth", daring: 0.6, care: 0.6, pace: 0.95 },
    { name: "Calm", daring: 0.35, care: 0.65, pace: 0.86 },
  ].map((personality) => Object.freeze(personality)),
);

/**
 * How each character of the cast (shared/cast.js) drives when the computer
 * drives it. The same character always drives the same way.
 */
export const PERSONALITY_OF_CHARACTER = Object.freeze({
  pcp: "Daredevil",
  dean: "Steady",
  ricardo: "Careful",
  cici: "Hunter",
  franfon: "Smooth",
  ro: "Calm",
});

/** The personality a character drives with, or null for an id that has none. */
export function personalityOf(characterId) {
  const name = Object.hasOwn(PERSONALITY_OF_CHARACTER, characterId) ? PERSONALITY_OF_CHARACTER[characterId] : null;
  return PERSONALITIES.find((personality) => personality.name === name) ?? null;
}

/** A new driver with a personality, before the race. "memory" is what it remembers from one step to the next. */
export function createComputerDriver(personality) {
  return { personality, memory: { segment: 0, stillSteps: 0, recoverSteps: 0 } };
}

// ---- 1. Look around ----

/**
 * What a computer kart sees, worked out from the race:
 *   track    the track
 *   racer    this computer kart's racer (race.js)
 *   memory   what it remembered from the step before
 *   line     the racing line: [{ x, y }]
 *   others   the other karts: [{ x, y }]
 *   bananas  the bananas on the road: [{ x, y }]
 *
 * Gives back { view, memory }. "view" has:
 *   speed, topSpeed  how fast the kart goes and can go, units per second
 *   target           the point on the racing line to aim at: { x, y }
 *   lineAngle        the direction the racing line runs here (radians)
 *   bend             the next bend: { turn, distance }. "turn" is how much the
 *                    road turns there (radians, 0 is straight on), "distance"
 *                    how far away it is
 *   kartAhead        the nearest kart in the way: { ahead, sideways }, or null
 *   bananaAhead      the nearest banana in the way: { ahead, sideways }, or null
 *   roomLeft, roomRight  whether there is road (not wall) to the side ahead
 *   stuck            whether the kart has not moved for a while
 *   recovering       whether the kart is still backing away
 */
export function lookAround(track, racer, memory, line, others, bananas, character) {
  const { kart } = racer;
  const speed = speedOf(kart);
  const segment = followSegment(line, memory.segment, kart);
  const from = line[segment];
  const to = line[(segment + 1) % line.length];
  const lineAngle = Math.atan2(to.y - from.y, to.x - from.x);
  const reach = LOOK_AHEAD + speed * LOOK_AHEAD_PER_SPEED;
  const target = pointAhead(line, segment, kart, reach);

  // The next bend is at the end of this stretch of the line.
  const after = line[(segment + 2) % line.length];
  const turn = Math.abs(angleBetween(lineAngle, Math.atan2(after.y - to.y, after.x - to.x)));
  const bend = { turn, distance: Math.hypot(to.x - kart.x, to.y - kart.y) };

  const kartAhead = nearestInTheWay(kart, others, SEE_KARTS);
  const bananaAhead = nearestInTheWay(kart, bananas, SEE_BANANAS);
  const roomLeft = isOpen(track, kart, 60, -SIDE_STEP);
  const roomRight = isOpen(track, kart, 60, SIDE_STEP);

  // Stuck: trying to go, but hardly moving, for a while. While backing away
  // the counting starts again from zero.
  const recoverSteps = Math.max(0, memory.recoverSteps - 1);
  const stillSteps = racer.spinSteps === 0 && speed < STUCK_SPEED && recoverSteps === 0 ? memory.stillSteps + 1 : 0;
  const stuck = stillSteps >= STUCK_STEPS;

  return {
    view: {
      speed,
      topSpeed: topSpeedOf(character),
      target,
      lineAngle,
      bend,
      kartAhead,
      bananaAhead,
      roomLeft,
      roomRight,
      stuck,
      recovering: recoverSteps > 0,
    },
    memory: { segment, stillSteps: stuck ? 0 : stillSteps, recoverSteps: stuck ? RECOVER_STEPS : recoverSteps },
  };
}

// ---- 2. Score every action ----

/**
 * Scores every action from 0 to 1 for this view and this personality:
 * { follow, brake, overtake, dodge, recover }. The highest one is done.
 */
export function scoreActions(view, personality) {
  const { daring, care } = personality;
  return {
    follow: FOLLOW_SCORE,
    brake: brakeScore(view, daring, care),
    overtake: overtakeScore(view, daring),
    dodge: dodgeScore(view, care),
    recover: view.stuck || view.recovering ? 1 : 0,
  };
}

/**
 * Brake: high when a sharp bend is close and the kart is faster than it may
 * take that bend. A daring driver allows itself more speed in a bend, a
 * careful one starts braking from further away.
 */
export function brakeScore(view, daring, care) {
  const tooFast = view.speed - bendSpeed(view, daring);
  if (tooFast <= 0) {
    return 0;
  }
  const brakingDistance = 40 + view.speed * (0.45 + 0.35 * care);
  if (view.bend.distance > brakingDistance) {
    return 0;
  }
  return clamp(tooFast / 120) * (0.6 + 0.4 * care);
}

/** The highest speed at which this driver takes the coming bend: lower for sharper bends. */
export function bendSpeed(view, daring) {
  const sharpness = clamp(view.bend.turn / Math.PI); // 0 straight on, 1 a full U-turn
  return view.topSpeed * (1 - sharpness * (1.05 - 0.35 * daring));
}

/**
 * Overtake: high when a kart is close in front and there is room beside it.
 * The closer it is, and the more daring the driver, the higher the score.
 */
export function overtakeScore(view, daring) {
  if (view.kartAhead === null || !overtakeSide(view)) {
    return 0;
  }
  return clamp(1 - view.kartAhead.ahead / SEE_KARTS) * (0.35 + 0.6 * daring);
}

/**
 * Dodge: high when a banana is on the way, and the closer the more urgent.
 * A careful driver dodges earlier.
 */
export function dodgeScore(view, care) {
  if (view.bananaAhead === null) {
    return 0;
  }
  return clamp(1 - view.bananaAhead.ahead / SEE_BANANAS) * (0.6 + 0.4 * care);
}

/** The action with the highest score. If two are equal, the first in the list wins. */
export function bestAction(scores) {
  let best = "follow";
  for (const [action, score] of Object.entries(scores)) {
    if (score > scores[best]) {
      best = action;
    }
  }
  return best;
}

// ---- 3 and 4. Choose, and press the keys ----

/**
 * The keys that carry out an action: { gas, brake, left, right }.
 *   follow    aim at the racing line, gas up to this driver's pace
 *   brake     aim at the racing line, brake
 *   overtake  aim beside the kart in front, on the side with room, full gas
 *   dodge     aim to the side away from the banana, gas
 *   recover   back away: brake (which reverses once stopped), steering the
 *             other way, so the nose turns towards the road
 */
export function keysFor(action, view, kart, personality) {
  if (action === "recover") {
    const { left, right } = steerTowards(kart, view.target);
    return { gas: false, brake: true, left: right, right: left };
  }
  let aim = view.target;
  if (action === "overtake") {
    aim = beside(view.target, view.lineAngle, overtakeSide(view) === "left" ? -SIDE_STEP : SIDE_STEP);
  } else if (action === "dodge") {
    const away = view.bananaAhead.sideways <= 0 ? SIDE_STEP : -SIDE_STEP; // banana on the left: go right
    aim = beside(view.target, view.lineAngle, away);
  }
  const steering = steerTowards(kart, aim);
  if (action === "brake") {
    return { gas: false, brake: true, ...steering };
  }
  const fullGas = action === "overtake";
  const gas = fullGas || view.speed < view.topSpeed * personality.pace;
  return { gas, brake: false, ...steering };
}

/**
 * One whole decision for one computer kart, for one step of the race:
 * look around, score, choose, and turn the choice into keys.
 * Gives back { keys, action, scores, driver }: the keys to press, the action
 * chosen and every score (to show or to test), and the driver with its
 * memory updated for the next step.
 */
export function decide(driver, track, racer, line, others, bananas, character) {
  const { view, memory } = lookAround(track, racer, driver.memory, line, others, bananas, character);
  const scores = scoreActions(view, driver.personality);
  const action = bestAction(scores);
  const keys = keysFor(action, view, racer.kart, driver.personality);
  return { keys, action, scores, driver: { ...driver, memory } };
}

// ---- Helpers: plain geometry ----

/**
 * Which stretch of the racing line the kart is on: the one from point
 * "segment" to the next. Only this stretch and the next one are looked at,
 * so a kart never jumps ahead to a stretch it has not reached, or back to one
 * behind it. That matters in the hairpin round the CTT Student Hall, where
 * the way in and the way out run side by side, with the turn between them.
 * Only a kart that is far from both, after a crash or a spin, looks along the
 * whole line for the nearest stretch.
 */
export function followSegment(line, segment, kart) {
  const count = line.length;
  let best = segment % count;
  let bestDistance = Infinity;
  for (let step = 0; step < 2; step++) {
    const index = (segment + step) % count;
    const distance = distanceToStretch(line[index], line[(index + 1) % count], kart);
    // A later stretch wins only when it is clearly nearer, so the kart does
    // not flip between two stretches at a corner.
    if (distance < bestDistance - (step === 0 ? 0 : 8)) {
      best = index;
      bestDistance = distance;
    }
  }
  if (bestDistance > 300) {
    for (let index = 0; index < count; index++) {
      const distance = distanceToStretch(line[index], line[(index + 1) % count], kart);
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    }
  }
  return best;
}

/** The point on the racing line "reach" units further along than the kart, starting from its stretch. */
function pointAhead(line, segment, kart, reach) {
  const count = line.length;
  let from = line[segment];
  let to = line[(segment + 1) % count];
  // Start from the spot on this stretch level with the kart.
  const share = shareAlong(from, to, kart);
  let x = from.x + (to.x - from.x) * share;
  let y = from.y + (to.y - from.y) * share;
  let left = reach;
  for (let step = 0; step < count; step++) {
    const rest = Math.hypot(to.x - x, to.y - y);
    if (rest >= left) {
      return { x: x + ((to.x - x) * left) / rest, y: y + ((to.y - y) * left) / rest };
    }
    left -= rest;
    x = to.x;
    y = to.y;
    from = to;
    to = line[(segment + step + 2) % count];
  }
  return { x, y };
}

/** How far along a stretch, from 0 (at "from") to 1 (at "to"), the spot level with the kart is. */
function shareAlong(from, to, spot) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  return length === 0 ? 0 : clamp(((spot.x - from.x) * dx + (spot.y - from.y) * dy) / length);
}

/** The shortest distance from a spot to a stretch of the line. */
function distanceToStretch(from, to, spot) {
  const share = shareAlong(from, to, spot);
  return Math.hypot(spot.x - (from.x + (to.x - from.x) * share), spot.y - (from.y + (to.y - from.y) * share));
}

/**
 * The nearest thing that is in the way of the kart: ahead of it, closer than
 * "range", and no further to the side than IN_THE_WAY. Gives
 * { ahead, sideways } (sideways: below 0 is to the left), or null.
 */
function nearestInTheWay(kart, things, range) {
  let nearest = null;
  for (const thing of things) {
    const { ahead, sideways } = relative(kart, thing);
    if (ahead > 0 && ahead < range && Math.abs(sideways) < IN_THE_WAY && (nearest === null || ahead < nearest.ahead)) {
      nearest = { ahead, sideways };
    }
  }
  return nearest;
}

/** Where a spot is, seen from the kart: how far ahead, and how far to the side (below 0 is left). */
function relative(kart, spot) {
  const dx = spot.x - kart.x;
  const dy = spot.y - kart.y;
  const cos = Math.cos(kart.angle);
  const sin = Math.sin(kart.angle);
  return { ahead: dx * cos + dy * sin, sideways: -dx * sin + dy * cos };
}

/** Whether the ground some way ahead and to the side of the kart is not wall. */
function isOpen(track, kart, ahead, sideways) {
  const cos = Math.cos(kart.angle);
  const sin = Math.sin(kart.angle);
  return tileKindAt(track, kart.x + ahead * cos - sideways * sin, kart.y + ahead * sin + sideways * cos) !== "wall";
}

/** Which side to overtake on: the side away from the kart in front, if there is room there, else the other side, else none. */
function overtakeSide(view) {
  if (view.kartAhead === null) {
    return null;
  }
  const preferLeft = view.kartAhead.sideways >= 0; // the kart in front is on the right: pass on the left
  if (preferLeft) {
    return view.roomLeft ? "left" : view.roomRight ? "right" : null;
  }
  return view.roomRight ? "right" : view.roomLeft ? "left" : null;
}

/** A spot moved to the side of a direction: below 0 to the left, above 0 to the right. */
function beside(spot, angle, sideways) {
  return { x: spot.x - Math.sin(angle) * sideways, y: spot.y + Math.cos(angle) * sideways };
}

/** Left or right, to point the kart at a spot. */
function steerTowards(kart, spot) {
  const turn = angleBetween(kart.angle, Math.atan2(spot.y - kart.y, spot.x - kart.x));
  return { left: turn < -STRAIGHT_ENOUGH, right: turn > STRAIGHT_ENOUGH };
}

/** How much to turn from one direction to another, from -pi to pi (below 0 is to the left). */
function angleBetween(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function clamp(value) {
  return Math.min(1, Math.max(0, value));
}
