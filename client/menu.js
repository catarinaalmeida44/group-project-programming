// The main menu (index.html).
//
// Online is a plain link to another page, so it needs no code. Everything
// else on the menu opens a panel, and each panel has its own file. This file
// only starts them and hands each one what it needs:
//
//   settings-panel.js     Settings
//   track-panel.js        Single race: choosing a track
//   leaderboard-panel.js  Leaderboard
//   account-panel.js      the account corner, and signing in and out
//
// Two of them talk to the server, through "accountApi" (account-api.js).
// They get it handed in here instead of fetching it themselves. That is what
// lets the tests hand in a pretend one.

import { storageOf } from "./storage.js";
import { accountApi } from "./account-api.js";
import { TRACKS } from "../shared/tracks/index.js";
import { connectSettings } from "./settings-panel.js";
import { connectTrackChoice } from "./track-panel.js";
import { connectLeaderboard } from "./leaderboard-panel.js";
import { connectAccount } from "./account-panel.js";

const storage = storageOf(window); // this browser's storage, for the settings and the best times

connectSettings(document, storage);
connectTrackChoice(document, TRACKS, storage);
const leaderboard = connectLeaderboard(document, { api: accountApi, storage, tracks: TRACKS });

// The leaderboard marks the signed-in player's own row, so it is told each
// time someone signs in or out.
connectAccount(document, { api: accountApi, onChange: leaderboard.setPlayer });
