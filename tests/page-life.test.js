// Tests for client/page-life.js: the online page closes its connection when
// it is left, and reloads when the browser brings it back from its
// back/forward cache.
//
// There is no browser here, so the tests use stand-ins: a "page" that
// remembers what it listens for and can pretend the browser fired an event,
// and a "connection" that remembers whether it was closed.

import { describe, it, expect } from "vitest";
import { closeWhenLeft, LEFT_THE_PAGE } from "../client/page-life.js";

function fakePage() {
  const listeners = {};
  return {
    addEventListener(name, listener) {
      (listeners[name] ??= []).push(listener);
    },
    fire(name, event = {}) {
      for (const listener of listeners[name] ?? []) {
        listener(event);
      }
    },
  };
}

function fakeConnection() {
  const closes = [];
  return { closes, close: (code, reason) => closes.push({ code, reason }) };
}

function setUp() {
  const page = fakePage();
  const connection = fakeConnection();
  let reloads = 0;
  closeWhenLeft(page, connection, () => reloads++);
  return { page, connection, reloads: () => reloads };
}

describe("leaving the online page", () => {
  it("closes the connection when the page is left, saying it was on purpose", () => {
    const { page, connection } = setUp();
    page.fire("pagehide", { persisted: false });
    expect(connection.closes).toEqual([{ code: LEFT_THE_PAGE, reason: "left the page" }]);
    expect(LEFT_THE_PAGE).toBe(1000);
  });

  it("also closes it when the browser keeps the page in its back/forward cache", () => {
    const { page, connection } = setUp();
    page.fire("pagehide", { persisted: true });
    expect(connection.closes).toHaveLength(1);
  });

  it("does not close the connection while the player stays on the page", () => {
    const { page, connection } = setUp();
    page.fire("pageshow", { persisted: false }); // the first time the page appears
    page.fire("visibilitychange"); //               switching tabs is not leaving
    expect(connection.closes).toHaveLength(0);
  });
});

describe("coming back to the online page", () => {
  it("reloads a page brought back from the back/forward cache, so it joins again as one fresh player", () => {
    const { page, reloads } = setUp();
    page.fire("pagehide", { persisted: true });
    page.fire("pageshow", { persisted: true });
    expect(reloads()).toBe(1);
  });

  it("does not reload a page that was loaded normally", () => {
    const { page, reloads } = setUp();
    page.fire("pageshow", { persisted: false });
    page.fire("pageshow", {});
    expect(reloads()).toBe(0);
  });
});
