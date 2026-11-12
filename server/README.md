# server

Our game server: the program that runs on Render. It sends the game's files to the browser, runs the online races, where it moves everyone's kart, and keeps the accounts and the shared leaderboard in the database.

| File | What it does |
|---|---|
| `app.js` | Builds the web server and decides what to answer for each request. It sends files from the `client/` folder and, under addresses that start with `/shared/`, from the `shared/` folder. It answers `/health` with "I am alive", hands addresses that start with `/api/` to `api.js`, and refuses everything else. With every answer it tells the browser to run only our own scripts and styles |
| `api.js` | The addresses a page uses for accounts and the leaderboard: sign up, sign in, sign out, "who am I", delete my account, and the leaderboard of a track. It reads what a browser sent, refuses what is not allowed, and sets the cookie |
| `accounts.js` | The rules for accounts: who may sign in, when an account is locked, how long a sign-in lasts, which results may be saved, what the leaderboard shows. Knows nothing about the internet or about database questions, which makes it easy to test |
| `passwords.js` | Scrambles passwords so they are never kept in a readable form, and checks a password against its scrambled form |
| `store.js` | Every question the game asks the database about players, sessions and race results |
| `online.js` | Online play. Keeps a live connection open to every browser on the online page, passes the keys they hold to the room, sends everyone the state of all karts and bananas 20 times a second, and saves the result when a signed-in player finishes a race. One room for each track. Gives every room real chance to pick the seeds of its bananas with |
| `room.js` | The karts of everyone driving together, and the race: who the host is, the countdown, who is racing, who is watching, and who finished in which position. Moves the karts with the shared rules, 60 steps a second: it puts them on the starting grid, lets them bump into each other, and looks after the bananas of a race. Knows nothing about the internet, which makes it easy to test |
| `messages.js` | Checks every message a browser sends before the game looks at it |
| `db.js` | Opens the connection to the database, and looks after one small table, `server_starts`, with one row for each time the server started |
| `start.js` | Starts the server. This is what `npm start` runs, on a laptop and on Render |
| `start-pretend.js` | Starts the server on a laptop with pretend accounts kept in memory (`npm run start:pretend`), so everyone can try accounts without the database's secret address. Never used online |

The server uses two outside libraries: `ws`, for the live connections, and `pg`, to talk to the database. Everything else is built on what comes with Node.js: `http` for the web server and `crypto` for scrambling passwords and making random tickets.

## The database

- The server reaches it through a secret address, the setting `DATABASE_URL`. That address is in Render's Environment page and in a local `.env` file, and nowhere else.
- Without the setting, the server runs without a database. That is the normal case on a teammate's laptop. The game works, but there are no accounts and no shared leaderboard: the pages say so calmly.
- Four tables: `server_starts` (one row per start, the newest 50 are kept), `players`, `sessions` and `race_results`.
- `/database-check` shows what the server can read: how many starts are recorded and when the latest was. The answer is reused for ten seconds, so many visitors do not become many questions to the database.
- If the database is asleep, slow or unreachable, the game keeps working. The account addresses then answer "Accounts could not be reached just now", without any details. The details go only to the server's own log.
- Tests never touch the real tables. The ones that use the real database (`npm run test:database`) work in tables whose names start with `test_`, and remove them afterwards.

Why the `shared/` folder is sent to browsers too: it holds the game rules, and the browser needs them to run a practice race. Nothing in it is secret.

## Accounts

- **An account** is a user name (3 to 16 letters, digits or underscores) and a password (at least 8 characters). The rules are in `shared/account-rules.js`, so the page can check them before sending, but the server always checks again. "Ana" and "ana" count as the same name.
- **Passwords are never kept.** `passwords.js` scrambles each one with `scrypt`, which comes with Node.js, together with a random "salt" so that two players with the same password get different scrambled forms. The scrambling is slow on purpose (about a tenth of a second), which makes guessing millions of passwords from a stolen database take far too long.
- **Staying signed in.** After a correct password the server makes a long random "ticket" and puts it in a cookie in the browser. The browser sends it back with every request. The cookie cannot be read by the page's own code, is only sent to our site, and stops working after seven days or when the player signs out. The database holds only a scrambled copy of each ticket.
- **Wrong passwords.** After five in a row the account is locked for ten minutes. A wrong password and a name nobody has get exactly the same answer, after the same amount of work, so trying names does not reveal which exist.
- **Deleting an account** asks for the password again and takes the player's sessions and results with it.

## The shared leaderboard

For each track: the ten fastest whole races and the ten fastest single laps, one row per player, and the signed-in player's own best and rank. It shows user names and times and nothing else.

A time gets there in one way only. When a signed-in player finishes an online race that began with the countdown, `online.js` takes the time from the room and writes it to the database. The server ran that race itself. There is no address and no message through which a browser could send a time.

## Who decides what, online

The browser sends only three kinds of message: "these are the keys I am holding", "restart" and "start a race". The room obeys "start a race" only from the host, the player who has been in the room longest, and it works out who that is itself. The browser never says where its kart is, how fast it is going, which lap it is on, who it is or what time it finished in. The server works all of that out: the driving with the same rules file the practice race uses, and the player from the cookie. So a player cannot go faster, skip a lap or claim a result by changing the page in their browser.

The same goes for what happens between karts and on the road. The server decides who bumped into whom, where each banana appears, who drove over one and how long they spin. The bananas of a race grow from a number, the "seed", that the room picks by chance when the race starts. No message can place or remove a banana, spin a kart or choose the seed.

## What a browser is told

Twenty times a second, every browser in a room gets one update (`snapshot()` in `room.js`):

- `karts`: for each kart on the track its player number, grid place, position, direction, speed, laps, clock, whether it has finished, and `spin`, the number of steps it will still spin (0 when it is not spinning)
- `race`: the phase (`open`, `countdown`, `racing` or `finished`), how far the countdown is, who the host is and who is watching
- `bananas`: the banana peels on the road, each with a number and a position. Empty while the room is open and during 3, 2, 1

## What the server refuses

Each of these has a test, in `tests/server.test.js`, `tests/api.test.js`, `tests/accounts.test.js`, `tests/online.test.js`, `tests/online-accounts.test.js`, `tests/room.test.js`, `tests/room-race.test.js`, `tests/room-finishes.test.js`, `tests/bumps.test.js` or `tests/room-bananas.test.js`.

For normal page requests:

- requests that try to change something, anywhere but the account addresses
- files outside the `client/` and `shared/` folders, such as the server's own code, the tests and the project settings
- kinds of file that are not on its list
- addresses that are broken

For accounts and the leaderboard:

- a user name or password that breaks the rules, and a user name that is taken
- a wrong password, a name nobody has, and any sign-in while the account is locked
- a ticket that is made up, damaged, signed out or older than seven days
- deleting an account without being signed in, or without that account's own password. Nothing in the request can name another player
- a request to change something that was started by a page on another website, or that is not in our format, or is longer than a couple of lines
- more tries in a minute than a classroom would make: per computer, and for the slow password work also in total
- a track that does not exist
- any attempt to send in a result: there is nowhere to send it

For online play:

- a live connection to any address other than `/play`, or to a track that does not exist
- a live connection started by a page on someone else's website
- a player when the room is full (eight players)
- any message that is not exactly one of the three allowed kinds: the browser is sent away
- a race start from anyone but the host, or while a countdown is already running: it is ignored
- a restart during a countdown or a race: it is ignored, so nobody can give themselves a fresh clock
- keys from a player who joined during a race and is watching: they move nothing
- more than 60 messages in a second from one browser: it is sent away
- driving another player's kart. A connection can only ever act on its own kart, and anything extra in a message, such as another player's number or a made-up finish time, is dropped
- driving through another kart: karts on the track bump into each other. Someone who is watching has no kart, so nothing can bump into it
- anything about bananas from a browser: placing or removing one, spinning a kart, choosing the seed. There is no such message, and anything of the kind added to a real message is dropped
- the keys of a kart that is spinning out: they do nothing until the spin is over
- saving a result for a guest, for laps driven outside a race, or for a racer who left before the line

"Sent away" means three things, in this order: its kart leaves the track at once, the server tells it why, and two seconds later the server cuts the connection if the browser has not closed it. The server does not wait for the browser to agree.
