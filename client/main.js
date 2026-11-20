// The practice race in the browser.
//
// This file connects the parts:
//   keyboard.js           which keys are held
//   ../shared/race.js     the rules: where the kart is one step later
//   ../shared/countdown.js  the 3, 2, 1, GO! before the race
//   ../shared/practice-race.js  the race: the player against computer karts
//   ../shared/computer-driver.js  how the computer karts decide what to do
//   camera.js            which part of the track is on the screen
//   draw.js               the picture of the track and the kart
//   buildings.js          the buildings standing up in the view behind the kart
//   hud.js                the lap counter, the clock and the message
//   podium.js, podium-view.js  the podium when the race is over
//
// The race runs entirely in this browser. While it runs, nothing is sent to
// the server. When the player finishes, the result is reported once, so
// that it counts in a signed-in player's own stats (account-api.js,
// saveSingleResult). The server cannot check a race it did not run, so such
// a result never counts for the shared leaderboard.
// The player races against computer karts, which drive by the same rules and
// choose their own keys (utility AI, see computer-driver.js). Your
// best times are also kept in this browser (records.js), and the camera view
// you start in comes from the menu's settings (settings.js). The track comes
// from the address of the page (track-choice.js): race.html?track=campus-loop
// opens the campus loop, and without a choice it is the test oval. (The
// online page is online.js.)

import { countdownAt } from "../shared/countdown.js";
import { createPracticeRace, stepPracticeRace, placesInput, COMPUTER_KARTS } from "../shared/practice-race.js";
import { STEP_SECONDS } from "../shared/physics.js";
import { currentLap, nextCheckpoint } from "../shared/laps.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { chooseTrack, chooseTrackName } from "./track-choice.js";
import { storeysOf } from "../shared/tracks/index.js";
import { createKeyboard } from "./keyboard.js";
import { setUpFullScreen } from "./full-screen.js";
import { readGameChoice, saveGameChoice, settingsSummary } from "./game-settings-view.js";
import { createSettingsCard } from "./game-settings-card.js";
import { createPainter } from "./draw.js";
import { createFlyOver, FLY_SPEED } from "./fly-over.js";
import { introShare, startLights, spinTurnOf } from "./scene.js";
import { lookFromChoice, readChoice } from "./kart-choice.js";
import { readCharacter, lookOfCharacter } from "./cast-choice.js";
import { lookOfTrack } from "./track-looks.js";
import { walkersToShow, walkersDownNear } from "./street-life.js";
import { routePoints, watchForWrongWay, WRONG_WAY_MESSAGE } from "./route.js";
import { placeLine } from "./standings.js";
import { watchForMissedCheckpoint, missedCheckpointMessage } from "./checkpoints.js";
import { SEED_COUNT, SPIN_STEPS } from "../shared/hazards.js";
import { createHud } from "./hud.js";
import { followTarget, easeTowards, nextView } from "./camera.js";
import { formatTime } from "./format.js";
import { storageOf } from "./storage.js";
import { setUpHowToPlay } from "./how-to-play.js";
import { readTimeOfDay } from "./time-of-day.js";
import { readSettings } from "./settings.js";
import { recordFinishedRace, finishedRaceTimes } from "./records.js";
import { accountApi } from "./account-api.js";
import { singleSavedText } from "./stats-view.js";
import { kartToWatchAfterFinish, finishedBanner } from "./race-view.js";
import { createRaceSound } from "./sound.js";
import { createPageMusic } from "./music.js";
import { raceMoment } from "./music-cues.js";
import { createUiSound } from "./ui-sound.js";
import { readSwitches, toggleMaster } from "./audio-switches.js";
import { tileKindAt } from "../shared/track.js";
import { podiumLineup, podiumLoser, podiumKartsOf, singleRaceIsOver, podiumCaption, cheersDue, finishPlace, finishedWords } from "./podium.js";
import { createPodiumView } from "./podium-view.js";

const track = chooseTrack(window.location.search);
const trackShortName = chooseTrackName(window.location.search); // such as "nova-lap": the name results are saved under
const character = TEST_DRIVER;

// ---- The parts of the page ----
document.getElementById("track-name").textContent = track.name; // as text, never as HTML
// The buildings of the track stand up in the race view, if the track says
// how many storeys each one has (buildings.js). The test oval has none: it
// gets low barriers along the edge of the road instead.
const trackCanvas = document.getElementById("track");
// The time of day chosen in Settings: only the picture changes (time-of-day.js).
const draw = createPainter(trackCanvas, track, { storeys: storeysOf(track), timeOfDay: readTimeOfDay(storageOf(window)) });
const podium = createPodiumView(track, draw); // the podium, painted on the same picture when the race is over (podium-view.js)
const showHud = createHud(document);
const messageBox = document.getElementById("message");
const placeBox = document.getElementById("place-box");
const placeText = document.getElementById("place");
// When the race is over: "Race again" and "Back to menu", as buttons on the picture.
const raceOverBox = document.getElementById("race-over");
const raceOverNote = document.getElementById("race-over-note");

/**
 * A number picked by chance, from which the bananas of one race grow
 * (shared/hazards.js). A new one for every race, so no two races have the
 * bananas in the same places.
 */
function newSeed() {
  return Math.floor(Math.random() * SEED_COUNT);
}

// The way round the track: for the "wrong way" warning (route.js), and the
// racing line the computer karts follow (computer-driver.js).
const line = routePoints(track, lookOfTrack(track).route);
const wrongWay = watchForWrongWay(line);
// Notices when the kart has left a checkpoint out, so the page can say so (checkpoints.js).
const missedCheckpoint = watchForMissedCheckpoint(track);

// ---- The state of the race ----
const storage = storageOf(window); // this browser's storage, for the settings and the best times
// The "How to play" card: by itself the first time, and with its button (how-to-play.js).
const howToPlay = setUpHowToPlay(document, { mode: "single", storage });
const myCharacter = readCharacter(storage)?.id ?? null; // the character chosen in the menu, or null (cast-choice.js)
// The game settings this browser remembers (game-settings-view.js): do
// computer karts race with the player, and how good are they (easy, normal or hard)?
let choice = readGameChoice(storage);
let race = newRace(); // the racers (the player is racers[0]), the computer drivers, the countdown and the bananas
let started = false; //    the countdown starts at the first key press
// Until then the camera flies round the track (fly-over.js).
const flyOver = createFlyOver(line, track.start);
let flyDistance = 0; //    how far round the track the fly-over camera is, in units
let lastFlyTime = null; // when the fly-over last moved, in milliseconds of the page's clock
let lastFrameTime = null;
let waitingSeconds = 0; // real time that has passed but is not yet turned into game steps
let record = null; //      once the race is finished: did it beat your best times? (records.js)
let youFinishedAt = null; // the step of the race when the player finished, or null
let podiumSince = null; //   when the podium came up, in milliseconds of the page's clock, or null
let cheered = 0; //          how many times the crowd has cheered on this podium
let raceNumber = 0; //       counts the races on this page, so a late answer about an older race is ignored
let savedAnswer = null; //   what the server said about saving this race for the player's stats, or null

// ---- The state of the camera ----
// The colours of the character the player chose in the menu (cast-choice.js).
// Without a character: the colours chosen before characters existed, or
// null if they never chose any. The kart then gets the first look (kart-choice.js).
const myLook = lookOfCharacter(myCharacter) ?? lookFromChoice(readChoice(storage));
let view = readSettings(storage).startView; // the view chosen in the menu's settings, or the first one
let camera = followTarget(race.racers[0].kart, track); // the spot in the middle of the screen, in the follow view
let cameraOn = 0; //         the kart the camera is on: the player's (0), or after the finish one that still drives
let followingId = null; //   after the finish: the kart the camera stays with, or null

// The banner across the top of the picture once the player has finished and
// watches the others come home (race-view.js).
const bannerBox = document.getElementById("watch-banner");
const bannerTitle = document.getElementById("watch-title");
const bannerText = document.getElementById("watch-text");

// The sound of the race: engine, bumps, beeps (sound.js). It starts at the
// player's first key press, and M switches it off and on.
const sound = createRaceSound(window, storage);
const soundText = document.getElementById("sound");
soundText.textContent = readSwitches(storage).master ? "on" : "off";
// The music (music.js) and the clicks of the buttons (ui-sound.js). M is the
// master switch: it silences all three (audio-switches.js).
const music = createPageMusic(window, storage);
const uiSound = createUiSound(window, storage);
uiSound.listen(document);

// ---- The game settings: a card over the picture (game-settings-card.js) ----
// Computer karts on or off, and how good they are. The card comes up when
// the page opens, and again with the button above the track. Confirming
// remembers the choice in this browser and starts the race again with it.
// (Until 19 November 2026 the level was three buttons above the track.)
const settingsBox = document.getElementById("settings-box");
const settingsSummaryText = document.getElementById("settings-summary");
const settingsButton = document.getElementById("open-game-settings");
// A track without a racing line has no computer karts (practice-race.js): nothing to choose there.
const canHaveComputers = line.length >= 3;

const settingsCard = createSettingsCard(document, {
  mode: "single",
  onConfirm: (wanted) => {
    choice = { computers: wanted.computers, level: wanted.level };
    saveGameChoice(storage, choice); // remembered for next time
    showChoice();
    startAgain(); // a new race with these settings, as with R
  },
});

/** Says above the track who the player races against: "Computer karts: Hard", or "No computer karts". */
function showChoice() {
  settingsSummaryText.textContent = settingsSummary({ ...choice, most: 0 });
}

/** Opens the card. A race that is on is put back on the grid first: it cannot go on behind the card. */
function openSettings(firstTime) {
  startAgain();
  settingsCard.open({ settings: choice, firstTime });
}

settingsButton.addEventListener("click", () => openSettings(false));
showChoice();
settingsBox.hidden = !canHaveComputers;

// The game on the whole screen: the button above the track, or F (full-screen.js).
const fullScreen = setUpFullScreen(document, document.getElementById("play-area"), document.getElementById("full-screen"));

const keyboard = createKeyboard(window, {
  onFullScreen: () => fullScreen.toggle(),
  onDrive: start,
  onRestart: startAgain,
  onView: changeView,
  onSound: () => {
    const on = toggleMaster(storage);
    sound.setMaster(on);
    music.setSwitches();
    uiSound.setSwitches();
    soundText.textContent = on ? "on" : "off";
  },
});

function start() {
  if (settingsCard.isOpen() || howToPlay.isOpen()) {
    return; // the race waits behind the cards until they are closed
  }
  started = true;
}

function startAgain() {
  race = newRace();
  started = false;
  waitingSeconds = 0;
  record = null;
  youFinishedAt = null;
  podiumSince = null;
  cheered = 0;
  raceNumber += 1;
  savedAnswer = null;
  followingId = null;
  cameraOn = 0;
  camera = followTarget(race.racers[0].kart, track); // jump straight back, do not glide
}

// "Race again" does what the R key does. The button gives the keyboard back
// to the page afterwards, so that the arrow keys drive at once.
document.getElementById("race-again").addEventListener("click", (event) => {
  startAgain();
  event.currentTarget.blur();
});

// Is someone signed in on this browser? Asked once, when the page opens:
// true, false, or null while the server has not answered yet.
let signedIn = null;
accountApi?.getMe().then((me) => {
  signedIn = me.signedIn === true;
});

/**
 * Tells the server about the race the player has just finished, so that it
 * counts in their own stats if they are signed in. For a guest nothing is
 * sent at all. (If the server has not yet said who is signed in, the race
 * is sent anyway: a guest then gets "not signed in" back, and nothing is
 * said about it.) The race itself never waits for the answer.
 */
function reportFinish(progress) {
  const times = finishedRaceTimes(progress.lapSteps, track.laps);
  if (accountApi === null || times === null || signedIn === false) {
    return;
  }
  // A race without computer karts is not sent: with nobody to beat it would
  // count as a win every time. A signed-in player is told so (stats-view.js).
  if (race.drivers.length === 0) {
    savedAnswer = signedIn === true ? { ok: false, code: "alone" } : null;
    return;
  }
  const thisRace = raceNumber;
  accountApi
    .saveSingleResult({
      track: trackShortName,
      raceSteps: times.raceSteps,
      bestLapSteps: times.lapSteps,
      position: finishPlace(placesInput(race), 0) ?? 1,
      character: myCharacter,
      level: race.level, // how good the computer karts of this race were: easy, normal or hard
    })
    .then((answer) => {
      if (thisRace === raceNumber) {
        savedAnswer = answer; // the player has not started another race meanwhile
      }
    });
}

function changeView() {
  view = nextView(view);
  cameraOn = null; // the next picture puts the camera straight on the kart it shows, without gliding
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
      race = stepPracticeRace(track, race, input, character);
      waitingSeconds -= STEP_SECONDS;
    }
  }
  const racer = race.racers[0];
  const countdown = countdownAt(race.countdownSteps);

  // The moment the race is finished, compare it with your best times, once.
  if (racer.progress.finished && record === null) {
    record = recordFinishedRace(storage, track, racer.progress.lapSteps);
    youFinishedAt = race.countdownSteps;
    reportFinish(racer.progress); // for a signed-in player's own stats
  }

  // When every kart has finished (or the others took too long), the podium
  // comes up, and stays until R starts a new race (podium.js).
  if (podiumSince === null && youFinishedAt !== null && singleRaceIsOver(race, race.countdownSteps - youFinishedAt)) {
    podiumSince = now;
  }

  // The player has finished and the others are still driving: the camera
  // moves to one of them, the one in last place, and stays with it until it
  // finishes (kartToWatchAfterFinish in race-view.js). In a single race the
  // others are all computer karts. A banner says so (see below).
  // The music: none before the start and in the countdown, the race song
  // from GO (faster on the final lap), the fanfare at your finish, then the
  // podium song (music-cues.js).
  music.follow(
    raceMoment({
      started,
      racing: countdown.racing,
      finished: youFinishedAt !== null,
      podium: podiumSince !== null,
      lapsDone: racer.progress.lapsDone,
      laps: track.laps,
    }),
  );

  const kartsNow = podiumKartsOf(race, myCharacter);
  const computerIds = kartsNow.slice(1).map((kart) => kart.id);
  const watched =
    racer.progress.finished && podiumSince === null ? kartToWatchAfterFinish(kartsNow, track, 0, followingId, computerIds) : undefined;
  followingId = watched === undefined ? null : watched.id;
  const shownId = watched === undefined ? 0 : watched.id; // the kart in the middle of the picture
  const shownRacer = race.racers[shownId];

  // The camera glides towards where it wants to be, and jumps when it moves to another kart.
  const cameraTarget = followTarget(shownRacer.kart, track);
  camera = shownId === cameraOn ? easeTowards(camera, cameraTarget, frameSeconds) : cameraTarget;
  cameraOn = shownId;

  // The kart leans in the chase view while the player steers, but not
  // before GO and not after the finish, when the keys do nothing.
  const { progress } = racer;
  const keysWork = started && countdown.racing && !progress.finished;
  const spinning = racer.spinSteps > 0;
  const steer = keysWork && !spinning ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
  const walkersShown = walkersToShow(track, race.walkers);
  if (podiumSince !== null) {
    // The podium instead of the track: the first three, the winner with the trophy.
    const kartsOfTheRace = podiumKartsOf(race, myCharacter);
    const lineup = podiumLineup(kartsOfTheRace, track);
    const loser = podiumLoser(kartsOfTheRace, track); // the driver who came last cries beside the podium
    const caption = podiumCaption(lineup, formatTime); // "Race again" is a button on the picture now (race.html)
    const shownFor = (now - podiumSince) / 1000;
    podium.paint(trackCanvas.getContext("2d"), { width: trackCanvas.width, height: trackCanvas.height }, lineup, shownFor, caption, loser);
    // The crowd cheers, again and again for a while.
    while (cheered < cheersDue(shownFor)) {
      sound.cheer();
      cheered++;
    }
  } else {
    const others = race.racers.map((_, id) => id).filter((id) => id !== shownId).map(kartAsDrawn);
    if (!started && view === "chase") {
      // Before the first key press: the camera flies round the track, over
      // every kart waiting on the grid (fly-over.js). An arrow key starts the
      // countdown, and the camera comes down behind your kart as before.
      flyDistance += FLY_SPEED * (lastFlyTime === null ? 0 : Math.min((now - lastFlyTime) / 1000, 0.1));
      lastFlyTime = now;
      const place = flyOver.placeAt(flyDistance);
      const camera = { ...place, vx: Math.cos(place.angle) * FLY_SPEED, vy: Math.sin(place.angle) * FLY_SPEED, id: -1 };
      draw("chase", camera, camera, 0, [kartAsDrawn(shownId), ...others], {
        hideOwnKart: true, // there is no kart at the camera, and no small map
        bananas: race.bananas,
        walkers: walkersShown,
      });
    } else {
      lastFlyTime = null;
      draw(view, kartAsDrawn(shownId), camera, steer, others, {
        ...sceneFor(race.countdownSteps, started),
        bananas: race.bananas,
        walkers: walkersShown, // the people who walk across the track (shared/walkers.js)
        // While the race is on, the next checkpoint is lit up in yellow.
        nextCheckpoint: keysWork ? nextCheckpoint(progress, track) : undefined,
      });
    }
  }

  // A checkpoint that was left out, or driving against the arrows for a
  // moment, brings up a warning. A missed checkpoint comes first: going
  // back for it means driving against the arrows.
  const missed = keysWork ? missedCheckpoint(racer.kart, progress.passed) : null;
  const goingWrongWay = keysWork && !spinning && wrongWay(racer.kart, now / 1000);
  const warning = missed !== null ? missedCheckpointMessage(track, missed) : goingWrongWay ? WRONG_WAY_MESSAGE : null;

  // The countdown is shown as one big number in the middle of the track.
  const showingCountdown = started && countdown.label !== "" && !progress.finished;
  messageBox.classList.toggle("countdown", showingCountdown && warning === null);

  // The race is over and the podium is up: the two buttons come onto the
  // picture, with a word about the player's stats if there is one to say.
  raceOverBox.hidden = podiumSince === null;
  const note = singleSavedText(savedAnswer).trim();
  if (raceOverNote.textContent !== note) {
    raceOverNote.textContent = note;
  }

  // Your place among all the karts, such as "3rd of 6" (standings.js).
  placeText.textContent = placeLine(placesInput(race), track, 0);
  placeBox.hidden = race.racers.length < 2;

  // While the player watches the others come home: a banner across the top
  // of the picture with their place and time, that they are waiting, and
  // whose kart the camera is on. The middle of the picture stays free.
  const banner =
    watched === undefined
      ? null
      : finishedBanner({
          place: finishPlace(placesInput(race), 0) ?? 1,
          steps: progress.steps,
          watchedName: `${race.drivers[watched.id - 1].character.name} (computer)`,
        });
  bannerBox.hidden = banner === null;
  if (banner !== null) {
    const words = `${banner.text}${newBestText()}${singleSavedText(savedAnswer)}`;
    if (bannerTitle.textContent !== banner.title) {
      bannerTitle.textContent = banner.title; // as text, never as HTML
    }
    if (bannerText.textContent !== words) {
      bannerText.textContent = words;
    }
  }

  showHud({
    lap: currentLap(progress, track),
    laps: track.laps,
    steps: progress.steps,
    lapSteps: progress.lapSteps,
    view,
    message: podiumSince !== null || banner !== null ? "" : (warning ?? messageFor(progress, countdown)),
  });

  // The facts of this picture, for the sound: sound-cues.js decides from
  // them which beep, bump or jingle is due and how the engine sounds. After
  // the finish the player hears the kart they watch; the laps and the finish
  // stay their own, so nothing is cheered twice.
  sound.frame(
    {
      label: showingCountdown ? countdown.label : "",
      kart: shownRacer.kart,
      gas: keysWork && input.gas,
      onGrass: tileKindAt(track, shownRacer.kart.x, shownRacer.kart.y) === "grass",
      spinning: shownRacer.spinSteps > 0,
      lapsDone: progress.lapsDone,
      laps: track.laps,
      finished: progress.finished,
      warning: warning !== null,
      others: race.racers.filter((_, id) => id !== shownId).map((other) => other.kart),
      air: shownRacer.airSteps ?? 0,
      walkersDownNear: walkersDownNear(walkersShown, shownRacer.kart),
    },
    frameSeconds,
  );
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

/** A new race, before the countdown. The computer karts are the characters the player did not choose. */
function newRace() {
  return createPracticeRace(track, newSeed(), line, choice.computers ? COMPUTER_KARTS : 0, myCharacter, choice.level);
}

/**
 * A kart as it is drawn: the player's (kart 0) in the colours they chose, a
 * computer kart in its character's colours. It turns round and round while
 * it spins after a banana (the rules do not turn it: after the spin it
 * points where it pointed before). "air" and "boost": it is drawn in the air
 * after a ramp, and with sparks while it has extra speed (shared/ramps.js).
 */
function kartAsDrawn(id) {
  const racer = race.racers[id];
  return {
    ...racer.kart,
    look: id === 0 ? myLook : lookOfCharacter(race.drivers[id - 1].character.id),
    spinTurn: spinTurnOf(racer.spinSteps, SPIN_STEPS),
    air: racer.airSteps ?? 0,
    boost: racer.boostSteps ?? 0,
  };
}

/** The text shown in the middle of the track. */
function messageFor(progress, countdown) {
  if (progress.finished) {
    // Your place, and then the podium is on its way: it comes when everyone has finished (podium.js).
    const place = finishPlace(placesInput(race), 0) ?? 1;
    return `${finishedWords(place, progress.steps, formatTime)}${newBestText()}${singleSavedText(savedAnswer)}`;
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
    choice: { ...choice }, // the game settings in use
    settingsCard: settingsCard.isOpen(),
    watching: followingId, // after the finish: the kart the camera is on, or null
    podium: podiumSince !== null,
    countdownSteps: race.countdownSteps,
    view,
    kart: { ...race.racers[0].kart },
    spinSteps: race.racers[0].spinSteps,
    bananas: race.bananas.map((banana) => ({ ...banana })),
    progress: { ...race.racers[0].progress, lapSteps: [...race.racers[0].progress.lapSteps] },
    computers: race.racers.slice(1).map((other, index) => ({
      name: race.drivers[index].character.name,
      drives: race.drivers[index].personality.name,
      kart: { ...other.kart },
      lapsDone: other.progress.lapsDone,
      finished: other.progress.finished,
    })),
  }),
};

// The first thing on the page: the game settings, as they were left last time.
if (canHaveComputers) {
  settingsCard.open({ settings: choice, firstTime: true });
}

requestAnimationFrame(frame);
