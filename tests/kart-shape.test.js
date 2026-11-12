// Tests for client/kart-shape.js (the kart as a shape in space) and for the
// arithmetic of client/kart-paint.js (where a point of that shape lands on
// the screen).
//
// How a kart looks is checked by eye in a browser. These tests check what
// can go wrong without anyone noticing at once: a face that points inwards
// (it would vanish from some directions), a kart of the wrong size, a look
// with a colour the canvas cannot use, and a viewer that disagrees with the
// camera about where things are.

import { describe, it, expect } from "vitest";
import { LOOKS, lookOf, isLook, kartParts, sizeOfKart, block, box, bar, wheel, normalOf, shade } from "../client/kart-shape.js";
import { viewerBehind, viewerAbove } from "../client/kart-paint.js";
import { RACE, CHASE, SCREEN, chasePoint } from "../client/camera.js";
import { KART_RADIUS } from "../shared/race.js";

/** The middle of a list of points. */
function middleOf(points) {
  const middle = [0, 0, 0];
  for (const point of points) {
    for (let axis = 0; axis < 3; axis++) {
      middle[axis] += point[axis] / points.length;
    }
  }
  return middle;
}

/** Does every face of this solid piece point away from its middle? */
function expectFacesToPointOutwards(faces, name) {
  const solidMiddle = middleOf(faces.flatMap((face) => face.points));
  for (const face of faces) {
    const faceMiddle = middleOf(face.points);
    const normal = normalOf(face);
    const outwards =
      normal[0] * (faceMiddle[0] - solidMiddle[0]) +
      normal[1] * (faceMiddle[1] - solidMiddle[1]) +
      normal[2] * (faceMiddle[2] - solidMiddle[2]);
    expect(outwards, `a face of ${name}`).toBeGreaterThan(0);
  }
}

describe("the looks of the karts", () => {
  it("has eight, all different, so every player in a full room has their own", () => {
    expect(LOOKS).toHaveLength(8);
    expect(new Set(LOOKS.map((look) => look.body)).size).toBe(8);
    expect(new Set(LOOKS.map((look) => look.name)).size).toBe(8);
  });

  it("gives every part of every look a colour the canvas can use", () => {
    for (const look of LOOKS) {
      expect(isLook(look), look.name).toBe(true);
    }
  });

  it("gives a kart the look of its starting place, and starts again after the eighth", () => {
    expect(lookOf({ place: 0 })).toBe(LOOKS[0]);
    expect(lookOf({ place: 3 })).toBe(LOOKS[3]);
    expect(lookOf({ place: 8 })).toBe(LOOKS[0]);
    expect(lookOf({ place: 11 })).toBe(LOOKS[3]);
  });

  it("gives the first look to a kart without a usable starting place", () => {
    for (const kart of [{}, { place: -1 }, { place: 1.5 }, { place: "2" }, { place: null }, null, undefined]) {
      expect(lookOf(kart)).toBe(LOOKS[0]);
    }
  });

  it("uses a kart's own look when it carries a complete one", () => {
    const own = { body: "#112233", trim: "#445566", suit: "#778899", helmet: "#aabbcc", stripe: "#ddeeff" };
    expect(lookOf({ place: 2, look: own })).toBe(own);
  });

  it("does not trust a look that is incomplete or holds anything but plain colours", () => {
    const good = { body: "#112233", trim: "#445566", suit: "#778899", helmet: "#aabbcc", stripe: "#ddeeff" };
    const bad = [
      { ...good, body: "red" },
      { ...good, body: "#12345" },
      { ...good, trim: "#12345g" },
      { ...good, suit: "url(https://evil.example/x.png)" },
      { ...good, helmet: "#112233; background: red" },
      { ...good, stripe: 0x112233 },
      { body: "#112233" },
      "#112233",
      null,
      42,
    ];
    for (const look of bad) {
      expect(isLook(look), JSON.stringify(look)).toBe(false);
      expect(lookOf({ place: 1, look })).toBe(LOOKS[1]); // falls back to the look of its place
    }
  });
});

describe("the building blocks of the shape", () => {
  it("makes a box with six faces that all point outwards", () => {
    const faces = box(-1, 1, -2, 2, 0, 3, "#ffffff");
    expect(faces).toHaveLength(6);
    expectFacesToPointOutwards(faces, "a box");
  });

  it("makes a wedge, smaller at the front than at the back, whose faces still point outwards", () => {
    const faces = block([0, -3, 3, 1, 5], [8, -1, 1, 1, 2], "#ffffff");
    expectFacesToPointOutwards(faces, "a wedge");
  });

  it("makes a bar between any two points, in any direction", () => {
    const directions = [[5, 0, 0], [0, 5, 0], [0, 0, 5], [3, -2, 4], [-4, 1, -2], [0.1, 0, 5]];
    for (const to of directions) {
      const faces = bar([0, 0, 0], to, 1.5, "#ffffff");
      expect(faces).toHaveLength(6);
      expectFacesToPointOutwards(faces, `a bar towards ${to}`);
    }
  });

  it("makes a wheel that stands on the ground, as wide and as tall as asked", () => {
    const { faces, decals } = wheel(5, -6, 3, 2);
    expectFacesToPointOutwards(faces, "a wheel");
    const points = faces.flatMap((face) => face.points);
    expect(Math.min(...points.map((p) => p[2]))).toBeCloseTo(0); // touches the ground
    expect(Math.max(...points.map((p) => p[2]))).toBeCloseTo(6); // twice its radius tall
    expect(Math.min(...points.map((p) => p[1]))).toBeCloseTo(-7);
    expect(Math.max(...points.map((p) => p[1]))).toBeCloseTo(-5);
    expect(decals).toHaveLength(2); // a hub on each side
  });

  it("turns a steered wheel round its own middle, without moving or tilting it", () => {
    const straight = wheel(7, 6, 3, 2).faces.flatMap((face) => face.points);
    const turned = wheel(7, 6, 3, 2, 0.4).faces.flatMap((face) => face.points);
    expect(middleOf(turned)[0]).toBeCloseTo(middleOf(straight)[0]);
    expect(middleOf(turned)[1]).toBeCloseTo(middleOf(straight)[1]);
    turned.forEach((point, i) => expect(point[2]).toBeCloseTo(straight[i][2])); // heights unchanged
    expect(Math.max(...turned.map((p) => p[0]))).not.toBeCloseTo(Math.max(...straight.map((p) => p[0])));
  });
});

describe("the whole kart", () => {
  it("is made of solid pieces whose faces all point outwards, and one ball for the helmet", () => {
    const parts = kartParts(LOOKS[0], 0);
    expect(parts.filter((part) => part.ball)).toHaveLength(1);
    for (const part of parts.filter((each) => each.faces)) {
      expectFacesToPointOutwards(part.faces, `the ${part.name}`);
    }
  });

  it("still has only outward faces when steering hard to either side", () => {
    for (const steer of [-1, -0.5, 0.5, 1]) {
      for (const part of kartParts(LOOKS[2], steer).filter((each) => each.faces)) {
        expectFacesToPointOutwards(part.faces, `the ${part.name}, steering ${steer}`);
      }
    }
  });

  it("is about the size of the circle the driving rules use for it", () => {
    const { length, width, height } = sizeOfKart();
    // The rules treat a kart as a circle KART_RADIUS from middle to edge. The
    // picture may stick out a little, but not so far that a kart is seen to
    // overlap a wall it has not touched.
    expect(length).toBeGreaterThan(KART_RADIUS * 2);
    expect(length).toBeLessThan(KART_RADIUS * 2 + 4);
    expect(width).toBeGreaterThan(KART_RADIUS * 1.4);
    expect(width).toBeLessThan(KART_RADIUS * 2);
    expect(height).toBeGreaterThan(12);
    expect(height).toBeLessThan(20);
  });

  it("stands on the ground: nothing is below it", () => {
    const heights = kartParts(LOOKS[0], 0)
      .filter((part) => part.faces)
      .flatMap((part) => part.faces.flatMap((face) => face.points.map((point) => point[2])));
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(-0.001);
    expect(Math.min(...heights)).toBeLessThan(0.01); // the wheels touch it
  });

  it("is the same on both sides when driving straight", () => {
    const points = kartParts(LOOKS[0], 0)
      .filter((part) => part.faces)
      .flatMap((part) => part.faces.flatMap((face) => face.points));
    expect(Math.min(...points.map((p) => p[1]))).toBeCloseTo(-Math.max(...points.map((p) => p[1])));
  });

  it("turns only the front wheels, the steering wheel and the driver when steering", () => {
    const straight = kartParts(LOOKS[0], 0);
    const right = kartParts(LOOKS[0], 1);
    const moved = straight
      .filter((part, i) => JSON.stringify(part) !== JSON.stringify(right[i]))
      .map((part) => part.name);
    expect(moved).toContain("front left wheel");
    expect(moved).toContain("front right wheel");
    expect(moved).toContain("steering wheel");
    expect(moved).toContain("helmet");
    for (const still of ["back left wheel", "back right wheel", "floor", "nose", "back wing", "engine"]) {
      expect(moved, still).not.toContain(still);
    }
  });

  it("treats steering that is out of range, or not a number, as the nearest sensible steering", () => {
    const same = (a, b) => expect(JSON.stringify(kartParts(LOOKS[0], a))).toBe(JSON.stringify(kartParts(LOOKS[0], b)));
    same(5, 1);
    same(-5, -1);
    same(NaN, 0);
    same("left", 0);
    same(undefined, 0);
    same(Infinity, 0);
  });

  it("paints the body, the wing and the helmet in the colours of the look", () => {
    const look = { body: "#010203", trim: "#040506", suit: "#070809", helmet: "#0a0b0c", stripe: "#0d0e0f" };
    const parts = kartParts(look, 0);
    const coloursOf = (name) => parts.find((part) => part.name === name).faces.map((face) => face.colour);
    expect(coloursOf("nose")).toContain("#010203");
    expect(coloursOf("back wing")).toContain("#010203");
    expect(coloursOf("front wing")).toContain("#040506");
    expect(coloursOf("body")).toContain("#070809");
    expect(parts.find((part) => part.ball).ball.colour).toBe("#0a0b0c");
    expect(parts.find((part) => part.ball).ball.stripe).toBe("#0d0e0f");
  });
});

describe("making a colour lighter or darker", () => {
  it("leaves it alone at 1, halves it at 0.5, and never goes past black or white", () => {
    expect(shade("#808080", 1)).toBe("#808080");
    expect(shade("#806040", 0.5)).toBe("#403020");
    expect(shade("#ffffff", 1.5)).toBe("#ffffff");
    expect(shade("#102030", 0)).toBe("#000000");
  });
});

describe("where a point of a kart lands on the screen", () => {
  it("puts the middle of our own kart exactly where the camera puts the kart", () => {
    const viewer = viewerBehind({ ahead: 0, sideways: 0 }, 0, 0, RACE, SCREEN);
    const spot = viewer.place(0, 0, 0);
    expect(spot.x).toBeCloseTo(SCREEN.width / 2);
    expect(spot.y).toBeCloseTo(RACE.kartScreenY);
    expect(spot.scale).toBeCloseTo(RACE.kartScale);
  });

  it("agrees with the camera about every point on the ground, for a kart anywhere and turned any way", () => {
    for (const settings of [RACE, CHASE]) {
      for (const seen of [{ ahead: 120, sideways: -40 }, { ahead: 15, sideways: 60 }, { ahead: 600, sideways: 200 }]) {
        for (const turn of [0, 0.7, -2.1, Math.PI]) {
          const viewer = viewerBehind(seen, turn, 0, settings, SCREEN);
          for (const [x, y] of [[10, 0], [0, 7], [-9, -6]]) {
            // The same point, worked out by hand: turn it, then ask the camera.
            const ahead = seen.ahead + x * Math.cos(turn) - y * Math.sin(turn);
            const sideways = seen.sideways + x * Math.sin(turn) + y * Math.cos(turn);
            const expected = chasePoint(ahead, sideways, settings);
            const got = viewer.place(x, y, 0);
            expect(got.x).toBeCloseTo(expected.x);
            expect(got.y).toBeCloseTo(expected.y);
          }
        }
      }
    }
  });

  it("draws a higher point higher on the screen, and a point to the kart's right on the right when seen from behind", () => {
    const viewer = viewerBehind({ ahead: 100, sideways: 0 }, 0, 0, RACE, SCREEN);
    expect(viewer.place(0, 0, 10).y).toBeLessThan(viewer.place(0, 0, 0).y);
    expect(viewer.place(0, 5, 0).x).toBeGreaterThan(viewer.place(0, 0, 0).x);
    // A kart coming towards us shows its right side on our left.
    const facingUs = viewerBehind({ ahead: 100, sideways: 0 }, Math.PI, 0, RACE, SCREEN);
    expect(facingUs.place(0, 5, 0).x).toBeLessThan(facingUs.place(0, 0, 0).x);
  });

  it("does not draw a kart that is at the camera's eye or behind it", () => {
    expect(viewerBehind({ ahead: -500, sideways: 0 }, 0, 0, RACE, SCREEN)).toBe(null);
    expect(viewerBehind({ ahead: -75, sideways: 0 }, 0, 0, RACE, SCREEN)).toBe(null);
    expect(viewerBehind({ ahead: -20, sideways: 0 }, 0, 0, RACE, SCREEN)).not.toBe(null);
  });

  it("from straight above, puts a point where it is on the map", () => {
    const pointingDown = viewerAbove({ x: 100, y: 200, angle: Math.PI / 2 });
    const front = pointingDown.place(10, 0, 0);
    expect(front.x).toBeCloseTo(100);
    expect(front.y).toBeCloseTo(210); // forwards is down the map
    const right = pointingDown.place(0, 5, 3);
    expect(right.x).toBeCloseTo(95); //  the driver's right is to the left of the map
    expect(right.y).toBeCloseTo(200); // and height changes nothing from above
  });
});
