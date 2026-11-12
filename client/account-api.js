// Talking to the server about accounts and the shared leaderboard.
//
// Every function here asks the server one thing and gives back a plain
// answer. None of them ever fails with an error: when the server cannot be
// reached, or runs without a database, the answer says so. The pages can
// then show a calm message instead of breaking.
//
// The browser never keeps the password or the "you are signed in" ticket
// itself. After a successful sign-in the server puts a cookie in the browser
// that the page's own code cannot read (see server/accounts.js). The browser
// sends it along by itself with every later question.
//
// THE ANSWERS
//   Most functions give { ok: true, ... } or { ok: false, code, message }.
//   "message" is a sentence that can be shown to the player as it is.
//   "code" is a short word for the page's code to decide what to do:
//     invalid_username   the user name breaks the rules
//     invalid_password   the password breaks the rules
//     username_taken     someone already has that user name
//     wrong_login        wrong user name or password
//     locked             too many wrong passwords: wait, the message says how long
//     too_many_attempts  too many tries from this computer: wait a minute
//     not_signed_in      this needs a signed-in player
//     unknown_track      there is no track with that short name
//     unavailable        the server runs without a database, so there are no accounts
//     offline            the server could not be reached at all

const OFFLINE = { ok: false, code: "offline", message: "The server could not be reached. Try again in a moment." };
const UNAVAILABLE = {
  ok: false,
  code: "unavailable",
  message: "Accounts and the shared leaderboard are not available on this server right now.",
};

/**
 * Makes the set of functions. "fetchFunction" is the browser's own tool for
 * asking a server. The tests hand in a pretend one.
 */
export function createAccountApi(fetchFunction) {
  /** Asks the server one thing. Always gives an object with "ok" in it. */
  async function ask(method, address, body) {
    let response;
    try {
      response = await fetchFunction(address, {
        method,
        headers: body === undefined ? {} : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "same-origin", // send our cookie, and only to our own site
      });
    } catch {
      return OFFLINE;
    }
    let answer;
    try {
      answer = await response.json();
    } catch {
      answer = null;
    }
    if (answer === null || typeof answer !== "object" || typeof answer.ok !== "boolean") {
      // Not an answer in our format: for example an older server that has no accounts.
      return UNAVAILABLE;
    }
    return answer;
  }

  return {
    /**
     * Who is signed in on this browser?
     * Gives { available, signedIn, username }:
     *   available  false when the server has no accounts right now
     *   signedIn   true or false
     *   username   the player's name, or null
     */
    async getMe() {
      const answer = await ask("GET", "/api/me");
      if (!answer.ok) {
        return { available: false, signedIn: false, username: null };
      }
      return {
        available: true,
        signedIn: answer.signedIn === true,
        username: answer.signedIn === true ? String(answer.username) : null,
      };
    },

    /** Makes a new account and signs in. Gives { ok: true, username } or { ok: false, code, message }. */
    signUp(username, password) {
      return ask("POST", "/api/signup", { username, password });
    },

    /** Signs in. Gives { ok: true, username } or { ok: false, code, message }. */
    logIn(username, password) {
      return ask("POST", "/api/login", { username, password });
    },

    /** Signs out on this browser. Gives { ok: true } or { ok: false, code, message }. */
    logOut() {
      return ask("POST", "/api/logout", {});
    },

    /**
     * Deletes the signed-in player's account and all their saved results.
     * The password is asked again, so that someone who finds the browser
     * open cannot do it. Gives { ok: true } or { ok: false, code, message }.
     */
    deleteAccount(password) {
      return ask("POST", "/api/delete-account", { password });
    },

    /**
     * The shared leaderboard of one track. "trackName" is the short name
     * used in addresses, such as "campus-loop".
     * Gives { ok: false, code, message }, or:
     *   { ok: true,
     *     track,                       the short name asked for
     *     races: [{ rank, username, steps }],   the ten fastest whole races
     *     laps:  [{ rank, username, steps }],   the ten fastest single laps
     *     mine:  { raceRank, raceSteps, lapRank, lapSteps } or null }
     * Times are in steps of the game, 60 to a second, like every time in
     * the rules. "mine" is the signed-in player's own best and where it
     * ranks among all players, or null when nobody is signed in or they
     * have no result on this track. A player appears at most once in each
     * list, with their best time. Only races run by the server count:
     * online races that began with the countdown.
     */
    getLeaderboard(trackName) {
      return ask("GET", `/api/leaderboard?track=${encodeURIComponent(trackName)}`);
    },
  };
}

/** The functions for the real pages, using the browser's own fetch. Not made when there is no browser (in the tests). */
export const accountApi =
  typeof fetch === "function" ? createAccountApi((address, options) => fetch(address, options)) : null;
