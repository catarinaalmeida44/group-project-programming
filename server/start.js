// Starts the server. Run it with:  npm start
//
// Three settings can be given from outside the code (environment variables):
//   PORT          the "door number" the server listens on. Render chooses it
//                 online. On a laptop we use 3000.
//   HOST          who may connect. On a laptop it is 127.0.0.1, which means
//                 "only this laptop". On Render it is set to 0.0.0.0, which
//                 means "anyone on the internet".
//   DATABASE_URL  the secret address of the database. Without it the server
//                 runs without a database.
//
// On a laptop, "npm start" also reads the file ".env", if there is one, and
// takes the settings written there. Git ignores that file.

import { createApp } from "./app.js";
import { attachOnlinePlay } from "./online.js";
import { createDatabase } from "./db.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { TEST_DRIVER } from "../shared/characters.js";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "127.0.0.1";

const database = createDatabase(process.env.DATABASE_URL);
const app = createApp({ database });
attachOnlinePlay(app, { track: TEST_OVAL, character: TEST_DRIVER });

app.listen(port, host, () => {
  console.log(`The server is running. Open http://localhost:${port} in a browser.`);
  console.log("To stop it, press Ctrl+C in this window.");
});

// Tell the database that the server has started. The game must work even
// if the database is asleep, slow or down, so we do not wait for this and
// a failure here does not stop the server.
if (database === null) {
  console.log("No DATABASE_URL setting: running without a database.");
} else {
  database
    .recordStart()
    .then(() => console.log("Database: this start was recorded."))
    .catch((error) => console.error("Database: could not record this start:", error.message));
}
