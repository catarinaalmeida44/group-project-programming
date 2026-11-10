// Drawing: turns the track and the kart into a picture on the page.
//
// The picture is drawn on a "canvas", a rectangle of the page that code can
// paint on. One unit of the track is one pixel of the canvas, so a kart at
// x=100, y=50 is drawn 100 pixels from the left and 50 from the top.
//
// Nothing here decides how the kart moves. This file only shows what the
// rules in the "shared" folder have worked out.

const COLOURS = {
  "#": "#22303c", // wall
  ".": "#565d68", // road
  ",": "#3c8a4b", // grass
};
const KART_BODY = "#e23d3d";
const KART_NOSE = "#ffd166";
const KART_WHEELS = "#15191d";

/**
 * Paints the whole track once, on a hidden canvas, and gives that picture
 * back. The track never changes, so it would be a waste to paint every tile
 * again for every frame. drawFrame() just copies this picture.
 */
export function paintTrack(track) {
  const picture = document.createElement("canvas");
  picture.width = track.width;
  picture.height = track.height;
  const context = picture.getContext("2d");
  const size = track.tileSize;

  for (let row = 0; row < track.rows; row++) {
    for (let column = 0; column < track.columns; column++) {
      context.fillStyle = COLOURS[track.map[row][column]];
      context.fillRect(column * size, row * size, size, size);
    }
  }

  paintFinishLine(context, track);
  return picture;
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
      context.fillStyle = isWhite ? "#f2f5f7" : "#15191d";
      context.fillRect(x, y, square, square);
    }
  }
}

/** Draws one frame: the track picture, then the kart on top of it. */
export function drawFrame(context, trackPicture, kart) {
  context.drawImage(trackPicture, 0, 0);
  drawKart(context, kart);
}

/** Draws the kart as a small car seen from above, turned to the direction it points. */
function drawKart(context, kart) {
  context.save();
  // Move the "pen" to the kart and turn it, so the kart can be drawn as if
  // it were at 0,0 pointing right.
  context.translate(kart.x, kart.y);
  context.rotate(kart.angle);

  context.fillStyle = KART_WHEELS;
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
