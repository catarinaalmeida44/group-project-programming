// The addresses a page uses for accounts and the leaderboard. They all
// start with /api/ and they all answer in the same format (JSON):
// { ok: true, ... } or { ok: false, code, message }.
//
//   GET  /api/me              who is signed in on this browser
//   POST /api/signup          make an account and sign in
//   POST /api/login           sign in
//   POST /api/logout          sign out
//   POST /api/delete-account  delete the signed-in player's account
//   GET  /api/leaderboard     the shared leaderboard of one track (?track=campus-loop)
//
// This file is about the internet side: reading what a browser sent,
// refusing what is not allowed, setting the cookie, choosing the status
// number. The rules themselves are in accounts.js.
//
// WHAT IS REFUSED HERE, before the rules are even asked
//   - any other address under /api/, and the wrong kind of request for an address
//   - a POST that does not come from one of our own pages (see comesFromOurOwnPage)
//   - a POST that is not in our format, or is longer than a couple of lines
//   - too many tries from one computer in a minute
//   - everything, politely, when the server runs without a database

import { TRACKS } from "../shared/tracks/index.js";
import { SESSION_DAYS } from "./accounts.js";

/** The name of the cookie that holds the "you are signed in" ticket. */
export const SESSION_COOKIE = "session";

/** A sign-up or sign-in message is two short texts. Anything longer than this is refused unread. */
export const BODY_LIMIT_BYTES = 2048;

/**
 * How many requests one computer may make to each address in a minute.
 *
 * The numbers for signing up and signing in look generous for one person.
 * They are, on purpose: everyone on the campus Wi-Fi reaches us through the
 * same address, so to the server a whole classroom looks like one computer.
 * Guessing one player's password is stopped by something else: the account
 * locks after five wrong passwords (accounts.js).
 */
export const TRIES_PER_MINUTE = {
  "/api/signup": 20,
  "/api/login": 30,
  "/api/delete-account": 10,
  "/api/logout": 30,
  "/api/me": 120,
  "/api/leaderboard": 120,
};

/**
 * Checking or scrambling a password is slow on purpose (passwords.js). These
 * are the addresses that do it, and together, from all computers, they are
 * allowed this many times a minute. A flood of sign-in tries can then never
 * keep the server too busy to run the races.
 */
export const PASSWORD_ADDRESSES = ["/api/signup", "/api/login", "/api/delete-account"];
export const PASSWORD_WORK_PER_MINUTE = 90;

/** The limiter remembers at most this many computers at a time. */
const COMPUTERS_TO_REMEMBER = 5000;

const MINUTE_MS = 60 * 1000;

const UNAVAILABLE = {
  ok: false,
  code: "unavailable",
  message: "Accounts and the shared leaderboard are not available on this server right now.",
};

// Which status number goes with which refusal. 400 "your request is wrong",
// 401 "sign in first", 409 "that clashes with something", 429 "slow down".
const STATUS_FOR = {
  invalid_username: 400,
  invalid_password: 400,
  username_taken: 409,
  wrong_login: 401,
  not_signed_in: 401,
  locked: 429,
};

/**
 * Makes the handler for /api/ addresses.
 *   accounts  the account rules (accounts.js), or null when there is no database
 *   now       the clock. Only the tests change it
 */
export function createApi({ accounts = null, now = Date.now } = {}) {
  const recentTries = new Map(); // "address|computer" -> the times of its tries in the last minute
  let passwordWork = []; //         the times of all password work in the last minute, from everyone

  const lastMinute = (times) => times.filter((time) => now() - time < MINUTE_MS);

  /** Counts one try. Says false if that computer has used up its tries for this address. */
  function mayTry(address, request) {
    const key = `${address}|${computerOf(request)}`;
    const recent = lastMinute(recentTries.get(key) ?? []);
    if (recent.length >= TRIES_PER_MINUTE[address]) {
      recentTries.set(key, recent);
      return false;
    }
    if (!recentTries.has(key) && recentTries.size >= COMPUTERS_TO_REMEMBER) {
      forgetQuietComputers();
      if (recentTries.size >= COMPUTERS_TO_REMEMBER) {
        return false; // a flood from very many computers must not fill the server's memory
      }
    }
    recent.push(now());
    recentTries.set(key, recent);
    return true;
  }

  function forgetQuietComputers() {
    for (const [key, times] of recentTries) {
      if (lastMinute(times).length === 0) {
        recentTries.delete(key);
      }
    }
  }

  /** Counts one piece of password work. Says false if the whole server has done enough of it this minute. */
  function mayDoPasswordWork() {
    passwordWork = lastMinute(passwordWork);
    if (passwordWork.length >= PASSWORD_WORK_PER_MINUTE) {
      return false;
    }
    passwordWork.push(now());
    return true;
  }

  const routes = {
    "/api/me": {
      method: "GET",
      async run({ request, response }) {
        const player = await accounts.playerForSession(ticketOf(request));
        sendJson(response, 200, player === null ? { ok: true, signedIn: false } : { ok: true, signedIn: true, username: player.username });
      },
    },

    "/api/signup": {
      method: "POST",
      async run({ request, response, body }) {
        const answer = await accounts.signUp(body.username, body.password);
        if (!answer.ok) {
          return sendRefusal(response, answer);
        }
        const ticket = await accounts.startSession(answer.player.id);
        sendJson(response, 201, { ok: true, username: answer.player.username }, { "Set-Cookie": cookieWith(ticket, request) });
      },
    },

    "/api/login": {
      method: "POST",
      async run({ request, response, body }) {
        const answer = await accounts.logIn(body.username, body.password);
        if (!answer.ok) {
          return sendRefusal(response, answer);
        }
        // A fresh ticket at every sign-in. One that this browser still held
        // (its own, or someone else's on a shared laptop) stops working.
        await accounts.endSession(ticketOf(request));
        const ticket = await accounts.startSession(answer.player.id);
        sendJson(response, 200, { ok: true, username: answer.player.username }, { "Set-Cookie": cookieWith(ticket, request) });
      },
    },

    "/api/logout": {
      method: "POST",
      async run({ request, response }) {
        await accounts.endSession(ticketOf(request));
        sendJson(response, 200, { ok: true }, { "Set-Cookie": cookieGone(request) });
      },
    },

    "/api/delete-account": {
      method: "POST",
      async run({ request, response, body }) {
        // Whose account? Only ever the one the ticket belongs to. Nothing in
        // the message can name another player.
        const player = await accounts.playerForSession(ticketOf(request));
        if (player === null) {
          return sendRefusal(response, { ok: false, code: "not_signed_in", message: "You are not signed in." });
        }
        const answer = await accounts.deleteAccount(player.id, body.password);
        if (!answer.ok) {
          return sendRefusal(response, answer);
        }
        sendJson(response, 200, { ok: true }, { "Set-Cookie": cookieGone(request) });
      },
    },

    "/api/leaderboard": {
      method: "GET",
      async run({ request, response }) {
        const track = new URL(request.url, "http://localhost").searchParams.get("track");
        if (track === null || !Object.hasOwn(TRACKS, track)) {
          return sendJson(response, 400, { ok: false, code: "unknown_track", message: "There is no track with that name." });
        }
        const player = await accounts.playerForSession(ticketOf(request));
        const { races, laps, mine } = await accounts.leaderboard(track, player === null ? null : player.id);
        sendJson(response, 200, { ok: true, track, races, laps, mine });
      },
    },
  };

  /** Answers one request to an address that starts with /api/. */
  return async function handle(request, response, address) {
    const route = Object.hasOwn(routes, address) ? routes[address] : undefined;
    if (route === undefined) {
      return sendJson(response, 404, { ok: false, code: "not_found", message: "There is no such address." });
    }
    if (request.method !== route.method) {
      response.setHeader("Allow", route.method);
      return sendJson(response, 405, { ok: false, code: "wrong_method", message: "That address does not take this kind of request." });
    }
    if (route.method === "POST" && !comesFromOurOwnPage(request)) {
      return sendJson(response, 403, { ok: false, code: "foreign_page", message: "This request did not come from the game's own pages." });
    }
    if (!mayTry(address, request)) {
      response.setHeader("Retry-After", "60");
      return sendJson(response, 429, { ok: false, code: "too_many_attempts", message: "Too many tries. Wait a minute and try again." });
    }
    if (accounts === null) {
      return sendJson(response, 503, UNAVAILABLE);
    }
    if (PASSWORD_ADDRESSES.includes(address) && !mayDoPasswordWork()) {
      response.setHeader("Retry-After", "60");
      return sendJson(response, 429, {
        ok: false,
        code: "too_many_attempts",
        message: "The server is very busy with sign-ins right now. Wait a minute and try again.",
      });
    }

    let body = {};
    if (route.method === "POST") {
      const read = await readBody(request);
      if (!read.ok) {
        return sendJson(response, read.status, { ok: false, code: "bad_request", message: read.message });
      }
      body = read.body;
    }

    try {
      await route.run({ request, response, body });
    } catch (error) {
      // Almost always: the database is asleep or cannot be reached. The
      // details go to our own log, never to the visitor.
      console.error(`Accounts: ${address} failed:`, error.message);
      if (!response.headersSent) {
        sendJson(response, 503, {
          ok: false,
          code: "unavailable",
          message: "Accounts could not be reached just now. Try again in a moment.",
        });
      }
    }
  };
}

function sendRefusal(response, answer) {
  sendJson(response, STATUS_FOR[answer.code] ?? 400, answer);
}

function sendJson(response, status, body, moreHeaders = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    // Answers about accounts must never be kept and shown again later, by
    // the browser or by anything between it and us.
    "Cache-Control": "no-store",
    ...moreHeaders,
  });
  response.end(JSON.stringify(body));
}

/**
 * Reads what a POST sent. Gives { ok: true, body } or { ok: false, status, message }.
 * The body must be labelled as our format, be short, and be one object.
 */
function readBody(request) {
  return new Promise((resolve) => {
    const kind = String(request.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
    if (kind !== "application/json") {
      request.resume(); // let the rest arrive and be thrown away
      // 415 means "I do not accept that kind of content".
      return resolve({ ok: false, status: 415, message: "Send this as JSON." });
    }
    const pieces = [];
    let size = 0;
    let done = false;
    const finish = (answer) => {
      if (!done) {
        done = true;
        resolve(answer);
      }
    };
    request.on("data", (piece) => {
      size += piece.length;
      if (size > BODY_LIMIT_BYTES) {
        pieces.length = 0; // keep nothing of it
        if (size > BODY_LIMIT_BYTES * 100) {
          request.destroy(); // still sending after we said no: hang up
        }
        // 413 means "that is too long".
        return finish({ ok: false, status: 413, message: "That message is too long." });
      }
      pieces.push(piece);
    });
    request.on("error", () => finish({ ok: false, status: 400, message: "The message did not arrive whole." }));
    request.on("end", () => {
      let body;
      try {
        body = JSON.parse(Buffer.concat(pieces).toString("utf8"));
      } catch {
        return finish({ ok: false, status: 400, message: "That message is not in a form the server understands." });
      }
      if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return finish({ ok: false, status: 400, message: "That message is not in a form the server understands." });
      }
      finish({ ok: true, body });
    });
  });
}

/**
 * Did this POST come from one of our own pages?
 *
 * A browser sends our cookie along with every request to our site, also
 * when the request was started by a page on some other website. Such a page
 * could try to sign a visitor out or delete their account behind their
 * back. A browser always says which site started a POST (the "Origin"), so
 * we refuse any POST whose Origin is not our own site. The cookie is also
 * marked so that browsers do not send it with such requests in the first
 * place: two locks on the same door.
 * Programs that are not browsers send no Origin. They are allowed, because
 * they hold no visitor's cookie.
 */
function comesFromOurOwnPage(request) {
  const origin = request.headers.origin;
  if (origin === undefined) {
    return true;
  }
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

/** Which computer a request came from, as well as we can tell. Used only to count tries. */
function computerOf(request) {
  // Render passes our visitors on to us and writes the visitor's address in
  // this header. On a laptop there is no such header.
  const passedOn = String(request.headers["x-forwarded-for"] ?? "").split(",")[0].trim();
  return passedOn !== "" ? passedOn.slice(0, 60) : (request.socket.remoteAddress ?? "unknown");
}

/** The ticket in the request's cookie, or undefined. */
export function ticketOf(request) {
  for (const part of String(request.headers.cookie ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) {
      return rest.join("=");
    }
  }
  return undefined;
}

/** Was the visitor's own connection a secure one (https)? Render tells us in a header. */
function isSecure(request) {
  return String(request.headers["x-forwarded-proto"] ?? "").split(",")[0].trim() === "https";
}

/**
 * The cookie that carries the ticket.
 *   HttpOnly      the page's own code cannot read it, so a script that got
 *                 into a page could not steal it
 *   SameSite=Lax  the browser does not send it with requests that other
 *                 websites start, except when the player follows a link to us
 *   Secure        only ever sent over a secure connection (when ours is one)
 *   Max-Age       forgotten by the browser after seven days, like on the server
 */
function cookieWith(ticket, request) {
  const seconds = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${ticket}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${isSecure(request) ? "; Secure" : ""}`;
}

/** A cookie that tells the browser to forget the ticket. */
function cookieGone(request) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecure(request) ? "; Secure" : ""}`;
}
