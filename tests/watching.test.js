// Tests for what someone sees who arrives while a race is on
// (client/race-view.js), changed on 19 November 2026:
//   - the camera is on the kart that is in first place when they arrive
//   - a banner across the picture says, in big letters, that they are watching
//
// Before, the picture looked exactly as if they were driving, and only a
// small line under it said otherwise. The older tests of race-view.js are
// in race-view.test.js. No browser is needed here.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { kartToFollow, watchBanner, KEYS_LATER_TEXT, isWatching } from "../client/race-view.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

const read = (name) => readFileSync(new URL(`../client/${name}`, import.meta.url), "utf8");

/** A kart that has passed this many checkpoints, somewhere on the track. */
const kart = (id, passed, more = {}) => ({ id, passed, x: 300 + id, y: 300, finished: false, steps: 1000, ...more });

describe("the kart a watcher's camera is on", () => {
  it("is the one in first place when they arrive: the one that has passed the most checkpoints", () => {
    const karts = [kart(1, 2), kart(2, 5), kart(3, 4)];
    expect(kartToFollow(karts, TEST_OVAL, null).id).toBe(2);
  });

  it("is not simply the first in the list when all are on the same lap", () => {
    // All three are on lap 1 (lapsDone would be 0 for each). The old rule took kart 1.
    const karts = [kart(1, 0), kart(2, 2), kart(3, 1)];
    expect(kartToFollow(karts, TEST_OVAL, null).id).toBe(2);
  });

  it("stays with that kart when another one overtakes it, so the picture does not jump about", () => {
    const overtaken = [kart(1, 6), kart(2, 5), kart(3, 4)];
    expect(kartToFollow(overtaken, TEST_OVAL, 2).id).toBe(2);
  });

  it("moves to whoever leads among the karts still driving when its kart has finished", () => {
    const karts = [kart(1, 7), kart(2, 9, { finished: true }), kart(3, 8)];
    expect(kartToFollow(karts, TEST_OVAL, 2).id).toBe(3);
  });

  it("moves to the leader when its kart has left the race", () => {
    const karts = [kart(1, 3), kart(3, 4)];
    expect(kartToFollow(karts, TEST_OVAL, 2).id).toBe(3);
  });

  it("shows the winner when nobody is driving any more", () => {
    const karts = [kart(1, 9, { finished: true, steps: 2000 }), kart(2, 9, { finished: true, steps: 1800 })];
    expect(kartToFollow(karts, TEST_OVAL, null).id).toBe(2);
  });

  it("gives nothing when there are no karts, and does not break on a strange list", () => {
    expect(kartToFollow([], TEST_OVAL, null)).toBe(undefined);
    expect(kartToFollow(null, TEST_OVAL, 4)).toBe(undefined);
    expect(kartToFollow([null, "kart", kart(5, 1)], TEST_OVAL, null).id).toBe(5);
  });
});

describe("the banner for someone who is watching", () => {
  const racing = { phase: "racing", countdownSteps: 400, host: 1, watching: [7] };

  it("says in its title that a race is on and that they are watching", () => {
    const banner = watchBanner({ race: racing, myId: 7, watchedName: "PCP" });
    expect(banner.title).toBe("A race is on: you are watching");
  });

  it("says whose kart the camera is on, and that they join the next race", () => {
    const banner = watchBanner({ race: racing, myId: 7, watchedName: "PCP" });
    expect(banner.text).toBe("The camera is on PCP. A new race starts when this one is over, and you join it.");
  });

  it("leaves the name out when the kart has none", () => {
    for (const noName of [null, undefined, "", 42]) {
      const banner = watchBanner({ race: racing, myId: 7, watchedName: noName });
      expect(banner.text, String(noName)).toBe("A new race starts when this one is over, and you join it.");
    }
  });

  it("is also there during 3, 2, 1, for someone who arrived just then", () => {
    expect(watchBanner({ race: { ...racing, phase: "countdown" }, myId: 7 })).not.toBe(null);
  });

  it("answers a key press for a moment: the keys do nothing yet", () => {
    const banner = watchBanner({ race: racing, myId: 7, watchedName: "PCP", pressedKey: true });
    expect(banner.title).toBe("A race is on: you are watching");
    expect(banner.text).toBe(KEYS_LATER_TEXT);
    expect(KEYS_LATER_TEXT).toContain("next race");
  });

  it("is NOT shown to someone who is driving in the race", () => {
    expect(isWatching(racing, 1)).toBe(false);
    expect(watchBanner({ race: racing, myId: 1, watchedName: "PCP" })).toBe(null);
  });

  it("is NOT shown when no race is on: before the start, or once the race is over and the podium is up", () => {
    for (const phase of ["open", "finished"]) {
      expect(watchBanner({ race: { ...racing, phase }, myId: 7, watchedName: "PCP" }), phase).toBe(null);
    }
  });
});

describe("the banner on the online page", () => {
  const page = read("online.html");
  const style = read("style.css");

  it("is on the picture, hidden until it is needed, and read out by a screen reader", () => {
    expect(page).toMatch(/<div id="watch-banner" class="watch-banner" role="status" hidden>/);
    expect(page).toContain('id="watch-title"');
    expect(page).toContain('id="watch-text"');
    // Inside the part of the page that holds the picture, not in the lines under it.
    const screen = page.slice(page.indexOf('<div class="screen">'), page.indexOf('<p id="status"'));
    expect(screen).toContain('id="watch-banner"');
  });

  it("has big letters, and leaves the small map in the corner free", () => {
    const rule = (name) => style.slice(style.indexOf(`\n.${name} {`), style.indexOf("}", style.indexOf(`\n.${name} {`)));
    expect(rule("watch-title")).toMatch(/font-weight:\s*900/);
    expect(rule("watch-title")).toMatch(/text-transform:\s*uppercase/);
    expect(rule("watch-banner")).toMatch(/right:\s*22%/);
  });
});
