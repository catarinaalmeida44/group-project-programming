// Tests for the sound switches (client/audio-switches.js) and the menu
// sounds' rules (client/ui-sound-cues.js).

import { describe, it, expect } from "vitest";
import { SOUND_KINDS, SWITCH_WORDS, readSwitches, saveSwitch, isHeard, toggleMaster } from "../client/audio-switches.js";
import { readSoundOn, saveSoundOn } from "../client/sound-cues.js";
import { makesClick, roomReady } from "../client/ui-sound-cues.js";

/** A pretend browser storage. */
function pretendStorage(start = {}) {
  const kept = new Map(Object.entries(start));
  return { getItem: (key) => (kept.has(key) ? kept.get(key) : null), setItem: (key, value) => kept.set(key, value), kept };
}

/**
 * A pretend part of a page. closest(selector) works like a browser's for
 * the simple selectors used here ("button", "a.button", 'input[type="radio"]'):
 * it gives this part if it matches one of them, or asks its parent.
 */
function part(tagName, { className = "", type = "", disabled = false, parent = null } = {}) {
  const self = {
    tagName,
    disabled,
    closest(selector) {
      const matchesOne = selector.split(",").some((piece) => {
        const found = /^\s*([a-z]+)(?:\.([a-z-]+))?(?:\[type="([a-z]+)"\])?\s*$/.exec(piece);
        if (found === null) {
          throw new Error(`The pretend page does not understand "${piece}"`);
        }
        const [, tag, wantedClass, wantedType] = found;
        return (
          tag === tagName.toLowerCase() &&
          (wantedClass === undefined || className.split(" ").includes(wantedClass)) &&
          (wantedType === undefined || type === wantedType)
        );
      });
      return matchesOne ? self : (parent?.closest(selector) ?? null);
    },
  };
  return self;
}

describe("the sound switches", () => {
  it("are the master and three kinds: music, race sounds, menu sounds", () => {
    expect(SOUND_KINDS).toEqual(["music", "effects", "interface"]);
    expect(SWITCH_WORDS).toEqual({ master: "All sound", music: "Music", effects: "Race sounds", interface: "Menu sounds" });
  });

  it("are all on for someone who never changed them", () => {
    expect(readSwitches(pretendStorage())).toEqual({ master: true, music: true, effects: true, interface: true });
    expect(readSwitches(null)).toEqual({ master: true, music: true, effects: true, interface: true });
  });

  it("remember each one on its own", () => {
    for (const name of ["master", ...SOUND_KINDS]) {
      const storage = pretendStorage();
      expect(saveSwitch(storage, name, false)).toBe(true);
      const switches = readSwitches(storage);
      for (const other of ["master", ...SOUND_KINDS]) {
        expect(switches[other], `${name} off, ${other}`).toBe(other !== name);
      }
    }
  });

  it("keep the race sounds where they always were, so an older choice is not lost", () => {
    const storage = pretendStorage();
    saveSoundOn(storage, false); // the box "Sound in races", before there were switches
    expect(readSwitches(storage).effects).toBe(false);
    saveSwitch(storage, "effects", true);
    expect(readSoundOn(storage)).toBe(true);
  });

  it("count anything but an exact yes as off, and ignore junk that was saved", () => {
    const storage = pretendStorage({ "kart-master-sound": "{broken", "kart-menu-sound": '{"on":"maybe"}' });
    expect(readSwitches(storage).master).toBe(true);
    expect(readSwitches(storage).interface).toBe(true); // only an exact false is off
    saveSwitch(storage, "interface", "yes");
    expect(readSwitches(storage).interface).toBe(false);
  });

  it("refuse a switch that does not exist", () => {
    expect(() => saveSwitch(pretendStorage(), "voices", false)).toThrow(/no sound switch/);
    expect(() => isHeard(readSwitches(null), "master")).toThrow(/no kind of sound/);
  });
});

describe("what is heard", () => {
  it("is a kind of sound only when its own switch and the master are both on", () => {
    const all = { master: true, music: true, effects: true, interface: true };
    for (const kind of SOUND_KINDS) {
      expect(isHeard(all, kind), kind).toBe(true);
      expect(isHeard({ ...all, [kind]: false }, kind), kind).toBe(false);
      expect(isHeard({ ...all, master: false }, kind), kind).toBe(false); // the master silences everything
    }
  });

  it("is not changed for the others when one kind is off", () => {
    const switches = { master: true, music: false, effects: true, interface: true };
    expect(isHeard(switches, "effects")).toBe(true);
    expect(isHeard(switches, "interface")).toBe(true);
  });
});

describe("M during a race", () => {
  it("switches the master the other way, remembers it, and leaves the other switches alone", () => {
    const storage = pretendStorage();
    saveSwitch(storage, "music", false);
    expect(toggleMaster(storage)).toBe(false);
    expect(readSwitches(storage)).toEqual({ master: false, music: false, effects: true, interface: true });
    expect(toggleMaster(storage)).toBe(true);
    expect(readSwitches(storage).master).toBe(true);
    expect(readSwitches(storage).music).toBe(false);
  });
});

describe("which clicks make the click sound", () => {
  it("a button, a link drawn as a button, a round choice or a tick box, and anything inside a button", () => {
    expect(makesClick(part("BUTTON"))).toBe(true);
    expect(makesClick(part("A", { className: "button button-primary" }))).toBe(true);
    expect(makesClick(part("INPUT", { type: "radio" }))).toBe(true);
    expect(makesClick(part("INPUT", { type: "checkbox" }))).toBe(true);
    expect(makesClick(part("SPAN", { parent: part("BUTTON") }))).toBe(true); // the words or picture inside a button
  });

  it("not plain text, not nothing, and not a button that is switched off", () => {
    expect(makesClick(part("P"))).toBe(false);
    expect(makesClick(part("A"))).toBe(false); // a link inside a sentence
    expect(makesClick(part("INPUT", { type: "range" }))).toBe(false);
    expect(makesClick(null)).toBe(false);
    expect(makesClick({})).toBe(false);
    expect(makesClick(part("BUTTON", { disabled: true }))).toBe(false);
  });

  it("not the words beside a choice, so a choice is heard once and not twice", () => {
    // Clicking a label makes the browser click its choice too: only that one sounds.
    expect(makesClick(part("LABEL"))).toBe(false);
  });
});

describe("the hype online", () => {
  const kart = (character) => ({ id: 1, character });

  it("comes when two or more people are in the room before a race and every one has a character", () => {
    expect(roomReady("open", [kart("pcp"), kart("dean")])).toBe(true);
    expect(roomReady("open", [kart("pcp"), kart("dean"), kart("ro")])).toBe(true);
  });

  it("does not come for one person alone, or while someone has no character yet", () => {
    expect(roomReady("open", [kart("pcp")])).toBe(false);
    expect(roomReady("open", [kart("pcp"), kart(undefined)])).toBe(false);
    expect(roomReady("open", [kart("pcp"), kart("")])).toBe(false);
    expect(roomReady("open", [kart("pcp"), null])).toBe(false);
  });

  it("does not come during or after a race, or without karts", () => {
    for (const phase of ["countdown", "racing", "finished"]) {
      expect(roomReady(phase, [kart("pcp"), kart("dean")]), phase).toBe(false);
    }
    expect(roomReady("open", null)).toBe(false);
    expect(roomReady("open", [])).toBe(false);
  });
});
