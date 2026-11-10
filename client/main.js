// The practice race in the browser.
//
// This file connects the parts:
//   keyboard.js           which keys are held
//   ../shared/race.js     the rules: where the kart is one step later
//   camera.js             which part of the track is on the screen
//   draw.js               the picture of the track and the kart
//   hud.js                the lap counter, the clock and the message
//
// The race runs entirely in this browser. Nothing is sent to the server and
// nothing is saved. (The online page is online.js.)

import { createRacer, stepRacer } from "../shared/race.js";
import { STEP_SECONDS } from "../shared/physics.js";
import { currentLap } from "../shared/laps.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { createKeyboard } from "./keyboard.js";
import { createPainter } from "./draw.js";
import { createHud } from "./hud.js";
import { VIEWS, followTarget, easeTowards, nextView } from "./camera.js";
import { formatTime } from "./format.js";

const track = TEST_OVAL;
const character = TEST_DRIVER;

// ---- The parts of the page ----
const draw = createPainter(document.getElementById("track"), track);
const showHud = createHud(document);

// ---- The state of the race ----
let racer = createRacer(track);
let started = false; //    the clock starts at the first key press
let lastFrameTime = null;
let waitingSeconds = 0; // real time that has passed but is not yet turned into game steps

// ---- The state of the camera ----
let view = VIEWS[0]; // the game starts in the first view of the list in camera.js
let camera = followTarget(racer.kart, track); // the spot in the middle of the screen, in the follow view

const keyboard = createKeyboard(window, {
  onDrive: start,
  onRestart: startAgain,
  onView: changeView,
});

function start() {
  started = true;
}

function startAgain() {
  racer = createRacer(track);
  started = false;
  waitingSeconds = 0;
  camera = followTarget(racer.kart, track); // jump straight back, do not glide
}

function changeView() {
  view = nextView(view);
  camera = followTarget(racer.kart, track);
}

/**
 * Runs once for every picture the screen shows (usually 60 times a second).
 *
 * Screens do not all refresh at the same speed, and a busy computer can skip
 * pictures. The rules, though, must always move in steps of exactly one
 * sixtieth of a second. So we measure how much real time has passed and run
 * as many whole steps as fit in it. What is left over waits for next time.
 */
function frame(now) {
  // Normally the race starts in start(), at the first key press. This covers
  // one more case: the player pressed R while still holding an arrow key.
  if (!started && keyboard.isDriving()) {
    start();
  }

  // Real time since the last picture. Never more than a quarter of a second,
  // for example after the player switched to another tab and came back.
  const frameSeconds = lastFrameTime === null ? 0 : Math.min((now - lastFrameTime) / 1000, 0.25);
  lastFrameTime = now;

  const input = keyboard.input();
  if (started) {
    waitingSeconds += frameSeconds;
    while (waitingSeconds >= STEP_SECONDS) {
      racer = stepRacer(track, racer, input, character);
      waitingSeconds -= STEP_SECONDS;
    }
  }

  // The camera glides towards where it wants to be.
  camera = easeTowards(camera, followTarget(racer.kart, track), frameSeconds);

  // The kart leans in the chase view while the player steers.
  const { progress } = racer;
  const steer = progress.finished ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  draw(view, racer.kart, camera, steer);

  showHud({
    lap: currentLap(progress, track),
    laps: track.laps,
    steps: progress.steps,
    lapSteps: progress.lapSteps,
    view,
    message: messageFor(progress),
  });
  requestAnimationFrame(frame);
}

/** The text shown in the middle of the track. */
function messageFor(progress) {
  if (progress.finished) {
    return `Finished in ${formatTime(progress.steps * STEP_SECONDS)}. Press R to race again.`;
  }
  if (!started) {
    return "Press an arrow key to start";
  }
  return "";
}

// A way to look at the race from the browser's console while tuning the
// driving numbers: type kartGame.state() there. It only gives a copy to look
// at. Changing the copy changes nothing in the race.
window.kartGame = {
  state: () => ({
    started,
    view,
    kart: { ...racer.kart },
    progress: { ...racer.progress, lapSteps: [...racer.progress.lapSteps] },
  }),
};

requestAnimationFrame(frame);
