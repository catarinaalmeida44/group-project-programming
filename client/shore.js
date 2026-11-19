// The shore: beach, surf and sea beyond the south edge of a map.
//
// A map only covers the ground the karts can reach, and a little round it.
// Past its edge the race view paints one plain colour ("beyond" in the look).
// On the Nova lap the sea lies just past the bottom of the map, across the
// coast road, so there the race view paints it: a strip of sand, a line of
// surf, and then the sea all the way to the horizon, where the haze and the
// sea on the horizon (sky.js) take over.
//
// A look can have a "shore" (see nova-lap-look.js):
//   bands   from the land out: { from, colour, water }. "from" is how far
//           down the map the band starts, in units. Each band goes on until
//           the next one starts; the last one goes on for ever. "water: true"
//           marks the sea
//   throughHaze  from 0 to 1: how much of the water is painted again over
//           the haze near the horizon, so the far sea stays blue
//
// ground.js paints the race view one row of pixels at a time. Every row shows
// a straight line of ground. Along that line, the distance down the map
// changes evenly from the left of the screen to the right, so on each row
// every band is one piece: from some x to the edge of the screen. These sums
// find that piece. They need no browser, so they are tested
// (tests/shore.test.js).

/**
 * Where one row of the race view lies on the map: how far down the map
 * ("y", in units) the ground is at the left edge of the screen, and how much
 * that grows for each pixel to the right. Uses the same numbers as
 * paintTilted in ground.js:
 *   along, across  where the camera is, measured along and across its
 *                  direction (alongKart, acrossKart in ground.js)
 *   ahead          how far ahead of the camera this row's ground lies
 *   scale          how large the ground is drawn on this row
 *   cos, sin       of the camera's direction
 *   width          of the screen, in pixels
 */
export function rowOnMap({ along, across, ahead, scale, cos, sin, width }) {
  const forward = along + ahead;
  return {
    atLeft: forward * sin - cos * across - (cos * width) / 2 / scale,
    perPixel: cos / scale,
  };
}

/**
 * The part of a row (from x to x + length, in pixels) where the ground lies
 * at least "from" units down the map, kept inside the screen. null if no part
 * of the row is that far down.
 */
export function spanFrom(row, from, width) {
  const { atLeft, perPixel } = row;
  if (Math.abs(perPixel) < 1e-12) {
    return atLeft >= from ? { x: 0, length: width } : null; // the whole row is at one distance down the map
  }
  const crossing = (from - atLeft) / perPixel; // the x where the row is exactly "from" down the map
  const start = perPixel > 0 ? Math.max(0, crossing) : 0;
  const end = perPixel > 0 ? width : Math.min(width, crossing);
  return end > start ? { x: start, length: end - start } : null;
}

/** The bands of a shore, in the order to paint them: from the land out, each over the one before. */
export function shoreBands(shore) {
  return [...shore.bands].sort((a, b) => a.from - b.from);
}
