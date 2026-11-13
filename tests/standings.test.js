// Tests for client/standings.js: who is in front in an online race, and the
// list of results at its end. The page only shows this. What is saved to the
// leaderboard is decided by the server (tests/online-accounts.test.js).

import { describe, it, expect } from "vitest";
import { distanceToCheckpoint, standings, placeLine, resultLines, boardLines } from "../client/standings.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

/** A kart as it appears in an update, standing in the middle of a checkpoint unless told otherwise. */
function kart(id, more = {}) {
  return { id, x: 0, y: 0, passed: 0, steps: 0, finished: false, ...more };
}

/** The middle of a checkpoint of the oval. */
function middleOf(number) {
  const { left, top, right, bottom } = TEST_OVAL.checkpoints[number];
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

const ids = (karts) => karts.map((each) => each.id);

describe("how far a kart is from a checkpoint", () => {
  it("is 0 inside it and the straight distance to its nearest edge outside", () => {
    const { left, top, right, bottom } = TEST_OVAL.checkpoints[1];
    expect(distanceToCheckpoint(TEST_OVAL, 1, (left + right) / 2, (top + bottom) / 2)).toBe(0);
    expect(distanceToCheckpoint(TEST_OVAL, 1, left - 30, (top + bottom) / 2)).toBe(30);
    expect(distanceToCheckpoint(TEST_OVAL, 1, right + 30, bottom + 40)).toBe(50); // 30 across, 40 down
  });
});

describe("the order of the race", () => {
  it("puts the karts that have finished first, the shortest race time in front", () => {
    const karts = [
      kart(1, { passed: 5 }),
      kart(2, { finished: true, steps: 3000, passed: 12 }),
      kart(3, { finished: true, steps: 2800, passed: 12 }),
    ];
    expect(ids(standings(karts, TEST_OVAL))).toEqual([3, 2, 1]);
  });

  it("puts the kart that has passed more checkpoints in front of one that has passed fewer", () => {
    const karts = [kart(1, { passed: 3 }), kart(2, { passed: 7 }), kart(3, { passed: -1 })];
    expect(ids(standings(karts, TEST_OVAL))).toEqual([2, 1, 3]);
  });

  it("of two karts with the same count, puts the one nearer to its next checkpoint in front", () => {
    const next = middleOf(1);
    const karts = [kart(1, { passed: 0, x: next.x - 300, y: next.y }), kart(2, { passed: 0, x: next.x - 80, y: next.y })];
    expect(ids(standings(karts, TEST_OVAL))).toEqual([2, 1]);
  });

  it("does not change the list it was given", () => {
    const karts = [kart(1, { passed: 1 }), kart(2, { passed: 2 })];
    standings(karts, TEST_OVAL);
    expect(ids(karts)).toEqual([1, 2]);
  });

  it("does not break on a kart with missing or strange numbers: it counts as last", () => {
    const karts = [kart(1, { passed: undefined, steps: null }), kart(2, { passed: 0 }), kart(3, { passed: "9" })];
    expect(ids(standings(karts, TEST_OVAL))).toEqual([2, 1, 3]);
    // A kart without a usable position is behind one with the same count.
    const lost = [kart(1, { x: "far" }), kart(2)];
    expect(ids(standings(lost, TEST_OVAL))).toEqual([2, 1]);
    expect(standings([], TEST_OVAL)).toEqual([]);
  });
});

describe("the player's own place", () => {
  it('is said as "2nd of 4"', () => {
    const karts = [kart(1, { passed: 3 }), kart(2, { passed: 7 }), kart(3, { passed: 1 }), kart(4, { passed: 0 })];
    expect(placeLine(karts, TEST_OVAL, 2)).toBe("1st of 4");
    expect(placeLine(karts, TEST_OVAL, 1)).toBe("2nd of 4");
    expect(placeLine(karts, TEST_OVAL, 3)).toBe("3rd of 4");
    expect(placeLine(karts, TEST_OVAL, 4)).toBe("4th of 4");
  });

  it("is not shown to someone who races alone, or who has no kart in the race", () => {
    expect(placeLine([kart(1)], TEST_OVAL, 1)).toBe("");
    expect(placeLine([kart(1), kart(2)], TEST_OVAL, 9)).toBe("");
    expect(placeLine([], TEST_OVAL, 1)).toBe("");
  });
});

// The big board that comes up when the race is over for everyone.
describe("the results board at the end of a race", () => {
  const laps = TEST_OVAL.laps;
  const count = TEST_OVAL.checkpoints.length;
  const names = new Map([[2, "Rui"], [3, "Bea_22"]]);
  /** A kart that ran out of time, having passed this many checkpoints, standing this far before its next one. */
  function outOfTime(id, passed, before) {
    const next = middleOf((passed + 1) % count);
    return kart(id, { passed, lapsDone: Math.floor(passed / count), steps: 9000, x: next.x - before, y: next.y });
  }

  it("lists the finishers in the order of arrival, the winner first, with how far behind the others were", () => {
    const karts = [
      kart(1, { finished: true, steps: 3000, passed: count * laps, lapsDone: laps }),
      kart(2, { finished: true, steps: 2700, passed: count * laps, lapsDone: laps }),
    ];
    expect(boardLines(karts, TEST_OVAL, names, 1)).toEqual([
      { id: 2, position: 1, place: "1st", who: "Rui", time: "0:45.00", detail: "", finished: true, mine: false },
      { id: 1, position: 2, place: "2nd", who: "Guest 1", time: "0:50.00", detail: "+0:05.00", finished: true, mine: true },
    ]);
  });

  it("puts the karts that ran out of time after the finishers, the one closest to the finish first", () => {
    const karts = [
      outOfTime(4, count + 1, 50), //           second lap
      outOfTime(5, 2 * count + 1, 200), //      last lap, 200 units before its next checkpoint
      kart(1, { finished: true, steps: 3000, passed: count * laps, lapsDone: laps }),
      outOfTime(3, 2 * count + 1, 40), //       last lap, same checkpoints as 5 but nearer to the next one
    ];
    const lines = boardLines(karts, TEST_OVAL, names, 5);
    expect(lines.map((line) => line.id)).toEqual([1, 3, 5, 4]);
    expect(lines.map((line) => line.place)).toEqual(["1st", "2nd", "3rd", "4th"]);
    expect(lines.map((line) => line.time)).toEqual(["0:50.00", "did not finish", "did not finish", "did not finish"]);
    expect(lines.map((line) => line.detail)).toEqual(["", `lap 3 of ${laps}`, `lap 3 of ${laps}`, `lap 2 of ${laps}`]);
    expect(lines.map((line) => line.finished)).toEqual([true, false, false, false]);
    expect(lines.map((line) => line.mine)).toEqual([false, false, true, false]);
  });

  it("still gives an order when nobody finished: whoever was closest to the finish is on top", () => {
    const lines = boardLines([outOfTime(1, 2, 30), outOfTime(2, 6, 30)], TEST_OVAL, names, 1);
    expect(lines.map((line) => line.id)).toEqual([2, 1]);
    expect(lines[0]).toMatchObject({ position: 1, time: "did not finish", finished: false, who: "Rui" });
  });

  it("gives two karts with the same race time the same place, and neither is behind the other", () => {
    const tie = [
      kart(1, { finished: true, steps: 3000 }),
      kart(2, { finished: true, steps: 3000 }),
      kart(3, { finished: true, steps: 3120 }),
      outOfTime(4, 1, 10),
    ];
    const lines = boardLines(tie, TEST_OVAL, new Map(), 0);
    expect(lines.map((line) => line.place)).toEqual(["1st", "1st", "3rd", "4th"]);
    expect(lines.map((line) => line.detail)).toEqual(["", "", "+0:02.00", `lap 1 of ${laps}`]);
  });

  it("never says a lap beyond the last one, and never breaks on strange numbers", () => {
    const odd = kart(1, { passed: 99, lapsDone: 99 });
    expect(boardLines([odd], TEST_OVAL, names, 0)[0].detail).toBe(`lap ${laps} of ${laps}`);
    const noLaps = kart(2, { lapsDone: "two" });
    expect(boardLines([noLaps], TEST_OVAL, names, 0)[0].detail).toBe(`lap 1 of ${laps}`);
  });

  it("leaves out anything in the list that is not a kart, and gives nothing for something that is not a list", () => {
    const lines = boardLines([null, 42, "kart", kart(7, { finished: true, steps: 600 }), undefined], TEST_OVAL, null, 7);
    expect(lines).toEqual([{ id: 7, position: 1, place: "1st", who: "Guest 7", time: "0:10.00", detail: "", finished: true, mine: true }]);
    for (const strange of [null, undefined, "karts", 5, {}]) {
      expect(boardLines(strange, TEST_OVAL, names, 1)).toEqual([]);
    }
  });
});

describe("the results list", () => {
  const names = new Map([[2, "Rui"], [3, "Bea_22"]]);
  const karts = [
    kart(1, { passed: 5, steps: 4000 }),
    kart(2, { finished: true, steps: 3000, passed: 12 }),
    kart(3, { finished: true, steps: 2700, passed: 12 }),
  ];

  it("lists the winner first, with place, name and race time, and marks the player's own line", () => {
    expect(resultLines(karts, TEST_OVAL, names, 2, true)).toEqual([
      { place: "1st", who: "Bea_22", time: "0:45.00", mine: false },
      { place: "2nd", who: "Rui", time: "0:50.00", mine: true },
      { place: "-", who: "Guest 1", time: "did not finish", mine: false },
    ]);
  });

  it('says "still racing" for a kart that has not finished while the race is on', () => {
    const lines = resultLines(karts, TEST_OVAL, names, 1, false);
    expect(lines[2]).toEqual({ place: "-", who: "Guest 1", time: "still racing", mine: true });
  });

  it("gives two karts with the same race time the same place, as the server does", () => {
    const tie = [
      kart(1, { finished: true, steps: 3000 }),
      kart(2, { finished: true, steps: 3000 }),
      kart(3, { finished: true, steps: 3100 }),
    ];
    expect(resultLines(tie, TEST_OVAL, new Map(), 0, true).map((line) => line.place)).toEqual(["1st", "1st", "3rd"]);
  });

  it("calls a player without a usable name a guest, and never fails on a strange list of names", () => {
    const strange = new Map([[1, 42], [2, null]]);
    expect(resultLines(karts, TEST_OVAL, strange, 0, true).map((line) => line.who)).toEqual(["Guest 3", "Guest 2", "Guest 1"]);
    expect(resultLines(karts, TEST_OVAL, null, 0, true).map((line) => line.who)).toEqual(["Guest 3", "Guest 2", "Guest 1"]);
    expect(resultLines([], TEST_OVAL, names, 1, true)).toEqual([]);
  });
});
