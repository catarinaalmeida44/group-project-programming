// Tests for keysWork in client/race-view.js: when the online page treats the
// arrow keys as doing something (the kart leans, the engine revs, the next
// checkpoint is lit). It must agree with the server's rules: since 17
// November 2026 nothing moves before the host starts and before GO.

import { describe, it, expect } from "vitest";
import { keysWork } from "../client/race-view.js";

const race = (phase) => ({ phase, countdownSteps: 0, host: 1, watching: [] });
const mine = (more = {}) => ({ id: 1, finished: false, spin: 0, ...more });

describe("when the arrow keys do something on the online page", () => {
  it("is in a race after GO, in your own kart", () => {
    expect(keysWork(race("racing"), mine())).toBe(true);
  });

  it("is not while waiting for the host to start", () => {
    expect(keysWork(race("open"), mine())).toBe(false);
  });

  it("is not during 3, 2, 1", () => {
    expect(keysWork(race("countdown"), mine())).toBe(false);
  });

  it("is not once the race is over", () => {
    expect(keysWork(race("finished"), mine())).toBe(false);
  });

  it("is not when you are watching and have no kart", () => {
    expect(keysWork(race("racing"), undefined)).toBe(false);
  });

  it("is not after you have finished, or while your kart spins after a banana", () => {
    expect(keysWork(race("racing"), mine({ finished: true }))).toBe(false);
    expect(keysWork(race("racing"), mine({ spin: 12 }))).toBe(false);
  });

  it("is not for a phase the page does not know", () => {
    expect(keysWork(race("warming-up"), mine())).toBe(false);
  });
});
