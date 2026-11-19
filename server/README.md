# server

Our game server: the program that runs on Render. It sends the game's files to the browser, runs the online races, where it moves everyone's kart, and keeps the accounts and the shared leaderboard in the database.

| File | What it does |
|---|---|
| `app.js` | Builds the web server and decides what to answer for each request. It sends files from the `client/` folder and, under addresses that start with `/shared/`, from the `shared/` folder. It answers `/health` with "I am alive", hands addresses that start with `/api/` to `api.js`, and refuses everything else. With every answer it tells the browser to run only our own scripts and styles |
| `api.js` | The addresses a page uses for accounts and the leaderboard: sign up, sign in, sign out, "who am I", change my password, delete my account, the leaderboard of a track, and for the signed-in player only: their own stats, saving a single race, and the file of their results. It reads what a browser sent, refuses what is not allowed, and sets the cookie |
| `accounts.js` | The rules for accounts: who may sign in, when an account is locked, how long a sign-in lasts, which results may be saved (online ones from the server itself, single ones from a browser only if they could be real and not too soon after the last), what the leaderboard shows, and a player's own stats. Knows nothing about the internet or about database questions, which makes it easy to test |
| `stats.js` | A player's own stats, worked out from the list of their saved races: how many, wins, podiums, the three best times, the best lap, the character driven most. Also writes that list out as a ".csv" file for a spreadsheet. Plain lists in, plain answers out |
| `single-results.js` | Is a single race that a browser reports one that could have been driven? A real track, sensible numbers, a best lap that fits the race, a place a race has, a character of the cast, and no faster than all laps at twice top speed |
| `passwords.js` | Scrambles passwords so they are never kept in a readable form, and checks a password against its scrambled form |
| `store.js` | Every question the game asks the database about players, sessions and race results |
| `online.js` | Online play. Keeps a live connection open to every browser on the online page, passes the keys they hold to the room, sends everyone the state of all karts and bananas 20 times a second, and saves the result when a signed-in player finishes a race. Fills a race with computer karts when the host starts it, unless the host switched them off, and says in every update whether they are on and which karts they are (`computers`). One room for each track. Gives every room real chance to pick the seeds of its bananas with |
| `room.js` | The karts of everyone driving together, and the race: who the host is, the countdown, who is racing, who is watching, and who finished in which position. Moves the karts with the shared rules, 60 steps a second: it puts them on the starting grid, lets them bump into each other, and looks after the bananas of a race. On a track with ramps and walkers (`shared/ramps.js`, `shared/walkers.js`) it also keeps the walkers of the race: they stand still until GO, are put back at every start, and the room works out who topples one. Its update then has `walkers` (each one's own clock `time`, and `down`, the steps it still sits on the ground), and a kart has `air` and `boost` while it is in the air or has extra speed after a ramp (left out when 0). No message from a browser can move or topple a walker or make a kart jump. Knows nothing about the internet, which makes it easy to test |
| `messages.js` | Checks every message a browser sends before the game looks at it: keys, restart, start, the colours of its kart, the character it wants to be, and computer karts on or off (only an exact true or false) |
| `computer-players.js` | Computer karts in an online room. When the host starts a race, it adds one player to the room for each character nobody is, up to 6 karts, and every step presses their keys with the brain of `shared/computer-driver.js`. To the room they are ordinary players, so `room.js` did not change. Also says when they must leave: no person left, no person racing, or one of them would be the host. Knows nothing about the internet |
| `cast-keeper.js` | Who in a room is which character (`shared/cast.js`): a character belongs to one player at a time, a player whose choice is taken gets the first free one, and nobody changes character during a race. Kept apart from `room.js` because characters do not touch the driving |
| `db.js` | Opens the connection to the database, and looks after one small table, `server_starts`, with one row for each time the server started |
| `start.js` | Starts the server. This is what `npm start` runs, on a laptop and on Render. Every room starts with computer karts switched on |
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

- **An account** is a user name (3 to 16 letters, digits or underscores) and a password (at least 8 characters, and not the user name itself). The rules are in `shared/account-rules.js`, so the page can check them before sending, but the server always checks again. "Ana" and "ana" count as the same name.
- **Passwords are never kept.** `passwords.js` scrambles each one with `scrypt`, which comes with Node.js, together with a random "salt" so that two players with the same password get different scrambled forms. The scrambling is slow on purpose (about a tenth of a second), which makes guessing millions of passwords from a stolen database take far too long.
- **Staying signed in.** After a correct password the server makes a long random "ticket" and puts it in a cookie in the browser. The browser sends it back with every request. The cookie cannot be read by the page's own code, is only sent to our site, and stops working after seven days or when the player signs out. The database holds only a scrambled copy of each ticket.
- **Wrong passwords.** After five in a row the account is locked for ten minutes. A wrong password and a name nobody has get exactly the same answer, after the same amount of work, so trying names does not reveal which exist.
- **Deleting an account** asks for the password again and takes the player's sessions and results with it.

## The shared leaderboard

For each track: the ten fastest whole races and the ten fastest single laps, one row per player, and the signed-in player's own best and rank. It shows user names and times and nothing else.

A time gets there in one way only. When a signed-in player finishes an online race that began with the countdown, `online.js` takes the time from the room and writes it to the database. The server ran that race itself. There is no address and no message through which a browser could send a time for it.

## A player's own stats

Since 19 November 2026. `/api/stats` gives the signed-in player their numbers on the Nova lap, and `/api/my-results.csv` their saved races on every track as a file. Neither address takes a name or a number: the cookie says who is asking, so nobody can read someone else's.

Single races count here too. A single race runs in the player's own browser, which reports it afterwards to `/api/single-result`. The server cannot check a race it did not run, so it saves such a race as "single", shows it only to that player, and leaves it out of both leaderboard questions in `store.js`. Before saving it checks that the numbers could be real (`single-results.js`) and that as much time has passed since the player's last single race as the reported one took. What a browser can still fake is a believable time it did not drive, which only changes what that one player sees about themselves.

## Who decides what, online

The browser sends only four kinds of message: "these are the keys I am holding", "restart", "start a race" and "paint my kart in these colours". The last one is three small whole numbers, each the number of a colour in a short list (`shared/kart-looks.js`). The server checks them and passes them on, so everyone sees the kart in those colours. It changes how a kart is drawn and nothing else. The room obeys "start a race" only from the host, the player who has been in the room longest, and it works out who that is itself. The browser never says where its kart is, how fast it is going, which lap it is on, who it is or what time it finished in. The server works all of that out: the driving with the same rules file the practice race uses, and the player from the cookie. So a player cannot go faster, skip a lap or claim a result by changing the page in their browser.

The same goes for what happens between karts and on the road. The server decides who bumped into whom, where each banana appears, who drove over one and how long they spin. The bananas of a race grow from a number, the "seed", that the room picks by chance when the race starts. No message can place or remove a banana, spin a kart or choose the seed.

## What a browser is told

Twenty times a second, every browser in a room gets one update (`snapshot()` in `room.js`):

- `karts`: for each kart on the track its player number, grid place, position, direction, speed, laps, clock, whether it has finished, `spin`, the number of steps it will still spin (0 when it is not spinning), and `passed`, its count of checkpoints, from which the page shows who is in front and which checkpoint comes next
- `race`: the phase (`open`, `countdown`, `racing` or `finished`), how far the countdown is, who the host is and who is watching
- `bananas`: the banana peels on the road, each with a number and a position. Empty while the room is open and during 3, 2, 1
- `endsIn`: how many steps are left until the race is over for everyone, while a race is being driven. Otherwise it is empty (`null`). A race is over two minutes after the first finish, and ten minutes after GO at the latest (`FINISH_WINDOW_STEPS` and `RACE_LIMIT_STEPS` in `shared/race-time.js`)

## What the server refuses

Each of these has a test, in `tests/server.test.js`, `tests/api.test.js`, `tests/accounts.test.js`, `tests/online.test.js`, `tests/online-accounts.test.js`, `tests/room.test.js`, `tests/room-race.test.js`, `tests/room-finishes.test.js`, `tests/bumps.test.js`, `tests/room-bananas.test.js` or `tests/room-characters.test.js`.

For normal page requests:

- requests that try to change something, anywhere but the account addresses
- files outside the `client/` and `shared/` folders, such as the server's own code, the tests and the project settings
- kinds of file that are not on its list
- addresses that are broken

The answer to an address that does not exist is the number 404 ("not found"). A person who opened it in a browser gets a page of the game with a button back to the menu (`client/not-found.html`). Everything else that asks gets the three plain words "Page not found." The page never shows the address that was asked for, and the files listed above stay as private as before (`tests/not-found-page.test.js`).

For accounts and the leaderboard:

- a user name or password that breaks the rules, a password that is the user name itself, and a user name that is taken
- a wrong password, a name nobody has, and any sign-in while the account is locked
- a ticket that is made up, damaged, signed out or older than seven days
- deleting an account without being signed in, or without that account's own password. Nothing in the request can name another player
- a request to change something that was started by a page on another website, or that is not in our format, or is longer than a couple of lines
- more tries in a minute than a classroom would make: per computer, and for the slow password work also in total
- a track that does not exist
- any attempt to send in an online result: there is nowhere to send it
- reading stats or the file of results without being signed in, and anyone's but your own: the addresses take no name
- a reported single race that cannot be real, one sent too soon after the last, one for another player, and one that calls itself "online" (`tests/my-stats.test.js`, `tests/single-results.test.js`)

For online play:

- a live connection to any address other than `/play`, or to a track that does not exist
- a live connection started by a page on someone else's website
- a player when the room is full (six players, one for each character; eight until 19 November 2026)
- any message that is not exactly one of the four allowed kinds: the browser is sent away
- kart colours that are not three whole numbers from the allowed ranges, such as a colour written out or a name: the browser is sent away
- painting another player's kart: a choice of colours only ever changes the kart of the connection that sent it
- a race start from anyone but the host, or while a countdown is running or a race is being driven: it is ignored. A race that has begun is driven to its end (since 13 November 2026). The host is the player who has been in the room longest and has pressed a key in the last minute: one who is away passes the room on (since 19 November 2026, `tests/host-away.test.js`)
- a second kart for a signed-in player who is already in the room: the older connection is told why and sent away (since 19 November 2026, `tests/one-kart-per-player.test.js`)
- a finish after the time of a race has run out: that racer's laps and clock stay as they were, and no result is saved
- a restart during a countdown or a race: it is ignored, so nobody can give themselves a fresh clock
- keys from a player who joined during a race and is watching: they move nothing
- more than 60 messages in a second from one browser: it is sent away
- driving another player's kart. A connection can only ever act on its own kart, and anything extra in a message, such as another player's number or a made-up finish time, is dropped
- driving through another kart: karts on the track bump into each other. Someone who is watching has no kart, so nothing can bump into it
- anything about bananas from a browser: placing or removing one, spinning a kart, choosing the seed. There is no such message, and anything of the kind added to a real message is dropped
- the keys of a kart that is spinning out: they do nothing until the spin is over
- saving a result for a guest, for laps driven outside a race, or for a racer who left before the line
- changing a password without being signed in, with a wrong current password, to one that breaks the rules or to the same one again; changing anyone's password but your own; and more than ten tries a minute from one computer

"Sent away" means three things, in this order: its kart leaves the track at once, the server tells it why, and two seconds later the server cuts the connection if the browser has not closed it. The server does not wait for the browser to agree.
