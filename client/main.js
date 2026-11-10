// The practice race in the browser.
//
// This file connects the parts:
//   keyboard.js           which keys are held
//   ../shared/race.js     the rules: where the kart is one step later
//   camera.js             which part of the track is on the screen
//   draw.js               the picture of the track and the kart
//   format.js             the race time as text
//
// The race runs entirely in this browser. Nothing is sent to the server and
// nothing is saved.

import { createRacer, stepRacer } from "../shared/race.js";
import { STEP_SECONDS } from "../shared/physics.js";
import { raceSeconds, currentLap } from "../shared/laps.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { createKeyboard } from "./keyboard.js";
import { createPainter } from "./draw.js";
import { followTarget, easeTowards, nextView } from "./camera.js";
import { formatTime } from "./format.js";

const track = TEST_OVAL;
const character = TEST_DRIVER;

// What each camera view is called on the page.
const VIEW_NAMES = {
  follow: "From above",
  chase: "Behind the kart",
  map: "Whole track",
};

// ---- The parts of the page ----
const draw = createPainter(document.getElementById("track"), track);
const lapText = document.getElementById("lap");
const lapsText = document.getElementById("laps");
const timeText = document.getElementById("time");
const viewText = document.getElementById("view");
const lapTimesText = document.getElementById("lap-times");
const messageText = document.getElementById("message");

// ---- The state of the race ----
let racer = createRacer(track);
let started = false; //    the clock starts at the first key press
let lastFrameTime = null;
let waitingSeconds = 0; // real time that has passed but is not yet turned into game steps

// ---- The state of the camera ----
let view = "follow";
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
  const steer = racer.progress.finished ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  draw(view, racer.kart, camera, steer);
  showNumbers();
  requestAnimationFrame(frame);
}

/** Fills in the lap, the time, the lap times, the camera name and the message. */
function showNumbers() {
  const { progress } = racer;
  lapText.textContent = currentLap(progress, track);
  lapsText.textContent = track.laps;
  timeText.textContent = formatTime(raceSeconds(progress));
  viewText.textContent = VIEW_NAMES[view];

  // The time each finished lap took: the step count at its end, minus the
  // step count at the end of the lap before.
  const lapTimes = progress.lapSteps.map((endStep, index) => {
    const startStep = index === 0 ? 0 : progress.lapSteps[index - 1];
    return `Lap ${index + 1}: ${formatTime((endStep - startStep) * STEP_SECONDS)}`;
  });
  lapTimesText.textContent = lapTimes.join("   ");

  if (progress.finished) {
    messageText.textContent = `Finished in ${formatTime(raceSeconds(progress))}. Press R to race again.`;
  } else if (!started) {
    messageText.textContent = "Press an arrow key to start";
  } else {
    messageText.textContent = "";
  }
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
