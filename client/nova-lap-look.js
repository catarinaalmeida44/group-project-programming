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
import { NOVA_LAP_BLOCKS, NOVA_LAP_FENCES, NOVA_LAP_FLAT_STYLES, NOVA_LAP_FURNITURE } from "./nova-lap-buildings.js";
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
  // Past the bottom of the map, across the coast road: Carcavelos beach and
  // the sea (shore.js). The map ends 4 squares (12 m) past the road; then
  // about 55 m of sand, a line of surf, and the sea to the horizon. Not a
  // survey: the real beach is wider in the west and narrower by the fort, and
  // the map's coast road is straight where the real one slants.
  shore: {
    bands: [
      { from: 92 * 32, colour: "#e3cf9e" }, //                                  dry sand
      { from: 92 * 32 + 40 * NOVA_LAP_UNITS_PER_METRE, colour: "#d2bb87" }, //  wet sand
      { from: 92 * 32 + 55 * NOVA_LAP_UNITS_PER_METRE, colour: "#eef4f6" }, //  the surf
      { from: 92 * 32 + 58 * NOVA_LAP_UNITS_PER_METRE, colour: "#3f8fbf", water: true }, //  shallow water
      { from: 92 * 32 + 90 * NOVA_LAP_UNITS_PER_METRE, colour: "#2f7fb5", water: true }, //  the sea, as on the horizon
    ],
    // How much of the water is painted again over the haze, so the far sea
    // stays blue (0: not at all, 1: as if there were no haze).
    throughHaze: 0.6,
  },
  seeGroundTo: 3600,
  kerbs: false,
  kerbColours: ["#d8473f", "#f2f5f7"],
  edgeLines: false,

  // The podium at the end of a race (podium-view.js): on the lawn in front
  // of the white wall with the school's name, at the end of the avenue, as
  // [column, row]. The camera ends up further west on the lawn and looks
  // east, at the podium and the name above it. (Pedro, 18 November 2026.
  // The same evening Catarina tried it inside the atrium, at [63.2, 14.3]
  // with the camera at [62.1, 14.92], and liked it better out here.)
  // (Pedro's camera stood at [49.1, 6.1]. It ends about where his did, shows
  // everything bigger, and comes in from far away when the podium comes up:
  // TRACK_CAMERA in podium-view.js and cameraPullBack in podium.js.)
  podium: { at: [50.8, 6.1], camera: [49.15, 6.1] },

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
    [37.5, 79.5], // over the ramp of the coast road
    [27, 79.4],
    [22.5, 78.6], // past the cones and the bins
    [16.6, 78.6],
    [11, 72.6], //   round the corner of the two roads
    [11.5, 69], //   over the first ramp of the west street
    [11.5, 58],
    [10.6, 52],
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
  // Stairs, as [left, top, right, bottom] in squares of the map: a kart that
  // drives over them jolts on the steps in the race view (stairs-bump.js).
  // Only the picture: the driving is the same as on any road. (20 November
  // 2026, at the team's request. Real hills were tried the same day and left
  // out: the ground is drawn flat, and a slower kart alone did not feel like
  // going up or down.)
  stairs: [[64, 63, 71, 69]], // the wide stairs, from the promenade to the lower plaza
  // The ground at two levels, in the race view only (levels.js): the wide
  // stairs go down to the lower plaza in front of the Grand Auditorium, and
  // the path past the beach tunnel rises back up to the west, to the
  // slanting path. Karts drive on it as on any road. (20 November 2026, a
  // first try at the team's request. The drop is a guess, kept a little
  // smaller than the height of the race camera's eye, about 3.3 metres, so
  // that from the lower plaza the camera still sees over the edge.)
  levels: {
    drop: 2.2,
    areas: [
      { rect: [64, 63, 71, 69], from: 0, to: 1, along: "y", steps: 12 }, // the stairs, down to the south
      { rect: [64, 69, 73, 78], to: 1 }, //                                  the lower plaza
      // The path: at ground level in the west, as deep as the plaza in the
      // east. In 40 steps, too small to see one by one, so it looks like a
      // ramp. (16 for a few minutes: it looked like a second flight of stairs.)
      { rect: [48, 70, 64, 74], from: 0, to: 1, along: "x", steps: 40 },
    ],
  },
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
  // Cars on the two roads beside the track. They are only a picture: no
  // kart can reach the roads, and nothing here changes a race. Each lane
  // is a line of points (in squares of the map) that its cars follow at a
  // steady speed, in units a second, starting again at the first point.
  traffic: [
    // Along the coast road towards Cascais, right at the roundabout, up the west street.
    { points: [[90, 84.4], [8.6, 84.4], [7.4, 83.4], [6.6, 82.2], [6.6, 0]], speed: 215, cars: 7 },
    // Down the west street, round the roundabout, along the coast road towards Lisbon.
    { points: [[4.4, 0], [4.4, 82.8], [3.3, 84.8], [4.2, 87.4], [6.4, 87.7], [9, 86.6], [90, 86.6]], speed: 235, cars: 7 },
  ],

  scatter: [],
  // Single things, each at [column, row]. None of them is on the road.
  props: [
    // The things that stand on a square of their own: the Christmas tree,
    // tables and chairs, the statue, the trees and benches of the avenue.
    ...NOVA_LAP_FURNITURE,
    // Bushes on the bank beside the slanting path, behind its stone edge.
    ...[0.4, 1.5, 2.6, 3.7, 4.8, 5.9, 7.0].map((along, i) => ({
      kind: "shrub",
      column: 49.66 - along + 0.1,
      row: 74 + along + 0.1,
      size: 1.25 + (i % 3) * 0.2,
    })),
    // Lamp posts between the pavements and the two roads.
    ...[20, 26, 32, 38, 46, 54, 62, 70, 78, 86].map((column) => ({ kind: "lamp", column, row: 82, size: 2 })),
    ...[14, 22, 30, 38, 46, 54, 62, 70].map((row) => ({ kind: "lamp", column: 8, row, size: 2 })),
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
