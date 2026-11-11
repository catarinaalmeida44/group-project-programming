// Tests for client/records.js: your best race time and best lap, kept in
// this browser.
//
// Times are in steps of the game, 60 a second. "lapEnds" is the step count
// at the end of each lap, as the lap rules give it: [600, 1200, 1800] is a
// race of three 10-second laps.

import { describe, it, expect } from "vitest";
import { bestTimesFor, finishedRaceTimes, recordFinishedRace, bestTimeText } from "../client/records.js";

const TRACK = { name: "Test oval", laps: 3 };
const OTHER_TRACK = { name: "Campus loop", laps: 3 };
const NONE = { raceSteps: null, lapSteps: null };

function fakeStorage(saved = {}) {
  const texts = { ...saved };
  return {
    texts,
    getItem: (key) => (key in texts ? texts[key] : null),
    setItem: (key, value) => {
      texts[key] = String(value);
    },
  };
}

const brokenStorage = {
  getItem: () => {
    throw new Error("storage switched off");
  },
  setItem: () => {
    throw new Error("storage full");
  },
};

describe("the times of a finished race", () => {
  it("are the time of the last lap's end and the fastest single lap", () => {
    // Laps of 10, 8 and 9 seconds.
    expect(finishedRaceTimes([600, 1080, 1620], 3)).toEqual({ raceSteps: 1620, lapSteps: 480 });
  });

  it("are refused for a race that is not finished, or has too many laps", () => {
    expect(finishedRaceTimes([], 3)).toBeNull();
    expect(finishedRaceTimes([600, 1200], 3)).toBeNull();
    expect(finishedRaceTimes([600, 1200, 1800, 2400], 3)).toBeNull();
  });

  it("are refused when the times are impossible", () => {
    expect(finishedRaceTimes([600, 500, 1800], 3)).toBeNull(); //   a lap ends before the one before
    expect(finishedRaceTimes([600, 600, 1800], 3)).toBeNull(); //   a lap that took no time
    expect(finishedRaceTimes([0, 600, 1200], 3)).toBeNull(); //     a first lap that took no time
    expect(finishedRaceTimes([-60, 600, 1200], 3)).toBeNull(); //   negative
    expect(finishedRaceTimes([60.5, 600, 1200], 3)).toBeNull(); // not a whole step
    expect(finishedRaceTimes([NaN, 600, 1200], 3)).toBeNull();
    expect(finishedRaceTimes(["600", "1200", "1800"], 3)).toBeNull();
    expect(finishedRaceTimes(null, 3)).toBeNull();
    expect(finishedRaceTimes([600], 0)).toBeNull();
  });
});

describe("keeping your best times", () => {
  it("has no best times on a browser that never finished a race", () => {
    expect(bestTimesFor(fakeStorage(), TRACK.name)).toEqual(NONE);
  });

  it("keeps the first finished race as the best", () => {
    const storage = fakeStorage();
    const result = recordFinishedRace(storage, TRACK, [600, 1080, 1620]);
    expect(result).toEqual({ newBestRace: true, newBestLap: true, saved: true });
    expect(bestTimesFor(storage, TRACK.name)).toEqual({ raceSteps: 1620, lapSteps: 480 });
  });

  it("replaces the best race time only with a faster one", () => {
    const storage = fakeStorage();
    recordFinishedRace(storage, TRACK, [600, 1200, 1800]);

    const slower = recordFinishedRace(storage, TRACK, [700, 1400, 2100]);
    expect(slower).toEqual({ newBestRace: false, newBestLap: false, saved: false });
    expect(bestTimesFor(storage, TRACK.name).raceSteps).toBe(1800);

    const faster = recordFinishedRace(storage, TRACK, [500, 1000, 1500]);
    expect(faster.newBestRace).toBe(true);
    expect(bestTimesFor(storage, TRACK.name).raceSteps).toBe(1500);
  });

  it("does not count an equal time as a new best", () => {
    const storage = fakeStorage();
    recordFinishedRace(storage, TRACK, [600, 1200, 1800]);
    expect(recordFinishedRace(storage, TRACK, [600, 1200, 1800]).newBestRace).toBe(false);
  });

  it("keeps the best lap on its own: a slower race can still hold a faster lap", () => {
    const storage = fakeStorage();
    recordFinishedRace(storage, TRACK, [600, 1200, 1800]); // 30 s, laps of 10 s
    // 32 s in all, but one lap of 7 s.
    const result = recordFinishedRace(storage, TRACK, [420, 1200, 1920]);
    expect(result).toEqual({ newBestRace: false, newBestLap: true, saved: true });
    expect(bestTimesFor(storage, TRACK.name)).toEqual({ raceSteps: 1800, lapSteps: 420 });
  });

  it("keeps each track's times apart", () => {
    const storage = fakeStorage();
    recordFinishedRace(storage, TRACK, [600, 1200, 1800]);
    expect(bestTimesFor(storage, OTHER_TRACK.name)).toEqual(NONE);
    recordFinishedRace(storage, OTHER_TRACK, [900, 1800, 2700]);
    expect(bestTimesFor(storage, TRACK.name).raceSteps).toBe(1800);
    expect(bestTimesFor(storage, OTHER_TRACK.name).raceSteps).toBe(2700);
  });

  it("does not record an unfinished or impossible race", () => {
    const storage = fakeStorage();
    expect(recordFinishedRace(storage, TRACK, [600, 1200]).saved).toBe(false);
    expect(recordFinishedRace(storage, TRACK, [600, 500, 1800]).saved).toBe(false);
    expect(bestTimesFor(storage, TRACK.name)).toEqual(NONE);
    expect(storage.texts).toEqual({});
  });
});

describe("saved best times that cannot be trusted", () => {
  it("are ignored when they are not sensible times (for example edited by hand)", () => {
    for (const bad of [0, -5, 12.5, "1800", null, true, [1800], { steps: 1800 }]) {
      const saved = JSON.stringify({ [TRACK.name]: { raceSteps: bad, lapSteps: bad } });
      const storage = fakeStorage({ "kart-best-times": saved });
      expect(bestTimesFor(storage, TRACK.name)).toEqual(NONE);
    }
  });

  it("are ignored when the saved text is broken, and a new race is then recorded", () => {
    const storage = fakeStorage({ "kart-best-times": "{broken" });
    expect(bestTimesFor(storage, TRACK.name)).toEqual(NONE);
    expect(recordFinishedRace(storage, TRACK, [600, 1200, 1800]).saved).toBe(true);
    expect(bestTimesFor(storage, TRACK.name).raceSteps).toBe(1800);
  });

  it("do not let a made-up track name reach the inner workings of the data", () => {
    const storage = fakeStorage();
    expect(bestTimesFor(storage, "__proto__")).toEqual(NONE);
    expect(bestTimesFor(storage, "toString")).toEqual(NONE);
  });

  it("do not crash the game when the browser gives no storage, and say nothing was saved", () => {
    for (const storage of [null, brokenStorage]) {
      expect(bestTimesFor(storage, TRACK.name)).toEqual(NONE);
      const result = recordFinishedRace(storage, TRACK, [600, 1200, 1800]);
      expect(result.newBestRace).toBe(true);
      expect(result.saved).toBe(false);
    }
  });
});

describe("best times as text", () => {
  it("shows a time as minutes, seconds and hundredths, and a dash when there is none", () => {
    expect(bestTimeText(240)).toBe("0:04.00");
    expect(bestTimeText(null)).toBe("–");
  });
});
