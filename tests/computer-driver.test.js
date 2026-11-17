// Tests for shared/computer-driver.js: how computer karts decide what to do.
//
// Each test builds the situation a kart is in (a "view") and checks which
// action scores highest, or which keys come out. The views are made by hand,
// so a test says exactly what the kart sees.

import { describe, it, expect } from "vitest";
import {
  PERSONALITIES,
  PERSONALITY_OF_CHARACTER,
  personalityOf,
  FOLLOW_SCORE,
  STUCK_STEPS,
  RECOVER_STEPS,
  SIDE_STEP,
  createComputerDriver,
  lookAround,
  scoreActions,
  bestAction,
  brakeScore,
  bendSpeed,
  overtakeScore,
  dodgeScore,
  keysFor,
  decide,
  followSegment,
} from "../shared/computer-driver.js";
import { createRacer } from "../shared/race.js";
import { CAST } from "../shared/cast.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { CAMPUS_LOOP } from "../shared/tracks/campus-loop.js";
import { lookOfTrack } from "../client/track-looks.js";
import { routePoints } from "../client/route.js";

const DAREDEVIL = PERSONALITIES.find((each) => each.name === "Daredevil");
const CAREFUL = PERSONALITIES.find((each) => each.name === "Careful");
const OVAL_LINE = routePoints(TEST_OVAL, lookOfTrack(TEST_OVAL).route);
const CAMPUS_LINE = routePoints(CAMPUS_LOOP, lookOfTrack(CAMPUS_LOOP).route);

/** A calm view on a straight road: nothing in the way, a gentle bend far away. */
function calmView(changes = {}) {
  return {
    speed: 200,
    topSpeed: 300,
    target: { x: 500, y: 100 },
    lineAngle: 0,
    bend: { turn: 0, distance: 500 },
    kartAhead: null,
    bananaAhead: null,
    roomLeft: true,
    roomRight: true,
    stuck: false,
    recovering: false,
    ...changes,
  };
}

/** A kart at a spot, pointing right (angle 0), moving at a speed. */
function kartAt(x, y, speed = 200, angle = 0) {
  return { x, y, angle, vx: speed * Math.cos(angle), vy: speed * Math.sin(angle) };
}

/** A racer on the test oval with its kart put at a spot. */
function racerAt(kart, spinSteps = 0) {
  return { ...createRacer(TEST_OVAL), kart: { ...createRacer(TEST_OVAL).kart, ...kart }, spinSteps };
}

describe("the personalities", () => {
  it("are six different ways of driving, with weights in range", () => {
    expect(PERSONALITIES).toHaveLength(6);
    expect(new Set(PERSONALITIES.map((each) => each.name)).size).toBe(6);
    for (const each of PERSONALITIES) {
      expect(each.daring).toBeGreaterThanOrEqual(0);
      expect(each.daring).toBeLessThanOrEqual(1);
      expect(each.care).toBeGreaterThanOrEqual(0);
      expect(each.care).toBeLessThanOrEqual(1);
      expect(each.pace).toBeGreaterThanOrEqual(0.8);
      expect(each.pace).toBeLessThanOrEqual(1);
    }
  });

  it("cannot be changed by other code", () => {
    expect(Object.isFrozen(PERSONALITIES)).toBe(true);
    expect(PERSONALITIES.every((each) => Object.isFrozen(each))).toBe(true);
    expect(Object.isFrozen(PERSONALITY_OF_CHARACTER)).toBe(true);
  });

  it("give every character of the cast its own way of driving", () => {
    const names = CAST.map((character) => personalityOf(character.id)?.name);
    expect(names.every((name) => typeof name === "string"), names.join()).toBe(true);
    expect(new Set(names).size).toBe(CAST.length);
  });

  it("only name personalities that exist, and only characters that exist", () => {
    for (const [id, name] of Object.entries(PERSONALITY_OF_CHARACTER)) {
      expect(CAST.some((character) => character.id === id), id).toBe(true);
      expect(PERSONALITIES.some((each) => each.name === name), name).toBe(true);
    }
  });

  it("give no personality to a name that is not a character", () => {
    for (const id of ["", "PCP", "nobody", "toString", "__proto__", null, undefined, 3]) {
      expect(personalityOf(id), String(id)).toBe(null);
    }
  });
});

describe("choosing the action with the highest score", () => {
  it("picks the highest score", () => {
    expect(bestAction({ follow: 0.3, brake: 0.1, overtake: 0.7, dodge: 0.2, recover: 0 })).toBe("overtake");
  });

  it("keeps following the racing line when nothing scores higher", () => {
    expect(bestAction({ follow: FOLLOW_SCORE, brake: 0, overtake: 0, dodge: 0, recover: 0 })).toBe("follow");
    expect(bestAction(scoreActions(calmView(), DAREDEVIL))).toBe("follow");
  });

  it("on a tie, keeps the first in the list (follow) rather than switching", () => {
    expect(bestAction({ follow: 0.3, brake: 0.3, overtake: 0, dodge: 0, recover: 0 })).toBe("follow");
  });

  it("gives every action a score from 0 to 1", () => {
    const busy = calmView({
      speed: 300,
      bend: { turn: 2.5, distance: 30 },
      kartAhead: { ahead: 10, sideways: 5 },
      bananaAhead: { ahead: 5, sideways: 0 },
      stuck: true,
    });
    for (const personality of PERSONALITIES) {
      for (const [action, score] of Object.entries(scoreActions(busy, personality))) {
        expect(score, `${personality.name} ${action}`).toBeGreaterThanOrEqual(0);
        expect(score, `${personality.name} ${action}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("braking for bends", () => {
  it("does not brake on a straight", () => {
    expect(brakeScore(calmView({ speed: 300, bend: { turn: 0, distance: 20 } }), 0.5, 0.5)).toBe(0);
  });

  it("brakes when a sharp bend is close and the kart is too fast for it", () => {
    const view = calmView({ speed: 300, bend: { turn: Math.PI / 2, distance: 60 } });
    expect(brakeScore(view, 0.5, 0.5)).toBeGreaterThan(FOLLOW_SCORE);
    expect(bestAction(scoreActions(view, PERSONALITIES[1]))).toBe("brake");
  });

  it("does not brake for a sharp bend that is still far away", () => {
    expect(brakeScore(calmView({ speed: 300, bend: { turn: Math.PI / 2, distance: 900 } }), 0.5, 0.5)).toBe(0);
  });

  it("does not brake when already slow enough for the bend", () => {
    expect(brakeScore(calmView({ speed: 60, bend: { turn: Math.PI / 2, distance: 40 } }), 0.5, 0.5)).toBe(0);
  });

  it("lets a daring driver take a bend faster than a careful one", () => {
    const view = calmView({ bend: { turn: Math.PI / 2, distance: 100 } });
    expect(bendSpeed(view, DAREDEVIL.daring)).toBeGreaterThan(bendSpeed(view, CAREFUL.daring));
  });

  it("makes a careful driver start braking further from the bend", () => {
    // Fast, a sharp bend 230 units away. The careful driver brakes from
    // about 275 units at this speed, the daredevil from about 196: the
    // careful one is already braking, the daredevil not yet.
    const view = calmView({ speed: 300, bend: { turn: Math.PI / 2, distance: 230 } });
    expect(brakeScore(view, CAREFUL.daring, CAREFUL.care)).toBeGreaterThan(0);
    expect(brakeScore(view, DAREDEVIL.daring, DAREDEVIL.care)).toBe(0);
  });
});

describe("overtaking", () => {
  it("does not overtake when no kart is in front", () => {
    expect(overtakeScore(calmView(), 1)).toBe(0);
  });

  it("overtakes a kart close in front when there is room beside it", () => {
    const view = calmView({ kartAhead: { ahead: 30, sideways: 4 } });
    expect(overtakeScore(view, 0.5)).toBeGreaterThan(FOLLOW_SCORE);
    expect(bestAction(scoreActions(view, DAREDEVIL))).toBe("overtake");
  });

  it("does not try to overtake when there is wall on both sides", () => {
    const view = calmView({ kartAhead: { ahead: 30, sideways: 4 }, roomLeft: false, roomRight: false });
    expect(overtakeScore(view, 1)).toBe(0);
  });

  it("is more eager when the kart in front is closer, and when the driver is more daring", () => {
    const close = calmView({ kartAhead: { ahead: 20, sideways: 0 } });
    const far = calmView({ kartAhead: { ahead: 120, sideways: 0 } });
    expect(overtakeScore(close, 0.5)).toBeGreaterThan(overtakeScore(far, 0.5));
    expect(overtakeScore(close, DAREDEVIL.daring)).toBeGreaterThan(overtakeScore(close, CAREFUL.daring));
  });

  it("passes on the side away from the kart in front, and on the other side if that one is blocked", () => {
    const kart = kartAt(100, 100);
    // The kart in front is a little to the right: aim to the left of the line, so steer left.
    const passLeft = keysFor("overtake", calmView({ target: { x: 200, y: 100 }, kartAhead: { ahead: 30, sideways: 6 } }), kart, DAREDEVIL);
    expect(passLeft).toMatchObject({ gas: true, left: true, right: false });
    // The same, but wall on the left: pass on the right.
    const passRight = keysFor(
      "overtake",
      calmView({ target: { x: 200, y: 100 }, kartAhead: { ahead: 30, sideways: 6 }, roomLeft: false }),
      kart,
      DAREDEVIL,
    );
    expect(passRight).toMatchObject({ gas: true, left: false, right: true });
  });
});

describe("dodging bananas", () => {
  it("does not dodge when there is no banana on the way", () => {
    expect(dodgeScore(calmView(), 1)).toBe(0);
  });

  it("dodges a banana right in front, before anything else but getting unstuck", () => {
    const view = calmView({ bananaAhead: { ahead: 20, sideways: 0 }, kartAhead: { ahead: 100, sideways: 0 } });
    for (const personality of PERSONALITIES) {
      expect(bestAction(scoreActions(view, personality)), personality.name).toBe("dodge");
    }
  });

  it("is more urgent the closer the banana, and a careful driver dodges earlier", () => {
    const close = calmView({ bananaAhead: { ahead: 30, sideways: 0 } });
    const far = calmView({ bananaAhead: { ahead: 200, sideways: 0 } });
    expect(dodgeScore(close, 0.5)).toBeGreaterThan(dodgeScore(far, 0.5));
    expect(dodgeScore(far, CAREFUL.care)).toBeGreaterThan(dodgeScore(far, DAREDEVIL.care));
  });

  it("steers away from the banana: one on the left sends the kart right, and the other way round", () => {
    const kart = kartAt(100, 100);
    const target = { x: 200, y: 100 };
    expect(keysFor("dodge", calmView({ target, bananaAhead: { ahead: 40, sideways: -5 } }), kart, CAREFUL)).toMatchObject({ right: true, left: false });
    expect(keysFor("dodge", calmView({ target, bananaAhead: { ahead: 40, sideways: 5 } }), kart, CAREFUL)).toMatchObject({ left: true, right: false });
  });
});

describe("getting unstuck", () => {
  it("counts a kart as stuck only after it has stood still for a while", () => {
    let memory = createComputerDriver(CAREFUL).memory;
    const stopped = racerAt({ x: 100, y: 80, vx: 0, vy: 0, angle: 0 });
    for (let step = 1; step < STUCK_STEPS; step++) {
      const seen = lookAround(TEST_OVAL, stopped, memory, OVAL_LINE, [], [], TEST_DRIVER);
      expect(seen.view.stuck, `step ${step}`).toBe(false);
      memory = seen.memory;
    }
    const last = lookAround(TEST_OVAL, stopped, memory, OVAL_LINE, [], [], TEST_DRIVER);
    expect(last.view.stuck).toBe(true);
    expect(last.memory.recoverSteps).toBe(RECOVER_STEPS);
  });

  it("does not count a spinning kart as stuck: the spin will end by itself", () => {
    let memory = createComputerDriver(CAREFUL).memory;
    const spinning = racerAt({ x: 100, y: 80, vx: 0, vy: 0, angle: 0 }, 30);
    for (let step = 0; step < STUCK_STEPS + 5; step++) {
      const seen = lookAround(TEST_OVAL, spinning, memory, OVAL_LINE, [], [], TEST_DRIVER);
      expect(seen.view.stuck, `step ${step}`).toBe(false);
      memory = seen.memory;
    }
    expect(memory).toMatchObject({ stillSteps: 0, recoverSteps: 0 });
  });

  it("puts getting unstuck before everything else", () => {
    const view = calmView({ stuck: true, bananaAhead: { ahead: 5, sideways: 0 }, kartAhead: { ahead: 5, sideways: 0 } });
    expect(bestAction(scoreActions(view, DAREDEVIL))).toBe("recover");
  });

  it("backs away with the brake (which reverses once stopped), steering the other way so the nose turns to the road", () => {
    const kart = kartAt(100, 100, 0);
    const targetOnTheRight = calmView({ target: { x: 100, y: 300 } }); // straight below: a right turn
    expect(keysFor("recover", targetOnTheRight, kart, CAREFUL)).toEqual({ gas: false, brake: true, left: true, right: false });
  });
});

describe("following the racing line", () => {
  it("presses the gas below its pace and lets go above it, so the drivers are not all equally fast", () => {
    const kart = kartAt(100, 100);
    expect(keysFor("follow", calmView({ speed: 250, topSpeed: 300 }), kart, CAREFUL).gas).toBe(true);
    expect(keysFor("follow", calmView({ speed: 295, topSpeed: 300 }), kart, CAREFUL).gas).toBe(false); // above 0.9 of top speed
    expect(keysFor("follow", calmView({ speed: 288, topSpeed: 300 }), kart, DAREDEVIL).gas).toBe(true); // below 0.97
  });

  it("goes straight on when the target is straight ahead, and turns towards it otherwise", () => {
    const kart = kartAt(100, 100);
    expect(keysFor("follow", calmView({ target: { x: 300, y: 100 } }), kart, CAREFUL)).toMatchObject({ left: false, right: false });
    expect(keysFor("follow", calmView({ target: { x: 300, y: 200 } }), kart, CAREFUL)).toMatchObject({ left: false, right: true });
    expect(keysFor("follow", calmView({ target: { x: 300, y: 0 } }), kart, CAREFUL)).toMatchObject({ left: true, right: false });
  });

  it("aims at a point ahead on the line, not behind the kart", () => {
    // On the top straight of the test oval, driving right.
    const racer = racerAt({ x: 300, y: 80, vx: 200, vy: 0, angle: 0 });
    const { view } = lookAround(TEST_OVAL, racer, createComputerDriver(CAREFUL).memory, OVAL_LINE, [], [], TEST_DRIVER);
    expect(view.target.x).toBeGreaterThan(300);
  });

  it("in the CTT hairpin, stays on its own stretch even when the way out is nearer", () => {
    // The line goes east along the courtyard below the hall (row 32.5), then
    // north round its end, then west along the courtyard above it (row 27).
    // A kart that was pushed off the way in, towards the way out, must still
    // drive on to the turn, not cut across to the way out.
    const wayIn = CAMPUS_LINE.findIndex((point, index) => {
      const next = CAMPUS_LINE[(index + 1) % CAMPUS_LINE.length];
      return next.x > point.x + 300 && Math.abs(next.y - point.y) < 1;
    });
    expect(wayIn).toBeGreaterThan(-1);
    const wayOutY = CAMPUS_LINE[wayIn + 2].y;
    const kart = { x: CAMPUS_LINE[wayIn].x + 200, y: wayOutY + 40 }; // much nearer the way out
    expect(followSegment(CAMPUS_LINE, wayIn, kart)).toBe(wayIn);
  });
});

describe("seeing things in the way", () => {
  const driving = racerAt({ x: 300, y: 80, vx: 200, vy: 0, angle: 0 });
  const memory = createComputerDriver(CAREFUL).memory;
  const see = (others, bananas) => lookAround(TEST_OVAL, driving, memory, OVAL_LINE, others, bananas, TEST_DRIVER).view;

  it("sees a banana straight ahead, but not one beside the road line, behind, or far away", () => {
    expect(see([], [{ x: 360, y: 82 }]).bananaAhead).toMatchObject({ ahead: 60 });
    expect(see([], [{ x: 360, y: 80 + 80 }]).bananaAhead).toBe(null); // well to the side
    expect(see([], [{ x: 250, y: 80 }]).bananaAhead).toBe(null); // behind
    expect(see([], [{ x: 900, y: 80 }]).bananaAhead).toBe(null); // too far
  });

  it("sees the nearest kart in front", () => {
    expect(see([{ x: 420, y: 80 }, { x: 350, y: 85 }], []).kartAhead).toMatchObject({ ahead: 50, sideways: 5 });
  });
});

describe("a whole decision", () => {
  it("gives keys, the action, every score and the driver with its memory", () => {
    const driver = createComputerDriver(DAREDEVIL);
    const racer = racerAt({ x: 300, y: 80, vx: 200, vy: 0, angle: 0 });
    const result = decide(driver, TEST_OVAL, racer, OVAL_LINE, [], [], TEST_DRIVER);
    expect(Object.keys(result.keys).sort()).toEqual(["brake", "gas", "left", "right"]);
    expect(result.scores[result.action]).toBe(Math.max(...Object.values(result.scores)));
    expect(result.driver.personality).toBe(DAREDEVIL);
  });

  it("decides the same way every time from the same race, and changes nothing it was given", () => {
    const driver = createComputerDriver(DAREDEVIL);
    const racer = racerAt({ x: 300, y: 80, vx: 200, vy: 0, angle: 0 });
    const copy = JSON.stringify({ driver, racer });
    const first = decide(driver, TEST_OVAL, racer, OVAL_LINE, [{ x: 340, y: 80 }], [{ x: 380, y: 90 }], TEST_DRIVER);
    const second = decide(driver, TEST_OVAL, racer, OVAL_LINE, [{ x: 340, y: 80 }], [{ x: 380, y: 90 }], TEST_DRIVER);
    expect(second).toEqual(first);
    expect(JSON.stringify({ driver, racer })).toBe(copy);
  });

  it("only ever presses the four keys a player has", () => {
    const racer = racerAt({ x: 300, y: 80, vx: 200, vy: 0, angle: 0 });
    for (const action of ["follow", "brake", "overtake", "dodge", "recover"]) {
      const view = calmView({ kartAhead: { ahead: 30, sideways: 0 }, bananaAhead: { ahead: 40, sideways: 0 } });
      const keys = keysFor(action, view, racer.kart, PERSONALITIES[1]);
      expect(Object.keys(keys).sort(), action).toEqual(["brake", "gas", "left", "right"]);
      for (const value of Object.values(keys)) {
        expect(typeof value).toBe("boolean");
      }
    }
  });

  it("steps aside by SIDE_STEP units at most, never across the whole road", () => {
    expect(SIDE_STEP).toBeLessThan(TEST_OVAL.tileSize * 2);
  });
});
