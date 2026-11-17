// "Choose your character": the step between choosing a track and the race.
//
// The player picks Single race or Online, then a track (track-panel.js),
// and then this panel opens. It shows every character of shared/cast.js as
// their pilot in their kart, with their real face on the pilot's head
// (face-head.js). The chosen one is shown big, turning from side to side.
// The button at the bottom starts the race on the track that was picked.
//
// The faces are only shown here (and later on the podium). In the race
// every pilot wears a helmet.
//
// Which characters there are and how the choice is remembered is in
// cast-choice.js, which has tests. This file only connects that to the
// page, so it is checked by eye in a browser.
//
// History: from 12 November the menu had "Your kart", to pick the colours
// of the kart, the helmet and the suit. On 17 November that became "Your
// character", a button at the top of the menu. Later the same day, after
// Pedro tried it, the character became a step of its own, for each race.

import { CAST } from "../shared/cast.js";
import { readCharacter, saveCharacter, faceOf, lookOfCharacter } from "./cast-choice.js";
import { paintKart, viewerBehind } from "./kart-paint.js";
import { makePart } from "./page-parts.js";

// The cameras of the pictures: in front of the kart and a little above it,
// far enough back that the big head fits in.
const BIG_CAMERA = { kartScreenY: 205, kartScale: 7.2, horizonY: -60, depth: 900, viewAhead: 100 };
const SMALL_CAMERA = { kartScreenY: 140, kartScale: 5.8, horizonY: -50, depth: 900, viewAhead: 100 };

/** The kart faces us, turned a little to one side, so the face and the kart can both be seen. */
const FACING_US = Math.PI;
const SMALL_TURN = 0.55; // radians: the small pictures stand turned this far
const BIG_SWING = 0.7; //   radians: the big picture swings this far each way
const SECONDS_PER_SWING = 5;

/**
 * Connects the "Choose your character" panel.
 *   storage  this browser's storage, or null (see storage.js)
 * Gives { open(address, goWord, trackName) }: opens the panel for a race
 * at that address (from track-list.js), with "goWord" on the button.
 */
export function connectCharacterChoice(page, storage) {
  const panel = page.getElementById("your-kart");
  const choices = page.getElementById("kart-choices");
  const status = page.getElementById("kart-status");
  const lead = page.getElementById("character-lead");
  const go = page.getElementById("character-go");

  const bigCanvas = makePart(page, "canvas", "kart-preview");
  bigCanvas.width = 320;
  bigCanvas.height = 230;
  bigCanvas.setAttribute("role", "img");
  page.getElementById("kart-preview-place").append(bigCanvas);

  // The face pictures, loaded once. A picture still loading is simply not
  // painted yet: the pilot wears the helmet until it arrives.
  const faces = new Map(
    CAST.map(({ id }) => {
      const picture = new Image();
      picture.src = faceOf(id); // one of our own pictures, from the list in shared/cast.js
      return [id, picture];
    }),
  );

  let chosen = CAST[0].id;
  let smallCanvases = []; // [{ id, canvas }]
  let moving = false; // true while the panel is open and the pictures move

  /** One card for each character: a round choice ("radio button"), the pilot in the kart, and the name. */
  function showChoices() {
    choices.replaceChildren();
    smallCanvases = [];
    const group = makePart(page, "fieldset", "faces");
    group.append(makePart(page, "legend", "visually-hidden", "Characters"));
    for (const { id, name } of CAST) {
      const label = makePart(page, "label", "face");
      const box = makePart(page, "input");
      box.type = "radio";
      box.name = "character";
      box.value = id;
      box.checked = chosen === id;
      box.addEventListener("change", () => choose(id));
      const canvas = makePart(page, "canvas", "face-kart");
      canvas.width = 160;
      canvas.height = 150;
      canvas.setAttribute("aria-hidden", "true"); // the name under it says who it is
      smallCanvases.push({ id, canvas });
      label.append(box, canvas, makePart(page, "span", "face-name", name));
      group.append(label);
    }
    choices.append(group);
  }

  function choose(id) {
    chosen = id;
    const character = CAST.find((one) => one.id === id);
    bigCanvas.setAttribute("aria-label", `${character.name} in their kart`);
    const saved = saveCharacter(storage, id);
    status.textContent = saved || storage === null ? "" : "This browser did not let the game save your choice.";
  }

  /** Paints every picture, moved on a little each time. */
  function paint(now) {
    const swing = Math.sin(((now / 1000) * Math.PI * 2) / SECONDS_PER_SWING) * BIG_SWING;
    paintOne(bigCanvas, BIG_CAMERA, chosen, FACING_US + swing);
    smallCanvases.forEach(({ id, canvas }, index) => {
      // Half of them turned to the left, half to the right, so the grid looks lively.
      paintOne(canvas, SMALL_CAMERA, id, FACING_US + (index % 2 === 0 ? SMALL_TURN : -SMALL_TURN));
    });
    if (moving) {
      requestAnimationFrame(paint);
    }
  }

  function paintOne(canvas, camera, id, turn) {
    const context = canvas.getContext("2d");
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    const screen = { width: canvas.width, height: canvas.height };
    paintKart(context, viewerBehind({ ahead: 0, sideways: 0 }, turn, turn, camera, screen), lookOfCharacter(id), 0, faces.get(id));
  }

  panel.addEventListener("close", () => {
    moving = false;
  });

  return {
    open(address, goWord, trackName) {
      chosen = readCharacter(storage)?.id ?? CAST[0].id;
      showChoices();
      choose(chosen);
      lead.textContent = `Who do you want to be on ${trackName}?`; // as text, never as HTML
      go.textContent = goWord;
      go.href = address;
      if (storage === null) {
        status.textContent = "This browser does not let the game keep your choice, so it lasts until you close this page.";
      }
      panel.showModal();
      // Put the keyboard on the chosen character, so the arrow keys move between them.
      choices.querySelector("input:checked")?.focus();
      if (!moving) {
        moving = true;
        requestAnimationFrame(paint);
      }
    },
  };
}
