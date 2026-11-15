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

import { TRACKS, storeysOf } from "../shared/tracks/index.js";
import { chooseTrackName } from "./track-choice.js";
import { createKeyboard } from "./keyboard.js";
import { createPainter } from "./draw.js";
import { createHud } from "./hud.js";
import { createPlayback, readServerMessage, bananasOf, statusLine, accountLine, othersLine, QUIET_AFTER_MS } from "./net.js";
import { introShare, startLights, spinTurnOf } from "./scene.js";
import { COLOURS, lookFromChoice, readChoice } from "./kart-choice.js";
import { lookOfTrack } from "./track-looks.js";
import { routePoints, watchForWrongWay, WRONG_WAY_MESSAGE } from "./route.js";
import { nextCheckpointNumber, watchForMissedCheckpoint, missedCheckpointMessage } from "./checkpoints.js";
import { placeLine, resultLines, boardLines } from "./standings.js";
import { createResultsBoard } from "./results-board.js";
import { lookOf } from "./kart-shape.js";
import { SPIN_STEPS } from "../shared/hazards.js";
import { readRace, readEndsIn, timeLeftNotice, raceView, kartToWatch } from "./race-view.js";
import { followTarget, easeTowards, nextView } from "./camera.js";
import { storageOf } from "./storage.js";
import { readSettings } from "./settings.js";

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

// ---- What we know from the server ----
const playback = createPlayback(); // the latest updates, for smooth drawing
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
let othersShown = ""; //               the "With you: ..." line as it is on the page now

// ---- What the player chose in the menu ----
const storage = storageOf(window);
const myChoice = readChoice(storage); // the colours of their kart, as three numbers, or null (kart-choice.js)

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
const connection = new WebSocket(`${secure ? "wss" : "ws"}://${window.location.host}/play?track=${trackName}`);

connection.addEventListener("open", () => {
  connected = true;
});

connection.addEventListener("message", (event) => {
  const message = readServerMessage(event.data);
  if (message === null) {
    return; // not something this page understands: ignore it
  }
  lastNewsAt = performance.now();
  if (message.type === "welcome") {
    myId = message.id;
    // Tell the server the colours chosen in the menu, so the others see
    // them too. Without a choice the kart has the colours of its place.
    const colour =
      myChoice === null ? COLOUR_NAMES[message.place % COLOUR_NAMES.length] : COLOURS.body[myChoice.body].name.toLowerCase();
    if (myChoice !== null) {
      send({ type: "look", ...myChoice });
    }
    status = `Connected. You are the ${colour} kart.`;
  } else if (message.type === "state") {
    playback.add(message, performance.now());
    latestKarts = message.karts;
    bananas = bananasOf(message);
    const raceBefore = race;
    race = readRace(message);
    endsIn = readEndsIn(message);
    if (race.phase === "countdown" && raceBefore.phase !== "countdown") {
      camera = null; // a race has just started: jump to the grid, do not glide there
    }
  } else if (message.type === "full") {
    status = "The room is full. Try again in a few minutes.";
  } else if (message.type === "account") {
    account = message;
  } else if (message.type === "saved") {
    saved = message;
  } else if (message.type === "names") {
    names = message.names;
  }
  accountText.textContent = accountLine(account, saved); // as text, never as HTML
});

connection.addEventListener("close", () => {
  if (connected && myId !== null) {
    status = "The connection to the server was lost. Reload the page to join again.";
  } else if (myId === null && !status.startsWith("The room is full")) {
    status = "Could not connect to the server. It may be waking up: wait a minute and reload the page.";
  }
  connected = false;
});

/** Sends one message to the server, if the connection is open. */
function send(message) {
  if (connection.readyState === WebSocket.OPEN) {
    connection.send(JSON.stringify(message));
  }
}

// ---- The keyboard ----
const keyboard = createKeyboard(window, {
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
  const allIsWell = connected && myId !== null && karts !== null && sinceLastUpdateMs <= QUIET_AFTER_MS;
  const line = statusLine({
    status,
    connected,
    playerCount: karts === null ? 0 : karts.length + race.watching.length,
    sinceLastUpdateMs,
  });
  statusText.textContent = allIsWell && about.line !== "" ? `${line} ${about.line}` : line;

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
    requestAnimationFrame(frame);
    return;
  }

  const others = karts.filter((kart) => kart.id !== shown.id).map(dressed);
  const target = followTarget(shown, track);
  camera = camera === null ? target : easeTowards(camera, target, frameSeconds);

  // The kart leans while the player steers, but only when the keys do
  // something: not when watching, during 3, 2, 1, after the finish, or
  // while it spins after a banana.
  const spinning = mine !== undefined && mine.spin > 0;
  const keysWork = mine !== undefined && !mine.finished && race.phase !== "countdown" && !spinning;
  const steer = keysWork ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;

  // What the picture shows besides the karts: the camera coming down from
  // above the grid during 3, 2, 1, the start lights, the banana peels, and
  // the names of the signed-in players above their karts.
  const counting = race.phase === "countdown";
  // While our own kart is being driven, its next checkpoint is lit up in yellow.
  const driving = keysWork && Number.isInteger(mine.passed) && !about.big;
  const scene = {
    intro: introShare(counting, race.countdownSteps),
    lights: startLights(counting || race.phase === "racing", race.countdownSteps),
    bananas,
    names,
    nextCheckpoint: driving ? nextCheckpointNumber(mine.passed, track) : undefined,
  };
  draw(view, dressed(shown), camera, steer, others, scene);

  // A checkpoint that was left out, or driving against the arrows for a
  // moment, brings up a warning. A missed checkpoint comes first: going
  // back for it means driving against the arrows.
  const missed = driving ? missedCheckpoint(mine, mine.passed) : null;
  const goingWrongWay = keysWork && race.phase === "racing" && wrongWay(mine, now / 1000);
  const warning = missed !== null ? missedCheckpointMessage(track, missed) : goingWrongWay ? WRONG_WAY_MESSAGE : null;

  // When the race is over for everyone, the results board comes up: the
  // winner on top, then everyone else in the order of arrival. It is made
  // once, from the newest update, and stays until the next race starts.
  // The sentence about the next race moves from the middle of the track to
  // the bottom of the board.
  if (race.phase === "finished" && !board.isShown()) {
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
    message: board.isShown() ? "" : (warning ?? about.message),
  });

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
  state: () => ({ myId, view, connected, status, trackName, account, saved, race: { ...race }, karts: kartsShown }),
};

requestAnimationFrame(frame);
