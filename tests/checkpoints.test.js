// Tests for client/checkpoints.js: which checkpoint is lit up next, where
// its light stands, and noticing a checkpoint that was left out.
//
// Why this exists: on the campus loop a kart can drive straight on past the
// CTT Student Hall and never touch checkpoint 5. The lap then does not
// count, and before 13 November 2026 nothing on the screen said why. These
// tests include that exact drive.

import { describe, it, expect } from "vitest";
import {
  nextCheckpointNumber,
  checkpointPieces,
  watchForMissedCheckpoint,
  missedCheckpointMessage,
} from "../client/checkpoints.js";
import { createProgressBehindLine, updateProgress } from "../shared/laps.js";
import { isInsideCheckpoint, tileKindAt } from "../shared/track.js";
import { CAMPUS_LOOP } from "../shared/tracks/campus-loop.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

const size = CAMPUS_LOOP.tileSize;
/** The middle of a square of the campus map, in units. */
const square = (column, row) => ({ x: (column + 0.5) * size, y: (row + 0.5) * size });

describe("which checkpoint comes next", () => {
  it("is the finish line for a kart waiting behind it, then the others in order, then the line again", () => {
    const count = CAMPUS_LOOP.checkpoints.length;
    expect(nextCheckpointNumber(-1, CAMPUS_LOOP)).toBe(0);
    expect(nextCheckpointNumber(0, CAMPUS_LOOP)).toBe(1);
    expect(nextCheckpointNumber(count - 2, CAMPUS_LOOP)).toBe(count - 1);
    expect(nextCheckpointNumber(count - 1, CAMPUS_LOOP)).toBe(0);
    expect(nextCheckpointNumber(count, CAMPUS_LOOP)).toBe(1); // second lap
  });

  it("still works for a kart that drove backwards first", () => {
    const count = CAMPUS_LOOP.checkpoints.length;
    expect(nextCheckpointNumber(-2, CAMPUS_LOOP)).toBe(count - 1);
    expect(nextCheckpointNumber(-count - 1, CAMPUS_LOOP)).toBe(0);
  });
});

describe("where the light of a checkpoint stands", () => {
  it("gives one piece for each square the checkpoint crosses, end to end, inside the checkpoint", () => {
    for (const track of [CAMPUS_LOOP, TEST_OVAL]) {
      track.checkpoints.forEach((checkpoint, number) => {
        const pieces = checkpointPieces(track, number);
        expect(pieces.length, `${track.name} ${number}`).toBeGreaterThan(0);
        for (const piece of pieces) {
          const middle = { x: (piece.from.x + piece.to.x) / 2, y: (piece.from.y + piece.to.y) / 2 };
          expect(isInsideCheckpoint(track, number, middle.x, middle.y)).toBe(true);
          expect(Math.hypot(piece.to.x - piece.from.x, piece.to.y - piece.from.y)).toBeLessThanOrEqual(track.tileSize);
          // The square named is the one the piece lies on, and it is not a wall.
          expect(Math.floor(middle.x / track.tileSize)).toBe(piece.column);
          expect(Math.floor(middle.y / track.tileSize)).toBe(piece.row);
          expect(tileKindAt(track, middle.x, middle.y)).not.toBe("wall");
        }
      });
    }
  });

  it("runs across the road: along the long side of the checkpoint", () => {
    // The finish line of the campus loop is one square wide and ten tall.
    const line = checkpointPieces(CAMPUS_LOOP, 0);
    expect(new Set(line.map((piece) => piece.column)).size).toBe(1);
    expect(line.every((piece) => piece.from.x === piece.to.x)).toBe(true);
    // Checkpoint 1 is one square tall and many wide.
    const wide = checkpointPieces(CAMPUS_LOOP, 1);
    expect(new Set(wide.map((piece) => piece.row)).size).toBe(1);
    expect(wide.every((piece) => piece.from.y === piece.to.y)).toBe(true);
  });

  it("leaves out the squares of wall under a checkpoint", () => {
    // A made-up strip of map with a wall in the middle of the checkpoint.
    //   column:                      01234
    const strip = { tileSize: 10, map: ["#####", "#.#.#", "#####"], checkpoints: [{ name: "across", left: 10, top: 10, right: 40, bottom: 20 }] };
    expect(checkpointPieces(strip, 0)).toEqual([
      { from: { x: 10, y: 15 }, to: { x: 20, y: 15 }, column: 1, row: 1 },
      { from: { x: 30, y: 15 }, to: { x: 40, y: 15 }, column: 3, row: 1 },
    ]);
    // The same the other way up: a checkpoint that is taller than wide.
    const upright = { tileSize: 10, map: ["###", "#.#", "###", "#.#", "###"], checkpoints: [{ name: "down", left: 10, top: 10, right: 20, bottom: 40 }] };
    expect(checkpointPieces(upright, 0).map((piece) => piece.row)).toEqual([1, 3]);
    // A checkpoint that sticks out of the map gives no piece out there.
    const over = { tileSize: 10, map: ["..."], checkpoints: [{ name: "wide", left: -20, top: 0, right: 50, bottom: 10 }] };
    expect(checkpointPieces(over, 0).map((piece) => piece.column)).toEqual([0, 1, 2]);
  });

  it("gives nothing for a number that is not a checkpoint", () => {
    for (const bad of [-1, 6, 99, 1.5, "0", null, undefined, NaN]) {
      expect(checkpointPieces(CAMPUS_LOOP, bad)).toEqual([]);
    }
  });
});

describe("noticing a missed checkpoint", () => {
  it("says nothing on a clean lap of the campus loop", () => {
    const watch = watchForMissedCheckpoint(CAMPUS_LOOP);
    // A kart that is put in the middle of each checkpoint in turn, in the right order.
    let passed = -1;
    for (let lap = 0; lap < 2; lap++) {
      for (let number = 0; number < CAMPUS_LOOP.checkpoints.length; number++) {
        const { left, top, right, bottom } = CAMPUS_LOOP.checkpoints[number];
        const kart = { x: (left + right) / 2, y: (top + bottom) / 2 };
        expect(watch(kart, passed)).toBe(null); // just arriving in the next one
        passed++;
        expect(watch(kart, passed)).toBe(null); // now it is the one passed last
      }
    }
  });

  it("notices the kart that drives straight on past the CTT Student Hall and reaches the finish line", () => {
    // The real rules count the checkpoints, as in a race.
    let progress = createProgressBehindLine();
    const watch = watchForMissedCheckpoint(CAMPUS_LOOP);
    const driveTo = (spot) => {
      progress = updateProgress(progress, spot, CAMPUS_LOOP);
      return watch(spot, progress.passed);
    };
    // Checkpoints 0 to 4, each through its middle.
    for (let number = 0; number <= 4; number++) {
      const { left, top, right, bottom } = CAMPUS_LOOP.checkpoints[number];
      expect(driveTo({ x: (left + right) / 2, y: (top + bottom) / 2 })).toBe(null);
    }
    expect(progress.passed).toBe(4);
    // Straight north up the west side, never round the end of the hall (checkpoint 5).
    expect(driveTo(square(7, 30))).toBe(null);
    expect(driveTo(square(7, 24))).toBe(null);
    expect(driveTo(square(12, 14))).toBe(null);
    // Onto the finish line: the lap does not count, and now the page can say why.
    const onTheLine = square(20, 14);
    expect(driveTo(onTheLine)).toBe(5);
    expect(progress.lapsDone).toBe(0);
    expect(progress.passed).toBe(4);
    // The warning stays after the kart has left the line...
    expect(driveTo(square(24, 14))).toBe(5);
    expect(driveTo(square(12, 14))).toBe(5);
    // ...until it has driven through the checkpoint it left out.
    const { left, top, right, bottom } = CAMPUS_LOOP.checkpoints[5];
    expect(driveTo({ x: (left + right) / 2, y: (top + bottom) / 2 })).toBe(null);
    expect(progress.passed).toBe(5);
    // Then the finish line counts.
    expect(driveTo(onTheLine)).toBe(null);
    expect(progress.lapsDone).toBe(1);
  });

  it("does not mistake rolling back into the checkpoint before for a missed one", () => {
    const watch = watchForMissedCheckpoint(CAMPUS_LOOP);
    const middleOf = (number) => {
      const { left, top, right, bottom } = CAMPUS_LOOP.checkpoints[number];
      return { x: (left + right) / 2, y: (top + bottom) / 2 };
    };
    // Passed checkpoints 0, 1 and 2 (count 2). Inside 2 (last), 3 (next) or 1 (before) all is well.
    expect(watch(middleOf(2), 2)).toBe(null);
    expect(watch(middleOf(3), 2)).toBe(null);
    expect(watch(middleOf(1), 2)).toBe(null);
    // Inside 4, 5 or 0 the kart has left checkpoint 3 out.
    expect(watchForMissedCheckpoint(CAMPUS_LOOP)(middleOf(4), 2)).toBe(3);
    expect(watchForMissedCheckpoint(CAMPUS_LOOP)(middleOf(5), 2)).toBe(3);
    expect(watchForMissedCheckpoint(CAMPUS_LOOP)(middleOf(0), 2)).toBe(3);
  });

  it("forgets the warning when a new race begins", () => {
    const watch = watchForMissedCheckpoint(CAMPUS_LOOP);
    expect(watch(square(20, 14), 4)).toBe(5); // on the finish line with checkpoint 5 left out
    expect(watch(square(19, 13), -1)).toBe(null); // back on the grid: the count starts again
  });

  it("never reports anything on a track with three checkpoints or fewer, or without usable numbers", () => {
    const small = { ...TEST_OVAL, checkpoints: TEST_OVAL.checkpoints.slice(0, 3) };
    const watch = watchForMissedCheckpoint(small);
    for (const checkpoint of small.checkpoints) {
      const kart = { x: (checkpoint.left + checkpoint.right) / 2, y: (checkpoint.top + checkpoint.bottom) / 2 };
      for (let passed = -3; passed <= 6; passed++) {
        expect(watch(kart, passed)).toBe(null);
      }
    }
    const strict = watchForMissedCheckpoint(CAMPUS_LOOP);
    const onTheLine = square(20, 14);
    for (const strange of [undefined, null, 1.5, "4", NaN]) {
      expect(strict(onTheLine, strange)).toBe(null);
    }
    expect(strict(null, 4)).toBe(null);
    expect(strict({ x: "640", y: 400 }, 4)).toBe(null);
  });
});

describe("what the page says about a missed checkpoint", () => {
  it("names the checkpoint, from the track file, and says what to do", () => {
    const message = missedCheckpointMessage(CAMPUS_LOOP, 5);
    expect(message).toContain("You missed a checkpoint");
    expect(message).toContain(CAMPUS_LOOP.checkpoints[5].name);
    expect(message).toContain("yellow light");
  });

  it("still makes a sentence for a checkpoint without a name, or a number that is none", () => {
    const noNames = { checkpoints: [{}, { name: "" }, { name: 7 }] };
    for (const number of [0, 1, 2, 9, -1]) {
      expect(missedCheckpointMessage(noNames, number)).toMatch(/^You missed a checkpoint\. /);
    }
  });
});
