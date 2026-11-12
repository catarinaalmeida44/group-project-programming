// The sky of the race view, and what is on the horizon.
//
// The ground is painted by ground.js, up to the horizon. Everything above
// the horizon is painted here: the blue of the sky, the sun, a few clouds,
// and far-away things such as hills or the sea.
//
// The sky does not move when the kart drives. It only turns when the camera
// turns: a cloud is in one direction, like a compass point, and slides
// sideways across the screen as the camera swings round. That turning is
// the one thing here that needs arithmetic, and it is in "acrossScreen".

import { chaseNumbers } from "./camera.js";

const TURN = Math.PI * 2;

/** An angle brought into the range from half a turn left (-3.14) to half a turn right (3.14). */
function shortWay(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * Where something in a given direction appears across the screen.
 *   towards   the direction it lies in, as an angle on the map
 *   looking   the direction the camera looks
 *   depth     the strength of the camera's lens (camera.js)
 * Gives the x position in pixels, or null if it is behind the camera.
 */
export function acrossScreen(towards, looking, depth, screenWidth) {
  const off = shortWay(towards - looking); // how far to the right of straight ahead
  if (Math.abs(off) >= 1.45) {
    return null; // to the side or behind
  }
  return screenWidth / 2 + depth * Math.tan(off);
}

/** The direction that a column of the screen looks in: the reverse of acrossScreen. */
export function directionOfColumn(x, looking, depth, screenWidth) {
  return looking + Math.atan((x - screenWidth / 2) / depth);
}

/**
 * Paints the sky and the horizon.
 *   looking   the direction the camera looks, as an angle on the map
 *   settings  the camera (RACE or CHASE in camera.js)
 *   sky, far  from the track's look (track-looks.js)
 *   seconds   time, to let the clouds drift very slowly
 * When the horizon is above the top of the screen, as in the high view at
 * the start of a race, there is no sky to paint and nothing happens.
 */
export function paintSky(context, looking, settings, screen, look, seconds = 0) {
  const { horizonY, depth } = chaseNumbers(settings);
  if (horizonY <= 0) {
    return;
  }
  const { sky, far } = look;
  const bottom = Math.min(horizonY + 1, screen.height);

  // The blue: deep at the top, pale near the horizon.
  const blue = context.createLinearGradient(0, 0, 0, bottom);
  blue.addColorStop(0, sky.top);
  blue.addColorStop(1, sky.low);
  context.fillStyle = blue;
  context.fillRect(0, 0, screen.width, bottom);

  // The sun, with a soft glow round it.
  const sunX = acrossScreen(sky.sunTowards, looking, depth, screen.width);
  if (sunX !== null) {
    const sunY = horizonY * (1 - sky.sunHeight);
    const glow = context.createRadialGradient(sunX, sunY, 4, sunX, sunY, 150);
    glow.addColorStop(0, "rgba(255, 252, 235, 0.95)");
    glow.addColorStop(0.12, "rgba(255, 246, 205, 0.75)");
    glow.addColorStop(0.4, "rgba(255, 240, 190, 0.22)");
    glow.addColorStop(1, "rgba(255, 240, 190, 0)");
    context.fillStyle = glow;
    context.fillRect(sunX - 150, sunY - 150, 300, 300);
  }

  // Clouds: each sits in its own direction, spread evenly round the sky,
  // and each is a few overlapping puffs.
  for (let i = 0; i < sky.clouds; i++) {
    const towards = (i / sky.clouds) * TURN + i * 0.37 + seconds * 0.004;
    const x = acrossScreen(towards, looking, depth, screen.width);
    if (x === null || x < -220 || x > screen.width + 220) {
      continue;
    }
    const y = horizonY * (0.2 + ((i * 37) % 50) / 100);
    const size = 0.75 + ((i * 53) % 60) / 100;
    paintCloud(context, x, y, size);
  }

  // The horizon: hills, sea or a town, each in its stretch of directions.
  const step = 6; // pixels: the width of one column
  for (const band of far) {
    if (band.kind === "town") {
      paintTown(context, band, looking, depth, screen, horizonY);
      continue;
    }
    context.fillStyle = band.colour;
    context.beginPath();
    let open = false;
    for (let x = 0; x <= screen.width + step; x += step) {
      const towards = directionOfColumn(x, looking, depth, screen.width);
      if (!isBetween(towards, band.from, band.to)) {
        if (open) {
          context.lineTo(x - step, horizonY + 1);
          open = false;
        }
        continue;
      }
      // The sea is a flat line just above the ground. Hills roll: their
      // height is a mix of slow waves, so it repeats every full turn.
      const height =
        band.kind === "sea"
          ? 3
          : band.height * (0.55 + 0.25 * Math.sin(towards * 3 + 1) + 0.2 * Math.sin(towards * 7 + 2.4)) + 3;
      if (!open) {
        context.moveTo(x, horizonY + 1);
        open = true;
      }
      context.lineTo(x, horizonY + 1 - height);
    }
    if (open) {
      context.lineTo(screen.width + step, horizonY + 1);
    }
    context.closePath();
    context.fill();
  }

  // Single things on the horizon: a fort, a lighthouse out at sea.
  for (const landmark of look.landmarks ?? []) {
    const x = acrossScreen(landmark.towards, looking, depth, screen.width);
    if (x !== null && x > -120 && x < screen.width + 120) {
      paintLandmark(context, landmark.kind, x, horizonY + 1);
    }
  }

  // A pale band right on the horizon, where the air is hazy.
  const mist = context.createLinearGradient(0, horizonY - 46, 0, horizonY + 1);
  mist.addColorStop(0, hazy(look.haze, 0));
  mist.addColorStop(1, hazy(look.haze, 0.62));
  context.fillStyle = mist;
  context.fillRect(0, horizonY - 46, screen.width, 47);
}

/**
 * A town on the horizon: a row of small pale houses with coloured roofs.
 * Each house has its own direction, so the row slides sideways as the
 * camera turns, and each has a height of its own that never changes.
 */
function paintTown(context, band, looking, depth, screen, horizonY) {
  const houses = 150; // houses in a full turn
  const first = Math.floor(directionOfColumn(0, looking, depth, screen.width) / (TURN / houses)) - 1;
  const last = Math.ceil(directionOfColumn(screen.width, looking, depth, screen.width) / (TURN / houses)) + 1;
  for (let house = first; house <= last; house++) {
    const towards = (house * TURN) / houses;
    if (!isBetween(towards, band.from, band.to)) {
      continue;
    }
    const left = acrossScreen(towards, looking, depth, screen.width);
    const right = acrossScreen(towards + TURN / houses, looking, depth, screen.width);
    if (left === null || right === null) {
      continue;
    }
    // A number from 0 to 1 that belongs to this house, the same every time.
    const number = ((house % houses) + houses) % houses;
    const own = ((number * 7919) % 97) / 97;
    if (own < 0.18) {
      continue; // a gap between houses
    }
    const height = band.height * (0.55 + own * 0.75);
    context.fillStyle = band.colour;
    context.fillRect(left, horizonY + 1 - height, right - left + 0.5, height);
    context.fillStyle = band.roof;
    context.fillRect(left - 0.5, horizonY + 1 - height - 2, right - left + 1.5, 2.6);
  }
}

/** One far-away thing standing on the horizon at x, with its foot at "ground". */
function paintLandmark(context, kind, x, ground) {
  if (kind === "fort") {
    // A long, low wall of dark stone with slanting ends, red roofs behind
    // it, and a small lighthouse tower.
    context.fillStyle = "#6f6a5f";
    context.beginPath();
    context.moveTo(x - 70, ground);
    context.lineTo(x - 58, ground - 11);
    context.lineTo(x + 58, ground - 11);
    context.lineTo(x + 70, ground);
    context.closePath();
    context.fill();
    context.fillStyle = "#b5593c";
    context.fillRect(x - 34, ground - 16, 30, 5);
    context.fillRect(x + 6, ground - 15, 22, 4);
    context.fillStyle = "#f1ede2";
    context.fillRect(x - 3, ground - 30, 5, 19);
    context.fillStyle = "#c0392b";
    context.fillRect(x - 4, ground - 33, 7, 3.4);
  } else if (kind === "lighthouse") {
    // A small round fort in the water with a tower in the middle.
    context.fillStyle = "#8b8576";
    context.fillRect(x - 9, ground - 5, 18, 5);
    context.fillStyle = "#f1ede2";
    context.fillRect(x - 1.5, ground - 15, 3, 10);
    context.fillStyle = "#c0392b";
    context.fillRect(x - 2.2, ground - 17, 4.4, 2.2);
  }
}

/** Is a direction inside the stretch that goes clockwise from "from" to "to"? Works across the full turn. */
export function isBetween(towards, from, to) {
  const length = (((to - from) % TURN) + TURN) % TURN || TURN;
  const along = (((towards - from) % TURN) + TURN) % TURN;
  return along <= length;
}

function paintCloud(context, x, y, size) {
  const puffs = [
    [-52, 6, 30],
    [-20, -8, 38],
    [18, -2, 34],
    [50, 8, 26],
    [0, 12, 44],
  ];
  context.fillStyle = "rgba(255, 255, 255, 0.86)";
  context.beginPath();
  for (const [dx, dy, radius] of puffs) {
    context.moveTo(x + dx * size + radius * size, y + dy * size);
    context.ellipse(x + dx * size, y + dy * size, radius * size, radius * size * 0.52, 0, 0, TURN);
  }
  context.fill();
}

/** A colour such as "#aabbcc" with a see-through share: 0 is invisible, 1 is solid. */
function hazy(colour, alpha) {
  const part = (start) => parseInt(colour.slice(start, start + 2), 16);
  return `rgba(${part(1)}, ${part(3)}, ${part(5)}, ${alpha})`;
}
