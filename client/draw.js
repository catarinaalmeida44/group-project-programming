// Drawing: turns the track and the karts into a picture on the page.
//
// The picture is drawn on a "canvas", a rectangle of the page that code can
// paint on. Nothing here decides how a kart moves. This file only shows
// what the rules in the "shared" folder have worked out, in one of the three
// views described in camera.js.
//
// This file puts the picture together. The parts are painted by:
//   ground.js      the track from above, and the same track laid flat for the race view
//   sky.js         the sky and the horizon
//   buildings.js   where the sides and roofs of buildings land on the screen
//   props.js       trees, palms, arrow boards, banana peels
//   kart-paint.js  the karts and their drivers, from kart-shape.js
//   track-looks.js the colours and markings of each track
//
// THE RACE VIEW, IN ORDER
//   1. the sky
//   2. the ground, up to the horizon
//   3. everything that stands on the ground, the furthest first, so that
//      nearer things cover further ones: buildings, trees, other karts
//   4. smoke and dust
//   5. the player's own kart, last, so that nothing ever hides it

import { SCREEN, FOLLOW, CHASE, RACE, blendChase, chaseRow, chasePoint, eyeOf, seenFromKart, easeAngle } from "./camera.js";
import { createBuildings, buildingsInView } from "./buildings.js";
import { createGround } from "./ground.js";
import { paintSky } from "./sky.js";
import { paintProp, paintPropFromAbove, PROP_HEIGHT } from "./props.js";
import { paintKart, viewerBehind, viewerAbove } from "./kart-paint.js";
import { lookOf, shade } from "./kart-shape.js";
import { lookOfTrack, propsOfTrack } from "./track-looks.js";
import { tileKindAt } from "../shared/track.js";

const DARK = "#14181d";

// ---------------------------------------------------------------------------
// NUMBERS TO TUNE BY EYE
// ---------------------------------------------------------------------------

/** How quickly the race camera swings round behind a kart that has turned. Lower shows more of the kart turning. */
const CAMERA_SWING = 6.5;
/** How quickly the picture of the steering follows the keys. */
const STEER_QUICKNESS = 14;
/** The start gantry: how high its beam hangs over the road, and how tall the beam is, in units. */
const GANTRY = { clear: 40, tall: 13, post: 3 };
/** Further ahead than this, a building is painted as plain walls, without windows. */
const WINDOWS_TO = 900;
/** At most this many puffs of smoke and dust at once. */
const MOST_PUFFS = 260;

const MINIMAP_LARGEST = 180; // pixels: the small map fits in a square of this size
const MINIMAP_MARGIN = 10;

// The starting grid: two columns, each row a little further back. These are
// the same gaps the server uses (server/room.js).
const GRID_SIDEWAYS = 18;
const GRID_BEHIND = 28;
const GRID_PLACES = 8;

// ---------------------------------------------------------------------------

/**
 * Gets a canvas ready to show a track.
 *   storeys  how many storeys tall each square of the track is, if the
 *            track has that (shared/tracks/index.js). Its buildings then
 *            stand up in the race view.
 *
 * Gives back draw(view, kart, camera, steer, others, scene), to be called
 * for every picture:
 *   view    "chase" (the race view), "follow" or "map"
 *   kart    the player's own kart, which the camera stays with
 *   camera  the spot on the track in the middle of the screen (follow view only)
 *   steer   -1 while steering left, 1 while steering right, 0 otherwise
 *   others  the karts of the other players, if any
 *   scene   more to show, all of it optional:
 *             bananas  [{ x, y }]: banana peels lying on the track
 *             intro    0 to 1: at 0 the camera is high above the grid, at 1
 *                      it is down behind the kart. Counted up during 3, 2, 1
 *             lights   the start lights: { red: how many are on, green: true or false }
 *             names    a Map from a kart's number to the name shown above it
 *
 * A kart may carry "spinTurn": extra turning, in radians, for the picture
 * only. A kart that slipped on a banana is drawn spinning with it.
 */
export function createPainter(canvas, track, { storeys = null } = {}) {
  canvas.width = SCREEN.width;
  canvas.height = SCREEN.height;
  const context = canvas.getContext("2d");
  const look = lookOfTrack(track);
  const grid = gridOf(track);
  const buildings = createBuildings(track, storeys, { barrierHeight: look.barrierHeight });
  const ground = createGround(track, look, grid, buildings);
  const props = propsOfTrack(track, look, storeys);
  const gantry = gantryOf(track);
  const mini = paintMiniPicture(ground.picture, track);

  // What the painter remembers from one picture to the next.
  let lastTime = null; //   when the last picture was drawn
  let swing = null; //      { x, y, angle }: where the race camera was and which way it looked
  let steerShown = 0; //    the steering as it is drawn, which follows the keys smoothly
  const puffs = []; //      smoke and dust in the air

  return function draw(view, kart, camera, steer, others = [], scene = {}) {
    const now = performance.now();
    const frameSeconds = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    const seconds = now / 1000;
    const wanted = Math.min(Math.max(Number(steer) || 0, -1), 1);
    steerShown += (wanted - steerShown) * (1 - Math.exp(-STEER_QUICKNESS * frameSeconds));
    const bananas = Array.isArray(scene.bananas) ? scene.bananas : [];

    movePuffs(puffs, frameSeconds);
    for (const each of [kart, ...others]) {
      addPuffsFor(puffs, track, each, frameSeconds);
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.fillStyle = look.beyond;
    context.fillRect(0, 0, SCREEN.width, SCREEN.height);

    if (view === "chase") {
      drawRaceView(kart, others, bananas, scene, frameSeconds, seconds);
    } else {
      swing = null; // when the race view comes back, it starts straight behind the kart
      drawFromAbove(view, kart, camera, others, bananas);
    }

    // The views that show only part of the track get a small map in the corner.
    if (view !== "map") {
      drawMinimap(kart, others, bananas);
    }
  };

  // ---- The race view ----

  function drawRaceView(kart, others, bananas, scene, frameSeconds, seconds) {
    // The camera comes down from high above the grid while 3, 2, 1 is counted.
    const intro = typeof scene.intro === "number" ? Math.min(Math.max(scene.intro, 0), 1) : 1;
    const eased = intro * intro * (3 - 2 * intro); // slow at both ends, quick in the middle
    const settings = intro >= 1 ? RACE : blendChase(CHASE, RACE, eased);

    // The camera swings round behind the kart a moment after the kart has
    // turned. If the kart was put somewhere else (back on the grid), or
    // this is the first picture, the camera jumps straight behind it.
    const jumped = swing === null || Math.hypot(kart.x - swing.x, kart.y - swing.y) > 150;
    const angle = jumped || intro < 1 ? kart.angle : easeAngle(swing.angle, kart.angle, frameSeconds, CAMERA_SWING);
    swing = { x: kart.x, y: kart.y, angle };
    const spot = swing;

    paintSky(context, spot.angle, settings, SCREEN, look, seconds);
    ground.paintTilted(context, spot, settings, SCREEN);

    // Everything that stands on the ground, with the square it stands on.
    const size = track.tileSize;
    const near = chaseRow(SCREEN.height, settings).ahead;
    const things = [];

    for (const shape of buildingsInView(buildings, spot, settings, SCREEN)) {
      // A wall between the camera and the kart would fill the screen. It is
      // left out, as if the camera could see through it.
      const beside = shape.points.every(([x]) => x < SCREEN.width / 2 - 170) || shape.points.every(([x]) => x > SCREEN.width / 2 + 170);
      if (shape.kind === "side" && shape.ahead < 6 && !beside) {
        continue;
      }
      things.push(shape);
    }

    const standing = (kind, x, y, scale, more = {}) => {
      const seen = seenFromKart(spot, x, y);
      if (seen.ahead < near + 6 || seen.ahead > settings.viewAhead) {
        return;
      }
      const place = chasePoint(seen.ahead, seen.sideways, settings);
      if (place === null) {
        return;
      }
      const reach = 34 * place.scale * scale; // about half as wide as the widest thing
      const tall = (PROP_HEIGHT[kind] ?? 20) * place.scale * scale;
      if (place.x < -reach || place.x > SCREEN.width + reach || place.y - tall > SCREEN.height) {
        return;
      }
      things.push({
        kind,
        scale,
        x: place.x,
        y: place.y,
        unit: place.scale,
        ahead: seen.ahead,
        column: Math.floor(x / size),
        row: Math.floor(y / size),
        ...more,
      });
    };
    for (const prop of props) {
      standing(prop.kind, prop.x, prop.y, prop.size, { label: prop.label });
    }
    for (const banana of bananas) {
      standing("banana", banana.x, banana.y, 1);
    }
    for (const other of others) {
      const seen = seenFromKart(spot, other.x, other.y);
      if (seen.ahead > settings.viewAhead) {
        continue;
      }
      const viewer = viewerBehind(seen, other.angle + (other.spinTurn ?? 0) - spot.angle, other.angle, settings, SCREEN);
      if (viewer !== null) {
        things.push({
          kind: "kart",
          kart: other,
          viewer,
          ahead: seen.ahead,
          column: Math.floor(other.x / size),
          row: Math.floor(other.y / size),
        });
      }
    }
    if (gantry !== null) {
      things.push({
        kind: "gantry",
        ahead: seenFromKart(spot, gantry.middle.x, gantry.middle.y).ahead,
        column: Math.floor(gantry.middle.x / size),
        row: Math.floor(gantry.middle.y / size),
      });
    }

    // Furthest first. The squares of the map make this easy to get right:
    // seen from the camera's own square, a thing in a row of squares
    // further away can never be in front of a thing in a nearer row, and
    // within a row the same goes for columns. So: the furthest row first,
    // and within a row the furthest column first.
    const eye = eyeOf(settings);
    const eyeColumn = Math.floor((spot.x - Math.cos(spot.angle) * eye.behind) / size);
    const eyeRow = Math.floor((spot.y - Math.sin(spot.angle) * eye.behind) / size);
    const layer = (thing) => (thing.kind === "side" ? 0 : thing.kind === "roof" ? 1 : 2);
    things.sort(
      (a, b) =>
        Math.abs(b.row - eyeRow) - Math.abs(a.row - eyeRow) ||
        Math.abs(b.column - eyeColumn) - Math.abs(a.column - eyeColumn) ||
        layer(a) - layer(b) ||
        b.ahead - a.ahead,
    );

    for (const thing of things) {
      if (thing.kind === "side" || thing.kind === "roof") {
        paintBuildingPiece(thing);
      } else if (thing.kind === "kart") {
        paintKart(context, thing.viewer, lookOf(thing.kart), 0);
        paintNameAbove(thing, scene.names);
      } else if (thing.kind === "gantry") {
        paintGantry(spot, settings, near, scene.lights);
      } else {
        paintProp(context, thing.kind, thing.x, thing.y, thing.unit, thing.scale, seconds, thing.label);
      }
    }

    paintPuffs(puffs, spot, settings, near);

    // Our own kart last: always in the same spot and never hidden.
    const own = viewerBehind({ ahead: 0, sideways: 0 }, kart.angle + (kart.spinTurn ?? 0) - spot.angle, kart.angle, settings, SCREEN);
    paintKart(context, own, lookOf(kart), steerShown);
  }

  /** One side or roof of a building or barrier, as placed on the screen by buildings.js. */
  function paintBuildingPiece(piece) {
    const { points, kind, facing, style, ahead } = piece;
    const mist = Math.min(4, Math.max(0, Math.floor((ahead - 350) / 320))); // further away is paler
    const outline = () => {
      context.beginPath();
      points.forEach(([x, y], i) => (i === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
      context.closePath();
    };
    const fill = (colour) => {
      const shown = hazed(colour, look.haze, mist);
      context.fillStyle = shown;
      context.fill();
      context.strokeStyle = shown; // a thin line in the same colour closes the gaps between squares
      context.lineWidth = 1;
      context.stroke();
    };

    if (style === "barrier") {
      if (kind === "roof") {
        outline();
        fill(look.barrier.top);
        return;
      }
      // The side of a low bank, in two blocks of two colours for every
      // square of the map, like the painted blocks that line a circuit.
      const [footA, footB, topB, topA] = points;
      const halfway = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const footMiddle = halfway(footA, footB);
      const topMiddle = halfway(topA, topB);
      [
        [footA, footMiddle, topMiddle, topA],
        [footMiddle, footB, topB, topMiddle],
      ].forEach((corners, half) => {
        context.beginPath();
        corners.forEach(([x, y], i) => (i === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
        context.closePath();
        fill(look.barrier.colours[half]);
      });
      return;
    }

    outline();
    if (kind === "roof") {
      fill(look.buildings.roof);
      return;
    }
    fill(look.buildings.wall[facing]);

    // Windows: a long band of glass on every storey, as on the campus
    // buildings. Each band is cut from the side at the right heights.
    const onScreen = Math.abs(points[0][1] - points[3][1]);
    if (ahead > WINDOWS_TO || onScreen < 12 || !(buildings.unitsPerStorey > 0)) {
      return;
    }
    const storey = buildings.unitsPerStorey;
    const [footA, footB, topB, topA] = points;
    const atHeight = (foot, top, height) => {
      const share = (height - piece.bottom) / (piece.top - piece.bottom);
      return [foot[0] + (top[0] - foot[0]) * share, foot[1] + (top[1] - foot[1]) * share];
    };
    context.beginPath();
    for (let floor = Math.round(piece.bottom / storey); floor < Math.round(piece.top / storey); floor++) {
      const from = (floor + (floor === 0 ? 0.1 : 0.3)) * storey;
      const to = (floor + 0.78) * storey;
      const a0 = atHeight(footA, topA, from);
      const b0 = atHeight(footB, topB, from);
      const b1 = atHeight(footB, topB, to);
      const a1 = atHeight(footA, topA, to);
      context.moveTo(a0[0], a0[1]);
      context.lineTo(b0[0], b0[1]);
      context.lineTo(b1[0], b1[1]);
      context.lineTo(a1[0], a1[1]);
      context.closePath();
    }
    context.fillStyle = hazed(facing === "south" || facing === "east" ? shade(look.buildings.glass, 1.25) : look.buildings.glass, look.haze, mist);
    context.fill();
    // A frame down the middle of each square of wall, so the glass is not one blank strip.
    if (onScreen > 40) {
      const middleFoot = [(footA[0] + footB[0]) / 2, (footA[1] + footB[1]) / 2];
      const middleTop = [(topA[0] + topB[0]) / 2, (topA[1] + topB[1]) / 2];
      context.strokeStyle = hazed(look.buildings.wall[facing], look.haze, mist);
      context.lineWidth = Math.max(1, onScreen / 90);
      context.beginPath();
      context.moveTo(middleFoot[0], middleFoot[1]);
      context.lineTo(middleTop[0], middleTop[1]);
      context.stroke();
    }
  }

  /** The name of a player above their kart, if we know it and the kart is near enough to read it. */
  function paintNameAbove(thing, names) {
    const name = names instanceof Map ? names.get(thing.kart.id) : undefined;
    const top = thing.viewer.place(0, 0, 21);
    if (typeof name !== "string" || top === null || top.scale < 1.1) {
      return;
    }
    const height = Math.min(15, Math.max(10, top.scale * 3));
    context.font = `bold ${height}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const width = context.measureText(name).width + 10;
    context.fillStyle = "rgba(14, 22, 32, 0.72)";
    context.fillRect(top.x - width / 2, top.y - height * 0.8, width, height * 1.5);
    context.fillStyle = "#f4f6f8";
    context.fillText(name, top.x, top.y);
  }

  /**
   * The start gantry: two posts with a beam across the road above the
   * start line, chequered, with the start lights on it.
   */
  function paintGantry(spot, settings, near, lights) {
    const ends = [gantry.left, gantry.right].map((post) => {
      const seen = seenFromKart(spot, post.x, post.y);
      return seen.ahead < near + 2 ? null : chasePoint(seen.ahead, seen.sideways, settings);
    });
    // The posts, each as far as it can be seen.
    for (const end of ends) {
      if (end !== null) {
        context.fillStyle = "#39434d";
        const half = (GANTRY.post / 2) * end.scale;
        context.fillRect(end.x - half, end.y - (GANTRY.clear + GANTRY.tall) * end.scale, half * 2, (GANTRY.clear + GANTRY.tall) * end.scale);
      }
    }
    if (ends[0] === null || ends[1] === null) {
      return; // one end is behind us: we are driving under the beam
    }
    const [a, b] = ends;
    // A spot on the beam: "along" from 0 (left post) to 1 (right post), "up" in units above the road.
    const at = (along, up) => [
      a.x + (b.x - a.x) * along,
      a.y - up * a.scale + (b.y - up * b.scale - (a.y - up * a.scale)) * along,
    ];
    const patch = (from, to, low, high, colour) => {
      const corners = [at(from, low), at(to, low), at(to, high), at(from, high)];
      context.beginPath();
      corners.forEach(([x, y], i) => (i === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
      context.closePath();
      context.fillStyle = colour;
      context.fill();
    };
    const low = GANTRY.clear;
    const high = GANTRY.clear + GANTRY.tall;
    patch(0, 1, low, high, DARK);
    // Two rows of chequers along the top and bottom edges of the beam.
    const squares = 40;
    for (let i = 0; i < squares; i++) {
      const white = "#f4f6f8";
      if (i % 2 === 0) {
        patch(i / squares, (i + 1) / squares, low, low + 2.2, white);
        patch(i / squares, (i + 1) / squares, high - 2.2, high, white);
      }
    }
    // The start lights, in the middle of the beam: red while the countdown
    // runs, one more for each number, then all green at GO.
    const red = lights?.red ?? 0;
    const green = lights?.green === true;
    const lamps = 3;
    const middle = at(0.5, low + GANTRY.tall / 2);
    const scale = (a.scale + b.scale) / 2;
    for (let lamp = 0; lamp < lamps; lamp++) {
      const x = middle[0] + (lamp - (lamps - 1) / 2) * 9 * scale;
      context.beginPath();
      context.arc(x, middle[1], 2.7 * scale, 0, Math.PI * 2);
      context.fillStyle = green ? "#39d353" : lamp < red ? "#ff3b30" : "#3a2326";
      context.fill();
    }
  }

  // ---- The two views from above ----

  function drawFromAbove(view, kart, camera, others, bananas) {
    context.save();
    if (view === "follow") {
      // Put the camera's spot in the middle of the screen and zoom in around it.
      context.translate(SCREEN.width / 2, SCREEN.height / 2);
      context.scale(FOLLOW.zoom, FOLLOW.zoom);
      context.translate(-camera.x, -camera.y);
    } else {
      // Shrink or grow the track so all of it fits, and put it in the middle.
      const fit = Math.min(SCREEN.width / track.width, SCREEN.height / track.height);
      context.translate((SCREEN.width - track.width * fit) / 2, (SCREEN.height - track.height * fit) / 2);
      context.scale(fit, fit);
    }
    context.drawImage(ground.picture, 0, 0, track.width, track.height);
    if (gantry !== null) {
      context.strokeStyle = "rgba(20, 24, 29, 0.85)";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(gantry.left.x, gantry.left.y);
      context.lineTo(gantry.right.x, gantry.right.y);
      context.stroke();
    }
    for (const banana of bananas) {
      paintPropFromAbove(context, "banana", banana.x, banana.y);
    }
    paintPuffsFromAbove(puffs);
    // The other karts first and the player's own kart last, so it is never under another.
    for (const each of [...others, kart]) {
      const turned = { x: each.x, y: each.y, angle: each.angle + (each.spinTurn ?? 0) };
      paintKart(context, viewerAbove(turned), lookOf(each), each === kart ? steerShown : 0);
    }
    for (const prop of props) {
      paintPropFromAbove(context, prop.kind, prop.x, prop.y, prop.size);
    }
    context.restore();
  }

  // ---- The small map in the corner ----

  function drawMinimap(kart, others, bananas) {
    const scale = mini.width / track.width;
    const left = SCREEN.width - mini.width - MINIMAP_MARGIN;
    const top = MINIMAP_MARGIN;

    context.save();
    // A dark frame, so the map stands out from the picture behind it.
    context.fillStyle = "rgba(14, 22, 32, 0.82)";
    context.beginPath();
    context.roundRect(left - 5, top - 5, mini.width + 10, mini.height + 10, 8);
    context.fill();
    context.globalAlpha = 0.92;
    context.drawImage(mini, left, top);
    context.globalAlpha = 1;

    for (const banana of bananas) {
      context.fillStyle = "#ffd23f";
      context.fillRect(left + banana.x * scale - 1.5, top + banana.y * scale - 1.5, 3, 3);
    }
    // A dot for every kart, in that kart's colour. The player's own dot is
    // drawn last and a little bigger, with a white ring, so it is easy to find.
    const dot = (someKart, radius, ring) => {
      context.fillStyle = lookOf(someKart).body;
      context.strokeStyle = ring;
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(left + someKart.x * scale, top + someKart.y * scale, radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    };
    for (const other of others) {
      dot(other, 3, DARK);
    }
    dot(kart, 4, "#ffffff");
    context.restore();
  }

  // ---- Smoke and dust ----

  /** Puffs in the race view: small soft circles, placed like everything else that stands on the ground. */
  function paintPuffs(list, spot, settings, near) {
    for (const puff of list) {
      const seen = seenFromKart(spot, puff.x, puff.y);
      if (seen.ahead < near + 2 || seen.ahead > 700) {
        continue;
      }
      const place = chasePoint(seen.ahead, seen.sideways, settings);
      if (place === null) {
        continue;
      }
      const share = puff.age / puff.life;
      context.globalAlpha = puff.alpha * (1 - share);
      context.fillStyle = puff.colour;
      context.beginPath();
      context.arc(place.x, place.y - puff.height * place.scale, puff.radius * (1 + share * 1.6) * place.scale, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function paintPuffsFromAbove(list) {
    for (const puff of list) {
      const share = puff.age / puff.life;
      context.globalAlpha = puff.alpha * (1 - share) * 0.8;
      context.fillStyle = puff.colour;
      context.beginPath();
      context.arc(puff.x, puff.y, puff.radius * (1 + share * 1.6), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
// Worked out once for a track
// ---------------------------------------------------------------------------

/** Where the starting places are: two columns behind the first place, each row a little further back. */
function gridOf(track) {
  const { x, y, angle } = track.start;
  const spots = [];
  for (let place = 0; place < GRID_PLACES; place++) {
    const side = place % 2 === 0 ? -1 : 1; // left column, right column
    const row = Math.floor(place / 2);
    // "forward" is the direction the karts point. "right" is a quarter turn clockwise from it.
    const forwardX = Math.cos(angle);
    const forwardY = Math.sin(angle);
    spots.push({
      x: x - forwardY * side * GRID_SIDEWAYS - forwardX * row * GRID_BEHIND,
      y: y + forwardX * side * GRID_SIDEWAYS - forwardY * row * GRID_BEHIND,
      angle,
    });
  }
  // Only the places that are on open ground are painted. (A very small test track has room for fewer.)
  return spots.filter((spot) => tileKindAt(track, spot.x, spot.y) !== "wall");
}

/**
 * Where the start gantry stands: its two posts at the edges of the road,
 * on the start line. Gives { left, right, middle } in units, or null on a
 * track where the road at the line cannot be found.
 */
function gantryOf(track) {
  const line = track.checkpoints[0];
  const size = track.tileSize;
  const alongX = Math.abs(Math.cos(track.start.angle)) >= Math.abs(Math.sin(track.start.angle));
  const forwards = alongX ? Math.cos(track.start.angle) > 0 : Math.sin(track.start.angle) > 0;
  // The line itself: the edge of the finish checkpoint that a kart reaches first.
  const at = alongX ? (forwards ? line.left : line.right) : forwards ? line.top : line.bottom;
  // Look along the line for the stretch of road, square by square.
  const from = alongX ? line.top : line.left;
  const to = alongX ? line.bottom : line.right;
  const inside = at + (forwards ? 1 : -1) * (size / 2); // a point just inside the checkpoint
  let first = null;
  let last = null;
  for (let across = from + size / 2; across < to; across += size) {
    const kind = alongX ? tileKindAt(track, inside, across) : tileKindAt(track, across, inside);
    if (kind === "road") {
      first = first ?? across - size / 2;
      last = across + size / 2;
    }
  }
  if (first === null) {
    return null;
  }
  const point = (across) => (alongX ? { x: at, y: across } : { x: across, y: at });
  // Seen by a driver, "left" is the post on the driver's left.
  const [low, high] = [point(first), point(last)];
  const leftIsLow = alongX ? forwards : !forwards;
  return {
    left: leftIsLow ? low : high,
    right: leftIsLow ? high : low,
    middle: point((first + last) / 2),
  };
}

/** A small copy of the track picture for the corner of the screen, painted once. */
function paintMiniPicture(picture, track) {
  const scale = Math.min(MINIMAP_LARGEST / track.width, MINIMAP_LARGEST / track.height);
  const mini = document.createElement("canvas");
  mini.width = Math.round(track.width * scale);
  mini.height = Math.round(track.height * scale);
  const context = mini.getContext("2d");
  context.imageSmoothingQuality = "high";
  context.drawImage(picture, 0, 0, mini.width, mini.height);
  return mini;
}

// ---------------------------------------------------------------------------
// Smoke and dust: small puffs that rise, grow and fade
// ---------------------------------------------------------------------------

function movePuffs(puffs, seconds) {
  for (let i = puffs.length - 1; i >= 0; i--) {
    const puff = puffs[i];
    puff.age += seconds;
    puff.x += puff.vx * seconds;
    puff.y += puff.vy * seconds;
    puff.height += puff.rise * seconds;
    if (puff.age >= puff.life) {
      puffs.splice(i, 1);
    }
  }
}

/**
 * Lets a kart leave puffs behind: dust from its back wheels on grass, a
 * little exhaust smoke when it pulls away, and white smoke from the tyres
 * while it spins. How many depends on the time that has passed, so a fast
 * and a slow screen show about the same amount.
 */
function addPuffsFor(puffs, track, kart, seconds) {
  const speed = Math.hypot(kart.vx ?? 0, kart.vy ?? 0);
  if (!(seconds > 0) || puffs.length >= MOST_PUFFS) {
    return;
  }
  const back = { x: kart.x - Math.cos(kart.angle) * 10, y: kart.y - Math.sin(kart.angle) * 10 };
  const add = (perSecond, colour, alpha, radius, life, spread) => {
    if (Math.random() < perSecond * seconds) {
      puffs.push({
        x: back.x + (Math.random() - 0.5) * spread,
        y: back.y + (Math.random() - 0.5) * spread,
        height: 2 + Math.random() * 2,
        vx: (kart.vx ?? 0) * 0.15 + (Math.random() - 0.5) * 12,
        vy: (kart.vy ?? 0) * 0.15 + (Math.random() - 0.5) * 12,
        rise: 6 + Math.random() * 6,
        age: 0,
        life,
        radius,
        colour,
        alpha,
      });
    }
  };
  const spinning = Math.abs(kart.spinTurn ?? 0) > 0.01;
  if (spinning) {
    add(40, "#f4f6f8", 0.5, 3.4, 0.7, 16);
  } else if (speed > 60 && tileKindAt(track, kart.x, kart.y) === "grass") {
    add(26, "#b8a070", 0.45, 3, 0.6, 14);
  } else if (speed > 20 && speed < 150) {
    add(9, "#dfe5ea", 0.3, 2, 0.5, 5);
  }
}

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const keptHazed = new Map();

/** A colour faded towards the colour of the haze: step 0 not at all, each step a little more. Kept, to save the sums. */
function hazed(colour, haze, step) {
  if (step === 0) {
    return colour;
  }
  const key = colour + haze + step;
  let result = keptHazed.get(key);
  if (result === undefined) {
    const share = step * 0.14;
    const part = (text, start) => parseInt(text.slice(start, start + 2), 16);
    const mix = (start) =>
      Math.round(part(colour, start) * (1 - share) + part(haze, start) * share)
        .toString(16)
        .padStart(2, "0");
    result = `#${mix(1)}${mix(3)}${mix(5)}`;
    keptHazed.set(key, result);
  }
  return result;
}
