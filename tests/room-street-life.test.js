// Tests for what happens on a track with ramps and walkers during a whole
// race: in an online room (server/room.js) and in the single race against
// computer karts (shared/practice-race.js). What a room tells the browsers
// about them, a kart jumping and a walker being toppled in a room, and
// everything a browser must NOT be able to do about them.
// No network is used here, except for the last two tests, which use a real
// copy of the server. (The rules themselves are tested in ramps.test.js and
// walkers.test.js.)

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { createRoom, MAX_PLAYERS } from "../server/room.js";
import { readClientMessage } from "../server/messages.js";
import { createApp } from "../server/app.js";
import { attachOnlinePlay, ONLINE_ADDRESS } from "../server/online.js";
import { JUMP_STEPS, BOOST_STEPS, BOOST_SHARE, rampAt } from "../shared/ramps.js";
import {
  WALKER_RADIUS,
  DOWN_STEPS,
  TOPPLE_SPEED,
  SPEED_KEPT_AFTER_WALKER,
  createWalkers,
  walkerAt,
  walkerSpots,
} from "../shared/walkers.js";
import { createPracticeRace, stepPracticeRace } from "../shared/practice-race.js";
import { createComputerDriver, decide, personalityOf } from "../shared/computer-driver.js";
import { COUNTDOWN_STEPS } from "../shared/countdown.js";
import { createRacer, KART_RADIUS } from "../shared/race.js";
import { createKart, speedOf, topSpeedOf } from "../shared/physics.js";
import { SPIN_STEPS } from "../shared/hazards.js";
import { createTrack } from "../shared/track.js";
import { gridSpot } from "../shared/grid.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { createSprintTrack } from "./sprint-track.js";

// ---- A street with a ramp and three walkers ----
//
// A straight street, 50 squares of 48 units long and three squares wide,
// with wall all round. The karts start at the left end, pointing right.
// The kart on pole (the host of a room, the player of a single race) stands
// at y=102 and drives straight along that line when only the gas is held.
//
//   the ramp   column 6, row 2: the square from x=288..336, y=96..144,
//              driven to the right. Both karts of the front row drive over it
//   walker 0   walks towards the karts along the line of pole, from x=528
//              to x=384. That is under the flight from the ramp
//   walker 1   does the same far down the street, from x=1920 to x=1056:
//              well beyond the landing, so a kart meets it on its wheels
//   walker 2   walks to and fro near the far end, beside the line of pole.
//              Nobody drives into it. It starts halfway into its round

const COLUMNS = 50;
const WALL_ROW = "#".repeat(COLUMNS);
const ROAD_ROW = "#" + ".".repeat(COLUMNS - 2) + "#";

function streetDescription() {
  return {
    name: "Street test track",
    tileSize: 48,
    laps: 1,
    map: [WALL_ROW, ROAD_ROW, ROAD_ROW, ROAD_ROW, WALL_ROW],
    start: { column: 2, row: 2, angle: 0 },
    checkpoints: [
      { name: "finish line", column: 47, row: 1, columns: 1, rows: 3 },
      { name: "first", column: 20, row: 1, columns: 1, rows: 3 },
      { name: "second", column: 35, row: 1, columns: 1, rows: 3 },
    ],
    ramps: [{ column: 6, row: 2, angle: 0 }],
    walkers: [
      { path: [[11, 2.125], [8, 2.125]] },
      { path: [[40, 2.125], [22, 2.125]] },
      { path: [[44, 1.3], [46, 1.3]], startShare: 0.5 },
    ],
  };
}

const STREET = createTrack(streetDescription());
// The same street with nothing on it, to compare with.
const BARE_STREET = createTrack({ ...streetDescription(), ramps: [], walkers: [] });

const GAS = { gas: true, brake: false, left: false, right: false };
const ALL_KEYS = { gas: true, brake: true, left: true, right: true };
const NO_KEYS = { gas: false, brake: false, left: false, right: false };
const REACH = KART_RADIUS + WALKER_RADIUS; // closer than this, a kart touches a walker
const TOP_SPEED = topSpeedOf(TEST_DRIVER);
const FRESH_WALKERS = [
  { time: 0, down: 0 },
  { time: 0, down: 0 },
  { time: 0, down: 0 },
];

const kartOf = (room, id) => room.snapshot().karts.find((kart) => kart.id === id);

function run(room, steps, everyStep = () => {}) {
  for (let step = 0; step < steps; step++) {
    room.step();
    everyStep();
  }
}

/** A room on the street where the host has started a race and GO has just been given. Gives { room, host }. */
function raceAtGo(track = STREET, limits = {}) {
  const room = createRoom(track, TEST_DRIVER, MAX_PLAYERS, null, limits);
  const host = room.addPlayer().id;
  room.startRace(host);
  run(room, COUNTDOWN_STEPS);
  return { room, host };
}

/**
 * A race on the street in which the host holds the gas from GO. Runs it
 * until "until(update)" says yes, for at most ten seconds. Gives
 * { room, host, steps }: "steps" is how many steps after GO that was.
 */
function driveUntil(until, limits = {}) {
  const { room, host } = raceAtGo(STREET, limits);
  room.setKeys(host, GAS);
  let steps = 0;
  while (steps < 600 && !until(room.snapshot())) {
    room.step();
    steps++;
  }
  expect(until(room.snapshot()), "the moment the test waits for never came").toBe(true);
  return { room, host, steps };
}

const hostIsInTheAir = (update) => update.karts[0].air > 0;
const walkerOneIsDown = (update) => update.walkers[1].down > 0;

/** Where walker "number" of the street is, from what an update says about it. */
function walkerIn(update, number) {
  const { time, down } = update.walkers[number];
  return walkerAt(STREET, number, { time, downSteps: down });
}

// ---- What a room tells the browsers ----

describe("the update of a room on a track with walkers", () => {
  it("lists what is remembered about every walker: its own clock, and how long it still sits on the ground", () => {
    const room = createRoom(STREET, TEST_DRIVER);
    room.addPlayer();
    const update = room.snapshot();
    expect(update.walkers).toEqual(FRESH_WALKERS);
    for (const walker of update.walkers) {
      expect(Object.keys(walker).sort()).toEqual(["down", "time"]);
    }
  });

  it("lists them even in an empty room", () => {
    expect(createRoom(STREET, TEST_DRIVER).snapshot().walkers).toEqual(FRESH_WALKERS);
  });

  it("is enough for a browser to work out where each walker is, with the shared rules", () => {
    const { room } = raceAtGo();
    run(room, 90);
    const update = room.snapshot();
    const first = walkerIn(update, 0);
    expect(first.y).toBeCloseTo(102);
    expect(first.x).toBeLessThan(528); // it has set off towards the karts
    expect(first.x).toBeGreaterThan(384);
    expect(first.outside).toBe(true);
  });

  it("can be turned into text and back without losing anything", () => {
    const { room } = driveUntil(walkerOneIsDown);
    const update = room.snapshot();
    expect(JSON.parse(JSON.stringify(update))).toEqual(update);
  });

  it("cannot be used to change the room: changing a copy changes nothing", () => {
    const { room } = raceAtGo();
    run(room, 10);
    const update = room.snapshot();
    update.walkers[0].down = 99;
    update.walkers[1].time = 5000;
    update.walkers.length = 1;
    expect(room.snapshot().walkers).toEqual([
      { time: 10, down: 0 },
      { time: 10, down: 0 },
      { time: 10, down: 0 },
    ]);
  });
});

describe("the update of a room on a track without walkers", () => {
  it("has no list of walkers at all, at any moment of a race", () => {
    for (const track of [TEST_OVAL, createSprintTrack(), BARE_STREET]) {
      const room = createRoom(track, TEST_DRIVER);
      const host = room.addPlayer().id;
      expect("walkers" in room.snapshot(), track.name).toBe(false);
      room.startRace(host);
      room.setKeys(host, GAS);
      run(room, COUNTDOWN_STEPS + 120, () => {
        expect("walkers" in room.snapshot()).toBe(false);
      });
    }
  });

  it("has the same parts as before walkers and ramps existed", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER);
    room.addPlayer();
    const update = room.snapshot();
    expect(Object.keys(update).sort()).toEqual(["bananas", "endsIn", "karts", "race", "step", "type"]);
    expect(Object.keys(update.karts[0]).sort()).toEqual(
      ["angle", "finished", "id", "lapSteps", "lapsDone", "passed", "place", "spin", "steps", "vx", "vy", "x", "y"].sort(),
    );
  });
});

// ---- When the walkers walk ----

describe("when the walkers of a room walk", () => {
  it("is not while the room is open: they stand still, however long people wait and whatever keys they hold", () => {
    const room = createRoom(STREET, TEST_DRIVER);
    const player = room.addPlayer().id;
    room.setKeys(player, ALL_KEYS);
    run(room, 60 * 10, () => {
      expect(room.snapshot().walkers).toEqual(FRESH_WALKERS);
    });
  });

  it("is not during 3, 2 and 1", () => {
    const room = createRoom(STREET, TEST_DRIVER);
    const host = room.addPlayer().id;
    room.startRace(host);
    room.setKeys(host, ALL_KEYS);
    expect(room.snapshot().walkers).toEqual(FRESH_WALKERS);
    run(room, COUNTDOWN_STEPS, () => {
      expect(room.snapshot().walkers).toEqual(FRESH_WALKERS);
    });
  });

  it("is from GO: one step of every walker's clock for each step of the race", () => {
    const { room } = raceAtGo();
    for (let step = 1; step <= 200; step++) {
      room.step();
      expect(room.snapshot().walkers).toEqual([
        { time: step, down: 0 },
        { time: step, down: 0 },
        { time: step, down: 0 },
      ]);
    }
  });

  it("goes on after the race is over, like the karts that roll out, until the next start", () => {
    const { room, host } = raceAtGo(STREET, { raceLimitSteps: 30 });
    run(room, 30);
    expect(room.phase()).toBe("finished");
    const clockThen = room.snapshot().walkers[2].time;
    run(room, 50);
    expect(room.snapshot().walkers[2].time).toBe(clockThen + 50);
    expect(room.startRace(host)).toBe(true);
    expect(room.snapshot().walkers).toEqual(FRESH_WALKERS);
  });

  it("starts afresh with every new race: clocks at zero and everybody standing up", () => {
    // A race that is over two seconds after its first walker was toppled.
    const toppledAfter = driveUntil(walkerOneIsDown).steps;
    const { room, host } = driveUntil(walkerOneIsDown, { raceLimitSteps: toppledAfter + 120 });
    expect(room.snapshot().walkers[1].down).toBe(DOWN_STEPS);
    run(room, 120);
    expect(room.phase()).toBe("finished");
    expect(room.snapshot().walkers[1].down).toBeGreaterThan(0); // still sitting when the race ended
    expect(room.snapshot().walkers[0].time).toBeGreaterThan(300);

    expect(room.startRace(host)).toBe(true);
    expect(room.snapshot().walkers).toEqual(FRESH_WALKERS);
    run(room, COUNTDOWN_STEPS, () => {
      expect(room.snapshot().walkers).toEqual(FRESH_WALKERS);
    });
    run(room, 1);
    expect(room.snapshot().walkers[0]).toEqual({ time: 1, down: 0 });
  });

  it("starts afresh when the room opens again because the last racer left", () => {
    const { room, host } = raceAtGo();
    run(room, 200);
    const watcher = room.addPlayer().id;
    expect(room.snapshot().walkers[0].time).toBe(200);

    room.removePlayer(host);

    expect(room.phase()).toBe("open");
    expect(room.snapshot().walkers).toEqual(FRESH_WALKERS);
    room.setKeys(watcher, GAS);
    run(room, 100, () => {
      expect(room.snapshot().walkers).toEqual(FRESH_WALKERS);
    });
  });

  it("is the same in every room: two races with the same driving have the same walkers", () => {
    const first = driveUntil(walkerOneIsDown);
    const second = driveUntil(walkerOneIsDown);
    expect(second.steps).toBe(first.steps);
    expect(second.room.snapshot().walkers).toEqual(first.room.snapshot().walkers);
    expect(kartOf(second.room, second.host)).toEqual(kartOf(first.room, first.host));
  });
});

// ---- A ramp in a room ----

describe("a kart that takes a ramp in a room", () => {
  it("has no air and no boost in the update before the race, during 3, 2, 1, or on its way to the ramp", () => {
    const room = createRoom(STREET, TEST_DRIVER);
    const host = room.addPlayer().id;
    room.setKeys(host, GAS);
    const noneYet = () => {
      const kart = kartOf(room, host);
      expect("air" in kart).toBe(false);
      expect("boost" in kart).toBe(false);
    };
    noneYet();
    run(room, 30, noneYet);
    room.startRace(host);
    run(room, COUNTDOWN_STEPS + 20, noneYet); // 20 steps after GO it has not reached the ramp
    expect(kartOf(room, host).x).toBeLessThan(288);
  });

  it("takes off when its held keys drive it over the ramp: the update says how long it flies and how long it is fast", () => {
    const { room, host } = driveUntil(hostIsInTheAir);
    const kart = kartOf(room, host);
    expect(rampAt(STREET, kart.x, kart.y)).toBe(STREET.ramps[0]);
    expect(kart.air).toBe(JUMP_STEPS);
    expect(kart.boost).toBe(JUMP_STEPS + BOOST_STEPS);
    expect(speedOf(kart)).toBeCloseTo(TOP_SPEED * BOOST_SHARE, 0); // rounded to one decimal in the update
  });

  it("has its air counted down in the update, and left out again when it has landed after exactly JUMP_STEPS", () => {
    const { room, host } = driveUntil(hostIsInTheAir);
    for (let left = JUMP_STEPS - 1; left >= 1; left--) {
      room.step();
      expect(kartOf(room, host).air).toBe(left);
    }
    room.step();
    expect("air" in kartOf(room, host)).toBe(false); // landed: 0 is not sent
    run(room, 30, () => {
      expect("air" in kartOf(room, host)).toBe(false);
    });
  });

  it("has its boost counted down in the update, and left out again when it has run out", () => {
    const { room, host } = driveUntil(hostIsInTheAir);
    for (let left = JUMP_STEPS + BOOST_STEPS - 1; left >= 1; left--) {
      room.step();
      expect(kartOf(room, host).boost).toBe(left);
    }
    room.step();
    expect("boost" in kartOf(room, host)).toBe(false);
  });

  it("is not steered or braked by its keys while it flies: whatever is held, it lands on the same spot", () => {
    const landWith = (keys) => {
      const { room, host } = driveUntil(hostIsInTheAir);
      room.setKeys(host, keys);
      run(room, JUMP_STEPS);
      return kartOf(room, host);
    };
    const withGas = landWith(GAS);
    expect("air" in withGas).toBe(false);
    expect(landWith(NO_KEYS)).toEqual(withGas);
    expect(landWith({ gas: false, brake: true, left: true, right: false })).toEqual(withGas);
    expect(landWith({ gas: true, brake: false, left: false, right: true })).toEqual(withGas);
    expect(landWith(ALL_KEYS)).toEqual(withGas);
  });

  it("is faster than its usual top speed while the boost lasts, and back at it soon after", () => {
    const { room, host } = driveUntil(hostIsInTheAir);
    run(room, JUMP_STEPS + BOOST_STEPS - 1, () => {
      expect(speedOf(kartOf(room, host))).toBeGreaterThan(TOP_SPEED * 1.2);
    });
    run(room, 60);
    const kart = kartOf(room, host);
    expect("boost" in kart).toBe(false);
    expect(speedOf(kart)).toBeLessThanOrEqual(TOP_SPEED + 0.1);
    expect(speedOf(kart)).toBeGreaterThan(TOP_SPEED * 0.9);
  });

  it("gets further than the same kart on the same street without the ramp", () => {
    const xAfterFourSeconds = (track) => {
      const { room, host } = raceAtGo(track);
      room.setKeys(host, GAS);
      run(room, 60 * 4);
      return kartOf(room, host).x;
    };
    expect(xAfterFourSeconds(STREET)).toBeGreaterThan(xAfterFourSeconds(BARE_STREET) + 100);
  });

  it("is back on the ground at the next start, even if the race before ended while it was in the air", () => {
    const takeOffAfter = driveUntil(hostIsInTheAir).steps;
    const { room, host } = driveUntil(hostIsInTheAir, { raceLimitSteps: takeOffAfter + 10 });
    run(room, 10);
    expect(room.phase()).toBe("finished");
    expect(kartOf(room, host).air).toBeGreaterThan(0); // the time ran out in the middle of the jump
    expect(room.startRace(host)).toBe(true);
    const kart = kartOf(room, host);
    expect("air" in kart).toBe(false);
    expect("boost" in kart).toBe(false);
    expect(kart.x).toBeCloseTo(gridSpot(STREET, 0).x, 1);
  });

  it("does not jump while it waits on the grid, and nobody jumps on a track without ramps", () => {
    const { room, host } = raceAtGo();
    run(room, 60 * 5, () => {
      expect("air" in kartOf(room, host)).toBe(false);
    });
    const bare = raceAtGo(BARE_STREET);
    bare.room.setKeys(bare.host, GAS);
    run(bare.room, 60 * 5, () => {
      expect("air" in kartOf(bare.room, bare.host)).toBe(false);
      expect("boost" in kartOf(bare.room, bare.host)).toBe(false);
    });
  });

  it("jumps for every racer who drives over the ramp, and for nobody else", () => {
    const room = createRoom(STREET, TEST_DRIVER);
    const host = room.addPlayer().id;
    const other = room.addPlayer().id; // waits on the grid the whole time
    room.startRace(host);
    run(room, COUNTDOWN_STEPS);
    room.setKeys(host, GAS);
    let hostJumped = false;
    run(room, 150, () => {
      hostJumped = hostJumped || kartOf(room, host).air > 0;
      expect("air" in kartOf(room, other)).toBe(false);
      expect("boost" in kartOf(room, other)).toBe(false);
    });
    expect(hostJumped).toBe(true);
  });
});

// ---- A walker in a room ----

describe("a kart that is driven at the walkers in a room", () => {
  it("flies over the walker under its jump: that walker stays on its feet", () => {
    const { room, host } = driveUntil(hostIsInTheAir);
    let wasOverIt = false;
    run(room, JUMP_STEPS, () => {
      const update = room.snapshot();
      const kart = update.karts[0];
      const walker = walkerIn(update, 0);
      expect(walker.outside).toBe(true);
      expect(update.walkers[0].down).toBe(0);
      if (Math.hypot(kart.x - walker.x, kart.y - walker.y) < REACH - 0.2) {
        expect(kart.air).toBeGreaterThan(0);
        wasOverIt = true;
      }
    });
    expect(wasOverIt).toBe(true);
    // It lost no speed over the walker either.
    expect(speedOf(kartOf(room, host))).toBeGreaterThan(TOP_SPEED * 1.2);
  });

  it("topples the walker it meets on its wheels, by its held keys alone, and loses most of its speed", () => {
    const { room, host, steps } = driveUntil(walkerOneIsDown);
    const update = room.snapshot();
    expect(update.walkers[1].down).toBe(DOWN_STEPS);
    expect(update.walkers[0].down).toBe(0);
    expect(update.walkers[2].down).toBe(0);
    const kart = kartOf(room, host);
    const walker = walkerIn(update, 1);
    expect(Math.hypot(kart.x - walker.x, kart.y - walker.y)).toBeLessThan(REACH + 0.2);
    expect("air" in kart).toBe(false);

    // The same race one step earlier: the kart was fast, and now it is not.
    const before = driveUntil((earlier) => earlier.race.countdownSteps === COUNTDOWN_STEPS + steps - 1);
    const speedBefore = speedOf(kartOf(before.room, before.host));
    expect(speedBefore).toBeGreaterThan(TOPPLE_SPEED + 100);
    expect(speedOf(kart)).toBeLessThan(speedBefore * 0.5);
    expect(speedOf(kart)).toBeGreaterThan(speedBefore * SPEED_KEPT_AFTER_WALKER * 0.9);
  });

  it("leaves the walker sitting for exactly DOWN_STEPS, its clock standing still, and then it walks on", () => {
    const { room } = driveUntil(walkerOneIsDown);
    const clock = room.snapshot().walkers[1].time;
    for (let left = DOWN_STEPS - 1; left >= 0; left--) {
      room.step();
      expect(room.snapshot().walkers[1]).toEqual({ time: clock, down: left });
    }
    room.step();
    expect(room.snapshot().walkers[1]).toEqual({ time: clock + 1, down: 0 });
    // The others walked on all the while.
    expect(room.snapshot().walkers[2].time).toBe(clock + DOWN_STEPS + 1);
  });

  // Changed on 17 November 2026 with the rule: toppling a walker now makes the
  // kart spin out, as on a banana. Before, this test said "a walker costs
  // speed and nothing else" and expected "spin" to be 0. The laps and the
  // clock are still never touched, which is what the test is about.
  it("keeps its laps and its clock, and spins out as on a banana", () => {
    const { room, host } = driveUntil(walkerOneIsDown);
    const atTheBump = kartOf(room, host);
    expect(atTheBump.spin).toBe(SPIN_STEPS); // the server says so to every browser, as it does for a banana
    run(room, 10);
    const later = kartOf(room, host);
    expect(later.steps).toBe(atTheBump.steps + 10);
    expect(later.passed).toBeGreaterThanOrEqual(atTheBump.passed);
    expect(later.finished).toBe(false);
    expect(later.spin).toBe(SPIN_STEPS - 10); // still spinning: the held gas does nothing
    expect(later.x).toBeGreaterThan(atTheBump.x); // it slides on, through the walker
    // When the spin is over, the keys work again and it picks up speed.
    run(room, SPIN_STEPS - 10);
    const spunOut = kartOf(room, host);
    expect(spunOut.spin).toBe(0);
    run(room, 60);
    expect(speedOf(kartOf(room, host))).toBeGreaterThan(speedOf(spunOut) + 50);
  });

  it("still finishes the race, later than on the bare street", () => {
    const finishSteps = (track) => {
      const { room, host } = raceAtGo(track);
      room.setKeys(host, GAS);
      run(room, 60 * 20);
      expect(room.phase(), track.name).toBe("finished");
      return room.takeFinishes()[0].raceSteps;
    };
    expect(finishSteps(STREET)).toBeGreaterThan(0);
    // Without the walker in the way the ramp alone makes the race shorter.
    const onlyTheRamp = createTrack({ ...streetDescription(), walkers: [] });
    expect(finishSteps(onlyTheRamp)).toBeLessThan(finishSteps(BARE_STREET));
    expect(finishSteps(STREET)).toBeGreaterThan(finishSteps(onlyTheRamp));
  });

  it("topples nobody while every kart waits on the grid, however long the race lasts", () => {
    const room = createRoom(STREET, TEST_DRIVER);
    const ids = [];
    for (let player = 0; player < MAX_PLAYERS; player++) {
      ids.push(room.addPlayer().id);
    }
    room.startRace(ids[0]);
    run(room, COUNTDOWN_STEPS + 60 * 60, () => {
      expect(room.snapshot().walkers.every((walker) => walker.down === 0)).toBe(true);
    });
  });
});

// ---- What a browser cannot do ----

describe("what a browser can NOT do about walkers and ramps", () => {
  it("has no message for moving or toppling a walker, or for making a kart jump or go faster", () => {
    for (const text of [
      '{"type":"walker","walker":1,"time":0,"down":132}',
      '{"type":"walkers","walkers":[{"time":0,"down":0}]}',
      '{"type":"topple","walker":1}',
      '{"type":"hit","walker":1,"kart":2}',
      '{"type":"jump"}',
      '{"type":"air","air":42}',
      '{"type":"boost","boost":102}',
      '{"type":"ramp","column":6,"row":2}',
    ]) {
      expect(readClientMessage(text), text).toBe(null);
    }
  });

  it("has anything about walkers and jumps dropped from the messages it may send", () => {
    expect(readClientMessage('{"type":"start","walkers":[{"time":500,"down":0}],"air":42}')).toEqual({ type: "start" });
    expect(readClientMessage('{"type":"restart","air":42,"boost":102}')).toEqual({ type: "restart" });
    expect(
      readClientMessage('{"type":"keys","gas":true,"brake":false,"left":false,"right":false,"air":42,"boost":102}'),
    ).toEqual({ type: "keys", keys: { gas: true, brake: false, left: false, right: false } });
  });

  it("finds no way in at the room either: it has no function for them, and keys carry nothing but keys", () => {
    const { room, host } = raceAtGo();
    expect(Object.keys(room).sort()).toEqual(
      [
        "addPlayer",
        "removePlayer",
        "hostId",
        "phase",
        "startRace",
        "takeFinishes",
        "setKeys",
        "setLook",
        "restart",
        "step",
        "stepCount",
        "playerCount",
        "snapshot",
      ].sort(),
    );
    run(room, 5);
    room.setKeys(host, {
      ...NO_KEYS,
      air: JUMP_STEPS,
      airSteps: JUMP_STEPS,
      boost: 500,
      boostSteps: 500,
      walkers: [{ time: 9000, down: DOWN_STEPS }],
      topple: 1,
    });
    room.restart(host); // refused during a race, and it carries nothing either
    run(room, 1);
    const kart = kartOf(room, host);
    expect("air" in kart).toBe(false);
    expect("boost" in kart).toBe(false);
    expect(speedOf(kart)).toBe(0);
    expect(room.snapshot().walkers).toEqual([
      { time: 6, down: 0 },
      { time: 6, down: 0 },
      { time: 6, down: 0 },
    ]);
  });

  it("cannot set the walkers through the start of a race: anything extra given to startRace is ignored", () => {
    const room = createRoom(STREET, TEST_DRIVER);
    const host = room.addPlayer().id;
    room.startRace(host, { walkers: [{ time: 9000, downSteps: DOWN_STEPS }], air: JUMP_STEPS });
    expect(room.snapshot().walkers).toEqual(FRESH_WALKERS);
    expect("air" in kartOf(room, host)).toBe(false);
  });
});

// ---- The single race against computer karts ----

describe("a single race on a track with walkers and ramps", () => {
  /** A single race on the street with the player alone, after "steps" steps with these keys from GO. */
  function practiceAfter(steps, keys = GAS, track = STREET) {
    let race = createPracticeRace(track);
    for (let step = 0; step < COUNTDOWN_STEPS + steps; step++) {
      race = stepPracticeRace(track, race, keys, TEST_DRIVER);
    }
    return race;
  }

  it("begins with the walkers of the track, all standing up with their clocks at zero", () => {
    expect(createPracticeRace(STREET).walkers).toEqual(createWalkers(STREET));
    expect(createPracticeRace(STREET).walkers).toHaveLength(3);
    expect(createPracticeRace(TEST_OVAL).walkers).toEqual([]);
  });

  it("keeps the walkers standing still during 3, 2 and 1, and lets them walk from GO", () => {
    let race = createPracticeRace(STREET);
    for (let step = 0; step < COUNTDOWN_STEPS; step++) {
      race = stepPracticeRace(STREET, race, ALL_KEYS, TEST_DRIVER);
      expect(race.walkers).toEqual(createWalkers(STREET));
    }
    for (let step = 1; step <= 100; step++) {
      race = stepPracticeRace(STREET, race, NO_KEYS, TEST_DRIVER);
      expect(race.walkers.map((walker) => walker.time)).toEqual([step, step, step]);
    }
  });

  it("lets the player take the ramp, fly over the first walker and topple the second, losing most of the speed", () => {
    let race = createPracticeRace(STREET);
    let jumped = false;
    let flewOverTheFirst = false;
    let speedBefore = 0;
    for (let step = 0; step < COUNTDOWN_STEPS + 600 && race.walkers[1].downSteps === 0; step++) {
      speedBefore = speedOf(race.racers[0].kart);
      race = stepPracticeRace(STREET, race, GAS, TEST_DRIVER);
      const [player] = race.racers;
      jumped = jumped || player.airSteps === JUMP_STEPS;
      const first = walkerAt(STREET, 0, race.walkers[0]);
      if (Math.hypot(player.kart.x - first.x, player.kart.y - first.y) < REACH) {
        expect(player.airSteps).toBeGreaterThan(0);
        flewOverTheFirst = true;
      }
      expect(race.walkers[0].downSteps).toBe(0);
    }
    expect(jumped).toBe(true);
    expect(flewOverTheFirst).toBe(true);
    expect(race.walkers[1].downSteps).toBe(DOWN_STEPS);
    expect(speedBefore).toBeGreaterThan(TOPPLE_SPEED + 100);
    expect(speedOf(race.racers[0].kart)).toBeLessThan(speedBefore * 0.5);
  });

  it("goes exactly as the same drive in an online room: the rules are the same in both", () => {
    const { room, host } = raceAtGo();
    room.setKeys(host, GAS);
    let race = practiceAfter(0);
    let sawAJump = false;
    let sawAWalkerDown = false;
    for (let step = 0; step < 420; step++) {
      room.step();
      race = stepPracticeRace(STREET, race, GAS, TEST_DRIVER);
      const update = room.snapshot();
      const [player] = race.racers;
      expect(update.walkers).toEqual(race.walkers.map(({ time, downSteps }) => ({ time, down: downSteps })));
      expect(update.karts[0].air ?? 0).toBe(player.airSteps);
      expect(update.karts[0].boost ?? 0).toBe(player.boostSteps);
      expect(update.karts[0].x).toBeCloseTo(player.kart.x, 1);
      expect(update.karts[0].vx).toBeCloseTo(player.kart.vx, 1);
      sawAJump = sawAJump || player.airSteps > 0;
      sawAWalkerDown = sawAWalkerDown || race.walkers[1].downSteps > 0;
    }
    expect(sawAJump).toBe(true);
    expect(sawAWalkerDown).toBe(true);
  });

  it("is the same race every time, and stepping it does not change the race it is given", () => {
    expect(practiceAfter(400)).toEqual(practiceAfter(400));
    const before = practiceAfter(100);
    const copy = JSON.stringify(before);
    const after = stepPracticeRace(STREET, before, GAS, TEST_DRIVER);
    expect(JSON.stringify(before)).toBe(copy);
    expect(after.walkers[0].time).toBe(before.walkers[0].time + 1);
  });

  it("gives fresh walkers to a race made by hand without any, instead of stopping", () => {
    const { walkers, ...withoutWalkers } = practiceAfter(0);
    expect(walkers).toHaveLength(3);
    const after = stepPracticeRace(STREET, withoutWalkers, GAS, TEST_DRIVER);
    expect(after.walkers).toEqual([
      { time: 1, downSteps: 0 },
      { time: 1, downSteps: 0 },
      { time: 1, downSteps: 0 },
    ]);
  });

  it("goes as it always did on a track without walkers and ramps", () => {
    const race = practiceAfter(300, GAS, BARE_STREET);
    expect(race.walkers).toEqual([]);
    expect(race.racers[0].airSteps).toBe(0);
    expect(race.racers[0].boostSteps).toBe(0);
    expect(speedOf(race.racers[0].kart)).toBeLessThanOrEqual(TOP_SPEED + 0.000001);
  });
});

describe("a computer kart and a walker", () => {
  // An avenue without a ramp. One walker comes towards the karts along the
  // middle of the road (y=120), which is also the racing line.
  const AVENUE = createTrack({ ...streetDescription(), ramps: [], walkers: [{ path: [[30, 2.5], [10, 2.5]] }] });
  const LINE = [
    { x: 150, y: 120 },
    { x: 1200, y: 120 },
    { x: 2250, y: 120 },
  ];

  /**
   * A single race with one computer kart and the player waiting on the
   * grid, until the computer kart is well past where it meets the walker.
   * Gives { nearest, toppled, wentRound }: how close the kart came to where
   * the walker of the avenue was at each moment, whether a walker was
   * toppled, and how far the kart was from the racing line at that moment.
   */
  function meetTheWalker(track) {
    let race = createPracticeRace(track, null, LINE, 1);
    let nearest = Infinity;
    let sideways = 0;
    let toppled = false;
    for (let step = 0; step < COUNTDOWN_STEPS + 60 * 6; step++) {
      race = stepPracticeRace(track, race, NO_KEYS, TEST_DRIVER);
      const { kart } = race.racers[1];
      // Where the walker of the avenue is now (on the bare street nobody is there, but the spot is the same).
      const walker = walkerAt(AVENUE, 0, { time: Math.max(0, step + 1 - COUNTDOWN_STEPS), downSteps: 0 });
      const apart = Math.hypot(kart.x - walker.x, kart.y - walker.y);
      if (apart < nearest) {
        nearest = apart;
        sideways = Math.abs(kart.y - 120);
      }
      toppled = toppled || race.walkers.some((each) => each.downSteps > 0);
    }
    return { nearest, toppled, sideways, passed: race.racers[1].kart.x > 1440 };
  }

  it("sees a walker in its way exactly as it sees a banana: it chooses to steer round", () => {
    const track = createTrack({ ...streetDescription(), ramps: [], walkers: [{ path: [[10, 2.5], [6, 2.5]] }] });
    const driver = createComputerDriver(personalityOf("ricardo"));
    const racer = { ...createRacer(track), kart: { ...createKart(380, 120, 0), vx: 200, vy: 0 } };
    const up = [{ time: 0, downSteps: 0 }]; // the walker stands at (480, 120): 100 units straight ahead
    expect(walkerSpots(track, up)).toEqual([{ x: 480, y: 120 }]);

    const seen = decide(driver, track, racer, LINE, [], walkerSpots(track, up), TEST_DRIVER);
    expect(seen.action).toBe("dodge");
    expect(seen.scores.dodge).toBeGreaterThan(seen.scores.follow);
    expect(seen.keys.left || seen.keys.right).toBe(true);

    // A walker that sits on the ground is in nobody's way: the driver just follows the road.
    const down = [{ time: 0, downSteps: 50 }];
    const notSeen = decide(driver, track, racer, LINE, [], walkerSpots(track, down), TEST_DRIVER);
    expect(notSeen.scores.dodge).toBe(0);
    expect(notSeen.action).toBe("follow");
  });

  it("drives round the walker in a single race, where on the bare street it would have driven straight through that spot", () => {
    const bare = meetTheWalker(BARE_STREET);
    expect(bare.passed).toBe(true);
    expect(bare.nearest).toBeLessThan(REACH); // straight along the line, through the spot

    const withWalker = meetTheWalker(AVENUE);
    expect(withWalker.passed).toBe(true);
    expect(withWalker.toppled).toBe(false);
    expect(withWalker.nearest).toBeGreaterThan(REACH);
    expect(withWalker.sideways).toBeGreaterThan(bare.sideways + 10); // it left the line to get by
  });
});

// ---- With a real copy of the server ----

describe("walkers and ramps on the real server", () => {
  const BROKE_THE_RULES = 1008;
  let app;
  let online;
  let port;
  let sockets;

  beforeEach(async () => {
    sockets = [];
    app = createApp();
    online = attachOnlinePlay(app, { track: STREET, character: TEST_DRIVER, maxPlayers: 3, goodbyeWaitMs: 300 });
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    port = app.address().port;
  });

  afterEach(async () => {
    for (const socket of sockets) {
      socket.terminate();
    }
    online.close();
    await new Promise((resolve) => app.close(resolve));
  });

  /** Connects a pretend browser. Gives { socket, messages, next(test), closed }, once the server has welcomed it. */
  function connect() {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}${ONLINE_ADDRESS}`);
      sockets.push(socket);
      const waiting = [];
      const browser = {
        socket,
        messages: [],
        next(test) {
          const already = browser.messages.find(test);
          if (already !== undefined) {
            return Promise.resolve(already);
          }
          return new Promise((found, gaveUp) => {
            const timer = setTimeout(() => gaveUp(new Error("No such message arrived in time")), 3000);
            waiting.push({ test, found, timer });
          });
        },
        closed: new Promise((done) => socket.on("close", (code) => done({ code }))),
      };
      socket.on("message", (data) => {
        const message = JSON.parse(data.toString());
        browser.messages.push(message);
        if (browser.messages.length === 1) {
          resolve(browser);
        }
        for (const waiter of [...waiting]) {
          if (waiter.test(message)) {
            clearTimeout(waiter.timer);
            waiting.splice(waiting.indexOf(waiter), 1);
            waiter.found(message);
          }
        }
      });
      socket.on("error", reject);
    });
  }

  it("sends the walkers to the browsers with each update, and a kart on the grid has no air and no boost", async () => {
    const browser = await connect();
    const update = await browser.next((message) => message.type === "state" && message.karts.length === 1);
    expect(update.walkers).toEqual(FRESH_WALKERS);
    expect("air" in update.karts[0]).toBe(false);
    expect("boost" in update.karts[0]).toBe(false);
  });

  it("sends a browser away for a message about walkers or jumping, and nothing happens to either", async () => {
    for (const made of [
      { type: "topple", walker: 1 },
      { type: "walkers", walkers: [{ time: 9000, down: DOWN_STEPS }] },
      { type: "jump" },
      { type: "boost", boost: 500 },
    ]) {
      const browser = await connect();
      browser.socket.send(JSON.stringify(made));
      expect((await browser.closed).code, JSON.stringify(made)).toBe(BROKE_THE_RULES);
    }
    expect(online.room.snapshot().walkers).toEqual(FRESH_WALKERS);
    expect(online.room.playerCount()).toBe(0);
  });
});
