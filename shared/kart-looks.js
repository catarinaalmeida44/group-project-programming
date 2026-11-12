// What a player may choose for the look of their kart.
//
// A player picks three things: the colour of the kart, of the helmet and of
// the driver's suit. Each is picked from a short list, so a choice is three
// small whole numbers: "kart colour number 2, helmet number 0, suit number 4".
//
// Why numbers and not colours: the browser sends its choice to the server,
// and the server passes it on to the other players. A number from a known
// range cannot carry anything harmful. A free text could. The lists of
// colours themselves are in client/kart-choice.js, because only the picture
// needs them. The server only needs to know how long each list is.
//
// This is a rule about what is allowed, used by both the browser and the
// server, which is why it lives in the "shared" folder. It changes nothing
// about how a kart drives.

/** How many colours there are to choose from, for each part. */
export const LOOK_PARTS = Object.freeze({ body: 10, helmet: 10, suit: 6 });

/**
 * Is this a choice a player may make? It must have exactly a whole number
 * for each part, each from 0 up to one less than the length of its list.
 */
export function isLookChoice(choice) {
  if (choice === null || typeof choice !== "object" || Array.isArray(choice)) {
    return false;
  }
  return Object.keys(LOOK_PARTS).every(
    (part) => Number.isInteger(choice[part]) && choice[part] >= 0 && choice[part] < LOOK_PARTS[part],
  );
}

/**
 * A fresh copy of a choice with only the three numbers in it, or null if
 * the choice is not allowed. Anything extra that came with it is dropped.
 */
export function cleanLookChoice(choice) {
  if (!isLookChoice(choice)) {
    return null;
  }
  return { body: choice.body, helmet: choice.helmet, suit: choice.suit };
}
