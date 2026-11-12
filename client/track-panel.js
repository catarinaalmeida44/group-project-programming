// The "Choose a track" panel of the menu: one card for each track.
//
// The same panel is used for a single race and for an online race. Only the
// words and the page the cards lead to are different. What a card says is
// worked out in track-list.js, and the small map on it is painted by
// mini-map.js. This file only builds the cards on the page and opens the
// panel, so it is checked by eye in a browser.

import { trackCards, RACE_KINDS } from "./track-list.js";
import { paintMiniMap } from "./mini-map.js";
import { makePart } from "./page-parts.js";

/**
 * Fills the panel for one kind of race.
 *   kind   "single" or "online" (see RACE_KINDS in track-list.js)
 *   cards  from trackCards() in track-list.js, made for the same kind
 * A card is one big link to the race on that track.
 */
export function showTrackChoice(page, kind, cards) {
  const words = RACE_KINDS[kind];
  page.getElementById("track-choice-title").textContent = words.title;
  page.getElementById("track-choice-lead").textContent = words.lead;

  const list = page.getElementById("track-cards");
  list.replaceChildren();
  for (const card of cards) {
    const link = makePart(page, "a", "track-card");
    link.href = card.address;

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
 * Makes "Single race" and "Online" in the menu open the panel with the track
 * cards.
 *   tracks   the list from shared/tracks/index.js: short name -> track
 *   storage  this browser's storage, or null (see storage.js)
 *
 * Both are real links. If this code did not load, they still work and open
 * the first track.
 */
export function connectTrackChoice(page, tracks, storage) {
  const panel = page.getElementById("track-choice");
  let shownKind = "single"; // the kind of race the panel was last opened for

  // The cards are built again each time, so the best times on them are fresh.
  function show(kind) {
    shownKind = kind;
    showTrackChoice(page, kind, trackCards(tracks, storage, kind));
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
