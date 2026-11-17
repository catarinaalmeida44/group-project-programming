// Traffic: the cars that drive along the roads beside a track.
//
// They are only part of the picture. No kart can reach those roads, the
// server knows nothing about them, and nothing here changes a race. Each
// browser moves them by its own clock.
//
// A track's look (for example nova-lap-look.js) can list "traffic": lanes.
// A lane is a line of points, in squares of the map, that its cars follow
// at a steady speed. A car that reaches the last point starts again at the
// first. This file is the arithmetic: where is every car at this moment?
// draw.js paints them (the pictures of a car are in props.js).

/** The colours cars come in, by name. props.js and draw.js paint them. */
export const CAR_COLOUR_NAMES = ["red", "white", "grey", "blue", "black", "yellow"];

/**
 * Gets the lanes of a track ready: turns each line of points into stretches
 * with a length and a direction, in units of track.
 *   traffic  [{ points: [[column, row], ...], speed, cars }]: speed in units
 *            a second, cars is how many drive on the lane
 * A lane that cannot work (fewer than two different points, no cars, no
 * speed) is left out. A track without traffic gives an empty list.
 */
export function trafficLanes(track, traffic) {
  const lanes = [];
  for (const lane of Array.isArray(traffic) ? traffic : []) {
    if (!Array.isArray(lane?.points) || !(lane.cars > 0) || !(lane.speed > 0)) {
      continue;
    }
    const points = lane.points.map(([column, row]) => ({ x: column * track.tileSize, y: row * track.tileSize }));
    const stretches = [];
    let length = 0;
    for (let i = 0; i + 1 < points.length; i++) {
      const from = points[i];
      const to = points[i + 1];
      const long = Math.hypot(to.x - from.x, to.y - from.y);
      if (long > 0) {
        stretches.push({ from, to, long, startsAt: length, angle: Math.atan2(to.y - from.y, to.x - from.x) });
        length += long;
      }
    }
    if (length > 0) {
      lanes.push({ stretches, length, speed: lane.speed, cars: Math.floor(lane.cars) });
    }
  }
  return lanes;
}

/**
 * Where every car is at this moment: [{ x, y, angle, colour }].
 *   lanes    from trafficLanes()
 *   seconds  the time, in seconds. The same time always gives the same answer.
 * The cars of a lane are spread along it, not quite evenly, and all move at
 * the lane's speed. "angle" is the direction a car drives in, like a kart's.
 */
export function carsAt(lanes, seconds) {
  const cars = [];
  lanes.forEach((lane, laneNumber) => {
    for (let car = 0; car < lane.cars; car++) {
      // (The 0.31 makes the gaps between cars differ a little.)
      const start = ((car + 0.31 * ((car * 7 + laneNumber * 3) % 5)) / lane.cars) * lane.length;
      const along = (((start + lane.speed * seconds) % lane.length) + lane.length) % lane.length;
      const stretch = lane.stretches.find((each) => along < each.startsAt + each.long) ?? lane.stretches[lane.stretches.length - 1];
      const share = (along - stretch.startsAt) / stretch.long;
      cars.push({
        x: stretch.from.x + (stretch.to.x - stretch.from.x) * share,
        y: stretch.from.y + (stretch.to.y - stretch.from.y) * share,
        angle: stretch.angle,
        colour: CAR_COLOUR_NAMES[(car * 5 + laneNumber * 2) % CAR_COLOUR_NAMES.length],
      });
    }
  });
  return cars;
}
