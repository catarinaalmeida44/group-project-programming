// The sounds of a race, made by our own code.
//
// There are no sound files. A browser can make sound itself (the "Web Audio"
// part of every browser): we ask it for simple waves, hiss and filters, and
// shape them into an engine, a bump or a jingle. That is the same decision
// as for the pictures: everything in the game is made by our own code.
//
// WHEN each sound is due is decided in sound-cues.js, which has tests. This
// file is HOW each one sounds. It needs a browser and loudspeakers, so it is
// checked by ear, on the page sound-test.html.
//
// THE PARTS
//   createSoundMachine  builds everything on a browser's sound system: the
//                       engine and the tyres, which run all the time, and
//                       play(), for the short sounds
//   createRaceSound     what a race page uses: it wakes the sound at the
//                       player's first key press, listens to the facts of
//                       every picture, and remembers "sound on or off"
//
// A browser only lets a page make sound after the player has pressed a key
// or clicked. So nothing is heard before the first key press.

import { watchForSounds, readSoundOn, saveSoundOn, NO_ENGINE } from "./sound-cues.js";

// ---------------------------------------------------------------------------
// NUMBERS TO TUNE BY EAR. Loudness goes from 0 (silent) to 1. Notes are in
// hertz: 440 is the A that orchestras tune to, and double the number is the
// same note one octave higher.
// ---------------------------------------------------------------------------

/** How loud everything is together, before the limiter. */
export const MASTER_VOLUME = 0.5;
/**
 * A last turn-down after the limiter. A limiter is quick but not instant,
 * so the very first moment of a loud sound slips through it. With this, even
 * every sound of the game played in the same moment, on top of the engine at
 * full speed, stays below the point where loudspeakers crackle (measured on
 * 15 November 2026: 1.1 without it, where 1 is the limit).
 */
const HEADROOM = 0.8;

// The engine is kept in the background on purpose. (On 15 November 2026
// Catarina listened to the first version: the engine was too loud and too
// much at top speed, and the short sounds were too tame. So the engine got
// about half as loud and duller at speed, and the short sounds got bigger.)
const ENGINE = {
  idleNote: 46, //      the note of the engine standing still
  topNote: 178, //      and at top speed
  gasLift: 1.06, //     holding the gas raises the note a little
  quiet: 0.05, //       loudness standing still
  loud: 0.05, //        added on the way to top speed
  gasLoud: 0.02, //     added while the gas is held
  dull: 300, //         the filter that takes the sharp edge off: where it starts...
  bright: 850, //       ...and how far it opens towards top speed
  quickness: 0.07, //   how fast the engine follows the kart, in seconds
};
const GRASS_LOUD = 0.32; // the rumble on grass, at top speed
const SKID_LOUD = 0.26; //  the squeal of tyres, at its strongest

// ---------------------------------------------------------------------------

/**
 * Builds the sounds on a browser's sound system.
 *   context      the browser's sound system (an "AudioContext")
 *   destination  where the sound goes. Normally the loudspeakers
 * Gives { setEngine, play, setVolume }.
 */
export function createSoundMachine(context, destination = context.destination) {
  // Everything passes through one volume knob and then a "limiter", which
  // turns the loudest moments down by itself so that nothing crackles.
  const master = context.createGain();
  master.gain.value = MASTER_VOLUME;
  const limiter = context.createDynamicsCompressor();
  const headroom = context.createGain();
  headroom.gain.value = HEADROOM;
  master.connect(limiter);
  limiter.connect(headroom);
  headroom.connect(destination);

  // Two seconds of hiss, used for tyres, grass and the crunch of a bump.
  const hiss = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const samples = hiss.getChannelData(0);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.random() * 2 - 1;
  }

  // ---- The engine: two buzzing waves an octave apart, through a filter ----
  const engineLoudness = context.createGain();
  engineLoudness.gain.value = 0;
  const engineFilter = context.createBiquadFilter();
  engineFilter.type = "lowpass";
  engineFilter.frequency.value = ENGINE.dull;
  const high = context.createOscillator();
  high.type = "sawtooth";
  const low = context.createOscillator();
  low.type = "square";
  const lowShare = context.createGain();
  lowShare.gain.value = 0.55;
  high.frequency.value = ENGINE.idleNote;
  low.frequency.value = ENGINE.idleNote / 2;
  high.connect(engineFilter);
  low.connect(lowShare);
  lowShare.connect(engineFilter);
  engineFilter.connect(engineLoudness);
  engineLoudness.connect(master);
  high.start();
  low.start();

  // ---- The tyres: the same hiss, filtered two ways ----
  const hissing = context.createBufferSource();
  hissing.buffer = hiss;
  hissing.loop = true;
  const grassFilter = context.createBiquadFilter();
  grassFilter.type = "lowpass";
  grassFilter.frequency.value = 380; // a low rumble
  const grassLoudness = context.createGain();
  grassLoudness.gain.value = 0;
  const skidFilter = context.createBiquadFilter();
  skidFilter.type = "bandpass";
  skidFilter.frequency.value = 1850; // a narrow, high squeal
  skidFilter.Q.value = 7;
  const skidLoudness = context.createGain();
  skidLoudness.gain.value = 0;
  hissing.connect(grassFilter);
  grassFilter.connect(grassLoudness);
  grassLoudness.connect(master);
  hissing.connect(skidFilter);
  skidFilter.connect(skidLoudness);
  skidLoudness.connect(master);
  hissing.start();

  /**
   * One note: a wave that starts at once and dies away. It can slide from
   * one note to another, and it can wobble ("wobble": how many times a
   * second, and by how many hertz), which makes a held note sound alive.
   */
  function note({ wave = "sine", from, to = from, at, lasts, loud, wobble = null }) {
    const oscillator = context.createOscillator();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(from, at);
    if (to !== from) {
      oscillator.frequency.exponentialRampToValueAtTime(to, at + lasts);
    }
    if (wobble !== null) {
      const wobbler = context.createOscillator();
      wobbler.frequency.value = wobble.rate;
      const depth = context.createGain();
      depth.gain.value = wobble.depth;
      wobbler.connect(depth);
      depth.connect(oscillator.frequency);
      wobbler.start(at);
      wobbler.stop(at + lasts + 0.03);
    }
    const loudness = context.createGain();
    loudness.gain.setValueAtTime(0.0001, at);
    loudness.gain.exponentialRampToValueAtTime(Math.max(loud, 0.0002), at + 0.008);
    loudness.gain.exponentialRampToValueAtTime(0.0001, at + lasts);
    oscillator.connect(loudness);
    loudness.connect(master);
    oscillator.start(at);
    oscillator.stop(at + lasts + 0.03);
  }

  /**
   * A burst of hiss through a filter: the crunch in a bump, the squeal in a
   * slip. Normally it starts at full loudness and dies away. With "rise"
   * (in seconds) it swells up first, like a crowd starting to cheer.
   */
  function crunch({ kind, around, sharp = 1, at, lasts, loud, rise = 0 }) {
    const source = context.createBufferSource();
    source.buffer = hiss;
    source.loop = true; // the hiss is two seconds long: a longer burst goes round again
    const filter = context.createBiquadFilter();
    filter.type = kind;
    filter.frequency.value = around;
    filter.Q.value = sharp;
    const loudness = context.createGain();
    if (rise > 0) {
      loudness.gain.setValueAtTime(0.0001, at);
      loudness.gain.exponentialRampToValueAtTime(Math.max(loud, 0.0002), at + rise);
    } else {
      loudness.gain.setValueAtTime(Math.max(loud, 0.0002), at);
    }
    loudness.gain.exponentialRampToValueAtTime(0.0001, at + lasts);
    source.connect(filter);
    filter.connect(loudness);
    loudness.connect(master);
    source.start(at, Math.random()); // begin somewhere in the hiss, so no two bursts are alike
    source.stop(at + lasts + 0.03);
  }

  /**
   * A crowd cheering: a roar that swells up and dies away, whistles going
   * "wheee", and a lot of clapping. Each time it is a little different.
   *
   * It has no voices in it on purpose. Catarina asked for children shouting
   * "yaaay", like a well-known sound effect. That recording is not ours to
   * use. A first try at making voices by code (a buzzing wave through
   * filters that move like a mouth) came out, in her words, "demonic". A
   * crowd from a distance is mostly hiss, and code is good at hiss. For a
   * real "yay", the team would have to record their own.
   */
  function cheer(at) {
    // The roar: the hiss, kept to the three bands where a crowd is loudest.
    crunch({ kind: "bandpass", around: 750, sharp: 0.9, at, rise: 0.22, lasts: 2.2, loud: 1.0 });
    crunch({ kind: "bandpass", around: 1500, sharp: 0.9, at, rise: 0.28, lasts: 2.1, loud: 0.8 });
    crunch({ kind: "bandpass", around: 2800, sharp: 1.2, at, rise: 0.3, lasts: 1.8, loud: 0.4 });
    // Three whistles, each sliding up.
    note({ from: 1500, to: 2900, at: at + 0.15, lasts: 0.45, loud: 0.26, wobble: { rate: 11, depth: 60 } });
    note({ from: 1900, to: 3300, at: at + 0.6, lasts: 0.5, loud: 0.22, wobble: { rate: 13, depth: 70 } });
    note({ from: 1300, to: 2500, at: at + 1.05, lasts: 0.4, loud: 0.2, wobble: { rate: 10, depth: 50 } });
    // Clapping: many short claps, never at the same moments twice.
    for (let clap = 0; clap < 48; clap++) {
      crunch({ kind: "bandpass", around: 1500 + Math.random() * 1500, sharp: 1.6, at: at + 0.1 + Math.random() * 1.9, lasts: 0.03, loud: 0.5 });
    }
  }

  // The short sounds. "at" is the moment to start, "strength" from 0 to 1.
  // They are big on purpose, like an arcade game: several notes at once, a
  // thump underneath, a rush of hiss on top.
  const SOUNDS = {
    // 3, 2, 1: a fat beep for each number, with a drum thump under it.
    count: (at) => {
      note({ wave: "square", from: 523, at, lasts: 0.24, loud: 0.3 });
      note({ from: 1047, at, lasts: 0.24, loud: 0.5 });
      note({ from: 170, to: 55, at, lasts: 0.2, loud: 0.7 });
    },
    // GO!: a swoop up into a big bright chord that rings on, with a boom and a rush of air.
    go: (at) => {
      note({ wave: "sawtooth", from: 262, to: 1047, at, lasts: 0.16, loud: 0.3 });
      [1047, 1319, 1568, 2093].forEach((pitch, i) =>
        note({ wave: i === 0 ? "square" : "triangle", from: pitch, at: at + 0.12, lasts: 0.95, loud: i === 0 ? 0.28 : 0.38, wobble: { rate: 7, depth: 7 } }),
      );
      note({ from: 140, to: 45, at: at + 0.12, lasts: 0.4, loud: 0.8 });
      crunch({ kind: "highpass", around: 3200, at: at + 0.12, lasts: 0.55, loud: 0.3 });
    },
    // A lap done: four notes running up, each with a sparkle an octave above, the last one held.
    lap: (at) => {
      [784, 988, 1175, 1568].forEach((pitch, i) => {
        const last = i === 3;
        note({ wave: "triangle", from: pitch, at: at + i * 0.08, lasts: last ? 0.5 : 0.12, loud: 0.45, wobble: last ? { rate: 8, depth: 8 } : null });
        note({ from: pitch * 2, at: at + i * 0.08, lasts: last ? 0.5 : 0.1, loud: 0.2 });
      });
    },
    // The last lap begins: ta-ta-ta-TAAA, like a trumpet call.
    lastLap: (at) => {
      for (const delay of [0, 0.1, 0.2]) {
        note({ wave: "square", from: 880, at: at + delay, lasts: 0.08, loud: 0.3 });
        note({ wave: "triangle", from: 1760, at: at + delay, lasts: 0.08, loud: 0.32 });
      }
      note({ wave: "square", from: 1175, at: at + 0.32, lasts: 0.6, loud: 0.3, wobble: { rate: 9, depth: 12 } });
      note({ wave: "triangle", from: 2349, at: at + 0.32, lasts: 0.6, loud: 0.3 });
      note({ from: 150, to: 60, at: at + 0.32, lasts: 0.3, loud: 0.6 });
    },
    // The finish: a fanfare. A run of notes up, then a big chord held with a shimmer on top.
    finish: (at) => {
      const run = [523, 659, 784, 1047, 784, 1047];
      const moments = [0, 0.11, 0.22, 0.33, 0.5, 0.61];
      run.forEach((pitch, i) => {
        note({ wave: "square", from: pitch, at: at + moments[i], lasts: 0.12, loud: 0.26 });
        note({ wave: "triangle", from: pitch * 2, at: at + moments[i], lasts: 0.12, loud: 0.32 });
      });
      for (const pitch of [1047, 1319, 1568, 2093]) {
        note({ wave: "triangle", from: pitch, at: at + 0.76, lasts: 1.4, loud: 0.34, wobble: { rate: 6, depth: 9 } });
      }
      note({ wave: "square", from: 523, at: at + 0.76, lasts: 1.4, loud: 0.18 });
      note({ from: 131, to: 62, at: at + 0.76, lasts: 0.55, loud: 0.7 });
      crunch({ kind: "highpass", around: 5000, at: at + 0.76, lasts: 1.2, loud: 0.22 });
      // And then the crowd goes wild.
      cheer(at + 1.0);
    },
    // Slipping on a banana, like in a cartoon: a squish, a whistle sliding all
    // the way down, a tone that whirls round and round for as long as the kart
    // spins, squealing tyres, and "boing-oing-oing" at the end.
    spin: (at) => {
      crunch({ kind: "lowpass", around: 500, at, lasts: 0.12, loud: 0.7 });
      note({ from: 1700, to: 140, at, lasts: 0.55, loud: 0.45, wobble: { rate: 20, depth: 80 } });
      note({ wave: "triangle", from: 520, at: at + 0.1, lasts: 1.1, loud: 0.34, wobble: { rate: 4.2, depth: 260 } });
      note({ wave: "square", from: 260, at: at + 0.1, lasts: 1.1, loud: 0.12, wobble: { rate: 4.2, depth: 130 } });
      crunch({ kind: "bandpass", around: 1800, sharp: 6, at, lasts: 1.15, loud: 0.5 });
      note({ wave: "triangle", from: 240, to: 620, at: at + 1.15, lasts: 0.16, loud: 0.42 });
      note({ wave: "triangle", from: 300, to: 700, at: at + 1.33, lasts: 0.14, loud: 0.3 });
      note({ wave: "triangle", from: 360, to: 780, at: at + 1.49, lasts: 0.12, loud: 0.2 });
    },
    // Kart against kart: BONK, a clang of metal that rings on, and, when it
    // was a hard hit, an angry double honk.
    bumpKart: (at, strength) => {
      note({ from: 260, to: 45, at, lasts: 0.28, loud: 1.0 * strength });
      note({ wave: "square", from: 420, to: 120, at, lasts: 0.1, loud: 0.35 * strength });
      crunch({ kind: "highpass", around: 1500, at, lasts: 0.12, loud: 0.7 * strength });
      [587, 911, 1433, 2100].forEach((pitch, i) => note({ from: pitch, at, lasts: 0.38 - i * 0.05, loud: (0.3 - i * 0.05) * strength }));
      if (strength > 0.55) {
        for (const [late, lasts] of [[0.12, 0.13], [0.3, 0.24]]) {
          note({ wave: "square", from: 466, at: at + late, lasts, loud: 0.26 * strength });
          note({ wave: "square", from: 370, at: at + late, lasts, loud: 0.26 * strength });
        }
      }
    },
    // Kart against wall: a boom, a long crash and a crack, and, when it was a
    // hard hit, bits tinkling down and a sad slide down afterwards.
    // A ramp: a quick rising whoop as the kart leaves the ground.
    jump: (at) => {
      note({ wave: "triangle", from: 240, to: 940, at, lasts: 0.3, loud: 0.42 });
      note({ wave: "square", from: 480, to: 1400, at: at + 0.04, lasts: 0.22, loud: 0.12 });
    },
    // A walker toppled over: two silly notes, down and then up, like a cartoon "boing".
    oops: (at) => {
      note({ wave: "triangle", from: 620, to: 200, at, lasts: 0.2, loud: 0.4 });
      note({ wave: "triangle", from: 260, to: 700, at: at + 0.17, lasts: 0.24, loud: 0.38, wobble: { rate: 18, depth: 60 } });
    },
    bumpWall: (at, strength) => {
      note({ from: 160, to: 28, at, lasts: 0.55, loud: 1.0 * strength });
      note({ wave: "sawtooth", from: 90, to: 40, at, lasts: 0.3, loud: 0.4 * strength });
      crunch({ kind: "lowpass", around: 1100, at, lasts: 0.5, loud: 0.9 * strength });
      crunch({ kind: "highpass", around: 2800, at, lasts: 0.16, loud: 0.5 * strength });
      if (strength > 0.55) {
        [0.18, 0.27, 0.33, 0.42, 0.5].forEach((late, i) => note({ from: 2400 - i * 250, at: at + late, lasts: 0.07, loud: 0.22 * strength }));
        note({ wave: "triangle", from: 500, to: 180, at: at + 0.15, lasts: 0.45, loud: 0.3 * strength, wobble: { rate: 9, depth: 25 } });
      }
    },
    // A warning on the screen: three buzzes, high, low, high, like an alarm.
    warning: (at) => {
      [220, 165, 220].forEach((pitch, i) => note({ wave: "square", from: pitch, at: at + i * 0.16, lasts: 0.13, loud: 0.34 }));
    },
  };

  // The cheer on its own, for the sound check page. In a race it is the end of "finish".
  SOUNDS.cheer = (at) => cheer(at);

  return {
    /** Makes the engine and the tyres sound the way sound-cues.js says they should, from now on. */
    setEngine(engine, at = context.currentTime) {
      const state = engine ?? NO_ENGINE;
      const pitch = ENGINE.idleNote + (ENGINE.topNote - ENGINE.idleNote) * state.pitch ** 0.85;
      const sung = pitch * (state.throttle > 0 ? ENGINE.gasLift : 1);
      const loud = state.running ? ENGINE.quiet + ENGINE.loud * state.pitch + ENGINE.gasLoud * state.throttle : 0;
      high.frequency.setTargetAtTime(sung, at, ENGINE.quickness);
      low.frequency.setTargetAtTime(sung / 2, at, ENGINE.quickness);
      engineFilter.frequency.setTargetAtTime(ENGINE.dull + ENGINE.bright * state.pitch + 400 * state.throttle, at, ENGINE.quickness);
      engineLoudness.gain.setTargetAtTime(loud, at, ENGINE.quickness);
      grassLoudness.gain.setTargetAtTime(GRASS_LOUD * state.grass, at, 0.1);
      skidLoudness.gain.setTargetAtTime(SKID_LOUD * state.skid, at, 0.05);
    },

    /** Plays one short sound: { name, strength } from sound-cues.js. A name we do not know plays nothing. */
    play(cue, at = context.currentTime) {
      const sound = Object.hasOwn(SOUNDS, cue?.name) ? SOUNDS[cue.name] : undefined;
      if (sound !== undefined) {
        const strength = Number.isFinite(cue.strength) ? Math.min(Math.max(cue.strength, 0), 1) : 1;
        sound(at, strength);
      }
    },

    /** Turns everything up or down, smoothly. 0 is silent, 1 is the normal loudness. */
    setVolume(share, at = context.currentTime) {
      master.gain.setTargetAtTime(MASTER_VOLUME * Math.min(Math.max(share, 0), 1), at, 0.03);
    },
  };
}

/** The names of the short sounds, for the sound check page. */
export const SOUND_NAMES = ["count", "go", "lap", "lastLap", "finish", "spin", "bumpKart", "bumpWall", "warning", "jump", "oops"];

/**
 * The sound of one race page.
 *   browserWindow  the browser's window
 *   storage        this browser's storage, for "sound on or off" (storage.js)
 * Gives:
 *   frame(facts, seconds)  call for every picture, with the facts that
 *                          sound-cues.js describes
 *   toggle()               switches the sound off or on, remembers it, and
 *                          says which it is now
 *   isOn()                 is the sound switched on?
 *   cheer()                the crowd cheers once (the podium, podium.js)
 */
export function createRaceSound(browserWindow, storage) {
  const watch = watchForSounds();
  let on = readSoundOn(storage);
  let context = null;
  let machine = null;

  /** Starts the sound system. Only possible once the player has pressed a key or clicked. */
  function wake() {
    if (!on) {
      return;
    }
    if (machine === null) {
      const SoundSystem = browserWindow.AudioContext ?? browserWindow.webkitAudioContext;
      if (typeof SoundSystem !== "function") {
        return; // a browser without sound: the game simply stays silent
      }
      try {
        context = new SoundSystem();
        machine = createSoundMachine(context);
      } catch {
        context = null;
        machine = null;
        return;
      }
    }
    if (context.state === "suspended" && !browserWindow.document.hidden) {
      context.resume().catch(() => {});
    }
  }
  browserWindow.addEventListener("keydown", wake);
  browserWindow.addEventListener("pointerdown", wake);

  // A page that is not being looked at (another tab is in front) falls
  // silent, and picks up again when the player comes back.
  browserWindow.document.addEventListener("visibilitychange", () => {
    if (context === null) {
      return;
    }
    if (browserWindow.document.hidden) {
      context.suspend().catch(() => {});
    } else if (on) {
      context.resume().catch(() => {});
    }
  });

  return {
    isOn: () => on,

    toggle() {
      on = !on;
      saveSoundOn(storage, on);
      if (on) {
        wake();
        machine?.setVolume(1);
      } else {
        machine?.setVolume(0);
      }
      return on;
    },

    cheer() {
      if (on && machine !== null) {
        machine.play({ name: "cheer" });
      }
    },

    frame(facts, frameSeconds) {
      // The facts are always looked at, sound or no sound, so that switching
      // the sound on in the middle of a race does not play old news.
      const { cues, engine } = watch(facts, frameSeconds);
      if (!on || machine === null) {
        return;
      }
      machine.setEngine(engine);
      for (const cue of cues) {
        machine.play(cue);
      }
    },
  };
}
