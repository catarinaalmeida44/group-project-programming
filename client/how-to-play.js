// The "How to play" card: the keys and the few rules a new player needs,
// over the picture of a race page.
//
// It comes up by itself the first time a player opens a race page in this
// browser, and again with the "How to play" button above the track. While it
// is up, the race does not start. "Let's race" closes it.
//
// What it says is worked out by howToPlayWords, for each kind of race page,
// and tested (in tests/time-of-day.test.js and tests/race-start.test.js). The card itself is built with the
// same look as the "Game settings" card (game-settings-card.js), so it is
// checked by eye in a browser.

import { readSaved, writeSaved } from "./storage.js";
import { makePart } from "./page-parts.js";

const STORAGE_KEY = "kart-how-to-play-seen";

/** The kinds of race page: a single race, two players on one keyboard, online. */
export const PAGE_MODES = Object.freeze(["single", "double", "online"]);

/**
 * What the card says on a kind of race page: { title, goal, keys, tips }.
 *   keys  [{ key, does }]: the keys, as written on a keyboard
 *   tips  short sentences, most important first
 */
export function howToPlayWords(mode) {
  if (!PAGE_MODES.includes(mode)) {
    throw new Error(`There is no race page called "${mode}". The race pages are: ${PAGE_MODES.join(", ")}.`);
  }
  const drive =
    mode === "double"
      ? [
          { key: "↑ ↓ ← →", does: "Player 1 (right half): gas, brake and reverse, steer" },
          { key: "W S A D", does: "Player 2 (left half): gas, brake and reverse, steer" },
        ]
      : [
          { key: "↑", does: "Gas" },
          { key: "↓", does: "Brake, and reverse when stopped" },
          { key: "← →", does: "Steer" },
        ];
  // Enter starts the countdown on every page. Online only the host's counts,
  // and nobody can start the race again alone, so there is no R there.
  const start =
    mode === "online"
      ? [{ key: "Enter", does: "Start the race, if you are the host (the first in the room)" }]
      : [
          { key: "Enter", does: "Start the countdown" },
          { key: "R", does: "Start the race again" },
        ];
  return {
    title: "How to play",
    goal:
      mode === "online"
        ? "Three laps round the campus against the others in the room. The empty places are filled with computer karts."
        : mode === "double"
          ? "Three laps round the campus, two of you on one keyboard, against the computer karts."
          : "Three laps round the campus against five computer karts. The first across the line wins.",
    keys: [
      ...drive,
      ...start,
      { key: "V", does: "Change the camera" },
      { key: "M", does: "All sound off and on" },
      { key: "F", does: "Full screen" },
    ],
    tips: [
      "Drive through the glowing yellow line on the road, one after another. A lap counts only if you passed them all.",
      "A banana peel spins you round. Ramps make you jump and give you a burst of speed.",
      "Bump into the other karts if you dare: they bump back.",
      "Off the road (on grass or sand) you are slower.",
    ],
  };
}

/** Has this browser shown the card before? */
export function hasSeenHowToPlay(storage) {
  return readSaved(storage, STORAGE_KEY)?.seen === true;
}

/** Remembers that the card was shown. Gives true if it was saved, false if the browser refused. */
export function rememberHowToPlaySeen(storage) {
  return writeSaved(storage, STORAGE_KEY, { seen: true });
}

/**
 * Sets up the card on a race page.
 *   mode     "single", "double" or "online"
 *   storage  this browser's storage, or null
 * The page needs a box for the card next to the game settings card (an
 * element with the id "how-to-play-card") and a button with the id
 * "open-how-to-play". Gives { isOpen(), open(), close() }.
 */
export function setUpHowToPlay(page, { mode, storage }) {
  const veil = page.getElementById("how-to-play-card");
  const button = page.getElementById("open-how-to-play");
  let open = false;

  function close() {
    open = false;
    veil.hidden = true;
    veil.replaceChildren();
    rememberHowToPlaySeen(storage);
    // If the "Game settings" card is up underneath, it gets the keyboard back,
    // so Enter confirms it as before.
    page.querySelector("#settings-card:not([hidden]) .settings-confirm")?.focus();
  }

  function show() {
    const words = howToPlayWords(mode);
    const card = makePart(page, "div", "settings-card how-to-play");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", words.title);

    const keys = makePart(page, "dl", "how-to-play-keys");
    for (const { key, does } of words.keys) {
      keys.append(makePart(page, "dt", "", key), makePart(page, "dd", "", does));
    }
    const tips = makePart(page, "ul", "how-to-play-tips");
    for (const tip of words.tips) {
      tips.append(makePart(page, "li", "", tip));
    }
    const go = makePart(page, "button", "button button-primary button-wide settings-confirm", "Let's race");
    go.type = "button";
    go.addEventListener("click", close);

    card.append(makePart(page, "h2", "settings-title", words.title), makePart(page, "p", "settings-lead", words.goal), keys, tips, go);
    veil.replaceChildren(card);
    veil.hidden = false;
    open = true;
    go.focus(); // so Enter closes it
  }

  button?.addEventListener("click", () => {
    show();
    button.blur();
  });
  // Escape closes it too, as any card.
  page.addEventListener("keydown", (event) => {
    if (open && event.key === "Escape") {
      close();
    }
  });
  if (!hasSeenHowToPlay(storage)) {
    // The first time on a race page in this browser. A moment later, once
    // the page has opened its other cards: this one lies on top of them and
    // gets the keyboard, so Enter closes it first.
    setTimeout(show, 0);
  }

  return { isOpen: () => open, open: show, close };
}
