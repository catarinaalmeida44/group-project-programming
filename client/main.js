// The practice race in the browser.
//
// This file connects the parts:
//   keyboard.js           which keys are held
//   ../shared/race.js     the rules: where the kart is one step later
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
import { paintTrack, drawFrame } from "./draw.js";
import { formatTime } from "./format.js";

const track = TEST_OVAL;
const character = TEST_DRIVER;

// ---- The parts of the page ----
const canvas = document.getElementById("track");
canvas.width = track.width;
canvas.height = track.height;
const context = canvas.getContext("2d");
const trackPicture = paintTrack(track);

const lapText = document.getElementById("lap");
const lapsText = document.getElementById("laps");
const timeText = document.getElementById("time");
const lapTimesText = document.getElementById("lap-times");
const messageText = document.getElementById("message");

// ---- The state of the race ----
let racer = createRacer(track);
let started = false; //    the clock starts at the first key press
let lastFrameTime = null;
let waitingSeconds = 0; // real time that has passed but is not yet turned into game steps

const keyboard = createKeyboard(window, startAgain, start);

function start() {
  started = true;
}

function startAgain() {
  racer = createRacer(track);
  started = false;
  waitingSeconds = 0;
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

  if (started && lastFrameTime !== null) {
    // Never try to catch up more than a quarter of a second, for example
    // after the player switched to another tab and came back.
    waitingSeconds += Math.min((now - lastFrameTime) / 1000, 0.25);
    while (waitingSeconds >= STEP_SECONDS) {
      racer = stepRacer(track, racer, keyboard.input(), character);
      waitingSeconds -= STEP_SECONDS;
    }
  }
  lastFrameTime = now;

  drawFrame(context, trackPicture, racer.kart);
  showNumbers();
  requestAnimationFrame(frame);
}

/** Fills in the lap, the time, the lap times and the message. */
function showNumbers() {
  const { progress } = racer;
  lapText.textContent = currentLap(progress, track);
  lapsText.textContent = track.laps;
  timeText.textContent = formatTime(raceSeconds(progress));

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
    kart: { ...racer.kart },
    progress: { ...racer.progress, lapSteps: [...racer.progress.lapSteps] },
  }),
};

requestAnimationFrame(frame);
