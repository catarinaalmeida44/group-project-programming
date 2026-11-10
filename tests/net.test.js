// Tests for client/net.js: showing an online race smoothly from updates
// that arrive only 20 times a second.

import { describe, it, expect } from "vitest";
import {
  DELAY_STEPS,
  blend,
  blendAngle,
  blendKarts,
  kartsAtStep,
  createPlayback,
  readServerMessage,
} from "../client/net.js";

/** A kart as it appears in an update from the server. */
function kart(id, x, more = {}) {
  return { id, place: 0, x, y: 100, angle: 0, vx: 300, vy: 0, lapsDone: 0, ...more };
}

/** An update at a step, with one kart that has driven 5 units for every step. */
function updateAt(step) {
  return { type: "state", step, karts: [kart(1, step * 5)] };
}

describe("blending between two values", () => {
  it("gives the first value at 0, the second at 1, and the middle at a half", () => {
    expect(blend(10, 20, 0)).toBe(10);
    expect(blend(10, 20, 1)).toBe(20);
    expect(blend(10, 20, 0.5)).toBe(15);
  });

  it("blends directions the short way round the circle", () => {
    // From just before half a turn to just after it: the short way is
    // through half a turn (3.14), not all the way back through zero.
    const halfway = blendAngle(3.0, -3.0, 0.5);
    expect(Math.abs(Math.cos(halfway) - -1)).toBeLessThan(0.01);
  });

  it("blends ordinary directions in the ordinary way", () => {
    expect(blendAngle(1, 2, 0.5)).toBeCloseTo(1.5);
    expect(blendAngle(6.2, 6.4, 0.5)).toBeCloseTo(6.3); // a kart that has turned round more than once
  });
});

describe("the karts between two updates", () => {
  it("draws a kart part of the way between its two positions", () => {
    const [between] = blendKarts([kart(1, 100)], [kart(1, 200)], 0.25);
    expect(between.x).toBe(125);
  });

  it("takes everything that does not glide, such as laps, from the newer update", () => {
    const [between] = blendKarts([kart(1, 100, { lapsDone: 0 })], [kart(1, 200, { lapsDone: 1 })], 0.5);
    expect(between.lapsDone).toBe(1);
  });

  it("shows a kart that has just joined where the newer update has it", () => {
    const karts = blendKarts([kart(1, 100)], [kart(1, 200), kart(2, 500)], 0.5);
    expect(karts).toHaveLength(2);
    expect(karts[1].x).toBe(500);
  });

  it("does not show a kart that has left", () => {
    const karts = blendKarts([kart(1, 100), kart(2, 500)], [kart(1, 200)], 0.5);
    expect(karts.map((each) => each.id)).toEqual([1]);
  });

  it("keeps each player's own kart apart from the others", () => {
    const karts = blendKarts([kart(2, 0), kart(1, 100)], [kart(1, 200), kart(2, 40)], 0.5);
    expect(karts.find((each) => each.id === 1).x).toBe(150);
    expect(karts.find((each) => each.id === 2).x).toBe(20);
  });
});

describe("the karts at one moment of game time", () => {
  const updates = [updateAt(30), updateAt(33), updateAt(36)];

  it("gives nothing when no update has arrived", () => {
    expect(kartsAtStep([], 10)).toBe(null);
  });

  it("gives an update exactly as it is when the moment is exactly that update", () => {
    expect(kartsAtStep(updates, 33)[0].x).toBe(165);
  });

  it("glides between the two updates on either side of the moment", () => {
    expect(kartsAtStep(updates, 31)[0].x).toBeCloseTo(155);
    expect(kartsAtStep(updates, 34.5)[0].x).toBeCloseTo(172.5);
  });

  it("holds still at the newest update instead of guessing what comes next", () => {
    expect(kartsAtStep(updates, 50)[0].x).toBe(180);
  });

  it("gives the oldest update for a moment before it", () => {
    expect(kartsAtStep(updates, 10)[0].x).toBe(150);
  });
});

describe("playing back the updates as they arrive", () => {
  /**
   * Pretends to be a browser for a number of seconds: an update arrives
   * every 50 thousandths of a second and a picture is drawn every 16.67.
   * Gives back the playback, and the x of the kart in every picture.
   */
  function watch(seconds, { updatesUntil = Infinity } = {}) {
    const playback = createPlayback();
    const xs = [];
    let nextUpdateStep = 0;
    for (let now = 0; now <= seconds * 1000; now += 1000 / 60) {
      while (nextUpdateStep / 60 <= now / 1000 && nextUpdateStep <= updatesUntil) {
        playback.add(updateAt(nextUpdateStep), (nextUpdateStep / 60) * 1000);
        nextUpdateStep += 3;
      }
      const karts = playback.advance(now);
      xs.push(karts === null ? null : karts[0].x);
    }
    return { playback, xs };
  }

  it("gives nothing before the first update arrives", () => {
    expect(createPlayback().advance(0)).toBe(null);
  });

  it("shows the race a tenth of a second in the past", () => {
    const { xs } = watch(2);
    // After 2 seconds the server is at step 120, so the picture should be
    // near step 120 - 6 = 114, which is x = 570.
    const shown = xs[xs.length - 1];
    const wanted = (120 - DELAY_STEPS) * 5;
    expect(Math.abs(shown - wanted)).toBeLessThan(10);
  });

  it("moves the kart smoothly: forwards in every picture, by about the same amount", () => {
    const { xs } = watch(2);
    const settled = xs.slice(30); // skip the first half second
    for (let picture = 1; picture < settled.length; picture++) {
      const moved = settled[picture] - settled[picture - 1];
      expect(moved).toBeGreaterThan(2); //  never stops or goes backwards
      expect(moved).toBeLessThan(8); //     never jumps (5 would be perfectly even)
    }
  });

  it("holds the kart still when the updates stop arriving", () => {
    const { xs } = watch(3, { updatesUntil: 60 }); // the server goes quiet after one second
    const last = xs[xs.length - 1];
    expect(last).toBe(60 * 5); // exactly at the last update, not beyond it
    expect(xs[xs.length - 10]).toBe(last); // and it has stopped moving
  });

  it("ignores an update that is older than one it already has", () => {
    const playback = createPlayback();
    playback.add(updateAt(30), 0);
    playback.add(updateAt(30), 10); // arrives twice
    playback.add(updateAt(27), 20); // arrives late and out of order
    const karts = playback.advance(5000); // long after: holding at the newest
    expect(karts[0].x).toBe(150); // step 30, not the late step 27
  });

  it("does not go backwards when a late update arrives in the middle of a drive", () => {
    const playback = createPlayback();
    playback.add(updateAt(30), 500);
    playback.add(updateAt(33), 550);
    const before = playback.advance(560)[0].x;
    playback.add(updateAt(21), 565); // very late
    const after = playback.advance(577)[0].x;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it("jumps straight to the present after a long gap instead of slowly catching up", () => {
    const playback = createPlayback();
    playback.add(updateAt(0), 0);
    playback.advance(0);
    playback.advance(16);
    playback.add(updateAt(6000), 100000); // the tab was asleep for a long time
    const karts = playback.advance(100010);
    expect(karts[0].x).toBeGreaterThan(5900 * 5 - 200);
  });

  it("copes with a very large number of updates", () => {
    const playback = createPlayback();
    for (let step = 0; step < 3000; step += 3) {
      playback.add(updateAt(step), (step / 60) * 1000);
    }
    // Long after the last one arrived, the picture holds at the newest update.
    expect(playback.advance(60000)[0].x).toBe(2997 * 5);
  });
});

describe("reading a message from the server", () => {
  it("accepts a welcome, an update and 'the room is full'", () => {
    expect(readServerMessage('{"type":"welcome","id":3,"place":1,"track":"Test oval"}').id).toBe(3);
    expect(readServerMessage('{"type":"state","step":12,"karts":[]}').step).toBe(12);
    expect(readServerMessage('{"type":"full"}').type).toBe("full");
  });

  it("gives nothing for anything else, and never breaks the page", () => {
    for (const text of [
      "",
      "hello",
      "null",
      "42",
      "[]",
      "{}",
      '{"type":"mystery"}',
      '{"type":"welcome"}', //                          no player number
      '{"type":"welcome","id":"three"}',
      '{"type":"state","step":12}', //                  no karts
      '{"type":"state","step":"soon","karts":[]}',
      '{"type":"state","step":12,"karts":"none"}',
    ]) {
      expect(readServerMessage(text), text).toBe(null);
    }
  });
});
