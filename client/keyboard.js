// The keyboard: which keys are held down right now.
//
// The driving rules do not know about keyboards. They only want four
// yes-or-no answers: gas, brake, left, right. This file turns the arrow
// keys into those four answers.

const DRIVING_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

/** Turns a set of held-down keys into what the driving rules expect. */
export function inputFromKeys(heldKeys) {
  return {
    gas: heldKeys.has("ArrowUp"),
    brake: heldKeys.has("ArrowDown"),
    left: heldKeys.has("ArrowLeft"),
    right: heldKeys.has("ArrowRight"),
  };
}

/**
 * Starts listening to the keyboard.
 *   target     what to listen on (the browser window)
 *   onRestart  what to do when R is pressed
 *   onDrive    what to do each time a driving key goes down. The game uses
 *              it to start the clock at the very first key press, however
 *              short that press is
 * Gives back two questions the game can ask at any moment:
 *   input()      which driving keys are held
 *   isDriving()  is at least one driving key held
 */
export function createKeyboard(target, onRestart, onDrive = () => {}) {
  const heldKeys = new Set();

  target.addEventListener("keydown", (event) => {
    if (typeof event.key !== "string") {
      return; // not a real key press
    }
    if (DRIVING_KEYS.includes(event.key)) {
      heldKeys.add(event.key);
      event.preventDefault(); // stop the arrow keys from scrolling the page
      onDrive();
    } else if (event.key.toLowerCase() === "r" && !event.repeat) {
      onRestart();
    }
  });

  target.addEventListener("keyup", (event) => {
    heldKeys.delete(event.key);
  });

  // If the player switches to another window while holding a key, the
  // browser never tells us the key was released. Forget all keys instead,
  // so the kart does not keep driving by itself.
  target.addEventListener("blur", () => {
    heldKeys.clear();
  });

  return {
    input: () => inputFromKeys(heldKeys),
    isDriving: () => heldKeys.size > 0,
  };
}
