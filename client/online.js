// The online page: driving and racing on the test track with other people.
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
// Known limit: your own kart reacts a moment late, because your key press
// has to travel to the server and the result has to travel back.

import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { createKeyboard } from "./keyboard.js";
import { createPainter } from "./draw.js";
import { createHud } from "./hud.js";
import { createPlayback, readServerMessage, statusLine, QUIET_AFTER_MS } from "./net.js";
import { readRace, raceView, kartToWatch } from "./race-view.js";
import { VIEWS, followTarget, easeTowards, nextView } from "./camera.js";

const track = TEST_OVAL;

const COLOUR_NAMES = ["red", "blue", "yellow", "green", "purple", "orange", "teal", "pink"];

// ---- The parts of the page ----
const draw = createPainter(document.getElementById("track"), track);
const showHud = createHud(document);
const statusText = document.getElementById("status");
const messageBox = document.getElementById("message");

// ---- What we know from the server ----
const playback = createPlayback(); // the latest updates, for smooth drawing
let race = readRace(null); //          the race as of the latest update: phase, countdown, host, who is watching
let myId = null; //                    our player number, from the "welcome" message
let status = "Connecting to the server...";
let connected = false;
let kartsShown = null; //              the karts in the picture drawn last
let lastNewsAt = null; //              when the server last sent us anything

// ---- The camera ----
let view = VIEWS[0];
let camera = null;
let lastFrameTime = null;

// ---- The live connection ----
// "wss" is the secure kind, used when the page itself was loaded securely (https).
const secure = window.location.protocol === "https:";
const connection = new WebSocket(`${secure ? "wss" : "ws"}://${window.location.host}/play`);

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
    const colour = COLOUR_NAMES[message.place % COLOUR_NAMES.length];
    status = `Connected. You are the ${colour} kart.`;
  } else if (message.type === "state") {
    playback.add(message, performance.now());
    const raceBefore = race;
    race = readRace(message);
    if (race.phase === "countdown" && raceBefore.phase !== "countdown") {
      camera = null; // a race has just started: jump to the grid, do not glide there
    }
  } else if (message.type === "full") {
    status = "The room is full. Try again in a few minutes.";
  }
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
  // Anyone can press Enter, but the server only obeys the host. This page
  // sends it only for the host, to spare the server pointless messages.
  onStart: () => {
    if (race.host === myId) {
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

  // The kart in the middle of the picture: our own, or, when we joined
  // during a race and are watching, the kart that is furthest ahead.
  const shown = mine ?? (karts === null ? undefined : kartToWatch(karts));
  if (shown === undefined) {
    // Nothing to draw yet: we are still connecting, or we were disconnected.
    requestAnimationFrame(frame);
    return;
  }

  const others = karts.filter((kart) => kart.id !== shown.id);
  const target = followTarget(shown, track);
  camera = camera === null ? target : easeTowards(camera, target, frameSeconds);

  // The kart leans while the player steers, but only when the keys do
  // something: not when watching, during 3, 2, 1 or after the finish.
  const keysWork = mine !== undefined && !mine.finished && race.phase !== "countdown";
  const steer = keysWork ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
  draw(view, shown, camera, steer, others);

  messageBox.classList.toggle("countdown", about.big);
  showHud({
    lap: Math.min(shown.lapsDone + 1, track.laps),
    laps: track.laps,
    steps: shown.steps,
    lapSteps: shown.lapSteps,
    view,
    message: about.message,
  });

  requestAnimationFrame(frame);
}

// A way to look at the online session from the browser's console.
window.kartGame = {
  state: () => ({ myId, view, connected, status, race: { ...race }, karts: kartsShown }),
};

requestAnimationFrame(frame);
