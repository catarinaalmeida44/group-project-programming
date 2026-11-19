// The connection meter of the online page: why the game may feel slow.
//
// When an online race feels "laggy", there are three possible reasons, and
// they need different cures:
//   - the way to the server and back takes long   (the internet connection, usually Wi-Fi)
//   - the server's updates arrive unevenly        (again the connection)
//   - this computer draws too few pictures        (too many tabs, a laptop on battery)
// The meter measures all three and says in one plain sentence which it is.
//
// It is switched off until a player presses L, so it is never in the way.
// It changes nothing about the race: it only counts what arrives anyway
// (updates and pictures), and while it is shown it asks the server a tiny
// question every two seconds to time the answer (online.js does the asking).
//
// This file is counting and words only, so it is tested without a browser.

import { STEP_SECONDS } from "../shared/physics.js";

/** The numbers are about the last two seconds. */
export const WINDOW_MS = 2000;
/** How many of the newest answer times are kept. The middle one is shown, so one slow answer does not count. */
export const ANSWERS_KEPT = 5;

// From when a number counts as a problem.
/** The way to the server and back, in thousandths of a second: more than this is slow. */
export const SLOW_ANSWER_MS = 150;
/** The longest wait between two updates: more than this, and the karts may stop and start. */
export const LONG_GAP_MS = 120;
/** Fewer updates a second than this means some are not arriving. The server sends 30. */
export const FEW_UPDATES = 24;
/** Fewer pictures a second than this, and the computer is drawing slowly. A screen normally shows 60. */
export const FEW_PICTURES = 40;

/** What the meter says, one sentence for each case. */
export const VERDICTS = Object.freeze({
  waiting: "Measuring…",
  silent: "No news from the server right now.",
  slowComputer: "This computer is drawing slowly. Close other tabs and programs, and plug the laptop in.",
  slowAnswer: "The way to the server is slow. That is the internet connection (often the Wi-Fi), not the game.",
  uneven: "Updates arrive unevenly. That is the internet connection (often the Wi-Fi), not the game.",
  fine: "All fine.",
});

/**
 * Makes a meter. Tell it what happens:
 *   update(now)    an update from the server arrived
 *   picture(now)   a picture was drawn
 *   answer(ms)     the server answered the timing question after this many
 *                  thousandths of a second (null: it did not answer)
 *   forget()       the connection was lost: start counting afresh
 * and ask it:
 *   read(now, delaySteps)  the numbers of the last two seconds (see below).
 *                  "delaySteps" is how far in the past the page shows the
 *                  race right now (createPlayback in net.js)
 * "now" is the browser's clock in thousandths of a second.
 */
export function createMeter() {
  let updates = []; //  when each update of the last two seconds arrived
  let pictures = []; // when each picture of the last two seconds was drawn
  let answers = []; //  the newest answer times, null for one that failed

  const recent = (times, now) => times.filter((time) => now - time < WINDOW_MS);

  /**
   * How many a second, from the moments of the last two seconds. Two ways
   * of counting, and the smaller answer wins:
   *   - how many there were, divided by two seconds. This drops towards 0
   *     when nothing arrives any more
   *   - how closely they followed each other. Without this, 30 a second
   *     would read as 30 or 31 by turns, depending on whether one happens
   *     to sit right at the edge of the two seconds
   */
  function perSecond(times) {
    const byCount = (times.length * 1000) / WINDOW_MS;
    if (times.length < 2) {
      return byCount;
    }
    const bySpacing = ((times.length - 1) * 1000) / (times[times.length - 1] - times[0]);
    return Math.min(byCount, bySpacing);
  }

  return {
    update(now) {
      updates = recent(updates, now);
      updates.push(now);
    },

    picture(now) {
      pictures = recent(pictures, now);
      pictures.push(now);
    },

    answer(ms) {
      answers.push(typeof ms === "number" && Number.isFinite(ms) && ms >= 0 ? ms : null);
      answers = answers.slice(-ANSWERS_KEPT);
    },

    forget() {
      updates = [];
      answers = [];
    },

    /**
     * Gives:
     *   answerMs           the way to the server and back (the middle of the
     *                      newest answers), or null if none has come
     *   updatesPerSecond   how many updates a second arrived
     *   longestGapMs       the longest wait between two of them (counting
     *                      the wait since the newest), or null with fewer than two
     *   picturesPerSecond  how many pictures a second were drawn
     *   keyToScreenMs      about how long a key press takes to show on the
     *                      screen, or null without an answer time: there and
     *                      back, the wait for the next update, how far in
     *                      the past the race is shown, and the next picture
     */
    read(now, delaySteps = 0) {
      const gotUpdates = recent(updates, now);
      const gotPictures = recent(pictures, now);
      const times = answers.filter((ms) => ms !== null).sort((a, b) => a - b);
      const answerMs = times.length === 0 ? null : times[Math.floor((times.length - 1) / 2)];

      let longestGapMs = null;
      if (gotUpdates.length >= 2) {
        longestGapMs = now - gotUpdates[gotUpdates.length - 1];
        for (let i = 1; i < gotUpdates.length; i++) {
          longestGapMs = Math.max(longestGapMs, gotUpdates[i] - gotUpdates[i - 1]);
        }
      }

      const updatesPerSecond = perSecond(gotUpdates);
      const picturesPerSecond = perSecond(gotPictures);
      const stepMs = STEP_SECONDS * 1000;
      // On average a key press waits half the time between two updates, and half a picture.
      const betweenUpdatesMs = updatesPerSecond > 0 ? 1000 / updatesPerSecond : 0;
      const betweenPicturesMs = picturesPerSecond > 0 ? 1000 / picturesPerSecond : 0;
      const keyToScreenMs =
        answerMs === null ? null : answerMs + betweenUpdatesMs / 2 + delaySteps * stepMs + betweenPicturesMs / 2;

      return { answerMs, updatesPerSecond, longestGapMs, picturesPerSecond, keyToScreenMs };
    },
  };
}

/** Which sentence fits these numbers: the first problem found, in the order a player can do something about it. */
export function verdictOf(reading) {
  const { answerMs, updatesPerSecond, longestGapMs, picturesPerSecond } = reading;
  if (updatesPerSecond === 0 && picturesPerSecond === 0) {
    return VERDICTS.waiting;
  }
  if (updatesPerSecond === 0) {
    return VERDICTS.silent;
  }
  if (picturesPerSecond < FEW_PICTURES) {
    return VERDICTS.slowComputer;
  }
  if (answerMs !== null && answerMs > SLOW_ANSWER_MS) {
    return VERDICTS.slowAnswer;
  }
  if (updatesPerSecond < FEW_UPDATES || (longestGapMs !== null && longestGapMs > LONG_GAP_MS)) {
    return VERDICTS.uneven;
  }
  return VERDICTS.fine;
}

const whole = (number) => String(Math.round(number));

/**
 * The meter as words for the page:
 *   rows     [{ label, value, poor }]: one line each: there and back, the
 *            updates, the longest wait between two of them, the pictures,
 *            and from a key press to the screen. "poor" is true for a
 *            number that is a problem, so the page can colour it
 *   verdict  the one sentence
 */
export function meterWords(reading) {
  const { answerMs, updatesPerSecond, longestGapMs, picturesPerSecond, keyToScreenMs } = reading;
  return {
    // Short labels on purpose: the box must stay small on the picture.
    rows: [
      {
        label: "Server and back",
        value: answerMs === null ? "–" : `${whole(answerMs)} ms`,
        poor: answerMs !== null && answerMs > SLOW_ANSWER_MS,
      },
      {
        label: "Updates a second",
        value: whole(updatesPerSecond),
        poor: updatesPerSecond < FEW_UPDATES,
      },
      {
        label: "Longest wait",
        value: longestGapMs === null ? "–" : `${whole(longestGapMs)} ms`,
        poor: longestGapMs !== null && longestGapMs > LONG_GAP_MS,
      },
      {
        label: "Pictures a second",
        value: whole(picturesPerSecond),
        poor: picturesPerSecond < FEW_PICTURES,
      },
      {
        label: "Key to screen",
        value: keyToScreenMs === null ? "–" : `about ${whole(keyToScreenMs)} ms`,
        poor: false,
      },
    ],
    verdict: verdictOf(reading),
  };
}
