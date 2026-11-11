// The player's settings, kept in this browser (see storage.js).
//
// Today there is one setting: the camera view a race starts in. A saved
// value is only used if it is a view we know; anything else is ignored and
// the default is used.

import { VIEWS } from "./camera.js";
import { readSaved, writeSaved } from "./storage.js";

const STORAGE_KEY = "kart-settings";

/** The settings of a player who never changed anything. */
export const DEFAULT_SETTINGS = Object.freeze({ startView: VIEWS[0] });

/** The player's settings: what was saved, where it makes sense, and the defaults for the rest. */
export function readSettings(storage) {
  const saved = readSaved(storage, STORAGE_KEY);
  const settings = { ...DEFAULT_SETTINGS };
  if (saved && VIEWS.includes(saved.startView)) {
    settings.startView = saved.startView;
  }
  return settings;
}

/**
 * Remembers the camera view races should start in. Refuses a view that does
 * not exist. Gives true if it was saved, false if the browser refused.
 */
export function saveStartView(storage, view) {
  if (!VIEWS.includes(view)) {
    throw new Error(`There is no camera view called "${view}". The views are: ${VIEWS.join(", ")}.`);
  }
  return writeSaved(storage, STORAGE_KEY, { ...readSettings(storage), startView: view });
}
