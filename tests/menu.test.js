// Tests for the main menu (client/index.html) and the pages it leads to.
//
// They start a real copy of our server, ask it for the pages, and read the
// page text. How the menu looks is checked by eye in a browser.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp } from "../server/app.js";

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

async function page(address) {
  const answer = await fetch(base + address);
  return { status: answer.status, body: await answer.text() };
}

/** The opening tag of the element with this id, e.g. '<button type="button" id="x" ...>'. */
function tagWithId(html, id) {
  const match = html.match(new RegExp(`<[^>]*id="${id}"[^>]*>`));
  return match ? match[0] : null;
}

describe("the main menu", () => {
  it("is the first page: the main address opens the menu, not the race", async () => {
    const { status, body } = await page("/");
    expect(status).toBe(200);
    expect(body).toContain('aria-label="Main menu"');
    expect(body).not.toContain("<canvas");
  });

  it("sends Single race to the race page and Online to the online page", async () => {
    const { body } = await page("/");
    expect(body).toMatch(/<a class="menu-choice" href="\/race.html">Single race<\/a>/);
    expect(body).toMatch(/<a class="menu-choice" href="\/online.html">Online<\/a>/);
  });

  it("shows the Cup, but it cannot be clicked yet, and says why", async () => {
    const { body } = await page("/");
    const cup = body.match(/<button[^>]*>Cup<\/button>/);
    expect(cup).not.toBeNull();
    expect(cup[0]).toContain("disabled");
    expect(body).toContain("Cup: coming soon");
  });

  it("has a Leaderboard button and a Settings button", async () => {
    const { body } = await page("/");
    expect(tagWithId(body, "open-leaderboard")).toContain("<button");
    expect(tagWithId(body, "open-settings")).toContain("<button");
  });

  it("loads its own code, and the server sends it", async () => {
    const { body } = await page("/");
    expect(body).toContain('src="/menu.js"');
    expect((await page("/menu.js")).status).toBe(200);
  });
});

describe("the pages the menu leads to", () => {
  it("the race page has the track and runs the race code", async () => {
    const { status, body } = await page("/race.html");
    expect(status).toBe(200);
    expect(body).toContain('<canvas id="track"');
    expect(body).toContain('src="/main.js"');
  });

  it("the race page and the online page both lead back to the menu", async () => {
    for (const address of ["/race.html", "/online.html"]) {
      const { body } = await page(address);
      expect(body).toContain('<a href="/">← Menu</a>');
    }
  });
});
