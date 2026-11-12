// The small map of a track on its card in the menu.
//
// A track is drawn with letters, one for each square ("tile") of ground (see
// shared/track.js). This file turns those letters into a small picture: road
// and grass are painted, and walls are left empty so the card shows through.
// The finish line is white and the place where the karts start is a red dot.
//
// The arithmetic (how big, which tiles) is in small functions that need no
// browser and have tests. paintMiniMap() does the painting.

/** The colour of each kind of ground on the small map. Walls ("#") are not painted. */
export const MAP_COLOURS = { ".": "#93a0ad", ",": "#3c8a4b" };
const FINISH_COLOUR = "#ffffff";
const START_COLOUR = "#e23d3d";

/** The picture is at least this many pixels on its longer side, so it stays sharp on the card. */
const SHARP_SIDE = 480;

/**
 * How big the picture of a map is: { tile, width, height } in pixels.
 * A tile is always a whole number of pixels. Tiles of, say, 3.7 pixels
 * would leave thin lines between them. The page then shrinks the whole
 * picture to fit the card (style.css).
 */
export function mapPictureSize(columns, rows) {
  const tile = Math.max(1, Math.ceil(SHARP_SIDE / Math.max(columns, rows)));
  return { tile, width: columns * tile, height: rows * tile };
}

/**
 * Splits one row of the map into stretches of the same letter. "##..," gives
 *   [{ letter: "#", start: 0, length: 2 },
 *    { letter: ".", start: 2, length: 2 },
 *    { letter: ",", start: 4, length: 1 }]
 * Painting a whole stretch at once is quicker than painting tile by tile.
 */
export function rowRuns(row) {
  const runs = [];
  for (let column = 0; column < row.length; column++) {
    const last = runs[runs.length - 1];
    if (last !== undefined && last.letter === row[column]) {
      last.length += 1;
    } else {
      runs.push({ letter: row[column], start: column, length: 1 });
    }
  }
  return runs;
}

/**
 * The road tiles under the finish line, as a list of { column, row }.
 * The finish line is the first checkpoint of a track. Its rectangle also
 * covers grass and walls beside the road, and those are left out.
 */
export function finishTiles(track) {
  const line = track.checkpoints[0];
  const size = track.tileSize;
  const tiles = [];
  for (let row = Math.round(line.top / size); row < Math.round(line.bottom / size); row++) {
    for (let column = Math.round(line.left / size); column < Math.round(line.right / size); column++) {
      if (track.map[row][column] === ".") {
        tiles.push({ column, row });
      }
    }
  }
  return tiles;
}

/**
 * Paints the small map of a track on a canvas (a rectangle of the page that
 * code can paint on). The canvas is made as big as the picture needs.
 */
export function paintMiniMap(canvas, track) {
  const { tile, width, height } = mapPictureSize(track.columns, track.rows);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  // The ground, row by row.
  track.map.forEach((row, rowNumber) => {
    for (const run of rowRuns(row)) {
      if (!Object.hasOwn(MAP_COLOURS, run.letter)) {
        continue; // a wall: leave it empty
      }
      context.fillStyle = MAP_COLOURS[run.letter];
      context.fillRect(run.start * tile, rowNumber * tile, run.length * tile, tile);
    }
  });

  // The finish line.
  context.fillStyle = FINISH_COLOUR;
  for (const { column, row } of finishTiles(track)) {
    context.fillRect(column * tile, row * tile, tile, tile);
  }

  // The start, as a dot big enough to see on any size of track. The start
  // of a track is in units; dividing by the tile size gives it in tiles.
  context.fillStyle = START_COLOUR;
  context.beginPath();
  context.arc(
    (track.start.x / track.tileSize) * tile,
    (track.start.y / track.tileSize) * tile,
    Math.max(width, height) / 40,
    0,
    Math.PI * 2,
  );
  context.fill();
}
