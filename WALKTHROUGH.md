# Walkthrough notes

Plain-language answers to the questions the teaching staff may ask when they open this repository. Any member can be asked about any part, so everyone should be able to give these answers.

**State on 10 November 2026:** the project skeleton and the automatic tests exist. There is no game yet, so most answers below describe the plan. Each answer is rewritten as the real thing gets built.

## Where does each part live?

| Part | Where | Built yet? |
|---|---|---|
| What the browser shows (page, drawing, keyboard) | `client/` | No |
| The game server | `server/` | No |
| The game rules (physics, laps) | `shared/` | Only one small number helper |
| The automatic tests | `tests/` | Yes, for that helper |
| The instructions that make GitHub run the tests | `.github/workflows/tests.yml` | Yes |
| The database connection | `server/` (exact file to be added) | No |

## Where is data stored, and what exactly is stored?

Nothing is stored yet.

Plan: a Postgres database hosted on Neon. The base will have one simple table that proves the connection works. Later it will hold players, sessions, progress and race results (section 6 of `PROJECT_BRIEF.md`).

## What do the tests cover, and what do they miss?

We run them with `npm test`. GitHub also runs them by itself on every pull request and on every change to `main`.

**Covered today:** one helper, `clamp` in `shared/numbers.js`, which keeps a number between a lowest and a highest value. Ten tests: six for normal use and four for bad input that must be refused (limits the wrong way round, and values that are not numbers).

**Not covered today:** everything else, because nothing else is built.

Plan: automatic tests for every game rule, including rejected actions. Multiplayer timing will be tested by hand, following a written two-laptop checklist.

The tests use a library called Vitest. It is only used while developing. It is not part of the game that players get.

## What happens if the server restarts, the database pauses, or the email service is down?

Nothing is deployed yet. These are the limits we expect from the free hosting plans:

- Render's free server sleeps after 15 minutes without visitors and takes about a minute to wake up.
- Render can restart a free server at any time. A race in progress would be lost, but anything saved in the database is safe.
- Neon's free database pauses after 5 minutes without use and wakes on the next request.

## Why did we build it this way?

- **Our own server runs every race.** The browser only sends which keys are pressed, so nobody can fake a result from their browser.
- **Our own driving physics.** The server has to run the races, and the physics inside game libraries only runs in a browser.
- **One language, JavaScript, for the browser and the server.** This lets both use the very same rules file.
- **Secrets stay out of the repository.** The repository is public, so passwords and keys live only in a local `.env` file and in the hosting settings.

## What are the known limits, and what would we change next?

To be filled in as we build.
