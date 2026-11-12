// Tests for the bananas: shared/hazards.js (where and when a banana
// appears, who hits one), the spin in shared/race.js and shared/physics.js,
// and the practice race in shared/countdown.js that carries them.
// (The bananas of an online room are tested in room-bananas.test.js.)
//
// Many of these tests place a kart or a banana by hand. That is the easiest
// way to try the things that must NOT happen.

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  BANANA_RADIUS,
  SPIN_STEPS,
  SPIN_SHIELD_STEPS,
  FIRST_BANANA_STEPS,
  BANANA_WAIT_SHORTEST_STEPS,
  BANANA_WAIT_LONGEST_STEPS,
  SQUARES_PER_BANANA,
  MOST_BANANAS,
  BANANA_SQUARES_FROM_LINE,
  BANANA_SAFE_FROM_GRID,
  BANANA_SAFE_FROM_KART,
  BANANA_GAP,
  SEED_COUNT,
  nextRandom,
  createBananaMaker,
  bananaSquares,
  mostBananas,
  addBananas,
  canBeSpun,
  bananaHits,
  spinOut,
  stepBananas,
} from "../shared/hazards.js";
import { createRacer, stepRacer, KART_RADIUS } from "../shared/race.js";
import { createKart, slideKart, speedOf, stepKart, topSpeedOf, STEP_SECONDS } from "../shared/physics.js";
import { createTrack, tileKindAt, isInsideCheckpoint } from "../shared/track.js";
import { nextCheckpoint } from "../shared/laps.js";
import { gridSpot } from "../shared/grid.js";
import { createCountdownRace, stepCountdownRace, COUNTDOWN_STEPS } from "../shared/countdown.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { ROAD } from "../shared/surfaces.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { CAMPUS_LOOP } from "../shared/tracks/campus-loop.js";
import { smallTrackDescription } from "./small-track.js";
import { createSprintTrack } from "./sprint-track.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const REAL_TRACKS = [TEST_OVAL, CAMPUS_LOOP];
const HIT_DISTANCE = KART_RADIUS + BANANA_RADIUS; // closer than this, a kart touches a banana
const GAS = { gas: true, brake: false, left: false, right: false };
const NO_KEYS = { gas: false, brake: false, left: false, right: false };

/** How far apart two things with an x and a y are. */
function gap(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** A racer on the test oval at a position, with a speed, pointing along "angle". */
function racerAt(x, y, vx = 0, vy = 0, angle = 0) {
  return { ...createRacer(TEST_OVAL), kart: { ...createKart(x, y, angle), vx, vy } };
}

/** A banana maker that will not add a banana for a very long time, for tests that place bananas by hand. */
function quietMaker() {
  return { ...createBananaMaker(1), stepsToNext: 1000000 };
}

/**
 * Lets the banana maker run for a number of steps. "kartsAt(step)" says where
 * the karts are at each step (nowhere, if left out). Gives { maker, bananas,
 * appeared }: "appeared" lists each new banana with the step it appeared at
 * and the karts and bananas that were there at that moment.
 */
function grow(track, seed, steps, kartsAt = () => []) {
  let maker = createBananaMaker(seed);
  let bananas = [];
  const appeared = [];
  for (let step = 1; step <= steps; step++) {
    const karts = kartsAt(step);
    const before = bananas;
    ({ maker, bananas } = addBananas(track, maker, bananas, karts));
    if (bananas.length > before.length) {
      appeared.push({ step, banana: bananas[bananas.length - 1], karts, others: before });
    }
  }
  return { maker, bananas, appeared };
}

// ---- The stand-in for dice ----

describe("the stand-in for dice", () => {
  it("gives a fraction from 0 up to, but never reaching, 1, and a whole number to go on with", () => {
    let state = 12345;
    for (let draw = 0; draw < 5000; draw++) {
      const result = nextRandom(state);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThan(1);
      expect(Number.isInteger(result.state)).toBe(true);
      expect(result.state).toBeGreaterThanOrEqual(0);
      expect(result.state).toBeLessThan(SEED_COUNT);
      state = result.state;
    }
  });

  it("gives the same answer every time for the same number", () => {
    for (const state of [0, 1, 42, 123456789, SEED_COUNT - 1]) {
      expect(nextRandom(state)).toEqual(nextRandom(state));
    }
  });

  it("gives these exact fractions for the seeds 0, 1 and the biggest one, on every computer", () => {
    // If these change, the same seed no longer gives the same bananas as before.
    expect(nextRandom(0).value).toBe(0.26642920868471265);
    expect(nextRandom(1).value).toBe(0.6270739405881613);
    expect(nextRandom(SEED_COUNT - 1).value).toBe(0.8964226141106337);
    expect(nextRandom(nextRandom(1).state).value).toBe(0.002735721180215478);
  });

  it("spreads its fractions evenly between 0 and 1", () => {
    const tenths = new Array(10).fill(0);
    let state = 2026;
    for (let draw = 0; draw < 10000; draw++) {
      const result = nextRandom(state);
      tenths[Math.floor(result.value * 10)]++;
      state = result.state;
    }
    for (const count of tenths) {
      expect(count).toBeGreaterThan(850); // an even spread would be 1000 each
      expect(count).toBeLessThan(1150);
    }
  });

  it("gives very different fractions for seeds that are next to each other", () => {
    const fractions = new Set();
    for (let seed = 0; seed < 1000; seed++) {
      fractions.add(nextRandom(seed).value);
    }
    expect(fractions.size).toBe(1000);
  });

  it("never rolls real dice: nothing in the banana rules uses Math.random", () => {
    const dice = vi.spyOn(Math, "random");
    grow(TEST_OVAL, 7, 60 * 30, () => [createKart(432, 62)]);
    let race = createCountdownRace(TEST_OVAL, 7);
    for (let step = 0; step < 600; step++) {
      race = stepCountdownRace(TEST_OVAL, race, GAS, TEST_DRIVER);
    }
    stepBananas(TEST_OVAL, [{ id: 1, x: 300, y: 80 }], quietMaker(), [racerAt(300, 80, 200, 0)]);
    expect(dice).not.toHaveBeenCalled();
  });
});

describe("the banana maker at the start of a race", () => {
  it("starts from the seed, with banana number 1 next, a few seconds away", () => {
    expect(createBananaMaker(77)).toEqual({ random: 77, nextId: 1, stepsToNext: FIRST_BANANA_STEPS });
    expect(FIRST_BANANA_STEPS).toBe(240); // 4 seconds
  });

  it("accepts the smallest and the biggest seed", () => {
    expect(createBananaMaker(0).random).toBe(0);
    expect(createBananaMaker(SEED_COUNT - 1).random).toBe(SEED_COUNT - 1);
  });

  it("refuses a seed that is not a whole number from 0 to 4294967295", () => {
    for (const seed of [-1, 1.5, NaN, Infinity, SEED_COUNT, "7", null, undefined, {}]) {
      expect(() => createBananaMaker(seed), String(seed)).toThrow(RangeError);
    }
  });
});

// ---- Where a banana may appear ----

describe("the squares where a banana may appear", () => {
  for (const track of REAL_TRACKS) {
    const size = track.tileSize;
    const squares = bananaSquares(track);

    it(`${track.name}: are all road, and each spot is the middle of its square`, () => {
      expect(squares.length).toBeGreaterThan(100);
      for (const { x, y } of squares) {
        expect(tileKindAt(track, x, y)).toBe("road");
        expect((x / size) % 1).toBe(0.5);
        expect((y / size) % 1).toBe(0.5);
      }
    });

    it(`${track.name}: are never on grass and never in a wall`, () => {
      for (const { x, y } of squares) {
        expect(tileKindAt(track, x, y)).not.toBe("grass");
        expect(tileKindAt(track, x, y)).not.toBe("wall");
      }
    });

    it(`${track.name}: are never next to a wall, not even at a corner, so a kart can pass on both sides`, () => {
      for (const { x, y } of squares) {
        for (const down of [-1, 0, 1]) {
          for (const across of [-1, 0, 1]) {
            expect(tileKindAt(track, x + across * size, y + down * size)).not.toBe("wall");
          }
        }
        // On each side there is a lane where a kart touches neither the banana nor a wall.
        for (const [sideX, sideY] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const laneX = x + sideX * (HIT_DISTANCE + 1);
          const laneY = y + sideY * (HIT_DISTANCE + 1);
          expect(tileKindAt(track, laneX + sideX * KART_RADIUS, laneY + sideY * KART_RADIUS)).not.toBe("wall");
        }
      }
    });

    it(`${track.name}: are never on the finish line or within a few squares of it`, () => {
      const line = track.checkpoints[0];
      const margin = BANANA_SQUARES_FROM_LINE * size;
      for (const { x, y } of squares) {
        expect(isInsideCheckpoint(track, 0, x, y)).toBe(false);
        const besideTheLine = x > line.left - margin && x < line.right + margin;
        const levelWithTheLine = y > line.top - margin && y < line.bottom + margin;
        expect(besideTheLine && levelWithTheLine).toBe(false);
      }
    });

    it(`${track.name}: are never on the starting grid or close to it`, () => {
      for (let place = 0; place < 8; place++) {
        const spot = gridSpot(track, place);
        for (const square of squares) {
          expect(gap(spot, square)).toBeGreaterThanOrEqual(BANANA_SAFE_FROM_GRID);
          expect(gap(spot, square)).toBeGreaterThan(HIT_DISTANCE); // a kart on the grid never touches a banana
        }
      }
    });

    it(`${track.name}: are the same list every time, and working them out does not change the track`, () => {
      const before = JSON.stringify(track);
      expect(bananaSquares(track)).toEqual(squares);
      expect(JSON.stringify(track)).toBe(before);
    });
  }

  it("leave a wide ring around the finish line and the grid of the test oval", () => {
    expect(BANANA_SQUARES_FROM_LINE).toBeGreaterThanOrEqual(2);
    const line = TEST_OVAL.checkpoints[0];
    const onTopStraight = bananaSquares(TEST_OVAL).filter(({ y }) => y < 192);
    for (const { x } of onTopStraight) {
      const pastTheLine = x > line.right + 2 * 32;
      const wellBehindTheGrid = x < gridSpot(TEST_OVAL, 7).x - 32;
      expect(pastTheLine || wellBehindTheGrid).toBe(true);
    }
  });
});

describe("how many bananas a track may have", () => {
  it("is one for every so many squares where a banana may appear", () => {
    expect(mostBananas(TEST_OVAL)).toBe(Math.floor(bananaSquares(TEST_OVAL).length / SQUARES_PER_BANANA));
  });

  it("is about 4 to 6 on the test oval", () => {
    expect(mostBananas(TEST_OVAL)).toBeGreaterThanOrEqual(4);
    expect(mostBananas(TEST_OVAL)).toBeLessThanOrEqual(6);
  });

  it("is more on the campus loop, which is bigger, but never more than the limit", () => {
    expect(mostBananas(CAMPUS_LOOP)).toBeGreaterThan(mostBananas(TEST_OVAL));
    expect(mostBananas(CAMPUS_LOOP)).toBeLessThanOrEqual(MOST_BANANAS);
  });

  it("is none on a track that is too small: the sprint track and the small test track", () => {
    expect(mostBananas(createSprintTrack())).toBe(0);
    expect(mostBananas(createTrack(smallTrackDescription()))).toBe(0);
    // The sprint track has fewer road squares than one banana needs, whatever the other rules say.
    const roadSquares = createSprintTrack().map.join("").split(".").length - 1;
    expect(roadSquares).toBeLessThan(SQUARES_PER_BANANA);
  });
});

// ---- When and where bananas appear ----

describe("when a banana appears", () => {
  it("is never before the first wait is over, and then at once", () => {
    const early = grow(TEST_OVAL, 3, FIRST_BANANA_STEPS - 1);
    expect(early.bananas).toEqual([]);
    const onTime = grow(TEST_OVAL, 3, FIRST_BANANA_STEPS);
    expect(onTime.bananas).toHaveLength(1);
    expect(onTime.appeared[0].step).toBe(FIRST_BANANA_STEPS);
  });

  it("is then every few seconds: never sooner than the shortest wait, never later than the longest", () => {
    expect(BANANA_WAIT_SHORTEST_STEPS).toBe(120);
    expect(BANANA_WAIT_LONGEST_STEPS).toBe(300);
    const waits = new Set();
    for (let seed = 0; seed < 40; seed++) {
      const { appeared } = grow(TEST_OVAL, seed, 60 * 30);
      for (let number = 1; number < appeared.length; number++) {
        const wait = appeared[number].step - appeared[number - 1].step;
        expect(wait).toBeGreaterThanOrEqual(BANANA_WAIT_SHORTEST_STEPS);
        expect(wait).toBeLessThanOrEqual(BANANA_WAIT_LONGEST_STEPS);
        waits.add(wait);
      }
    }
    expect(waits.size).toBeGreaterThan(20); // and the waits really differ
  });

  it("stops when the track has as many as it may have, however long the race goes on", () => {
    for (let seed = 0; seed < 20; seed++) {
      const { bananas } = grow(TEST_OVAL, seed, 60 * 120);
      expect(bananas).toHaveLength(mostBananas(TEST_OVAL));
    }
    expect(grow(CAMPUS_LOOP, 5, 60 * 180).bananas).toHaveLength(mostBananas(CAMPUS_LOOP));
  });

  it("starts again when a banana has gone, with a number that was never used before", () => {
    const full = grow(TEST_OVAL, 11, 60 * 60);
    const most = mostBananas(TEST_OVAL);
    expect(full.bananas.map((banana) => banana.id)).toEqual([1, 2, 3, 4, 5].slice(0, most));

    // A kart ate banana 2.
    let maker = full.maker;
    let bananas = full.bananas.filter((banana) => banana.id !== 2);
    for (let step = 0; step < BANANA_WAIT_LONGEST_STEPS && bananas.length < most; step++) {
      ({ maker, bananas } = addBananas(TEST_OVAL, maker, bananas, []));
    }
    expect(bananas).toHaveLength(most);
    expect(bananas[most - 1].id).toBe(most + 1);
  });

  it("leaves every banana exactly where it is until a kart hits it", () => {
    let { maker, bananas } = grow(TEST_OVAL, 4, FIRST_BANANA_STEPS);
    const first = bananas[0];
    for (let step = 0; step < 60 * 60; step++) {
      ({ maker, bananas } = addBananas(TEST_OVAL, maker, bananas, []));
      expect(bananas[0]).toBe(first);
    }
  });

  it("never happens on a track that is too small, however long the race and whatever the seed", () => {
    const sprint = createSprintTrack();
    for (let seed = 0; seed < 50; seed++) {
      expect(grow(sprint, seed, 60 * 60).bananas).toEqual([]);
    }
  });
});

describe("where a banana appears", () => {
  // Eight karts that move round the oval, so that the bananas have to keep away from them.
  function eightKartsAt(step) {
    const karts = [];
    for (let kart = 0; kart < 8; kart++) {
      const along = ((step * 4 + kart * 300) % 1600) / 1600; // from 0 to 1 along the top or the bottom straight
      karts.push(createKart(96 + along * 768, kart % 2 === 0 ? 96 : 480));
    }
    return karts;
  }

  it("is always one of the squares where a banana may appear: on the road, never on grass, in a wall or on the grid", () => {
    for (const track of REAL_TRACKS) {
      const allowed = new Set(bananaSquares(track).map(({ x, y }) => `${x},${y}`));
      for (let seed = 0; seed < 30; seed++) {
        const { appeared } = grow(track, seed, 60 * 60);
        expect(appeared.length).toBeGreaterThanOrEqual(mostBananas(track));
        for (const { banana } of appeared) {
          expect(allowed.has(`${banana.x},${banana.y}`)).toBe(true);
          expect(tileKindAt(track, banana.x, banana.y)).toBe("road");
          for (let place = 0; place < 8; place++) {
            expect(gap(banana, gridSpot(track, place))).toBeGreaterThan(HIT_DISTANCE);
          }
        }
      }
    }
  });

  it("is never on top of a kart, nor within the safe distance of one, at the moment it appears", () => {
    expect(BANANA_SAFE_FROM_KART).toBeGreaterThan(HIT_DISTANCE);
    let seen = 0;
    for (let seed = 0; seed < 60; seed++) {
      const { appeared } = grow(TEST_OVAL, seed, 60 * 40, eightKartsAt);
      for (const { banana, karts } of appeared) {
        for (const kart of karts) {
          expect(gap(banana, kart)).toBeGreaterThanOrEqual(BANANA_SAFE_FROM_KART);
        }
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it("is never on top of another banana, nor close enough to close the road together with it", () => {
    expect(BANANA_GAP).toBeGreaterThan(4 * 32); // wider than the road, which is 4 squares of 32 units
    for (const track of REAL_TRACKS) {
      for (let seed = 0; seed < 30; seed++) {
        const { appeared } = grow(track, seed, 60 * 60);
        for (const { banana, others } of appeared) {
          for (const other of others) {
            expect(gap(banana, other)).toBeGreaterThanOrEqual(BANANA_GAP);
          }
        }
      }
    }
  });

  it("is nowhere when karts are too close to every square: no banana, and the next wait begins", () => {
    // A kart on every square where a banana may appear.
    const everywhere = bananaSquares(TEST_OVAL).map(({ x, y }) => createKart(x, y));
    const { bananas, maker } = grow(TEST_OVAL, 9, 60 * 30, () => everywhere);
    expect(bananas).toEqual([]);
    expect(maker.nextId).toBe(1); // no number was used up
    expect(maker.stepsToNext).toBeLessThanOrEqual(BANANA_WAIT_LONGEST_STEPS);
  });

  it("can be any of the squares: over many seeds the bananas land all round the track", () => {
    const landed = new Set();
    for (let seed = 0; seed < 300; seed++) {
      const { banana } = grow(TEST_OVAL, seed, FIRST_BANANA_STEPS).appeared[0];
      landed.add(`${banana.x},${banana.y}`);
    }
    expect(landed.size).toBeGreaterThan(bananaSquares(TEST_OVAL).length / 2);
  });
});

describe("the same seed", () => {
  it("always gives the same bananas, at the same moments, with the same numbers", () => {
    for (const seed of [0, 1, 99, 4000000000]) {
      const first = grow(TEST_OVAL, seed, 60 * 40, (step) => [createKart(100 + step / 10, 96)]);
      const second = grow(TEST_OVAL, seed, 60 * 40, (step) => [createKart(100 + step / 10, 96)]);
      expect(second.appeared).toEqual(first.appeared);
      expect(second.maker).toEqual(first.maker);
    }
  });

  it("gives different bananas from another seed", () => {
    const one = grow(TEST_OVAL, 1, 60 * 40).appeared.map(({ step, banana }) => [step, banana.x, banana.y]);
    const two = grow(TEST_OVAL, 2, 60 * 40).appeared.map(({ step, banana }) => [step, banana.x, banana.y]);
    expect(two).not.toEqual(one);
  });

  it("does not change the maker or the list of bananas it was given", () => {
    const maker = Object.freeze({ ...createBananaMaker(5), stepsToNext: 1 });
    const bananas = Object.freeze([Object.freeze({ id: 7, x: 80, y: 80 })]);
    const after = addBananas(TEST_OVAL, maker, bananas, []);
    expect(maker.stepsToNext).toBe(1);
    expect(bananas).toHaveLength(1);
    expect(after.bananas).toHaveLength(2);
    expect(after.bananas[0]).toBe(bananas[0]);
    expect(after.maker).not.toBe(maker);
  });
});

// ---- Hitting a banana ----

describe("which karts hit which bananas", () => {
  const banana = { id: 4, x: 300, y: 80 };

  it("is a hit when the circle of the kart touches the circle of the banana", () => {
    expect(BANANA_RADIUS).toBe(8);
    expect(bananaHits([banana], [racerAt(300, 80)])).toEqual([{ racer: 0, banana: 4 }]);
    expect(bananaHits([banana], [racerAt(300 + HIT_DISTANCE - 0.01, 80)])).toHaveLength(1);
    expect(bananaHits([banana], [racerAt(300, 80 - HIT_DISTANCE + 0.01)])).toHaveLength(1);
  });

  it("is not a hit when the kart only passes close by", () => {
    expect(bananaHits([banana], [racerAt(300 + HIT_DISTANCE, 80)])).toEqual([]);
    expect(bananaHits([banana], [racerAt(300, 80 + HIT_DISTANCE + 5)])).toEqual([]);
    expect(bananaHits([banana], [racerAt(313, 93)])).toEqual([]); // 18.4 units away, diagonally
  });

  it("says which racer and which banana, for every hit", () => {
    const bananas = [banana, { id: 9, x: 600, y: 480 }];
    const racers = [racerAt(100, 100), racerAt(605, 478), racerAt(298, 85)];
    expect(bananaHits(bananas, racers)).toEqual([
      { racer: 1, banana: 9 },
      { racer: 2, banana: 4 },
    ]);
  });

  it("lists both racers when two touch the same banana in the same step", () => {
    const hits = bananaHits([banana], [racerAt(292, 80), racerAt(308, 80)]);
    expect(hits).toEqual([
      { racer: 0, banana: 4 },
      { racer: 1, banana: 4 },
    ]);
  });

  it("is nothing when there are no bananas, or no racers", () => {
    expect(bananaHits([], [racerAt(300, 80)])).toEqual([]);
    expect(bananaHits([banana], [])).toEqual([]);
  });

  it("is never a hit for a racer that is spinning, or has only just stopped spinning", () => {
    const spinning = spinOut(racerAt(300, 80));
    expect(bananaHits([banana], [spinning])).toEqual([]);
    const justStopped = { ...racerAt(300, 80), spinSteps: 0, spinShieldSteps: 1 };
    expect(bananaHits([banana], [justStopped])).toEqual([]);
  });
});

describe("spinning out", () => {
  it("lasts about 1.2 seconds, and protects for a second more", () => {
    expect(SPIN_STEPS).toBe(72);
    expect(SPIN_STEPS * STEP_SECONDS).toBeCloseTo(1.2);
    expect(SPIN_SHIELD_STEPS).toBe(60);
  });

  it("sets the two spin counters and nothing else: the kart, the laps and the clock are as they were", () => {
    const racer = racerAt(300, 80, 250, 0);
    const spun = spinOut(racer);
    expect(spun.spinSteps).toBe(SPIN_STEPS);
    expect(spun.spinShieldSteps).toBe(SPIN_STEPS + SPIN_SHIELD_STEPS);
    expect(spun.kart).toBe(racer.kart);
    expect(spun.progress).toBe(racer.progress);
    expect(racer.spinSteps).toBe(0); // the racer given was not changed
  });

  it("cannot be done to a racer that is already spinning: the spin is not made longer or started over", () => {
    let racer = spinOut(racerAt(300, 80, 250, 0));
    for (let step = 0; step < 30; step++) {
      racer = stepRacer(TEST_OVAL, racer, NO_KEYS, TEST_DRIVER);
    }
    expect(racer.spinSteps).toBe(SPIN_STEPS - 30);
    expect(canBeSpun(racer)).toBe(false);
    expect(spinOut(racer)).toBe(racer);
  });

  it("cannot be done again for a short moment after the spin, and can after that", () => {
    let racer = spinOut(racerAt(300, 80, 250, 0));
    for (let step = 0; step < SPIN_STEPS; step++) {
      racer = stepRacer(TEST_OVAL, racer, NO_KEYS, TEST_DRIVER);
    }
    expect(racer.spinSteps).toBe(0); // the spin is over
    for (let step = 0; step < SPIN_SHIELD_STEPS; step++) {
      expect(canBeSpun(racer)).toBe(false);
      expect(spinOut(racer)).toBe(racer);
      racer = stepRacer(TEST_OVAL, racer, NO_KEYS, TEST_DRIVER);
    }
    expect(canBeSpun(racer)).toBe(true);
    expect(spinOut(racer).spinSteps).toBe(SPIN_STEPS);
  });

  it("can be done to a racer made by hand without spin counters", () => {
    const plain = { kart: createKart(300, 80), progress: createRacer(TEST_OVAL).progress };
    expect(canBeSpun(plain)).toBe(true);
    expect(spinOut(plain).spinSteps).toBe(SPIN_STEPS);
  });
});

// ---- How a spinning kart moves ----

describe("a kart that is spinning", () => {
  /** Steps a racer with the same keys and gives the racer after every step, as a list. */
  function everyStep(racer, keys, steps) {
    const list = [];
    for (let step = 0; step < steps; step++) {
      racer = stepRacer(TEST_OVAL, racer, keys, TEST_DRIVER);
      list.push(racer);
    }
    return list;
  }

  const topSpeed = topSpeedOf(TEST_DRIVER, ROAD);

  it("spins for exactly as many steps as a spin lasts, counting down by one each step", () => {
    const steps = everyStep(spinOut(racerAt(200, 80, 250, 0)), NO_KEYS, SPIN_STEPS + 10);
    steps.forEach((racer, index) => {
      expect(racer.spinSteps).toBe(Math.max(0, SPIN_STEPS - (index + 1)));
    });
  });

  it("is not steered, sped up or braked by its keys: whatever is held, it moves exactly the same", () => {
    const start = spinOut(racerAt(200, 80, 250, 0));
    const noKeys = everyStep(start, NO_KEYS, SPIN_STEPS);
    for (const keys of [
      { gas: true, brake: false, left: false, right: true },
      { gas: false, brake: true, left: true, right: false },
      { gas: true, brake: true, left: true, right: true },
    ]) {
      expect(everyStep(start, keys, SPIN_STEPS)).toEqual(noKeys);
    }
  });

  it("never gains speed during the spin, even with the gas held from a standstill", () => {
    const standing = everyStep(spinOut(racerAt(200, 80)), GAS, SPIN_STEPS);
    for (const racer of standing) {
      expect(speedOf(racer.kart)).toBe(0);
      expect(racer.kart.x).toBe(200);
    }
    let speedBefore = 250;
    for (const racer of everyStep(spinOut(racerAt(200, 80, 250, 0)), GAS, SPIN_STEPS)) {
      expect(speedOf(racer.kart)).toBeLessThanOrEqual(speedBefore);
      speedBefore = speedOf(racer.kart);
    }
  });

  it("keeps pointing the way it pointed: the rules do not turn it, whichever keys are held", () => {
    const turning = { gas: true, brake: false, left: false, right: true };
    for (const racer of everyStep(spinOut(racerAt(200, 80, 250, 0, 0.4)), turning, SPIN_STEPS)) {
      expect(racer.kart.angle).toBe(0.4);
    }
  });

  it("keeps sliding the way it was going, even when that is not the way it points", () => {
    // It points right (angle 0) but is moving down and to the right.
    const steps = everyStep(spinOut(racerAt(200, 60, 120, 60)), NO_KEYS, 20);
    for (const racer of steps) {
      expect(Math.atan2(racer.kart.vy, racer.kart.vx)).toBeCloseTo(Math.atan2(60, 120));
    }
    expect(steps[19].kart.y).toBeGreaterThan(70); // it really went down the screen
    // A kart that is not spinning grips the road instead: its slide is gone almost at once.
    const gripping = everyStep(racerAt(200, 60, 120, 60), NO_KEYS, 20);
    expect(Math.abs(gripping[19].kart.vy)).toBeLessThan(5);
  });

  it("slows down quickly: much more than a kart that just coasts", () => {
    const spun = everyStep(spinOut(racerAt(100, 80, topSpeed, 0)), NO_KEYS, SPIN_STEPS);
    const coasting = everyStep(racerAt(100, 80, topSpeed, 0), NO_KEYS, SPIN_STEPS);
    expect(speedOf(spun[SPIN_STEPS - 1].kart)).toBeLessThan(topSpeed * 0.2);
    expect(speedOf(spun[SPIN_STEPS - 1].kart)).toBeLessThan(speedOf(coasting[SPIN_STEPS - 1].kart) - 100);
    // And it slid on a good way first: it does not stop dead.
    expect(spun[SPIN_STEPS - 1].kart.x).toBeGreaterThan(100 + 100);
  });

  it("comes to rest and stays there, without ever going backwards", () => {
    const steps = everyStep(spinOut(racerAt(200, 80, 60, 0)), NO_KEYS, SPIN_STEPS);
    let xBefore = 200;
    for (const racer of steps) {
      expect(racer.kart.x).toBeGreaterThanOrEqual(xBefore);
      expect(racer.kart.vx).toBeGreaterThanOrEqual(0);
      xBefore = racer.kart.x;
    }
    expect(speedOf(steps[SPIN_STEPS - 1].kart)).toBe(0);
  });

  it("still bounces off walls, and never ends up inside one", () => {
    // Sliding fast at the right-hand wall of the oval, which begins at x=928.
    let bounced = false;
    for (const racer of everyStep(spinOut(racerAt(870, 80, topSpeed, 0)), NO_KEYS, SPIN_STEPS)) {
      expect(tileKindAt(TEST_OVAL, racer.kart.x, racer.kart.y)).toBe("road");
      expect(racer.kart.x).toBeLessThanOrEqual(928 - KART_RADIUS + 0.000001);
      if (racer.kart.vx < 0) {
        bounced = true;
      }
    }
    expect(bounced).toBe(true);
  });

  it("keeps its clock running and its laps counting", () => {
    // On pole, behind the finish line, sliding forwards over it.
    const pole = gridSpot(TEST_OVAL, 0);
    const steps = everyStep(spinOut(racerAt(pole.x, pole.y, 220, 0)), NO_KEYS, SPIN_STEPS);
    const after = steps[SPIN_STEPS - 1];
    expect(after.progress.steps).toBe(SPIN_STEPS);
    expect(after.kart.x).toBeGreaterThan(TEST_OVAL.checkpoints[0].right);
    expect(nextCheckpoint(after.progress, TEST_OVAL)).toBe(1); // the crossing was counted: lap 1 has begun
    expect(after.progress.lapsDone).toBe(0);
  });

  it("obeys its keys again as soon as the spin is over, pointing where it pointed before", () => {
    const afterSpin = everyStep(spinOut(racerAt(200, 80, 100, 0, 0.25)), GAS, SPIN_STEPS)[SPIN_STEPS - 1];
    expect(afterSpin.spinSteps).toBe(0);
    expect(afterSpin.kart.angle).toBe(0.25);
    expect(speedOf(afterSpin.kart)).toBe(0);
    const driving = everyStep(afterSpin, GAS, 30)[29];
    expect(speedOf(driving.kart)).toBeGreaterThan(50);
  });

  it("does not change the racer it was given", () => {
    const racer = spinOut(racerAt(200, 80, 250, 0));
    const before = Object.freeze({ ...racer, kart: Object.freeze({ ...racer.kart }) });
    const after = stepRacer(TEST_OVAL, before, GAS, TEST_DRIVER);
    expect(before.spinSteps).toBe(SPIN_STEPS);
    expect(before.kart.x).toBe(200);
    expect(after.spinSteps).toBe(SPIN_STEPS - 1);
  });

  it("does not make a racer without spin counters spin: it drives as always", () => {
    const plain = { kart: createKart(200, 80), progress: createRacer(TEST_OVAL).progress };
    const after = stepRacer(TEST_OVAL, plain, GAS, TEST_DRIVER);
    expect(after.kart).toEqual(stepKart(plain.kart, GAS, TEST_DRIVER, ROAD));
    expect(after.spinSteps).toBe(0);
    expect(after.spinShieldSteps).toBe(0);
  });

  it("slides without any driver's scores: slideKart() takes only the kart", () => {
    const kart = { ...createKart(200, 80, 1.1), vx: 0, vy: -200 };
    const after = slideKart(kart);
    expect(after.angle).toBe(1.1);
    expect(after.vx).toBeCloseTo(0);
    expect(after.vy).toBeGreaterThan(-200); // slower
    expect(after.vy).toBeLessThan(0); //       but still going up the screen
    expect(after.y).toBeLessThan(80);
    expect(kart.vy).toBe(-200); // the kart given was not changed
  });

  it("gives real numbers for a kart that stands still", () => {
    const after = slideKart(createKart(200, 80, 0.5));
    expect(after).toEqual(createKart(200, 80, 0.5));
  });
});

// ---- One step of the bananas of a race ----

describe("one step of the bananas of a race", () => {
  const banana = { id: 1, x: 300, y: 80 };

  it("spins the racer that touches a banana, and takes that banana away", () => {
    const racers = [racerAt(295, 82, 250, 0), racerAt(600, 80, 250, 0)];
    const after = stepBananas(TEST_OVAL, [banana, { id: 2, x: 700, y: 480 }], quietMaker(), racers);
    expect(after.racers[0].spinSteps).toBe(SPIN_STEPS);
    expect(after.racers[1].spinSteps).toBe(0);
    expect(after.racers[1]).toBe(racers[1]);
    expect(after.bananas).toEqual([{ id: 2, x: 700, y: 480 }]);
  });

  it("does not touch the kart, the laps or the clock of the racer it spins", () => {
    const racer = racerAt(300, 80, 250, 0);
    const [spun] = stepBananas(TEST_OVAL, [banana], quietMaker(), [racer]).racers;
    expect(spun.kart).toBe(racer.kart);
    expect(spun.progress).toBe(racer.progress);
  });

  it("spins both racers when two touch the same banana in the same step", () => {
    const after = stepBananas(TEST_OVAL, [banana], quietMaker(), [racerAt(292, 80), racerAt(308, 80)]);
    expect(after.racers.map((racer) => racer.spinSteps)).toEqual([SPIN_STEPS, SPIN_STEPS]);
    expect(after.bananas).toEqual([]);
  });

  it("leaves everything alone when nobody touches a banana", () => {
    const racers = [racerAt(100, 80, 250, 0)];
    const bananas = [banana];
    const after = stepBananas(TEST_OVAL, bananas, quietMaker(), racers);
    expect(after.racers).toBe(racers);
    expect(after.bananas).toBe(bananas);
  });

  it("does not let a second banana make a spin longer or start it over: the kart slides over it and it stays", () => {
    // The kart hits banana 1 and slides on, straight over banana 2.
    const second = { id: 2, x: 360, y: 80 };
    let bananas = [banana, second];
    let maker = quietMaker();
    let racers = [racerAt(290, 80, 280, 0)];
    ({ bananas, maker, racers } = stepBananas(TEST_OVAL, bananas, maker, racers));
    expect(racers[0].spinSteps).toBe(SPIN_STEPS);
    expect(bananas).toEqual([second]);

    let slidOverIt = false;
    for (let step = 1; step <= SPIN_STEPS; step++) {
      racers = racers.map((racer) => stepRacer(TEST_OVAL, racer, GAS, TEST_DRIVER));
      ({ bananas, maker, racers } = stepBananas(TEST_OVAL, bananas, maker, racers));
      expect(racers[0].spinSteps).toBe(SPIN_STEPS - step); // counting down, never back up
      expect(bananas).toEqual([second]);
      if (gap(racers[0].kart, second) < HIT_DISTANCE) {
        slidOverIt = true;
      }
    }
    expect(slidOverIt).toBe(true);
  });

  it("does not spin a racer again in the short moment after its spin, and leaves the banana for the next kart", () => {
    const justStopped = { ...racerAt(300, 80), spinSteps: 0, spinShieldSteps: 5 };
    const after = stepBananas(TEST_OVAL, [banana], quietMaker(), [justStopped]);
    expect(after.racers[0].spinSteps).toBe(0);
    expect(after.bananas).toEqual([banana]);
    // The next kart, which has not spun, does hit it.
    const next = stepBananas(TEST_OVAL, after.bananas, quietMaker(), [justStopped, racerAt(302, 80)]);
    expect(next.racers[1].spinSteps).toBe(SPIN_STEPS);
    expect(next.bananas).toEqual([]);
  });

  it("counts down to the next banana in the same step, keeping it away from the karts", () => {
    const maker = { ...createBananaMaker(3), stepsToNext: 1 };
    const racers = [racerAt(432, 62)];
    const after = stepBananas(TEST_OVAL, [], maker, racers);
    expect(after.bananas).toHaveLength(1);
    expect(gap(after.bananas[0], racers[0].kart)).toBeGreaterThanOrEqual(BANANA_SAFE_FROM_KART);
    expect(after.maker.nextId).toBe(2);
  });

  it("does nothing at all in a race without a banana maker: no seed, no bananas", () => {
    const racers = [racerAt(300, 80, 250, 0)];
    const bananas = [];
    const after = stepBananas(TEST_OVAL, bananas, null, racers);
    expect(after).toEqual({ bananas: [], maker: null, racers });
    expect(after.racers).toBe(racers);
  });
});

// ---- The practice race ----

describe("a practice race with bananas", () => {
  const pole = gridSpot(TEST_OVAL, 0);

  function run(race, keys, steps, everyStep = () => {}) {
    for (let step = 0; step < steps; step++) {
      race = stepCountdownRace(TEST_OVAL, race, keys, TEST_DRIVER);
      everyStep(race);
    }
    return race;
  }

  /** Which keys head for a target point: the robot driver of race.test.js. */
  function robotKeys(kart, target) {
    const wantedAngle = Math.atan2(target.y - kart.y, target.x - kart.x);
    const turn = Math.atan2(Math.sin(wantedAngle - kart.angle), Math.cos(wantedAngle - kart.angle));
    return { gas: Math.abs(turn) < 1.2 || speedOf(kart) < 120, brake: false, left: turn < -0.05, right: turn > 0.05 };
  }

  /**
   * A seed whose first banana, with the kart waiting on pole, lies on the
   * top straight well ahead of the kart, so a robot can simply drive at it.
   */
  function seedWithFirstBananaAhead() {
    for (let seed = 1; seed < 1000; seed++) {
      const [first] = grow(TEST_OVAL, seed, FIRST_BANANA_STEPS, () => [createKart(pole.x, pole.y)]).bananas;
      if (first !== undefined && first.y < 150 && first.x > 600 && first.x < 850) {
        return seed;
      }
    }
    throw new Error("No seed among the first thousand puts the first banana on the top straight");
  }

  it("has no bananas, and nothing to make them, when it is given no seed", () => {
    const race = createCountdownRace(TEST_OVAL);
    expect(race.bananas).toEqual([]);
    expect(race.bananaMaker).toBe(null);
    const muchLater = run(race, NO_KEYS, COUNTDOWN_STEPS + 60 * 60);
    expect(muchLater.bananas).toEqual([]);
    expect(muchLater.bananaMaker).toBe(null);
    expect(muchLater.racer.spinSteps).toBe(0);
  });

  it("begins with no bananas and a banana maker that has the seed, when it is given one", () => {
    const race = createCountdownRace(TEST_OVAL, 21);
    expect(race.bananas).toEqual([]);
    expect(race.bananaMaker).toEqual(createBananaMaker(21));
    expect(race.racer).toEqual(createRacer(TEST_OVAL));
    expect(race.countdownSteps).toBe(0);
  });

  it("refuses a seed that is not a whole number", () => {
    expect(() => createCountdownRace(TEST_OVAL, 1.5)).toThrow(RangeError);
    expect(() => createCountdownRace(TEST_OVAL, "seed")).toThrow(RangeError);
  });

  it("has no bananas during 3, 2 and 1, and does not even start counting towards the first one", () => {
    const start = createCountdownRace(TEST_OVAL, 21);
    run(start, GAS, COUNTDOWN_STEPS, (race) => {
      expect(race.bananas).toEqual([]);
      expect(race.bananaMaker).toEqual(start.bananaMaker);
    });
  });

  it("gets its first banana a few seconds after GO, not after the start of the countdown", () => {
    const justBefore = run(createCountdownRace(TEST_OVAL, 21), NO_KEYS, COUNTDOWN_STEPS + FIRST_BANANA_STEPS - 1);
    expect(justBefore.bananas).toEqual([]);
    const onTime = stepCountdownRace(TEST_OVAL, justBefore, NO_KEYS, TEST_DRIVER);
    expect(onTime.bananas).toHaveLength(1);
    expect(onTime.bananas[0].id).toBe(1);
  });

  it("cannot have a banana hit during the countdown, even one lying under the kart", () => {
    // A race made by hand, with a banana right under the kart on the grid.
    const underTheKart = { id: 99, x: pole.x, y: pole.y };
    const start = { ...createCountdownRace(TEST_OVAL, 21), bananas: [underTheKart] };
    const atGo = run(start, GAS, COUNTDOWN_STEPS, (race) => {
      expect(race.racer.spinSteps).toBe(0);
      expect(race.bananas).toEqual([underTheKart]);
    });
    expect(atGo.racer.kart).toEqual(start.racer.kart);
    // The race begins: now it counts.
    const afterGo = stepCountdownRace(TEST_OVAL, atGo, GAS, TEST_DRIVER);
    expect(afterGo.racer.spinSteps).toBe(SPIN_STEPS);
    expect(afterGo.bananas).toEqual([]);
  });

  it("is exactly the same race again with the same seed and the same keys", () => {
    const first = run(createCountdownRace(TEST_OVAL, 21), GAS, COUNTDOWN_STEPS + 60 * 20);
    const second = run(createCountdownRace(TEST_OVAL, 21), GAS, COUNTDOWN_STEPS + 60 * 20);
    expect(second).toEqual(first);
    expect(first.bananaMaker.nextId).toBeGreaterThan(1); // bananas did appear
  });

  it("has different bananas with a different seed", () => {
    const one = run(createCountdownRace(TEST_OVAL, 21), NO_KEYS, COUNTDOWN_STEPS + 60 * 20);
    const two = run(createCountdownRace(TEST_OVAL, 22), NO_KEYS, COUNTDOWN_STEPS + 60 * 20);
    expect(two.bananas).not.toEqual(one.bananas);
  });

  it("fills the track up to its number of bananas while the kart waits on the grid, and never spins that kart", () => {
    const race = run(createCountdownRace(TEST_OVAL, 21), NO_KEYS, COUNTDOWN_STEPS + 60 * 60, (now) => {
      expect(now.racer.spinSteps).toBe(0);
      expect(now.bananas.length).toBeLessThanOrEqual(mostBananas(TEST_OVAL));
    });
    expect(race.bananas).toHaveLength(mostBananas(TEST_OVAL));
    expect(race.racer.progress.steps).toBe(60 * 60); // the clock ran all the while
  });

  it("drives exactly as a race without bananas until the kart hits one", () => {
    const withBananas = run(createCountdownRace(TEST_OVAL, 21), GAS, COUNTDOWN_STEPS + 120);
    const without = run(createCountdownRace(TEST_OVAL), GAS, COUNTDOWN_STEPS + 120);
    expect(withBananas.racer).toEqual(without.racer);
  });

  it("spins the kart that a robot drives into the first banana, and that banana is gone", () => {
    const seed = seedWithFirstBananaAhead();
    // Wait on the grid until the banana appears.
    let race = run(createCountdownRace(TEST_OVAL, seed), NO_KEYS, COUNTDOWN_STEPS + FIRST_BANANA_STEPS);
    const [first] = race.bananas;
    expect(first.id).toBe(1);
    expect(race.racer.spinSteps).toBe(0);

    // Drive straight at it.
    let stepsOfDriving = 0;
    while (race.racer.spinSteps === 0 && stepsOfDriving < 600) {
      race = stepCountdownRace(TEST_OVAL, race, robotKeys(race.racer.kart, first), TEST_DRIVER);
      stepsOfDriving++;
    }
    expect(race.racer.spinSteps).toBe(SPIN_STEPS);
    expect(gap(race.racer.kart, first)).toBeLessThan(HIT_DISTANCE);
    expect(race.bananas.some((banana) => banana.id === 1)).toBe(false);
    const clockAtTheHit = race.racer.progress.steps;
    const speedAtTheHit = speedOf(race.racer.kart);
    expect(speedAtTheHit).toBeGreaterThan(150);

    // For the whole spin the keys do nothing: the kart only slows down, and points where it pointed.
    const angleAtTheHit = race.racer.kart.angle;
    race = run(race, { gas: true, brake: false, left: true, right: false }, SPIN_STEPS, (now) => {
      expect(now.racer.kart.angle).toBe(angleAtTheHit);
      expect(speedOf(now.racer.kart)).toBeLessThanOrEqual(speedAtTheHit);
    });
    expect(race.racer.spinSteps).toBe(0);
    expect(speedOf(race.racer.kart)).toBeLessThan(speedAtTheHit * 0.3);
    expect(race.racer.progress.steps).toBe(clockAtTheHit + SPIN_STEPS); // the clock carried on
  });

  it("does not change the race it is given", () => {
    const before = run(createCountdownRace(TEST_OVAL, 21), NO_KEYS, COUNTDOWN_STEPS + FIRST_BANANA_STEPS - 1);
    const copy = JSON.stringify(before);
    const after = stepCountdownRace(TEST_OVAL, before, GAS, TEST_DRIVER);
    expect(JSON.stringify(before)).toBe(copy);
    expect(after.bananas).toHaveLength(1);
  });
});
