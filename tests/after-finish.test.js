// Tests for what a driver sees once they have finished while others are
// still driving (20 November 2026): their camera moves to one of the others,
// and a banner says their place and time and whose kart that is. The rule is
// in client/race-view.js and is used by the three race pages. Also here: in
// the two-player race, which driver has which keys and which half.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { kartToWatchAfterFinish, finishedBanner, WAITING_TEXT, SWITCH_TEXT } from "../client/race-view.js";
import { halfMessage, watchedName, DRIVERS } from "../client/double-view.js";
import { CAST } from "../shared/cast.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

const read = (name) => readFileSync(new URL(`../client/${name}`, import.meta.url), "utf8");

/** A kart that has passed this many checkpoints, somewhere on the track. */
const kart = (id, passed, more = {}) => ({ id, passed, x: 300 + id, y: 300, finished: false, steps: 1000, ...more });
const done = (id, steps = 2000) => kart(id, 99, { finished: true, steps });

describe("the kart a driver's camera moves to after their own finish", () => {
  it("is the person in last place among those still driving", () => {
    const karts = [done(1), kart(2, 7), kart(3, 4), kart(4, 5)];
    expect(kartToWatchAfterFinish(karts, TEST_OVAL, 1, null, []).id).toBe(3);
  });

  it("is a person rather than a computer kart, even when a computer kart is further behind", () => {
    const karts = [done(1), kart(2, 7), kart(5, 1), kart(6, 2)];
    expect(kartToWatchAfterFinish(karts, TEST_OVAL, 1, null, [5, 6]).id).toBe(2);
  });

  it("is a computer kart when no person is still driving: sometimes that is the only one there is", () => {
    const karts = [done(1), done(2, 2100), kart(5, 6), kart(6, 3)];
    expect(kartToWatchAfterFinish(karts, TEST_OVAL, 1, null, [5, 6]).id).toBe(6); // the computer kart in last place
  });

  it("is never the driver's own kart, and never one that has finished", () => {
    const karts = [done(1), done(2, 1900), kart(3, 8)];
    expect(kartToWatchAfterFinish(karts, TEST_OVAL, 1, null, []).id).toBe(3);
    expect(kartToWatchAfterFinish(karts, TEST_OVAL, 1, 2, []).id).toBe(3); // the camera was on kart 2, which has finished
  });

  it("stays with the kart it is on while that kart drives, even when it is no longer last", () => {
    const karts = [done(1), kart(2, 7), kart(3, 4)];
    expect(kartToWatchAfterFinish(karts, TEST_OVAL, 1, 2, []).id).toBe(2);
  });

  it("moves on by the same rule when the kart it was on has finished or left", () => {
    const karts = [done(1), done(3, 2500), kart(2, 7), kart(4, 5)];
    expect(kartToWatchAfterFinish(karts, TEST_OVAL, 1, 3, []).id).toBe(4);
    expect(kartToWatchAfterFinish([done(1), kart(2, 7)], TEST_OVAL, 1, 9, []).id).toBe(2);
  });

  it("stays with a computer kart it is on, once the people have all finished", () => {
    const karts = [done(1), done(2, 2100), kart(5, 6), kart(6, 3)];
    expect(kartToWatchAfterFinish(karts, TEST_OVAL, 1, 5, [5, 6]).id).toBe(5);
  });

  it("is nobody when no other kart is driving any more: the podium is about to come", () => {
    expect(kartToWatchAfterFinish([done(1), done(2, 2100)], TEST_OVAL, 1, null, [])).toBe(undefined);
    expect(kartToWatchAfterFinish([done(1)], TEST_OVAL, 1, null, [])).toBe(undefined);
  });

  it("does not break on an empty or strange list", () => {
    expect(kartToWatchAfterFinish([], TEST_OVAL, 1, null, [])).toBe(undefined);
    expect(kartToWatchAfterFinish(null, TEST_OVAL, 1, null, [])).toBe(undefined);
    expect(kartToWatchAfterFinish([null, "kart", kart(4, 2)], TEST_OVAL, 1, null, null).id).toBe(4);
  });

  it("works the same in a single race, where everyone else is a computer kart", () => {
    // The player is kart 0. Karts 1 to 5 are computer karts; two of them are home already.
    const karts = [done(0), done(1, 1800), done(2, 1900), kart(3, 9), kart(4, 5), kart(5, 7)];
    expect(kartToWatchAfterFinish(karts, TEST_OVAL, 0, null, [1, 2, 3, 4, 5]).id).toBe(4);
  });

  it("in a two-player race, is the other driver while they drive, and then a computer kart", () => {
    const racing = [done(0), kart(1, 6), kart(2, 3), kart(3, 8)];
    expect(kartToWatchAfterFinish(racing, TEST_OVAL, 0, null, [2, 3]).id).toBe(1);
    const both = [done(0), done(1, 2200), kart(2, 3), kart(3, 8)];
    expect(kartToWatchAfterFinish(both, TEST_OVAL, 0, 1, [2, 3]).id).toBe(2);
    expect(kartToWatchAfterFinish(both, TEST_OVAL, 1, null, [2, 3]).id).toBe(2);
  });
});

describe("the banner of a driver who has finished and is waiting", () => {
  it("says their place and time, that they are waiting, and whose kart they are watching", () => {
    const banner = finishedBanner({ place: 2, steps: 3600, watchedName: "Ana" });
    expect(banner.title).toBe("You finished 2nd, in 1:00.00!");
    expect(banner.text).toBe("Waiting until every player finishes. You are watching Ana.");
    expect(WAITING_TEXT).toBe("Waiting until every player finishes.");
  });

  it("writes the place as 1st, 2nd, 3rd, 4th", () => {
    const title = (place) => finishedBanner({ place, steps: 600 }).title;
    expect(title(1)).toMatch(/^You finished 1st,/);
    expect(title(3)).toMatch(/^You finished 3rd,/);
    expect(title(4)).toMatch(/^You finished 4th,/);
  });

  it("leaves the name out when the kart has none", () => {
    for (const watchedName of [null, undefined, ""]) {
      expect(finishedBanner({ place: 1, steps: 600, watchedName }).text).toBe(WAITING_TEXT);
    }
  });

  it("names a computer kart as one", () => {
    expect(finishedBanner({ place: 1, steps: 600, watchedName: "Dean (computer)" }).text).toMatch(/You are watching Dean \(computer\)\.$/);
  });

  it("says which keys move the camera only when there is another player to move it to", () => {
    expect(finishedBanner({ place: 1, steps: 600, watchedName: "Ana", canSwitch: true }).text).toBe(
      `Waiting until every player finishes. You are watching Ana. ${SWITCH_TEXT}`,
    );
    expect(finishedBanner({ place: 1, steps: 600, watchedName: "Ana" }).text).not.toMatch(/←/);
  });
});

describe("the two-player page, once a driver has finished", () => {
  it("leaves the middle of their half free while their camera is on someone else: the banner says it", () => {
    expect(halfMessage({ started: true, finished: true, place: 1, steps: 600, watching: true })).toEqual({ text: "", big: false });
  });

  it("still tells them their place in the middle when there is nobody left to watch", () => {
    expect(halfMessage({ started: true, finished: true, place: 1, steps: 600, watching: false }).text).toMatch(/You finished 1st/);
  });

  it("does not hide the countdown or a warning of a driver who has not finished", () => {
    expect(halfMessage({ started: true, label: "3", watching: true })).toEqual({ text: "3", big: true });
    expect(halfMessage({ started: true, warning: "Wrong way", watching: true }).text).toBe("Wrong way");
  });

  it("names the other driver by character and player, and a computer kart as one", () => {
    const dean = CAST.find((character) => character.id === "dean").name;
    expect(watchedName(1, "dean")).toBe(`${dean} (Player 2)`);
    expect(watchedName(0, "dean")).toBe(`${dean} (Player 1)`);
    expect(watchedName(3, "dean")).toBe(`${dean} (computer)`);
  });

  it("still has a name for a kart without a character", () => {
    expect(watchedName(0, null)).toBe("Player 1");
    expect(watchedName(1, "nobody")).toBe("Player 2");
    expect(watchedName(4, null)).toBe("A kart (computer)");
  });
});

describe("the pages have a place for the banner", () => {
  it("on the single race page and on the online page: one banner over the picture", () => {
    for (const page of ["race.html", "online.html"]) {
      const html = read(page);
      expect(html, page).toContain('id="watch-banner"');
      expect(html, page).toContain('id="watch-title"');
      expect(html, page).toContain('id="watch-text"');
    }
  });

  it("on the two-player page: one in each half", () => {
    const html = read("double.html");
    for (const player of [1, 2]) {
      expect(html).toContain(`id="banner-${player}"`);
      expect(html).toContain(`id="banner-title-${player}"`);
      expect(html).toContain(`id="banner-text-${player}"`);
    }
  });
});

describe("who has which keys and which half in a two-player race", () => {
  const html = read("double.html");
  const half = (player) => html.slice(html.indexOf(`id="half-${player}"`), html.indexOf("</section>", html.indexOf(`id="half-${player}"`)));

  it("gives player 1 the arrow keys and player 2 W, A, S and D, on the page too", () => {
    for (const key of ["↑", "←", "↓", "→"]) {
      expect(half(1)).toContain(`<kbd>${key}</kbd>`);
      expect(half(2)).not.toContain(`<kbd>${key}</kbd>`);
    }
    for (const key of ["W", "A", "S", "D"]) {
      expect(half(2)).toContain(`<kbd>${key}</kbd>`);
      expect(half(1)).not.toContain(`<kbd>${key}</kbd>`);
    }
  });

  it("puts each half on the side where its keys are: player 2 on the left, player 1 on the right", () => {
    expect(html.indexOf('id="half-2"')).toBeGreaterThan(-1);
    expect(html.indexOf('id="half-2"')).toBeLessThan(html.indexOf('id="half-1"')); // the left half comes first in the page
    expect(DRIVERS[1].side).toBe("left");
    expect(DRIVERS[0].side).toBe("right");
  });

  it("tells the menu the same: player 1 chooses first and drives with the arrows", () => {
    const menu = read("track-panel.js");
    expect(menu).toContain('lead: "Player 1 drives with the arrow keys"');
    expect(menu).toContain('lead: "Player 2 drives with W A S D"');
  });

  it("reads the arrows for player 1 and the letters for player 2", () => {
    expect(read("double.js")).toContain("const inputs = [keyboard.input(), keyboard.letterInput()];");
  });
});
