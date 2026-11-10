// Tests for shared/numbers.js
//
// How to read a test:
//   it("says what should happen", () => { expect(what we got).toBe(what we wanted); });
// If what we got is different from what we wanted, the test fails.

import { describe, it, expect } from "vitest";
import { clamp } from "../shared/numbers.js";

describe("clamp keeps a number between a lowest and a highest value", () => {
  it("leaves a number alone when it is already inside the limits", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it("lowers a number that is too high to the highest allowed value", () => {
    expect(clamp(120, 0, 100)).toBe(100);
  });

  it("raises a number that is too low to the lowest allowed value", () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it("leaves a number alone when it is exactly on a limit", () => {
    expect(clamp(0, 0, 100)).toBe(0);
    expect(clamp(100, 0, 100)).toBe(100);
  });

  it("works with negative limits, like a reversing speed", () => {
    expect(clamp(-80, -30, 100)).toBe(-30);
  });

  it("works when the lowest and the highest are the same number", () => {
    expect(clamp(7, 3, 3)).toBe(3);
  });
});

describe("clamp refuses bad input", () => {
  it("refuses limits that are the wrong way round", () => {
    expect(() => clamp(50, 100, 0)).toThrow(RangeError);
  });

  it("refuses a value that is not a number", () => {
    expect(() => clamp("fast", 0, 100)).toThrow(TypeError);
    expect(() => clamp(undefined, 0, 100)).toThrow(TypeError);
  });

  it("refuses NaN, the 'not a number' result of a broken calculation", () => {
    expect(() => clamp(NaN, 0, 100)).toThrow(TypeError);
  });

  it("refuses a limit that is not a number", () => {
    expect(() => clamp(50, "low", 100)).toThrow(TypeError);
    expect(() => clamp(50, 0, NaN)).toThrow(TypeError);
  });
});
