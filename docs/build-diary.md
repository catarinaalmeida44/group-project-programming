# Build diary

A dated record, in plain language, of what was done in this project, why, and how to check it. Anyone on the team can read it and ask questions about it later. The newest entry is at the top of the "Entries" section.

## The plan for the base

The base is the working foundation described in section 8 of `PROJECT_BRIEF.md`. It is built in nine small steps. Each step is one pull request.

| Step | What it adds | State |
|---|---|---|
| 1 | Project skeleton: folders, README, rules for agents, example secrets file, these notes | Merged into `main` on 10 Nov (pull request #2) |
| 2 | Automatic tests: one example test, and GitHub runs the tests on every pull request | Merged into `main` on 10 Nov (pull request #3) |
| 3 | A small server on Render that shows a "hello" page at a public link | The server is built and works on a laptop. Not on GitHub yet. Not online yet |
| 4 | Database: the server writes and reads one row in Neon | Not started |
| 5 | Driving rules, first version: one kart speeds up, brakes, steers and slides (tests only, no screen) | Built. Not on GitHub yet |
| 6 | Test track, walls and laps: a simple oval with walls to bounce off, and laps that only count if no checkpoint is skipped (tests only) | Built. Not on GitHub yet |
| 7 | Drive in the browser: arrow keys, lap counter, finish time | Not started |
| 8 | First online connection: two browsers see each other's kart | Not started |
| 9 | Two-laptop checklist, run on two different networks | Not started |

Steps 3 and 4, step 5 and step 6 touch different files, so three people can build them at the same time once step 2 is merged.

## Words used in this diary

| Word | Meaning |
|---|---|
| Repository (repo) | The project folder with its whole history. One copy is on GitHub, one on each laptop |
| `main` | The official version of the project. This is the version that gets put online |
| Branch | A separate copy of the project where changes can be made without touching `main` |
| Commit | A saved snapshot of changes, with a short message saying what changed |
| Push | Send the commits from a laptop to GitHub |
| Pull request (PR) | A request to bring a branch's changes into `main`. A teammate reads it and approves it |
| Merge | Bring the changes of a pull request into `main` |
| Deploy | Put the app online at a public link |
| Library | Ready-made code written by other people that our project uses |
| Node.js | The program that runs JavaScript outside a browser. Our server and our tests need it |
| Agent | The AI coding assistant (Claude Code or Codex) that writes most of the code |

## Entries

### 10 November 2026: Step 6, test track, walls and laps

Done on Catarina's laptop with Claude Code. This step's branch, `test-track`, starts from `driving-rules`, so it contains steps 3 and 5 as well.

**What was done**

The project now has a track to drive on, walls that karts bounce off, and laps that are counted and timed. There is still nothing to see on a screen. That is the next step.

| File | What it is for |
|---|---|
| `shared/track.js` | Reads a track drawn with letters, says what the ground is at any spot, and makes karts bounce off walls |
| `shared/tracks/test-oval.js` | The test track: a loop of road four squares wide, around a block of wall with a strip of grass round it. Open the file to see it drawn with letters |
| `shared/laps.js` | Counts checkpoints, laps and race time |
| `shared/race.js` | Puts the rule files together. `stepRacer` moves one racer forward by one step: look at the ground, move the kart, bounce off walls, update the laps |
| `tests/track.test.js`, `tests/laps.test.js`, `tests/race.test.js` | Seventy-five new tests |
| `tests/small-track.js` | A tiny track shared by the tests. Not a test itself |
| `README.md`, `WALKTHROUGH.md`, `shared/README.md`, `tests/README.md` | Updated |

**The new rules, in plain words**

- **Track.** One letter per square of ground: `#` wall, `.` road, `,` grass. A badly drawn track is refused with a message that says what is wrong.
- **Walls.** A kart is treated as a circle. If it overlaps a wall it is pushed back out and bounces. A head-on hit sends it back at half speed. A scrape along a wall costs very little. Everything outside the drawing counts as wall.
- **Laps.** A track has checkpoints, invisible rectangles across the road, and the first one is the finish line. The game counts the checkpoints a kart has passed: the next one adds one, going back through the one before takes one away, any other changes nothing. A lap is complete each time the count reaches a new full round.
- **Time.** Counted in steps of the game, 60 per second, not with a clock. A finish time is exact and the same on every computer.
- **After the finish.** The keys are ignored and the kart rolls to a stop.

**A mistake the tests found**

The first version of the lap rule only remembered "which checkpoint comes next" and ignored all the others. One test drives a small robot kart the wrong way round the test track for a minute and expects zero laps. It failed: the kart had been given two laps. Going the wrong way, the kart still met the "next" checkpoint once per round, so after three rounds or so it had collected them all.

The rule was rewritten to count checkpoints forwards and backwards, as described above. The tests that only place a kart in checkpoints by hand had not found this, because none of them went round more than twice. There is now one that goes round ten times.

**The robot driver**

Nobody can press keys during a test. So `tests/race.test.js` has a few lines of code that steer a kart towards the next corner of the track. With today's numbers the robot finishes three laps in 24.3 seconds, about 8 seconds a lap. It is only in the tests, not in the game. The computer karts planned for later will work in a similar way.

**Decisions**

All made by the agent, please confirm:

- Tracks are drawn with letters in a file. This is easy to read and to change by hand. The campus tracks are planned to be drawn in a map editor called Tiled, which also stores a track as a grid of squares, so the same rules will work.
- A square of track is 32 units wide. A kart is a circle 10 units from middle to edge for walls.
- A scrape along a wall keeps its speed along the wall. The brief says "bounce back and lose about half your speed", which is what happens in a head-on hit. Halving the whole speed on every touch would stop a kart almost dead whenever it brushed a wall.
- A track needs a finish line and at least two more checkpoints. With fewer, "the one before" and "the next one" would be the same checkpoint.
- Checkpoints cover the grass beside the road too, so a kart that runs wide onto the grass does not lose its lap.
- After the finish, the keys are ignored.

**Git steps the agent ran, and what each one means**

| Command | In plain words |
|---|---|
| `git switch -c test-track` | Make a new branch called `test-track`, starting from `driving-rules` |
| `git add` and `git commit` | Save the snapshot with a message |

**What was checked, and what was not**

- Checked: `npm test`. 132 of 132 tests pass (57 from before, 75 new).
- Checked that the tests really guard the rules: the agent broke the track, wall and lap rules on purpose in 19 different ways, one at a time, for example "driving backwards is not counted" and "no walls during a race". Every time at least one test failed. The files were put back exactly as they were.
- **Not checked:** how the track and the walls feel to drive. There is no screen yet.

**How to check this step yourself**

In a terminal in the project folder, run `npm test`. The last lines should say "Tests 132 passed (132)".

**What comes next**

Step 7: drawing the track and the kart in the browser, and driving with the arrow keys.

### 10 November 2026: Step 5, driving rules, first version

Done on Catarina's laptop with Claude Code. Step 4 (the database) is skipped for now, because it needs a Neon account and the server online first. It comes back later.

**First, where things stood**

- Step 2 is merged: pull request #3 went into `main`.
- The step 3 branch, `small-server`, had not reached GitHub when this step started. So this step's branch, `driving-rules`, starts from `small-server` and contains step 3 as well. Publishing `driving-rules` sends both steps to GitHub in one go.

**What was done**

The project now knows how a kart moves. There is still nothing to see on a screen: this step is only the rules and their tests. The screen comes in step 7.

| File | What it is for |
|---|---|
| `shared/physics.js` | The driving rules. The main function, `stepKart`, takes a kart and the keys that are pressed and gives back the kart one sixtieth of a second later |
| `shared/characters.js` | The drivers and their scores. One placeholder driver with middle scores (3.5 out of 5.75) |
| `shared/surfaces.js` | The kinds of ground: road and grass |
| `tests/physics.test.js` | Thirty-four tests for the driving rules |
| `README.md`, `WALKTHROUGH.md`, `shared/README.md`, `tests/README.md` | Updated. `shared/README.md` has the rules as a table in plain words |

**The rules, in plain words**

- **Speeding up.** Speed climbs toward the top speed, quickly when slow and gently near the top.
- **Coasting.** With no pedal the kart slows down gradually and stops.
- **Braking.** The kart stops quickly. Holding the brake after stopping reverses, slowly. If gas and brake are both pressed, the brake wins.
- **Steering.** No turning when standing still. Turning is a little slower at top speed. Steering is mirrored when reversing, as in a real car.
- **Grip.** In a corner the kart can slide sideways for a moment. More grip stops the slide sooner.
- **Grass.** The top speed is lower on grass. A kart that leaves the road at full speed is slowed down quickly.

Not in this version: walls, laps, drifting and boosts, karts bumping each other, sand and sea. Walls were planned for this step, but a wall needs a track to stand on, so they move to step 6 together with the test track.

**How the placeholder kart behaves with today's numbers**

These were measured by running the rules, not by driving. "Units" are pixels of the track drawing.

| What | Value |
|---|---|
| Top speed on the road | 303 units per second |
| Top speed on grass | 227 units per second, which is 75% of the road speed. The brief asks for about 74% for a middle driver |
| Time to reach 80% of top speed | 1.2 seconds |
| Time to stop by coasting from top speed | 2.5 seconds |
| Time to stop by braking from top speed | 0.5 seconds |
| Reverse top speed | 90 units per second |
| Holding a full turn at full gas | Settles at 85% of top speed, in a circle about 127 units wide from centre to edge |

**Why it was done this way**

- All the numbers to tune are together at the top of `physics.js`, with a comment on each.
- The tests compare behaviours ("more acceleration reaches top speed sooner") and not exact numbers, as the brief asks. Changing a number while playtesting does not break them.
- `stepKart` never changes the kart it is given. It gives back a new one.
- Only an exact "pressed" counts as a pressed key. Anything else counts as not pressed.
- A driver's score outside 1 to 5.75 is pulled back to the nearest allowed score. A score that is missing or not a number stops the rules with an error.

**Decisions**

All made by the agent, please confirm:

- Distances are measured in pixels of the track drawing, and speeds in pixels per second.
- The starting numbers at the top of `physics.js`. They are first guesses and will change when the kart can be driven.
- The keys are four yes-or-no values: gas, brake, left, right.
- The brake wins when gas and brake are pressed together.
- Steering is mirrored when reversing.
- The placeholder driver has five scores for now: speed, acceleration, handling, grip and off-road. Weight and mini-turbo are added with the rules that need them.
- Only road and grass for now.

**Git steps the agent ran, and what each one means**

| Command | In plain words |
|---|---|
| `git fetch` | Ask GitHub what changed there. This showed that step 2 was merged and that `small-server` was not on GitHub |
| `git fetch origin main:main` | Bring the laptop's copy of `main` up to date with GitHub's, without changing the files being worked on |
| `git switch -c driving-rules` | Make a new branch called `driving-rules`, starting from `small-server` |
| `git add` and `git commit` | Save the snapshot with a message |

**What was checked, and what was not**

- Checked: `npm test`. 57 of 57 tests pass (23 from before, 34 new).
- Checked that the tests really guard the rules: the agent broke the rules on purpose in 14 different ways, one at a time, for example "grass is as fast as road" and "the kart can steer while standing still". Every time at least one test failed. Then the file was put back exactly as it was and all tests passed again.
- **Not checked:** how the driving feels. Nobody has driven the kart, because there is no screen yet.
- Nothing in this step can be seen in a browser, so nothing was checked there.

**How to check this step yourself**

In a terminal in the project folder, run `npm test`. The last lines should say "Tests 57 passed (57)".

**What comes next**

Step 6: a simple test track with walls to bounce off, and laps. Then step 7, where the kart can be driven on screen.

### 10 November 2026: Step 3, a small server (not online yet)

Done on Catarina's laptop with Claude Code.

**First, a check on step 2**

The one thing not checked in step 2 is now checked. On pull request #3, GitHub ran the tests by itself and they passed in 11 seconds. The pull request also says "At least 1 approving review is required", so `main` already refuses changes that no teammate approved.

Pull request #3 was not merged yet when this step started. It was waiting for Fran's approval. So this step's branch starts from the step 2 branch instead of from `main`.

**What was done**

The project now has a server: a program that waits for browsers to ask for a page and sends it to them. Running `npm start` on a laptop and opening http://localhost:3000 shows a "hello" page. `localhost` means "this same computer", so nobody else can see it yet.

| File | What it is for |
|---|---|
| `server/app.js` | Builds the server and decides what to answer for each request |
| `server/start.js` | Starts the server. This is what `npm start` runs |
| `client/index.html` | The "hello" page |
| `client/style.css` | How the page looks |
| `tests/server.test.js` | Thirteen tests for the server |
| `render.yaml` | Tells Render how to set the server up: free plan, Frankfurt, which commands to run. Not used until the Render account exists |
| `.node-version` | The exact Node.js version (26.13.0). Render and the tests on GitHub both read it, so they use the same one |
| `package.json` | Added the command `npm start`. Changed the Node.js rule from "26 or newer" to "any 26", because Render advises against a rule with no upper limit |
| `.github/workflows/tests.yml` | Now reads the Node.js version from `.node-version` |
| `README.md`, `AGENTS.md`, `WALKTHROUGH.md` and the notes in `server/`, `client/`, `tests/` | Updated |

**What the server does**

- Sends files from the `client/` folder. The address `/` means `index.html`.
- Answers `/health` with a short "I am alive" message. Render will visit that address to check the server is running.

**What the server refuses**

- Requests that try to change something. Only reading is allowed for now.
- Files outside the `client/` folder. An address such as `/../server/app.js` means "go up one folder", and would otherwise let anyone read any file of the project.
- Kinds of file that are not on its short list.
- Addresses that are broken.

**No new library**

The server is built on `http`, the web server that comes with Node.js. The usual alternative is a library called Express, which would be less code for us to write but brings dozens of other packages with it. The brief asks for few libraries, and the security grade asks for minimal dependencies.

**Decisions**

- Decision made by the agent, please confirm: no server library (see above).
- Decision made by the agent, please confirm: the Render service is called `novasbe-kart`, so the public link will be close to `novasbe-kart.onrender.com`. The game title is still open, so the name is neutral. It is hard to change later.
- Decision made by the agent, please confirm: the Render region is Frankfurt, the closest one to Portugal. It cannot be changed after the service is created.
- Decision made by the agent, please confirm: on a laptop the server only accepts visitors from that same laptop. This avoids a Windows firewall question. On Render it accepts visitors from the internet.

**Git steps the agent ran, and what each one means**

| Command | In plain words |
|---|---|
| `git fetch` | Ask GitHub what changed there. This showed that the step 2 branch was on GitHub and `main` had not changed |
| `git switch -c small-server` | Make a new branch called `small-server`, starting from the step 2 branch |
| `git add` and `git commit` | Save the snapshot with a message |

**What was checked, and what was not**

- Checked: `npm test`. 23 of 23 tests pass (10 from step 2, 13 new).
- Checked that the safety tests really work: the agent switched off the "stay inside the `client/` folder" check on purpose, ran the tests, and the right test failed. Then it switched the check back on and all tests passed again.
- Checked in a browser on this laptop: the page shows with its style, `/health` answers `{"status":"ok"}`, and the browser reports no errors.
- **Not checked:** the server on Render. Nothing is online yet.
- **Not checked:** that Render accepts `render.yaml` as written. It follows Render's documentation, but it has not been used yet.

**How to check this step yourself**

In a terminal in the project folder, run `npm start`, then open http://localhost:3000 in a browser. You should see "Nova SBE kart racer" on a dark background. Press Ctrl+C in the terminal to stop the server.

**Still to do**

- Put the server online. This needs a Render account, which only Catarina can create, and it needs this step to be merged into `main` first, because Render takes the code from `main`.
- Add the public link to the README.
- In the GitHub settings, also require the "Run the tests" check before merging. One approval is already required.

**What comes next**

Putting the server online, then step 5, the first version of the driving rules.

### 10 November 2026: Step 2, automatic tests

Done on Catarina's laptop with Claude Code.

**What was done**

The project can now check itself. One command, `npm test`, runs a set of small checks and says whether they pass. GitHub will run the same checks by itself on every pull request.

First, with Catarina's OK, Node.js version 26.13.0 was installed on her laptop. It came from the official Node.js package, through `winget`, the installer tool that is part of Windows.

| File | What it is for |
|---|---|
| `package.json` | The project's identity card: its name, the command `npm test`, and the libraries it uses with their exact versions |
| `package-lock.json` | Written automatically by `npm`. It lists the exact version of every library, including the helpers our library needs. Never edited by hand |
| `.npmrc` | One setting: when a library is added, write down its exact version number |
| `shared/numbers.js` | The first real piece of the rules: `clamp`, which keeps a number between a lowest and a highest value. The driving rules will use it, for example so a kart's speed never goes above its top speed |
| `tests/numbers.test.js` | Ten tests for `clamp`: six for normal use, four for bad input that must be refused |
| `.github/workflows/tests.yml` | Instructions for GitHub: on every pull request, install the libraries and run `npm test` |
| `README.md`, `AGENTS.md`, `WALKTHROUGH.md`, `tests/README.md`, `shared/README.md` | Updated with the new commands and files |

**New library: Vitest 5.1.0**

- What it does: finds the test files, runs them and reports which passed and which failed.
- Why we need it: the brief proposes it (section 7), and it gives clear messages when a test fails.
- The alternative: the test runner that is built into Node.js, which needs no library at all.
- It is only used while developing. It is not part of the game that players get.
- It brings 35 small packages with it (its own helpers). `npm audit`, the command that looks for known security problems, found 0 on 10 November 2026.

**Why it was done this way**

- A real helper (`clamp`) was tested instead of a pretend example such as "1 + 1 = 2", so the first test already protects something the game will use.
- `clamp` stops with an error on bad input instead of quietly returning a wrong number. One wrong number in the driving rules would spread to the kart's position and be hard to find.
- The GitHub instructions only have permission to read the project, not to change it.

**Decisions**

- Decision made by the agent, please confirm: using Vitest, as the brief proposes, instead of the test runner built into Node.js.
- Decision made by the agent, please confirm: the project needs Node.js 26 or newer (the current long-term version).
- Decision made by the agent, please confirm: libraries are added one at a time, when they are first needed. Earlier the agent had suggested adding three at once, but that was to help three people work at the same time, which is not what is happening now.

**Git steps the agent ran, and what each one means**

| Command | In plain words |
|---|---|
| `git fetch` | Ask GitHub what changed there, without changing any file on the laptop. This showed that `project-skeleton` had arrived on GitHub and was not merged yet |
| `git switch -c automatic-tests` | Make a new branch called `automatic-tests`. It starts from `project-skeleton`, not from `main`, because step 1 is not merged yet and step 2 builds on it |
| `git add` and `git commit` | Save the snapshot with a message |

Sending the branch to GitHub is done by Catarina with "Publish branch" in GitHub Desktop, as in step 1.

**What was checked, and what was not**

- Checked: `npm test` on this laptop. 10 of 10 tests pass.
- Checked: `npm ci`, the clean install that GitHub will do, works, and the tests pass after it.
- Checked: `npm audit` reports 0 known vulnerabilities.
- **Not checked yet:** that GitHub really runs the tests on a pull request. This can only be seen once the pull request for this branch is open. Look for a line called "Run the tests" with a green tick near the bottom of the pull request page.

**How to check this step yourself**

In a terminal in the project folder, run `npm install` once and then `npm test`. The last lines should say "Tests 10 passed (10)".

**Step 1 was merged in the meantime**

While this step was being built, the step 1 pull request (#2) was merged into `main`. So the pull request for this step shows only the step 2 files.

**Still to do after this is merged**

Protect `main` in the GitHub settings: changes only through a pull request, with one approval and passing tests. Only Catarina can do this, as the owner of the repository.

**What comes next**

Step 3, a small server that shows a "hello" page.

### 10 November 2026: Step 1, project skeleton

Done on Catarina's laptop with Claude Code.

**What was done**

No game code yet. This step only prepares the project so that everything built later has a clear place and clear rules.

| File or folder | What it is for |
|---|---|
| `README.md` | Rewritten. It was broken by Notepad (the "Team" heading showed as plain text). It now has the fields the course requires: deployed link, team table, commands to run the app and the tests. The link and the commands are placeholders until they exist |
| `AGENTS.md` | The rules every coding agent must follow in this project, so all four of us get the same behaviour. It is a draft for the team to approve |
| `CLAUDE.md` | Two lines telling Claude Code to follow `AGENTS.md` |
| `.env.example` | A list of the secret settings the app will need, with fake values. The real values go in a file called `.env`, which git ignores |
| `client/`, `server/`, `shared/`, `tests/` | The four folders of the project. Each has a short note saying what will live there. Git does not keep empty folders, which is why each one has a note in it |
| `WALKTHROUGH.md` | Starter answers to the questions staff may ask. Most say "not built yet" for now |
| `docs/build-diary.md` | This diary |
| `PROJECT_BRIEF.md` | Three small updates: the team table, the git decision below, and a line about this diary |

**Why it was done this way**

- The course grades the README fields and forbids secrets in the repository, so both are set up before any code exists.
- The rules file comes first so that every later step, by any member's agent, follows the same rules.
- The course pages have no ready-made list of rules to copy. `AGENTS.md` is built from section 2 of our brief and from the advice in the course guides "Coding agents" and "Working as a team".

**Decisions**

- Decided by Catarina on 10 November: the agent may do the git steps itself (create a branch, commit, push), as long as it explains each step and writes it down here. The agent never merges into `main`. Teammates confirm this by approving the pull request.
- Decision made by the agent, please confirm: the folder names `client`, `server`, `shared`, `tests` and `docs`.
- Decision made by the agent, please confirm: keeping this diary as a file in the repository, so all four members can read it.

**Git steps the agent ran, and what each one means**

| Command | In plain words |
|---|---|
| `git switch main` | Go to the official version of the project on this laptop |
| `git switch -c project-skeleton` | Make a new branch called `project-skeleton` and move onto it, so `main` is not touched |
| `git add` | Choose which changed files go into the next snapshot |
| `git commit` | Save the snapshot with a message |
| `git push` | Send the branch to GitHub so teammates can see it. **This one did not work**, see below |

The push failed because the login to GitHub on this laptop is kept inside GitHub Desktop, and the agent cannot use it from outside. So Catarina sends the branch to GitHub herself with the "Publish branch" button in GitHub Desktop, and then opens the pull request with the "Create Pull Request" button.

**What was checked, and what was not**

- There is no program yet, so there was nothing to run or test.
- Checked: git ignores a file called `.env` and does not ignore `.env.example`.
- Checked: no real secret is in any file. The values in `.env.example` are fake.

**Found along the way**

- Catarina's pull request #1 (adding her name) was already merged into `main`.
- Node.js is not installed on Catarina's laptop. It is needed from step 2 onwards.
- Git is not installed on its own on this laptop. The agent uses the copy of git that comes inside GitHub Desktop.
- There is a branch called `Name` on GitHub with no changes in it. It looks like a leftover and can be deleted on GitHub.

**Still open**

- The teaching staff have not yet confirmed in writing that JavaScript is approved. The course guide says a move away from Python is decided case by case with the staff.
- Full names and student numbers of Fran, Pedro and Rodrigo are missing from the README. Each of them can add their own as a first small pull request.
- Who owns which area (the table at the end of `AGENTS.md`).

**How to check this step yourself**

Open the repository on GitHub and look at the `project-skeleton` branch. The README should show a proper "Team" heading with a table, and the folders `client`, `server`, `shared`, `tests` and `docs` should be there.

**What comes next**

Step 2, automatic tests. It needs Node.js on the laptop.
