// A room: the karts of everyone who is driving together online.
//
// This file knows nothing about the internet. It only keeps the list of
// players and moves all their karts with the shared rules. online.js
// connects it to the browsers. Keeping the two apart lets us test the room
// without any network.
//
// There is one room for each track (online.js makes them). Rooms with codes
// come later.
//
// Karts on the track bump into each other (shared/bumps.js), while the room
// is open and in a race. A bump moves karts and changes their speed. It
// never touches anyone's laps or clock.
//
// A race that began with the countdown has bananas (shared/hazards.js): the
// first one a few seconds after GO. A kart that drives over one spins out.
// There are none while the room is open and none during 3, 2, 1. Where they
// appear is decided here on the server, from a number (the "seed") the room
// picks when the race starts. No message from a browser can place or remove
// a banana, or choose the seed. (A room that was given no way to pick a
// seed has no bananas at all. Every online room is given one, by online.js.)
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

import { fastestLapSteps } from "../shared/laps.js";
import { createRacer, stepRacer, rollRacer } from "../shared/race.js";
import { countdownAt } from "../shared/countdown.js";
import { GRID_PLACES } from "../shared/grid.js";
import { bumpKarts } from "../shared/bumps.js";
import { createBananaMaker, stepBananas, SEED_COUNT } from "../shared/hazards.js";
import { cleanLookChoice } from "../shared/kart-looks.js";

/** How many players fit in a room: one for each place on the starting grid (shared/grid.js). */
export const MAX_PLAYERS = GRID_PLACES;

/** The server sends everyone an update once every this many steps: 60 / 3 = 20 times a second. */
export const STEPS_PER_UPDATE = 3;

const NO_KEYS = { gas: false, brake: false, left: false, right: false };

/**
 * Picks a seed by chance, for the bananas of one race. This is the only
 * place where real chance enters a race: the rules in shared/ never use it.
 */
export function randomSeed() {
  return Math.floor(Math.random() * SEED_COUNT);
}

/**
 * Makes an empty room on a track. Every kart in it uses the same driver for now.
 *
 *   pickSeed   a function the room calls each time a race starts, to get
 *              the seed of that race's bananas. online.js gives randomSeed.
 *              A test gives a function that always answers the same number,
 *              to get the same bananas every time. Left out, the races of
 *              this room have no bananas.
 */
export function createRoom(track, character, maxPlayers = MAX_PLAYERS, pickSeed = null) {
  if (pickSeed !== null && typeof pickSeed !== "function") {
    throw new TypeError("createRoom: pickSeed must be a function that gives a seed, or left out");
  }
  const players = new Map(); // player number -> { id, place, racer, keys, racing }
  let nextId = 1;
  let step = 0;
  let phase = "open"; //      "open", "countdown", "racing" or "finished"
  let countdownSteps = 0; //  steps since the host started the race
  let finishedSoFar = 0; //   how many racers have finished the race that is on
  let newFinishes = []; //    the finishes that takeFinishes() has not handed out yet
  let bananas = []; //        the banana peels on the road: [{ id, x, y }]. Only ever during a race
  let bananaMaker = null; //  what decides when and where the next banana appears. null: no bananas

  /** The players who are in the race that is on. Nobody, while the room is open. */
  function racers() {
    return [...players.values()].filter((player) => player.racing);
  }

  /**
   * The players whose kart is on the track: everyone while the room is
   * open, and only the racers during a race. Someone who is watching has no
   * kart on the track, so nothing can touch it and it is not shown.
   */
  function onTrack() {
    return phase === "open" ? [...players.values()] : racers();
  }

  /**
   * Lets the karts on the track bump into each other (shared/bumps.js).
   * Only the karts change. Laps and clocks are left exactly as they were.
   */
  function bump() {
    const drivers = onTrack();
    const before = drivers.map((player) => player.racer.kart);
    const after = bumpKarts(track, before);
    drivers.forEach((player, index) => {
      if (after[index] !== before[index]) {
        player.racer = { ...player.racer, kart: after[index] };
      }
    });
  }

  /** The player who has been here longest, or null in an empty room. Numbers only go up, so that is the lowest one. */
  function hostId() {
    return players.size === 0 ? null : Math.min(...players.keys());
  }

  /** Back to free driving, with every kart on its starting place and no bananas. */
  function openTheRoom() {
    phase = "open";
    countdownSteps = 0;
    bananas = [];
    bananaMaker = null;
    for (const player of players.values()) {
      player.racing = false;
      player.racer = createRacer(track, player.place);
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
      players.set(id, { id, place, racer: createRacer(track, place), keys: NO_KEYS, racing: false });
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
     * back to its starting place with its laps and clock at zero, the
     * bananas of the race before are cleared away, and the countdown
     * begins. Says false, and changes nothing, unless the player asking is
     * the host. Also says false while a countdown is running, so that
     * pressing the key twice does not start the countdown over.
     *
     * This is also the moment the room picks the seed of the race's bananas.
     * Nothing given to startRace can choose it.
     */
    startRace(id) {
      if (!players.has(id) || id !== hostId() || phase === "countdown") {
        return false;
      }
      // (A seed that is not a whole number is refused here with an error, before anything changes.)
      bananaMaker = pickSeed === null ? null : createBananaMaker(pickSeed());
      bananas = [];
      phase = "countdown";
      countdownSteps = 0;
      finishedSoFar = 0;
      for (const player of players.values()) {
        player.racing = true;
        player.racer = createRacer(track, player.place);
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
     * Remembers the colours a player chose for their kart, so that the
     * other players see them. A choice is three small whole numbers
     * (shared/kart-looks.js). Says false, and changes nothing, if there is
     * no such player or the choice is not one that is allowed. A choice
     * changes how a kart is drawn and nothing else: not its place on the
     * grid, not its speed.
     */
    setLook(id, choice) {
      const player = players.get(id);
      const look = cleanLookChoice(choice);
      if (player === undefined || look === null) {
        return false;
      }
      player.look = look;
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
      player.racer = createRacer(track, player.place);
      return true;
    },

    /**
     * Moves the room forward by one step of game time.
     *
     * While the room is open: a kart that has not started yet and has no
     * key held is parked, so a player's clock starts at their first key
     * press. A parked kart that is pushed by another kart rolls to a stop,
     * but its clock stays at zero and its checkpoints are not counted.
     *
     * In a race: during 3, 2 and 1 nothing moves. From GO on, every racer
     * is moved, key held or not, so everyone's clock starts at the same
     * step. The karts of people who are watching are never moved.
     *
     * In both cases the karts on the track then bump into each other. In a
     * race, from GO on, the bananas come last.
     */
    step() {
      step++;

      if (phase === "open") {
        for (const player of players.values()) {
          if (!isParked(player)) {
            player.racer = stepRacer(track, player.racer, player.keys, character);
          } else if (isMoving(player.racer.kart)) {
            // Parked, but pushed by a bump: the kart rolls to a stop. Its clock stays at zero.
            player.racer = rollRacer(track, player.racer, character);
          }
        }
        bump();
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
        bump(); // a kart that has finished can still be bumped: its result stands

        // The bananas: whoever touches one spins out, and now and then a new one appears.
        const after = stepBananas(
          track,
          bananas,
          bananaMaker,
          inTheRace.map((player) => player.racer),
        );
        bananas = after.bananas;
        bananaMaker = after.maker;
        inTheRace.forEach((player, index) => {
          player.racer = after.racers[index];
        });
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
     * open, and only the racers during a race. "spin" is how many more
     * steps a kart will spin (0 when it is not spinning). "race" says which
     * phase the room is in, how far the countdown is, who the host is, and
     * who is watching without a kart. "bananas" lists the banana peels on
     * the road: none while the room is open or during the countdown.
     */
    snapshot() {
      const everyone = [...players.values()];
      const drivers = onTrack();
      return {
        type: "state",
        step,
        race: {
          phase,
          countdownSteps,
          host: hostId(),
          watching: everyone.filter((player) => !drivers.includes(player)).map((player) => player.id),
        },
        karts: drivers.map(({ id, place, racer, look }) => ({
          id,
          place,
          // The colours the player chose, if they chose any. Without them
          // the page gives the kart the colours of its starting place.
          ...(look === undefined ? {} : { look: { ...look } }),
          x: round(racer.kart.x, 1),
          y: round(racer.kart.y, 1),
          angle: round(racer.kart.angle, 3),
          vx: round(racer.kart.vx, 1),
          vy: round(racer.kart.vy, 1),
          lapsDone: racer.progress.lapsDone,
          steps: racer.progress.steps,
          lapSteps: racer.progress.lapSteps,
          finished: racer.progress.finished,
          spin: racer.spinSteps,
        })),
        bananas: bananas.map(({ id, x, y }) => ({ id, x: round(x, 1), y: round(y, 1) })),
      };
    },
  };
}

function anyKeyHeld(keys) {
  return keys.gas || keys.brake || keys.left || keys.right;
}

/** While the room is open: has this player not started driving yet? Their clock is at zero and no key is held. */
function isParked(player) {
  return player.racer.progress.steps === 0 && !anyKeyHeld(player.keys);
}

function isMoving(kart) {
  return kart.vx !== 0 || kart.vy !== 0;
}

function round(number, decimals) {
  const factor = 10 ** decimals;
  return Math.round(number * factor) / factor;
}
