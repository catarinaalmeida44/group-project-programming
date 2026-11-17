// The "Your character" panel of the menu, on the page.
//
// The player picks one of the characters of shared/cast.js by their face,
// and sees that character's kart turn round in a small picture. Which
// characters there are, their faces and colours, and how the choice is
// remembered is in cast-choice.js, which has tests. This file only connects
// that to the page, so it is checked by eye in a browser.
//
// Until 17 November 2026 this panel let a player choose the colours of the
// kart, the helmet and the suit one by one. Now each character has its own
// colours, so those choices are gone from the page. A colour choice saved
// before still counts for a player who has not chosen a character yet.

import { CAST } from "../shared/cast.js";
import { FIRST_CHOICE, lookFromChoice, readChoice } from "./kart-choice.js";
import { readCharacter, saveCharacter, faceOf, lookOfCharacter } from "./cast-choice.js";
import { paintKart, viewerBehind } from "./kart-paint.js";
import { makePart } from "./page-parts.js";

// The camera of the small picture: close to the kart, looking down a little.
const PREVIEW_CAMERA = { kartScreenY: 150, kartScale: 9.5, horizonY: -70, depth: 900, viewAhead: 100 };
/** How long the kart takes to turn round once in the picture, in seconds. */
const SECONDS_PER_TURN = 7;

/**
 * Connects the "Your character" button and panel.
 *   storage  this browser's storage, or null (see storage.js)
 */
export function connectKartChoice(page, storage) {
  const panel = page.getElementById("your-kart");
  const choices = page.getElementById("kart-choices");
  const status = page.getElementById("kart-status");
  // The small picture is made here and not written into the page, so that
  // the menu page itself stays free of anything that looks like the race.
  const canvas = makePart(page, "canvas", "kart-preview");
  canvas.width = 320;
  canvas.height = 230;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "The kart of the character you chose, turning round");
  page.getElementById("kart-preview-place").append(canvas);
  const context = canvas.getContext("2d");
  const screen = { width: canvas.width, height: canvas.height };
  let chosen = null; // the id of the chosen character, or null
  let turning = false; // true while the panel is open and the picture is moving

  page.getElementById("open-kart").addEventListener("click", () => {
    chosen = readCharacter(storage)?.id ?? null;
    showChoices();
    status.textContent = storage
      ? chosen === null
        ? "Choose who you want to be."
        : ""
      : "This browser does not let the game keep your choice, so it lasts until you close this page.";
    panel.showModal();
    if (!turning) {
      turning = true;
      requestAnimationFrame(paint);
    }
  });
  panel.addEventListener("close", () => {
    turning = false;
  });

  /** One round choice ("radio button") for every character, shown as its face and name. */
  function showChoices() {
    choices.replaceChildren();
    const group = makePart(page, "fieldset", "faces");
    group.append(makePart(page, "legend", "visually-hidden", "Characters"));
    for (const { id, name } of CAST) {
      const label = makePart(page, "label", "face");
      const box = makePart(page, "input");
      box.type = "radio";
      box.name = "character";
      box.value = id;
      box.checked = chosen === id;
      box.addEventListener("change", () => choose(id, name));
      const picture = makePart(page, "img", "face-picture");
      picture.src = faceOf(id); // one of our own pictures, from the list in shared/cast.js
      picture.alt = ""; // the name is written right under it
      picture.width = 96;
      picture.height = 96;
      label.append(box, picture, makePart(page, "span", "face-name", name));
      group.append(label);
    }
    choices.append(group);
  }

  function choose(id, name) {
    chosen = id;
    const saved = saveCharacter(storage, id);
    status.textContent = saved
      ? `Saved. You are ${name} in your next race.`
      : "This browser did not let the game save your choice.";
  }

  /** The colours to paint: the chosen character's, or else the colours chosen before characters existed. */
  function lookToShow() {
    return lookOfCharacter(chosen) ?? lookFromChoice(readChoice(storage) ?? FIRST_CHOICE);
  }

  /** Paints the kart in the small picture, turned a little further every time. */
  function paint(now) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, screen.width, screen.height);
    const turn = ((now / 1000) * Math.PI * 2) / SECONDS_PER_TURN;
    paintKart(context, viewerBehind({ ahead: 0, sideways: 0 }, turn, turn, PREVIEW_CAMERA, screen), lookToShow(), Math.sin(now / 900));
    if (turning) {
      requestAnimationFrame(paint);
    }
  }
}
