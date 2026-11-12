// Tests for the Leaderboard panel of the menu, without a browser:
//   client/leaderboard-view.js  what the panel shows for an answer from the server
//   client/leaderboard.js       asking the server and showing the result
//
// The server is a pretend one: an "api" object with a getLeaderboard that
// gives whatever the test prepared. Times are in steps of the game, 60 a
// second, so 3600 steps is one minute.

import { describe, it, expect } from "vitest";
import {
  boardRows,
  myLine,
  sharedBoards,
  leaderboardView,
  signedInName,
  BOARD_SIZE,
  LOADING_TEXT,
  EMPTY_TEXT,
  EMPTY_SIGN_IN_TEXT,
  SIGN_IN_TEXT,
  NO_RESULT_TEXT,
} from "../client/leaderboard-view.js";
import { createLeaderboard } from "../client/leaderboard.js";
import { NO_REASON } from "../client/answers.js";
import { NO_TIME } from "../client/track-list.js";
import { recordFinishedRace } from "../client/records.js";
import { TRACKS } from "../shared/tracks/index.js";

function fakeStorage(saved = {}) {
  const texts = { ...saved };
  return {
    texts,
    getItem: (key) => (key in texts ? texts[key] : null),
    setItem: (key, value) => {
      texts[key] = String(value);
    },
  };
}

// The tests use a list of their own with two of the real tracks, so that
// adding a track to the game does not change what these tests expect.
const TWO_TRACKS = { "test-oval": TRACKS["test-oval"], "campus-loop": TRACKS["campus-loop"] };

/** What the server says about who is signed in. */
const SIGNED_OUT = { available: true, signedIn: false, username: null };
const NO_ACCOUNTS = { available: false, signedIn: false, username: null };
function signedInAs(username) {
  return { available: true, signedIn: true, username };
}

/** A list of "count" rows as the server sends them: ranks 1, 2, 3..., each a second slower. */
function rows(count, firstSteps = 3600) {
  return Array.from({ length: count }, (_, i) => ({ rank: i + 1, username: `player_${i + 1}`, steps: firstSteps + i * 60 }));
}

/** A whole answer from the server, with some parts changed. */
function answer(changes = {}) {
  return { ok: true, track: "test-oval", races: rows(10), laps: rows(10, 1200), mine: null, ...changes };
}

describe("the rows of a board", () => {
  it("shows the place, the name and the time as text", () => {
    expect(boardRows([{ rank: 1, username: "Ana", steps: 3723 }], null)).toEqual([
      { rank: 1, username: "Ana", time: "1:02.05", isMe: false, podium: 1 },
    ]);
  });

  it("puts the first three rows on the podium, and no others", () => {
    expect(boardRows(rows(10), null).map((row) => row.podium)).toEqual([1, 2, 3, 0, 0, 0, 0, 0, 0, 0]);
    expect(boardRows(rows(2), null).map((row) => row.podium)).toEqual([1, 2]);
  });

  it("never shows more than ten rows, whatever the server sends", () => {
    const shown = boardRows(rows(25), null);
    expect(BOARD_SIZE).toBe(10);
    expect(shown).toHaveLength(10);
    expect(shown[9].username).toBe("player_10");
  });

  it("marks the signed-in player's own row, whatever capitals the name is written in", () => {
    const list = [
      { rank: 1, username: "Ana", steps: 3600 },
      { rank: 2, username: "Rui", steps: 3660 },
    ];
    expect(boardRows(list, "ana").map((row) => row.isMe)).toEqual([true, false]);
    expect(boardRows(list, "RUI").map((row) => row.isMe)).toEqual([false, true]);
  });

  it("marks no row when nobody is signed in, or the player is not on the board", () => {
    expect(boardRows(rows(3), null).some((row) => row.isMe)).toBe(false);
    expect(boardRows(rows(3), "someone_else").some((row) => row.isMe)).toBe(false);
  });

  it("keeps a name with code-like text in it exactly as it is, to be shown as plain text", () => {
    const nasty = '<img src=x onerror="alert(1)">';
    const [row] = boardRows([{ rank: 1, username: nasty, steps: 3600 }], null);
    expect(row.username).toBe(nasty);
  });

  it("leaves out a row that is broken, and keeps the good ones", () => {
    const good = { rank: 4, username: "Ana", steps: 3600 };
    const broken = [
      null,
      undefined,
      "Ana",
      42,
      [],
      {},
      { rank: 1, username: "Ana" }, //                 no time
      { rank: 1, steps: 3600 }, //                     no name
      { username: "Ana", steps: 3600 }, //             no place
      { rank: 0, username: "Ana", steps: 3600 },
      { rank: -1, username: "Ana", steps: 3600 },
      { rank: 1.5, username: "Ana", steps: 3600 },
      { rank: "1", username: "Ana", steps: 3600 },
      { rank: 1, username: "", steps: 3600 },
      { rank: 1, username: 42, steps: 3600 },
      { rank: 1, username: null, steps: 3600 },
      { rank: 1, username: ["Ana"], steps: 3600 },
      { rank: 1, username: "Ana", steps: 0 },
      { rank: 1, username: "Ana", steps: -60 },
      { rank: 1, username: "Ana", steps: 12.5 },
      { rank: 1, username: "Ana", steps: "3600" },
      { rank: 1, username: "Ana", steps: NaN },
      { rank: 1, username: "Ana", steps: Infinity },
    ];
    for (const row of broken) {
      expect(boardRows([row, good], null), JSON.stringify(row)).toEqual([
        { rank: 4, username: "Ana", time: "1:00.00", isMe: false, podium: 1 },
      ]);
    }
  });

  it("gives no rows, without breaking, when the list itself is broken", () => {
    for (const list of [null, undefined, "rows", 42, {}, { length: 3 }]) {
      expect(boardRows(list, "ana")).toEqual([]);
    }
  });
});

describe("what a board says about the signed-in player", () => {
  it("adds nothing when the player's row is already among the ten", () => {
    const shown = boardRows(rows(10), "player_2");
    expect(myLine(shown, signedInAs("player_2"), 2, 3660)).toBeNull();
  });

  it("adds the player's own row when they rank outside the ten", () => {
    const shown = boardRows(rows(10), "Catarina");
    expect(myLine(shown, signedInAs("Catarina"), 37, 6000)).toEqual({
      kind: "row",
      row: { rank: 37, username: "Catarina", time: "1:40.00", isMe: true, podium: 0 },
    });
  });

  it("says so when the signed-in player has no result on the track yet", () => {
    const shown = boardRows(rows(10), "Catarina");
    expect(myLine(shown, signedInAs("Catarina"), null, null)).toEqual({ kind: "text", text: NO_RESULT_TEXT });
    expect(myLine(shown, signedInAs("Catarina"), undefined, undefined)).toEqual({ kind: "text", text: NO_RESULT_TEXT });
  });

  it("invites a visitor to sign in, but only when the server has accounts", () => {
    const shown = boardRows(rows(10), null);
    expect(myLine(shown, SIGNED_OUT, null, null)).toEqual({ kind: "text", text: SIGN_IN_TEXT });
    expect(myLine(shown, NO_ACCOUNTS, null, null)).toBeNull();
    expect(myLine(shown, null, null, null)).toBeNull(); // not known yet who is signed in
  });

  it("never shows a rank to a visitor, even if the answer carries one", () => {
    const shown = boardRows(rows(10), null);
    expect(myLine(shown, SIGNED_OUT, 3, 3700)).toEqual({ kind: "text", text: SIGN_IN_TEXT });
  });

  it("adds nothing under a board that is empty", () => {
    expect(myLine([], signedInAs("Catarina"), null, null)).toBeNull();
    expect(myLine([], SIGNED_OUT, null, null)).toBeNull();
  });

  it("ignores a rank or a time of the player's own that is not a sensible number", () => {
    const shown = boardRows(rows(10), "Catarina");
    for (const [rank, steps] of [["37", 6000], [37, "6000"], [0, 6000], [37, 0], [-1, 6000], [1.5, 6000], [37, NaN]]) {
      expect(myLine(shown, signedInAs("Catarina"), rank, steps)).toEqual({ kind: "text", text: NO_RESULT_TEXT });
    }
  });

  it("only believes a signed-in player with a name", () => {
    expect(signedInName(signedInAs("Ana"))).toBe("Ana");
    for (const me of [null, undefined, SIGNED_OUT, NO_ACCOUNTS, "Ana", { signedIn: true }, { signedIn: true, username: "" }, { signedIn: "yes", username: "Ana" }]) {
      expect(signedInName(me)).toBeNull();
    }
  });
});

describe("the boards of all players", () => {
  it("says it is loading while we wait for the server", () => {
    expect(sharedBoards({ loading: true, answer: null, me: null })).toEqual({ kind: "loading", text: LOADING_TEXT });
  });

  it("shows both boards, full, when the server sent them", () => {
    const shared = sharedBoards({ loading: false, answer: answer(), me: SIGNED_OUT });
    expect(shared.kind).toBe("ready");
    expect(shared.races.rows).toHaveLength(10);
    expect(shared.laps.rows).toHaveLength(10);
    expect(shared.races.rows[0]).toEqual({ rank: 1, username: "player_1", time: "1:00.00", isMe: false, podium: 1 });
    expect(shared.laps.rows[0].time).toBe("0:20.00");
    expect(shared.races.empty).toBe("");
    expect(shared.races.mine).toEqual({ kind: "text", text: SIGN_IN_TEXT });
  });

  it("says a board is empty, in words, and how to get on it, when nobody has a time yet", () => {
    const shared = sharedBoards({ loading: false, answer: answer({ races: [], laps: [] }), me: signedInAs("Ana") });
    expect(shared.kind).toBe("ready");
    expect(shared.races).toEqual({ rows: [], empty: EMPTY_TEXT, mine: null });
    expect(shared.laps).toEqual({ rows: [], empty: EMPTY_TEXT, mine: null });
    expect(EMPTY_TEXT).toContain("online race");
  });

  it("also tells a visitor to sign in on an empty board, because only signed-in players are saved", () => {
    for (const me of [SIGNED_OUT, null]) {
      const shared = sharedBoards({ loading: false, answer: answer({ races: [], laps: [] }), me });
      expect(shared.races).toEqual({ rows: [], empty: EMPTY_SIGN_IN_TEXT, mine: null });
      expect(shared.laps.empty).toBe(EMPTY_SIGN_IN_TEXT);
    }
    expect(EMPTY_SIGN_IN_TEXT).toContain("Sign in");
  });

  it("can have one board with rows and the other empty", () => {
    const shared = sharedBoards({ loading: false, answer: answer({ laps: [] }), me: signedInAs("Ana") });
    expect(shared.races.empty).toBe("");
    expect(shared.races.rows).toHaveLength(10);
    expect(shared.laps).toEqual({ rows: [], empty: EMPTY_TEXT, mine: null });
  });

  it("marks the signed-in player's rows, on both boards", () => {
    const mine = { raceRank: 3, raceSteps: 3720, lapRank: 1, lapSteps: 1200 };
    const shared = sharedBoards({ loading: false, answer: answer({ mine }), me: signedInAs("player_3") });
    expect(shared.races.rows.map((row) => row.isMe)).toEqual([false, false, true, false, false, false, false, false, false, false]);
    expect(shared.races.mine).toBeNull();
    expect(shared.laps.rows[2].isMe).toBe(true);
  });

  it("shows the signed-in player's own rank on each board when they are outside the ten", () => {
    const mine = { raceRank: 37, raceSteps: 6000, lapRank: 12, lapSteps: 1900 };
    const shared = sharedBoards({ loading: false, answer: answer({ mine }), me: signedInAs("Catarina") });
    expect(shared.races.mine.row).toEqual({ rank: 37, username: "Catarina", time: "1:40.00", isMe: true, podium: 0 });
    expect(shared.laps.mine.row).toEqual({ rank: 12, username: "Catarina", time: "0:31.66", isMe: true, podium: 0 });
  });

  it("shows the server's own sentence when the server says no", () => {
    const refusals = [
      { ok: false, code: "unavailable", message: "Accounts and the shared leaderboard are not available on this server right now." },
      { ok: false, code: "offline", message: "The server could not be reached. Try again in a moment." },
      { ok: false, code: "unknown_track", message: "There is no track with that name." },
    ];
    for (const refusal of refusals) {
      expect(sharedBoards({ loading: false, answer: refusal, me: SIGNED_OUT })).toEqual({ kind: "notice", text: refusal.message });
    }
  });

  it("shows a calm sentence, and does not break, when the answer is not in our format", () => {
    for (const strange of [null, undefined, "hello", 42, [], {}, { ok: false }, { ok: false, message: 42 }, { ok: false, message: "  " }, { ok: "true", races: rows(3) }]) {
      expect(sharedBoards({ loading: false, answer: strange, me: SIGNED_OUT }), JSON.stringify(strange)).toEqual({
        kind: "notice",
        text: NO_REASON,
      });
    }
  });

  it("does not break on an answer that says yes but has broken parts", () => {
    for (const changes of [
      { races: null, laps: undefined },
      { races: "fast", laps: 42 },
      { races: {}, laps: [null, "x", 7] },
      { mine: "first" },
      { mine: 42 },
      { mine: [] },
      { mine: { raceRank: "2", raceSteps: null } },
    ]) {
      const shared = sharedBoards({ loading: false, answer: answer(changes), me: signedInAs("Ana") });
      expect(shared.kind, JSON.stringify(changes)).toBe("ready");
      expect(Array.isArray(shared.races.rows)).toBe(true);
      expect(Array.isArray(shared.laps.rows)).toBe(true);
    }
  });
});

describe("the whole Leaderboard panel", () => {
  it("has a button for every track, with the chosen one marked", () => {
    const view = leaderboardView({ tracks: TWO_TRACKS, shortName: "campus-loop", loading: true, answer: null, me: null, storage: null });
    expect(view.tracks).toEqual([
      { shortName: "test-oval", name: "Test oval", chosen: false },
      { shortName: "campus-loop", name: "Campus loop", chosen: true },
    ]);
    expect(view.trackName).toBe("Campus loop");
  });

  it("shows your own practice bests on the chosen track, from this browser", () => {
    const storage = fakeStorage();
    recordFinishedRace(storage, TRACKS["test-oval"], [600, 1080, 1620]);
    const oval = leaderboardView({ tracks: TWO_TRACKS, shortName: "test-oval", loading: false, answer: answer(), me: null, storage });
    const campus = leaderboardView({ tracks: TWO_TRACKS, shortName: "campus-loop", loading: false, answer: answer(), me: null, storage });
    expect(oval.practice).toEqual({ race: "0:27.00", lap: "0:08.00", any: true });
    expect(campus.practice).toEqual({ race: NO_TIME, lap: NO_TIME, any: false });
  });

  it("keeps showing your practice bests when the shared boards are not available", () => {
    const storage = fakeStorage();
    recordFinishedRace(storage, TRACKS["test-oval"], [600, 1200, 1800]);
    const refusal = { ok: false, code: "unavailable", message: "Not available right now." };
    const view = leaderboardView({ tracks: TWO_TRACKS, shortName: "test-oval", loading: false, answer: refusal, me: NO_ACCOUNTS, storage });
    expect(view.shared).toEqual({ kind: "notice", text: "Not available right now." });
    expect(view.practice.race).toBe("0:30.00");
  });
});

describe("asking the server for the leaderboard", () => {
  /**
   * A leaderboard with a pretend server. "getLeaderboard" decides what the
   * server answers. Gives the leaderboard, every view it showed, and the
   * track names it asked for.
   */
  function setUp(getLeaderboard, storage = null) {
    const views = [];
    const asked = [];
    const api = {
      getLeaderboard(shortName) {
        asked.push(shortName);
        return getLeaderboard(shortName);
      },
    };
    const leaderboard = createLeaderboard({ api, storage, tracks: TWO_TRACKS, show: (view) => views.push(view) });
    return { leaderboard, views, asked, last: () => views[views.length - 1] };
  }

  it("shows 'loading' at once, and the boards when the answer has come", async () => {
    const { leaderboard, views, asked } = setUp(async () => answer());
    const done = leaderboard.load();
    expect(views).toHaveLength(1);
    expect(views[0].shared.kind).toBe("loading");

    await done;
    expect(views).toHaveLength(2);
    expect(views[1].shared.kind).toBe("ready");
    expect(asked).toEqual(["test-oval"]); // the first track in the list, by its short name
  });

  it("asks for the track the player chose, and marks it as chosen", async () => {
    const { leaderboard, asked, last } = setUp(async (track) => answer({ track }));
    await leaderboard.chooseTrack("campus-loop");
    expect(asked).toEqual(["campus-loop"]);
    expect(last().trackName).toBe("Campus loop");
    expect(last().tracks.find((track) => track.chosen).shortName).toBe("campus-loop");
  });

  it("ignores a track that is not in the list, and asks the server nothing", async () => {
    const { leaderboard, views, asked } = setUp(async () => answer());
    for (const name of ["moon", "", "Campus-Loop", "constructor", "__proto__", "toString", undefined, null, 42]) {
      await leaderboard.chooseTrack(name);
    }
    expect(asked).toEqual([]);
    expect(views).toEqual([]);
  });

  it("drops an answer that arrives after the player has chosen another track", async () => {
    // The pretend server answers only when the test says so.
    const waiting = {};
    const { leaderboard, views, last } = setUp(
      (track) =>
        new Promise((resolve) => {
          waiting[track] = resolve;
        }),
    );
    const first = leaderboard.chooseTrack("test-oval");
    const second = leaderboard.chooseTrack("campus-loop");

    // The answer for the first track comes late. It must not be shown.
    waiting["test-oval"](answer({ races: [{ rank: 1, username: "oval_winner", steps: 3600 }] }));
    await first;
    expect(last().shared.kind).toBe("loading");
    expect(last().trackName).toBe("Campus loop");

    waiting["campus-loop"](answer({ races: [{ rank: 1, username: "campus_winner", steps: 4200 }] }));
    await second;
    expect(last().shared.races.rows.map((row) => row.username)).toEqual(["campus_winner"]);
    expect(views.some((view) => view.shared.kind === "ready" && view.shared.races.rows[0]?.username === "oval_winner")).toBe(false);
  });

  it("marks the signed-in player's row once it has been told who is signed in", async () => {
    const { leaderboard, last } = setUp(async () => answer());
    leaderboard.setPlayer(signedInAs("Player_4"));
    await leaderboard.load();
    expect(last().shared.races.rows[3].isMe).toBe(true);

    leaderboard.setPlayer(SIGNED_OUT);
    await leaderboard.load();
    expect(last().shared.races.rows[3].isMe).toBe(false);
  });

  it("shows a calm notice when the server has no leaderboard, and can try again", async () => {
    let available = false;
    const refusal = { ok: false, code: "unavailable", message: "Not available right now." };
    const { leaderboard, last } = setUp(async () => (available ? answer() : refusal));
    await leaderboard.load();
    expect(last().shared).toEqual({ kind: "notice", text: "Not available right now." });

    available = true;
    await leaderboard.load(); // what "Try again" does
    expect(last().shared.kind).toBe("ready");
  });

  it("does not break when the api itself fails, which it should never do", async () => {
    const failing = [
      () => {
        throw new Error("broken");
      },
      async () => {
        throw new Error("broken later");
      },
      async () => undefined,
      async () => "nonsense",
    ];
    for (const getLeaderboard of failing) {
      const { leaderboard, last } = setUp(getLeaderboard);
      await leaderboard.load();
      expect(last().shared).toEqual({ kind: "notice", text: NO_REASON });
    }
  });

  it("does not break when there is no api at all", async () => {
    const views = [];
    const leaderboard = createLeaderboard({ api: null, storage: null, tracks: TWO_TRACKS, show: (view) => views.push(view) });
    await leaderboard.load();
    expect(views[views.length - 1].shared).toEqual({ kind: "notice", text: NO_REASON });
  });
});
