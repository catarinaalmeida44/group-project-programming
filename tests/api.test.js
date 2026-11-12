// Tests for server/api.js: the addresses a page uses for accounts and the
// shared leaderboard.
//
// They start a real copy of our server on this computer and send it real
// requests, like a browser would. Behind the server sits the pretend store
// kept in memory, so no database is needed. Passwords are scrambled with a
// quick pretend scrambler, except in one test at the end that uses the real
// one all the way through.
//
// The status numbers that appear below:
//   200 fine          201 made               400 your request is wrong
//   401 sign in first 403 not allowed        404 no such address
//   405 wrong kind of request                409 clashes with something
//   413 too long      415 wrong format       429 slow down
//   503 not available right now

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import http from "node:http";
import { createApp } from "../server/app.js";
import { createAccounts, WRONG_PASSWORDS_ALLOWED, SESSION_DAYS } from "../server/accounts.js";
import {
  SESSION_COOKIE,
  BODY_LIMIT_BYTES,
  TRIES_PER_MINUTE,
  PASSWORD_WORK_PER_MINUTE,
} from "../server/api.js";
import { createAccountApi } from "../client/account-api.js";
import { createMemoryStore } from "./memory-store.js";

const MINUTE = 60 * 1000;

let app;
let port;
let store;
let accounts;
let time; // what the pretend clock says, in milliseconds

const quickPasswords = {
  hash: async (password) => `scrambled(${password})`,
  matches: async (password, stored) => stored === `scrambled(${password})`,
  pretend: async () => {},
};

/**
 * Starts a server.
 *   withAccounts   false gives a server that runs without a database
 *   realPasswords  true uses the real, slow password scrambler
 */
async function startServer({ withAccounts = true, realPasswords = false } = {}) {
  store = createMemoryStore();
  time = 1_800_000_000_000;
  const options = realPasswords ? { now: () => time } : { now: () => time, passwords: quickPasswords };
  accounts = withAccounts ? createAccounts(store, options) : null;
  app = createApp({ accounts, now: () => time });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  port = app.address().port;
}

beforeEach(() => startServer());

afterEach(async () => {
  vi.restoreAllMocks();
  await new Promise((resolve) => app.close(resolve));
});

/**
 * Sends one request and gives back { status, headers, body, json, cookie }.
 *   body     what to send. An object is sent as JSON, a text exactly as it is
 *   cookie   the "Cookie" line to send, as a browser would
 *   headers  any other lines to send
 * "json" is the answer read as JSON, or null if it is not JSON.
 * "cookie" is the ticket cookie the answer sets, ready to send back, or null.
 */
function ask(method, address, { body, cookie, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const text = body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body);
    const allHeaders = { ...headers };
    if (text !== undefined && allHeaders["Content-Type"] === undefined) {
      allHeaders["Content-Type"] = "application/json";
    }
    if (cookie !== undefined) {
      allHeaders.Cookie = cookie;
    }
    const request = http.request({ host: "127.0.0.1", port, path: address, method, headers: allHeaders, agent: false }, (response) => {
      let received = "";
      response.setEncoding("utf8");
      response.on("data", (piece) => (received += piece));
      response.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(received);
        } catch {
          // not JSON: leave it as null
        }
        const setCookie = response.headers["set-cookie"]?.[0] ?? null;
        resolve({
          status: response.statusCode,
          headers: response.headers,
          body: received,
          json,
          setCookie,
          cookie: setCookie === null ? null : setCookie.split(";")[0],
        });
      });
    });
    request.on("error", reject);
    request.end(text);
  });
}

/** Makes an account through the server and gives back the cookie that proves the sign-in. */
async function signUp(username = "Ana", password = "12345678") {
  const answer = await ask("POST", "/api/signup", { body: { username, password } });
  expect(answer.status, answer.body).toBe(201);
  return answer.cookie;
}

describe("making an account", () => {
  it("makes the account, signs the player in and says who they are", async () => {
    const answer = await ask("POST", "/api/signup", { body: { username: "Ana", password: "12345678" } });
    expect(answer.status).toBe(201);
    expect(answer.json).toEqual({ ok: true, username: "Ana" });
    expect(answer.cookie).toMatch(new RegExp(`^${SESSION_COOKIE}=[A-Za-z0-9_-]{43}$`));

    const me = await ask("GET", "/api/me", { cookie: answer.cookie });
    expect(me.json).toEqual({ ok: true, signedIn: true, username: "Ana" });
  });

  it("refuses a user name that breaks the rules, and makes nothing", async () => {
    for (const username of ["ab", "has space", "<script>", "x".repeat(17), "", 42, null, ["Ana"], { name: "Ana" }]) {
      const answer = await ask("POST", "/api/signup", { body: { username, password: "12345678" } });
      expect(answer.status, JSON.stringify(username)).toBe(400);
      expect(answer.json.code).toBe("invalid_username");
      expect(answer.cookie).toBe(null);
    }
    expect(await store.findPlayerByKey("ab")).toBe(null);
  });

  it("refuses a password that breaks the rules", async () => {
    for (const password of ["1234567", "", "x".repeat(201), 12345678, null, undefined]) {
      const answer = await ask("POST", "/api/signup", { body: { username: "Ana", password } });
      expect(answer.status, JSON.stringify(password)).toBe(400);
      expect(answer.json.code).toBe("invalid_password");
    }
    expect(await store.findPlayerByKey("ana")).toBe(null);
  });

  it("refuses a name that is taken, also in other capital letters", async () => {
    await signUp("Ana");
    const answer = await ask("POST", "/api/signup", { body: { username: "ANA", password: "another-password" } });
    expect(answer.status).toBe(409);
    expect(answer.json.code).toBe("username_taken");
    expect(answer.cookie).toBe(null);
  });

  it("never sends a password or its scrambled form back", async () => {
    const answer = await ask("POST", "/api/signup", { body: { username: "Ana", password: "my-secret-password" } });
    expect(answer.body).not.toContain("my-secret-password");
    expect(answer.body).not.toContain("scrambled");
    expect(answer.setCookie).not.toContain("my-secret-password");
  });
});

describe("the cookie that keeps a player signed in", () => {
  it("cannot be read by the page's code, stays on our site and lasts seven days", async () => {
    const answer = await ask("POST", "/api/signup", { body: { username: "Ana", password: "12345678" } });
    const parts = answer.setCookie.split("; ");
    expect(parts).toContain("HttpOnly");
    expect(parts).toContain("SameSite=Lax");
    expect(parts).toContain("Path=/");
    expect(parts).toContain(`Max-Age=${SESSION_DAYS * 24 * 60 * 60}`);
  });

  it("is marked secure when the visitor came over a secure connection, and only then", async () => {
    const plain = await ask("POST", "/api/signup", { body: { username: "Ana", password: "12345678" } });
    expect(plain.setCookie).not.toContain("Secure");
    // Online, Render passes requests on to us and says in this line how the visitor reached it.
    const secure = await ask("POST", "/api/signup", {
      body: { username: "Rui", password: "12345678" },
      headers: { "X-Forwarded-Proto": "https" },
    });
    expect(secure.setCookie.split("; ")).toContain("Secure");
  });

  it("is kept on the server only in scrambled form", async () => {
    const cookie = await signUp("Ana");
    const ticket = cookie.split("=")[1];
    expect(await store.findSession(ticket)).toBe(null); // the ticket itself is not what is stored
    expect(store.countSessions()).toBe(1);
  });

  it("stops working after seven days", async () => {
    const cookie = await signUp("Ana");
    time += SESSION_DAYS * 24 * 60 * MINUTE - 1000;
    expect((await ask("GET", "/api/me", { cookie })).json.signedIn).toBe(true);
    time += 2000;
    expect((await ask("GET", "/api/me", { cookie })).json).toEqual({ ok: true, signedIn: false });
  });
});

describe("who is signed in", () => {
  it("says nobody when there is no cookie", async () => {
    const answer = await ask("GET", "/api/me");
    expect(answer.status).toBe(200);
    expect(answer.json).toEqual({ ok: true, signedIn: false });
  });

  it("says nobody for a made-up, damaged or oversized cookie", async () => {
    const real = await signUp("Ana");
    const realTicket = real.split("=")[1];
    const tries = [
      `${SESSION_COOKIE}=`,
      `${SESSION_COOKIE}=${"A".repeat(43)}`,
      `${SESSION_COOKIE}=${realTicket.slice(0, -1)}`, // one character short
      `${SESSION_COOKIE}=${realTicket}x`,
      `${SESSION_COOKIE}=' OR '1'='1`,
      `${SESSION_COOKIE}=${"A".repeat(5000)}`,
      `other=${realTicket}`, // the right ticket under the wrong name
    ];
    for (const cookie of tries) {
      const answer = await ask("GET", "/api/me", { cookie });
      expect(answer.json, cookie.slice(0, 60)).toEqual({ ok: true, signedIn: false });
    }
  });

  it("finds the ticket among other cookies", async () => {
    const cookie = await signUp("Ana");
    const answer = await ask("GET", "/api/me", { cookie: `theme=dark; ${cookie}; other=1` });
    expect(answer.json.username).toBe("Ana");
  });

  it("tells the browser never to keep the answer", async () => {
    const answer = await ask("GET", "/api/me");
    expect(answer.headers["cache-control"]).toBe("no-store");
    expect(answer.headers["content-type"]).toContain("application/json");
    expect(answer.headers["x-content-type-options"]).toBe("nosniff");
  });
});

describe("signing in", () => {
  beforeEach(async () => {
    await signUp("Ana", "12345678");
  });

  it("signs in with the right password, whatever capitals the name is typed in", async () => {
    const answer = await ask("POST", "/api/login", { body: { username: "aNA", password: "12345678" } });
    expect(answer.status).toBe(200);
    expect(answer.json).toEqual({ ok: true, username: "Ana" }); // the name as it was chosen
    expect((await ask("GET", "/api/me", { cookie: answer.cookie })).json.username).toBe("Ana");
  });

  it("gives a fresh ticket at every sign-in", async () => {
    const first = await ask("POST", "/api/login", { body: { username: "Ana", password: "12345678" } });
    const second = await ask("POST", "/api/login", { body: { username: "Ana", password: "12345678" } });
    expect(first.cookie).not.toBe(second.cookie);
  });

  it("ends the ticket the browser already held when someone signs in on it", async () => {
    const old = (await ask("POST", "/api/login", { body: { username: "Ana", password: "12345678" } })).cookie;
    const fresh = await ask("POST", "/api/login", { body: { username: "Ana", password: "12345678" }, cookie: old });
    expect((await ask("GET", "/api/me", { cookie: old })).json.signedIn).toBe(false);
    expect((await ask("GET", "/api/me", { cookie: fresh.cookie })).json.signedIn).toBe(true);
  });

  it("gives exactly the same refusal for a wrong password and for a name nobody has", async () => {
    const wrongPassword = await ask("POST", "/api/login", { body: { username: "Ana", password: "wrong-password" } });
    const nobody = await ask("POST", "/api/login", { body: { username: "Nobody", password: "wrong-password" } });
    expect(wrongPassword.status).toBe(401);
    expect(nobody.status).toBe(401);
    expect(wrongPassword.json).toEqual(nobody.json);
    expect(wrongPassword.json.code).toBe("wrong_login");
    expect(wrongPassword.cookie).toBe(null);
    expect(nobody.cookie).toBe(null);
  });

  it("refuses values that are not text, without breaking", async () => {
    for (const body of [{}, { username: "Ana" }, { username: { $ne: null }, password: { $ne: null } }, { username: ["Ana"], password: ["12345678"] }]) {
      const answer = await ask("POST", "/api/login", { body });
      expect(answer.status, JSON.stringify(body)).toBe(401);
      expect(answer.json.code).toBe("wrong_login");
    }
  });

  it("treats a name that looks like a database command as just a wrong name", async () => {
    const answer = await ask("POST", "/api/login", { body: { username: "' OR '1'='1", password: "' OR '1'='1" } });
    expect(answer.status).toBe(401);
    expect(answer.cookie).toBe(null);
  });

  it("locks the account after too many wrong passwords, and then even the right one is refused", async () => {
    let answer;
    for (let attempt = 0; attempt < WRONG_PASSWORDS_ALLOWED; attempt++) {
      answer = await ask("POST", "/api/login", { body: { username: "Ana", password: "wrong-password" } });
    }
    expect(answer.status).toBe(429);
    expect(answer.json.code).toBe("locked");

    const right = await ask("POST", "/api/login", { body: { username: "Ana", password: "12345678" } });
    expect(right.status).toBe(429);
    expect(right.cookie).toBe(null);

    time += 11 * MINUTE;
    const later = await ask("POST", "/api/login", { body: { username: "Ana", password: "12345678" } });
    expect(later.status).toBe(200);
  });
});

describe("signing out", () => {
  it("ends the ticket on the server and tells the browser to forget it", async () => {
    const cookie = await signUp("Ana");
    const answer = await ask("POST", "/api/logout", { body: {}, cookie });
    expect(answer.status).toBe(200);
    expect(answer.setCookie).toContain(`${SESSION_COOKIE}=;`);
    expect(answer.setCookie).toContain("Max-Age=0");
    // Someone who copied the old ticket cannot use it any more.
    expect((await ask("GET", "/api/me", { cookie })).json.signedIn).toBe(false);
    expect(store.countSessions()).toBe(0);
  });

  it("is fine when nobody was signed in", async () => {
    const answer = await ask("POST", "/api/logout", { body: {} });
    expect(answer.status).toBe(200);
    expect(answer.json).toEqual({ ok: true });
  });

  it("signs out only that browser", async () => {
    const laptop = await signUp("Ana");
    const phone = (await ask("POST", "/api/login", { body: { username: "Ana", password: "12345678" } })).cookie;
    await ask("POST", "/api/logout", { body: {}, cookie: laptop });
    expect((await ask("GET", "/api/me", { cookie: phone })).json.signedIn).toBe(true);
  });
});

describe("deleting an account", () => {
  it("deletes the signed-in player's account, their sessions and their results", async () => {
    const cookie = await signUp("Ana");
    const ana = await store.findPlayerByKey("ana");
    await accounts.saveResult({ playerId: ana.id, track: "test-oval", raceSteps: 1500, bestLapSteps: 480, position: 1 });

    const answer = await ask("POST", "/api/delete-account", { body: { password: "12345678" }, cookie });
    expect(answer.status).toBe(200);
    expect(answer.setCookie).toContain("Max-Age=0");
    expect(await store.findPlayerByKey("ana")).toBe(null);
    expect(store.countSessions()).toBe(0);
    expect(store.countResults()).toBe(0);
    expect((await ask("GET", "/api/me", { cookie })).json.signedIn).toBe(false);
    expect((await ask("GET", "/api/leaderboard?track=test-oval")).json.races).toEqual([]);
  });

  it("refuses when nobody is signed in", async () => {
    await signUp("Ana");
    const answer = await ask("POST", "/api/delete-account", { body: { password: "12345678" } });
    expect(answer.status).toBe(401);
    expect(answer.json.code).toBe("not_signed_in");
    expect(await store.findPlayerByKey("ana")).not.toBe(null);
  });

  it("refuses with a wrong or missing password", async () => {
    const cookie = await signUp("Ana");
    for (const body of [{ password: "wrong-password" }, {}, { password: null }, { password: ["12345678"] }]) {
      const answer = await ask("POST", "/api/delete-account", { body, cookie });
      expect(answer.status, JSON.stringify(body)).toBe(401);
      expect(answer.json.code).toBe("wrong_login");
    }
    expect(await store.findPlayerByKey("ana")).not.toBe(null);
  });

  it("can only ever delete the account the ticket belongs to", async () => {
    const anaCookie = await signUp("Ana", "12345678");
    await signUp("Rui", "rui-password");
    const rui = await store.findPlayerByKey("rui");
    // Ana is signed in and names Rui in every way she can think of, with Rui's real password.
    const answer = await ask("POST", "/api/delete-account", {
      body: { password: "rui-password", username: "Rui", playerId: rui.id, id: rui.id },
      cookie: anaCookie,
    });
    expect(answer.status).toBe(401); // it is not ANA's password
    expect(await store.findPlayerByKey("rui")).not.toBe(null);
    expect(await store.findPlayerByKey("ana")).not.toBe(null);
  });
});

describe("the shared leaderboard", () => {
  let anaCookie;

  beforeEach(async () => {
    anaCookie = await signUp("Ana");
    await signUp("Rui");
    const ana = await store.findPlayerByKey("ana");
    const rui = await store.findPlayerByKey("rui");
    await accounts.saveResult({ playerId: ana.id, track: "campus-loop", raceSteps: 1800, bestLapSteps: 580, position: 2 });
    await accounts.saveResult({ playerId: rui.id, track: "campus-loop", raceSteps: 1700, bestLapSteps: 600, position: 1 });
  });

  it("lists the fastest races and laps of a track, for anyone", async () => {
    const answer = await ask("GET", "/api/leaderboard?track=campus-loop");
    expect(answer.status).toBe(200);
    expect(answer.json).toEqual({
      ok: true,
      track: "campus-loop",
      races: [
        { rank: 1, username: "Rui", steps: 1700 },
        { rank: 2, username: "Ana", steps: 1800 },
      ],
      laps: [
        { rank: 1, username: "Ana", steps: 580 },
        { rank: 2, username: "Rui", steps: 600 },
      ],
      mine: null,
    });
  });

  it("adds the signed-in player's own best and rank", async () => {
    const answer = await ask("GET", "/api/leaderboard?track=campus-loop", { cookie: anaCookie });
    expect(answer.json.mine).toEqual({ raceRank: 2, raceSteps: 1800, lapRank: 1, lapSteps: 580 });
  });

  it("is empty for a track nobody has raced on", async () => {
    const answer = await ask("GET", "/api/leaderboard?track=test-oval", { cookie: anaCookie });
    expect(answer.json).toEqual({ ok: true, track: "test-oval", races: [], laps: [], mine: null });
  });

  it("shows nothing about a player but their name and times", async () => {
    const answer = await ask("GET", "/api/leaderboard?track=campus-loop", { cookie: anaCookie });
    expect(answer.body).not.toContain("scrambled");
    expect(answer.body).not.toContain("password");
    for (const row of [...answer.json.races, ...answer.json.laps]) {
      expect(Object.keys(row).sort()).toEqual(["rank", "steps", "username"]);
    }
  });

  it("refuses a track that does not exist, or no track at all", async () => {
    for (const address of [
      "/api/leaderboard",
      "/api/leaderboard?track=",
      "/api/leaderboard?track=no-such-track",
      "/api/leaderboard?track=__proto__",
      "/api/leaderboard?track=constructor",
      "/api/leaderboard?track=campus-loop'%20OR%201=1",
    ]) {
      const answer = await ask("GET", address);
      expect(answer.status, address).toBe(400);
      expect(answer.json.code).toBe("unknown_track");
    }
  });

  it("has no address through which a browser could send in a result", async () => {
    for (const address of ["/api/leaderboard", "/api/leaderboard?track=campus-loop", "/api/results", "/api/result", "/api/save"]) {
      const answer = await ask("POST", address, {
        body: { track: "campus-loop", raceSteps: 1, bestLapSteps: 1, position: 1, username: "Ana" },
        cookie: anaCookie,
      });
      expect([404, 405], address).toContain(answer.status);
    }
    expect(store.countResults()).toBe(2); // still only the two from above
    const board = await ask("GET", "/api/leaderboard?track=campus-loop");
    expect(board.json.races[0]).toEqual({ rank: 1, username: "Rui", steps: 1700 });
  });
});

describe("requests that are refused before the rules are even asked", () => {
  it("refuses addresses that do not exist", async () => {
    for (const address of ["/api/", "/api/nothing", "/api/me/", "/api/ME", "/api/signup/extra", "/api/__proto__", "/api/toString"]) {
      const answer = await ask("GET", address);
      expect(answer.status, address).toBe(404);
      expect(answer.json.ok).toBe(false);
    }
  });

  it("refuses the wrong kind of request for an address, and says which kind it takes", async () => {
    const tries = [
      ["GET", "/api/signup", "POST"],
      ["GET", "/api/login", "POST"],
      ["GET", "/api/logout", "POST"],
      ["GET", "/api/delete-account", "POST"],
      ["DELETE", "/api/delete-account", "POST"],
      ["POST", "/api/me", "GET"],
      ["PUT", "/api/me", "GET"],
      ["DELETE", "/api/leaderboard?track=test-oval", "GET"],
    ];
    for (const [method, address, allowed] of tries) {
      const answer = await ask(method, address, method === "GET" ? {} : { body: {} });
      expect(answer.status, `${method} ${address}`).toBe(405);
      expect(answer.headers.allow).toBe(allowed);
    }
  });

  it("signing out with a link (a GET) does nothing", async () => {
    const cookie = await signUp("Ana");
    await ask("GET", "/api/logout", { cookie });
    expect((await ask("GET", "/api/me", { cookie })).json.signedIn).toBe(true);
  });

  it("refuses a POST that was started by a page on another website", async () => {
    const cookie = await signUp("Ana");
    const foreign = [
      "https://evil.example",
      `http://127.0.0.1:${port + 1}`, //    our address, another port
      `http://evil.example:${port}`,
      `http://127.0.0.1:${port}.evil.example`,
      "null", //                             what a browser sends from a sandboxed page
      "not an address",
    ];
    for (const origin of foreign) {
      for (const [address, body] of [
        ["/api/logout", {}],
        ["/api/delete-account", { password: "12345678" }],
        ["/api/login", { username: "Ana", password: "12345678" }],
        ["/api/signup", { username: "Eve", password: "12345678" }],
      ]) {
        const answer = await ask("POST", address, { body, cookie, headers: { Origin: origin } });
        expect(answer.status, `${origin} ${address}`).toBe(403);
        expect(answer.cookie).toBe(null);
      }
    }
    // Nothing happened: Ana is still signed in, still exists, and Eve was not made.
    expect((await ask("GET", "/api/me", { cookie })).json.username).toBe("Ana");
    expect(await store.findPlayerByKey("eve")).toBe(null);
  });

  it("accepts a POST from our own page", async () => {
    const answer = await ask("POST", "/api/signup", {
      body: { username: "Ana", password: "12345678" },
      headers: { Origin: `http://127.0.0.1:${port}` },
    });
    expect(answer.status).toBe(201);
  });

  it("refuses a POST that is not labelled as JSON, the way a form on another site would send it", async () => {
    for (const type of ["application/x-www-form-urlencoded", "text/plain", "multipart/form-data", ""]) {
      const answer = await ask("POST", "/api/signup", {
        body: JSON.stringify({ username: "Ana", password: "12345678" }),
        headers: { "Content-Type": type },
      });
      expect(answer.status, type).toBe(415);
    }
    expect(await store.findPlayerByKey("ana")).toBe(null);
  });

  it("refuses a message that is not one JSON object", async () => {
    for (const body of ["", "{", "not json", "null", "[]", '"text"', "42", '[{"username":"Ana","password":"12345678"}]']) {
      const answer = await ask("POST", "/api/signup", { body, headers: { "Content-Type": "application/json" } });
      expect(answer.status, body).toBe(400);
      expect(answer.json.code).toBe("bad_request");
    }
    expect(await store.findPlayerByKey("ana")).toBe(null);
  });

  it("refuses a message that is too long, without reading it into the rules", async () => {
    const answer = await ask("POST", "/api/signup", {
      body: { username: "Ana", password: "12345678", padding: "x".repeat(BODY_LIMIT_BYTES) },
    });
    expect(answer.status).toBe(413);
    expect(await store.findPlayerByKey("ana")).toBe(null);
  });

  it("is not fooled by a message that tries to change how objects work", async () => {
    const answer = await ask("POST", "/api/signup", {
      body: '{"__proto__":{"username":"Ana","password":"12345678"},"constructor":{"prototype":{"x":1}}}',
      headers: { "Content-Type": "application/json" },
    });
    expect(answer.status).toBe(400);
    expect({}.x).toBe(undefined);
    expect(await store.findPlayerByKey("ana")).toBe(null);
  });
});

describe("too many tries", () => {
  it("refuses more sign-ups from one computer than a classroom would make in a minute, then allows them again", async () => {
    for (let attempt = 0; attempt < TRIES_PER_MINUTE["/api/signup"]; attempt++) {
      const answer = await ask("POST", "/api/signup", { body: { username: "no", password: "12345678" } });
      expect(answer.status).toBe(400); // a name that breaks the rules, but it counts as a try
    }
    const refused = await ask("POST", "/api/signup", { body: { username: "Ana", password: "12345678" } });
    expect(refused.status).toBe(429);
    expect(refused.json.code).toBe("too_many_attempts");
    expect(refused.headers["retry-after"]).toBe("60");
    expect(await store.findPlayerByKey("ana")).toBe(null);

    time += MINUTE + 1;
    const later = await ask("POST", "/api/signup", { body: { username: "Ana", password: "12345678" } });
    expect(later.status).toBe(201);
  });

  it("counts each computer by itself", async () => {
    // Online, Render passes requests on to us and writes the visitor's address in this line.
    const from = (computer) => ({ "X-Forwarded-For": computer });
    for (let attempt = 0; attempt < TRIES_PER_MINUTE["/api/login"]; attempt++) {
      await ask("POST", "/api/login", { body: { username: "Nobody", password: "wrong-password" }, headers: from("203.0.113.5") });
    }
    const sameComputer = await ask("POST", "/api/login", { body: {}, headers: from("203.0.113.5") });
    const anotherComputer = await ask("POST", "/api/login", { body: {}, headers: from("203.0.113.6") });
    expect(sameComputer.status).toBe(429);
    expect(anotherComputer.status).toBe(401);
  });

  it("counts each address by itself, so a flood of sign-in tries does not stop the leaderboard", async () => {
    for (let attempt = 0; attempt <= TRIES_PER_MINUTE["/api/login"]; attempt++) {
      await ask("POST", "/api/login", { body: {} });
    }
    expect((await ask("POST", "/api/login", { body: {} })).status).toBe(429);
    expect((await ask("GET", "/api/leaderboard?track=test-oval")).status).toBe(200);
    expect((await ask("GET", "/api/me")).status).toBe(200);
  });

  it("limits the slow password work of the whole server, however many computers ask", async () => {
    let refused = 0;
    for (let attempt = 0; attempt < PASSWORD_WORK_PER_MINUTE + 5; attempt++) {
      const answer = await ask("POST", "/api/login", {
        body: { username: "Nobody", password: "wrong-password" },
        headers: { "X-Forwarded-For": `198.51.100.${attempt}` }, // a different computer every time
      });
      if (answer.status === 429) {
        refused++;
      } else {
        expect(answer.status).toBe(401);
      }
    }
    expect(refused).toBe(5);
    // Reading is not password work: it still goes through.
    expect((await ask("GET", "/api/me")).status).toBe(200);
  });
});

describe("a server without a database", () => {
  beforeEach(async () => {
    await new Promise((resolve) => app.close(resolve));
    await startServer({ withAccounts: false });
  });

  it("answers every account address with a calm 'not available'", async () => {
    const tries = [
      ["GET", "/api/me", undefined],
      ["GET", "/api/leaderboard?track=test-oval", undefined],
      ["POST", "/api/signup", { username: "Ana", password: "12345678" }],
      ["POST", "/api/login", { username: "Ana", password: "12345678" }],
      ["POST", "/api/logout", {}],
      ["POST", "/api/delete-account", { password: "12345678" }],
    ];
    for (const [method, address, body] of tries) {
      const answer = await ask(method, address, { body });
      expect(answer.status, address).toBe(503);
      expect(answer.json.code).toBe("unavailable");
      expect(answer.cookie).toBe(null);
    }
  });

  it("still sends the pages and still refuses a POST to them", async () => {
    expect((await ask("GET", "/")).status).toBe(200);
    expect((await ask("POST", "/", { body: {} })).status).toBe(405);
  });
});

describe("when the database stops answering", () => {
  it("says 'try again in a moment' and gives away nothing about the failure", async () => {
    const cookie = await signUp("Ana");
    const silence = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = () => Promise.reject(new Error("connect ECONNREFUSED secret-host.example:5432 password=hunter2"));
    store.findSession = broken;
    store.findPlayerByKey = broken;
    store.bestRaces = broken;

    for (const [method, address, body] of [
      ["GET", "/api/me", undefined],
      ["GET", "/api/leaderboard?track=campus-loop", undefined],
      ["POST", "/api/login", { username: "Ana", password: "12345678" }],
    ]) {
      const answer = await ask(method, address, { body, cookie });
      expect(answer.status, address).toBe(503);
      expect(answer.json.code).toBe("unavailable");
      expect(answer.body).not.toContain("secret-host");
      expect(answer.body).not.toContain("hunter2");
      expect(answer.body).not.toContain("ECONNREFUSED");
    }
    expect(silence).toHaveBeenCalled(); // the details went to our own log
  });
});

describe("the pages' own helper (client/account-api.js) against the real server", () => {
  /** What a browser's "fetch" does, reduced to what the helper uses, with a cookie jar of one cookie. */
  function browser() {
    let cookie;
    const fetchLike = async (address, options) => {
      const answer = await ask(options.method, address, { body: options.body, cookie, headers: options.headers });
      if (answer.cookie !== null) {
        cookie = answer.cookie.endsWith("=") ? undefined : answer.cookie;
      }
      return { json: async () => JSON.parse(answer.body) };
    };
    return createAccountApi(fetchLike);
  }

  it("goes through a whole visit: sign up, look, sign out, sign in, delete", async () => {
    const api = browser();
    expect(await api.getMe()).toEqual({ available: true, signedIn: false, username: null });

    expect(await api.signUp("Ana", "12345678")).toEqual({ ok: true, username: "Ana" });
    expect(await api.getMe()).toEqual({ available: true, signedIn: true, username: "Ana" });

    const ana = await store.findPlayerByKey("ana");
    await accounts.saveResult({ playerId: ana.id, track: "campus-loop", raceSteps: 1800, bestLapSteps: 580, position: 1 });
    const board = await api.getLeaderboard("campus-loop");
    expect(board.races).toEqual([{ rank: 1, username: "Ana", steps: 1800 }]);
    expect(board.mine).toEqual({ raceRank: 1, raceSteps: 1800, lapRank: 1, lapSteps: 580 });

    expect(await api.logOut()).toEqual({ ok: true });
    expect((await api.getMe()).signedIn).toBe(false);
    expect((await api.getLeaderboard("campus-loop")).mine).toBe(null);

    expect((await api.logIn("Ana", "wrong-password")).code).toBe("wrong_login");
    expect(await api.logIn("ana", "12345678")).toEqual({ ok: true, username: "Ana" });

    expect((await api.deleteAccount("wrong-password")).code).toBe("wrong_login");
    expect(await api.deleteAccount("12345678")).toEqual({ ok: true });
    expect((await api.getMe()).signedIn).toBe(false);
    expect((await api.logIn("Ana", "12345678")).code).toBe("wrong_login"); // the account is gone
    expect((await api.getLeaderboard("campus-loop")).races).toEqual([]);
    expect((await api.getLeaderboard("no-such-track")).code).toBe("unknown_track");
  });

  it("says 'not available' on a server without a database", async () => {
    await new Promise((resolve) => app.close(resolve));
    await startServer({ withAccounts: false });
    const api = browser();
    expect(await api.getMe()).toEqual({ available: false, signedIn: false, username: null });
    expect((await api.signUp("Ana", "12345678")).code).toBe("unavailable");
    expect((await api.getLeaderboard("test-oval")).code).toBe("unavailable");
  });
});

describe("with the real, slow password scrambler", () => {
  beforeEach(async () => {
    await new Promise((resolve) => app.close(resolve));
    await startServer({ realPasswords: true });
  });

  it("signs up and signs in, and stores no readable password", async () => {
    const cookie = await signUp("Ana", "correct horse battery");
    expect((await ask("GET", "/api/me", { cookie })).json.username).toBe("Ana");

    const stored = (await store.findPlayerByKey("ana")).passwordHash;
    expect(stored).not.toContain("correct horse battery");
    expect(stored.startsWith("scrypt$")).toBe(true);

    expect((await ask("POST", "/api/login", { body: { username: "Ana", password: "correct horse batterx" } })).status).toBe(401);
    expect((await ask("POST", "/api/login", { body: { username: "Ana", password: "correct horse battery" } })).status).toBe(200);
  }, 20000);
});
