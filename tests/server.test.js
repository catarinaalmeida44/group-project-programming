// Tests for server/app.js
//
// These tests start a real copy of our server on this computer, send it
// real requests, and look at the answers. Each answer has a status number:
//   200 = here it is      400 = that address is broken
//   404 = not found       405 = that kind of request is not allowed

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { createApp } from "../server/app.js";

let app;
let port;

beforeAll(async () => {
  app = createApp();
  // Port 0 means "pick any free port", so the tests never clash with a
  // server that is already running on port 3000.
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  port = app.address().port;
});

afterAll(async () => {
  await new Promise((resolve) => app.close(resolve));
});

/**
 * Sends one request to the test server and gives back the answer.
 * The address is sent exactly as written. (The usual "fetch" tool would tidy
 * up an address such as "/../x" before sending it, and we want to test the
 * untidy ones.)
 */
function ask(address, method = "GET") {
  return new Promise((resolve, reject) => {
    const request = http.request(
      { host: "127.0.0.1", port, path: address, method, agent: false },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (piece) => (body += piece));
        response.on("end", () =>
          resolve({ status: response.statusCode, headers: response.headers, body }),
        );
      },
    );
    request.on("error", reject);
    request.end();
  });
}

describe("the server sends the page to the browser", () => {
  it("sends the hello page for the main address", async () => {
    const answer = await ask("/");
    expect(answer.status).toBe(200);
    expect(answer.headers["content-type"]).toContain("text/html");
    expect(answer.body).toContain("Nova SBE kart racer");
  });

  it("sends the same page when asked for index.html by name", async () => {
    const answer = await ask("/index.html");
    expect(answer.status).toBe(200);
    expect(answer.body).toContain("Nova SBE kart racer");
  });

  it("sends the style file, labelled as a style file", async () => {
    const answer = await ask("/style.css");
    expect(answer.status).toBe(200);
    expect(answer.headers["content-type"]).toContain("text/css");
  });

  it("ignores anything after a question mark in the address", async () => {
    const answer = await ask("/?from=a-link");
    expect(answer.status).toBe(200);
    expect(answer.body).toContain("Nova SBE kart racer");
  });

  it("answers a HEAD request with no content", async () => {
    const answer = await ask("/", "HEAD");
    expect(answer.status).toBe(200);
    expect(answer.body).toBe("");
  });

  it("tells the browser not to guess the kind of file", async () => {
    const answer = await ask("/");
    expect(answer.headers["x-content-type-options"]).toBe("nosniff");
  });
});

describe("the server sends the game rules to the browser", () => {
  it("sends a rules file from the shared folder, labelled as code", async () => {
    const answer = await ask("/shared/physics.js");
    expect(answer.status).toBe(200);
    expect(answer.headers["content-type"]).toContain("text/javascript");
    expect(answer.body).toContain("export function stepKart");
  });

  it("sends a file from a folder inside the shared folder", async () => {
    const answer = await ask("/shared/tracks/test-oval.js");
    expect(answer.status).toBe(200);
    expect(answer.body).toContain("TEST_OVAL");
  });

  it("sends the page's own code from the client folder", async () => {
    const answer = await ask("/main.js");
    expect(answer.status).toBe(200);
    expect(answer.headers["content-type"]).toContain("text/javascript");
  });
});

describe("the health check", () => {
  it("says the server is alive", async () => {
    const answer = await ask("/health");
    expect(answer.status).toBe(200);
    expect(answer.headers["content-type"]).toContain("application/json");
    expect(JSON.parse(answer.body)).toEqual({ status: "ok" });
  });
});

describe("the server refuses what it should not do", () => {
  it("says 'not found' for a page that does not exist", async () => {
    const answer = await ask("/no-such-page.html");
    expect(answer.status).toBe(404);
  });

  it("refuses requests that try to change something", async () => {
    for (const method of ["POST", "PUT", "DELETE"]) {
      const answer = await ask("/", method);
      expect(answer.status).toBe(405);
      expect(answer.headers["allow"]).toBe("GET, HEAD");
    }
  });

  it("does not send a kind of file that is not on its list", async () => {
    // client/README.md really exists, but ".md" is not on the list.
    const answer = await ask("/README.md");
    expect(answer.status).toBe(404);
    expect(answer.body).toBe("Page not found.");
  });

  it("does not send files from outside the client folder", async () => {
    // Every address below is a different way of writing "go up one folder".
    // server/app.js and package.json are real files that must stay private
    // to this route. ".js" and ".json" ARE on the list of file kinds, so
    // only the folder check can stop these.
    const sneakyAddresses = [
      "/../server/app.js",
      "/..%2Fserver%2Fapp.js",
      "/%2e%2e/server/app.js",
      "/..\\server\\app.js",
      "/subfolder/../../server/app.js",
      "/../package.json",
      "/..%2Fpackage.json",
    ];
    for (const address of sneakyAddresses) {
      const answer = await ask(address);
      expect(answer.status, address).toBe(404);
      expect(answer.body, address).toBe("Page not found.");
    }
  });

  it("does not send files from outside the shared folder through a /shared/ address", async () => {
    const sneakyAddresses = [
      "/shared/../server/app.js",
      "/shared/..%2Fserver%2Fapp.js",
      "/shared/%2e%2e/server/app.js",
      "/shared/tracks/../../server/app.js",
      "/shared/../package.json",
      "/shared/../tests/server.test.js",
    ];
    for (const address of sneakyAddresses) {
      const answer = await ask(address);
      expect(answer.status, address).toBe(404);
      expect(answer.body, address).toBe("Page not found.");
    }
  });

  it("does not send the notes or the folder itself from the shared folder", async () => {
    for (const address of ["/shared/README.md", "/shared/", "/shared", "/shared/tracks", "/shared/tracks/"]) {
      const answer = await ask(address);
      expect(answer.status, address).toBe(404);
    }
  });

  it("does not send the server's own code or the tests under any plain address", async () => {
    for (const address of ["/server/app.js", "/tests/server.test.js", "/package.json", "/render.yaml"]) {
      const answer = await ask(address);
      expect(answer.status, address).toBe(404);
    }
  });

  it("says 'not valid' for an address with a broken code in it", async () => {
    const answer = await ask("/%E0%A4%A");
    expect(answer.status).toBe(400);
  });

  it("says 'not valid' for an address with a hidden 'end of text' character", async () => {
    const answer = await ask("/index.html%00.png");
    expect(answer.status).toBe(400);
  });
});
