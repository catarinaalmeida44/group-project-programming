// Tests for client/traffic.js: the cars that drive along the roads beside a
// track. They are only a picture, so nothing here is a rule of the game.
// These tests check the arithmetic that would make the picture look wrong:
// a car that leaves its lane, jumps about, or stands on the track itself.

import { describe, it, expect } from "vitest";
import { trafficLanes, carsAt, CAR_COLOUR_NAMES } from "../client/traffic.js";
import { lookOfTrack } from "../client/track-looks.js";
import { tileKindAt } from "../shared/track.js";
import { TRACKS } from "../shared/tracks/index.js";

// A track is only needed for the size of its squares.
const FIELD = { tileSize: 10 };
// One lane with a corner: 10 squares to the right, then 5 squares down. 150 units long.
const CORNER = [{ points: [[0, 0], [10, 0], [10, 5]], speed: 20, cars: 3 }];

describe("getting the lanes ready", () => {
  it("measures a lane in units of track, stretch by stretch", () => {
    const [lane] = trafficLanes(FIELD, CORNER);
    expect(lane.length).toBe(150);
    expect(lane.stretches.map((stretch) => stretch.long)).toEqual([100, 50]);
    expect(lane.stretches[0].angle).toBeCloseTo(0); //            to the right
    expect(lane.stretches[1].angle).toBeCloseTo(Math.PI / 2); // down the map
  });

  it("gives no lanes for a track without traffic", () => {
    for (const nothing of [undefined, null, [], "cars", 7]) {
      expect(trafficLanes(FIELD, nothing)).toEqual([]);
    }
  });

  it("leaves out a lane that cannot work, and keeps the others", () => {
    const lanes = trafficLanes(FIELD, [
      { points: [[0, 0], [10, 0]], speed: 20, cars: 0 }, //  no cars
      { points: [[0, 0], [10, 0]], speed: 0, cars: 2 }, //   no speed
      { points: [[3, 3], [3, 3]], speed: 20, cars: 2 }, //   no length
      { speed: 20, cars: 2 }, //                             no points
      ...CORNER,
    ]);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].length).toBe(150);
  });
});

describe("where the cars are", () => {
  const lanes = trafficLanes(FIELD, CORNER);

  it("puts as many cars on a lane as it asks for, each in a colour that exists", () => {
    const cars = carsAt(lanes, 0);
    expect(cars).toHaveLength(3);
    for (const car of cars) {
      expect(CAR_COLOUR_NAMES).toContain(car.colour);
    }
  });

  it("keeps every car on its lane, at every moment", () => {
    for (let seconds = 0; seconds < 40; seconds += 0.37) {
      for (const car of carsAt(lanes, seconds)) {
        const onFirst = Math.abs(car.y) < 1e-6 && car.x >= 0 && car.x <= 100;
        const onSecond = Math.abs(car.x - 100) < 1e-6 && car.y >= 0 && car.y <= 50;
        expect(onFirst || onSecond, `${seconds}s: ${car.x}, ${car.y}`).toBe(true);
        // It points the way its stretch runs: to the right before the corner, down the map after it.
        expect(car.angle).toBeCloseTo(car.x < 100 ? 0 : Math.PI / 2);
      }
    }
  });

  it("moves each car at the speed of its lane", () => {
    // A car that is on the first stretch now and one second later has moved 20 units.
    const before = carsAt(lanes, 0);
    const after = carsAt(lanes, 1);
    let checked = 0;
    before.forEach((car, number) => {
      if (car.y === 0 && after[number].y === 0 && after[number].x > car.x) {
        expect(after[number].x - car.x).toBeCloseTo(20);
        checked++;
      }
    });
    expect(checked).toBeGreaterThan(0);
  });

  it("starts a car again at the beginning when it reaches the end", () => {
    // The lane is 150 units long and the cars do 20 a second: after 7.5 seconds everything repeats.
    const now = carsAt(lanes, 3);
    const oneRoundLater = carsAt(lanes, 3 + 7.5);
    now.forEach((car, number) => {
      expect(oneRoundLater[number].x).toBeCloseTo(car.x);
      expect(oneRoundLater[number].y).toBeCloseTo(car.y);
    });
  });

  it("gives the same answer for the same moment, and does not put two cars on one spot", () => {
    expect(carsAt(lanes, 12.3)).toEqual(carsAt(lanes, 12.3));
    const [a, b, c] = carsAt(lanes, 0);
    for (const [one, other] of [[a, b], [b, c], [a, c]]) {
      expect(Math.hypot(one.x - other.x, one.y - other.y)).toBeGreaterThan(10);
    }
  });

  it("has no cars when there are no lanes", () => {
    expect(carsAt([], 5)).toEqual([]);
  });
});

describe("the traffic of the real tracks", () => {
  it("never drives where a kart can drive: every lane runs over wall squares only", () => {
    for (const [name, track] of Object.entries(TRACKS)) {
      const lanes = trafficLanes(track, lookOfTrack(track).traffic);
      for (const lane of lanes) {
        // Walk along the lane in small steps.
        for (const stretch of lane.stretches) {
          for (let done = 0; done <= stretch.long; done += 8) {
            const x = stretch.from.x + ((stretch.to.x - stretch.from.x) * done) / stretch.long;
            const y = stretch.from.y + ((stretch.to.y - stretch.from.y) * done) / stretch.long;
            expect(tileKindAt(track, x, y), `${name}: ${Math.floor(x / track.tileSize)}, ${Math.floor(y / track.tileSize)}`).toBe("wall");
          }
        }
      }
    }
  });

  it("puts cars on the roads beside the Nova lap", () => {
    const track = TRACKS["nova-lap"];
    const lanes = trafficLanes(track, lookOfTrack(track).traffic);
    expect(lanes.length).toBeGreaterThanOrEqual(2);
    expect(carsAt(lanes, 0).length).toBeGreaterThanOrEqual(8);
  });
});
