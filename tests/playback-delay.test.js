// Tests for how far in the past the online page shows the race
// (createPlayback in client/net.js), since 19 November 2026.
//
// The server now sends 30 updates a second. On a steady connection the page
// shows the race 4 steps in the past instead of 6, so a key press shows on
// the screen sooner. On a connection that delivers updates unevenly it
// keeps more spare, up to the 6 steps it always had, so the karts do not
// stop and start. tests/net.test.js still plays updates back at the old
// rhythm (every third step), which must keep working too.

import { describe, it, expect } from "vitest";
import { createPlayback, DELAY_STEPS, DELAY_STEPS_MOST, LATENESS_FADES } from "../client/net.js";
import { STEPS_PER_UPDATE } from "../server/room.js";

const STEP_MS = 1000 / 60;

/** An update at a step, with one kart that has driven 5 units for every step. */
function updateAt(step) {
  return { type: "state", step, karts: [{ id: 1, place: 0, x: step * 5, y: 100, angle: 0, vx: 300, vy: 0, lapsDone: 0 }] };
}

/**
 * Pretends to be a browser for a number of seconds: the server sends an
 * update every STEPS_PER_UPDATE steps, and a picture is drawn 60 times a
 * second.
 *   lateMs(number)  how many thousandths of a second too late update
 *                   "number" (0, 1, 2, ...) arrives. Left out: never late
 *   pauseAt, pauseMs  from this moment no update arrives for this long (a
 *                   tab that was asleep), then they all arrive at once
 * Gives the x of the kart and the delay in use, for every picture.
 */
function watch(seconds, { lateMs = () => 0, pauseAt = Infinity, pauseMs = 0 } = {}) {
  const playback = createPlayback();
  const arrivals = []; // { step, at }
  for (let number = 0; number * STEPS_PER_UPDATE * STEP_MS <= seconds * 1000; number++) {
    const step = number * STEPS_PER_UPDATE;
    let at = step * STEP_MS + lateMs(number);
    if (at >= pauseAt && at < pauseAt + pauseMs) {
      at = pauseAt + pauseMs;
    }
    arrivals.push({ step, at });
  }
  const xs = [];
  const delays = [];
  let next = 0;
  for (let now = 0; now <= seconds * 1000; now += STEP_MS) {
    while (next < arrivals.length && arrivals[next].at <= now) {
      playback.add(updateAt(arrivals[next].step), arrivals[next].at);
      next++;
    }
    const karts = playback.advance(now);
    xs.push(karts === null ? null : karts[0].x);
    delays.push(playback.delaySteps());
  }
  return { xs, delays };
}

/** How far the kart moved from each picture to the next, from a moment on. */
function movesFrom(xs, seconds) {
  const later = xs.slice(Math.round(seconds * 60));
  return later.slice(1).map((x, picture) => x - later[picture]);
}

describe("the numbers", () => {
  it("are 4 steps on a steady connection and never more than 6, with 30 updates a second", () => {
    expect(DELAY_STEPS).toBe(4);
    expect(DELAY_STEPS_MOST).toBe(6);
    expect(60 / STEPS_PER_UPDATE).toBe(30);
    // Two updates of spare on a steady connection, as before (6 steps with an update every 3).
    expect(DELAY_STEPS / STEPS_PER_UPDATE).toBe(2);
  });

  it("forget a late update slowly, over a few seconds", () => {
    expect(LATENESS_FADES).toBeGreaterThan(0.9);
    expect(LATENESS_FADES).toBeLessThan(1);
  });
});

describe("on a steady connection", () => {
  it("shows the race 4 steps in the past, a fifteenth of a second", () => {
    const { xs, delays } = watch(2);
    // After 2 seconds the server is at step 120, so the picture should be near step 116: x = 580.
    expect(Math.abs(xs.at(-1) - (120 - 4) * 5)).toBeLessThan(10);
    expect(Math.max(...delays)).toBeCloseTo(4, 6); // 4, give or take the last digit of the arithmetic
  });

  it("is two steps closer to the present than the 6 steps it showed until 19 November 2026", () => {
    const { xs } = watch(2);
    expect(xs.at(-1)).toBeGreaterThan((120 - 6) * 5 + 5);
  });

  it("moves the kart smoothly: forwards in every picture, by about the same amount", () => {
    for (const moved of movesFrom(watch(3).xs, 0.5)) {
      expect(moved).toBeGreaterThan(2); // never stops or goes backwards
      expect(moved).toBeLessThan(8); //    never jumps (5 would be perfectly even)
    }
  });

  it("never shows the kart ahead of the newest update: it does not guess", () => {
    const { xs } = watch(2);
    xs.forEach((x, picture) => {
      const serverStep = Math.floor((picture * STEP_MS) / (STEPS_PER_UPDATE * STEP_MS)) * STEPS_PER_UPDATE;
      expect(x).toBeLessThanOrEqual(serverStep * 5 + 0.001);
    });
  });
});

describe("on a connection that delivers updates unevenly", () => {
  // Every tenth update arrives 40 thousandths of a second late: more than
  // the 33 between two updates, so with 4 steps of delay the picture would
  // run out of updates each time.
  const everyTenthLate = (number) => (number % 10 === 9 ? 40 : 0);

  it("needs no extra delay for updates that are at most one step late, which is what the live server delivers", () => {
    // Measured on 19 November 2026 from Catarina's laptop: at most 15 to 18 thousandths of a second late.
    const aBitLate = (number) => (number % 4 === 3 ? 16 : 0);
    const { delays, xs } = watch(4, { lateMs: aBitLate });
    expect(Math.max(...delays)).toBeLessThan(4.05);
    for (const moved of movesFrom(xs, 1)) {
      expect(moved).toBeGreaterThan(0.5); // and the kart never stops
    }
  });

  it("adds a step of delay for each further step of lateness", () => {
    const mostDelayWhenOnceLateBy = (ms) => Math.max(...watch(2, { lateMs: (number) => (number === 30 ? ms : 0) }).delays);
    expect(mostDelayWhenOnceLateBy(33.4)).toBeCloseTo(5, 1); // two steps late
    expect(mostDelayWhenOnceLateBy(50)).toBeCloseTo(6, 1); //   three steps late
  });

  it("keeps more spare after the first late update", () => {
    const { delays } = watch(3, { lateMs: everyTenthLate });
    expect(delays[5]).toBe(4); // nothing was late yet
    expect(delays.at(-1)).toBeGreaterThan(5);
  });

  it("then keeps the kart moving in every picture, although updates go on arriving late", () => {
    for (const moved of movesFrom(watch(6, { lateMs: everyTenthLate }).xs, 1)) {
      expect(moved).toBeGreaterThan(0.5); // it never stops
      expect(moved).toBeLessThan(10); //    and never jumps
    }
  });

  it("never goes backwards while the delay grows", () => {
    for (const moved of movesFrom(watch(3, { lateMs: everyTenthLate }).xs, 0.2)) {
      expect(moved).toBeGreaterThanOrEqual(0);
    }
  });

  it("never shows the race more than 6 steps in the past, however late the updates are", () => {
    const veryLate = (number) => (number % 5 === 4 ? 300 : 0);
    const { delays } = watch(4, { lateMs: veryLate });
    expect(Math.max(...delays)).toBe(DELAY_STEPS_MOST);
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(DELAY_STEPS);
  });

  it("copes with updates that are a little late all the time, without ever stopping the kart", () => {
    // 0, 10, 25, 5 and 30 thousandths of a second late, round and round.
    const jitter = (number) => [0, 10, 25, 5, 30][number % 5];
    for (const moved of movesFrom(watch(6, { lateMs: jitter }).xs, 1)) {
      expect(moved).toBeGreaterThan(0.5);
    }
  });

  it("comes back to 4 steps once the connection is steady again", () => {
    const lateAtFirst = (number) => (number < 60 && number % 10 === 9 ? 40 : 0); // uneven for two seconds
    const { delays } = watch(9, { lateMs: lateAtFirst });
    expect(delays[Math.round(2 * 60)]).toBeGreaterThan(5); // still careful right after
    expect(delays.at(-1)).toBeLessThan(4.1); //               and back after a few steady seconds
  });

  it("does not take a tab that was asleep for a slow connection", () => {
    // No update for three seconds, then everything at once.
    const { delays, xs } = watch(8, { pauseAt: 2000, pauseMs: 3000 });
    expect(delays.at(-1)).toBeLessThan(4.1);
    expect(Math.abs(xs.at(-1) - (480 - 4) * 5)).toBeLessThan(15);
  });
});

describe("with the old rhythm of 20 updates a second", () => {
  it("still plays back smoothly, in case an older server is behind the page", () => {
    const playback = createPlayback();
    const xs = [];
    let nextStep = 0;
    for (let now = 0; now <= 3000; now += STEP_MS) {
      while (nextStep * STEP_MS <= now) {
        playback.add(updateAt(nextStep), nextStep * STEP_MS);
        nextStep += 3;
      }
      xs.push(playback.advance(now)[0].x);
    }
    for (const moved of movesFrom(xs, 0.5)) {
      expect(moved).toBeGreaterThan(2);
      expect(moved).toBeLessThan(8);
    }
  });
});
