// Online play: connects browsers to a room over a live connection.
//
// A normal web request is "ask once, get one answer". A race needs more:
// the server has to keep telling every browser where the karts are. So the
// online page opens a WebSocket, a connection that stays open and lets
// both sides send short messages at any time. The "ws" library handles the
// details of that connection for us.
//
// What goes over the connection:
//   browser -> server   which keys are held, "restart", or "start" (see messages.js)
//   server -> browser   "welcome" with your player number, then the state
//                       of all karts and of the race 20 times a second
//
// What this file refuses:
//   - connections to any address other than /play
//   - connections started by a page on someone else's website
//   - a player when the room is full
//   - any message that is not exactly what messages.js allows
//   - more messages in a second than a real player could send

import { WebSocketServer } from "ws";
import { STEP_SECONDS } from "../shared/physics.js";
import { createRoom, STEPS_PER_UPDATE } from "./room.js";
import { readClientMessage, MAX_MESSAGE_LENGTH } from "./messages.js";

/** The address the online page connects to. */
export const ONLINE_ADDRESS = "/play";

/**
 * A browser sends a message only when a key goes down or up, so a real
 * player sends a handful a second. Far more than that is a broken or
 * hostile program, and it is disconnected.
 */
export const MAX_MESSAGES_PER_SECOND = 60;

// The reasons we give when we close a connection. The numbers are standard
// WebSocket codes: 1008 "you broke the rules", 1013 "try again later".
const BROKE_THE_RULES = 1008;
const TRY_AGAIN_LATER = 1013;

// Every so often we check that each browser is still there.
const CHECK_STILL_THERE_MS = 15000;

/**
 * When we send a browser away we tell it why, and then give it this long to
 * close the connection from its side before we cut it ourselves.
 */
export const GOODBYE_WAIT_MS = 2000;

/**
 * Adds online play to our web server.
 *   httpServer  the server made by createApp() in app.js
 *   track, character, maxPlayers  what the room uses
 *   goodbyeWaitMs  how long to wait before cutting a connection we sent away
 * Gives back { room, close }. close() ends online play, for the tests.
 */
export function attachOnlinePlay(
  httpServer,
  { track, character, maxPlayers, goodbyeWaitMs = GOODBYE_WAIT_MS },
) {
  const room = createRoom(track, character, maxPlayers);
  const connections = new Set();
  // "noServer" means: do not open a second server, share the web server we already have.
  const sockets = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_LENGTH * 4 });

  // A browser that wants a live connection first asks the web server to
  // "upgrade" a normal request. This is where we decide whether to allow it.
  function onUpgrade(request, socket, head) {
    if (request.url !== ONLINE_ADDRESS || !comesFromOurOwnPage(request)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    sockets.handleUpgrade(request, socket, head, welcome);
  }
  httpServer.on("upgrade", onUpgrade);

  /**
   * Sends a browser away, with a reason.
   *
   * Closing a live connection politely is a small conversation: we say
   * goodbye, and the connection only really ends when the browser answers.
   * A broken or hostile program may never answer, and on the internet a
   * goodbye can fail to arrive. So we do not depend on the answer: we say
   * goodbye, and a short while later we cut the connection ourselves.
   */
  function sendAway(connection, code, reason) {
    connection.close(code, reason);
    const cut = setTimeout(() => connection.terminate(), goodbyeWaitMs);
    cut.unref(); // this timer alone must not keep the program running
    connection.once("close", () => clearTimeout(cut));
  }

  /** Runs once for every browser that connects. */
  function welcome(connection) {
    const player = room.addPlayer();
    if (player === null) {
      connection.send(JSON.stringify({ type: "full" }));
      sendAway(connection, TRY_AGAIN_LATER, "The room is full");
      return;
    }

    connections.add(connection);
    connection.stillThere = true;
    let gone = false; // true once this player's kart has been taken off the track
    let secondStarted = Date.now();
    let messagesThisSecond = 0;

    /** Takes this player's kart off the track. Safe to call more than once. */
    function leave() {
      if (gone) {
        return;
      }
      gone = true;
      connections.delete(connection);
      room.removePlayer(player.id);
      stopTheClockIfEmpty();
    }

    /** Removes a player who broke the rules: the kart goes at once, then the connection. */
    function kick(reason) {
      leave();
      sendAway(connection, BROKE_THE_RULES, reason);
    }

    connection.send(
      JSON.stringify({ type: "welcome", id: player.id, place: player.place, track: track.name }),
    );
    startTheClockIfNeeded();

    connection.on("message", (data, isBinary) => {
      if (gone) {
        return; // already sent away: nothing it says counts any more
      }

      // Too many messages in one second?
      const now = Date.now();
      if (now - secondStarted >= 1000) {
        secondStarted = now;
        messagesThisSecond = 0;
      }
      messagesThisSecond++;
      if (messagesThisSecond > MAX_MESSAGES_PER_SECOND) {
        kick("Too many messages");
        return;
      }

      // Is it one of the three things a browser may say?
      const message = isBinary ? null : readClientMessage(data.toString());
      if (message === null) {
        kick("Message not understood");
        return;
      }

      // This connection can only ever act on its own player number. There
      // is no way for a message to name someone else's kart.
      if (message.type === "keys") {
        room.setKeys(player.id, message.keys);
      } else if (message.type === "restart") {
        room.restart(player.id); // the room says no during a race
      } else {
        room.startRace(player.id); // the room says no to anyone but the host
      }
    });

    connection.on("pong", () => {
      connection.stillThere = true;
    });

    connection.on("close", leave);

    connection.on("error", () => {
      connection.terminate(); // a "close" follows, which tidies up
    });
  }

  // ---- The game clock: 60 steps a second while anyone is in the room ----
  let clock = null;
  let lastTick = 0;
  let owedSeconds = 0; // real time that has passed but is not yet turned into game steps

  function startTheClockIfNeeded() {
    if (clock === null && room.playerCount() > 0) {
      lastTick = performance.now();
      owedSeconds = 0;
      clock = setInterval(tick, 1000 / 60);
    }
  }

  function stopTheClockIfEmpty() {
    if (clock !== null && room.playerCount() === 0) {
      clearInterval(clock);
      clock = null;
    }
  }

  /**
   * The computer does not call this at perfectly even moments. So, as in the
   * browser, we measure the real time that has passed and run as many whole
   * steps as fit in it.
   */
  function tick() {
    const now = performance.now();
    owedSeconds = Math.min(owedSeconds + (now - lastTick) / 1000, 0.25);
    lastTick = now;
    while (owedSeconds >= STEP_SECONDS) {
      room.step();
      owedSeconds -= STEP_SECONDS;
      if (room.stepCount() % STEPS_PER_UPDATE === 0) {
        tellEveryone(JSON.stringify(room.snapshot()));
      }
    }
  }

  function tellEveryone(text) {
    for (const connection of connections) {
      if (connection.readyState === connection.OPEN) {
        connection.send(text);
      }
    }
  }

  // ---- Noticing browsers that vanished without saying goodbye ----
  // (a closed laptop lid, a lost Wi-Fi signal). We send each browser a
  // "ping". A browser that has not answered by the next round is removed,
  // so its kart does not stay on the track as a ghost.
  const stillThereCheck = setInterval(() => {
    for (const connection of connections) {
      if (!connection.stillThere) {
        connection.terminate();
        continue;
      }
      connection.stillThere = false;
      connection.ping();
    }
  }, CHECK_STILL_THERE_MS);
  stillThereCheck.unref(); // this timer alone must not keep the program running

  return {
    room,
    close() {
      clearInterval(stillThereCheck);
      if (clock !== null) {
        clearInterval(clock);
        clock = null;
      }
      httpServer.off("upgrade", onUpgrade);
      // Every connection that is still open, including any we already sent away.
      for (const connection of sockets.clients) {
        connection.terminate();
      }
      sockets.close();
    },
  };
}

/**
 * Was this connection started by a page from our own site?
 * A browser always says which site the page came from (the "Origin"). If
 * that is a different site from ours, some other website is trying to use
 * a visitor's browser to connect to our game, and we refuse.
 * Programs that are not browsers send no Origin. They are allowed: they
 * cannot borrow anyone's browser.
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
