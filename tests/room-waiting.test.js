// Tests for the waiting phase of an online room (server/room.js), the rule
// the team chose on 17 November 2026: the first player to enter is the host.
// Before the host presses Enter, every kart stays on its place on the
// starting grid and the arrow keys do nothing. When the host starts, 3, 2, 1
// is counted, and only after GO can anyone move.
//
// Most of these are rejected actions: things that must NOT happen.
// No network is used here.

import { describe, it, expect } from "vitest";
import { createRoom } from "../server/room.js";
import { COUNTDOWN_STEPS } from "../shared/countdown.js";
import { gridSpot } from "../shared/grid.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

const GAS = { gas: true, brake: false, left: false, right: false };
const NO_KEYS = { gas: false, brake: false, left: false, right: false };

/** Every way of holding the four arrow keys: 16 combinations. */
const EVERY_KEY_COMBINATION = Array.from({ length: 16 }, (_, bits) => ({
  gas: (bits & 1) !== 0,
  brake: (bits & 2) !== 0,
  left: (bits & 4) !== 0,
  right: (bits & 8) !== 0,
}));

const kartOf = (room, id) => room.snapshot().karts.find((kart) => kart.id === id);

function run(room, steps, everyStep = () => {}) {
  for (let step = 0; step < steps; step++) {
    room.step();
    everyStep();
  }
}

/** A room with this many players. The first is the host. Gives { room, ids }. */
function roomWith(count, limits) {
  const room = createRoom(TEST_OVAL, TEST_DRIVER, undefined, null, limits);
  const ids = [];
  for (let player = 0; player < count; player++) {
    ids.push(room.addPlayer().id);
  }
  return { room, ids };
}

describe("waiting for the host", () => {
  it("is where every room begins, with the first player to enter as the host", () => {
    const { room, ids } = roomWith(3);
    expect(room.phase()).toBe("open");
    expect(room.hostId()).toBe(ids[0]);
  });

  it("puts every kart on its own place on the starting grid, standing still", () => {
    const { room, ids } = roomWith(4);
    for (const id of ids) {
      const kart = kartOf(room, id);
      const spot = gridSpot(TEST_OVAL, kart.place);
      expect(kart.x).toBeCloseTo(spot.x, 1);
      expect(kart.y).toBeCloseTo(spot.y, 1);
      expect([kart.vx, kart.vy, kart.steps, kart.lapsDone]).toEqual([0, 0, 0, 0]);
    }
  });

  it("ignores the arrow keys: no combination of keys moves a kart, turns it or starts its clock", () => {
    const { room, ids } = roomWith(2);
    const before = ids.map((id) => kartOf(room, id));
    for (const keys of EVERY_KEY_COMBINATION) {
      for (const id of ids) {
        room.setKeys(id, keys);
      }
      run(room, 30);
    }
    expect(ids.map((id) => kartOf(room, id))).toEqual(before);
  });

  it("ignores the keys of the host too: being host does not let you move first", () => {
    const { room, ids } = roomWith(2);
    const [host] = ids;
    const before = kartOf(room, host);
    room.setKeys(host, GAS);
    run(room, 300);
    expect(kartOf(room, host)).toEqual(before);
  });

  it("keeps a player who joins later still on the grid too", () => {
    const { room } = roomWith(1);
    run(room, 60);
    const late = room.addPlayer();
    const before = kartOf(room, late.id);
    room.setKeys(late.id, GAS);
    run(room, 120);
    expect(kartOf(room, late.id)).toEqual(before);
    expect(room.snapshot().race.watching).toEqual([]); // waiting, not watching: they will race
  });

  it("lasts as long as the host does not start: nothing moves even after a long wait", () => {
    const { room, ids } = roomWith(3);
    for (const id of ids) {
      room.setKeys(id, GAS);
    }
    const before = room.snapshot().karts;
    run(room, 60 * 60); // one minute
    expect(room.phase()).toBe("open");
    expect(room.snapshot().karts).toEqual(before);
  });
});

describe("who may end the wait", () => {
  it("refuses a start from a player who is not the host, and nothing moves", () => {
    const { room, ids } = roomWith(3);
    const [, second, third] = ids;
    const before = room.snapshot().karts;
    expect(room.startRace(second)).toBe(false);
    expect(room.startRace(third)).toBe(false);
    room.setKeys(second, GAS);
    run(room, 120);
    expect(room.phase()).toBe("open");
    expect(room.snapshot().karts).toEqual(before);
  });

  it("refuses a start from a player number that is not in the room", () => {
    const { room } = roomWith(2);
    expect(room.startRace(999)).toBe(false);
    expect(room.startRace(undefined)).toBe(false);
    expect(room.phase()).toBe("open");
  });

  it("lets the next player in become host when the host leaves, and only them", () => {
    const { room, ids } = roomWith(3);
    const [host, second, third] = ids;
    room.removePlayer(host);
    expect(room.hostId()).toBe(second);
    expect(room.startRace(third)).toBe(false);
    expect(room.startRace(second)).toBe(true);
  });
});

describe("the start", () => {
  it("lets nobody move during 3, 2, 1, whatever keys are held", () => {
    const { room, ids } = roomWith(3);
    const before = room.snapshot().karts.map(({ id, x, y, angle }) => ({ id, x, y, angle }));
    room.startRace(ids[0]);
    let combination = 0;
    run(room, COUNTDOWN_STEPS, () => {
      for (const id of ids) {
        room.setKeys(id, EVERY_KEY_COMBINATION[combination++ % 16]);
      }
      const now = room.snapshot().karts.map(({ id, x, y, angle }) => ({ id, x, y, angle }));
      expect(now).toEqual(before);
      expect(room.snapshot().karts.every((kart) => kart.steps === 0)).toBe(true);
    });
  });

  it("lets every kart move from GO on, all on the same step", () => {
    const { room, ids } = roomWith(3);
    const before = Object.fromEntries(ids.map((id) => [id, kartOf(room, id)]));
    room.startRace(ids[0]);
    for (const id of ids) {
      room.setKeys(id, GAS);
    }
    run(room, COUNTDOWN_STEPS);
    run(room, 30);
    for (const id of ids) {
      expect(kartOf(room, id).steps).toBe(30);
      expect(kartOf(room, id).x).toBeGreaterThan(before[id].x);
    }
  });

  it("puts everyone in the race: nobody who waited is left watching", () => {
    const { room, ids } = roomWith(3);
    room.startRace(ids[0]);
    expect(room.snapshot().race.watching).toEqual([]);
    expect(room.snapshot().karts.map((kart) => kart.id).sort()).toEqual([...ids].sort());
  });
});

describe("what did not change", () => {
  it("still makes a player who joins during a race watch, with no kart on the track", () => {
    const { room, ids } = roomWith(1);
    room.startRace(ids[0]);
    run(room, COUNTDOWN_STEPS + 10);
    const late = room.addPlayer();
    expect(room.snapshot().race.watching).toEqual([late.id]);
    expect(kartOf(room, late.id)).toBeUndefined();
  });

  it("still lets the host start the next race once one is over, and everyone is back on the grid, waiting for GO", () => {
    const { room, ids } = roomWith(2, { raceLimitSteps: 60 });
    const [host, other] = ids;
    room.startRace(host);
    room.setKeys(host, GAS);
    room.setKeys(other, GAS);
    run(room, COUNTDOWN_STEPS + 60);
    expect(room.phase()).toBe("finished");
    expect(room.startRace(other)).toBe(false); // still only the host
    expect(room.startRace(host)).toBe(true);
    expect(room.phase()).toBe("countdown");
    const spot = gridSpot(TEST_OVAL, kartOf(room, other).place);
    run(room, 30); // keys still held, but it is 3, 2, 1
    expect(kartOf(room, other).x).toBeCloseTo(spot.x, 1);
    room.setKeys(host, NO_KEYS);
  });
});
