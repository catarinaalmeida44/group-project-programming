// A tiny track used by several test files. It is not a test itself.
//
// It is a loop of road around one wall tile, with a patch of grass on each
// side of that wall. Each tile is 10 units wide, so positions are easy to
// work out by hand: column 3, row 1 is the square from x=30..40, y=10..20.

/** Gives a fresh copy each time, so a test can change it without affecting other tests. */
export function smallTrackDescription() {
  return {
    name: "Small test track",
    tileSize: 10,
    laps: 2,
    map: [
      "#######",
      "#.....#",
      "#.,#,.#",
      "#.....#",
      "#######",
    ],
    start: { column: 4, row: 1, angle: 0 },
    checkpoints: [
      { name: "finish line", column: 3, row: 1, columns: 1, rows: 1 },
      { name: "right side", column: 5, row: 2, columns: 1, rows: 1 },
      { name: "bottom", column: 3, row: 3, columns: 1, rows: 1 },
      { name: "left side", column: 1, row: 2, columns: 1, rows: 1 },
    ],
  };
}
