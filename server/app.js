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
 */
export function createApp({ database = null } = {}) {
  return http.createServer((request, response) => {
    answer(request, response, database).catch((error) => {
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

/** Decides what to send back for one request. */
async function answer(request, response, database) {
  // GET means "please send me this". HEAD means the same, without the content.
  // Everything else (POST, DELETE, ...) asks to change something: refused.
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    return sendText(response, 405, "This server only answers requests to read a page.");
  }

  const address = readAddress(request.url);
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
