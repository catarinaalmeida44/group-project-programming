// Tests for client/sound-cues.js: which sound belongs to which moment of a
// race, how the engine should sound, and the "sound on or off" choice.
//
// How the sounds actually sound is checked by ear, on the page
// sound-test.html. These tests check the deciding: that a beep comes with
// every number of the countdown, that a knock is a knock and braking is
// not, and that nothing plays twice or at the wrong moment.

import { describe, it, expect } from "vitest";
import { watchForSounds, engineOf, knockBetween, readSoundOn, saveSoundOn, NO_ENGINE } from "../client/sound-cues.js";

const FRAME = 1 / 60;

/** A kart driving east at a speed, as the pages hand it over. */
function kart(speed = 0, more = {}) {
  return { x: 100, y: 100, angle: 0, vx: speed, vy: 0, ...more };
}

/** The facts of one picture, with some parts changed. */
function facts(changes = {}) {
  return { label: "", kart: kart(), gas: false, onGrass: false, spinning: false, lapsDone: 0, laps: 3, finished: false, warning: false, others: [], ...changes };
}

/** Feeds a watcher one picture after the other and gives the names of all the cues, in order. */
function namesOf(watch, pictures) {
  return pictures.flatMap((picture) => watch(picture, FRAME).cues.map((cue) => cue.name));
}

/** A pretend browser storage. */
function pretendStorage(start = {}) {
  const kept = new Map(Object.entries(start));
  return {
    getItem: (key) => (kept.has(key) ? kept.get(key) : null),
    setItem: (key, value) => kept.set(key, String(value)),
  };
}

describe("the engine", () => {
  it("is silent when there is no kart to hear", () => {
    for (const nothing of [null, undefined, {}, { x: 1, y: 2 }, { x: 1, y: 2, vx: "fast", vy: 0 }]) {
      expect(engineOf({ kart: nothing })).toEqual(NO_ENGINE);
    }
    expect(NO_ENGINE.running).toBe(false);
  });

  it("idles when the kart stands still, and sings higher the faster it goes, up to top speed", () => {
    expect(engineOf({ kart: kart(0) })).toEqual({ running: true, pitch: 0, throttle: 0, grass: 0, skid: 0 });
    const slow = engineOf({ kart: kart(90) }).pitch;
    const fast = engineOf({ kart: kart(300) }).pitch;
    expect(slow).toBeGreaterThan(0);
    expect(fast).toBeGreaterThan(slow);
    expect(engineOf({ kart: kart(360) }).pitch).toBe(1);
    expect(engineOf({ kart: kart(900) }).pitch).toBe(1); // never above the top note
  });

  it("goes by the speed, whichever way the kart drives", () => {
    const east = engineOf({ kart: { x: 0, y: 0, angle: 0, vx: 200, vy: 0 } }).pitch;
    const southWest = engineOf({ kart: { x: 0, y: 0, angle: 2.4, vx: -120, vy: 160 } }).pitch;
    expect(southWest).toBeCloseTo(east);
  });

  it("sounds fuller while the gas is held, but not while spinning", () => {
    expect(engineOf({ kart: kart(100), gas: true }).throttle).toBe(1);
    expect(engineOf({ kart: kart(100), gas: false }).throttle).toBe(0);
    expect(engineOf({ kart: kart(100), gas: true, spinning: true }).throttle).toBe(0);
    for (const notYes of ["yes", 1, undefined, null]) {
      expect(engineOf({ kart: kart(100), gas: notYes }).throttle).toBe(0);
    }
  });

  it("rumbles on grass, louder the faster the kart goes, and not at all on the road", () => {
    expect(engineOf({ kart: kart(200), onGrass: false }).grass).toBe(0);
    expect(engineOf({ kart: kart(0), onGrass: true }).grass).toBe(0);
    expect(engineOf({ kart: kart(300), onGrass: true }).grass).toBeGreaterThan(engineOf({ kart: kart(100), onGrass: true }).grass);
  });

  it("squeals when the kart slides sideways or spins, and not when it drives straight", () => {
    expect(engineOf({ kart: kart(300) }).skid).toBe(0);
    // Pointing east, but moving partly south: a slide.
    const sliding = { x: 0, y: 0, angle: 0, vx: 200, vy: 120 };
    expect(engineOf({ kart: sliding }).skid).toBeGreaterThan(0.5);
    expect(engineOf({ kart: kart(250), spinning: true }).skid).toBeGreaterThan(0.5);
    // Standing still, a kart cannot squeal by sliding.
    expect(engineOf({ kart: { x: 0, y: 0, angle: 0, vx: 0, vy: 0 } }).skid).toBe(0);
  });

  it("keeps every number between 0 and 1, whatever the kart does", () => {
    for (const wild of [kart(5000), { x: 0, y: 0, angle: 99, vx: -4000, vy: 3000 }, { x: 0, y: 0, angle: NaN, vx: 10, vy: 10 }]) {
      for (const state of [{}, { gas: true, onGrass: true }, { spinning: true, onGrass: true }]) {
        const engine = engineOf({ kart: wild, ...state });
        for (const part of ["pitch", "throttle", "grass", "skid"]) {
          expect(engine[part], part).toBeGreaterThanOrEqual(0);
          expect(engine[part], part).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

describe("the countdown", () => {
  it("beeps once for each number and gives a different sound at GO", () => {
    const watch = watchForSounds();
    const pictures = [facts(), facts({ label: "3" }), facts({ label: "3" }), facts({ label: "2" }), facts({ label: "1" }), facts({ label: "GO!" }), facts({ label: "GO!" }), facts({ label: "" })];
    expect(namesOf(watch, pictures)).toEqual(["count", "count", "count", "go"]);
  });

  it("plays nothing in the very first picture, and nothing when the label goes away", () => {
    const watch = watchForSounds();
    expect(watch(facts({ label: "2" }), FRAME).cues).toEqual([]); // joined in the middle of a countdown
    expect(watch(facts({ label: "" }), FRAME).cues).toEqual([]);
  });

  it("beeps again in the next race", () => {
    const watch = watchForSounds();
    const oneCountdown = [facts({ label: "3" }), facts({ label: "2" }), facts({ label: "1" }), facts({ label: "GO!" }), facts()];
    namesOf(watch, [facts(), ...oneCountdown]);
    expect(namesOf(watch, oneCountdown)).toEqual(["count", "count", "count", "go"]);
  });
});

describe("laps and the finish", () => {
  it("chimes for a lap, announces the last lap, and plays the finish instead of a lap chime at the end", () => {
    const watch = watchForSounds();
    const pictures = [
      facts({ lapsDone: 0 }),
      facts({ lapsDone: 1 }), // lap 1 of 3 done
      facts({ lapsDone: 1 }),
      facts({ lapsDone: 2 }), // lap 2 done: the last lap begins
      facts({ lapsDone: 3, finished: true }),
      facts({ lapsDone: 3, finished: true }),
    ];
    expect(namesOf(watch, pictures)).toEqual(["lap", "lastLap", "finish"]);
  });

  it("announces the last lap of a two-lap race after the first lap, and plays only the finish in a one-lap race", () => {
    const two = watchForSounds();
    expect(namesOf(two, [facts({ laps: 2 }), facts({ laps: 2, lapsDone: 1 }), facts({ laps: 2, lapsDone: 2, finished: true })])).toEqual(["lastLap", "finish"]);
    const one = watchForSounds();
    expect(namesOf(one, [facts({ laps: 1 }), facts({ laps: 1, lapsDone: 1, finished: true })])).toEqual(["finish"]);
  });

  it("plays nothing when the laps go back to zero for a new race", () => {
    const watch = watchForSounds();
    expect(namesOf(watch, [facts({ lapsDone: 3, finished: true }), facts({ lapsDone: 0, finished: false }), facts({ lapsDone: 0 })])).toEqual([]);
  });
});

describe("bananas and warnings", () => {
  it("plays the slip once, when the spin begins", () => {
    const watch = watchForSounds();
    const pictures = [facts(), facts({ spinning: true }), facts({ spinning: true }), facts({ spinning: false }), facts({ spinning: true })];
    expect(namesOf(watch, pictures)).toEqual(["spin", "spin"]);
  });

  it("buzzes once when a warning comes up, not for as long as it stays", () => {
    const watch = watchForSounds();
    const pictures = [facts(), facts({ warning: true }), facts({ warning: true }), facts({ warning: true }), facts(), facts({ warning: true })];
    expect(namesOf(watch, pictures)).toEqual(["warning", "warning"]);
  });
});

describe("knocks", () => {
  it("hears a kart that hits a wall: the speed drops far faster than any brake could do it", () => {
    const watch = watchForSounds();
    watch(facts({ kart: kart(300) }), FRAME);
    const { cues } = watch(facts({ kart: kart(150, { x: 105 }) }), FRAME);
    expect(cues).toEqual([{ name: "bumpWall", strength: expect.any(Number) }]);
    expect(cues[0].strength).toBeGreaterThan(0.5);
  });

  it("takes it for a bump into a kart when another kart is right there, and for a wall when it is not", () => {
    const near = watchForSounds();
    near(facts({ kart: kart(300) }), FRAME);
    const withKart = near(facts({ kart: kart(200, { x: 105 }), others: [{ x: 125, y: 100 }] }), FRAME);
    expect(withKart.cues.map((cue) => cue.name)).toEqual(["bumpKart"]);

    const far = watchForSounds();
    far(facts({ kart: kart(300) }), FRAME);
    const withoutKart = far(facts({ kart: kart(200, { x: 105 }), others: [{ x: 400, y: 100 }, null, "kart", { x: "near" }] }), FRAME);
    expect(withoutKart.cues.map((cue) => cue.name)).toEqual(["bumpWall"]);
  });

  it("also hears a kart that is shoved forward from behind", () => {
    const watch = watchForSounds();
    watch(facts({ kart: kart(100) }), FRAME);
    const { cues } = watch(facts({ kart: kart(190, { x: 103 }), others: [{ x: 84, y: 100 }] }), FRAME);
    expect(cues.map((cue) => cue.name)).toEqual(["bumpKart"]);
  });

  it("plays a harder knock louder, and never louder than full strength", () => {
    expect(knockBetween(kart(300), kart(270, { x: 104 }), FRAME)).toBeLessThan(knockBetween(kart(300), kart(180, { x: 104 }), FRAME));
    expect(knockBetween(kart(360), kart(0, { x: 104 }), FRAME)).toBe(1);
    expect(knockBetween(kart(300), kart(270, { x: 104 }), FRAME)).toBeGreaterThanOrEqual(0.2); // never too quiet to hear
  });

  it("does NOT take braking, speeding up, coasting or steering for a knock", () => {
    // The hardest a kart can do by itself in one step: brake at 600, or pull away at about 650 units per second every second.
    expect(knockBetween(kart(300), kart(290, { x: 105 }), FRAME)).toBe(0); // braking
    expect(knockBetween(kart(0), kart(10.8, { x: 100.2 }), FRAME)).toBe(0); // pulling away
    expect(knockBetween(kart(300), kart(298, { x: 105 }), FRAME)).toBe(0); // coasting
    // A sharp turn at speed: the direction changes a lot, the speed hardly at all.
    const turned = { x: 105, y: 100, angle: 0.05, vx: 299, vy: 15 };
    expect(knockBetween(kart(300), turned, FRAME)).toBe(0);
  });

  it("does NOT take a kart that was put back on the grid for a knock", () => {
    const watch = watchForSounds();
    watch(facts({ kart: kart(300, { x: 2000, y: 900 }) }), FRAME);
    expect(watch(facts({ kart: kart(0, { x: 400, y: 100 }) }), FRAME).cues).toEqual([]);
  });

  it("does not repeat the knock while the kart grinds along a wall", () => {
    const watch = watchForSounds();
    const speeds = [300, 200, 110, 40, 0, 0];
    const names = speeds.flatMap((speed, i) => watch(facts({ kart: kart(speed, { x: 100 + i }) }), FRAME).cues.map((cue) => cue.name));
    expect(names).toEqual(["bumpWall"]);
  });

  it("plays the slip, not a knock, when the kart is thrown into a spin", () => {
    const watch = watchForSounds();
    watch(facts({ kart: kart(300) }), FRAME);
    const { cues } = watch(facts({ kart: kart(200, { x: 104 }), spinning: true }), FRAME);
    expect(cues.map((cue) => cue.name)).toEqual(["spin"]);
  });

  it("gives no knock without two karts to compare or without time passing", () => {
    expect(knockBetween(null, kart(300), FRAME)).toBe(0);
    expect(knockBetween(kart(300), null, FRAME)).toBe(0);
    expect(knockBetween(kart(300), kart(0, { x: 101 }), 0)).toBe(0);
    expect(knockBetween(kart(300), kart(0, { x: 101 }), NaN)).toBe(0);
    expect(knockBetween(kart(300), kart(0, { x: 101 }), -1)).toBe(0);
  });
});

describe("strange facts", () => {
  it("never breaks, and plays nothing, when the facts are missing or strange", () => {
    const watch = watchForSounds();
    for (const strange of [null, undefined, 42, "race", {}, { kart: "kart", label: 3, lapsDone: "two", others: "nobody" }, facts({ kart: null })]) {
      const answer = watch(strange, FRAME);
      expect(Array.isArray(answer.cues)).toBe(true);
      expect(answer.engine.running === true || answer.engine.running === false).toBe(true);
    }
    expect(watch(facts(), "soon").cues).toEqual([]);
  });

  it("is silent while watching without a kart, and picks up again when there is one", () => {
    const watch = watchForSounds();
    expect(watch(facts({ kart: null }), FRAME).engine).toEqual(NO_ENGINE);
    expect(watch(facts({ kart: kart(200) }), FRAME).engine.running).toBe(true);
  });
});

describe("sound on or off", () => {
  it("is on for a player who never chose", () => {
    expect(readSoundOn(pretendStorage())).toBe(true);
    expect(readSoundOn(null)).toBe(true); // a browser that keeps nothing
  });

  it("remembers off, and on again", () => {
    const storage = pretendStorage();
    expect(saveSoundOn(storage, false)).toBe(true);
    expect(readSoundOn(storage)).toBe(false);
    expect(saveSoundOn(storage, true)).toBe(true);
    expect(readSoundOn(storage)).toBe(true);
  });

  it("only takes an exact 'true' for on when saving", () => {
    const storage = pretendStorage();
    for (const notYes of ["yes", 1, undefined, null, {}]) {
      saveSoundOn(storage, notYes);
      expect(readSoundOn(storage)).toBe(false);
    }
  });

  it("ignores a saved value that was changed by hand or is broken, and says false when the browser refuses to save", () => {
    for (const broken of ["{not json", "42", '"off"', "[]", '{"on":"false"}', '{"on":0}', '{"volume":3}']) {
      expect(readSoundOn(pretendStorage({ "kart-sound": broken })), broken).toBe(true);
    }
    expect(readSoundOn(pretendStorage({ "kart-sound": '{"on":false}' }))).toBe(false);
    expect(saveSoundOn(null, false)).toBe(false);
    const refusing = { getItem: () => null, setItem: () => { throw new Error("full"); } };
    expect(saveSoundOn(refusing, false)).toBe(false);
  });
});
