# Walkthrough notes

Plain-language answers to the questions the teaching staff may ask when they open this repository. Any member can be asked about any part, so everyone should be able to give these answers.

**State on 10 November 2026:** a small server that shows a "hello" page, a first version of the driving rules, and automatic tests. Nothing can be driven on screen yet and nothing is online yet, so several answers below describe the plan. Each answer is rewritten as the real thing gets built.

## Where does each part live?

| Part | Where | Built yet? |
|---|---|---|
| What the browser shows (page, drawing, keyboard) | `client/` | Only a "hello" page |
| The game server | `server/app.js` builds it, `server/start.js` starts it | Yes, a first version that only sends the page |
| The driving rules | `shared/physics.js` | Yes, a first version: speeding up, braking, steering, grip, grass |
| Tracks, the ground and walls | `shared/track.js` | Yes |
| Laps and race time | `shared/laps.js` | Yes |
| All the rules put together for one racer | `shared/race.js` | Yes |
| The test track | `shared/tracks/test-oval.js` | Yes. It is a simple loop, not a campus track |
| The drivers and their scores | `shared/characters.js` | One placeholder driver |
| The kinds of ground | `shared/surfaces.js` | Road and grass |
| The automatic tests | `tests/` | Yes, for the driving rules, the server and a number helper |
| The instructions that make GitHub run the tests | `.github/workflows/tests.yml` | Yes |
| The instructions that tell Render how to run the server | `render.yaml` and `.node-version` | Written, not used yet |
| The database connection | `server/` (exact file to be added) | No |

## How does a page reach the browser?

1. The browser asks our server for an address, for example `/`.
2. `server/app.js` looks for the matching file in the `client/` folder (`/` means `index.html`).
3. If the file exists and is a kind the server is allowed to send, the server sends it. Otherwise it answers "Page not found".

The server refuses four things, and each has a test:

- requests that try to change something (only reading is allowed for now)
- files outside the `client/` folder, for example an address such as `/../server/app.js`
- kinds of file that are not on its list (web pages, styles, scripts, data files and two kinds of image)
- addresses that are broken

## How does a kart move?

Time moves in small steps, 60 per second. For each step, the function `stepKart` in `shared/physics.js` takes the kart as it is now, the keys that are pressed, the driver's scores and the kind of ground, and gives back the kart one step later. It does four things in order:

1. **Steering.** It turns the direction the kart points. There is no turning when standing still, and turning is a little slower at top speed.
2. **Pedals.** Gas makes the speed climb toward the top speed, quickly at first and gently near the top. Brake stops the kart quickly and then reverses slowly. With no pedal, the kart slows down gradually.
3. **Grip.** A kart can be moving in a slightly different direction from the one it points: that is a slide. The tyres remove part of the slide in every step. More grip removes it faster.
4. **Moving.** It moves the kart by its speed for one sixtieth of a second.

A driver's scores go from 1 to 5.75. They are not speeds. At the top of `physics.js` there is a short list that says what the lowest and the highest score mean in real motion, for example a top speed from 240 to 360 units per second. Those are the numbers we tune by playtesting.

Our placeholder driver, with middle scores, reaches 80% of its top speed in about 1.2 seconds, stops in about half a second when braking, and keeps about 75% of its top speed on grass.

## How is a track described, and how do walls work?

A track is drawn with letters in a file, one letter for each square of ground: `#` is wall, `.` is road and `,` is grass. Open `shared/tracks/test-oval.js` to see one. When the game starts, `shared/track.js` checks the drawing and stops with a clear error if it is wrong, for example if the start is inside a wall.

For walls, a kart is treated as a circle. After every move, the game checks whether the circle overlaps a wall square. If it does, the kart is pushed back out and bounces: the part of its speed going into the wall is turned round and halved, and the part going along the wall is kept. A head-on hit sends the kart back at half speed. A scrape costs very little. Everything outside the drawing counts as wall, so a kart can never leave the track.

## How are laps counted, and can a player cheat?

A track has checkpoints: invisible rectangles across the road, in driving order. The first one is the finish line. The game keeps one count for each kart: checkpoints passed.

- Driving into the next checkpoint adds one.
- Driving back into the checkpoint before the last one takes one away.
- Driving into any other checkpoint changes nothing.

A lap is complete each time the count reaches a new full round. These cannot complete a lap, and each has a test: skipping a checkpoint, taking them in the wrong order, driving the wrong way round, going back and forth over the finish line, and reversing over the finish line to count the same lap twice.

Race time is counted in steps of the game, 60 per second, not with a clock. A finish time is therefore exact and the same on every computer.

Our first version of this rule had a mistake: a kart driving the wrong way round was given a lap after about three rounds. A test that drives a "robot" kart the wrong way round the test track found it, and the rule was rewritten as described above.

## Where is data stored, and what exactly is stored?

Nothing is stored yet.

Plan: a Postgres database hosted on Neon. The base will have one simple table that proves the connection works. Later it will hold players, sessions, progress and race results (section 6 of `PROJECT_BRIEF.md`).

## What do the tests cover, and what do they miss?

We run them with `npm test`. GitHub also runs them by itself on every pull request and on every change to `main`. There are 132 tests today.

**Covered today**

- Tracks and walls in `shared/track.js`. Thirty-five tests: reading a track, twelve kinds of badly drawn track that must be refused, the ground at a spot, and bouncing off walls from every side and in a corner.
- Laps in `shared/laps.js`. Twenty-seven tests. Fourteen of them are laps that must not count.
- Whole races in `shared/race.js`. Thirteen tests. A small "robot driver" written in the test file steers a kart round the test track: three whole laps, the wrong way round, and flat out into a wall.
- The driving rules in `shared/physics.js`. Thirty-four tests: speeding up, top speed, coasting, braking, reversing, steering, grip, grass, and bad input that must be refused or ignored (keys that are not exactly "pressed", scores that are out of range, a driver with a missing score). They compare behaviours, such as "more acceleration reaches top speed sooner", instead of exact numbers, so we can tune the numbers without breaking the tests.
- `clamp` in `shared/numbers.js`, which keeps a number between a lowest and a highest value. Ten tests: six for normal use and four for bad input that must be refused.
- The server in `server/app.js`. Thirteen tests. Seven check what it must do: send the page, the style file and the health check. Six check what it must refuse: missing pages, requests that change things, file kinds not on the list, files outside the `client/` folder (seven different ways of writing such an address), and two kinds of broken address.

The server tests start a real copy of the server on the computer running the tests and send it real requests.

To check that the tests really guard the rules, we broke the rules on purpose in 33 different ways, one at a time (for example "grass is as fast as road" and "driving backwards is not counted"). Every time, at least one test failed.

**Not covered today**

- How the driving feels. No test can say whether a kart is fun to drive. That needs a screen and a person, which comes with the next steps.
- Whether the page looks right in a browser. That was checked by eye.
- The server running on Render. It is not online yet.
- Everything that is not built yet.

Plan: automatic tests for every game rule, including rejected actions. Multiplayer timing will be tested by hand, following a written two-laptop checklist.

The tests use a library called Vitest. It is only used while developing. It is not part of what runs on Render or what players get.

## What happens if the server restarts, the database pauses, or the email service is down?

Nothing is deployed yet. These are the limits we expect from the free hosting plans:

- Render's free server sleeps after 15 minutes without visitors and takes about a minute to wake up.
- Render can restart a free server at any time. A race in progress would be lost, but anything saved in the database is safe.
- Render's free plan gives 750 running hours a month, which is enough for one server that is always on.
- Neon's free database pauses after 5 minutes without use and wakes on the next request.

## Why did we build it this way?

- **Our own server runs every race.** The browser only sends which keys are pressed, so nobody can fake a result from their browser.
- **Our own driving physics.** The server has to run the races, and the physics inside game libraries only runs in a browser.
- **The driving rules never change the kart they are given.** They give back a new kart instead. A test can then compare "before" and "after", and later the browser can try a move without disturbing the real one.
- **Time moves in fixed steps of one sixtieth of a second.** The same keys then always give exactly the same result, on any computer, fast or slow. The browser and the server must agree on where every kart is, so this matters.
- **Only an exact "pressed" counts as a pressed key.** Anything else a browser might send counts as not pressed, so a strange message cannot produce a strange movement.
- **One language, JavaScript, for the browser and the server.** This lets both use the very same rules file.
- **Secrets stay out of the repository.** The repository is public, so passwords and keys live only in a local `.env` file and in the hosting settings.
- **No outside library for the server.** It is built on `http`, the web server that comes with Node.js. Fewer libraries means fewer things that can have security problems, and the whole server is short enough to read in one sitting. The usual alternative is a library called Express.
- **The server only sends file kinds on a short list, and only from one folder.** A file we forget somewhere cannot leak by accident.
- **The server's settings for Render are a file in the repository** (`render.yaml`), not something typed into a web form. Anyone can read how the live server is set up, and changes to it go through a pull request.

## What are the known limits, and what would we change next?

- The numbers in the driving rules are first guesses. Nobody has driven the kart yet, so they will change once we can.
- The driving rules have no drifting, bumping between karts, sand or sea yet.
- A kart is a circle for walls, although it will be drawn as a rectangle. Its corners can look as if they poke slightly into a wall.
- Walls are whole squares. A track cannot have a diagonal or curved wall yet, only steps.
- The server reads a file from disk for every request. That is fine for a few players. With many visitors we would keep the files in memory.
- The rest is to be filled in as we build.
