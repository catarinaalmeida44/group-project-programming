// The memory of the Leaderboard panel: which track is chosen, who is signed
// in, and what the server last answered.
//
// It asks the server through "api" (see account-api.js) and then calls
// "show" with what the panel should look like (leaderboard-view.js). It
// never touches the page itself. So the tests can hand in a pretend api and
// a pretend "show", and watch what happens.

import { leaderboardView } from "./leaderboard-view.js";

/**
 * Makes the leaderboard.
 *   api      the functions of account-api.js; only getLeaderboard is used
 *   storage  this browser's storage, or null (see storage.js)
 *   tracks   the list from shared/tracks/index.js: short name -> track
 *   show     called with a new view each time something changed
 */
export function createLeaderboard({ api, storage, tracks, show }) {
  let shortName = Object.keys(tracks)[0]; // the chosen track: the first one to begin with
  let me = null; //       who is signed in, as account.js tells us (null: not known)
  let loading = false; // true while we wait for the server
  let answer = null; //   the server's last answer for the chosen track
  let asked = 0; //       how many times we asked, to recognise an answer that comes too late

  function render() {
    show(leaderboardView({ tracks, shortName, loading, answer, me, storage }));
  }

  /** Asks the server for the boards of the chosen track, and shows "loading" meanwhile. */
  async function load() {
    asked += 1;
    const thisTime = asked;
    loading = true;
    render();

    let got = null;
    try {
      got = await api.getLeaderboard(shortName);
    } catch {
      // account-api.js never fails like this, but a broken api must not
      // break the panel. "No answer" is shown as a calm sentence.
      got = null;
    }

    // The player may have chosen another track while we waited. Then a newer
    // question is on its way and this answer is for the wrong track: drop it.
    if (thisTime !== asked) {
      return;
    }
    loading = false;
    answer = got;
    render();
  }

  return {
    /** The panel was opened, or "Try again" was pressed: ask the server afresh. */
    load,

    /** The player chose a track in the switcher. A name that is not in the list is ignored. */
    async chooseTrack(name) {
      if (!Object.hasOwn(tracks, name)) {
        return;
      }
      shortName = name;
      await load();
    },

    /** Someone signed in or out (account.js tells us). It is used the next time the panel loads. */
    setPlayer(nextMe) {
      me = nextMe;
    },
  };
}
