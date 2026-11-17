// The ground of a track that is drawn as shapes: its pavings, lawns and roads.
//
// ground.js paints most tracks square by square, each square road, grass or
// wall. A track whose look has a "ground" (a list of shapes, see
// nova-lap-ground.js) is painted here instead: every shape is filled with
// its own kind of ground, so that cobbles, smooth slabs, ochre concrete and
// lawn can lie next to each other, and a path can run at a slant.
//
// Each kind of ground is a small square picture that repeats, like a tile
// on a bathroom wall. SURFACES says how each one is painted. Sizes are in
// units of track (on the Nova lap one metre is about 10.7 units).
//
// Nothing here changes how a kart drives. The letters of the track decide that.

/** Numbers that look random but are the same every time (the same idea as in ground.js). */
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

/** Small specks, lighter and darker, so that a flat colour has a grain. */
function specks(c, size, random, count, largest) {
  for (let i = 0; i < count; i++) {
    const speck = 0.5 + random() * largest;
    c.fillStyle = random() < 0.5 ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.09)";
    c.fillRect(random() * size, random() * size, speck, speck * (0.6 + random() * 0.8));
  }
}

/**
 * Patches with no edge at all: each fades out from its middle. For ground
 * that is a little darker here and a little lighter there, as worn concrete is.
 *   rgb    the colour, as "red, green, blue"
 *   alpha  how strong a patch is at its middle: 0 is invisible, 1 is solid
 */
function clouds(c, size, random, count, rgb, alpha, smallest, largest) {
  for (let i = 0; i < count; i++) {
    const x = random() * size;
    const y = random() * size;
    const radius = smallest + random() * (largest - smallest);
    const stretch = 0.5 + random() * 0.9;
    const turn = random() * 3;
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        c.save();
        c.translate(x + dx, y + dy);
        c.rotate(turn);
        c.scale(1, stretch);
        const fade = c.createRadialGradient(0, 0, 0, 0, 0, radius);
        fade.addColorStop(0, `rgba(${rgb}, ${alpha})`);
        fade.addColorStop(0.6, `rgba(${rgb}, ${alpha * 0.55})`);
        fade.addColorStop(1, `rgba(${rgb}, 0)`);
        c.fillStyle = fade;
        c.fillRect(-radius, -radius, radius * 2, radius * 2);
        c.restore();
      }
    }
  }
}

/** Soft round patches of one colour, some hanging over the edge so that the picture repeats without a seam. */
function blotches(c, size, random, count, colour, smallest, largest) {
  c.fillStyle = colour;
  for (let i = 0; i < count; i++) {
    const x = random() * size;
    const y = random() * size;
    const radius = smallest + random() * (largest - smallest);
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        c.beginPath();
        c.ellipse(x + dx, y + dy, radius, radius * (0.5 + random() * 0.4), random() * 3, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
}

/**
 * Every kind of ground:
 *   size    how many units the repeating picture is wide and tall
 *   paint   paint(c, size, random): draws it. Inside, 1 is one unit of track.
 */
export const SURFACES = {
  // Small pale cubes of stone in rows, each a little different: the avenue.
  cobbles: {
    size: 64,
    paint(c, size, random) {
      c.fillStyle = "#8f8a7d";
      c.fillRect(0, 0, size, size);
      const stone = 3.2;
      const shades = ["#bdb6a6", "#c6bfae", "#b2ab9b", "#cbc4b4", "#a9a394"];
      for (let row = 0; row * stone < size; row++) {
        const shift = row % 2 === 0 ? 0 : stone / 2;
        for (let x = -stone; x < size; x += stone) {
          c.fillStyle = shades[Math.floor(random() * shades.length)];
          c.fillRect(x + shift + 0.25, row * stone + 0.25, stone - 0.5, stone - 0.5);
        }
      }
    },
  },

  // Large smooth slabs of limestone, wet and a little shiny.
  slabs: {
    size: 96,
    paint(c, size, random) {
      c.fillStyle = "#a59f8d";
      c.fillRect(0, 0, size, size);
      const shades = ["#d9d3c2", "#dfd9c9", "#d2ccba", "#e3ddce"];
      for (let row = 0; row < 4; row++) {
        const shift = row % 2 === 0 ? 0 : 24;
        for (let x = -48; x < size; x += 48) {
          c.fillStyle = shades[Math.floor(random() * shades.length)];
          c.fillRect(x + shift + 0.3, row * 24 + 0.3, 47.4, 23.4);
        }
      }
      c.fillStyle = "rgba(255, 255, 255, 0.1)";
      blotches(c, size, random, 5, "rgba(255, 255, 255, 0.1)", 10, 22);
    },
  },

  // Flat stones of every shape fitted together: the pavements of the two roads.
  flagstones: {
    size: 96,
    paint(c, size, random) {
      c.fillStyle = "#8a7f64";
      c.fillRect(0, 0, size, size);
      const cell = 8;
      const count = size / cell;
      // Corners of a net of squares, each pushed a little out of place. The
      // last corner of a row is the first again, so the picture repeats.
      const pushes = [];
      for (let j = 0; j < count; j++) {
        pushes.push([]);
        for (let i = 0; i < count; i++) {
          pushes[j].push([(random() - 0.5) * 5.2, (random() - 0.5) * 5.2]);
        }
      }
      const corner = (i, j) => {
        const [dx, dy] = pushes[((j % count) + count) % count][((i % count) + count) % count];
        return [i * cell + dx, j * cell + dy];
      };
      const shades = ["#cfc2a2", "#d8cbac", "#c5b896", "#dccfb2", "#cbbd9b"];
      for (let j = -1; j < count; j++) {
        for (let i = -1; i < count; i++) {
          const corners = [corner(i, j), corner(i + 1, j), corner(i + 1, j + 1), corner(i, j + 1)];
          const middleX = (corners[0][0] + corners[2][0]) / 2;
          const middleY = (corners[0][1] + corners[2][1]) / 2;
          c.fillStyle = shades[Math.floor(random() * shades.length)];
          c.beginPath();
          corners.forEach(([x, y], n) => {
            // Each stone is drawn a little smaller than its place, which leaves the joints.
            const px = middleX + (x - middleX) * 0.88;
            const py = middleY + (y - middleY) * 0.88;
            if (n === 0) {
              c.moveTo(px, py);
            } else {
              c.lineTo(px, py);
            }
          });
          c.closePath();
          c.fill();
        }
      }
    },
  },

  // Ochre concrete in big slabs, darker where the rain has not dried yet.
  ochre: {
    size: 128,
    paint(c, size, random) {
      c.fillStyle = "#cb9645";
      c.fillRect(0, 0, size, size);
      clouds(c, size, random, 7, "232, 184, 104", 0.3, 18, 46); //  dry, paler
      clouds(c, size, random, 7, "150, 98, 36", 0.22, 14, 40); //   still wet, darker
      clouds(c, size, random, 14, "170, 112, 44", 0.16, 4, 12);
      specks(c, size, random, 320, 1.3);
      c.fillStyle = "rgba(95, 62, 20, 0.42)";
      for (let joint = 0; joint < size; joint += 64) {
        c.fillRect(joint, 0, 0.7, size);
        c.fillRect(0, joint, size, 0.7);
      }
      c.fillStyle = "rgba(255, 225, 170, 0.22)"; // the pale edge beside each joint
      for (let joint = 0; joint < size; joint += 64) {
        c.fillRect(joint + 0.7, 0, 0.5, size);
        c.fillRect(0, joint + 0.7, size, 0.5);
      }
    },
  },

  // The wide stairs: steps of terracotta. Each step has a dark edge and a light one.
  steps: {
    size: 32,
    paint(c, size, random) {
      c.fillStyle = "#dc957c";
      c.fillRect(0, 0, size, size);
      specks(c, size, random, 40, 1.4);
      for (let step = 0; step < size; step += 16) {
        c.fillStyle = "#b46c56";
        c.fillRect(0, step, size, 1.7);
        c.fillStyle = "#efb49f";
        c.fillRect(0, step + 1.7, size, 1.1);
      }
    },
  },

  // The floor of the atrium: polished concrete, brown-grey, with a soft shine.
  atrium: {
    size: 128,
    paint(c, size, random) {
      c.fillStyle = "#a69a8a";
      c.fillRect(0, 0, size, size);
      clouds(c, size, random, 8, "200, 186, 164", 0.3, 20, 50);
      clouds(c, size, random, 7, "104, 92, 78", 0.2, 16, 44);
      clouds(c, size, random, 9, "255, 250, 238", 0.14, 5, 14); // where a lamp is mirrored in the polish
      specks(c, size, random, 120, 1.0);
      c.fillStyle = "rgba(70, 60, 50, 0.25)";
      c.fillRect(0, 0, 0.6, size);
      c.fillRect(0, 0, size, 0.6);
    },
  },

  // The ribbed mat in a doorway.
  doormat: {
    size: 16,
    paint(c, size) {
      c.fillStyle = "#3d4043";
      c.fillRect(0, 0, size, size);
      c.fillStyle = "#585c5f";
      for (let rib = 0; rib < size; rib += 2) {
        c.fillRect(rib, 0, 0.9, size);
      }
    },
  },

  // Mown lawn, in broad stripes.
  lawn: {
    size: 64,
    paint(c, size, random) {
      c.fillStyle = "#5c9d4b";
      c.fillRect(0, 0, size, size);
      c.fillStyle = "#65a652";
      c.fillRect(0, 0, size / 2, size);
      for (let i = 0; i < 220; i++) {
        c.fillStyle = random() < 0.5 ? "rgba(150, 200, 110, 0.22)" : "rgba(30, 70, 30, 0.2)";
        c.fillRect(random() * size, random() * size, 0.7 + random() * 1.3, 1.2 + random() * 2);
      }
    },
  },

  asphalt: {
    size: 64,
    paint(c, size, random) {
      c.fillStyle = "#484c51";
      c.fillRect(0, 0, size, size);
      blotches(c, size, random, 5, "rgba(90, 95, 100, 0.25)", 8, 20);
      specks(c, size, random, 260, 1.3);
    },
  },

  // A car park: asphalt with white lines for the bays.
  "car-park": {
    size: 96,
    paint(c, size, random) {
      c.fillStyle = "#5a5e62";
      c.fillRect(0, 0, size, size);
      specks(c, size, random, 300, 1.3);
      c.fillStyle = "rgba(240, 240, 235, 0.75)";
      for (let bay = 0; bay < size; bay += 24) {
        c.fillRect(8, bay, 52, 1.2);
      }
    },
  },

  // Sand and low scrub by the sea.
  verge: {
    size: 64,
    paint(c, size, random) {
      c.fillStyle = "#cdbb8c";
      c.fillRect(0, 0, size, size);
      blotches(c, size, random, 12, "rgba(110, 130, 80, 0.4)", 2, 6);
      specks(c, size, random, 160, 1.6);
    },
  },

  // Dry open land round the campus.
  scrub: {
    size: 64,
    paint(c, size, random) {
      c.fillStyle = "#a9ad80";
      c.fillRect(0, 0, size, size);
      blotches(c, size, random, 10, "rgba(120, 140, 85, 0.45)", 3, 9);
      blotches(c, size, random, 6, "rgba(190, 180, 130, 0.4)", 4, 10);
      specks(c, size, random, 120, 1.6);
    },
  },

  // A strip of very small pale stones, between a road and its pavement.
  setts: {
    size: 32,
    paint(c, size, random) {
      c.fillStyle = "#aaa494";
      c.fillRect(0, 0, size, size);
      const stone = 2;
      for (let y = 0; y < size; y += stone) {
        for (let x = 0; x < size; x += stone) {
          c.fillStyle = random() < 0.5 ? "#d5cfc0" : "#c9c3b3";
          c.fillRect(x + 0.2, y + 0.2, stone - 0.4, stone - 0.4);
        }
      }
    },
  },

  // The frosted glass floors: pale sea-green panes in a metal grid.
  "glass-floor": {
    size: 32,
    paint(c, size, random) {
      c.fillStyle = "#5e9a93";
      c.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 16) {
        for (let x = 0; x < size; x += 16) {
          const pane = c.createLinearGradient(x, y, x + 16, y + 16);
          pane.addColorStop(0, random() < 0.5 ? "#b4e4dc" : "#a8dcd3");
          pane.addColorStop(1, "#8fcfc5");
          c.fillStyle = pane;
          c.fillRect(x + 0.7, y + 0.7, 14.6, 14.6);
        }
      }
    },
  },

  // The sunken way down to the beach tunnel: sand-coloured concrete.
  "ramp-sand": {
    size: 64,
    paint(c, size, random) {
      c.fillStyle = "#b99a55";
      c.fillRect(0, 0, size, size);
      specks(c, size, random, 150, 1.5);
      c.fillStyle = "rgba(70, 50, 15, 0.3)";
      c.fillRect(0, 0, size, 0.8);
      c.fillRect(0, 0, 0.8, size);
    },
  },

  // The way down to a car park: grey concrete with grooves.
  "car-ramp": {
    size: 32,
    paint(c, size) {
      c.fillStyle = "#8d8e8a";
      c.fillRect(0, 0, size, size);
      c.fillStyle = "rgba(40, 40, 40, 0.25)";
      for (let groove = 0; groove < size; groove += 4) {
        c.fillRect(groove, 0, 0.8, size);
      }
    },
  },
};

const keptPictures = new Map();

/**
 * The repeating picture of one kind of ground, "pixels" wide and tall. Each
 * is painted once and kept: the ground close to the kart is painted again
 * many times a second (ground.js) and must not wait for it.
 */
function surfacePicture(name, surface, pixels) {
  const key = `${name} ${pixels}`;
  let picture = keptPictures.get(key);
  if (picture === undefined) {
    picture = document.createElement("canvas");
    picture.width = pixels;
    picture.height = pixels;
    const c = picture.getContext("2d");
    c.scale(pixels / surface.size, pixels / surface.size);
    surface.paint(c, surface.size, scatter(name.length * 7919 + name.charCodeAt(0) * 31));
    keptPictures.set(key, picture);
  }
  return picture;
}

/** The outline of a shape of the ground, in units of track, ready to fill. */
function trace(c, shape, tile) {
  c.beginPath();
  if (shape.rect) {
    const [left, top, right, bottom] = shape.rect;
    c.rect(left * tile, top * tile, (right - left) * tile, (bottom - top) * tile);
  } else {
    shape.poly.forEach(([x, y], i) => (i === 0 ? c.moveTo(x * tile, y * tile) : c.lineTo(x * tile, y * tile)));
    c.closePath();
  }
}

/**
 * Paints the ground of a track from the shapes of its look.
 *   context   a canvas, already set up so that 1 is one unit of track
 *   track     from the "shared" folder
 *   look      its look: ground (the shapes), groundMarks, sun, and the
 *             scenery whose boxes throw shadows
 *   sharp     how many pixels of the canvas make one unit: the repeating
 *             pictures are painted at that sharpness
 *   area      { x, y, width, height } in units: the part of the track the
 *             canvas shows. Left out: all of it.
 */
export function paintGroundShapes(context, track, look, sharp, area = { x: 0, y: 0, width: track.width, height: track.height }) {
  const tile = track.tileSize;
  const patterns = new Map();
  const patternFor = (name) => {
    if (!patterns.has(name)) {
      const surface = SURFACES[name];
      if (surface === undefined) {
        patterns.set(name, "#c0c0c0"); // a kind this version does not know: plain grey rather than nothing
      } else {
        const pixels = Math.max(8, Math.round(surface.size * sharp));
        const pattern = context.createPattern(surfacePicture(name, surface, pixels), "repeat");
        pattern.setTransform(new DOMMatrix().scale(surface.size / pixels));
        patterns.set(name, pattern);
      }
    }
    return patterns.get(name);
  };
  const fill = (shape) => {
    trace(context, shape, tile);
    context.fillStyle = patternFor(shape.surface);
    context.fill();
  };

  // Outdoors first, then the shadows on top of it, then what is indoors:
  // the sun does not shine on the floor of the atrium.
  const indoors = (shape) => shape.indoors === true;
  look.ground.filter((shape) => !indoors(shape)).forEach(fill);
  for (const mark of look.groundMarks ?? []) {
    paintMark(context, mark, tile);
  }
  paintBlockShadows(context, track, look, area);
  look.ground.filter(indoors).forEach(fill);
  paintFootprints(context, track, look);
}

/** Lines painted on the ground: the white dashes of a road, a roundabout. */
function paintMark(context, mark, tile) {
  if (mark.kind === "dashes" || mark.kind === "line") {
    const [fromX, fromY] = mark.from;
    const [toX, toY] = mark.to;
    context.strokeStyle = mark.colour ?? "rgba(240, 240, 232, 0.85)";
    context.lineWidth = (mark.width ?? 0.1) * tile;
    context.setLineDash(mark.kind === "dashes" ? [tile * 1.1, tile * 1.3] : []);
    context.beginPath();
    context.moveTo(fromX * tile, fromY * tile);
    context.lineTo(toX * tile, toY * tile);
    context.stroke();
    context.setLineDash([]);
  } else if (mark.kind === "roundabout") {
    const [x, y] = mark.at;
    context.fillStyle = "#484c51";
    context.beginPath();
    context.arc(x * tile, y * tile, mark.radius * tile, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#d9d3c2";
    context.beginPath();
    context.arc(x * tile, y * tile, mark.radius * 0.56 * tile, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#5c9d4b";
    context.beginPath();
    context.arc(x * tile, y * tile, mark.radius * 0.48 * tile, 0, Math.PI * 2);
    context.fill();
  } else if (mark.kind === "frame") {
    const [left, top, right, bottom] = mark.rect;
    context.strokeStyle = mark.colour ?? "#4f8a83";
    context.lineWidth = (mark.width ?? 0.08) * tile;
    context.strokeRect(left * tile, top * tile, (right - left) * tile, (bottom - top) * tile);
  }
}

const SHADOW_DARKNESS = 0.24;

/**
 * The shadows the boxes of the scenery throw on the ground. A box throws the
 * shape of its foot, pushed away from the sun: a little for its lowest
 * point, more for its top, and everything in between.
 * As in ground.js, the shadows are painted solid on a canvas of their own
 * and laid over the ground all at once, so two that overlap are not twice as dark.
 */
function paintBlockShadows(context, track, look, area) {
  const blocks = look.scenery?.blocks ?? [];
  const reach = look.sun?.reach;
  if (blocks.length === 0 || !reach) {
    return;
  }
  const tile = track.tileSize;
  const perMetre = look.scenery.unitsPerMetre;
  const shadows = document.createElement("canvas");
  shadows.width = Math.max(1, Math.round(area.width)); // one pixel per unit: the soft edge this gives suits a shadow
  shadows.height = Math.max(1, Math.round(area.height));
  const c = shadows.getContext("2d");
  c.translate(-area.x, -area.y);
  c.fillStyle = "#0a141e";
  for (const block of blocks) {
    if (block.shadow === false) {
      continue;
    }
    const [left, top, right, bottom] = block.rect.map((value) => value * tile);
    const low = (block.base ?? 0) * perMetre;
    const high = Math.max(block.top, block.topEnd ?? block.top) * perMetre;
    // The eight corners: the foot pushed by the lowest height and by the highest.
    const corners = [];
    for (const height of [low, high]) {
      for (const [x, y] of [[left, top], [right, top], [right, bottom], [left, bottom]]) {
        corners.push([x + reach.x * height, y + reach.y * height]);
      }
    }
    const outline = hullOf(corners);
    c.beginPath();
    outline.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
    c.closePath();
    c.fill();
  }
  context.save();
  context.globalAlpha = SHADOW_DARKNESS;
  context.drawImage(shadows, area.x, area.y, area.width, area.height);
  context.restore();
}

/** The outline that a rubber band would take round a set of points (their "convex hull"). */
export function hullOf(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const kept = [];
    for (const point of list) {
      while (kept.length >= 2 && turn(kept[kept.length - 2], kept[kept.length - 1], point) <= 0) {
        kept.pop();
      }
      kept.push(point);
    }
    kept.pop();
    return kept;
  };
  return [...half(sorted), ...half(sorted.reverse())];
}

/** The roofs of the boxes that stand on the ground, as seen from straight above. */
function paintFootprints(context, track, look) {
  const tile = track.tileSize;
  const styles = look.scenery?.flatStyles ?? {};
  for (const block of look.scenery?.blocks ?? []) {
    if ((block.base ?? 0) > 0) {
      continue; // a roof to drive under is left out, or the floor below it could not be seen
    }
    const [left, top, right, bottom] = block.rect.map((value) => value * tile);
    context.fillStyle = styles[block.roof ?? "roof"]?.colour ?? "#dfe1e2";
    context.fillRect(left, top, right - left, bottom - top);
    if (right - left > tile && bottom - top > tile) {
      context.strokeStyle = "rgba(255, 255, 255, 0.7)"; // a pale rim round a real building
      context.lineWidth = 2.5;
      context.strokeRect(left + 1.5, top + 1.5, right - left - 3, bottom - top - 3);
    }
  }
}
