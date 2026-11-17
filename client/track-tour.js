// The track tour: flies the race camera round a track along its arrows.
//
// A page for the team (track-tour.html), not part of the game: it lets us
// look at a track and its buildings without having to drive, and compare
// them with the real place. Nothing here races, counts laps or keeps times.
//
// A pretend kart glides along the track's route (the points the arrows
// follow, in track-looks.js) at a steady speed, turning smoothly at each
// bend, and the same painter as in a race (draw.js) shows what its driver
// would see.

import { chooseTrack } from "./track-choice.js";
import { storeysOf } from "../shared/tracks/index.js";
import { createPainter } from "./draw.js";
import { lookOfTrack } from "./track-looks.js";
import { routePoints } from "./route.js";
import { nextView } from "./camera.js";
import { walkersToShow } from "./street-life.js";
import { createWalkers, DOWN_STEPS } from "../shared/walkers.js";
import { rampAt, JUMP_STEPS } from "../shared/ramps.js";

/** How fast the tour glides at first, in units per second, and the limits the arrow keys keep it within. */
const FIRST_SPEED = 170;
const SLOWEST = 40;
const FASTEST = 520;
/** How far before and after a bend the pretend kart turns, in units. */
const TURN_OVER = 70;

const track = chooseTrack(window.location.search);
const points = routePoints(track, lookOfTrack(track).route);
const canvas = document.getElementById("track");
const draw = createPainter(canvas, track, { storeys: storeysOf(track) });
document.getElementById("tour-name").textContent = track.name; // as text, never as HTML
const placeText = document.getElementById("tour-place");

// The route as stretches: where each starts, how long it is, which way it runs.
const stretches = [];
let lapLength = 0;
if (points !== null) {
  points.forEach((from, i) => {
    const to = points[(i + 1) % points.length];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    stretches.push({ from, to, length, startsAt: lapLength, angle: Math.atan2(to.y - from.y, to.x - from.x) });
    lapLength += length;
  });
}

/** Where the pretend kart is after "distance" units of the lap: { x, y, angle }. */
export function placeAt(distance) {
  if (stretches.length === 0) {
    return { ...track.start };
  }
  const along = ((distance % lapLength) + lapLength) % lapLength;
  const number = stretches.findIndex((stretch) => along < stretch.startsAt + stretch.length);
  const stretch = stretches[number === -1 ? stretches.length - 1 : number];
  const done = along - stretch.startsAt;
  const share = stretch.length > 0 ? done / stretch.length : 0;
  // Near a bend, turn part of the way towards the stretch before or after.
  const before = stretches[(stretches.indexOf(stretch) - 1 + stretches.length) % stretches.length];
  const after = stretches[(stretches.indexOf(stretch) + 1) % stretches.length];
  const turnTowards = (from, to, part) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * part;
  let angle = stretch.angle;
  const turnOver = Math.min(TURN_OVER, stretch.length / 2);
  if (done < turnOver) {
    angle = turnTowards(stretch.angle, before.angle, 0.5 * (1 - done / turnOver));
  } else if (stretch.length - done < turnOver) {
    angle = turnTowards(stretch.angle, after.angle, 0.5 * (1 - (stretch.length - done) / turnOver));
  }
  return {
    x: stretch.from.x + (stretch.to.x - stretch.from.x) * share,
    y: stretch.from.y + (stretch.to.y - stretch.from.y) * share,
    angle,
  };
}

// ---- The state of the tour ----
const asked = Number(new URLSearchParams(window.location.search).get("at"));
let distance = Number.isFinite(asked) ? asked : 0; // how far round the lap the camera is, in units
let speed = FIRST_SPEED;
let moving = !new URLSearchParams(window.location.search).has("at"); // an address with "at" opens standing still
let view = "chase";
let lastTime = null;

let fixed = null; // a spot chosen with lookFrom() below, shown instead of the tour until a key is pressed
let airSteps = 0; // the pretend kart hops when the tour crosses a ramp, to show what a jump looks like

/**
 * The walkers of the track, to look at: they walk by this page's own clock,
 * and each sits down for a moment every so often, as if a kart had bumped
 * into it. (In a race the rules decide that: shared/walkers.js.)
 */
function tourWalkers() {
  const steps = Math.floor((performance.now() / 1000) * 60);
  return walkersToShow(
    track,
    createWalkers(track).map((walker, number) => {
      const sinceBump = (steps + number * 300) % 1500; // every 25 seconds, each at its own moment
      return { time: steps, downSteps: sinceBump < DOWN_STEPS ? DOWN_STEPS - sinceBump : 0 };
    }),
  );
}

function show() {
  const place = fixed ?? placeAt(distance);
  const kart = { ...place, vx: Math.cos(place.angle) * speed, vy: Math.sin(place.angle) * speed, id: 0, air: airSteps };
  draw(view, kart, { x: kart.x, y: kart.y }, 0, [], { walkers: tourWalkers() });
  const size = track.tileSize;
  placeText.textContent = `${Math.round(distance)} of ${Math.round(lapLength)} units round the lap, at column ${Math.floor(place.x / size)}, row ${Math.floor(place.y / size)}`;
}

function frame(now) {
  const seconds = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  if (moving) {
    distance = (distance + speed * seconds) % Math.max(1, lapLength);
  }
  // Crossing a ramp starts a hop. It counts down in steps of the game: 60 a second.
  const here = fixed ?? placeAt(distance);
  if (airSteps <= 0 && moving && rampAt(track, here.x, here.y) !== null) {
    airSteps = JUMP_STEPS;
  }
  airSteps = Math.max(0, airSteps - seconds * 60);
  show();
  window.requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  fixed = null;
  if (event.key === " ") {
    moving = !moving;
  } else if (event.key === "ArrowRight") {
    distance += 60;
  } else if (event.key === "ArrowLeft") {
    distance -= 60;
  } else if (event.key === "ArrowUp") {
    speed = Math.min(FASTEST, speed * 1.25);
  } else if (event.key === "ArrowDown") {
    speed = Math.max(SLOWEST, speed / 1.25);
  } else if (event.key === "v" || event.key === "V") {
    view = nextView(view);
  } else {
    return;
  }
  event.preventDefault(); // the arrow keys and the space bar would otherwise scroll the page
});

// For looking at one exact spot (and for whoever checks the page with a
// script): put the camera somewhere and paint one picture at once.
window.trackTour = {
  lapLength,
  goTo(newDistance) {
    distance = newDistance;
    fixed = null;
    moving = false;
    show();
  },
  /** Stand anywhere on the track, in squares of the map, looking along "angle". */
  lookFrom(column, row, angle) {
    fixed = { x: column * track.tileSize, y: row * track.tileSize, angle };
    moving = false;
    show();
  },
};

show();
window.requestAnimationFrame(frame);
