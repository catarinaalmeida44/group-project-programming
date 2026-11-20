// Tests for the music: the notes (client/music-score.js) and which song plays
// when (client/music-cues.js). How it sounds is checked by ear on the page
// sound-test.html.

import { describe, it, expect } from "vitest";
import {
  SONGS,
  SONG_NAMES,
  STEPS_PER_BAR,
  FINAL_LAP_SPEED,
  LOWEST_NOTE,
  HIGHEST_NOTE,
  halfStepsFromA4,
  hertzOf,
  isDrumStep,
  barsOf,
  stepSeconds,
  notesBetween,
} from "../client/music-score.js";
import { musicFor, isNewSong, raceMoment, readMusicOn, saveMusicOn } from "../client/music-cues.js";

const TUNED_VOICES = ["lead", "bass", "arp"];

/** A pretend browser storage. */
function pretendStorage(start = {}) {
  const kept = new Map(Object.entries(start));
  return { getItem: (key) => (kept.has(key) ? kept.get(key) : null), setItem: (key, value) => kept.set(key, value), kept };
}

describe("the notes", () => {
  it("are named the usual way: A4 is 440 hertz, an octave doubles it", () => {
    expect(hertzOf("A4")).toBe(440);
    expect(hertzOf("A5")).toBe(880);
    expect(hertzOf("A3")).toBe(220);
    expect(hertzOf("C4")).toBeCloseTo(261.63, 2);
    expect(hertzOf("A#4")).toBeCloseTo(466.16, 2);
    expect(halfStepsFromA4("C5")).toBe(3);
  });

  it("refuse anything that is not a note", () => {
    for (const wrong of ["H4", "a4", "Bb4", "A10", "A", "4", "", "-", ".", "kh", null]) {
      expect(hertzOf(wrong), String(wrong)).toBe(null);
    }
  });

  it("know the drums: k, s and h, each at most once in a step", () => {
    for (const step of ["k", "s", "h", "kh", "sh", "ks", "ksh"]) {
      expect(isDrumStep(step), step).toBe(true);
    }
    for (const step of ["", "kk", "x", "K", "A4", "-", ".", "khk"]) {
      expect(isDrumStep(step), step).toBe(false);
    }
  });
});

describe("the songs", () => {
  it("are the menu, the race, the finish and the podium", () => {
    expect(SONG_NAMES).toEqual(["menu", "race", "finish", "podium"]);
    expect(Object.keys(SONGS).sort()).toEqual([...SONG_NAMES].sort());
    expect(Object.isFrozen(SONGS)).toBe(true);
  });

  for (const name of SONG_NAMES) {
    describe(name, () => {
      const song = SONGS[name];

      it("has every voice, each with the same number of whole bars of 8 steps", () => {
        expect(Object.keys(song.voices).sort()).toEqual(["arp", "bass", "drums", "lead"]);
        for (const [voice, bars] of Object.entries(song.voices)) {
          expect(bars.length, voice).toBe(barsOf(song));
          for (const [index, bar] of bars.entries()) {
            expect(bar.length, `${voice}, bar ${index + 1}`).toBe(STEPS_PER_BAR);
          }
        }
      });

      it("has only real notes in its tuned voices, none too low or too high", () => {
        const lowest = halfStepsFromA4(LOWEST_NOTE);
        const highest = halfStepsFromA4(HIGHEST_NOTE);
        for (const voice of TUNED_VOICES) {
          for (const step of song.voices[voice].flat()) {
            if (step === "-" || step === ".") {
              continue;
            }
            const height = halfStepsFromA4(step);
            expect(height, `${voice}: "${step}"`).not.toBe(null);
            expect(height).toBeGreaterThanOrEqual(lowest);
            expect(height).toBeLessThanOrEqual(highest);
          }
        }
      });

      it("has only drum letters or silence in its drums", () => {
        for (const step of song.voices.drums.flat()) {
          expect(step === "." || isDrumStep(step), `"${step}"`).toBe(true);
        }
      });

      it("never starts a voice by holding a note it has not played", () => {
        for (const voice of TUNED_VOICES) {
          expect(song.voices[voice][0][0], voice).not.toBe("-");
        }
      });

      it("has a speed people can dance to: 90 to 180 beats a minute", () => {
        expect(song.tempo).toBeGreaterThanOrEqual(90);
        expect(song.tempo).toBeLessThanOrEqual(180);
      });
    });
  }

  it("loops the menu, race and podium songs; the finish fanfare plays once and then the podium song", () => {
    expect(SONGS.menu.loops).toBe(true);
    expect(SONGS.race.loops).toBe(true);
    expect(SONGS.podium.loops).toBe(true);
    expect(SONGS.finish.loops).toBe(false);
    expect(SONGS.finish.then).toBe("podium");
    for (const name of ["menu", "race", "podium"]) {
      expect(SONGS[name].then, name).toBe(undefined);
    }
  });

  it("keeps the fanfare short: under 4 seconds", () => {
    const seconds = barsOf(SONGS.finish) * STEPS_PER_BAR * stepSeconds(SONGS.finish);
    expect(seconds).toBeLessThan(4);
  });

  it("makes the race song the fastest of the loops", () => {
    expect(SONGS.race.tempo).toBeGreaterThan(SONGS.menu.tempo);
    expect(SONGS.race.tempo).toBeGreaterThan(SONGS.podium.tempo);
  });

  it("gives each song its own tune", () => {
    const tunes = SONG_NAMES.map((name) => SONGS[name].voices.lead.flat().join(" "));
    expect(new Set(tunes).size).toBe(SONG_NAMES.length);
  });
});

describe("the timing", () => {
  it("makes a step half a beat", () => {
    expect(stepSeconds(SONGS.race)).toBeCloseTo(60 / 152 / 2, 10);
  });

  it("plays the final lap a little faster, but not wildly", () => {
    expect(FINAL_LAP_SPEED).toBeGreaterThan(1.05);
    expect(FINAL_LAP_SPEED).toBeLessThan(1.3);
    expect(stepSeconds(SONGS.race, FINAL_LAP_SPEED)).toBeLessThan(stepSeconds(SONGS.race));
  });

  it("gives each note with how long it is held", () => {
    // The menu tune starts "E5 - G5 - E5 D5 C5 -".
    expect(notesBetween(SONGS.menu, "lead", 0, 8)).toEqual([
      { step: 0, note: "E5", steps: 2 },
      { step: 2, note: "G5", steps: 2 },
      { step: 4, note: "E5", steps: 1 },
      { step: 5, note: "D5", steps: 1 },
      { step: 6, note: "C5", steps: 2 },
    ]);
  });

  it("goes round and round in a song that loops", () => {
    const total = barsOf(SONGS.menu) * STEPS_PER_BAR;
    expect(notesBetween(SONGS.menu, "lead", total, total + 1)).toEqual([{ step: total, note: "E5", steps: 2 }]);
  });

  it("has nothing after the end of a song that plays once", () => {
    const total = barsOf(SONGS.finish) * STEPS_PER_BAR;
    for (const voice of ["lead", "bass", "arp", "drums"]) {
      expect(notesBetween(SONGS.finish, voice, total, total + 40), voice).toEqual([]);
    }
  });

  it("never gives silence or a held step as a note, and gives the drums as letters", () => {
    for (const name of SONG_NAMES) {
      const total = barsOf(SONGS[name]) * STEPS_PER_BAR;
      for (const voice of ["lead", "bass", "arp", "drums"]) {
        for (const { note, steps } of notesBetween(SONGS[name], voice, 0, total)) {
          expect(["-", "."]).not.toContain(note);
          expect(steps).toBeGreaterThanOrEqual(1);
        }
      }
    }
    expect(notesBetween(SONGS.race, "drums", 0, 1)).toEqual([{ step: 0, note: "kh", steps: 1 }]);
  });
});

describe("which music plays when", () => {
  it("plays the menu song in the menus, and in an online room before a race", () => {
    expect(musicFor({ place: "menu" })).toEqual({ song: "menu", fast: false });
    expect(raceMoment({ inLobby: true })).toEqual({ place: "menu", finalLap: false });
  });

  it("is silent before a single race starts and in the countdown, so the beeps are heard", () => {
    expect(raceMoment({})).toEqual({ place: null, finalLap: false });
    expect(raceMoment({ started: true })).toEqual({ place: "countdown", finalLap: false });
    expect(musicFor({ place: "countdown" }).song).toBe(null);
    expect(musicFor({ place: null }).song).toBe(null);
  });

  it("plays the race song from GO, faster only on the final lap", () => {
    const lap = (lapsDone) => musicFor(raceMoment({ started: true, racing: true, lapsDone, laps: 3 }));
    expect(lap(0)).toEqual({ song: "race", fast: false });
    expect(lap(1)).toEqual({ song: "race", fast: false });
    expect(lap(2)).toEqual({ song: "race", fast: true });
  });

  it("plays the fanfare when you cross the line, not the race song, and never fast", () => {
    const moment = raceMoment({ started: true, racing: true, finished: true, lapsDone: 3, laps: 3 });
    expect(musicFor(moment)).toEqual({ song: "finish", fast: false });
  });

  it("plays the podium song on the podium", () => {
    expect(musicFor(raceMoment({ started: true, racing: true, finished: true, podium: true }))).toEqual({ song: "podium", fast: false });
  });

  it("is silent when the music is switched off, or all sound is", () => {
    for (const place of ["menu", "racing", "finished", "podium"]) {
      expect(musicFor({ place, musicOn: false }).song, place).toBe(null);
      expect(musicFor({ place, soundOn: false }).song, place).toBe(null);
    }
  });

  it("is silent for anything it does not know", () => {
    expect(musicFor({ place: "somewhere" }).song).toBe(null);
  });
});

describe("changing songs", () => {
  it("changes when another song is asked for", () => {
    expect(isNewSong(null, "menu")).toBe(true);
    expect(isNewSong("race", "finish")).toBe(true);
    expect(isNewSong("menu", null)).toBe(true);
  });

  it("does not start a song again that is already playing", () => {
    expect(isNewSong("race", "race")).toBe(false);
    expect(isNewSong(null, null)).toBe(false);
  });

  it("never cuts the fanfare off with the podium, nor plays it again after it", () => {
    expect(isNewSong("finish", "podium")).toBe(false);
    expect(isNewSong("podium", "finish")).toBe(false);
  });
});

describe("music on or off", () => {
  it("is on unless switched off, and ignores anything saved that is not a plain yes or no", () => {
    expect(readMusicOn(pretendStorage())).toBe(true);
    expect(readMusicOn(null)).toBe(true);
    expect(readMusicOn(pretendStorage({ "kart-music": "not data" }))).toBe(true);
    const storage = pretendStorage();
    saveMusicOn(storage, false);
    expect(readMusicOn(storage)).toBe(false);
    saveMusicOn(storage, "yes"); // anything but an exact true counts as off
    expect(readMusicOn(storage)).toBe(false);
    saveMusicOn(storage, true);
    expect(readMusicOn(storage)).toBe(true);
  });
});
