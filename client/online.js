// The online page: driving and racing with other people.
//
// Each track has its own room on the server. The address of the page says
// which one (track-choice.js): online.html?track=campus-loop is the campus
// loop, and without a choice it is the test oval.
//
// Before a race, everyone drives around freely. The host (whoever has been
// here longest) presses Enter to start a race: every kart goes to the grid,
// 3, 2, 1, GO! is counted for everyone together, and all karts are let go at
// the same moment. Someone who opens the page during a race watches it and
// joins at the next start.
//
// The big difference from practice (main.js): this page does not move any
// kart itself. It only
//   1. tells the server which keys are held, and
//   2. draws what the server says is happening.
// The server runs the rules for everyone (server/room.js). A player cannot
// make their kart faster or skip a lap by changing this page, because this
// page decides nothing.
//
// The same goes for the leaderboard. When a signed-in player finishes a race,
// the server saves the time it measured itself and then tells this page
// ("saved"). This page never sends a time, so it cannot send a false one.
//
// Known limit: your own kart reacts a moment late, because your key press
// has to travel to the server and the result has to travel back.
//
// When the connection cannot be made (the server may be waking up) or is
// lost, the page tries again by itself, and a card in the middle of the
// picture says what is happening (link.js). Someone who comes back like
// this during a race watches it and drives in the next one, like anyone
// who arrives during a race.

import { TRACKS, storeysOf } from "../shared/tracks/index.js";
import { createPodiumView } from "./podium-view.js";
import { podiumLineup, podiumCaption, cheersDue, finishPlace, finishedWords, PODIUM_SECONDS } from "./podium.js";
import { formatTime } from "./format.js";
import { chooseTrackName } from "./track-choice.js";
import { createKeyboard } from "./keyboard.js";
import { createPainter } from "./draw.js";
import { createHud } from "./hud.js";
import { createPlayback, readServerMessage, bananasOf, walkersOf, statusLine, accountLine, othersLine, QUIET_AFTER_MS } from "./net.js";
import { introShare, startLights, spinTurnOf } from "./scene.js";
import { COLOURS, lookFromChoice, readChoice } from "./kart-choice.js";
import { readCharacter, characterNote } from "./cast-choice.js";
import { lookOfTrack } from "./track-looks.js";
import { walkersToShow, walkersDownNear } from "./street-life.js";
import { routePoints, watchForWrongWay, WRONG_WAY_MESSAGE } from "./route.js";
import { nextCheckpointNumber, watchForMissedCheckpoint, missedCheckpointMessage } from "./checkpoints.js";
import { placeLine, resultLines, boardLines } from "./standings.js";
import { createResultsBoard } from "./results-board.js";
import { lookOf } from "./kart-shape.js";
import { createRaceSound } from "./sound.js";
import { tileKindAt } from "../shared/track.js";
import { SPIN_STEPS } from "../shared/hazards.js";
import { readRace, readEndsIn, timeLeftNotice, raceView, kartToWatch, keysWork } from "./race-view.js";
import { followTarget, easeTowards, nextView } from "./camera.js";
import { storageOf } from "./storage.js";
import { readSettings } from "./settings.js";
import { closeWhenLeft } from "./page-life.js";
import { linkCard, afterClose, retryWaitMs, GIVE_UP_AFTER_MS, LOST_AFTER_QUIET_MS } from "./link.js";

// The short name is always one from our own list of tracks, whatever the
// address says, so it is safe to use in the address of the connection below.
const trackName = chooseTrackName(window.location.search);
const track = TRACKS[trackName];

const COLOUR_NAMES = ["red", "blue", "yellow", "green", "purple", "orange", "teal", "pink"];

// ---- The parts of the page ----
document.getElementById("track-name").textContent = track.name; // as text, never as HTML
// The buildings of the track stand up in the race view, if the track says
// how many storeys each one has, exactly as on the single race page.
const draw = createPainter(document.getElementById("track"), track, { storeys: storeysOf(track) });
const showHud = createHud(document);
const statusText = document.getElementById("status");
const accountText = document.getElementById("account-line");
const othersText = document.getElementById("others-line");
const messageBox = document.getElementById("message");
const noticeText = document.getElementById("notice");
const placeBox = document.getElementById("place-box");
const placeText = document.getElementById("place");
const resultsBox = document.getElementById("results");
const resultsList = document.getElementById("results-list");
const board = createResultsBoard(document); // the big results board when a race is over (results-board.js)
const podium = createPodiumView(track, draw); //           the podium, painted on the race picture when a race is over (podium-view.js)
let podiumSince = null; //                      when the podium came up, in milliseconds of the page's clock, or null
let cheered = 0; //                              how many times the crowd has cheered on this podium

// The card over the picture while the connection is being made or is lost (link.js).
const cardBox = document.getElementById("link-card");
const cardTitle = document.getElementById("link-title");
const cardText = document.getElementById("link-text");
const cardRoad = document.getElementById("link-road");
const cardWaited = document.getElementById("link-waited");
const cardActions = document.getElementById("link-actions");
const cardButton = document.getElementById("link-again");

// ---- What we know from the server ----
let playback = createPlayback(); //   the latest updates, for smooth drawing
let race = readRace(null); //          the race as of the latest update: phase, countdown, host, who is watching
let endsIn = null; //                  how many steps until the race is over for everyone, or null
let resultsShown = ""; //              the results list as it is on the page now
let latestKarts = []; //               the karts exactly as the newest update has them, for the results board
let myId = null; //                    our player number, from the "welcome" message
let status = "Connecting to the server...";
let connected = false;
let kartsShown = null; //              the karts in the picture drawn last
let lastNewsAt = null; //              when the server last sent us anything
let account = null; //                 who the server says we are signed in as (the "account" message)
let saved = null; //                   what the server said about saving our last finished race
let names = new Map(); //              the user names of the signed-in players in the room, by player number
let bananas = []; //                   the banana peels on the track, as of the latest update
let walkers = []; //                   the people who walk across the track, as of the latest update (shared/walkers.js)
let walkersAt = 0; //                  when that update arrived
let othersShown = ""; //               the "With you: ..." line as it is on the page now

// ---- What the player chose in the menu ----
const storage = storageOf(window);
const myChoice = readChoice(storage); // the colours of their kart, as three numbers, or null (kart-choice.js)
const myCharacter = readCharacter(storage)?.id ?? null; // the character they chose, or null (cast-choice.js)
let welcomedAt = null; // when the server welcomed us

// The way round the track, for the "wrong way" warning (route.js).
const wrongWay = watchForWrongWay(routePoints(track, lookOfTrack(track).route));
// Notices when our kart has left a checkpoint out, so the page can say so (checkpoints.js).
const missedCheckpoint = watchForMissedCheckpoint(track);

// ---- The camera ----
let view = readSettings(storage).startView; // the view chosen in the menu's settings, or the first one
let camera = null;
let lastFrameTime = null;

// ---- The live connection ----
// "wss" is the secure kind, used when the page itself was loaded securely (https).
const secure = window.location.protocol === "https:";
const roomAddress = `${secure ? "wss" : "ws"}://${window.location.host}/play?track=${trackName}`;

let connection = null; //                the live connection, or null between two tries
let linkState = "connecting"; //         "connecting", "joined", "full", "sentAway" or "gaveUp" (link.js)
let tryingSince = performance.now(); //  when the page began to try to connect, this time round
let failedTries = 0; //                  how many tries in a row have failed
let wasInRoom = false; //                true once the server has welcomed us: a later loss is "connection lost"
let toldFull = false; //                 the server said the room is full
let leaving = false; //                  the player is leaving the page
let retryTimer = null; //                the wait before the next try

/**
 * Opens the live connection. Called when the page opens, and again by
 * itself each time a try fails or the connection is lost.
 */
function connect() {
  clearTimeout(retryTimer);
  toldFull = false;
  const socket = new WebSocket(roomAddress);
  connection = socket;
  // A connection that the page has given up on may still say something
  // later. Only the newest one is listened to.
  socket.addEventListener("open", () => {
    if (socket === connection) {
      connected = true;
    }
  });
  socket.addEventListener("message", (event) => {
    if (socket === connection) {
      hear(event.data);
    }
  });
  socket.addEventListener("close", (event) => {
    if (socket === connection) {
      connectionClosed(event.code);
    }
  });
}

/**
 * The connection has closed, or never opened. Unless the player is leaving,
 * the room is full or the server sent us away, try again after a short wait.
 */
function connectionClosed(code) {
  connection = null;
  connected = false;
  forgetTheRoom();
  const next = afterClose({ code, toldFull, leaving });
  if (next === "stop") {
    return;
  }
  if (next !== "again") {
    linkState = next;
    return;
  }
  if (linkState === "joined") {
    tryingSince = performance.now(); // we were in the room: the trying starts now
    failedTries = 0;
  }
  if (performance.now() - tryingSince > GIVE_UP_AFTER_MS) {
    linkState = "gaveUp"; // tried for long enough: the card offers a button
    return;
  }
  linkState = "connecting";
  failedTries += 1;
  retryTimer = setTimeout(connect, retryWaitMs(failedTries));
}

/** Starts trying afresh: the button on the card, or the internet coming back. */
function tryAgain() {
  dropConnection();
  linkState = "connecting";
  tryingSince = performance.now();
  failedTries = 0;
  connect();
}

/** Lets go of the connection without waiting for it to say goodbye. */
function dropConnection() {
  clearTimeout(retryTimer);
  const old = connection;
  connection = null; // from now on nothing it says is listened to
  connected = false;
  if (old !== null) {
    old.close();
  }
  forgetTheRoom();
}

/**
 * Everything the last connection told us about the room is out of date
 * once it is gone: our number, the karts, the race. The picture keeps what
 * it showed last, under the card. Who we are signed in as stays, and so
 * does what was said about our last saved result.
 */
function forgetTheRoom() {
  myId = null;
  welcomedAt = null;
  playback = createPlayback();
  race = readRace(null);
  endsIn = null;
  latestKarts = [];
  kartsShown = null;
  lastNewsAt = null;
  names = new Map();
  bananas = [];
  walkers = [];
  podiumSince = null;
  camera = null;
  keysSent = ""; // the next connection is told afresh which keys are held
  status = "Connecting to the server...";
  if (board.isShown()) {
    board.hide();
  }
  messageBox.textContent = "";
  noticeText.textContent = "";
  placeBox.hidden = true;
  showResultsList([]);
}

// Leaving the page closes the connection, so our kart does not stay on the
// track as a ghost. Coming back with Back reloads the page (page-life.js).
closeWhenLeft(
  window,
  {
    close(code, reason) {
      leaving = true; // and do not try again
      clearTimeout(retryTimer);
      if (connection !== null) {
        connection.close(code, reason);
      }
    },
  },
  () => window.location.reload(),
);

// The button on the card ("Try again"), and the internet coming back while
// the page was waiting for it, or after it had given up.
cardButton.addEventListener("click", tryAgain);
window.addEventListener("online", () => {
  if ((linkState === "connecting" || linkState === "gaveUp") && !connected) {
    tryAgain();
  }
});

/** One message from the server. */
function hear(text) {
  const message = readServerMessage(text);
  if (message === null) {
    return; // not something this page understands: ignore it
  }
  lastNewsAt = performance.now();
  if (message.type === "welcome") {
    linkState = "joined";
    wasInRoom = true;
    failedTries = 0;
    myId = message.id;
    welcomedAt = performance.now();
    if (myCharacter !== null) {
      // Tell the server the character chosen in the menu. It answers in its
      // updates: that character, or the first free one if someone here
      // already is it. Only then does the line say who we are: someone who
      // arrives during a race has no kart yet, and may get another character.
      send({ type: "character", id: myCharacter });
      status = "Connected.";
    } else {
      // No character: tell the server the colours chosen in the menu before
      // characters existed, if any. Without them the kart has the colours of its place.
      const colour =
        myChoice === null ? COLOUR_NAMES[message.place % COLOUR_NAMES.length] : COLOURS.body[myChoice.body].name.toLowerCase();
      if (myChoice !== null) {
        send({ type: "look", ...myChoice });
      }
      status = `Connected. You are the ${colour} kart.`;
    }
  } else if (message.type === "state") {
    // Which character the server made us (see characterNote in cast-choice.js).
    // A kart without a character in the first second may simply mean the
    // server has not read our message yet, so that is not said at once.
    const mineNow = message.karts.find((kart) => kart?.id === myId);
    const note = characterNote(myCharacter, mineNow);
    const sure = mineNow?.character !== undefined || performance.now() - welcomedAt > 1000;
    if (note !== null && sure && status.startsWith("Connected.")) {
      status = `Connected. ${note}`;
    }
    playback.add(message, performance.now());
    latestKarts = message.karts;
    bananas = bananasOf(message);
    walkers = walkersOf(message);
    walkersAt = performance.now();
    const raceBefore = race;
    race = readRace(message);
    endsIn = readEndsIn(message);
    if (race.phase === "countdown" && raceBefore.phase !== "countdown") {
      camera = null; // a race has just started: jump to the grid, do not glide there
    }
  } else if (message.type === "full") {
    // The server closes the connection straight after this. The card then
    // says the room is full, with a button to try again.
    toldFull = true;
    linkState = "full";
  } else if (message.type === "account") {
    account = message;
  } else if (message.type === "saved") {
    saved = message;
  } else if (message.type === "names") {
    names = message.names;
  }
  accountText.textContent = accountLine(account, saved); // as text, never as HTML
}

/** Sends one message to the server, if the connection is open. */
function send(message) {
  if (connection !== null && connection.readyState === WebSocket.OPEN) {
    connection.send(JSON.stringify(message));
  }
}

/** Writes words on the page only when they have changed, so a screen reader does not read them out again and again. */
function setText(part, text) {
  if (part.textContent !== text) {
    part.textContent = text; // as text, never as HTML
  }
}

/**
 * Shows the card over the picture, or takes it away.
 *   card  from linkCard() in link.js, or null for no card
 */
function showCard(card) {
  cardBox.hidden = card === null;
  if (card === null) {
    return;
  }
  setText(cardTitle, card.title);
  setText(cardText, card.text);
  setText(cardWaited, card.waited);
  // The little kart on the card drives along its road while we wait.
  cardRoad.hidden = card.share === null;
  cardRoad.style.setProperty("--share", String(card.share ?? 0));
  cardActions.hidden = card.button === null;
  setText(cardButton, card.button ?? "");
}

// ---- The sound ----
// Engine, bumps, beeps (sound.js). It starts at the player's first key
// press, and M switches it off and on. It is made in this browser from what
// the server says is happening: sound decides nothing about the race.
const sound = createRaceSound(window, storage);
const soundText = document.getElementById("sound");
soundText.textContent = sound.isOn() ? "on" : "off";

// ---- The keyboard ----
const keyboard = createKeyboard(window, {
  onSound: () => {
    soundText.textContent = sound.toggle() ? "on" : "off";
  },
  onRestart: () => send({ type: "restart" }),
  // Anyone can press Enter, but the server only obeys the host, and only
  // when no race is on: a race that has begun is driven to its end. This
  // page sends it only then, to spare the server pointless messages.
  onStart: () => {
    if (race.host === myId && (race.phase === "open" || race.phase === "finished")) {
      send({ type: "start" });
    }
  },
  onView: () => {
    view = nextView(view);
    camera = null; // jump to the kart in the new view
  },
});

// Tell the server which keys are held, but only when that changes. A held
// key sends nothing more until it is released.
let keysSent = "";
function sendKeysIfChanged(input) {
  const keysNow = JSON.stringify(input);
  if (keysNow !== keysSent) {
    keysSent = keysNow;
    send({ type: "keys", ...input });
  }
}

/**
 * A kart as it is drawn. The server sends the colours a player chose as
 * three numbers, and how many steps of a spin are left. Here they become
 * the colours themselves (or none, for a kart that keeps the colours of
 * its starting place) and how far the kart is turned in the picture.
 */
function dressed(kart) {
  return { ...kart, look: lookFromChoice(kart.look), spinTurn: spinTurnOf(kart.spin, SPIN_STEPS) };
}

/** Runs once for every picture the screen shows. */
function frame(now) {
  const frameSeconds = lastFrameTime === null ? 0 : Math.min((now - lastFrameTime) / 1000, 0.25);
  lastFrameTime = now;

  const input = keyboard.input();
  sendKeysIfChanged(input);

  // The karts as they were a tenth of a second ago, glided between the
  // server's updates (see net.js).
  const karts = playback.advance(now);
  kartsShown = karts;
  const mine = karts === null ? undefined : karts.find((kart) => kart.id === myId);

  // What to tell the player about the race: the countdown, who may start,
  // racing or watching (see race-view.js).
  const about = raceView({ race, myId, mine });

  // The line under the track: connected or not, how many players, or a
  // warning when the server has sent nothing for a while (see net.js).
  // While all is well, the sentence about the race is added to it.
  const sinceLastUpdateMs = lastNewsAt === null ? 0 : performance.now() - lastNewsAt;

  // The connection (link.js). In the room but no news for a long time: the
  // connection is dead, so drop it and join again. Trying for too long
  // without getting in: stop, and let the card offer a button.
  if (linkState === "joined" && sinceLastUpdateMs > LOST_AFTER_QUIET_MS) {
    tryAgain();
    requestAnimationFrame(frame); // everything this picture knew is out of date: start the next one
    return;
  }
  if (linkState === "connecting" && performance.now() - tryingSince > GIVE_UP_AFTER_MS) {
    dropConnection();
    linkState = "gaveUp";
  }
  const card = linkCard({
    state: linkState,
    waitedMs: performance.now() - tryingSince,
    wasInRoom,
    quietMs: sinceLastUpdateMs,
    online: navigator.onLine !== false,
  });
  showCard(card);

  const allIsWell = connected && myId !== null && karts !== null && sinceLastUpdateMs <= QUIET_AFTER_MS;
  const line = statusLine({
    status,
    connected,
    playerCount: karts === null ? 0 : karts.length + race.watching.length,
    sinceLastUpdateMs,
  });
  // While the card is up it does the talking, and the line under the picture is empty.
  setText(statusText, card !== null ? "" : allIsWell && about.line !== "" ? `${line} ${about.line}` : line);

  // Who else is in the room: the user names of signed-in players, and how
  // many guests. Written to the page only when it changes.
  const everyoneHere = karts === null ? [] : [...karts.map((kart) => kart.id), ...race.watching];
  const othersNow = allIsWell ? othersLine(names, everyoneHere, myId) : "";
  if (othersNow !== othersShown) {
    othersShown = othersNow;
    othersText.textContent = othersNow; // as text, never as HTML
  }

  // The kart in the middle of the picture: our own, or, when we joined
  // during a race and are watching, the kart that is furthest ahead.
  const shown = mine ?? (karts === null ? undefined : kartToWatch(karts));
  if (shown === undefined) {
    // Nothing to draw yet: we are still connecting, or we were disconnected.
    sound.frame({ kart: null }, frameSeconds); // and nothing to hear
    requestAnimationFrame(frame);
    return;
  }

  const others = karts.filter((kart) => kart.id !== shown.id).map(dressed);
  const target = followTarget(shown, track);
  camera = camera === null ? target : easeTowards(camera, target, frameSeconds);

  // The kart leans while the player steers, but only when the keys do
  // something: in a race after GO (see keysWork in race-view.js). Not while
  // waiting for the host, during 3, 2, 1, when watching, after the finish,
  // or while it spins after a banana.
  const keysDoSomething = keysWork(race, mine);
  const steer = keysDoSomething ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;

  // What the picture shows besides the karts: the camera coming down from
  // above the grid during 3, 2, 1, the start lights, the banana peels, and
  // the names of the signed-in players above their karts.
  const counting = race.phase === "countdown";
  // While our own kart is being driven, its next checkpoint is lit up in yellow.
  const driving = keysDoSomething && Number.isInteger(mine.passed) && !about.big;
  // The walkers keep walking between two updates from the server, but only while a race runs.
  const walkersShown = walkersToShow(track, walkers, race.phase === "racing" ? ((performance.now() - walkersAt) / 1000) * 60 : 0);
  const scene = {
    intro: introShare(counting, race.countdownSteps),
    lights: startLights(counting || race.phase === "racing", race.countdownSteps),
    bananas,
    walkers: walkersShown,
    names,
    nextCheckpoint: driving ? nextCheckpointNumber(mine.passed, track) : undefined,
  };
  // When the race is over for everyone, the podium comes first: the first
  // three in the Hovione Atrium, the winner lifting the trophy (podium.js).
  // It stays in the picture until the next race starts. After
  // PODIUM_SECONDS the results board comes up on top of it, with everyone.
  if (race.phase === "finished" && podiumSince === null) {
    podiumSince = now;
    cheered = 0;
  } else if (race.phase !== "finished") {
    podiumSince = null;
  }
  if (podiumSince !== null) {
    const lineup = podiumLineup(latestKarts, track);
    const trackCanvas = document.getElementById("track");
    const shownFor = (now - podiumSince) / 1000;
    podium.paint(trackCanvas.getContext("2d"), { width: trackCanvas.width, height: trackCanvas.height }, lineup, shownFor, podiumCaption(lineup, formatTime));
    // The crowd cheers, again and again for a while.
    while (cheered < cheersDue(shownFor)) {
      sound.cheer();
      cheered++;
    }
  } else {
    draw(view, dressed(shown), camera, steer, others, scene);
  }

  // A checkpoint that was left out, or driving against the arrows for a
  // moment, brings up a warning. A missed checkpoint comes first: going
  // back for it means driving against the arrows.
  const missed = driving ? missedCheckpoint(mine, mine.passed) : null;
  const goingWrongWay = keysDoSomething && wrongWay(mine, now / 1000);
  const warning = missed !== null ? missedCheckpointMessage(track, missed) : goingWrongWay ? WRONG_WAY_MESSAGE : null;

  // When the race is over for everyone, the results board comes up: the
  // winner on top, then everyone else in the order of arrival. It is made
  // once, from the newest update, and stays until the next race starts.
  // The sentence about the next race moves from the middle of the track to
  // the bottom of the board.
  const podiumAlone = podiumSince !== null && now - podiumSince < PODIUM_SECONDS * 1000;
  // Finished while others still drive: your place, and wait for the podium.
  const waitingWords =
    race.phase === "racing" && mine?.finished === true ? finishedWords(finishPlace(latestKarts, myId) ?? 1, mine.steps, formatTime) : null;
  if (race.phase === "finished" && !podiumAlone && !board.isShown()) {
    const looks = new Map(latestKarts.filter((kart) => kart !== null && typeof kart === "object").map((kart) => [kart.id, lookOf(dressed(kart))]));
    board.show(boardLines(latestKarts, track, names, myId), looks);
  } else if (race.phase !== "finished" && board.isShown()) {
    board.hide();
  }
  board.say(mine !== undefined ? about.message : about.line);
  board.paint(now);

  messageBox.classList.toggle("countdown", about.big && warning === null);
  showHud({
    lap: Math.min(shown.lapsDone + 1, track.laps),
    laps: track.laps,
    steps: shown.steps,
    lapSteps: shown.lapSteps,
    view,
    message: board.isShown() || podiumAlone ? "" : (warning ?? waitingWords ?? about.message),
  });

  // The facts of this picture, for the sound: sound-cues.js decides from
  // them which beep, bump or jingle is due and how the engine sounds. A
  // player who is watching hears the kart they are watching.
  sound.frame(
    {
      label: about.big ? about.message : "",
      kart: shown,
      gas: keysDoSomething && input.gas,
      onGrass: tileKindAt(track, shown.x, shown.y) === "grass",
      spinning: shown.spin > 0,
      lapsDone: shown.lapsDone,
      laps: track.laps,
      finished: shown.finished === true,
      warning: warning !== null,
      others,
      air: shown.air,
      walkersDownNear: walkersDownNear(walkersShown, shown),
    },
    frameSeconds,
  );

  // In a race: our place ("2nd of 4") above the track, and a short notice
  // at the top of the picture when the race is about to end.
  const inRace = race.phase === "racing" || race.phase === "finished";
  const place = inRace && mine !== undefined ? placeLine(karts, track, myId) : "";
  placeBox.hidden = place === "";
  placeText.textContent = place;
  noticeText.textContent = timeLeftNotice(race, endsIn);

  // The small list in the corner: for a racer who has finished while the
  // others are still driving. Once the race is over, the big board replaces it.
  const showResults = race.phase === "racing" && mine?.finished === true;
  showResultsList(showResults ? resultLines(karts, track, names, myId, false) : []);

  requestAnimationFrame(frame);
}

/**
 * Puts the results list on the page: one line for each kart, the winner
 * first. The page is only touched when the list has changed. Every word is
 * written as text, never as HTML.
 */
function showResultsList(lines) {
  const asText = JSON.stringify(lines);
  if (asText === resultsShown) {
    return;
  }
  resultsShown = asText;
  resultsBox.hidden = lines.length === 0;
  resultsList.replaceChildren(
    ...lines.map((line) => {
      const item = document.createElement("li");
      item.classList.toggle("mine", line.mine);
      for (const [part, text] of [["place", line.place], ["who", line.mine ? `${line.who} (you)` : line.who], ["time", line.time]]) {
        const span = document.createElement("span");
        span.className = part;
        span.textContent = text;
        item.append(span);
      }
      return item;
    }),
  );
}

// A way to look at the online session from the browser's console.
window.kartGame = {
  state: () => ({ myId, view, connected, status, link: linkState, trackName, account, saved, race: { ...race }, karts: kartsShown }),
};

connect();
requestAnimationFrame(frame);
