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
// Karts on the track bump into each other (shared/bumps.js) in a race. A
// bump moves karts and changes their speed. It never touches anyone's laps
// or clock. While the room waits for a start nothing moves, so nothing bumps.
//
// A race that began with the countdown has bananas (shared/hazards.js): the
// first one a few seconds after GO. A kart that drives over one spins out.
// There are none while the room is open and none during 3, 2, 1. Where they
// appear is decided here on the server, from a number (the "seed") the room
// picks when the race starts. No message from a browser can place or remove
// a banana, or choose the seed. (A room that was given no way to pick a
// seed has no bananas at all. Every online room is given one, by online.js.)
//
// A track can also have ramps (shared/ramps.js) and people who walk across
// it (shared/walkers.js). A kart that drives over a ramp fast enough jumps
// and gets extra speed: that is part of moving a kart, in shared/race.js.
// The walkers are kept here, one list for the race: they stand still until
// GO and are put back at each start. Who jumps and who topples a walker is
// worked out here on the server, from the keys a player holds and nothing
// else. No message from a browser can move a walker, topple one or make a
// kart jump.
//
// A room is always in one of four phases:
//   "open"       waiting for the host to start a race. Every kart stands still
//                on its place on the starting grid, and keys do nothing.
//                (Until 17 Nov 2026 everyone could drive around freely here.)
//   "countdown"  the host started a race. Every kart is on the starting grid
//                and 3, 2, 1 is being counted. Keys do nothing.
//   "racing"     GO! Everyone who was in the room at the start is racing.
//   "finished"   the race is over: every racer has finished, or the time
//                ran out. The room waits for the next start.
//
// The host is the player who has been in the room longest AND is at their
// keyboard. Only the host can start a race, and only when no race is on: a
// race that has begun is driven to its end. Someone who joins while a race
// is on does not get a kart on the track: they watch, and join in at the
// next start.
//
// "At their keyboard" (since 19 November 2026): a player who has pressed no
// key for a minute counts as away, and the host passes to the next player
// in the order they arrived. Before that, a tab someone had forgotten, or a
// player who had walked off, stayed the host for ever, and nobody else
// could start a race. Pressing any key brings a player back. Finishing a
// race counts as being there, and so does having just arrived. If everyone
// is away, the host is simply whoever has been here longest.
//
// So that a race always does end, it has two time limits. Once the first
// racer has finished, the others have FINISH_WINDOW_STEPS left. And no race
// lasts longer than RACE_LIMIT_STEPS after GO. A racer who has not finished
// when the time runs out gets no result.

import { fastestLapSteps } from "../shared/laps.js";
import { createRacer, stepRacer } from "../shared/race.js";
import { countdownAt, COUNTDOWN_STEPS } from "../shared/countdown.js";
import { FINISH_WINDOW_STEPS, RACE_LIMIT_STEPS } from "../shared/race-time.js";
import { GRID_PLACES } from "../shared/grid.js";
import { bumpKarts } from "../shared/bumps.js";
import { createBananaMaker, stepBananas, SEED_COUNT } from "../shared/hazards.js";
import { createWalkers, stepWalkers } from "../shared/walkers.js";
import { cleanLookChoice } from "../shared/kart-looks.js";

/** How many players fit in a room: one for each place on the starting grid (shared/grid.js). */
export const MAX_PLAYERS = GRID_PLACES;

/** A player who has pressed no key for this many steps counts as away from the keyboard: one minute. */
export const AWAY_AFTER_STEPS = 60 * 60;

/** The server sends everyone an update once every this many steps: 60 / 3 = 20 times a second. */
export const STEPS_PER_UPDATE = 3;

// The two time limits of a race: two minutes after the first finish, ten
// minutes after GO. They live in shared/race-time.js, because the page
// shows the time that is left. They are handed on here for the tests.
export { FINISH_WINDOW_STEPS, RACE_LIMIT_STEPS };

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
 *   limits     the two time limits of a race, in steps: { finishWindowSteps,
 *              raceLimitSteps }. Left out, they are FINISH_WINDOW_STEPS and
 *              RACE_LIMIT_STEPS, as in every online room. A test gives
 *              shorter ones, to reach the end of the time quickly.
 */
export function createRoom(track, character, maxPlayers = MAX_PLAYERS, pickSeed = null, limits = {}) {
  if (pickSeed !== null && typeof pickSeed !== "function") {
    throw new TypeError("createRoom: pickSeed must be a function that gives a seed, or left out");
  }
  const { finishWindowSteps = FINISH_WINDOW_STEPS, raceLimitSteps = RACE_LIMIT_STEPS } = limits ?? {};
  if (![finishWindowSteps, raceLimitSteps].every((steps) => Number.isInteger(steps) && steps > 0)) {
    throw new RangeError("createRoom: the time limits of a race must be whole numbers of steps above zero");
  }
  const players = new Map(); // player number -> { id, place, racer, keys, racing, activeAt }
  let nextId = 1;
  let step = 0;
  let phase = "open"; //      "open", "countdown", "racing" or "finished"
  let countdownSteps = 0; //  steps since the host started the race
  let closesAt = 0; //        when countdownSteps reaches this, the race is over, whoever is still driving
  let finishedSoFar = 0; //   how many racers have finished the race that is on
  let newFinishes = []; //    the finishes that takeFinishes() has not handed out yet
  let bananas = []; //        the banana peels on the road: [{ id, x, y }]. Only ever during a race
  let bananaMaker = null; //  what decides when and where the next banana appears. null: no bananas
  let walkers = createWalkers(track); // what is remembered about each walker: [{ time, downSteps }]. Empty on most tracks

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

  /**
   * Is this player away from the keyboard? Yes when they hold no key and
   * the last sign of them (see iAmHere) is a minute old.
   */
  function isAway(player) {
    const holdsAKey = player.keys.gas || player.keys.brake || player.keys.left || player.keys.right;
    return !holdsAKey && step - player.activeAt >= AWAY_AFTER_STEPS;
  }

  /** A sign that a player is at the keyboard: they arrived, pressed or released a key, or finished a race. */
  function iAmHere(player) {
    player.activeAt = step;
  }

  /**
   * The host, or null in an empty room: the player who has been here
   * longest among those at their keyboard. Numbers only go up, so that is
   * the lowest number. If everyone is away, it is the lowest number of all.
   */
  function hostId() {
    if (players.size === 0) {
      return null;
    }
    const everyone = [...players.values()];
    const present = everyone.filter((player) => !isAway(player));
    return Math.min(...(present.length > 0 ? present : everyone).map((player) => player.id));
  }

  /** Back to waiting for a start, with every kart on its starting place, no bananas, and the walkers where they begin. */
  function openTheRoom() {
    phase = "open";
    countdownSteps = 0;
    bananas = [];
    bananaMaker = null;
    walkers = createWalkers(track);
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
     *
     * A newcomer gives the host a fresh minute before they can count as
     * away: a host who has sat waiting for friends should not lose the
     * room the moment the first friend walks in.
     */
    addPlayer() {
      const place = freePlace();
      if (place === null) {
        return null;
      }
      const host = players.get(hostId());
      if (host !== undefined) {
        iAmHere(host);
      }
      const id = nextId++;
      players.set(id, { id, place, racer: createRacer(track, place), keys: NO_KEYS, racing: false, activeAt: step });
      return { id, place };
    },

    /**
     * Takes a player's kart out of the room. Their place becomes free.
     * If that was the last racer of a race, the race is over and the room
     * goes back to waiting for a start, so that the people watching are not stuck.
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
     * bananas of the race before are cleared away, the walkers go back to
     * where they begin, and the countdown begins.
     * Says false, and changes nothing, unless the player asking is
     * the host. Also says false while a race is on, from the countdown
     * until the race is over: pressing the key by accident must not throw
     * away the race everyone is driving. (Until 13 November 2026 the host
     * could start over in the middle of a race.)
     *
     * This is also the moment the room picks the seed of the race's bananas.
     * Nothing given to startRace can choose it.
     */
    startRace(id) {
      // Asking for a start is a key press: whoever asks is at their keyboard.
      // So a host who had been counted as away is the host again by asking.
      if (players.has(id)) {
        iAmHere(players.get(id));
      }
      if (!players.has(id) || id !== hostId() || phase === "countdown" || phase === "racing") {
        return false;
      }
      // (A seed that is not a whole number is refused here with an error, before anything changes.)
      bananaMaker = pickSeed === null ? null : createBananaMaker(pickSeed());
      bananas = [];
      walkers = createWalkers(track);
      phase = "countdown";
      countdownSteps = 0;
      closesAt = COUNTDOWN_STEPS + raceLimitSteps;
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
      iAmHere(player); // a key went down or up
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
      if (player !== undefined) {
        iAmHere(player); // the R key
      }
      if (player === undefined || phase !== "open") {
        return false;
      }
      player.racer = createRacer(track, player.place);
      return true;
    },

    /**
     * Moves the room forward by one step of game time.
     *
     * While the room is open, waiting for the host: nothing moves. Every
     * kart stays on its place on the starting grid whatever keys are held,
     * and nobody's clock runs.
     *
     * In a race: during 3, 2 and 1 nothing moves. From GO on, every racer
     * is moved, key held or not, so everyone's clock starts at the same
     * step. The karts of people who are watching are never moved. The karts
     * on the track then bump into each other, then come the bananas, and
     * the walkers last. (A kart that jumps from a ramp does so while it is
     * moved: shared/race.js.)
     *
     * A race is over when every racer has finished, or when its time has
     * run out: two minutes after the first racer finished, and never more
     * than ten minutes after GO. From then on a racer who has not finished
     * cannot finish any more: their keys do nothing, their kart rolls to a
     * stop, and their laps and clock stay as they were.
     */
    step() {
      step++;

      if (phase === "open") {
        return; // waiting for the host: nothing moves
      }

      const inTheRace = racers();
      const raceIsOver = phase === "finished";
      if (countdownAt(countdownSteps).racing) {
        const finishedBeforeThisStep = finishedSoFar;
        for (const player of inTheRace) {
          const wasFinished = player.racer.progress.finished;
          if (raceIsOver && !wasFinished) {
            // Out of time. The kart rolls to a stop (and a spin runs out),
            // but the laps and the clock are put back as they were.
            const rolled = stepRacer(track, player.racer, NO_KEYS, character);
            player.racer = { ...rolled, progress: player.racer.progress };
            continue;
          }
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

        // The walkers: they walk on, and a kart that drives into one fast
        // topples it and loses speed. Only the karts change, never a lap or a clock.
        const street = stepWalkers(
          track,
          walkers,
          inTheRace.map((player) => player.racer),
        );
        walkers = street.walkers;
        inTheRace.forEach((player, index) => {
          player.racer = street.racers[index];
        });

        // The first racer has just finished: the others have two more minutes.
        if (finishedBeforeThisStep === 0 && finishedSoFar > 0) {
          closesAt = Math.min(closesAt, countdownSteps + 1 + finishWindowSteps);
        }
      }
      countdownSteps++;

      if (inTheRace.every((player) => player.racer.progress.finished) || countdownSteps >= closesAt) {
        if (phase !== "finished") {
          // The race is over this very step. Whoever finished it was there,
          // even if they then sat still while the others drove on: they are
          // not counted as away for another minute.
          inTheRace.filter((player) => player.racer.progress.finished).forEach(iAmHere);
        }
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
     * "endsIn" is how many steps are left until the race is over for
     * everyone, while one is being driven, and null at any other time.
     * "passed" is a kart's count of checkpoints (shared/laps.js): the page
     * uses it to show who is in front and which checkpoint comes next.
     *
     * For ramps (shared/ramps.js) a kart also gets "air", how many more
     * steps it is in the air, and "boost", how many more steps it has extra
     * speed. Each is sent only while it is above zero. Left out means 0, so
     * the update stays short: most karts, most of the time, are doing neither.
     *
     * "walkers" is what is remembered about each person who crosses the
     * track (shared/walkers.js), in the order of the track's own list:
     * "time" is the walker's own clock and "down" how many more steps it
     * sits on the ground. The page works out where each one is from that,
     * with the same file the server uses. A track without walkers has no
     * "walkers" in its update at all.
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
          passed: racer.progress.passed,
          lapsDone: racer.progress.lapsDone,
          steps: racer.progress.steps,
          lapSteps: racer.progress.lapSteps,
          finished: racer.progress.finished,
          spin: racer.spinSteps,
          // In the air, and with extra speed, after a ramp: only while they last.
          ...(racer.airSteps > 0 ? { air: racer.airSteps } : {}),
          ...(racer.boostSteps > 0 ? { boost: racer.boostSteps } : {}),
        })),
        bananas: bananas.map(({ id, x, y }) => ({ id, x: round(x, 1), y: round(y, 1) })),
        // The people who cross the track, on a track that has any.
        ...(walkers.length === 0 ? {} : { walkers: walkers.map(({ time, downSteps }) => ({ time, down: downSteps })) }),
        endsIn: phase === "racing" ? Math.max(0, closesAt - countdownSteps) : null,
      };
    },
  };
}

function round(number, decimals) {
  const factor = 10 ** decimals;
  return Math.round(number * factor) / factor;
}
