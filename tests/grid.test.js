// Tests for the start of a race: the starting grid (shared/grid.js) and the
// rule that karts start BEHIND the finish line (shared/laps.js,
// shared/track.js, shared/race.js and server/room.js).
//
// The rule, in one sentence: the grid is behind the finish line, crossing
// the line for the first time starts lap 1 and does not count as a lap, and
// the race clock starts at GO.
//
// Like laps.test.js, the lap tests here do not drive. They place a kart
// directly inside a checkpoint ("teleporting"), which is the easiest way to
// try every order, including the orders that must not count.

import { describe, it, expect } from "vitest";
import { gridSpot, GRID_PLACES, GRID_GAP_SIDEWAYS, GRID_GAP_BEHIND } from "../shared/grid.js";
import {
  createProgress,
  createProgressBehindLine,
  progressAtStart,
  updateProgress,
  nextCheckpoint,
  currentLap,
} from "../shared/laps.js";
import { createTrack, tileKindAt, isInsideCheckpoint, bounceOffWalls } from "../shared/track.js";
import { createRacer, stepRacer, KART_RADIUS } from "../shared/race.js";
import { createKart, speedOf } from "../shared/physics.js";
import { COUNTDOWN_STEPS } from "../shared/countdown.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { CAMPUS_LOOP } from "../shared/tracks/campus-loop.js";
import { createRoom, MAX_PLAYERS } from "../server/room.js";
import { smallTrackDescription } from "./small-track.js";
import { createSprintTrack } from "./sprint-track.js";

const GAS = { gas: true, brake: false, left: false, right: false };
const BRAKE = { gas: false, brake: true, left: false, right: false };

const REAL_TRACKS = [TEST_OVAL, CAMPUS_LOOP];
const ALL_PLACES = [0, 1, 2, 3, 4, 5, 6, 7];

// ---- The grid ----

describe("the places on the starting grid", () => {
  it("has eight places, one for each player a room can hold", () => {
    expect(GRID_PLACES).toBe(8);
    expect(MAX_PLAYERS).toBe(GRID_PLACES);
  });

  it("puts places 0 and 1 in the front row, left and right of the track's start", () => {
    // The test oval points right, so "left of the driver" is up the screen: a smaller y.
    const { x, y, angle } = TEST_OVAL.start;
    expect(gridSpot(TEST_OVAL, 0)).toEqual({ x, y: y - GRID_GAP_SIDEWAYS, angle });
    expect(gridSpot(TEST_OVAL, 1)).toEqual({ x, y: y + GRID_GAP_SIDEWAYS, angle });
  });

  it("puts each next row further back, in the same two columns", () => {
    const { x, y } = TEST_OVAL.start;
    for (const place of ALL_PLACES) {
      const row = Math.floor(place / 2);
      const spot = gridSpot(TEST_OVAL, place);
      expect(spot.x).toBe(x - row * GRID_GAP_BEHIND);
      expect(spot.y).toBe(place % 2 === 0 ? y - GRID_GAP_SIDEWAYS : y + GRID_GAP_SIDEWAYS);
    }
  });

  it("points every kart the way the track's start points", () => {
    for (const track of REAL_TRACKS) {
      for (const place of ALL_PLACES) {
        expect(gridSpot(track, place).angle).toBe(track.start.angle);
      }
    }
  });

  it("turns with the start: on a track that points down the screen, the rows go up and the left column is on the right", () => {
    const pointingDown = { start: { x: 500, y: 500, angle: Math.PI / 2 } };
    const pole = gridSpot(pointingDown, 0);
    expect(pole.x).toBeCloseTo(500 + GRID_GAP_SIDEWAYS);
    expect(pole.y).toBeCloseTo(500);
    const behindPole = gridSpot(pointingDown, 2);
    expect(behindPole.x).toBeCloseTo(500 + GRID_GAP_SIDEWAYS);
    expect(behindPole.y).toBeCloseTo(500 - GRID_GAP_BEHIND);
  });

  it("leaves enough room between places for karts not to touch", () => {
    for (const first of ALL_PLACES) {
      for (const second of ALL_PLACES) {
        if (first === second) {
          continue;
        }
        const a = gridSpot(TEST_OVAL, first);
        const b = gridSpot(TEST_OVAL, second);
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(2 * KART_RADIUS);
      }
    }
  });

  it("gives the same answer every time, and does not change the track", () => {
    const before = JSON.stringify(TEST_OVAL.start);
    expect(gridSpot(TEST_OVAL, 5)).toEqual(gridSpot(TEST_OVAL, 5));
    expect(JSON.stringify(TEST_OVAL.start)).toBe(before);
  });

  it("refuses a place that is not a whole number from 0 up", () => {
    for (const place of [-1, 1.5, NaN, Infinity, "2", null, undefined]) {
      expect(() => gridSpot(TEST_OVAL, place), String(place)).toThrow(RangeError);
    }
  });
});

describe("the grid of each real track", () => {
  for (const track of REAL_TRACKS) {
    const line = track.checkpoints[0];

    it(`${track.name}: all eight places are on the road, inside the map`, () => {
      for (const place of ALL_PLACES) {
        const { x, y } = gridSpot(track, place);
        expect(tileKindAt(track, x, y), `place ${place}`).toBe("road");
      }
    });

    it(`${track.name}: no place is inside a wall or touching one`, () => {
      for (const place of ALL_PLACES) {
        const { x, y, angle } = gridSpot(track, place);
        const kart = createKart(x, y, angle);
        // The wall rule gives back the very same kart when it touches no wall.
        expect(bounceOffWalls(track, kart, KART_RADIUS), `place ${place}`).toBe(kart);
      }
    });

    it(`${track.name}: every place is behind the finish line, with the whole kart clear of it`, () => {
      expect(track.startsBehindLine).toBe(true);
      // Both real tracks start pointing right, so "behind the line" is to its left.
      expect(track.start.angle).toBe(0);
      for (const place of ALL_PLACES) {
        const { x, y } = gridSpot(track, place);
        expect(x + KART_RADIUS, `place ${place}`).toBeLessThan(line.left);
        // And level with the line, so that driving straight on crosses it.
        expect(y).toBeGreaterThanOrEqual(line.top);
        expect(y).toBeLessThan(line.bottom);
      }
    });

    it(`${track.name}: no place is inside any checkpoint`, () => {
      for (const place of ALL_PLACES) {
        const { x, y } = gridSpot(track, place);
        for (let number = 0; number < track.checkpoints.length; number++) {
          expect(isInsideCheckpoint(track, number, x, y), `place ${place}, checkpoint ${number}`).toBe(false);
        }
      }
    });

    it(`${track.name}: the front row is just behind the line, less than one square away`, () => {
      expect(line.left - gridSpot(track, 0).x).toBeLessThan(track.tileSize);
      expect(line.left - gridSpot(track, 1).x).toBeLessThan(track.tileSize);
    });

    it(`${track.name}: the road is clear from every place to the line`, () => {
      for (const place of ALL_PLACES) {
        const { x, y } = gridSpot(track, place);
        for (let ahead = x; ahead < line.right; ahead += 4) {
          expect(tileKindAt(track, ahead, y), `place ${place}`).toBe("road");
        }
      }
    });
  }
});

// ---- How a track says where its karts start ----

/** The small test track with the start moved to just behind its finish line (column 3, row 1). */
function smallTrackBehindLine(startChanges = {}) {
  return {
    ...smallTrackDescription(),
    start: { column: 2, row: 1, angle: 0, behindLine: true, ...startChanges },
  };
}

describe("a track that says its start is behind the finish line", () => {
  it("is what both real tracks say", () => {
    expect(TEST_OVAL.startsBehindLine).toBe(true);
    expect(CAMPUS_LOOP.startsBehindLine).toBe(true);
  });

  it("is not what a track says by default: the older rule still works for the small test tracks", () => {
    expect(createTrack(smallTrackDescription()).startsBehindLine).toBe(false);
    expect(createSprintTrack().startsBehindLine).toBe(false);
    const saysNo = { ...smallTrackDescription(), start: { column: 4, row: 1, angle: 0, behindLine: false } };
    expect(createTrack(saysNo).startsBehindLine).toBe(false);
  });

  it("is accepted when the finish line is just ahead of the start", () => {
    const track = createTrack(smallTrackBehindLine());
    expect(track.startsBehindLine).toBe(true);
    expect(track.start).toEqual({ x: 25, y: 15, angle: 0 });
  });

  it("is refused when the answer is not a plain true or false", () => {
    for (const behindLine of ["yes", "true", 1, 0, null, {}]) {
      expect(() => createTrack(smallTrackBehindLine({ behindLine })), String(behindLine)).toThrow(/behindLine/);
    }
  });

  it("is refused when the start is ON the finish line", () => {
    expect(() => createTrack(smallTrackBehindLine({ column: 3 }))).toThrow(/behind the finish line/);
  });

  it("is refused when the start is AFTER the finish line", () => {
    expect(() => createTrack(smallTrackBehindLine({ column: 4 }))).toThrow(/behind the finish line/);
  });

  it("is refused when the karts point away from the line", () => {
    expect(() => createTrack(smallTrackBehindLine({ angle: Math.PI }))).toThrow(/behind the finish line/);
  });

  it("is refused when a wall stands between the start and the line", () => {
    // The start is on the bottom road, pointing up at the finish line two
    // squares above it. But the wall square in the middle of the track is in
    // between.
    const description = smallTrackBehindLine({ column: 3, row: 3, angle: -Math.PI / 2 });
    expect(() => createTrack(description)).toThrow(/behind the finish line/);
  });

  it("is refused when the line is more than three squares ahead", () => {
    const longRoad = {
      name: "Long road",
      tileSize: 10,
      laps: 1,
      map: ["##########", "#........#", "##########"],
      start: { column: 1, row: 1, angle: 0, behindLine: true },
      checkpoints: [
        { name: "finish line", column: 5, row: 1, columns: 1, rows: 1 },
        { name: "a", column: 7, row: 1, columns: 1, rows: 1 },
        { name: "b", column: 8, row: 1, columns: 1, rows: 1 },
      ],
    };
    expect(() => createTrack(longRoad)).toThrow(/behind the finish line/);
    // Three squares ahead is still fine.
    expect(createTrack({ ...longRoad, start: { ...longRoad.start, column: 2 } }).startsBehindLine).toBe(true);
  });
});

// ---- Counting laps from behind the line ----

describe("the progress of a kart that starts behind the finish line", () => {
  const track = createTrack(smallTrackBehindLine()); // 2 laps; finish line + checkpoints 1, 2, 3

  /** A kart in the middle of a checkpoint. */
  function kartInCheckpoint(number) {
    const checkpoint = track.checkpoints[number];
    return createKart((checkpoint.left + checkpoint.right) / 2, (checkpoint.top + checkpoint.bottom) / 2);
  }

  /** A kart on the grid: on the road, behind the line, in no checkpoint. */
  const kartOnGrid = createKart(track.start.x, track.start.y);

  /** Moves a kart through a list of places, one step each. A number is a checkpoint, "grid" is the start. */
  function visit(progress, ...places) {
    for (const place of places) {
      const kart = place === "grid" ? kartOnGrid : kartInCheckpoint(place);
      progress = updateProgress(progress, kart, track);
    }
    return progress;
  }

  const FINISH = 0;
  const ONE_LAP = [1, 2, 3, FINISH];
  const ONE_LAP_BACKWARDS = [3, 2, 1, FINISH];

  it("is the usual fresh progress, except that it is one checkpoint short of the line", () => {
    expect(createProgressBehindLine()).toEqual({ ...createProgress(), passed: -1 });
    expect(createProgressBehindLine()).toEqual({ passed: -1, lapsDone: 0, steps: 0, lapSteps: [], finished: false });
  });

  it("leaves createProgress() as it always was, for tracks that start after the line", () => {
    expect(createProgress()).toEqual({ passed: 0, lapsDone: 0, steps: 0, lapSteps: [], finished: false });
  });

  it("is chosen for a track that says so, and not for one that does not", () => {
    expect(progressAtStart(track)).toEqual(createProgressBehindLine());
    expect(progressAtStart(TEST_OVAL)).toEqual(createProgressBehindLine());
    expect(progressAtStart(CAMPUS_LOOP)).toEqual(createProgressBehindLine());
    expect(progressAtStart(createTrack(smallTrackDescription()))).toEqual(createProgress());
    expect(progressAtStart(createSprintTrack())).toEqual(createProgress());
  });

  it("gives a fresh progress each time, so two karts never share one", () => {
    const first = progressAtStart(track);
    const second = progressAtStart(track);
    expect(first).not.toBe(second);
    expect(first.lapSteps).not.toBe(second.lapSteps);
  });

  it("aims for the finish line first, and is on lap 1", () => {
    const progress = createProgressBehindLine();
    expect(nextCheckpoint(progress, track)).toBe(FINISH);
    expect(currentLap(progress, track)).toBe(1);
  });

  it("starts lap 1 at the first crossing of the line: after it, the kart aims for checkpoint 1", () => {
    const progress = visit(createProgressBehindLine(), "grid", FINISH);
    expect(nextCheckpoint(progress, track)).toBe(1);
    expect(currentLap(progress, track)).toBe(1);
  });

  it("counts a lap at the second crossing, after every checkpoint in order", () => {
    const progress = visit(createProgressBehindLine(), FINISH, ...ONE_LAP);
    expect(progress.lapsDone).toBe(1);
    expect(currentLap(progress, track)).toBe(2);
  });

  it("finishes the race after the track's number of laps, which is one more crossing than laps", () => {
    const oneEarly = visit(createProgressBehindLine(), FINISH, ...ONE_LAP, 1, 2, 3);
    expect(oneEarly.lapsDone).toBe(1);
    expect(oneEarly.finished).toBe(false);
    const done = visit(oneEarly, FINISH);
    expect(done.lapsDone).toBe(2);
    expect(done.finished).toBe(true);
  });

  it("runs the clock from the first step, not from the line: lap 1 includes the run to the line", () => {
    const progress = visit(createProgressBehindLine(), "grid", "grid", FINISH, ...ONE_LAP);
    expect(progress.steps).toBe(7);
    expect(progress.lapSteps).toEqual([7]);
  });

  describe("what must NOT count", () => {
    it("does not count the first crossing of the line as a lap", () => {
      const progress = visit(createProgressBehindLine(), FINISH);
      expect(progress.lapsDone).toBe(0);
      expect(progress.lapSteps).toEqual([]);
      expect(progress.finished).toBe(false);
    });

    it("does not count staying on the line, however long", () => {
      const progress = visit(createProgressBehindLine(), FINISH, FINISH, FINISH, FINISH, FINISH);
      expect(progress.lapsDone).toBe(0);
      expect(nextCheckpoint(progress, track)).toBe(1);
    });

    it("does not count going back and forth over the line from the grid, however often", () => {
      let progress = createProgressBehindLine();
      for (let time = 0; time < 20; time++) {
        progress = visit(progress, FINISH, "grid");
        expect(progress.lapsDone).toBe(0);
      }
      expect(progress.finished).toBe(false);
    });

    it("does not count going back and forth between the last checkpoint and the line", () => {
      let progress = createProgressBehindLine();
      for (let time = 0; time < 20; time++) {
        progress = visit(progress, 3, FINISH);
        expect(progress.lapsDone).toBe(0);
      }
      expect(progress.finished).toBe(false);
    });

    it("does not count driving backwards from the grid, however many rounds", () => {
      let progress = createProgressBehindLine();
      for (let round = 0; round < 10; round++) {
        progress = visit(progress, ...ONE_LAP_BACKWARDS);
        expect(progress.lapsDone).toBe(0);
      }
      expect(progress.finished).toBe(false);
    });

    it("makes a kart that drove a round backwards make up for it before a lap counts", () => {
      // One round backwards from the grid, then one round forwards: back on the grid, no lap.
      const backThenForward = visit(createProgressBehindLine(), 3, 2, 1, FINISH, "grid", 1, 2, 3);
      expect(backThenForward.lapsDone).toBe(0);
      expect(nextCheckpoint(backThenForward, track)).toBe(FINISH);
      // Now the line and a whole round forwards: that is lap 1.
      expect(visit(backThenForward, FINISH, 1, 2, 3).lapsDone).toBe(0);
      expect(visit(backThenForward, FINISH, ...ONE_LAP).lapsDone).toBe(1);
    });

    it("does not count a lap that skipped a checkpoint", () => {
      expect(visit(createProgressBehindLine(), FINISH, 1, 3, FINISH).lapsDone).toBe(0);
      expect(visit(createProgressBehindLine(), FINISH, 2, 3, FINISH).lapsDone).toBe(0);
    });

    it("does not count a round by a kart that never crossed the line at the start", () => {
      // As if the kart had got round the line: checkpoints 1, 2, 3 and then the line.
      const progress = visit(createProgressBehindLine(), ...ONE_LAP);
      expect(progress.lapsDone).toBe(0);
    });

    it("does not count the same lap twice when the kart reverses over the line and comes back", () => {
      const oneLap = visit(createProgressBehindLine(), FINISH, ...ONE_LAP);
      const backAndForth = visit(oneLap, 3, FINISH, 3, FINISH, "grid", FINISH);
      expect(backAndForth.lapsDone).toBe(1);
      expect(backAndForth.lapSteps).toHaveLength(1);
      expect(backAndForth.finished).toBe(false);
    });

    it("does not count extra laps after the race is finished", () => {
      const finished = visit(createProgressBehindLine(), FINISH, ...ONE_LAP, ...ONE_LAP);
      expect(finished.finished).toBe(true);
      const later = visit(finished, ...ONE_LAP);
      expect(later.lapsDone).toBe(2);
      expect(later.steps).toBe(finished.steps);
    });
  });
});

// ---- A racer at the start ----

describe("a racer waiting at the start", () => {
  it("stands on pole when no place is given", () => {
    for (const track of REAL_TRACKS) {
      const racer = createRacer(track);
      const pole = gridSpot(track, 0);
      expect(racer.kart).toEqual(createKart(pole.x, pole.y, pole.angle));
    }
  });

  it("stands on the place it is given, standing still", () => {
    for (const place of ALL_PLACES) {
      const racer = createRacer(TEST_OVAL, place);
      const spot = gridSpot(TEST_OVAL, place);
      expect(racer.kart).toEqual(createKart(spot.x, spot.y, spot.angle));
      expect(speedOf(racer.kart)).toBe(0);
    }
  });

  it("is one checkpoint short of the line on a track that starts behind it", () => {
    expect(createRacer(TEST_OVAL).progress).toEqual(createProgressBehindLine());
    expect(createRacer(CAMPUS_LOOP, 7).progress).toEqual(createProgressBehindLine());
  });

  it("has the older progress on a track that starts after the line", () => {
    expect(createRacer(createSprintTrack()).progress).toEqual(createProgress());
    expect(createRacer(createSprintTrack(), 3).progress).toEqual(createProgress());
  });

  it("refuses a place that is not a whole number from 0 up", () => {
    expect(() => createRacer(TEST_OVAL, -1)).toThrow(RangeError);
    expect(() => createRacer(TEST_OVAL, 0.5)).toThrow(RangeError);
  });
});

// ---- Driving from the grid on the test oval ----

/** Holds the same keys for a number of steps. "everyStep" is called after each step. */
function hold(racer, keys, steps, everyStep = () => {}) {
  for (let step = 0; step < steps; step++) {
    racer = stepRacer(TEST_OVAL, racer, keys, TEST_DRIVER);
    everyStep(racer);
  }
  return racer;
}

const onTheLine = (racer) => isInsideCheckpoint(TEST_OVAL, 0, racer.kart.x, racer.kart.y);

describe("driving off the grid on the test oval", () => {
  const line = TEST_OVAL.checkpoints[0];

  it("crosses the line within a second from every place, and that crossing is not a lap", () => {
    for (const place of ALL_PLACES) {
      let crossedAtStep = null;
      const racer = hold(createRacer(TEST_OVAL, place), GAS, 120, (now) => {
        if (crossedAtStep === null && onTheLine(now)) {
          crossedAtStep = now.progress.steps;
        }
      });
      expect(crossedAtStep, `place ${place}`).not.toBe(null);
      expect(crossedAtStep).toBeLessThanOrEqual(60);
      expect(racer.kart.x).toBeGreaterThan(line.right); // well past the line by now
      expect(racer.progress.lapsDone).toBe(0);
      expect(racer.progress.lapSteps).toEqual([]);
      expect(nextCheckpoint(racer.progress, TEST_OVAL)).toBe(1);
    }
  });

  it("runs the race clock from the very first step, before the line is reached", () => {
    const racer = hold(createRacer(TEST_OVAL), GAS, 3);
    expect(onTheLine(racer)).toBe(false);
    expect(racer.kart.x).toBeLessThan(line.left);
    expect(racer.progress.steps).toBe(3);
  });

  it("never counts a lap for crossing the line, reversing back over it and crossing again, however often", () => {
    /** Holds keys until the kart's middle has passed an x position, for at most ten seconds. */
    function holdUntil(racer, keys, hasPassed) {
      for (let step = 0; step < 600 && !hasPassed(racer.kart.x); step++) {
        racer = stepRacer(TEST_OVAL, racer, keys, TEST_DRIVER);
      }
      return racer;
    }

    let racer = createRacer(TEST_OVAL);
    for (let time = 0; time < 4; time++) {
      racer = holdUntil(racer, GAS, (x) => x > line.right + 40); //  forwards over the line
      expect(racer.kart.x).toBeGreaterThan(line.right);
      racer = holdUntil(racer, BRAKE, (x) => x < line.left - 40); // stop, and reverse back over it
      expect(racer.kart.x).toBeLessThan(line.left);
      expect(racer.progress.lapsDone).toBe(0);
    }
    expect(racer.progress.finished).toBe(false);
    expect(racer.progress.lapSteps).toEqual([]);
  });

  it("never counts a lap for reversing away from the grid and coming back over the line", () => {
    let racer = hold(createRacer(TEST_OVAL), BRAKE, 240); // backwards, away from the line
    expect(racer.kart.x).toBeLessThan(gridSpot(TEST_OVAL, 6).x);
    racer = hold(racer, GAS, 240); //                         and forwards over it
    expect(racer.kart.x).toBeGreaterThan(line.right);
    expect(racer.progress.lapsDone).toBe(0);
  });
});

// ---- The room uses the same grid ----

describe("the starting places in a room", () => {
  const kartOf = (room, id) => room.snapshot().karts.find((kart) => kart.id === id);

  function run(room, steps) {
    for (let step = 0; step < steps; step++) {
      room.step();
    }
  }

  it("puts every player on the grid place with their number, behind the line", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER);
    for (let player = 0; player < MAX_PLAYERS; player++) {
      const { id, place } = room.addPlayer();
      const spot = gridSpot(TEST_OVAL, place);
      const kart = kartOf(room, id);
      expect(kart.x).toBeCloseTo(spot.x, 1);
      expect(kart.y).toBeCloseTo(spot.y, 1);
      expect(kart.angle).toBeCloseTo(spot.angle, 3);
      expect(kart.x + KART_RADIUS).toBeLessThan(TEST_OVAL.checkpoints[0].left);
    }
  });

  it("puts every kart back behind the line when a race starts", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER);
    const host = room.addPlayer();
    const other = room.addPlayer();
    room.setKeys(host.id, GAS);
    room.setKeys(other.id, GAS);
    run(room, 120); // both drive off, over the line
    expect(kartOf(room, host.id).x).toBeGreaterThan(TEST_OVAL.checkpoints[0].right);

    room.startRace(host.id);
    for (const { id, place } of [host, other]) {
      expect(kartOf(room, id).x).toBeCloseTo(gridSpot(TEST_OVAL, place).x, 1);
      expect(kartOf(room, id).y).toBeCloseTo(gridSpot(TEST_OVAL, place).y, 1);
    }
  });

  it("does not count a lap when a racer crosses the line after GO", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER);
    const host = room.addPlayer();
    room.startRace(host.id);
    room.setKeys(host.id, GAS);
    run(room, COUNTDOWN_STEPS + 120);

    const kart = kartOf(room, host.id);
    expect(kart.x).toBeGreaterThan(TEST_OVAL.checkpoints[0].right);
    expect(kart.lapsDone).toBe(0);
    expect(kart.lapSteps).toEqual([]);
    expect(kart.steps).toBe(120); // the clock started at GO, not at the line
    expect(room.takeFinishes()).toEqual([]);
  });

  it("does not count a lap for a kart that crosses the line, restarts, and crosses again while the room is open", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER);
    const player = room.addPlayer();
    room.setKeys(player.id, GAS);
    for (let time = 0; time < 5; time++) {
      run(room, 90);
      expect(kartOf(room, player.id).x).toBeGreaterThan(TEST_OVAL.checkpoints[0].right);
      expect(room.restart(player.id)).toBe(true);
      expect(kartOf(room, player.id).lapsDone).toBe(0);
    }
  });

  it("still starts karts after the line on a track with the older rule, and finishes at the first crossing of its line", () => {
    const sprint = createSprintTrack();
    const room = createRoom(sprint, TEST_DRIVER);
    const { id, place } = room.addPlayer();
    expect(kartOf(room, id).x).toBeCloseTo(gridSpot(sprint, place).x, 1);
    room.startRace(id);
    room.setKeys(id, GAS);
    run(room, COUNTDOWN_STEPS + 60 * 5);
    expect(kartOf(room, id).finished).toBe(true);
    expect(kartOf(room, id).lapsDone).toBe(1);
  });
});
