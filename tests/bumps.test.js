// Tests for shared/bumps.js (karts bumping into each other) and for the way
// server/room.js uses it.
//
// Most tests place two karts by hand so that their circles overlap, call
// bumpKarts() once, and look at where the karts are and how fast they move
// afterwards. The tests further down drive karts in a room.

import { describe, it, expect } from "vitest";
import { bumpKarts, KART_BUMP_RADIUS, BUMP_BOUNCE } from "../shared/bumps.js";
import { createTrack, tileKindAt, bounceOffWalls } from "../shared/track.js";
import { createKart, stepKart, speedOf } from "../shared/physics.js";
import { KART_RADIUS } from "../shared/race.js";
import { gridSpot } from "../shared/grid.js";
import { COUNTDOWN_STEPS } from "../shared/countdown.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { createRoom } from "../server/room.js";
import { createSprintTrack } from "./sprint-track.js";

const TOUCHING = 2 * KART_BUMP_RADIUS; // two karts this far apart only just touch
const TINY = 0.00001; //                  room for rounding in the arithmetic

// A big empty room: 20 tiles of road wide, 10 tall, each tile 32 units.
// The open ground goes from x=32 to x=672 and from y=32 to y=352.
const ARENA = createTrack({
  name: "Arena",
  tileSize: 32,
  laps: 1,
  map: [
    "######################",
    "#....................#",
    "#....................#",
    "#....................#",
    "#....................#",
    "#....................#",
    "#....................#",
    "#....................#",
    "#....................#",
    "#....................#",
    "#....................#",
    "######################",
  ],
  start: { column: 2, row: 2, angle: 0 },
  checkpoints: [
    { name: "finish line", column: 1, row: 1, columns: 1, rows: 1 },
    { name: "a", column: 20, row: 1, columns: 1, rows: 1 },
    { name: "b", column: 20, row: 10, columns: 1, rows: 1 },
  ],
});

/** A kart at a position with a speed. */
function kartAt(x, y, vx = 0, vy = 0, angle = 0) {
  return { ...createKart(x, y, angle), vx, vy };
}

/** How far apart the middles of two karts are. */
function gap(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** How much the karts move altogether: the sum of speed times speed. A bump must never make this bigger. */
function energyOf(karts, weights = []) {
  return karts.reduce((sum, kart, index) => sum + (weights[index] ?? 1) * (kart.vx ** 2 + kart.vy ** 2), 0);
}

function allNumbersAreReal(karts) {
  return karts.every((kart) => [kart.x, kart.y, kart.vx, kart.vy, kart.angle].every(Number.isFinite));
}

describe("the size of a kart for bumps", () => {
  it("is a tight circle, the same as the one used for walls", () => {
    expect(KART_BUMP_RADIUS).toBe(10);
    expect(KART_BUMP_RADIUS).toBe(KART_RADIUS);
  });

  it("loses half of the closing speed in a bump", () => {
    expect(BUMP_BOUNCE).toBe(0.5);
  });
});

describe("karts that do not touch", () => {
  it("are given back exactly as they were", () => {
    const karts = [kartAt(100, 100, 200, 0), kartAt(100, 100 + TOUCHING + 1, 0, 50), kartAt(400, 300)];
    expect(bumpKarts(ARENA, karts)).toBe(karts);
  });

  it("do not bump when their circles only just touch", () => {
    const karts = [kartAt(100, 100, 200, 0), kartAt(100 + TOUCHING, 100, -200, 0)];
    expect(bumpKarts(ARENA, karts)).toBe(karts);
  });

  it("copes with no karts and with one kart", () => {
    expect(bumpKarts(ARENA, [])).toEqual([]);
    const alone = [kartAt(100, 100, 300, 0)];
    expect(bumpKarts(ARENA, alone)).toBe(alone);
  });
});

describe("two karts that overlap", () => {
  it("are pushed apart along the line between them, until they only just touch", () => {
    const [a, b] = bumpKarts(ARENA, [kartAt(200, 200), kartAt(212, 200)]);
    expect(gap(a, b)).toBeCloseTo(TOUCHING);
    expect(a.y).toBe(200); // the line between them is level, so nobody moves up or down
    expect(b.y).toBe(200);
  });

  it("each move half of the way, so the point between them stays where it was", () => {
    const [a, b] = bumpKarts(ARENA, [kartAt(200, 200), kartAt(206, 208)]);
    expect((a.x + b.x) / 2).toBeCloseTo(203);
    expect((a.y + b.y) / 2).toBeCloseTo(204);
    expect(gap(a, b)).toBeCloseTo(TOUCHING);
    // Still on the same line: 3 across for every 4 down.
    expect((b.y - a.y) / (b.x - a.x)).toBeCloseTo(8 / 6);
  });

  it("stay still if they were standing still: being pushed apart gives no speed", () => {
    const [a, b] = bumpKarts(ARENA, [kartAt(200, 200), kartAt(212, 200)]);
    expect(speedOf(a)).toBe(0);
    expect(speedOf(b)).toBe(0);
  });

  it("shove the kart in front forward and slow the kart behind, when one runs into the back of the other", () => {
    // Both drive to the right. The one behind is faster.
    const [behind, inFront] = bumpKarts(ARENA, [kartAt(200, 200, 300, 0), kartAt(215, 200, 100, 0)]);
    expect(behind.vx).toBeCloseTo(150);
    expect(inFront.vx).toBeCloseTo(250);
    expect(behind.vx).toBeLessThan(300);
    expect(inFront.vx).toBeGreaterThan(100);
    expect(behind.x).toBeLessThan(inFront.x); // and it is still behind
  });

  it("pass most of the speed on to a kart that was standing still", () => {
    const [moving, standing] = bumpKarts(ARENA, [kartAt(200, 200, 200, 0), kartAt(215, 200)]);
    expect(moving.vx).toBeCloseTo(50);
    expect(standing.vx).toBeCloseTo(150);
  });

  it("are both sent back at half speed when they meet head-on", () => {
    const [left, right] = bumpKarts(ARENA, [kartAt(200, 200, 200, 0), kartAt(215, 200, -200, 0)]);
    expect(left.vx).toBeCloseTo(-200 * BUMP_BOUNCE);
    expect(right.vx).toBeCloseTo(200 * BUMP_BOUNCE);
  });

  it("are pushed sideways by a side swipe, and keep their forward speed", () => {
    // Side by side, both driving right at 250. The upper one drifts down into the lower one.
    const [upper, lower] = bumpKarts(ARENA, [kartAt(200, 200, 250, 60), kartAt(200, 215, 250, 0)]);
    expect(upper.vx).toBeCloseTo(250);
    expect(lower.vx).toBeCloseTo(250);
    expect(upper.vy).toBeCloseTo(15);
    expect(lower.vy).toBeCloseTo(45);
  });

  it("keep the part of their speed that goes across the line between them", () => {
    // The line between them is level. Their speeds up and down the screen are not touched.
    const [a, b] = bumpKarts(ARENA, [kartAt(200, 200, 100, 70), kartAt(215, 200, -100, -30)]);
    expect(a.vy).toBeCloseTo(70);
    expect(b.vy).toBeCloseTo(-30);
  });

  it("keep their speeds when they are already moving apart, but are still pushed apart", () => {
    const [a, b] = bumpKarts(ARENA, [kartAt(200, 200, -50, 0), kartAt(215, 200, 80, 0)]);
    expect(a.vx).toBe(-50);
    expect(b.vx).toBe(80);
    expect(gap(a, b)).toBeCloseTo(TOUCHING);
  });

  it("are not turned: a bump never changes the direction a kart points", () => {
    const [a, b] = bumpKarts(ARENA, [kartAt(200, 200, 200, 0, 0.3), kartAt(215, 200, -200, 0, 2.9)]);
    expect(a.angle).toBe(0.3);
    expect(b.angle).toBe(2.9);
  });

  it("keep any extra information stored on them", () => {
    const [a] = bumpKarts(ARENA, [{ ...kartAt(200, 200, 200, 0), colour: "red" }, kartAt(215, 200)]);
    expect(a.colour).toBe("red");
  });
});

describe("what a bump must NOT do: let karts pass through each other", () => {
  /** Moves every kart by its speed for one step, keeps them out of the walls, and lets them bump. */
  function driftOneStep(karts) {
    const moved = karts.map((kart) => ({ ...kart, x: kart.x + kart.vx / 60, y: kart.y + kart.vy / 60 }));
    return bumpKarts(
      ARENA,
      moved.map((kart) => bounceOffWalls(ARENA, kart, KART_RADIUS)),
    );
  }

  it("stops two karts that fly at each other faster than any driver can go", () => {
    // 360 units a second is the top speed of the fastest driver the rules allow.
    let karts = [kartAt(100, 200, 360, 0), kartAt(600, 200, -360, 0)];
    let closestTheyGot = Infinity;
    for (let step = 0; step < 120; step++) {
      karts = driftOneStep(karts);
      expect(karts[0].x).toBeLessThan(karts[1].x); // the left one is still on the left
      expect(gap(karts[0], karts[1])).toBeGreaterThanOrEqual(TOUCHING - TINY);
      closestTheyGot = Math.min(closestTheyGot, gap(karts[0], karts[1]));
    }
    expect(closestTheyGot).toBeLessThan(TOUCHING + 1); // they really did meet
  });

  it("stops them even when both keep pushing at that speed, step after step", () => {
    let karts = [kartAt(300, 200), kartAt(400, 200)];
    for (let step = 0; step < 240; step++) {
      karts = [
        { ...karts[0], vx: 360, vy: 0 },
        { ...karts[1], vx: -360, vy: 0 },
      ];
      karts = driftOneStep(karts);
      expect(karts[0].x).toBeLessThan(karts[1].x);
      expect(gap(karts[0], karts[1])).toBeGreaterThanOrEqual(TOUCHING - TINY);
    }
  });

  it("stops a kart at top speed from driving through one that stands still", () => {
    let karts = [kartAt(100, 200, 360, 0), kartAt(400, 200)];
    for (let step = 0; step < 120; step++) {
      karts = driftOneStep(karts);
      expect(karts[0].x).toBeLessThan(karts[1].x);
    }
    expect(karts[1].x).toBeGreaterThan(400); // the standing kart was shoved along instead
  });

  it("stops two karts driven flat out at each other with the real driving rules", () => {
    const GAS = { gas: true };
    let karts = [createKart(60, 200, 0), createKart(640, 200, Math.PI)]; // facing each other
    let fastestMeeting = 0;
    for (let step = 0; step < 600; step++) {
      const moved = karts.map((kart) => bounceOffWalls(ARENA, stepKart(kart, GAS, TEST_DRIVER), KART_RADIUS));
      const closing = moved[0].vx - moved[1].vx;
      if (gap(moved[0], moved[1]) < TOUCHING) {
        fastestMeeting = Math.max(fastestMeeting, closing);
      }
      karts = bumpKarts(ARENA, moved);
      expect(karts[0].x).toBeLessThan(karts[1].x);
      expect(gap(karts[0], karts[1])).toBeGreaterThanOrEqual(TOUCHING - TINY);
    }
    expect(fastestMeeting).toBeGreaterThan(400); // they met at speed
  });
});

describe("what a bump must NOT do: create speed out of nothing", () => {
  // Many pairs: the second kart on every side of the first, overlapping a
  // little or a lot, with every combination of these speeds.
  const SPEEDS = [
    [0, 0],
    [300, 0],
    [-300, 0],
    [0, 220],
    [0, -220],
    [150, 150],
    [-90, 260],
    [360, -360],
  ];
  const pairs = [];
  for (let direction = 0; direction < 16; direction++) {
    for (const apart of [1, 8, 15, 19.5]) {
      for (const [avx, avy] of SPEEDS) {
        for (const [bvx, bvy] of SPEEDS) {
          const angle = (direction * Math.PI) / 8 + 0.1;
          pairs.push([
            kartAt(300, 200, avx, avy),
            kartAt(300 + Math.cos(angle) * apart, 200 + Math.sin(angle) * apart, bvx, bvy),
          ]);
        }
      }
    }
  }

  /** The part of a kart's speed that goes along the line from kart a to kart b. */
  function alongLine(kart, a, b) {
    return (kart.vx * (b.x - a.x) + kart.vy * (b.y - a.y)) / gap(a, b);
  }

  it("never lets the two karts together move faster along the line between them than before", () => {
    expect(pairs.length).toBeGreaterThan(4000);
    for (const [a, b] of pairs) {
      const [afterA, afterB] = bumpKarts(ARENA, [a, b]);
      const before = Math.abs(alongLine(a, a, b)) + Math.abs(alongLine(b, a, b));
      const after = Math.abs(alongLine(afterA, a, b)) + Math.abs(alongLine(afterB, a, b));
      expect(after).toBeLessThanOrEqual(before + TINY);
    }
  });

  it("only passes speed from one kart to the other: what one loses along the line, the other gains", () => {
    for (const [a, b] of pairs) {
      const [afterA, afterB] = bumpKarts(ARENA, [a, b]);
      expect(afterA.vx + afterB.vx).toBeCloseTo(a.vx + b.vx);
      expect(afterA.vy + afterB.vy).toBeCloseTo(a.vy + b.vy);
    }
  });

  it("never leaves the two karts with more movement altogether than they had", () => {
    for (const [a, b] of pairs) {
      const after = bumpKarts(ARENA, [a, b]);
      expect(energyOf(after)).toBeLessThanOrEqual(energyOf([a, b]) + TINY);
    }
  });

  it("never does so in a pile-up of many karts either", () => {
    const pile = [
      kartAt(300, 200, 300, 0),
      kartAt(312, 204, -200, 50),
      kartAt(305, 215, 0, -300),
      kartAt(322, 190, -100, 100),
      kartAt(296, 186, 250, 250),
      kartAt(318, 222, 0, 0),
    ];
    let karts = pile;
    for (let time = 0; time < 5; time++) {
      const after = bumpKarts(ARENA, karts);
      expect(energyOf(after)).toBeLessThanOrEqual(energyOf(karts) + TINY);
      expect(allNumbersAreReal(after)).toBe(true);
      karts = after;
    }
  });
});

describe("what a bump must NOT do: leave a kart inside a wall", () => {
  /** True if the kart's circle is clear of every wall: the wall rule has nothing to do. */
  function clearOfWalls(track, kart) {
    return bounceOffWalls(track, kart, KART_RADIUS) === kart;
  }

  it("does not push a kart into the wall it is standing against", () => {
    // The left wall ends at x=32, so a kart at x=42 only just touches it.
    const [atWall, hitter] = bumpKarts(ARENA, [kartAt(42, 200), kartAt(55, 200, -360, 0)]);
    expect(atWall.x).toBeGreaterThanOrEqual(42 - TINY);
    expect(clearOfWalls(ARENA, atWall)).toBe(true);
    expect(clearOfWalls(ARENA, hitter)).toBe(true);
    expect(tileKindAt(ARENA, atWall.x, atWall.y)).toBe("road");
    expect(hitter.x).toBeGreaterThan(atWall.x); // and the hitter did not get past it
  });

  it("bounces a kart off the wall it was bumped into, instead of leaving it heading into the wall", () => {
    const [atWall] = bumpKarts(ARENA, [kartAt(44, 200), kartAt(58, 200, -300, 0)]);
    expect(atWall.vx).toBeGreaterThanOrEqual(0);
  });

  it("keeps a kart out of the wall while another rams it at top speed, step after step", () => {
    let karts = [kartAt(42, 200), kartAt(120, 200)];
    for (let step = 0; step < 120; step++) {
      karts = [karts[0], { ...karts[1], vx: -360, vy: 0 }]; // the rammer never lets up
      const moved = karts.map((kart) => ({ ...kart, x: kart.x + kart.vx / 60, y: kart.y + kart.vy / 60 }));
      karts = bumpKarts(
        ARENA,
        moved.map((kart) => bounceOffWalls(ARENA, kart, KART_RADIUS)),
      );
      expect(clearOfWalls(ARENA, karts[0])).toBe(true);
      expect(clearOfWalls(ARENA, karts[1])).toBe(true);
      expect(karts[0].x).toBeGreaterThanOrEqual(42 - TINY);
      expect(karts[1].x).toBeGreaterThan(karts[0].x);
    }
  });

  it("keeps every kart of a pile-up in a corner out of both walls", () => {
    const pile = [
      kartAt(42, 42),
      kartAt(50, 44, -200, -100),
      kartAt(45, 55, -50, -300),
      kartAt(60, 58, -360, -360),
      kartAt(48, 48),
    ];
    const after = bumpKarts(ARENA, pile);
    for (const kart of after) {
      expect(clearOfWalls(ARENA, kart)).toBe(true);
      expect(tileKindAt(ARENA, kart.x, kart.y)).toBe("road");
    }
    expect(allNumbersAreReal(after)).toBe(true);
  });

  it("keeps a kart inside the map where the edge of the map is the wall", () => {
    const field = createTrack({
      name: "Open field",
      tileSize: 32,
      laps: 1,
      map: ["........", "........", "........"],
      start: { column: 4, row: 1, angle: 0 },
      checkpoints: [
        { name: "finish line", column: 0, row: 0, columns: 1, rows: 1 },
        { name: "a", column: 7, row: 0, columns: 1, rows: 1 },
        { name: "b", column: 7, row: 2, columns: 1, rows: 1 },
      ],
    });
    const [atEdge, hitter] = bumpKarts(field, [kartAt(10, 48), kartAt(22, 48, -360, 0)]);
    expect(atEdge.x).toBeGreaterThanOrEqual(10 - TINY);
    expect(tileKindAt(field, atEdge.x - KART_RADIUS + TINY, atEdge.y)).not.toBe("wall");
    expect(clearOfWalls(field, atEdge)).toBe(true);
    expect(clearOfWalls(field, hitter)).toBe(true);
  });
});

describe("what a bump must NOT do: break when two karts are on exactly the same spot", () => {
  it("pushes them apart with real numbers, never NaN", () => {
    const after = bumpKarts(ARENA, [kartAt(200, 200), kartAt(200, 200)]);
    expect(allNumbersAreReal(after)).toBe(true);
    expect(gap(after[0], after[1])).toBeCloseTo(TOUCHING);
  });

  it("does so when they are moving, too", () => {
    const after = bumpKarts(ARENA, [kartAt(200, 200, 300, 40), kartAt(200, 200, -120, 0)]);
    expect(allNumbersAreReal(after)).toBe(true);
    expect(gap(after[0], after[1])).toBeCloseTo(TOUCHING);
    expect(energyOf(after)).toBeLessThanOrEqual(energyOf([kartAt(0, 0, 300, 40), kartAt(0, 0, -120, 0)]) + TINY);
  });

  it("does so for three karts on the same spot", () => {
    const after = bumpKarts(ARENA, [kartAt(200, 200), kartAt(200, 200), kartAt(200, 200)]);
    expect(allNumbersAreReal(after)).toBe(true);
    expect(gap(after[0], after[1])).toBeGreaterThan(0);
    expect(gap(after[0], after[2])).toBeGreaterThan(0);
    expect(gap(after[1], after[2])).toBeGreaterThan(0);
  });

  it("does so in a wall corner, where there is hardly any room", () => {
    const after = bumpKarts(ARENA, [kartAt(42, 42), kartAt(42, 42)]);
    expect(allNumbersAreReal(after)).toBe(true);
    for (const kart of after) {
      expect(tileKindAt(ARENA, kart.x, kart.y)).toBe("road");
    }
  });
});

describe("a bump is fair and can be repeated", () => {
  const pile = [
    kartAt(300, 200, 300, 0),
    kartAt(313, 205, -200, 50),
    kartAt(304, 216, 0, -300),
    kartAt(325, 191, -100, 100),
  ];

  it("gives the same result every time for the same karts", () => {
    expect(bumpKarts(ARENA, pile)).toEqual(bumpKarts(ARENA, pile));
  });

  it("gives every kart the same result whatever order the karts are listed in", () => {
    const expected = bumpKarts(ARENA, pile);
    const orders = [
      [3, 2, 1, 0],
      [1, 0, 3, 2],
      [2, 3, 0, 1],
      [1, 2, 3, 0],
      [0, 2, 1, 3],
      [3, 0, 2, 1],
    ];
    for (const order of orders) {
      const after = bumpKarts(
        ARENA,
        order.map((index) => pile[index]),
      );
      order.forEach((index, position) => {
        expect(after[position], `kart ${index} in order ${order}`).toEqual(expected[index]);
      });
    }
  });

  it("treats two karts the same whichever is listed first", () => {
    const a = kartAt(200, 200, 300, 20);
    const b = kartAt(213, 207, -100, 0);
    const [afterA, afterB] = bumpKarts(ARENA, [a, b]);
    const [swappedB, swappedA] = bumpKarts(ARENA, [b, a]);
    expect(swappedA).toEqual(afterA);
    expect(swappedB).toEqual(afterB);
  });

  it("does not change the list or the karts it was given", () => {
    const a = Object.freeze(kartAt(200, 200, 300, 0));
    const b = Object.freeze(kartAt(212, 200));
    const karts = Object.freeze([a, b]);
    const after = bumpKarts(ARENA, karts);
    expect(after).not.toBe(karts);
    expect(a.x).toBe(200);
    expect(a.vx).toBe(300);
    expect(b.x).toBe(212);
    expect(after[0]).not.toBe(a);
  });

  it("gives back untouched the karts that touch nobody, next to a pair that does", () => {
    const farAway = kartAt(500, 300, 100, 0);
    const after = bumpKarts(ARENA, [kartAt(200, 200, 300, 0), farAway, kartAt(212, 200)]);
    expect(after[1]).toBe(farAway);
  });
});

describe("weight, for the heavy and light drivers that come later", () => {
  it("weighs every kart the same when no weights are given", () => {
    const pair = [kartAt(200, 200, 200, 0), kartAt(215, 200)];
    expect(bumpKarts(ARENA, pair, [1, 1])).toEqual(bumpKarts(ARENA, pair));
    expect(bumpKarts(ARENA, pair, [4, 4])).toEqual(bumpKarts(ARENA, pair)); // only the comparison matters
  });

  it("moves the heavier kart less when two karts are pushed apart", () => {
    const [heavy, light] = bumpKarts(ARENA, [kartAt(200, 200), kartAt(212, 200)], [3, 1]);
    expect(heavy.x).toBeCloseTo(198); // a quarter of the 8 units of overlap
    expect(light.x).toBeCloseTo(218); // three quarters
  });

  it("lets a heavy kart keep more of its speed, and shoves a light kart harder", () => {
    const [heavy, light] = bumpKarts(ARENA, [kartAt(200, 200, 200, 0), kartAt(215, 200)], [3, 1]);
    expect(heavy.vx).toBeCloseTo(125);
    expect(light.vx).toBeCloseTo(225);
    // Weight times speed is passed on, none of it is made up.
    expect(3 * heavy.vx + 1 * light.vx).toBeCloseTo(3 * 200);
    expect(energyOf([heavy, light], [3, 1])).toBeLessThan(energyOf([kartAt(0, 0, 200, 0)], [3]));
  });

  it("refuses a weight that is not a number above zero", () => {
    const pair = [kartAt(200, 200), kartAt(212, 200)];
    for (const weight of [0, -1, NaN, Infinity, "heavy", {}]) {
      expect(() => bumpKarts(ARENA, pair, [1, weight]), String(weight)).toThrow(RangeError);
    }
  });
});

// ---- Bumps in a room ----

const GAS = { gas: true, brake: false, left: false, right: false };
const NO_KEYS = { gas: false, brake: false, left: false, right: false };
const ROUNDING = 0.2; // the room rounds every position to a tenth of a unit

const kartOf = (room, id) => room.snapshot().karts.find((kart) => kart.id === id);

function run(room, steps, everyStep = () => {}) {
  for (let step = 0; step < steps; step++) {
    room.step();
    everyStep();
  }
}

/** A room on the test oval with this many players, the first of them the host. Gives { room, ids }. */
function roomWith(playerCount, track = TEST_OVAL) {
  const room = createRoom(track, TEST_DRIVER);
  const ids = [];
  for (let player = 0; player < playerCount; player++) {
    ids.push(room.addPlayer().id);
  }
  return { room, ids };
}

describe("bumps in a race", () => {
  it("stop a racer from driving through the kart in front, and shove that kart forward", () => {
    // Place 2 is straight behind place 0.
    const { room, ids } = roomWith(3);
    const [front, , behind] = ids;
    room.startRace(front);
    run(room, COUNTDOWN_STEPS);
    const frontStart = kartOf(room, front);

    room.setKeys(behind, GAS);
    let fastestShove = 0;
    run(room, 120, () => {
      expect(kartOf(room, behind).x).toBeLessThan(kartOf(room, front).x - TOUCHING + ROUNDING);
      fastestShove = Math.max(fastestShove, kartOf(room, front).vx);
    });

    expect(kartOf(room, front).x).toBeGreaterThan(frontStart.x + 40); // pushed well forward
    expect(fastestShove).toBeGreaterThan(20);
    expect(kartOf(room, front).y).toBeCloseTo(frontStart.y, 0); // straight ahead, not sideways
  });

  it("do not change anyone's laps or clock", () => {
    const { room, ids } = roomWith(3);
    const [front, , behind] = ids;
    room.startRace(front);
    room.setKeys(behind, GAS);
    run(room, COUNTDOWN_STEPS + 120);

    // The front kart never touched a key. It was pushed over the finish line
    // by the kart behind. That is its first crossing, so no lap, and its
    // clock ran exactly as long as everyone else's.
    const pushed = kartOf(room, front);
    expect(pushed.x).toBeGreaterThan(TEST_OVAL.checkpoints[0].left);
    expect(pushed.steps).toBe(120);
    expect(pushed.lapsDone).toBe(0);
    expect(pushed.lapSteps).toEqual([]);
    expect(pushed.finished).toBe(false);
    expect(kartOf(room, behind).steps).toBe(120);
    expect(kartOf(room, behind).lapsDone).toBe(0);
    expect(room.takeFinishes()).toEqual([]);
  });

  it("still move a kart that has finished, but its result stands", () => {
    // On the sprint track, place 2 is straight behind place 0. The first
    // racer finishes and rolls back from the end wall. The second arrives
    // later and runs into it.
    const { room, ids } = roomWith(3, createSprintTrack());
    const [first, , second] = ids;
    room.startRace(first);
    room.setKeys(first, GAS);
    run(room, COUNTDOWN_STEPS + 40);
    room.setKeys(second, GAS);

    const finishes = [];
    let resultWhenFinished = null;
    let wasBumpedAfterFinishing = false;
    let speedBefore = 0;
    for (let step = 0; step < 60 * 20 && kartOf(room, second).finished === false; step++) {
      room.step();
      finishes.push(...room.takeFinishes());
      const kart = kartOf(room, first);
      if (kart.finished && resultWhenFinished === null) {
        resultWhenFinished = { steps: kart.steps, lapSteps: kart.lapSteps, lapsDone: kart.lapsDone };
      } else if (kart.finished && speedOf(kart) > speedBefore + 1) {
        // A finished kart only coasts, and a wall only slows it. Only a bump can speed it up.
        wasBumpedAfterFinishing = true;
      }
      speedBefore = speedOf(kart);
    }

    expect(wasBumpedAfterFinishing).toBe(true);
    const kart = kartOf(room, first);
    expect({ steps: kart.steps, lapSteps: kart.lapSteps, lapsDone: kart.lapsDone }).toEqual(resultWhenFinished);
    expect(kart.finished).toBe(true);
    expect(finishes.map((finish) => [finish.id, finish.position])).toEqual([
      [first, 1],
      [second, 2],
    ]);
    expect(finishes[0].raceSteps).toBe(resultWhenFinished.steps);
  });

  it("do not happen with the kart of someone who is only watching: a racer drives straight through their place", () => {
    /** Four players; the one on place 1 is swapped for a watcher or stays. Gives how far place 3 gets in 90 steps. */
    function driveFromPlaceThree(placeOneLeaves) {
      const { room, ids } = roomWith(4);
      const [host, placeOne, , placeThree] = ids;
      room.startRace(host);
      run(room, 30);
      let watcher = null;
      if (placeOneLeaves) {
        room.removePlayer(placeOne);
        watcher = room.addPlayer(); // joins during the countdown: watches, on place 1
        expect(watcher.place).toBe(1);
        room.setKeys(watcher.id, GAS);
      }
      run(room, COUNTDOWN_STEPS - 30);
      room.setKeys(placeThree, GAS); // place 3 is straight behind place 1
      run(room, 90);
      if (watcher !== null) {
        expect(kartOf(room, watcher.id)).toBe(undefined);
        expect(room.snapshot().race.watching).toEqual([watcher.id]);
      }
      return kartOf(room, placeThree);
    }

    const throughAWatcher = driveFromPlaceThree(true);
    const intoARacer = driveFromPlaceThree(false);
    const alone = gridSpot(TEST_OVAL, 3);

    // Nothing was in the way: it drove dead straight, well past place 1.
    expect(throughAWatcher.y).toBe(alone.y);
    expect(throughAWatcher.x).toBeGreaterThan(gridSpot(TEST_OVAL, 1).x + 60);
    // With a real kart on place 1 it does not get nearly as far.
    expect(intoARacer.x).toBeLessThan(throughAWatcher.x - 20);
  });

  it("never leave a kart in a wall or anywhere strange when eight karts race for the same corner", () => {
    const CORNERS = [
      { x: 864, y: 96 },
      { x: 864, y: 480 },
      { x: 96, y: 480 },
      { x: 96, y: 96 },
    ];
    function robotKeys(kart, target) {
      const wantedAngle = Math.atan2(target.y - kart.y, target.x - kart.x);
      const turn = Math.atan2(Math.sin(wantedAngle - kart.angle), Math.cos(wantedAngle - kart.angle));
      return { gas: Math.abs(turn) < 1.2 || speedOf(kart) < 120, brake: false, left: turn < -0.05, right: turn > 0.05 };
    }

    const { room, ids } = roomWith(8);
    room.startRace(ids[0]);
    run(room, COUNTDOWN_STEPS);
    const cornerOf = new Map(ids.map((id) => [id, 0]));
    let bumps = 0;
    for (let step = 0; step < 60 * 30; step++) {
      const karts = room.snapshot().karts;
      for (const kart of karts) {
        const target = CORNERS[cornerOf.get(kart.id)];
        if (Math.hypot(target.x - kart.x, target.y - kart.y) < 110) {
          cornerOf.set(kart.id, (cornerOf.get(kart.id) + 1) % CORNERS.length);
        }
        room.setKeys(kart.id, robotKeys(kart, CORNERS[cornerOf.get(kart.id)]));
      }
      room.step();
      const after = room.snapshot().karts;
      for (const kart of after) {
        expect(allNumbersAreReal([kart])).toBe(true);
        expect(tileKindAt(TEST_OVAL, kart.x, kart.y)).not.toBe("wall");
        // The whole kart, not just its middle, stays out of the outer walls.
        expect(kart.x).toBeGreaterThanOrEqual(32 + KART_RADIUS - ROUNDING);
        expect(kart.x).toBeLessThanOrEqual(TEST_OVAL.width - 32 - KART_RADIUS + ROUNDING);
        expect(kart.y).toBeGreaterThanOrEqual(32 + KART_RADIUS - ROUNDING);
        expect(kart.y).toBeLessThanOrEqual(TEST_OVAL.height - 32 - KART_RADIUS + ROUNDING);
      }
      for (let a = 0; a < after.length; a++) {
        for (let b = a + 1; b < after.length; b++) {
          if (gap(after[a], after[b]) < TOUCHING + 1) {
            bumps++;
          }
        }
      }
    }
    expect(bumps).toBeGreaterThan(10); // they really were in each other's way
    // And nobody was stopped for good: every kart got round the first corners.
    for (const kart of room.snapshot().karts) {
      expect(kart.lapsDone, `kart ${kart.id}`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("bumps while the room is open", () => {
  it("let a driver shove a parked kart out of the way, but never drive through it", () => {
    const { room, ids } = roomWith(3);
    const [parked, , driver] = ids; // place 2 is straight behind place 0
    const parkedStart = kartOf(room, parked);

    room.setKeys(driver, GAS);
    run(room, 120, () => {
      expect(kartOf(room, driver).x).toBeLessThan(kartOf(room, parked).x - TOUCHING + ROUNDING);
    });

    expect(kartOf(room, parked).x).toBeGreaterThan(parkedStart.x + 40); // it rolled away
    expect(kartOf(room, driver).x).toBeGreaterThan(parkedStart.x); //      and the driver got on
  });

  it("do not start the clock of a parked kart: it rolls to a stop with its clock at zero", () => {
    const { room, ids } = roomWith(3);
    const [parked, , driver] = ids;
    room.setKeys(driver, GAS);
    run(room, 30, () => {
      expect(kartOf(room, parked).steps).toBe(0);
    });
    expect(speedOf(kartOf(room, parked))).toBeGreaterThan(0); // it was hit, and is rolling

    // The driver stops. The parked kart rolls on by itself, and comes to rest.
    room.setKeys(driver, { gas: false, brake: true, left: false, right: false });
    run(room, 20);
    room.setKeys(driver, NO_KEYS);
    run(room, 300, () => {
      expect(kartOf(room, parked).steps).toBe(0);
      expect(kartOf(room, parked).lapsDone).toBe(0);
    });
    const resting = kartOf(room, parked);
    expect(speedOf(resting)).toBe(0);
    run(room, 60);
    expect(kartOf(room, parked)).toEqual(resting);

    // Its clock starts at its own first key press, as always.
    room.setKeys(parked, GAS);
    run(room, 10);
    expect(kartOf(room, parked).steps).toBe(10);
  });

  it("leave a parked kart that nobody touches exactly where it is", () => {
    const { room, ids } = roomWith(2);
    const [parked, driver] = ids; // side by side: the driver goes straight on and never touches it
    const before = kartOf(room, parked);
    room.setKeys(driver, GAS);
    run(room, 120);
    expect(kartOf(room, parked)).toEqual(before);
  });

  it("happen between two karts that are both being driven", () => {
    // Places 0 and 1 are side by side. The left one steers right, into the other.
    const { room, ids } = roomWith(2);
    const [left, right] = ids;
    room.setKeys(left, { gas: true, brake: false, left: false, right: true });
    room.setKeys(right, GAS);
    let closest = Infinity;
    run(room, 180, () => {
      closest = Math.min(closest, gap(kartOf(room, left), kartOf(room, right)));
    });
    expect(closest).toBeLessThan(TOUCHING + 1); //                  they met
    expect(closest).toBeGreaterThanOrEqual(TOUCHING - ROUNDING); // and did not overlap
  });
});
