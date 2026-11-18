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
  GANGNAM_SECONDS,
  GANGNAM_STEP,
  GANGNAM_JUMP,
  GANGNAM_BEATS,
  GRIDDY_SECONDS,
  GRIDDY_TURN,
  GRIDDY_KICK,
  FLOSS_SWINGS,
  DAB_SECONDS,
  LEG,
  legWith,
  CHOSEN_TIMES,
} from "../client/pilot-shape.js";
import { kartParts, LOOKS } from "../client/kart-shape.js";
import { lookOfCharacter, hairOf, longHairOf, headOf, danceOf, danceNameOf } from "../client/cast-choice.js";
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
  // Changed on 18 November 2026, said out loud in Catarina's diary: this
  // test pinned six dances. Catarina asked for a new dance for her own
  // character, so the list got a seventh, "gangnam", at its end. The same
  // evening three more followed: "griddy" for Ro Versos (he asked), and
  // "floss" and "dab" for Dean and Professor Ricardo Pereira.
  it("is one of standing, arms crossed, and the ten dances", () => {
    expect(DANCES).toEqual(["clap", "robot", "drive", "wave", "plane", "siu", "gangnam", "griddy", "floss", "dab"]);
    expect(MOVES).toEqual(["stand", "crossed", ...DANCES]);
  });

  it("never puts anything below the ground", () => {
    for (const move of MOVES) {
      for (const seconds of MOMENTS) {
        expect(sizeOf(pilotParts(look, HAIR, poseAt(move, seconds))).minZ, `${move} at ${seconds}`).toBeGreaterThan(-0.01);
      }
    }
  });

  // Changed on 18 November 2026, said out loud in Catarina's diary: the
  // gangnam now jumps too, on every beat ("more energy, jumping", she said).
  it("keeps the feet on the ground, except during the jumps of the siu and the gangnam", () => {
    for (const move of MOVES.filter((one) => one !== "siu" && one !== "gangnam")) {
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
  }, 20_000); // every movement at 60 pictures a second: it may take a few seconds when all the tests run at once

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
  it("gives every character their own dance, all different, PCP the siu and Ró Versos the griddy", () => {
    const dances = CAST.map(({ id }) => danceOf(id));
    expect(new Set(dances).size).toBe(CAST.length);
    for (const one of dances) {
      expect(DANCES).toContain(one);
    }
    expect(danceOf("pcp")).toBe("siu");
    expect(danceOf("ro")).toBe("griddy"); // "drive" until 18 November 2026: he asked Catarina for the griddy
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
      // 15 moments a second: still more than ten during the spin of the siu.
      for (let seconds = 0; seconds < SIU_SECONDS; seconds += 1 / 15) {
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
  }, 20_000); // many moments of every movement: it may take a few seconds when all the tests run at once
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

// ---------------------------------------------------------------------------
// Added on 18 November 2026, for Catarina: Cici Boss dances the "gangnam",
// a foot can be lifted with the knee bending, and long hair.
// ---------------------------------------------------------------------------

describe("the gangnam (added 18 November 2026)", () => {
  const BEAT = GANGNAM_SECONDS / 8;
  const every = (from, to) => {
    const poses = [];
    for (let t = from; t < to; t += 1 / 60) {
      poses.push(poseAt("gangnam", t));
    }
    return poses;
  };

  it("is the dance of Cici Boss, and no longer the wave", () => {
    expect(danceOf("cici")).toBe("gangnam");
    expect(CAST.map(({ id }) => danceOf(id))).not.toContain("wave");
  });

  it("first holds the reins: the wrists crossed in front of the chest, pumping down and up", () => {
    const reins = every(0, BEAT * 3);
    for (const pose of reins) {
      expect(pose.leftHand[1]).toBeGreaterThan(0); // the left hand is on the right side
      expect(pose.rightHand[1]).toBeLessThan(0); //   and the right hand on the left
      expect(pose.leftHand[0]).toBeGreaterThan(1.6); // in front of the suit, which ends at 1.6
      expect(pose.rightHand[0]).toBeGreaterThan(1.6);
      expect(distance(pose.leftHand, pose.rightHand)).toBeLessThan(2.5);
    }
    const heights = reins.map((pose) => pose.rightHand[2]);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(1.5);
  });

  it("then swings a lasso: the right hand goes round beside the head, the left fist stays in front", () => {
    const lasso = every(BEAT * 4.1, BEAT * 7.1);
    for (const pose of lasso) {
      expect(pose.rightHand[2]).toBeGreaterThan(20); // as high as the head
      expect(pose.rightHand[1]).toBeGreaterThan(4.5); // beside the head, not in front of the face
      expect(pose.leftHand[2]).toBeLessThan(15);
      expect(pose.leftHand[0]).toBeGreaterThan(1.6);
    }
    const across = lasso.map((pose) => pose.rightHand[1]);
    const forwards = lasso.map((pose) => pose.rightHand[0]);
    expect(Math.max(...across) - Math.min(...across)).toBeGreaterThan(3); // a circle: it moves both ways
    expect(Math.max(...forwards) - Math.min(...forwards)).toBeGreaterThan(3);
  });

  it("keeps the feet apart, jumps on every beat, and has one knee higher and then the other", () => {
    const poses = every(0, GANGNAM_SECONDS);
    expect(poses.every((pose) => pose.feetApart > 1)).toBe(true);
    expect(Math.max(...poses.map((pose) => pose.hop))).toBeGreaterThan(GANGNAM_STEP * 0.95); // the right foot
    expect(Math.min(...poses.map((pose) => pose.hop))).toBeLessThan(-GANGNAM_STEP * 0.95); //  the left foot
    for (const pose of poses) {
      const pilot = pilotParts(look, HAIR, pose);
      const left = sizeOf([part("left shoe", pilot)]).minZ;
      const right = sizeOf([part("right shoe", pilot)]).minZ;
      expect(Math.min(left, right)).toBeCloseTo(pose.jump); // the lower foot is as high as the jump
      expect(Math.max(left, right) - Math.min(left, right)).toBeCloseTo(Math.abs(pose.hop)); // the other one is higher by the step
    }
    // It leaves the ground on every beat and lands again: ten jumps a round.
    const heights = poses.map((pose) => pose.jump);
    expect(Math.max(...heights)).toBeGreaterThan(GANGNAM_JUMP * 0.95);
    expect(Math.min(...heights)).toBeLessThan(0.2);
    let landings = 0;
    for (let i = 1; i < heights.length - 1; i++) {
      if (heights[i] <= heights[i - 1] && heights[i] < heights[i + 1]) {
        landings++;
      }
    }
    expect(landings).toBeGreaterThanOrEqual(GANGNAM_BEATS - 2);
    expect(landings).toBeLessThanOrEqual(GANGNAM_BEATS);
  });

  it("ends a round exactly as it began, so it can go round and round", () => {
    const start = poseAt("gangnam", 0);
    const end = poseAt("gangnam", GANGNAM_SECONDS - 1e-6);
    expect(distance(start.leftHand, end.leftHand)).toBeLessThan(0.01);
    expect(distance(start.rightHand, end.rightHand)).toBeLessThan(0.01);
    expect(Math.abs(start.hop - end.hop)).toBeLessThan(0.01);
    // And the next round is the same as the first.
    const later = poseAt("gangnam", GANGNAM_SECONDS + 0.7);
    expect(distance(later.rightHand, poseAt("gangnam", 0.7).rightHand)).toBeLessThan(1e-6);
  });

  it("lasts as long as the siu, so the chosen pilot shows one whole round before crossing arms", () => {
    expect(GANGNAM_SECONDS).toBe(CHOSEN_TIMES.dance);
  });

  it("is not the wave under a new name: the wave is still there, unchanged, for whoever wants it", () => {
    expect(DANCES).toContain("wave");
    const wave = poseAt("wave", 0.5);
    expect(wave.leftHand[2]).toBeGreaterThan(20);
    expect(wave.hop).toBe(0);
  });
});

describe("a leg (added 18 November 2026)", () => {
  const colour = "#123456";
  const lengthOf = (a, b) => distance(a, b);

  it("is one straight piece when the pilot stands, as before", () => {
    expect(legWith([0, 1.7, 9.4], [0.3, 1.95, 1.2], colour)).toHaveLength(6); // one bar: six sides
    for (const move of MOVES.filter((one) => one !== "gangnam" && one !== "griddy")) {
      for (const seconds of MOMENTS) {
        const pilot = pilotParts(look, HAIR, poseAt(move, seconds));
        expect(part("left leg", pilot).faces, `${move} at ${seconds}`).toHaveLength(6);
        expect(part("right leg", pilot).faces, `${move} at ${seconds}`).toHaveLength(6);
      }
    }
  });

  it("bends at the knee when the foot is lifted: two pieces, the knee in front", () => {
    const hip = [0, 1.7, 9.4];
    const foot = [0.9, 1.95, 2.9]; // lifted 1.7
    const faces = legWith(hip, foot, colour);
    expect(faces).toHaveLength(12); // two bars
    const furthestForwards = Math.max(...faces.flatMap((face) => face.points.map((point) => point[0])));
    expect(furthestForwards).toBeGreaterThan(Math.max(hip[0], foot[0]) + 1.5);
  });

  it("keeps its length when it bends: thigh and shin together are as long as the straight leg", () => {
    // The knee is the same distance from the hip and from the foot: half a leg each.
    for (const lifted of [0.2, 0.8, 1.7, 3]) {
      const hip = [0, 1.7, 9.4];
      const foot = [0.3 + lifted * 0.4, 1.95, 1.2 + lifted];
      const between = lengthOf(hip, foot);
      const forwards = Math.sqrt((LEG / 2) ** 2 - (between / 2) ** 2);
      const knee = [(hip[0] + foot[0]) / 2 + forwards, (hip[1] + foot[1]) / 2, (hip[2] + foot[2]) / 2];
      expect(lengthOf(hip, knee) + lengthOf(knee, foot)).toBeGreaterThan(LEG - 0.2);
      expect(lengthOf(hip, knee) + lengthOf(knee, foot)).toBeLessThan(LEG + 0.6);
      const faces = legWith(hip, foot, colour);
      const furthest = Math.max(...faces.flatMap((face) => face.points.map((point) => point[0])));
      expect(furthest, `lifted ${lifted}`).toBeGreaterThan(knee[0]); // the knee is where the sum says
      expect(furthest, `lifted ${lifted}`).toBeLessThan(knee[0] + 1.6); //  give or take half the thickness of the leg
    }
  });

  it("is never bent by a pose without a hop, even one made by hand that has no hop at all", () => {
    const { hop, ...old } = poseAt("stand", 1);
    expect(hop).toBe(0);
    const pilot = pilotParts(look, HAIR, old);
    expect(part("left leg", pilot).faces).toHaveLength(6);
    expect(sizeOf([part("left shoe", pilot), part("right shoe", pilot)]).maxZ).toBeCloseTo(1.3);
    // And mixing two such poses gives a hop of zero, not "not a number".
    expect(blendPoses(old, old, 0.5).hop).toBe(0);
  });
});

describe("long hair (added 18 November 2026)", () => {
  it("is only Cici Boss's: her head picture goes on below the chin; everybody else has short hair", () => {
    // (First written the same day with painted hair and the colour of its
    // ends. Catarina did not like the painted hair, sent her whole photo,
    // and the hair now comes from the photo: the rule is how far the
    // picture hangs below the chin.)
    expect(Object.keys(longHairOf("cici"))).toEqual(["below"]);
    expect(longHairOf("cici").below).toBeGreaterThan(0.2); // clearly longer than a head
    expect(longHairOf("cici").below).toBeLessThan(0.8); //    and not down to the belt
    // Her picture is taller for its width than a head alone would be.
    const bytes = readFileSync(new URL("../client/heads/cici.png", import.meta.url));
    const wide = bytes.readUInt32BE(16);
    const tall = bytes.readUInt32BE(20);
    expect(tall / wide).toBeGreaterThan(1.3);
    for (const { id } of CAST.filter((one) => one.id !== "cici")) {
      expect(longHairOf(id), id).toBe(null);
    }
  });

  it("is nobody's who is not in the cast", () => {
    for (const notAnId of ["mario", "", null, undefined, "CICI", " cici", {}, ["cici"]]) {
      expect(longHairOf(notAnId), JSON.stringify(notAnId)).toBe(null);
    }
  });

  it("is carried by the head of the pilot, and only when asked for", () => {
    const short = part("head", pilotParts(look, HAIR, poseAt("stand", 0))).head;
    expect("long" in short).toBe(false);
    const long = part("head", pilotParts(look, HAIR, poseAt("stand", 0), true, longHairOf("cici"))).head;
    expect(long.long).toEqual(longHairOf("cici"));
    expect(long.hair).toBe(HAIR); // the colour of the hair itself is unchanged
  });

  it("reaches the scene of the character panel, beside the kart and alone", () => {
    for (const withKart of [true, false]) {
      const scene = pilotScene(look, HAIR, poseAt("stand", 0), withKart, longHairOf("cici"));
      expect(part("head", scene.pilot).head.long, `with kart: ${withKart}`).toEqual(longHairOf("cici"));
      expect("long" in part("head", pilotScene(look, HAIR, poseAt("stand", 0), withKart).pilot).head).toBe(false);
    }
  });

  it("changes nothing else about the pilot: the same parts in the same places", () => {
    const pose = poseAt("clap", 0.4);
    const withoutHead = (parts) => parts.filter((one) => one.name !== "head");
    expect(withoutHead(pilotParts(look, HAIR, pose, true, longHairOf("cici")))).toEqual(withoutHead(pilotParts(look, HAIR, pose)));
  });
});

describe("the photos beside the pilots (taken out on 18 November 2026)", () => {
  it("are not shown by the character panel any more: it paints the pilots only", () => {
    const code = readFileSync(new URL("../client/kart-panel.js", import.meta.url), "utf8");
    expect(code).not.toMatch(/faceOf|faces\//);
    expect(code).toMatch(/headOf/); // the head on the pilot is still the person's own
    const page = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
    expect(page).not.toMatch(/faces\//);
  });
});

describe("the name of each dance on the page (added 18 November 2026)", () => {
  it("has a name for every dance, each different, and the gangnam for Cici Boss", () => {
    const names = CAST.map(({ id }) => danceNameOf(id));
    for (const name of names) {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(3);
    }
    expect(new Set(names).size).toBe(CAST.length);
    expect(danceNameOf("cici")).toBe("Gangnam style");
  });

  it("has none for someone who is not in the cast", () => {
    for (const notAnId of ["mario", "", null, undefined, "PCP", {}]) {
      expect(danceNameOf(notAnId), JSON.stringify(notAnId)).toBe(null);
    }
  });
});

describe("the page of the character panel (added 18 November 2026)", () => {
  const page = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
  const code = readFileSync(new URL("../client/kart-panel.js", import.meta.url), "utf8");

  it("has every part the panel's code fills in, once each", () => {
    const ids = [...code.matchAll(/getElementById\("([^"]+)"\)/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(8);
    for (const id of ids) {
      expect(page.split(`id="${id}"`).length - 1, id).toBe(1);
    }
  });

  it("writes names as text, never as HTML, so a name can never become part of the page's code", () => {
    expect(code).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/);
  });
});

// ---------------------------------------------------------------------------
// Added later on 18 November 2026: the griddy, the floss and the dab.
// (The griddy was rebuilt once, turned to the side, because the first one
// faced the front and did not look like a griddy. The Professor first had a
// disco point, then the dab.)
// ---------------------------------------------------------------------------

describe("the three dances added last (18 November 2026)", () => {
  const every = (move, from, to) => {
    const poses = [];
    for (let t = from; t < to; t += 1 / 60) {
      poses.push(poseAt(move, t));
    }
    return poses;
  };
  const range = (values) => Math.max(...values) - Math.min(...values);
  const BEAT = GRIDDY_SECONDS / 8;

  it("gives the griddy to Ro Versos, the floss to Dean and the dab to Professor Ricardo Pereira", () => {
    expect(danceOf("ro")).toBe("griddy");
    expect(danceOf("dean")).toBe("floss");
    expect(danceOf("ricardo")).toBe("dab");
    expect(danceNameOf("ro")).toBe("The griddy");
    expect(danceNameOf("ricardo")).toBe("The dab");
  });

  it("griddy: turns to one side, to the front for the glasses, then to the other side", () => {
    expect(poseAt("griddy", BEAT * 1.3).spin).toBeCloseTo(-GRIDDY_TURN);
    expect(poseAt("griddy", BEAT * 4).spin).toBe(0);
    expect(poseAt("griddy", BEAT * 6.7).spin).toBeCloseTo(GRIDDY_TURN);
    expect(GRIDDY_TURN).toBeGreaterThan(0.7); // far enough round to see the heels and the arms from the side
    expect(GRIDDY_TURN).toBeLessThan(1.3); //    and not so far that the face is gone
    // A round begins and ends facing the front, so it can go round and round.
    expect(poseAt("griddy", 0).spin).toBeCloseTo(0);
    expect(poseAt("griddy", GRIDDY_SECONDS - 1e-6).spin).toBeCloseTo(0, 3);
  });

  it("griddy: the heels tap out in front in turn, flat on the ground, the whole time", () => {
    const poses = every("griddy", 0, GRIDDY_SECONDS);
    expect(Math.max(...poses.map((pose) => pose.kick))).toBeGreaterThan(GRIDDY_KICK * 0.95); // the right heel
    expect(Math.min(...poses.map((pose) => pose.kick))).toBeLessThan(-GRIDDY_KICK * 0.95); //  the left heel
    expect(poses.every((pose) => pose.jump === 0 && pose.hop === 0)).toBe(true); // tapping, not jumping
    // Standing square to the front, the kicked foot is about that far in
    // front of the other. It stands on its heel with the toe up: a heel tap.
    // The other shoe is flat on the ground, as always.
    for (const kick of [GRIDDY_KICK, -GRIDDY_KICK]) {
      const pilot = pilotParts(look, HAIR, { ...poseAt("stand", 0), kick });
      const [kicked, standing] = kick > 0 ? ["right shoe", "left shoe"] : ["left shoe", "right shoe"];
      const ahead = middleOf(part(kicked, pilot))[0] - middleOf(part(standing, pilot))[0];
      expect(Math.abs(ahead - GRIDDY_KICK)).toBeLessThan(0.7);
      expect(sizeOf([part(kicked, pilot)]).minZ).toBeGreaterThanOrEqual(0); // the heel is on the ground, not in it
      expect(sizeOf([part(kicked, pilot)]).minZ).toBeLessThan(0.4);
      expect(sizeOf([part(kicked, pilot)]).maxZ).toBeGreaterThan(2.5); //    the toe is up
      expect(sizeOf([part(standing, pilot)]).minZ).toBeCloseTo(0);
      expect(sizeOf([part(standing, pilot)]).maxZ).toBeCloseTo(1.3);
    }
    // And the upper body leans back while the arms swing: the head is behind the hips.
    const leaning = pilotParts(look, HAIR, poseAt("griddy", BEAT * 1.3));
    const upright = pilotParts(look, HAIR, { ...poseAt("griddy", BEAT * 1.3), pitch: 0 });
    const turned = poseAt("griddy", BEAT * 1.3).spin;
    const forwards = ([x, y]) => x * Math.cos(turned) + y * Math.sin(turned); // how far along the way the pilot faces
    expect(forwards(part("head", leaning).head.middle)).toBeLessThan(forwards(part("head", upright).head.middle) - 1.5);
  });

  it("griddy: side-on, both arms swing together, back and low, then forwards and up", () => {
    const swinging = every("griddy", BEAT * 0.5, BEAT * 2.1);
    for (const pose of swinging) {
      expect(pose.leftHand[0]).toBeCloseTo(pose.rightHand[0]); // together
      expect(pose.leftHand[2]).toBeCloseTo(pose.rightHand[2]);
      expect(pose.leftHand[1]).toBeLessThan(-3.5); // beside the body, one on each side
      expect(pose.rightHand[1]).toBeGreaterThan(3.5);
    }
    expect(range(swinging.map((pose) => pose.leftHand[0]))).toBeGreaterThan(6); // far back to far forwards
    expect(range(swinging.map((pose) => pose.leftHand[2]))).toBeGreaterThan(3); // low to high
    // The arms are forwards when the right heel is out.
    const out = swinging.reduce((best, pose) => (pose.kick > best.kick ? pose : best));
    expect(out.leftHand[0]).toBeGreaterThan(3);
  });

  it("griddy: to the front, both hands are in front of the eyes, like glasses, and come down again", () => {
    for (const pose of every("griddy", BEAT * 3.3, BEAT * 4.7)) {
      for (const hand of [pose.leftHand, pose.rightHand]) {
        expect(hand[2]).toBeGreaterThan(20); //          as high as the eyes
        expect(Math.abs(hand[1])).toBeLessThan(2.5); //  in front of the face
        expect(hand[0]).toBeGreaterThan(1.6); //         and in front of the head
      }
      expect(pose.spin).toBe(0);
    }
    const end = poseAt("griddy", GRIDDY_SECONDS - 1e-6);
    expect(distance(end.leftHand, poseAt("griddy", 0).leftHand)).toBeLessThan(0.05); // a round ends as it began
    expect(end.leftHand[2]).toBeLessThan(14);
  });

  it("floss: both hands swing to the same side, low, and the hips go the other way", () => {
    const poses = every("floss", 0, 2 / FLOSS_SWINGS);
    for (const pose of poses) {
      expect(pose.leftHand[2]).toBeLessThan(10);
      expect(pose.rightHand[2]).toBeLessThan(10);
      const armsSide = (pose.leftHand[1] + pose.rightHand[1]) / 2;
      if (Math.abs(armsSide) > 1) {
        expect(Math.sign(pose.sway)).toBe(-Math.sign(armsSide));
      }
    }
    expect(range(poses.map((pose) => pose.leftHand[1]))).toBeGreaterThan(8);
    expect(range(poses.map((pose) => pose.rightHand[1]))).toBeGreaterThan(8);
  });

  it("floss: the arm that crosses the body is in front of it, the arm on its own side goes behind", () => {
    const quarter = 1 / FLOSS_SWINGS / 4;
    const right = poseAt("floss", quarter); //     both arms on the right
    const left = poseAt("floss", quarter * 3); //  both arms on the left
    expect(right.leftHand[0]).toBeGreaterThan(1.6); // the left arm crossed over: in front of the suit
    expect(right.rightHand[0]).toBeLessThan(-1.6); //  the right arm: behind
    expect(left.rightHand[0]).toBeGreaterThan(1.6);
    expect(left.leftHand[0]).toBeLessThan(-1.6);
    // And no hand ever goes through the body: while a hand is in front of the chest or the back, it is clear of it.
    for (const pose of every("floss", 0, 2 / FLOSS_SWINGS)) {
      for (const hand of [pose.leftHand, pose.rightHand]) {
        if (Math.abs(hand[1] + pose.sway) < 3.1) {
          expect(Math.abs(hand[0])).toBeGreaterThan(1.6);
        }
      }
    }
  });

  // Rewritten with the dab itself, twice, on 18 November 2026: the first two
  // dabs crossed the wrong arm over the face and kept the head upright.
  it("dab: one arm straight up and out, the other elbow out beside the head, the head dropped into it", () => {
    const right = poseAt("dab", DAB_SECONDS * 0.25); // the middle of the dab that points to the right
    expect(right.rightHand[1]).toBeGreaterThan(8); //   the right arm: far out to its own side
    expect(right.rightHand[2]).toBeGreaterThan(20); //  and up
    expect(right.leftHand[1]).toBeLessThan(-2); //      the hand of the bent left arm: on its own side of the face
    expect(right.leftHand[2]).toBeGreaterThan(19); //   as high as the eyes
    expect(right.leftHand[0]).toBeGreaterThan(1.6); //  and in front of the face
    expect(right.lean).toBeLessThan(-0.15); //          the body leans towards the bent elbow, away from the pointing arm
    expect(right.tilt).toBeLessThan(-0.3); //           and the head drops over that way too
    // The bent elbow sticks out beside the head: further out than the shoulder, and above it.
    const bentArm = pilotParts(look, HAIR, right);
    const elbowOut = Math.min(...part("left upper arm", bentArm).faces.flatMap((face) => face.points.map((point) => point[1])));
    const elbowUp = Math.max(...part("left upper arm", bentArm).faces.flatMap((face) => face.points.map((point) => point[2])));
    expect(elbowOut).toBeLessThan(-6);
    expect(elbowUp).toBeGreaterThan(17.5);
    // The two arms are side by side: the forearm of the bent arm slants the same way as the straight arm.
    const slant = (from, to) => Math.atan2(to[2] - from[2], to[1] - from[1]);
    const straight = slant(middleOf(part("right upper arm", bentArm)), middleOf(part("right forearm", bentArm)));
    const forearm = slant(middleOf(part("left upper arm", bentArm)), middleOf(part("left glove", bentArm)));
    expect(Math.abs(straight - forearm)).toBeLessThan(0.6);
    // The head carries the tilt, for the painter to turn the picture.
    expect(part("head", bentArm).head.tilt).toBe(right.tilt);
    expect("tilt" in part("head", pilotParts(look, HAIR, poseAt("stand", 0))).head).toBe(false);
    // The hand that points is asked for further away than an arm reaches, so
    // the arm is straight. Its glove ends up well above the shoulder (15.8),
    // beside the head.
    const pilot = pilotParts(look, HAIR, right);
    const glove = middleOf(part("right glove", pilot));
    expect(glove[2]).toBeGreaterThan(18);
  });

  it("dab: then the same to the other side, with both fists at the chest in between", () => {
    const right = poseAt("dab", DAB_SECONDS * 0.25);
    const left = poseAt("dab", DAB_SECONDS * 0.75);
    const mirror = ([x, y, z]) => [x, -y, z];
    expect(distance(left.leftHand, mirror(right.rightHand))).toBeLessThan(1e-9);
    expect(distance(left.rightHand, mirror(right.leftHand))).toBeLessThan(1e-9);
    expect(left.lean).toBeCloseTo(-right.lean);
    const between = poseAt("dab", DAB_SECONDS * 0.5);
    expect(between.lean).toBe(0);
    for (const hand of [between.leftHand, between.rightHand]) {
      expect(hand[2]).toBeLessThan(15); //   down at the chest
      expect(hand[0]).toBeGreaterThan(1.6); // in front of it
    }
    // It holds each dab for a moment.
    expect(left.tilt).toBeCloseTo(-right.tilt);
    expect(between.tilt).toBe(0);
    const held = every("dab", 0, DAB_SECONDS).filter((pose) => Math.abs(pose.lean) > 0.19).length;
    expect(held / 60).toBeGreaterThan(DAB_SECONDS * 0.3);
  });
});