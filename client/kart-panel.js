// "Choose your character": the step between choosing a track and the race.
//
// The player picks Single race or Online, then a track (track-panel.js),
// and then this panel opens. It shows every character of shared/cast.js as
// their pilot standing beside their kart, helmet in hand, with their real
// face (pilot-shape.js). The chosen one is shown big, turning gently from
// side to side. The button at the bottom starts the race on the track that
// was picked.
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
import { readCharacter, saveCharacter, faceOf, lookOfCharacter, hairOf } from "./cast-choice.js";
import { paintPilotScene, viewerBehind } from "./kart-paint.js";
import { poseAt, chosenPose, cardPose, START_DANCING_SECONDS } from "./pilot-shape.js";
import { makePart } from "./page-parts.js";

// The cameras of the pictures: in front of the pilot, a little above.
const BIG_CAMERA = { kartScreenY: 206, kartScale: 7.4, horizonY: 30, depth: 900, viewAhead: 100 };
const SMALL_CAMERA = { kartScreenY: 136, kartScale: 4.3, horizonY: 20, depth: 900, viewAhead: 100 };
/** Moves the whole scene this many units to the left on the screen, so the kart is not cut off at the right. */
const SCENE_SHIFT = 2.6;

/** The pilot faces us. */
const FACING_US = Math.PI;
const SMALL_TURN = 0.2; // radians: the small pictures stand turned this far
const BIG_SWING = 0.35; //  radians: the big picture swings this far each way
const SECONDS_PER_SWING = 6;

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
  // painted yet: the face is plain until it arrives.
  const faces = new Map(
    CAST.map(({ id }) => {
      const picture = new Image();
      picture.src = faceOf(id); // one of our own pictures, from the list in shared/cast.js
      return [id, picture];
    }),
  );

  // Someone who asked their computer for less movement on screen gets still
  // pictures: no dance and no swinging, only the poses.
  const still = page.defaultView.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  let chosen = CAST[0].id;
  let chosenAt = 0; // when the chosen character was chosen, in milliseconds of the page's clock
  let cards = []; // [{ id, canvas, hovered, dancing }]: "dancing" goes from 0 to 1 and back
  let moving = false; // true while the panel is open and the pictures move
  let lastFrame = null;

  /** One card for each character: a round choice ("radio button"), the pilot beside the kart, and the name. */
  function showChoices() {
    choices.replaceChildren();
    cards = [];
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
      const card = { id, canvas, hovered: false, dancing: 0 };
      cards.push(card);
      // The pilot dances while the mouse is over the card, or the keyboard is on it.
      label.addEventListener("pointerenter", () => (card.hovered = true));
      label.addEventListener("pointerleave", () => (card.hovered = false));
      box.addEventListener("focus", () => (card.hovered = true));
      box.addEventListener("blur", () => (card.hovered = false));
      label.append(box, canvas, makePart(page, "span", "face-name", name));
      group.append(label);
    }
    choices.append(group);
  }

  function choose(id) {
    chosen = id;
    chosenAt = performance.now(); // the big pilot starts the little dance again
    const character = CAST.find((one) => one.id === id);
    bigCanvas.setAttribute("aria-label", `${character.name} standing beside their kart`);
    const saved = saveCharacter(storage, id);
    status.textContent = saved || storage === null ? "" : "This browser did not let the game save your choice.";
  }

  /** Paints every picture, moved on a little each time. */
  function paint(now) {
    const frameSeconds = lastFrame === null ? 0 : Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    const seconds = now / 1000;

    // The chosen one: a little dance, then the helmet goes down and the arms cross.
    const swing = still ? 0 : Math.sin((seconds * Math.PI * 2) / SECONDS_PER_SWING) * BIG_SWING;
    const bigPose = still ? poseAt("crossed", 0) : chosenPose((now - chosenAt) / 1000);
    paintOne(bigCanvas, BIG_CAMERA, chosen, FACING_US + swing, bigPose);

    cards.forEach((card, index) => {
      // Start or stop dancing smoothly, over a quarter of a second.
      const step = frameSeconds / START_DANCING_SECONDS;
      card.dancing = Math.min(Math.max(card.dancing + (card.hovered ? step : -step), 0), 1);
      const pose = still ? poseAt("hold", 0) : cardPose(seconds, card.dancing);
      // Half of them turned to the left, half to the right, so the grid looks lively.
      paintOne(card.canvas, SMALL_CAMERA, card.id, FACING_US + (index % 2 === 0 ? SMALL_TURN : -SMALL_TURN), pose);
    });
    if (moving) {
      requestAnimationFrame(paint);
    }
  }

  function paintOne(canvas, camera, id, turn, pose) {
    const context = canvas.getContext("2d");
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    const screen = { width: canvas.width, height: canvas.height };
    const viewer = viewerBehind({ ahead: 0, sideways: -SCENE_SHIFT }, turn, turn, camera, screen);
    paintPilotScene(context, viewer, { look: lookOfCharacter(id), hair: hairOf(id), face: faces.get(id), pose });
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
        lastFrame = null;
        requestAnimationFrame(paint);
      }
    },
  };
}
