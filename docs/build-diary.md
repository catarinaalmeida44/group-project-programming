# Build diary

A dated record, in plain language, of what was done in this project, why, and how to check it. Anyone on the team can read it and ask questions about it later. The newest entry is at the top of the "Entries" section.

## The plan for the base

The base is the working foundation described in section 8 of `PROJECT_BRIEF.md`. It is built in nine small steps. Each step was meant to be one pull request. Steps 3, 5, 6 and 7 ended up together in one (see the entry "The agent can now send work to GitHub").

| Step | What it adds | State |
|---|---|---|
| 1 | Project skeleton: folders, README, rules for agents, example secrets file, these notes | Merged into `main` on 10 Nov (pull request #2) |
| 2 | Automatic tests: one example test, and GitHub runs the tests on every pull request | Merged into `main` on 10 Nov (pull request #3) |
| 3 | A small server on Render that shows a "hello" page at a public link | Online since 10 Nov at https://novasbe-kart.onrender.com. Still to see: a merge into `main` putting the new version online by itself |
| 4 | Database: the server writes and reads one row in Neon | Not started |
| 5 | Driving rules, first version: one kart speeds up, brakes, steers and slides (tests only, no screen) | Merged into `main` on 10 Nov (pull request #4) |
| 6 | Test track, walls and laps: a simple oval with walls to bounce off, and laps that only count if no checkpoint is skipped (tests only) | Merged into `main` on 10 Nov (pull request #4) |
| 7 | Drive in the browser: arrow keys, lap counter, finish time | Merged into `main` on 10 Nov (pull request #4) |
| 7b | Camera views: from above following the kart, tilted from behind the kart, and a small map. Not in the original plan | Built. On GitHub in the branch `online-play`, together with step 8. No pull request yet |
| 8 | First online connection: two browsers see each other's kart | Built, and it works between two browser tabs on one laptop. On GitHub in the branch `online-play`. Not tried between two laptops yet |
| 9 | Two-laptop checklist, run on two different networks | The checklist is written (`docs/two-laptop-checklist.md`). It can be run once the `online-play` pull request is merged and the online page is at the public link |

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

### 10 November 2026: The server is on the internet

Catarina did this herself on Render's website, with Claude Code telling her the steps. No code changed, only notes.

**What was done**

The game has a public link: https://novasbe-kart.onrender.com

1. Catarina made a Render account by signing in with GitHub.
2. She gave Render access to this repository. The advice was to choose "Only select repositories" and pick just this one. The agent cannot see which she chose.
3. She created a "Blueprint" from the repository. A Blueprint means: Render reads the file `render.yaml` in our project and sets the server up from it. Nobody typed any settings into a form.
4. Render built and started the server from the `main` branch.

**What `render.yaml` told Render**

- One web server called `novasbe-kart`, on the free plan, in Frankfurt.
- To prepare it: `npm ci --omit=dev`, which downloads our libraries without the test tools.
- To start it: `npm start`.
- To check it is alive: visit `/health`.
- To put a new version online after every change to `main`.

**What is online right now**

The version in `main`: the practice race with the whole track on screen. The camera views and online play are in the branch `online-play` and appear online once that pull request is merged.

**A worry that came up**

Render's review page did not show the word "Free", and Catarina asked whether she would be charged. Our file says `plan: free`, and Render can only charge a payment card that has been given to it. The page carried a standard notice that future changes to the file are applied automatically and may change costs. In this project that file only changes through a reviewed pull request.

**What was checked, and what was not**

- Checked from outside, by the agent: https://novasbe-kart.onrender.com/health answers `{"status":"ok"}`, and the main address sends our game page with the title "Nova SBE kart racer".
- Checked on Render by Catarina: the Blueprint page shows the service as created, with a green tick.
- **Not checked yet:** that the service page on Render says "Free". Catarina was asked to look.
- **Not checked yet:** that merging into `main` puts the new version online by itself. That will be seen when the `online-play` pull request is merged.
- **Not checked yet:** the two-laptop checklist.

**Good to know**

- The free server goes to sleep after 15 minutes without visitors and takes about a minute to wake up. Open the link a few minutes before showing it to anyone.
- No secret was needed for this step. The project has none yet. The first one will be the database address, which goes into Render's "Environment" page and never into the repository or this chat.

**What comes next**

Merge the `online-play` pull request, check that the new version appears at the link, then run the two-laptop checklist.

### 10 November 2026: Step 8, first online connection

Done on Catarina's laptop with Claude Code. The branch is `online-play`. It starts from `camera-views`, so it contains the camera work as well, and the two will go into one pull request.

**What was done**

There is a second page, "Online test", next to the practice page. Everyone who opens it drives on the same test track and sees everyone else's kart, each in its own colour. Our server moves all the karts.

How it works, in four lines:

1. The browser opens a live connection to the server and sends only which keys are held.
2. The server keeps one kart for each connected browser and moves them all, 60 steps a second, with the same rules file the practice race uses.
3. 20 times a second the server sends every browser the state of all karts.
4. The browser draws what it is told. It moves no kart itself.

| File | What it is for |
|---|---|
| `server/room.js` | New. The karts of everyone driving together. Knows nothing about the internet |
| `server/messages.js` | New. Checks every message a browser sends |
| `server/online.js` | New. The live connections: who may connect, what they may send, and sending the updates |
| `server/start.js` | Switches online play on when the server starts |
| `client/online.html`, `client/online.js` | New. The online page |
| `client/net.js` | New. Makes online karts move smoothly between the server's updates |
| `client/hud.js` | New. The lap counter, clock and message, taken out of `main.js` so both pages share it |
| `client/draw.js` | Draws other players' karts, a colour for each player, and a dot for each on the small map |
| `client/main.js`, `client/index.html`, `client/style.css` | Use the shared parts, and link the two pages to each other |
| `docs/two-laptop-checklist.md` | New. Thirteen checks to do by hand with two laptops |
| `tests/room.test.js`, `tests/online.test.js`, `tests/net.test.js` | New. Seventy-four tests |
| `tests/client.test.js` | Four more tests |
| `package.json`, `package-lock.json` | The new library |
| `PROJECT_BRIEF.md`, `README.md`, `WALKTHROUGH.md` and the notes in `server/`, `client/`, `tests/` | Updated |

**New library: ws 8.22.2**

- What it does: keeps a live two-way connection (a WebSocket) open between a browser and our server.
- Why we need it: a normal web request is "ask once, get one answer". For online play the server has to keep sending kart positions.
- The alternative: writing that connection code ourselves, which is long and easy to get wrong in ways that matter for security.
- It brings no other packages with it. `npm audit` found 0 known security problems on 10 November 2026.
- Catarina gave her OK before it was added, as rule 8 of the brief and `AGENTS.md` ask.

**Why a player cannot cheat by changing the page**

The browser never says where its kart is. It only says which keys are held. The server works out everything else. One test proves that a kart moves online exactly as it would in practice with the same keys.

**What the server refuses**

Each has a test.

- Any message that is not exactly "these keys are held" or "restart". The browser is disconnected.
- Data that is not text, and messages that are far too long.
- More than 60 messages in a second from one browser.
- A ninth player. The room takes eight.
- A live connection to any address other than `/play`.
- A live connection started by a page on someone else's website.
- Driving someone else's kart. A test has one browser press the gas while claiming to be another player. Only its own kart moves.

**Why karts move smoothly**

Updates arrive 20 times a second, but the screen shows 60 pictures a second. The browser shows the race a tenth of a second in the past, and draws each kart at the right point between the two updates on either side of that moment. If updates stop, the karts hold still.

**Decisions**

All made by the agent, please confirm:

- One room for everyone, with no code, no host and no race start. That is the smallest thing that shows two browsers seeing each other. The brief's rooms with codes come later.
- Eight players in the room. The brief proposes four humans per race. Eight leaves space for the whole team and a few testers.
- A separate page for online, linked from the practice page.
- A player's clock starts at their first key press, as in practice.
- A browser that sends one message the server does not understand is disconnected at once.
- At most 60 messages a second from one browser.
- In the view from behind, other players' karts are painted flat on the road. Standing-up karts need artwork.
- Your own kart online is also drawn from the server's updates, so it reacts a moment late. The brief lists the fix, "prediction", as a stretch goal.

**Git steps the agent ran, and what each one means**

| Command | In plain words |
|---|---|
| `git switch -c online-play` | Make a new branch called `online-play`, starting from `camera-views` |
| `git add` and `git commit` | Save the snapshot with a message |
| `git push -u origin online-play` | Send the branch to GitHub as a backup. No pull request yet |

Other commands: `npm install --save-exact ws` adds the library at an exact version. `npm audit` looks for known security problems.

**What was checked, and what was not**

- Checked: `npm test`. 274 of 274 tests pass (196 from before, 78 new). The tests with real connections add about three seconds.
- Checked that the tests really guard the rules: the agent broke the online code on purpose in 24 different ways, one at a time, for example "other websites may connect" and "keys go to the first player in the room". 23 were caught straight away. One was not: accepting an update that arrives late. The test for it was too weak. It was tightened, and now catches it.
- Checked in a browser on this laptop: two tabs connected to the server. The first was told it is the red kart and the second the blue one, and both said "2 players here". The first tab pressed the gas. In the second tab, which pressed nothing, the red kart had driven to the far wall and the blue kart had not moved.
- **Not checked: two laptops on two different internet connections.** That is the real test, and it is what the base asks for. It needs the server online on Render. The checklist for it is written.
- **Not checked:** how big the delay feels over the real internet, and how the server copes on Render's free plan.

**How to check this step yourself**

Run `npm start`. Open http://localhost:3000/online.html in two browser windows side by side. Drive in one and watch the other.

**What comes next**

Putting the server online, which needs a Render account. Then running the two-laptop checklist. Then a pull request for the camera views and online play together.

### 10 November 2026: Camera views, and working in bigger pieces

Done on Catarina's laptop with Claude Code.

**Where things stood**

Pull request #4 (steps 3, 5, 6 and 7) was approved and merged into `main`. GitHub's copy of `main` now has the server, the driving rules, the test track and the driving in the browser.

**Why this was done**

Catarina drove the kart and found it underwhelming: the whole map sat still on the screen and nothing moved except a small kart. She asked for a camera that moves, ideally a tilted view from behind the kart, depending on how hard that is.

It turned out not to be hard, because the camera is only about drawing. The rules that move the kart did not change at all, and neither did any of their tests.

**What was done**

Three camera views. The V key switches between them, and the page shows the name of the current one.

| View | What you see |
|---|---|
| Behind the kart | Tilted, from behind and above. The track turns around the kart, so the kart always drives up the screen, and the road narrows into the distance. The kart is drawn from behind, with the driver's helmet. This is the view Catarina asked for, and the one the game starts in |
| From above | Zoomed in, from straight above, moving with the kart. North stays up. The camera looks a little ahead, glides, and stops at the edges of the track. This is the view the brief decided on |
| Whole track | The old view: everything at once |

Three more things were added so the views read well:

- A small map in the corner, with a dot for the kart.
- A faint chequered pattern on the road and the grass. Without it the road was one flat colour, and a flat colour looks the same whether you are moving or not.
- A red and white striped edge wherever a wall meets open ground, so it is clear where the track ends.

| File | What changed |
|---|---|
| `client/camera.js` | New. The arithmetic of the camera, with no painting in it |
| `client/draw.js` | Rewritten for the three views, the small map, the road pattern and the striped edges |
| `client/main.js` | Keeps track of the current view and the camera position |
| `client/keyboard.js` | Listens for V. The game now tells it what to do by name (`onRestart`, `onView`, `onDrive`) instead of by position, which is easier to read |
| `client/index.html` | Shows the camera name and mentions V in the help text |
| `tests/camera.test.js` | New. Thirty-five tests |
| `tests/client.test.js` | Four more tests, for V |
| `AGENTS.md`, `PROJECT_BRIEF.md` | The two decisions below |
| `README.md`, `WALKTHROUGH.md`, `client/README.md`, `tests/README.md` | Updated |

**How the tilt is made**

For every picture, the track is first painted flat on a hidden canvas, turned so that the kart points straight up. Then it is copied to the screen one thin row at a time. A row near the top takes a wide slice from far ahead and squeezes it. A row near the bottom takes a narrow slice from close by and stretches it. That squeezing and stretching is what looks like tilt. Old console racing games did the same thing. No 3D library is used.

**How hard would the rest be?**

- What exists now: flat ground, one kart, drawn with simple coloured shapes. That took one sitting.
- Other karts in the tilted view: not hard. They are placed and sized by distance, and the arithmetic for that is already written and tested (`chasePoint`).
- Walls and buildings that stand up, a sky, scenery: clearly more work. Either more drawing code of our own or a 3D library, which would be a big new thing for everyone to understand before the walkthrough.
- Real artwork for characters: in the tilted view each character needs a picture from behind, and from other sides once other karts are shown. In the view from above one picture per character is enough.

**Decisions**

- **Decided by Catarina on 10 November, teammates confirm by approving the pull request:** the game starts in the tilted view from behind the kart. The brief had decided "north is always up, the map never rotates", and the tilted view does the opposite, so this changes a team decision. Both views are built and V switches between them, so the team can compare before confirming. Changing the starting view is one line: the order of the list `VIEWS` at the top of `client/camera.js`.
- **Decided by Catarina on 10 November, teammates confirm by approving the pull request:** work in bigger pieces. Each step is still its own commit, but the steps of one piece of work share a branch and one pull request, opened when the piece is complete. The reason: work should not stop while a pull request waits for a teammate. `AGENTS.md` rule 5 was changed to say this.
- Decisions made by the agent, please confirm: the names of the views, the starting numbers at the top of `camera.js` (zoom, tilt, how far ahead you see), and the road pattern and striped edges.

**Git steps the agent ran, and what each one means**

| Command | In plain words |
|---|---|
| `git fetch` | Ask GitHub what changed there. This showed pull request #4 was merged |
| `git switch -c camera-views main` | Make a new branch called `camera-views`, starting from the up-to-date `main` |
| `git add` and `git commit` | Save the snapshot with a message |
| `git push -u origin camera-views` | Send the branch to GitHub as a backup. No pull request is opened yet |

**What was checked, and what was not**

- Checked: `npm test`. 196 of 196 tests pass (157 from before, 39 new). None of the tests for the driving rules, the track or the laps had to change.
- Checked in the browser after Catarina's choice: the page opens in the view from behind the kart, and V goes on to the view from above and then the whole track.
- Checked in a browser on this laptop: all three views show without errors, V goes round them, the small map shows the kart's dot, and a script drove the kart through corners in the view from above and in the tilted view.
- **Not checked: how the views feel at full speed.** As before, the agent's browser redraws slowly. Catarina driving it is the real check, in particular whether the tilted view is comfortable in corners, and whether the numbers at the top of `camera.js` should change.
- **Not checked:** how the tilted view runs on a slow laptop.

**How to check this step yourself**

Run `npm start`, open http://localhost:3000, drive, and press V to go through the three views.

**What comes next**

More work on this same branch before a pull request is opened. Candidates: putting the server online (needs a Render account), and step 8, two browsers seeing each other's kart.

### 10 November 2026: The agent can now send work to GitHub

Done on Catarina's laptop with Claude Code. No game code changed in this entry.

**What changed**

Until now the agent could save work on the laptop (commit) but could not send it to GitHub (push), because the laptop's sign-in to GitHub was kept inside GitHub Desktop. Catarina had to click "Publish branch" for every step, and that got out of step with the work.

Catarina agreed that the agent sends the work itself from now on. She signed in to GitHub once, in her own browser, and clicked "Authorize" for a program called Git Credential Manager. That program comes with git. Its only job is to remember the sign-in, so that git can send work to GitHub.

- The agent never saw the password. It was typed only into GitHub's own page.
- The sign-in is kept by Windows on this laptop, in Windows' own "Credential Manager". It is not in the project and not on GitHub.
- It works only on Catarina's laptop and sends work as Catarina. Teammates who want the same for their own agent sign in once on their own laptop.

**What was sent**

The branch `drive-in-browser`, with steps 3, 5, 6 and 7 as four separate commits.

**Why four steps are in one pull request**

The rule is one step per branch and per pull request. After step 3 the branch was not published, and the agent kept building each new step on top of the one before. The newest branch therefore contains all four. Splitting them again would mean four pull requests that each wait for the one before. One pull request with four clearly named commits is simpler to review. From the next step on, it is one branch and one pull request per step again.

**How it was done, including what did not work**

1. First try: the agent ran the push in the background. The sign-in window never appeared, and the push waited for six minutes without doing anything. The agent stopped it.
2. Second try: the agent ran the same push in the app's Terminal panel, where Catarina can see it. This time the browser opened GitHub's "Authorize" page, Catarina approved, and the push went through.

| Command | In plain words |
|---|---|
| `git push -u origin drive-in-browser` | Send the branch to GitHub. The `-u` part remembers that the branch on the laptop and the branch on GitHub belong together, so later a plain `git push` is enough |

**What the agent still never does**

It never merges into `main`: a teammate reviews and merges. It never force-pushes, which would overwrite history on GitHub.

**How to undo this**

On GitHub: click your picture, then Settings, Applications, Authorized OAuth Apps, and revoke "Git Credential Manager". Or on the laptop: open "Credential Manager" from the Windows Start menu, choose Windows Credentials, and remove the entry for github.com.

**What was checked, and what was not**

- Checked: the branch `drive-in-browser` is on GitHub.
- **Not checked yet:** that GitHub ran the tests on it. GitHub runs them when the pull request is opened.

**What comes next**

Open the pull request for `drive-in-browser`, get a teammate's approval, and merge it. Then put the server online.

### 10 November 2026: Step 7, driving in the browser

Done on Catarina's laptop with Claude Code. This step's branch, `drive-in-browser`, starts from `test-track`, so it contains steps 3, 5 and 6 as well. Publishing this one branch sends all four steps to GitHub.

**What was done**

The kart can be driven. Run `npm start`, open http://localhost:3000, and drive round the test track with the arrow keys. The page shows the lap, the clock, the time of each finished lap, and a "Finished" message with the total time after three laps. R starts again.

| File | What it is for |
|---|---|
| `client/index.html` | The page: lap counter, clock, the canvas the track is drawn on, help text. It replaces the "hello" page |
| `client/style.css` | How the page looks |
| `client/main.js` | Runs the practice race. For every picture on the screen it asks the keyboard which keys are held, asks the rules where the kart is now, and draws |
| `client/keyboard.js` | Turns the arrow keys into gas, brake, left and right. R starts again |
| `client/draw.js` | Draws the track from its letters, a chequered finish line, and the kart as a small red car with a yellow nose |
| `client/format.js` | Turns seconds into a time such as `1:23.45` |
| `server/app.js` | Now also sends the files of the `shared/` folder, under addresses that start with `/shared/`. The browser needs the rules to run the race |
| `tests/client.test.js` | Nineteen tests for the time text and the keyboard |
| `tests/server.test.js` | Six more tests, for sending the rules and for what must still be refused |
| `PROJECT_BRIEF.md` | A note on the open "Phaser or plain canvas" item (see Decisions) |
| `README.md`, `WALKTHROUGH.md` and the notes in `client/`, `server/`, `tests/` | Updated |

**How the race runs**

The rules must move in steps of exactly one sixtieth of a second, but screens do not all refresh at the same speed. So `main.js` measures how much real time has passed since the last picture and runs as many whole steps as fit in it. The clock starts at the first key press.

The practice race runs entirely in the browser. Nothing is sent to the server and nothing is saved.

**A small gap found while checking**

At first the race started when the game noticed, between two pictures, that an arrow key was held. A key tapped and released faster than one picture (a sixtieth of a second) was missed, and the race did not start. A person cannot tap that fast, but the tool used to check the page can. The race now starts on the key press itself, and there is a test for the shortest possible tap.

**Decisions**

All made by the agent, please confirm:

- **Plain canvas instead of Phaser, for now.** The brief marks this as open and recommends Phaser. The base only needs coloured squares and one kart, which the browser's built-in canvas does in under 100 lines with no library. All drawing is in `client/draw.js`, so switching to Phaser later does not touch the rules. The team should decide before the campus tracks are built.
- The whole track is shown at once. A camera that follows the kart comes with the bigger tracks.
- The server sends the `shared/` folder to browsers. It holds only the game rules, which are not secret.
- The clock starts at the first key press, not when the page opens.
- The page offers `kartGame.state()` in the browser's console, to look at the kart's numbers while tuning. It gives a copy, so it cannot be used to change the race.

**Git steps the agent ran, and what each one means**

| Command | In plain words |
|---|---|
| `git switch -c drive-in-browser` | Make a new branch called `drive-in-browser`, starting from `test-track` |
| `git add` and `git commit` | Save the snapshot with a message |

**What was checked, and what was not**

- Checked: `npm test`. 157 of 157 tests pass (132 from before, 25 new).
- Checked in a browser on this laptop: the page shows the track, the finish line and the kart, with no errors. One real tap of the up arrow starts the clock. R puts everything back to the start.
- Checked in the same browser: a small script held the arrow keys the way a player would and drove a whole race. The lap counter went from 1 to 3, the lap times appeared, and the page showed "Finished in 0:28.48. Press R to race again."
- Checked: in a window as narrow as a phone, the page still fits without scrolling sideways.
- **Not checked: how it looks and feels at full speed.** The browser the agent uses was running in the background, where browsers redraw only about once a second. The race worked, but in slow motion and with jerky steering. On a normal, visible browser it should run at 60 pictures a second. Catarina driving it herself is the real check.
- **Not checked:** the server on Render. Nothing is online yet.

**How to check this step yourself**

In a terminal in the project folder, run `npm start`, open http://localhost:3000 in a browser, and drive three laps clockwise. Try hitting a wall, cutting across the grass, and driving the wrong way round: no lap should count.

**What comes next**

- Putting the server online on Render, which needs this work merged into `main` and a Render account.
- Step 8: two browsers seeing each other's kart.
- Step 4: the database.

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
