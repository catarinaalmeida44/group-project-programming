// Keeping small things in this browser: the settings and the best times.
//
// Browsers give every website a small storage space, "localStorage", that
// keeps short texts after the page is closed. Nothing in it is sent to our
// server, and other players never see it.
//
// Two things can go wrong, and neither may break the game:
//   - the browser does not let us use the storage (some private windows,
//     storage switched off, storage full)
//   - what we read back is not what we wrote: the player can edit it, and an
//     old version of the game may have written something different
// So every read and write here is careful, and the files that use this one
// check every value they read back.

/**
 * The browser's storage, or null if this browser does not let us use it.
 * Even asking for it can fail, which is why this is wrapped.
 */
export function storageOf(browserWindow) {
  try {
    return browserWindow.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Reads a saved text and turns it back into data (an object). Gives null if
 * there is no storage, nothing saved, or the saved text is broken.
 */
export function readSaved(storage, key) {
  if (!storage) {
    return null;
  }
  try {
    const value = JSON.parse(storage.getItem(key));
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

/** Saves data as text. Gives true if it worked, false if the browser refused. */
export function writeSaved(storage, key, value) {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
