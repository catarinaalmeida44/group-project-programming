// Tests for the driver who came last and cries beside the podium
// (Catarina's idea, built on 19 November 2026):
//   client/podium.js        who it is: podiumLoser()
//   client/pilot-shape.js   the pose: cryingPose()
//   client/podium-shape.js  the figure with its tears, and where it stands
//
// Her rule: with four or more karts, only the one who came last cries, down
// with the crowd. With three or fewer, nobody cries. "Last" is the last
// line of the results, finished or not. It is the same in a single race
// against the computer karts and online.
//
// The older tests of the podium are in podium.test.js. No browser is needed.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { podiumLoser, podiumLineup, CRY_FROM_KARTS } from "../client/podium.js";
import { cryingPose, poseAt, DANCES, MOVES, PODIUM_MOVES, HEAD_HEIGHT } from "../client/pilot-shape.js";
import {
  cryingDriver,
  tearParts,
  podiumGroups,
  podiumMoving,
  crowdSpots,
  LOSER_SPOT,
  TEARS_EACH_EYE,
  PODIUM_STEPS,
  STEP_WIDTH,
  STEP_DEPTH,
} from "../client/podium-shape.js";
import { MAX_PLAYERS } from "../server/room.js";
import { CAST } from "../shared/cast.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { TRACKS } from "../shared/tracks/index.js";
import { lookOfTrack } from "../client/track-looks.js";

const read = (name) => readFileSync(new URL(`../client/${name}`, import.meta.url), "utf8");

/** A kart that finished in this many steps. */
const finished = (id, character, steps) => ({ id, character, finished: true, steps, passed: 12, x: 300, y: 300 });
/** A kart that never finished, having passed this many checkpoints. */
const stillDriving = (id, character, passed) => ({ id, character, finished: false, steps: 9000, passed, x: 300, y: 300 });

const SIX = [
  finished(1, "pcp", 3600),
  finished(2, "cici", 3700),
  finished(3, "franfon", 3800),
  finished(4, "ro", 3900),
  finished(5, "ricardo", 4000),
  finished(6, "dean", 4100),
];

describe("who cries", () => {
  it("nobody, with three karts or fewer: everyone is on the podium", () => {
    expect(CRY_FROM_KARTS).toBe(4);
    for (let karts = 0; karts <= 3; karts++) {
      expect(podiumLoser(SIX.slice(0, karts), TEST_OVAL), `${karts} karts`).toBe(null);
    }
  });

  it("with four karts, the fourth", () => {
    expect(podiumLoser(SIX.slice(0, 4), TEST_OVAL)).toMatchObject({ id: 4, name: "Ró Versos", place: 4, finished: true });
  });

  it("with five or six, only the very last: the ones in the middle neither stand on the podium nor cry", () => {
    expect(podiumLoser(SIX.slice(0, 5), TEST_OVAL)).toMatchObject({ id: 5, place: 5 });
    expect(podiumLoser(SIX, TEST_OVAL)).toMatchObject({ id: 6, name: "Dean", place: 6 });
  });

  it("goes by the order of arrival, not by the order of the list", () => {
    const shuffled = [SIX[5], SIX[2], SIX[0], SIX[4], SIX[1], SIX[3]];
    expect(podiumLoser(shuffled, TEST_OVAL).id).toBe(6);
  });

  it("is a kart that never finished, when there is one: it is the last line of the results", () => {
    const karts = [...SIX.slice(0, 4), stillDriving(5, "ricardo", 7)];
    expect(podiumLoser(karts, TEST_OVAL)).toMatchObject({ id: 5, finished: false, place: 5 });
  });

  it("is the kart furthest from the finish, of several that never finished", () => {
    const karts = [finished(1, "pcp", 3600), stillDriving(2, "cici", 9), stillDriving(3, "ro", 2), stillDriving(4, "dean", 6)];
    expect(podiumLoser(karts, TEST_OVAL).id).toBe(3);
  });

  it("is never someone who stands on the podium", () => {
    for (let karts = CRY_FROM_KARTS; karts <= SIX.length; karts++) {
      const racing = SIX.slice(0, karts);
      const onThePodium = podiumLineup(racing, TEST_OVAL).map((driver) => driver.id);
      expect(onThePodium, `${karts} karts`).not.toContain(podiumLoser(racing, TEST_OVAL).id);
    }
  });

  it("comes with what is needed to paint them: colours, hair and their own head, and no dance", () => {
    const loser = podiumLoser(SIX, TEST_OVAL);
    expect(loser.character).toBe("dean");
    expect(typeof loser.look.suit).toBe("string");
    expect(typeof loser.head).toBe("string"); // the address of the head picture
    expect(loser).not.toHaveProperty("dance");
  });

  it("can be a kart that is no character: it cries with its helmet on", () => {
    const karts = [...SIX.slice(0, 3), { id: 9, finished: true, steps: 5000, passed: 12, x: 0, y: 0, place: 3 }];
    const loser = podiumLoser(karts, TEST_OVAL);
    expect(loser).toMatchObject({ id: 9, character: null, name: "Kart 9", head: null });
  });

  it("does not break on a strange list", () => {
    for (const strange of [null, undefined, "karts", 42, {}, [null, null, null, null], [1, 2, 3, 4]]) {
      expect(() => podiumLoser(strange, TEST_OVAL), JSON.stringify(strange)).not.toThrow();
      expect(podiumLoser(strange, TEST_OVAL), JSON.stringify(strange)).toBe(null);
    }
  });

  it("can happen in a full online room: a room takes one player for each character", () => {
    expect(MAX_PLAYERS).toBe(CAST.length);
    expect(MAX_PLAYERS).toBeGreaterThanOrEqual(CRY_FROM_KARTS);
  });
});

describe("the pose of crying", () => {
  const moments = Array.from({ length: 120 }, (_, i) => i * 0.05); // six seconds, twenty looks a second

  it("is not a dance: nobody can choose it, and asking for it by name gives standing", () => {
    for (const list of [DANCES, MOVES, PODIUM_MOVES]) {
      expect(list).not.toContain("cry");
      expect(list).not.toContain("crying");
    }
    expect(poseAt("cry", 1)).toEqual(poseAt("stand", 1));
  });

  it("has both fists at the eyes, in front of the face", () => {
    for (const seconds of moments) {
      const pose = cryingPose(seconds);
      for (const hand of [pose.leftHand, pose.rightHand]) {
        expect(hand[0]).toBeGreaterThan(1.5); //    in front of the body
        expect(Math.abs(hand[1])).toBeLessThan(3); // close to the middle of the face
        expect(hand[2]).toBeGreaterThan(20.5); //   at the height of the eyes
        expect(hand[2]).toBeLessThan(22.5);
      }
      expect(pose.leftHand[1]).toBeLessThan(0); //  each fist on its own side
      expect(pose.rightHand[1]).toBeGreaterThan(0);
    }
  });

  it("rubs the eyes: one fist goes up as the other goes down", () => {
    const heights = moments.map((seconds) => cryingPose(seconds)).map((pose) => pose.leftHand[2] - pose.rightHand[2]);
    expect(Math.max(...heights)).toBeGreaterThan(0.5);
    expect(Math.min(...heights)).toBeLessThan(-0.5);
  });

  it("shakes the shoulders, bends forwards, and stays on the ground", () => {
    const poses = moments.map((seconds) => cryingPose(seconds));
    const lifts = poses.map((pose) => pose.lift);
    expect(Math.max(...lifts) - Math.min(...lifts)).toBeGreaterThan(0.25); // the sobs
    for (const pose of poses) {
      expect(pose.pitch).toBeLessThan(0); // bent forwards
      expect(pose.jump).toBe(0);
      expect(pose.hop).toBe(0);
      expect(pose.spin).toBe(0);
      expect(pose.trophy).toBe(0); // and certainly no trophy
    }
  });

  it("is made of real numbers at any moment", () => {
    for (const seconds of [0, 0.001, 3.3, 1000, -2]) {
      const numbers = Object.values(cryingPose(seconds)).flat();
      expect(numbers.every((value) => Number.isFinite(value)), String(seconds)).toBe(true);
    }
  });
});

describe("the crying driver, as a figure", () => {
  const driver = { look: { body: "#e23d3d", suit: "#1c2f5a", helmet: "#f0c330", stripe: "#ffffff" }, hair: "#2b2019", longHair: null, picture: { fake: "picture" } };
  const pointsOf = (part) => (part.ball ? [part.ball.middle] : part.head ? [part.head.middle] : part.faces.flatMap((face) => face.points));

  it("has their own head, with the picture", () => {
    const head = cryingDriver(driver, 1).find((part) => part.name === "head");
    expect(head.head.picture).toBe(driver.picture);
  });

  it("keeps a helmet on when there is no picture, so no empty head is shown", () => {
    const parts = cryingDriver({ ...driver, picture: null }, 1);
    expect(parts.find((part) => part.name === "head")).toBe(undefined);
    expect(parts.find((part) => part.name === "helmet on the head").ball.colour).toBe(driver.look.helmet);
  });

  it("has tears: the same number from each eye", () => {
    const tears = cryingDriver(driver, 1).filter((part) => part.name === "tear");
    expect(tears).toHaveLength(TEARS_EACH_EYE * 2);
    const face = cryingDriver(driver, 1).find((part) => part.name === "head").head.middle;
    expect(tears.filter((tear) => tear.ball.middle[1] < face[1])).toHaveLength(TEARS_EACH_EYE);
    expect(tears.filter((tear) => tear.ball.middle[1] > face[1])).toHaveLength(TEARS_EACH_EYE);
  });

  it("has tears that leave the eye, fly outwards, and end lower and smaller", () => {
    const face = [0.2, 0, 21.5];
    // Follow one tear of the right eye from the moment it leaves.
    const start = tearParts(face, 0).find((tear) => tear.ball.middle[1] > 0 && Math.abs(tear.ball.middle[1] - 2.6) < 0.9);
    expect(Math.abs(start.ball.middle[2] - face[2])).toBeLessThan(1.5); // about the height of the eyes
    let furthest = start;
    let lowest = start;
    for (let i = 0; i <= 200; i++) {
      for (const tear of tearParts(face, i / 100)) {
        if (Math.abs(tear.ball.middle[1]) > Math.abs(furthest.ball.middle[1])) {
          furthest = tear;
        }
        if (tear.ball.middle[2] < lowest.ball.middle[2]) {
          lowest = tear;
        }
        expect(tear.ball.radius).toBeGreaterThan(0);
        expect(tear.ball.middle[0]).toBeGreaterThan(face[0]); // in front of the face, so it is seen
      }
    }
    expect(Math.abs(furthest.ball.middle[1])).toBeGreaterThan(6); //  well out to the side
    expect(lowest.ball.middle[2]).toBeLessThan(face[2] - 4); //       and down towards the shoulders
    expect(lowest.ball.middle[2]).toBeGreaterThan(0); //              never under the floor
    expect(lowest.ball.radius).toBeLessThan(start.ball.radius);
  });

  it("stands on the floor, and is no taller than a driver", () => {
    for (const seconds of [0, 0.4, 1.3, 2.7]) {
      const heights = cryingDriver(driver, seconds).flatMap(pointsOf).map((point) => point[2]);
      expect(Math.min(...heights)).toBeGreaterThanOrEqual(0);
      expect(Math.min(...heights)).toBeLessThan(0.5); // the shoes are on the ground
      expect(Math.max(...heights)).toBeLessThan(17.6 + HEAD_HEIGHT + 3);
    }
  });
});

describe("where the crying driver stands", () => {
  const driver = { look: { body: "#e23d3d", suit: "#1c2f5a", helmet: "#f0c330", stripe: "#ffffff" }, hair: null, longHair: null, picture: null };
  const crowd = crowdSpots();

  it("beside the podium, not on it, behind it or in front of it", () => {
    const edge = Math.max(...PODIUM_STEPS.map((step) => Math.abs(step.y))) + STEP_WIDTH / 2;
    expect(Math.abs(LOSER_SPOT.y)).toBeGreaterThan(edge + 3); // clear of the last step, with room for the arms
    expect(LOSER_SPOT.x).toBeGreaterThan(-STEP_DEPTH / 2); //    not behind the podium, where the steps would hide them
    expect(LOSER_SPOT.x).toBeLessThan(20); //                    and not right under the camera
  });

  it("among the crowd, but not on top of any student", () => {
    const nearest = Math.min(...crowd.map((spot) => Math.hypot(spot.x - LOSER_SPOT.x, spot.y - LOSER_SPOT.y)));
    expect(nearest).toBeGreaterThan(3);
    expect(nearest).toBeLessThan(15);
  });

  it("is one more group on a track's podium, and none when nobody cries", () => {
    const without = podiumGroups([], 1, crowd);
    const withOne = podiumGroups([], 1, crowd, driver);
    expect(podiumGroups([], 1, crowd, null)).toHaveLength(without.length);
    expect(withOne).toHaveLength(without.length + 1);
    const group = withOne.at(-1);
    expect(group.at).toEqual([LOSER_SPOT.x, LOSER_SPOT.y]);
    expect(group.parts.some((part) => part.name === "tear")).toBe(true);
    expect(group.shadows).toHaveLength(1);
  });

  it("is in the hall of the other tracks too, at the same spot, with a shadow", () => {
    const without = podiumMoving([], 1, crowd);
    const withOne = podiumMoving([], 1, crowd, driver);
    expect(withOne.parts.length).toBeGreaterThan(without.parts.length);
    expect(withOne.shadows).toHaveLength(without.shadows.length + 1);
    const helmet = withOne.parts.find((part) => part.name === "helmet on the head");
    // The head rocks and the body bends forwards, so "at the spot" is within an arm's length.
    expect(Math.abs(helmet.ball.middle[1] - LOSER_SPOT.y)).toBeLessThan(2);
    expect(Math.abs(helmet.ball.middle[0] - LOSER_SPOT.x)).toBeLessThan(4);
  });
});

describe("on a track with a podium of its own (the Nova lap)", () => {
  // Where a spot of the podium is on the track, in squares of its map: the
  // same sum as paintOnTrack() in client/podium-view.js, where the podium
  // faces the camera.
  function onTheTrack(track, spot) {
    const { at, camera } = lookOfTrack(track).podium;
    const towardsCamera = Math.atan2(at[1] - camera[1], at[0] - camera[0]) + Math.PI;
    const cos = Math.cos(towardsCamera);
    const sin = Math.sin(towardsCamera);
    return {
      column: at[0] + (spot.x * cos - spot.y * sin) / track.tileSize,
      row: at[1] + (spot.x * sin + spot.y * cos) / track.tileSize,
    };
  }

  /** The things that stand within reach of a spot: walls and other blocks, fences, trees, benches. */
  function standingIn(track, spot) {
    const look = lookOfTrack(track);
    const here = onTheTrack(track, spot);
    const reach = 7 / track.tileSize; // the elbows stick out about 6 units to each side
    const found = [];
    for (const block of look.scenery.blocks) {
      if (!Array.isArray(block.rect)) {
        continue;
      }
      const [left, top, right, bottom] = block.rect;
      if (here.column > left - reach && here.column < right + reach && here.row > top - reach && here.row < bottom + reach) {
        found.push(block.name);
      }
    }
    for (const fence of look.scenery.fences) {
      const [fromColumn, fromRow] = fence.from;
      const [toColumn, toRow] = fence.to;
      const length = Math.hypot(toColumn - fromColumn, toRow - fromRow);
      const along = Math.max(0, Math.min(1, ((here.column - fromColumn) * (toColumn - fromColumn) + (here.row - fromRow) * (toRow - fromRow)) / length ** 2));
      const away = Math.hypot(here.column - (fromColumn + along * (toColumn - fromColumn)), here.row - (fromRow + along * (toRow - fromRow)));
      if (away < reach) {
        found.push(fence.name);
      }
    }
    for (const prop of look.props) {
      if (Math.hypot(prop.column - here.column, prop.row - here.row) < reach + 0.3) {
        found.push(prop.kind);
      }
    }
    return found;
  }

  const tracksWithAPodium = Object.values(TRACKS).filter((track) => lookOfTrack(track).podium);

  it("there is such a track", () => {
    expect(tracksWithAPodium.map((track) => track.name)).toContain("Nova lap");
  });

  it("the crying driver stands clear of every wall, fence, tree and bench, elbows included", () => {
    for (const track of tracksWithAPodium) {
      expect(standingIn(track, LOSER_SPOT), track.name).toEqual([]);
    }
  });

  it("which the first try did not: on the other side it stood inside the low wall along the avenue, and the wall was painted over the feet", () => {
    // Kept as a check that the test above can see such a mistake at all.
    const nova = tracksWithAPodium.find((track) => track.name === "Nova lap");
    expect(standingIn(nova, { x: 7, y: -27 })).toContain("avenue parapet");
  });

  it("stands on the camera's left, on the lawn, away from that wall", () => {
    expect(LOSER_SPOT.y).toBeGreaterThan(0);
  });
});

describe("both race pages show them", () => {
  it("the single race and the online race work out who came last and hand them to the podium", () => {
    for (const file of ["main.js", "online.js"]) {
      const code = read(file);
      expect(code, file).toMatch(/podiumLoser\(/);
      expect(code, file).toMatch(/podium\.paint\([^;]*loser\);/);
    }
  });
});
