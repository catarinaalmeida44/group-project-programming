// Tests for what the online page does with accounts and with the choice of
// track: the messages it accepts from the server, the line it shows about
// the player's account, and the room it connects to.
// (The older tests of client/net.js are in net.test.js.)

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readServerMessage, accountLine, othersLine, placeText } from "../client/net.js";
import { chooseTrack, chooseTrackName } from "../client/track-choice.js";
import { createApp } from "../server/app.js";
import { TRACKS, DEFAULT_TRACK } from "../shared/tracks/index.js";

describe("reading the server's messages about accounts", () => {
  it("accepts 'you are signed in as', for a player and for a guest", () => {
    expect(readServerMessage('{"type":"account","username":"Ana"}')).toEqual({ type: "account", username: "Ana" });
    expect(readServerMessage('{"type":"account","username":null}')).toEqual({ type: "account", username: null });
  });

  it("accepts 'your result was saved' and 'could not be saved'", () => {
    const saved = readServerMessage('{"type":"saved","saved":true,"position":2,"raceSteps":1500,"bestLapSteps":480}');
    expect(saved.position).toBe(2);
    expect(readServerMessage('{"type":"saved","saved":false,"position":1,"raceSteps":900,"bestLapSteps":300}').saved).toBe(false);
  });

  it("gives nothing for a strange one, and never breaks the page", () => {
    for (const text of [
      '{"type":"account"}', //                                             no name at all
      '{"type":"account","username":42}',
      '{"type":"account","username":{"name":"Ana"}}',
      '{"type":"saved"}',
      '{"type":"saved","saved":"yes","position":1,"raceSteps":900}',
      '{"type":"saved","saved":true,"position":0,"raceSteps":900}', //     nobody finishes in place 0
      '{"type":"saved","saved":true,"position":"first","raceSteps":900}',
      '{"type":"saved","saved":true,"position":1,"raceSteps":-5}',
      '{"type":"saved","saved":true,"position":1}',
    ]) {
      expect(readServerMessage(text), text).toBe(null);
    }
  });
});

describe("the line about the player's account", () => {
  const ana = { type: "account", username: "Ana" };
  const guest = { type: "account", username: null };

  it("is empty until the server has said who we are", () => {
    expect(accountLine(null, null)).toBe("");
  });

  it("tells a guest that results are not saved, and how to change that", () => {
    const line = accountLine(guest, null);
    expect(line).toContain("guest");
    expect(line).toContain("not saved");
    expect(line).toContain("Sign in");
  });

  it("tells a signed-in player their name and that their time will be saved", () => {
    const line = accountLine(ana, null);
    expect(line).toContain("Signed in as Ana.");
    expect(line).toContain("saved to the leaderboard");
  });

  it("says where and in what time the player finished once the result is saved", () => {
    const saved = { type: "saved", saved: true, position: 2, raceSteps: 1500, bestLapSteps: 480 };
    expect(accountLine(ana, saved)).toBe("Signed in as Ana. Saved to the leaderboard: 2nd place, 0:25.00.");
  });

  it("says so when the result could not be saved", () => {
    const failed = { type: "saved", saved: false, position: 1, raceSteps: 1500, bestLapSteps: 480 };
    const line = accountLine(ana, failed);
    expect(line).toContain("could not be saved");
    expect(line).not.toContain("Saved to the leaderboard");
  });

  it("never claims a guest's result was saved, whatever else arrived", () => {
    const saved = { type: "saved", saved: true, position: 1, raceSteps: 1500, bestLapSteps: 480 };
    expect(accountLine(guest, saved)).toBe(accountLine(guest, null));
  });
});

describe("the names of the other players in the room", () => {
  it("reads the list the server sends: player number and user name", () => {
    const message = readServerMessage('{"type":"names","names":{"3":"Ana","7":"Rui_7"}}');
    expect(message.type).toBe("names");
    expect([...message.names]).toEqual([
      [3, "Ana"],
      [7, "Rui_7"],
    ]);
    expect(readServerMessage('{"type":"names","names":{}}').names.size).toBe(0);
  });

  it("drops anything in the list that is not a player number with a possible user name", () => {
    const message = readServerMessage(
      JSON.stringify({
        type: "names",
        names: {
          1: "Ana",
          2: "<img src=x onerror=alert(1)>",
          3: "has space",
          4: "ab",
          5: "x".repeat(17),
          6: 42,
          7: null,
          8: { name: "Rui" },
          "-1": "Minus",
          "1.5": "Half",
          abc: "Letters",
          __proto__: "Proto",
        },
      }),
    );
    expect([...message.names]).toEqual([[1, "Ana"]]);
  });

  it("gives nothing for a list that is not a list of names at all", () => {
    for (const text of ['{"type":"names"}', '{"type":"names","names":null}', '{"type":"names","names":"Ana"}', '{"type":"names","names":["Ana"]}']) {
      expect(readServerMessage(text), text).toBe(null);
    }
  });

  const names = new Map([
    [1, "Ana"],
    [2, "Rui"],
    [3, "Bea"],
  ]);

  it("says nothing when nobody else is there", () => {
    expect(othersLine(names, [1], 1)).toBe("");
    expect(othersLine(names, [], 1)).toBe("");
  });

  it("names the signed-in players, leaves yourself out and counts the guests", () => {
    expect(othersLine(names, [1, 2], 1)).toBe("With you: Rui.");
    expect(othersLine(names, [1, 2, 3], 1)).toBe("With you: Rui and Bea.");
    expect(othersLine(names, [1, 2, 3, 9], 1)).toBe("With you: Rui, Bea and 1 guest.");
    expect(othersLine(names, [1, 8, 9], 1)).toBe("With you: 2 guests.");
    expect(othersLine(names, [1, 9], 1)).toBe("With you: 1 guest.");
  });

  it("works the same for a guest, who has no name in the list", () => {
    expect(othersLine(names, [1, 2, 9], 9)).toBe("With you: Ana and Rui.");
  });

  it("does not name a player who has left, even if the list still has them", () => {
    expect(othersLine(names, [1, 3], 1)).toBe("With you: Bea.");
  });
});

describe("a finishing position as a word", () => {
  it("adds the right ending", () => {
    const expected = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 8: "8th", 11: "11th", 12: "12th", 13: "13th", 21: "21st", 22: "22nd", 101: "101st", 111: "111th" };
    for (const [position, text] of Object.entries(expected)) {
      expect(placeText(Number(position))).toBe(text);
    }
  });
});

describe("the short name of the chosen track, which the online page puts in the address of its connection", () => {
  it("is the name in the address when that is a real track", () => {
    expect(chooseTrackName("?track=campus-loop")).toBe("campus-loop");
    expect(chooseTrackName("?track=test-oval")).toBe("test-oval");
  });

  it("is the test oval for no choice, a track that does not exist, or anything strange", () => {
    for (const address of ["", "?", "?track=", "?track=moon", "?track=Campus-Loop", "?track=constructor", "?track=__proto__", undefined, null, 42]) {
      expect(chooseTrackName(address), String(address)).toBe(DEFAULT_TRACK);
    }
  });

  it("can never carry anything else into the address: it is always one of our own names", () => {
    for (const address of ["?track=campus-loop%26x=1", "?track=campus-loop&track=moon", "?track=x%0d%0aHost:%20evil", "?track=../../play"]) {
      expect(Object.keys(TRACKS)).toContain(chooseTrackName(address));
    }
  });

  it("always agrees with the track the page draws", () => {
    for (const address of ["", "?track=campus-loop", "?track=test-oval", "?track=moon"]) {
      expect(TRACKS[chooseTrackName(address)]).toBe(chooseTrack(address));
    }
  });
});

describe("the online page, asked from a real copy of the server", () => {
  let app;
  let base;

  beforeAll(async () => {
    app = createApp();
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${app.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => app.close(resolve));
  });

  it("has a place for the track's name and for the line about the account", async () => {
    const answer = await fetch(`${base}/online.html?track=campus-loop`);
    const body = await answer.text();
    expect(answer.status).toBe(200);
    expect(body).toContain('id="track-name"');
    expect(body).toContain('id="account-line"');
    expect(body).toContain('id="others-line"');
    expect(body).toContain('src="/online.js"');
  });

  it("is sent every file it needs to choose the track and draw its buildings", async () => {
    for (const address of ["/online.js", "/net.js", "/track-choice.js", "/buildings.js", "/format.js", "/shared/tracks/index.js"]) {
      const answer = await fetch(base + address);
      await answer.text();
      expect(answer.status, address).toBe(200);
    }
  });
});
