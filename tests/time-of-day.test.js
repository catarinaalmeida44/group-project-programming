// Tests for the time of day (client/time-of-day.js), the fly-over
// (client/fly-over.js) and the "How to play" card's words (client/how-to-play.js).

import { describe, it, expect } from "vitest";
import {
  TIMES,
  DEFAULT_TIME,
  TIME_WORDS,
  TIME_SENTENCE,
  TIME_LOOKS,
  isTimeOfDay,
  readTimeOfDay,
  saveTimeOfDay,
  mixColours,
  lookAtTime,
} from "../client/time-of-day.js";
import { createFlyOver, FLY_SPEED } from "../client/fly-over.js";
import { howToPlayWords, hasSeenHowToPlay, rememberHowToPlaySeen, PAGE_MODES } from "../client/how-to-play.js";
import { lookOfTrack } from "../client/track-looks.js";
import { routePoints } from "../client/route.js";
import { TRACKS } from "../shared/tracks/index.js";
import { tileKindAt } from "../shared/track.js";

/** A pretend browser storage. */
function pretendStorage(start = {}) {
  const kept = new Map(Object.entries(start));
  return { getItem: (key) => (kept.has(key) ? kept.get(key) : null), setItem: (key, value) => kept.set(key, value), kept };
}

const isColour = (text) => /^#[0-9a-f]{6}$/i.test(text) || /^rgba?\([\d\s.,]+\)$/.test(text);

describe("the times of day", () => {
  it("are morning, afternoon, sunset and night, and the afternoon is the game as it always looked", () => {
    expect(TIMES).toEqual(["morning", "afternoon", "sunset", "night"]);
    expect(DEFAULT_TIME).toBe("afternoon");
    expect(TIME_WORDS).toEqual({ morning: "Morning", afternoon: "Afternoon", sunset: "Sunset", night: "Night" });
    expect(Object.isFrozen(TIMES)).toBe(true);
  });

  it("have a sentence for each: races will be in the morning, at sunset ...", () => {
    expect(TIME_SENTENCE).toEqual({ morning: "in the morning", afternoon: "in the afternoon", sunset: "at sunset", night: "at night" });
  });

  it("are only the exact words", () => {
    for (const time of TIMES) {
      expect(isTimeOfDay(time)).toBe(true);
    }
    for (const wrong of ["Sunset", "noon", "", null, 3, "toString"]) {
      expect(isTimeOfDay(wrong), String(wrong)).toBe(false);
    }
  });

  it("are remembered, and anything saved that is not a time counts as the afternoon", () => {
    expect(readTimeOfDay(pretendStorage())).toBe("afternoon");
    expect(readTimeOfDay(null)).toBe("afternoon");
    expect(readTimeOfDay(pretendStorage({ "kart-time-of-day": '{"time":"dawn"}' }))).toBe("afternoon");
    expect(readTimeOfDay(pretendStorage({ "kart-time-of-day": "junk" }))).toBe("afternoon");
    const storage = pretendStorage();
    expect(saveTimeOfDay(storage, "sunset")).toBe(true);
    expect(readTimeOfDay(storage)).toBe("sunset");
  });

  it("refuse to remember something that is not a time", () => {
    const storage = pretendStorage();
    expect(() => saveTimeOfDay(storage, "Sunset")).toThrow(/no time of day/);
    expect(storage.kept.size).toBe(0);
  });
});

describe("mixing colours", () => {
  it("goes from the first colour to the second", () => {
    expect(mixColours("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixColours("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mixColours("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixColours("#ff0000", "#0000ff", 0.25)).toBe("#bf0040");
  });

  it("keeps the share from 0 to 1, and leaves colours written another way as they are", () => {
    expect(mixColours("#000000", "#ffffff", 7)).toBe("#ffffff");
    expect(mixColours("#000000", "#ffffff", -1)).toBe("#000000");
    expect(mixColours("rgba(1, 2, 3, 0.5)", "#ffffff", 0.5)).toBe("rgba(1, 2, 3, 0.5)");
    expect(mixColours("#123456", "red", 0.5)).toBe("#123456");
  });
});

describe("a track's look at a time of day", () => {
  for (const [name, track] of Object.entries(TRACKS)) {
    const look = lookOfTrack(track);

    it(`${name}: the afternoon is exactly the look as it was`, () => {
      expect(lookAtTime(look, "afternoon")).toBe(look);
    });

    it(`${name}: every other time changes the sky and lays a light over the picture, with real colours`, () => {
      for (const time of ["morning", "sunset", "night"]) {
        const changed = lookAtTime(look, time);
        expect(changed.sky.top, time).not.toBe(look.sky.top);
        expect(isColour(changed.sky.top)).toBe(true);
        expect(isColour(changed.sky.low)).toBe(true);
        expect(isColour(changed.haze)).toBe(true);
        expect(isColour(changed.beyond)).toBe(true);
        expect(isColour(changed.light.colour)).toBe(true);
        expect(changed.light.alpha).toBeGreaterThan(0);
        expect(changed.light.alpha).toBeLessThan(0.7); // never so dark that the road cannot be seen
        for (const band of changed.far) {
          expect(isColour(band.colour), `${time} ${band.kind}`).toBe(true);
        }
      }
    });

    it(`${name}: changes nothing it was given`, () => {
      const before = JSON.stringify(look);
      for (const time of TIMES) {
        lookAtTime(look, time);
      }
      expect(JSON.stringify(look)).toBe(before);
    });
  }

  it("puts the sun in the east in the morning and low in the west at sunset, and a moon and stars at night", () => {
    const look = lookOfTrack(TRACKS["nova-lap"]);
    const morning = lookAtTime(look, "morning").sky;
    const sunset = lookAtTime(look, "sunset").sky;
    const night = lookAtTime(look, "night").sky;
    expect(Math.cos(morning.sunTowards)).toBeGreaterThan(0.5); // east is angle 0
    expect(Math.cos(sunset.sunTowards)).toBeLessThan(-0.5); //   west is half a turn
    expect(sunset.sunHeight).toBeLessThan(morning.sunHeight);
    expect(sunset.sunHeight).toBeLessThan(look.sky.sunHeight);
    expect(night.moon).toBe(true);
    expect(night.stars).toBe(true);
    expect(morning.stars).not.toBe(true);
  });

  it("makes shadows fall away from the sun: longest at sunset, shortest at night", () => {
    const look = lookOfTrack(TRACKS["nova-lap"]);
    const length = (time) => Math.hypot(lookAtTime(look, time).sun.reach.x, lookAtTime(look, time).sun.reach.y);
    expect(length("sunset")).toBeGreaterThan(length("morning"));
    expect(length("morning")).toBeGreaterThan(length("afternoon"));
    expect(length("night")).toBeLessThan(length("afternoon"));
    // In the morning the sun is in the east, so shadows fall to the west (x below 0); at sunset to the east.
    expect(lookAtTime(look, "morning").sun.reach.x).toBeLessThan(0);
    expect(lookAtTime(look, "sunset").sun.reach.x).toBeGreaterThan(0);
  });

  it("gives the beach and the sea of the Nova lap the light too, keeping which bands are water", () => {
    const look = lookOfTrack(TRACKS["nova-lap"]);
    const sunset = lookAtTime(look, "sunset");
    expect(sunset.shore.bands.map((band) => band.from)).toEqual(look.shore.bands.map((band) => band.from));
    expect(sunset.shore.bands.map((band) => band.water)).toEqual(look.shore.bands.map((band) => band.water));
    expect(sunset.shore.bands[0].colour).not.toBe(look.shore.bands[0].colour);
  });

  it("refuses a time that does not exist", () => {
    expect(() => lookAtTime(lookOfTrack(TRACKS["nova-lap"]), "dawn")).toThrow(/no time of day/);
  });

  it("has a light for every time but the afternoon", () => {
    expect(Object.keys(TIME_LOOKS).sort()).toEqual(["morning", "night", "sunset"]);
  });
});

describe("the fly-over", () => {
  for (const [name, track] of Object.entries(TRACKS)) {
    const points = routePoints(track, lookOfTrack(track).route);

    it(`${name}: goes once round the whole route and comes back where it started`, () => {
      const fly = createFlyOver(points, track.start);
      expect(fly.length).toBeGreaterThan(0);
      const start = fly.placeAt(0);
      const round = fly.placeAt(fly.length);
      expect(round.x).toBeCloseTo(start.x, 6);
      expect(round.y).toBeCloseTo(start.y, 6);
    });

    it(`${name}: never flies over a wall: every spot along the way is on the track's road or ground`, () => {
      const fly = createFlyOver(points, track.start);
      for (let distance = 0; distance < fly.length; distance += 25) {
        const { x, y } = fly.placeAt(distance);
        expect(tileKindAt(track, x, y), `${Math.round(distance)} units round`).not.toBe("wall");
      }
    });

    it(`${name}: moves smoothly, never jumping, and never turns sharply between two moments`, () => {
      const fly = createFlyOver(points, track.start);
      const step = FLY_SPEED / 60; // one picture at 60 pictures a second
      let before = fly.placeAt(0);
      for (let distance = step; distance < fly.length; distance += step) {
        const now = fly.placeAt(distance);
        expect(Math.hypot(now.x - before.x, now.y - before.y)).toBeLessThanOrEqual(step + 1e-6);
        const turned = Math.abs(Math.atan2(Math.sin(now.angle - before.angle), Math.cos(now.angle - before.angle)));
        expect(turned, `${Math.round(distance)} units round`).toBeLessThan(0.35);
        before = now;
      }
    });
  }

  it("goes round and round, also backwards", () => {
    const fly = createFlyOver([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
    expect(fly.length).toBe(400);
    expect(fly.placeAt(450)).toEqual(fly.placeAt(50));
    expect(fly.placeAt(-50).x).toBeCloseTo(fly.placeAt(350).x, 9);
  });

  it("stays at the start of the track when there is no route to fly", () => {
    for (const points of [null, [], [{ x: 1, y: 2 }]]) {
      expect(createFlyOver(points, { x: 5, y: 6, angle: 1 }).placeAt(123)).toEqual({ x: 5, y: 6, angle: 1 });
    }
  });
});

describe("the How to play card", () => {
  it("has words for each race page: a single race, two players, online", () => {
    expect(PAGE_MODES).toEqual(["single", "double", "online"]);
    for (const mode of PAGE_MODES) {
      const words = howToPlayWords(mode);
      expect(words.title).toBe("How to play");
      expect(words.goal.length).toBeGreaterThan(20);
      expect(words.keys.length).toBeGreaterThanOrEqual(6);
      expect(words.tips.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("tells the keys each page really has", () => {
    const keysOf = (mode) => howToPlayWords(mode).keys.map((each) => each.key);
    expect(keysOf("single")).toEqual(expect.arrayContaining(["↑", "↓", "← →", "R", "V", "M", "F"]));
    expect(keysOf("double")).toEqual(expect.arrayContaining(["↑ ↓ ← →", "W S A D", "R"]));
    expect(keysOf("online")).toEqual(expect.arrayContaining(["Enter"]));
    expect(keysOf("online")).not.toContain("R"); // online, the race is not started again by one player
    expect(keysOf("single")).not.toContain("W S A D");
  });

  it("explains the checkpoints first, because a lap does not count without them", () => {
    for (const mode of PAGE_MODES) {
      expect(howToPlayWords(mode).tips[0]).toMatch(/yellow/);
    }
  });

  it("refuses a page that does not exist", () => {
    expect(() => howToPlayWords("cup")).toThrow(/no race page/);
  });

  it("is remembered as seen, so it comes by itself only the first time", () => {
    const storage = pretendStorage();
    expect(hasSeenHowToPlay(storage)).toBe(false);
    expect(rememberHowToPlaySeen(storage)).toBe(true);
    expect(hasSeenHowToPlay(storage)).toBe(true);
    expect(hasSeenHowToPlay(pretendStorage({ "kart-how-to-play-seen": '{"seen":"yes"}' }))).toBe(false); // only an exact yes
  });
});
