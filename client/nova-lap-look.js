// How the Nova lap looks: its sky, its horizon, the way round, and what
// stands on it. track-looks.js explains what each part of a look is for.
//
// The ground is in nova-lap-ground.js, the buildings in nova-lap-buildings.js
// and the pictures on their walls in wall-art.js. This file puts them together
// and adds the single things: the Christmas tree, the statue, the flags.
//
// On this map north is up. Directions are angles: 0 points east, 1.57 south
// (towards the sea), 3.14 west, 4.71 north.

import { NOVA_LAP_GROUND } from "./nova-lap-ground.js";
import { NOVA_LAP_BLOCKS, NOVA_LAP_FENCES, NOVA_LAP_FLAT_STYLES } from "./nova-lap-buildings.js";
import { WALL_ART } from "./wall-art.js";

/** One square of the map is 3 metres and 32 units, so this many units are one metre. */
export const NOVA_LAP_UNITS_PER_METRE = 32 / 3;

export const NOVA_LAP_LOOK = {
  // The three plain colours of ground. This track paints its ground from
  // shapes instead (see "ground" below), so these are only used by the
  // parts of the game that know nothing but road, grass and wall.
  road: { shades: ["#cd9847", "#d19c4b"], specks: 6, speckSize: 1.6, joints: 0, stripes: false },
  grass: { shades: ["#5c9d4b", "#65a652"], specks: 5, speckSize: 2.4, joints: 0, stripes: true },
  wall: { shades: ["#a9ad80", "#aeb285"], specks: 4, speckSize: 2.4, joints: 0, stripes: false },
  beyond: "#a9ad80",
  haze: "#dfe9ee",
  seeGroundTo: 3600,
  kerbs: false,
  kerbColours: ["#d8473f", "#f2f5f7"],
  edgeLines: false,

  // The way round, through the middle of the road, as [column, row]. The
  // arrows on the ground follow it, and so do the computer karts.
  route: [
    [28, 10], //     the grid, on the avenue
    [44, 10.5],
    [52.5, 11.5], // the doors of the atrium
    [58, 12],
    [63, 15.5], //   across the hall, under the wooden gallery
    [66.2, 19.5], // the doors to the terrace
    [66.6, 24],
    [67.4, 33], //   under the library
    [67.4, 41],
    [67, 55], //     down the promenade
    [67, 63], //     the stairs
    [66.5, 70.5], // the lower plaza: turn right
    [61, 71.6],
    [50, 71.6], //   past the beach tunnel
    [47.6, 72.2],
    [40.6, 79.3], // down the slanting path
    [37, 79.6],
    [21, 79.6], //   along the coast road
    [16.6, 78.6],
    [11, 72.6], //   round the corner of the two roads
    [10.6, 68],
    [10.6, 17], //   up the west street
    [12.6, 11.5], // round the flags, into the avenue
    [20, 10],
  ],
  arrowGap: 190,
  arrowColour: "rgba(255, 255, 255, 0.36)",

  // A clear afternoon: the sun stands over the sea in the south-west.
  sky: { top: "#2a78d2", low: "#c9e5f4", sunTowards: 2.36, sunHeight: 0.52, clouds: 7 },
  far: [
    // The sea, from the river mouth in the south-east round to the beach in the west.
    { kind: "sea", from: 0.3, to: 2.8, colour: "#2f7fb5" },
    // Inland: low hills, and in front of them the houses of Carcavelos with their red roofs.
    { kind: "hills", from: 2.8, to: 0.3 + Math.PI * 2, colour: "#93ad98", height: 16 },
    { kind: "town", from: 2.9, to: 0.2 + Math.PI * 2, colour: "#efe9dc", roof: "#c0623f", height: 9 },
  ],
  landmarks: [
    { kind: "fort", towards: 0.62 }, //       the Sao Juliao da Barra fort, along the coast to the east
    { kind: "lighthouse", towards: 1.2 }, //  the Bugio lighthouse, out in the river mouth
  ],

  // A wall that has no scenery of its own becomes a low bank, as on the
  // other tracks, so that no wall is ever invisible. Every wall beside the
  // road of this track has scenery (tests/nova-lap-look.test.js checks it).
  barrierHeight: 8,
  barrier: { colours: ["#3f7a3c", "#47843f"], top: "#4f8f45" },
  buildings: {
    wall: { north: "#cfd4d9", east: "#e6e9ec", south: "#f6f7f8", west: "#bcc3ca" },
    glass: "#24415a",
    roof: "#a3abb4",
  },

  // ---- What only this track has ----

  ground: NOVA_LAP_GROUND,
  // Lines painted on the ground. Each is in squares of the map.
  groundMarks: [
    // The west street and the coast road: a broken line down the middle, a line along each edge.
    { kind: "dashes", from: [5.5, 0], to: [5.5, 81] },
    { kind: "line", from: [3.25, 0], to: [3.25, 82], width: 0.06 },
    { kind: "line", from: [7.75, 0], to: [7.75, 80], width: 0.06 },
    { kind: "dashes", from: [10, 85.5], to: [90, 85.5] },
    { kind: "line", from: [10, 83.25], to: [90, 83.25], width: 0.06 },
    { kind: "line", from: [8, 87.75], to: [90, 87.75], width: 0.06 },
    { kind: "roundabout", at: [5.5, 85.5], radius: 2.9 },
    // The metal frames of the glass floors.
    { kind: "frame", rect: [66, 26, 70, 31] },
    { kind: "frame", rect: [65, 49, 68, 53] },
    { kind: "frame", rect: [65, 56, 68, 61] },
  ],
  // Shadows fall to the north-east. For every unit a thing is tall, its shadow reaches this far.
  sun: { reach: { x: 0.5, y: -0.42 } },
  scenery: {
    unitsPerMetre: NOVA_LAP_UNITS_PER_METRE,
    blocks: NOVA_LAP_BLOCKS,
    fences: NOVA_LAP_FENCES,
    flatStyles: NOVA_LAP_FLAT_STYLES,
  },
  wallArt: WALL_ART,

  scatter: [],
  // Single things, each at [column, row]. None of them is on the road.
  props: [
    // Inside the atrium.
    { kind: "christmas-tree", column: 56, row: 6 },
    // Beside the library: the turquoise statue on its block.
    { kind: "statue", column: 64, row: 32 },
    // Black signs, as on the campus.
    { kind: "totem", column: 53, row: 14.2, label: "Hovione Atrium" },
    { kind: "totem", column: 63.4, row: 74.4, label: "Beach tunnel" },
    // The flags at the corner of the avenue.
    { kind: "banner-flag", column: 13.2, row: 16.2, label: "white" },
    { kind: "banner-flag", column: 14.4, row: 16.6, label: "blue" },
    { kind: "banner-flag", column: 15.6, row: 17, label: "white" },
    { kind: "banner-flag", column: 13.3, row: 18, label: "blue" },
    { kind: "banner-flag", column: 13.2, row: 19.6, label: "europe" },
    { kind: "banner-flag", column: 13.2, row: 21.2, label: "portugal" },
    // Palms across the coast road, by the beach.
    ...[11, 17, 24, 30, 37, 43, 50, 56, 63, 69, 76, 82].map((column, i) => ({ kind: "palm", column, row: 89 + (i % 2) * 0.8, size: 0.9 + (i % 3) * 0.12 })),
    // Trees in the park east of the campus, and round the residence.
    { kind: "pine", column: 84, row: 24 },
    { kind: "pine", column: 86.5, row: 30 },
    { kind: "tree", column: 84.5, row: 37 },
    { kind: "pine", column: 86, row: 46 },
    { kind: "tree", column: 84, row: 57 },
    { kind: "tree", column: 49, row: 1.6 },
    { kind: "tree", column: 51, row: 4.6 },
    { kind: "tree", column: 16, row: 4.4 },
    { kind: "tree", column: 22, row: 4.2 },
    // Old olive trees on the lawns, as on the real ones.
    { kind: "olive", column: 17, row: 74.5 },
    { kind: "olive", column: 18.5, row: 52 },
    { kind: "olive", column: 30, row: 55 },
    { kind: "olive", column: 16, row: 33 },
    { kind: "olive", column: 40, row: 31 },
  ],
};
