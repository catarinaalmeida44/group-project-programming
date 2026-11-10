// Our game server, first version.
//
// What it does today:
//   - sends the files in the "client" folder to the browser (the page, its style)
//   - answers "/health" with a short "I am alive" message, which Render uses
//     to check that the server is running
//
// What it refuses:
//   - anything that tries to change something (only reading is allowed for now)
//   - any file outside the "client" folder
//   - any kind of file that is not on the list below
//
// This file only BUILDS the server. Starting it is done in start.js.
// Keeping the two apart lets the tests build a server of their own.

import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// The folder that holds everything a browser is allowed to download.
const SERVER_FOLDER = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_FOLDER = path.resolve(SERVER_FOLDER, "..", "client");

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

/** Builds the server. It does not start listening yet. */
export function createApp() {
  return http.createServer((request, response) => {
    answer(request, response).catch((error) => {
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
async function answer(request, response) {
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

  const file = await findClientFile(address);
  if (file === null) {
    return sendText(response, 404, "Page not found.");
  }
  return send(response, 200, file.type, file.content);
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
 * Looks for a file in the client folder.
 * Gives { type, content }, or null if the file may not be sent or does not exist.
 */
async function findClientFile(address) {
  const wanted = address === "/" ? "/index.html" : address;
  const fullPath = path.join(CLIENT_FOLDER, wanted);

  // Safety check: an address such as "/../server/app.js" tries to climb out
  // of the client folder. After joining, such a path no longer starts with
  // the client folder, so we refuse it.
  if (!fullPath.startsWith(CLIENT_FOLDER + path.sep)) {
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
