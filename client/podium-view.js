// Painting the podium scene (podium-shape.js) on the race picture.
//
// The race pages (main.js, online.js) call paint() for every picture while
// the podium is shown, instead of drawing the race.
//
// Where it stands:
//   - on a track that has a spot for it ("podium" in its look, such as the
//     Nova lap in front of the school's name), the podium stands on the
//     track itself, and the race view (draw.js) paints it among the walls
//     and trees there, seen by the race camera
//   - on any other track, in a hall of its own with a NOVA SBE sign This file only paints,
// so it is checked by eye in a browser. What it paints, and who stands
// where, is in podium-shape.js and podium.js, which have tests.

import { paintScene, prepareParts, viewerBehind } from "./kart-paint.js";
import { hallParts, hallLabels, podiumMoving, podiumGroups, crowdSpots } from "./podium-shape.js";
import { lookOfTrack } from "./track-looks.js";
import { cameraPullBack } from "./podium.js";

const CONFETTI_COLOURS = ["#e23d3d", "#f0c330", "#2f7fe0", "#3fb563", "#e667a8", "#f4f6f8"];
const CONFETTI_PIECES = 160;
/**
 * The camera for the podium on a track, in the form of RACE in camera.js:
 * closer than the race camera and a little higher, so the drivers are big
 * and the school's name on the wall behind them is in the picture.
 */
const TRACK_CAMERA = Object.freeze({ kartScreenY: 625, kartScale: 12, horizonY: 230, depth: 600, viewAhead: 1700 }); // both heights 45 lower than at first, so the school's name on the wall is whole, with room above it; // kartScale was 9: bigger drivers since the evening of 18 November 2026
/** The camera turns this far to each side, slowly, so the scene feels alive. In radians. */
const SWING = 0.08;

/**
 * Makes the painter of the podium for a track.
 *   track  the track that was raced
 *   draw   the race view's painter (createPainter in draw.js), for a track
 *          with a spot for the podium
 * Gives { paint(context, screen, lineup, seconds, caption), onTrack }:
 *   context  the 2D drawing context of the race picture
 *   screen   { width, height } of the picture
 *   lineup   from podiumLineup() in podium.js
 *   seconds  how long the podium has been shown
 *   caption  the line of text under the picture, or ""
 * "onTrack" says whether the podium stands on the track itself.
 */
export function createPodiumView(track = null, draw = null) {
  const spot = track === null || draw === null ? null : (lookOfTrack(track).podium ?? null);
  const hall = prepareParts(hallParts()); // worked out once: none of it moves
  const labels = hallLabels();
  const crowd = crowdSpots();
  const pictures = new Map(); // the head pictures, loaded once each

  function pictureOf(address) {
    if (address === null) {
      return null;
    }
    if (!pictures.has(address)) {
      const image = new Image();
      image.src = address; // one of our own pictures, from client/heads
      pictures.set(address, image);
    }
    return pictures.get(address);
  }

  function paint(context, screen, lineup, seconds, caption) {
    const drivers = lineup.map((driver) => ({ ...driver, picture: pictureOf(driver.head) }));
    if (spot !== null) {
      paintOnTrack(drivers, seconds);
    } else {
      paintInHall(context, screen, drivers, seconds);
    }
    paintConfetti(context, screen, seconds);
    if (caption !== "") {
      paintCaption(context, screen, caption);
    }
  }

  /**
   * The podium on the track: each group stands where it belongs in front of
   * the spot, the whole podium facing the camera. The camera is the race
   * camera, behind a kart that is not painted, standing at the spot's
   * "camera" and looking at the podium.
   */
  function paintOnTrack(drivers, seconds) {
    const size = track.tileSize;
    const [column, row] = spot.at;
    const [cameraColumn, cameraRow] = spot.camera;
    const middle = { x: column * size, y: row * size };
    // The camera comes in: it starts several times further away along the
    // same line, and ends at the spot's "camera" (cameraPullBack in podium.js).
    const back = cameraPullBack(seconds);
    const watcher = { x: (column + (cameraColumn - column) * back) * size, y: (row + (cameraRow - row) * back) * size };
    const facing = Math.atan2(middle.y - watcher.y, middle.x - watcher.x); // from the camera to the podium
    const towardsCamera = facing + Math.PI; //                            the podium looks back at the camera
    const cos = Math.cos(towardsCamera);
    const sin = Math.sin(towardsCamera);
    const groups = podiumGroups(drivers, seconds, crowd).map((group) => {
      const [x, y] = group.at;
      return { ...group, x: middle.x + x * cos - y * sin, y: middle.y + x * sin + y * cos, angle: towardsCamera };
    });
    const cameraKart = { ...watcher, angle: facing, vx: 0, vy: 0, place: 0 };
    draw("chase", cameraKart, cameraKart, 0, [], { intro: 1, lights: { red: 0, green: true }, podium: groups, hideOwnKart: true, camera: TRACK_CAMERA });
  }

  function paintInHall(context, screen, drivers, seconds) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    // The atrium: light from the glass roof, a warm floor further down.
    const sky = context.createLinearGradient(0, 0, 0, screen.height);
    sky.addColorStop(0, "#f7f5f0");
    sky.addColorStop(1, "#cfc8bc");
    context.fillStyle = sky;
    context.fillRect(0, 0, screen.width, screen.height);

    // The camera: in front of the podium, a little above the drivers' heads.
    const camera = {
      kartScreenY: screen.height * 0.9,
      // Smaller at first and growing: the camera comes in here too.
      kartScale: screen.height / 52 / (1 + (cameraPullBack(seconds) - 1) * 0.45),
      horizonY: screen.height * 0.1,
      depth: 900,
      viewAhead: 100,
    };
    const turn = Math.PI + Math.sin(seconds * 0.35) * SWING;
    const viewer = viewerBehind({ ahead: 6, sideways: 0 }, turn, Math.PI, camera, screen);

    const moving = podiumMoving(drivers, seconds, crowd);
    paintScene(context, viewer, { parts: [...hall, ...moving.parts], shadows: moving.shadows });
    paintLabels(context, viewer);
  }

  /** The words: on the wall and on the steps, as big as they are in the hall. */
  function paintLabels(context, viewer) {
    if (viewer === null) {
      return;
    }
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (const label of labels) {
      const spot = viewer.place(...label.point);
      if (spot === null) {
        continue;
      }
      context.font = `900 ${Math.round(label.size * spot.scale)}px "Segoe UI", Arial, sans-serif`;
      context.fillStyle = label.colour;
      context.fillText(label.text, spot.x, spot.y);
    }
    context.restore();
  }

  return { paint, onTrack: spot !== null };
}

/**
 * Confetti falling from the roof: each piece always falls along the same
 * path, worked out from its number, so it needs nothing remembered.
 */
function paintConfetti(context, screen, seconds) {
  context.save();
  for (let i = 0; i < CONFETTI_PIECES; i++) {
    const speed = 60 + ((i * 37) % 50); //        pixels a second
    const start = (i * 997) % screen.height; //   so the pieces do not all start at the top together
    const y = ((start + seconds * speed) % (screen.height + 40)) - 20;
    const x = ((i * 131) % screen.width) + Math.sin(seconds * 1.7 + i) * 18;
    context.translate(x, y);
    context.rotate(seconds * 3 + i);
    context.fillStyle = CONFETTI_COLOURS[i % CONFETTI_COLOURS.length];
    context.fillRect(-4, -2, 8, 4);
    context.setTransform(1, 0, 0, 1, 0, 0);
  }
  context.restore();
}

/** The line of results on a dark band at the bottom of the picture. */
function paintCaption(context, screen, caption) {
  const band = Math.round(screen.height * 0.085);
  context.save();
  context.fillStyle = "rgba(13, 24, 33, 0.82)";
  context.fillRect(0, screen.height - band, screen.width, band);
  context.fillStyle = "#f4f6f8";
  context.font = `700 ${Math.round(band * 0.4)}px "Segoe UI", Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(caption, screen.width / 2, screen.height - band / 2, screen.width - 24);
  context.restore();
}
