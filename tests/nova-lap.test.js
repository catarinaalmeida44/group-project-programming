// Tests for shared/tracks/nova-lap.js: the Nova lap, the track drawn from the
// video the team filmed on campus.
//
// The general rules (walls, laps, checkpoints) have their own tests. These
// tests check that this particular drawing is a fair track:
//   - its letters say exactly what the shapes of its ground and buildings say
//   - you start on the road, just behind the finish line
//   - every checkpoint closes the way from wall to wall, and there is no
//     second way round any of them (the lawns are open, so this matters)
//   - a robot can drive the whole race along the painted route
//   - driving the wrong way round never counts a lap
//   - the computer karts can race here too
//
// How the track LOOKS is checked in nova-lap-look.test.js.

import { describe, it, expect } from "vitest";
import { createRacer, stepRacer } from "../shared/race.js";
import { speedOf } from "../shared/physics.js";
import { raceSeconds } from "../shared/laps.js";
import { tileKindAt, isInsideCheckpoint } from "../shared/track.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { createPracticeRace, stepPracticeRace } from "../shared/practice-race.js";
import { NOVA_LAP } from "../shared/tracks/nova-lap.js";
import { lookOfTrack } from "../client/track-looks.js";
import { routePoints } from "../client/route.js";
import { NOVA_LAP_GROUND, NOVA_LAP_SIZE, lettersFromGround } from "../client/nova-lap-ground.js";
import { NOVA_LAP_SOLID } from "../client/nova-lap-buildings.js";

const track = NOVA_LAP;
const size = track.tileSize;

// The way round, in units: the points of the route that is painted on the
// road as arrows (client/nova-lap-look.js). The robot and the computer karts
// both follow it.
const DRIVING_LINE = routePoints(track, lookOfTrack(track).route);

// ---- Helpers ----

// The robot driver: the same few lines as in campus-loop.test.js. It steers
// towards the next point and eases off the gas in sharp turns.
function robotKeys(kart, target) {
  const wantedAngle = Math.atan2(target.y - kart.y, target.x - kart.x);
  const turn = Math.atan2(Math.sin(wantedAngle - kart.angle), Math.cos(wantedAngle - kart.angle));
  return {
    gas: Math.abs(turn) < 1.2 || speedOf(kart) < 120,
    left: turn < -0.05,
    right: turn > 0.05,
  };
}

// How near the robot has to come to a point before it aims at the next one,
// in units. 110 is the number campus-loop.test.js uses. Some points of this
// route are closer together than that (the two at the top of the slanting
// path are 79 units apart), so smaller numbers were tried as well. With 110
// the robot still goes round without touching a wall or the grass. With 50
// or less it is worse: the robot cannot turn tightly enough to come that
// near to a point at full speed, and circles round it for ever. So it stays 110.
const REACH = 110;

/** Lets the robot visit the points over and over, for up to a number of seconds or until it finishes. */
function robotDrive(racer, points, seconds, everyStep = () => {}) {
  let pointNumber = 0;
  for (let step = 0; step < seconds * 60 && !racer.progress.finished; step++) {
    const target = points[pointNumber];
    if (Math.hypot(target.x - racer.kart.x, target.y - racer.kart.y) < REACH) {
      pointNumber = (pointNumber + 1) % points.length;
    }
    racer = stepRacer(track, racer, robotKeys(racer.kart, points[pointNumber]), TEST_DRIVER);
    everyStep(racer);
  }
  return racer;
}

/** The squares a checkpoint covers, as [column, row]. */
function squaresOf(checkpoint) {
  const squares = [];
  for (let row = checkpoint.top / size; row < checkpoint.bottom / size; row++) {
    for (let column = checkpoint.left / size; column < checkpoint.right / size; column++) {
      squares.push([column, row]);
    }
  }
  return squares;
}

const nameOf = ([column, row]) => `${column} ${row}`;
const isOpen = ([column, row]) =>
  row >= 0 && column >= 0 && row < track.rows && column < track.columns && track.map[row][column] !== "#";

/**
 * The squares the route runs over, in driving order: the route is walked in
 * steps of 4 units (an eighth of a square) and the square under each step is
 * written down, as [column, row].
 */
function squaresAlongTheRoute() {
  const squares = [];
  for (let i = 0; i < DRIVING_LINE.length; i++) {
    const from = DRIVING_LINE[i];
    const to = DRIVING_LINE[(i + 1) % DRIVING_LINE.length];
    const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4);
    for (let step = 0; step < steps; step++) {
      const x = from.x + ((to.x - from.x) * step) / steps;
      const y = from.y + ((to.y - from.y) * step) / steps;
      squares.push([Math.floor(x / size), Math.floor(y / size)]);
    }
  }
  return squares;
}

/**
 * One open square just before a checkpoint and one just after it, along the
 * route. Gives { before, after }, each as [column, row].
 */
function squaresEitherSideOf(checkpoint, alongTheRoute) {
  const inCheckpoint = new Set(squaresOf(checkpoint).map(nameOf));
  const count = alongTheRoute.length;
  const isIn = (index) => inCheckpoint.has(nameOf(alongTheRoute[((index % count) + count) % count]));
  const usable = (index) => !isIn(index) && isOpen(alongTheRoute[((index % count) + count) % count]);
  // Where the route drives into the checkpoint.
  let entry = 0;
  while (entry < count && !(isIn(entry) && !isIn(entry - 1))) {
    entry++;
  }
  if (entry === count) {
    throw new Error(`the route never drives into "${checkpoint.name}"`);
  }
  // Back from there to the last square outside it, and on to the first square after it.
  let before = entry - 1;
  while (!usable(before)) {
    before--;
  }
  let after = entry;
  while (!usable(after)) {
    after++;
  }
  return { before: alongTheRoute[((before % count) + count) % count], after: alongTheRoute[after % count] };
}

/**
 * Can a kart get from one square to another? Squares are connected when
 * they are neighbours (up, down, left, right) and neither is a wall.
 * "closed" is a Set of squares ("column row") that count as wall as well.
 */
function isConnected(from, to, closed) {
  const seen = new Set([nameOf(from)]);
  const toVisit = [from];
  while (toVisit.length > 0) {
    const [column, row] = toVisit.pop();
    if (column === to[0] && row === to[1]) {
      return true;
    }
    for (const next of [[column + 1, row], [column - 1, row], [column, row + 1], [column, row - 1]]) {
      if (isOpen(next) && !closed.has(nameOf(next)) && !seen.has(nameOf(next))) {
        seen.add(nameOf(next));
        toVisit.push(next);
      }
    }
  }
  return false;
}

const NO_KEYS = { gas: false, brake: false, left: false, right: false };

// ---- The tests ----

describe("the Nova lap", () => {
  it("is a track the game accepts, with a finish line, seven more checkpoints and 3 laps", () => {
    expect(track.name).toBe("Nova lap");
    expect(track.laps).toBe(3);
    expect(track.checkpoints).toHaveLength(8);
    expect(track.columns).toBe(90);
    expect(track.rows).toBe(92);
  });

  it("has letters that say exactly what the shapes of its ground and buildings say", () => {
    // The letters in shared/tracks/nova-lap.js are what the driving rules
    // use. The shapes in client/ are what is painted. If the two differ, a
    // kart bounces off thin air or drives through a painted wall.
    const fromShapes = lettersFromGround(NOVA_LAP_GROUND, NOVA_LAP_SIZE, NOVA_LAP_SOLID);
    expect(NOVA_LAP_SIZE).toEqual({ columns: track.columns, rows: track.rows });
    expect(fromShapes).toHaveLength(track.map.length);
    // Find the first square that differs, so the message says where to look.
    let firstDifference = "none";
    for (let row = 0; row < track.rows && firstDifference === "none"; row++) {
      for (let column = 0; column < track.columns; column++) {
        if (fromShapes[row][column] !== track.map[row][column]) {
          firstDifference = `row ${row}, column ${column}: the track says "${track.map[row][column]}", the shapes say "${fromShapes[row][column]}"`;
          break;
        }
      }
    }
    expect(firstDifference).toBe("none");
    expect(fromShapes).toEqual(track.map);
  });

  it("starts on the road, just behind the finish line, pointing east along the avenue", () => {
    const { x, y, angle } = track.start;
    expect(tileKindAt(track, x, y)).toBe("road");
    expect(angle).toBe(0); // pointing right (east), the way the lap is driven
    for (let squaresAhead = 1; squaresAhead <= 3; squaresAhead++) {
      expect(tileKindAt(track, x + squaresAhead * size, y)).toBe("road");
    }
    // The finish line is just ahead of the start, not under it.
    expect(track.startsBehindLine).toBe(true);
    expect(isInsideCheckpoint(track, 0, x, y)).toBe(false);
    expect(x).toBeLessThanOrEqual(track.checkpoints[0].left);
    expect(track.checkpoints[0].left - x).toBeLessThan(4 * size);
  });

  it("closes the way with every checkpoint: both ends of each one touch a wall", () => {
    for (const checkpoint of track.checkpoints) {
      const squares = squaresOf(checkpoint);
      const [firstColumn, firstRow] = squares[0];
      const [lastColumn, lastRow] = squares[squares.length - 1];
      const across = firstColumn === lastColumn; // a line from top to bottom
      const beforeStart = across ? [firstColumn, firstRow - 1] : [firstColumn - 1, firstRow];
      const afterEnd = across ? [lastColumn, lastRow + 1] : [lastColumn + 1, lastRow];
      expect(track.map[beforeStart[1]][beforeStart[0]], checkpoint.name).toBe("#");
      expect(track.map[afterEnd[1]][afterEnd[0]], checkpoint.name).toBe("#");
    }
  });

  it("has no way round any checkpoint, not even over the lawns", () => {
    // This is a search over the squares of the map, not a drive.
    //
    // The lap is one loop. Close a loop in two places and it falls into two
    // parts: nobody can get from one part to the other. So for each
    // checkpoint we take a square just before it and a square just after
    // it, close that checkpoint and one other, and ask whether a kart could
    // still get from the one square to the other. It must not. If it can,
    // there is a second way round the checkpoint: a short cut.
    const alongTheRoute = squaresAlongTheRoute();
    track.checkpoints.forEach((checkpoint, number) => {
      const { before, after } = squaresEitherSideOf(checkpoint, alongTheRoute);
      const where = `"${checkpoint.name}" (from square ${before} to square ${after})`;
      // First make sure the search itself works: with only this checkpoint
      // closed, a kart can still get from the one square to the other, the
      // long way round the whole loop.
      const onlyThisOne = new Set(squaresOf(checkpoint).map(nameOf));
      expect(isConnected(before, after, onlyThisOne), `the search found no way round the loop at all, at ${where}`).toBe(true);
      track.checkpoints.forEach((other, otherNumber) => {
        if (otherNumber === number) {
          return;
        }
        const closed = new Set([...squaresOf(checkpoint), ...squaresOf(other)].map(nameOf));
        expect(closed.has(nameOf(before)) || closed.has(nameOf(after)), `"${other.name}" is right next to ${where}`).toBe(false);
        expect(
          isConnected(before, after, closed),
          `there is a way round ${where} that does not pass "${other.name}" either`,
        ).toBe(false);
      });
    });
  });

  it("lets a robot drive the whole 3-lap race along the painted route, without ever being inside a wall", () => {
    let wallMoments = 0;
    const racer = robotDrive(createRacer(track), DRIVING_LINE, 300, (now) => {
      if (tileKindAt(track, now.kart.x, now.kart.y) === "wall") {
        wallMoments++;
      }
    });
    expect(racer.progress.finished).toBe(true);
    expect(racer.progress.lapsDone).toBe(3);
    expect(wallMoments).toBe(0);
  });

  it("is a race of sensible length: the robot needs between 1 and a little over 3 minutes for 3 laps", () => {
    // Game time, counted in steps (60 a second), so the answer is the same on every computer.
    const racer = robotDrive(createRacer(track), DRIVING_LINE, 300);
    expect(racer.progress.finished).toBe(true);
    expect(raceSeconds(racer.progress)).toBeGreaterThanOrEqual(60);
    expect(raceSeconds(racer.progress)).toBeLessThanOrEqual(200);
  });

  it("never counts a lap for driving the wrong way round", () => {
    const start = createRacer(track);
    const turnedRound = { ...start, kart: { ...start.kart, angle: Math.PI } };
    const wrongWay = [...DRIVING_LINE].reverse();
    // Note which checkpoints the robot drives through, to be sure it really went round.
    const visited = new Set();
    const racer = robotDrive(turnedRound, wrongWay, 120, (now) => {
      track.checkpoints.forEach((checkpoint, number) => {
        if (isInsideCheckpoint(track, number, now.kart.x, now.kart.y)) {
          visited.add(number);
        }
      });
    });
    expect(visited.size).toBe(8); // it drove through every checkpoint, backwards
    expect(racer.progress.lapsDone).toBe(0);
    expect(racer.progress.finished).toBe(false);
  });

  it("has a driving line between 6,500 and 8,500 units long: roughly 700 metres a lap", () => {
    // 32 units are 3 metres on this track, so this is 610 to 800 metres.
    let length = 0;
    for (let i = 0; i < DRIVING_LINE.length; i++) {
      const from = DRIVING_LINE[i];
      const to = DRIVING_LINE[(i + 1) % DRIVING_LINE.length]; // after the last point comes the first
      length += Math.hypot(to.x - from.x, to.y - from.y);
    }
    expect(length).toBeGreaterThanOrEqual(6500);
    expect(length).toBeLessThanOrEqual(8500);
  });

  it("lets the computer karts race here: each of them completes at least one lap, never inside a wall", () => {
    // A single race as on the race page, with the player standing still on
    // the grid: up to 4 minutes of game time, the painted route as racing
    // line, and bananas from seed 7 as in practice-race.test.js.
    let race = createPracticeRace(track, 7, DRIVING_LINE);
    expect(race.drivers).toHaveLength(5);
    let wallMoments = 0;
    for (let step = 0; step < 240 * 60; step++) {
      race = stepPracticeRace(track, race, NO_KEYS, TEST_DRIVER);
      for (const racer of race.racers.slice(1)) {
        if (tileKindAt(track, racer.kart.x, racer.kart.y) === "wall") {
          wallMoments++;
        }
      }
      if (race.racers.slice(1).every((racer) => racer.progress.finished)) {
        break;
      }
    }
    // If a kart got stuck, say which one and where, so it can be found on the map.
    const stuck = race.racers
      .slice(1)
      .map((racer, index) => ({ racer, personality: race.drivers[index].personality.name }))
      .filter(({ racer }) => racer.progress.lapsDone < 1)
      .map(
        ({ racer, personality }) =>
          `${personality} completed no lap and ended at column ${Math.floor(racer.kart.x / size)}, row ${Math.floor(racer.kart.y / size)}`,
      );
    expect(stuck).toEqual([]);
    expect(wallMoments).toBe(0);
  });
});
