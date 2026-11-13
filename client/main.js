// The practice race in the browser.
//
// This file connects the parts:
//   keyboard.js           which keys are held
//   ../shared/race.js     the rules: where the kart is one step later
//   ../shared/countdown.js  the 3, 2, 1, GO! before the race
//   camera.js            which part of the track is on the screen
//   draw.js               the picture of the track and the kart
//   buildings.js          the buildings standing up in the view behind the kart
//   hud.js                the lap counter, the clock and the message
//
// The race runs entirely in this browser. Nothing is sent to the server. Your
// best times are kept in this browser only (records.js), and the camera view
// you start in comes from the menu's settings (settings.js). The track comes
// from the address of the page (track-choice.js): race.html?track=campus-loop
// opens the campus loop, and without a choice it is the test oval. (The
// online page is online.js.)

import { createCountdownRace, stepCountdownRace, countdownAt } from "../shared/countdown.js";
import { STEP_SECONDS } from "../shared/physics.js";
import { currentLap, nextCheckpoint } from "../shared/laps.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { chooseTrack } from "./track-choice.js";
import { storeysOf } from "../shared/tracks/index.js";
import { createKeyboard } from "./keyboard.js";
import { createPainter } from "./draw.js";
import { introShare, startLights, spinTurnOf } from "./scene.js";
import { lookFromChoice, readChoice } from "./kart-choice.js";
import { lookOfTrack } from "./track-looks.js";
import { routePoints, watchForWrongWay, WRONG_WAY_MESSAGE } from "./route.js";
import { watchForMissedCheckpoint, missedCheckpointMessage } from "./checkpoints.js";
import { SEED_COUNT, SPIN_STEPS } from "../shared/hazards.js";
import { createHud } from "./hud.js";
import { followTarget, easeTowards, nextView } from "./camera.js";
import { formatTime } from "./format.js";
import { storageOf } from "./storage.js";
import { readSettings } from "./settings.js";
import { recordFinishedRace } from "./records.js";

const track = chooseTrack(window.location.search);
const character = TEST_DRIVER;

// ---- The parts of the page ----
document.getElementById("track-name").textContent = track.name; // as text, never as HTML
// The buildings of the track stand up in the race view, if the track says
// how many storeys each one has (buildings.js). The test oval has none: it
// gets low barriers along the edge of the road instead.
const draw = createPainter(document.getElementById("track"), track, { storeys: storeysOf(track) });
const showHud = createHud(document);
const messageBox = document.getElementById("message");

/**
 * A number picked by chance, from which the bananas of one race grow
 * (shared/hazards.js). A new one for every race, so no two races have the
 * bananas in the same places.
 */
function newSeed() {
  return Math.floor(Math.random() * SEED_COUNT);
}

// The way round the track, for the "wrong way" warning (route.js).
const wrongWay = watchForWrongWay(routePoints(track, lookOfTrack(track).route));
// Notices when the kart has left a checkpoint out, so the page can say so (checkpoints.js).
const missedCheckpoint = watchForMissedCheckpoint(track);

// ---- The state of the race ----
let race = createCountdownRace(track, newSeed()); // the racer, how far the countdown is, and the bananas
let started = false; //    the countdown starts at the first key press
let lastFrameTime = null;
let waitingSeconds = 0; // real time that has passed but is not yet turned into game steps
let record = null; //      once the race is finished: did it beat your best times? (records.js)

// ---- The state of the camera ----
const storage = storageOf(window); // this browser's storage, for the settings and the best times
// The colours the player chose for their kart in the menu, or null if they
// never chose: the kart then gets the first look (kart-choice.js).
const myLook = lookFromChoice(readChoice(storage));
let view = readSettings(storage).startView; // the view chosen in the menu's settings, or the first one
let camera = followTarget(race.racer.kart, track); // the spot in the middle of the screen, in the follow view

const keyboard = createKeyboard(window, {
  onDrive: start,
  onRestart: startAgain,
  onView: changeView,
});

function start() {
  started = true;
}

function startAgain() {
  race = createCountdownRace(track, newSeed());
  started = false;
  waitingSeconds = 0;
  record = null;
  camera = followTarget(race.racer.kart, track); // jump straight back, do not glide
}

function changeView() {
  view = nextView(view);
  camera = followTarget(race.racer.kart, track);
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
  // Normally the countdown starts in start(), at the first key press. This covers
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
      // During 3, 2 and 1 this only counts down. From GO on it moves the kart.
      race = stepCountdownRace(track, race, input, character);
      waitingSeconds -= STEP_SECONDS;
    }
  }
  const { racer } = race;
  const countdown = countdownAt(race.countdownSteps);

  // The moment the race is finished, compare it with your best times, once.
  if (racer.progress.finished && record === null) {
    record = recordFinishedRace(storage, track, racer.progress.lapSteps);
  }

  // The camera glides towards where it wants to be.
  camera = easeTowards(camera, followTarget(racer.kart, track), frameSeconds);

  // The kart leans in the chase view while the player steers, but not
  // before GO and not after the finish, when the keys do nothing.
  const { progress } = racer;
  const keysWork = started && countdown.racing && !progress.finished;
  const spinning = racer.spinSteps > 0;
  const steer = keysWork && !spinning ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
  // The kart as it is drawn: in the colours the player chose, and turning
  // round and round while it spins after a banana. (The rules do not turn
  // it: after the spin it points where it pointed before.)
  const shownKart = { ...racer.kart, look: myLook, spinTurn: spinTurnOf(racer.spinSteps, SPIN_STEPS) };
  draw(view, shownKart, camera, steer, [], {
    ...sceneFor(race.countdownSteps, started),
    bananas: race.bananas,
    // While the race is on, the next checkpoint is lit up in yellow.
    nextCheckpoint: keysWork ? nextCheckpoint(progress, track) : undefined,
  });

  // A checkpoint that was left out, or driving against the arrows for a
  // moment, brings up a warning. A missed checkpoint comes first: going
  // back for it means driving against the arrows.
  const missed = keysWork ? missedCheckpoint(racer.kart, progress.passed) : null;
  const goingWrongWay = keysWork && !spinning && wrongWay(racer.kart, now / 1000);
  const warning = missed !== null ? missedCheckpointMessage(track, missed) : goingWrongWay ? WRONG_WAY_MESSAGE : null;

  // The countdown is shown as one big number in the middle of the track.
  const showingCountdown = started && countdown.label !== "" && !progress.finished;
  messageBox.classList.toggle("countdown", showingCountdown && warning === null);

  showHud({
    lap: currentLap(progress, track),
    laps: track.laps,
    steps: progress.steps,
    lapSteps: progress.lapSteps,
    view,
    message: warning ?? messageFor(progress, countdown),
  });
  requestAnimationFrame(frame);
}

/**
 * What the picture shows besides the kart: the camera high above the grid
 * until the countdown starts, coming down during 3, 2, 1, and the start lights.
 */
function sceneFor(countdownSteps, hasStarted) {
  if (!hasStarted) {
    return { intro: 0, lights: { red: 0, green: false } };
  }
  const counting = countdownAt(countdownSteps).label !== "";
  return { intro: introShare(counting, countdownSteps), lights: startLights(counting, countdownSteps) };
}

/** The text shown in the middle of the track. */
function messageFor(progress, countdown) {
  if (progress.finished) {
    return `Finished in ${formatTime(progress.steps * STEP_SECONDS)}.${newBestText()} Press R to race again.`;
  }
  if (!started) {
    return "Press an arrow key to start the countdown";
  }
  return countdown.label; // "3", "2", "1", "GO!", and then nothing
}

/** " New best time!" and similar after a finish, or nothing. */
function newBestText() {
  if (record === null) {
    return "";
  }
  if (record.newBestRace) {
    return " New best time!";
  }
  if (record.newBestLap) {
    return " New best lap!";
  }
  return "";
}

// A way to look at the race from the browser's console while tuning the
// driving numbers: type kartGame.state() there. It only gives a copy to look
// at. Changing the copy changes nothing in the race.
window.kartGame = {
  state: () => ({
    started,
    countdownSteps: race.countdownSteps,
    view,
    kart: { ...race.racer.kart },
    spinSteps: race.racer.spinSteps,
    bananas: race.bananas.map((banana) => ({ ...banana })),
    progress: { ...race.racer.progress, lapSteps: [...race.racer.progress.lapSteps] },
  }),
};

requestAnimationFrame(frame);
