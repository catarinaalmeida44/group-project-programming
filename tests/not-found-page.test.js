// Tests for the page a person sees at an address that does not exist
// (client/not-found.html, sent by server/app.js).
//
// Before 19 November 2026 a wrong address gave three bare words on a white
// screen: "Page not found." Now a browser gets a page of the game with a
// button back to the menu. Everything that is not a person looking at a
// browser (a page of ours asking for a script, a test, another program)
// still gets the short plain answer, and nothing that was private before
// has become readable. Like server.test.js, these tests start a real copy
// of the server and send it real requests.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { readFileSync } from "node:fs";
import { createApp } from "../server/app.js";

let app;
let port;

beforeAll(async () => {
  app = createApp();
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve)); // port 0: any free one
  port = app.address().port;
});

afterAll(async () => {
  await new Promise((resolve) => app.close(resolve));
});

/** What a browser says it accepts when a person opens an address. */
const AS_A_BROWSER = { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" };

/** Sends one request, with the address exactly as written (see server.test.js). */
function ask(address, headers = {}, method = "GET") {
  return new Promise((resolve, reject) => {
    const request = http.request({ host: "127.0.0.1", port, path: address, method, headers, agent: false }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (piece) => (body += piece));
      response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    request.on("error", reject);
    request.end();
  });
}

describe("a wrong address, opened by a person in a browser", () => {
  it("gets a page of the game, still marked 'not found'", async () => {
    const answer = await ask("/no-such-page", AS_A_BROWSER);
    expect(answer.status).toBe(404);
    expect(answer.headers["content-type"]).toContain("text/html");
    expect(answer.body).toContain("Nova SBE kart racer");
    expect(answer.body).toContain("There is no page at this address");
  });

  it("offers a way back to the menu", async () => {
    const answer = await ask("/races/today.html", AS_A_BROWSER);
    expect(answer.status).toBe(404);
    expect(answer.body).toMatch(/<a class="button button-primary" href="\/">Back to the menu<\/a>/);
  });

  it("comes with the same safety rules as every other page", async () => {
    const answer = await ask("/no-such-page", AS_A_BROWSER);
    expect(answer.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(answer.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("never shows the address that was asked for, so nobody can put words of their own on our page", async () => {
    const answer = await ask("/%3Cscript%3Ealert(1)%3C/script%3E", AS_A_BROWSER);
    expect(answer.status).toBe(404);
    expect(answer.body).not.toContain("alert(1)");
    expect(answer.body).toBe(readFileSync(new URL("../client/not-found.html", import.meta.url), "utf8"));
  });

  it("still keeps private files private: the page says 'not found', and nothing of the file", async () => {
    for (const address of ["/../server/app.js", "/..%2Fpackage.json", "/shared/../server/app.js", "/README.md", "/server/app.js"]) {
      const answer = await ask(address, AS_A_BROWSER);
      expect(answer.status, address).toBe(404);
      expect(answer.body, address).toContain("There is no page at this address");
      expect(answer.body, address).not.toContain("createApp");
      expect(answer.body, address).not.toContain('"dependencies"');
    }
  });

  it("answers a question for the headers only (HEAD) with the same number", async () => {
    const answer = await ask("/no-such-page", AS_A_BROWSER, "HEAD");
    expect(answer.status).toBe(404);
  });
});

describe("a wrong address, asked for by anything else", () => {
  it("gets the short plain answer, as before", async () => {
    for (const headers of [{}, { Accept: "*/*" }, { Accept: "application/json" }, { Accept: "text/javascript" }]) {
      const answer = await ask("/no-such-file.js", headers);
      expect(answer.status, JSON.stringify(headers)).toBe(404);
      expect(answer.headers["content-type"], JSON.stringify(headers)).toContain("text/plain");
      expect(answer.body, JSON.stringify(headers)).toBe("Page not found.");
    }
  });
});

describe("the 'not found' page itself", () => {
  const page = readFileSync(new URL("../client/not-found.html", import.meta.url), "utf8");

  it("can also be opened by its own name", async () => {
    const answer = await ask("/not-found.html");
    expect(answer.status).toBe(200);
    expect(answer.body).toBe(page);
  });

  it("needs no code: it is words, our own style file, and a link to the menu", () => {
    expect(page).not.toMatch(/<script/i);
    expect(page).toContain('<link rel="stylesheet" href="/style.css">');
    expect(page).toContain('href="/"');
  });

  it("uses looks that the style file really has", () => {
    const style = readFileSync(new URL("../client/style.css", import.meta.url), "utf8");
    for (const name of ["lost-page", "link-card", "link-title", "link-text", "wake-road", "wake-kart", "link-actions"]) {
      expect(page, name).toContain(name);
      expect(style, name).toContain(`.${name}`);
    }
  });
});
