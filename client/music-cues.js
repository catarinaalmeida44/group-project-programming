// Which music plays when, and "music on or off".
//
// The pages tell music.js what is happening (on the menu, in the countdown,
// racing, on the final lap, finished, on the podium) and this file says
// which song that means. Only rules, so it is tested (tests/music.test.js).
//
//   the menu, and an online room before a race   the menu song
//   the countdown                                  silence: the beeps are heard
//   racing                                         the race song, faster on
//                                                  the final lap
//   you crossed the line                           the finish fanfare, then the
//                                                  podium song by itself
//   the podium                                     the podium song
//   music switched off, or all sound off (M)       silence
//
// "Music on or off" is kept in this browser (storage.js), apart from "sound
// on or off" (sound-cues.js): music can be off while the engine is heard.
// M during a race still silences everything.

import { readSaved, writeSaved } from "./storage.js";

const STORAGE_KEY = "kart-music";

/** Does the player want music? Yes, unless they switched it off. A saved value that is not a plain yes or no is ignored. */
export function readMusicOn(storage) {
  const saved = readSaved(storage, STORAGE_KEY);
  return saved === null || saved.on !== false;
}

/** Remembers the choice. Gives true if it was saved, false if the browser refused. Anything but an exact "true" counts as off. */
export function saveMusicOn(storage, on) {
  return writeSaved(storage, STORAGE_KEY, { on: on === true });
}

/**
 * The song for a moment, and whether it is played faster.
 *   place       "menu" (the menu, or an online room before a race),
 *               "countdown", "racing", "finished" (you crossed the line) or
 *               "podium"
 *   finalLap    racing on the last lap
 *   musicOn     the music switch
 *   soundOn     the switch for all sound (M)
 * Gives { song, fast }: song is a name from music-score.js or null for silence.
 */
export function musicFor({ place, finalLap = false, musicOn = true, soundOn = true }) {
  if (!musicOn || !soundOn) {
    return { song: null, fast: false };
  }
  switch (place) {
    case "menu":
      return { song: "menu", fast: false };
    case "racing":
      return { song: "race", fast: finalLap === true };
    case "finished":
      return { song: "finish", fast: false };
    case "podium":
      return { song: "podium", fast: false };
    default:
      return { song: null, fast: false }; // the countdown, or anything unknown
  }
}

/**
 * What a race page is doing, for the music: { place, finalLap } (see musicFor).
 *   inLobby    online: in the room, no race on yet
 *   started    the race has started (the countdown is going or over)
 *   racing     the countdown is over: GO
 *   finished   you crossed the line
 *   podium     the podium is up
 *   lapsDone, laps   how many laps you have done, of how many
 */
export function raceMoment({ inLobby = false, started = false, racing = false, finished = false, podium = false, lapsDone = 0, laps = 1 }) {
  if (podium) {
    return { place: "podium", finalLap: false };
  }
  if (finished) {
    return { place: "finished", finalLap: false };
  }
  if (racing) {
    return { place: "racing", finalLap: lapsDone === laps - 1 };
  }
  if (started) {
    return { place: "countdown", finalLap: false };
  }
  return { place: inLobby ? "menu" : null, finalLap: false };
}

/**
 * Is a new song asked for, or is the one playing still right? The finish
 * fanfare goes on into the podium song by itself, so asking for "finished"
 * while the podium song plays (or "podium" while the fanfare plays) is not
 * a change: the fanfare is never cut off, nor played twice.
 */
export function isNewSong(playing, asked) {
  if (playing === asked) {
    return false;
  }
  const finishing = ["finish", "podium"];
  return !(finishing.includes(playing) && finishing.includes(asked));
}
