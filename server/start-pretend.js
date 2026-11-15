// Starts the game on your own laptop with PRETEND accounts. Run it with:
//
//     npm run start:pretend
//
// WHY THIS EXISTS
// Real accounts live in the database, and only one of us has the database's
// secret address. Without it, "npm start" runs the game with no accounts at
// all. This file lets everyone try signing up, signing in, online results
// and the shared leaderboard anyway: it is the real server, with the real
// rules and the real password scrambling, but players, sessions and results
// are kept in the computer's memory instead of the database.
//
// WHAT TO KNOW
//   - Everything is forgotten when you stop it (Ctrl+C).
//   - No email is ever sent. A message the game would send is printed in
//     this window instead.
//   - It never touches the real database, even if a ".env" file is there:
//     it does not read that file and does not look at DATABASE_URL.
//   - It only listens on this laptop (127.0.0.1), whatever HOST says, so it
//     cannot be put on the internet by mistake. The live server runs
//     "npm start" (see render.yaml), never this.

import { createApp } from "./app.js";
import { attachOnlinePlay } from "./online.js";
import { createAccounts } from "./accounts.js";
import { createMemoryStore } from "../tests/memory-store.js";
import { createPretendMailer } from "./mailer.js";
import { TRACKS, DEFAULT_TRACK } from "../shared/tracks/index.js";
import { TEST_DRIVER } from "../shared/characters.js";

const port = Number(process.env.PORT) || 3000;

// Email is pretend too: nothing is sent. Each message is printed in this
// window instead, with its link, so "confirm your email" and "forgot your
// password" can be tried by copying the link into the browser.
const accounts = createAccounts(createMemoryStore(), {
  mailer: createPretendMailer(),
  siteAddress: `http://localhost:${port}`,
});
const app = createApp({ accounts });
attachOnlinePlay(app, { track: TRACKS[DEFAULT_TRACK], tracks: TRACKS, character: TEST_DRIVER, accounts });

app.listen(port, "127.0.0.1", () => {
  console.log(`The server is running with PRETEND accounts. Open http://localhost:${port} in a browser.`);
  console.log("Accounts and results are kept in memory and forgotten when you stop it (Ctrl+C).");
  console.log("Emails are not sent: they are printed here instead.");
});
