// The "computer karts" tick box of the online page.
//
// The server says in every update whether computer karts will fill the
// empty places of the next race, and which karts are computer karts now
// (server/online.js). This file works out what the tick box should show.
// It needs no browser, so it is tested (tests/computers-switch.test.js).
// online.js puts the answer on the page.
//
// It also names the computer karts ("Dean (computer)") for the page: above
// their karts, in the "With you" line and on the results board.

import { characterById } from "../shared/cast.js";

/**
 * What the tick box shows, from the newest update, the race (race-view.js)
 * and our own player number:
 *   shown    false when the server says nothing about computer karts
 *   on       whether the box is ticked
 *   canUse   only the host can change it, and only while no race is on
 *   count    how many computer karts are in the room now
 *   text     a short line beside the box
 */
export function computersSwitch(update, race, myId) {
  const said = update?.computers;
  const usable =
    said !== null &&
    typeof said === "object" &&
    typeof said.on === "boolean" &&
    Array.isArray(said.karts) &&
    said.karts.every((id) => Number.isInteger(id));
  if (!usable) {
    return { shown: false, on: false, canUse: false, count: 0, text: "" };
  }
  const noRaceOn = race.phase === "open" || race.phase === "finished";
  const host = myId !== null && race.host === myId;
  const count = said.karts.length;
  let text;
  if (count > 0) {
    text = count === 1 ? "1 computer kart in this race." : `${count} computer karts in this race.`;
  } else if (host && noRaceOn) {
    text = "You are the host: you can switch this.";
  } else {
    text = "Only the host can switch this.";
  }
  return { shown: true, on: said.on, canUse: host && noRaceOn, count, text };
}

/**
 * The names to show for the karts, by player number (a Map): the user names
 * of the signed-in players (net.js), and for each computer kart its
 * character's name with "(computer)". The Map given is not changed.
 */
export function namesWithComputers(names, update) {
  const all = new Map(names);
  const ids = computersSwitch(update, { phase: "open", host: null }, null).shown ? update.computers.karts : [];
  for (const id of ids) {
    const kart = Array.isArray(update.karts) ? update.karts.find((each) => each?.id === id) : undefined;
    const character = characterById(kart?.character);
    all.set(id, `${character === null ? "Computer kart" : character.name} (computer)`);
  }
  return all;
}
