// Reading the messages a browser sends during an online session.
//
// Anyone on the internet can send our server anything, not only the text
// our own page sends. So every message is checked here before the game
// looks at it. A browser may say exactly six things:
//
//   {"type":"keys","gas":true,"brake":false,"left":false,"right":true}
//       "these are the driving keys I am holding now"
//   {"type":"restart"}
//       "put my kart back at the start"
//   {"type":"start"}
//       "start a race for everyone in the room". Any browser may say it,
//       but the room only obeys the host (see room.js).
//   {"type":"look","body":2,"helmet":0,"suit":4}
//       "paint my kart in these colours". Three small whole numbers, each
//       the number of a colour in a short list (shared/kart-looks.js). It
//       only changes how the kart is drawn.
//   {"type":"character","id":"pcp"}
//       "I want to be this character" (shared/cast.js). Only the id of a
//       character in the cast gets through. The room decides whether it is
//       still free.
//   {"type":"computers","on":true}
//       "fill the empty places with computer karts from the next race on"
//       (true), or "do not" (false). Any browser may say it, but only the
//       host is obeyed, and only while no race is on (see online.js).
//
// A browser never says where its kart is, how fast it goes or which lap it
// is on. The server works those out itself, with the shared rules.

import { cleanLookChoice } from "../shared/kart-looks.js";
import { isCharacterId } from "../shared/cast.js";

/** A real message is far shorter than this. Anything longer is refused unread. */
export const MAX_MESSAGE_LENGTH = 200;

/**
 * Checks one message from a browser.
 * Gives { type: "keys", keys }, { type: "restart" }, { type: "start" } or
 * { type: "look", look }, { type: "character", character } or { type: "computers", on },
 * or null if the message is not one of the six
 * things a browser may say.
 * What it gives back is built fresh from the checked parts only, so
 * anything extra a browser added to its message is dropped.
 */
export function readClientMessage(text) {
  if (typeof text !== "string" || text.length > MAX_MESSAGE_LENGTH) {
    return null;
  }

  let message;
  try {
    message = JSON.parse(text);
  } catch {
    return null; // not in the format we use
  }
  if (message === null || typeof message !== "object" || Array.isArray(message)) {
    return null;
  }

  if (message.type === "restart") {
    return { type: "restart" };
  }

  if (message.type === "start") {
    return { type: "start" };
  }

  if (message.type === "look") {
    // Only three whole numbers from the allowed ranges get through. A
    // colour written out, a name, or a number out of range is refused.
    const look = cleanLookChoice(message);
    return look === null ? null : { type: "look", look };
  }

  if (message.type === "character") {
    // Only the exact id of a character in the cast gets through.
    return isCharacterId(message.id) ? { type: "character", character: message.id } : null;
  }

  if (message.type === "computers") {
    // Only an exact true or false gets through.
    return typeof message.on === "boolean" ? { type: "computers", on: message.on } : null;
  }

  if (message.type === "keys") {
    const { gas, brake, left, right } = message;
    const allYesOrNo = [gas, brake, left, right].every((value) => typeof value === "boolean");
    if (allYesOrNo) {
      return { type: "keys", keys: { gas, brake, left, right } };
    }
  }

  return null;
}
