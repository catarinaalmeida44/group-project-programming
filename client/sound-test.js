// The sound check page (sound-test.html): every sound of the game on a
// button, for the team to judge and tune by ear. It uses the very same
// sound machine as the race pages (sound.js), so what is heard here is what
// is heard in a race.
//
// Nothing plays by itself: the sound system is only started by the first
// click, and the engine only runs while its button says so.

import { createSoundMachine } from "./sound.js";
import { makePart } from "./page-parts.js";

// What each button says, the sound it plays, and how strong.
const BUTTONS = [
  ["Countdown: 3, 2, 1", { name: "count", strength: 1 }],
  ["GO!", { name: "go", strength: 1 }],
  ["A lap is done", { name: "lap", strength: 1 }],
  ["The last lap begins", { name: "lastLap", strength: 1 }],
  ["Finish", { name: "finish", strength: 1 }],
  ["Only the crowd cheering", { name: "cheer", strength: 1 }],
  ["Slipping on a banana", { name: "spin", strength: 1 }],
  ["Bump into a kart, gently", { name: "bumpKart", strength: 0.35 }],
  ["Bump into a kart, hard", { name: "bumpKart", strength: 1 }],
  ["Touch a wall, gently", { name: "bumpWall", strength: 0.35 }],
  ["Hit a wall, hard", { name: "bumpWall", strength: 1 }],
  ["Warning (wrong way, missed checkpoint)", { name: "warning", strength: 1 }],
];

const status = document.getElementById("sound-check-status");
const speed = document.getElementById("engine-speed");
const speedText = document.getElementById("engine-speed-text");
const gas = document.getElementById("engine-gas");
const grass = document.getElementById("engine-grass");
const skid = document.getElementById("engine-skid");
const engineButton = document.getElementById("engine-toggle");

let machine = null; // the sound machine, made at the first click
let context = null;
let engineRuns = false;

/** Starts the sound system at the first click. Gives the machine, or null in a browser without sound. */
function wake() {
  if (machine === null) {
    const SoundSystem = window.AudioContext ?? window.webkitAudioContext;
    if (typeof SoundSystem !== "function") {
      status.textContent = "This browser cannot make sound.";
      return null;
    }
    context = new SoundSystem();
    machine = createSoundMachine(context);
  }
  if (context.state === "suspended") {
    context.resume();
  }
  return machine;
}

/** Tells the machine how the engine should sound, from what the page is set to. */
function setEngine() {
  const share = Number(speed.value) / 100;
  speedText.textContent = `${speed.value}%`; // as text, never as HTML
  if (machine === null) {
    return;
  }
  machine.setEngine({
    running: engineRuns,
    pitch: engineRuns ? share : 0,
    throttle: engineRuns && gas.checked ? 1 : 0,
    grass: engineRuns && grass.checked ? share : 0,
    skid: engineRuns && skid.checked ? Math.max(0.6, share) : 0,
  });
}

for (const [words, cue] of BUTTONS) {
  const button = makePart(document, "button", "button", words);
  button.type = "button";
  button.addEventListener("click", () => wake()?.play(cue));
  document.getElementById("sound-buttons").append(button);
}

engineButton.addEventListener("click", () => {
  if (wake() === null) {
    return;
  }
  engineRuns = !engineRuns;
  engineButton.textContent = engineRuns ? "Stop the engine" : "Start the engine";
  setEngine();
});
for (const control of [speed, gas, grass, skid]) {
  control.addEventListener("input", setEngine);
}

// Fall silent when the page is not being looked at.
document.addEventListener("visibilitychange", () => {
  if (context !== null && document.hidden) {
    context.suspend();
  }
});
