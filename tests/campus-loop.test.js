// Tests for shared/tracks/campus-loop.js: the first campus track.
//
// The general rules (walls, laps, checkpoints) have their own tests. These
// tests check that this particular drawing is a fair track: you start on the
// road, every checkpoint closes the road from wall to wall, a robot can drive
// the whole race, skipping one of the two detours never counts a lap, and
// driving the wrong way round never counts a lap.

import { describe, it, expect } from "vitest";
import { createRacer, stepRacer } from "../shared/race.js";
import { speedOf } from "../shared/physics.js";
import { tileKindAt, isInsideCheckpoint } from "../shared/track.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { CAMPUS_LOOP } from "../shared/tracks/campus-loop.js";

const track = CAMPUS_LOOP;
const size = track.tileSize;

// ---- Helpers ----

/** The middle of a square, in units, from its column and row. */
const middleOf = ([column, row]) => ({ x: column * size + size / 2, y: row * size + size / 2 });

// Points along the middle of the road, in the order the loop is driven, as
// [column, row]. A half (32.5) means between two squares.
const DRIVING_LINE = [
  [40, 13], //   end of the Walk of Founders, east of the Hovione Atrium
  [40, 40], //   down the east side, past the Library
  [44, 42], //   round the east side of the gym
  [43, 47],
  [38, 50], //   EDP Plaza
  [39, 53], //   down the sea side of the Grand Auditorium
  [36, 57],
  [32, 59], //   round its southern tip
  [27, 57],
  [20, 54], //   north-west along the outer path
  [12, 50],
  [5, 42], //    up the western gardens
  [6, 38],
  [8, 32.5], //  into the courtyard between the CTT and Santander halls
  [23.5, 32.5],
  [23.5, 27], // round the far end of the CTT Student Hall
  [8, 27], //    out through the courtyard between the CTT and Cascais halls
  [6, 22],
  [9, 17],
  [11, 13], //   back onto the Walk of Founders
];

// The same loop without the detour round the Grand Auditorium: from EDP Plaza
// west along the north side of the Auditorium, then straight to the outer
// path, south of the KPMG Gallery.
// (The second point was [31, 49] until 12 November 2026. From the new start
// behind the finish line, the robot then drove into the corner of the wall
// square at column 34, row 49 and stayed there. One square further up, it
// goes round cleanly from every place on the grid.)
const WITHOUT_AUDITORIUM = [
  ...DRIVING_LINE.slice(0, 4),
  [36, 48],
  [31, 48],
  [27, 51],
  [14, 51],
  ...DRIVING_LINE.slice(11),
];

// The same loop without the hairpin round the CTT Student Hall: straight up
// the western gardens.
const WITHOUT_HAIRPIN = [...DRIVING_LINE.slice(0, 12), [6, 30], ...DRIVING_LINE.slice(17)];

const toUnits = (line) => line.map(middleOf);

// The robot driver: the same few lines as in race.test.js. It steers towards
// the next point and eases off the gas in sharp turns.
function robotKeys(kart, target) {
  const wantedAngle = Math.atan2(target.y - kart.y, target.x - kart.x);
  const turn = Math.atan2(Math.sin(wantedAngle - kart.angle), Math.cos(wantedAngle - kart.angle));
  return {
    gas: Math.abs(turn) < 1.2 || speedOf(kart) < 120,
    left: turn < -0.05,
    right: turn > 0.05,
  };
}

/** Lets the robot visit the points over and over, for up to a number of seconds or until it finishes. */
function robotDrive(racer, points, seconds, everyStep = () => {}) {
  let pointNumber = 0;
  for (let step = 0; step < seconds * 60 && !racer.progress.finished; step++) {
    const target = points[pointNumber];
    if (Math.hypot(target.x - racer.kart.x, target.y - racer.kart.y) < 110) {
      pointNumber = (pointNumber + 1) % points.length;
    }
    racer = stepRacer(track, racer, robotKeys(racer.kart, points[pointNumber]), TEST_DRIVER);
    everyStep(racer);
  }
  return racer;
}

/** The squares a checkpoint covers, as [column, row]. */
function squaresOf(checkpoint) {
  const squares = [];
  for (let row = checkpoint.top / size; row < checkpoint.bottom / size; row++) {
    for (let column = checkpoint.left / size; column < checkpoint.right / size; column++) {
      squares.push([column, row]);
    }
  }
  return squares;
}

// ---- The tests ----

describe("the campus loop", () => {
  it("is a track the game accepts, with a finish line, five more checkpoints and 3 laps", () => {
    expect(track.name).toBe("Campus loop");
    expect(track.laps).toBe(3);
    expect(track.checkpoints).toHaveLength(6);
  });

  it("is small enough for the browser to paint in one hidden picture", () => {
    // draw.js paints the whole track once, at 2 pixels per unit. 2048 units is
    // a picture of 4096 pixels, about 65 megabytes for a square track. Bigger
    // tracks would need a change in how the track is painted.
    expect(track.width).toBeLessThanOrEqual(2048);
    expect(track.height).toBeLessThanOrEqual(2048);
  });

  // Changed on 12 November 2026 with the start rule (team lead's request):
  // karts now start behind the finish line. Before, this test said the start
  // was just after the line.
  it("starts on the road, just behind the finish line, pointing along the road", () => {
    const { x, y, angle } = track.start;
    expect(tileKindAt(track, x, y)).toBe("road");
    expect(angle).toBe(0); // pointing right, the way the loop is driven
    for (let squaresAhead = 1; squaresAhead <= 3; squaresAhead++) {
      expect(tileKindAt(track, x + squaresAhead * size, y)).toBe("road");
    }
    // The finish line is just ahead of the start, not under it.
    expect(track.startsBehindLine).toBe(true);
    expect(isInsideCheckpoint(track, 0, x, y)).toBe(false);
    expect(x).toBeLessThanOrEqual(track.checkpoints[0].left);
    expect(track.checkpoints[0].left - x).toBeLessThan(4 * size);
  });

  it("closes the road with every checkpoint: both ends of each one touch a wall", () => {
    for (const checkpoint of track.checkpoints) {
      const squares = squaresOf(checkpoint);
      const [firstColumn, firstRow] = squares[0];
      const [lastColumn, lastRow] = squares[squares.length - 1];
      const across = firstColumn === lastColumn; // a line from top to bottom
      const beforeStart = across ? [firstColumn, firstRow - 1] : [firstColumn - 1, firstRow];
      const afterEnd = across ? [lastColumn, lastRow + 1] : [lastColumn + 1, lastRow];
      expect(track.map[beforeStart[1]][beforeStart[0]], checkpoint.name).toBe("#");
      expect(track.map[afterEnd[1]][afterEnd[0]], checkpoint.name).toBe("#");
    }
  });

  it("lets a robot drive the whole 3-lap race, without ever being inside a wall", () => {
    let wallMoments = 0;
    const racer = robotDrive(createRacer(track), toUnits(DRIVING_LINE), 300, (now) => {
      if (tileKindAt(track, now.kart.x, now.kart.y) === "wall") {
        wallMoments++;
      }
    });
    expect(racer.progress.finished).toBe(true);
    expect(racer.progress.lapsDone).toBe(3);
    expect(wallMoments).toBe(0);
  });

  it("never counts a lap for skipping the detour round the Grand Auditorium", () => {
    let passedTheGallery = false;
    const racer = robotDrive(createRacer(track), toUnits(WITHOUT_AUDITORIUM), 120, (now) => {
      if (isInsideCheckpoint(track, 3, now.kart.x, now.kart.y)) {
        passedTheGallery = true; // it really went round, on the short way
      }
    });
    expect(passedTheGallery).toBe(true);
    expect(racer.progress.lapsDone).toBe(0);
  });

  it("never counts a lap for skipping the hairpin round the CTT Student Hall", () => {
    let passedTheGardens = false;
    const racer = robotDrive(createRacer(track), toUnits(WITHOUT_HAIRPIN), 120, (now) => {
      if (isInsideCheckpoint(track, 4, now.kart.x, now.kart.y)) {
        passedTheGardens = true; // it really went round, on the short way
      }
    });
    expect(passedTheGardens).toBe(true);
    expect(racer.progress.lapsDone).toBe(0);
  });

  it("never counts a lap for driving the wrong way round", () => {
    const start = createRacer(track);
    const turnedRound = { ...start, kart: { ...start.kart, angle: Math.PI } };
    const wrongWay = toUnits([...DRIVING_LINE].reverse());
    // Note which checkpoints the robot drives through, to be sure it really went round.
    const visited = new Set();
    const racer = robotDrive(turnedRound, wrongWay, 120, (now) => {
      track.checkpoints.forEach((checkpoint, number) => {
        if (isInsideCheckpoint(track, number, now.kart.x, now.kart.y)) {
          visited.add(number);
        }
      });
    });
    expect(visited.size).toBe(6); // it drove through every checkpoint, backwards
    expect(racer.progress.lapsDone).toBe(0);
    expect(racer.progress.finished).toBe(false);
  });
});
