# Nova SBE kart racer (working title)

A 2D online kart racing game set at the Nova SBE Carcavelos campus.
Team project for Introduction to Programming (course 2477) at Nova SBE.

**Status:** one kart can be driven round a test track in the browser, with a lap counter, a finish time and three camera views. On the "Online test" page, up to eight browsers connected to the same server see each other's karts. The server is on the internet at the link below.

## Play it

Deployed URL: https://novasbe-kart.onrender.com

The server is on a free plan and goes to sleep after 15 minutes without visitors. If the page does not open at once, wait about a minute: it is waking up.

## Team

| Name | Student number | GitHub username |
|---|---|---|
| Catarina Almeida | 70573 | catarinaalmeida44 |
| Fran _(full name to add)_ | _to add_ | FranFon15 |
| Pedro Collares Pereira | 71022 | pedrocollarespereira |
| Rodrigo _(full name to add)_ | _to add_ | rodrigosversos |

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

Then open http://localhost:3000 in a browser and drive with the arrow keys. V changes the camera and R starts again. To stop the app, press Ctrl+C in the terminal.

To try online play on one laptop, open http://localhost:3000/online.html in two browser windows side by side.

The app runs without a database. To use the real one, the database address has to be in a file called `.env` (copy `.env.example` and fill it in). Then `npm run test:database` runs the tests that talk to it, and http://localhost:3000/database-check shows what the server can read from it. New here? Start with `docs/team-guide.md`.

## Where things are

| Folder or file | What it is |
|---|---|
| `client/` | Everything the browser shows: the page, the drawing, the keyboard controls |
| `server/` | Our game server: sends the page to the browser and runs the races |
| `shared/` | The rules of the game (driving physics, laps), used by both the browser and the server |
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
- Campus track layouts will be based on map data © OpenStreetMap contributors.
