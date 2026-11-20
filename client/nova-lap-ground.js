// The ground of the Nova lap, as shapes: which paving, lawn or road lies where.
//
// The lap follows the video filmed on campus on 17 November 2026: the entrance
// avenue, through the Hovione Atrium, the terrace by the cafe, under the
// library, down the promenade and the wide stairs, west past the beach tunnel,
// along the coast road (the Marginal), up the west street and back into the
// avenue.
//
// Everything is measured in squares of the map (shared/tracks/nova-lap.js).
// One square is 3 by 3 metres. Column 0 is the west edge, row 0 the north edge.
//
// A shape is one of:
//   rect: [left, top, right, bottom]   edges of a rectangle, in squares. The
//                                      right and bottom edges are not included:
//                                      [9, 7, 13, 16] is columns 9 to 12, rows 7 to 15
//   poly: [[x, y], ...]                corners of any other shape, in squares
//
// "rule" says what the driving rules make of the ground under a shape:
//   "road"   karts drive on it at full speed   (a "." in the map)
//   "grass"  karts drive on it, but slower     (a ",")
//   "wall"   karts cannot go there             (a "#")
//   nothing  the shape is paint only and leaves the rule as it was
//
// The shapes are painted in the order of the list, so a later shape lies on
// top of an earlier one. tests/nova-lap.test.js checks that the letter map of
// the track says the same as these shapes, square by square.

/** The size of the map, in squares. */
export const NOVA_LAP_SIZE = { columns: 90, rows: 92 };

/** What the ground is where no shape lies: the pale, dry land round the campus. Karts cannot go there. */
export const NOVA_LAP_DEFAULT_SURFACE = "scrub";

export const NOVA_LAP_GROUND = [
  // ---- Round the campus: what a kart never reaches ----
  { surface: "scrub", rule: "wall", rect: [0, 0, 90, 92] },
  { surface: "lawn", rule: "wall", rect: [9, 0, 90, 7] }, //            lawn in front of the residence, north of the avenue
  { surface: "lawn", rule: "wall", rect: [73, 20, 90, 82] }, //         the park east of the terrace and the library
  { surface: "lawn", rule: "wall", rect: [42, 74, 73, 82] }, //         the banks between the plaza and the coast road
  { surface: "car-park", rule: "wall", rect: [0, 0, 3, 88] }, //        car parks across the west street
  { surface: "asphalt", rule: "wall", rect: [3, 0, 8, 88] }, //         the west street
  { surface: "asphalt", rule: "wall", rect: [3, 83, 90, 88] }, //       the coast road (the Marginal)
  { surface: "verge", rule: "wall", rect: [0, 88, 90, 92] }, //         sand and scrub between the road and the sea
  { surface: "setts", rule: "wall", rect: [8, 0, 9, 83] }, //           a strip of small stones between road and low wall
  { surface: "setts", rule: "wall", rect: [8, 82, 90, 83] },
  { surface: "flagstones", rule: "wall", rect: [42, 78, 90, 82] }, //   the pavement of the coast road goes on east, out of reach
  { surface: "car-ramp", rule: "wall", rect: [26, 3, 44, 6] }, //       the way down to the car park under the avenue

  { surface: "setts", rule: "wall", poly: [[8, 73], [9, 73.5], [17.5, 82], [17.5, 83], [8, 83]] }, // and in the corner of the two roads

  // ---- The lawns between the halls: slower, but open ----
  { surface: "lawn", rule: "grass", rect: [13, 16, 53, 74] },
  { surface: "lawn", rule: "grass", poly: [[13, 74], [44, 74], [40, 78], [13, 78]] },

  // ---- The west street and the coast road: pavements of pale flagstones ----
  { surface: "flagstones", rule: "road", rect: [9, 7, 13, 72] },
  // The corner between them is cut off slantwise, as the real one is.
  { surface: "flagstones", rule: "road", poly: [[9, 70], [13, 70], [13, 72.3], [18.7, 78], [24, 78], [24, 82], [17.5, 82], [9, 73.5]] },
  { surface: "flagstones", rule: "road", rect: [22, 78, 42, 82] },

  // ---- The entrance avenue: small cobbles, and a band of smooth slabs along its south side ----
  { surface: "cobbles", rule: "road", rect: [9, 7, 53, 13] },
  { surface: "flagstones", rule: "road", rect: [9, 13, 13, 16] },
  { surface: "slabs", rule: "road", rect: [13, 13, 53, 16] },

  // ---- Indoors: the Hovione Atrium, with its two doors ----
  // ("indoors" keeps the shadows of the buildings off these floors.)
  { surface: "atrium", rule: "road", rect: [54, 4, 76, 20], indoors: true },
  { surface: "doormat", rule: "road", rect: [53, 10, 54, 14], indoors: true }, //      the entrance, in the west front
  { surface: "doormat", rule: "road", rect: [65, 20, 69, 21], indoors: true }, //      the way out, in the south wall

  // ---- The terrace, the promenade, the stairs and the lower plaza: ochre concrete ----
  { surface: "ochre", rule: "road", rect: [64, 21, 73, 33] }, //        the terrace by the cafe
  { surface: "ochre", rule: "road", rect: [64, 33, 71, 63] }, //        under the library, and the promenade
  { surface: "ochre", rule: "road", rect: [71, 51, 72, 54] }, //        a recess at a glass entrance
  { surface: "steps", rule: "road", rect: [64, 63, 71, 69] }, //        the wide stairs, driven as a ramp
  { surface: "ochre", rule: "road", rect: [64, 69, 73, 78] }, //        the lower plaza
  { surface: "ochre", rule: "road", rect: [48, 70, 64, 74] }, //        the path west, past the beach tunnel
  // The path slants down to the pavement of the coast road.
  { surface: "ochre", rule: "road", poly: [[48, 70], [52, 70], [52, 74], [49.66, 74], [41.66, 82], [40, 82], [40, 78]] },

  // ---- Paint only: things that lie in the paving ----
  { surface: "glass-floor", rect: [66, 26, 70, 31] }, //                the frosted glass floor on the terrace
  { surface: "glass-floor", rect: [65, 49, 68, 53] }, //                and two more along the promenade
  { surface: "glass-floor", rect: [65, 56, 68, 61] },
  // The Sagres Beach Way, sunken in the race view (client/levels.js), and
  // the floor inside the tunnel's mouth. Since 20 November 2026 (Francisco,
  // for the team) the tunnel is right at the edge of the lower plaza and
  // the Beach Way is only in front of its mouth; it used to run west along
  // the path from column 50.5, with the tunnel at columns 51 to 57.
  { surface: "ramp-sand", rule: "wall", rect: [55, 74, 64, 77] },
  { surface: "tunnel-floor", rule: "wall", rect: [56.5, 77, 62.5, 79.5] },
];

/**
 * What the driving rules make of each kind of ground when a shape does not
 * say. Only used to explain the map: the track's own letters decide.
 */
export const RULE_LETTERS = { road: ".", grass: ",", wall: "#" };

/** Is the middle of a square inside a shape? "column" and "row" count squares from 0. */
export function shapeCovers(shape, column, row) {
  const x = column + 0.5;
  const y = row + 0.5;
  if (shape.rect) {
    const [left, top, right, bottom] = shape.rect;
    return x >= left && x < right && y >= top && y < bottom;
  }
  // The usual test for "inside a shape with corners": count how many edges a
  // line from the point to the far right crosses. An odd number means inside.
  let inside = false;
  const corners = shape.poly;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const [xi, yi] = corners[i];
    const [xj, yj] = corners[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * The letter map that the shapes describe: one text per row, "#" for wall,
 * "." for road and "," for grass. "walls" is a list of further rectangles
 * that are wall whatever lies under them: the buildings (nova-lap-buildings.js).
 */
export function lettersFromGround(ground, size, walls = []) {
  const rows = [];
  for (let row = 0; row < size.rows; row++) {
    let text = "";
    for (let column = 0; column < size.columns; column++) {
      let letter = "#";
      for (const shape of ground) {
        if (shape.rule !== undefined && shapeCovers(shape, column, row)) {
          letter = RULE_LETTERS[shape.rule];
        }
      }
      if (walls.some((rect) => shapeCovers({ rect }, column, row))) {
        letter = "#";
      }
      text += letter;
    }
    rows.push(text);
  }
  return rows;
}
