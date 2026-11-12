// A room: the karts of everyone who is driving together online.
//
// This file knows nothing about the internet. It only keeps the list of
// players and moves all their karts with the shared rules. online.js
// connects it to the browsers. Keeping the two apart lets us test the room
// without any network.
//
// For now there is one room, on the test track, for everyone who opens the
// online page. Karts pass through each other. Rooms with codes come later.
//
// A room is always in one of four phases:
//   "open"       nobody has started a race. Everyone drives around freely,
//                and each player's own clock starts at their first key press.
//   "countdown"  the host started a race. Every kart is on the starting grid
//                and 3, 2, 1 is being counted. Keys do nothing.
//   "racing"     GO! Everyone who was in the room at the start is racing.
//   "finished"   every racer has finished. The room waits for the next start.
//
// The host is the player who has been in the room longest. Only the host
// can start a race. Someone who joins while a race is on does not get a kart
// on the track: they watch, and join in at the next start.

import { createKart } from "../shared/physics.js";
import { createProgress, fastestLapSteps } from "../shared/laps.js";
import { stepRacer } from "../shared/race.js";
import { countdownAt } from "../shared/countdown.js";

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
  const players = new Map(); // player number -> { id, place, racer, keys, racing }
  let nextId = 1;
  let step = 0;
  let phase = "open"; //      "open", "countdown", "racing" or "finished"
  let countdownSteps = 0; //  steps since the host started the race
  let finishedSoFar = 0; //   how many racers have finished the race that is on
  let newFinishes = []; //    the finishes that takeFinishes() has not handed out yet

  /** The players who are in the race that is on. Nobody, while the room is open. */
  function racers() {
    return [...players.values()].filter((player) => player.racing);
  }

  /** The player who has been here longest, or null in an empty room. Numbers only go up, so that is the lowest one. */
  function hostId() {
    return players.size === 0 ? null : Math.min(...players.keys());
  }

  /** Back to free driving, with every kart on its starting place. */
  function openTheRoom() {
    phase = "open";
    countdownSteps = 0;
    for (const player of players.values()) {
      player.racing = false;
      player.racer = racerAtStart(track, player.place);
    }
  }

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
     * Someone who joins while a race is on watches until the next start.
     */
    addPlayer() {
      const place = freePlace();
      if (place === null) {
        return null;
      }
      const id = nextId++;
      players.set(id, { id, place, racer: racerAtStart(track, place), keys: NO_KEYS, racing: false });
      return { id, place };
    },

    /**
     * Takes a player's kart out of the room. Their place becomes free.
     * If that was the last racer of a race, the race is over and the room
     * goes back to free driving, so that the people watching are not stuck.
     */
    removePlayer(id) {
      players.delete(id);
      if (phase !== "open" && racers().length === 0) {
        openTheRoom();
      }
    },

    /** The number of the player who may start a race, or null in an empty room. */
    hostId,

    /** "open", "countdown", "racing" or "finished". */
    phase() {
      return phase;
    },

    /**
     * Starts a race for everyone who is in the room now: every kart goes
     * back to its starting place with its laps and clock at zero, and the
     * countdown begins. Says false, and changes nothing, unless the player
     * asking is the host. Also says false while a countdown is running, so
     * that pressing the key twice does not start the countdown over.
     */
    startRace(id) {
      if (!players.has(id) || id !== hostId() || phase === "countdown") {
        return false;
      }
      phase = "countdown";
      countdownSteps = 0;
      finishedSoFar = 0;
      for (const player of players.values()) {
        player.racing = true;
        player.racer = racerAtStart(track, player.place);
      }
      return true;
    },

    /**
     * The racers who crossed the finish line since this was last asked, in
     * the order they finished: [{ id, position, raceSteps, bestLapSteps }].
     * Each finish is handed out once. Only races that began with the
     * countdown are listed: laps driven while the room is open are not.
     * Two racers who finish in the very same step share a position.
     * online.js uses this to save results for signed-in players.
     */
    takeFinishes() {
      const finishes = newFinishes;
      newFinishes = [];
      return finishes;
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

    /**
     * Puts a player's kart back at its start, with its laps and clock at zero.
     * Only while the room is open. In a race it says false and changes
     * nothing: a racer could otherwise give themselves a fresh clock.
     */
    restart(id) {
      const player = players.get(id);
      if (player === undefined || phase !== "open") {
        return false;
      }
      player.racer = racerAtStart(track, player.place);
      return true;
    },

    /**
     * Moves the room forward by one step of game time.
     *
     * While the room is open: a kart that has not started yet and has no
     * key held is left alone, so a player's clock starts at their first key
     * press.
     *
     * In a race: during 3, 2 and 1 nothing moves. From GO on, every racer
     * is moved, key held or not, so everyone's clock starts at the same
     * step. The karts of people who are watching are never moved.
     */
    step() {
      step++;

      if (phase === "open") {
        for (const player of players.values()) {
          const waitingToStart = player.racer.progress.steps === 0 && !anyKeyHeld(player.keys);
          if (!waitingToStart) {
            player.racer = stepRacer(track, player.racer, player.keys, character);
          }
        }
        return;
      }

      const inTheRace = racers();
      if (countdownAt(countdownSteps).racing) {
        const finishedBeforeThisStep = finishedSoFar;
        for (const player of inTheRace) {
          const wasFinished = player.racer.progress.finished;
          player.racer = stepRacer(track, player.racer, player.keys, character);
          const { finished, steps, lapSteps } = player.racer.progress;
          if (finished && !wasFinished) {
            finishedSoFar++;
            newFinishes.push({
              id: player.id,
              position: finishedBeforeThisStep + 1,
              raceSteps: steps,
              bestLapSteps: fastestLapSteps(lapSteps),
            });
          }
        }
      }
      countdownSteps++;

      if (inTheRace.every((player) => player.racer.progress.finished)) {
        phase = "finished";
      } else if (countdownAt(countdownSteps).racing) {
        phase = "racing";
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
     *
     * "karts" lists the karts on the track: everyone while the room is
     * open, and only the racers during a race. "race" says which phase the
     * room is in, how far the countdown is, who the host is, and who is
     * watching without a kart.
     */
    snapshot() {
      const everyone = [...players.values()];
      const onTrack = phase === "open" ? everyone : everyone.filter((player) => player.racing);
      return {
        type: "state",
        step,
        race: {
          phase,
          countdownSteps,
          host: hostId(),
          watching: everyone.filter((player) => !onTrack.includes(player)).map((player) => player.id),
        },
        karts: onTrack.map(({ id, place, racer }) => ({
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
