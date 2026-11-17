// The buildings of the Nova lap: where each one stands, how tall it is, and
// which picture is on each of its sides.
//
// Everything is measured in squares of the map (3 by 3 metres each), like
// nova-lap-ground.js. Heights are in metres. scenery.js turns these lists
// into shapes on the screen, wall-art.js has the pictures.
//
// A BLOCK is a box:
//   rect    [left, top, right, bottom] on the map
//   base    where it starts above the ground (left out: on the ground).
//           A box that starts above the ground is a roof or a bridge.
//   top     where it ends. "topEnd" with "slope" makes a top that slopes
//           along x (from the left edge to the right) or along y.
//   faces   the picture on each side: north, east, south, west. A side that
//           is left out gets no picture, because nobody can see it.
//           { art, shift } starts the picture "shift" squares further along,
//           so that one long picture can run over several boxes in a row.
//   soffit  the colour of its underside, by name (FLAT_STYLES below)
//   roof    the colour of its top, by name. Tops higher than the camera are never seen.
//   solid   false for a box on the ground that karts may drive through
//
// A FENCE is a thin upright thing, seen from both sides: from, to, base, top, art.
//
// The heights are estimates from the video, checked against people standing
// next to the walls: a door is about 2.2 metres, a storey about 4.

const WHITE = "white";

// ---------------------------------------------------------------------------
// THE BLOCKS
// ---------------------------------------------------------------------------

const ENTRANCE_AND_ATRIUM = [
  // The entrance front, at the east end of the avenue (wall-art.js: "front").
  // It is one wall in four pieces, because the doors are an opening.
  { name: "front, white wall", rect: [53, 4, 54, 9], top: 11.2, faces: { west: { art: "front", shift: 0 }, east: { art: "atrium-west-in", shift: 11 } } },
  { name: "front, glass north of the doors", rect: [53, 9, 54, 10], top: 12.5, faces: { west: { art: "front", shift: 5 }, east: { art: "atrium-west-in", shift: 10 } } },
  { name: "front, over the doors", rect: [53, 10, 54, 14], base: 4.2, top: 12.5, soffit: "white", faces: { west: { art: "front", shift: 6 }, east: { art: "atrium-west-in", shift: 6 } } },
  { name: "front, glass south of the doors", rect: [53, 14, 54, 20], top: 12.5, faces: { west: { art: "front", shift: 10 }, east: { art: "atrium-west-in", shift: 0 } } },
  // The roof sticks out over the glass, with a white steel lattice along its edge.
  { name: "front, roof edge", rect: [51.6, 9, 53, 20], base: 11.2, top: 12.5, soffit: "canopy", faces: { west: "truss", north: "truss" } },
  { name: "front, canopy over the doors", rect: [52.2, 9, 53, 20], base: 4.45, top: 4.7, soffit: "white", faces: { west: WHITE } },

  // The other three walls of the atrium.
  { name: "atrium, north wall", rect: [53, 3, 77, 4], top: 12.5, faces: { north: WHITE, south: "atrium-north-in", west: WHITE, east: WHITE } },
  { name: "atrium, east wall", rect: [76, 4, 77, 20], top: 12.5, faces: { west: { art: "atrium-east-in", shift: 1 }, east: WHITE } },
  { name: "atrium, south wall east of the doors", rect: [69, 20, 77, 21], top: 12.5, faces: { north: "atrium-south-in", south: { art: "terrace-wall", shift: 15 }, east: WHITE } },
  { name: "atrium, over the doors to the terrace", rect: [65, 20, 69, 21], base: 4.2, top: 12.5, soffit: "white", faces: { north: { art: "atrium-south-in", shift: 8 }, south: { art: "terrace-wall", shift: 11 } } },
  { name: "atrium, south wall west of the doors", rect: [54, 20, 65, 21], top: 12.5, faces: { north: { art: "atrium-south-in", shift: 12 }, south: { art: "terrace-wall", shift: 0 } } },

  // Its roof: a grey deck on white steel, with a long skylight down the middle.
  { name: "atrium roof, north", rect: [54, 4, 76, 9], base: 12.4, top: 12.9, soffit: "atrium-deck" },
  { name: "atrium skylight", rect: [54, 9, 76, 15], base: 12.4, top: 12.9, soffit: "skylight" },
  { name: "atrium roof, south", rect: [54, 15, 76, 20], base: 12.4, top: 12.9, soffit: "atrium-deck" },

  // The gallery round the hall, with its underside of red-brown wooden beams.
  { name: "gallery, south", rect: [54, 16.5, 72.5, 20], base: 4.4, top: 5.5, soffit: "wood-beams", faces: { north: WHITE } },
  { name: "gallery, east", rect: [72.5, 4, 76, 20], base: 4.4, top: 5.5, soffit: "wood-beams-across", faces: { west: WHITE } },
  { name: "gallery, north", rect: [54, 4, 72.5, 6.5], base: 4.4, top: 5.5, soffit: "wood-beams", faces: { south: WHITE } },
];

const TERRACE_AND_LIBRARY = [
  // The long main building, west of the terrace and the promenade. Its
  // glass side is in three parts with different pictures.
  { name: "main building, by the terrace", rect: [53, 21, 64, 33], top: 9, faces: { east: "galleria-plaza", west: "galleria-west" } },
  { name: "main building, the coloured rooms", rect: [53, 33, 64, 50], top: 9, faces: { east: "galleria-colour", west: "galleria-west" } },
  { name: "main building, clear glass", rect: [53, 50, 64, 62], top: 9, faces: { east: "galleria-clear", west: "galleria-west" } },
  { name: "main building, roof", rect: [53, 21, 64, 62], base: 9, top: 12.5, soffit: null, faces: { west: "fascia" } },
  // Its deep white roof edge hangs out over the paving.
  { name: "roof edge over the terrace", rect: [64, 24, 65.3, 33], base: 9, top: 12.5, soffit: "slats", faces: { east: "fascia", south: "fascia", west: "fascia" } },
  { name: "roof edge over the promenade", rect: [64, 41, 65.3, 62], base: 9, top: 12.5, soffit: "slats", faces: { east: "fascia", north: "fascia", south: "fascia", west: "fascia" } },

  // The flat roof that covers the first metres of the terrace.
  { name: "terrace roof", rect: [64, 21, 73, 24], base: 4.6, top: 5.6, soffit: "beige", faces: { south: WHITE, east: WHITE } },

  // The cafe: a glass box under a flat white roof.
  { name: "cafe", rect: [73, 21, 80, 29], top: 4.2, faces: { west: "cafe-glass", south: "cafe-glass", east: WHITE, north: WHITE } },
  { name: "cafe canopy", rect: [71.8, 24, 73, 29.6], base: 3.9, top: 4.2, soffit: "white", faces: { west: WHITE, south: WHITE } },
  { name: "terrace edge", rect: [73, 29, 73.4, 33], top: 0.9, roof: "concrete-top", faces: { west: "concrete", north: "concrete" } },

  // The library, and the part of it that bridges the way to the promenade.
  { name: "library", rect: [71, 33, 82, 51], top: 10, faces: { west: "library-west", north: "library-north", south: WHITE, east: WHITE } },
  { name: "library bridge", rect: [65, 33, 71, 41], base: 4.6, top: 10, soffit: "white", faces: { north: "library-bridge", south: "library-bridge" } },
  { name: "library pier", rect: [64, 33, 65, 41], top: 10, faces: { north: "pier-name", east: WHITE, south: WHITE } },

  // Along the east side of the promenade.
  { name: "glass entrance", rect: [72, 51, 82, 54], top: 9, faces: { west: "cream-entrance" } },
  { name: "Westmont Hospitality Hall", rect: [71, 54, 82, 63], top: 10, faces: { west: "westmont", north: "cream", south: "cream", east: "cream" } },
  { name: "terrace beside the stairs", rect: [71, 63, 73, 69], top: 1.3, roof: "paving", faces: { west: WHITE, south: WHITE } },
];

const PLAZA_AND_TUNNEL = [
  // The south end of the main building, round the lower plaza and along the path.
  { name: "south end, terraces", rect: [56, 62, 64, 70], top: 11, faces: { east: "balcony-east", south: "south-end", west: WHITE } },
  { name: "south end, slats", rect: [50, 62, 56, 70], top: 9, faces: { south: "louvres", north: WHITE, west: WHITE } },
  { name: "retaining wall", rect: [40, 62, 50, 70], top: 5.5, faces: { south: "retaining", west: "retaining", north: WHITE } },
  { name: "white box above the wall", rect: [42, 63, 47, 67], base: 5.5, top: 9, soffit: null, faces: { south: "white-box-window", west: WHITE, east: WHITE, north: WHITE } },

  { name: "Grand Auditorium", rect: [73, 66, 89, 81], top: 14, topEnd: 9, slope: "y", faces: { west: "auditorium-west", north: WHITE, south: WHITE } },

  // The mouth of the beach tunnel, at the end of its sunken way.
  { name: "tunnel mouth", rect: [50, 74, 52, 78], top: 3.2, roof: "lawn", faces: { east: "tunnel-portal", north: "sand-wall", south: "sand-wall", west: "sand-wall" } },
  { name: "hedge behind the tunnel way", rect: [52, 78, 64, 78.5], top: 1.4, roof: "hedge-top", faces: { north: "hedge", south: "hedge" } },
];

const HALLS = [
  // Three academic halls stand between the west street and the main
  // building, each a long wing with a white head at its west end.
  { name: "Cascais hall, wing", rect: [21, 19, 53, 24], top: 8, faces: { north: "hall-bands", south: "hall-bands" } },
  { name: "Cascais hall, head", rect: [15, 18, 21, 25], top: 9.5, faces: { west: "cascais-head", south: "cascais-name", north: WHITE, east: WHITE } },
  // Its tall white frame on the avenue: two piers and a beam across.
  { name: "Cascais frame, pier", rect: [22, 16, 23, 19], top: 12, faces: { north: WHITE, west: WHITE, east: WHITE } },
  { name: "Cascais frame, pier", rect: [26, 16, 27, 19], top: 12, faces: { north: WHITE, west: WHITE, east: WHITE } },
  { name: "Cascais frame, beam", rect: [23, 16, 26, 19], base: 9.6, top: 12, soffit: "white", faces: { north: WHITE } },

  { name: "Santander hall, wing", rect: [24, 42, 53, 47], top: 8, faces: { north: "hall-bands", south: "hall-bands" } },
  { name: "Santander hall, fin", rect: [17, 41, 24, 48], top: 13, topEnd: 8, slope: "x", faces: { south: "santander-name", north: WHITE, west: "portal-open", east: WHITE } },

  { name: "south hall, wing", rect: [22, 62, 40, 67], top: 8, faces: { north: "hall-bands", south: "hall-bands" } },
  { name: "south hall, head", rect: [16, 61, 22, 68], top: 9, faces: { west: "hall-head-glass", north: WHITE, south: WHITE, east: WHITE } },
];

const EDGES = [
  { name: "residence", rect: [12, 0, 46, 2], top: 10, faces: { south: "residence", east: WHITE, west: WHITE } },
  // Low walls: along the avenue, the west street and the coast road.
  { name: "avenue parapet", rect: [9, 6.7, 53, 7], top: 0.9, roof: "concrete-top", faces: { south: "concrete" } },
  { name: "west street wall", rect: [8.7, 7, 9, 74], top: 0.6, roof: "limestone", faces: { east: "low-wall" } },
  { name: "coast road wall", rect: [17, 82, 41.7, 82.3], top: 0.6, roof: "limestone", faces: { north: "low-wall" } },
];

export const NOVA_LAP_BLOCKS = [...ENTRANCE_AND_ATRIUM, ...TERRACE_AND_LIBRARY, ...PLAZA_AND_TUNNEL, ...HALLS, ...EDGES];

// ---------------------------------------------------------------------------
// THE FENCES
// ---------------------------------------------------------------------------

export const NOVA_LAP_FENCES = [
  // The white letters on the floor of the atrium, read from the entrance.
  { name: "letter N", from: [60.5, 4.6], to: [60.5, 5.17], top: 1.7, art: "letter-n", lean: [-1, 0] },
  { name: "letter O", from: [60.5, 5.9], to: [60.5, 6.47], top: 1.7, art: "letter-o", lean: [-1, 0] },
  { name: "letter V", from: [60.5, 7.2], to: [60.5, 7.77], top: 1.7, art: "letter-v", lean: [-1, 0] },
  { name: "letter A", from: [60.5, 8.5], to: [60.5, 9.07], top: 1.7, art: "letter-a", lean: [-1, 0] },
  // The glass rails of the gallery.
  { name: "gallery rail, south", from: [72.5, 16.5], to: [54, 16.5], base: 5.5, top: 6.6, art: "glass-rail", lean: [0, 1] },
  { name: "gallery rail, east", from: [72.5, 6.5], to: [72.5, 16.5], base: 5.5, top: 6.6, art: "glass-rail", lean: [1, 0] },
  { name: "gallery rail, north", from: [54, 6.5], to: [72.5, 6.5], base: 5.5, top: 6.6, art: "glass-rail", lean: [0, -1] },
  // Railings: beside the stairs, along the sunken way to the tunnel, round the lower plaza.
  { name: "rail on the terrace beside the stairs", from: [71, 63], to: [71, 69], base: 1.3, top: 2.4, art: "railing", lean: [1, 0] },
  { name: "rail on the terrace, south", from: [71, 69], to: [73, 69], base: 1.3, top: 2.4, art: "railing", lean: [0, -1] },
  { name: "rail along the tunnel way", from: [52, 74], to: [64, 74], top: 1.1, art: "railing", lean: [0, 1] },
  { name: "rail at the head of the tunnel way", from: [64, 74], to: [64, 78], top: 1.1, art: "railing", lean: [-1, 0] },
  { name: "rail south of the plaza", from: [64, 78], to: [73, 78], top: 1.1, art: "railing", lean: [0, 1] },
  { name: "rail on the retaining wall", from: [40, 70], to: [50, 70], base: 5.5, top: 6.6, art: "railing", lean: [0, -1] },
  // Shrubs along the slanting path down to the coast road.
  { name: "shrubs beside the slanting path", from: [49.66, 74], to: [41.66, 82], top: 1.3, art: "hedge", lean: [1, 1] },
  // The low wall round the corner of the two roads.
  { name: "low wall round the corner", from: [9, 74], to: [17, 82], top: 0.6, art: "low-wall", lean: [-1, 1] },
];

// ---------------------------------------------------------------------------
// COLOURS OF TOPS AND UNDERSIDES
// ---------------------------------------------------------------------------

/**
 * "parts" are stripes repeated in every square, each [left, top, right,
 * bottom] as shares of one square: the beams of a ceiling, the bars of a skylight.
 */
export const NOVA_LAP_FLAT_STYLES = {
  roof: { colour: "#dfe1e2" },
  plain: { colour: "#e9eae8" },
  white: { colour: "#f1f1ee" },
  beige: { colour: "#dccba9" },
  paving: { colour: "#cf9a48" },
  limestone: { colour: "#efe8d5" },
  "concrete-top": { colour: "#cfcdc6" },
  "hedge-top": { colour: "#44773b" },
  lawn: { colour: "#5c9e4b" },
  canopy: { colour: "#dfe2e2", parts: [{ rect: [0, 0.45, 1, 0.55], colour: "#f7f8f7" }] },
  slats: { colour: "#927150", parts: [{ rect: [0, 0.44, 1, 0.56], colour: "#6f5438" }] },
  // The underside of the gallery: dark red-brown boards, lighter beams across them.
  "wood-beams": {
    colour: "#6b2f1d",
    parts: [
      { rect: [0.1, 0, 0.3, 1], colour: "#96492b" },
      { rect: [0.6, 0, 0.8, 1], colour: "#96492b" },
    ],
  },
  "wood-beams-across": {
    colour: "#6b2f1d",
    parts: [
      { rect: [0, 0.1, 1, 0.3], colour: "#96492b" },
      { rect: [0, 0.6, 1, 0.8], colour: "#96492b" },
    ],
  },
  "atrium-deck": { colour: "#a7aeb3", parts: [{ rect: [0.44, 0, 0.56, 1], colour: "#eef0ef" }] },
  skylight: {
    colour: "#eaf4fa",
    parts: [
      { rect: [0.46, 0, 0.54, 1], colour: "#ffffff" },
      { rect: [0, 0.47, 1, 0.53], colour: "#c9d6de" },
    ],
  },
};

// ---------------------------------------------------------------------------
// WHAT IS SOLID
// ---------------------------------------------------------------------------

/** Squares that are wall although no box stands on them: under the standing letters, the tree and the statue. */
const MORE_SOLID = [
  [60, 4, 61, 9], //   the letters N O V A
  [56, 6, 57, 7], //   the Christmas tree
  [64, 32, 65, 33], // the statue beside the library
];

/**
 * Every rectangle that is wall whatever the ground under it says: each box
 * that stands on the ground, and the squares above. A square counts when its
 * middle lies inside the rectangle, so a thin low wall takes no square.
 */
export const NOVA_LAP_SOLID = [
  ...NOVA_LAP_BLOCKS.filter((block) => (block.base ?? 0) === 0 && block.solid !== false).map((block) => block.rect),
  ...MORE_SOLID,
];
