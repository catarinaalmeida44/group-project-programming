// The main menu (index.html).
//
// Single race and Online are plain links to other pages, so they need no
// code. This file opens the Settings panel and fills it in.
//
// The rules for what may be saved are in settings.js, which has tests. This
// file only connects them to the page, so it is checked by eye in a browser.

import { storageOf } from "./storage.js";
import { readSettings, saveStartView } from "./settings.js";
import { VIEWS } from "./camera.js";
import { VIEW_NAMES } from "./hud.js";

const storage = storageOf(window);

// ---- Settings ----

const settingsPanel = document.getElementById("settings");
const viewChoices = document.getElementById("view-choices");
const settingsStatus = document.getElementById("settings-status");

document.getElementById("open-settings").addEventListener("click", () => {
  showSettings();
  settingsPanel.showModal();
});

/** Puts one round choice ("radio button") in the panel for each camera view, with the saved one ticked. */
function showSettings() {
  const { startView } = readSettings(storage);
  viewChoices.replaceChildren();
  for (const view of VIEWS) {
    const label = document.createElement("label");
    const choice = document.createElement("input");
    choice.type = "radio";
    choice.name = "start-view";
    choice.value = view;
    choice.checked = view === startView;
    choice.addEventListener("change", () => chooseView(view));
    label.append(choice, ` ${VIEW_NAMES[view]}`);
    viewChoices.append(label);
  }
  settingsStatus.textContent = storage
    ? ""
    : "This browser does not let the game keep settings, so races will start in the first view.";
}

function chooseView(view) {
  const saved = saveStartView(storage, view);
  settingsStatus.textContent = saved
    ? `Saved. Races will start in the view "${VIEW_NAMES[view]}". V still changes it during a race.`
    : "This browser did not let the game save your choice.";
}
