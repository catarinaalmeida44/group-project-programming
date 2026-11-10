// Tests for shared/laps.js: checkpoints, laps and race time.
//
// These tests do not drive. They place a kart directly inside a checkpoint
// ("teleporting"), which is the easiest way to try every order, including
// the orders that must not count.

import { describe, it, expect } from "vitest";
import {
  createProgress,
  updateProgress,
  nextCheckpoint,
  raceSeconds,
  currentLap,
} from "../shared/laps.js";
import { createTrack } from "../shared/track.js";
import { createKart, STEP_SECONDS } from "../shared/physics.js";
import { smallTrackDescription } from "./small-track.js";

const track = createTrack(smallTrackDescription()); // 2 laps; finish line + checkpoints 1, 2, 3

/** A kart in the middle of a checkpoint. */
function kartInCheckpoint(number) {
  const checkpoint = track.checkpoints[number];
  return createKart((checkpoint.left + checkpoint.right) / 2, (checkpoint.top + checkpoint.bottom) / 2);
}

/** A kart on the road that is in no checkpoint (the start position). */
const kartElsewhere = createKart(track.start.x, track.start.y);

/**
 * Moves a kart through a list of places, one step each, and gives the progress afterwards.
 * A number means "inside that checkpoint". The word "elsewhere" means "in no checkpoint".
 */
function visit(progress, ...places) {
  for (const place of places) {
    const kart = place === "elsewhere" ? kartElsewhere : kartInCheckpoint(place);
    progress = updateProgress(progress, kart, track);
  }
  return progress;
}

const FINISH = 0;
const ONE_LAP = [1, 2, 3, FINISH];
const ONE_LAP_BACKWARDS = [3, 2, 1, FINISH];

describe("counting laps", () => {
  it("starts with no laps done, aiming for checkpoint 1", () => {
    const progress = createProgress();
    expect(progress.lapsDone).toBe(0);
    expect(progress.finished).toBe(false);
    expect(nextCheckpoint(progress, track)).toBe(1);
  });

  it("aims for each checkpoint in turn, and for the finish line after the last one", () => {
    expect(nextCheckpoint(visit(createProgress(), 1), track)).toBe(2);
    expect(nextCheckpoint(visit(createProgress(), 1, 2), track)).toBe(3);
    expect(nextCheckpoint(visit(createProgress(), 1, 2, 3), track)).toBe(FINISH);
  });

  it("counts a lap after every checkpoint in order and then the finish line", () => {
    const progress = visit(createProgress(), ...ONE_LAP);
    expect(progress.lapsDone).toBe(1);
    expect(nextCheckpoint(progress, track)).toBe(1);
  });

  it("still counts the lap when the kart spends steps between checkpoints", () => {
    const progress = visit(
      createProgress(),
      ...["elsewhere", 1, "elsewhere", "elsewhere", 2, 3, "elsewhere", FINISH],
    );
    expect(progress.lapsDone).toBe(1);
  });

  it("finishes the race after the track's number of laps", () => {
    const progress = visit(createProgress(), ...ONE_LAP, ...ONE_LAP);
    expect(progress.lapsDone).toBe(2);
    expect(progress.finished).toBe(true);
  });

  it("is not finished one lap early", () => {
    const progress = visit(createProgress(), ...ONE_LAP, 1, 2, 3);
    expect(progress.lapsDone).toBe(1);
    expect(progress.finished).toBe(false);
  });

  it("shows the lap being driven, and never more than the total", () => {
    expect(currentLap(createProgress(), track)).toBe(1);
    expect(currentLap(visit(createProgress(), ...ONE_LAP), track)).toBe(2);
    expect(currentLap(visit(createProgress(), ...ONE_LAP, ...ONE_LAP), track)).toBe(2);
  });
});

describe("laps that must NOT count", () => {
  it("does not count a lap when a checkpoint was skipped", () => {
    const progress = visit(createProgress(), 1, 3, FINISH);
    expect(progress.lapsDone).toBe(0);
  });

  it("does not count a lap when two checkpoints were skipped", () => {
    const progress = visit(createProgress(), 1, FINISH, 1, FINISH, 1, FINISH);
    expect(progress.lapsDone).toBe(0);
  });

  it("does not count checkpoints taken in the wrong order", () => {
    const progress = visit(createProgress(), 2, 1, 3, FINISH);
    expect(progress.lapsDone).toBe(0);
  });

  it("does not count laps driven the wrong way round, however many", () => {
    let progress = createProgress();
    for (let round = 0; round < 10; round++) {
      progress = visit(progress, ...ONE_LAP_BACKWARDS);
      expect(progress.lapsDone).toBe(0);
    }
    expect(progress.finished).toBe(false);
  });

  it("makes a kart that drove backwards make up for it before a lap counts", () => {
    // One round backwards, then one round forwards: back where it started, no lap.
    const backThenForward = visit(createProgress(), ...ONE_LAP_BACKWARDS, ...ONE_LAP);
    expect(backThenForward.lapsDone).toBe(0);
    // One more round forwards: now it has really done a lap.
    expect(visit(backThenForward, ...ONE_LAP).lapsDone).toBe(1);
  });

  it("does not count crossing the finish line straight away", () => {
    const progress = visit(createProgress(), FINISH);
    expect(progress.lapsDone).toBe(0);
  });

  it("does not count going back and forth over the finish line", () => {
    const progress = visit(
      createProgress(),
      ...[FINISH, "elsewhere", FINISH, "elsewhere", FINISH, 3, FINISH, 3, FINISH],
    );
    expect(progress.lapsDone).toBe(0);
  });

  it("does not count going back and forth between two checkpoints", () => {
    const progress = visit(createProgress(), 1, 2, 1, 2, 1, 2, 1, FINISH);
    expect(progress.lapsDone).toBe(0);
  });

  it("takes a checkpoint away again when the kart goes back through the one before it", () => {
    const progress = visit(createProgress(), 1, 2, 1);
    expect(nextCheckpoint(progress, track)).toBe(2); // checkpoint 2 has to be done again
  });

  it("counts a checkpoint once, however long the kart stays inside it", () => {
    const progress = visit(createProgress(), 1, 1, 1, 1);
    expect(nextCheckpoint(progress, track)).toBe(2);
  });

  it("counts the finish line once, however long the kart stays on it", () => {
    const progress = visit(createProgress(), ...ONE_LAP, FINISH, FINISH);
    expect(progress.lapsDone).toBe(1);
  });

  it("does not count the same lap twice when the kart reverses over the finish line and comes back", () => {
    const oneLap = visit(createProgress(), ...ONE_LAP);
    const backAndForth = visit(oneLap, 3, FINISH, 3, FINISH);
    expect(backAndForth.lapsDone).toBe(1);
    expect(backAndForth.lapSteps).toHaveLength(1);
    expect(backAndForth.finished).toBe(false);
  });

  it("does not count extra laps after the race is finished", () => {
    const finished = visit(createProgress(), ...ONE_LAP, ...ONE_LAP);
    const later = visit(finished, ...ONE_LAP);
    expect(later.lapsDone).toBe(2);
  });

  it("does not break, and counts nothing, when the progress it is given is damaged", () => {
    const damaged = { ...createProgress(), passed: NaN };
    const progress = visit(damaged, ...ONE_LAP);
    expect(progress.lapsDone).toBe(0);
    expect(progress.finished).toBe(false);
  });
});

describe("timing the race", () => {
  it("counts one step of game time for every step raced", () => {
    const progress = visit(createProgress(), "elsewhere", "elsewhere", 1);
    expect(progress.steps).toBe(3);
    expect(raceSeconds(progress)).toBeCloseTo(3 * STEP_SECONDS);
  });

  it("turns sixty steps into one second", () => {
    expect(raceSeconds({ ...createProgress(), steps: 60 })).toBeCloseTo(1);
  });

  it("keeps the clock running while the kart drives the wrong way", () => {
    const progress = visit(createProgress(), ...ONE_LAP_BACKWARDS);
    expect(progress.steps).toBe(4);
  });

  it("remembers the step count at the end of each lap", () => {
    const progress = visit(createProgress(), ...ONE_LAP, "elsewhere", ...ONE_LAP);
    expect(progress.lapSteps).toEqual([4, 9]);
  });

  it("stops the clock when the race is finished", () => {
    const finished = visit(createProgress(), ...ONE_LAP, ...ONE_LAP);
    expect(finished.steps).toBe(8);
    const later = visit(finished, "elsewhere", "elsewhere", "elsewhere");
    expect(later.steps).toBe(8);
    expect(raceSeconds(later)).toBe(raceSeconds(finished));
  });

  it("does not change the progress it was given", () => {
    const before = Object.freeze({ ...createProgress(), lapSteps: Object.freeze([]) });
    const after = visit(before, ...ONE_LAP);
    expect(before.lapsDone).toBe(0);
    expect(before.steps).toBe(0);
    expect(before.passed).toBe(0);
    expect(before.lapSteps).toEqual([]);
    expect(after.lapsDone).toBe(1);
  });
});
