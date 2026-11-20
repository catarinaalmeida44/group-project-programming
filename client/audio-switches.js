// The sound switches of the game, kept in this browser (storage.js).
//
// Settings > Sound has a master switch and one switch for each kind of
// sound:
//   master     everything. M during a race switches this one
//   music      the music (music.js)
//   effects    the sounds of a race: engine, bumps, the countdown (sound.js).
//              Kept where it always was ("Sound in races", sound-cues.js),
//              so a choice made before is not lost
//   interface  the menus: button clicks and the hype sound (ui-sound.js)
//
// A kind of sound is heard only when its own switch AND the master are on.
// Every switch starts on. A saved value that is not a plain yes or no is
// ignored. Only rules, so it is tested (tests/audio-switches.test.js).

import { readSaved, writeSaved } from "./storage.js";
import { readSoundOn, saveSoundOn } from "./sound-cues.js";
import { readMusicOn, saveMusicOn } from "./music-cues.js";

/** The kinds of sound that have their own switch, in the order Settings shows them. */
export const SOUND_KINDS = Object.freeze(["music", "effects", "interface"]);

/** The words for each switch in Settings. */
export const SWITCH_WORDS = Object.freeze({
  master: "All sound",
  music: "Music",
  effects: "Race sounds",
  interface: "Menu sounds",
});

const MASTER_KEY = "kart-master-sound";
const INTERFACE_KEY = "kart-menu-sound";

/** Reads a plain yes or no: yes unless "no" was saved. */
function readOn(storage, key) {
  const saved = readSaved(storage, key);
  return saved === null || saved.on !== false;
}

/** All the switches: { master, music, effects, interface }, each true or false. */
export function readSwitches(storage) {
  return {
    master: readOn(storage, MASTER_KEY),
    music: readMusicOn(storage),
    effects: readSoundOn(storage),
    interface: readOn(storage, INTERFACE_KEY),
  };
}

/**
 * Remembers one switch. Refuses a switch that does not exist. Anything but
 * an exact true counts as off. Gives true if it was saved, false if the
 * browser refused.
 */
export function saveSwitch(storage, name, on) {
  const yes = on === true;
  switch (name) {
    case "master":
      return writeSaved(storage, MASTER_KEY, { on: yes });
    case "music":
      return saveMusicOn(storage, yes);
    case "effects":
      return saveSoundOn(storage, yes);
    case "interface":
      return writeSaved(storage, INTERFACE_KEY, { on: yes });
    default:
      throw new Error(`There is no sound switch called "${name}". The switches are: master, ${SOUND_KINDS.join(", ")}.`);
  }
}

/** Switches the master the other way (M during a race), remembers it, and gives the new state. */
export function toggleMaster(storage) {
  const on = !readSwitches(storage).master;
  saveSwitch(storage, "master", on);
  return on;
}

/** Is a kind of sound heard? Only when its own switch and the master are both on. */
export function isHeard(switches, kind) {
  if (!SOUND_KINDS.includes(kind)) {
    throw new Error(`There is no kind of sound called "${kind}".`);
  }
  return switches.master === true && switches[kind] === true;
}
