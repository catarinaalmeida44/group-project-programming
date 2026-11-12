// The test track: a simple loop, driven clockwise.
// It is not a campus track. It exists to try out the driving rules.
//
//     #  wall      .  road      ,  grass
//
// The road is four tiles wide. In the middle is a block of wall with a strip
// of grass around it, so cutting a corner too tightly costs speed.

import { createTrack } from "../track.js";

export const TEST_OVAL = createTrack({
  name: "Test oval",
  tileSize: 32, // each letter below is a square of 32 by 32 units
  laps: 3,
  map: [
    "##############################",
    "#............................#",
    "#............................#",
    "#............................#",
    "#............................#",
    "#....,,,,,,,,,,,,,,,,,,,,....#",
    "#....,##################,....#",
    "#....,##################,....#",
    "#....,##################,....#",
    "#....,##################,....#",
    "#....,##################,....#",
    "#....,##################,....#",
    "#....,,,,,,,,,,,,,,,,,,,,....#",
    "#............................#",
    "#............................#",
    "#............................#",
    "#............................#",
    "##############################",
  ],
  // The karts start on the top straight, just behind the finish line,
  // pointing right (angle 0), the way the loop is driven. This is the middle
  // of the front row of the grid (see ../grid.js). "behindLine" says that
  // crossing the line for the first time starts lap 1 (see ../laps.js).
  start: { column: 13, row: 2, angle: 0, behindLine: true },
  // Each checkpoint is a rectangle of tiles that crosses the road and the
  // grass beside it. They must be reached in this order.
  checkpoints: [
    { name: "finish line", column: 14, row: 1, columns: 1, rows: 5 },
    { name: "right side", column: 24, row: 8, columns: 5, rows: 1 },
    { name: "bottom straight", column: 14, row: 12, columns: 1, rows: 5 },
    { name: "left side", column: 1, row: 8, columns: 5, rows: 1 },
  ],
});
