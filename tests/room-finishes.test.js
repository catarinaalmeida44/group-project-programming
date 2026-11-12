// Tests for the finishing order in server/room.js: who crossed the line,
// in which position, in how many steps. online.js saves results from this
// list, so it has to be right, and it must only ever list real finishes.
// No network is used here.

import { describe, it, expect } from "vitest";
import { createRoom } from "../server/room.js";
import { fastestLapSteps } from "../shared/laps.js";
import { COUNTDOWN_STEPS } from "../shared/countdown.js";
import { speedOf } from "../shared/physics.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { createSprintTrack } from "./sprint-track.js";

const GAS = { gas: true, brake: false, left: false, right: false };
const NO_KEYS = { gas: false, brake: false, left: false, right: false };

function run(room, steps) {
  for (let step = 0; step < steps; step++) {
    room.step();
  }
}

/** Runs the room until its phase is "finished", for at most a number of steps. Collects every finish handed out. */
function runToTheEnd(room, mostSteps = 60 * 30) {
  const finishes = [];
  for (let step = 0; step < mostSteps && room.phase() !== "finished"; step++) {
    room.step();
    finishes.push(...room.takeFinishes());
  }
  return finishes;
}

const kartOf = (room, id) => room.snapshot().karts.find((kart) => kart.id === id);

describe("the fastest lap of a race", () => {
  it("is the shortest stretch between two lap ends", () => {
    expect(fastestLapSteps([480, 1000, 1500])).toBe(480); // laps of 480, 520 and 500
    expect(fastestLapSteps([520, 1000, 1500])).toBe(480); // the second lap
    expect(fastestLapSteps([520, 1040, 1500])).toBe(460); // the last lap
    expect(fastestLapSteps([700])).toBe(700);
  });

  it("is nothing when no lap is complete", () => {
    expect(fastestLapSteps([])).toBe(null);
  });
});

describe("the finishing order of a race", () => {
  it("lists a racer when they cross the line, with their position and their time in steps", () => {
    const room = createRoom(createSprintTrack(), TEST_DRIVER);
    const { id } = room.addPlayer();
    room.startRace(id);
    room.setKeys(id, GAS);

    const finishes = runToTheEnd(room);

    expect(finishes).toHaveLength(1);
    const kart = kartOf(room, id);
    expect(kart.finished).toBe(true);
    expect(finishes[0]).toEqual({ id, position: 1, raceSteps: kart.steps, bestLapSteps: kart.steps });
    expect(finishes[0].raceSteps).toBeGreaterThan(10);
  });

  it("lists nothing before anyone has finished, and nothing during the countdown", () => {
    const room = createRoom(createSprintTrack(), TEST_DRIVER);
    const { id } = room.addPlayer();
    expect(room.takeFinishes()).toEqual([]);
    room.startRace(id);
    room.setKeys(id, GAS);
    run(room, COUNTDOWN_STEPS + 5);
    expect(room.takeFinishes()).toEqual([]);
  });

  it("hands out each finish only once", () => {
    const room = createRoom(createSprintTrack(), TEST_DRIVER);
    const { id } = room.addPlayer();
    room.startRace(id);
    room.setKeys(id, GAS);
    run(room, 60 * 10);

    expect(room.takeFinishes()).toHaveLength(1);
    expect(room.takeFinishes()).toEqual([]);
    run(room, 60);
    expect(room.takeFinishes()).toEqual([]); // a finished kart does not finish again
  });

  it("gives positions in the order the racers cross the line", () => {
    const room = createRoom(createSprintTrack(), TEST_DRIVER);
    const first = room.addPlayer().id;
    const second = room.addPlayer().id;
    room.startRace(first);
    room.setKeys(first, GAS);
    run(room, COUNTDOWN_STEPS + 30); // the second racer waits half a second
    room.setKeys(second, GAS);

    const finishes = runToTheEnd(room);

    expect(finishes.map((finish) => [finish.id, finish.position])).toEqual([
      [first, 1],
      [second, 2],
    ]);
    expect(finishes[1].raceSteps).toBeGreaterThan(finishes[0].raceSteps);
  });

  it("gives two racers who cross the line in the very same step the same position, and the next one the place after both", () => {
    const room = createRoom(createSprintTrack(), TEST_DRIVER);
    // Places 0 and 1 are side by side on the grid, so with the same keys they arrive together.
    const left = room.addPlayer().id;
    const right = room.addPlayer().id;
    const late = room.addPlayer().id;
    room.startRace(left);
    room.setKeys(left, GAS);
    room.setKeys(right, GAS);
    run(room, COUNTDOWN_STEPS + 60);
    room.setKeys(late, GAS);

    const finishes = runToTheEnd(room);

    expect(finishes.map((finish) => [finish.id, finish.position])).toEqual([
      [left, 1],
      [right, 1],
      [late, 3],
    ]);
    expect(finishes[0].raceSteps).toBe(finishes[1].raceSteps);
  });

  it("starts the positions again at 1 in the next race", () => {
    const room = createRoom(createSprintTrack(), TEST_DRIVER);
    const host = room.addPlayer().id;
    const other = room.addPlayer().id;
    room.startRace(host);
    room.setKeys(host, GAS);
    room.setKeys(other, GAS);
    runToTheEnd(room);

    room.startRace(host);
    room.setKeys(host, NO_KEYS);
    room.setKeys(other, GAS); // this time only the other one drives
    run(room, 60 * 10);

    expect(room.takeFinishes().map((finish) => [finish.id, finish.position])).toEqual([[other, 1]]);
  });

  it("does not list laps driven while the room is open: only a race that began with the countdown counts", () => {
    const room = createRoom(createSprintTrack(), TEST_DRIVER);
    const { id } = room.addPlayer();
    room.setKeys(id, GAS);
    run(room, 60 * 10);

    expect(kartOf(room, id).finished).toBe(true); // the kart did reach the line
    expect(room.takeFinishes()).toEqual([]); //      but that was not a race
  });

  it("does not list a racer who left before the line, and does not hold the others' positions back", () => {
    const room = createRoom(createSprintTrack(), TEST_DRIVER);
    const leaver = room.addPlayer().id;
    const stayer = room.addPlayer().id;
    room.startRace(leaver);
    room.setKeys(leaver, GAS);
    run(room, COUNTDOWN_STEPS + 10);
    room.removePlayer(leaver);
    room.setKeys(stayer, GAS);

    const finishes = runToTheEnd(room);

    expect(finishes.map((finish) => [finish.id, finish.position])).toEqual([[stayer, 1]]);
  });

  it("never lists someone who is only watching", () => {
    const room = createRoom(createSprintTrack(), TEST_DRIVER);
    const racer = room.addPlayer().id;
    room.startRace(racer);
    const watcher = room.addPlayer().id; // joined during the race
    room.setKeys(racer, GAS);
    room.setKeys(watcher, GAS);

    const finishes = runToTheEnd(room);

    expect(finishes.map((finish) => finish.id)).toEqual([racer]);
  });
});

describe("a whole three-lap race on the test oval, driven by a robot", () => {
  // The middle of the road at the four corners of the oval, in clockwise order.
  const CORNERS = [
    { x: 864, y: 96 },
    { x: 864, y: 480 },
    { x: 96, y: 480 },
    { x: 96, y: 96 },
  ];

  /** Which keys a robot presses to head for a target point. */
  function robotKeys(kart, target) {
    const wantedAngle = Math.atan2(target.y - kart.y, target.x - kart.x);
    const turn = Math.atan2(Math.sin(wantedAngle - kart.angle), Math.cos(wantedAngle - kart.angle));
    return { gas: Math.abs(turn) < 1.2 || speedOf(kart) < 120, brake: false, left: turn < -0.05, right: turn > 0.05 };
  }

  it("reports the race time and the fastest of the three laps", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER);
    const { id } = room.addPlayer();
    room.startRace(id);

    let corner = 0;
    const finishes = [];
    for (let step = 0; step < 60 * 120 && room.phase() !== "finished"; step++) {
      const kart = kartOf(room, id);
      if (Math.hypot(CORNERS[corner].x - kart.x, CORNERS[corner].y - kart.y) < 110) {
        corner = (corner + 1) % CORNERS.length;
      }
      room.setKeys(id, robotKeys(kart, CORNERS[corner]));
      room.step();
      finishes.push(...room.takeFinishes());
    }

    const kart = kartOf(room, id);
    expect(kart.finished).toBe(true);
    expect(kart.lapSteps).toHaveLength(3);
    const [one, two, three] = kart.lapSteps;
    expect(finishes).toEqual([
      { id, position: 1, raceSteps: three, bestLapSteps: Math.min(one, two - one, three - two) },
    ]);
    expect(finishes[0].bestLapSteps).toBeLessThan(finishes[0].raceSteps);
  });
});
