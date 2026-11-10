// Starts the server. Run it with:  npm start
//
// Two settings can be given from outside the code (environment variables):
//   PORT  the "door number" the server listens on. Render chooses it online.
//         On a laptop we use 3000.
//   HOST  who may connect. On a laptop it is 127.0.0.1, which means "only this
//         laptop". On Render it is set to 0.0.0.0, which means "anyone on the
//         internet".

import { createApp } from "./app.js";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "127.0.0.1";

createApp().listen(port, host, () => {
  console.log(`The server is running. Open http://localhost:${port} in a browser.`);
  console.log("To stop it, press Ctrl+C in this window.");
});
