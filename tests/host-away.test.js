// Tests for the rule the team added on 19 November 2026 (server/room.js):
// the host is the player who has been in the room longest AND is at their
// keyboard. A player who has pressed no key for a minute counts as away,
// and the host passes to the next player in the order they arrived.
//
// Why: before, a tab someone had forgotten, or a player who had walked off,
// stayed the host for ever, and nobody else could start a race.
//
// No network is used here. Races are run on the short straight test track
// (sprint-track.js), where holding the gas finishes a race in about a second.

import { describe, it, expect } from "vitest";
import { createRoom, AWAY_AFTER_STEPS } from "../server/room.js";
import { COUNTDOWN_STEPS } from "../shared/countdown.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { createSprintTrack } from "./sprint-track.js";

const GAS = { gas: true, brake: false, left: false, right: false };
const NO_KEYS = { gas: false, brake: false, left: false, right: false };
const MINUTE = AWAY_AFTER_STEPS;

function run(room, steps) {
  for (let step = 0; step < steps; step++) {
    room.step();
  }
}

/** A room with this many players, in the order they arrived. Gives { room, ids }. */
function roomWith(count, track = TEST_OVAL, limits) {
  const room = createRoom(track, TEST_DRIVER, undefined, null, limits);
  const ids = [];
  for (let player = 0; player < count; player++) {
    ids.push(room.addPlayer().id);
  }
  return { room, ids };
}

/** A key going down and up again: the smallest sign that someone is there. */
function tap(room, id) {
  room.setKeys(id, GAS);
  room.setKeys(id, NO_KEYS);
}

describe("who is the host while everyone is at their keyboard", () => {
  it("is the player who arrived first, as before", () => {
    const { room, ids } = roomWith(3);
    expect(room.hostId()).toBe(ids[0]);
    run(room, MINUTE - 1);
    expect(room.hostId()).toBe(ids[0]); // not yet a minute
  });

  it("counts a minute without a key as away", () => {
    expect(AWAY_AFTER_STEPS).toBe(60 * 60); // 60 steps a second
  });
});

describe("a host who is away passes the room on", () => {
  it("to the player who arrived second, when that player is at the keyboard", () => {
    const { room, ids } = roomWith(3);
    run(room, MINUTE - 1);
    tap(room, ids[1]);
    tap(room, ids[2]);
    run(room, 1); // now the host has pressed nothing for a whole minute
    expect(room.hostId()).toBe(ids[1]); // the second to arrive, not the third
    expect(room.snapshot().race.host).toBe(ids[1]); // and every page is told so
  });

  it("to the third, when the first two are both away", () => {
    const { room, ids } = roomWith(3);
    run(room, MINUTE - 1);
    tap(room, ids[2]);
    run(room, 1);
    expect(room.hostId()).toBe(ids[2]);
  });

  it("lets the new host start a race, and nobody behind them", () => {
    const { room, ids } = roomWith(3);
    run(room, MINUTE - 1);
    tap(room, ids[1]);
    tap(room, ids[2]);
    run(room, 1);
    expect(room.startRace(ids[2])).toBe(false); // the third is there, but the second is before them
    expect(room.phase()).toBe("open");
    expect(room.startRace(ids[1])).toBe(true);
    expect(room.phase()).toBe("countdown");
  });

  it("stays with whoever has been here longest when EVERYONE is away, so a room always has a host", () => {
    const { room, ids } = roomWith(3);
    run(room, MINUTE * 3);
    expect(room.hostId()).toBe(ids[0]);
    expect(room.startRace(ids[0])).toBe(true);
  });

  it("does not happen while the host holds a key down, however long", () => {
    const { room, ids } = roomWith(2);
    room.setKeys(ids[0], GAS); // held, never released
    run(room, MINUTE - 1);
    tap(room, ids[1]);
    run(room, MINUTE * 2);
    tap(room, ids[1]);
    expect(room.hostId()).toBe(ids[0]);
  });
});

describe("a host who was away comes back", () => {
  function hostPassedOn() {
    const { room, ids } = roomWith(2);
    run(room, MINUTE - 1);
    tap(room, ids[1]);
    run(room, 1);
    expect(room.hostId()).toBe(ids[1]);
    return { room, ids };
  }

  it("by pressing any driving key", () => {
    const { room, ids } = hostPassedOn();
    tap(room, ids[0]);
    expect(room.hostId()).toBe(ids[0]);
  });

  it("by pressing R", () => {
    const { room, ids } = hostPassedOn();
    room.restart(ids[0]);
    expect(room.hostId()).toBe(ids[0]);
  });

  it("by pressing Enter: that starts the race at once", () => {
    const { room, ids } = hostPassedOn();
    expect(room.startRace(ids[0])).toBe(true);
    expect(room.phase()).toBe("countdown");
    expect(room.hostId()).toBe(ids[0]);
  });
});

describe("arriving in the room", () => {
  it("counts as being there: a newcomer is not away for their first minute", () => {
    const { room, ids } = roomWith(1);
    run(room, MINUTE * 5); // the first player has sat alone for five minutes
    const second = room.addPlayer().id;
    run(room, MINUTE - 1);
    expect(room.hostId()).toBe(ids[0]); // see the next test for why
    tap(room, second);
    run(room, 1);
    expect(room.hostId()).toBe(second);
  });

  it("gives the host a fresh minute: a host who waited for friends keeps the room when the first one walks in", () => {
    const { room, ids } = roomWith(1);
    run(room, MINUTE * 5);
    const friend = room.addPlayer().id;
    expect(room.hostId()).toBe(ids[0]);
    run(room, MINUTE / 2);
    tap(room, friend);
    run(room, MINUTE / 2 - 1);
    expect(room.hostId()).toBe(ids[0]); // one step short of the host's fresh minute
    run(room, 1);
    expect(room.hostId()).toBe(friend); // the host really is away: the friend can start
  });
});

describe("after a race (Catarina's case, 19 November)", () => {
  // The first finisher gives the others this long. Longer than a minute, so
  // a kart that never moves is long "away" when the race is over.
  const limits = { finishWindowSteps: MINUTE + 600, raceLimitSteps: MINUTE * 4 };

  /** Starts a race and runs past 3, 2, 1. */
  function startRace(room, host) {
    expect(room.startRace(host)).toBe(true);
    run(room, COUNTDOWN_STEPS);
  }

  /** Runs until the race is over. Gives how many steps that took. */
  function runToTheEnd(room) {
    let steps = 0;
    while (room.phase() !== "finished") {
      room.step();
      steps++;
      if (steps > MINUTE * 10) {
        throw new Error("The race did not end");
      }
    }
    return steps;
  }

  it("the host who never touched a key passes the room to the player who arrived second", () => {
    // On the oval, so that nobody is pushed over the finish line by accident.
    const { room, ids } = roomWith(3, TEST_OVAL, limits);
    startRace(room, ids[0]);
    // The second and third are there: a key every ten seconds. The host is a
    // forgotten tab: no key, ever. So the race only ends when its time runs out.
    let steps = 0;
    while (room.phase() !== "finished") {
      if (steps % 600 === 0) {
        tap(room, ids[1]);
        tap(room, ids[2]);
      }
      room.step();
      steps++;
    }
    expect(steps).toBeGreaterThan(MINUTE);
    expect(room.snapshot().karts.find((kart) => kart.id === ids[0]).finished).toBe(false);
    expect(room.hostId()).toBe(ids[1]); // the player who entered the room second
    expect(room.startRace(ids[2])).toBe(false);
    expect(room.startRace(ids[1])).toBe(true); // the next race can start without the first player
  });

  it("also when the others finished long before: they were there, the host was not", () => {
    // Two drivers on the short straight track. The host is put behind them,
    // by arriving and then letting the front places be taken first.
    const room = createRoom(createSprintTrack(), TEST_DRIVER, undefined, null, limits);
    const spare = room.addPlayer().id; //   takes the front place for a moment
    const second = room.addPlayer().id;
    room.removePlayer(spare);
    const third = room.addPlayer().id; //   gets the front place the spare one left
    // "second" has now been here longest and is the host; make it the forgotten tab.
    startRace(room, second);
    room.setKeys(third, GAS);
    run(room, 180);
    room.setKeys(third, NO_KEYS);
    const karts = room.snapshot().karts;
    expect(karts.find((kart) => kart.id === third).finished).toBe(true);
    expect(karts.find((kart) => kart.id === second).finished).toBe(false);

    const waited = runToTheEnd(room); // the race only ends when the time for the host's kart runs out
    expect(waited).toBeGreaterThan(MINUTE);
    expect(room.hostId()).toBe(third); // finished, so counted as there; the host pressed nothing
  });

  it("a host who finished and then waited, hands off the keys, for a slow driver is still the host", () => {
    const { room, ids } = roomWith(2, createSprintTrack(), limits);
    startRace(room, ids[0]);
    room.setKeys(ids[0], GAS);
    run(room, 180);
    room.setKeys(ids[0], NO_KEYS); // finished: nothing more to do but wait
    expect(room.snapshot().karts.find((kart) => kart.id === ids[0]).finished).toBe(true);

    // The other player is there, pressing keys now and then, but never reaches the finish.
    let steps = 0;
    while (room.phase() !== "finished") {
      if (steps % 600 === 0) {
        room.setKeys(ids[1], { gas: false, brake: false, left: true, right: false });
        room.setKeys(ids[1], NO_KEYS);
      }
      room.step();
      steps++;
    }
    expect(steps).toBeGreaterThan(MINUTE); // the host waited more than a minute without a key
    expect(room.hostId()).toBe(ids[0]); // finishing the race counts as being there
  });

  it("but a minute after the race is over, a finisher who still presses nothing is away like anyone else", () => {
    const { room, ids } = roomWith(2, createSprintTrack(), limits);
    startRace(room, ids[0]);
    room.setKeys(ids[0], GAS);
    room.setKeys(ids[1], GAS);
    run(room, 180);
    room.setKeys(ids[0], NO_KEYS);
    room.setKeys(ids[1], NO_KEYS);
    expect(room.phase()).toBe("finished");
    run(room, MINUTE - 1);
    tap(room, ids[1]);
    expect(room.hostId()).toBe(ids[0]);
    run(room, 1);
    expect(room.hostId()).toBe(ids[1]);
  });
});

describe("what did not change", () => {
  it("when the host leaves, the next player is the host at once", () => {
    const { room, ids } = roomWith(3);
    room.removePlayer(ids[0]);
    expect(room.hostId()).toBe(ids[1]);
  });

  it("a player who is not the host still cannot start a race, a minute or not, while the host is there", () => {
    const { room, ids } = roomWith(2);
    for (let second = 0; second < 180; second++) {
      tap(room, ids[0]); // the host presses a key every second, for three minutes
      run(room, 60);
      expect(room.startRace(ids[1])).toBe(false);
    }
    expect(room.phase()).toBe("open");
  });

  it("an empty room has no host", () => {
    const { room, ids } = roomWith(1);
    room.removePlayer(ids[0]);
    expect(room.hostId()).toBe(null);
  });

  it("being away changes nothing about a kart: its place on the grid and its race stay as they are", () => {
    const { room, ids } = roomWith(2);
    const before = room.snapshot().karts.map(({ id, place, x, y }) => ({ id, place, x, y }));
    run(room, MINUTE - 1);
    tap(room, ids[1]);
    run(room, 1);
    expect(room.hostId()).toBe(ids[1]);
    expect(room.snapshot().karts.map(({ id, place, x, y }) => ({ id, place, x, y }))).toEqual(before);
    expect(room.playerCount()).toBe(2);
  });
});
