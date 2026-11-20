// The menu sounds: a click for every button, and the hype sound when the
// characters are chosen. Made by our own code, like sound.js and music.js:
// no sound files.
//
// WHEN the hype plays is up to the pages: in the menu when the character
// choice is done and the race button is pressed (kart-panel.js), and online
// when everyone in the room has a character (online.js). It needs a browser
// and loudspeakers, so it is checked by ear on the page sound-test.html.
// Which clicks count is decided in ui-sound-cues.js, which has tests.
//
// It obeys the "Menu sounds" and master switches (audio-switches.js).

import { readSwitches, isHeard } from "./audio-switches.js";
import { makesClick } from "./ui-sound-cues.js";

// NUMBERS TO TUNE BY EAR. Loudness goes from 0 (silent) to 1.
const CLICK_LOUD = 0.18;
const HYPE_LOUD = 0.3;
/** How long the hype lasts, in seconds: the menu waits this long before going to the race. */
export const HYPE_SECONDS = 1.1;

/**
 * Plays the menu sounds on a browser's sound system.
 *   context      the browser's sound system (an AudioContext)
 *   destination  where the sound goes
 */
export function createUiSoundMachine(context, destination = context.destination) {
  const out = context.createGain();
  out.connect(destination);

  const hiss = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = hiss.getChannelData(0);
  for (let index = 0; index < samples.length; index++) {
    samples[index] = Math.random() * 2 - 1;
  }

  /** A short note with a quick rise and fall. */
  function blip(type, hertz, at, seconds, loud, slideTo = null) {
    const wave = context.createOscillator();
    wave.type = type;
    wave.frequency.setValueAtTime(hertz, at);
    if (slideTo !== null) {
      wave.frequency.exponentialRampToValueAtTime(slideTo, at + seconds);
    }
    const volume = context.createGain();
    volume.gain.setValueAtTime(0, at);
    volume.gain.linearRampToValueAtTime(loud, at + 0.005);
    volume.gain.exponentialRampToValueAtTime(0.001, at + seconds);
    wave.connect(volume);
    volume.connect(out);
    wave.start(at);
    wave.stop(at + seconds + 0.02);
  }

  return {
    /** A soft, short click: two quick high notes. */
    click() {
      const at = context.currentTime;
      blip("square", 1320, at, 0.035, CLICK_LOUD * 0.6);
      blip("triangle", 1980, at + 0.012, 0.05, CLICK_LOUD);
    },

    /**
     * The hype: a rising whoosh, then a bright chord hit with a cymbal, as
     * when the drivers are announced.
     */
    hype() {
      const at = context.currentTime;
      // The whoosh: hiss through a filter that opens upwards.
      const noise = context.createBufferSource();
      noise.buffer = hiss;
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(400, at);
      filter.frequency.exponentialRampToValueAtTime(5000, at + 0.45);
      const swell = context.createGain();
      swell.gain.setValueAtTime(0.001, at);
      swell.gain.exponentialRampToValueAtTime(HYPE_LOUD * 0.5, at + 0.42);
      swell.gain.linearRampToValueAtTime(0, at + 0.5);
      noise.connect(filter);
      filter.connect(swell);
      swell.connect(out);
      noise.start(at);
      noise.stop(at + 0.52);
      // A quick run up the notes of C major...
      [523.25, 659.25, 783.99].forEach((hertz, index) => blip("square", hertz, at + 0.2 + index * 0.08, 0.12, HYPE_LOUD * 0.35));
      // ...and the hit: a big C major chord, held, falling away.
      const hit = at + 0.46;
      for (const hertz of [261.63, 523.25, 659.25, 783.99, 1046.5]) {
        blip("sawtooth", hertz, hit, HYPE_SECONDS - 0.46, HYPE_LOUD * 0.18);
      }
      blip("sine", 110, hit, 0.35, HYPE_LOUD, 55); // a deep thump under it
      // The cymbal: bright hiss, falling away slowly.
      const crash = context.createBufferSource();
      crash.buffer = hiss;
      const bright = context.createBiquadFilter();
      bright.type = "highpass";
      bright.frequency.value = 6000;
      const fall = context.createGain();
      fall.gain.setValueAtTime(HYPE_LOUD * 0.4, hit);
      fall.gain.exponentialRampToValueAtTime(0.001, hit + 0.6);
      crash.connect(bright);
      bright.connect(fall);
      fall.connect(out);
      crash.start(hit);
      crash.stop(hit + 0.62);
    },
  };
}

/**
 * The menu sounds of one page.
 *   browserWindow  the browser's window
 *   storage        this browser's storage, for the switches
 * Gives click(), hype() and setSwitches() (after a change in Settings or M).
 * Clicks on the page's buttons are heard by themselves (listen()).
 */
export function createUiSound(browserWindow, storage) {
  let switches = readSwitches(storage);
  let context = null;
  let machine = null;

  /** The sound system, started on the first click or key (a browser allows no sound before). Gives null if there is none. */
  function wake() {
    if (!isHeard(switches, "interface")) {
      return null;
    }
    if (machine === null) {
      const SoundSystem = browserWindow.AudioContext ?? browserWindow.webkitAudioContext;
      if (typeof SoundSystem !== "function") {
        return null;
      }
      try {
        context = new SoundSystem();
        machine = createUiSoundMachine(context);
      } catch {
        context = null;
        machine = null;
        return null;
      }
    }
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }
    return machine;
  }
  browserWindow.addEventListener("pointerdown", wake);
  browserWindow.addEventListener("keydown", wake);

  return {
    click() {
      wake()?.click();
    },
    hype() {
      wake()?.hype();
    },
    /** Is the hype heard now? (The menu only waits for it if it is.) */
    hypeIsHeard: () => isHeard(switches, "interface"),
    setSwitches() {
      switches = readSwitches(storage);
    },
    /** Clicks on the buttons of this page make the click sound (ui-sound-cues.js says which count). */
    listen(page) {
      page.addEventListener("click", (event) => {
        if (makesClick(event.target)) {
          wake()?.click();
        }
      });
    },
  };
}
