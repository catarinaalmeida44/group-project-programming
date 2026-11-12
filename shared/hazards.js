// Bananas: peels on the road that make a kart spin out.
//
// From time to time during a race a banana peel appears on the road. A kart
// that drives over one spins out: for a little over a second its keys do
// nothing and it slows down quickly, sliding the way it was going. The
// banana is gone after that. (How a spinning kart moves is in race.js and
// physics.js. This file decides where the bananas are and who hit one.)
//
// The browser and the server both use this file, so a practice race and an
// online race have bananas by exactly the same rules.
//
// WHERE A BANANA MAY APPEAR
// Always in the middle of a square of the track, and only on a square that
//   - is road,
//   - is not next to a wall, not even at a corner: every square around it
//     is open ground, so there is always room to drive past on both sides,
//   - is more than a few squares away from the finish line,
//   - is not on the starting grid or close to it.
// And at the moment it appears it is
//   - not near any kart, so it never pops up under a kart or right in
//     front of one,
//   - not near another banana. The gap is wider than the road, so two
//     bananas can never stand side by side and close the road.
//
// WHEN
// The first banana appears a few seconds after GO, and then one every few
// seconds until the track has as many as it may have. A bigger track may
// have more. A track that is too small gets none at all. A banana stays
// where it is until a kart hits it.
//
// CHANCE WITHOUT DICE
// Where the next banana appears, and how long it takes, should be a
// surprise. But these rules never roll real dice (Math.random). If they
// did, a race could not be tested, and the server could not be checked.
// Instead they use a small recipe that turns one whole number into the next
// one, and into a fraction that looks random (see nextRandom). That number
// is kept with the race, in the "banana maker". Whoever starts a race picks
// the first number, called the "seed". The same seed and the same driving
// always give the same bananas.
//
// NO SEED, NO BANANAS
// A race that was given no seed has no banana maker (null) and no bananas.
// The online rooms always get a seed (server/online.js). The practice page
// gives one too.

import { STEP_SECONDS } from "./physics.js";
import { tileKindAt } from "./track.js";
import { KART_RADIUS } from "./race.js";
import { gridSpot, GRID_PLACES } from "./grid.js";

// ---------------------------------------------------------------------------
// NUMBERS TO TUNE BY PLAYTESTING
// Times are in steps of the game: 60 steps are one second.
// Distances are in units: one square of the real tracks is 32 units.
// ---------------------------------------------------------------------------

/** A banana is a circle this many units from the middle to the edge. A kart hits it when the two circles touch. */
export const BANANA_RADIUS = 8;

/** A spin lasts this many steps: 1.2 seconds. */
export const SPIN_STEPS = Math.round(1.2 / STEP_SECONDS);

/** After a spin ends, the kart cannot be spun again for this many steps: 1 second. */
export const SPIN_SHIELD_STEPS = Math.round(1 / STEP_SECONDS);

/** The first banana appears this many steps after GO: 4 seconds. */
export const FIRST_BANANA_STEPS = Math.round(4 / STEP_SECONDS);

/** After that, the wait for the next banana is between these two: 2 to 5 seconds. */
export const BANANA_WAIT_SHORTEST_STEPS = Math.round(2 / STEP_SECONDS);
export const BANANA_WAIT_LONGEST_STEPS = Math.round(5 / STEP_SECONDS);

/** A track may have one banana for every this many squares where a banana may appear. Fewer squares than this: no bananas. */
export const SQUARES_PER_BANANA = 32;

/** No track ever has more bananas than this at once, however big it is. */
export const MOST_BANANAS = 12;

/** No banana on the finish line or within this many squares of it. */
export const BANANA_SQUARES_FROM_LINE = 3;

/** No banana closer than this to any place on the starting grid. */
export const BANANA_SAFE_FROM_GRID = 64;

/** A banana never appears closer than this to a kart. At top speed that is a bit more than half a second of driving. */
export const BANANA_SAFE_FROM_KART = 192;

/** A banana never appears closer than this to another banana. The road is 128 units wide, so two can never close it. */
export const BANANA_GAP = 160;

// ---------------------------------------------------------------------------

/** How many different seeds there are: the whole numbers from 0 up to one less than this. */
export const SEED_COUNT = 2 ** 32;

/**
 * The recipe that stands in for dice. It is known as "mulberry32".
 *
 * It takes a whole number (the state) and gives { state, value }:
 *   state   the next whole number, to give to the next call
 *   value   a fraction from 0 up to, but never reaching, 1
 *
 * The fractions look random, but the same state always gives the same
 * answer. The odd-looking steps (multiplying, shifting, mixing) only stir
 * the digits of the number thoroughly. Nothing here is secret.
 */
export function nextRandom(state) {
  const next = (state + 0x6d2b79f5) >>> 0; // ">>> 0" keeps it a whole number below 2 to the power 32
  let stirred = next;
  stirred = Math.imul(stirred ^ (stirred >>> 15), stirred | 1);
  stirred ^= stirred + Math.imul(stirred ^ (stirred >>> 7), stirred | 61);
  return { state: next, value: ((stirred ^ (stirred >>> 14)) >>> 0) / SEED_COUNT };
}

/**
 * The banana maker of a race at GO: what decides when and where the next
 * banana appears.
 *
 *   random       the number the stand-in for dice is at (it starts as the seed)
 *   nextId       the number the next banana gets. Every banana of a race has its own
 *   stepsToNext  how many steps until the next banana appears
 *
 * It refuses a seed that is not a whole number from 0 up to one less than
 * SEED_COUNT, by stopping with an error.
 */
export function createBananaMaker(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed >= SEED_COUNT) {
    throw new RangeError("createBananaMaker: the seed must be a whole number from 0 to 4294967295");
  }
  return { random: seed, nextId: 1, stepsToNext: FIRST_BANANA_STEPS };
}

/**
 * Every square of a track where a banana may ever appear, as a list of
 * { x, y }: the middle of each square, in units. (The four rules that only
 * depend on the track, from the top of this file.)
 */
export function bananaSquares(track) {
  const size = track.tileSize;
  const grid = [];
  for (let place = 0; place < GRID_PLACES; place++) {
    grid.push(gridSpot(track, place));
  }

  const squares = [];
  for (let row = 0; row < track.rows; row++) {
    for (let column = 0; column < track.columns; column++) {
      const x = (column + 0.5) * size;
      const y = (row + 0.5) * size;
      if (hasRoomToPass(track, x, y) && !isNearFinishLine(track, x, y) && !isNear(grid, x, y, BANANA_SAFE_FROM_GRID)) {
        squares.push({ x, y });
      }
    }
  }
  return squares;
}

/** Is the square around this spot road, with open ground (road or grass) on every side and at every corner? */
function hasRoomToPass(track, x, y) {
  if (tileKindAt(track, x, y) !== "road") {
    return false;
  }
  const size = track.tileSize;
  for (const down of [-1, 0, 1]) {
    for (const across of [-1, 0, 1]) {
      if (tileKindAt(track, x + across * size, y + down * size) === "wall") {
        return false;
      }
    }
  }
  return true;
}

/** Is this spot on the finish line, or within a few squares of it in any direction? */
function isNearFinishLine(track, x, y) {
  const line = track.checkpoints[0];
  const margin = BANANA_SQUARES_FROM_LINE * track.tileSize;
  return x > line.left - margin && x < line.right + margin && y > line.top - margin && y < line.bottom + margin;
}

/** Is this spot closer than "distance" to any of the things in the list? Each thing has an x and a y. */
function isNear(things, x, y, distance) {
  return things.some((thing) => Math.hypot(thing.x - x, thing.y - y) < distance);
}

/** How many bananas a track may have at once. It grows with the track, and a track that is too small gets none. */
export function mostBananas(track) {
  return Math.min(MOST_BANANAS, Math.floor(bananaSquares(track).length / SQUARES_PER_BANANA));
}

/**
 * The bananas one step later: counts down to the next banana and, when the
 * wait is over, adds one if there is room for it.
 *
 *   maker    the banana maker (see createBananaMaker)
 *   bananas  the bananas on the road now: [{ id, x, y }]
 *   karts    the karts on the track now. A new banana keeps away from them
 *
 * Gives { maker, bananas }. Nothing it was given is changed. When the wait
 * is over but the track is full, or no square is free, no banana appears
 * and the next wait begins.
 */
export function addBananas(track, maker, bananas, karts) {
  if (maker.stepsToNext > 1) {
    return { maker: { ...maker, stepsToNext: maker.stepsToNext - 1 }, bananas };
  }

  // The wait is over. First draw how long the next wait will be.
  const waitDraw = nextRandom(maker.random);
  const longestExtra = BANANA_WAIT_LONGEST_STEPS - BANANA_WAIT_SHORTEST_STEPS;
  const stepsToNext = BANANA_WAIT_SHORTEST_STEPS + Math.floor(waitDraw.value * (longestExtra + 1));

  const freeSquares =
    bananas.length < mostBananas(track)
      ? bananaSquares(track).filter(
          ({ x, y }) => !isNear(karts, x, y, BANANA_SAFE_FROM_KART) && !isNear(bananas, x, y, BANANA_GAP),
        )
      : [];
  if (freeSquares.length === 0) {
    return { maker: { ...maker, random: waitDraw.state, stepsToNext }, bananas };
  }

  // Then draw which of the free squares gets the banana.
  const squareDraw = nextRandom(waitDraw.state);
  const { x, y } = freeSquares[Math.floor(squareDraw.value * freeSquares.length)];
  return {
    maker: { random: squareDraw.state, nextId: maker.nextId + 1, stepsToNext },
    bananas: [...bananas, { id: maker.nextId, x, y }],
  };
}

/** Can this racer be spun now? Not while it is spinning, and not for a short moment after. */
export function canBeSpun(racer) {
  return !(racer.spinShieldSteps > 0);
}

/**
 * Finds which racers hit which bananas: [{ racer, banana }].
 *   racer    where the racer is in the list given (0 is the first)
 *   banana   the id of the banana
 * A racer hits a banana when the circle of its kart touches the circle of
 * the banana. A racer that cannot be spun now hits nothing: it slides over
 * the banana, and the banana stays for the next kart.
 */
export function bananaHits(bananas, racers) {
  const hits = [];
  racers.forEach((racer, index) => {
    if (!canBeSpun(racer)) {
      return;
    }
    for (const banana of bananas) {
      if (Math.hypot(banana.x - racer.kart.x, banana.y - racer.kart.y) < KART_RADIUS + BANANA_RADIUS) {
        hits.push({ racer: index, banana: banana.id });
      }
    }
  });
  return hits;
}

/**
 * Makes a racer spin out, and gives back the new racer.
 * Its kart, its laps and its clock are left as they are. Only the two spin
 * counters change (see createRacer in race.js). A racer that cannot be spun
 * now is given back as it was: a spin is never made longer or started over.
 */
export function spinOut(racer) {
  if (!canBeSpun(racer)) {
    return racer;
  }
  return { ...racer, spinSteps: SPIN_STEPS, spinShieldSteps: SPIN_STEPS + SPIN_SHIELD_STEPS };
}

/**
 * One step of the bananas of a race, from GO on. Call it after the racers
 * have been moved.
 *   1. Every racer that touches a banana spins out, and that banana is gone.
 *      Two racers that touch the same banana in the same step both spin.
 *   2. The banana maker counts down, and now and then adds a new banana.
 *
 *   bananas  the bananas on the road: [{ id, x, y }]
 *   maker    the banana maker (see createBananaMaker), or null for a race
 *            without bananas: then nothing happens here at all
 *   racers   the racers whose karts are on the track
 *
 * Gives { bananas, maker, racers }, with the racers in the same order.
 * Nothing it was given is changed.
 */
export function stepBananas(track, bananas, maker, racers) {
  if (maker === null) {
    return { bananas, maker, racers };
  }
  const hits = bananaHits(bananas, racers);
  const racersAfter =
    hits.length === 0
      ? racers
      : racers.map((racer, index) => (hits.some((hit) => hit.racer === index) ? spinOut(racer) : racer));
  const bananasLeft =
    hits.length === 0 ? bananas : bananas.filter((banana) => !hits.some((hit) => hit.banana === banana.id));

  const grown = addBananas(
    track,
    maker,
    bananasLeft,
    racersAfter.map((racer) => racer.kart),
  );
  return { bananas: grown.bananas, maker: grown.maker, racers: racersAfter };
}
