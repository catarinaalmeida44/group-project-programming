# Nova SBE kart racer (working title)

A 2D online kart racing game set at the Nova SBE Carcavelos campus.
Team project for Introduction to Programming (course 2477) at Nova SBE.

**Status:** the game opens on a main menu (Single race, Cup coming soon, Online, Leaderboard, Settings, and an account corner). You choose a track, the test oval or the first campus track, the campus loop, and drive it alone in the browser or online. A race has a lap counter, a finish time, three camera views and a 3, 2, 1, GO! countdown. Online, up to eight browsers in the room of a track see each other's karts, and the player who has been there longest can start a race for everyone with Enter. You can create an account with a user name and a password. When a signed-in player finishes an online race, the server saves the time, and the leaderboard shows the ten fastest races and laps of each track. The server is on the internet at the link below.

## Play it

Deployed URL: https://novasbe-kart.onrender.com

The server is on a free plan and goes to sleep after 15 minutes without visitors. If the page does not open at once, wait about a minute: it is waking up.

## Team

| Name | Student number | GitHub username |
|---|---|---|
| Catarina Almeida | 70573 | catarinaalmeida44 |
| Francisco Fonseca | 72576 | FranFon15 |
| Pedro Collares Pereira | 71022 | pedrocollarespereira |
| Rodrigo Simeão Versos | _to add_ | rodrigosversos |

## Run it on your own laptop

You need [Node.js](https://nodejs.org) version 26 or newer.

Open a terminal in the project folder and run this once. It downloads the libraries the project uses:

```
npm install
```

Run the tests:

```
npm test
```

Run the app:

```
npm start
```

Then open http://localhost:3000 in a browser. It shows the main menu: click Single race, choose a track and drive with the arrow keys. V changes the camera and R starts again. To stop the app, press Ctrl+C in the terminal.

To try online play on one laptop, click Online, choose a track, and open the same page in a second browser window side by side.

The app runs without a database, and then it has no accounts: the menu says so. To try accounts and the shared leaderboard on your laptop anyway, run this instead of `npm start`:

```
npm run start:pretend
```

It is the same game with pretend accounts kept in memory. They are forgotten when you stop it, and it never touches the real database.

To use the real database, its address has to be in a file called `.env` (copy `.env.example` and fill it in). Then `npm start` has real accounts, `npm run test:database` runs the tests that talk to the database (in tables of their own, which they remove), and http://localhost:3000/database-check shows what the server can read from it. New here? Start with `docs/team-guide.md`.

## Where things are

| Folder or file | What it is |
|---|---|
| `client/` | Everything the browser shows: the page, the drawing, the keyboard controls |
| `server/` | Our game server: sends the page to the browser, runs the races, and keeps the accounts and the leaderboard |
| `shared/` | The rules of the game (driving physics, laps, which user names and passwords are allowed), used by both the browser and the server |
| `tests/` | Automatic tests that check the rules |
| `docs/team-guide.md` | Start here: where the project stands, what you need, and how the team works |
| `docs/build-diary.md` | The diary of the first day, in plain language: what was built and why |
| `docs/diary/` | One diary per team member, for everything after the first day |
| `docs/two-laptop-checklist.md` | The checks we do by hand, with two laptops, for online play |
| `WALKTHROUGH.md` | Answers to the questions staff may ask about the project |
| `PROJECT_BRIEF.md` | What we are building and what has been decided |
| `AGENTS.md` | The rules our coding agents must follow (`CLAUDE.md` points to it) |
| `.env.example` | A list of the secret settings the app needs, with fake values |
| `package.json` | The project's identity card: its name, its commands (such as `npm test`) and the libraries it uses |
| `package-lock.json` | Written automatically. The exact version of every library, so all laptops and the server use the same ones. Never edited by hand |
| `.github/workflows/tests.yml` | Tells GitHub to run the tests on every pull request |
| `render.yaml` | Tells Render, the company that keeps our server online, how to set the server up |
| `.node-version` | The exact Node.js version used by Render and by the tests on GitHub |

## Credits

To be completed as content is added to the game.

- Character balance adapted from Mario Kart 8 Deluxe stat tables compiled by the Super Mario Wiki community. All characters, names, items and art are our own.
- The campus loop is based on map data © OpenStreetMap contributors, available under the Open Database License (https://www.openstreetmap.org/copyright).
