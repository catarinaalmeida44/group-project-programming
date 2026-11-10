# server

Our game server: the program that runs on Render. Today it only sends the page to the browser. Later it will also run the races and talk to the database.

| File | What it does |
|---|---|
| `app.js` | Builds the server and decides what to answer for each request. It sends files from the `client/` folder, answers `/health` with "I am alive", and refuses everything else |
| `start.js` | Starts the server. This is what `npm start` runs |

The server uses no outside library. It is built on `http`, the web server that comes with Node.js.

What the server refuses, each with a test in `tests/server.test.js`:

- requests that try to change something (only reading is allowed for now)
- files outside the `client/` folder
- kinds of file that are not on its list
- addresses that are broken
