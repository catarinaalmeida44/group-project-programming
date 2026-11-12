// The ground: the picture of the track that the karts drive on.
//
// Two jobs:
//   1. Paint the whole track once, from straight above, on a hidden canvas:
//      road, grass, kerbs, the start line, the starting grid, arrows that
//      show the way. The track never changes, so this is done once when the
//      page opens. The two map views copy from this picture.
//   2. For the race view, lay that picture down flat and look along it, so
//      that the road runs away towards a horizon (paintTilted below).
//
// Nothing here decides how a kart moves. Where the walls, the road and the
// grass are comes from the track in the "shared" folder. How they are
// coloured comes from the track's "look" (track-looks.js).

import { chaseNumbers } from "./camera.js";

/** The hidden picture is never larger than this many pixels along a side. */
const LARGEST_PICTURE = 4096;
/** Pixels per unit of track in the hidden picture, on a track small enough to allow it. */
const BEST_SHARPNESS = 3;
/** How many smaller copies of the picture are kept, each half the size of the one before. */
const SMALLER_COPIES = 5;

const KERB_WIDTH = 5; //   units
const EDGE_LINE = 2; //    units: the white line where road meets grass
const LINE_WHITE = "#f4f6f8";
const LINE_DARK = "#14181d";

/**
 * Paints the ground of a track and gets it ready for both kinds of view.
 *   track  from the "shared" folder
 *   look   the colours and markings of this track (track-looks.js)
 *   grid   where the starting places are: a list of { x, y, angle }
 * Gives { picture, sharpness, paintTilted }.
 */
export function createGround(track, look, grid) {
  const sharpness = Math.min(BEST_SHARPNESS, LARGEST_PICTURE / track.width, LARGEST_PICTURE / track.height);
  const picture = document.createElement("canvas");
  picture.width = Math.round(track.width * sharpness);
  picture.height = Math.round(track.height * sharpness);
  const context = picture.getContext("2d");
  context.scale(picture.width / track.width, picture.height / track.height); // from here on, draw in units of track

  paintTiles(context, track, look);
  paintEdges(context, track, look);
  paintArrows(context, track, look);
  paintStartLine(context, track);
  paintGrid(context, grid);

  // Smaller copies of the picture. Far away, a big piece of ground lands on
  // very few pixels of the screen. Taking it from a small copy, in which
  // the colours are already blended, stops it from flickering as it moves.
  const copies = [picture];
  for (let i = 1; i <= SMALLER_COPIES; i++) {
    const before = copies[i - 1];
    const smaller = document.createElement("canvas");
    smaller.width = Math.max(1, Math.round(before.width / 2));
    smaller.height = Math.max(1, Math.round(before.height / 2));
    const smallerContext = smaller.getContext("2d");
    smallerContext.imageSmoothingQuality = "high";
    smallerContext.drawImage(before, 0, 0, smaller.width, smaller.height);
    copies.push(smaller);
  }

  // How many pixels of each copy make one unit of track.
  const perUnit = copies.map((copy) => ({ x: copy.width / track.width, y: copy.height / track.height }));

  let patterns = null; // made the first time they are needed, for the canvas that asks
  let patternsFor = null;
  const matrix = new DOMMatrix();

  /**
   * Paints the ground of the race view: everything below the horizon.
   *   context   the canvas of the page
   *   spot      { x, y, angle }: the place on the track that the camera
   *             follows (the kart) and the direction the camera looks
   *   settings  the camera (RACE or CHASE in camera.js)
   *   screen    the size of the picture
   *
   * HOW: the screen is filled one row of pixels at a time. Each row shows a
   * thin strip of ground at one distance from the camera. For that row we
   * work out how large the ground is drawn there, lay the track picture
   * under the row turned and sized to match, and fill the row from it.
   * Rows near the horizon show ground far away, drawn small. Rows near the
   * bottom show ground close by, drawn large. Together that is the tilt.
   */
  function paintTilted(context, spot, settings, screen) {
    const { horizonY, growthPerRow, depth } = chaseNumbers(settings);
    if (patternsFor !== context) {
      patterns = copies.map((copy) => context.createPattern(copy, "no-repeat"));
      patternsFor = context;
    }
    const firstRow = Math.max(0, Math.floor(horizonY) + 1);

    // Under the track: the colour of the land beyond the edge of the map.
    context.fillStyle = look.beyond;
    context.fillRect(0, firstRow, screen.width, screen.height - firstRow);

    const cos = Math.cos(spot.angle);
    const sin = Math.sin(spot.angle);
    const alongKart = spot.x * cos + spot.y * sin;
    const acrossKart = spot.x * sin - spot.y * cos;
    context.imageSmoothingEnabled = true;

    for (let y = firstRow; y < screen.height; y++) {
      // How large the ground is drawn on this row, sideways and along the road.
      const scale = (y + 0.5 - horizonY) * growthPerRow;
      const ahead = depth * (1 / scale - 1 / settings.kartScale);
      if (ahead > look.seeGroundTo) {
        continue; // too far to tell anything apart: the haze covers it
      }
      const squeezed = (scale * scale) / (growthPerRow * depth);

      // The copy of the picture whose pixels are closest in size to what
      // this row needs.
      const needed = Math.sqrt(scale * squeezed);
      let copy = 0;
      while (copy < SMALLER_COPIES && perUnit[copy + 1].x >= needed) {
        copy++;
      }
      const across = perUnit[copy].x; // pixels of this copy per unit of track, across the picture
      const down = perUnit[copy].y; //   and down it

      // Where a pixel (u, v) of that copy lands on the screen:
      //   x = a*u + c*v + e      y = b*u + d*v + f
      matrix.a = (-scale * sin) / across;
      matrix.c = (scale * cos) / down;
      matrix.e = screen.width / 2 + scale * acrossKart;
      matrix.b = (-squeezed * cos) / across;
      matrix.d = (-squeezed * sin) / down;
      matrix.f = y + 0.5 + squeezed * (alongKart + ahead);
      patterns[copy].setTransform(matrix);
      context.fillStyle = patterns[copy];
      context.fillRect(0, y, screen.width, 1);
    }

    // Haze: the ground fades into the colour of the horizon far away. It
    // hides the edge of the world and makes distances easier to judge.
    const hazeDepth = Math.min(150, screen.height - firstRow);
    if (horizonY > -hazeDepth) {
      const haze = context.createLinearGradient(0, horizonY, 0, horizonY + hazeDepth);
      haze.addColorStop(0, look.haze);
      haze.addColorStop(0.25, withAlpha(look.haze, 0.55));
      haze.addColorStop(1, withAlpha(look.haze, 0));
      context.fillStyle = haze;
      context.fillRect(0, firstRow, screen.width, hazeDepth);
    }
  }

  return { picture, sharpness, paintTilted };
}

// ---------------------------------------------------------------------------
// Painting the picture from above
// ---------------------------------------------------------------------------

/** A small source of numbers that look random but are the same every time, so the track looks the same on every visit. */
function scatter(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const isWallAt = (track, column, row) =>
  column < 0 || row < 0 || column >= track.columns || row >= track.rows || track.map[row][column] === "#";
const kindAt = (track, column, row) => (isWallAt(track, column, row) ? "#" : track.map[row][column]);

/**
 * Every square in its colour. Each kind of ground has two shades that are
 * almost the same, in a chequered pattern: it is faint, but it slides past
 * as the kart moves, and that is what shows speed. On top come specks, so
 * the ground has a grain when seen from close by.
 */
function paintTiles(context, track, look) {
  const size = track.tileSize;
  const random = scatter(2477);
  for (let row = 0; row < track.rows; row++) {
    for (let column = 0; column < track.columns; column++) {
      const letter = track.map[row][column];
      const kind = letter === "#" ? look.wall : letter === "." ? look.road : look.grass;
      const left = column * size;
      const top = row * size;
      context.fillStyle = kind.shades[(row + column) % 2];
      // Slightly wider and taller than the square, so no hairline gaps show between squares.
      context.fillRect(left, top, size + 0.5, size + 0.5);

      // Specks: small patches a little lighter or darker than the ground.
      for (let i = 0; i < kind.specks; i++) {
        const speckSize = 0.8 + random() * kind.speckSize;
        context.fillStyle = random() < 0.5 ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.09)";
        context.fillRect(left + random() * (size - speckSize), top + random() * (size - speckSize), speckSize, speckSize * (0.6 + random() * 0.8));
      }

      // Paving has joints: thin lines that cut each square into slabs.
      if (kind.joints > 0) {
        context.fillStyle = "rgba(0, 0, 0, 0.1)";
        for (let joint = 0; joint < size; joint += kind.joints) {
          context.fillRect(left + joint, top, 0.6, size);
          context.fillRect(left, top + joint, size, 0.6);
        }
      }

      // Mown grass: every other square has faint stripes.
      if (kind.stripes && (row + column) % 2 === 0) {
        context.fillStyle = "rgba(255, 255, 255, 0.035)";
        for (let stripe = 0; stripe < size; stripe += 8) {
          context.fillRect(left + stripe, top, 4, size);
        }
      }
    }
  }
}

/**
 * The edges of the road. Where road meets a wall: a red and white striped
 * kerb on the wall's side, so you can see where the track ends. Where road
 * meets grass: a white line along the edge of the road.
 */
function paintEdges(context, track, look) {
  const size = track.tileSize;
  for (let row = 0; row < track.rows; row++) {
    for (let column = 0; column < track.columns; column++) {
      const here = kindAt(track, column, row);
      const left = column * size;
      const top = row * size;
      // The four neighbours: [kind next door, then a strip along that side: x, y, width, height].
      const strip = (width) => [
        [kindAt(track, column, row - 1), left, top, size, width],
        [kindAt(track, column, row + 1), left, top + size - width, size, width],
        [kindAt(track, column - 1, row), left, top, width, size],
        [kindAt(track, column + 1, row), left + size - width, top, width, size],
      ];
      if (here === "#" && look.kerbs) {
        for (const [neighbour, x, y, width, height] of strip(KERB_WIDTH)) {
          if (neighbour !== "#") {
            paintStripes(context, x, y, width, height, size / 2, look.kerbColours);
          }
        }
      }
      if (here === "." && look.edgeLines) {
        context.fillStyle = "rgba(244, 246, 248, 0.8)";
        for (const [neighbour, x, y, width, height] of strip(EDGE_LINE)) {
          if (neighbour === ",") {
            context.fillRect(x, y, width, height);
          }
        }
      }
    }
  }
}

/** Fills a strip with stripes of two colours, running along its longer side. */
function paintStripes(context, x, y, width, height, stripe, colours) {
  const alongX = width >= height;
  const length = alongX ? width : height;
  for (let start = 0; start < length; start += stripe) {
    const position = (alongX ? x : y) + start;
    context.fillStyle = colours[Math.round(position / stripe) % 2];
    if (alongX) {
      context.fillRect(position, y, stripe, height);
    } else {
      context.fillRect(x, position, width, stripe);
    }
  }
}

/**
 * Arrows on the road that show the way round, along the track's "route":
 * a list of points through the middle of the road, in the order they are
 * driven. A track without a route gets no arrows.
 */
function paintArrows(context, track, look) {
  if (!Array.isArray(look.route) || look.route.length < 2) {
    return;
  }
  const size = track.tileSize;
  const points = look.route.map(([column, row]) => ({ x: (column + 0.5) * size, y: (row + 0.5) * size }));
  const gap = look.arrowGap; // units between two arrows
  let untilNext = gap / 2;
  context.fillStyle = look.arrowColour;
  for (let i = 0; i < points.length; i++) {
    const from = points[i];
    const to = points[(i + 1) % points.length];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    let travelled = untilNext;
    while (travelled < length) {
      const x = from.x + ((to.x - from.x) * travelled) / length;
      const y = from.y + ((to.y - from.y) * travelled) / length;
      // Only on the road itself, and not too near a bend, where the arrow would point across it.
      const onRoad = kindAt(track, Math.floor(x / size), Math.floor(y / size)) === ".";
      if (onRoad && travelled > 30 && length - travelled > 30) {
        paintArrow(context, x, y, angle);
      }
      travelled += gap;
    }
    untilNext = travelled - length;
  }
}

/** One arrow: a chevron, pointing along "angle". */
function paintArrow(context, x, y, angle) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.beginPath();
  context.moveTo(9, 0);
  context.lineTo(-5, -13);
  context.lineTo(-11, -13);
  context.lineTo(3, 0);
  context.lineTo(-11, 13);
  context.lineTo(-5, 13);
  context.closePath();
  context.fill();
  context.restore();
}

/**
 * The start and finish line: a black and white chequered band across the
 * road. It is painted on the edge of the finish checkpoint that a kart
 * reaches first, because that is the moment a lap is counted (laps.js).
 */
function paintStartLine(context, track) {
  const line = track.checkpoints[0];
  const size = track.tileSize;
  const square = size / 8;
  const band = square * 3; // three rows of small squares
  // Which way is the track driven here? Along x or along y, forwards or backwards.
  const alongX = Math.abs(Math.cos(track.start.angle)) >= Math.abs(Math.sin(track.start.angle));
  const forwards = alongX ? Math.cos(track.start.angle) > 0 : Math.sin(track.start.angle) > 0;

  const area = alongX
    ? { x: forwards ? line.left : line.right - band, y: line.top, width: band, height: line.bottom - line.top }
    : { x: line.left, y: forwards ? line.top : line.bottom - band, width: line.right - line.left, height: band };

  for (let y = area.y; y < area.y + area.height - 0.01; y += square) {
    for (let x = area.x; x < area.x + area.width - 0.01; x += square) {
      const column = Math.floor((x + square / 2) / size);
      const row = Math.floor((y + square / 2) / size);
      if (kindAt(track, column, row) !== ".") {
        continue; // only on the road, not on the grass beside it
      }
      const isWhite = (Math.round(x / square) + Math.round(y / square)) % 2 === 0;
      context.fillStyle = isWhite ? LINE_WHITE : LINE_DARK;
      context.fillRect(x, y, square + 0.2, square + 0.2);
    }
  }
}

/**
 * The starting grid: a white bracket on the road at every starting place,
 * open at the back, like the boxes painted on a real grid, with the number
 * of the place behind it.
 */
function paintGrid(context, grid) {
  grid.forEach((spot, place) => {
    context.save();
    context.translate(spot.x, spot.y);
    context.rotate(spot.angle);
    context.fillStyle = "rgba(244, 246, 248, 0.92)";
    context.fillRect(11, -9.5, 1.8, 19); //   the front of the box, across the road
    context.fillRect(2, -9.5, 10.8, 1.6); //  its left side
    context.fillRect(2, 7.9, 10.8, 1.6); //   its right side
    // The number, lying on the road so that it reads from behind.
    context.rotate(Math.PI / 2);
    context.font = "bold 9px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "rgba(244, 246, 248, 0.7)";
    context.fillText(String(place + 1), 0, 7);
    context.restore();
  });
}

/** A colour such as "#aabbcc" with a see-through share: 0 is invisible, 1 is solid. */
function withAlpha(colour, alpha) {
  const part = (start) => parseInt(colour.slice(start, start + 2), 16);
  return `rgba(${part(1)}, ${part(3)}, ${part(5)}, ${alpha})`;
}
