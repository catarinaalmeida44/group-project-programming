// The music player: plays the songs of music-score.js with the browser's
// own sound system ("Web Audio"), like sound.js does for the engine.
//
// WHICH song plays when is decided in music-cues.js, and the notes are in
// music-score.js; both have tests. This file is HOW they sound. It needs a
// browser and loudspeakers, so it is checked by ear, on the page
// sound-test.html.
//
// THE PARTS
//   createMusicPlayer  plays songs on a browser's sound system: play(name),
//                      setSpeed(), setVolume()
//   createPageMusic    what a page uses: it wakes the sound at the first key
//                      press or click (a browser allows no sound before),
//                      follows what the page says is happening, and obeys the
//                      Music and master switches (audio-switches.js)
//
// THE INSTRUMENTS, all simple waves
//   lead   a square wave, softened: the tune
//   bass   a triangle wave: round and low
//   arp    a quiet square wave, short notes: the chords
//   drums  a kick (a low note falling fast), a snare and a hi-hat (hiss)

import { SONGS, STEPS_PER_BAR, notesBetween, stepSeconds, hertzOf, barsOf, FINAL_LAP_SPEED } from "./music-score.js";
import { musicFor, isNewSong } from "./music-cues.js";
import { readSwitches, isHeard } from "./audio-switches.js";

// ---------------------------------------------------------------------------
// NUMBERS TO TUNE BY EAR. Loudness goes from 0 (silent) to 1.
// ---------------------------------------------------------------------------

/** How loud the music is, all together. Kept under the race sounds, so the engine and the beeps stay clear. */
export const MUSIC_VOLUME = 0.22;
const LOUD = { lead: 0.16, bass: 0.3, arp: 0.05, kick: 0.5, snare: 0.18, hat: 0.07 };
const LOOK_AHEAD = 0.15; //   how far ahead notes are booked, in seconds
const CHECK_EVERY = 25; //    how often the player books the next notes, in milliseconds
const FADE = 0.35; //         how long a song takes to fade out when another starts, in seconds

/**
 * Plays songs on a browser's sound system.
 *   context      the browser's sound system (an AudioContext)
 *   destination  where the sound goes (normally the loudspeakers)
 */
export function createMusicPlayer(context, destination = context.destination) {
  const master = context.createGain();
  master.gain.value = MUSIC_VOLUME;
  master.connect(destination);

  // One second of hiss, made once, for the snare and the hi-hat.
  const hiss = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = hiss.getChannelData(0);
  for (let index = 0; index < samples.length; index++) {
    samples[index] = Math.random() * 2 - 1;
  }

  let playing = null; // { name, song, out (its own volume), step, nextAt (seconds) }
  let speed = 1;
  let timer = null;

  /** A tuned note: a wave with a quick rise and a gentle fall. */
  function tone(out, kind, note, at, seconds) {
    const hertz = hertzOf(note);
    if (hertz === null) {
      return;
    }
    const wave = context.createOscillator();
    wave.type = kind === "bass" ? "triangle" : "square";
    wave.frequency.value = hertz;
    const volume = context.createGain();
    const peak = LOUD[kind];
    const length = kind === "arp" ? Math.min(seconds, 0.12) : seconds * 0.92;
    volume.gain.setValueAtTime(0, at);
    volume.gain.linearRampToValueAtTime(peak, at + 0.01);
    volume.gain.setValueAtTime(peak, at + Math.max(0.02, length - 0.05));
    volume.gain.linearRampToValueAtTime(0, at + length);
    let last = wave;
    if (kind !== "bass") {
      const soft = context.createBiquadFilter(); // takes the buzz off the square wave
      soft.type = "lowpass";
      soft.frequency.value = kind === "lead" ? 2600 : 1600;
      wave.connect(soft);
      last = soft;
    }
    last.connect(volume);
    volume.connect(out);
    wave.start(at);
    wave.stop(at + length + 0.02);
  }

  /** One drum hit: k, s or h. */
  function drum(out, letter, at) {
    if (letter === "k") {
      const wave = context.createOscillator();
      wave.frequency.setValueAtTime(140, at);
      wave.frequency.exponentialRampToValueAtTime(45, at + 0.12);
      const volume = context.createGain();
      volume.gain.setValueAtTime(LOUD.kick, at);
      volume.gain.exponentialRampToValueAtTime(0.001, at + 0.16);
      wave.connect(volume);
      volume.connect(out);
      wave.start(at);
      wave.stop(at + 0.17);
      return;
    }
    const noise = context.createBufferSource();
    noise.buffer = hiss;
    const filter = context.createBiquadFilter();
    filter.type = letter === "s" ? "bandpass" : "highpass";
    filter.frequency.value = letter === "s" ? 1800 : 7000;
    const volume = context.createGain();
    const length = letter === "s" ? 0.12 : 0.04;
    volume.gain.setValueAtTime(letter === "s" ? LOUD.snare : LOUD.hat, at);
    volume.gain.exponentialRampToValueAtTime(0.001, at + length);
    noise.connect(filter);
    filter.connect(volume);
    volume.connect(out);
    noise.start(at, Math.random() * 0.5);
    noise.stop(at + length + 0.01);
  }

  /** Books every note of every voice that starts on one step of the song playing. */
  function bookStep(step, at) {
    const { song, out } = playing;
    const oneStep = stepSeconds(song, speed);
    for (const voice of ["lead", "bass", "arp", "drums"]) {
      for (const { note, steps } of notesBetween(song, voice, step, step + 1)) {
        if (voice === "drums") {
          for (const letter of note) {
            drum(out, letter, at);
          }
        } else {
          tone(out, voice, note, at, steps * oneStep);
        }
      }
    }
  }

  /** Books the notes due in the next moment. Called every CHECK_EVERY milliseconds. */
  function bookAhead() {
    if (playing === null) {
      return;
    }
    while (playing !== null && playing.nextAt < context.currentTime + LOOK_AHEAD) {
      const { song } = playing;
      const total = barsOf(song) * STEPS_PER_BAR;
      if (!song.loops && playing.step >= total) {
        // A song played once (the fanfare) is over: the next one follows.
        const next = song.then ?? null;
        const at = playing.nextAt;
        playing = null;
        if (next !== null) {
          start(next, at, false);
        }
        continue;
      }
      bookStep(playing.step, Math.max(playing.nextAt, context.currentTime));
      playing.nextAt += stepSeconds(song, speed);
      playing.step++;
    }
  }

  /** Starts a song at a moment, fading out the one before if asked. */
  function start(name, at, fadeOld = true) {
    if (playing !== null && fadeOld) {
      const old = playing.out;
      old.gain.setValueAtTime(old.gain.value, context.currentTime);
      old.gain.linearRampToValueAtTime(0, context.currentTime + FADE);
      setTimeout(() => old.disconnect(), (FADE + LOOK_AHEAD + 0.1) * 1000);
    }
    if (name === null) {
      playing = null;
      return;
    }
    const out = context.createGain();
    out.connect(master);
    playing = { name, song: SONGS[name], out, step: 0, nextAt: at };
  }

  return {
    /** Plays a song from its start (music-score.js), or null for silence. Asking for the song already playing changes nothing. */
    play(name) {
      if (name !== null && SONGS[name] === undefined) {
        throw new Error(`There is no song called "${name}".`);
      }
      const now = playing?.name ?? null;
      if (!isNewSong(now, name)) {
        return;
      }
      start(name, context.currentTime + 0.05);
      if (timer === null) {
        timer = setInterval(bookAhead, CHECK_EVERY);
      }
      bookAhead();
    },

    /** Plays faster (the final lap) or as written. */
    setSpeed(faster) {
      speed = faster ? FINAL_LAP_SPEED : 1;
    },

    /** 0 silences the music at once, 1 is as loud as it should be. */
    setVolume(level) {
      master.gain.setTargetAtTime(MUSIC_VOLUME * level, context.currentTime, 0.05);
    },

    /** The song playing now, or null. */
    playing: () => playing?.name ?? null,
  };
}

/**
 * The music of one page.
 *   browserWindow  the browser's window
 *   storage        this browser's storage, for the switches (audio-switches.js)
 * Gives:
 *   follow(moment)   call whenever something may have changed: { place,
 *                    finalLap } as music-cues.js describes
 *   setSwitches()    reads the switches again (after M, or a change in Settings)
 */
export function createPageMusic(browserWindow, storage) {
  let switches = readSwitches(storage);
  let context = null;
  let player = null;
  let wanted = { place: null, finalLap: false };

  function apply() {
    if (player === null) {
      return;
    }
    const heard = isHeard(switches, "music");
    const { song, fast } = musicFor({ ...wanted, musicOn: heard, soundOn: true });
    player.setSpeed(fast);
    player.play(song);
  }

  /** Starts the sound system. Only possible once the player has pressed a key or clicked. */
  function wake() {
    if (!isHeard(switches, "music")) {
      return;
    }
    if (player === null) {
      const SoundSystem = browserWindow.AudioContext ?? browserWindow.webkitAudioContext;
      if (typeof SoundSystem !== "function") {
        return; // a browser without sound: the page simply has no music
      }
      try {
        context = new SoundSystem();
        player = createMusicPlayer(context);
      } catch {
        context = null;
        player = null;
        return;
      }
    }
    if (context.state === "suspended" && !browserWindow.document.hidden) {
      context.resume().catch(() => {});
    }
    apply();
  }
  browserWindow.addEventListener("keydown", wake);
  browserWindow.addEventListener("pointerdown", wake);

  // A page that is not being looked at falls silent, and picks up again.
  browserWindow.document.addEventListener("visibilitychange", () => {
    if (context === null) {
      return;
    }
    if (browserWindow.document.hidden) {
      context.suspend().catch(() => {});
    } else if (isHeard(switches, "music")) {
      context.resume().catch(() => {});
    }
  });

  return {
    follow(moment) {
      if (moment.place === wanted.place && moment.finalLap === wanted.finalLap) {
        return;
      }
      wanted = { place: moment.place, finalLap: moment.finalLap === true };
      apply();
    },

    setSwitches() {
      switches = readSwitches(storage);
      if (isHeard(switches, "music")) {
        wake();
      } else {
        apply(); // silence
      }
    },
  };
}
