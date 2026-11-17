// Painting the scenery: puts the fronts of the buildings on the screen.
//
// scenery.js says where each strip of wall is, as seen from the kart. This
// file paints it: it takes the right part of the wall's picture (wall-art.js)
// and lays it on the screen, larger where the wall is near and smaller where
// it is far, so that a long wall runs away into the distance.
//
// HOW A PICTURE IS LAID ON A WALL
// A canvas can only draw a picture as a slanted rectangle, not narrowing to
// one side. So a strip of wall is drawn as several thin upright slices, each
// with its own height. Thin enough slices look like one wall.
//
// THE PICTURES ARE KEPT IN FOUR SIZES
// A wall far away covers few pixels. Drawing a large picture that small
// makes its lines flicker as the kart moves, so each picture is also kept
// at a half, a quarter and an eighth of its size, and the nearest size is used.

import { chaseNumbers } from "./camera.js";

/** How many pixels a picture has for each metre of wall, at its largest size. */
const PIXELS_PER_METRE = 32;
/** How many smaller copies of each picture are kept. */
const SMALLER_COPIES = 3;
/** A strip is never cut into more slices than this. */
const MOST_SLICES = 150;
/** How bright each side of a building is: the sun stands in the south-west. */
export const LIGHT = { south: 1, west: 0.97, east: 0.86, north: 0.8, fence: 0.95 };

/**
 * Gets the pictures ready for the scenery of one track.
 *   art       the pictures by name (WALL_ART in wall-art.js)
 *   scenery   from createScenery() in scenery.js
 *   haze      the colour that far-away things fade into
 * Gives { paintStrip, paintFlat }.
 */
export function createSceneryPainter(art, scenery, haze) {
  const perUnit = PIXELS_PER_METRE / scenery.unitsPerMetre; // pixels of picture for one unit of track
  const pictures = new Map(); // "name facing" -> the picture in its sizes

  // Paint every picture this track uses now, so the race never has to wait for one.
  for (const strip of scenery.strips) {
    pictureFor(strip.art, strip.facing);
  }

  function pictureFor(name, facing) {
    const key = `${name} ${facing}`;
    let picture = pictures.get(key);
    if (picture === undefined) {
      picture = makePicture(art[name], LIGHT[facing] ?? 1);
      pictures.set(key, picture);
    }
    return picture;
  }

  /** Paints one picture in its four sizes. Gives null for a name that has no picture. */
  function makePicture(recipe, light) {
    if (recipe === undefined) {
      return null;
    }
    const repeats = recipe.period !== undefined;
    const metres = repeats ? recipe.period : recipe.length;
    const width = Math.max(1, Math.round(metres * PIXELS_PER_METRE));
    const height = Math.max(1, Math.round(recipe.height * PIXELS_PER_METRE));
    const once = document.createElement("canvas");
    once.width = width;
    once.height = height;
    const context = once.getContext("2d");
    context.scale(width / metres, height / recipe.height); // from here on, 1 is one metre
    recipe.paint(context, metres, recipe.height);
    context.setTransform(1, 0, 0, 1, 0, 0);
    if (light < 1 && recipe.inside !== true) {
      // A side that the sun does not reach is darker. "source-atop" keeps
      // the see-through parts of a railing see-through.
      context.globalCompositeOperation = "source-atop";
      context.fillStyle = `rgba(18, 28, 44, ${1 - light})`;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = "source-over";
    }
    // A picture that repeats is laid down twice side by side, so that a
    // strip that starts near its end can run on without a seam.
    let full = once;
    if (repeats) {
      full = document.createElement("canvas");
      full.width = width * 2;
      full.height = height;
      const fullContext = full.getContext("2d");
      fullContext.drawImage(once, 0, 0);
      fullContext.drawImage(once, width, 0);
    }
    const sizes = [{ canvas: full, shrink: 1 }];
    for (let i = 1; i <= SMALLER_COPIES; i++) {
      const before = sizes[i - 1].canvas;
      const smaller = document.createElement("canvas");
      smaller.width = Math.max(1, Math.round(before.width / 2));
      smaller.height = Math.max(1, Math.round(before.height / 2));
      const smallerContext = smaller.getContext("2d");
      smallerContext.imageSmoothingQuality = "high";
      smallerContext.drawImage(before, 0, 0, smaller.width, smaller.height);
      sizes.push({ canvas: smaller, shrink: smaller.width / full.width });
    }
    // One colour for the whole picture, for when it is only a pixel wide.
    const dot = sizes[sizes.length - 1].canvas.getContext("2d").getImageData(0, 0, sizes[sizes.length - 1].canvas.width, sizes[sizes.length - 1].canvas.height).data;
    let red = 0;
    let green = 0;
    let blue = 0;
    let solid = 0;
    for (let i = 0; i < dot.length; i += 4) {
      const share = dot[i + 3] / 255;
      red += dot[i] * share;
      green += dot[i + 1] * share;
      blue += dot[i + 2] * share;
      solid += share;
    }
    const average = solid > 0 ? `rgb(${Math.round(red / solid)}, ${Math.round(green / solid)}, ${Math.round(blue / solid)})` : "rgb(200, 200, 200)";
    return {
      sizes,
      average,
      holes: recipe.holes === true,
      fits: recipe.fits === true,
      repeatUnits: repeats ? metres * scenery.unitsPerMetre : null, // after how many units the picture repeats
      lengthUnits: metres * scenery.unitsPerMetre,
      heightUnits: recipe.height * scenery.unitsPerMetre,
    };
  }

  /**
   * Paints one strip of wall.
   *   shape     from sceneryInView(): { a, b, uA, uB, topA, topB, base, highest, art, facing, ahead }
   *   settings  the camera (RACE or CHASE in camera.js)
   */
  function paintStrip(context, shape, settings, screen) {
    const picture = pictureFor(shape.art, shape.facing);
    const { horizonY, growthPerRow, depth } = chaseNumbers(settings);
    const eyeHeight = 1 / growthPerRow;
    const middle = screen.width / 2;
    // Where a spot on the strip lands: "share" 0 is its left end, 1 its right end.
    let { a, b, uA, uB, topA, topB } = shape;
    const place = (share) => {
      const ahead = a.ahead + (b.ahead - a.ahead) * share;
      const sideways = a.sideways + (b.sideways - a.sideways) * share;
      const scale = 1 / (1 / settings.kartScale + ahead / depth);
      return { x: middle + sideways * scale, foot: horizonY + scale * eyeHeight, scale };
    };
    if (place(1).x < place(0).x) {
      // A fence seen from behind: turn it round, so that we still paint from left to right.
      [a, b] = [b, a];
      [uA, uB] = [uB, uA];
      [topA, topB] = [topB, topA];
    }
    const left = place(0);
    const right = place(1);
    const width = right.x - left.x;
    if (!(width > 0.02)) {
      return;
    }
    const { base, highest } = shape;
    const sloping = topA !== topB;
    const mist = Math.min(4, Math.max(0, Math.floor((shape.ahead - 350) / 320))); // further away is paler

    // The outline of the strip, with its real top. Used for a sloping top,
    // for a strip too small for a picture, and for the haze.
    const outline = () => {
      context.beginPath();
      context.moveTo(left.x, left.foot - base * left.scale);
      context.lineTo(right.x + 0.6, right.foot - base * right.scale);
      context.lineTo(right.x + 0.6, right.foot - topB * right.scale);
      context.lineTo(left.x, left.foot - topA * left.scale);
      context.closePath();
    };

    if (picture === null || width < 1.3) {
      outline();
      context.fillStyle = picture === null ? "#c9ccce" : picture.average;
      context.fill();
    } else {
      if (sloping) {
        context.save();
        outline();
        context.clip();
      }
      // The size of picture that suits: about one pixel of picture for one pixel of screen.
      const needed = Math.max(width / Math.max(1e-6, Math.abs(uB - uA)), (left.scale + right.scale) / 2);
      let chosen = picture.sizes[0];
      for (const size of picture.sizes) {
        if (size.shrink * perUnit >= needed * 0.8) {
          chosen = size;
        }
      }
      const pixels = chosen.shrink * perUnit; // pixels of this size of picture for one unit of track
      // Which rows of the picture: a picture that "fits" is stretched from
      // the foot to the top; any other keeps its own heights above the ground.
      const fromTop = picture.fits ? 0 : Math.max(0, (picture.heightUnits - highest) * pixels);
      const rows = picture.fits ? chosen.canvas.height : Math.min(chosen.canvas.height - fromTop, (highest - base) * pixels);
      const tallLeft = (highest - base) * left.scale;
      const tallRight = (highest - base) * right.scale;
      const slices = Math.max(1, Math.min(MOST_SLICES, Math.ceil(width), Math.ceil(Math.max(Math.abs(tallRight - tallLeft) / 3, width / 48))));
      let from = left;
      let uFrom = uA;
      for (let i = 1; i <= slices; i++) {
        const share = i / slices;
        const to = i === slices ? right : place(share);
        const uTo = uA + (uB - uA) * share;
        if (to.x >= 0 && from.x <= screen.width) {
          // Which columns of the picture. A repeating picture starts again after each period.
          let start = Math.min(uFrom, uTo);
          const span = Math.abs(uTo - uFrom);
          if (picture.repeatUnits !== null) {
            start = ((start % picture.repeatUnits) + picture.repeatUnits) % picture.repeatUnits;
          } else if (picture.fits) {
            start = Math.min(Math.max(0, start), picture.lengthUnits - span);
          }
          const topFrom = from.foot - highest * from.scale;
          const topTo = to.foot - highest * to.scale;
          const tall = ((highest - base) * (from.scale + to.scale)) / 2;
          const wide = to.x - from.x;
          // A slanted rectangle: its top edge runs from topFrom to topTo.
          // A fence seen from behind is drawn the other way round, like a
          // sign read from its back.
          const slant = (topTo - topFrom) / wide;
          if (uTo < uFrom) {
            context.setTransform(-1, -slant, 0, 1, to.x + 0.6, topTo);
          } else {
            context.setTransform(1, slant, 0, 1, from.x, topFrom);
          }
          context.drawImage(chosen.canvas, start * pixels, fromTop, Math.max(0.5, span * pixels), Math.max(1, rows), 0, 0, wide + 0.6, tall);
        }
        from = to;
        uFrom = uTo;
      }
      context.setTransform(1, 0, 0, 1, 0, 0);
      if (sloping) {
        context.restore();
      }
    }

    if (mist > 0 && !(picture?.holes === true)) {
      outline();
      context.globalAlpha = mist * 0.14;
      context.fillStyle = haze;
      context.fill();
      context.globalAlpha = 1;
    }
  }

  /** Paints one piece of a roof or of an underside, in its colour. */
  function paintFlat(context, shape) {
    context.beginPath();
    shape.points.forEach(([x, y], i) => (i === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
    context.closePath();
    context.fillStyle = shape.colour;
    context.fill();
    context.strokeStyle = shape.colour; // a thin line in the same colour closes the gaps between squares
    context.lineWidth = 1;
    context.stroke();
  }

  return { paintStrip, paintFlat };
}
