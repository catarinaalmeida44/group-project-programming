// The "Your kart" panel of the menu, on the page.
//
// The player picks a colour for the kart, the helmet and the suit, and sees
// the kart turn round in a small picture while choosing. Which choices are
// allowed, what they look like and how they are remembered is in
// kart-choice.js, which has tests. This file only connects that to the
// page, so it is checked by eye in a browser.

import { COLOURS, PARTS, PART_NAMES, FIRST_CHOICE, lookFromChoice, readChoice, saveChoice } from "./kart-choice.js";
import { paintKart, viewerBehind } from "./kart-paint.js";
import { makePart } from "./page-parts.js";

// The camera of the small picture: close to the kart, looking down a little.
const PREVIEW_CAMERA = { kartScreenY: 150, kartScale: 9.5, horizonY: -70, depth: 900, viewAhead: 100 };
/** How long the kart takes to turn round once in the picture, in seconds. */
const SECONDS_PER_TURN = 7;

/**
 * Connects the "Your kart" button and panel.
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
  canvas.setAttribute("aria-label", "Your kart, turning round, in the colours you chose");
  page.getElementById("kart-preview-place").append(canvas);
  const context = canvas.getContext("2d");
  const screen = { width: canvas.width, height: canvas.height };
  let choice = { ...FIRST_CHOICE };
  let turning = false; // true while the panel is open and the picture is moving

  page.getElementById("open-kart").addEventListener("click", () => {
    choice = readChoice(storage) ?? { ...FIRST_CHOICE };
    showChoices();
    status.textContent = storage ? "" : "This browser does not let the game keep your choice, so it lasts until you close this page.";
    panel.showModal();
    if (!turning) {
      turning = true;
      requestAnimationFrame(paint);
    }
  });
  panel.addEventListener("close", () => {
    turning = false;
  });

  /** One round choice ("radio button") for every colour of every part, with the chosen ones ticked. */
  function showChoices() {
    choices.replaceChildren();
    for (const part of PARTS) {
      const group = makePart(page, "fieldset");
      group.append(makePart(page, "legend", "", PART_NAMES[part]));
      const row = makePart(page, "div", "swatches");
      COLOURS[part].forEach(({ name, colour }, number) => {
        const label = makePart(page, "label", "swatch");
        const box = makePart(page, "input");
        box.type = "radio";
        box.name = `kart-${part}`;
        box.value = String(number);
        box.checked = choice[part] === number;
        box.addEventListener("change", () => choose(part, number));
        const dot = makePart(page, "span", "swatch-colour");
        dot.style.backgroundColor = colour; // one of our own colours, from the list in kart-choice.js
        label.append(box, dot, makePart(page, "span", "visually-hidden", name));
        row.append(label);
      });
      group.append(row);
      choices.append(group);
    }
  }

  function choose(part, number) {
    choice = { ...choice, [part]: number };
    const saved = saveChoice(storage, choice);
    status.textContent = saved
      ? "Saved. This is your kart in your next race."
      : "This browser did not let the game save your choice.";
  }

  /** Paints the kart in the small picture, turned a little further every time. */
  function paint(now) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, screen.width, screen.height);
    const turn = ((now / 1000) * Math.PI * 2) / SECONDS_PER_TURN;
    const look = lookFromChoice(choice);
    if (look !== null) {
      paintKart(context, viewerBehind({ ahead: 0, sideways: 0 }, turn, turn, PREVIEW_CAMERA, screen), look, Math.sin(now / 900));
    }
    if (turning) {
      requestAnimationFrame(paint);
    }
  }
}
