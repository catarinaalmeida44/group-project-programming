// The main menu (index.html).
//
// Everything on the menu opens a panel, and each panel has its own file.
// This file only starts them and hands each one what it needs:
//
//   settings-panel.js     Settings
//   track-panel.js        Single race and Online: choosing a track
//   kart-panel.js         then choosing your character, before the race
//   leaderboard-panel.js  Leaderboard
//   account-panel.js      the account corner, and signing in and out
//   stats-panel.js        "My stats", at the top of "Your account"
//
// Two of them talk to the server, through "accountApi" (account-api.js).
// They get it handed in here instead of fetching it themselves. That is what
// lets the tests hand in a pretend one.

import { storageOf } from "./storage.js";
import { accountApi } from "./account-api.js";
import { TRACKS } from "../shared/tracks/index.js";
import { connectSettings } from "./settings-panel.js";
import { createPageMusic } from "./music.js";
import { createUiSound, HYPE_SECONDS } from "./ui-sound.js";
import { connectCharacterChoice } from "./kart-panel.js";
import { connectTrackChoice } from "./track-panel.js";
import { connectLeaderboard } from "./leaderboard-panel.js";
import { connectAccount } from "./account-panel.js";
import { connectStats } from "./stats-panel.js";

const storage = storageOf(window); // this browser's storage, for the settings and the best times

// The sound of the menu: its music (music.js), a click for every button and
// the hype sound when the characters are chosen (ui-sound.js). The sound
// switches are in Settings (audio-switches.js), so Settings is told about
// both, to apply a change at once.
const music = createPageMusic(window, storage, "menu"); // "menu": it will need the menu tune
music.follow({ place: "menu", finalLap: false });
const uiSound = createUiSound(window, storage);
uiSound.listen(document);

connectSettings(document, storage, () => {
  music.setSwitches();
  uiSound.setSwitches();
});
// A track is chosen first, then the character, then the race starts.
const characters = connectCharacterChoice(document, storage);

// The hype when the character choice is done: the Race button waits a
// moment for it, then goes to the race. (In the first step of a
// two-player race the button opens the second step instead: kart-panel.js
// stops it from leaving the page, and then there is no hype yet.)
document.getElementById("character-go").addEventListener("click", (event) => {
  if (event.defaultPrevented || !uiSound.hypeIsHeard()) {
    return; // the first of two steps, or menu sounds off: go at once
  }
  event.preventDefault();
  const address = event.currentTarget.href;
  uiSound.hype();
  setTimeout(() => window.location.assign(address), HYPE_SECONDS * 1000);
});
connectTrackChoice(document, TRACKS, storage, characters);
const leaderboard = connectLeaderboard(document, { api: accountApi, storage, tracks: TRACKS });

// "My stats", at the top of the "Your account" panel (stats-panel.js).
const stats = connectStats(document, { api: accountApi, storage });

// The leaderboard marks the signed-in player's own row, and the stats card
// shows the player's name, so both are told each time someone signs in or out.
connectAccount(document, {
  api: accountApi,
  onChange: (me) => {
    leaderboard.setPlayer(me);
    stats.setPlayer(me);
  },
});
