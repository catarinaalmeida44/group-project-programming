// Tests for client/pilot-shape.js: a character standing, with their own
// head from the photo, who can stand, cross arms, or do their own dance.
// Used when choosing a character (and later on the podium), never in the race.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
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
  armWith,
  steeringWheel,
  MOVES,
  DANCES,
  DRIVER_PARTS,
  HEAD_HEIGHT,
  UPPER_ARM,
  FOREARM,
  KART_SPOT,
  SIU_SECONDS,
  CHOSEN_TIMES,
} from "../client/pilot-shape.js";
import { kartParts, LOOKS } from "../client/kart-shape.js";
import { lookOfCharacter, hairOf, headOf, danceOf } from "../client/cast-choice.js";
import { CAST } from "../shared/cast.js";

const look = lookOfCharacter("pcp");
const HAIR = "#2b2019";
const part = (name, parts) => parts.find((one) => one.name === name);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Every corner of a list of parts (and the top, bottom and sides of a ball or a head). */
function pointsOf(parts) {
  return parts.flatMap((one) => {
    if (one.faces) {
      return [...one.faces, ...(one.decals ?? [])].flatMap((face) => face.points);
    }
    const [x, y, z] = (one.ball ?? one.head).middle;
    const half = one.ball ? one.ball.radius : one.head.height / 2;
    return [
      [x, y, z],
      [x - half, y - half, z - half],
      [x + half, y + half, z + half],
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

/** The middle of a part: the average of its corners. */
function middleOf(one) {
  const points = pointsOf([one]);
  return [0, 1, 2].map((axis) => points.reduce((sum, point) => sum + point[axis], 0) / points.length);
}

/** Many moments, to check that a rule holds all the time, not only at one moment. */
const MOMENTS = Array.from({ length: 90 }, (_, i) => i / 26);

describe("the standing pilot", () => {
  const pilot = pilotParts(look, HAIR);

  it("stands on the ground: nothing is below it", () => {
    expect(sizeOf(pilot).minZ).toBeCloseTo(0);
  });

  it("is taller than the kart, as a person standing beside a kart is", () => {
    expect(sizeOf(pilot).maxZ).toBeGreaterThan(sizeOf(kartParts(look)).maxZ * 1.5);
  });

  it("has their own head on the collar, right above the middle of the body, looking forwards", () => {
    const head = part("head", pilot).head;
    expect(head.height).toBe(HEAD_HEIGHT);
    expect(head.hair).toBe(HAIR);
    const suit = sizeOf([part("suit", pilot)]);
    expect(head.middle[1]).toBeCloseTo((suit.minY + suit.maxY) / 2);
    const collarTop = sizeOf([part("collar", pilot)]).maxZ;
    expect(head.middle[2] - head.height / 2).toBeLessThan(collarTop); // the chin reaches the collar
    expect(head.middle[2]).toBeGreaterThan(collarTop);
    expect(head.facing[0]).toBeGreaterThan(0.99); // looking forwards, to the camera in the menu
  });

  it("wears the character's colours, and the helmet lies on the ground beside them", () => {
    expect(part("suit", pilot).faces.some((face) => face.colour === look.suit)).toBe(true);
    expect(part("suit", pilot).decals[0].colour).toBe(look.body);
    const helmet = part("helmet", pilot).ball;
    expect(helmet.colour).toBe(look.helmet);
    expect(helmet.middle[2]).toBeCloseTo(helmet.radius); // on the ground
    expect(Math.abs(helmet.middle[1])).toBeGreaterThan(helmet.radius + 2); // beside the feet, not on them
  });

  it("is painted in each character's own colours", () => {
    expect(part("helmet", pilotParts(LOOKS[0], HAIR)).ball.colour).not.toBe(part("helmet", pilotParts(LOOKS[1], HAIR)).ball.colour);
  });
});

describe("the arms", () => {
  const shoulder = [0, 3.6, 15.8];

  it("keep their length wherever the hand goes", () => {
    for (const hand of [[4, 4, 12], [0.5, 4.5, 8.7], [1, 6, 22], [5, -1, 13], [0, 3.7, 15]]) {
      const { elbow, hand: reached } = armWith(shoulder, hand, [0, 1, -1]);
      expect(distance(shoulder, elbow), JSON.stringify(hand)).toBeCloseTo(UPPER_ARM, 5);
      expect(distance(elbow, reached), JSON.stringify(hand)).toBeCloseTo(FOREARM, 5);
    }
  });

  it("go straight when the hand is out of reach, pointing at it", () => {
    const { elbow, hand } = armWith(shoulder, [0, 20, 15.8], [-1, 0, 0]);
    expect(distance(shoulder, hand)).toBeCloseTo(UPPER_ARM + FOREARM, 1);
    expect(hand[1]).toBeGreaterThan(elbow[1]);
    expect(elbow[1]).toBeGreaterThan(shoulder[1]);
  });

  it("bend the elbow towards the side asked for", () => {
    const hand = [5, 3.6, 12];
    expect(armWith(shoulder, hand, [0, 1, 0]).elbow[1]).toBeGreaterThan(shoulder[1]); // out to the right
    expect(armWith(shoulder, hand, [0, -1, 0]).elbow[1]).toBeLessThan(shoulder[1]); // in to the left
  });

  it("do not break on strange input: a hand on the shoulder, or a bend along the arm", () => {
    for (const [hand, bend] of [[shoulder, [0, 1, 0]], [[0, 3.6, 10], [0, 0, -1]]]) {
      const { elbow } = armWith(shoulder, hand, bend);
      expect(elbow.every(Number.isFinite)).toBe(true);
    }
  });
});

describe("every movement", () => {
  it("is one of standing, arms crossed, and the six dances", () => {
    expect(DANCES).toEqual(["clap", "robot", "drive", "wave", "plane", "siu"]);
    expect(MOVES).toEqual(["stand", "crossed", ...DANCES]);
  });

  it("never puts anything below the ground", () => {
    for (const move of MOVES) {
      for (const seconds of MOMENTS) {
        expect(sizeOf(pilotParts(look, HAIR, poseAt(move, seconds))).minZ, `${move} at ${seconds}`).toBeGreaterThan(-0.01);
      }
    }
  });

  it("keeps the feet on the ground, except during the jump of the siu", () => {
    for (const move of MOVES.filter((one) => one !== "siu")) {
      for (const seconds of MOMENTS) {
        const pilot = pilotParts(look, HAIR, poseAt(move, seconds));
        expect(sizeOf([part("left shoe", pilot), part("right shoe", pilot)]).minZ, `${move} at ${seconds}`).toBeCloseTo(0);
      }
    }
  });

  it("never sinks below standing height: a bounce only goes up", () => {
    for (const move of MOVES) {
      for (const seconds of MOMENTS) {
        expect(poseAt(move, seconds).lift, `${move} at ${seconds}`).toBeGreaterThanOrEqual(0);
        expect(poseAt(move, seconds).jump).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("moves smoothly: no glove jumps far from one picture to the next, at 60 pictures a second", () => {
    for (const move of MOVES) {
      let biggest = 0;
      for (let t = 0; t < SIU_SECONDS * 1.5; t += 1 / 60) {
        const a = pilotParts(look, HAIR, poseAt(move, t));
        const b = pilotParts(look, HAIR, poseAt(move, t + 1 / 60));
        for (const glove of ["left glove", "right glove"]) {
          biggest = Math.max(biggest, distance(middleOf(part(glove, a)), middleOf(part(glove, b))));
        }
      }
      // The robot's quick moves and the siu's spin are the fastest: still under two units a picture.
      expect(biggest, move).toBeLessThan(2);
    }
  });

  it("is the same every time for the same moment, so the picture never flickers", () => {
    for (const move of MOVES) {
      expect(poseAt(move, 1.234)).toEqual(poseAt(move, 1.234));
    }
  });

  it("treats an unknown movement as standing", () => {
    expect(poseAt("moonwalk", 2)).toEqual(poseAt("stand", 2));
  });
});

describe("each dance", () => {
  const over = (move, seconds = 4) => Array.from({ length: Math.round(seconds * 60) }, (_, i) => poseAt(move, i / 60));
  const range = (values) => Math.max(...values) - Math.min(...values);

  it("clap: the hands meet and open again, on the beat", () => {
    const gaps = over("clap").map((pose) => distance(pose.leftHand, pose.rightHand));
    expect(Math.min(...gaps)).toBeLessThan(1.2);
    expect(Math.max(...gaps)).toBeGreaterThan(5);
  });

  it("robot: one hand up while the other points forwards, then they swap", () => {
    const poses = over("robot", 1.6);
    expect(poses.some((pose) => pose.leftHand[2] > 19 && pose.rightHand[0] > 5)).toBe(true);
    expect(poses.some((pose) => pose.rightHand[2] > 19 && pose.leftHand[0] > 5)).toBe(true);
    expect(range(poses.map((pose) => pose.spin))).toBeGreaterThan(0.3); // and the body turns in steps
  });

  it("drive: both hands on a steering wheel that turns, the body leaning into the bends", () => {
    const poses = over("drive");
    for (const pose of poses) {
      expect(pose.wheel).toBe(1);
      // The hands are on opposite sides of the same wheel.
      const middle = pose.leftHand.map((value, i) => (value + pose.rightHand[i]) / 2);
      expect(distance(middle, [5.2, 0, 13.6])).toBeLessThan(1e-9);
    }
    expect(range(poses.map((pose) => pose.rightHand[2] - pose.leftHand[2]))).toBeGreaterThan(4); // the wheel turns
    expect(Math.min(...poses.map((pose) => pose.lean))).toBeLessThan(-0.1);
    expect(Math.max(...poses.map((pose) => pose.lean))).toBeGreaterThan(0.1);
    // The wheel is in the picture, and only in this dance.
    expect(part("steering wheel", pilotParts(look, HAIR, poseAt("drive", 1)))).toBeDefined();
    for (const move of MOVES.filter((one) => one !== "drive")) {
      expect(part("steering wheel", pilotParts(look, HAIR, poseAt(move, 1))), move).toBeUndefined();
    }
  });

  it("wave: both hands high up, beside the head, going from side to side", () => {
    const poses = over("wave");
    for (const pose of poses) {
      expect(pose.leftHand[2]).toBeGreaterThan(20);
      expect(pose.rightHand[2]).toBeGreaterThan(20);
      // Beside the head, not in front of the face.
      expect(pose.leftHand[1]).toBeLessThan(-3.5);
      expect(pose.rightHand[1]).toBeGreaterThan(3.5);
    }
    expect(range(poses.map((pose) => pose.leftHand[1]))).toBeGreaterThan(3);
  });

  it("plane: the arms straight out to the sides, banking left and right", () => {
    for (const pose of over("plane")) {
      const pilot = pilotParts(look, HAIR, pose);
      expect(sizeOf(pilot).maxY - sizeOf(pilot).minY).toBeGreaterThan(18); // wing tip to wing tip
    }
    const leans = over("plane").map((pose) => pose.lean);
    expect(Math.min(...leans)).toBeLessThan(-0.3);
    expect(Math.max(...leans)).toBeGreaterThan(0.3);
  });

  it("siu: a run, a jump with a whole turn in the air, then the landing with arms spread down and feet apart", () => {
    const poses = over("siu", SIU_SECONDS);
    expect(Math.max(...poses.map((pose) => pose.jump))).toBeGreaterThan(3.5);
    expect(Math.max(...poses.map((pose) => pose.spin))).toBeGreaterThan(Math.PI * 1.8);
    // In the air there is a moment when the pilot has the back to the camera.
    const facingAway = poses.some((pose) => part("head", pilotParts(look, HAIR, pose)).head.facing[0] < -0.9);
    expect(facingAway).toBe(true);
    const landing = poseAt("siu", 2.2);
    expect(landing.feetApart).toBeGreaterThanOrEqual(2);
    expect(landing.leftHand[2]).toBeLessThan(13);
    expect(landing.leftHand[1]).toBeLessThan(-7);
    expect(landing.rightHand[1]).toBeGreaterThan(7);
    expect(landing.spin).toBe(0); // facing the camera again
  });

  it("siu: starts from standing and ends back at standing, so it can go round and round", () => {
    const start = poseAt("siu", 0);
    const end = poseAt("siu", SIU_SECONDS - 1e-6);
    expect(distance(start.leftHand, end.leftHand)).toBeLessThan(0.05);
    expect(distance(start.rightHand, end.rightHand)).toBeLessThan(0.05);
    expect(end.jump).toBe(0);
  });

  it("are all different from each other", () => {
    for (const a of DANCES) {
      for (const b of DANCES) {
        if (a !== b) {
          const differ = [0.3, 0.8, 1.3, 2.1].some((t) => distance(poseAt(a, t).leftHand, poseAt(b, t).leftHand) > 1);
          expect(differ, `${a} and ${b}`).toBe(true);
        }
      }
    }
  });
});

describe("arms crossed", () => {
  it("puts each hand on the other side of the chest, in front of it", () => {
    for (const seconds of MOMENTS) {
      const pose = poseAt("crossed", seconds);
      expect(pose.leftHand[1]).toBeGreaterThan(0);
      expect(pose.rightHand[1]).toBeLessThan(0);
      expect(pose.leftHand[0]).toBeGreaterThan(1.6); // the front of the suit is at 1.6
      expect(pose.rightHand[0]).toBeGreaterThan(1.6);
    }
  });
});

describe("going from one pose to another", () => {
  it("starts at the first pose and ends at the second", () => {
    const from = poseAt("stand", 0);
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

describe("the chosen pilot, shown big", () => {
  const { dance, cross, hold, uncross } = CHOSEN_TIMES;
  const round = dance + cross + hold + uncross;

  it("dances their own dance first", () => {
    for (const move of DANCES) {
      expect(chosenPose(move, 0.7)).toEqual(poseAt(move, 0.7));
    }
  });

  it("then has the arms crossed for a while", () => {
    const seconds = dance + cross + hold / 2;
    expect(chosenPose("siu", seconds)).toEqual(poseAt("crossed", seconds));
  });

  it("then dances again, round and round", () => {
    // The same pose as the first time, give or take the rounding of the sums.
    for (const later of [round + 0.7, 3 * round + 0.7]) {
      const again = chosenPose("clap", later);
      const first = poseAt("clap", 0.7);
      expect(distance(again.leftHand, first.leftHand)).toBeLessThan(1e-6);
      expect(distance(again.rightHand, first.rightHand)).toBeLessThan(1e-6);
      expect(again.lift).toBeCloseTo(first.lift, 6);
    }
  });

  it("moves smoothly the whole time, also when crossing and uncrossing the arms", () => {
    for (const move of DANCES) {
      let biggest = 0;
      for (let t = 0; t < round * 1.2; t += 1 / 60) {
        const a = chosenPose(move, t);
        const b = chosenPose(move, t + 1 / 60);
        biggest = Math.max(biggest, distance(a.leftHand, b.leftHand), distance(a.rightHand, b.rightHand));
      }
      expect(biggest, move).toBeLessThan(2);
    }
  });

  it("treats a moment before the choice as the moment of the choice", () => {
    expect(chosenPose("wave", -5)).toEqual(chosenPose("wave", 0));
  });
});

describe("a pilot on a small card", () => {
  it("stands until the mouse comes, and does their own dance while it is there", () => {
    expect(cardPose("robot", 3.1, 0)).toEqual(poseAt("stand", 3.1));
    expect(cardPose("robot", 3.1, 1)).toEqual(poseAt("robot", 3.1));
  });
});

describe("the characters' heads and dances", () => {
  it("gives every character their own dance, all different, PCP the siu and Ró Versos the driving", () => {
    const dances = CAST.map(({ id }) => danceOf(id));
    expect(new Set(dances).size).toBe(CAST.length);
    for (const one of dances) {
      expect(DANCES).toContain(one);
    }
    expect(danceOf("pcp")).toBe("siu");
    expect(danceOf("ro")).toBe("drive");
    expect(danceOf("mario")).toBe(null);
  });

  it("has a hair colour for every character, and none for anyone else", () => {
    for (const { id } of CAST) {
      expect(hairOf(id), id).toMatch(/^#[0-9a-f]{6}$/);
    }
    for (const notAnId of ["mario", "", null, undefined, "PCP"]) {
      expect(hairOf(notAnId)).toBe(null);
    }
  });

  it("has a cut-out head picture for every character, with see-through parts, and no other pictures", () => {
    const folder = new URL("../client/heads/", import.meta.url);
    expect(readdirSync(folder).sort()).toEqual(CAST.map(({ id }) => `${id}.png`).sort());
    for (const { id } of CAST) {
      expect(headOf(id)).toBe(`heads/${id}.png`);
      const bytes = readFileSync(new URL(`../client/${headOf(id)}`, import.meta.url));
      expect([...bytes.subarray(0, 4)], id).toEqual([0x89, 0x50, 0x4e, 0x47]); // a PNG picture
      expect(bytes[25], id).toBe(6); // colour type 6: red, green, blue and see-through
      expect(bytes.length, id).toBeLessThan(60_000); // small, so the menu opens quickly
    }
    expect(headOf("mario")).toBe(null);
  });
});

describe("the scene", () => {
  it("has an empty kart beside the pilot: none of the seated driver's parts", () => {
    const scene = pilotScene(look, HAIR, poseAt("stand", 0));
    for (const name of DRIVER_PARTS) {
      expect(scene.kart.some((one) => one.name === name), name).toBe(false);
    }
    expect(scene.kart).toHaveLength(emptyKartParts(look).length);
    expect([...scene.kart, ...scene.pilot].filter((one) => one.name === "helmet")).toHaveLength(1);
  });

  it("can show the pilot alone, without the kart", () => {
    const scene = pilotScene(look, HAIR, poseAt("stand", 0), false);
    expect(scene.kart).toHaveLength(0);
    expect(scene.shadows).toHaveLength(1);
  });

  it("never has the pilot inside the kart, whatever they do", () => {
    // A box round each part of the kart (the nose, a wheel, the wing...), in
    // the kart's own directions. One box round the whole kart would be too
    // big: it has empty corners, beside the nose and behind the wheels.
    const boxes = emptyKartParts(look).map((one) => sizeOf([one]));
    const cos = Math.cos(-KART_SPOT.turn);
    const sin = Math.sin(-KART_SPOT.turn);
    for (const move of MOVES) {
      for (let seconds = 0; seconds < SIU_SECONDS; seconds += 1 / 30) {
        for (const [x, y, z] of pointsOf(pilotScene(look, HAIR, poseAt(move, seconds)).pilot)) {
          const dx = x - KART_SPOT.x;
          const dy = y - KART_SPOT.y;
          const along = dx * cos - dy * sin;
          const across = dx * sin + dy * cos;
          const inside = boxes.some(
            (one) => along > one.minX && along < one.maxX && across > one.minY && across < one.maxY && z > one.minZ && z < one.maxZ,
          );
          expect(inside, `${move} at ${seconds}: ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`).toBe(false);
        }
      }
    }
  });
});

describe("moving a part", () => {
  it("moves every corner, a ball and a head, and turns the way the head looks", () => {
    const moved = movePart(
      { faces: [{ points: [[1, 0, 2]], colour: "#000000" }], ball: { middle: [0, 0, 5], radius: 1 }, head: { middle: [0, 0, 9], height: 2, facing: [1, 0, 0] } },
      { x: 10, y: 20, turn: Math.PI / 2 },
    );
    expect(moved.faces[0].points[0][0]).toBeCloseTo(10);
    expect(moved.faces[0].points[0][1]).toBeCloseTo(21);
    expect(moved.ball.middle).toEqual([10, 20, 5]);
    expect(moved.head.middle).toEqual([10, 20, 9]);
    expect(moved.head.facing[0]).toBeCloseTo(0);
    expect(moved.head.facing[1]).toBeCloseTo(1);
  });
});

describe("the steering wheel", () => {
  it("goes through both hands", () => {
    const left = [5, -2, 13];
    const right = [5, 2, 14];
    const parts = steeringWheel(left, right);
    const ring = pointsOf([part("steering wheel", parts)]);
    const middle = [5, 0, 13.5];
    const radius = distance(left, middle);
    for (const point of ring) {
      expect(Math.abs(distance(point, middle) - radius)).toBeLessThan(0.6); // every corner near the circle
    }
  });
});

describe("faces in the race", () => {
  it("are never painted by the race pages: only the menu paints a pilot with a face", () => {
    for (const file of ["main.js", "online.js", "draw.js"]) {
      const code = readFileSync(new URL(`../client/${file}`, import.meta.url), "utf8");
      expect(code, file).not.toMatch(/faceOf|headOf|faces\/|heads\/|paintPilotScene|pilot-shape/);
    }
  });
});
