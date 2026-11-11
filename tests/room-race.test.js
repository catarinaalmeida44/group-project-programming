// Tests for the race start in server/room.js: the host starts a race, every
// kart counts down together, and people who join during a race watch.
// No network is used here. (The older room tests are in room.test.js.)

import { describe, it, expect } from "vitest";
import { createRoom } from "../server/room.js";
import { COUNTDOWN_STEPS } from "../shared/countdown.js";
import { stepRacer } from "../shared/race.js";
import { createKart, speedOf } from "../shared/physics.js";
import { createProgress } from "../shared/laps.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

const GAS = { gas: true, brake: false, left: false, right: false };
const ALL_KEYS = { gas: true, brake: true, left: true, right: true };
const NO_KEYS = { gas: false, brake: false, left: false, right: false };

function newRoom(maxPlayers) {
  return createRoom(TEST_OVAL, TEST_DRIVER, maxPlayers);
}

/** What the room tells browsers about one player's kart, or undefined if it is not on the track. */
function kartOf(room, id) {
  return room.snapshot().karts.find((kart) => kart.id === id);
}

function run(room, steps) {
  for (let step = 0; step < steps; step++) {
    room.step();
  }
}

// ---- A robot driver, as in race.test.js, but pressing keys in a room ----

// The middle of the road at the four corners of the oval, in clockwise order.
const CORNERS = [
  { x: 864, y: 96 },
  { x: 864, y: 480 },
  { x: 96, y: 480 },
  { x: 96, y: 96 },
];

/** Which keys a robot presses to head for a target point. */
function robotKeys(kart, target) {
  const wantedAngle = Math.atan2(target.y - kart.y, target.x - kart.x);
  const turn = Math.atan2(Math.sin(wantedAngle - kart.angle), Math.cos(wantedAngle - kart.angle));
  return {
    gas: Math.abs(turn) < 1.2 || speedOf(kart) < 120,
    brake: false,
    left: turn < -0.05,
    right: turn > 0.05,
  };
}

/**
 * Lets robots drive the karts of the given players until the room's phase
 * is "finished", or for at most a number of seconds. Gives back the number
 * of steps it ran.
 */
function robotsDrive(room, ids, seconds) {
  const cornerOf = new Map(ids.map((id) => [id, 0]));
  let steps = 0;
  while (steps < seconds * 60 && room.phase() !== "finished") {
    for (const id of ids) {
      const kart = kartOf(room, id);
      if (kart === undefined) {
        continue;
      }
      const target = CORNERS[cornerOf.get(id)];
      if (Math.hypot(target.x - kart.x, target.y - kart.y) < 110) {
        cornerOf.set(id, (cornerOf.get(id) + 1) % CORNERS.length);
      }
      room.setKeys(id, robotKeys(kart, CORNERS[cornerOf.get(id)]));
    }
    room.step();
    steps++;
  }
  return steps;
}

// ---- The tests ----

describe("a room before any race", () => {
  it("is open, with nobody watching and no countdown", () => {
    const room = newRoom();
    room.addPlayer();
    expect(room.phase()).toBe("open");
    expect(room.snapshot().race).toEqual({ phase: "open", countdownSteps: 0, host: 1, watching: [] });
  });

  it("stays open however long people drive around", () => {
    const room = newRoom();
    const player = room.addPlayer();
    room.setKeys(player.id, GAS);
    run(room, 300);
    expect(room.phase()).toBe("open");
  });
});

describe("the host", () => {
  it("is nobody in an empty room", () => {
    expect(newRoom().hostId()).toBe(null);
  });

  it("is the player who has been in the room longest", () => {
    const room = newRoom();
    const first = room.addPlayer();
    room.addPlayer();
    room.addPlayer();
    expect(room.hostId()).toBe(first.id);
    expect(room.snapshot().race.host).toBe(first.id);
  });

  it("passes to the next longest when the host leaves", () => {
    const room = newRoom();
    const first = room.addPlayer();
    const second = room.addPlayer();
    room.addPlayer();
    room.removePlayer(first.id);
    expect(room.hostId()).toBe(second.id);
  });

  it("does not pass to a newcomer who took the old host's place on the grid", () => {
    const room = newRoom(2);
    const first = room.addPlayer();
    const second = room.addPlayer();
    room.removePlayer(first.id);
    const newcomer = room.addPlayer();
    expect(newcomer.place).toBe(first.place);
    expect(room.hostId()).toBe(second.id);
  });
});

describe("starting a race", () => {
  it("lets the host start, and begins the countdown", () => {
    const room = newRoom();
    const host = room.addPlayer();
    expect(room.startRace(host.id)).toBe(true);
    expect(room.phase()).toBe("countdown");
    expect(room.snapshot().race.countdownSteps).toBe(0);
  });

  it("puts every kart back on its starting place with laps and clock at zero", () => {
    const room = newRoom();
    const host = room.addPlayer();
    const other = room.addPlayer();
    const hostStart = kartOf(room, host.id);
    const otherStart = kartOf(room, other.id);

    room.setKeys(host.id, GAS);
    room.setKeys(other.id, GAS);
    run(room, 120); // both drive off
    room.setKeys(host.id, NO_KEYS);
    room.setKeys(other.id, NO_KEYS);
    expect(kartOf(room, other.id).steps).toBe(120);

    room.startRace(host.id);
    expect(kartOf(room, host.id)).toEqual(hostStart);
    expect(kartOf(room, other.id)).toEqual(otherStart);
  });

  it("can be started again by the host after everyone has finished or while a race is on", () => {
    const room = newRoom();
    const host = room.addPlayer();
    room.startRace(host.id);
    run(room, COUNTDOWN_STEPS + 60);
    expect(room.phase()).toBe("racing");

    expect(room.startRace(host.id)).toBe(true);
    expect(room.phase()).toBe("countdown");
    expect(kartOf(room, host.id).steps).toBe(0);
  });
});

describe("who may NOT start a race", () => {
  it("refuses a player who is not the host, and changes nothing", () => {
    const room = newRoom();
    room.addPlayer();
    const other = room.addPlayer();
    room.setKeys(other.id, GAS);
    run(room, 30);
    const before = room.snapshot();

    expect(room.startRace(other.id)).toBe(false);
    expect(room.snapshot()).toEqual(before);
    expect(room.phase()).toBe("open");
  });

  it("refuses a player number that is not in the room", () => {
    const room = newRoom();
    room.addPlayer();
    expect(room.startRace(999)).toBe(false);
    expect(room.phase()).toBe("open");
  });

  it("refuses the old host after they have left", () => {
    const room = newRoom();
    const first = room.addPlayer();
    room.addPlayer();
    room.removePlayer(first.id);
    expect(room.startRace(first.id)).toBe(false);
    expect(room.phase()).toBe("open");
  });

  it("refuses anyone in an empty room", () => {
    const room = newRoom();
    expect(room.startRace(1)).toBe(false);
    expect(room.startRace(null)).toBe(false);
    expect(room.startRace(undefined)).toBe(false);
  });

  it("refuses a second start while the countdown is running, so it is not started over", () => {
    const room = newRoom();
    const host = room.addPlayer();
    room.startRace(host.id);
    run(room, 100);
    expect(room.startRace(host.id)).toBe(false);
    expect(room.snapshot().race.countdownSteps).toBe(100);
  });
});

describe("what must NOT happen during the countdown", () => {
  it("does not move or turn any kart, whichever keys are held", () => {
    const room = newRoom();
    const host = room.addPlayer();
    const other = room.addPlayer();
    room.startRace(host.id);
    const hostStart = kartOf(room, host.id);
    const otherStart = kartOf(room, other.id);

    room.setKeys(host.id, GAS);
    room.setKeys(other.id, ALL_KEYS);
    run(room, COUNTDOWN_STEPS);

    expect(kartOf(room, host.id)).toEqual(hostStart);
    expect(kartOf(room, other.id)).toEqual(otherStart);
  });

  it("does not run anyone's clock", () => {
    const room = newRoom();
    const host = room.addPlayer();
    room.startRace(host.id);
    room.setKeys(host.id, GAS);
    run(room, COUNTDOWN_STEPS);
    expect(kartOf(room, host.id).steps).toBe(0);
  });

  it("stays in the countdown for exactly three seconds", () => {
    const room = newRoom();
    const host = room.addPlayer();
    room.startRace(host.id);
    run(room, COUNTDOWN_STEPS - 1);
    expect(room.phase()).toBe("countdown");
    run(room, 1);
    expect(room.phase()).toBe("racing");
  });

  it("refuses R: a kart cannot be restarted during the countdown", () => {
    const room = newRoom();
    const host = room.addPlayer();
    room.startRace(host.id);
    run(room, 50);
    expect(room.restart(host.id)).toBe(false);
    expect(room.snapshot().race.countdownSteps).toBe(50);
  });
});

describe("from GO on", () => {
  it("starts everyone's clock on the same step, key held or not", () => {
    const room = newRoom();
    const host = room.addPlayer();
    const other = room.addPlayer();
    room.startRace(host.id);
    room.setKeys(host.id, GAS);
    run(room, COUNTDOWN_STEPS + 45);

    expect(kartOf(room, host.id).steps).toBe(45);
    expect(kartOf(room, other.id).steps).toBe(45);
    expect(speedOf(kartOf(room, host.id))).toBeGreaterThan(0);
    expect(speedOf(kartOf(room, other.id))).toBe(0);
  });

  it("gives no head start for holding the gas during the countdown", () => {
    const early = newRoom();
    const earlyHost = early.addPlayer();
    early.startRace(earlyHost.id);
    early.setKeys(earlyHost.id, GAS); // held from the very beginning
    run(early, COUNTDOWN_STEPS + 60);

    const onTime = newRoom();
    const onTimeHost = onTime.addPlayer();
    onTime.startRace(onTimeHost.id);
    run(onTime, COUNTDOWN_STEPS);
    onTime.setKeys(onTimeHost.id, GAS); // pressed exactly at GO
    run(onTime, 60);

    expect(kartOf(early, earlyHost.id)).toEqual(kartOf(onTime, onTimeHost.id));
  });

  it("moves a kart exactly as the practice race would", () => {
    const room = newRoom();
    const host = room.addPlayer();
    const start = kartOf(room, host.id);
    let practice = { kart: createKart(start.x, start.y, start.angle), progress: createProgress() };

    const keys = { gas: true, brake: false, left: false, right: true };
    room.startRace(host.id);
    room.setKeys(host.id, keys);
    run(room, COUNTDOWN_STEPS + 90);
    for (let step = 0; step < 90; step++) {
      practice = stepRacer(TEST_OVAL, practice, keys, TEST_DRIVER);
    }

    const online = kartOf(room, host.id);
    expect(online.x).toBeCloseTo(practice.kart.x, 1);
    expect(online.y).toBeCloseTo(practice.kart.y, 1);
    expect(online.steps).toBe(practice.progress.steps);
  });

  it("refuses R: a racer cannot give themselves a fresh clock", () => {
    const room = newRoom();
    const host = room.addPlayer();
    room.startRace(host.id);
    room.setKeys(host.id, GAS);
    run(room, COUNTDOWN_STEPS + 60);
    const before = kartOf(room, host.id);

    expect(room.restart(host.id)).toBe(false);
    expect(kartOf(room, host.id)).toEqual(before);
  });
});

describe("joining while a race is on", () => {
  /** A room where the host has started a race and is past GO. */
  function roomWithRace(maxPlayers) {
    const room = newRoom(maxPlayers);
    const host = room.addPlayer();
    room.startRace(host.id);
    run(room, COUNTDOWN_STEPS + 30);
    return { room, host };
  }

  it("lets the newcomer in, but gives them no kart on the track", () => {
    const { room, host } = roomWithRace();
    const newcomer = room.addPlayer();
    expect(newcomer).not.toBe(null);
    expect(room.playerCount()).toBe(2);

    const update = room.snapshot();
    expect(update.karts.map((kart) => kart.id)).toEqual([host.id]);
    expect(update.race.watching).toEqual([newcomer.id]);
  });

  it("also makes someone who joins during the countdown watch", () => {
    const room = newRoom();
    const host = room.addPlayer();
    room.startRace(host.id);
    run(room, 30);
    const newcomer = room.addPlayer();
    expect(room.snapshot().race.watching).toEqual([newcomer.id]);
  });

  it("ignores the keys of someone who is watching", () => {
    const { room, host } = roomWithRace();
    const newcomer = room.addPlayer();
    const hostBefore = kartOf(room, host.id);

    expect(room.setKeys(newcomer.id, GAS)).toBe(true);
    run(room, 60);

    expect(kartOf(room, newcomer.id)).toBe(undefined);
    expect(kartOf(room, host.id).x).toBe(hostBefore.x); // the host held no key, so stood still
    expect(room.snapshot().race.watching).toEqual([newcomer.id]);
  });

  it("refuses a start and a restart from someone who is watching", () => {
    const { room } = roomWithRace();
    const newcomer = room.addPlayer();
    expect(room.startRace(newcomer.id)).toBe(false);
    expect(room.restart(newcomer.id)).toBe(false);
    expect(room.phase()).toBe("racing");
  });

  it("still counts people who are watching towards a full room", () => {
    const { room } = roomWithRace(2);
    expect(room.addPlayer()).not.toBe(null);
    expect(room.addPlayer()).toBe(null);
  });

  it("puts the people who were watching into the next race", () => {
    const { room, host } = roomWithRace();
    const newcomer = room.addPlayer();

    expect(room.startRace(host.id)).toBe(true);
    const update = room.snapshot();
    expect(update.race.watching).toEqual([]);
    expect(update.karts.map((kart) => kart.id).sort()).toEqual([host.id, newcomer.id].sort());

    room.setKeys(newcomer.id, GAS);
    run(room, COUNTDOWN_STEPS + 30);
    expect(speedOf(kartOf(room, newcomer.id))).toBeGreaterThan(0);
  });
});

describe("leaving during a race", () => {
  it("lets the others race on when one racer leaves", () => {
    const room = newRoom();
    const host = room.addPlayer();
    const other = room.addPlayer();
    room.startRace(host.id);
    room.setKeys(other.id, GAS);
    run(room, COUNTDOWN_STEPS + 30);

    room.removePlayer(host.id);
    run(room, 30);

    expect(room.phase()).toBe("racing");
    expect(kartOf(room, other.id).steps).toBe(60);
  });

  it("goes back to free driving when the last racer leaves, so people watching are not stuck", () => {
    const room = newRoom();
    const host = room.addPlayer();
    room.startRace(host.id);
    run(room, COUNTDOWN_STEPS + 30);
    const watcher = room.addPlayer();

    room.removePlayer(host.id);

    expect(room.phase()).toBe("open");
    expect(room.hostId()).toBe(watcher.id);
    expect(room.snapshot().race.watching).toEqual([]);
    room.setKeys(watcher.id, GAS);
    run(room, 30);
    expect(speedOf(kartOf(room, watcher.id))).toBeGreaterThan(0);
  });
});

describe("the end of a race", () => {
  it("is not finished while one racer is still driving", () => {
    const room = newRoom();
    const host = room.addPlayer();
    const slow = room.addPlayer(); // never touches a key
    room.startRace(host.id);
    run(room, COUNTDOWN_STEPS);

    robotsDrive(room, [host.id], 120);

    expect(kartOf(room, host.id).finished).toBe(true);
    expect(kartOf(room, slow.id).finished).toBe(false);
    expect(room.phase()).toBe("racing");
  });

  it("is finished once every racer has completed the laps, and waits there", () => {
    const room = newRoom();
    const host = room.addPlayer();
    const other = room.addPlayer();
    room.startRace(host.id);
    run(room, COUNTDOWN_STEPS);

    const steps = robotsDrive(room, [host.id, other.id], 120);

    expect(steps).toBeLessThan(120 * 60); // the robots really finished
    expect(room.phase()).toBe("finished");
    expect(kartOf(room, host.id).lapsDone).toBe(TEST_OVAL.laps);
    expect(kartOf(room, other.id).lapsDone).toBe(TEST_OVAL.laps);

    run(room, 300);
    expect(room.phase()).toBe("finished");
    expect(room.restart(host.id)).toBe(false); // R does nothing: the result stands
    expect(room.startRace(host.id)).toBe(true); // the host can start the next race
  });

  it("is finished when the only racer still driving leaves", () => {
    const room = newRoom();
    const host = room.addPlayer();
    const slow = room.addPlayer();
    room.startRace(host.id);
    run(room, COUNTDOWN_STEPS);
    robotsDrive(room, [host.id], 120);
    expect(room.phase()).toBe("racing");

    room.removePlayer(slow.id);
    run(room, 1);
    expect(room.phase()).toBe("finished");
  });
});
