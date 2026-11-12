// Tests for the bananas in an online room (server/room.js): when a room has
// them, what it tells the browsers about them, a kart spinning out in a
// room, and everything a browser must NOT be able to do about them.
// No network is used here, except for the last few tests, which use a real
// copy of the server. (The banana rules themselves are tested in
// hazards.test.js.)

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { createRoom, randomSeed, MAX_PLAYERS } from "../server/room.js";
import { readClientMessage } from "../server/messages.js";
import { createApp } from "../server/app.js";
import { attachOnlinePlay, ONLINE_ADDRESS } from "../server/online.js";
import {
  SPIN_STEPS,
  FIRST_BANANA_STEPS,
  BANANA_RADIUS,
  BANANA_SAFE_FROM_KART,
  SEED_COUNT,
  bananaSquares,
  mostBananas,
} from "../shared/hazards.js";
import { createCountdownRace, stepCountdownRace, COUNTDOWN_STEPS } from "../shared/countdown.js";
import { speedOf } from "../shared/physics.js";
import { tileKindAt } from "../shared/track.js";
import { KART_RADIUS } from "../shared/race.js";
import { gridSpot } from "../shared/grid.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { createSprintTrack } from "./sprint-track.js";

const GAS = { gas: true, brake: false, left: false, right: false };
const ALL_KEYS = { gas: true, brake: true, left: true, right: true };
const NO_KEYS = { gas: false, brake: false, left: false, right: false };
const BACK = { gas: false, brake: true, left: false, right: false };
const HIT_DISTANCE = KART_RADIUS + BANANA_RADIUS;
const SEED = 21;

/** A room whose races have bananas, always from the same seed. */
function roomWithBananas(seed = SEED, track = TEST_OVAL) {
  return createRoom(track, TEST_DRIVER, MAX_PLAYERS, () => seed);
}

const kartOf = (room, id) => room.snapshot().karts.find((kart) => kart.id === id);

function run(room, steps, everyStep = () => {}) {
  for (let step = 0; step < steps; step++) {
    room.step();
    everyStep();
  }
}

/** A room with bananas where the host has started a race and GO has just been given. Gives { room, host }. */
function raceAtGo(seed = SEED) {
  const room = roomWithBananas(seed);
  const host = room.addPlayer().id;
  room.startRace(host);
  run(room, COUNTDOWN_STEPS);
  return { room, host };
}

// ---- Robot drivers ----

/** Which keys head for a target point: the robot driver of race.test.js. */
function robotKeys(kart, target) {
  const wantedAngle = Math.atan2(target.y - kart.y, target.x - kart.x);
  const turn = Math.atan2(Math.sin(wantedAngle - kart.angle), Math.cos(wantedAngle - kart.angle));
  return { gas: Math.abs(turn) < 1.2 || speedOf(kart) < 120, brake: false, left: turn < -0.05, right: turn > 0.05 };
}

// The middle of the road at the four corners of the oval, in clockwise order.
const CORNERS = [
  { x: 864, y: 96 },
  { x: 864, y: 480 },
  { x: 96, y: 480 },
  { x: 96, y: 96 },
];

/**
 * A robot for whole races with bananas. A spin can leave a kart standing
 * with its nose against a wall, and the simple robot cannot reverse. This
 * one can: when it has hardly moved for a while, it backs up for a moment.
 * Gives a function (kart) => keys that remembers which corner it is heading for.
 */
function carefulRobot() {
  let corner = 0;
  let slowSteps = 0;
  let backingSteps = 0;
  return (kart) => {
    if (Math.hypot(CORNERS[corner].x - kart.x, CORNERS[corner].y - kart.y) < 110) {
      corner = (corner + 1) % CORNERS.length;
    }
    if (backingSteps > 0) {
      backingSteps--;
      return BACK;
    }
    slowSteps = speedOf(kart) < 15 && kart.spin === 0 ? slowSteps + 1 : 0;
    if (slowSteps > 45) {
      slowSteps = 0;
      backingSteps = 50;
      return BACK;
    }
    return robotKeys(kart, CORNERS[corner]);
  };
}

/**
 * A seed whose first banana, with one kart waiting on pole, lies on the top
 * straight well ahead of that kart, so a robot can simply drive at it.
 */
function seedWithFirstBananaAhead() {
  for (let seed = 1; seed < 1000; seed++) {
    const { room } = raceAtGo(seed);
    run(room, FIRST_BANANA_STEPS);
    const [first] = room.snapshot().bananas;
    if (first !== undefined && first.y < 150 && first.x > 600 && first.x < 850) {
      return seed;
    }
  }
  throw new Error("No seed among the first thousand puts the first banana on the top straight");
}

/** Waits on the grid for the first banana, then drives the host's kart into it. Gives { room, host, banana }. */
function driveIntoFirstBanana() {
  const { room, host } = raceAtGo(seedWithFirstBananaAhead());
  run(room, FIRST_BANANA_STEPS);
  const [banana] = room.snapshot().bananas;
  for (let step = 0; step < 600 && kartOf(room, host).spin === 0; step++) {
    room.setKeys(host, robotKeys(kartOf(room, host), banana));
    room.step();
  }
  return { room, host, banana };
}

// ---- The tests ----

describe("a room that was given no way to pick a seed", () => {
  it("has no bananas, however long a race lasts", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER);
    const host = room.addPlayer().id;
    room.startRace(host);
    run(room, COUNTDOWN_STEPS + 60 * 60, () => {
      expect(room.snapshot().bananas).toEqual([]);
    });
    expect(kartOf(room, host).spin).toBe(0);
  });
});

describe("when a room has bananas", () => {
  it("picks a seed once for each race, at the moment the race starts, and not for a start it refuses", () => {
    let asked = 0;
    const room = createRoom(TEST_OVAL, TEST_DRIVER, MAX_PLAYERS, () => {
      asked++;
      return SEED;
    });
    const host = room.addPlayer().id;
    const other = room.addPlayer().id;
    run(room, 100);
    expect(asked).toBe(0);

    expect(room.startRace(other)).toBe(false); // not the host
    expect(asked).toBe(0);
    expect(room.startRace(host)).toBe(true);
    expect(asked).toBe(1);
    expect(room.startRace(host)).toBe(false); // the countdown is already running
    expect(asked).toBe(1);

    run(room, COUNTDOWN_STEPS + 10);
    expect(room.startRace(host)).toBe(true); // the next race
    expect(asked).toBe(2);
  });

  it("has none while the room is open, however long people drive", () => {
    const room = roomWithBananas();
    const player = room.addPlayer().id;
    room.setKeys(player, GAS);
    run(room, 60 * 30, () => {
      expect(room.snapshot().bananas).toEqual([]);
      expect(kartOf(room, player).spin).toBe(0);
    });
  });

  it("has none during 3, 2 and 1", () => {
    const room = roomWithBananas();
    const host = room.addPlayer().id;
    room.startRace(host);
    expect(room.snapshot().bananas).toEqual([]);
    run(room, COUNTDOWN_STEPS, () => {
      expect(room.snapshot().bananas).toEqual([]);
      expect(kartOf(room, host).spin).toBe(0);
    });
  });

  it("gets the first one a few seconds after GO", () => {
    const { room } = raceAtGo();
    run(room, FIRST_BANANA_STEPS - 1);
    expect(room.snapshot().bananas).toEqual([]);
    run(room, 1);
    expect(room.snapshot().bananas).toHaveLength(1);
  });

  it("tells browsers each banana's number and where it is, and nothing else", () => {
    const { room } = raceAtGo();
    run(room, FIRST_BANANA_STEPS);
    const [banana] = room.snapshot().bananas;
    expect(Object.keys(banana).sort()).toEqual(["id", "x", "y"]);
    expect(banana.id).toBe(1);
    expect(tileKindAt(TEST_OVAL, banana.x, banana.y)).toBe("road");
    // Rounded to one decimal, like the karts.
    expect(banana.x).toBe(Math.round(banana.x * 10) / 10);
    expect(banana.y).toBe(Math.round(banana.y * 10) / 10);
  });

  it("never has more than the track may have, and only on squares where a banana may appear", () => {
    const allowed = new Set(bananaSquares(TEST_OVAL).map(({ x, y }) => `${x},${y}`));
    const { room } = raceAtGo();
    run(room, 60 * 60, () => {
      const { bananas } = room.snapshot();
      expect(bananas.length).toBeLessThanOrEqual(mostBananas(TEST_OVAL));
      for (const banana of bananas) {
        expect(allowed.has(`${banana.x},${banana.y}`)).toBe(true);
      }
    });
    expect(room.snapshot().bananas).toHaveLength(mostBananas(TEST_OVAL));
  });

  it("has the same bananas as another room with the same seed, and different ones with another seed", () => {
    const bananasAfterAWhile = (seed) => {
      const { room } = raceAtGo(seed);
      run(room, 60 * 20);
      return room.snapshot().bananas;
    };
    expect(bananasAfterAWhile(5)).toEqual(bananasAfterAWhile(5));
    expect(bananasAfterAWhile(6)).not.toEqual(bananasAfterAWhile(5));
  });

  it("has exactly the bananas of a practice race with the same seed: the rules are the same", () => {
    const { room } = raceAtGo(77);
    let practice = createCountdownRace(TEST_OVAL, 77);
    for (let step = 0; step < COUNTDOWN_STEPS; step++) {
      practice = stepCountdownRace(TEST_OVAL, practice, NO_KEYS, TEST_DRIVER);
    }
    for (let step = 0; step < 60 * 30; step++) {
      room.step();
      practice = stepCountdownRace(TEST_OVAL, practice, NO_KEYS, TEST_DRIVER);
      expect(room.snapshot().bananas).toEqual(practice.bananas);
    }
    expect(practice.bananas.length).toBeGreaterThan(2);
  });

  it("sends an update that can be turned into text and back without losing anything", () => {
    const { room } = raceAtGo();
    run(room, 60 * 15);
    const update = room.snapshot();
    expect(update.bananas.length).toBeGreaterThan(1);
    expect(JSON.parse(JSON.stringify(update))).toEqual(update);
  });

  it("gives every kart in the update the steps of spin it has left: 0 when it is not spinning", () => {
    const room = roomWithBananas();
    room.addPlayer();
    room.addPlayer();
    for (const kart of room.snapshot().karts) {
      expect(kart.spin).toBe(0);
    }
  });

  it("has none on a track that is too small for them, however long the race", () => {
    const room = roomWithBananas(SEED, createSprintTrack());
    const host = room.addPlayer().id;
    room.addPlayer(); // a second racer who never drives, so the race never ends
    room.startRace(host);
    room.setKeys(host, GAS);
    run(room, COUNTDOWN_STEPS + 60 * 60, () => {
      expect(room.snapshot().bananas).toEqual([]);
    });
    expect(kartOf(room, host).finished).toBe(true); // and the race itself went as always
    expect(room.takeFinishes()).toHaveLength(1);
  });
});

describe("a kart that drives over a banana in a room", () => {
  it("spins out for as long as a spin lasts, and the banana is gone", () => {
    const { room, host, banana } = driveIntoFirstBanana();
    const kart = kartOf(room, host);
    expect(kart.spin).toBe(SPIN_STEPS);
    expect(Math.hypot(kart.x - banana.x, kart.y - banana.y)).toBeLessThan(HIT_DISTANCE + 0.2);
    expect(room.snapshot().bananas.some((each) => each.id === banana.id)).toBe(false);

    // The update counts the spin down in whole steps.
    for (let left = SPIN_STEPS - 1; left >= 0; left--) {
      room.step();
      expect(kartOf(room, host).spin).toBe(left);
    }
    run(room, 30);
    expect(kartOf(room, host).spin).toBe(0);
  });

  it("is not steered or sped up by its keys while it spins", () => {
    const spinWith = (keys) => {
      const { room, host } = driveIntoFirstBanana();
      const atTheHit = kartOf(room, host);
      room.setKeys(host, keys);
      run(room, SPIN_STEPS, () => {
        expect(kartOf(room, host).angle).toBe(atTheHit.angle);
        expect(speedOf(kartOf(room, host))).toBeLessThanOrEqual(speedOf(atTheHit) + 0.1);
      });
      return kartOf(room, host);
    };
    const withNoKeys = spinWith(NO_KEYS);
    expect(spinWith({ gas: true, brake: false, left: true, right: false })).toEqual(withNoKeys);
    expect(spinWith({ gas: false, brake: true, left: false, right: true })).toEqual(withNoKeys);
    expect(spinWith(ALL_KEYS)).toEqual(withNoKeys);
  });

  it("keeps its clock running and loses no lap while it spins", () => {
    const { room, host } = driveIntoFirstBanana();
    const atTheHit = kartOf(room, host);
    run(room, SPIN_STEPS);
    const after = kartOf(room, host);
    expect(after.steps).toBe(atTheHit.steps + SPIN_STEPS);
    expect(after.lapsDone).toBe(atTheHit.lapsDone);
    expect(after.finished).toBe(false);
  });

  it("obeys its keys again after the spin", () => {
    const { room, host } = driveIntoFirstBanana();
    run(room, SPIN_STEPS);
    const slow = speedOf(kartOf(room, host));
    room.setKeys(host, GAS);
    run(room, 60);
    expect(speedOf(kartOf(room, host))).toBeGreaterThan(slow + 100);
  });

  it("does not spin anyone else", () => {
    const seed = seedWithFirstBananaAhead();
    const room = roomWithBananas(seed);
    const host = room.addPlayer().id;
    const other = room.addPlayer().id; // waits on the grid the whole time
    room.startRace(host);
    run(room, COUNTDOWN_STEPS + FIRST_BANANA_STEPS);
    const [banana] = room.snapshot().bananas;
    for (let step = 0; step < 600 && kartOf(room, host).spin === 0; step++) {
      room.setKeys(host, robotKeys(kartOf(room, host), banana));
      room.step();
    }
    expect(kartOf(room, host).spin).toBe(SPIN_STEPS);
    expect(kartOf(room, other).spin).toBe(0);
  });
});

describe("when the bananas of a race are cleared away", () => {
  it("happens when the next race starts, and nobody is still spinning then", () => {
    const { room, host } = driveIntoFirstBanana();
    run(room, 60 * 6); // more bananas appear meanwhile
    expect(room.snapshot().bananas.length).toBeGreaterThan(0);

    const { room: spinningRoom, host: spinningHost } = driveIntoFirstBanana();
    expect(kartOf(spinningRoom, spinningHost).spin).toBeGreaterThan(0);
    expect(spinningRoom.startRace(spinningHost)).toBe(true);
    expect(kartOf(spinningRoom, spinningHost).spin).toBe(0);

    expect(room.startRace(host)).toBe(true);
    expect(room.snapshot().bananas).toEqual([]);
    run(room, COUNTDOWN_STEPS, () => {
      expect(room.snapshot().bananas).toEqual([]);
    });
    // The new race numbers its bananas from 1 again.
    run(room, FIRST_BANANA_STEPS);
    expect(room.snapshot().bananas.map((banana) => banana.id)).toEqual([1]);
  });

  it("happens when the room opens again because the last racer left", () => {
    const { room, host } = raceAtGo();
    run(room, 60 * 10);
    expect(room.snapshot().bananas.length).toBeGreaterThan(0);
    const watcher = room.addPlayer().id;

    room.removePlayer(host);

    expect(room.phase()).toBe("open");
    expect(room.snapshot().bananas).toEqual([]);
    room.setKeys(watcher, GAS);
    run(room, 60 * 10, () => {
      expect(room.snapshot().bananas).toEqual([]);
    });
  });
});

describe("who can NOT hit a banana", () => {
  it("is anyone during the countdown: there are none yet, and nobody spins", () => {
    const room = roomWithBananas();
    const ids = [];
    for (let player = 0; player < MAX_PLAYERS; player++) {
      ids.push(room.addPlayer().id);
    }
    room.startRace(ids[0]);
    for (const id of ids) {
      room.setKeys(id, ALL_KEYS);
    }
    run(room, COUNTDOWN_STEPS, () => {
      const update = room.snapshot();
      expect(update.bananas).toEqual([]);
      expect(update.karts.every((kart) => kart.spin === 0)).toBe(true);
    });
  });

  it("is a kart waiting on the grid: no banana ever appears there", () => {
    const room = roomWithBananas();
    const ids = [];
    for (let player = 0; player < MAX_PLAYERS; player++) {
      ids.push(room.addPlayer().id);
    }
    room.startRace(ids[0]);
    run(room, COUNTDOWN_STEPS + 60 * 60, () => {
      const update = room.snapshot();
      expect(update.karts.every((kart) => kart.spin === 0)).toBe(true);
      for (const banana of update.bananas) {
        for (const kart of update.karts) {
          expect(Math.hypot(kart.x - banana.x, kart.y - banana.y)).toBeGreaterThan(HIT_DISTANCE);
        }
      }
    });
    expect(room.snapshot().bananas).toHaveLength(mostBananas(TEST_OVAL));
  });

  it("is someone who is watching: they have no kart, never spin, and no banana goes away because of them", () => {
    const { room, host } = raceAtGo();
    const watcher = room.addPlayer().id;
    room.setKeys(watcher, ALL_KEYS);

    let mostSoFar = 0;
    run(room, 60 * 60, () => {
      const update = room.snapshot();
      expect(update.karts.map((kart) => kart.id)).toEqual([host]);
      expect(update.race.watching).toEqual([watcher]);
      // The only racer waits on the grid, so no banana is ever hit: the count only goes up.
      expect(update.bananas.length).toBeGreaterThanOrEqual(mostSoFar);
      mostSoFar = update.bananas.length;
    });
    expect(mostSoFar).toBe(mostBananas(TEST_OVAL));
  });

  it("is the place where someone watching would stand: for the bananas their kart is not there at all", () => {
    const placeOne = gridSpot(TEST_OVAL, 1); // where a watcher who joins a one-kart race is parked

    /** One racer, driven by a robot, for 40 seconds. Gives every banana that appeared, in order. */
    function bananasOfARace(seed, withWatcher) {
      const { room, host } = raceAtGo(seed);
      if (withWatcher) {
        expect(room.addPlayer().place).toBe(1);
      }
      const brain = carefulRobot();
      const appeared = [];
      for (let step = 0; step < 60 * 40; step++) {
        room.setKeys(host, brain(kartOf(room, host)));
        room.step();
        for (const banana of room.snapshot().bananas) {
          if (!appeared.some((each) => each.id === banana.id)) {
            appeared.push(banana);
          }
        }
      }
      return appeared;
    }

    // Find a race in which a banana appears so close to place 1 that a kart
    // parked there would have kept it away.
    let seed = 1;
    const nearPlaceOne = (banana) => Math.hypot(banana.x - placeOne.x, banana.y - placeOne.y) < BANANA_SAFE_FROM_KART;
    while (seed < 300 && !bananasOfARace(seed, false).some(nearPlaceOne)) {
      seed++;
    }
    const alone = bananasOfARace(seed, false);
    expect(alone.some(nearPlaceOne)).toBe(true);

    // With someone watching from place 1, the race has exactly the same bananas.
    expect(bananasOfARace(seed, true)).toEqual(alone);
  });
});

describe("a whole race with bananas", () => {
  /** Lets careful robots drive every racer until the room's phase is "finished". Gives what happened. */
  function raceWithRobots(seed, robots) {
    const room = roomWithBananas(seed);
    const ids = [];
    for (let player = 0; player < robots; player++) {
      ids.push(room.addPlayer().id);
    }
    room.startRace(ids[0]);
    run(room, COUNTDOWN_STEPS);
    const brains = new Map(ids.map((id) => [id, carefulRobot()]));
    const finishes = [];
    let spins = 0;
    let steps = 0;
    const spinning = new Set();
    while (steps < 60 * 120 && room.phase() !== "finished") {
      const update = room.snapshot();
      expect(update.bananas.length).toBeLessThanOrEqual(mostBananas(TEST_OVAL));
      for (const kart of update.karts) {
        expect(tileKindAt(TEST_OVAL, kart.x, kart.y)).not.toBe("wall");
        if (kart.spin > 0 && !spinning.has(kart.id)) {
          spins++;
          spinning.add(kart.id);
        } else if (kart.spin === 0) {
          spinning.delete(kart.id);
        }
        room.setKeys(kart.id, brains.get(kart.id)(kart));
      }
      room.step();
      finishes.push(...room.takeFinishes());
      steps++;
    }
    return { room, ids, finishes, spins, steps };
  }

  it("still ends, with the time on the racer's clock as the result, however often the robot spins out", () => {
    let spinsInAll = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const { room, ids, finishes, spins } = raceWithRobots(seed, 1);
      spinsInAll += spins;
      expect(room.phase(), `seed ${seed}`).toBe("finished");
      const kart = kartOf(room, ids[0]);
      expect(kart.lapsDone).toBe(TEST_OVAL.laps);
      expect(kart.lapSteps).toHaveLength(3);
      const [one, two, three] = kart.lapSteps;
      expect(finishes).toEqual([
        { id: ids[0], position: 1, raceSteps: three, bestLapSteps: Math.min(one, two - one, three - two) },
      ]);
    }
    expect(spinsInAll).toBeGreaterThan(3); // the bananas really were in the way
  });

  it("costs time: the same robot is faster in a room without bananas", () => {
    const plain = createRoom(TEST_OVAL, TEST_DRIVER);
    const id = plain.addPlayer().id;
    plain.startRace(id);
    run(plain, COUNTDOWN_STEPS);
    const brain = carefulRobot();
    for (let step = 0; step < 60 * 120 && plain.phase() !== "finished"; step++) {
      plain.setKeys(id, brain(kartOf(plain, id)));
      plain.step();
    }
    const withoutBananas = kartOf(plain, id).steps;

    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const { room, ids, spins } = raceWithRobots(seed, 1);
      if (spins > 0) {
        expect(kartOf(room, ids[0]).steps).toBeGreaterThan(withoutBananas);
      }
    }
  });

  it("ends for a full room of eight robots too, with a place for everyone", () => {
    const { room, finishes } = raceWithRobots(9, 8);
    expect(room.phase()).toBe("finished");
    expect(finishes).toHaveLength(8);
    expect(finishes[0].position).toBe(1);
    const positions = finishes.map((finish) => finish.position);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions); // handed out in finishing order
    expect(Math.max(...positions)).toBeLessThanOrEqual(8);
  });
});

describe("what a browser can NOT do about bananas", () => {
  it("has no message for placing or removing a banana, spinning a kart or choosing the seed", () => {
    for (const text of [
      '{"type":"banana","x":432,"y":62}',
      '{"type":"bananas","bananas":[{"id":1,"x":432,"y":62}]}',
      '{"type":"addBanana","x":432,"y":62}',
      '{"type":"removeBanana","id":1}',
      '{"type":"clearBananas"}',
      '{"type":"hit","banana":1,"kart":2}',
      '{"type":"spin","id":2}',
      '{"type":"seed","seed":5}',
    ]) {
      expect(readClientMessage(text), text).toBe(null);
    }
  });

  it("has anything about bananas dropped from the three messages it may send", () => {
    expect(readClientMessage('{"type":"start","seed":5,"bananas":[{"id":1,"x":432,"y":62}]}')).toEqual({ type: "start" });
    expect(readClientMessage('{"type":"restart","spin":0,"bananas":[]}')).toEqual({ type: "restart" });
    expect(
      readClientMessage('{"type":"keys","gas":true,"brake":false,"left":false,"right":false,"spin":0,"seed":5}'),
    ).toEqual({ type: "keys", keys: { gas: true, brake: false, left: false, right: false } });
  });

  it("finds no way in at the room either: it has no function for bananas, and keys carry nothing but keys", () => {
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
        "restart",
        "step",
        "stepCount",
        "playerCount",
        "snapshot",
      ].sort(),
    );
    run(room, FIRST_BANANA_STEPS);
    const before = room.snapshot().bananas;
    room.setKeys(host, { ...NO_KEYS, bananas: [], spin: SPIN_STEPS, seed: 5, banana: { id: 1, x: 0, y: 0 } });
    room.restart(host);
    run(room, 1);
    expect(room.snapshot().bananas).toEqual(before);
    expect(kartOf(room, host).spin).toBe(0);
  });

  it("cannot choose the seed through the start of a race: anything extra given to startRace is ignored", () => {
    const firstBanana = (extra) => {
      const room = roomWithBananas(5);
      const host = room.addPlayer().id;
      room.startRace(host, extra);
      run(room, COUNTDOWN_STEPS + FIRST_BANANA_STEPS);
      return room.snapshot().bananas;
    };
    expect(firstBanana(999)).toEqual(firstBanana(undefined));
    expect(firstBanana({ seed: 999 })).toEqual(firstBanana(undefined));
  });

  it("cannot change the update the room sends by changing a copy of it", () => {
    const { room } = raceAtGo();
    run(room, FIRST_BANANA_STEPS);
    const update = room.snapshot();
    update.bananas.length = 0;
    update.karts[0].spin = 50;
    expect(room.snapshot().bananas).toHaveLength(1);
    expect(room.snapshot().karts[0].spin).toBe(0);
  });
});

describe("picking a seed", () => {
  it("by real chance gives a whole number that the banana rules accept, and not always the same one", () => {
    const seeds = new Set();
    for (let draw = 0; draw < 200; draw++) {
      const seed = randomSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(SEED_COUNT);
      seeds.add(seed);
    }
    expect(seeds.size).toBeGreaterThan(190);
  });

  it("is refused when the room is given something that is not a function", () => {
    for (const notAFunction of [7, "7", {}, true]) {
      expect(() => createRoom(TEST_OVAL, TEST_DRIVER, MAX_PLAYERS, notAFunction)).toThrow(TypeError);
    }
  });

  it("stops the start of the race, and changes nothing, when the seed picked is not a whole number", () => {
    for (const badSeed of [1.5, -1, NaN, "5", undefined, null]) {
      const room = createRoom(TEST_OVAL, TEST_DRIVER, MAX_PLAYERS, () => badSeed);
      const host = room.addPlayer().id;
      room.setKeys(host, GAS);
      run(room, 30);
      const before = room.snapshot();
      expect(() => room.startRace(host), String(badSeed)).toThrow(RangeError);
      expect(room.phase()).toBe("open");
      expect(room.snapshot()).toEqual(before);
    }
  });
});

// ---- With a real copy of the server ----

describe("bananas on the real server", () => {
  const BROKE_THE_RULES = 1008;
  let app;
  let online;
  let port;
  let sockets;

  /** Starts a server whose rooms pick this seed, or pick by real chance if none is given. */
  async function startServer(pickSeed) {
    app = createApp();
    online = attachOnlinePlay(app, {
      track: TEST_OVAL,
      character: TEST_DRIVER,
      maxPlayers: 3,
      goodbyeWaitMs: 300,
      ...(pickSeed === undefined ? {} : { pickSeed }),
    });
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    port = app.address().port;
  }

  beforeEach(() => {
    sockets = [];
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

  /** The first banana of a race in a room of its own that picks this seed, with one kart waiting on pole. */
  function firstBananaWithSeed(seed) {
    const { room } = raceAtGo(seed);
    run(room, FIRST_BANANA_STEPS);
    return room.snapshot().bananas[0];
  }

  it("has bananas in every online room, from a seed picked by chance", async () => {
    await startServer();
    // Drive the room by hand, without waiting for real time.
    const firstBananas = new Set();
    for (let race = 0; race < 6; race++) {
      const { id } = online.room.addPlayer();
      online.room.startRace(id);
      run(online.room, COUNTDOWN_STEPS + FIRST_BANANA_STEPS);
      const { bananas } = online.room.snapshot();
      expect(bananas).toHaveLength(1);
      firstBananas.add(`${bananas[0].x},${bananas[0].y}`);
      online.room.removePlayer(id);
    }
    expect(firstBananas.size).toBeGreaterThan(1); // not the same race every time
  });

  it("sends the bananas and every kart's spin to the browsers with each update", async () => {
    await startServer(() => SEED);
    const browser = await connect();
    const update = await browser.next((message) => message.type === "state" && message.karts.length === 1);
    expect(update.bananas).toEqual([]);
    expect(update.karts[0].spin).toBe(0);
    expect(gridSpot(TEST_OVAL, 0).x).toBeCloseTo(update.karts[0].x, 1);
  });

  it("sends a browser away for a message about bananas, and no banana appears or goes", async () => {
    await startServer(() => SEED);
    for (const made of [
      { type: "banana", x: 432, y: 62 },
      { type: "removeBanana", id: 1 },
      { type: "spin", id: 1 },
    ]) {
      const browser = await connect();
      browser.socket.send(JSON.stringify(made));
      expect((await browser.closed).code, JSON.stringify(made)).toBe(BROKE_THE_RULES);
    }
    expect(online.room.snapshot().bananas).toEqual([]);
    expect(online.room.playerCount()).toBe(0);
  });

  it("ignores a seed that a browser adds to its start message: the server's own seed decides", async () => {
    expect(firstBananaWithSeed(5)).not.toEqual(firstBananaWithSeed(999)); // the two seeds can be told apart
    await startServer(() => 5);
    const browser = await connect();
    await browser.next((message) => message.type === "state" && message.karts.length === 1);

    browser.socket.send(JSON.stringify({ type: "start", seed: 999, bananas: [{ id: 1, x: 432, y: 62 }] }));
    await browser.next((message) => message.type === "state" && message.race.phase === "countdown");
    expect(online.room.snapshot().bananas).toEqual([]); // the banana in the message was not placed

    // Hurry the room along by hand to the first banana.
    while (online.room.snapshot().bananas.length === 0 && online.room.stepCount() < 100000) {
      online.room.step();
    }
    expect(online.room.snapshot().bananas[0]).toEqual(firstBananaWithSeed(5));
  });
});
