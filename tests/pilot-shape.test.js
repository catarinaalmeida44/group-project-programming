// Tests for client/pilot-shape.js: a character standing beside their kart,
// helmet in hand, with their face. Used when choosing a character (and
// later on the podium), never in the race.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { pilotParts, pilotScene, movePart, DRIVER_PARTS, HEAD_RADIUS, KART_SPOT, PILOT_SPOT } from "../client/pilot-shape.js";
import { kartParts, LOOKS } from "../client/kart-shape.js";
import { lookOfCharacter } from "../client/cast-choice.js";

const look = lookOfCharacter("pcp");
const pilot = pilotParts(look);
const part = (name, parts = pilot) => parts.find((one) => one.name === name);

/** Every corner of a list of parts (the middle and top and bottom of a ball or a head). */
function pointsOf(parts) {
  return parts.flatMap((one) => {
    if (one.faces) {
      return [...one.faces, ...(one.decals ?? [])].flatMap((face) => face.points);
    }
    const round = one.ball ?? one.head;
    const [x, y, z] = round.middle;
    return [
      [x, y, z],
      [x - round.radius, y - round.radius, z - round.radius],
      [x + round.radius, y + round.radius, z + round.radius],
    ];
  });
}

function sizeOf(parts) {
  const points = pointsOf(parts);
  const along = (axis) => points.map((point) => point[axis]);
  return {
    minX: Math.min(...along(0)),
    maxX: Math.max(...along(0)),
    minY: Math.min(...along(1)),
    maxY: Math.max(...along(1)),
    minZ: Math.min(...along(2)),
    maxZ: Math.max(...along(2)),
  };
}

describe("the standing pilot", () => {
  it("stands on the ground: nothing is below it", () => {
    expect(sizeOf(pilot).minZ).toBeCloseTo(0);
  });

  it("is taller than the kart, as a person standing beside a kart is", () => {
    const kartHeight = sizeOf(kartParts(look)).maxZ;
    expect(sizeOf(pilot).maxZ).toBeGreaterThan(kartHeight * 1.3);
  });

  it("has a head with the face, right above the middle of the body", () => {
    const head = part("head").head;
    expect(head.radius).toBe(HEAD_RADIUS);
    expect(head.middle[1]).toBe(0); // not to the left or right of the body
    const suit = sizeOf([part("suit")]);
    expect(head.middle[1]).toBeCloseTo((suit.minY + suit.maxY) / 2);
    expect(head.middle[0]).toBeGreaterThanOrEqual(suit.minX);
    expect(head.middle[0]).toBeLessThanOrEqual(suit.maxX);
    // The head sits on the collar: above the body, not floating.
    const collarTop = sizeOf([part("collar")]).maxZ;
    expect(head.middle[2] - head.radius).toBeLessThan(collarTop);
    expect(head.middle[2]).toBeGreaterThan(collarTop);
  });

  it("holds the helmet in the right hand, the visor to the front", () => {
    const helmet = part("helmet").ball;
    const glove = sizeOf([part("right glove")]);
    const hand = [(glove.minX + glove.maxX) / 2, (glove.minY + glove.maxY) / 2, (glove.minZ + glove.maxZ) / 2];
    const gap = Math.hypot(helmet.middle[0] - hand[0], helmet.middle[1] - hand[1], helmet.middle[2] - hand[2]);
    expect(gap).toBeLessThan(helmet.radius + 1.5); // touching the hand
    expect(helmet.middle[1]).toBeGreaterThan(0); // on the right side
    expect(helmet.middle[2]).toBeGreaterThan(hand[2]); // resting on it, not hanging under it
  });

  it("wears the character's colours: suit, helmet and the kart's colour on the stripe", () => {
    expect(part("suit").faces.some((face) => face.colour === look.suit)).toBe(true);
    expect(part("suit").decals[0].colour).toBe(look.body);
    expect(part("helmet").ball.colour).toBe(look.helmet);
    expect(part("helmet").ball.stripe).toBe(look.stripe);
  });

  it("is painted in each character's own colours", () => {
    const red = pilotParts(LOOKS[0]);
    const blue = pilotParts(LOOKS[1]);
    expect(part("helmet", red).ball.colour).not.toBe(part("helmet", blue).ball.colour);
  });
});

describe("the scene: the pilot beside the kart", () => {
  const scene = pilotScene(look);

  it("has an empty kart: none of the seated driver's parts", () => {
    const kart = scene.parts.slice(0, scene.parts.length - pilot.length);
    for (const name of DRIVER_PARTS) {
      expect(kart.some((one) => one.name === name), name).toBe(false);
    }
    // Exactly one helmet in the whole scene: the one in the pilot's hand.
    expect(scene.parts.filter((one) => one.name === "helmet")).toHaveLength(1);
  });

  it("has every part of the kart except the driver, and every part of the pilot", () => {
    const kartCount = kartParts(look).filter((one) => !DRIVER_PARTS.includes(one.name)).length;
    expect(scene.parts).toHaveLength(kartCount + pilot.length);
  });

  it("keeps the pilot and the kart apart: no part of the pilot is inside the kart's outline", () => {
    // The kart's outline on the ground, in its own directions, before it was turned and moved.
    const outline = sizeOf(kartParts(look).filter((one) => !DRIVER_PARTS.includes(one.name)));
    const person = scene.parts.slice(scene.parts.length - pilot.length);
    // Every corner of the pilot, seen from the kart: moved and turned back.
    const cos = Math.cos(-KART_SPOT.turn);
    const sin = Math.sin(-KART_SPOT.turn);
    for (const [x, y, z] of pointsOf(person)) {
      const dx = x - KART_SPOT.x;
      const dy = y - KART_SPOT.y;
      const alongKart = dx * cos - dy * sin;
      const acrossKart = dx * sin + dy * cos;
      const inside =
        alongKart > outline.minX && alongKart < outline.maxX && acrossKart > outline.minY && acrossKart < outline.maxY && z < outline.maxZ;
      expect(inside, `${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`).toBe(false);
    }
  });

  it("puts a shadow under the kart and one under the pilot", () => {
    expect(scene.shadows).toHaveLength(2);
    expect(scene.shadows[0]).toMatchObject({ x: KART_SPOT.x, y: KART_SPOT.y });
    expect(scene.shadows[1].y).toBe(PILOT_SPOT.y);
  });

  it("does not change the parts it was made from", () => {
    const before = JSON.stringify(pilotParts(look));
    pilotScene(look);
    expect(JSON.stringify(pilotParts(look))).toBe(before);
  });
});

describe("moving a part", () => {
  it("moves every corner, a ball and a head", () => {
    const moved = movePart({ faces: [{ points: [[1, 0, 2]], colour: "#000000" }], ball: { middle: [0, 0, 5], radius: 1 }, head: { middle: [0, 0, 9], radius: 2 } }, { x: 10, y: 20, turn: 0 });
    expect(moved.faces[0].points[0]).toEqual([11, 20, 2]);
    expect(moved.ball.middle).toEqual([10, 20, 5]);
    expect(moved.head.middle).toEqual([10, 20, 9]);
  });

  it("turns a part round its upright line, keeping heights", () => {
    const moved = movePart({ faces: [{ points: [[1, 0, 3]], colour: "#000000" }] }, { x: 0, y: 0, turn: Math.PI / 2 });
    const [x, y, z] = moved.faces[0].points[0];
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
    expect(z).toBe(3);
  });
});

describe("faces in the race", () => {
  it("are never painted by the race pages: only the menu paints a pilot with a face", () => {
    for (const file of ["main.js", "online.js", "draw.js"]) {
      const code = readFileSync(new URL(`../client/${file}`, import.meta.url), "utf8");
      expect(code, file).not.toMatch(/faceOf|faces\/|paintPilotScene|pilot-shape/);
    }
  });
});
