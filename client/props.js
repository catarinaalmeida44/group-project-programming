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
};

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
  const crown = { tree: [14, "#2f7d3a"], pine: [19, "#23633a"], palm: [15, "#2f8a45"] }[kind];
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
