// The Settings panel of the menu, on the page.
//
// Today there is one setting that does something: the camera view a race
// starts in. The rules for what may be saved are in settings.js, which has
// tests. This file only connects them to the page, so it is checked by eye
// in a browser.

import { readSettings, saveStartView } from "./settings.js";
import { VIEWS } from "./camera.js";
import { VIEW_NAMES } from "./hud.js";
import { makePart } from "./page-parts.js";

/**
 * Connects the Settings button and panel.
 *   storage  this browser's storage, or null (see storage.js)
 */
export function connectSettings(page, storage) {
  const panel = page.getElementById("settings");
  const viewChoices = page.getElementById("view-choices");
  const status = page.getElementById("settings-status");

  page.getElementById("open-settings").addEventListener("click", () => {
    showSettings();
    panel.showModal();
    // Put the keyboard on the chosen camera view.
    viewChoices.querySelector("input:checked")?.focus();
  });

  /** Puts one round choice ("radio button") in the panel for each camera view, with the saved one ticked. */
  function showSettings() {
    const { startView } = readSettings(storage);
    viewChoices.replaceChildren();
    for (const view of VIEWS) {
      const label = makePart(page, "label");
      const choice = makePart(page, "input");
      choice.type = "radio";
      choice.name = "start-view";
      choice.value = view;
      choice.checked = view === startView;
      choice.addEventListener("change", () => chooseView(view));
      label.append(choice, VIEW_NAMES[view]);
      viewChoices.append(label);
    }
    status.textContent = storage
      ? ""
      : "This browser does not let the game keep settings, so races will start in the first view.";
  }

  function chooseView(view) {
    const saved = saveStartView(storage, view);
    status.textContent = saved
      ? `Saved. Races will start in the view "${VIEW_NAMES[view]}". V still changes it during a race.`
      : "This browser did not let the game save your choice.";
  }
}
