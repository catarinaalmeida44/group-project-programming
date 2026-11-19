// Waiting for a server that is waking up.
//
// Our server is on the free plan of Render, the hosting company. When
// nobody has used the game for 15 minutes, Render switches the server off.
// The next visitor switches it on again, which takes up to a minute, and
// during that time the server answers nothing.
//
// Someone who opens the game then gets a loading page from Render itself.
// But a page of ours that was already open (the menu, left alone for a
// while) simply waits for its answer, and that looked broken: a button that
// says "Signing in…" for half a minute.
//
// So every place that waits for the server says, after a few seconds, what
// is going on. The words and the numbers are here, so that they are the
// same everywhere: the forms of the menu (account-panel.js), the
// leaderboard (leaderboard-view.js) and the online page (link.js).

/** An answer normally comes in well under a second. After this long without one, the page says the server is waking up. */
export const SLOW_AFTER_MS = 3000;

/** How long waking up takes at most, in seconds. Render says "about one minute"; we measured 17 seconds on 19 November 2026. */
export const WAKE_SECONDS = 60;

export const WAKING_SENTENCE = "The server is waking up, which can take up to a minute.";

/**
 * What to say while waiting for the server.
 *   plain     what is said at first, such as "Signing in…"
 *   waitedMs  how long we have been waiting, in thousandths of a second
 * After SLOW_AFTER_MS the sentence about waking up is added. A strange time
 * counts as "only just started".
 */
export function waitingWords(plain, waitedMs) {
  return waitedMs >= SLOW_AFTER_MS ? `${plain} ${WAKING_SENTENCE}` : plain;
}
