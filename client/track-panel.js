// The "Choose a track" panel of the menu: one card for each track.
//
// The same panel is used for a single race, for an online race and for a
// two-player race. Only the words and the page the cards lead to are different. What a card says is
// worked out in track-list.js, and the small map on it is painted by
// mini-map.js. This file only builds the cards on the page and opens the
// panel, so it is checked by eye in a browser.

import { trackCards, TRACK_CHOICE_KINDS } from "./track-list.js";
import { CAST } from "../shared/cast.js";
import { readCharacter } from "./cast-choice.js";
import { paintMiniMap } from "./mini-map.js";
import { makePart } from "./page-parts.js";

/**
 * Fills the panel for one kind of race.
 *   kind     "single", "online" or "double" (see TRACK_CHOICE_KINDS in track-list.js)
 *   cards    from trackCards() in track-list.js, made for the same kind
 *   onPick   called with the card when one is clicked, instead of following
 *            its link: the menu then lets the player choose a character
 *            (kart-panel.js). Left out, a card simply opens its race.
 * A card is one big link to the race on that track, so it still works if
 * the code that opens the next step did not load.
 */
export function showTrackChoice(page, kind, cards, onPick = null) {
  const words = TRACK_CHOICE_KINDS[kind];
  page.getElementById("track-choice-title").textContent = words.title;
  page.getElementById("track-choice-lead").textContent = words.lead;

  const list = page.getElementById("track-cards");
  list.replaceChildren();
  for (const card of cards) {
    const link = makePart(page, "a", "track-card");
    link.href = card.address;
    if (onPick !== null) {
      link.addEventListener("click", (event) => {
        event.preventDefault(); // do not follow the link yet: first the character
        onPick(card);
      });
    }

    // The small map. It is decoration: the words on the card say everything.
    const mapBox = makePart(page, "div", "track-map-box");
    const map = makePart(page, "canvas", "track-map");
    map.setAttribute("aria-hidden", "true");
    paintMiniMap(map, card.track);
    mapBox.append(map);

    const cardWords = makePart(page, "div", "track-card-words");
    cardWords.append(makePart(page, "h3", "track-name", card.name), makePart(page, "span", "track-laps", card.laps));

    // Your practice bests belong to single races, so only those cards show
    // them, as pairs of a label and a time.
    if (kind === "single") {
      const bests = makePart(page, "dl", "track-bests");
      bests.append(
        makePart(page, "dt", "", "Your best race"),
        makePart(page, "dd", "", card.best.race),
        makePart(page, "dt", "", "Your best lap"),
        makePart(page, "dd", "", card.best.lap),
      );
      cardWords.append(bests);
    }
    cardWords.append(makePart(page, "span", "track-go", words.go));

    link.append(mapBox, cardWords);
    const item = makePart(page, "li");
    item.append(link);
    list.append(item);
  }
}

/**
 * Makes "Single race", "Two players" and "Online" in the menu open the panel
 * with the track cards.
 *   tracks      the list from shared/tracks/index.js: short name -> track
 *   storage     this browser's storage, or null (see storage.js)
 *   characters  the "Choose your character" step (connectCharacterChoice
 *               in kart-panel.js), opened when a track is picked
 *
 * Both are real links. If this code did not load, they still work and open
 * the first track.
 */
export function connectTrackChoice(page, tracks, storage, characters) {
  const panel = page.getElementById("track-choice");
  let shownKind = "single"; // the kind of race the panel was last opened for

  // The cards are built again each time, so the best times on them are fresh.
  function show(kind) {
    shownKind = kind;
    showTrackChoice(page, kind, trackCards(tracks, storage, kind), (card) => {
      panel.close();
      if (kind === "double") {
        chooseTwoDrivers(card);
      } else {
        characters.open(card.address, TRACK_CHOICE_KINDS[kind].go, card.name);
      }
    });
  }

  /**
   * Two players: the character step comes twice. First player 1, who
   * drives with the arrow keys as in every other race, then player 2 (W, A,
   * S, D), who cannot take the character the first one chose. Only the
   * second step leads to the race.
   */
  function chooseTwoDrivers(card) {
    characters.open(card.address, "Next: player 2", card.name, {
      title: "Player 1: choose your character",
      lead: "Player 1 drives with the arrow keys",
      onGo: () => {
        const first = readCharacter(storage)?.id ?? CAST[0].id;
        characters.open(card.address, TRACK_CHOICE_KINDS.double.go, card.name, {
          second: true,
          taken: first,
          title: "Player 2: choose your character",
          lead: "Player 2 drives with W A S D",
        });
      },
    });
  }

  /** Makes the link in one of the big choices open the panel instead of its page. */
  function openFrom(tileId, kind) {
    page.querySelector(`#${tileId} a`).addEventListener("click", (event) => {
      event.preventDefault(); // do not follow the link: open the panel instead
      show(kind);
      panel.showModal();
      // Put the keyboard on the first card, so Enter starts that race.
      panel.querySelector(".track-card")?.focus();
    });
  }
  openFrom("single-race-tile", "single");
  openFrom("double-tile", "double");
  openFrom("online-tile", "online");

  // The browser's Back button can bring this page back exactly as it was
  // left, with the panel still open. The times on the cards would then be
  // the old ones, from before the race.
  page.defaultView.addEventListener("pageshow", () => {
    if (panel.open) {
      show(shownKind);
    }
  });
}
