// The camera: which part of the track is on the screen, and how it is shown.
//
// This file is only arithmetic. It works out positions and sizes, and
// draw.js does the painting. Keeping the arithmetic apart lets us test it.
//
// There are three views. The V key switches between them.
//   "chase"   From behind and above the kart, tilted: ground further ahead
//             is drawn smaller and higher on the screen. The track turns
//             around the kart, so the kart always drives "up" the screen.
//   "follow"  From straight above, zoomed in, moving with the kart.
//             North stays up and the kart turns on the screen.
//   "map"     The whole track at once.
//
// The camera changes nothing about how a kart moves. That is decided by the
// rules in the "shared" folder, which are the same in every view.

/** The views, in the order V goes through them. The game starts in the first one. */
export const VIEWS = ["chase", "follow", "map"];

/** The size of the picture, in pixels. */
export const SCREEN = { width: 960, height: 576 };

// ---------------------------------------------------------------------------
// NUMBERS TO TUNE BY EYE
// ---------------------------------------------------------------------------

export const FOLLOW = {
  zoom: 2, //               one unit of track is drawn as 2 pixels
  lookAheadSeconds: 0.25, // the camera aims at where the kart will be this much later
  quickness: 6, //          how fast the camera catches up; higher is stiffer
};

export const CHASE = {
  kartScreenY: 450, // the row of the screen the kart sits on (0 is the top)
  kartScale: 5, //     pixels per unit of track, at the kart
  farShrink: 0.4, //   ground at the top of the screen is drawn at 40% of that size. Lower is more tilted
  viewAhead: 340, //   how many units of track can be seen ahead of the kart
};

// ---------------------------------------------------------------------------

/** The view that comes after this one when V is pressed. After the last comes the first. */
export function nextView(view) {
  const position = VIEWS.indexOf(view);
  return VIEWS[(position + 1) % VIEWS.length];
}

// ---- The "follow" view ----

/**
 * The spot on the track that the follow view would like in the middle of
 * the screen: a little ahead of the kart, in the direction it is moving.
 * Near the edge of the track the camera stops, so the screen never shows
 * what lies outside the track.
 */
export function followTarget(kart, track, settings = FOLLOW, screen = SCREEN) {
  const halfWidth = screen.width / settings.zoom / 2;
  const halfHeight = screen.height / settings.zoom / 2;
  return {
    x: keepInside(kart.x + kart.vx * settings.lookAheadSeconds, halfWidth, track.width - halfWidth),
    y: keepInside(kart.y + kart.vy * settings.lookAheadSeconds, halfHeight, track.height - halfHeight),
  };
}

/** Keeps a value between two limits. If the limits cross (a track smaller than the screen), gives the middle. */
function keepInside(value, lowest, highest) {
  if (lowest > highest) {
    return (lowest + highest) / 2;
  }
  return Math.min(Math.max(value, lowest), highest);
}

/**
 * Moves the camera part of the way from where it is to where it wants to
 * be. Moving only part of the way each time makes the camera glide instead
 * of jerking. "seconds" is the time since the last picture, so the glide is
 * the same on fast and slow screens.
 */
export function easeTowards(current, target, seconds, quickness = FOLLOW.quickness) {
  const share = seconds > 0 ? 1 - Math.exp(-quickness * seconds) : 0; // from 0 (stay) to 1 (arrive)
  return {
    x: current.x + (target.x - current.x) * share,
    y: current.y + (target.y - current.y) * share,
  };
}

// ---- The "chase" view ----
//
// The tilt is made with one simple idea: the size things are drawn at grows
// in a straight line from the top of the screen to the bottom. Ground near
// the bottom is close to the camera and drawn big. Ground near the top is
// far away and drawn small.

/** Works out the numbers the tilted view needs from its settings. */
export function chaseNumbers(settings = CHASE) {
  const { kartScreenY, kartScale, farShrink, viewAhead } = settings;
  if (!(farShrink > 0 && farShrink < 1)) {
    throw new RangeError("Camera: farShrink must be above 0 and below 1");
  }
  // The horizon is the row where the size would shrink to nothing. With
  // these settings it lies above the top of the screen, so no sky is seen.
  const horizonY = (-farShrink * kartScreenY) / (1 - farShrink);
  // How much the size grows for each row further down the screen.
  const growthPerRow = kartScale / (kartScreenY - horizonY);
  // Links size to distance, chosen so that the top row shows the ground
  // that lies "viewAhead" units ahead of the kart.
  const depth = viewAhead / (1 / (farShrink * kartScale) - 1 / kartScale);
  return { horizonY, growthPerRow, depth };
}

/**
 * For one row of the screen in the chase view:
 *   scale  how many pixels one unit of track is drawn as, on that row
 *   ahead  how far ahead of the kart the ground on that row is (negative = behind it)
 */
export function chaseRow(y, settings = CHASE) {
  const { horizonY, growthPerRow, depth } = chaseNumbers(settings);
  const scale = (y - horizonY) * growthPerRow;
  return { scale, ahead: depth * (1 / scale - 1 / settings.kartScale) };
}

/**
 * Where a spot on the ground appears on the screen in the chase view.
 *   ahead     units ahead of the kart
 *   sideways  units to the right of the kart
 * Gives { x, y, scale }, or null if the spot is behind the camera.
 * (Used to place other karts and objects. chaseRow() is the same sum the
 * other way round.)
 */
export function chasePoint(ahead, sideways, settings = CHASE, screen = SCREEN) {
  const { horizonY, growthPerRow, depth } = chaseNumbers(settings);
  const oneOverScale = 1 / settings.kartScale + ahead / depth;
  if (!(oneOverScale > 0)) {
    return null;
  }
  const scale = 1 / oneOverScale;
  return {
    x: screen.width / 2 + sideways * scale,
    y: horizonY + scale / growthPerRow,
    scale,
  };
}

/**
 * Which side of another kart we are looking at in the chase view.
 *   myAngle     the direction our own kart points (the camera looks the same way)
 *   theirAngle  the direction the other kart points
 * Gives one of four words:
 *   "back"   it points the way we do, so we see it from behind
 *   "front"  it points towards us
 *   "right"  it points to our right, so we see its side with the nose on the right
 *   "left"   it points to our left
 */
export function sideSeen(myAngle, theirAngle) {
  // How far the other kart is turned compared with us, from half a turn left to half a turn right.
  const turned = Math.atan2(Math.sin(theirAngle - myAngle), Math.cos(theirAngle - myAngle));
  const eighth = Math.PI / 4;
  if (Math.abs(turned) <= eighth) {
    return "back";
  }
  if (Math.abs(turned) >= 3 * eighth) {
    return "front";
  }
  return turned > 0 ? "right" : "left";
}

/** Where a spot of the track is, seen from the kart: units ahead of it and units to its right. */
export function seenFromKart(kart, x, y) {
  const dx = x - kart.x;
  const dy = y - kart.y;
  const cos = Math.cos(kart.angle);
  const sin = Math.sin(kart.angle);
  return {
    ahead: dx * cos + dy * sin,
    sideways: -dx * sin + dy * cos,
  };
}
