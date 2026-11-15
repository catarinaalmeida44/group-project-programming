// Tests for the email addresses in server/api.js: adding an email address
// to an account, and getting back into an account with a forgotten
// password. They send real requests to a real copy of the server on the
// computer running the tests. The store, the clock and the mailer are
// pretend ones: no email is ever sent.
//
// (The rules themselves are tested in email.test.js. The other account
// addresses are tested in api.test.js.)

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "node:http";
import { createApp } from "../server/app.js";
import { createAccounts } from "../server/accounts.js";
import { TRIES_PER_MINUTE, PASSWORD_ADDRESSES } from "../server/api.js";
import { createAccountApi } from "../client/account-api.js";
import { createMemoryStore } from "./memory-store.js";

const MINUTE = 60 * 1000;
const SITE = "https://kart.example";

let app;
let port;
let store;
let time;
let sent; // every message the pretend mailer was handed

const quickPasswords = {
  hash: async (password) => `scrambled(${password})`,
  matches: async (password, stored) => stored === `scrambled(${password})`,
  pretend: async () => {},
};

/** Starts a server. "withEmail: false" gives one where email is not set up. */
async function startServer({ withEmail = true } = {}) {
  store = createMemoryStore();
  time = 1_800_000_000_000;
  sent = [];
  const mailer = { send: async (message) => sent.push(message) };
  const accounts = createAccounts(store, {
    now: () => time,
    passwords: quickPasswords,
    ...(withEmail ? { mailer, siteAddress: SITE } : {}),
  });
  app = createApp({ accounts, now: () => time });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  port = app.address().port;
}

beforeEach(() => startServer());
afterEach(() => new Promise((resolve) => app.close(resolve)));

/** Sends one request and gives back { status, headers, body, json, setCookie, cookie }. */
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
        resolve({ status: response.statusCode, headers: response.headers, body: received, json, setCookie, cookie: setCookie === null ? null : setCookie.split(";")[0] });
      });
    });
    request.on("error", reject);
    request.end(text);
  });
}

async function signUp(username = "Ana", password = "12345678") {
  const answer = await ask("POST", "/api/signup", { body: { username, password } });
  expect(answer.status, answer.body).toBe(201);
  return answer.cookie;
}

/** The secret part of the newest link of a kind that was "sent". */
function newestSecret(kind) {
  for (let i = sent.length - 1; i >= 0; i--) {
    const found = sent[i].text.match(new RegExp(`${SITE}/link\\.html#${kind}=([A-Za-z0-9_-]+)`));
    if (found !== null) {
      return found[1];
    }
  }
  throw new Error(`No ${kind} link was sent`);
}

/** Gives the signed-in player a confirmed email address, through the server. */
async function giveEmail(cookie, email, password = "12345678") {
  expect((await ask("POST", "/api/set-email", { body: { password, email }, cookie })).status).toBe(200);
  expect((await ask("POST", "/api/confirm-email", { body: { link: newestSecret("confirm") } })).status).toBe(200);
}

describe("asking what the server knows about email", () => {
  it("says email is available and that a guest has no address", async () => {
    const answer = await ask("GET", "/api/email");
    expect(answer.status).toBe(200);
    expect(answer.json).toEqual({ ok: true, available: true, email: null });
    expect(answer.headers["cache-control"]).toBe("no-store");
  });

  it("tells a signed-in player their own address, and never anyone else's", async () => {
    const ana = await signUp("Ana");
    const rui = await signUp("Rui", "rui-password");
    await giveEmail(ana, "ana@example.com");
    expect((await ask("GET", "/api/email", { cookie: ana })).json).toEqual({ ok: true, available: true, email: "ana@example.com" });
    expect((await ask("GET", "/api/email", { cookie: rui })).json).toEqual({ ok: true, available: true, email: null });
    expect((await ask("GET", "/api/email")).json.email).toBe(null);
    // No address of the server takes a name and gives back an email address.
    expect((await ask("GET", "/api/email?username=Ana", { cookie: rui })).json.email).toBe(null);
    expect((await ask("GET", "/api/me", { cookie: ana })).body).not.toContain("ana@example.com");
    expect((await ask("GET", "/api/leaderboard?track=test-oval", { cookie: rui })).body).not.toContain("example.com");
  });

  it("says email is not available on a server where it is not set up", async () => {
    await new Promise((resolve) => app.close(resolve));
    await startServer({ withEmail: false });
    expect((await ask("GET", "/api/email")).json).toEqual({ ok: true, available: false, email: null });
  });
});

describe("adding an email address", () => {
  it("sends a link, tells the browser nothing but 'sent', and the address counts once the link is opened", async () => {
    const cookie = await signUp("Ana");
    const answer = await ask("POST", "/api/set-email", { body: { password: "12345678", email: "ana@example.com" }, cookie });
    expect(answer.status, answer.body).toBe(200);
    expect(answer.json).toEqual({ ok: true }); // the secret of the link never comes back to the browser
    expect(sent).toHaveLength(1);
    expect((await ask("GET", "/api/email", { cookie })).json.email).toBe(null);

    const confirmed = await ask("POST", "/api/confirm-email", { body: { link: newestSecret("confirm") } }); // no cookie: another device
    expect(confirmed.status).toBe(200);
    expect(confirmed.json).toEqual({ ok: true });
    expect((await ask("GET", "/api/email", { cookie })).json.email).toBe("ana@example.com");
  });

  it("refuses when nobody is signed in", async () => {
    await signUp("Ana");
    for (const cookie of [undefined, `session=${"A".repeat(43)}`]) {
      const answer = await ask("POST", "/api/set-email", { body: { password: "12345678", email: "ana@example.com" }, cookie });
      expect(answer.status).toBe(401);
      expect(answer.json.code).toBe("not_signed_in");
    }
    expect(sent).toEqual([]);
  });

  it("refuses a wrong password, and something that is not an email address", async () => {
    const cookie = await signUp("Ana");
    const wrong = await ask("POST", "/api/set-email", { body: { password: "wrong-password", email: "ana@example.com" }, cookie });
    expect(wrong.status).toBe(401);
    expect(wrong.json.code).toBe("wrong_login");
    for (const email of ["ana", undefined, null, ["ana@example.com"], { address: "ana@example.com" }]) {
      const answer = await ask("POST", "/api/set-email", { body: { password: "12345678", email }, cookie });
      expect(answer.status, JSON.stringify(email)).toBe(400);
      expect(answer.json.code).toBe("invalid_email");
    }
    expect(sent).toEqual([]);
  });

  it("can only ever add an address to the account the ticket belongs to", async () => {
    const ana = await signUp("Ana");
    await signUp("Rui", "rui-password");
    const rui = await store.findPlayerByKey("rui");
    // Ana names Rui in every way she can think of, with Rui's real password.
    const answer = await ask("POST", "/api/set-email", {
      body: { password: "rui-password", email: "ana-controls-this@example.com", username: "Rui", playerId: rui.id, id: rui.id },
      cookie: ana,
    });
    expect(answer.status).toBe(401); // it is not ANA's password
    expect(sent).toEqual([]);
    expect(store.countEmailLinks()).toBe(0);
  });

  it("refuses a made-up link, and a link used a second time", async () => {
    const cookie = await signUp("Ana");
    await ask("POST", "/api/set-email", { body: { password: "12345678", email: "ana@example.com" }, cookie });
    const link = newestSecret("confirm");
    for (const rubbish of ["A".repeat(43), "abc", undefined, null, 42, [link]]) {
      const answer = await ask("POST", "/api/confirm-email", { body: { link: rubbish } });
      expect(answer.status, JSON.stringify(rubbish)).toBe(400);
      expect(answer.json.code).toBe("bad_link");
    }
    expect((await ask("POST", "/api/confirm-email", { body: { link } })).status).toBe(200);
    expect((await ask("POST", "/api/confirm-email", { body: { link } })).json.code).toBe("bad_link");
  });

  it("takes the address off again with the password", async () => {
    const cookie = await signUp("Ana");
    await giveEmail(cookie, "ana@example.com");
    expect((await ask("POST", "/api/remove-email", { body: { password: "wrong-password" }, cookie })).status).toBe(401);
    expect((await ask("POST", "/api/remove-email", { body: { password: "12345678" } })).status).toBe(401); // nobody signed in
    expect((await ask("GET", "/api/email", { cookie })).json.email).toBe("ana@example.com");

    expect((await ask("POST", "/api/remove-email", { body: { password: "12345678" }, cookie })).status).toBe(200);
    expect((await ask("GET", "/api/email", { cookie })).json.email).toBe(null);
  });
});

describe("a forgotten password", () => {
  let cookie;
  beforeEach(async () => {
    cookie = await signUp("Ana", "12345678");
    await giveEmail(cookie, "ana@example.com");
    sent = [];
  });

  it("answers exactly the same for an address with an account and one without", async () => {
    const known = await ask("POST", "/api/forgot-password", { body: { email: "ana@example.com" } });
    const unknown = await ask("POST", "/api/forgot-password", { body: { email: "nobody@example.com" } });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toBe(known.body);
    expect(known.json).toEqual({ ok: true });
    expect(sent).toHaveLength(1); // only the real one got an email
  });

  it("refuses something that is not an email address", async () => {
    for (const email of ["ana", "", undefined, null, 42, ["ana@example.com"]]) {
      const answer = await ask("POST", "/api/forgot-password", { body: { email } });
      expect(answer.status, JSON.stringify(email)).toBe(400);
      expect(answer.json.code).toBe("invalid_email");
    }
    expect(sent).toEqual([]);
  });

  it("sets the new password with the link, signs every browser out, and the new password signs in", async () => {
    await ask("POST", "/api/forgot-password", { body: { email: "ana@example.com" } });
    const answer = await ask("POST", "/api/reset-password", { body: { link: newestSecret("reset"), newPassword: "a-new-password" }, cookie });
    expect(answer.status, answer.body).toBe(200);
    expect(answer.json).toEqual({ ok: true, username: "Ana" });
    expect(answer.setCookie).toContain("Max-Age=0"); // this browser is told to forget its ticket
    expect(answer.body).not.toContain("a-new-password");

    expect((await ask("GET", "/api/me", { cookie })).json.signedIn).toBe(false);
    expect((await ask("POST", "/api/login", { body: { username: "Ana", password: "12345678" } })).status).toBe(401);
    expect((await ask("POST", "/api/login", { body: { username: "Ana", password: "a-new-password" } })).status).toBe(200);
    expect(sent[sent.length - 1].subject).toContain("your password was changed");
  });

  it("refuses a made-up link, a link used twice, a link that is too old, and a new password that breaks the rules", async () => {
    await ask("POST", "/api/forgot-password", { body: { email: "ana@example.com" } });
    const link = newestSecret("reset");
    const madeUp = await ask("POST", "/api/reset-password", { body: { link: "A".repeat(43), newPassword: "a-new-password" } });
    expect(madeUp.status).toBe(400);
    expect(madeUp.json.code).toBe("bad_link");
    const tooShort = await ask("POST", "/api/reset-password", { body: { link, newPassword: "short" } });
    expect(tooShort.json.code).toBe("invalid_password");

    expect((await ask("POST", "/api/reset-password", { body: { link, newPassword: "a-new-password" } })).status).toBe(200);
    expect((await ask("POST", "/api/reset-password", { body: { link, newPassword: "another-password" } })).json.code).toBe("bad_link");

    await ask("POST", "/api/forgot-password", { body: { email: "ana@example.com" } });
    const old = newestSecret("reset");
    time += 31 * MINUTE;
    expect((await ask("POST", "/api/reset-password", { body: { link: old, newPassword: "another-password" } })).json.code).toBe("bad_link");
    expect((await ask("POST", "/api/login", { body: { username: "Ana", password: "a-new-password" } })).status).toBe(200);
  });

  it("has no way to say whose password to set: only the link decides", async () => {
    await signUp("Rui", "rui-password");
    await ask("POST", "/api/forgot-password", { body: { email: "ana@example.com" } });
    const rui = await store.findPlayerByKey("rui");
    const answer = await ask("POST", "/api/reset-password", {
      body: { link: newestSecret("reset"), newPassword: "a-new-password", username: "Rui", playerId: rui.id, id: rui.id, email: "rui@example.com" },
    });
    expect(answer.json).toEqual({ ok: true, username: "Ana" });
    expect((await store.findPlayerByKey("rui")).passwordHash).toBe("scrambled(rui-password)");
  });
});

describe("what is refused before the rules are even asked", () => {
  const POSTS = ["/api/set-email", "/api/remove-email", "/api/confirm-email", "/api/forgot-password", "/api/reset-password"];

  it("refuses a request started by a page on another website, a GET, and a form", async () => {
    for (const address of POSTS) {
      const foreign = await ask("POST", address, { body: { email: "ana@example.com" }, headers: { Origin: "https://evil.example" } });
      expect(foreign.status, address).toBe(403);
      expect((await ask("GET", address)).status, address).toBe(405);
      const form = await ask("POST", address, { body: "email=ana@example.com", headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      expect(form.status, address).toBe(415);
    }
    expect((await ask("POST", "/api/email", { body: {} })).status).toBe(405);
    expect(sent).toEqual([]);
  });

  it("gives every one of the addresses a limit per computer, and counts password work where there is some", () => {
    for (const address of [...POSTS, "/api/email"]) {
      expect(TRIES_PER_MINUTE[address], address).toBeGreaterThan(0);
    }
    for (const address of ["/api/set-email", "/api/remove-email", "/api/reset-password"]) {
      expect(PASSWORD_ADDRESSES, address).toContain(address);
    }
  });

  it("refuses more 'forgot my password' tries a minute from one computer than a classroom would make, then allows them again", async () => {
    const body = { email: "nobody@example.com" };
    for (let attempt = 0; attempt < TRIES_PER_MINUTE["/api/forgot-password"]; attempt++) {
      expect((await ask("POST", "/api/forgot-password", { body })).status).toBe(200);
    }
    const tooMany = await ask("POST", "/api/forgot-password", { body });
    expect(tooMany.status).toBe(429);
    expect(tooMany.json.code).toBe("too_many_attempts");
    time += MINUTE;
    expect((await ask("POST", "/api/forgot-password", { body })).status).toBe(200);
  });

  it("answers a calm 'not set up' for what needs email on a server without it, and can still take an address away", async () => {
    await new Promise((resolve) => app.close(resolve));
    await startServer({ withEmail: false });
    const cookie = await signUp("Ana");
    const add = await ask("POST", "/api/set-email", { body: { password: "12345678", email: "ana@example.com" }, cookie });
    expect(add.status).toBe(503);
    expect(add.json.code).toBe("email_unavailable");
    const forgot = await ask("POST", "/api/forgot-password", { body: { email: "ana@example.com" } });
    expect(forgot.status).toBe(503);
    expect(forgot.json.code).toBe("email_unavailable");
    expect((await ask("POST", "/api/remove-email", { body: { password: "12345678" }, cookie })).status).toBe(200);
  });
});

describe("the pages' own helper (client/account-api.js) against the real server", () => {
  it("goes through a whole forgotten password: add an address, confirm, forget, choose a new password", async () => {
    // A tiny pretend browser: it remembers the cookie the server sets, like a real one.
    let cookie;
    const api = createAccountApi(async (address, options) => {
      const headers = { ...options.headers };
      if (cookie !== undefined) {
        headers.Cookie = cookie;
      }
      const response = await fetch(`http://127.0.0.1:${port}${address}`, { ...options, headers });
      const set = response.headers.get("set-cookie");
      if (set !== null) {
        cookie = set.split(";")[0];
      }
      return response;
    });

    expect((await api.signUp("Ana", "12345678")).ok).toBe(true);
    expect(await api.getEmail()).toEqual({ available: true, email: null });
    expect(await api.setEmail("12345678", "ana@example.com")).toEqual({ ok: true });
    expect(await api.confirmEmail(newestSecret("confirm"))).toEqual({ ok: true });
    expect(await api.getEmail()).toEqual({ available: true, email: "ana@example.com" });

    expect(await api.forgotPassword("ana@example.com")).toEqual({ ok: true });
    expect(await api.resetPassword(newestSecret("reset"), "a-new-password")).toEqual({ ok: true, username: "Ana" });
    expect((await api.getMe()).signedIn).toBe(false);
    expect((await api.logIn("Ana", "a-new-password")).ok).toBe(true);
    expect((await api.removeEmail("a-new-password")).ok).toBe(true);
    expect(await api.getEmail()).toEqual({ available: true, email: null });
  });
});
