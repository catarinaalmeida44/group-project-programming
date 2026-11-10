// A room: the karts of everyone who is driving together online.
//
// This file knows nothing about the internet. It only keeps the list of
// players and moves all their karts with the shared rules. online.js
// connects it to the browsers. Keeping the two apart lets us test the room
// without any network.
//
// For now there is one room, on the test track, where everyone who opens
// the online page drives around together. There is no race start and karts
// pass through each other. Rooms with codes, a host and a start come later.

import { createKart } from "../shared/physics.js";
import { createProgress } from "../shared/laps.js";
import { stepRacer } from "../shared/race.js";

/** How many players fit in a room. */
export const MAX_PLAYERS = 8;

/** The server sends everyone an update once every this many steps: 60 / 3 = 20 times a second. */
export const STEPS_PER_UPDATE = 3;

// The starting places: two columns, with each row a little further back.
const GAP_SIDEWAYS = 18;
const GAP_BEHIND = 28;

const NO_KEYS = { gas: false, brake: false, left: false, right: false };

/** Makes an empty room on a track. Every kart in it uses the same driver for now. */
export function createRoom(track, character, maxPlayers = MAX_PLAYERS) {
  const players = new Map(); // player number -> { id, place, racer, keys }
  let nextId = 1;
  let step = 0;

  /** The lowest starting place nobody is using, or null if the room is full. */
  function freePlace() {
    const taken = new Set([...players.values()].map((player) => player.place));
    for (let place = 0; place < maxPlayers; place++) {
      if (!taken.has(place)) {
        return place;
      }
    }
    return null;
  }

  return {
    /**
     * Lets a new player in. Gives { id, place }, or null if the room is full.
     * "id" is the player's number: it is never used again in this room.
     * "place" is the starting place, which also decides the kart's colour.
     */
    addPlayer() {
      const place = freePlace();
      if (place === null) {
        return null;
      }
      const id = nextId++;
      players.set(id, { id, place, racer: racerAtStart(track, place), keys: NO_KEYS });
      return { id, place };
    },

    /** Takes a player's kart out of the room. Their place becomes free. */
    removePlayer(id) {
      players.delete(id);
    },

    /** Remembers which keys a player is holding. Says false if there is no such player. */
    setKeys(id, keys) {
      const player = players.get(id);
      if (player === undefined) {
        return false;
      }
      // Copy only the four answers, and only an exact "true" counts.
      player.keys = {
        gas: keys?.gas === true,
        brake: keys?.brake === true,
        left: keys?.left === true,
        right: keys?.right === true,
      };
      return true;
    },

    /** Puts a player's kart back at its start, with its laps and clock at zero. */
    restart(id) {
      const player = players.get(id);
      if (player === undefined) {
        return false;
      }
      player.racer = racerAtStart(track, player.place);
      return true;
    },

    /**
     * Moves every kart forward by one step of game time.
     * A kart that has not started yet and has no key held is left alone, so
     * a player's clock starts at their first key press, as in practice.
     */
    step() {
      step++;
      for (const player of players.values()) {
        const waitingToStart = player.racer.progress.steps === 0 && !anyKeyHeld(player.keys);
        if (!waitingToStart) {
          player.racer = stepRacer(track, player.racer, player.keys, character);
        }
      }
    },

    /** How many steps this room has run. */
    stepCount() {
      return step;
    },

    playerCount() {
      return players.size;
    },

    /**
     * Everything a browser needs to draw the room: where each kart is and
     * how far along each driver is. Numbers are rounded to keep it short.
     */
    snapshot() {
      return {
        type: "state",
        step,
        karts: [...players.values()].map(({ id, place, racer }) => ({
          id,
          place,
          x: round(racer.kart.x, 1),
          y: round(racer.kart.y, 1),
          angle: round(racer.kart.angle, 3),
          vx: round(racer.kart.vx, 1),
          vy: round(racer.kart.vy, 1),
          lapsDone: racer.progress.lapsDone,
          steps: racer.progress.steps,
          lapSteps: racer.progress.lapSteps,
          finished: racer.progress.finished,
        })),
      };
    },
  };
}

/** A racer standing still on one of the starting places of a track. */
function racerAtStart(track, place) {
  const { x, y, angle } = track.start;
  const side = place % 2 === 0 ? -1 : 1; // left column, right column
  const row = Math.floor(place / 2);
  // "forward" is the direction the karts point. "right" is a quarter turn clockwise from it.
  const forwardX = Math.cos(angle);
  const forwardY = Math.sin(angle);
  const rightX = -forwardY;
  const rightY = forwardX;
  return {
    kart: createKart(
      x + rightX * side * GAP_SIDEWAYS - forwardX * row * GAP_BEHIND,
      y + rightY * side * GAP_SIDEWAYS - forwardY * row * GAP_BEHIND,
      angle,
    ),
    progress: createProgress(),
  };
}

function anyKeyHeld(keys) {
  return keys.gas || keys.brake || keys.left || keys.right;
}

function round(number, decimals) {
  const factor = 10 ** decimals;
  return Math.round(number * factor) / factor;
}
