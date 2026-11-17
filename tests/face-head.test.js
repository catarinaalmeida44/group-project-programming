// Tests for client/face-head.js: the pilot with a real face, used when
// choosing a character (and later on the podium), never in the race.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { FACE_HEAD_GROWTH, LEAST_FACE_SEEN, faceHeadBall, faceTowardsEye, faceIsSeen, faceSquare } from "../client/face-head.js";
import { kartParts, LOOKS } from "../client/kart-shape.js";

const helmet = kartParts(LOOKS[0]).find((part) => part.name === "helmet").ball;
const head = faceHeadBall(helmet);
const body = kartParts(LOOKS[0]).find((part) => part.name === "body");
const topOfBody = Math.max(...body.faces.flatMap((face) => face.points.map((point) => point[2])));

/** An eye at this angle round the head, measured from straight in front, a little above it. */
function eyeAt(angle, distance = 100) {
  return [head.middle[0] + Math.cos(angle) * distance, head.middle[1] + Math.sin(angle) * distance, head.middle[2] + 30];
}

describe("the head with a face", () => {
  it("is bigger than the helmet, so the face can be seen in a small picture", () => {
    expect(head.radius).toBeCloseTo(helmet.radius * FACE_HEAD_GROWTH);
    expect(head.radius).toBeGreaterThan(helmet.radius);
  });

  it("grows upwards: it sits on the shoulders and does not sink into the body", () => {
    const bottom = head.middle[2] - head.radius;
    expect(bottom).toBeGreaterThan(helmet.middle[2] - helmet.radius - 1);
    expect(head.middle[2]).toBeGreaterThan(topOfBody);
  });

  it("stays above the middle of the kart, where the helmet was", () => {
    expect(head.middle[0]).toBe(helmet.middle[0]);
    expect(head.middle[1]).toBe(helmet.middle[1]);
  });

  it("keeps the helmet's colour for the back of the head", () => {
    expect(head.colour).toBe(helmet.colour);
  });

  it("does not change the helmet it was made from", () => {
    const before = JSON.stringify(helmet);
    faceHeadBall(helmet);
    expect(JSON.stringify(helmet)).toBe(before);
  });
});

describe("how much of the face the eye sees", () => {
  it("is all of it from straight in front", () => {
    expect(faceTowardsEye(head, eyeAt(0))).toBeCloseTo(1);
    expect(faceIsSeen(faceTowardsEye(head, eyeAt(0)))).toBe(true);
  });

  it("is less as the eye goes round to the side, the same on both sides", () => {
    const front = faceTowardsEye(head, eyeAt(0));
    const left = faceTowardsEye(head, eyeAt(-0.6));
    const right = faceTowardsEye(head, eyeAt(0.6));
    expect(left).toBeLessThan(front);
    expect(left).toBeCloseTo(right);
    expect(faceIsSeen(left)).toBe(true);
  });

  it("is none from the side or from behind: then the back of the head is shown", () => {
    for (const angle of [Math.PI / 2, -Math.PI / 2, Math.PI, 2.5, -2.5]) {
      expect(faceIsSeen(faceTowardsEye(head, eyeAt(angle))), String(angle)).toBe(false);
    }
  });

  it("does not depend on how high the eye is", () => {
    const low = eyeAt(0.4);
    const high = [low[0], low[1], low[2] + 500];
    expect(faceTowardsEye(head, high)).toBeCloseTo(faceTowardsEye(head, low));
  });

  it("is from the side when the eye is right above the head", () => {
    expect(faceTowardsEye(head, [head.middle[0], head.middle[1], 500])).toBe(0);
  });

  it("starts being painted at the agreed share, not before", () => {
    expect(faceIsSeen(LEAST_FACE_SEEN)).toBe(true);
    expect(faceIsSeen(LEAST_FACE_SEEN - 0.01)).toBe(false);
  });
});

describe("the part of the picture painted on the head", () => {
  it("is a square inside the picture, in the middle across", () => {
    const square = faceSquare(256);
    expect(square.x).toBeGreaterThanOrEqual(0);
    expect(square.y).toBeGreaterThanOrEqual(0);
    expect(square.x + square.size).toBeLessThanOrEqual(256);
    expect(square.y + square.size).toBeLessThanOrEqual(256);
    expect(square.x * 2 + square.size).toBe(256);
  });

  it("leaves out the shoulders at the bottom, so the face fills the head", () => {
    const square = faceSquare(256);
    expect(square.y + square.size).toBeLessThan(256 * 0.8);
  });
});

describe("faces in the race", () => {
  it("are never passed by the race pages: only the menu paints a face", () => {
    // paintKart only paints a face when one is handed to it. The race pages
    // (main.js, online.js, draw.js) must never hand one in.
    for (const file of ["main.js", "online.js", "draw.js"]) {
      const code = readFileSync(new URL(`../client/${file}`, import.meta.url), "utf8");
      expect(code, file).not.toMatch(/faceOf|faces\//);
    }
  });
});
