// Karts bumping into each other.
//
// For bumps, every kart is a circle. When the circles of two karts overlap,
// two things happen. Both happen along the straight line between the middles
// of the two karts:
//
//   1. PUSHED APART   each kart is moved away from the other along that
//                     line, until the two circles only just touch.
//   2. SPEED PASSED ON the part of each kart's speed that goes along that
//                     line is passed to the other kart, with some of it
//                     lost. The part that goes across the line is kept.
//
// So a kart that is hit from behind is shoved forward, and the kart behind
// it is slowed. A side swipe pushes both karts sideways and costs hardly any
// forward speed. Two karts that meet head-on are both sent back.
//
// Nothing is created by a bump: afterwards the two karts together never move
// faster than before. The direction a kart points is not changed. Laps and
// race clocks are not touched: this file only ever sees karts.
//
// After the pushing, the wall rule (track.js) is applied again, so a bump
// can never leave a kart inside a wall.
//
// WHO GOES FIRST WHEN SEVERAL KARTS OVERLAP?
// The pair that overlaps the MOST, whoever is in it. The order of the list
// makes no difference, so joining a room early or late gives no advantage.
//
// WEIGHT
// For now every kart weighs the same. bumpKarts() can already be given a
// weight for each kart, so that heavy and light drivers can be added later:
// the heavier kart of a pair is moved less and keeps more of its speed.

import { bounceOffWalls } from "./track.js";
import { KART_RADIUS } from "./race.js";

// ---------------------------------------------------------------------------
// NUMBERS TO TUNE BY PLAYTESTING
// ---------------------------------------------------------------------------

/** For bumps, a kart is a circle this many units from the middle to the edge. The same as for walls. */
export const KART_BUMP_RADIUS = 10;

/**
 * How bouncy a bump is. After a bump, two karts move apart at this share of
 * the speed they came together with. 0 would be no bounce at all (they stay
 * together), 1 would be a full swap of speeds (nothing lost).
 */
export const BUMP_BOUNCE = 0.5;

// ---------------------------------------------------------------------------

/** The weight of a kart when none is given. Only weights compared with each other matter. */
const EQUAL_WEIGHT = 1;

// Pushing one pair apart can push one of them into a third kart, or into a
// wall. So we look again: up to this many pairs, then the walls, and that
// whole round up to this many times. What is still overlapping after that is
// sorted out in the next step of the game, a sixtieth of a second later.
const PAIRS_PER_ROUND = 16;
const ROUNDS = 3;

/** An overlap smaller than this (a millionth of a unit) is a rounding error, not a bump. */
const OVERLAP_TOO_SMALL = 0.000001;

/**
 * Lets all the karts on a track bump into each other, and gives back the
 * karts afterwards, in the same order.
 *
 *   track    the track they are on, for its walls
 *   karts    the list of karts (see physics.js for what a kart is)
 *   weights  how heavy each kart is, in the same order. Left out, or with
 *            gaps, a kart weighs 1, the same as everyone else
 *
 * The list and the karts given are not changed: new ones are made. A kart
 * that touches nobody is given back as it was. The same karts always give
 * the same result.
 *
 * It refuses a weight that is not a number above zero, by stopping with an
 * error.
 */
export function bumpKarts(track, karts, weights = []) {
  karts.forEach((kart, index) => weightOf(weights, index)); // refuses a bad weight before anything moves

  let now = karts;
  for (let round = 0; round < ROUNDS; round++) {
    const apart = pushApart(now, weights);
    if (apart === now) {
      break; // nobody touches anybody
    }
    // The walls win: a kart pushed into a wall is pushed back out of it.
    now = apart.map((kart) => bounceOffWalls(track, kart, KART_RADIUS));
  }
  return now;
}

/** Handles the overlapping pairs one at a time, deepest first. Gives back the same list if nobody overlaps. */
function pushApart(karts, weights) {
  let now = karts;
  for (let pair = 0; pair < PAIRS_PER_ROUND; pair++) {
    const touch = deepestTouch(now);
    if (touch === null) {
      break;
    }
    now = settle(now, touch, weights);
  }
  return now;
}

/**
 * Finds the two karts whose circles overlap the most.
 * Gives { first, second, lineX, lineY, overlap }:
 *   first, second   where the two karts are in the list
 *   lineX, lineY    the direction from the first kart to the second
 *   overlap         how far the circles are inside each other
 * Gives null if no two karts overlap.
 */
function deepestTouch(karts) {
  let deepest = null;
  for (let first = 0; first < karts.length; first++) {
    for (let second = first + 1; second < karts.length; second++) {
      const acrossX = karts[second].x - karts[first].x;
      const acrossY = karts[second].y - karts[first].y;
      const distance = Math.hypot(acrossX, acrossY);
      const overlap = 2 * KART_BUMP_RADIUS - distance;
      if (!(overlap > OVERLAP_TOO_SMALL)) {
        continue; // not touching (or a position is not a number)
      }
      if (deepest !== null && overlap <= deepest.overlap) {
        continue;
      }
      if (distance > 0) {
        deepest = { first, second, lineX: acrossX / distance, lineY: acrossY / distance, overlap };
      } else {
        // Two karts on exactly the same spot: there is no line between them
        // to push along. This cannot happen while driving. It is a safety
        // net, so that dividing by a distance of zero never happens: push
        // them apart sideways on the map.
        deepest = { first, second, lineX: 1, lineY: 0, overlap };
      }
    }
  }
  return deepest;
}

/** Pushes one overlapping pair apart and passes on their speed along the line. Gives back a new list. */
function settle(karts, touch, weights) {
  const { first, second, lineX, lineY, overlap } = touch;
  const a = karts[first];
  const b = karts[second];

  // The lighter kart takes the bigger share of every push. With equal
  // weights each takes half.
  const weightA = weightOf(weights, first);
  const weightB = weightOf(weights, second);
  const shareA = weightB / (weightA + weightB);
  const shareB = weightA / (weightA + weightB);

  // "closing" is how fast the karts are moving towards each other along the
  // line. Karts that are already moving apart keep their speeds.
  const closing = (a.vx - b.vx) * lineX + (a.vy - b.vy) * lineY;
  const passedOn = closing > 0 ? (1 + BUMP_BOUNCE) * closing : 0;

  const after = [...karts];
  after[first] = {
    ...a,
    x: a.x - lineX * overlap * shareA,
    y: a.y - lineY * overlap * shareA,
    vx: a.vx - lineX * passedOn * shareA,
    vy: a.vy - lineY * passedOn * shareA,
  };
  after[second] = {
    ...b,
    x: b.x + lineX * overlap * shareB,
    y: b.y + lineY * overlap * shareB,
    vx: b.vx + lineX * passedOn * shareB,
    vy: b.vy + lineY * passedOn * shareB,
  };
  return after;
}

/** The weight of the kart at a place in the list: 1 unless the list of weights says otherwise. */
function weightOf(weights, index) {
  const weight = weights[index] ?? EQUAL_WEIGHT;
  if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) {
    throw new RangeError("bumpKarts: a weight must be a number above zero");
  }
  return weight;
}
