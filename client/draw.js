// Drawing: turns the track and the kart into a picture on the page.
//
// The picture is drawn on a "canvas", a rectangle of the page that code can
// paint on. Nothing here decides how the kart moves. This file only shows
// what the rules in the "shared" folder have worked out, in one of the three
// views described in camera.js.

import { SCREEN, FOLLOW, CHASE, chaseRow } from "./camera.js";

// Each kind of ground has two shades that are almost the same. Tiles are
// painted in a chequered pattern of the two. The pattern is faint, but it
// slides past as the kart moves, and that is what shows speed on a road
// that would otherwise be one flat colour.
const COLOURS = {
  "#": ["#22303c", "#22303c"], // wall
  ".": ["#565d68", "#5f6671"], // road
  ",": ["#3c8a4b", "#44954f"], // grass
};
const WALL = COLOURS["#"][0];
const KERB_RED = "#d8473f";
const KERB_WHITE = "#f2f5f7";
const KERB_WIDTH = 5; // units
const KART_BODY = "#e23d3d";
const KART_BODY_LIGHT = "#f06a5e";
const KART_NOSE = "#ffd166";
const KART_DARK = "#15191d";
const HELMET = "#ffd166";

// The hidden pictures are painted with more pixels than one per unit of
// track, so they stay sharp when the camera zooms in.
const TRACK_SHARPNESS = 2; //  pixels per unit in the hidden picture of the track
const GROUND_SHARPNESS = 3; // pixels per unit in the hidden picture used by the chase view

const MINIMAP_SCALE = 0.18;
const MINIMAP_MARGIN = 10;

/**
 * Gets everything ready to draw one track on one canvas.
 * Gives back draw(view, kart, camera, steer), to be called for every picture:
 *   view    "follow", "chase" or "map"
 *   kart    the kart to show
 *   camera  the spot on the track in the middle of the screen (follow view only)
 *   steer   -1 while steering left, 1 while steering right, 0 otherwise.
 *           Only used to make the kart lean a little in the chase view
 */
export function createPainter(canvas, track) {
  canvas.width = SCREEN.width;
  canvas.height = SCREEN.height;
  const context = canvas.getContext("2d");
  const trackPicture = paintTrack(track);
  const chase = prepareChaseView();

  return function draw(view, kart, camera, steer) {
    context.fillStyle = WALL;
    context.fillRect(0, 0, SCREEN.width, SCREEN.height);

    if (view === "follow") {
      drawFollowView(context, trackPicture, track, kart, camera);
    } else if (view === "chase") {
      drawChaseView(context, chase, trackPicture, track, kart, steer);
    } else {
      drawMapView(context, trackPicture, track, kart);
    }

    // The zoomed-in views show only part of the track, so they get a small
    // map in the corner.
    if (view !== "map") {
      drawMinimap(context, trackPicture, track, kart);
    }
  };
}

// ---- The hidden picture of the track ----

/**
 * Paints the whole track once, on a hidden canvas, and gives that picture
 * back. The track never changes, so it would be a waste to paint every tile
 * again for every picture. The views copy from this one instead.
 */
function paintTrack(track) {
  const picture = document.createElement("canvas");
  picture.width = track.width * TRACK_SHARPNESS;
  picture.height = track.height * TRACK_SHARPNESS;
  const context = picture.getContext("2d");
  context.scale(TRACK_SHARPNESS, TRACK_SHARPNESS); // from here on, draw in units of track
  const size = track.tileSize;

  for (let row = 0; row < track.rows; row++) {
    for (let column = 0; column < track.columns; column++) {
      const shades = COLOURS[track.map[row][column]];
      context.fillStyle = shades[(row + column) % 2];
      // Slightly wider and taller than the tile, so no hairline gaps show between tiles.
      context.fillRect(column * size, row * size, size + 0.5, size + 0.5);
    }
  }

  paintKerbs(context, track);
  paintFinishLine(context, track);
  return picture;
}

/**
 * Paints a red and white striped edge, a "kerb", along every side of a wall
 * that faces open ground. Without it a wall is just a dark area, and it is
 * hard to see where the track ends.
 */
function paintKerbs(context, track) {
  const size = track.tileSize;
  const isWall = (column, row) =>
    column < 0 || row < 0 || column >= track.columns || row >= track.rows || track.map[row][column] === "#";

  for (let row = 0; row < track.rows; row++) {
    for (let column = 0; column < track.columns; column++) {
      if (!isWall(column, row)) {
        continue;
      }
      const left = column * size;
      const top = row * size;
      // For each of the four neighbours that is open ground, paint a strip
      // along that side of this wall tile: x, y, width, height.
      const sides = [
        [isWall(column, row - 1), left, top, size, KERB_WIDTH],
        [isWall(column, row + 1), left, top + size - KERB_WIDTH, size, KERB_WIDTH],
        [isWall(column - 1, row), left, top, KERB_WIDTH, size],
        [isWall(column + 1, row), left + size - KERB_WIDTH, top, KERB_WIDTH, size],
      ];
      for (const [neighbourIsWall, x, y, width, height] of sides) {
        if (!neighbourIsWall) {
          paintStripes(context, x, y, width, height, size / 2);
        }
      }
    }
  }
}

/** Fills a strip with red and white stripes of the given length, running along its longer side. */
function paintStripes(context, x, y, width, height, stripe) {
  const alongX = width >= height;
  const length = alongX ? width : height;
  for (let start = 0; start < length; start += stripe) {
    const position = (alongX ? x : y) + start;
    context.fillStyle = Math.round(position / stripe) % 2 === 0 ? KERB_RED : KERB_WHITE;
    if (alongX) {
      context.fillRect(position, y, stripe, height);
    } else {
      context.fillRect(x, position, width, stripe);
    }
  }
}

/** Paints a black and white chequered strip where the finish line crosses the road. */
function paintFinishLine(context, track) {
  const line = track.checkpoints[0];
  const square = track.tileSize / 4;
  for (let y = line.top; y < line.bottom; y += square) {
    for (let x = line.left; x < line.right; x += square) {
      const row = Math.floor(y / track.tileSize);
      const column = Math.floor(x / track.tileSize);
      if (track.map[row][column] !== ".") {
        continue; // only on the road, not on the grass beside it
      }
      const isWhite = (Math.round(x / square) + Math.round(y / square)) % 2 === 0;
      context.fillStyle = isWhite ? "#f2f5f7" : KART_DARK;
      context.fillRect(x, y, square, square);
    }
  }
}

/** Copies the hidden picture of the track, at the size of the track in units. */
function copyTrack(context, trackPicture, track) {
  context.drawImage(trackPicture, 0, 0, track.width, track.height);
}

// ---- View "map": the whole track at once ----

function drawMapView(context, trackPicture, track, kart) {
  // Shrink or grow the track so all of it fits, and put it in the middle.
  const fit = Math.min(SCREEN.width / track.width, SCREEN.height / track.height);
  context.save();
  context.translate((SCREEN.width - track.width * fit) / 2, (SCREEN.height - track.height * fit) / 2);
  context.scale(fit, fit);
  copyTrack(context, trackPicture, track);
  drawKartFromAbove(context, kart);
  context.restore();
}

// ---- View "follow": from above, zoomed in, moving with the kart ----

function drawFollowView(context, trackPicture, track, kart, camera) {
  context.save();
  // Put the camera's spot in the middle of the screen and zoom in around it.
  context.translate(SCREEN.width / 2, SCREEN.height / 2);
  context.scale(FOLLOW.zoom, FOLLOW.zoom);
  context.translate(-camera.x, -camera.y);
  copyTrack(context, trackPicture, track);
  drawKartFromAbove(context, kart);
  context.restore();
}

/** Draws the kart as a small car seen from above, turned to the direction it points. */
function drawKartFromAbove(context, kart) {
  context.save();
  // Move the "pen" to the kart and turn it, so the kart can be drawn as if
  // it were at 0,0 pointing right.
  context.translate(kart.x, kart.y);
  context.rotate(kart.angle);

  context.fillStyle = KART_DARK;
  context.fillRect(-9, -8, 6, 3); //  back left wheel
  context.fillRect(-9, 5, 6, 3); //   back right wheel
  context.fillRect(3, -8, 6, 3); //   front left wheel
  context.fillRect(3, 5, 6, 3); //    front right wheel

  context.fillStyle = KART_BODY;
  context.fillRect(-10, -6, 20, 12); // the body: 20 long, 12 wide

  context.fillStyle = KART_NOSE;
  context.fillRect(5, -4, 5, 8); // a yellow nose, so you can see which way it points

  context.restore();
}

// ---- View "chase": from behind and above, tilted ----
//
// How the tilt is made, in two stages for every picture:
//   1. On a hidden canvas (the "ground"), paint the track flat, turned so
//      that the kart points straight up and sits near the bottom.
//   2. Copy the ground onto the screen one thin row at a time. Rows near
//      the top of the screen take a wide slice from far ahead and squeeze
//      it. Rows near the bottom take a narrow slice from close by and
//      stretch it. That squeezing and stretching is what looks like tilt.

/** Works out, once, what each row of the screen shows in the chase view. */
function prepareChaseView() {
  // One entry for every row, and one extra below the bottom of the screen.
  const rows = [];
  for (let y = 0; y <= SCREEN.height; y++) {
    rows.push(chaseRow(y));
  }
  const farthest = rows[0].ahead; //            ahead of the kart, at the top of the screen
  const nearest = rows[SCREEN.height].ahead; // behind the kart, below the bottom of the screen
  const widestUnits = SCREEN.width / rows[0].scale; // the top row shows the widest slice

  const ground = document.createElement("canvas");
  ground.width = Math.ceil(widestUnits * GROUND_SHARPNESS);
  ground.height = Math.ceil((farthest - nearest) * GROUND_SHARPNESS) + 2;
  return { rows, farthest, ground, groundContext: ground.getContext("2d") };
}

function drawChaseView(context, chase, trackPicture, track, kart, steer) {
  const { rows, farthest, ground, groundContext } = chase;

  // Stage 1: paint the ground, turned so the kart points up.
  groundContext.setTransform(1, 0, 0, 1, 0, 0); // forget the turning from the picture before
  groundContext.fillStyle = WALL;
  groundContext.fillRect(0, 0, ground.width, ground.height);
  groundContext.translate(ground.width / 2, farthest * GROUND_SHARPNESS); // where the kart sits on the ground canvas
  groundContext.rotate(-kart.angle - Math.PI / 2); // turn the track so the kart points up
  groundContext.scale(GROUND_SHARPNESS, GROUND_SHARPNESS);
  groundContext.translate(-kart.x, -kart.y);
  copyTrack(groundContext, trackPicture, track);

  // Stage 2: copy it to the screen, one row at a time.
  for (let y = 0; y < SCREEN.height; y++) {
    const row = rows[y];
    const sliceWidth = (SCREEN.width / row.scale) * GROUND_SHARPNESS;
    const sliceTop = (farthest - row.ahead) * GROUND_SHARPNESS;
    // The slice is as tall as the ground this row covers, at least one pixel.
    const sliceHeight = Math.max(1, (row.ahead - rows[y + 1].ahead) * GROUND_SHARPNESS);
    context.drawImage(
      ground,
      ground.width / 2 - sliceWidth / 2, sliceTop, sliceWidth, sliceHeight, // from the ground
      0, y, SCREEN.width, 1, // to this row of the screen
    );
  }

  drawKartFromBehind(context, SCREEN.width / 2, CHASE.kartScreenY, CHASE.kartScale, steer);
}

/**
 * Draws the kart seen from behind and a little above: a shadow, four
 * wheels, the body, the seat and the driver's helmet.
 *   x, y   where the middle of the back of the kart touches the ground
 *   unit   how many pixels one unit of track is, at the kart
 *   steer  -1, 0 or 1: the kart leans and its front wheels shift when steering
 */
function drawKartFromBehind(context, x, y, unit, steer) {
  context.save();
  context.translate(x, y);
  context.scale(unit, unit); // from here on, draw in units of track
  context.rotate(steer * 0.05);

  // Shadow on the ground.
  context.fillStyle = "rgba(0, 0, 0, 0.3)";
  context.beginPath();
  context.ellipse(0, 0.5, 8.5, 2.6, 0, 0, Math.PI * 2);
  context.fill();

  // Front wheels: further away, so smaller and higher. They shift when steering.
  context.fillStyle = KART_DARK;
  context.fillRect(-7 + steer * 0.8, -9.5, 2.4, 3.2);
  context.fillRect(4.6 + steer * 0.8, -9.5, 2.4, 3.2);

  // The top of the body, running away from us towards the nose.
  context.fillStyle = KART_BODY_LIGHT;
  context.beginPath();
  context.moveTo(-4.6, -6.5);
  context.lineTo(4.6, -6.5);
  context.lineTo(3.2 + steer * 0.6, -10.8);
  context.lineTo(-3.2 + steer * 0.6, -10.8);
  context.closePath();
  context.fill();

  // Back wheels.
  context.fillStyle = KART_DARK;
  context.fillRect(-8, -5.2, 3.2, 5.4);
  context.fillRect(4.8, -5.2, 3.2, 5.4);

  // The back of the body.
  context.fillStyle = KART_BODY;
  context.beginPath();
  context.moveTo(-5.4, -0.8);
  context.lineTo(5.4, -0.8);
  context.lineTo(4.6, -6.5);
  context.lineTo(-4.6, -6.5);
  context.closePath();
  context.fill();

  // Bumper.
  context.fillStyle = KART_DARK;
  context.fillRect(-5.6, -1.6, 11.2, 1.2);

  // The seat back and the driver's helmet, seen from behind.
  context.fillStyle = "#2c3640";
  context.fillRect(-2.6, -10.6, 5.2, 4.6);
  context.fillStyle = HELMET;
  context.beginPath();
  context.arc(0, -12, 2.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = KART_BODY;
  context.fillRect(-0.5, -14.5, 1, 5); // a stripe down the helmet

  context.restore();
}

// ---- The small map in the corner ----

function drawMinimap(context, trackPicture, track, kart) {
  const width = track.width * MINIMAP_SCALE;
  const height = track.height * MINIMAP_SCALE;
  const left = SCREEN.width - width - MINIMAP_MARGIN;
  const top = MINIMAP_MARGIN;

  context.save();
  // A dark frame, so the map stands out from the track behind it.
  context.fillStyle = "rgba(16, 32, 43, 0.85)";
  context.fillRect(left - 4, top - 4, width + 8, height + 8);
  context.globalAlpha = 0.9;
  context.drawImage(trackPicture, left, top, width, height);
  context.globalAlpha = 1;

  // A dot for the kart.
  context.fillStyle = KART_BODY;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(left + kart.x * MINIMAP_SCALE, top + kart.y * MINIMAP_SCALE, 4, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}
