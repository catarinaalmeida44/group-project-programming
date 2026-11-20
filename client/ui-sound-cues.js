// Which clicks make the click sound (ui-sound.js). Only a rule, so it is
// tested (tests/audio-switches.test.js).
//
// A click sounds on a button, on a link drawn as a button, and on a round
// choice or a tick box: the things a player presses. Not on plain text, not
// on a picture, and not on a link inside a sentence. A click inside a button
// (on its picture or its words) counts as a click on the button. A click on
// the words beside a choice (its label) makes no sound by itself: the
// browser then clicks the choice too, and that one sounds, so it is heard once.

/** Does a click on this part of the page make the click sound? */
export function makesClick(target) {
  const part = target?.closest?.('button, a.button, input[type="radio"], input[type="checkbox"]') ?? null;
  if (part === null) {
    return false;
  }
  if (part.disabled === true) {
    return false; // a button that does nothing makes no sound either
  }
  return true;
}

/**
 * Online: is the room ready for the hype? Yes when no race is on yet, at
 * least two people are in it, and every one of them has a character. One
 * person alone gets no hype: there is nobody to be hyped with.
 *   phase  the room's phase ("open" before a race)
 *   karts  the karts of the room's newest update, each maybe with "character"
 */
export function roomReady(phase, karts) {
  if (phase !== "open" || !Array.isArray(karts) || karts.length < 2) {
    return false;
  }
  return karts.every((kart) => typeof kart?.character === "string" && kart.character !== "");
}
