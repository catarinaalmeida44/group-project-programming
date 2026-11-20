// Tests for client/track-choice.js and shared/tracks/index.js: choosing the
// track of the single race page from its address.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp } from "../server/app.js";
import { chooseTrack, chooseTrackName } from "../client/track-choice.js";
import { TRACKS, DEFAULT_TRACK } from "../shared/tracks/index.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { CAMPUS_LOOP } from "../shared/tracks/campus-loop.js";
import { NOVA_LAP } from "../shared/tracks/nova-lap.js";

// Three tests in this file changed on 20 November 2026, when the team took
// the campus loop out of the game: the Nova lap replaced it. They said "has
// the test oval and the campus loop", "opens the campus loop with
// ?track=campus-loop" and, for an address with two tracks, expected the
// campus loop. They now say the same about the Nova lap, and two new tests
// check that the campus loop is really gone.
describe("the list of tracks", () => {
  it("has the test oval and the Nova lap, under their short names", () => {
    expect(TRACKS["test-oval"]).toBe(TEST_OVAL);
    expect(TRACKS["nova-lap"]).toBe(NOVA_LAP);
    expect(TRACKS[DEFAULT_TRACK]).toBe(TEST_OVAL);
  });

  it("has those two and no other: the campus loop is no longer a track of the game", () => {
    expect(Object.keys(TRACKS)).toEqual(["test-oval", "nova-lap"]);
    expect(TRACKS["campus-loop"]).toBe(undefined);
    expect(Object.values(TRACKS)).not.toContain(CAMPUS_LOOP);
  });

  it("gives every track its own name, because best times are kept by track name", () => {
    const names = Object.values(TRACKS).map((track) => track.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("cannot be changed by other code", () => {
    expect(Object.isFrozen(TRACKS)).toBe(true);
  });
});

describe("choosing the track from the address", () => {
  it("opens the Nova lap with ?track=nova-lap", () => {
    expect(chooseTrack("?track=nova-lap")).toBe(NOVA_LAP);
  });

  it("no longer opens the campus loop: its old address shows the test oval, like any track that does not exist", () => {
    expect(chooseTrack("?track=campus-loop")).toBe(TEST_OVAL);
    expect(chooseTrackName("?track=campus-loop")).toBe(DEFAULT_TRACK);
  });

  it("opens the test oval with ?track=test-oval", () => {
    expect(chooseTrack("?track=test-oval")).toBe(TEST_OVAL);
  });

  it("opens the test oval when the address chooses nothing", () => {
    expect(chooseTrack("")).toBe(TEST_OVAL);
    expect(chooseTrack("?")).toBe(TEST_OVAL);
    expect(chooseTrack("?view=above")).toBe(TEST_OVAL);
  });

  it("refuses a track that does not exist and opens the test oval instead", () => {
    for (const address of ["?track=", "?track=moon", "?track=Campus-Loop", "?track=campus-loop%20", "?track=../campus-loop"]) {
      expect(chooseTrack(address), address).toBe(TEST_OVAL);
    }
  });

  it("refuses names that every JavaScript object has, such as constructor or __proto__", () => {
    for (const address of ["?track=constructor", "?track=__proto__", "?track=toString", "?track=hasOwnProperty"]) {
      expect(chooseTrack(address), address).toBe(TEST_OVAL);
    }
  });

  it("uses the first choice when the address names two tracks", () => {
    expect(chooseTrack("?track=nova-lap&track=test-oval")).toBe(NOVA_LAP);
  });

  it("does not break on something that is not text", () => {
    for (const notText of [undefined, null, 42, {}, ["?track=campus-loop"]]) {
      expect(chooseTrack(notText)).toBe(TEST_OVAL);
    }
  });
});

describe("the race page with a chosen track, asked from a real copy of the server", () => {
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

  it("sends the race page for an address with a track choice, with a place for the track's name", async () => {
    const answer = await fetch(`${base}/race.html?track=campus-loop`);
    const body = await answer.text();
    expect(answer.status).toBe(200);
    expect(body).toContain('<span id="track-name">');
    expect(body).toContain('src="/main.js"');
  });

  it("sends the browser every file it needs to choose and draw the campus loop", async () => {
    for (const address of ["/track-choice.js", "/shared/tracks/index.js", "/shared/tracks/campus-loop.js"]) {
      const answer = await fetch(base + address);
      await answer.text();
      expect(answer.status, address).toBe(200);
    }
  });
});
