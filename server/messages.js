// Reading the messages a browser sends during an online session.
//
// Anyone on the internet can send our server anything, not only the text
// our own page sends. So every message is checked here before the game
// looks at it. A browser may say exactly three things:
//
//   {"type":"keys","gas":true,"brake":false,"left":false,"right":true}
//       "these are the driving keys I am holding now"
//   {"type":"restart"}
//       "put my kart back at the start"
//   {"type":"start"}
//       "start a race for everyone in the room". Any browser may say it,
//       but the room only obeys the host (see room.js).
//
// A browser never says where its kart is, how fast it goes or which lap it
// is on. The server works those out itself, with the shared rules.

/** A real message is far shorter than this. Anything longer is refused unread. */
export const MAX_MESSAGE_LENGTH = 200;

/**
 * Checks one message from a browser.
 * Gives { type: "keys", keys }, { type: "restart" } or { type: "start" },
 * or null if the message is not one of the three things a browser may say.
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

  if (message.type === "keys") {
    const { gas, brake, left, right } = message;
    const allYesOrNo = [gas, brake, left, right].every((value) => typeof value === "boolean");
    if (allYesOrNo) {
      return { type: "keys", keys: { gas, brake, left, right } };
    }
  }

  return null;
}
