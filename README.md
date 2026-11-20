# Nova SBE kart racer

An online kart racing game set at the Nova SBE campus in Carcavelos. You race round the school against your friends, against computer karts, or both.

Team project for Introduction to Programming (course 2477) at Nova SBE.

**Play it now: https://novasbe-kart.onrender.com**

Nothing to install: it runs in the browser of a laptop, with a keyboard.

## What the game has

**Three ways to play**

- **Single race.** You against five computer karts, on Easy, Normal or Hard, or alone against the clock.
- **Two players.** Two people on one keyboard, on a split screen: one drives with the arrow keys, the other with W, A, S and D.
- **Online.** Up to six people, each on their own computer, race each other live in the same room. Computer karts fill the empty places.

**In a race**

- Six characters of our own, each with their own kart colours and their own dance.
- The Nova lap: a lap of the campus that we built from a video we filmed there, with the school's buildings, the atrium and the beach beyond the road. Two earlier tracks are also there: a test oval and a first campus loop.
- A starting grid with start lights and a 3, 2, 1, GO! countdown, a lap counter and a clock.
- Karts bump into each other, banana peels make a kart spin, arrows show the way, and a warning comes up when you drive the wrong way or miss a checkpoint.
- Three camera views, a small map, and the game on the whole screen with F.
- Computer karts that each drive in their own way: careful, daring, steady. They press the same four keys a player has.
- Sound effects and music, all made by our own code: there are no sound files.

**Before and after a race**

- **Game settings** before every race: computer karts on or off, and how good they are. Online only the host chooses, and also how many people the room takes.
- Someone who arrives during an online race watches it, can move the camera from player to player, and joins at the next start.
- When you finish before the others, your camera moves to a kart that is still driving, and a banner tells you your place and whom you are watching.
- A podium for the first three, with the crowd cheering, and online a results board with everyone's time.
- One click to race again or go back to the menu.

**Accounts and results**

- Create an account with a user name and a password, sign in and out, change your password, delete your account.
- A shared leaderboard: the ten fastest races and laps of each track, from online races.
- "My stats" for each player: most played character, races, wins, podiums, best times and best lap, and a button that downloads your results as a file for Excel.

**Built to be trusted**

- **The server runs every online race.** A browser only says which keys are held. It never says where its kart is or what time it drove, so a player cannot cheat by changing their own page.
- **Everything a browser sends is checked** before the game looks at it, and too many messages or sign-in attempts in a short time are refused.
- **Passwords are never stored.** They are scrambled in a way that cannot be turned back, and the sign-in cookie cannot be read by the page's own code.
- **No secrets in the repository.** The database address lives in settings outside the code.
- **Only two outside libraries** in the running game, both at fixed versions. `npm audit` reports no known vulnerabilities (checked on 20 November 2026).
- **More than 2,600 automatic tests**, for every rule of the game and for the things that must be refused. GitHub runs them on every pull request.
- **Clear messages when something goes wrong:** a wrong password, a full room, a lost connection, a server that is waking up.

## Objectives

1. **Build a complete web application as beginners.** A page in the browser, a server, a database and automatic tests, published at a public address that anyone can open.
2. **Make it a real online game.** People on different computers race each other at the same moment, and everyone sees the same race.
3. **Make it ours.** Our own school as the track, our own characters, drawings, sounds and music.
4. **Make it fair and safe.** The server decides what happens in a race, every input is checked, and accounts are protected.
5. **Check it properly.** A test for every rule, including the actions that must not be allowed, and all tests passing on `main`.
6. **Understand all of it.** Every member can explain every part. That is why the code and the documents are written in plain language.

## Installation

**You do not need to install anything to play.** The online version is at https://novasbe-kart.onrender.com. It is on a free plan, so if the page does not open at once, wait about a minute: the server is waking up.

To run the game on your own computer:

1. Install [Node.js](https://nodejs.org), version 26 or newer.
2. Download the code and go into its folder:

   ```
   git clone https://github.com/catarinaalmeida44/group-project-programming.git
   cd group-project-programming
   ```

3. Download the libraries the project uses. Do this once:

   ```
   npm install
   ```

## How to run

Start the game:

```
npm start
```

Then open http://localhost:3000 in a browser. To stop it, press Ctrl+C in the terminal.

**A copy on your own computer does not do everything the online version does:**

| | Online version | On your computer, `npm start` |
|---|---|---|
| Single race | Yes | Yes |
| Two players on one keyboard | Yes | Yes |
| Online race against people on other computers | Yes | **No.** Your copy only accepts browsers on the same computer |
| The Online page, between two browser windows on the same computer | Yes | Yes |
| Accounts, the leaderboard and "My stats" | Yes | **No.** They need our database, whose address is secret. The menu says so |

To race against other people, or to see accounts and the leaderboard with real data, use the online version.

To try accounts on your own computer anyway, start the game with pretend accounts instead. They are kept in memory, forgotten when you stop it, and never touch the real database:

```
npm run start:pretend
```

For the team: with the database address in a file called `.env` (copy `.env.example` and fill it in), `npm start` has the real accounts, and http://localhost:3000/database-check shows what the server can read from the database.

**The keys**

| Key | What it does |
|---|---|
| ↑ ↓ ← → | Gas, brake and reverse, steer |
| W S A D | The same for player 2, in a two-player race |
| Enter | Online: the host starts the race |
| R | Single race and two players: start again |
| V | Change the camera |
| F | The game on the whole screen, and back |
| M | Sound off and on |
| L | Online: a small meter that shows how good the connection is |

## Tests

Run all the tests:

```
npm test
```

Check the libraries for known vulnerabilities:

```
npm audit
```

The team also has tests that talk to the real database, in tables of their own that they remove afterwards: `npm run test:database`. They need the database address in a file called `.env` (copy `.env.example` and fill it in), so only the team can run them.

## Team

| Name | Student number | GitHub username |
|---|---|---|
| Catarina Almeida | 70573 | catarinaalmeida44 |
| Francisco Fonseca | 72576 | FranFon15 |
| Pedro Collares Pereira | 71022 | pedrocollarespereira |
| Rodrigo Simeão Versos | 72677 | rodrigosversos |

After the two starting commits of the first day, all the work came into `main` through pull requests. The pull requests on GitHub and the diaries in `docs/diary/` show who built what, and when.

## Where things are

| Folder or file | What it is |
|---|---|
| `client/` | Everything the browser shows: the pages, the drawing, the keyboard controls, the sound |
| `server/` | Our game server: sends the pages to the browser, runs the online races, and keeps the accounts and the leaderboard |
| `shared/` | The rules of the game (driving, laps, which user names and passwords are allowed), used by both the browser and the server |
| `tests/` | The automatic tests |
| `WALKTHROUGH.md` | How and why each part is built, what the tests cover and miss, and the known limits |
| `PROJECT_BRIEF.md` | What we set out to build and every decision the team took, with its date |
| `docs/team-guide.md` | Where the project stands, what you need, and how the team works |
| `docs/diary/` | One diary per team member: what was built, why, and what was and was not checked |
| `docs/build-diary.md` | The diary of the first day |
| `docs/two-laptop-checklist.md` | The checks we do by hand, with real laptops, for online play |
| `SECURITY.md` | How to tell us about a security problem privately, and what we already do to keep the game safe |
| `AGENTS.md` | How the team works with coding agents, and the rules they must follow (`CLAUDE.md` points to it) |
| `.env.example` | A list of the secret settings the app needs, with fake values |
| `package.json` | The project's identity card: its name, its commands (such as `npm test`) and the libraries it uses |
| `package-lock.json` | Written automatically. The exact version of every library, so all computers and the server use the same ones |
| `.github/workflows/tests.yml` | Tells GitHub to run the tests on every pull request |
| `.github/workflows/keep-awake.yml` | Tells GitHub to visit the live server every five minutes, so that it does not fall asleep |
| `render.yaml` | Tells Render, the company that keeps our server online, how to set the server up |
| `.node-version` | The exact Node.js version used by Render and by the tests on GitHub |

Each of the folders `client/`, `server/`, `shared/` and `tests/` has a `README.md` of its own that says what every file in it does.

## Credits

- The characters, names, drawings, sounds and music in the game are our own. The track, the karts and the scenery are drawn by our code, and the sounds and the music are made by our code.
- The idea of the driving, karts and banana peels included, comes from kart racing games such as Mario Kart. No characters, names, music or images from any other game are used.
- The campus loop is based on map data © OpenStreetMap contributors, available under the Open Database License (https://www.openstreetmap.org/copyright).
- Libraries, all open source: [ws](https://github.com/websockets/ws) for the live connection of online play, [pg](https://node-postgres.com) to talk to the database, and [Vitest](https://vitest.dev) to run the tests.
- Services: [Render](https://render.com) keeps the server online, [Neon](https://neon.tech) keeps the database, and GitHub keeps the code and runs the tests.
