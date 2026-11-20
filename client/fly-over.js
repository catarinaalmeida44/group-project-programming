// The fly-over: a camera that glides round a track along its arrows.
//
// While a single race waits for the first key press, the camera flies once
// round the track and on, as television does before a race, over the karts
// waiting on the grid (main.js). The track tour (track-tour.js) flies the
// same way. Pressing an arrow key starts the countdown, and the camera comes
// down behind your kart as before.
//
// Where the camera is after a distance round the lap is only sums, so it is
// tested (tests/fly-over.test.js).

/** How fast the fly-over glides, in units per second. */
export const FLY_SPEED = 260;

/** How far before and after a bend the camera starts and ends its turn, in units. */
const TURN_OVER = 70;

/**
 * A fly-over along a route: the points the arrows follow ({ x, y }, from
 * route.js). Gives { length, placeAt(distance) }:
 *   length            how long one lap of the route is, in units
 *   placeAt(distance) where the camera is after this many units round the
 *                     lap, and which way it looks: { x, y, angle }. Round
 *                     and round: a distance past the end starts again
 * With fewer than two points there is nowhere to fly: placeAt gives the
 * "stay" spot (normally the start of the track).
 */
export function createFlyOver(points, stay = { x: 0, y: 0, angle: 0 }) {
  const stretches = [];
  let length = 0;
  if (Array.isArray(points) && points.length >= 2) {
    points.forEach((from, index) => {
      const to = points[(index + 1) % points.length];
      const size = Math.hypot(to.x - from.x, to.y - from.y);
      stretches.push({ from, to, size, startsAt: length, angle: Math.atan2(to.y - from.y, to.x - from.x) });
      length += size;
    });
  }

  /** Turns part of the way from one direction to another, the short way round. */
  const turnTowards = (from, to, part) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * part;

  function placeAt(distance) {
    if (stretches.length === 0 || length === 0) {
      return { x: stay.x, y: stay.y, angle: stay.angle ?? 0 };
    }
    const along = ((distance % length) + length) % length;
    let number = stretches.findIndex((stretch) => along < stretch.startsAt + stretch.size);
    if (number === -1) {
      number = stretches.length - 1;
    }
    const stretch = stretches[number];
    const done = along - stretch.startsAt;
    const share = stretch.size > 0 ? done / stretch.size : 0;
    // Near a bend, turn part of the way towards the stretch before or after,
    // so the camera swings smoothly instead of snapping round.
    const before = stretches[(number - 1 + stretches.length) % stretches.length];
    const after = stretches[(number + 1) % stretches.length];
    let angle = stretch.angle;
    const turnOver = Math.min(TURN_OVER, stretch.size / 2);
    if (done < turnOver) {
      angle = turnTowards(stretch.angle, before.angle, 0.5 * (1 - done / turnOver));
    } else if (stretch.size - done < turnOver) {
      angle = turnTowards(stretch.angle, after.angle, 0.5 * (1 - (stretch.size - done) / turnOver));
    }
    return {
      x: stretch.from.x + (stretch.to.x - stretch.from.x) * share,
      y: stretch.from.y + (stretch.to.y - stretch.from.y) * share,
      angle,
    };
  }

  return { length, placeAt };
}
