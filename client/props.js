// The things that stand beside the road, and lie on it: trees, palms,
// lamps, cones, and the banana peels that make a kart spin.
//
// In the race view each of them is a flat picture that always faces the
// camera, like a cardboard figure. That is enough for a tree: it looks the
// same from every side. draw.js decides where on the screen the foot of the
// thing is and how large one unit of track is there, and the functions
// here paint it standing on that spot.
//
// All sizes below are in units of track. A kart is about 16 units high.

const TURN = Math.PI * 2;

/**
 * Paints one thing standing up, in the race view.
 *   kind     "tree", "pine", "palm", "lamp", "cone", "flag" or "banana"
 *   x, y     where its foot is on the screen, in pixels
 *   unit     how many pixels one unit of track is, at that distance
 *   size     1 is normal. Trees differ a little, so a row of them is not a row of copies
 *   seconds  time, for the little movements (a banana wobbles)
 */
export function paintProp(context, kind, x, y, unit, size = 1, seconds = 0, label = "") {
  const paint = STANDING[kind];
  if (paint === undefined) {
    return; // a kind this version does not know: paint nothing rather than break
  }
  context.save();
  context.translate(x, y);
  context.scale(unit * size, unit * size); // from here on, draw in units, with the foot at 0,0 and up being negative y
  paint(context, seconds, typeof label === "string" ? label : "");
  context.restore();
}

/** How tall each kind stands, in units. draw.js uses it to leave out what is off the screen. */
export const PROP_HEIGHT = {
  tree: 46,
  pine: 60,
  palm: 70,
  lamp: 44,
  cone: 7,
  flag: 46,
  banana: 6,
  "turn-right": 22,
  "turn-left": 22,
  totem: 34,
  tunnel: 30,
  bench: 5,
  "christmas-tree": 66,
  statue: 40,
  "banner-flag": 86,
  olive: 36,
  "table-set": 12,
  planter: 15,
  shrub: 13,
  "avenue-tree": 44,
  car: 20,
};

/** The colours a car on the road can have. */
const CAR_COLOURS = { red: "#c8372f", blue: "#2f66b3", white: "#eef0f1", grey: "#7d858c", black: "#23272b", yellow: "#e9b92c" };

/** An arrow board at a bend: a dark board on two legs with three chevrons that point the way. "way" is 1 for right, -1 for left. */
function arrowBoard(context, way) {
  shadow(context, 13);
  context.fillStyle = "#39434d";
  context.fillRect(-10.5, -8, 1.4, 8);
  context.fillRect(9.1, -8, 1.4, 8);
  context.fillStyle = "#14181d";
  context.fillRect(-13, -21, 26, 13);
  context.fillStyle = "#ffd23f";
  for (const middle of [-7.5, 0, 7.5]) {
    context.beginPath();
    context.moveTo(middle + way * 3.4, -14.5);
    context.lineTo(middle - way * 1.4, -19.3);
    context.lineTo(middle - way * 3.6, -19.3);
    context.lineTo(middle + way * 1.2, -14.5);
    context.lineTo(middle - way * 3.6, -9.7);
    context.lineTo(middle - way * 1.4, -9.7);
    context.closePath();
    context.fill();
  }
}

const STANDING = {
  "turn-right": (context) => arrowBoard(context, 1),
  "turn-left": (context) => arrowBoard(context, -1),

  // A slim black sign that names a place, as the signs on the campus do.
  // The name is written down the sign, one word under the other.
  totem(context, seconds, label) {
    shadow(context, 5);
    context.fillStyle = "#14181d";
    context.fillRect(-4.5, -32, 9, 32);
    context.fillStyle = "#e23d3d";
    context.fillRect(-4.5, -32, 9, 1.6);
    context.fillStyle = "#f4f6f8";
    context.font = "bold 2.3px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    label.split(" ").forEach((word, line) => {
      context.fillText(word, 0, -27.5 + line * 3.1, 8);
    });
  },

  // The way down to the beach: a wall the colour of sand with a dark
  // opening, and a mural of bright stripes round it, like the painted
  // tunnel under the coast road.
  tunnel(context) {
    context.fillStyle = "#d9c7a3";
    context.fillRect(-46, -28, 92, 28);
    context.fillStyle = "#c7b48e";
    context.fillRect(-46, -30, 92, 2.4);
    const stripes = ["#e23d3d", "#f0c330", "#2fc4c4", "#2f7fe0", "#9a55d6", "#3fb563"];
    stripes.forEach((colour, i) => {
      context.fillStyle = colour;
      context.beginPath();
      context.moveTo(-40 + i * 5, 0);
      context.lineTo(-34 + i * 5, 0);
      context.lineTo(-22 + i * 5, -26);
      context.lineTo(-28 + i * 5, -26);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(40 - i * 5, 0);
      context.lineTo(34 - i * 5, 0);
      context.lineTo(22 - i * 5, -26);
      context.lineTo(28 - i * 5, -26);
      context.closePath();
      context.fill();
    });
    // The opening.
    context.fillStyle = "#1b222b";
    context.beginPath();
    context.moveTo(-13, 0);
    context.lineTo(-13, -15);
    context.quadraticCurveTo(0, -24, 13, -15);
    context.lineTo(13, 0);
    context.closePath();
    context.fill();
  },

  // A block of pale concrete to sit on.
  bench(context) {
    shadow(context, 9);
    context.fillStyle = "#cfcbc2";
    context.fillRect(-8, -4.6, 16, 4.6);
    context.fillStyle = "#e3e0d8";
    context.fillRect(-8, -5.6, 16, 1.4);
  },

  // The Christmas tree in the atrium: tall, dark green, hung with gold
  // lights and coloured stars, a star on top.
  "christmas-tree"(context, seconds) {
    shadow(context, 16);
    context.fillStyle = "#5a3d28";
    context.fillRect(-2, -5, 4, 5);
    // Four tiers of branches, each a wide triangle, the lowest the widest.
    const tiers = [
      [-58, -38, 9],
      [-46, -24, 13],
      [-33, -11, 16.5],
      [-20, -3, 20],
    ];
    tiers.forEach(([top, bottom, half], i) => {
      context.fillStyle = i % 2 === 0 ? "#1f5a33" : "#246639";
      context.beginPath();
      context.moveTo(0, top);
      context.lineTo(half, bottom);
      context.lineTo(-half, bottom);
      context.closePath();
      context.fill();
    });
    // Lights: they twinkle, each in its own time.
    const colours = ["#ffd866", "#fff2b0", "#ff7a59", "#ffffff", "#ffc23f"];
    for (let i = 0; i < 46; i++) {
      const height = 5 + ((i * 37) % 50);
      const reach = (58 - height) * 0.33;
      const x = (((i * 53) % 100) / 50 - 1) * reach;
      const bright = 0.55 + 0.45 * Math.sin(seconds * 3 + i * 1.7);
      context.globalAlpha *= bright;
      context.fillStyle = colours[i % colours.length];
      context.beginPath();
      context.arc(x, -height, i % 5 === 0 ? 1.3 : 0.8, 0, TURN);
      context.fill();
      context.globalAlpha /= bright;
    }
    // The star on top.
    context.fillStyle = "#ffd23f";
    context.beginPath();
    for (let point = 0; point < 10; point++) {
      const radius = point % 2 === 0 ? 4.2 : 1.8;
      const angle = (point / 10) * TURN - Math.PI / 2;
      context.lineTo(Math.cos(angle) * radius, -61 + Math.sin(angle) * radius);
    }
    context.closePath();
    context.fill();
  },

  // The turquoise statue beside the library: a figure with a cape, on a tall block, all one colour.
  statue(context) {
    shadow(context, 8);
    context.fillStyle = "#2fa9a2";
    context.fillRect(-4.6, -15, 9.2, 15); //  the block
    context.fillStyle = "#3cc0b8";
    context.fillRect(-4.6, -15, 3.2, 15); //  its lit side
    context.fillStyle = "#35b5ad";
    // Legs, body, head.
    context.fillRect(-2.4, -26, 1.9, 11);
    context.fillRect(0.5, -26, 1.9, 11);
    context.beginPath();
    context.moveTo(-3.2, -26);
    context.lineTo(3.2, -26);
    context.lineTo(3.8, -35);
    context.lineTo(-3.8, -35);
    context.closePath();
    context.fill();
    blob(context, 0, -37.3, 2.3, "#35b5ad");
    // The cape, flying out to one side, and an arm on the hip.
    context.fillStyle = "#2a9891";
    context.beginPath();
    context.moveTo(3.4, -34.5);
    context.quadraticCurveTo(11, -33, 12.5, -24);
    context.lineTo(4, -27);
    context.closePath();
    context.fill();
    context.fillRect(-5.6, -34, 2, 6.5);
  },

  // A tall narrow flag on a white pole, as at the corner of the avenue.
  // The label says which: "white", "blue", "portugal" or "europe".
  "banner-flag"(context, seconds, label) {
    shadow(context, 3);
    context.fillStyle = "#e9ecee";
    context.fillRect(-0.55, -84, 1.1, 84);
    const sway = Math.sin(seconds * 2.4 + label.length) * 1.4;
    if (label === "portugal" || label === "europe") {
      // An ordinary flag, flying from the top of the pole.
      const parts = label === "portugal" ? [["#1f7a3f", 0, 6], ["#d8322a", 6, 15]] : [["#2f55a8", 0, 15]];
      for (const [colour, from, wide] of parts) {
        context.fillStyle = colour;
        context.beginPath();
        context.moveTo(0.5 + from, -83 + from * 0.05 * sway);
        context.lineTo(0.5 + wide, -83 + wide * 0.08 * sway);
        context.lineTo(0.5 + wide, -73 + wide * 0.08 * sway);
        context.lineTo(0.5 + from, -73 + from * 0.05 * sway);
        context.closePath();
        context.fill();
      }
      return;
    }
    // A long banner down the pole, bellying in the wind.
    context.fillStyle = label === "blue" ? "#5f8fb8" : "#f4f5f3";
    context.beginPath();
    context.moveTo(0.5, -83);
    context.quadraticCurveTo(13 + sway, -80, 11 + sway, -64);
    context.quadraticCurveTo(9 + sway * 1.6, -50, 10 + sway * 0.6, -38);
    context.lineTo(0.5, -36);
    context.closePath();
    context.fill();
    context.fillStyle = label === "blue" ? "rgba(255, 255, 255, 0.75)" : "rgba(60, 80, 100, 0.55)";
    for (let mark = 0; mark < 4; mark++) {
      context.fillRect(3.4 + sway * 0.4, -76 + mark * 8, 3.8, 3.2);
    }
  },

  // A round white table with three chairs, as in the atrium and outside the cafe.
  "table-set"(context) {
    shadow(context, 14);
    const chair = (x, colour) => {
      context.fillStyle = "#39434d"; // two thin legs
      context.fillRect(x - 2.3, -4.6, 0.6, 4.6);
      context.fillRect(x + 1.7, -4.6, 0.6, 4.6);
      context.fillStyle = colour;
      context.fillRect(x - 2.7, -5.7, 5.4, 1.2); //  the seat
      context.fillRect(x - 2.7, -10.6, 5.4, 3.8); // the back
    };
    chair(0, "#27406b"); // the chair behind the table
    context.fillStyle = "#aeb3b7"; // the table: one leg, a foot, a round top
    context.fillRect(-0.6, -7.8, 1.2, 7.8);
    context.fillRect(-3, -0.7, 6, 0.7);
    ellipse(context, 0, -7.4, 7.4, 1.9, "#cfd2d3");
    ellipse(context, 0, -8, 7.4, 1.9, "#f6f5f1");
    ellipse(context, 2.4, -8.3, 1.1, 0.5, "#7a4a2c"); // a cup of coffee
    chair(-10.5, "#e9b92c");
    chair(10.5, "#27406b");
  },

  // A long dark box with plants in it, as in the atrium.
  planter(context) {
    shadow(context, 14);
    blob(context, -7, -9.5, 4.6, "#2f7d3a");
    blob(context, 0, -11, 5.2, "#37893f");
    blob(context, 7, -9.5, 4.6, "#2a7135");
    blob(context, -3.5, -12.5, 3.4, "#47994a");
    blob(context, 4, -12.8, 3.2, "#47994a");
    context.fillStyle = "#3d4247";
    context.fillRect(-12, -7, 24, 7);
    context.fillStyle = "#565c62";
    context.fillRect(-12, -7, 24, 1.2);
  },

  // A low round bush with purple tips, like the lavender on the banks of the campus.
  shrub(context) {
    shadow(context, 12);
    blob(context, -6, -4.5, 5.6, "#5d7a55");
    blob(context, 5.5, -4.8, 6, "#688a60");
    blob(context, 0, -7, 6.6, "#6f9166");
    context.fillStyle = "#8f7ab8";
    for (const [x, y] of [[-8, -9], [-4, -12.2], [0, -13.4], [4.5, -12], [8.5, -9.6], [-1.5, -10.5], [2.4, -9.4]]) {
      context.fillRect(x, y, 0.9, 2.4);
    }
  },

  // A young tree of the avenue in autumn: a thin trunk in a square of soil, few leaves, all red.
  "avenue-tree"(context) {
    context.fillStyle = "rgba(70, 55, 40, 0.5)"; // the soil it stands in
    context.beginPath();
    context.ellipse(0, 0, 9, 2.6, 0, 0, TURN);
    context.fill();
    context.strokeStyle = "#5b463a";
    context.lineCap = "round";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(0.4, -24);
    context.stroke();
    context.lineWidth = 0.8;
    for (const [fromY, toX, toY] of [[-20, -8, -32], [-22, 8.5, -33], [-24, -3, -41], [-24, 4.5, -40], [-18, 6, -26], [-17, -6.5, -25]]) {
      context.beginPath();
      context.moveTo(0.3, fromY);
      context.lineTo(toX, toY);
      context.stroke();
    }
    for (const [x, y, radius, colour] of [
      [-7, -31, 4.2, "#8a3b34"], [7.5, -32, 4.4, "#a4483c"], [-2.5, -39, 4.6, "#96413a"], [4.5, -38.5, 4, "#7c332f"],
      [5.5, -26, 3.2, "#a4483c"], [-6, -25, 3, "#8a3b34"], [0.5, -33, 3.6, "#b3564a"],
    ]) {
      blob(context, x, y, radius, colour);
    }
  },

  // A car on the road. It is a flat picture, so there are three of them:
  // seen from behind, from the front, and from the side. The label says
  // which, and the colour: for example "back red" or "left white".
  car(context, seconds, label) {
    const [view, colourName] = label.split(" ");
    const body = CAR_COLOURS[colourName] ?? CAR_COLOURS.grey;
    const glass = "#22313d";
    if (view === "left" || view === "right") {
      shadow(context, 27);
      if (view === "left") {
        context.scale(-1, 1); // drawn with its nose to the right, turned over for the other way
      }
      blob(context, -15, -3.4, 3.5, "#1b1e21");
      blob(context, 15, -3.4, 3.5, "#1b1e21");
      context.fillStyle = body;
      context.beginPath();
      [[-25, -4], [-25, -10.5], [-17, -12], [-10, -18], [8, -18], [15, -12], [24, -10.5], [25, -4]].forEach(([x, y], i) =>
        i === 0 ? context.moveTo(x, y) : context.lineTo(x, y),
      );
      context.closePath();
      context.fill();
      context.fillStyle = glass;
      context.beginPath();
      [[-15.5, -12.2], [-9.4, -16.8], [-1.5, -16.8], [-1.5, -12.2]].forEach(([x, y], i) => (i === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
      context.closePath();
      context.fill();
      context.beginPath();
      [[0, -12.2], [0, -16.8], [7.4, -16.8], [12.8, -12.2]].forEach(([x, y], i) => (i === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
      context.closePath();
      context.fill();
      context.fillStyle = "#f7e9a8";
      context.fillRect(23, -9.6, 2, 2.2);
      context.fillStyle = "#d8382f";
      context.fillRect(-25, -9.8, 1.6, 2.4);
      return;
    }
    shadow(context, 13);
    context.fillStyle = "#1b1e21"; // the two wheels that show
    context.fillRect(-10.5, -4.4, 4, 4.4);
    context.fillRect(6.5, -4.4, 4, 4.4);
    context.fillStyle = body;
    context.fillRect(-11, -11.5, 22, 8.5);
    context.beginPath();
    [[-9.5, -11.5], [-7.5, -18], [7.5, -18], [9.5, -11.5]].forEach(([x, y], i) => (i === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
    context.closePath();
    context.fill();
    context.fillStyle = glass;
    context.beginPath();
    [[-8, -12], [-6.5, -16.8], [6.5, -16.8], [8, -12]].forEach(([x, y], i) => (i === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
    context.closePath();
    context.fill();
    context.fillStyle = view === "front" ? "#f7e9a8" : "#d8382f"; // headlights in front, red lights behind
    context.fillRect(-10.4, -9.8, 3.6, 2.2);
    context.fillRect(6.8, -9.8, 3.6, 2.2);
    context.fillStyle = "#e9ecee"; // the number plate
    context.fillRect(-3.2, -6.6, 6.4, 2);
    context.fillStyle = "rgba(0, 0, 0, 0.25)";
    context.fillRect(-11, -4.2, 22, 1.2);
  },

  // An old olive tree: a thick twisted trunk and a low, round, grey-green crown.
  olive(context) {
    shadow(context, 14);
    context.fillStyle = "#6a5a48";
    context.beginPath();
    context.moveTo(-3.6, 0);
    context.quadraticCurveTo(-1.2, -9, -3, -16);
    context.lineTo(2.6, -16);
    context.quadraticCurveTo(1.4, -8, 3.8, 0);
    context.closePath();
    context.fill();
    blob(context, 0, -24, 13, "#5f7d57");
    blob(context, -8, -20, 8.5, "#56724f");
    blob(context, 8, -21, 9, "#688a60");
    blob(context, -2, -30, 7.5, "#74966b");
  },

  // A round leafy tree: a short trunk and three overlapping balls of leaves.
  tree(context) {
    shadow(context, 13);
    context.fillStyle = "#6b4a2f";
    context.fillRect(-1.8, -20, 3.6, 20);
    blob(context, 0, -30, 15, "#2f7d3a");
    blob(context, -8, -24, 10, "#2a7135");
    blob(context, 8, -25, 10.5, "#37893f");
    blob(context, -3, -36, 9, "#47994a");
  },

  // An umbrella pine, the tree of the coast near Lisbon: a tall bare trunk
  // and a wide, flat crown.
  pine(context) {
    shadow(context, 17);
    context.fillStyle = "#7a5638";
    context.beginPath();
    context.moveTo(-2.2, 0);
    context.lineTo(-1.2, -44);
    context.lineTo(1.4, -44);
    context.lineTo(2.2, 0);
    context.closePath();
    context.fill();
    context.fillRect(-9, -47, 9, 1.6); // two branches, spreading under the crown
    context.fillRect(0, -49, 10, 1.6);
    ellipse(context, 0, -51, 22, 8.5, "#23633a");
    ellipse(context, -9, -54, 13, 6, "#2c7443");
    ellipse(context, 9, -55, 14, 6, "#2f7b46");
    ellipse(context, 0, -57, 12, 4.5, "#3c8c50");
  },

  // A palm: a slender trunk that leans a little, and fronds that hang from the top.
  palm(context) {
    shadow(context, 11);
    context.strokeStyle = "#8a6b46";
    context.lineWidth = 3.4;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(0, 0);
    context.quadraticCurveTo(4, -30, 1, -58);
    context.stroke();
    // Rings on the trunk.
    context.strokeStyle = "rgba(60, 40, 20, 0.35)";
    context.lineWidth = 0.7;
    for (let ring = 8; ring < 56; ring += 6) {
      context.beginPath();
      context.moveTo(-1.4 + ring * 0.05, -ring);
      context.lineTo(2.2 + ring * 0.03, -ring - 0.6);
      context.stroke();
    }
    // The fronds: curved leaves fanning out from the top of the trunk.
    const fronds = [-2.6, -2.05, -1.55, -1.05, -0.5, 0.1, 0.65];
    fronds.forEach((angle, i) => {
      const reach = 21 + (i % 3) * 2.5;
      const endX = 1 + Math.cos(angle) * reach;
      const endY = -58 + Math.sin(angle) * reach * 0.55 + 9;
      context.strokeStyle = i % 2 === 0 ? "#2f8a45" : "#3f9c50";
      context.lineWidth = 3.2;
      context.beginPath();
      context.moveTo(1, -58);
      context.quadraticCurveTo(1 + Math.cos(angle) * reach * 0.6, -58 + Math.sin(angle) * reach * 0.6 - 4, endX, endY);
      context.stroke();
    });
    blob(context, 1, -58, 2.6, "#6b5334");
  },

  // A street lamp: a thin dark post with an arm and a light.
  lamp(context) {
    shadow(context, 4);
    context.fillStyle = "#39434d";
    context.fillRect(-0.8, -42, 1.6, 42);
    context.fillRect(-0.8, -42.8, 8, 1.4);
    context.fillStyle = "#f4f1dc";
    context.fillRect(4.2, -41.6, 4, 1.6);
  },

  // A traffic cone.
  cone(context) {
    shadow(context, 3.4);
    context.fillStyle = "#ef7a2b";
    context.beginPath();
    context.moveTo(-2.6, 0);
    context.lineTo(-0.5, -6.6);
    context.lineTo(0.5, -6.6);
    context.lineTo(2.6, 0);
    context.closePath();
    context.fill();
    context.fillStyle = "#f4f6f8";
    context.fillRect(-1.5, -3.6, 3, 1.3);
    context.fillStyle = "#2b3138";
    context.fillRect(-3.2, -0.7, 6.4, 0.9);
  },

  // A tall, narrow flag on a pole, the kind that lines the road at an event.
  flag(context, seconds) {
    shadow(context, 3.5);
    context.fillStyle = "#d8dde2";
    context.fillRect(-0.5, -44, 1, 44);
    const sway = Math.sin(seconds * 2.2) * 0.8;
    context.fillStyle = "#e23d3d";
    context.beginPath();
    context.moveTo(0.5, -43);
    context.quadraticCurveTo(9 + sway, -40, 8 + sway, -30);
    context.lineTo(7 + sway * 0.6, -12);
    context.lineTo(0.5, -9);
    context.closePath();
    context.fill();
    context.fillStyle = "#f4f6f8";
    context.fillRect(1.6, -33, 5 + sway * 0.4, 3);
  },

  // A banana peel lying on the road: the stalk in the middle and three
  // flaps of skin. It wobbles a little, so that it catches the eye.
  banana(context, seconds) {
    shadow(context, 5.4);
    const wobble = Math.sin(seconds * 5) * 0.06;
    context.rotate(wobble);
    context.lineCap = "round";
    const flap = (endX, endY, bendX, bendY, colour) => {
      context.strokeStyle = colour;
      context.lineWidth = 2.6;
      context.beginPath();
      context.moveTo(0, -3.6);
      context.quadraticCurveTo(bendX, bendY, endX, endY);
      context.stroke();
    };
    flap(-5.4, -0.4, -4.4, -4.6, "#d9a514");
    flap(5.4, -0.4, 4.4, -4.6, "#f2c21c");
    flap(0.6, 0.2, 2.2, -2.2, "#ffd93b");
    context.fillStyle = "#7a5a14";
    context.fillRect(-0.7, -6.2, 1.4, 2.4); // the stalk
  },
};

/** A soft dark patch on the ground under the thing, "half" units wide on each side. */
function shadow(context, half) {
  context.fillStyle = "rgba(8, 14, 22, 0.26)";
  context.beginPath();
  context.ellipse(half * 0.15, 0, half, half * 0.28, 0, 0, TURN);
  context.fill();
}

function blob(context, x, y, radius, colour) {
  context.fillStyle = colour;
  context.beginPath();
  context.arc(x, y, radius, 0, TURN);
  context.fill();
}

function ellipse(context, x, y, halfWidth, halfHeight, colour) {
  context.fillStyle = colour;
  context.beginPath();
  context.ellipse(x, y, halfWidth, halfHeight, 0, 0, TURN);
  context.fill();
}

/**
 * Paints one thing from straight above, for the two map views: the round
 * top of a tree, the star of a palm, the dot of a cone or a banana.
 * The canvas is already set up so that one unit of drawing is one unit of track.
 */
export function paintPropFromAbove(context, kind, x, y, size = 1) {
  const crown = {
    tree: [14, "#2f7d3a"],
    pine: [19, "#23633a"],
    palm: [15, "#2f8a45"],
    olive: [12, "#5f7d57"],
    "christmas-tree": [14, "#1f5a33"],
    "avenue-tree": [8, "#96413a"],
    shrub: [9, "#688a60"],
    planter: [9, "#37893f"],
    "table-set": [8, "#f6f5f1"],
  }[kind];
  if (crown !== undefined) {
    context.fillStyle = "rgba(8, 14, 22, 0.2)";
    context.beginPath();
    context.arc(x + 3, y + 4, crown[0] * size, 0, TURN);
    context.fill();
    blob(context, x, y, crown[0] * size, crown[1]);
    blob(context, x - crown[0] * size * 0.25, y - crown[0] * size * 0.25, crown[0] * size * 0.55, "rgba(255, 255, 255, 0.1)");
    return;
  }
  if (kind === "banana") {
    blob(context, x, y, 5, "#f2c21c");
    blob(context, x, y, 2, "#7a5a14");
  } else if (kind === "cone") {
    blob(context, x, y, 2.8, "#ef7a2b");
  } else if (kind === "lamp" || kind === "flag") {
    blob(context, x, y, 1.6, "#39434d");
  }
}
