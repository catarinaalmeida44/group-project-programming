// Tests for shared/physics.js, the driving rules.
//
// These tests compare behaviours ("more acceleration reaches top speed
// sooner") instead of checking exact numbers. That way we can tune the
// numbers in physics.js by playtesting without breaking the tests.

import { describe, it, expect } from "vitest";
import { stepKart, createKart, speedOf, topSpeedOf, STEP_SECONDS } from "../shared/physics.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { ROAD, GRASS } from "../shared/surfaces.js";

// ---- Helpers used by the tests below ----

const NO_KEYS = {};
const GAS = { gas: true };
const BRAKE = { brake: true };

/** Holds the same keys for a number of seconds and gives back the kart afterwards. */
function drive(kart, input, seconds, character = TEST_DRIVER, surface = ROAD) {
  const steps = Math.round(seconds / STEP_SECONDS);
  for (let step = 0; step < steps; step++) {
    kart = stepKart(kart, input, character, surface);
  }
  return kart;
}

/** A kart that is already moving in the direction it points. A negative speed means backwards. */
function movingKart(speed, angle = 0) {
  return {
    ...createKart(0, 0, angle),
    vx: speed * Math.cos(angle),
    vy: speed * Math.sin(angle),
  };
}

/** How fast a kart is sliding sideways, compared with the direction it points. */
function slideOf(kart) {
  return Math.abs(-kart.vx * Math.sin(kart.angle) + kart.vy * Math.cos(kart.angle));
}

/** Counts the steps until something becomes true. Gives up after one minute of game time. */
function stepsUntil(kart, input, character, isTrue) {
  for (let steps = 0; steps < 3600; steps++) {
    if (isTrue(kart)) {
      return steps;
    }
    kart = stepKart(kart, input, character, ROAD);
  }
  throw new Error("It never happened within one minute of game time");
}

/** A copy of the test driver with some scores changed. */
function driverWith(changes) {
  return { ...TEST_DRIVER, ...changes };
}

const topSpeed = topSpeedOf(TEST_DRIVER, ROAD);

// ---- The tests ----

describe("accelerating", () => {
  it("does not move when no key is pressed", () => {
    const kart = drive(createKart(100, 200), NO_KEYS, 1);
    expect(kart.x).toBe(100);
    expect(kart.y).toBe(200);
    expect(speedOf(kart)).toBe(0);
  });

  it("moves in the direction it points when the gas is pressed", () => {
    const pointingRight = drive(createKart(0, 0, 0), GAS, 1);
    expect(pointingRight.x).toBeGreaterThan(0);
    expect(pointingRight.y).toBeCloseTo(0);

    const pointingDown = drive(createKart(0, 0, Math.PI / 2), GAS, 1);
    expect(pointingDown.y).toBeGreaterThan(0);
    expect(pointingDown.x).toBeCloseTo(0);
  });

  it("gains speed quickly when slow and gently when near its top speed", () => {
    // Measure the speed gained in three half-seconds in a row.
    const afterFirst = drive(createKart(0, 0), GAS, 0.5);
    const afterSecond = drive(afterFirst, GAS, 0.5);
    const afterThird = drive(afterSecond, GAS, 0.5);

    const firstGain = speedOf(afterFirst);
    const secondGain = speedOf(afterSecond) - speedOf(afterFirst);
    const thirdGain = speedOf(afterThird) - speedOf(afterSecond);
    expect(firstGain).toBeGreaterThan(secondGain);
    expect(secondGain).toBeGreaterThan(thirdGain);
    expect(thirdGain).toBeGreaterThan(0);
  });

  it("gets close to its top speed and never goes above it", () => {
    let kart = createKart(0, 0);
    let fastestSeen = 0;
    for (let step = 0; step < 30 * 60; step++) {
      kart = stepKart(kart, GAS, TEST_DRIVER, ROAD);
      fastestSeen = Math.max(fastestSeen, speedOf(kart));
    }
    expect(fastestSeen).toBeLessThanOrEqual(topSpeed);
    expect(speedOf(kart)).toBeGreaterThan(0.95 * topSpeed);
  });

  it("reaches 80% of top speed sooner with a higher acceleration score", () => {
    const quick = driverWith({ acceleration: 5 });
    const sluggish = driverWith({ acceleration: 2 });
    const fastEnough = (kart) => speedOf(kart) >= 0.8 * topSpeed;

    const quickSteps = stepsUntil(createKart(0, 0), GAS, quick, fastEnough);
    const sluggishSteps = stepsUntil(createKart(0, 0), GAS, sluggish, fastEnough);
    expect(quickSteps).toBeLessThan(sluggishSteps);
  });

  it("has a higher top speed with a higher speed score", () => {
    const fast = driverWith({ speed: 5 });
    const slow = driverWith({ speed: 2 });
    expect(topSpeedOf(fast)).toBeGreaterThan(topSpeedOf(slow));

    const fastKart = drive(createKart(0, 0), GAS, 20, fast);
    const slowKart = drive(createKart(0, 0), GAS, 20, slow);
    expect(speedOf(fastKart)).toBeGreaterThan(speedOf(slowKart));
  });
});

describe("coasting, braking and reversing", () => {
  it("slows down gradually when the gas is released, then stops completely", () => {
    const start = movingKart(topSpeed);

    const shortlyAfter = drive(start, NO_KEYS, 0.5);
    expect(speedOf(shortlyAfter)).toBeLessThan(topSpeed);
    expect(speedOf(shortlyAfter)).toBeGreaterThan(0);

    const muchLater = drive(start, NO_KEYS, 10);
    expect(speedOf(muchLater)).toBe(0);

    const oneStepMore = stepKart(muchLater, NO_KEYS, TEST_DRIVER, ROAD);
    expect(oneStepMore.x).toBe(muchLater.x);
  });

  it("stops sooner by braking than by coasting", () => {
    const stopped = (kart) => speedOf(kart) === 0;
    const brakingSteps = stepsUntil(movingKart(topSpeed), BRAKE, TEST_DRIVER, stopped);
    const coastingSteps = stepsUntil(movingKart(topSpeed), NO_KEYS, TEST_DRIVER, stopped);
    expect(brakingSteps).toBeLessThan(coastingSteps);
  });

  it("reverses when the brake is held at a standstill", () => {
    const kart = drive(createKart(0, 0, 0), BRAKE, 2);
    expect(kart.vx).toBeLessThan(0);
    expect(kart.x).toBeLessThan(0);
  });

  it("reverses much more slowly than it drives forward", () => {
    const kart = drive(createKart(0, 0), BRAKE, 10);
    expect(speedOf(kart)).toBeLessThan(topSpeed / 2);
  });

  it("slows down when gas and brake are pressed together", () => {
    const start = movingKart(topSpeed);
    const kart = drive(start, { gas: true, brake: true }, 0.2);
    expect(speedOf(kart)).toBeLessThan(speedOf(start));
  });

  it("stops and then drives forward when the gas is pressed while reversing", () => {
    const reversing = drive(createKart(0, 0, 0), BRAKE, 2);
    const later = drive(reversing, GAS, 3);
    expect(later.vx).toBeGreaterThan(0);
  });
});

describe("steering", () => {
  it("does not turn when standing still", () => {
    const kart = drive(createKart(0, 0, 0), { left: true }, 1);
    expect(kart.angle).toBe(0);
  });

  it("turns clockwise with the right key and the other way with the left key", () => {
    const right = drive(movingKart(150), { gas: true, right: true }, 0.5);
    const left = drive(movingKart(150), { gas: true, left: true }, 0.5);
    expect(right.angle).toBeGreaterThan(0);
    expect(left.angle).toBeLessThan(0);
  });

  it("turns by the same amount to the left and to the right", () => {
    const right = drive(movingKart(150), { gas: true, right: true }, 0.5);
    const left = drive(movingKart(150), { gas: true, left: true }, 0.5);
    expect(left.angle).toBeCloseTo(-right.angle);
    expect(left.y).toBeCloseTo(-right.y);
  });

  it("goes straight when left and right are pressed together", () => {
    const kart = drive(movingKart(150), { gas: true, left: true, right: true }, 0.5);
    expect(kart.angle).toBe(0);
    expect(kart.y).toBeCloseTo(0);
  });

  it("turns further in the same time with a higher handling score", () => {
    const nimble = driverWith({ handling: 5 });
    const clumsy = driverWith({ handling: 2 });
    const nimbleKart = drive(movingKart(150), { gas: true, right: true }, 0.5, nimble);
    const clumsyKart = drive(movingKart(150), { gas: true, right: true }, 0.5, clumsy);
    expect(nimbleKart.angle).toBeGreaterThan(clumsyKart.angle);
  });

  it("turns a little more slowly at top speed than at half speed", () => {
    const atTopSpeed = stepKart(movingKart(topSpeed), { right: true }, TEST_DRIVER, ROAD);
    const atHalfSpeed = stepKart(movingKart(topSpeed / 2), { right: true }, TEST_DRIVER, ROAD);
    expect(atTopSpeed.angle).toBeGreaterThan(0);
    expect(atTopSpeed.angle).toBeLessThan(atHalfSpeed.angle);
  });

  it("mirrors the steering when reversing, like a real car", () => {
    const forwards = drive(movingKart(60), { gas: true, right: true }, 0.3);
    const backwards = drive(movingKart(-60), { brake: true, right: true }, 0.3);
    expect(forwards.angle).toBeGreaterThan(0);
    expect(backwards.angle).toBeLessThan(0);
  });
});

describe("grip", () => {
  it("makes a sideways slide fade away", () => {
    // This kart points right but is moving straight down: a pure slide.
    const sliding = { ...createKart(0, 0, 0), vx: 0, vy: 100 };
    const later = drive(sliding, NO_KEYS, 2);
    expect(speedOf(later)).toBe(0);
    expect(later.angle).toBe(0);
  });

  it("lets a slide last longer with a lower grip score", () => {
    const sliding = { ...createKart(0, 0, 0), vx: 0, vy: 100 };
    const slippery = drive(sliding, NO_KEYS, 0.1, driverWith({ grip: 1.5 }));
    const sticky = drive(sliding, NO_KEYS, 0.1, driverWith({ grip: 5.5 }));
    expect(slideOf(slippery)).toBeGreaterThan(slideOf(sticky));
  });

  it("slides wider in a corner with a lower grip score", () => {
    const keys = { gas: true, right: true };
    const slippery = drive(movingKart(250), keys, 0.3, driverWith({ grip: 1.5 }));
    const sticky = drive(movingKart(250), keys, 0.3, driverWith({ grip: 5.5 }));
    // Both point the same way, because grip does not change the steering...
    expect(slippery.angle).toBeCloseTo(sticky.angle);
    // ...but the slippery one is sliding sideways more.
    expect(slideOf(slippery)).toBeGreaterThan(slideOf(sticky));
  });
});

describe("the ground", () => {
  it("allows a lower top speed on grass than on the road", () => {
    expect(topSpeedOf(TEST_DRIVER, GRASS)).toBeLessThan(topSpeedOf(TEST_DRIVER, ROAD));

    const onRoad = drive(createKart(0, 0), GAS, 20, TEST_DRIVER, ROAD);
    const onGrass = drive(createKart(0, 0), GAS, 20, TEST_DRIVER, GRASS);
    expect(speedOf(onGrass)).toBeLessThan(speedOf(onRoad));
  });

  it("slows a kart that leaves the road at full speed down to the grass top speed", () => {
    const grassTopSpeed = topSpeedOf(TEST_DRIVER, GRASS);
    const kart = drive(movingKart(topSpeed), GAS, 2, TEST_DRIVER, GRASS);
    expect(speedOf(kart)).toBeLessThanOrEqual(grassTopSpeed + 0.000001);
    expect(speedOf(kart)).toBeGreaterThan(0.95 * grassTopSpeed);
  });

  it("keeps more speed on grass with a higher off-road score", () => {
    const rugged = driverWith({ offRoad: 5 });
    const delicate = driverWith({ offRoad: 2 });
    expect(topSpeedOf(rugged, GRASS)).toBeGreaterThan(topSpeedOf(delicate, GRASS));
  });

  it("ignores the off-road score on the road", () => {
    const rugged = driverWith({ offRoad: 5 });
    const delicate = driverWith({ offRoad: 2 });
    expect(topSpeedOf(rugged, ROAD)).toBe(topSpeedOf(delicate, ROAD));
  });
});

describe("the rules behave the same in the browser and on the server", () => {
  // A drive with changing keys and changing ground, used by two tests below.
  const messyDrive = [
    [{ gas: true }, ROAD, 2],
    [{ gas: true, right: true }, ROAD, 1],
    [{ gas: true, left: true }, GRASS, 1.5],
    [{ brake: true, left: true }, GRASS, 2],
    [{}, ROAD, 0.5],
    [{ gas: true, brake: true, right: true }, ROAD, 1],
    [{ gas: true, right: true }, GRASS, 20],
    [{ brake: true }, ROAD, 20],
  ];

  function doMessyDrive() {
    let kart = createKart(50, 50, 1);
    for (const [keys, ground, seconds] of messyDrive) {
      kart = drive(kart, keys, seconds, TEST_DRIVER, ground);
    }
    return kart;
  }

  it("gives exactly the same result every time for the same keys", () => {
    expect(doMessyDrive()).toEqual(doMessyDrive());
  });

  it("keeps every number a real number through a long, messy drive", () => {
    const kart = doMessyDrive();
    for (const part of ["x", "y", "angle", "vx", "vy"]) {
      expect(Number.isFinite(kart[part]), part).toBe(true);
    }
  });

  it("does not change the kart it was given", () => {
    const before = Object.freeze(movingKart(100));
    const after = stepKart(before, { gas: true, right: true }, TEST_DRIVER, ROAD);
    expect(before).toEqual(movingKart(100));
    expect(after).not.toBe(before);
    expect(after.x).not.toBe(before.x);
  });

  it("keeps any extra information stored on the kart", () => {
    const kart = { ...createKart(0, 0), lap: 2 };
    expect(stepKart(kart, GAS, TEST_DRIVER, ROAD).lap).toBe(2);
  });
});

describe("the rules refuse bad input", () => {
  it("treats anything that is not exactly 'true' as a key that is not pressed", () => {
    const strangeKeys = { gas: "yes", brake: 1, left: "true", right: {} };
    const kart = drive(createKart(10, 10), strangeKeys, 1);
    expect(kart).toEqual(createKart(10, 10));
  });

  it("treats a missing set of keys as no keys pressed", () => {
    expect(stepKart(createKart(10, 10), undefined, TEST_DRIVER, ROAD)).toEqual(createKart(10, 10));
    expect(stepKart(createKart(10, 10), null, TEST_DRIVER, ROAD)).toEqual(createKart(10, 10));
  });

  it("pulls a score that is too high or too low back to the allowed scores", () => {
    expect(topSpeedOf(driverWith({ speed: 99 }))).toBe(topSpeedOf(driverWith({ speed: 5.75 })));
    expect(topSpeedOf(driverWith({ speed: -3 }))).toBe(topSpeedOf(driverWith({ speed: 1 })));
  });

  it("refuses a driver whose score is missing or is not a number", () => {
    const kart = createKart(0, 0);
    expect(() => stepKart(kart, GAS, driverWith({ speed: undefined }), ROAD)).toThrow(TypeError);
    expect(() => stepKart(kart, GAS, driverWith({ handling: "sharp" }), ROAD)).toThrow(TypeError);
    expect(() => stepKart(kart, GAS, driverWith({ grip: NaN }), ROAD)).toThrow(TypeError);
  });
});
