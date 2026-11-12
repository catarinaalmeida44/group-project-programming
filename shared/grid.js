// The starting grid: where each kart waits for the start of a race.
//
// The browser and the server both use this file. The server puts the karts
// on these spots, and the page can paint a box on the road at exactly the
// same spots.
//
// HOW THE GRID IS LAID OUT
// The karts stand in two columns, in rows of two, all pointing the way the
// track's start points. Place 0 (called "pole") is in the front row on the
// left, place 1 in the front row on the right, place 2 is behind place 0,
// and so on. Seen from above, with the karts pointing to the right:
//
//        6   4   2   0
//                          ->  the way the karts point
//        7   5   3   1
//
// "track.start" is the middle of the front row, between places 0 and 1.
// On a track whose start is behind the finish line (see laps.js), the whole
// grid is behind the line.

/** How many places the grid has: one for each player a room can hold. */
export const GRID_PLACES = 8;

/** How far each column is from the middle of the grid, in units. The two columns are twice this apart. */
export const GRID_GAP_SIDEWAYS = 18;

/** How far each row is behind the row in front of it, in units. */
export const GRID_GAP_BEHIND = 28;

/**
 * Where a kart stands on the grid of a track, and which way it points.
 *
 *   place   0 is pole. Even places are in the left column, odd places in
 *           the right column. Every two places, the row moves one back.
 *
 * Gives { x, y, angle }, in units, like a kart.
 *
 * It refuses a place that is not a whole number from 0 up, by stopping with
 * an error. A wrong place must never put a kart somewhere strange.
 */
export function gridSpot(track, place) {
  if (!Number.isInteger(place) || place < 0) {
    throw new RangeError("gridSpot: place must be a whole number, 0 or more");
  }
  const { x, y, angle } = track.start;
  const side = place % 2 === 0 ? -1 : 1; // left column, right column
  const row = Math.floor(place / 2);
  // "forward" is the direction the karts point. "right" is a quarter turn clockwise from it.
  const forwardX = Math.cos(angle);
  const forwardY = Math.sin(angle);
  const rightX = -forwardY;
  const rightY = forwardX;
  return {
    x: x + rightX * side * GRID_GAP_SIDEWAYS - forwardX * row * GRID_GAP_BEHIND,
    y: y + rightY * side * GRID_GAP_SIDEWAYS - forwardY * row * GRID_GAP_BEHIND,
    angle,
  };
}
