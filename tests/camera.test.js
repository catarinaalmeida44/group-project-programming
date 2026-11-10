// Tests for client/camera.js: the arithmetic behind the camera views.
//
// The painting itself (client/draw.js) needs a real page and is checked by
// eye. What can be tested here is where the camera points and where things
// land on the screen.

import { describe, it, expect } from "vitest";
import {
  VIEWS,
  SCREEN,
  FOLLOW,
  CHASE,
  nextView,
  followTarget,
  easeTowards,
  chaseNumbers,
  chaseRow,
  chasePoint,
  seenFromKart,
} from "../client/camera.js";
import { createKart } from "../shared/physics.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

/** A kart at a position, moving with a speed. */
function kartAt(x, y, vx = 0, vy = 0, angle = 0) {
  return { ...createKart(x, y, angle), vx, vy };
}

// How much of the track the follow view shows, in units, from the middle to each edge.
const HALF_WIDTH = SCREEN.width / FOLLOW.zoom / 2;
const HALF_HEIGHT = SCREEN.height / FOLLOW.zoom / 2;

describe("switching views", () => {
  it("goes through every view in turn and then starts again", () => {
    let view = VIEWS[0];
    const seen = [];
    for (let presses = 0; presses < VIEWS.length; presses++) {
      seen.push(view);
      view = nextView(view);
    }
    expect(seen).toEqual(VIEWS);
    expect(view).toBe(VIEWS[0]);
  });

  it("starts in the view from behind the kart, then goes to the view from above, then the whole track", () => {
    expect(VIEWS).toEqual(["chase", "follow", "map"]);
  });

  it("offers the three views: follow, chase and map", () => {
    expect([...VIEWS].sort()).toEqual(["chase", "follow", "map"]);
  });

  it("falls back to the first view when given a view that does not exist", () => {
    expect(nextView("upside-down")).toBe(VIEWS[0]);
  });
});

describe("the follow view", () => {
  it("puts a kart that stands still in the middle of the screen", () => {
    const target = followTarget(kartAt(480, 288), TEST_OVAL);
    expect(target).toEqual({ x: 480, y: 288 });
  });

  it("looks ahead in the direction the kart is moving", () => {
    expect(followTarget(kartAt(480, 288, 200, 0), TEST_OVAL).x).toBeGreaterThan(480);
    expect(followTarget(kartAt(480, 288, -200, 0), TEST_OVAL).x).toBeLessThan(480);
    expect(followTarget(kartAt(480, 288, 0, 200), TEST_OVAL).y).toBeGreaterThan(288);
    expect(followTarget(kartAt(480, 288, 0, -200), TEST_OVAL).y).toBeLessThan(288);
  });

  it("looks further ahead the faster the kart goes", () => {
    const slow = followTarget(kartAt(480, 288, 100, 0), TEST_OVAL);
    const fast = followTarget(kartAt(480, 288, 300, 0), TEST_OVAL);
    expect(fast.x).toBeGreaterThan(slow.x);
  });

  it("stops at every edge of the track, so the screen never shows what lies outside", () => {
    const corners = [kartAt(40, 40), kartAt(920, 40), kartAt(40, 536), kartAt(920, 536)];
    for (const kart of corners) {
      const target = followTarget(kart, TEST_OVAL);
      expect(target.x - HALF_WIDTH).toBeGreaterThanOrEqual(0);
      expect(target.x + HALF_WIDTH).toBeLessThanOrEqual(TEST_OVAL.width);
      expect(target.y - HALF_HEIGHT).toBeGreaterThanOrEqual(0);
      expect(target.y + HALF_HEIGHT).toBeLessThanOrEqual(TEST_OVAL.height);
    }
  });

  it("always keeps the kart on the screen, anywhere on the track and at any speed", () => {
    for (let x = 42; x < TEST_OVAL.width; x += 97) {
      for (let y = 42; y < TEST_OVAL.height; y += 61) {
        for (const [vx, vy] of [[0, 0], [360, 0], [-360, 0], [0, 360], [0, -360], [255, 255]]) {
          const target = followTarget(kartAt(x, y, vx, vy), TEST_OVAL);
          expect(Math.abs(x - target.x)).toBeLessThan(HALF_WIDTH);
          expect(Math.abs(y - target.y)).toBeLessThan(HALF_HEIGHT);
        }
      }
    }
  });

  it("shows a track that is smaller than the screen from its middle", () => {
    const tinyTrack = { width: 100, height: 60 };
    expect(followTarget(kartAt(10, 10, 300, 300), tinyTrack)).toEqual({ x: 50, y: 30 });
  });
});

describe("the camera glides instead of jumping", () => {
  const from = { x: 100, y: 100 };
  const to = { x: 200, y: 300 };

  it("moves part of the way towards where it wants to be", () => {
    const after = easeTowards(from, to, 1 / 60);
    expect(after.x).toBeGreaterThan(from.x);
    expect(after.x).toBeLessThan(to.x);
    expect(after.y).toBeGreaterThan(from.y);
    expect(after.y).toBeLessThan(to.y);
  });

  it("moves further when more time has passed", () => {
    const short = easeTowards(from, to, 1 / 60);
    const long = easeTowards(from, to, 1 / 10);
    expect(long.x).toBeGreaterThan(short.x);
  });

  it("never goes past where it wants to be, even after a very long time", () => {
    const after = easeTowards(from, to, 1000);
    expect(after.x).toBeCloseTo(to.x);
    expect(after.x).toBeLessThanOrEqual(to.x);
    expect(after.y).toBeLessThanOrEqual(to.y);
  });

  it("ends up in the same place whether the time passes in one go or in small pieces", () => {
    const oneGo = easeTowards(from, to, 0.2);
    let pieces = from;
    for (let piece = 0; piece < 12; piece++) {
      pieces = easeTowards(pieces, to, 0.2 / 12);
    }
    expect(pieces.x).toBeCloseTo(oneGo.x);
    expect(pieces.y).toBeCloseTo(oneGo.y);
  });

  it("stays where it is when no time has passed, or when time is not a sensible number", () => {
    expect(easeTowards(from, to, 0)).toEqual(from);
    expect(easeTowards(from, to, -1)).toEqual(from);
    expect(easeTowards(from, to, NaN)).toEqual(from);
  });

  it("stays where it is when it is already there", () => {
    expect(easeTowards(to, to, 0.5)).toEqual(to);
  });
});

describe("the chase view: what each row of the screen shows", () => {
  it("draws the ground at the kart's row at the kart's size, with the kart exactly there", () => {
    const row = chaseRow(CHASE.kartScreenY);
    expect(row.scale).toBeCloseTo(CHASE.kartScale);
    expect(row.ahead).toBeCloseTo(0);
  });

  it("shows the ground furthest ahead on the top row", () => {
    expect(chaseRow(0).ahead).toBeCloseTo(CHASE.viewAhead);
  });

  it("draws the top row at the 'far shrink' share of the kart's size", () => {
    expect(chaseRow(0).scale).toBeCloseTo(CHASE.kartScale * CHASE.farShrink);
  });

  it("draws things bigger, and shows ground that is closer, on every row further down", () => {
    for (let y = 1; y <= SCREEN.height; y++) {
      expect(chaseRow(y).scale).toBeGreaterThan(chaseRow(y - 1).scale);
      expect(chaseRow(y).ahead).toBeLessThan(chaseRow(y - 1).ahead);
    }
  });

  it("shows a little ground behind the kart at the bottom of the screen", () => {
    expect(chaseRow(SCREEN.height).ahead).toBeLessThan(0);
  });

  it("puts the horizon above the top of the screen, so every row shows ground", () => {
    expect(chaseNumbers().horizonY).toBeLessThan(0);
    expect(chaseRow(0).scale).toBeGreaterThan(0);
  });

  it("is more tilted with a lower 'far shrink'", () => {
    const gentle = chaseRow(0, { ...CHASE, farShrink: 0.8 });
    const steep = chaseRow(0, { ...CHASE, farShrink: 0.2 });
    expect(steep.scale).toBeLessThan(gentle.scale);
  });

  it("refuses a 'far shrink' that makes no sense", () => {
    for (const farShrink of [0, 1, -0.5, 1.5, NaN, undefined]) {
      expect(() => chaseNumbers({ ...CHASE, farShrink })).toThrow(RangeError);
    }
  });
});

describe("the chase view: where a spot on the ground lands on the screen", () => {
  it("puts the kart itself in the middle, on its row, at its size", () => {
    const point = chasePoint(0, 0);
    expect(point.x).toBeCloseTo(SCREEN.width / 2);
    expect(point.y).toBeCloseTo(CHASE.kartScreenY);
    expect(point.scale).toBeCloseTo(CHASE.kartScale);
  });

  it("puts spots further ahead higher on the screen and draws them smaller", () => {
    const near = chasePoint(50, 0);
    const far = chasePoint(250, 0);
    expect(near.y).toBeLessThan(CHASE.kartScreenY);
    expect(far.y).toBeLessThan(near.y);
    expect(far.scale).toBeLessThan(near.scale);
  });

  it("puts spots to the right of the kart on the right, and spots to the left on the left", () => {
    expect(chasePoint(100, 40).x).toBeGreaterThan(SCREEN.width / 2);
    expect(chasePoint(100, -40).x).toBeLessThan(SCREEN.width / 2);
  });

  it("draws the same sideways distance narrower when it is further ahead", () => {
    const nearGap = chasePoint(50, 40).x - chasePoint(50, 0).x;
    const farGap = chasePoint(250, 40).x - chasePoint(250, 0).x;
    expect(farGap).toBeLessThan(nearGap);
  });

  it("agrees with chaseRow: a spot lands on the row that shows that distance", () => {
    for (const y of [0, 100, 250, CHASE.kartScreenY, SCREEN.height]) {
      const row = chaseRow(y);
      const point = chasePoint(row.ahead, 0);
      expect(point.y).toBeCloseTo(y);
      expect(point.scale).toBeCloseTo(row.scale);
    }
  });

  it("gives nothing for a spot behind the camera", () => {
    expect(chasePoint(-100000, 0)).toBe(null);
  });
});

describe("where a spot is, seen from the kart", () => {
  it("says a spot in front of a kart pointing right is ahead", () => {
    const seen = seenFromKart(kartAt(100, 100, 0, 0, 0), 150, 100);
    expect(seen.ahead).toBeCloseTo(50);
    expect(seen.sideways).toBeCloseTo(0);
  });

  it("says a spot below a kart pointing right is on its right-hand side", () => {
    // On a screen, "down" is to the right of something that points right.
    const seen = seenFromKart(kartAt(100, 100, 0, 0, 0), 100, 130);
    expect(seen.ahead).toBeCloseTo(0);
    expect(seen.sideways).toBeCloseTo(30);
  });

  it("turns with the kart: the same spot is ahead of a kart that points down", () => {
    const seen = seenFromKart(kartAt(100, 100, 0, 0, Math.PI / 2), 100, 130);
    expect(seen.ahead).toBeCloseTo(30);
    expect(seen.sideways).toBeCloseTo(0);
  });

  it("says a spot behind the kart is a negative distance ahead", () => {
    expect(seenFromKart(kartAt(100, 100, 0, 0, 0), 60, 100).ahead).toBeCloseTo(-40);
  });

  it("says the kart's own position is zero ahead and zero sideways", () => {
    const seen = seenFromKart(kartAt(100, 100, 0, 0, 1.2), 100, 100);
    expect(seen.ahead).toBeCloseTo(0);
    expect(seen.sideways).toBeCloseTo(0);
  });
});
