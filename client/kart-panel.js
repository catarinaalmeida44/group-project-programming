// "Choose your character": the step between choosing a track and the race.
//
// The player picks Single race or Online, then a track (track-panel.js),
// and then this panel opens. At the top is a poster of the chosen one, in
// the colour of their kart: on the left the pilot, big, beside their kart,
// dancing and then crossing arms, round and round; on the right their
// number, their name, the name of their dance ("Signature move") and the
// button that starts the race on the track that was picked. Moving the mouse over someone in the line-up puts them on the
// poster to look at; a click chooses them. Under
// the poster is the line-up: a tile for each character of shared/cast.js,
// the pilot standing, with the person's own head (pilot-shape.js). When the
// mouse passes over a tile, that pilot does their own dance.
//
// The faces are only shown here and on the podium. In the race every pilot
// wears a helmet.
//
// Which characters there are and how the choice is remembered is in
// cast-choice.js, and how the pilots move is in pilot-shape.js. Both have
// tests. This file only connects them to the page, so it is checked by eye
// in a browser.
//
// History: from 12 November the menu had "Your kart", to pick the colours
// of the kart, the helmet and the suit. On 17 November that became "Your
// character", a button at the top of the menu, and later the same day,
// after Pedro tried it, a step of its own before each race. Until 18
// November each card also had the person's photo beside the pilot. Catarina
// asked for the pilots alone, in a tidier layout: the photos are no longer
// shown anywhere.

import { CAST } from "../shared/cast.js";
import {
  readCharacter,
  saveCharacter,
  readSecondCharacter,
  saveSecondCharacter,
  firstOther,
  headOf,
  lookOfCharacter,
  hairOf,
  longHairOf,
  danceOf,
  danceNameOf,
} from "./cast-choice.js";
import { paintPilotScene, viewerBehind } from "./kart-paint.js";
import { poseAt, chosenPose, cardPose } from "./pilot-shape.js";
import { makePart } from "./page-parts.js";

// How big the pictures are, in the units the cameras below count in.
const BIG_SIZE = { width: 360, height: 300 };
const TILE_SIZE = { width: 120, height: 150 };
/** Each picture is painted with this many dots for every unit, so that it stays sharp when the page shows it large. */
const SHARP = 2;

// The cameras of the pictures: in front of the pilot, a little above.
const BIG_CAMERA = { kartScreenY: 256, kartScale: 7.3, horizonY: 36, depth: 900, viewAhead: 100 };
const TILE_CAMERA = { kartScreenY: 142, kartScale: 4.55, horizonY: 30, depth: 900, viewAhead: 100 };
/** Moves the big scene this many units to the left on the screen, so the kart is not cut off at the right. */
const SCENE_SHIFT = 2.6;

/** The pilot faces us. */
const FACING_US = Math.PI;
const BIG_SWING = 0.3; // radians: the big picture swings this far each way
const SECONDS_PER_SWING = 7;
/** How long a pilot takes to start or stop dancing when the mouse arrives or leaves, in seconds. */
const START_DANCING_SECONDS = 0.3;

/** Loads a picture once. A picture still loading is simply not painted yet. */
function picture(address) {
  const image = new Image();
  image.src = address; // one of our own pictures, from the list in shared/cast.js
  return image;
}

/**
 * Connects the "Choose your character" panel.
 *   storage  this browser's storage, or null (see storage.js)
 * Gives { open(address, goWord, trackName, options) }: opens the panel for a
 * race at that address (from track-list.js), with "goWord" on the button.
 * "options" are for the two-player race, where the step comes twice
 * (track-panel.js), and can all be left out:
 *   title   the title of the panel, instead of "Choose your character"
 *   lead    the small line above the name, instead of "Your driver for ..."
 *   second  true: this is the second driver. Their choice is remembered
 *           apart from the first driver's (cast-choice.js)
 *   taken   the id of a character that cannot be chosen: the other driver's
 *   onGo    called when the button is pressed, instead of going to the race
 */
export function connectCharacterChoice(page, storage) {
  const panel = page.getElementById("your-kart");
  const choices = page.getElementById("kart-choices");
  const status = page.getElementById("kart-status");
  const lead = page.getElementById("character-lead");
  const go = page.getElementById("character-go");
  const nameLine = page.getElementById("character-name");
  const hero = page.getElementById("character-hero");
  const numberLine = page.getElementById("character-number");
  const moveLine = page.getElementById("character-move");
  const titleLine = page.getElementById("your-kart-title");
  const usualTitle = titleLine.textContent;
  let second = false; //  choosing for the second driver of a two-player race
  let taken = null; //    the character the other driver has, or null
  let onGo = null; //     what the button does instead of going to the race, or null

  // The button is a link to the race. In the first of the two steps of a
  // two-player race it opens the second step instead.
  go.addEventListener("click", (event) => {
    if (onGo !== null) {
      event.preventDefault();
      onGo();
    }
  });

  const bigCanvas = makePart(page, "canvas", "kart-preview");
  bigCanvas.width = BIG_SIZE.width * SHARP;
  bigCanvas.height = BIG_SIZE.height * SHARP;
  bigCanvas.setAttribute("role", "img");
  page.getElementById("kart-preview-place").append(bigCanvas);

  const heads = new Map(CAST.map(({ id }) => [id, picture(headOf(id))]));

  // Someone who asked their computer for less movement on screen gets still
  // pictures: no dance and no swinging.
  const still = page.defaultView.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  let chosen = CAST[0].id;
  let shown = null; // who is on the poster: the chosen one, or the one the mouse is over
  let shownAt = 0; // since when, in milliseconds of the page's clock
  let cards = []; // [{ id, canvas, hovered, dancing }]: "dancing" goes from 0 to 1 and back
  let moving = false; // true while the panel is open and the pictures move
  let lastFrame = null;

  /**
   * One tile for each character: a round choice ("radio button"), the
   * pilot standing on a floor in the colour of their kart, and the name.
   */
  function showChoices() {
    choices.replaceChildren();
    cards = [];
    const group = makePart(page, "fieldset", "faces");
    group.append(makePart(page, "legend", "visually-hidden", "Characters"));
    for (const { id, name } of CAST) {
      const isTaken = id === taken; // the other driver is this character already
      const label = makePart(page, "label", isTaken ? "face is-taken" : "face");
      label.style.setProperty("--tint", lookOfCharacter(id).body); // style.css mixes it into the floor
      const box = makePart(page, "input");
      box.type = "radio";
      box.name = "character";
      box.value = id;
      box.checked = chosen === id;
      box.disabled = isTaken;
      box.addEventListener("change", () => choose(id));

      const canvas = makePart(page, "canvas", "face-pilot");
      canvas.width = TILE_SIZE.width * SHARP;
      canvas.height = TILE_SIZE.height * SHARP;
      canvas.setAttribute("aria-hidden", "true"); // the name under it says who it is

      const card = { id, canvas, hovered: false, dancing: 0 };
      cards.push(card);
      // The pilot dances while the mouse is over the tile, or the keyboard is on it.
      // While it is there, that pilot is also the one on the poster. When
      // it leaves, the poster shows the chosen one again.
      const arrive = () => {
        card.hovered = true;
        showOnPoster(id);
      };
      const leave = () => {
        card.hovered = false;
        showOnPoster(chosen);
      };
      label.addEventListener("pointerenter", arrive);
      label.addEventListener("pointerleave", leave);
      box.addEventListener("focus", arrive);
      box.addEventListener("blur", leave);
      label.append(box, canvas, makePart(page, "span", "face-name", isTaken ? `${name} (player 1)` : name));
      group.append(label);
    }
    choices.append(group);
  }

  /**
   * Puts a character on the poster: their name, their number, and the
   * colours of their kart. The big picture follows by itself, and their
   * dance starts from the beginning. Looking is not choosing: nothing is
   * saved here.
   */
  function showOnPoster(id) {
    if (shown === id) {
      return;
    }
    shown = id;
    shownAt = performance.now();
    const character = CAST.find((one) => one.id === id);
    bigCanvas.setAttribute("aria-label", `${character.name} dancing beside their kart`);
    nameLine.textContent = character.name; // as text, never as HTML
    // The poster takes the colours of their kart (style.css mixes them in).
    const look = lookOfCharacter(id);
    hero.style.setProperty("--tint", look.body);
    hero.style.setProperty("--tint-two", look.helmet);
    numberLine.textContent = String(CAST.indexOf(character) + 1).padStart(2, "0"); // their place in the cast, as a race number
    moveLine.textContent = danceNameOf(id);
  }

  function choose(id) {
    chosen = id;
    shown = null; // so that the poster starts again, even if it showed this one already
    showOnPoster(id);
    const saved = (second ? saveSecondCharacter : saveCharacter)(storage, id);
    status.textContent = saved || storage === null ? "" : "This browser did not let the game save your choice.";
  }

  /** Paints every picture, moved on a little each time. */
  function paint(now) {
    const frameSeconds = lastFrame === null ? 0 : Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    const seconds = now / 1000;

    // The chosen one, beside their kart: their dance, then arms crossed, round and round.
    const swing = still ? 0 : Math.sin((seconds * Math.PI * 2) / SECONDS_PER_SWING) * BIG_SWING;
    const bigPose = still ? poseAt("crossed", 0) : chosenPose(danceOf(shown), (now - shownAt) / 1000);
    paintOne(bigCanvas, BIG_SIZE, BIG_CAMERA, shown, FACING_US + swing, bigPose, true);

    for (const card of cards) {
      // Start or stop dancing smoothly.
      const step = frameSeconds / START_DANCING_SECONDS;
      card.dancing = Math.min(Math.max(card.dancing + (card.hovered ? step : -step), 0), 1);
      const pose = still ? poseAt("stand", 0) : cardPose(danceOf(card.id), seconds, card.dancing);
      paintOne(card.canvas, TILE_SIZE, TILE_CAMERA, card.id, FACING_US, pose, false);
    }
    if (moving) {
      requestAnimationFrame(paint);
    }
  }

  function paintOne(canvas, screen, camera, id, turn, pose, withKart) {
    const context = canvas.getContext("2d");
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(SHARP, 0, 0, SHARP, 0, 0); // every unit of the picture is SHARP dots
    const viewer = viewerBehind({ ahead: 0, sideways: withKart ? -SCENE_SHIFT : 0 }, turn, turn, camera, screen);
    paintPilotScene(context, viewer, {
      look: lookOfCharacter(id),
      hair: hairOf(id),
      longHair: longHairOf(id),
      head: heads.get(id),
      pose,
      withKart,
    });
  }

  panel.addEventListener("close", () => {
    moving = false;
  });

  return {
    open(address, goWord, trackName, options = {}) {
      second = options.second === true;
      taken = options.taken ?? null;
      onGo = typeof options.onGo === "function" ? options.onGo : null;
      titleLine.textContent = options.title ?? usualTitle; // as text, never as HTML
      const remembered = (second ? readSecondCharacter : readCharacter)(storage)?.id ?? CAST[0].id;
      chosen = remembered === taken ? firstOther(CAST, taken).id : remembered;
      showChoices();
      choose(chosen);
      lead.textContent = options.lead ?? `Your driver for ${trackName}`; // as text, never as HTML
      go.textContent = goWord;
      go.href = address;
      if (storage === null) {
        status.textContent = "This browser does not let the game keep your choice, so it lasts until you close this page.";
      }
      if (!panel.open) {
        panel.showModal(); // in the second step of a two-player race it is open already
      }
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
