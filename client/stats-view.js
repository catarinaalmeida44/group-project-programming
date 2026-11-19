// A player's own stats, as words for "Your account".
//
// The server sends numbers (server/stats.js): how many races, the three
// best times in steps of the game, the id of the character driven most.
// This file turns them into what the card shows: "12", "1:23.45",
// "Online · 19 Nov 2026", "Driven in 5 of your 9 races". It decides nothing
// and talks to nobody, so it is tested without a browser. stats-panel.js
// puts the words on the page.

import { STEP_SECONDS } from "../shared/physics.js";
import { characterById } from "../shared/cast.js";
import { formatTime } from "./format.js";
import { placeText } from "./net.js";

/** What the card says while the server is asked. */
export const STATS_LOADING_TEXT = "Loading your stats…";

/** What the card says for a player with no saved race on the track. */
export const NO_RACES_TEXT = "No races yet. Finish a race while you are signed in, online or single, and it shows up here.";

/** Under the numbers: what counts where. */
export const WHAT_COUNTS_TEXT =
  "Single races count here, in your own stats. The shared leaderboard only counts online races, which our server runs itself.";

/** What the card says when the stats could not be read. "message" is the server's own sentence, if it sent one. */
export function statsProblemText(message) {
  return typeof message === "string" && message !== "" ? message : "Your stats could not be loaded. Try again in a moment.";
}

/** A time in steps of the game as "1:23.45". */
function timeText(steps) {
  return formatTime(steps * STEP_SECONDS);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A moment as a day, such as "19 Nov 2026", in the time of the player's own computer. Nothing for a moment that is none. */
export function dayText(at) {
  const date = new Date(at);
  if (typeof at !== "number" || Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Online" or "Single race". */
function kindText(mode) {
  return mode === "online" ? "Online" : "Single race";
}

/** "1 race", "2 races". */
function count(number, one, many) {
  return `${number} ${number === 1 ? one : many}`;
}

/**
 * The words of the card.
 *   stats  from the server (see getStats in account-api.js)
 * Gives:
 *   empty      true when there is no race yet: the card then only says so
 *   numbers    [{ label, value }]: the three big numbers
 *   kinds      "8 online · 4 single races", or ""
 *   best       [{ place, time, detail }]: the fastest races, "place" 1 to 3
 *   bestLap    { time, detail }, or null
 *   rank       one sentence about the shared leaderboard
 *   favourite  { id, name, line }, or null: the character driven most
 */
export function statsWords(stats) {
  const races = stats?.races ?? 0;
  const favourite = favouriteWords(stats?.favourite ?? null, races);
  return {
    empty: races === 0,
    numbers: [
      { label: races === 1 ? "Race" : "Races", value: String(races) },
      { label: stats?.wins === 1 ? "Win" : "Wins", value: String(stats?.wins ?? 0) },
      { label: stats?.podiums === 1 ? "Podium" : "Podiums", value: String(stats?.podiums ?? 0) },
    ],
    kinds: races === 0 ? "" : `${stats.online} online · ${count(stats.single, "single race", "single races")}`,
    best: (stats?.bestRaces ?? []).map((best, index) => ({
      place: index + 1,
      time: timeText(best.steps),
      detail: [kindText(best.mode), dayText(best.at), characterById(best.character)?.name].filter((part) => part).join(" · "),
    })),
    bestLap:
      stats?.bestLap == null
        ? null
        : { time: timeText(stats.bestLap.steps), detail: [kindText(stats.bestLap.mode), dayText(stats.bestLap.at)].filter((part) => part).join(" · ") },
    rank: rankText(stats?.rank ?? null),
    favourite,
  };
}

/** The sentence about the shared leaderboard. */
function rankText(rank) {
  if (rank === null) {
    return "Not on the shared leaderboard yet: finish an online race to get on it.";
  }
  return `On the shared leaderboard: ${placeText(rank.race)} fastest race, ${placeText(rank.lap)} fastest lap.`;
}

/**
 * The character driven most: who, and in how many races. Races saved
 * before the game noted the character are left out of the count, and the
 * sentence then says "of the N races that noted the character".
 */
function favouriteWords(favourite, races) {
  const character = favourite === null ? null : characterById(favourite.character);
  if (character === null) {
    return null;
  }
  const of = favourite.counted === races ? `your ${count(races, "race", "races")}` : `the ${count(favourite.counted, "race", "races")} that noted the character`;
  return { id: character.id, name: character.name, line: `Driven in ${favourite.races} of ${of}` };
}

/**
 * What the single race page adds to "You finished" about saving the race
 * for the player's stats. "answer" is what the server said (saveSingleResult
 * in account-api.js), or null while it has not answered.
 *   - saved: say so
 *   - not signed in, or a server without accounts: say nothing. A guest
 *     was never promised anything
 *   - anything else: say that it was not saved, and why if the server said
 */
export function singleSavedText(answer) {
  if (answer === null || typeof answer !== "object") {
    return "";
  }
  if (answer.ok === true) {
    return " Saved to your stats.";
  }
  if (answer.code === "not_signed_in" || answer.code === "unavailable") {
    return "";
  }
  if (answer.code === "offline") {
    return " Not saved to your stats: the server could not be reached.";
  }
  return " Not saved to your stats.";
}
