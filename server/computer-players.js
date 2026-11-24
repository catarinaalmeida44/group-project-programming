// Computer karts in an online room.
//
// When the host starts a race, the characters nobody in the room is become
// computer karts for that race, until the race has KARTS_IN_A_FULL_RACE
// karts. They drive exactly like the computer karts of a single race: the
// same brain (shared/computer-driver.js, utility AI), and the personalities
// dealt out again for each race from the race's seed.
//
// To the room (room.js), a computer kart is simply a player: it has a place
// on the grid, keys and a kart that the room moves with the shared rules,
// like everyone else's. The only difference is who presses its keys: not a
// browser, but this file, on the server, once every step. So a computer kart
// can do nothing a player could not, and no browser can steer one.
//
// This file uses only what the room already offers (addPlayer, setKeys,
// snapshot ...), so the room itself did not have to change.
//
// Like room.js, this file knows nothing about the internet, so it is tested
// without any network.

import { CAST } from "../shared/cast.js";
import { createComputerDriver, decide, personalityInRace, moodFor, atLevel, isLevel, DEFAULT_LEVEL } from "../shared/computer-driver.js";
import { walkerSpots } from "../shared/walkers.js";

/** How many karts a race has once computer karts fill it: one for each character. */
export const KARTS_IN_A_FULL_RACE = CAST.length;

const NO_KEYS = Object.freeze({ gas: false, brake: false, left: false, right: false });

/**
 * The computer karts of one room.
 *   track      the room's track
 *   line       the racing line of that track: points { x, y } (client/route.js).
 *              With no line (fewer than 3 points) there are never any computer
 *              karts: they would not know the way
 *   character  the driver stats every kart uses (the same as the room's)
 */
export function createComputerPlayers(track, line, character) {
  const knowsTheWay = Array.isArray(line) && line.length >= 3;
  const drivers = new Map(); // player number in the room -> driver (with its character)

  return {
    /** Is this player number one of the computer karts? */
    isComputer(id) {
      return drivers.has(id);
    },

    /** The player numbers of the computer karts, lowest first. */
    ids() {
      return [...drivers.keys()].sort((a, b) => a - b);
    },

    /**
     * Fills the room with computer karts, one for each character nobody is,
     * until it has "total" karts or there is no free place or character left.
     * Each computer kart becomes its character in the cast keeper (so no
     * player can be that character during the race) and gets its colours.
     * Gives how many were added. Call it just before the race starts.
     * "seed" is a random number for this race: each computer kart drives in a
     * mood picked from it (computer-driver.js). null: no mood, each drives
     * exactly as its personality.
     * "level" is how good they are in this race: "easy", "normal" (as they
     * always drove, and what they are when it is left out) or "hard". The
     * host chooses it in the game settings (shared/game-settings.js).
     */
    fill(room, cast, total = KARTS_IN_A_FULL_RACE, seed = null, level = DEFAULT_LEVEL) {
      if (!Number.isInteger(total) || total < 0) {
        throw new RangeError("fill: the number of karts must be a whole number from 0 up");
      }
      if (!isLevel(level)) {
        throw new RangeError("fill: the level must be easy, normal or hard");
      }
      let added = 0;
      while (knowsTheWay && room.playerCount() < total) {
        const player = room.addPlayer();
        if (player === null) {
          break; // no free place on the grid
        }
        const given = cast.giveFree(player.id, true);
        if (given === null) {
          room.removePlayer(player.id); // every character is somebody already
          break;
        }
        room.setLook(player.id, given.look);
        const personality = personalityInRace(given.id, seed); // dealt out for this race, as in a single race
        // Its mood of the day, moved up or down by the level, exactly as in a single race (shared/practice-race.js).
        const mood = atLevel(moodFor(personality, seed, given.id), level);
        drivers.set(player.id, { ...createComputerDriver(personality, mood), character: given });
        added++;
      }
      return added;
    },

    /**
     * Takes one computer kart out of the room, the one that came in last, so
     * a person who arrives at a full room still gets in (during a race, to
     * watch). Its place and character are free again; the others race on.
     * Gives true if one left, false if there was none.
     */
    makeWayForAPerson(room, cast) {
      const ids = this.ids();
      if (ids.length === 0) {
        return false;
      }
      const last = ids[ids.length - 1];
      cast.forget(last);
      room.removePlayer(last);
      drivers.delete(last);
      return true;
    },

    /** Takes every computer kart out of the room. Their places and characters are free again. */
    clear(room, cast) {
      for (const id of drivers.keys()) {
        cast.forget(id);
        room.removePlayer(id);
      }
      drivers.clear();
    },

    /**
     * Presses the keys of every computer kart for the next step, from the
     * room as it is now. Before GO and after the race keys do nothing, so
     * nothing is decided then.
     */
    drive(room) {
      if (drivers.size === 0) {
        return;
      }
      const now = room.snapshot();
      if (now.race.phase !== "racing") {
        return;
      }
      // What a driver steers round: the bananas, and the people out on the
      // track and standing up (as in shared/practice-race.js).
      const walkers = (now.walkers ?? []).map(({ time, down }) => ({ time, downSteps: down }));
      const toSteerRound = [...now.bananas, ...walkerSpots(track, walkers)];
      for (const [id, driver] of drivers) {
        const kart = now.karts.find((each) => each.id === id);
        if (kart === undefined) {
          continue; // not on the track
        }
        if (kart.finished) {
          room.setKeys(id, NO_KEYS);
          continue;
        }
        const racer = { kart: { x: kart.x, y: kart.y, angle: kart.angle, vx: kart.vx, vy: kart.vy }, spinSteps: kart.spin };
        const others = now.karts.filter((each) => each.id !== id).map(({ x, y }) => ({ x, y }));
        const decision = decide(driver, track, racer, line, others, toSteerRound, character);
        drivers.set(id, { ...decision.driver, character: driver.character });
        room.setKeys(id, decision.keys);
      }
    },
  };
}

/**
 * Should the computer karts leave the room now? Yes when no person is left
 * in the room; when a race is on but no person is racing in it any more
 * (computer karts do not race on alone); and, while no race is on, when one
 * of them would be the host (only a person may start a race).
 */
export function computersShouldLeave(room, computers) {
  const ids = computers.ids();
  if (ids.length === 0) {
    return false;
  }
  const people = room.playerCount() - ids.length;
  if (people === 0) {
    return true;
  }
  const phase = room.phase();
  if (phase === "countdown" || phase === "racing") {
    const racing = room.snapshot().karts.filter((kart) => !computers.isComputer(kart.id));
    return racing.length === 0;
  }
  return computers.isComputer(room.hostId());
}
