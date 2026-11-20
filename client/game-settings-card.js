// The "Game settings" card, on the page.
//
// A card that comes up over the picture before a race: computer karts on or
// off, how good they are, and, in an online room, at most how many people.
// The same card is used on the three race pages (online, single race, two
// players), so the choice looks and works the same everywhere.
//
// What the card says is worked out in game-settings-view.js, and what a
// setting may be in shared/game-settings.js. Both have tests. This file only
// builds the buttons and listens to them, so it is checked by eye in a
// browser.
//
// Nothing is decided here. Pressing a button on the card only changes what
// the card shows. "Confirm game settings" hands the choice to the page: the
// online page sends it to the server (which obeys only the host), the other
// two pages remember it and start the race again.

import { cardWords, limitRow, computersRow, levelRow, CONFIRM_WORDS } from "./game-settings-view.js";
import { makePart } from "./page-parts.js";

/**
 * Builds the card inside the box with the id "settings-card" (an empty,
 * hidden box inside the picture's box).
 *   mode       "online", "single" or "double"
 *   onConfirm  called with { computers, level, most } when the player confirms
 * Gives:
 *   open({ settings, peopleHere, firstTime })  shows the card with these
 *        settings. "peopleHere" (online) is how many people are in the room
 *   setPeople(people)  online: tells the open card that this many people are here now
 *   close()    takes it away without changing anything
 *   isOpen()   is it up?
 */
export function createSettingsCard(page, { mode, onConfirm = () => {} }) {
  const veil = page.getElementById("settings-card");
  let open = false;
  let chosen = null; //     what the card shows now: { computers, level, most }
  let peopleHere = 1;
  let rows = null; //       the part of the card with the buttons, rebuilt after every press

  /** A row of the card: a name on the left, buttons on the right, a sentence under them. */
  function rowOf(name, buttons, hint, usable = true) {
    const row = makePart(page, "div", usable ? "settings-row" : "settings-row is-off");
    const group = makePart(page, "div", "settings-choices");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", name);
    group.append(...buttons);
    row.append(makePart(page, "span", "settings-name", name), group);
    if (hint !== "") {
      row.append(makePart(page, "p", "settings-hint", hint));
    }
    return row;
  }

  /** One button of a row. The one in use is "pressed" (for a screen reader too). */
  function choiceButton(words, pressed, allowed, onPick) {
    const button = makePart(page, "button", "settings-choice", words);
    button.type = "button";
    button.setAttribute("aria-pressed", String(pressed));
    button.disabled = !allowed;
    button.addEventListener("click", () => {
      onPick();
      showRows();
    });
    return button;
  }

  /** Builds the rows again from what is chosen now. The keyboard stays on the button that was pressed. */
  function showRows() {
    const focusedRow = rows === null ? -1 : [...rows.children].findIndex((row) => row.contains(page.activeElement));
    const focusedButton = focusedRow < 0 ? -1 : [...rows.children[focusedRow].querySelectorAll("button")].indexOf(page.activeElement);
    const built = [];

    if (mode === "online") {
      const limit = limitRow(chosen.most, peopleHere);
      built.push(
        rowOf(
          "Players",
          limit.choices.map(({ most, allowed, pressed }) =>
            choiceButton(String(most), pressed, allowed, () => {
              chosen = { ...chosen, most };
            }),
          ),
          limit.hint,
        ),
      );
    }

    const computers = computersRow(chosen.computers, mode);
    built.push(
      rowOf(
        "Computer karts",
        computers.choices.map(({ on, words, pressed }) =>
          choiceButton(words, pressed, true, () => {
            chosen = { ...chosen, computers: on };
          }),
        ),
        computers.hint,
      ),
    );

    const level = levelRow(chosen.level, chosen.computers);
    built.push(
      rowOf(
        "Their level",
        level.choices.map(({ level: each, words, pressed }) =>
          choiceButton(words, pressed, level.usable, () => {
            chosen = { ...chosen, level: each };
          }),
        ),
        "",
        level.usable,
      ),
    );

    rows.replaceChildren(...built);
    if (focusedRow >= 0 && focusedButton >= 0) {
      rows.children[focusedRow]?.querySelectorAll("button")[focusedButton]?.focus();
    }
  }

  function close() {
    if (!open) {
      return;
    }
    open = false;
    veil.hidden = true;
    veil.replaceChildren();
    rows = null;
    // Give the keyboard back to the page, so the arrow keys drive at once.
    if (page.activeElement instanceof page.defaultView.HTMLElement) {
      page.activeElement.blur();
    }
  }

  // Esc takes the card away without changing anything, wherever the keyboard is.
  page.addEventListener("keydown", (event) => {
    if (open && event.key === "Escape") {
      close();
    }
  });

  return {
    isOpen: () => open,
    close,

    /** Online: someone came or went while the card is up, so the limits that can be picked may have changed. */
    setPeople(people) {
      if (open && people !== peopleHere) {
        peopleHere = people;
        showRows();
      }
    },

    open({ settings, peopleHere: people = 1, firstTime = false }) {
      chosen = { ...settings };
      peopleHere = people;
      const words = cardWords(mode, firstTime);

      const card = makePart(page, "div", "settings-card");
      card.setAttribute("role", "dialog");
      card.setAttribute("aria-label", words.title);

      const closeButton = makePart(page, "button", "settings-close", "×");
      closeButton.type = "button";
      closeButton.setAttribute("aria-label", "Close without changing anything");
      closeButton.addEventListener("click", close);

      rows = makePart(page, "div", "settings-rows");
      const confirm = makePart(page, "button", "button button-primary button-wide settings-confirm", CONFIRM_WORDS);
      confirm.type = "button";
      confirm.addEventListener("click", () => {
        const wanted = { ...chosen };
        close();
        onConfirm(wanted);
      });

      if (words.badge !== "") {
        card.append(makePart(page, "p", "settings-badge", words.badge));
      }
      card.append(closeButton, makePart(page, "h2", "settings-title", words.title), makePart(page, "p", "settings-lead", words.lead), rows, confirm);
      veil.replaceChildren(card);
      showRows();
      veil.hidden = false;
      open = true;
      confirm.focus(); // so Enter confirms
    },
  };
}
