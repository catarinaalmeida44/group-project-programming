// Tests for what the two-player page tells its two drivers
// (client/double-view.js), for the second driver's character
// (client/cast-choice.js), for the menu's way to the page
// (client/track-list.js) and for the page itself as the server sends it.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { DRIVERS, START_WORDS, NOT_SAVED_WORDS, HALF_SHOWS, plateName, halfMessage, tagsFor } from "../client/double-view.js";
import { readCharacter, saveCharacter, readSecondCharacter, saveSecondCharacter, firstOther, twoCharacters } from "../client/cast-choice.js";
import { RACE_KINDS, TWO_PLAYER_KIND, TRACK_CHOICE_KINDS, trackAddress, trackCards } from "../client/track-list.js";
import { LETTER_DRIVING_KEYS } from "../client/keyboard.js";
import { CAST } from "../shared/cast.js";
import { TRACKS } from "../shared/tracks/index.js";
import { createTwoPlayerRace } from "../shared/two-player-race.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { createApp } from "../server/app.js";

/** A pretend browser storage: a Map behind getItem and setItem. */
function pretendStorage(start = {}) {
  const kept = new Map(Object.entries(start));
  return { getItem: (key) => (kept.has(key) ? kept.get(key) : null), setItem: (key, value) => kept.set(key, value), kept };
}

describe("the two drivers", () => {
  it("are player 1 with W, A, S, D and player 2 with the arrow keys", () => {
    expect(DRIVERS).toHaveLength(2);
    expect(DRIVERS[0]).toMatchObject({ label: "Player 1", short: "P1", keys: ["W", "A", "S", "D"] });
    expect(DRIVERS[1]).toMatchObject({ label: "Player 2", short: "P2", keys: ["↑", "←", "↓", "→"] });
  });

  it("show player 1 the same letters the keyboard listens to", () => {
    expect(DRIVERS[0].keys.map((key) => key.toLowerCase()).sort()).toEqual([...LETTER_DRIVING_KEYS].sort());
  });

  it("cannot be changed by mistake", () => {
    expect(Object.isFrozen(DRIVERS)).toBe(true);
    expect(Object.isFrozen(DRIVERS[0])).toBe(true);
  });
});

describe("the name on a driver's plate", () => {
  it("is the name of their character", () => {
    expect(plateName(0, "ro")).toBe(CAST.find((character) => character.id === "ro").name);
    expect(plateName(1, "dean")).toBe(CAST.find((character) => character.id === "dean").name);
  });

  it("is 'Player 1' or 'Player 2' for a driver without a character", () => {
    expect(plateName(0, null)).toBe("Player 1");
    expect(plateName(1, "nobody")).toBe("Player 2");
  });
});

describe("the words in the middle of one half", () => {
  it("ask for a driving key before the race has started", () => {
    expect(halfMessage({ started: false })).toEqual({ text: START_WORDS, big: false });
    expect(START_WORDS).toMatch(/driving key/);
  });

  it("are the countdown, in big, once it runs", () => {
    for (const label of ["3", "2", "1", "GO!"]) {
      expect(halfMessage({ started: true, label })).toEqual({ text: label, big: true });
    }
  });

  it("are nothing while the driver simply races", () => {
    expect(halfMessage({ started: true, label: "" })).toEqual({ text: "", big: false });
  });

  it("are a warning when the driver goes the wrong way or missed a checkpoint", () => {
    expect(halfMessage({ started: true, warning: "Wrong way" })).toEqual({ text: "Wrong way", big: false });
  });

  it("tell a driver who has finished their place and time, and to wait for the others", () => {
    const words = halfMessage({ started: true, finished: true, place: 2, steps: 3600 });
    expect(words.big).toBe(false);
    expect(words.text).toMatch(/You finished 2nd, in 1:00\.00!/);
    expect(words.text).toMatch(/Wait for all the drivers/);
  });

  it("show the finish and not a warning for a driver who has finished", () => {
    expect(halfMessage({ started: true, finished: true, place: 1, steps: 600, warning: "Wrong way" }).text).toMatch(/You finished 1st/);
  });

  it("are nothing once the race is over for everyone: the podium is up", () => {
    expect(halfMessage({ started: true, finished: true, place: 1, steps: 600, over: true })).toEqual({ text: "", big: false });
  });
});

describe("the tags above the karts in one half", () => {
  it("mark only the other driver's kart, so each can find their friend", () => {
    expect([...tagsFor(0)]).toEqual([[1, "P2"]]);
    expect([...tagsFor(1)]).toEqual([[0, "P1"]]);
  });
});

describe("how much of its picture a half shows", () => {
  it("is the middle part: more than half, less than all of it", () => {
    expect(HALF_SHOWS).toBeGreaterThan(0.5);
    expect(HALF_SHOWS).toBeLessThan(1);
  });
});

describe("what is said about saving a two-player race", () => {
  it("is that nothing is saved", () => {
    expect(NOT_SAVED_WORDS).toMatch(/not saved/);
    expect(NOT_SAVED_WORDS).toMatch(/leaderboard/);
  });
});

describe("the second driver's character", () => {
  it("is remembered apart from the first driver's", () => {
    const storage = pretendStorage();
    saveCharacter(storage, "ro");
    expect(saveSecondCharacter(storage, "dean")).toBe(true);
    expect(readCharacter(storage).id).toBe("ro");
    expect(readSecondCharacter(storage).id).toBe("dean");
  });

  it("is nobody when nothing was saved, or something that is not in the cast", () => {
    expect(readSecondCharacter(pretendStorage())).toBeNull();
    expect(readSecondCharacter(null)).toBeNull();
    expect(readSecondCharacter(pretendStorage({ "character-2": '{"id":"mario"}' }))).toBeNull();
    expect(readSecondCharacter(pretendStorage({ "character-2": "broken" }))).toBeNull();
  });

  it("cannot be saved as someone who is not in the cast", () => {
    const storage = pretendStorage();
    expect(() => saveSecondCharacter(storage, "mario")).toThrow();
    expect(() => saveSecondCharacter(storage, null)).toThrow();
    expect(storage.kept.size).toBe(0);
  });
});

describe("the characters of the two drivers", () => {
  it("are what each chose in the menu", () => {
    const storage = pretendStorage();
    saveCharacter(storage, "pcp");
    saveSecondCharacter(storage, "cici");
    expect(twoCharacters(storage, CAST)).toEqual(["pcp", "cici"]);
  });

  it("are never the same one twice: the second driver gets the first free character instead", () => {
    for (const { id } of CAST) {
      const storage = pretendStorage();
      saveCharacter(storage, id);
      saveSecondCharacter(storage, id);
      const [first, second] = twoCharacters(storage, CAST);
      expect(first).toBe(id);
      expect(second).not.toBe(id);
      expect(second).toBe(firstOther(CAST, id).id);
    }
  });

  it("are the first two of the cast when nobody chose anything, so the page opened directly still works", () => {
    expect(twoCharacters(pretendStorage(), CAST)).toEqual([CAST[0].id, CAST[1].id]);
    expect(twoCharacters(null, CAST)).toEqual([CAST[0].id, CAST[1].id]);
  });

  it("can always start a race", () => {
    for (const first of CAST) {
      for (const second of CAST) {
        const storage = pretendStorage();
        saveCharacter(storage, first.id);
        saveSecondCharacter(storage, second.id);
        expect(() => createTwoPlayerRace(TEST_OVAL, 1, null, 0, twoCharacters(storage, CAST))).not.toThrow();
      }
    }
  });
});

describe("the first character that is not taken", () => {
  it("is the first of the cast, or the second when the first is taken", () => {
    expect(firstOther(CAST, null).id).toBe(CAST[0].id);
    expect(firstOther(CAST, CAST[0].id).id).toBe(CAST[1].id);
    expect(firstOther(CAST, CAST[3].id).id).toBe(CAST[0].id);
  });

  it("is nobody in a cast of one who is taken", () => {
    expect(firstOther([{ id: "ro" }], "ro")).toBeNull();
  });
});

describe("choosing a track for two players", () => {
  it("is a third kind of race, beside the two for one player", () => {
    expect(Object.keys(TRACK_CHOICE_KINDS)).toEqual(["single", "online", "double"]);
    expect(TRACK_CHOICE_KINDS.single).toBe(RACE_KINDS.single);
    expect(TRACK_CHOICE_KINDS.online).toBe(RACE_KINDS.online);
    expect(TRACK_CHOICE_KINDS.double).toBe(TWO_PLAYER_KIND);
  });

  it("has a title, a sentence and a button word", () => {
    for (const text of [TWO_PLAYER_KIND.title, TWO_PLAYER_KIND.lead, TWO_PLAYER_KIND.go]) {
      expect(typeof text).toBe("string");
      expect(text).not.toBe("");
    }
    // The sentence is honest: two sets of keys, and nothing is saved.
    expect(TWO_PLAYER_KIND.lead).toMatch(/W, A, S and D/);
    expect(TWO_PLAYER_KIND.lead).toMatch(/arrow keys/);
    expect(TWO_PLAYER_KIND.lead).toMatch(/nothing is saved/);
  });

  it("leads to the two-player page on the chosen track", () => {
    expect(trackAddress("double", "nova-lap")).toBe("/double.html?track=nova-lap");
    const cards = trackCards(TRACKS, null, "double");
    expect(cards).toHaveLength(Object.keys(TRACKS).length);
    for (const card of cards) {
      expect(card.address).toBe(`/double.html?track=${card.shortName}`);
    }
  });

  it("still refuses a kind of race that does not exist", () => {
    expect(() => trackAddress("cup", "nova-lap")).toThrow();
    expect(() => trackAddress("toString", "nova-lap")).toThrow();
  });
});

describe("the two-player page, as the server sends it", () => {
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

  it("is there, with a picture and a name plate for each driver", async () => {
    const answer = await fetch(`${base}/double.html?track=nova-lap`);
    expect(answer.status).toBe(200);
    const body = await answer.text();
    for (const id of ["track-1", "track-2", "plate-1", "plate-2", "message-1", "message-2", "settings-card", "race-again"]) {
      expect(body, id).toContain(`id="${id}"`);
    }
    expect(body).toContain('src="/double.js"');
  });

  it("tells both drivers their keys, and that nothing is saved", async () => {
    const body = await (await fetch(`${base}/double.html`)).text();
    for (const key of ["W", "A", "S", "D", "↑", "←", "↓", "→"]) {
      expect(body).toContain(`<kbd>${key}</kbd>`);
    }
    expect(body).toMatch(/nothing\s+is saved/);
  });

  it("can be reached from the menu, which has a tile for it", async () => {
    const menu = await (await fetch(`${base}/`)).text();
    expect(menu).toMatch(/<a class="menu-choice" href="\/double.html">Two players<\/a>/);
    for (const address of ["/race.html", "/online.html", "/double.html"]) {
      const body = await (await fetch(`${base}${address}`)).text();
      expect(body, address).toContain('href="/">← Menu</a>');
    }
  });

  it("is sent with its script and the rules it needs", async () => {
    for (const address of ["/double.js", "/double-view.js", "/shared/two-player-race.js", "/game-settings-card.js", "/shared/game-settings.js"]) {
      const answer = await fetch(`${base}${address}`);
      expect(answer.status, address).toBe(200);
    }
  });
});
