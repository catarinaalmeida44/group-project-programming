# server

Our game server: the program that runs on Render. It sends the game's files to the browser and runs the online session, where it moves everyone's kart. Later it will also talk to the database.

| File | What it does |
|---|---|
| `app.js` | Builds the web server and decides what to answer for each request. It sends files from the `client/` folder and, under addresses that start with `/shared/`, from the `shared/` folder. It answers `/health` with "I am alive", and refuses everything else |
| `online.js` | Online play. Keeps a live connection open to every browser on the online page, passes the keys they hold to the room, and sends everyone the state of all karts 20 times a second |
| `room.js` | The karts of everyone driving together. Moves them all with the shared rules, 60 steps a second. Knows nothing about the internet, which makes it easy to test |
| `messages.js` | Checks every message a browser sends before the game looks at it |
| `start.js` | Starts the server. This is what `npm start` runs |

The server uses one outside library: `ws`, for the live connections. Everything else is built on `http`, the web server that comes with Node.js.

Why the `shared/` folder is sent to browsers too: it holds the game rules, and the browser needs them to run a practice race. Nothing in it is secret.

## Who decides what, online

The browser sends only two kinds of message: "these are the keys I am holding" and "restart". It never says where its kart is, how fast it is going or which lap it is on. The server works all of that out with the same rules file the practice race uses. So a player cannot go faster or skip a lap by changing the page in their browser.

## What the server refuses

Each of these has a test, in `tests/server.test.js`, `tests/online.test.js` or `tests/room.test.js`.

For normal page requests:

- requests that try to change something (only reading is allowed for now)
- files outside the `client/` and `shared/` folders, such as the server's own code, the tests and the project settings
- kinds of file that are not on its list
- addresses that are broken

For online play:

- a live connection to any address other than `/play`
- a live connection started by a page on someone else's website
- a player when the room is full (eight players)
- any message that is not exactly one of the two allowed kinds: the browser is sent away
- more than 60 messages in a second from one browser: it is sent away

"Sent away" means three things, in this order: its kart leaves the track at once, the server tells it why, and two seconds later the server cuts the connection if the browser has not closed it. The server does not wait for the browser to agree.
- driving another player's kart. A connection can only ever act on its own kart, and anything extra in a message, such as another player's number, is dropped
