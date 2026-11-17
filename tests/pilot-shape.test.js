// Tests for client/pilot-shape.js: a character standing beside their kart,
// with their face, who can stand holding the helmet, dance, or put the
// helmet down and cross arms. Used when choosing a character (and later on
// the podium), never in the race.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  pilotParts,
  pilotScene,
  emptyKartParts,
  movePart,
  poseAt,
  blendPoses,
  easeInOut,
  chosenPose,
  cardPose,
  MOVES,
  DRIVER_PARTS,
  HEAD_RADIUS,
  FACE_OVAL,
  KART_SPOT,
  CHOSEN_DANCE_SECONDS,
  CROSSING_SECONDS,
} from "../client/pilot-shape.js";
import { kartParts, LOOKS } from "../client/kart-shape.js";
import { lookOfCharacter, hairOf, faceOf } from "../client/cast-choice.js";
import { CAST } from "../shared/cast.js";

const look = lookOfCharacter("pcp");
const HAIR = "#2b2019";
const part = (name, parts) => parts.find((one) => one.name === name);

/** Every corner of a list of parts (and the top, bottom and sides of a ball or a head). */
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

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Many moments of every movement, to check that a rule holds all the time, not only at one moment. */
const MOMENTS = Array.from({ length: 120 }, (_, i) => i / 37);

describe("the standing pilot", () => {
  const pilot = pilotParts(look, HAIR);

  it("stands on the ground: nothing is below it", () => {
    expect(sizeOf(pilot).minZ).toBeCloseTo(0);
  });

  it("is taller than the kart, as a person standing beside a kart is", () => {
    expect(sizeOf(pilot).maxZ).toBeGreaterThan(sizeOf(kartParts(look)).maxZ * 1.3);
  });

  it("has a head with hair, right above the middle of the body, sitting on the collar", () => {
    const head = part("head", pilot).head;
    expect(head.radius).toBe(HEAD_RADIUS);
    expect(head.hair).toBe(HAIR);
    const suit = sizeOf([part("suit", pilot)]);
    expect(head.middle[1]).toBeCloseTo((suit.minY + suit.maxY) / 2);
    expect(head.middle[0]).toBeGreaterThanOrEqual(suit.minX);
    expect(head.middle[0]).toBeLessThanOrEqual(suit.maxX);
    const collarTop = sizeOf([part("collar", pilot)]).maxZ;
    expect(head.middle[2] - head.radius).toBeLessThan(collarTop);
    expect(head.middle[2]).toBeGreaterThan(collarTop);
  });

  it("wears the character's colours: suit, helmet and the kart's colour on the stripe", () => {
    expect(part("suit", pilot).faces.some((face) => face.colour === look.suit)).toBe(true);
    expect(part("suit", pilot).decals[0].colour).toBe(look.body);
    expect(part("helmet", pilot).ball.colour).toBe(look.helmet);
    expect(part("helmet", pilot).ball.stripe).toBe(look.stripe);
  });

  it("is painted in each character's own colours", () => {
    expect(part("helmet", pilotParts(LOOKS[0], HAIR)).ball.colour).not.toBe(part("helmet", pilotParts(LOOKS[1], HAIR)).ball.colour);
  });
});

describe("the face in the head", () => {
  it("is an oval that stays inside the head, a little below the middle, with hair all round it", () => {
    expect(FACE_OVAL.across).toBeLessThan(1);
    expect(FACE_OVAL.tall).toBeLessThan(1);
    expect(FACE_OVAL.below).toBeGreaterThan(0);
    // The bottom of the oval, the chin, is still inside the ball.
    expect(FACE_OVAL.below + FACE_OVAL.tall).toBeLessThanOrEqual(1);
    // Taller than wide, like a face.
    expect(FACE_OVAL.tall).toBeGreaterThan(FACE_OVAL.across);
  });

  it("comes from pictures that all have the shape of the oval, so every face fills it the same way", () => {
    for (const { id } of CAST) {
      const bytes = readFileSync(new URL(`../client/${faceOf(id)}`, import.meta.url));
      const { width, height } = jpegSize(bytes);
      expect(width / height, id).toBeCloseTo(FACE_OVAL.across / FACE_OVAL.tall, 2);
    }
  });

  it("has a hair colour for every character, and none for anyone else", () => {
    for (const { id } of CAST) {
      expect(hairOf(id), id).toMatch(/^#[0-9a-f]{6}$/);
    }
    for (const notAnId of ["mario", "", null, undefined, "PCP"]) {
      expect(hairOf(notAnId)).toBe(null);
    }
  });
});

describe("the poses", () => {
  it("are the three the menu uses", () => {
    expect(MOVES).toEqual(["hold", "dance", "crossed"]);
  });

  it("always keep the feet on the ground, whatever the pilot does", () => {
    for (const move of MOVES) {
      for (const seconds of MOMENTS) {
        const pilot = pilotParts(look, HAIR, poseAt(move, seconds));
        expect(sizeOf(pilot).minZ, `${move} at ${seconds}`).toBeCloseTo(0);
        for (const shoe of ["left shoe", "right shoe"]) {
          expect(sizeOf([part(shoe, pilot)]).minZ).toBe(0);
        }
      }
    }
  });

  it("never sink below standing height: a bounce only goes up", () => {
    for (const move of MOVES) {
      for (const seconds of MOMENTS) {
        expect(poseAt(move, seconds).lift, `${move} at ${seconds}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("hold the helmet on the right hand while standing and while dancing", () => {
    for (const move of ["hold", "dance"]) {
      for (const seconds of MOMENTS) {
        const pose = poseAt(move, seconds);
        expect(distance(pose.helmet, pose.rightHand), `${move} at ${seconds}`).toBeLessThan(3.6);
        expect(pose.helmet[2]).toBeGreaterThan(pose.rightHand[2]); // resting on the hand, not hanging under it
        expect(pose.rightHand[1]).toBeGreaterThan(0); // the right hand is on the right
      }
    }
  });

  it("make the dance move: up and down, side to side, the fist and the helmet going up and down", () => {
    const poses = MOMENTS.map((seconds) => poseAt("dance", seconds));
    const range = (values) => Math.max(...values) - Math.min(...values);
    expect(range(poses.map((pose) => pose.lift))).toBeGreaterThan(0.5);
    expect(range(poses.map((pose) => pose.sway))).toBeGreaterThan(1);
    expect(range(poses.map((pose) => pose.leftHand[2]))).toBeGreaterThan(2);
    expect(range(poses.map((pose) => pose.helmet[2]))).toBeGreaterThan(2);
  });

  it("cross the arms: each hand on the other side of the chest, in front of it, the helmet on the ground", () => {
    for (const seconds of MOMENTS) {
      const pose = poseAt("crossed", seconds);
      expect(pose.leftHand[1]).toBeGreaterThan(0);
      expect(pose.rightHand[1]).toBeLessThan(0);
      expect(pose.leftHand[0]).toBeGreaterThan(1.6); // the front of the suit is at 1.6
      expect(pose.rightHand[0]).toBeGreaterThan(1.6);
      expect(pose.helmet[2]).toBeCloseTo(part("helmet", pilotParts(look, HAIR)).ball.radius); // lying on the ground
    }
  });

  it("are the same every time for the same moment, so the picture never flickers", () => {
    for (const move of MOVES) {
      expect(poseAt(move, 1.234)).toEqual(poseAt(move, 1.234));
    }
  });

  it("treat an unknown movement as standing", () => {
    expect(poseAt("moonwalk", 2)).toEqual(poseAt("hold", 2));
  });
});

describe("going from one pose to another", () => {
  it("starts at the first pose and ends at the second", () => {
    const from = poseAt("hold", 0);
    const to = poseAt("crossed", 0);
    expect(blendPoses(from, to, 0)).toEqual(from);
    expect(blendPoses(from, to, 1)).toEqual(to);
    expect(blendPoses(from, to, -3)).toEqual(from);
    expect(blendPoses(from, to, 7)).toEqual(to);
  });

  it("starts and stops gently", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(0.05)).toBeLessThan(0.05);
  });
});

describe("the chosen pilot", () => {
  /** The biggest jump of any hand or the helmet from one picture to the next, at 60 pictures a second. */
  function biggestJump(poseOf, from, to) {
    let biggest = 0;
    for (let t = from; t < to; t += 1 / 60) {
      const a = poseOf(t);
      const b = poseOf(t + 1 / 60);
      for (const key of ["leftHand", "rightHand", "helmet"]) {
        biggest = Math.max(biggest, distance(a[key], b[key]));
      }
    }
    return biggest;
  }

  it("starts standing with the helmet in the hand", () => {
    expect(chosenPose(0)).toEqual(poseAt("hold", 0));
  });

  it("dances first, then has the arms crossed and the helmet down, and stays like that", () => {
    const dancing = chosenPose(CHOSEN_DANCE_SECONDS / 2);
    expect(distance(dancing.helmet, dancing.rightHand)).toBeLessThan(3.6);
    const later = CHOSEN_DANCE_SECONDS + CROSSING_SECONDS + 0.01;
    for (const seconds of [later, later + 5, later + 60]) {
      expect(chosenPose(seconds)).toEqual(poseAt("crossed", seconds));
    }
  });

  it("moves smoothly the whole time: no hand or helmet jumps from one picture to the next", () => {
    // A hand pumping in the dance moves at most about a unit per picture.
    expect(biggestJump(chosenPose, 0, CHOSEN_DANCE_SECONDS + CROSSING_SECONDS + 1)).toBeLessThan(1.2);
  });

  it("treats a moment before the choice as the moment of the choice", () => {
    expect(chosenPose(-5)).toEqual(chosenPose(0));
  });
});

describe("a pilot on a small card", () => {
  it("stands holding the helmet until the mouse comes, and dances while it is there", () => {
    expect(cardPose(3.1, 0)).toEqual(poseAt("hold", 3.1));
    expect(cardPose(3.1, 1)).toEqual(poseAt("dance", 3.1));
  });
});

describe("the scene: the pilot beside the kart", () => {
  const scene = pilotScene(look, HAIR, poseAt("hold", 0));

  it("has an empty kart: none of the seated driver's parts", () => {
    for (const name of DRIVER_PARTS) {
      expect(scene.kart.some((one) => one.name === name), name).toBe(false);
    }
    expect(scene.kart).toHaveLength(emptyKartParts(look).length);
    // Exactly one helmet in the whole scene: the pilot's.
    expect([...scene.kart, ...scene.pilot].filter((one) => one.name === "helmet")).toHaveLength(1);
  });

  it("keeps the pilot and the kart apart in every pose: nothing of the pilot inside the kart's outline", () => {
    const outline = sizeOf(emptyKartParts(look));
    const cos = Math.cos(-KART_SPOT.turn);
    const sin = Math.sin(-KART_SPOT.turn);
    for (const move of MOVES) {
      for (const seconds of MOMENTS.slice(0, 30)) {
        for (const [x, y, z] of pointsOf(pilotScene(look, HAIR, poseAt(move, seconds)).pilot)) {
          const dx = x - KART_SPOT.x;
          const dy = y - KART_SPOT.y;
          const along = dx * cos - dy * sin;
          const across = dx * sin + dy * cos;
          const inside = along > outline.minX && along < outline.maxX && across > outline.minY && across < outline.maxY && z < outline.maxZ;
          expect(inside, `${move} at ${seconds}: ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`).toBe(false);
        }
      }
    }
  });

  it("puts a shadow under the kart and one under the pilot", () => {
    expect(scene.shadows).toHaveLength(2);
    expect(scene.shadows[0]).toMatchObject({ x: KART_SPOT.x, y: KART_SPOT.y });
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
    const [x, y, z] = movePart({ faces: [{ points: [[1, 0, 3]], colour: "#000000" }] }, { x: 0, y: 0, turn: Math.PI / 2 }).faces[0].points[0];
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

/** The width and height written inside a JPEG picture (in its "start of frame" block). */
function jpegSize(bytes) {
  let at = 2;
  while (at < bytes.length) {
    const marker = bytes[at + 1];
    const length = bytes.readUInt16BE(at + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) };
    }
    at += 2 + length;
  }
  throw new Error("Not a JPEG picture with a size in it");
}
