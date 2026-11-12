// The route of a track: which way round it is driven.
//
// A track's look (track-looks.js) can list points along the middle of the
// road, in the order they are driven. From those points this file answers
// three questions, all for the picture only:
//   - which way does the road run at this spot?      (routeDirection)
//   - is this kart driving the wrong way?            (isWrongWay)
//   - where are the bends, and do they turn left or right?  (bendsOf)
//
// Laps are NOT counted with this. A lap counts only if the kart went
// through every checkpoint in order (shared/laps.js), and the server decides
// that. This file only helps a player see where to go: arrows on the road,
// arrow boards at the bends, and a warning when they drive backwards.

/** The route in units of track, from the [column, row] points of the look. Gives null without a usable route. */
export function routePoints(track, route) {
  if (!Array.isArray(route) || route.length < 3) {
    return null;
  }
  return route.map(([column, row]) => ({ x: (column + 0.5) * track.tileSize, y: (row + 0.5) * track.tileSize }));
}

/**
 * The direction the road runs at a spot: the direction of the stretch of
 * the route that passes closest to it, as an angle on the map (0 points
 * right, a quarter turn points down). "points" comes from routePoints().
 * The route is a loop: after the last point comes the first.
 */
export function routeDirection(points, x, y) {
  let nearest = Infinity;
  let direction = 0;
  for (let i = 0; i < points.length; i++) {
    const from = points[i];
    const to = points[(i + 1) % points.length];
    const lengthX = to.x - from.x;
    const lengthY = to.y - from.y;
    const squared = lengthX * lengthX + lengthY * lengthY;
    if (squared === 0) {
      continue; // two points on the same spot: not a stretch
    }
    // How far along the stretch the spot is, from 0 (at "from") to 1 (at "to").
    const along = Math.min(1, Math.max(0, ((x - from.x) * lengthX + (y - from.y) * lengthY) / squared));
    const away = Math.hypot(x - (from.x + along * lengthX), y - (from.y + along * lengthY));
    if (away < nearest) {
      nearest = away;
      direction = Math.atan2(lengthY, lengthX);
    }
  }
  return direction;
}

/** Below this speed a kart is not "driving the wrong way": it may be turning round, or was bumped. */
export const WRONG_WAY_SPEED = 70; // units per second

/**
 * Is this kart driving the wrong way round? Only if it is really moving,
 * and moving more against the road than along it: more than a third of a
 * turn away from the direction the road runs.
 */
export function isWrongWay(points, kart) {
  if (points === null) {
    return false;
  }
  const speed = Math.hypot(kart.vx, kart.vy);
  if (!(speed >= WRONG_WAY_SPEED)) {
    return false;
  }
  const moving = Math.atan2(kart.vy, kart.vx);
  const road = routeDirection(points, kart.x, kart.y);
  const off = Math.abs(Math.atan2(Math.sin(moving - road), Math.cos(moving - road)));
  return off > (Math.PI * 2) / 3;
}

/**
 * Watches one kart and says when to show the "wrong way" warning. A kart
 * that turns round for a moment, or is spun by a bump, should not set it
 * off, so the warning only comes after the kart has been driving the wrong
 * way for "patience" seconds without a break.
 *
 * Gives a function to call for every picture with the kart and the time in
 * seconds. It answers true while the warning should show.
 */
export function watchForWrongWay(points, patience = 0.7) {
  let since = null; // when the kart started driving the wrong way, or null if it is not
  return function check(kart, seconds) {
    if (!isWrongWay(points, kart)) {
      since = null;
      return false;
    }
    if (since === null) {
      since = seconds;
    }
    return seconds - since >= patience;
  };
}

/**
 * The bends of the route: the points where the road turns by more than a
 * sixth of a turn. Gives a list of { x, y, turn, from, to }:
 *   x, y   the point of the bend
 *   turn   "right" or "left", as the driver sees it
 *   from   the direction the road comes from, to   the direction it leaves in
 * draw.js stands an arrow board at each one.
 */
export function bendsOf(points) {
  if (points === null) {
    return [];
  }
  const bends = [];
  for (let i = 0; i < points.length; i++) {
    const before = points[(i - 1 + points.length) % points.length];
    const here = points[i];
    const after = points[(i + 1) % points.length];
    const from = Math.atan2(here.y - before.y, here.x - before.x);
    const to = Math.atan2(after.y - here.y, after.x - here.x);
    const turned = Math.atan2(Math.sin(to - from), Math.cos(to - from));
    if (Math.abs(turned) > Math.PI / 3) {
      // On the map y grows downwards, so a growing angle is a turn to the right.
      bends.push({ x: here.x, y: here.y, turn: turned > 0 ? "right" : "left", from, to });
    }
  }
  return bends;
}
