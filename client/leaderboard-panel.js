// The Leaderboard panel of the menu, on the page.
//
// What the panel shows is worked out in leaderboard-view.js, and
// leaderboard.js asks the server. This file only puts the result on the
// page and listens to the buttons, so it is checked by eye in a browser.
//
// Every name and time is put on the page as plain text (see page-parts.js).

import { createLeaderboard } from "./leaderboard.js";
import { makePart } from "./page-parts.js";

/** How many grey bars stand in for the rows of a board while it loads. */
const LOADING_ROWS = 5;

/** The three parts of a row: place, name (with a "you" label on your own row), time. */
function rowParts(page, row) {
  const name = makePart(page, "span", "row-name", row.username);
  if (row.isMe) {
    name.append(makePart(page, "span", "you-tag", "you"));
  }
  return [makePart(page, "span", "row-rank", row.rank), name, makePart(page, "span", "row-time", row.time)];
}

/**
 * Fills in one board.
 *   name   "race-board" or "lap-board": the beginning of the names of its parts in index.html
 *   board  { rows, empty, mine } from leaderboard-view.js
 */
function showBoard(page, name, board) {
  const list = page.getElementById(`${name}-rows`);
  list.replaceChildren();
  for (const row of board.rows) {
    const item = makePart(page, "li", "board-row");
    if (row.podium > 0) {
      item.classList.add("podium", `podium-${row.podium}`); // the first three stand on the podium (style.css)
    }
    item.classList.toggle("is-me", row.isMe);
    item.append(...rowParts(page, row));
    list.append(item);
  }

  const empty = page.getElementById(`${name}-empty`);
  empty.textContent = board.empty;
  empty.hidden = board.empty === "";

  // Under the rows: your own row when you are outside the ten, or a sentence.
  const mine = page.getElementById(`${name}-mine`);
  mine.replaceChildren();
  mine.className = "board-mine";
  mine.hidden = board.mine === null;
  if (board.mine?.kind === "row") {
    mine.classList.add("board-row", "is-me");
    mine.append(...rowParts(page, board.mine.row));
  } else if (board.mine?.kind === "text") {
    mine.textContent = board.mine.text;
  }
}

/** Shows grey bars in a board while we wait for the server. */
function showLoadingBoard(page, name) {
  const list = page.getElementById(`${name}-rows`);
  list.replaceChildren();
  for (let i = 0; i < LOADING_ROWS; i++) {
    const bar = makePart(page, "li", "board-row loading-row");
    bar.setAttribute("aria-hidden", "true"); // nothing to read out: the line above the boards says "Loading"
    list.append(bar);
  }
  page.getElementById(`${name}-empty`).hidden = true;
  page.getElementById(`${name}-mine`).hidden = true;
}

/**
 * Puts a view from leaderboardView() (leaderboard-view.js) on the page.
 */
export function showLeaderboard(page, view) {
  // The track buttons: the chosen one is marked as pressed.
  for (const button of page.getElementById("leaderboard-tracks").children) {
    const track = view.tracks.find((listed) => listed.shortName === button.dataset.track);
    button.setAttribute("aria-pressed", String(track?.chosen === true));
  }

  // The boards of all players: loading, a notice, or the two boards.
  const { shared } = view;
  page.getElementById("shared-status").textContent = shared.kind === "loading" ? shared.text : "";
  page.getElementById("shared-notice").hidden = shared.kind !== "notice";
  page.getElementById("shared-notice-text").textContent = shared.kind === "notice" ? shared.text : "";
  page.getElementById("shared-boards").hidden = shared.kind === "notice";
  if (shared.kind === "ready") {
    showBoard(page, "race-board", shared.races);
    showBoard(page, "lap-board", shared.laps);
  } else if (shared.kind === "loading") {
    showLoadingBoard(page, "race-board");
    showLoadingBoard(page, "lap-board");
  }

  // Your own practice bests on this track.
  page.getElementById("practice-race").textContent = view.practice.race;
  page.getElementById("practice-lap").textContent = view.practice.lap;
}

/**
 * Connects the Leaderboard panel to the page.
 *   api      the functions of account-api.js, to ask the server for the boards
 *   storage  this browser's storage, or null (see storage.js)
 *   tracks   the list from shared/tracks/index.js: short name -> track
 * Gives back the leaderboard (leaderboard.js), so the menu can tell it who
 * is signed in.
 */
export function connectLeaderboard(page, { api, storage, tracks }) {
  const panel = page.getElementById("leaderboard");
  const switcher = page.getElementById("leaderboard-tracks");
  const leaderboard = createLeaderboard({ api, storage, tracks, show: (view) => showLeaderboard(page, view) });

  // One button for each track.
  for (const [shortName, track] of Object.entries(tracks)) {
    const button = makePart(page, "button", "button", track.name);
    button.type = "button";
    button.dataset.track = shortName;
    button.addEventListener("click", () => leaderboard.chooseTrack(shortName));
    switcher.append(button);
  }

  /** Puts the keyboard on the button of the chosen track. */
  const focusChosenTrack = () => switcher.querySelector('[aria-pressed="true"]')?.focus();

  page.getElementById("open-leaderboard").addEventListener("click", () => {
    leaderboard.load(); // shows "loading" at once, and the boards when the server has answered
    panel.showModal();
    focusChosenTrack();
  });

  page.getElementById("shared-retry").addEventListener("click", () => {
    leaderboard.load();
    focusChosenTrack(); // the "Try again" button is about to disappear: do not leave the keyboard on it
  });

  return leaderboard;
}
