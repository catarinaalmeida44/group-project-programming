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

import { SCREEN, FOLLOW, CHASE, RACE, blendChase, chaseRow, chasePoint, eyeOf, seenFromKart, easeAngle, sideSeen, seesFromAbove } from "./camera.js";
import { readLevels, depthAt, faces, sceneryByLevel } from "./levels.js";
import { createBuildings, buildingsInView } from "./buildings.js";
import { createScenery, sceneryInView, squaresWithScenery, rampBlocks, cutAtSquares, RAMP_FLAT_STYLES } from "./scenery.js";
import { createSceneryPainter, LIGHT as SCENERY_LIGHT } from "./scenery-paint.js";
import { trafficLanes, carsAt } from "./traffic.js";
import { WALL_ART } from "./wall-art.js";
import { jumpHeight } from "../shared/ramps.js";
import { stairsBump } from "./stairs-bump.js";
import { createGround } from "./ground.js";
import { paintSky } from "./sky.js";
import { lookAtTime, DEFAULT_TIME } from "./time-of-day.js";
import { paintProp, paintPropFromAbove, PROP_HEIGHT } from "./props.js";
import { paintKart, paintScene, viewerBehind, viewerAbove } from "./kart-paint.js";
import { lookOf, shade } from "./kart-shape.js";
import { lookOfTrack, propsOfTrack } from "./track-looks.js";
import { checkpointPieces } from "./checkpoints.js";
import { tileKindAt } from "../shared/track.js";
import { gridSpot, GRID_PLACES } from "../shared/grid.js";

const DARK = "#14181d";

// ---------------------------------------------------------------------------
// NUMBERS TO TUNE BY EYE
// ---------------------------------------------------------------------------

/** How quickly the race camera swings round behind a kart that has turned. Lower shows more of the kart turning. */
const CAMERA_SWING = 6.5;
/** How quickly the race camera goes down with the kart into the sunken part of the ground, and up again (levels.js). */
const CAMERA_SINK = 8;
/** The colours of the upright faces of the sunken part: the stone walls round it, the fronts of the stairs, the small steps of the path. */
// The stone walls are the white of the white walls of the buildings
// (wall-art.js), so that they match the white sides of the beach tunnel
// next to them. (A darker cream, "#d6cfc1", until 20 November 2026:
// Francisco could tell the two walls apart.)
const LEVEL_WALLS = { stone: "#f3f2ed", stairs: "#b4705a", path: "#b3843f" };
/** A step of the sunken part lower than this (in units) has no front painted: it belongs to a ramp, not to stairs. */
const MIN_STEP = 1.2;
/** How the light falls on a face, by the way it looks: towards the south and west it is lit, towards the north and east in shade. */
const FACE_LIGHT = { north: 0.78, east: 0.9, south: 1.1, west: 1.04 };
/** How quickly the picture of the steering follows the keys. */
const STEER_QUICKNESS = 14;
/** The start gantry: how high its beam hangs over the road, how tall the beam is, how thick a post is and how wide the whole thing may be, in units. */
const GANTRY = { clear: 40, tall: 13, post: 3, widest: 150 };
/** A tree, lamp or flag at least this tall (in units) fades away over this many units as it passes the kart. */
const TALL_FROM = 30;
const FADE_OVER = 45;
/** The curtain of yellow light on the next checkpoint: how tall it is in units, and its colour as red, green, blue. */
const LIGHT = { tall: 15, colour: "255, 210, 40" };
/** Further ahead than this, a building is painted as plain walls, without windows. */
const WINDOWS_TO = 900;
/** At most this many puffs of smoke and dust at once. */
const MOST_PUFFS = 260;

const MINIMAP_LARGEST = 180; // pixels: the small map fits in a square of this size
const MINIMAP_MARGIN = 10;

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
 *             nextCheckpoint  the number of the checkpoint the player has to
 *                      reach next. It is lit up with a low curtain of yellow
 *                      light, and marked on the small map (checkpoints.js)
 *             podium   [{ x, y, angle, parts, shadows, labels }]: groups of
 *                      shapes that stand on the track at the end of a race
 *                      (podium-view.js). Each is painted with kart-paint.js,
 *                      sorted among the buildings and trees like a kart
 *             camera   a camera of its own, in the form of RACE (camera.js),
 *                      instead of the race camera. Race view only
 *             mapInset  how many pixels in from the right edge the small map
 *                      is drawn. The two-player page shows only the middle
 *                      of each picture, so its maps move in. Left out: 0
 *             hideOwnKart  true: the kart the camera stays with is not
 *                      painted, and the small map is left out (the camera
 *                      only stands there to look at the podium)
 *
 * A kart may carry "spinTurn": extra turning, in radians, for the picture
 * only. A kart that slipped on a banana is drawn spinning with it.
 */
export function createPainter(canvas, track, { storeys = null, timeOfDay = DEFAULT_TIME } = {}) {
  canvas.width = SCREEN.width;
  canvas.height = SCREEN.height;
  const context = canvas.getContext("2d");
  // The track's look at the time of day the player chose (time-of-day.js).
  // In the afternoon it is the look as it always was.
  const look = lookAtTime(lookOfTrack(track), timeOfDay);
  // At other times a light lies over the ground, the buildings and the karts,
  // but not over the sky: the sky is painted apart and put behind the
  // picture at the end (drawRaceView).
  let skyCanvas = null;
  const grid = gridOf(track);
  // A track can have scenery of its own: buildings with real fronts, roofs
  // to drive under, railings (scenery.js). A wall that has none still gets
  // a plain barrier, so that no wall is ever invisible.
  // The ramps of a track (shared/ramps.js) are scenery too: boxes with a
  // sloping top, added to the track's own.
  const ramps = rampBlocks(track);
  const unitsPerMetre = look.scenery?.unitsPerMetre ?? track.tileSize / 3;
  // A part of the ground that lies lower (levels.js), on the Nova lap only.
  const levels = readLevels(look, track.tileSize, unitsPerMetre);
  // The scenery, sorted by the level it stands on: most of it on the ground
  // of the track, some of it (the beach tunnel) down in the sunken part.
  // Each group is drawn with the camera's height above its own ground. A
  // track without levels has one group, as before.
  const sceneries =
    look.scenery || ramps.length > 0
      ? sceneryByLevel([...(look.scenery?.blocks ?? []), ...ramps], look.scenery?.fences ?? [], look.levels?.scenery, levels, track.tileSize)
          .filter((group) => group.blocks.length > 0 || group.fences.length > 0)
          .map((group) => {
            const made = createScenery(track, {
              unitsPerMetre,
              fences: group.fences,
              blocks: group.blocks,
              flatStyles: { ...RAMP_FLAT_STYLES, ...look.scenery?.flatStyles },
            });
            return { depth: group.depth, scenery: made, painter: createSceneryPainter(look.wallArt ?? WALL_ART, made, look.haze) };
          })
      : [];
  const props = propsOfTrack(track, look, storeys);
  const ownScenery = sceneries.length > 0 ? new Set(sceneries.flatMap((group) => [...squaresWithScenery(group.scenery, track.tileSize)])) : null;
  for (const prop of ownScenery ? props : []) {
    // A square with a statue or a tree on it shows what is in the way, too.
    ownScenery.add(`${Math.floor(prop.x / track.tileSize)} ${Math.floor(prop.y / track.tileSize)}`);
  }
  const buildings = createBuildings(track, storeys, {
    barrierHeight: look.barrierHeight,
    noBarrierAt: ownScenery ? (column, row) => ownScenery.has(`${column} ${row}`) : null,
  });
  const ground = createGround(track, look, grid, buildings, levels);
  const gantry = gantryOf(track);
  const traffic = trafficLanes(track, look.traffic);
  const mini = paintMiniPicture(ground.picture, track);
  // Every checkpoint as a line across the road, one piece per square of the map.
  const checkpointLights = track.checkpoints.map((checkpoint, number) => checkpointPieces(track, number));

  // What the painter remembers from one picture to the next.
  let lastTime = null; //   when the last picture was drawn
  let swing = null; //      { x, y, angle }: where the race camera was and which way it looked
  let steerShown = 0; //    the steering as it is drawn, which follows the keys smoothly
  const puffs = []; //      smoke and dust in the air
  let cameraDepth = null; // how deep the ground under the race camera is (levels.js); it follows the kart's, smoothly

  return function draw(view, kart, camera, steer, others = [], scene = {}) {
    const now = performance.now();
    const frameSeconds = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    const seconds = now / 1000;
    const wanted = Math.min(Math.max(Number(steer) || 0, -1), 1);
    steerShown += (wanted - steerShown) * (1 - Math.exp(-STEER_QUICKNESS * frameSeconds));
    const bananas = Array.isArray(scene.bananas) ? scene.bananas : [];
    // The pieces of the next checkpoint, to light up. None when the page names no checkpoint.
    const light = Number.isInteger(scene.nextCheckpoint) ? (checkpointLights[scene.nextCheckpoint] ?? []) : [];

    movePuffs(puffs, frameSeconds);
    for (const each of [kart, ...others]) {
      addPuffsFor(puffs, track, each, frameSeconds);
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    if (view === "chase" && look.light) {
      context.clearRect(0, 0, SCREEN.width, SCREEN.height); // the sky goes behind at the end
    } else {
      context.fillStyle = look.beyond;
      context.fillRect(0, 0, SCREEN.width, SCREEN.height);
    }

    if (view === "chase") {
      drawRaceView(kart, others, bananas, scene, frameSeconds, seconds, light);
    } else {
      swing = null; // when the race view comes back, it starts straight behind the kart
      drawFromAbove(view, kart, camera, others, bananas, light, seconds, scene);
      if (look.light) {
        // The light of the time of day over the whole view from above.
        context.save();
        context.globalAlpha = look.light.alpha;
        context.fillStyle = look.light.colour;
        context.fillRect(0, 0, SCREEN.width, SCREEN.height);
        context.restore();
      }
    }

    // The views that show only part of the track get a small map in the corner.
    if (view !== "map" && scene.hideOwnKart !== true) {
      drawMinimap(kart, others, bananas, light, seconds, scene.mapInset);
    }
  };

  /** How strongly the light on the next checkpoint glows at this moment: it pulses gently, from 0 to 1. */
  function glowAt(seconds) {
    return 0.5 + 0.5 * Math.sin(seconds * 5);
  }

  /** The next checkpoint in a view from above: a glowing yellow line across the road. */
  function strokeLight(light, seconds, width) {
    context.strokeStyle = `rgba(${LIGHT.colour}, ${0.55 + 0.35 * glowAt(seconds)})`;
    context.lineWidth = width;
    context.beginPath();
    for (const piece of light) {
      context.moveTo(piece.from.x, piece.from.y);
      context.lineTo(piece.to.x, piece.to.y);
    }
    context.stroke();
  }

  // ---- The race view ----

  function drawRaceView(kart, others, bananas, scene, frameSeconds, seconds, light) {
    // The camera comes down from high above the grid while 3, 2, 1 is counted.
    const intro = typeof scene.intro === "number" ? Math.min(Math.max(scene.intro, 0), 1) : 1;
    const eased = intro * intro * (3 - 2 * intro); // slow at both ends, quick in the middle
    // A page can bring its own camera, in the same form as RACE (the podium does).
    const settings = scene.camera ?? (intro >= 1 ? RACE : blendChase(CHASE, RACE, eased));

    // The camera swings round behind the kart a moment after the kart has
    // turned. If the kart was put somewhere else (back on the grid), or
    // this is the first picture, the camera jumps straight behind it.
    const jumped = swing === null || Math.hypot(kart.x - swing.x, kart.y - swing.y) > 150;
    const angle = jumped || intro < 1 ? kart.angle : easeAngle(swing.angle, kart.angle, frameSeconds, CAMERA_SWING);
    swing = { x: kart.x, y: kart.y, angle };
    const spot = swing;

    // TWO LEVELS (levels.js). The camera goes down with the kart into the
    // sunken part, and up again, smoothly. Everything is drawn from the
    // camera's height above the ground it stands on: "at(x, y)" gives the
    // camera for something at that spot, "upper" for the ground of the
    // track and what stands on it. Without levels both are just "settings".
    const kartDepth = depthAt(levels, kart.x, kart.y);
    cameraDepth = cameraDepth === null || jumped ? kartDepth : cameraDepth + (kartDepth - cameraDepth) * (1 - Math.exp(-CAMERA_SINK * frameSeconds));
    const lifted = (depth) => (levels === null || depth === cameraDepth ? settings : { ...settings, eyeLift: depth - cameraDepth });
    const at = (x, y) => lifted(depthAt(levels, x, y));
    const upper = lifted(0);

    if (look.light) {
      // Another time of day: the sky is painted apart, and put behind the
      // picture at the end, so the light falls on everything but the sky.
      if (skyCanvas === null) {
        skyCanvas = canvas.ownerDocument.createElement("canvas");
        skyCanvas.width = SCREEN.width;
        skyCanvas.height = SCREEN.height;
      }
      const skyContext = skyCanvas.getContext("2d");
      skyContext.clearRect(0, 0, SCREEN.width, SCREEN.height);
      paintSky(skyContext, spot.angle, settings, SCREEN, look, seconds);
    } else {
      paintSky(context, spot.angle, settings, SCREEN, look, seconds);
    }
    const near = chaseRow(SCREEN.height, settings).ahead;
    ground.paintTilted(
      context,
      spot,
      upper,
      SCREEN,
      levels === null
        ? null
        : () => {
            ground.paintSunken(context, spot, settings, SCREEN, cameraDepth, prepareLevelWalls(spot, settings, near));
          },
    );

    // Everything that stands on the ground, with the square it stands on.
    const size = track.tileSize;
    const things = [];

    // The buildings. buildings.js leaves out a wall that stands between the
    // camera and the kart, and shows a wall beside the camera for as long
    // as any of it can be seen. They all stand on the ground of the track.
    things.push(...buildingsInView(buildings, spot, upper, SCREEN));
    for (const group of sceneries) {
      const camera = lifted(group.depth);
      for (const thing of sceneryInView(group.scenery, spot, camera, SCREEN)) {
        things.push({ ...thing, painter: group.painter, camera, depth: group.depth });
      }
    }

    const standing = (kind, x, y, scale, more = {}) => {
      const seen = seenFromKart(spot, x, y);
      if (seen.ahead < near + 6 || seen.ahead > settings.viewAhead) {
        return;
      }
      const place = chasePoint(seen.ahead, seen.sideways, at(x, y));
      if (place === null) {
        return;
      }
      const reach = 34 * place.scale * scale; // about half as wide as the widest thing
      const tall = (PROP_HEIGHT[kind] ?? 20) * place.scale * scale;
      if (place.x < -reach || place.x > SCREEN.width + reach || place.y - tall > SCREEN.height) {
        return;
      }
      // A tall thing beside the road (a tree, a lamp) fades away while it
      // passes the kart. Without this it would vanish in one go, with its
      // top still on the screen.
      const isTall = (PROP_HEIGHT[kind] ?? 20) >= TALL_FROM;
      const fade = isTall ? Math.min(1, (seen.ahead - (near + 6)) / FADE_OVER) : 1;
      things.push({
        kind,
        scale,
        fade,
        x: place.x,
        y: place.y,
        unit: place.scale,
        ahead: seen.ahead,
        column: Math.floor(x / size),
        row: Math.floor(y / size),
        depth: depthAt(levels, x, y),
        ...more,
      });
    };
    for (const prop of props) {
      standing(prop.kind, prop.x, prop.y, prop.size, { label: prop.label });
    }
    for (const banana of bananas) {
      standing("banana", banana.x, banana.y, 1);
    }
    // Cars on the roads beside the track: each is a flat picture, chosen by
    // which side of the car the camera sees (from behind, the front, a side).
    for (const car of carsAt(traffic, seconds)) {
      standing("car", car.x, car.y, 1, { label: `${sideSeen(spot.angle, car.angle)} ${car.colour}` });
    }
    // The people who walk across the track (shared/walkers.js), walking or
    // sitting on the ground. Which side of them we see works as for the cars.
    for (const walker of Array.isArray(scene.walkers) ? scene.walkers : []) {
      const state = walker.down ? `down ${walker.downShare.toFixed(2)}` : "walk 0";
      standing("walker", walker.x, walker.y, 1, { label: `${sideSeen(spot.angle, walker.angle)} ${walker.look} ${state}` });
    }
    for (const other of others) {
      const seen = seenFromKart(spot, other.x, other.y);
      if (seen.ahead > settings.viewAhead) {
        continue;
      }
      const otherCamera = at(other.x, other.y);
      const viewer = viewerBehind(seen, other.angle + (other.spinTurn ?? 0) - spot.angle, other.angle, otherCamera, SCREEN);
      if (viewer !== null) {
        things.push({
          kind: "kart",
          ground: chasePoint(seen.ahead, seen.sideways, otherCamera), // where it touches the road, for when it is in the air
          kart: other,
          viewer,
          ahead: seen.ahead,
          column: Math.floor(other.x / size),
          row: Math.floor(other.y / size),
          depth: depthAt(levels, other.x, other.y),
        });
      }
    }
    // The podium at the end of a race: each step with its driver, and each
    // student of the crowd, is one thing, painted like a kart.
    for (const group of Array.isArray(scene.podium) ? scene.podium : []) {
      const seen = seenFromKart(spot, group.x, group.y);
      if (seen.ahead > settings.viewAhead) {
        continue;
      }
      const viewer = viewerBehind(seen, group.angle - spot.angle, group.angle, upper, SCREEN);
      if (viewer !== null) {
        things.push({ kind: "podium", group, viewer, ahead: seen.ahead, column: Math.floor(group.x / size), row: Math.floor(group.y / size) });
      }
    }
    // The start gantry, one piece for each square it crosses. (As one wide
    // thing it was sorted by the square of its middle, and a far building
    // in a row nearer the camera was then painted over part of it: the
    // beam looked see-through. Found by Catarina on 17 November 2026.)
    for (const piece of gantry?.pieces ?? []) {
      things.push({
        kind: "gantry",
        piece,
        ahead: seenFromKart(spot, (piece.a.x + piece.b.x) / 2, (piece.a.y + piece.b.y) / 2).ahead,
        column: piece.column,
        row: piece.row,
      });
    }
    // The light on the next checkpoint: one low curtain for each square it crosses.
    for (const piece of light) {
      let a = seenFromKart(spot, piece.from.x, piece.from.y);
      let b = seenFromKart(spot, piece.to.x, piece.to.y);
      const nearest = near + 2;
      if ((a.ahead < nearest && b.ahead < nearest) || Math.min(a.ahead, b.ahead) > settings.viewAhead) {
        continue;
      }
      // A piece that reaches behind the bottom of the screen is cut there.
      const cut = (behind, ahead) => {
        const share = (nearest - behind.ahead) / (ahead.ahead - behind.ahead);
        return { ahead: nearest, sideways: behind.sideways + share * (ahead.sideways - behind.sideways) };
      };
      if (a.ahead < nearest) {
        a = cut(a, b);
      } else if (b.ahead < nearest) {
        b = cut(b, a);
      }
      const lightCamera = at((piece.from.x + piece.to.x) / 2, (piece.from.y + piece.to.y) / 2);
      const ends = [chasePoint(a.ahead, a.sideways, lightCamera), chasePoint(b.ahead, b.sideways, lightCamera)];
      if (ends[0] !== null && ends[1] !== null) {
        things.push({ kind: "light", ends, ahead: (a.ahead + b.ahead) / 2, column: piece.column, row: piece.row });
      }
    }

    // Furthest first. The squares of the map make this easy to get right:
    // seen from the camera's own square, a thing in a row of squares
    // further away can never be in front of a thing in a nearer row, and
    // within a row the same goes for columns. So: the furthest row first,
    // and within a row the furthest column first.
    const eye = eyeOf(settings);
    const eyeColumn = Math.floor((spot.x - Math.cos(spot.angle) * eye.behind) / size);
    const eyeRow = Math.floor((spot.y - Math.sin(spot.angle) * eye.behind) / size);
    const layer = (thing) =>
      thing.kind === "side" || thing.kind === "strip" ? 0 : thing.kind === "roof" || thing.kind === "flat" ? 1 : 2;
    things.sort(
      (a, b) =>
        Math.abs(b.row - eyeRow) - Math.abs(a.row - eyeRow) ||
        Math.abs(b.column - eyeColumn) - Math.abs(a.column - eyeColumn) ||
        layer(a) - layer(b) ||
        b.ahead - a.ahead,
    );

    // Something down in the sunken part (levels.js) is hidden by the ground
    // of the track in front of it, as a thing in a pit is by the pit's edge.
    // The ground is painted before everything that stands, so instead each
    // such thing is cut. The rule is the real one: a part of it that is
    // above the level of the ground of the track can never be hidden by
    // that ground; a part below that level is seen only through the holes.
    // (A first version cut at one line for the whole thing, measured from
    // its middle: a railing running towards the camera lost its near end,
    // and the lower part of the tunnel's walls was cut away.)
    // Cut where the ground of the track itself leaves the bottom of the
    // screen. From down in the sunken part that ground is nearer the eye, so
    // it reaches the bottom of the screen closer to the kart than the
    // ground under the kart does. (Cut at the kart's own "near" until 20
    // November 2026: a band along the bottom of the screen was then outside
    // the holes, and a railing beside the kart vanished as it came close.)
    const upperNear = chaseRow(SCREEN.height, upper).ahead - 1;
    const holes = levels === null ? null : holeOutline(spot, upper, upperNear);
    for (const thing of things) {
      const region = holes !== null && thing.depth > 0 ? seenRegion(thing, holes, upper, upperNear) : null;
      if (region !== null) {
        context.save();
        context.clip(region);
      }
      paintThing(thing);
      if (region !== null) {
        context.restore();
      }
    }

    function paintThing(thing) {
      if (thing.kind === "side" || thing.kind === "roof") {
        paintBuildingPiece(thing);
      } else if (thing.kind === "strip") {
        thing.painter.paintStrip(context, thing, thing.camera, SCREEN);
      } else if (thing.kind === "flat") {
        thing.painter.paintFlat(context, thing);
      } else if (thing.kind === "kart") {
        paintKartWithJump(thing.kart, thing.viewer, thing.ground, 0);
        paintNameAbove(thing, scene.names);
      } else if (thing.kind === "podium") {
        paintPodiumGroup(thing.group, thing.viewer);
      } else if (thing.kind === "gantry") {
        paintGantry(thing.piece, spot, upper, near, scene.lights);
      } else if (thing.kind === "light") {
        paintLight(thing, seconds);
      } else {
        context.globalAlpha = thing.fade;
        paintProp(context, thing.kind, thing.x, thing.y, thing.unit, thing.scale, seconds, thing.label);
        context.globalAlpha = 1;
      }
    }

    paintPuffs(puffs, spot, settings, near);

    // Our own kart last: always in the same spot and never hidden.
    if (scene.hideOwnKart !== true) {
      const ownCamera = lifted(kartDepth); // the camera trails a moment behind the kart, going down or up
      const own = viewerBehind({ ahead: 0, sideways: 0 }, kart.angle + (kart.spinTurn ?? 0) - spot.angle, kart.angle, ownCamera, SCREEN);
      paintKartWithJump(kart, own, chasePoint(0, 0, ownCamera), steerShown);
    }

    if (look.light) {
      // The light of the time of day, only where something is painted
      // ("source-atop"), then the sky and the far colour behind it all
      // ("destination-over"): the buildings still hide the sun and the stars.
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalCompositeOperation = "source-atop";
      context.globalAlpha = look.light.alpha;
      context.fillStyle = look.light.colour;
      context.fillRect(0, 0, SCREEN.width, SCREEN.height);
      context.globalAlpha = 1;
      context.globalCompositeOperation = "destination-over";
      context.drawImage(skyCanvas, 0, 0);
      context.fillStyle = look.beyond;
      context.fillRect(0, 0, SCREEN.width, SCREEN.height);
      context.restore();
    }
  }

  /**
   * The upright faces of the sunken part of the ground (levels.js) that look
   * towards the camera: the stone walls round it and the front of every
   * step. Painted with the ground, among the sunken strips and before the
   * ground of the track, which covers them everywhere but in its holes.
   * A face that reaches behind the bottom of the screen is cut there.
   * Gives a function to call with the depth of each strip before it is
   * painted (see below).
   */
  function prepareLevelWalls(spot, settings, near) {
    const eye = eyeOf(settings);
    const eyePoint = { x: spot.x - Math.cos(spot.angle) * eye.behind, y: spot.y - Math.sin(spot.angle) * eye.behind };
    const nearest = near + 1;
    const cut = (behind, ahead) => {
      const share = (nearest - behind.ahead) / (ahead.ahead - behind.ahead);
      return { ahead: nearest, sideways: behind.sideways + share * (ahead.sideways - behind.sideways) };
    };
    const shown = [];
    for (const wall of levels.walls) {
      // The tiny steps of a ramp (levels.js cuts it into many) have no front
      // worth painting: drawn, they showed as stripes across the path.
      if (!faces(wall, eyePoint) || wall.bottom - wall.top < MIN_STEP) {
        continue;
      }
      let a = seenFromKart(spot, wall.a.x, wall.a.y);
      let b = seenFromKart(spot, wall.b.x, wall.b.y);
      if ((a.ahead < nearest && b.ahead < nearest) || Math.min(a.ahead, b.ahead) > settings.viewAhead) {
        continue;
      }
      if (a.ahead < nearest) {
        a = cut(a, b);
      } else if (b.ahead < nearest) {
        b = cut(b, a);
      }
      const topCamera = { ...settings, eyeLift: wall.top - cameraDepth };
      const bottomCamera = { ...settings, eyeLift: wall.bottom - cameraDepth };
      if (!seesFromAbove(topCamera)) {
        continue;
      }
      const points = [
        chasePoint(a.ahead, a.sideways, topCamera),
        chasePoint(b.ahead, b.sideways, topCamera),
        chasePoint(b.ahead, b.sideways, bottomCamera),
        chasePoint(a.ahead, a.sideways, bottomCamera),
      ];
      if (points.every((point) => point !== null)) {
        shown.push({ wall, points, ahead: (a.ahead + b.ahead) / 2 });
      }
    }
    shown.sort((p, q) => q.ahead - p.ahead); // the furthest first
    // Painted in turns, as the sunken strips are painted, deepest first
    // (ground.paintSunken): before a strip, every wall whose foot is deeper
    // than it. A strip higher up that lies in front of a wall, such as the
    // path in front of the wall of the Sagres Beach Way, then covers the
    // wall's foot. (Until 20 November 2026 every wall was painted after
    // all the strips, and showed through the path. Found by Francisco.)
    return (depth) => {
      for (const each of shown) {
        if (!each.painted && each.wall.bottom > depth + 1e-6) {
          each.painted = true;
          paintLevelWall(each);
        }
      }
    };
  }

  /** One face of the sunken part (see prepareLevelWalls). */
  function paintLevelWall({ wall, points }) {
    const kind = wall.top === 0 ? "stone" : wall.toward.y !== 0 ? "stairs" : "path";
    const way = wall.toward.x > 0 ? "east" : wall.toward.x < 0 ? "west" : wall.toward.y > 0 ? "south" : "north";
    // A stone wall is shaded as the walls of the scenery are (scenery-paint.js), so that the two match.
    const colour = kind === "stone" ? shadedLikeScenery(LEVEL_WALLS.stone, SCENERY_LIGHT[way]) : hazed(shade(LEVEL_WALLS[kind], FACE_LIGHT[way]), look.haze, 0);
    context.beginPath();
    points.forEach((point, i) => (i === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y)));
    context.closePath();
    context.fillStyle = colour;
    context.fill();
    context.strokeStyle = colour; // closes the thin gaps between neighbouring faces
    context.lineWidth = 1;
    context.stroke();
  }

  /**
   * Where a thing down in the sunken part can be seen (see the painting
   * loop): the holes, and everything above the line where the level of the
   * ground of the track crosses the thing itself. Gives a Path2D to cut to,
   * or null when nothing of the thing can be hidden (it is all above that
   * level, like the tunnel's roof).
   */
  function seenRegion(thing, holes, upper, near) {
    const region = new Path2D(holes);
    const TOP = -SCREEN.height; // well above the top of the screen
    if (thing.kind === "flat") {
      return thing.lowest > thing.depth ? null : region;
    }
    if (thing.kind === "strip") {
      // The upright piece from a to b: the ground's level along it, and everything above that line.
      const nearest = near + 1;
      const atLevel = (end) => chasePoint(Math.max(end.ahead, nearest), end.sideways, upper);
      const pa = atLevel(thing.a);
      const pb = atLevel(thing.b);
      if (pa === null || pb === null) {
        return null;
      }
      const left = Math.min(pa.x, pb.x) - 1;
      const right = Math.max(pa.x, pb.x) + 1;
      const yLeft = pa.x <= pb.x ? pa.y : pb.y;
      const yRight = pa.x <= pb.x ? pb.y : pa.y;
      addShape(region, [
        { x: left, y: yLeft },
        { x: right, y: yRight },
        { x: right, y: TOP },
        { x: left, y: TOP },
      ]);
      return region;
    }
    // A kart or a thing standing on one spot: the ground's level there is
    // "depth" units above where it stands, so that many units higher on the screen.
    const ground = thing.kind === "kart" ? thing.ground : { y: thing.y, scale: thing.unit };
    if (ground === null || ground === undefined) {
      return null;
    }
    region.rect(0, TOP, SCREEN.width, ground.y - thing.depth * ground.scale - TOP);
    return region;
  }

  /**
   * Where the holes in the ground of the track are on the screen: every
   * strip of the sunken part (levels.js), as it lies at the level of that
   * ground, cut where it reaches behind the bottom of the screen. Gives a
   * Path2D: through it the sunken part can be seen.
   */
  function holeOutline(spot, upper, near) {
    const outline = new Path2D();
    const nearest = near + 1;
    for (const strip of levels.strips) {
      const corners = [
        [strip.left, strip.top],
        [strip.right, strip.top],
        [strip.right, strip.bottom],
        [strip.left, strip.bottom],
      ].map(([x, y]) => seenFromKart(spot, x, y));
      // Keep the part of the rectangle in front of the bottom of the screen (one cut, as the walls are cut).
      const kept = [];
      corners.forEach((corner, i) => {
        const next = corners[(i + 1) % corners.length];
        if (corner.ahead >= nearest) {
          kept.push(corner);
        }
        if (corner.ahead >= nearest !== next.ahead >= nearest) {
          const share = (nearest - corner.ahead) / (next.ahead - corner.ahead);
          kept.push({ ahead: nearest, sideways: corner.sideways + share * (next.sideways - corner.sideways) });
        }
      });
      const points = kept.map((corner) => chasePoint(corner.ahead, corner.sideways, upper));
      if (points.length < 3 || points.some((point) => point === null)) {
        continue;
      }
      addShape(outline, points);
    }
    return outline;
  }

  /**
   * A colour as scenery-paint.js shades a wall that the sun does not reach:
   * a dark blue-grey laid over it, the more the darker the side ("light"
   * from 0 to 1). Gives an "rgb(...)" colour.
   */
  function shadedLikeScenery(colour, light = 1) {
    const over = Math.max(0, 1 - light);
    const mix = (from, to) => Math.round(from * (1 - over) + to * over);
    const [r, g, b] = [1, 3, 5].map((start) => parseInt(colour.slice(start, start + 2), 16));
    return `rgb(${mix(r, 18)}, ${mix(g, 28)}, ${mix(b, 44)})`;
  }

  /**
   * Adds a shape (its corners on the screen) to a Path2D that is used to cut
   * to, always going round the same way. The canvas counts an area as inside
   * when the shapes over it go round it more often one way than the other: two
   * shapes going opposite ways cancel out where they overlap, and that area
   * was then left out. (Until 20 November 2026 the shapes went either way, as
   * it came: where they overlapped, a wall of the tunnel was not painted, and
   * what stood behind it showed through. Found by Francisco.)
   */
  function addShape(path, points) {
    let twiceArea = 0;
    points.forEach((point, i) => {
      const next = points[(i + 1) % points.length];
      twiceArea += point.x * next.y - next.x * point.y;
    });
    // The same way round as Path2D.rect(), which the karts' shapes use.
    const ordered = twiceArea >= 0 ? points : [...points].reverse();
    ordered.forEach((point, i) => (i === 0 ? path.moveTo(point.x, point.y) : path.lineTo(point.x, point.y)));
    path.closePath();
  }

  /** One group of the podium (a step with its driver, or a student), and the words on it. */
  function paintPodiumGroup(group, viewer) {
    paintScene(context, viewer, { parts: group.parts, shadows: group.shadows ?? [] });
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (const label of group.labels ?? []) {
      const spot = viewer.place(...label.point);
      if (spot !== null) {
        context.font = `900 ${Math.round(label.size * spot.scale)}px "Segoe UI", Arial, sans-serif`;
        context.fillStyle = label.colour;
        context.fillText(label.text, spot.x, spot.y);
      }
    }
    context.restore();
  }

  /**
   * Paints a kart in the race view. A kart that is in the air after a ramp
   * ("air" is how many more steps it flies, shared/ramps.js) is painted
   * higher up, and its shadow stays on the road under it.
   *   ground  where the kart touches the road on the screen: { x, y, scale }
   */
  function paintKartWithJump(someKart, viewer, ground, steer) {
    const height = jumpHeight(someKart.air);
    if (!(height > 0) || ground === null) {
      // On stairs (stairs-bump.js) a moving kart jolts up and down a little.
      const bump = ground === null ? 0 : stairsBump(look.stairs, track.tileSize, someKart);
      if (bump > 0) {
        context.save();
        context.translate(0, -bump * ground.scale);
      }
      paintKart(context, viewer, lookOf(someKart), steer);
      if (bump > 0) {
        context.restore();
      }
      return;
    }
    context.fillStyle = "rgba(8, 14, 22, 0.32)";
    context.beginPath();
    context.ellipse(ground.x, ground.y, 11 * ground.scale, 3.4 * ground.scale, 0, 0, Math.PI * 2);
    context.fill();
    context.save();
    context.translate(0, -height * ground.scale);
    paintKart(context, viewer, lookOf(someKart), steer);
    context.restore();
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
      const [footA, footB, topB, topA] = piece.corners;
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
    // (The four true corners of the side: its feet may lie below the screen.)
    const [footA, footB, topB, topA] = piece.corners;
    const onScreen = Math.abs(footA[1] - topA[1]);
    if (ahead > WINDOWS_TO || onScreen < 12 || !(buildings.unitsPerStorey > 0)) {
      return;
    }
    const storey = buildings.unitsPerStorey;
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

  /**
   * One piece of the curtain of light on the next checkpoint: see-through
   * yellow from the road up, with a bright line along its top. It shows
   * the player where to drive through. It is only light: karts pass it.
   */
  function paintLight(thing, seconds) {
    const [a, b] = thing.ends;
    const glow = glowAt(seconds);
    const topA = a.y - LIGHT.tall * a.scale;
    const topB = b.y - LIGHT.tall * b.scale;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.lineTo(b.x, topB);
    context.lineTo(a.x, topA);
    context.closePath();
    context.fillStyle = `rgba(${LIGHT.colour}, ${0.2 + 0.14 * glow})`;
    context.fill();
    context.strokeStyle = `rgba(${LIGHT.colour}, ${0.7 + 0.3 * glow})`;
    context.lineWidth = Math.min(6, Math.max(1.5, ((a.scale + b.scale) / 2) * 0.6));
    context.beginPath();
    context.moveTo(a.x, topA);
    context.lineTo(b.x, topB);
    context.stroke();
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
  function paintGantry(piece, spot, settings, near, lights) {
    const placeOf = (point) => {
      const seen = seenFromKart(spot, point.x, point.y);
      return seen.ahead < near + 2 ? null : chasePoint(seen.ahead, seen.sideways, settings);
    };
    // The two ends of this piece of the beam. The first piece also has the
    // left post of the gantry, the last piece the right one.
    const a = placeOf(piece.a);
    const b = placeOf(piece.b);
    for (const end of [piece.first ? a : null, piece.last ? b : null]) {
      if (end !== null) {
        context.fillStyle = "#39434d";
        const half = (GANTRY.post / 2) * end.scale;
        context.fillRect(end.x - half, end.y - (GANTRY.clear + GANTRY.tall) * end.scale, half * 2, (GANTRY.clear + GANTRY.tall) * end.scale);
      }
    }
    if (a === null || b === null) {
      return; // one end of this piece is behind us: we are driving under the beam
    }
    // Where a share of the WHOLE beam (0 at the left post, 1 at the right) lies on this piece.
    const onPiece = (share) => (share - piece.from) / (piece.to - piece.from);
    // A spot on this piece: "along" from 0 (its left end) to 1 (its right end), "up" in units above the road.
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
    // Two rows of chequers along the top and bottom edges of the beam. They
    // are counted along the whole beam, so they line up from piece to piece.
    const squares = 40;
    const white = "#f4f6f8";
    for (let i = Math.floor(piece.from * squares); i < Math.ceil(piece.to * squares); i++) {
      const from = Math.max(0, onPiece(i / squares));
      const to = Math.min(1, onPiece((i + 1) / squares));
      if (i % 2 === 0 && to > from) {
        patch(from, to, low, low + 2.2, white);
        patch(from, to, high - 2.2, high, white);
      }
    }
    // The start lights, in the middle of the whole beam, 9 units apart: red
    // while the countdown runs, one more for each number, then all green at
    // GO. A lamp that lies on the join of two pieces is painted by both, so
    // that neither covers half of it.
    const red = lights?.red ?? 0;
    const green = lights?.green === true;
    const lamps = 3;
    const reach = 3 / (gantry.long * (piece.to - piece.from)); // the size of a lamp, as a share of this piece
    for (let lamp = 0; lamp < lamps; lamp++) {
      const along = onPiece(0.5 + ((lamp - (lamps - 1) / 2) * 9) / gantry.long);
      if (along < -reach || along > 1 + reach) {
        continue;
      }
      const [x, y] = at(along, low + GANTRY.tall / 2);
      const scale = a.scale + (b.scale - a.scale) * along;
      context.beginPath();
      context.arc(x, y, 2.7 * scale, 0, Math.PI * 2);
      context.fillStyle = green ? "#39d353" : lamp < red ? "#ff3b30" : "#3a2326";
      context.fill();
    }
  }

  // ---- The two views from above ----

  function drawFromAbove(view, kart, camera, others, bananas, light, seconds, scene) {
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
    strokeLight(light, seconds, view === "follow" ? 5 : 9);
    for (const banana of bananas) {
      paintPropFromAbove(context, "banana", banana.x, banana.y);
    }
    paintPuffsFromAbove(puffs);
    // The other karts first and the player's own kart last, so it is never under another.
    for (const each of [...others, kart]) {
      const turned = { x: each.x, y: each.y, angle: each.angle + (each.spinTurn ?? 0) };
      paintKart(context, viewerAbove(turned), lookOf(each), each === kart ? steerShown : 0);
    }
    // The people who walk across the track: a dot in the colour of their jumper, a star when they sit on the ground.
    for (const walker of Array.isArray(scene.walkers) ? scene.walkers : []) {
      context.fillStyle = walker.down ? "#ffd23f" : WALKER_COLOURS_ABOVE[walker.look % WALKER_COLOURS_ABOVE.length];
      context.beginPath();
      context.arc(walker.x, walker.y, 5, 0, Math.PI * 2);
      context.fill();
    }
    for (const prop of props) {
      paintPropFromAbove(context, prop.kind, prop.x, prop.y, prop.size);
    }
    // The cars on the roads, each as a small rounded box pointing the way it drives.
    for (const car of carsAt(traffic, seconds)) {
      context.save();
      context.translate(car.x, car.y);
      context.rotate(car.angle);
      context.fillStyle = CAR_COLOURS_ABOVE[car.colour];
      context.beginPath();
      context.roundRect(-24, -10, 48, 20, 5);
      context.fill();
      context.fillStyle = "rgba(20, 30, 40, 0.75)";
      context.fillRect(-10, -8, 20, 16);
      context.restore();
    }
    context.restore();
  }

  // ---- The small map in the corner ----

  function drawMinimap(kart, others, bananas, light, seconds, inset) {
    const scale = mini.width / track.width;
    // "inset" moves the map in from the right edge (the two-player page shows only the middle of the picture).
    const left = SCREEN.width - mini.width - MINIMAP_MARGIN - (Number.isFinite(inset) && inset > 0 ? inset : 0);
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

    // The next checkpoint, as a glowing yellow line on the small map.
    if (light.length > 0) {
      context.save();
      context.translate(left, top);
      context.scale(scale, scale);
      context.lineCap = "round";
      strokeLight(light, seconds, 3.5 / scale);
      context.restore();
    }

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

/**
 * Where the starting places are, for painting the boxes of the grid. They
 * come from the same rule the server uses to put the karts there
 * (shared/grid.js), so a kart always stands in its box.
 */
function gridOf(track) {
  const spots = [];
  for (let place = 0; place < GRID_PLACES; place++) {
    spots.push(gridSpot(track, place));
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
  // On a wide square the road is far wider than the grid. The gantry then
  // stands over the grid, not from one edge of the square to the other, so
  // that the start lights hang where the drivers look.
  const middleOfGrid = alongX ? track.start.y : track.start.x;
  first = Math.max(first, middleOfGrid - GANTRY.widest / 2);
  last = Math.min(last, middleOfGrid + GANTRY.widest / 2);
  if (!(last - first > 20)) {
    return null;
  }
  const point = (across) => (alongX ? { x: at, y: across } : { x: across, y: at });
  // Seen by a driver, "left" is the post on the driver's left.
  const [low, high] = [point(first), point(last)];
  const leftIsLow = alongX ? forwards : !forwards;
  const left = leftIsLow ? low : high;
  const right = leftIsLow ? high : low;
  const long = Math.hypot(right.x - left.x, right.y - left.y); // how long the beam is, in units
  // The beam, cut where it crosses from one square of the map into the
  // next. Each piece is painted in its own turn, among the other things on
  // its square (see drawRaceView). "from" and "to" say which share of the
  // whole beam a piece is: 0 at the left post, 1 at the right.
  const cuts = cutAtSquares([left.x / size, left.y / size], [right.x / size, right.y / size]);
  const pieces = cuts.map((cut, number) => ({
    a: { x: cut.a[0] * size, y: cut.a[1] * size },
    b: { x: cut.b[0] * size, y: cut.b[1] * size },
    from: (cut.fromStart * size) / long,
    to: (cut.toStart * size) / long,
    first: number === 0,
    last: number === cuts.length - 1,
    column: Math.floor((cut.a[0] + cut.b[0]) / 2),
    row: Math.floor((cut.a[1] + cut.b[1]) / 2),
  }));
  return { left, right, middle: point((first + last) / 2), long, pieces };
}

const WALKER_COLOURS_ABOVE = ["#d8473f", "#2f66b3", "#3fa35a", "#e9b92c", "#8d5aa8", "#f08a3c"];
const CAR_COLOURS_ABOVE = { red: "#c8372f", blue: "#2f66b3", white: "#eef0f1", grey: "#7d858c", black: "#23272b", yellow: "#e9b92c" };

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
  // Extra speed after a ramp: a trail of orange sparks, once the kart is back on the road.
  if (kart.boost > 0 && !(kart.air > 0)) {
    add(70, Math.random() < 0.5 ? "#ffb23f" : "#ffe27a", 0.7, 2.2, 0.32, 7);
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
