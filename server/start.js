// Starts the server. Run it with:  npm start
//
// Three settings can be given from outside the code (environment variables):
//   PORT          the "door number" the server listens on. Render chooses it
//                 online. On a laptop we use 3000.
//   HOST          who may connect. On a laptop it is 127.0.0.1, which means
//                 "only this laptop". On Render it is set to 0.0.0.0, which
//                 means "anyone on the internet".
//   DATABASE_URL  the secret address of the database. Without it the server
//                 runs without a database: the game works, but there are no
//                 accounts and no shared leaderboard.
//
// On a laptop, "npm start" also reads the file ".env", if there is one, and
// takes the settings written there. Git ignores that file.

import { createApp } from "./app.js";
import { attachOnlinePlay } from "./online.js";
import { openPool, createDatabaseOn } from "./db.js";
import { createStore } from "./store.js";
import { createAccounts } from "./accounts.js";
import { TRACKS, DEFAULT_TRACK } from "../shared/tracks/index.js";
import { TEST_DRIVER } from "../shared/characters.js";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "127.0.0.1";

// One set of connections to the database, shared by everything that uses it.
const pool = openPool(process.env.DATABASE_URL);
const database = pool === null ? null : createDatabaseOn(pool);
const accounts = pool === null ? null : createAccounts(createStore(pool));

const app = createApp({ database, accounts });
// One online room for each track. Results of signed-in players are saved.
attachOnlinePlay(app, { track: TRACKS[DEFAULT_TRACK], tracks: TRACKS, character: TEST_DRIVER, accounts });

app.listen(port, host, () => {
  console.log(`The server is running. Open http://localhost:${port} in a browser.`);
  console.log("To stop it, press Ctrl+C in this window.");
});

// Tell the database that the server has started, and make sure the tables
// for accounts exist. The game must work even if the database is asleep,
// slow or down, so we do not wait for this and a failure here does not stop
// the server. (The account tables are tried again the first time they are
// needed.)
if (pool === null) {
  console.log("No DATABASE_URL setting: running without a database, so without accounts.");
} else {
  database
    .recordStart()
    .then(() => console.log("Database: this start was recorded."))
    .catch((error) => console.error("Database: could not record this start:", error.message));
  accounts
    .ensureTables()
    .then(() => console.log("Database: the tables for accounts are ready."))
    .catch((error) => console.error("Database: could not prepare the tables for accounts:", error.message));
}
