// Tests for the camera of the race view in client/camera.js: RACE, the
// camera low behind the kart with the horizon on the screen, and the helpers
// that bring the camera down at the start and swing it round behind the kart.
// (The older tests of the camera are in camera.test.js. They are unchanged:
// the high view they describe, CHASE, is still the one a race opens with.)
//
// Also here: what depends on the countdown (client/scene.js), the route of
// a track (client/route.js) and the directions of the sky (client/sky.js).
// All of it is arithmetic for the picture. None of it can change a race.

import { describe, it, expect } from "vitest";
import { SCREEN, CHASE, RACE, chaseNumbers, chaseRow, chasePoint, eyeOf, blendChase, easeAngle } from "../client/camera.js";
import { introShare, startLights, spinTurnOf } from "../client/scene.js";
import { routePoints, routeDirection, isWrongWay, watchForWrongWay, bendsOf, WRONG_WAY_SPEED } from "../client/route.js";
import { acrossScreen, directionOfColumn, isBetween } from "../client/sky.js";
import { COUNTDOWN_STEPS } from "../shared/countdown.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

describe("the race camera", () => {
  it("has the horizon on the screen, above the kart, so there is sky to see", () => {
    const { horizonY } = chaseNumbers(RACE);
    expect(horizonY).toBeGreaterThan(0);
    expect(horizonY).toBeLessThan(RACE.kartScreenY);
    expect(RACE.kartScreenY).toBeLessThan(SCREEN.height);
  });

  it("draws the ground at the kart at the kart's own size, on the kart's own row", () => {
    const row = chaseRow(RACE.kartScreenY, RACE);
    expect(row.scale).toBeCloseTo(RACE.kartScale);
    expect(row.ahead).toBeCloseTo(0);
  });

  it("shows ground further ahead on every row from the bottom of the screen up to the horizon, and smaller", () => {
    const { horizonY } = chaseNumbers(RACE);
    for (let y = Math.ceil(horizonY) + 2; y <= SCREEN.height; y++) {
      expect(chaseRow(y, RACE).scale).toBeGreaterThan(chaseRow(y - 1, RACE).scale);
      expect(chaseRow(y, RACE).ahead).toBeLessThan(chaseRow(y - 1, RACE).ahead);
    }
    expect(chaseRow(SCREEN.height, RACE).ahead).toBeLessThan(0); // the bottom row is behind the kart
  });

  it("sees much further than the high view: the row just under the horizon is far away", () => {
    const { horizonY } = chaseNumbers(RACE);
    expect(chaseRow(Math.ceil(horizonY) + 1, RACE).ahead).toBeGreaterThan(CHASE.viewAhead * 10);
  });

  it("places a spot on the ground on the row that shows that distance", () => {
    for (const y of [260, 330, RACE.kartScreenY, 540]) {
      const row = chaseRow(y, RACE);
      const point = chasePoint(row.ahead, 0, RACE);
      expect(point.y).toBeCloseTo(y);
      expect(point.scale).toBeCloseTo(row.scale);
    }
  });

  it("is lower and closer than the high view", () => {
    expect(eyeOf(RACE).height).toBeLessThan(eyeOf(CHASE).height / 2);
    expect(eyeOf(RACE).behind).toBeLessThan(eyeOf(CHASE).behind);
    expect(eyeOf(RACE).height).toBeGreaterThan(20); // but above the kart, which is about 16 units tall
  });

  it("refuses settings that put the horizon on or below the kart, or a lens of no strength", () => {
    expect(() => chaseNumbers({ ...RACE, horizonY: RACE.kartScreenY })).toThrow(RangeError);
    expect(() => chaseNumbers({ ...RACE, horizonY: 600 })).toThrow(RangeError);
    expect(() => chaseNumbers({ ...RACE, depth: 0 })).toThrow(RangeError);
    expect(() => chaseNumbers({ ...RACE, depth: -5 })).toThrow(RangeError);
    expect(() => chaseNumbers({ ...RACE, kartScale: 0 })).toThrow(RangeError);
  });
});

describe("bringing the camera down at the start", () => {
  it("is the high view at share 0 and the race view at share 1", () => {
    for (const [share, target] of [[0, CHASE], [1, RACE]]) {
      const blended = chaseNumbers(blendChase(CHASE, RACE, share));
      const wanted = chaseNumbers(target);
      expect(blended.horizonY).toBeCloseTo(wanted.horizonY);
      expect(blended.growthPerRow).toBeCloseTo(wanted.growthPerRow);
      expect(blended.depth).toBeCloseTo(wanted.depth);
    }
  });

  it("keeps the kart on the screen and the eye above it all the way down", () => {
    let lastHeight = Infinity;
    for (let share = 0; share <= 1.0001; share += 0.05) {
      const settings = blendChase(CHASE, RACE, share);
      const kart = chasePoint(0, 0, settings);
      expect(kart.y).toBeGreaterThan(0);
      expect(kart.y).toBeLessThan(SCREEN.height);
      const height = eyeOf(settings).height;
      expect(height).toBeGreaterThan(20);
      expect(height).toBeLessThanOrEqual(lastHeight + 1e-9); // the eye only ever comes down
      lastHeight = height;
    }
  });

  it("does not go beyond either end for a share outside 0 to 1", () => {
    expect(blendChase(CHASE, RACE, -3)).toEqual(blendChase(CHASE, RACE, 0));
    expect(blendChase(CHASE, RACE, 7)).toEqual(blendChase(CHASE, RACE, 1));
  });

  it("stays up before the countdown, comes down during it, and is down a moment before GO", () => {
    expect(introShare(true, 0)).toBe(0);
    expect(introShare(true, COUNTDOWN_STEPS / 2)).toBeGreaterThan(0.3);
    expect(introShare(true, COUNTDOWN_STEPS / 2)).toBeLessThan(1);
    expect(introShare(true, COUNTDOWN_STEPS - 1)).toBe(1);
    expect(introShare(true, COUNTDOWN_STEPS * 3)).toBe(1);
    let last = -1;
    for (let step = 0; step <= COUNTDOWN_STEPS; step++) {
      expect(introShare(true, step)).toBeGreaterThanOrEqual(last);
      last = introShare(true, step);
    }
  });

  it("is down whenever no countdown is running, and stays up on a step count that makes no sense", () => {
    expect(introShare(false, 0)).toBe(1);
    expect(introShare(false, 50)).toBe(1);
    for (const strange of [-1, 1.5, NaN, "10", null, undefined]) {
      expect(introShare(true, strange)).toBe(0);
    }
  });
});

describe("the start lights", () => {
  it("light one more red lamp for each number, then turn green at GO, then go out", () => {
    expect(startLights(true, 0)).toEqual({ red: 1, green: false }); //                       "3"
    expect(startLights(true, COUNTDOWN_STEPS / 3)).toEqual({ red: 2, green: false }); //     "2"
    expect(startLights(true, (COUNTDOWN_STEPS * 2) / 3)).toEqual({ red: 3, green: false }); // "1"
    expect(startLights(true, COUNTDOWN_STEPS - 1)).toEqual({ red: 3, green: false });
    expect(startLights(true, COUNTDOWN_STEPS)).toEqual({ red: 0, green: true }); //          "GO!"
    expect(startLights(true, COUNTDOWN_STEPS * 3)).toEqual({ red: 0, green: false });
  });

  it("are never green before GO", () => {
    for (let step = 0; step < COUNTDOWN_STEPS; step++) {
      expect(startLights(true, step).green).toBe(false);
    }
  });

  it("are off outside a countdown and for a step count that makes no sense", () => {
    expect(startLights(false, 30)).toEqual({ red: 0, green: false });
    for (const strange of [-1, 1.5, NaN, "10", null, undefined]) {
      expect(startLights(true, strange)).toEqual({ red: 0, green: false });
    }
  });
});

describe("swinging the camera round behind the kart", () => {
  it("turns part of the way towards the kart's direction, and all the way given time", () => {
    const after = easeAngle(0, 1, 0.1, 6.5);
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(1);
    expect(easeAngle(0, 1, 100, 6.5)).toBeCloseTo(1);
    expect(easeAngle(0.4, 1, 0, 6.5)).toBe(0.4); // no time has passed: no turning
  });

  it("goes the short way round", () => {
    // From just before a full turn to just after it: a small step forwards, not a whole turn back.
    const from = Math.PI * 2 - 0.1;
    const to = 0.1;
    const after = easeAngle(from, to, 0.1, 6.5);
    expect(after).toBeGreaterThan(from);
    expect(after).toBeLessThan(from + 0.2);
  });
});

describe("the route of a track", () => {
  // The middle of the road round the test oval, clockwise.
  const points = routePoints(TEST_OVAL, [[2.5, 2.5], [26.5, 2.5], [26.5, 14.5], [2.5, 14.5]]);
  const kart = (x, y, vx, vy) => ({ x, y, vx, vy, angle: 0 });

  it("is given in units of track, and not at all without at least three points", () => {
    expect(points[0]).toEqual({ x: 96, y: 96 });
    expect(points[2]).toEqual({ x: 864, y: 480 });
    for (const route of [null, undefined, [], [[1, 1], [2, 2]], "round"]) {
      expect(routePoints(TEST_OVAL, route)).toBe(null);
    }
  });

  it("knows which way the road runs on each side of the oval", () => {
    expect(routeDirection(points, 480, 96)).toBeCloseTo(0); //              top straight: to the right
    expect(routeDirection(points, 864, 300)).toBeCloseTo(Math.PI / 2); //   right side: down the map
    expect(Math.abs(routeDirection(points, 480, 480))).toBeCloseTo(Math.PI); // bottom straight: to the left
    expect(routeDirection(points, 96, 300)).toBeCloseTo(-Math.PI / 2); //   left side: up the map
  });

  it("uses the stretch that passes closest, also for a kart that has left the road", () => {
    expect(routeDirection(points, 480, 140)).toBeCloseTo(0); // on the grass under the top straight
    expect(routeDirection(points, 900, 300)).toBeCloseTo(Math.PI / 2);
  });

  it("says 'wrong way' for a kart driving against the road", () => {
    expect(isWrongWay(points, kart(480, 96, -200, 0))).toBe(true); //  left along the top straight
    expect(isWrongWay(points, kart(864, 300, 0, -200))).toBe(true); // up the right side
  });

  it("does not say it for a kart going the right way, crossing the road, or cutting a corner", () => {
    expect(isWrongWay(points, kart(480, 96, 200, 0))).toBe(false);
    expect(isWrongWay(points, kart(480, 96, 0, 200))).toBe(false); //    straight across
    expect(isWrongWay(points, kart(480, 96, 150, 150))).toBe(false);
    expect(isWrongWay(points, kart(480, 96, -60, 190))).toBe(false); //  mostly across, a little backwards
  });

  it("does not say it for a kart that is standing, turning round slowly, or rolling back after a bump", () => {
    expect(isWrongWay(points, kart(480, 96, 0, 0))).toBe(false);
    expect(isWrongWay(points, kart(480, 96, -(WRONG_WAY_SPEED - 1), 0))).toBe(false);
    expect(isWrongWay(points, kart(480, 96, -WRONG_WAY_SPEED, 0))).toBe(true);
  });

  it("never says it on a track without a route, or for a kart with a broken speed", () => {
    expect(isWrongWay(null, kart(480, 96, -200, 0))).toBe(false);
    expect(isWrongWay(points, kart(480, 96, NaN, 0))).toBe(false);
    expect(isWrongWay(points, { x: 480, y: 96 })).toBe(false);
  });

  it("finds the four bends of the oval, all to the right", () => {
    const bends = bendsOf(points);
    expect(bends).toHaveLength(4);
    expect(bends.every((bend) => bend.turn === "right")).toBe(true);
    expect(bendsOf(null)).toEqual([]);
  });

  it("tells a left bend from a right one, and ignores a gentle curve", () => {
    // East, then north (up the map, a left turn), then east again (a right turn), with a gentle kink first.
    const zigzag = [
      { x: 0, y: 300 },
      { x: 200, y: 310 },
      { x: 400, y: 300 },
      { x: 400, y: 100 },
      { x: 700, y: 100 },
      { x: 700, y: 600 },
      { x: 0, y: 600 },
    ];
    const turns = bendsOf(zigzag).map((bend) => `${bend.x},${bend.y} ${bend.turn}`);
    expect(turns).toContain("400,300 left");
    expect(turns).toContain("400,100 right");
    expect(turns.some((turn) => turn.startsWith("200,310"))).toBe(false);
  });
});

describe("the 'wrong way' warning", () => {
  const points = routePoints(TEST_OVAL, [[2.5, 2.5], [26.5, 2.5], [26.5, 14.5], [2.5, 14.5]]);
  const backwards = { x: 480, y: 96, vx: -200, vy: 0 };
  const forwards = { x: 480, y: 96, vx: 200, vy: 0 };

  it("comes only after the kart has driven the wrong way for a moment, not at once", () => {
    const check = watchForWrongWay(points, 0.7);
    expect(check(backwards, 10.0)).toBe(false);
    expect(check(backwards, 10.5)).toBe(false);
    expect(check(backwards, 10.75)).toBe(true);
    expect(check(backwards, 12)).toBe(true);
  });

  it("goes away at once when the kart turns the right way, and waits again the next time", () => {
    const check = watchForWrongWay(points, 0.7);
    check(backwards, 10);
    expect(check(backwards, 11)).toBe(true);
    expect(check(forwards, 11.1)).toBe(false);
    expect(check(backwards, 11.2)).toBe(false); // the waiting starts over
    expect(check(backwards, 11.95)).toBe(true);
  });

  it("is not set off by a kart that is spun round for a moment", () => {
    const check = watchForWrongWay(points, 0.7);
    expect(check(backwards, 5.0)).toBe(false);
    expect(check(backwards, 5.3)).toBe(false);
    expect(check(forwards, 5.4)).toBe(false);
    expect(check(forwards, 9)).toBe(false);
  });

  it("never comes on a track without a route", () => {
    const check = watchForWrongWay(null);
    expect(check(backwards, 0)).toBe(false);
    expect(check(backwards, 100)).toBe(false);
  });
});

describe("how a spinning kart is drawn", () => {
  const WHOLE = 72; // steps a spin lasts, for these tests

  it("is not turned at all when it is not spinning", () => {
    expect(spinTurnOf(0, WHOLE)).toBe(0);
    for (const strange of [-3, NaN, undefined, null, "5"]) {
      expect(spinTurnOf(strange, WHOLE)).toBe(0);
    }
    expect(spinTurnOf(10, 0)).toBe(0);
  });

  it("turns further and further during the spin, and never backwards", () => {
    let last = -1;
    for (let left = WHOLE; left >= 1; left--) {
      const turn = spinTurnOf(left, WHOLE);
      expect(turn).toBeGreaterThanOrEqual(last);
      last = turn;
    }
    expect(spinTurnOf(WHOLE, WHOLE)).toBe(0); // the very first step: not yet turned
  });

  it("ends on whole turns, so the kart does not jump when the spin is over", () => {
    const atTheEnd = spinTurnOf(0.0001, WHOLE);
    const turns = atTheEnd / (Math.PI * 2);
    expect(Math.abs(turns - Math.round(turns))).toBeLessThan(0.001);
    expect(Math.round(turns)).toBeGreaterThanOrEqual(1);
  });

  it("spins fastest at the start and slows down", () => {
    const early = spinTurnOf(WHOLE - 10, WHOLE) - spinTurnOf(WHOLE, WHOLE);
    const late = spinTurnOf(1, WHOLE) - spinTurnOf(11, WHOLE);
    expect(early).toBeGreaterThan(late);
  });
});

describe("directions in the sky", () => {
  const depth = RACE.depth;

  it("puts what lies straight ahead in the middle of the screen, and what lies to the right on the right", () => {
    expect(acrossScreen(1, 1, depth, SCREEN.width)).toBeCloseTo(SCREEN.width / 2);
    expect(acrossScreen(1.3, 1, depth, SCREEN.width)).toBeGreaterThan(SCREEN.width / 2);
    expect(acrossScreen(0.7, 1, depth, SCREEN.width)).toBeLessThan(SCREEN.width / 2);
  });

  it("leaves out what lies to the side or behind", () => {
    expect(acrossScreen(1 + Math.PI, 1, depth, SCREEN.width)).toBe(null);
    expect(acrossScreen(1 + Math.PI / 2, 1, depth, SCREEN.width)).toBe(null);
  });

  it("works across the full turn", () => {
    // Looking at 6.2, just before a full turn; the thing is at 0.1, just after it.
    expect(acrossScreen(0.1, 6.2, depth, SCREEN.width)).toBeGreaterThan(SCREEN.width / 2);
    expect(acrossScreen(0.1, 6.2, depth, SCREEN.width)).toBeLessThan(SCREEN.width);
  });

  it("gives every column of the screen the direction that lands on that column", () => {
    for (const x of [0, 200, 480, 700, 960]) {
      const towards = directionOfColumn(x, 2, depth, SCREEN.width);
      expect(acrossScreen(towards, 2, depth, SCREEN.width)).toBeCloseTo(x);
    }
  });

  it("knows whether a direction is inside a stretch of the horizon, also one that crosses the full turn", () => {
    expect(isBetween(1, 0.5, 2)).toBe(true);
    expect(isBetween(3, 0.5, 2)).toBe(false);
    // A stretch from 5 round to 1 (through 6.28, which is the same as 0).
    expect(isBetween(6, 5, 1 + Math.PI * 2)).toBe(true);
    expect(isBetween(0.5, 5, 1 + Math.PI * 2)).toBe(true);
    expect(isBetween(3, 5, 1 + Math.PI * 2)).toBe(false);
    expect(isBetween(1 - Math.PI * 4, 0.5, 2)).toBe(true); // the same direction, two turns back
    expect(isBetween(2.5, 0, Math.PI * 2)).toBe(true); //     a stretch all the way round holds everything
  });
});
