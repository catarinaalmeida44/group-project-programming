// Tests for the "golf" dance in client/pilot-shape.js: FranFon's own dance
// since 19 November 2026. A golf swing with a club, and the ball flying far.
//
// The general rules for every dance (smooth, never below the ground, feet on
// the ground, never inside the kart) are tested for all dances together in
// pilot-shape.test.js. These are the rules of the golf swing itself.

import { describe, it, expect } from "vitest";
import {
  poseAt,
  pilotParts,
  blendPoses,
  golfClub,
  golfBallAt,
  DANCES,
  GOLF_SECONDS,
  GOLF_MOMENTS,
  GOLF_FLIGHT_SECONDS,
  GOLF_TEE,
  CLUB_LENGTH,
} from "../client/pilot-shape.js";
import { lookOfCharacter, danceOf, danceNameOf } from "../client/cast-choice.js";
import { CAST } from "../shared/cast.js";

const look = lookOfCharacter("franfon");
const HAIR = "#2a201a";
const golf = (seconds) => poseAt("golf", seconds);
const partNamed = (parts, name) => parts.find((one) => one.name === name);
const cornersOf = (one) => one.faces.flatMap((face) => face.points);
const lowest = (one) => Math.min(...cornersOf(one).map((point) => point[2]));
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const m = GOLF_MOMENTS;

describe("FranFon's dance", () => {
  it("is the golf swing, called The hole in one", () => {
    expect(danceOf("franfon")).toBe("golf");
    expect(danceNameOf("franfon")).toBe("The hole in one");
  });

  it("is danced by FranFon only, and the aeroplane is still there, danced by nobody", () => {
    expect(CAST.filter((character) => danceOf(character.id) === "golf").map((character) => character.id)).toEqual(["franfon"]);
    expect(DANCES).toContain("plane");
    expect(CAST.some((character) => danceOf(character.id) === "plane")).toBe(false);
  });
});

describe("the golf swing", () => {
  it("starts standing, with no club, and ends standing again, so it can go round and round", () => {
    expect(golf(0).club).toBe(0);
    const start = golf(0);
    const end = golf(GOLF_SECONDS - 0.0001);
    expect(distance(start.leftHand, end.leftHand)).toBeLessThan(0.05);
    expect(distance(start.rightHand, end.rightHand)).toBeLessThan(0.05);
  });

  it("holds the club from standing over the ball until the finish", () => {
    for (const seconds of [m.address, m.startBack, m.top, m.impact, m.finish, m.standUp - 0.01]) {
      expect(golf(seconds).club, `at ${seconds}`).toBe(1);
      const parts = pilotParts(look, HAIR, golf(seconds));
      expect(partNamed(parts, "golf club shaft"), `at ${seconds}`).toBeDefined();
      expect(partNamed(parts, "golf club head"), `at ${seconds}`).toBeDefined();
    }
  });

  it("stands over the ball with both hands low in front, close together", () => {
    const address = golf(m.startBack - 0.01);
    expect(address.rightHand[2]).toBeLessThan(10);
    expect(address.rightHand[0]).toBeGreaterThan(2);
    expect(distance(address.leftHand, address.rightHand)).toBeLessThan(1.5);
    expect(address.pitch).toBeLessThan(0); // bent forwards over the ball
  });

  it("takes the club up behind the right shoulder, slowly, then swings it down fast", () => {
    const top = golf(m.top);
    expect(top.rightHand[2]).toBeGreaterThan(17); // high up
    expect(top.rightHand[1]).toBeGreaterThan(3); //  on the right
    expect(top.spin).toBeGreaterThan(0); //          the shoulders turned away
    // The way up takes longer than the way down.
    expect(m.top - m.startBack).toBeGreaterThan(2 * (m.impact - m.top));
  });

  it("finishes high over the left shoulder, turned towards where the ball goes", () => {
    const finish = golf(m.finish + 0.3);
    expect(finish.rightHand[2]).toBeGreaterThan(17);
    expect(finish.rightHand[1]).toBeLessThan(-3); // on the left
    expect(finish.spin).toBeLessThan(0); //         turned to the left, where the ball flies
  });

  it("keeps the feet apart, as a golfer stands, and never jumps", () => {
    for (let seconds = 0; seconds < GOLF_SECONDS; seconds += 0.05) {
      expect(golf(seconds).jump).toBe(0);
      expect(golf(seconds).hop).toBe(0);
    }
    expect(golf(m.top).feetApart).toBeGreaterThan(1);
  });
});

describe("the golf ball", () => {
  it("waits on the ground, without moving, until it is hit", () => {
    for (const seconds of [0, m.address, m.top, m.impact - 0.01]) {
      const pose = golf(seconds);
      expect(pose.ball, `at ${seconds}`).toBe(1);
      expect(pose.flight, `at ${seconds}`).toBe(0);
    }
    expect(golfBallAt(0)).toEqual([...GOLF_TEE]);
  });

  it("is hit at the bottom of the swing and flies up, off to the left and away, high and far", () => {
    const along = [0.1, 0.3, 0.5, 0.7, 0.9].map(golfBallAt);
    for (let i = 1; i < along.length; i++) {
      expect(along[i][1]).toBeLessThan(along[i - 1][1]); // further to the pilot's left all the time
      expect(along[i][0]).toBeLessThan(along[i - 1][0]); // and further away
    }
    expect(Math.max(...along.map((point) => point[2]))).toBeGreaterThan(10); // high in the air
    expect(golf(m.impact + 0.5).flight).toBeGreaterThan(0);
  });

  it("is in the air long enough to be watched, and gone before the next ball", () => {
    expect(GOLF_FLIGHT_SECONDS).toBeGreaterThanOrEqual(1);
    expect(m.impact + GOLF_FLIGHT_SECONDS).toBeLessThan(GOLF_SECONDS);
    expect(golf(GOLF_SECONDS - 0.02).ball).toBe(0);
  });

  it("is shown on the page where the pose says, and not at all once it is gone", () => {
    const flying = pilotParts(look, HAIR, golf(m.impact + 0.4));
    expect(partNamed(flying, "golf ball")).toBeDefined();
    const gone = pilotParts(look, HAIR, golf(GOLF_SECONDS - 0.02));
    expect(partNamed(gone, "golf ball")).toBeUndefined();
  });

  it("never goes below the ground, and never falls back down within sight", () => {
    for (let f = 0; f <= 1; f += 0.02) {
      expect(golfBallAt(f)[2]).toBeGreaterThan(0.5);
    }
  });

  it("does not break on a strange flight: below 0 is on the ground, above 1 is as far as it goes", () => {
    expect(golfBallAt(-3)).toEqual(golfBallAt(0));
    expect(golfBallAt(7)).toEqual(golfBallAt(1));
  });
});

describe("the golf club", () => {
  it("goes on from the hand, as if the arm went on, no longer than a club", () => {
    const [shaft] = golfClub([0, 3, 17], [4, 0.5, 8]);
    for (const point of cornersOf(shaft)) {
      expect(distance(point, [4, 0.5, 8])).toBeLessThan(CLUB_LENGTH + 1);
    }
  });

  it("stops above the ground when the hands are low, so it never goes into it", () => {
    const parts = golfClub([0, 3, 17], [4, 0.5, 3]);
    expect(lowest(partNamed(parts, "golf club head"))).toBeGreaterThan(0);
  });

  it("does not break on strange input: a hand on the shoulder", () => {
    const parts = golfClub([0, 3, 17], [0, 3, 17]);
    expect(parts).toHaveLength(2);
    for (const point of parts.flatMap(cornersOf)) {
      expect(point.every(Number.isFinite)).toBe(true);
    }
  });

  it("is only in the hands of a pilot who plays golf: no other dance has a club or a ball", () => {
    for (const move of DANCES.filter((one) => one !== "golf")) {
      const parts = pilotParts(look, HAIR, poseAt(move, 1.7));
      expect(partNamed(parts, "golf club shaft"), move).toBeUndefined();
      expect(partNamed(parts, "golf ball"), move).toBeUndefined();
    }
  });

  it("is mixed in and out smoothly with other poses, and a pose made before the golf existed still works", () => {
    const old = { ...poseAt("stand", 0) };
    delete old.club;
    delete old.ball;
    delete old.flight;
    const half = blendPoses(old, golf(m.top), 0.5);
    expect(half.club).toBe(0.5);
    expect(() => pilotParts(look, HAIR, old)).not.toThrow();
  });
});
