// Tests for the two locks that keep a visitor's text from ever running as
// code in someone else's browser:
//
//   1. The server tells the browser to run only scripts and styles that are
//      files on our own site (server/app.js, the "Content-Security-Policy").
//   2. Our pages are written so that they work under that rule, and our
//      browser code never turns text into HTML.
//
// The second half reads the files in the "client" folder as text. If one of
// these tests fails after a change, the page would look fine on a laptop
// with the rule switched off, and break online. That is why they exist.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import path from "node:path";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createApp } from "../server/app.js";

const CLIENT_FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "client");
const filesEndingIn = (ending) => readdirSync(CLIENT_FOLDER).filter((name) => name.endsWith(ending));
const read = (name) => readFileSync(path.join(CLIENT_FOLDER, name), "utf8");

describe("the rules the server hands the browser", () => {
  let app;
  let port;

  beforeAll(async () => {
    app = createApp();
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    port = app.address().port;
  });

  afterAll(async () => {
    await new Promise((resolve) => app.close(resolve));
  });

  /** Asks for an address and gives back the rule that came with the answer. "host" is the name the browser used for us. */
  function policyOf(address, host) {
    return new Promise((resolve, reject) => {
      const headers = host === undefined ? {} : { Host: host };
      const request = http.request({ host: "127.0.0.1", port, path: address, headers, agent: false }, (response) => {
        response.resume();
        response.on("end", () => resolve(response.headers["content-security-policy"]));
      });
      request.on("error", reject);
      request.end();
    });
  }

  it("come with every page, and with every other answer too", async () => {
    for (const address of ["/", "/race.html", "/online.html", "/style.css", "/no-such-page", "/health", "/api/me"]) {
      expect(await policyOf(address), address).toContain("default-src 'self'");
    }
  });

  it("allow nothing from inside a page and nothing from other sites", async () => {
    const policy = await policyOf("/");
    expect(policy).not.toContain("unsafe-inline");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toContain("*");
    expect(policy).not.toContain("http:");
    expect(policy).not.toContain("https:");
    const rules = policy.split("; ");
    expect(rules).toContain("object-src 'none'");
    expect(rules).toContain("base-uri 'none'");
    expect(rules).toContain("form-action 'self'");
    expect(rules).toContain("frame-ancestors 'none'"); // no other site may show our pages inside its own
  });

  it("allow the live connection for online play, to our own site only", async () => {
    const policy = await policyOf("/online.html", "novasbe-kart.example:8080");
    expect(policy.split("; ")).toContain(
      "connect-src 'self' ws://novasbe-kart.example:8080 wss://novasbe-kart.example:8080",
    );
  });

  it("do not let a strange name for our site write rules of its own", async () => {
    for (const host of ["evil.example; script-src *", "evil.example 'unsafe-inline'", "a b", "x".repeat(101)]) {
      const policy = await policyOf("/", host);
      expect(policy.split("; "), host).toContain("connect-src 'self'");
      expect(policy).not.toContain("script-src");
      expect(policy).not.toContain("unsafe-inline");
    }
  });

  // Added on 13 November 2026: two more rules that go out with every answer.

  /** Asks for an address and gives back all the headers of the answer. "more" are headers to send along. */
  function headersOf(address, more = {}) {
    return new Promise((resolve, reject) => {
      const request = http.request({ host: "127.0.0.1", port, path: address, headers: more, agent: false }, (response) => {
        response.resume();
        response.on("end", () => resolve(response.headers));
      });
      request.on("error", reject);
      request.end();
    });
  }

  it("tell the browser not to say to other sites which of our pages a visitor came from", async () => {
    for (const address of ["/", "/online.html", "/style.css", "/no-such-page", "/api/me"]) {
      expect((await headersOf(address))["referrer-policy"], address).toBe("same-origin");
    }
  });

  it("tell a browser that came over https to always use https, for half a year", async () => {
    for (const address of ["/", "/online.html", "/api/me"]) {
      const headers = await headersOf(address, { "X-Forwarded-Proto": "https" });
      expect(headers["strict-transport-security"], address).toBe("max-age=15552000");
    }
    // The hosting company may list more than one: the first is the visitor's own connection.
    const listed = await headersOf("/", { "X-Forwarded-Proto": "https, http" });
    expect(listed["strict-transport-security"]).toBe("max-age=15552000");
  });

  it("do NOT say so on a plain connection, such as a laptop's http://localhost", async () => {
    expect((await headersOf("/"))["strict-transport-security"]).toBe(undefined);
    for (const proto of ["http", "http, https", "HTTPS-ish", ""]) {
      const headers = await headersOf("/", { "X-Forwarded-Proto": proto });
      expect(headers["strict-transport-security"], proto).toBe(undefined);
    }
  });
});

describe("our pages work under those rules", () => {
  const pages = filesEndingIn(".html");

  it("there are pages to check", () => {
    expect(pages).toContain("index.html");
    expect(pages).toContain("race.html");
    expect(pages).toContain("online.html");
  });

  it("have no script written inside the page: every script is a file of ours", () => {
    for (const page of pages) {
      const scripts = read(page).match(/<script\b[^>]*>/gi) ?? [];
      for (const script of scripts) {
        expect(script, `${page}: ${script}`).toMatch(/\ssrc="\/[^"/][^"]*"/); // starts with one slash: our own site
      }
      expect(read(page), page).not.toMatch(/<script\b[^>]*>\s*[^\s<]/i); // nothing between <script> and </script>
    }
  });

  it("have no code in attributes, such as onclick", () => {
    for (const page of pages) {
      expect(read(page), page).not.toMatch(/\son[a-z]+\s*=/i);
      expect(read(page), page).not.toMatch(/javascript:/i);
    }
  });

  it("have no styles written inside the page", () => {
    for (const page of pages) {
      expect(read(page), page).not.toMatch(/<style\b/i);
      expect(read(page), page).not.toMatch(/\sstyle\s*=/i);
    }
  });

  it("load nothing from another website", () => {
    for (const name of [...pages, ...filesEndingIn(".css")]) {
      expect(read(name), name).not.toMatch(/(?:src|href|action)\s*=\s*"(?:https?:)?\/\//i);
      expect(read(name), name).not.toMatch(/url\(\s*["']?(?:https?:)?\/\//i);
      expect(read(name), name).not.toMatch(/@import/i);
    }
  });
});

describe("our browser code puts text on the screen as text, never as HTML", () => {
  it("never uses the tools that turn text into HTML or into code", () => {
    const forbidden = [/\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /\beval\s*\(/, /new Function\b/, /setAttribute\(\s*["']on/i];
    for (const name of filesEndingIn(".js")) {
      const code = read(name);
      for (const pattern of forbidden) {
        expect(pattern.test(code), `${name} uses ${pattern}`).toBe(false);
      }
    }
  });
});
