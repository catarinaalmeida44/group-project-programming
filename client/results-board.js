// The results board of an online race, on the page.
//
// When a race is over for everyone, a board comes up over the track: the
// winner on top, large, with their kart turning round, and everyone else
// below in the order of arrival. Karts that ran out of time come last, the
// one that was closest to the finish first.
//
// Which lines the board has, and in which order, is worked out in
// standings.js, which has tests. This file only puts them on the page and
// paints the karts, so it is checked by eye in a browser. How the board
// moves (it pops up, the rows slide in one by one, confetti falls) is in
// style.css, under "The results board".
//
// Every name and time is put on the page as text, never as HTML.

import { paintKart, viewerBehind } from "./kart-paint.js";
import { isLook } from "./kart-shape.js";
import { makePart } from "./page-parts.js";

// The cameras of the two sizes of kart picture: close to the kart, looking down a little.
const BIG = { width: 240, height: 150, camera: { kartScreenY: 104, kartScale: 6.6, horizonY: -60, depth: 900, viewAhead: 100 } };
const SMALL = { width: 96, height: 60, camera: { kartScreenY: 43, kartScale: 3.4, horizonY: -26, depth: 900, viewAhead: 100 } };
/** How long the winner's kart takes to turn round once, in seconds. */
const SECONDS_PER_TURN = 6;
/** The other karts stand still, turned this far (in radians), so that their side and nose can be seen. */
const STANDING_TURN = -0.75;
/** How many pieces of confetti fall. Where each one falls is in style.css. */
const CONFETTI = 18;

/**
 * Finds the board on the page and gives back what the online page needs:
 *   show(lines, looks)  put up the board. "lines" come from boardLines() in
 *                       standings.js. "looks" is a Map from a kart's number
 *                       to its colours (kart-shape.js)
 *   hide()              take it away, when the next race starts
 *   isShown()           is it up?
 *   say(text)           the sentence at the bottom: who starts the next race
 *   paint(now)          call for every picture: turns the winner's kart
 */
export function createResultsBoard(page) {
  const box = page.getElementById("finish-board");
  let shown = false;
  let winner = null; //   { context, look }: the big picture, painted again for every picture
  let nextLine = null; // the sentence at the bottom
  let said = "";

  /** A picture of one kart, of one of the two sizes. Gives { canvas, context }. */
  function kartPicture(size, className, label) {
    const canvas = makePart(page, "canvas", className);
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", label);
    return { canvas, context: canvas.getContext("2d") };
  }

  function paintOne(context, size, look, turn, steer) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    if (isLook(look)) {
      paintKart(context, viewerBehind({ ahead: 0, sideways: 0 }, turn, turn, size.camera, size), look, steer);
    }
  }

  return {
    isShown: () => shown,

    show(lines, looks) {
      box.replaceChildren();
      winner = null;
      nextLine = null;
      said = "";
      if (lines.length === 0) {
        return;
      }
      const [first, ...rest] = lines;
      const someoneFinished = first.finished;
      const nameOf = (line) => (line.mine ? `${line.who} (you)` : line.who);

      // Confetti, for a race somebody won. It is decoration only.
      if (someoneFinished) {
        const confetti = makePart(page, "div", "finish-confetti");
        confetti.setAttribute("aria-hidden", "true");
        for (let piece = 0; piece < CONFETTI; piece++) {
          confetti.append(makePart(page, "span"));
        }
        box.append(confetti);
      }

      box.append(makePart(page, "h2", "finish-title", someoneFinished ? "Race results" : "Time is up"));

      // The winner, large. If nobody finished: whoever was closest to the finish.
      const top = makePart(page, "div", first.mine ? "finish-winner mine" : "finish-winner");
      const big = kartPicture(BIG, "finish-kart-big", `The kart of ${first.who}`);
      const words = makePart(page, "div", "finish-winner-words");
      words.append(
        makePart(page, "span", "finish-ribbon", someoneFinished ? "Winner" : "Closest to the finish"),
        makePart(page, "strong", "finish-name", nameOf(first)),
        makePart(page, "span", "finish-time", first.time),
      );
      if (first.detail !== "") {
        words.append(makePart(page, "span", "finish-detail", first.detail));
      }
      top.append(big.canvas, words);
      box.append(top);
      winner = { context: big.context, look: looks.get(first.id) };

      // Everyone else, in the order of arrival.
      if (rest.length > 0) {
        const list = makePart(page, "ol", "finish-rest");
        for (const line of rest) {
          const classes = ["finish-row", line.mine ? "mine" : "", line.finished ? "" : "unfinished"].filter((name) => name !== "");
          const row = makePart(page, "li", classes.join(" "));
          const small = kartPicture(SMALL, "finish-kart-small", `The kart of ${line.who}`);
          paintOne(small.context, SMALL, looks.get(line.id), STANDING_TURN, 0);
          row.append(
            makePart(page, "span", "finish-place", line.place),
            small.canvas,
            makePart(page, "span", "finish-name", nameOf(line)),
            makePart(page, "span", "finish-time", line.time),
            makePart(page, "span", "finish-detail", line.detail),
          );
          list.append(row);
        }
        box.append(list);
      }

      nextLine = makePart(page, "p", "finish-next");
      box.append(nextLine);
      box.hidden = false;
      shown = true;
    },

    hide() {
      box.hidden = true;
      box.replaceChildren();
      shown = false;
      winner = null;
      nextLine = null;
    },

    say(text) {
      if (nextLine !== null && text !== said) {
        said = text;
        nextLine.textContent = text; // as text, never as HTML
      }
    },

    paint(now) {
      if (shown && winner !== null) {
        const turn = ((now / 1000) * Math.PI * 2) / SECONDS_PER_TURN;
        paintOne(winner.context, BIG, winner.look, turn, Math.sin(now / 700));
      }
    },
  };
}
