// Tests for client/storage.js and client/settings.js: keeping the player's
// settings in the browser.
//
// There is no browser here, so the tests use a pretend storage: a small
// object with the same two questions a browser's storage answers
// (getItem and setItem).

import { describe, it, expect } from "vitest";
import { storageOf, readSaved, writeSaved } from "../client/storage.js";
import { DEFAULT_SETTINGS, readSettings, saveStartView } from "../client/settings.js";
import { VIEWS } from "../client/camera.js";

/** A pretend storage that keeps texts in memory, starting with "saved". */
function fakeStorage(saved = {}) {
  const texts = { ...saved };
  return {
    texts,
    getItem: (key) => (key in texts ? texts[key] : null),
    setItem: (key, value) => {
      texts[key] = String(value);
    },
  };
}

/** A pretend storage that fails at everything, like a full or switched-off one. */
const brokenStorage = {
  getItem: () => {
    throw new Error("storage switched off");
  },
  setItem: () => {
    throw new Error("storage full");
  },
};

describe("finding the browser's storage", () => {
  it("gives the storage when the browser has one", () => {
    const storage = fakeStorage();
    expect(storageOf({ localStorage: storage })).toBe(storage);
  });

  it("gives nothing, without crashing, when the browser refuses access", () => {
    const refusing = {
      get localStorage() {
        throw new Error("access denied");
      },
    };
    expect(storageOf(refusing)).toBeNull();
    expect(storageOf({})).toBeNull();
  });
});

describe("reading and writing saved data", () => {
  it("gives back what was saved", () => {
    const storage = fakeStorage();
    expect(writeSaved(storage, "k", { a: 1 })).toBe(true);
    expect(readSaved(storage, "k")).toEqual({ a: 1 });
  });

  it("gives nothing when nothing was saved, or there is no storage", () => {
    expect(readSaved(fakeStorage(), "k")).toBeNull();
    expect(readSaved(null, "k")).toBeNull();
  });

  it("ignores saved text that is broken or not an object", () => {
    for (const text of ["{not json", "42", '"hello"', "[1,2]", "null", "true"]) {
      expect(readSaved(fakeStorage({ k: text }), "k")).toBeNull();
    }
  });

  it("does not crash when the storage fails, and says that saving did not work", () => {
    expect(readSaved(brokenStorage, "k")).toBeNull();
    expect(writeSaved(brokenStorage, "k", { a: 1 })).toBe(false);
    expect(writeSaved(null, "k", { a: 1 })).toBe(false);
  });
});

describe("the settings", () => {
  it("start in the first camera view for a player who never changed anything", () => {
    expect(DEFAULT_SETTINGS.startView).toBe(VIEWS[0]);
    expect(readSettings(fakeStorage())).toEqual(DEFAULT_SETTINGS);
  });

  it("remember the chosen camera view", () => {
    const storage = fakeStorage();
    for (const view of VIEWS) {
      expect(saveStartView(storage, view)).toBe(true);
      expect(readSettings(storage).startView).toBe(view);
    }
  });

  it("refuse to save a camera view that does not exist, and keep the old one", () => {
    const storage = fakeStorage();
    saveStartView(storage, VIEWS[1]);
    for (const view of ["upside-down", "", undefined, 3, null]) {
      expect(() => saveStartView(storage, view)).toThrow(/no camera view/);
    }
    expect(readSettings(storage).startView).toBe(VIEWS[1]);
  });

  it("ignore a saved camera view that does not exist (for example one edited by hand)", () => {
    for (const startView of ["upside-down", "", 7, null, ["chase"], { view: "chase" }]) {
      const storage = fakeStorage({ "kart-settings": JSON.stringify({ startView }) });
      expect(readSettings(storage).startView).toBe(VIEWS[0]);
    }
  });

  it("ignore broken saved settings and use the defaults", () => {
    const storage = fakeStorage({ "kart-settings": "{broken" });
    expect(readSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  it("still work, with the defaults, when the browser gives no storage", () => {
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(brokenStorage)).toEqual(DEFAULT_SETTINGS);
    expect(saveStartView(null, VIEWS[1])).toBe(false);
    expect(saveStartView(brokenStorage, VIEWS[1])).toBe(false);
  });
});
