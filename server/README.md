# server

Our game server: the program that runs on Render. Today it only sends the game's files to the browser. Later it will also run the online races and talk to the database.

| File | What it does |
|---|---|
| `app.js` | Builds the server and decides what to answer for each request. It sends files from the `client/` folder and, under addresses that start with `/shared/`, from the `shared/` folder. It answers `/health` with "I am alive", and refuses everything else |
| `start.js` | Starts the server. This is what `npm start` runs |

The server uses no outside library. It is built on `http`, the web server that comes with Node.js.

Why the `shared/` folder is sent too: it holds the game rules, and the browser needs them to run a practice race. Nothing in it is secret.

What the server refuses, each with a test in `tests/server.test.js`:

- requests that try to change something (only reading is allowed for now)
- files outside the `client/` and `shared/` folders, such as the server's own code, the tests and the project settings
- kinds of file that are not on its list
- addresses that are broken
