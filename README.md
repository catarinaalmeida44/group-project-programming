# Nova SBE kart racer (working title)

A 2D online kart racing game set at the Nova SBE Carcavelos campus.
Team project for Introduction to Programming (course 2477) at Nova SBE.

**Status:** project skeleton and automatic tests. There is no game to play yet.

## Play it

Deployed URL: _not deployed yet (it will be added when the first server is online)_

## Team

| Name | Student number | GitHub username |
|---|---|---|
| Catarina Almeida | 70573 | catarinaalmeida44 |
| Fran _(full name to add)_ | _to add_ | FranFon15 |
| Pedro _(full name to add)_ | _to add_ | pedrocollarespereira |
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

Run the app: _not available yet (coming with the first server)_

## Where things are

| Folder or file | What it is |
|---|---|
| `client/` | Everything the browser shows: the page, the drawing, the keyboard controls |
| `server/` | Our game server: sends the page to the browser and runs the races |
| `shared/` | The rules of the game (driving physics, laps), used by both the browser and the server |
| `tests/` | Automatic tests that check the rules |
| `docs/build-diary.md` | A dated diary, in plain language, of what was built and why |
| `WALKTHROUGH.md` | Answers to the questions staff may ask about the project |
| `PROJECT_BRIEF.md` | What we are building and what has been decided |
| `AGENTS.md` | The rules our coding agents must follow (`CLAUDE.md` points to it) |
| `.env.example` | A list of the secret settings the app needs, with fake values |
| `package.json` | The project's identity card: its name, its commands (such as `npm test`) and the libraries it uses |
| `package-lock.json` | Written automatically. The exact version of every library, so all laptops and the server use the same ones. Never edited by hand |
| `.github/workflows/tests.yml` | Tells GitHub to run the tests on every pull request |

## Credits

To be completed as content is added to the game.

- Character balance adapted from Mario Kart 8 Deluxe stat tables compiled by the Super Mario Wiki community. All characters, names, items and art are our own.
- Campus track layouts will be based on map data © OpenStreetMap contributors.
