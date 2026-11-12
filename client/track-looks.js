// How each track looks: its colours, its markings, its sky and what stands
// beside the road.
//
// The driving rules know only three kinds of ground: wall, road and grass
// (the "shared" folder). Everything in this file is about the picture and
// changes nothing about how a kart moves. That is why it lives here, with
// the drawing, and not with the track itself.
//
// A look says:
//   road, grass, wall   how each kind of ground is painted (ground.js)
//   beyond, haze        the land past the edge of the map, and the colour
//                       distant things fade into
//   route               points along the middle of the road, in driving
//                       order, as [column, row]. Arrows are painted along it
//   sky, far            the sky, and what is on the horizon in each direction
//   barrier, buildings  how walls are painted where they stand up (draw.js)
//   props               what stands beside the road: trees, lamps, flags
//
// Directions ("towards") are angles on the map, in radians, like the angle
// of a kart: 0 points right, a quarter turn (1.57) points down the map.

import { TRACKS } from "../shared/tracks/index.js";
import { routePoints, bendsOf } from "./route.js";

/** A race circuit in the country: the look of the test oval, and of any track without a look of its own. */
const CIRCUIT = {
  road: { shades: ["#4a505b", "#4f5661"], specks: 6, speckSize: 1.8, joints: 0, stripes: false },
  grass: { shades: ["#3d8c4a", "#44954f"], specks: 5, speckSize: 2.4, joints: 0, stripes: true },
  wall: { shades: ["#35774a", "#397d4e"], specks: 4, speckSize: 2.4, joints: 0, stripes: false },
  beyond: "#35774a",
  haze: "#d5e8f4",
  seeGroundTo: 3600,
  kerbs: true,
  kerbColours: ["#d8473f", "#f2f5f7"],
  edgeLines: true,
  route: null,
  arrowGap: 150,
  arrowColour: "rgba(244, 246, 248, 0.34)",
  sky: {
    top: "#2f7fd6",
    low: "#bfe1f6",
    sunTowards: -2.2, // the direction the sun is in
    sunHeight: 0.62, //  how high it stands: 0 on the horizon, 1 at the top of the screen
    clouds: 9,
  },
  // What is on the horizon, all the way round. "from" and "to" are
  // directions. Hills are rounded shapes in the given colour.
  far: [{ kind: "hills", from: 0, to: Math.PI * 2, colour: "#6fa58a", height: 26 }],
  // Walls that have no storeys become a low bank along the edge of the road:
  // its side is painted in blocks of two colours, its top is grass.
  barrierHeight: 9,
  barrier: { colours: ["#d8473f", "#f2f5f7"], top: "#397d4e" },
  buildings: {
    wall: { north: "#c3c9d1", east: "#dde2e8", south: "#eef1f4", west: "#aab2bc" },
    glass: "#27425c",
    roof: "#8d97a3",
  },
  // Where trees and other things stand. "scatter" spreads a kind of thing
  // over the squares of one kind of ground: about one in "oneIn" squares.
  scatter: [{ kind: "tree", on: ",", oneIn: 5 }],
  props: [],
};

/** The test oval: a plain circuit among trees, with the arrows going round clockwise. */
const TEST_OVAL_LOOK = {
  ...CIRCUIT,
  scatter: [
    { kind: "tree", on: "#", oneIn: 3 },
    { kind: "pine", on: "#", oneIn: 7 },
  ],
  route: [
    [2.5, 2.5],
    [26.5, 2.5],
    [26.5, 14.5],
    [2.5, 14.5],
  ],
};

/**
 * The campus loop: the Nova SBE campus in Carcavelos. Pale paving, lawns,
 * white buildings with long bands of glass, palms and pines, and the sea
 * towards the bottom left of the map.
 */
const CAMPUS_LOOP_LOOK = {
  ...CIRCUIT,
  road: { shades: ["#b7b1a4", "#bdb7aa"], specks: 6, speckSize: 1.6, joints: 16, stripes: false },
  grass: { shades: ["#5a9e4c", "#62a653"], specks: 5, speckSize: 2.4, joints: 0, stripes: true },
  wall: { shades: ["#8e9a86", "#93a08b"], specks: 4, speckSize: 2.4, joints: 0, stripes: false },
  beyond: "#8e9a86",
  haze: "#dcebf3",
  kerbs: false,
  edgeLines: false,
  arrowColour: "rgba(226, 61, 61, 0.42)",
  // The driving line, the same points the robot in tests/campus-loop.test.js drives.
  route: [
    [40, 13], [40, 40], [44, 42], [43, 47], [38, 50], [39, 53], [36, 57], [32, 59], [27, 57], [20, 54],
    [12, 50], [5, 42], [6, 38], [8, 32.5], [23.5, 32.5], [23.5, 27], [8, 27], [6, 22], [9, 17], [11, 13],
  ],
  // On this map north is not straight up: the map was turned so that the
  // buildings run along the squares (shared/tracks/campus-loop.js). South,
  // where the sea and the fort are, is down and a little to the left
  // (direction 1.94), east is 0.37, west is 3.51.
  sky: { top: "#2a78d2", low: "#c6e4f5", sunTowards: 2.75, sunHeight: 0.58, clouds: 7 },
  far: [
    // The sea, from the river mouth in the east-south-east round to the beach in the west.
    { kind: "sea", from: 0.8, to: 3.2, colour: "#2f7fb5" },
    // Inland: low hills, and in front of them the houses of Carcavelos with their red roofs.
    { kind: "hills", from: 3.2, to: 0.8 + Math.PI * 2, colour: "#93ad98", height: 18 },
    { kind: "town", from: 3.3, to: 0.7 + Math.PI * 2, colour: "#efe9dc", roof: "#c0623f", height: 9 },
  ],
  // Single things on the horizon, each in its direction.
  landmarks: [
    { kind: "fort", towards: 1.94 }, //       the São Julião da Barra fort, south of the campus
    { kind: "lighthouse", towards: 1.15 }, // the Bugio lighthouse, out in the river mouth
  ],
  barrierHeight: 8,
  barrier: { colours: ["#3f7a3c", "#47843f"], top: "#4f8f45" }, // a clipped hedge round the campus
  buildings: {
    // White blocks with long bands of dark glass.
    wall: { north: "#cfd4d9", east: "#e6e9ec", south: "#f6f7f8", west: "#bcc3ca" },
    glass: "#24415a",
    roof: "#a3abb4",
  },
  scatter: [
    { kind: "tree", on: ",", oneIn: 8 }, //  young trees on the lawns
    { kind: "pine", on: ",", oneIn: 22 },
    // Outside the campus: palms along the coast road, on the side of the
    // sea (the lower rows of the map), and pines on the inland side.
    { kind: "palm", on: "#", oneIn: 5, within: [0, 44, 63, 61] },
    { kind: "pine", on: "#", oneIn: 6, within: [0, 0, 63, 43] },
  ],
  // Things that stand in one place: signs with the names of the places on
  // the campus, concrete benches, and the painted tunnel to the beach at
  // the southern tip. Each is [column, row] on the map.
  props: [
    { kind: "totem", column: 15, row: 10.6, label: "Walk of Founders" },
    { kind: "totem", column: 42.4, row: 19.5, label: "Green Park" },
    { kind: "totem", column: 42.3, row: 31, label: "Library" },
    { kind: "totem", column: 47, row: 42, label: "Horizon Hall" },
    { kind: "totem", column: 29, row: 52, label: "Grand Auditorium" },
    { kind: "totem", column: 12, row: 29.5, label: "Student Hall" },
    { kind: "tunnel", column: 32, row: 61.2 },
    { kind: "bench", column: 13, row: 11.2 },
    { kind: "bench", column: 17.5, row: 11.2 },
    { kind: "bench", column: 44.5, row: 24 },
    { kind: "bench", column: 46, row: 33 },
  ],
};

const LOOKS = new Map([
  [TRACKS["test-oval"], TEST_OVAL_LOOK],
  [TRACKS["campus-loop"], CAMPUS_LOOP_LOOK],
]);

/** The look of a track. A track that has none of its own gets the plain circuit. */
export function lookOfTrack(track) {
  return LOOKS.get(track) ?? CIRCUIT;
}

/**
 * Where the things beside the road stand on a track: the ones the look
 * lists one by one, and the ones it scatters over a kind of ground.
 * Gives a list of { kind, x, y, size }, in units. "size" makes one tree a
 * little taller than the next. The answer is the same every time for the
 * same track, so the trees do not move between visits.
 */
export function propsOfTrack(track, look, storeys = null) {
  const size = track.tileSize;
  const props = (look.props ?? []).map(({ kind, column, row, size: scale = 1, label }) => ({
    kind,
    x: (column + 0.5) * size,
    y: (row + 0.5) * size,
    size: scale,
    label,
  }));
  // A square with a building on it (shared/tracks/index.js) gets no tree.
  const hasBuilding = (column, row) => storeys !== null && storeys?.rows?.[row]?.[column] > "0";

  // Numbers that look random but are the same every time (see ground.js).
  let state = 9781;
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  // The letter of a square. Outside the map counts as wall.
  const letterAt = (column, row) =>
    row >= 0 && column >= 0 && row < track.rows && column < track.columns ? track.map[row][column] : "#";
  const around = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (let row = 0; row < track.rows; row++) {
    for (let column = 0; column < track.columns; column++) {
      for (const { kind, on, oneIn, within } of look.scatter ?? []) {
        const chosen = random() < 1 / oneIn;
        const along = 0.2 + random() * 0.6;
        const down = 0.2 + random() * 0.6;
        const scale = 0.85 + random() * 0.4;
        // "within" keeps a kind to one part of the map: [first column, first row, last column, last row].
        const inPart =
          within === undefined || (column >= within[0] && row >= within[1] && column <= within[2] && row <= within[3]);
        if (!chosen || !inPart || letterAt(column, row) !== on || hasBuilding(column, row)) {
          continue;
        }
        // On grass: not on a square that touches the road, where a tree
        // would stand in the way of the view and a kart would seem to drive
        // through its trunk. On wall: only well behind the edge of the
        // track, where no kart can come.
        const neighbours = around.map(([dc, dr]) => letterAt(column + dc, row + dr));
        const allowed = on === "#" ? neighbours.every((letter) => letter === "#") : !neighbours.includes(".");
        if (allowed) {
          props.push({ kind, x: (column + along) * size, y: (row + down) * size, size: scale });
        }
      }
    }
  }

  // An arrow board at every bend of the route, where a driver who missed
  // the bend would end up: straight on, at the edge of the road. A bend in
  // the middle of an open square, with no edge near, gets no board.
  for (const bend of bendsOf(routePoints(track, look.route))) {
    for (let reach = 40; reach <= 200; reach += 8) {
      const x = bend.x + Math.cos(bend.from) * reach;
      const y = bend.y + Math.sin(bend.from) * reach;
      if (letterAt(Math.floor(x / size), Math.floor(y / size)) !== ".") {
        props.push({
          kind: bend.turn === "right" ? "turn-right" : "turn-left",
          x: x - Math.cos(bend.from) * 12,
          y: y - Math.sin(bend.from) * 12,
          size: 1,
        });
        break;
      }
    }
  }
  return props;
}
