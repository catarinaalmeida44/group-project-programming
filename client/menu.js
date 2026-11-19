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
import { connectCharacterChoice } from "./kart-panel.js";
import { connectTrackChoice } from "./track-panel.js";
import { connectLeaderboard } from "./leaderboard-panel.js";
import { connectAccount } from "./account-panel.js";
import { connectStats } from "./stats-panel.js";

const storage = storageOf(window); // this browser's storage, for the settings and the best times

connectSettings(document, storage);
// A track is chosen first, then the character, then the race starts.
const characters = connectCharacterChoice(document, storage);
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
