// "My stats" at the top of the "Your account" panel, on the page.
//
// When a signed-in player opens "Your account", this file asks the server
// for their stats on the Nova lap and shows them as a driver's card: the
// character they drove most, dancing beside their kart, their name, three
// big numbers (races, wins, podiums), their three best times with a medal
// each, their best lap, and where they stand on the shared leaderboard.
// Under it is the button "Download my results".
//
// The words come from stats-view.js, which has tests. The server decides
// whose stats these are (the cookie says who asks). This file only puts
// things on the page, so it is checked by eye in a browser. Every name and
// time is put on the page as text, never as HTML.

import { CAST } from "../shared/cast.js";
import { readCharacter, headOf, lookOfCharacter, hairOf, longHairOf, danceOf } from "./cast-choice.js";
import { paintPilotScene, viewerBehind } from "./kart-paint.js";
import { poseAt, chosenPose } from "./pilot-shape.js";
import { makePart } from "./page-parts.js";
import { statsWords, statsProblemText, STATS_LOADING_TEXT, NO_RACES_TEXT, WHAT_COUNTS_TEXT } from "./stats-view.js";
import { waitingWords, SLOW_AFTER_MS } from "./waking.js";

// The picture of the driver beside their kart: the same camera as the
// poster of "Choose your character" (kart-panel.js), a little smaller.
const SIZE = { width: 300, height: 250 };
const SHARP = 2; // dots for every unit, so the picture stays sharp when shown large
const CAMERA = { kartScreenY: 214, kartScale: 6.1, horizonY: 30, depth: 900, viewAhead: 100 };
const SCENE_SHIFT = 2.6; // moves the scene to the left, so the kart is not cut off at the right
const FACING_US = Math.PI;
const SWING = 0.3; // radians: the picture swings this far each way
const SECONDS_PER_SWING = 7;

/** The name the browser suggests for the downloaded file. The server sends the same one. */
const FILE_NAME = "nova-kart-my-results.csv";

/**
 * Connects "My stats".
 *   api      the functions of account-api.js, or null when there is no server to ask
 *   storage  this browser's storage, to know the character chosen in the menu
 * Gives { setPlayer(me) }: call it each time someone signs in or out.
 */
export function connectStats(page, { api, storage }) {
  const panel = page.getElementById("your-account");
  const card = page.getElementById("stats-card");
  const stage = page.getElementById("stats-stage");
  const kicker = page.getElementById("stats-kicker");
  const nameLine = page.getElementById("stats-name");
  const favouriteLine = page.getElementById("stats-favourite");
  const numbers = page.getElementById("stats-numbers");
  const status = page.getElementById("stats-status");
  const details = page.getElementById("stats-details");
  const bestList = page.getElementById("stats-best");
  const lapLine = page.getElementById("stats-lap");
  const rankLine = page.getElementById("stats-rank");
  const kindsLine = page.getElementById("stats-kinds");
  const download = page.getElementById("download-results");
  const downloadStatus = page.getElementById("download-status");
  page.getElementById("stats-what-counts").textContent = WHAT_COUNTS_TEXT;

  const canvas = makePart(page, "canvas", "stats-pilot");
  canvas.width = SIZE.width * SHARP;
  canvas.height = SIZE.height * SHARP;
  canvas.setAttribute("role", "img");
  stage.append(canvas);

  const heads = new Map(); // character id -> its picture, loaded the first time it is needed
  const still = page.defaultView.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  let username = "";
  let shown = CAST[0].id; //  the character on the card
  let shownAt = 0;
  let moving = false; //      true while the panel is open and the picture moves
  let asked = 0; //           counts the questions, so that a late answer to an old one is ignored

  function headOfCharacter(id) {
    if (!heads.has(id)) {
      const image = new Image();
      image.src = headOf(id); // one of our own pictures, from the list in shared/cast.js
      heads.set(id, image);
    }
    return heads.get(id);
  }

  /** Puts a character on the card, in the colours of their kart. */
  function showCharacter(id) {
    shown = id;
    shownAt = performance.now();
    const look = lookOfCharacter(id);
    card.style.setProperty("--tint", look.body);
    card.style.setProperty("--tint-two", look.helmet);
    canvas.setAttribute("aria-label", `${CAST.find((one) => one.id === id).name} beside their kart`);
  }

  function paint(now) {
    if (!moving) {
      return;
    }
    const seconds = now / 1000;
    const swing = still ? 0 : Math.sin((seconds * Math.PI * 2) / SECONDS_PER_SWING) * SWING;
    const pose = still ? poseAt("crossed", 0) : chosenPose(danceOf(shown), (now - shownAt) / 1000);
    const context = canvas.getContext("2d");
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(SHARP, 0, 0, SHARP, 0, 0);
    const turn = FACING_US + swing;
    paintPilotScene(context, viewerBehind({ ahead: 0, sideways: -SCENE_SHIFT }, turn, turn, CAMERA, SIZE), {
      look: lookOfCharacter(shown),
      hair: hairOf(shown),
      longHair: longHairOf(shown),
      head: headOfCharacter(shown),
      pose,
      withKart: true,
    });
    requestAnimationFrame(paint);
  }

  /** The three big numbers. */
  function showNumbers(list) {
    numbers.replaceChildren(
      ...list.map(({ label, value }) => {
        // The label comes first for a screen reader; style.css shows the number above it.
        const box = makePart(page, "div", "stat");
        box.append(makePart(page, "dt", "stat-label", label), makePart(page, "dd", "stat-value", value));
        return box;
      }),
    );
  }

  /** Something to say instead of the times: loading, no races yet, or what went wrong. */
  function say(text, isProblem = false) {
    status.textContent = text;
    status.hidden = text === "";
    status.classList.toggle("is-error", isProblem);
    details.hidden = text !== "";
  }

  /** The card before the server has answered: the name, and the character chosen in the menu. */
  function showWaiting() {
    nameLine.textContent = username; // as text, never as HTML
    kicker.textContent = "My stats";
    favouriteLine.textContent = "";
    showNumbers(statsWords(null).numbers.map((each) => ({ ...each, value: "–" })));
    showCharacter(readCharacter(storage)?.id ?? CAST[0].id);
    say(STATS_LOADING_TEXT);
  }

  function showStats(answer) {
    const words = statsWords(answer.stats);
    kicker.textContent = `My stats · ${answer.trackName}`;
    showNumbers(words.numbers);
    if (words.favourite !== null) {
      showCharacter(words.favourite.id);
      favouriteLine.replaceChildren(
        makePart(page, "span", "stats-favourite-word", "Most played"),
        makePart(page, "strong", "", words.favourite.name),
        makePart(page, "span", "stats-favourite-line", words.favourite.line),
      );
    } else {
      favouriteLine.replaceChildren(
        makePart(page, "span", "stats-favourite-word", "Most played"),
        makePart(page, "span", "stats-favourite-line", "Shows after your next race"),
      );
    }
    if (words.empty) {
      say(NO_RACES_TEXT);
      return;
    }
    say("");
    bestList.replaceChildren(
      ...words.best.map(({ place, time, detail }) => {
        const row = makePart(page, "li", `best-row best-${place}`);
        row.append(
          makePart(page, "span", "best-medal", String(place)),
          makePart(page, "span", "best-time", time),
          makePart(page, "span", "best-detail", detail),
        );
        return row;
      }),
    );
    lapLine.replaceChildren();
    if (words.bestLap !== null) {
      lapLine.append(makePart(page, "span", "best-time", words.bestLap.time), makePart(page, "span", "best-detail", words.bestLap.detail));
    }
    rankLine.textContent = words.rank;
    kindsLine.textContent = words.kinds;
  }

  /** Asks the server for the stats and shows them. */
  async function refresh() {
    const mine = ++asked;
    showWaiting();
    downloadStatus.textContent = "";
    if (api === null) {
      say(statsProblemText(null), true);
      return;
    }
    // A server that was asleep takes a while: say so, as everywhere else (waking.js).
    const slow = setTimeout(() => {
      if (mine === asked) {
        say(waitingWords(STATS_LOADING_TEXT, SLOW_AFTER_MS));
      }
    }, SLOW_AFTER_MS);
    const answer = await api.getStats();
    clearTimeout(slow);
    if (mine !== asked) {
      return; // the panel was opened again meanwhile: that question's answer counts
    }
    if (answer.ok !== true || answer.stats === null || typeof answer.stats !== "object") {
      say(statsProblemText(answer.message), true);
      return;
    }
    showStats(answer);
  }

  // The stats are read each time the panel opens, so a race driven a moment
  // ago is there. The picture only moves while the panel is open.
  page.getElementById("open-account").addEventListener("click", () => {
    refresh();
    if (!moving) {
      moving = true;
      requestAnimationFrame(paint);
    }
  });
  panel.addEventListener("close", () => {
    moving = false;
    asked++; // an answer still on its way is no longer wanted
  });

  // "Download my results": the file is fetched first, so that a refusal
  // (signed out meanwhile, server asleep) becomes a sentence on the page
  // instead of a broken download.
  download.addEventListener("click", async () => {
    if (api === null) {
      downloadStatus.textContent = statsProblemText(null);
      return;
    }
    download.disabled = true;
    downloadStatus.textContent = "Getting your results…";
    const answer = await api.getResultsFile();
    download.disabled = false;
    if (answer.ok !== true) {
      downloadStatus.textContent = statsProblemText(answer.message);
      return;
    }
    // A link to the file in the browser's memory, clicked for the player.
    const address = URL.createObjectURL(answer.file);
    const link = makePart(page, "a");
    link.href = address;
    link.download = FILE_NAME;
    page.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(address), 10_000); // let the browser forget it again
    downloadStatus.textContent = `Saved as ${FILE_NAME}. It opens in Excel or any other spreadsheet program.`;
  });

  return {
    setPlayer(me) {
      username = me?.signedIn === true ? (me.username ?? "") : "";
    },
  };
}
