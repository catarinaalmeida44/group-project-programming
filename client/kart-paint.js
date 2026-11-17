// Painting a kart from its shape in kart-shape.js.
//
// The shape is a list of flat faces with corners in space. To paint it we
// need to know where each corner lands on the screen, and that depends on
// where we look from. That knowledge is called a "viewer" here. There are
// two: from behind and above, with distant things smaller (the race view),
// and from straight above (the two map views). The same kart, with the same
// colours, is painted in all of them.
//
// HOW A SOLID THING IS PAINTED WITH FLAT SHAPES
//   1. Leave out every face that points away from the eye. On a closed
//      shape such as a box, those are exactly the ones that cannot be seen.
//   2. Paint the parts that are furthest from the eye first, so nearer
//      parts cover them. (The floor of the kart is painted before
//      everything, because everything stands on it.)
//   3. Give each face a brightness by how squarely it faces the sun. That
//      is what makes a box look like a box and not like a flat patch.

import { kartParts, normalOf, shade } from "./kart-shape.js";
import { chaseNumbers, eyeOf } from "./camera.js";

// The sun shines from this direction on the map: from the left and above,
// a little from the top of the map. (x to the right, y down the map, z up.)
const SUN = unit3([-0.5, -0.38, 0.78]);
const DARKEST = 0.62; //  the brightness of a face the sun does not reach
const BRIGHTEST = 1.14; // the brightness of a face that looks straight at the sun
const SHADOW = "rgba(8, 14, 22, 0.32)";

// How finely the steering is divided when a kart's shape is kept for reuse.
const STEER_STEPS = 8;

// Shapes and colours that were worked out before, kept so that they are not
// worked out again 60 times a second.
const keptParts = new Map();
const keptShades = new Map();

/** The parts of a kart with this look, steering this much. Reused when asked again. */
function partsFor(look, steer) {
  const step = Math.round(Math.min(Math.max(steer, -1), 1) * STEER_STEPS);
  const key = `${look.body}${look.trim}${look.suit}${look.helmet}${look.stripe}${step}`;
  let parts = keptParts.get(key);
  if (parts === undefined) {
    if (keptParts.size > 400) {
      keptParts.clear(); // many custom looks came by: start again rather than grow for ever
    }
    parts = kartParts(look, step / STEER_STEPS).map((part) => ({
      ...part,
      middle: middleOfPart(part),
      faces: part.faces?.map(withNormal),
      decals: part.decals?.map(withNormal),
    }));
    keptParts.set(key, parts);
  }
  return parts;
}

function withNormal(face) {
  const middle = [0, 0, 0];
  for (const point of face.points) {
    middle[0] += point[0] / face.points.length;
    middle[1] += point[1] / face.points.length;
    middle[2] += point[2] / face.points.length;
  }
  return { ...face, normal: normalOf(face), middle };
}

function middleOfPart(part) {
  if (part.ball) {
    return part.ball.middle;
  }
  const points = part.faces.flatMap((face) => face.points);
  const middle = [0, 0, 0];
  for (const point of points) {
    middle[0] += point[0] / points.length;
    middle[1] += point[1] / points.length;
    middle[2] += point[2] / points.length;
  }
  return middle;
}

/** A colour at a brightness, as text for the canvas. Kept, because the same ones come back all the time. */
function lit(colour, brightness) {
  const step = Math.round(brightness * 40);
  const key = colour + step;
  let result = keptShades.get(key);
  if (result === undefined) {
    if (keptShades.size > 4000) {
      keptShades.clear();
    }
    result = shade(colour, step / 40);
    keptShades.set(key, result);
  }
  return result;
}

// ---------------------------------------------------------------------------
// The two viewers
// ---------------------------------------------------------------------------

/**
 * Looking at a kart in the race view, from the camera behind and above.
 *   seen      where the kart is, seen from the camera's spot on the ground:
 *             { ahead, sideways } in units (seenFromKart in camera.js)
 *   turn      how far the kart is turned compared with the camera, in
 *             radians: 0 points the way the camera looks, so we see its back
 *   kartAngle the direction the kart points on the map, for the sunlight
 *   settings  the camera (RACE or CHASE in camera.js)
 *   screen    the size of the picture
 * Gives null when the kart is too close to the eye or behind it to be drawn.
 */
export function viewerBehind(seen, turn, kartAngle, settings, screen) {
  const { horizonY, growthPerRow, depth } = chaseNumbers(settings);
  const eye = eyeOf(settings);
  const nearest = 14; // units in front of the eye. Nearer than this, a kart would fill the screen
  if (seen.ahead + eye.behind < nearest) {
    return null;
  }
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const oneOverKartScale = 1 / settings.kartScale;
  const middleX = screen.width / 2;

  // The eye, measured from the middle of the kart in the kart's own
  // directions (forwards, to its right, up).
  const eyeAhead = -eye.behind - seen.ahead;
  const eyeSideways = -seen.sideways;
  return {
    eye: [eyeAhead * cos + eyeSideways * sin, -eyeAhead * sin + eyeSideways * cos, eye.height],
    light: lightFor(kartAngle),
    line: 1,
    place(x, y, z) {
      // Turn the point from the kart's directions into the camera's, then
      // do the same sum as chasePoint() in camera.js.
      const ahead = seen.ahead + x * cos - y * sin;
      const sideways = seen.sideways + x * sin + y * cos;
      const oneOverScale = oneOverKartScale + ahead / depth;
      if (!(oneOverScale > 0)) {
        return null;
      }
      const scale = 1 / oneOverScale;
      return { x: middleX + sideways * scale, y: horizonY + scale / growthPerRow - z * scale, scale };
    },
  };
}

/**
 * Looking at a kart from straight above, as in the two map views. The
 * canvas is already set up so that one unit of track is one unit of
 * drawing, so a point simply goes where it is on the map.
 *   kart   { x, y, angle }
 *   line   how thick the thin seam line round each face is, in units
 */
export function viewerAbove(kart, line = 0.5) {
  const cos = Math.cos(kart.angle);
  const sin = Math.sin(kart.angle);
  return {
    eye: [0, 0, 100000], // straight above, very far away
    light: lightFor(kart.angle),
    line,
    place(x, y) {
      return { x: kart.x + x * cos - y * sin, y: kart.y + x * sin + y * cos, scale: 1 };
    },
  };
}

/** The direction of the sun, in the kart's own directions, for a kart pointing this way on the map. */
function lightFor(kartAngle) {
  const cos = Math.cos(kartAngle);
  const sin = Math.sin(kartAngle);
  return [SUN[0] * cos + SUN[1] * sin, -SUN[0] * sin + SUN[1] * cos, SUN[2]];
}

// ---------------------------------------------------------------------------
// Painting
// ---------------------------------------------------------------------------

/**
 * Paints one kart with its driver.
 *   viewer  from viewerBehind() or viewerAbove()
 *   look    the colours (kart-shape.js)
 *   steer   from -1 (left) to 1 (right)
 */
export function paintKart(context, viewer, look, steer = 0) {
  if (viewer === null) {
    return;
  }
  const parts = partsFor(look, steer);
  paintShadow(context, viewer);

  // Furthest part first. The low parts (the floor) come before all others.
  const order = parts
    .map((part) => ({ part, far: distance(viewer.eye, part.middle) }))
    .sort((a, b) => (a.part.low === b.part.low ? b.far - a.far : a.part.low ? -1 : 1));

  context.lineJoin = "round";
  context.lineWidth = viewer.line;
  for (const { part } of order) {
    if (part.ball) {
      paintHelmet(context, viewer, part.ball);
      continue;
    }
    // Faces of one solid piece do not cover each other once the ones facing
    // away are left out, but a wedge is not always perfectly regular, so
    // the furthest is still painted first.
    const seen = part.faces
      .filter((face) => facesEye(face, viewer.eye))
      .sort((a, b) => distance(viewer.eye, b.middle) - distance(viewer.eye, a.middle));
    for (const face of seen) {
      paintFace(context, viewer, face);
    }
    for (const decal of part.decals ?? []) {
      if (facesEye(decal, viewer.eye)) {
        paintFace(context, viewer, decal);
      }
    }
  }
}

/** Can this face be seen from the eye? Only if it points towards it. */
function facesEye(face, eye) {
  const { normal, middle } = face;
  return (
    normal[0] * (eye[0] - middle[0]) + normal[1] * (eye[1] - middle[1]) + normal[2] * (eye[2] - middle[2]) > 0
  );
}

function paintFace(context, viewer, face) {
  context.beginPath();
  for (let i = 0; i < face.points.length; i++) {
    const [x, y, z] = face.points[i];
    const spot = viewer.place(x, y, z);
    if (spot === null) {
      return; // part of it is behind the camera: leave the face out
    }
    if (i === 0) {
      context.moveTo(spot.x, spot.y);
    } else {
      context.lineTo(spot.x, spot.y);
    }
  }
  context.closePath();
  const towardsSun = Math.max(
    0,
    face.normal[0] * viewer.light[0] + face.normal[1] * viewer.light[1] + face.normal[2] * viewer.light[2],
  );
  const colour = lit(face.colour, DARKEST + (BRIGHTEST - DARKEST) * towardsSun);
  context.fillStyle = colour;
  context.fill();
  // A thin line in the same colour closes the hairline gaps between faces.
  context.strokeStyle = colour;
  context.stroke();
}

/** The shadow on the ground under the kart: a rounded patch a little larger than the kart, pushed away from the sun. */
function paintShadow(context, viewer) {
  const pushX = -viewer.light[0] * 2.2;
  const pushY = -viewer.light[1] * 2.2;
  context.beginPath();
  const corners = 14;
  for (let i = 0; i < corners; i++) {
    const angle = (i / corners) * Math.PI * 2;
    const spot = viewer.place(pushX + Math.cos(angle) * 12.5, pushY + Math.sin(angle) * 9.2, 0);
    if (spot === null) {
      return;
    }
    if (i === 0) {
      context.moveTo(spot.x, spot.y);
    } else {
      context.lineTo(spot.x, spot.y);
    }
  }
  context.closePath();
  context.fillStyle = SHADOW;
  context.fill();
}

/**
 * The helmet: a ball, painted as a circle that is lighter where the sun
 * hits it, with a dark visor at the front and a stripe over the top.
 * The visor and the stripe are patches on the ball. Only the part of a
 * patch that is on our side of the ball is painted.
 */
function paintHelmet(context, viewer, ball) {
  const [mx, my, mz] = ball.middle;
  const middle = viewer.place(mx, my, mz);
  if (middle === null) {
    return;
  }
  const radius = ball.radius * middle.scale;
  const shine = context.createRadialGradient(
    middle.x - radius * 0.35, middle.y - radius * 0.45, radius * 0.1,
    middle.x, middle.y, radius,
  );
  shine.addColorStop(0, lit(ball.colour, 1.3));
  shine.addColorStop(0.55, lit(ball.colour, 1));
  shine.addColorStop(1, lit(ball.colour, 0.68));
  context.beginPath();
  context.arc(middle.x, middle.y, radius, 0, Math.PI * 2);
  context.fillStyle = shine;
  context.fill();

  // A point on the ball: "round" turns from the front towards the driver's
  // right, "up" tilts from level towards the top. Both in radians.
  const onBall = (round, up, sideways = 0) => {
    const reach = Math.sqrt(Math.max(0, 1 - (sideways / ball.radius) ** 2));
    return [
      mx + ball.radius * Math.cos(up) * Math.cos(round) * reach,
      my + ball.radius * Math.cos(up) * Math.sin(round) * reach + sideways,
      mz + ball.radius * Math.sin(up) * reach,
    ];
  };
  const patch = (points, colour) => {
    // Keep the points on our side of the ball. If too few are left, the
    // patch is on the far side.
    const seen = points.filter(
      ([x, y, z]) => (x - mx) * (viewer.eye[0] - x) + (y - my) * (viewer.eye[1] - y) + (z - mz) * (viewer.eye[2] - z) > 0,
    );
    if (seen.length < 3) {
      return;
    }
    context.beginPath();
    seen.forEach(([x, y, z], i) => {
      const spot = viewer.place(x, y, z);
      if (spot !== null) {
        if (i === 0) {
          context.moveTo(spot.x, spot.y);
        } else {
          context.lineTo(spot.x, spot.y);
        }
      }
    });
    context.closePath();
    context.fillStyle = colour;
    context.fill();
  };

  // The stripe: a band from above the visor, over the top, down the back.
  const stripeLeft = [];
  const stripeRight = [];
  for (let up = 0.55; up <= Math.PI - 0.35; up += 0.2) {
    stripeLeft.push(onBall(0, up, -0.75));
    stripeRight.push(onBall(0, up, 0.75));
  }
  patch([...stripeLeft, ...stripeRight.reverse()], ball.stripe);

  // The visor: a wide band across the front.
  const visorTop = [];
  const visorBottom = [];
  for (let round = -1.25; round <= 1.251; round += 0.25) {
    visorTop.push(onBall(round, 0.42));
    visorBottom.push(onBall(round, -0.2));
  }
  patch([...visorTop, ...visorBottom.reverse()], ball.visor);
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function unit3(v) {
  const length = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / length, v[1] / length, v[2] / length];
}
