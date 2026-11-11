// Which track the single race page shows.
//
// The track is chosen in the address of the page: race.html?track=campus-loop
// opens the campus loop. Without a choice, the page shows the test oval.
//
// Anyone can type anything into an address, so the choice is only accepted if
// it is exactly the short name of a track in shared/tracks/index.js. Anything
// else gives the test oval, and the page still works.

import { TRACKS, DEFAULT_TRACK } from "../shared/tracks/index.js";

/**
 * The track named in the address. "search" is the part of the address from the
 * question mark on, for example "?track=campus-loop" (window.location.search).
 */
export function chooseTrack(search) {
  const name = typeof search === "string" ? new URLSearchParams(search).get("track") : null;
  // Object.hasOwn only accepts names that are really in the list, so a name
  // such as "constructor" or "__proto__" cannot sneak in.
  if (name !== null && Object.hasOwn(TRACKS, name)) {
    return TRACKS[name];
  }
  return TRACKS[DEFAULT_TRACK];
}
