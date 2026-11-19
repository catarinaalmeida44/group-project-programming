// Tests for server/computer-players.js: computer karts in an online room.
// The room and the cast keeper are the real ones, without any network.

import { describe, it, expect } from "vitest";
import { createComputerPlayers, computersShouldLeave, KARTS_IN_A_FULL_RACE } from "../server/computer-players.js";
import { createRoom } from "../server/room.js";
import { createCastKeeper } from "../server/cast-keeper.js";
import { CAST, characterById } from "../shared/cast.js";
import { personalityOf } from "../shared/computer-driver.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { tileKindAt } from "../shared/track.js";
import { speedOf } from "../shared/physics.js";
import { lookOfTrack } from "../client/track-looks.js";
import { routePoints } from "../client/route.js";

const LINE = routePoints(TEST_OVAL, lookOfTrack(TEST_OVAL).route);

/** A room on the test oval with people in it, some of them characters: [null, "ro"] is a person without a character and Ró. */
function roomWith(people, maxPlayers = 8, seed = 5) {
  const room = createRoom(TEST_OVAL, TEST_DRIVER, maxPlayers, () => seed);
  const cast = createCastKeeper();
  const ids = people.map((characterId) => {
    const { id } = room.addPlayer();
    if (characterId !== null) {
      const character = cast.choose(id, characterId, true);
      room.setLook(id, character.look);
    }
    return id;
  });
  const computers = createComputerPlayers(TEST_OVAL, LINE, TEST_DRIVER);
  return { room, cast, ids, computers };
}

const kartOf = (room, id) => room.snapshot().karts.find((kart) => kart.id === id);

/** Starts a race and runs it to the end, the server's way: the computer karts decide, then the room moves. */
function race(room, computers, hostId, watch = () => {}) {
  expect(room.startRace(hostId)).toBe(true);
  for (let step = 0; step < 120 * 60 && room.phase() !== "finished"; step++) {
    computers.drive(room);
    room.step();
    watch(room);
    if (computers.ids().every((id) => kartOf(room, id).finished)) {
      break;
    }
  }
}

describe("filling a race with computer karts", () => {
  it("makes a full race six karts, one for each character", () => {
    expect(KARTS_IN_A_FULL_RACE).toBe(6);
    expect(CAST).toHaveLength(6);
  });

  it("with one person, adds the five characters that person is not", () => {
    const { room, cast, ids, computers } = roomWith(["ro"]);
    expect(computers.fill(room, cast)).toBe(5);
    expect(room.playerCount()).toBe(6);
    const theirs = computers.ids().map((id) => cast.characterOf(id));
    expect(theirs).not.toContain("ro");
    expect(new Set(theirs).size).toBe(5);
    expect(cast.characterOf(ids[0])).toBe("ro"); // the person keeps their character
  });

  it("with more people, adds fewer: never more than six karts", () => {
    for (const people of [["dean", "pcp"], ["dean", "pcp", "cici", "ro"], [null, null, null]]) {
      const { room, cast, computers } = roomWith(people);
      expect(computers.fill(room, cast), people.join()).toBe(6 - people.length);
      expect(room.playerCount()).toBe(6);
    }
  });

  it("adds none when six people are already there, or more", () => {
    for (const people of [CAST.map((character) => character.id), [...CAST.map((character) => character.id), null]]) {
      const { room, cast, computers } = roomWith(people);
      expect(computers.fill(room, cast)).toBe(0);
      expect(computers.ids()).toEqual([]);
    }
  });

  it("never takes a character a person already is", () => {
    const { room, cast, ids, computers } = roomWith(["dean", "cici", null]);
    computers.fill(room, cast);
    const theirs = computers.ids().map((id) => cast.characterOf(id));
    expect(theirs).not.toContain("dean");
    expect(theirs).not.toContain("cici");
    expect(cast.characterOf(ids[2])).toBe(undefined); // the person without a character is still none
  });

  it("stops when the grid has no free place left", () => {
    const { room, cast, computers } = roomWith(["ro"], 3);
    expect(computers.fill(room, cast)).toBe(2);
    expect(room.playerCount()).toBe(3);
  });

  it("adds none on a track without a racing line: they would not know the way", () => {
    for (const line of [null, [], [{ x: 0, y: 0 }, { x: 1, y: 1 }]]) {
      const room = createRoom(TEST_OVAL, TEST_DRIVER, 8);
      room.addPlayer();
      const computers = createComputerPlayers(TEST_OVAL, line, TEST_DRIVER);
      expect(computers.fill(room, createCastKeeper())).toBe(0);
    }
  });

  it("refuses a number of karts that is not a whole number from 0 up", () => {
    const { room, cast, computers } = roomWith(["ro"]);
    for (const total of [-1, 2.5, "6"]) {
      expect(() => computers.fill(room, cast, total)).toThrow(/whole number/);
    }
  });

  it("paints each computer kart in its character's colours", () => {
    const { room, cast, computers } = roomWith(["ro"]);
    computers.fill(room, cast);
    for (const id of computers.ids()) {
      const character = characterById(cast.characterOf(id));
      expect(kartOf(room, id).look).toEqual(character.look);
    }
  });

  it("knows which player numbers are computer karts, and that people are not", () => {
    const { room, cast, ids, computers } = roomWith(["ro"]);
    computers.fill(room, cast);
    expect(computers.isComputer(ids[0])).toBe(false);
    expect(computers.ids().every((id) => computers.isComputer(id))).toBe(true);
  });
});

describe("taking the computer karts away", () => {
  it("frees their places and their characters", () => {
    const { room, cast, ids, computers } = roomWith(["ro"]);
    computers.fill(room, cast);
    const theirIds = computers.ids();
    computers.clear(room, cast);
    expect(room.playerCount()).toBe(1);
    expect(computers.ids()).toEqual([]);
    expect(theirIds.every((id) => cast.characterOf(id) === undefined)).toBe(true);
    expect(cast.choose(ids[0], "dean", true)).not.toBe(null); // a character a computer kart had is free again
  });
});

describe("making way for a person", () => {
  it("takes out one computer kart, the last to come in, and frees its place and character", () => {
    const { room, cast, ids, computers } = roomWith(["ro"], 6);
    computers.fill(room, cast);
    expect(room.playerCount()).toBe(6);
    const last = computers.ids().at(-1);
    const itsCharacter = cast.characterOf(last);
    expect(computers.makeWayForAPerson(room, cast)).toBe(true);
    expect(room.playerCount()).toBe(5);
    expect(computers.ids()).toHaveLength(4);
    expect(computers.isComputer(last)).toBe(false);
    expect(cast.characterOf(last)).toBe(undefined);
    expect(cast.choose(ids[0], itsCharacter, true)).not.toBe(null); // free for a person now
    expect(room.addPlayer()).not.toBe(null); // and there is a place
  });

  it("lets the other computer karts race on", () => {
    const { room, cast, ids, computers } = roomWith(["ro"], 6);
    computers.fill(room, cast);
    room.startRace(ids[0]);
    computers.makeWayForAPerson(room, cast);
    expect(room.phase()).toBe("countdown");
    expect(room.snapshot().karts).toHaveLength(5);
  });

  it("never takes out a person, and does nothing without computer karts", () => {
    const { room, cast, ids, computers } = roomWith(["ro", "dean"], 6);
    expect(computers.makeWayForAPerson(room, cast)).toBe(false);
    expect(room.playerCount()).toBe(2);
    computers.fill(room, cast);
    for (let left = 0; left < 10; left++) {
      computers.makeWayForAPerson(room, cast);
    }
    expect(room.playerCount()).toBe(2);
    expect(ids.every((id) => room.snapshot().karts.some((kart) => kart.id === id))).toBe(true);
  });
});

describe("computer karts racing online", () => {
  it("drive the whole race: every one finishes all laps, never inside a wall", () => {
    const { room, cast, ids, computers } = roomWith(["ro"]);
    computers.fill(room, cast);
    let wallMoments = 0;
    race(room, computers, ids[0], (now) => {
      for (const id of computers.ids()) {
        const kart = kartOf(now, id);
        if (tileKindAt(TEST_OVAL, kart.x, kart.y) === "wall") {
          wallMoments++;
        }
      }
    });
    for (const id of computers.ids()) {
      expect(kartOf(room, id).finished, cast.characterOf(id)).toBe(true);
      expect(kartOf(room, id).lapsDone).toBe(TEST_OVAL.laps);
    }
    expect(wallMoments).toBe(0);
  });

  it("only ever press the keys of computer karts, never a person's", () => {
    const { room, cast, ids, computers } = roomWith(["ro", "dean"]);
    computers.fill(room, cast);
    const pressedFor = new Set();
    const setKeys = room.setKeys;
    room.setKeys = (id, keys) => {
      pressedFor.add(id);
      return setKeys(id, keys);
    };
    race(room, computers, ids[0]);
    expect(pressedFor.size).toBeGreaterThan(0);
    for (const id of pressedFor) {
      expect(computers.isComputer(id), String(id)).toBe(true);
    }
    expect(kartOf(room, ids[0]).lapsDone).toBe(0); // a person who presses nothing drives no laps
  });

  it("do not move before GO", () => {
    const { room, cast, ids, computers } = roomWith(["ro"]);
    computers.fill(room, cast);
    room.startRace(ids[0]);
    const before = computers.ids().map((id) => ({ x: kartOf(room, id).x, y: kartOf(room, id).y }));
    while (room.phase() === "countdown") {
      computers.drive(room);
      room.step();
    }
    expect(computers.ids().map((id) => ({ x: kartOf(room, id).x, y: kartOf(room, id).y }))).toEqual(before);
  });

  it("drive with the personality of their character", () => {
    const { room, cast, computers } = roomWith(["ro"]);
    computers.fill(room, cast);
    for (const id of computers.ids()) {
      expect(personalityOf(cast.characterOf(id))).not.toBe(null);
    }
  });

  it("race the same way every time with the same bananas: nothing is left to chance", () => {
    const finishTimes = () => {
      const { room, cast, ids, computers } = roomWith(["ro"], 8, 42);
      computers.fill(room, cast);
      race(room, computers, ids[0]);
      return computers.ids().map((id) => kartOf(room, id).steps);
    };
    expect(finishTimes()).toEqual(finishTimes());
  });

  it("are not stopped by a person's kart standing on the grid in front of them", () => {
    const { room, cast, ids, computers } = roomWith(["ro"]);
    computers.fill(room, cast);
    let fastest = 0;
    race(room, computers, ids[0], (now) => {
      for (const id of computers.ids()) {
        fastest = Math.max(fastest, speedOf(kartOf(now, id)));
      }
    });
    expect(fastest).toBeGreaterThan(100);
  });
});

describe("when computer karts must leave", () => {
  it("not while people are racing with them", () => {
    const { room, cast, ids, computers } = roomWith(["ro"]);
    computers.fill(room, cast);
    room.startRace(ids[0]);
    expect(computersShouldLeave(room, computers)).toBe(false);
  });

  it("when no person is left in the room", () => {
    const { room, cast, ids, computers } = roomWith(["ro"]);
    computers.fill(room, cast);
    room.removePlayer(ids[0]);
    expect(computersShouldLeave(room, computers)).toBe(true);
  });

  it("when a race is on but no person is racing any more, even if someone is watching", () => {
    const { room, cast, ids, computers } = roomWith(["ro"]);
    computers.fill(room, cast);
    room.startRace(ids[0]);
    room.addPlayer(); // someone arrives and watches
    room.removePlayer(ids[0]); // the only person racing leaves
    expect(computersShouldLeave(room, computers)).toBe(true);
  });

  it("when one of them would be the host: only a person may start a race", () => {
    const { room, cast, ids, computers } = roomWith(["ro"]);
    computers.fill(room, cast);
    room.addPlayer(); // someone arrives after the computer karts
    room.removePlayer(ids[0]); // the host leaves: the oldest one left is a computer kart
    expect(computers.isComputer(room.hostId())).toBe(true);
    expect(computersShouldLeave(room, computers)).toBe(true);
  });

  it("never when there are none", () => {
    const { room, computers } = roomWith([]);
    expect(computersShouldLeave(room, computers)).toBe(false);
  });
});
