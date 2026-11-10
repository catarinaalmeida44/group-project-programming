// Tests for server/room.js (the karts of everyone driving together) and
// server/messages.js (checking what a browser sends). No network is used
// here. The tests with real connections are in online.test.js.

import { describe, it, expect } from "vitest";
import { createRoom, MAX_PLAYERS, STEPS_PER_UPDATE } from "../server/room.js";
import { readClientMessage, MAX_MESSAGE_LENGTH } from "../server/messages.js";
import { stepRacer } from "../shared/race.js";
import { createKart } from "../shared/physics.js";
import { createProgress } from "../shared/laps.js";
import { tileKindAt } from "../shared/track.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

const GAS = { gas: true, brake: false, left: false, right: false };
const NO_KEYS = { gas: false, brake: false, left: false, right: false };

function newRoom(maxPlayers) {
  return createRoom(TEST_OVAL, TEST_DRIVER, maxPlayers);
}

/** What the room tells browsers about one player's kart. */
function kartOf(room, id) {
  return room.snapshot().karts.find((kart) => kart.id === id);
}

function run(room, steps) {
  for (let step = 0; step < steps; step++) {
    room.step();
  }
}

describe("joining and leaving a room", () => {
  it("gives every new player their own number and their own starting place", () => {
    const room = newRoom();
    const first = room.addPlayer();
    const second = room.addPlayer();
    expect(second.id).not.toBe(first.id);
    expect(second.place).not.toBe(first.place);
    expect(room.playerCount()).toBe(2);
  });

  it("starts every kart on the road, standing still, in a different spot, with no laps", () => {
    const room = newRoom();
    for (let player = 0; player < MAX_PLAYERS; player++) {
      room.addPlayer();
    }
    const karts = room.snapshot().karts;
    expect(karts).toHaveLength(MAX_PLAYERS);
    const spots = new Set();
    for (const kart of karts) {
      expect(tileKindAt(TEST_OVAL, kart.x, kart.y)).toBe("road");
      expect(kart.vx).toBe(0);
      expect(kart.vy).toBe(0);
      expect(kart.lapsDone).toBe(0);
      expect(kart.steps).toBe(0);
      expect(kart.finished).toBe(false);
      spots.add(`${kart.x},${kart.y}`);
    }
    expect(spots.size).toBe(MAX_PLAYERS);
  });

  it("holds eight players unless told otherwise", () => {
    expect(MAX_PLAYERS).toBe(8);
  });

  it("refuses a new player when the room is full", () => {
    const room = newRoom(2);
    expect(room.addPlayer()).not.toBe(null);
    expect(room.addPlayer()).not.toBe(null);
    expect(room.addPlayer()).toBe(null);
    expect(room.playerCount()).toBe(2);
  });

  it("frees the place of a player who leaves, and gives it to the next one", () => {
    const room = newRoom(2);
    const first = room.addPlayer();
    room.addPlayer();
    room.removePlayer(first.id);
    expect(room.playerCount()).toBe(1);

    const newcomer = room.addPlayer();
    expect(newcomer).not.toBe(null);
    expect(newcomer.place).toBe(first.place);
  });

  it("never uses a player number twice", () => {
    const room = newRoom(2);
    const first = room.addPlayer();
    room.removePlayer(first.id);
    const newcomer = room.addPlayer();
    expect(newcomer.id).not.toBe(first.id);
  });

  it("does nothing when asked to remove a player who is not there", () => {
    const room = newRoom();
    room.addPlayer();
    room.removePlayer(999);
    expect(room.playerCount()).toBe(1);
  });
});

describe("driving in a room", () => {
  it("moves only the kart of the player who is holding a key", () => {
    const room = newRoom();
    const driver = room.addPlayer();
    const watcher = room.addPlayer();
    const driverBefore = kartOf(room, driver.id);
    const watcherBefore = kartOf(room, watcher.id);

    room.setKeys(driver.id, GAS);
    run(room, 60);

    expect(kartOf(room, driver.id).x).toBeGreaterThan(driverBefore.x + 20);
    expect(kartOf(room, watcher.id)).toEqual(watcherBefore);
  });

  it("moves a kart exactly as the practice race would", () => {
    // The server and the browser use the same rules file, so the same keys
    // must give the same result in both.
    const room = newRoom();
    const player = room.addPlayer();
    const start = kartOf(room, player.id);
    let practice = { kart: createKart(start.x, start.y, start.angle), progress: createProgress() };

    const keys = { gas: true, brake: false, left: false, right: true };
    room.setKeys(player.id, keys);
    run(room, 90);
    for (let step = 0; step < 90; step++) {
      practice = stepRacer(TEST_OVAL, practice, keys, TEST_DRIVER);
    }

    const online = kartOf(room, player.id);
    expect(online.x).toBeCloseTo(practice.kart.x, 1);
    expect(online.y).toBeCloseTo(practice.kart.y, 1);
    expect(online.angle).toBeCloseTo(practice.kart.angle, 3);
    expect(online.steps).toBe(practice.progress.steps);
  });

  it("does not start a player's clock until their first key press", () => {
    const room = newRoom();
    const player = room.addPlayer();
    run(room, 120);
    expect(kartOf(room, player.id).steps).toBe(0);

    room.setKeys(player.id, GAS);
    run(room, 30);
    expect(kartOf(room, player.id).steps).toBe(30);
  });

  it("keeps the clock running once started, even with no key held", () => {
    const room = newRoom();
    const player = room.addPlayer();
    room.setKeys(player.id, GAS);
    run(room, 10);
    room.setKeys(player.id, NO_KEYS);
    run(room, 10);
    expect(kartOf(room, player.id).steps).toBe(20);
  });

  it("puts a kart back at its start on restart, without touching anyone else", () => {
    const room = newRoom();
    const first = room.addPlayer();
    const second = room.addPlayer();
    const firstStart = kartOf(room, first.id);
    room.setKeys(first.id, GAS);
    room.setKeys(second.id, GAS);
    run(room, 60);
    const secondBefore = kartOf(room, second.id);

    expect(room.restart(first.id)).toBe(true);

    room.setKeys(first.id, NO_KEYS);
    expect(kartOf(room, first.id)).toEqual(firstStart);
    expect(kartOf(room, second.id)).toEqual(secondBefore);
  });

  it("counts the steps it has run", () => {
    const room = newRoom();
    run(room, 7);
    expect(room.stepCount()).toBe(7);
  });
});

describe("what a room refuses", () => {
  it("says no to keys or a restart for a player who is not in the room", () => {
    const room = newRoom();
    const player = room.addPlayer();
    const before = kartOf(room, player.id);

    expect(room.setKeys(999, GAS)).toBe(false);
    expect(room.restart(999)).toBe(false);
    run(room, 30);
    expect(kartOf(room, player.id)).toEqual(before);
  });

  it("says no to keys for a player who has left", () => {
    const room = newRoom();
    const player = room.addPlayer();
    room.removePlayer(player.id);
    expect(room.setKeys(player.id, GAS)).toBe(false);
  });

  it("treats anything that is not exactly 'true' as a key that is not held", () => {
    const room = newRoom();
    const player = room.addPlayer();
    const before = kartOf(room, player.id);
    room.setKeys(player.id, { gas: "yes", brake: 1, left: "true", right: {} });
    run(room, 60);
    expect(kartOf(room, player.id)).toEqual(before);
  });

  it("copes with keys that are missing altogether", () => {
    const room = newRoom();
    const player = room.addPlayer();
    expect(room.setKeys(player.id, undefined)).toBe(true);
    expect(room.setKeys(player.id, null)).toBe(true);
    run(room, 10);
    expect(kartOf(room, player.id).steps).toBe(0);
  });

  it("is not affected when the keys it was given are changed afterwards", () => {
    const room = newRoom();
    const player = room.addPlayer();
    const before = kartOf(room, player.id);
    const keys = { ...NO_KEYS };
    room.setKeys(player.id, keys);
    keys.gas = true; // changed after handing it over
    run(room, 60);
    expect(kartOf(room, player.id)).toEqual(before);
  });
});

describe("the update a room sends to browsers", () => {
  it("lists every kart with its player number, place, position, speed and progress", () => {
    const room = newRoom();
    const player = room.addPlayer();
    const update = room.snapshot();
    expect(update.type).toBe("state");
    expect(update.step).toBe(0);
    expect(update.karts).toHaveLength(1);
    expect(Object.keys(update.karts[0]).sort()).toEqual(
      ["angle", "finished", "id", "lapSteps", "lapsDone", "place", "steps", "vx", "vy", "x", "y"].sort(),
    );
    expect(update.karts[0].id).toBe(player.id);
  });

  it("rounds positions to one decimal, to keep the update short", () => {
    const room = newRoom();
    const player = room.addPlayer();
    room.setKeys(player.id, { gas: true, brake: false, left: false, right: true });
    run(room, 47);
    const kart = kartOf(room, player.id);
    expect(kart.x).toBe(Math.round(kart.x * 10) / 10);
    expect(kart.y).toBe(Math.round(kart.y * 10) / 10);
  });

  it("can be turned into text and back without losing anything", () => {
    const room = newRoom();
    room.addPlayer();
    room.addPlayer();
    run(room, 5);
    const update = room.snapshot();
    expect(JSON.parse(JSON.stringify(update))).toEqual(update);
  });

  it("is sent every third step, which is 20 times a second", () => {
    expect(60 / STEPS_PER_UPDATE).toBe(20);
  });
});

describe("reading a message from a browser", () => {
  const keysText = '{"type":"keys","gas":true,"brake":false,"left":false,"right":true}';

  it("accepts the keys a player is holding", () => {
    expect(readClientMessage(keysText)).toEqual({
      type: "keys",
      keys: { gas: true, brake: false, left: false, right: true },
    });
  });

  it("accepts a request to restart", () => {
    expect(readClientMessage('{"type":"restart"}')).toEqual({ type: "restart" });
  });

  it("drops anything extra a browser adds, such as a position or another player's number", () => {
    const sneaky = '{"type":"keys","gas":true,"brake":false,"left":false,"right":false,"id":2,"x":900,"lapsDone":3}';
    expect(readClientMessage(sneaky)).toEqual({
      type: "keys",
      keys: { gas: true, brake: false, left: false, right: false },
    });
    expect(readClientMessage('{"type":"restart","id":2}')).toEqual({ type: "restart" });
  });

  it("accepts a message that is exactly as long as allowed", () => {
    const padded = keysText.padEnd(MAX_MESSAGE_LENGTH, " ");
    expect(padded.length).toBe(MAX_MESSAGE_LENGTH);
    expect(readClientMessage(padded)).not.toBe(null);
  });

  it("refuses a message that is too long, without reading it", () => {
    const padded = keysText.padEnd(MAX_MESSAGE_LENGTH + 1, " ");
    expect(readClientMessage(padded)).toBe(null);
  });

  it("refuses text that is not in our format", () => {
    for (const text of ["", "hello", "{", "gas=true", "<keys/>"]) {
      expect(readClientMessage(text), text).toBe(null);
    }
  });

  it("refuses values that are in our format but are not a message", () => {
    for (const text of ["null", "true", "42", '"keys"', "[]", '[{"type":"restart"}]', "{}"]) {
      expect(readClientMessage(text), text).toBe(null);
    }
  });

  it("refuses kinds of message it does not know", () => {
    for (const text of [
      '{"type":"teleport","x":100,"y":100}',
      '{"type":"finish","time":1}',
      '{"type":"KEYS","gas":true,"brake":false,"left":false,"right":false}',
      '{"type":["keys"]}',
    ]) {
      expect(readClientMessage(text), text).toBe(null);
    }
  });

  it("refuses keys unless all four are a plain yes or no", () => {
    for (const text of [
      '{"type":"keys","gas":true,"brake":false,"left":false}', //                 one missing
      '{"type":"keys","gas":"true","brake":false,"left":false,"right":false}', // a word
      '{"type":"keys","gas":1,"brake":0,"left":0,"right":0}', //                  numbers
      '{"type":"keys","gas":null,"brake":false,"left":false,"right":false}', //   nothing
      '{"type":"keys"}',
    ]) {
      expect(readClientMessage(text), text).toBe(null);
    }
  });

  it("refuses anything that is not text", () => {
    for (const notText of [undefined, null, 42, {}, [], Buffer.from(keysText)]) {
      expect(readClientMessage(notText)).toBe(null);
    }
  });
});
