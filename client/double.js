// The two-player page: two people race on one computer, each on one half
// of the screen.
//
// Player 1, who chose a character first in the menu, drives with the arrow
// keys and has the right half. Player 2 drives with W, A, S and D and has
// the left half: each half is on the side where its keys are on the
// keyboard. With the game settings on "computer karts", four computer karts
// race with them, six karts in all.
//
// Like a single race (main.js), this race runs in the browser: nothing is
// sent to our server. Unlike a single race, nothing is saved either: not
// for anyone's stats, not for the leaderboard, not as a best time.
//
// The rules of the race are in shared/two-player-race.js, which has tests.
// The words each half shows are in double-view.js, with tests too. This file
// connects them to the page, the keyboard and the two pictures, so it is
// checked by eye in a browser.
//
// How the screen is split: there are two pictures, each painted by its own
// painter (draw.js) from behind one driver's kart. Each half shows the
// middle of its picture (HALF_SHOWS in double-view.js), so that the two
// stand side by side without becoming tiny. When the race is over, player
// 1's picture grows over both halves and shows the podium.

import { countdownAt } from "../shared/countdown.js";
import { createTwoPlayerRace, stepTwoPlayerRace, twoPlayerKarts, twoPlayerEndsIn, COMPUTER_KARTS_FOR_TWO, PLAYERS } from "../shared/two-player-race.js";
import { STEP_SECONDS } from "../shared/physics.js";
import { currentLap, nextCheckpoint } from "../shared/laps.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { CAST } from "../shared/cast.js";
import { SEED_COUNT, SPIN_STEPS } from "../shared/hazards.js";
import { storeysOf } from "../shared/tracks/index.js";
import { tileKindAt } from "../shared/track.js";
import { chooseTrack } from "./track-choice.js";
import { createKeyboard } from "./keyboard.js";
import { setUpFullScreen } from "./full-screen.js";
import { readGameChoice, saveGameChoice, settingsSummary } from "./game-settings-view.js";
import { createSettingsCard } from "./game-settings-card.js";
import { createPainter } from "./draw.js";
import { SCREEN, followTarget, easeTowards, nextView } from "./camera.js";
import { introShare, startLights, spinTurnOf } from "./scene.js";
import { twoCharacters, lookOfCharacter } from "./cast-choice.js";
import { lookOfTrack } from "./track-looks.js";
import { walkersToShow, walkersDownNear } from "./street-life.js";
import { routePoints, watchForWrongWay, WRONG_WAY_MESSAGE } from "./route.js";
import { watchForMissedCheckpoint, missedCheckpointMessage } from "./checkpoints.js";
import { placeLine } from "./standings.js";
import { timeLeftNotice, kartToWatchAfterFinish, finishedBanner } from "./race-view.js";
import { VIEW_NAMES } from "./hud.js";
import { formatTime } from "./format.js";
import { storageOf } from "./storage.js";
import { readSettings } from "./settings.js";
import { createRaceSound } from "./sound.js";
import { createPageMusic } from "./music.js";
import { raceMoment } from "./music-cues.js";
import { createUiSound } from "./ui-sound.js";
import { readSwitches, toggleMaster } from "./audio-switches.js";
import { podiumLineup, podiumLoser, podiumCaption, cheersDue, finishPlace } from "./podium.js";
import { createPodiumView } from "./podium-view.js";
import { HALF_SHOWS, NOT_SAVED_WORDS, halfMessage, plateName, tagsFor, watchedName } from "./double-view.js";

const track = chooseTrack(window.location.search);
const character = TEST_DRIVER;
const storage = storageOf(window); // this browser's storage, for the characters and the settings

/** The two drivers, as numbers: 0 is player 1 (the arrows, right half), 1 is player 2 (W A S D, left half). */
const BOTH = [0, 1];

// ---- The parts of the page ----
document.getElementById("track-name").textContent = track.name; // as text, never as HTML
const screenBox = document.getElementById("double-screen");
// How much of each picture a half shows. The page's style reads the same number (style.css).
screenBox.style.setProperty("--shows", String(HALF_SHOWS));
/** The small map sits in the corner of the part that is shown, not of the whole picture. */
const MAP_INSET = Math.round((SCREEN.width * (1 - HALF_SHOWS)) / 2);

const canvases = BOTH.map((player) => document.getElementById(`track-${player + 1}`));
// One painter for each half. Each remembers its own camera swing and its own smoke.
const painters = canvases.map((canvas) => createPainter(canvas, track, { storeys: storeysOf(track) }));
const podium = createPodiumView(track, painters[0]); // the podium, painted on player 1's picture, grown over both halves
const parts = BOTH.map((player) => {
  const part = (name) => document.getElementById(`${name}-${player + 1}`);
  return {
    message: part("message"),
    plate: part("plate"),
    name: part("name"),
    lap: part("lap"),
    laps: part("laps"),
    time: part("time"),
    placeBox: part("place-box"),
    place: part("place"),
    // The banner at the top of the half, after this driver's finish (race-view.js).
    banner: part("banner"),
    bannerTitle: part("banner-title"),
    bannerText: part("banner-text"),
  };
});
const viewText = document.getElementById("view");
const noticeText = document.getElementById("notice");
const raceOverBox = document.getElementById("race-over");
document.getElementById("race-over-note").textContent = NOT_SAVED_WORDS;

/** Writes words on the page only when they have changed, so a screen reader does not read them out again and again. */
function setText(part, text) {
  if (part.textContent !== text) {
    part.textContent = text; // as text, never as HTML
  }
}

// ---- Who drives ----
// The characters the two chose in the menu (cast-choice.js): never the same one twice.
const characters = twoCharacters(storage, CAST);
const looks = characters.map((id) => lookOfCharacter(id));
BOTH.forEach((player) => {
  parts[player].name.textContent = plateName(player, characters[player]);
  // The plate takes the colour of that driver's kart (style.css mixes it in).
  parts[player].plate.style.setProperty("--tint", looks[player].body);
});

// The way round the track: for the "wrong way" warning (route.js), and the
// racing line the computer karts follow. Each driver has their own watchers.
const line = routePoints(track, lookOfTrack(track).route);
const wrongWays = BOTH.map(() => watchForWrongWay(line));
const missedCheckpoints = BOTH.map(() => watchForMissedCheckpoint(track));

// ---- The state of the race ----
// The game settings this browser remembers (game-settings-view.js): the same ones as the single race.
let choice = readGameChoice(storage);
let race = newRace();
let started = false; //      the countdown starts at the first driving key of either driver
let lastFrameTime = null;
let waitingSeconds = 0; //   real time that has passed but is not yet turned into game steps
let podiumSince = null; //   when the podium came up, in milliseconds of the page's clock, or null
let cheered = 0; //          how many times the crowd has cheered on this podium

// ---- The cameras ----
let view = readSettings(storage).startView; // the view chosen in the menu's settings, or the first one
let cameras = BOTH.map((player) => followTarget(race.racers[player].kart, track));
// Which kart each driver's camera is on: their own, or, once they have
// finished, one that still drives (kartToWatchAfterFinish in race-view.js).
let camerasOn = [...BOTH];
let following = BOTH.map(() => null); // after a driver's finish: the kart their camera stays with, or null

/** A number picked by chance, from which the bananas of one race grow (shared/hazards.js). */
function newSeed() {
  return Math.floor(Math.random() * SEED_COUNT);
}

/** A new race, before the countdown. The computer karts are the characters the two did not choose. */
function newRace() {
  return createTwoPlayerRace(track, newSeed(), line, choice.computers ? COMPUTER_KARTS_FOR_TWO : 0, characters, choice.level);
}

// ---- The sound ----
// Each driver hears their own kart: engine, bumps, laps (sound.js). So there
// are two sets of sounds. Only the first one counts down and cheers, or
// every beep would come twice. M switches both off and on.
const sounds = BOTH.map(() => createRaceSound(window, storage));
const soundText = document.getElementById("sound");
soundText.textContent = readSwitches(storage).master ? "on" : "off";
// One music for both drivers (music.js), and the clicks of the buttons
// (ui-sound.js). M is the master switch: it silences everything (audio-switches.js).
const music = createPageMusic(window, storage);
const uiSound = createUiSound(window, storage);
uiSound.listen(document);

// ---- The game settings: a card over the pictures (game-settings-card.js) ----
const settingsBox = document.getElementById("settings-box");
const settingsSummaryText = document.getElementById("settings-summary");
// A track without a racing line has no computer karts: nothing to choose there.
const canHaveComputers = line.length >= 3;

const settingsCard = createSettingsCard(document, {
  mode: "double",
  onConfirm: (wanted) => {
    choice = { computers: wanted.computers, level: wanted.level };
    saveGameChoice(storage, choice); // remembered for next time
    showChoice();
    startAgain(); // a new race with these settings, as with R
  },
});

/** Says above the pictures who the two race against. */
function showChoice() {
  settingsSummaryText.textContent = settingsSummary({ ...choice, most: 0 });
}

/** Opens the card. A race that is on is put back on the grid first: it cannot go on behind the card. */
function openSettings(firstTime) {
  startAgain();
  settingsCard.open({ settings: choice, firstTime });
}

document.getElementById("open-game-settings").addEventListener("click", () => openSettings(false));
showChoice();
settingsBox.hidden = !canHaveComputers;

// ---- The keyboard ----
// The game on the whole screen: the button above the pictures, or F (full-screen.js).
const fullScreen = setUpFullScreen(document, document.getElementById("play-area"), document.getElementById("full-screen"));

const keyboard = createKeyboard(
  window,
  {
    onFullScreen: () => fullScreen.toggle(),
    onDrive: start,
    onRestart: startAgain,
    onView: changeView,
    onSound: () => {
      const on = toggleMaster(storage);
      for (const each of sounds) {
        each.setMaster(on);
      }
      music.setSwitches();
      uiSound.setSwitches();
      soundText.textContent = on ? "on" : "off";
    },
  },
  { twoPlayers: true }, // W, A, S and D drive too
);

function start() {
  if (settingsCard.isOpen()) {
    return; // the race waits behind the card until the settings are confirmed
  }
  started = true;
}

function startAgain() {
  race = newRace();
  started = false;
  waitingSeconds = 0;
  podiumSince = null;
  cheered = 0;
  following = BOTH.map(() => null);
  camerasOn = [...BOTH];
  cameras = BOTH.map((player) => followTarget(race.racers[player].kart, track)); // jump straight back, do not glide
}

// "Race again" does what the R key does. The button gives the keyboard back
// to the page afterwards, so that the keys drive at once.
document.getElementById("race-again").addEventListener("click", (event) => {
  startAgain();
  event.currentTarget.blur();
});

function changeView() {
  view = nextView(view);
  camerasOn = BOTH.map(() => null); // the next picture puts each camera straight on the kart it shows
}

/** The colours of the kart with this number: a driver's own, or those of a computer kart's character. */
function lookOfKart(id) {
  return id < PLAYERS ? looks[id] : lookOfCharacter(race.drivers[id - PLAYERS].character.id);
}

/** A kart as it is drawn: in its colours, turning while it spins, in the air after a ramp. */
function shownKart(id) {
  const racer = race.racers[id];
  return {
    ...racer.kart,
    id,
    look: lookOfKart(id),
    spinTurn: spinTurnOf(racer.spinSteps, SPIN_STEPS),
    air: racer.airSteps ?? 0,
    boost: racer.boostSteps ?? 0,
  };
}

/**
 * What the pictures show besides the karts: the camera high above the grid
 * until the countdown starts, coming down during 3, 2, 1, and the start lights.
 */
function sceneFor(countdownSteps, hasStarted) {
  if (!hasStarted) {
    return { intro: 0, lights: { red: 0, green: false } };
  }
  const counting = countdownAt(countdownSteps).label !== "";
  return { intro: introShare(counting, countdownSteps), lights: startLights(counting, countdownSteps) };
}

/**
 * Runs once for every picture the screen shows (usually 60 times a second).
 * As in main.js, real time is turned into whole steps of the rules.
 */
function frame(now) {
  // Normally the countdown starts in start(), at the first key press. This
  // covers one more case: R was pressed while a driving key was still held.
  if (!started && keyboard.isDriving()) {
    start();
  }

  const frameSeconds = lastFrameTime === null ? 0 : Math.min((now - lastFrameTime) / 1000, 0.25);
  lastFrameTime = now;

  // Player 1 drives with the arrows, player 2 with the letters.
  const inputs = [keyboard.input(), keyboard.letterInput()];
  if (started) {
    waitingSeconds += frameSeconds;
    while (waitingSeconds >= STEP_SECONDS) {
      race = stepTwoPlayerRace(track, race, inputs, character);
      waitingSeconds -= STEP_SECONDS;
    }
  }
  const countdown = countdownAt(race.countdownSteps);
  const karts = twoPlayerKarts(race); // every kart, for the places and the podium
  const walkersShown = walkersToShow(track, race.walkers);

  // When the race is over for everyone, the podium comes up, and stays until a new race starts.
  if (race.over && podiumSince === null) {
    podiumSince = now;
  }
  const podiumUp = podiumSince !== null;
  // The music: the race song from GO, faster once either driver is on the
  // final lap, the fanfare when both have finished, then the podium song.
  const drivers = BOTH.map((number) => race.racers[number].progress);
  music.follow(
    raceMoment({
      started,
      racing: countdown.racing,
      finished: drivers.every((progress) => progress.finished),
      podium: podiumUp,
      lapsDone: Math.max(...drivers.map((progress) => progress.lapsDone)),
      laps: track.laps,
    }),
  );
  screenBox.classList.toggle("is-podium", podiumUp);
  raceOverBox.hidden = !podiumUp;

  if (podiumUp) {
    const lineup = podiumLineup(karts, track);
    const loser = podiumLoser(karts, track); // with four or more karts, the driver who came last cries beside the podium
    const shownFor = (now - podiumSince) / 1000;
    podium.paint(canvases[0].getContext("2d"), { width: canvases[0].width, height: canvases[0].height }, lineup, shownFor, podiumCaption(lineup, formatTime), loser);
    while (cheered < cheersDue(shownFor)) {
      sounds[0].cheer();
      cheered++;
    }
  }

  const computerIds = karts.slice(PLAYERS).map((kart) => kart.id);

  for (const player of BOTH) {
    const racer = race.racers[player];
    const { progress } = racer;
    const input = inputs[player];
    const keysWork = started && countdown.racing && !progress.finished && !race.over;
    const spinning = racer.spinSteps > 0;

    // This driver has finished and others are still driving: their camera
    // moves to one of them. The other driver if they still drive, otherwise
    // the computer kart in last place. It stays there until that kart finishes.
    const watched = progress.finished && !race.over ? kartToWatchAfterFinish(karts, track, player, following[player], computerIds) : undefined;
    following[player] = watched === undefined ? null : watched.id;
    const shownId = watched === undefined ? player : watched.id; // the kart in the middle of this half
    const shownRacer = race.racers[shownId];

    // The camera glides towards where it wants to be, and jumps when it moves to another kart.
    const cameraTarget = followTarget(shownRacer.kart, track);
    cameras[player] = shownId === camerasOn[player] ? easeTowards(cameras[player], cameraTarget, frameSeconds) : cameraTarget;
    camerasOn[player] = shownId;

    if (!podiumUp) {
      // The kart leans while its driver steers, but not before GO and not after the finish.
      const steer = keysWork && !spinning ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
      const others = race.racers.map((_, id) => id).filter((id) => id !== shownId).map(shownKart);
      painters[player](view, shownKart(shownId), cameras[player], steer, others, {
        ...sceneFor(race.countdownSteps, started),
        bananas: race.bananas,
        walkers: walkersShown,
        names: tagsFor(player), // "P1" or "P2" above the other driver's kart
        nextCheckpoint: keysWork ? nextCheckpoint(progress, track) : undefined,
        mapInset: MAP_INSET,
      });
    }

    // A checkpoint that was left out, or driving against the arrows, brings up a warning.
    const missed = keysWork ? missedCheckpoints[player](racer.kart, progress.passed) : null;
    const goingWrongWay = keysWork && !spinning && wrongWays[player](racer.kart, now / 1000);
    const warning = missed !== null ? missedCheckpointMessage(track, missed) : goingWrongWay ? WRONG_WAY_MESSAGE : null;

    // The words in the middle of this half, and the numbers on the plate under it.
    const showingCountdown = started && countdown.label !== "" && !progress.finished;
    const words = halfMessage({
      started,
      label: showingCountdown ? countdown.label : "",
      finished: progress.finished,
      place: finishPlace(karts, player) ?? 1,
      steps: progress.steps,
      warning,
      over: podiumUp,
      watching: watched !== undefined,
    });
    const { message, lap, laps, time, placeBox, place, banner, bannerTitle, bannerText } = parts[player];
    message.classList.toggle("countdown", words.big);
    setText(message, words.text);

    // While this driver watches the others come home: a banner at the top of
    // their half with their place and time, and whose kart the camera is on.
    const said =
      watched === undefined || podiumUp
        ? null
        : finishedBanner({ place: finishPlace(karts, player) ?? 1, steps: progress.steps, watchedName: watchedName(watched.id, watched.character) });
    banner.hidden = said === null;
    if (said !== null) {
      setText(bannerTitle, said.title);
      setText(bannerText, said.text);
    }
    setText(lap, String(currentLap(progress, track)));
    setText(laps, String(track.laps));
    setText(time, formatTime(progress.steps * STEP_SECONDS));
    setText(place, placeLine(karts, track, player));
    placeBox.hidden = karts.length < 2;

    // The facts of this picture, for this driver's sounds (sound-cues.js).
    // Only the first set counts down, or every beep would come twice. After
    // their finish a driver hears the kart they watch; the laps and the
    // finish stay their own, so nothing is cheered twice.
    sounds[player].frame(
      {
        label: player === 0 && showingCountdown ? countdown.label : "",
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
  }

  setText(viewText, VIEW_NAMES[view]);
  // "The race ends in 42 s": once the first kart has finished, the others have two minutes.
  setText(noticeText, podiumUp || !countdown.racing ? "" : timeLeftNotice({ phase: "racing" }, twoPlayerEndsIn(race)));

  requestAnimationFrame(frame);
}

// A way to look at the race from the browser's console: type kartGame.state()
// there. It only gives a copy to look at.
window.kartGame = {
  state: () => ({
    started,
    over: race.over,
    choice: { ...choice },
    settingsCard: settingsCard.isOpen(),
    view,
    characters: [...characters],
    countdownSteps: race.countdownSteps,
    raceSteps: race.raceSteps,
    endsIn: twoPlayerEndsIn(race),
    watching: [...following], // after each driver's finish: the kart their camera is on, or null
    podium: podiumSince !== null,
    karts: twoPlayerKarts(race),
    players: BOTH.map((player) => ({ kart: { ...race.racers[player].kart }, spinSteps: race.racers[player].spinSteps })),
    bananas: race.bananas.map((banana) => ({ ...banana })),
  }),
};

// The first thing on the page: the game settings, as they were left last time.
if (canHaveComputers) {
  settingsCard.open({ settings: choice, firstTime: true });
}

requestAnimationFrame(frame);
