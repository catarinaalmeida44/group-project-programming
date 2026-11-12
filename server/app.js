// Our game server, first version.
//
// What it does today:
//   - sends the files in the "client" folder to the browser (the page, its
//     style, the drawing and keyboard code)
//   - sends the files in the "shared" folder too, under addresses that start
//     with "/shared/". Those are the game rules, and the browser needs them
//     to run a practice race
//   - answers "/health" with a short "I am alive" message, which Render uses
//     to check that the server is running
//   - answers "/database-check" with what it can read from the database, to
//     prove that the server and the database can talk to each other
//
// What it refuses:
//   - anything that tries to change something (only reading is allowed for now)
//   - any file outside those two folders
//   - any kind of file that is not on the list below
//
// This file only BUILDS the server. Starting it is done in start.js.
// Keeping the two apart lets the tests build a server of their own.

import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createApi } from "./api.js";

// The folders a browser is allowed to download from, and the beginning of
// the addresses that lead to each one. The first match wins, so "/shared/"
// has to come before "/". Nothing in the "server" or "tests" folders, and
// nothing at the top of the project, can ever be downloaded.
const SERVER_FOLDER = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_FOLDERS = [
  { addressStart: "/shared/", folder: path.resolve(SERVER_FOLDER, "..", "shared") },
  { addressStart: "/", folder: path.resolve(SERVER_FOLDER, "..", "client") },
];

// The kinds of file we are willing to send, and the label the browser
// needs to know what each one is. A file of any other kind is never sent.
const FILE_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

/**
 * Builds the server. It does not start listening yet.
 *   database  what createDatabase() in db.js gave, or null when the server
 *             runs without a database
 *   accounts  the account rules from accounts.js, or null when there is no
 *             database. The /api/ addresses then answer "not available"
 *   now       the clock, for counting tries per minute. Only the tests change it
 */
export function createApp({ database = null, accounts = null, now = Date.now } = {}) {
  const api = createApi({ accounts, now });
  return http.createServer((request, response) => {
    answer(request, response, database, api).catch((error) => {
      // Something we did not plan for. Write it in the server's log and
      // tell the browser only that it failed, without any details.
      console.error("Unexpected error while answering a request:", error);
      if (response.headersSent) {
        response.destroy(); // an answer was already on its way: just hang up
      } else {
        sendText(response, 500, "Something went wrong on the server.");
      }
    });
  });
}

/**
 * The rules we hand the browser with every answer, about what a page of
 * ours may load and do (a "Content-Security-Policy").
 *
 * Our pages only ever need files from our own server. So we tell the
 * browser: run scripts and use styles only from files on this site, never
 * from text inside a page and never from another site. If a mistake of ours
 * ever let a visitor's text end up in a page as code, the browser would
 * refuse to run it. It is a second lock: the first one is that our pages
 * put text on the screen as text, never as HTML.
 *
 *   default-src 'self'      everything comes from our own site, unless said otherwise
 *   img-src 'self' data:    pictures also from inside our own style file
 *   connect-src ...         the live connection for online play, to our own site only
 *   object-src 'none'       no plug-ins
 *   base-uri 'none'         a page cannot change what its links are relative to
 *   form-action 'self'      forms can only send to our own site
 *   frame-ancestors 'none'  no other website may show our pages inside its own
 */
function pagePolicy(request) {
  // 'self' already covers the live connection in current browsers. Older
  // ones need the address spelled out. It is our own name as the browser
  // used it, and only letters, digits, dots, colons and dashes are let through.
  const host = String(request.headers.host ?? "");
  const live = /^[A-Za-z0-9.:-]{1,100}$/.test(host) ? ` ws://${host} wss://${host}` : "";
  return [
    "default-src 'self'",
    "img-src 'self' data:",
    `connect-src 'self'${live}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** Decides what to send back for one request. */
async function answer(request, response, database, api) {
  response.setHeader("Content-Security-Policy", pagePolicy(request));
  const address = readAddress(request.url);

  // Accounts and the leaderboard have their own addresses, all under /api/.
  // They are the only place where a request may change something, and
  // api.js checks each one.
  if (address !== null && address.startsWith("/api/")) {
    return api(request, response, address);
  }

  // Everywhere else: GET means "please send me this". HEAD means the same,
  // without the content. Everything else (POST, DELETE, ...) asks to change
  // something: refused.
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    return sendText(response, 405, "This server only answers requests to read a page.");
  }

  if (address === null) {
    return sendText(response, 400, "That address is not valid.");
  }

  if (address === "/health") {
    return send(response, 200, FILE_TYPES[".json"], JSON.stringify({ status: "ok" }));
  }

  if (address === "/database-check") {
    return answerDatabaseCheck(response, database);
  }

  const file = await findPublicFile(address);
  if (file === null) {
    return sendText(response, 404, "Page not found.");
  }
  return send(response, 200, file.type, file.content);
}

/**
 * Answers "/database-check": can the server read from the database?
 *
 * The visitor only ever gets one of three short answers. When something
 * goes wrong, the details go to the server's own log and never to the
 * visitor, because an error from a database can mention names and
 * addresses that are nobody else's business.
 */
async function answerDatabaseCheck(response, database) {
  const sendJson = (status, body) => send(response, status, FILE_TYPES[".json"], JSON.stringify(body));

  if (database === null) {
    // 503 means "this part is not available right now".
    return sendJson(503, { ok: false, message: "The database is not set up on this computer." });
  }
  try {
    const { starts, latest } = await database.status();
    return sendJson(200, { ok: true, starts, latest });
  } catch (error) {
    console.error("Database check failed:", error.message);
    return sendJson(503, { ok: false, message: "The database could not be reached. Try again in a moment." });
  }
}

/**
 * Turns what the browser sent (for example "/style.css?x=1") into a plain
 * address ("/style.css"). Gives null if the address is broken.
 */
function readAddress(rawUrl) {
  const withoutQuestionPart = rawUrl.split("?")[0];
  let address;
  try {
    // Addresses can hide characters as codes: "%2F" means "/".
    // Decode them now, so the safety check below sees the real characters.
    address = decodeURIComponent(withoutQuestionPart);
  } catch {
    return null; // a broken code, such as "%E0%A4%A"
  }
  if (!address.startsWith("/") || address.includes("\0")) {
    return null;
  }
  return address;
}

/**
 * Looks for a file in one of the public folders.
 * Gives { type, content }, or null if the file may not be sent or does not exist.
 */
async function findPublicFile(address) {
  const wanted = address === "/" ? "/index.html" : address;
  const { addressStart, folder } = PUBLIC_FOLDERS.find((entry) =>
    wanted.startsWith(entry.addressStart),
  );
  const fullPath = path.join(folder, wanted.slice(addressStart.length));

  // Safety check: an address such as "/../server/app.js" tries to climb out
  // of the public folder. After joining, such a path no longer starts with
  // that folder, so we refuse it.
  if (!fullPath.startsWith(folder + path.sep)) {
    return null;
  }

  const type = FILE_TYPES[path.extname(fullPath).toLowerCase()];
  if (type === undefined) {
    return null; // not a kind of file we send
  }

  try {
    return { type, content: await readFile(fullPath) };
  } catch (error) {
    // "No such file" or "that is a folder": treat both as not found.
    if (error.code === "ENOENT" || error.code === "EISDIR" || error.code === "ENOTDIR") {
      return null;
    }
    throw error;
  }
}

function sendText(response, status, message) {
  send(response, status, "text/plain; charset=utf-8", message);
}

function send(response, status, type, content) {
  response.writeHead(status, {
    "Content-Type": type,
    // Tells the browser to trust the label above and not guess the file kind.
    "X-Content-Type-Options": "nosniff",
    // Tells the browser to check for a newer version each time, so players
    // always get the latest files after we put a new version online.
    "Cache-Control": "no-cache",
  });
  response.end(content);
}
