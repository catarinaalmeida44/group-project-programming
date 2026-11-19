// The keyboard: which keys are held down right now.
//
// The driving rules do not know about keyboards. They only want four
// yes-or-no answers: gas, brake, left, right. This file turns the arrow
// keys into those four answers. It also listens for six other keys:
// R (start again), V (change the camera view), M (sound off or on), F (full
// screen on or off), L (online: the connection meter on or off) and Enter
// (online: start a race).

//
// In a two-player race (double.js) two people share one keyboard. One drives
// with W, A, S and D, which lie in the same shape as the arrow keys on the
// left side of the keyboard; the other drives with the arrows. The letters
// only count as driving keys on that page: everywhere else they do nothing.

const DRIVING_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

/** The driving keys on the left of the keyboard, for the two-player race: W gas, S brake, A left, D right. */
export const LETTER_DRIVING_KEYS = ["w", "a", "s", "d"];

/** Turns a set of held-down keys into what the driving rules expect. */
export function inputFromKeys(heldKeys) {
  return {
    gas: heldKeys.has("ArrowUp"),
    brake: heldKeys.has("ArrowDown"),
    left: heldKeys.has("ArrowLeft"),
    right: heldKeys.has("ArrowRight"),
  };
}

/** The same for the player who drives with W, A, S and D. The letters are kept in small type, so Caps Lock makes no difference. */
export function inputFromLetterKeys(heldKeys) {
  return {
    gas: heldKeys.has("w"),
    brake: heldKeys.has("s"),
    left: heldKeys.has("a"),
    right: heldKeys.has("d"),
  };
}

const doNothing = () => {};

/**
 * Starts listening to the keyboard.
 *   target   what to listen on (the browser window)
 *   actions  what the game wants done when certain keys go down:
 *     onRestart  R was pressed
 *     onView     V was pressed
 *     onSound    M was pressed: switch the sound off or on
 *     onFullScreen  F was pressed: the game on the whole screen, or back
 *     onMeter    L was pressed. The online page uses it to show or hide
 *                its connection meter ("L" as in lag)
 *     onStart    Enter was pressed. The online page uses it to ask the
 *                server for a race start
 *     onDrive    a driving key went down. The game uses it to start the
 *                countdown at the very first key press, however short it is.
 *                It is told which key ("ArrowLeft" ...), and whether this is
 *                the key being held down (true) or a fresh press (false)
 *   options  { twoPlayers: true } on the two-player page: W, A, S and D are
 *            driving keys too, for the second driver. Left out, they are not
 * Gives back questions the game can ask at any moment:
 *   input()        which driving keys are held (the arrows)
 *   letterInput()  which of W, A, S and D are held. Always none unless
 *                  "twoPlayers" was asked for
 *   isDriving()    is at least one driving key held
 */
export function createKeyboard(target, actions = {}, options = {}) {
  const twoPlayers = options?.twoPlayers === true;
  const {
    onRestart = doNothing,
    onView = doNothing,
    onDrive = doNothing,
    onStart = doNothing,
    onSound = doNothing,
    onFullScreen = doNothing,
    onMeter = doNothing,
  } = actions;
  const heldKeys = new Set();

  target.addEventListener("keydown", (event) => {
    if (typeof event.key !== "string") {
      return; // not a real key press
    }
    if (DRIVING_KEYS.includes(event.key)) {
      heldKeys.add(event.key);
      event.preventDefault(); // stop the arrow keys from scrolling the page
      onDrive(event.key, event.repeat === true);
      return;
    }
    const letter = event.key.toLowerCase();
    // Two players: W, A, S and D drive. Not together with Ctrl, Cmd or Alt:
    // Ctrl+S, Ctrl+W and the like belong to the browser.
    if (twoPlayers && LETTER_DRIVING_KEYS.includes(letter) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      heldKeys.add(letter);
      onDrive(letter, event.repeat === true);
      return;
    }
    if (event.repeat) {
      return; // a letter key that is being held down: act only on the first press
    }
    if (letter === "r") {
      onRestart();
    } else if (letter === "v") {
      onView();
    } else if (letter === "m") {
      onSound();
    } else if (letter === "f" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      onFullScreen(); // not Ctrl+F or Cmd+F: that is the browser's "find on this page"
    } else if (letter === "l" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      onMeter(); // not Ctrl+L or Cmd+L: that puts the keyboard in the browser's address bar
    } else if (event.key === "Enter") {
      onStart();
    }
  });

  target.addEventListener("keyup", (event) => {
    heldKeys.delete(event.key);
    if (typeof event.key === "string") {
      heldKeys.delete(event.key.toLowerCase()); // "W" with Caps Lock or Shift is the same key as "w"
    }
  });

  // If the player switches to another window while holding a key, the
  // browser never tells us the key was released. Forget all keys instead,
  // so the kart does not keep driving by itself.
  target.addEventListener("blur", () => {
    heldKeys.clear();
  });

  return {
    input: () => inputFromKeys(heldKeys),
    letterInput: () => inputFromLetterKeys(heldKeys),
    isDriving: () => heldKeys.size > 0,
  };
}
