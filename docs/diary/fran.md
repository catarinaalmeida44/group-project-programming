# Fran's diary

Francisco Fonseca (Fran, GitHub FranFon15). Entries from 11 November 2026 on, newest at the top. How to write one is in `README.md` in this folder.

### 20 November 2026: the Nova lap at two levels (stairs down, the path and the Sagres Beach Way)

**What was done**
After the jolting on the stairs, Francisco asked for one try at the ground itself going down and up, as on the campus, to be dropped if it looked bad. He tried it and kept it, and asked for one more thing: the Sagres Beach Way at the bottom too, dropping away on the left when driving up the path, with a railing between them. Branch `nova-lap-two-levels`, which starts from `nova-lap-slopes` (the jolting).
- The wide stairs go down 2.2 metres in 12 steps to the lower plaza; the path past the beach tunnel rises smoothly back up to the west; the Sagres Beach Way and the tunnel's mouth lie at the bottom; the railing between path and Beach Way stands on the path's edge and rises with it.
- Stone walls where the level changes; the camera goes down with the kart and up again.
- Only the picture: the driving is unchanged, online too. The views from above and the small map are flat as before.

| File | What changed |
|---|---|
| `client/camera.js` | "eyeLift": something on lower or higher ground is drawn lower or higher. Without it, nothing changes |
| `client/levels.js` | New. Where the ground is lower, its steps, the stone walls, and which scenery stands at the bottom |
| `client/ground.js` | The sunken part is cut out of the ground picture and painted under it, each step at its depth |
| `client/draw.js` | The walls; karts, props, the tunnel and the railing at their height; the camera going down and up |
| `client/nova-lap-look.js` | The levels of the Nova lap, and the names of the scenery at the bottom |
| `tests/levels.test.js` | New. 29 tests |
| `WALKTHROUGH.md`, `client/README.md`, `tests/README.md` | Kept true |

**Why it was done this way**
- One small change in the camera reaches everything that is drawn: the ground, the buildings and the karts all ask the camera where to go.
- The buildings file (Catarina's) is not changed: the look names the pieces of the tunnel that go down.
- The steps of the path are too small to see, so it looks like a ramp; the steps of the stairs are big, so they look like stairs.

**Decisions**
- The team, through Francisco, chose two levels, after trying them, and the Sagres Beach Way at the bottom.
- Decision made by the agent, please confirm: the drop is 2.2 metres, a guess kept smaller than the height of the camera's eye (about 3.3 metres) so it sees over the edge from below.
- Decision made by the agent, please confirm: the railing at the west end of the Beach Way stays at ground level, on top of the stone wall.

**What was checked, and what was not**
- The pictures were drawn in a browser from twelve fixed spots (top and middle of the stairs, the plaza in four directions, the path both ways and at three points going up, the tunnel from the plaza, the view from above). On the way three problems were found and fixed: the path looked like a second flight of stairs, thin stripes across it, and the plaza was three times slower to draw (now about 1.7 times).
- Two mistakes in new tests of this branch were fixed: one expected the sunken part to end at the plaza (written before the Beach Way went down), one picked a point outside the tunnel floor.
- Broken on purpose in three ways; each made tests fail.
- `npm test`: 2726 passed, 5 skipped; after bringing in the newest `main` (recorded music, the campus loop out of the game), 2772 passed, 5 skipped.
- Francisco drove the first version on his laptop and kept it. **Not checked by the agent:** how it looks in motion, other karts going down and up, and how smooth it is on a slower laptop.

**How to check it yourself**
`npm start`, Single race, Nova lap: down the stairs, across the plaza, up the path, and look left at the Sagres Beach Way.

**Later the same afternoon, after Francisco drove it**
- He could see through the ground: the tunnel, at the bottom, was painted over the bank in front of it. Things at the bottom are now cut to where the sunken part can really be seen (`holeOutline` in `client/draw.js`).
- The Beach Way looked like an extra corridor with an odd wall. He chose to have the tunnel right at the edge of the plaza: the tunnel moved 5.5 squares east in `client/nova-lap-buildings.js`, the side wall of its old ramp was taken out, its railing at the west end moved with it, and the sandy floor in `client/nova-lap-ground.js` is now only in front of its mouth (west of it is the grass bank). These are Catarina's files: she should know. The squares were already walls in the track's letters, so the driving and the map did not change, and her Nova lap tests pass unchanged.
- Three of this branch's own tests (not in `main` yet) were changed to the tunnel's new place, and one added: no Beach Way is left west of the tunnel.
- Checked again in a browser from the spots of his three photos. `npm test`: 2773 passed, 5 skipped.

**What comes next**
The team plays it before the demo. If the plaza is slow on someone's laptop, the path's 40 steps can be fewer.

### 20 November 2026: karts jolt on the stairs of the Nova lap (and slopes tried and taken out)

**What was done**
Francisco asked, for the team, for the wide stairs of the Nova lap to go down and the path past the beach tunnel to go up again, as on the real campus. Branch `nova-lap-slopes`.
- First try: slopes in the driving rules (`shared/slopes.js`): faster down the stairs, slower up the path, the kart's nose drawn dipping or rising, and jolting on the steps.
- Francisco drove it: a kart that stopped on the way up could not start again, and a ground that stays flat while the kart is only faster or slower did not feel like a hill. He chose to keep only the jolting on the stairs.
- So both commits of the first try were undone with `git revert` (new commits that cancel them; the history is kept), and the jolting was made again, in the picture only.

| File | What changed |
|---|---|
| `client/stairs-bump.js` | New. How high a kart jolts on stairs |
| `client/nova-lap-look.js` | Where the stairs are: [64, 63, 71, 69] in squares |
| `client/draw.js` | A kart on the stairs is drawn a little higher while it jolts |
| `tests/stairs-bump.test.js` | New. 8 tests |
| `WALKTHROUGH.md`, `client/README.md`, `tests/README.md` | Kept true |

**Why it was done this way**
- Only the picture: on the stairs a kart drives exactly as on any road, online too, so nothing that works can break three days before the deadline.
- The jolt follows where the kart is, not the clock: standing still it does not jolt, and the same spot always looks the same.
- The bug in the first try: the pull of the slope was added before the driving rules, so a kart standing on the way up always seemed to roll back a little, and the gas only ever braked it to a stop. The tests of the first try never started a kart from standstill uphill. Nothing of it is left in the code now.

**Decisions**
- The team (through Francisco) chose: real slopes in the rules, then, after trying them, only the jolting.
- Decision made by the agent, please confirm: the branch keeps its name `nova-lap-slopes`, though it now only has the jolting.

**What was checked, and what was not**
- After the revert the code was the same as `main` (no differences).
- The jolting was broken on purpose in two ways; each made a test fail.
- `npm test`: 2660 passed, 5 skipped.
- The Nova lap page opens with no new errors.
- **Not checked by the agent:** how it looks while driving (the app's browser redraws too slowly). Francisco drove the first try on his laptop.

**How to check it yourself**
`npm start`, Single race, Nova lap, and drive down the wide stairs.

**What comes next**
One try, on a separate branch, of the ground at two heights (the upper ground and the lower plaza). Francisco tries it; if it looks bad, it is dropped and only the jolting stays.

### 19 November 2026: FranFon in green, a golf swing, and no Cup in the menu

**What was done**
Three things Francisco asked for, on the branch `franfon-look-and-no-cup`:
- FranFon's colours: a green kart, a yellow helmet and a green suit (all black before).
- FranFon's dance: a golf swing, "The hole in one". With a club in his hands he stands over the ball, swings slowly back, hits it fast, and holds the finish, turned to watch the ball fly up and far away until it is gone. A new ball each round.
- The greyed-out Cup is gone from the main menu, because the team dropped the Cup on 17 November.

| File | What changed |
|---|---|
| `shared/cast.js` | FranFon's three colour numbers |
| `client/pilot-shape.js` | The new dance "golf", the club and the ball. "plane" stays in the list, danced by nobody |
| `client/cast-choice.js` | FranFon dances "golf", called "The hole in one" |
| `client/index.html`, `client/style.css` | The Cup tile and its styles taken out; "four" choices is now "three" in the comments |
| `tests/golf-dance.test.js` | New. 19 tests |
| `tests/cast.test.js`, `tests/pilot-shape.test.js`, `tests/menu.test.js` | 3 old tests changed, with Francisco's OK (below) |
| `WALKTHROUGH.md`, `README.md`, `client/README.md`, `tests/README.md`, `docs/team-guide.md` | Kept true: the menu without the Cup, the dances, the tests |

**The 3 old tests that were changed, with Francisco's OK**
- `cast.test.js` › "paints each character in the colours the team chose": FranFon is now Green, Yellow, Green instead of Black, Black, Black.
- `pilot-shape.test.js` › "is one of standing, arms crossed, and the ten dances": the list now ends with "golf" (eleven dances; the name of the test was kept so it is easy to find).
- `menu.test.js` › "shows the Cup, but it cannot be clicked yet, and says why": replaced by "no longer has a Cup: the team dropped it".

**Why it was done this way**
- Francisco first asked for Fortnite's "Default Dance". That is Epic Games' own dance, and everything in our game is original, so it was not copied. A dance of our own ("bounce", with a jump) was made first; then Francisco chose a golf swing instead, and the bounce was replaced before anything was pushed.
- A golfer does not jump, so the test "keeps the feet on the ground, except during the jumps of the siu and the gangnam" did not need to change.
- The kart has one colour of your choice; its edges are picked automatically (white on a green kart), and the helmet's stripe takes the kart's colour. Yellow parts on the kart itself would mean changing how colours work for every character, so that was not done.

**Decisions**
- The colours are Francisco's: "green suit and yellow helmet", the kart green.
- Decision made by the agent, please confirm: the name of the dance on the page, "The hole in one".
- The characters and dances were built by Pedro; the area has no owner yet. Tell Pedro.

**What was checked, and what was not**
- Before changing any old test: 3 failed, listed with a reason each, and Francisco said OK.
- One general test found a real mistake while building: the club head went into the ground when the pilot leant over the ball. Fixed by stopping the club higher.
- The golf dance was broken on purpose in three ways; each made a test fail.
- In the Claude app's browser: the menu has three choices; the character screen shows FranFon green with a yellow helmet, the club, the ball by his feet, the backswing and the finish. **Not seen there:** the ball in flight. That browser was narrow and redraws slowly, and the first try of the flight left the small picture too fast, so it was made slower and higher; the flight itself is checked by the tests only.
- `npm test`: 2145 passed, 5 skipped.

**How to check it yourself**
`npm start`, open http://localhost:3000, Single race, any track, and click FranFon: watch one whole swing in the big picture, and the ball fly off to the side.

**What comes next**
The online lag question from 17 November is still open: which kind of glitch is it?

### 17 November 2026: no Cup, written into the brief

**What was done**
The team decided on 17 November (reported by Francisco) that there is no Cup mode, no cup points and no difficulty levels. The game has only Single race (practice, in the browser) and Online: one good race rather than several mediocre ones. Only `PROJECT_BRIEF.md` was changed, plus this diary. Branch `drop-cup-from-brief`. No code.

In the brief:
- A new status, **[DROPPED date]**, in the list at the top: decided against, kept visible with the date.
- A new [DECIDED 17 Nov 2026] line with the two modes.
- Marked [DROPPED 17 Nov 2026], text kept: the Cup mode, its 3 tracks, its points, Easy/Normal/Hard, the computer karts' three difficulty levels, the cup leaderboard, "changing character in the middle of a cup", "nobody can join a cup in progress", and the demo step with the profile trophies.
- A short note after the part that is dropped, where a line has more in it: the menu flow (Cup, mode and difficulty choice, the cup standings screen), the host choosing a mode or difficulty, trophies per difficulty, "cup" as a race mode and in the per-track leaderboard, "cup flow" in the roadmap, the cup in the roadmap's Wednesday to Friday, and the cup in "not in the base".
- Unlocking characters 7 and 8 by winning the cup moved back to **[OPEN]**, because there is no cup to win. The two lines that depend on it (padlocked portraits in the menu, and "fully unlocked" demo accounts) say so.

**Why it was done this way**
Nothing was deleted, as Francisco asked: anyone reading the brief can see what was planned and when it was dropped.

**Decisions**
- The decision is the team's, reported by Francisco.
- Decision made by the agent, please confirm: the computer karts' "three difficulty levels" was marked dropped too, because the difficulty levels were what the cup's Easy/Normal/Hard were made of.
- Decision made by the agent, please confirm: the demo slot 3:30–4:15 is marked free, for the team to fill.

**Still mentioning the cup outside the brief (not changed, waiting for Francisco)**
- In the game: `client/index.html` shows a greyed-out Cup button with "Cup: coming soon, with three campus tracks". The test "shows the Cup, but it cannot be clicked yet, and says why" in `tests/menu.test.js` checks that button, so removing it means changing an existing test, which needs an OK first.
- Notes: `README.md` (status line), `WALKTHROUGH.md` (state line, the menu row, the menu section, the menu tests, an earlier check), `client/README.md` (the menu row), `tests/README.md` (the menu tests row), `docs/team-guide.md` (the "not started" row and the multiplayer area).
- Diaries, which are history and stay as they are: this one (11 November) and Catarina's.
- Fine as it is: `tests/track-list.test.js` uses "cup" as an example of a kind of race that must be refused.

**What was checked, and what was not**
- `npm test`: 1358 passed, 5 skipped. Only documents changed, so no test was expected to change.
- Read the brief through after the change, looking for any cup or difficulty mention not yet marked.
- Not checked: whether the team agrees with the two agent decisions above.

**How to check it yourself**
Search `PROJECT_BRIEF.md` for "DROPPED 17 Nov" and for "OPEN since 17 Nov".

**What comes next**
Francisco decides about the Cup button in the menu and the other notes listed above.

### 17 November 2026: online, nobody moves until the host starts

**What was done**
New rule for online play, from Francisco: the first player to enter is the host. Before the host presses Enter, every kart stays on its place on the starting grid and the arrow keys do nothing. Then 3, 2, 1, GO!, and only then can anyone move. Before, everyone could drive around freely while waiting. Branch `online-lobby-host-starts`.

| File | What changed |
|---|---|
| `server/room.js` | The "open" phase is now a waiting phase: nothing moves, nothing bumps, no clock runs. Two small helpers that only free driving used were removed |
| `client/race-view.js` | The texts while waiting ("You can drive around meanwhile" and "Press R to go again" are gone), and a new `keysWork`: when the keys really do something |
| `client/online.js` | Uses `keysWork`: the kart only leans, the engine only revs and the next checkpoint is only lit in a race after GO |
| `client/online.html` | The help text: every kart waits on the grid until the host presses Enter |
| `tests/room-waiting.test.js`, `tests/keys-work.test.js` | New. 21 tests |
| 8 older test files | 17 tests rewritten, with Francisco's OK for the team (list below) |
| `WALKTHROUGH.md`, `client/README.md`, `tests/README.md` | Kept true |

**The 17 rewritten tests** (each has a comment saying so)
- Same check, now driving after GO (7): in `room.test.js` "moves only the kart of the player who is holding a key" and "moves a kart exactly as the practice race would"; in `room-race.test.js` "puts every kart back on its starting place with laps and clock at zero"; in `grid.test.js` "puts every kart back behind the line when a race starts"; in `bumps.test.js` "happen between two karts that are both being driven"; in `online.test.js` "lets two browsers see each other's kart move" and "lets each connection drive only its own kart, even when it names another player" (the victim's clock now runs from GO, so it checks that the victim's kart did not move, instead of a clock at zero).
- Replaced by a test of the new rule (10): in `room.test.js` the clock starting at a key press, and running once started; in `room-race.test.js` free driving after the last racer leaves; in `grid.test.js` crossing the line again and again while open; in `room-finishes.test.js` laps while open not listed; in `bumps.test.js` shoving a parked kart, and a parked kart's clock; in `race-view.test.js` "Press R to go again"; in `online.test.js` restart after driving away; in `online-accounts.test.js` nothing saved for laps while open.

**Why it was done this way**
- The smallest change on the server: one phase stops moving karts. Everything else about races (countdown, watching, time limits, next race) is untouched.
- The page asks one tested function whether the keys work, instead of three slightly different checks in `online.js`.

**Decisions**
- The rule is Francisco's, for the team. The 17 tests were rewritten only after his OK.
- Decision made by the agent, please confirm: R (restart) is still accepted while waiting. It does nothing harmful (the kart is already on the grid) and refusing it would need a message change. The help text no longer mentions it.
- Decision made by the agent, please confirm: no message in the middle of the track while waiting; the line under the track says who may start.
- In `bumps.test.js`, the group of tests keeps its old name "bumps while the room is open", with a comment, so that the one unchanged test in it is easy to find.

**What was checked, and what was not**
- Before rewriting anything: 17 tests failed with the new rule, listed with a reason each, and Francisco decided.
- The new rule was broken on purpose in three ways (free driving again, anyone may start, the page treating keys as working while waiting). Each made tests fail.
- In the Claude app's browser on the laptop: with the up arrow held before the start, the kart stayed at the same spot with its clock at 0 (read from the server's side, two seconds apart). After Enter the countdown showed, and after GO the kart drove off.
- `npm test`: 1379 passed, 5 skipped.
- **Not checked:** with two real players on two laptops, and on the live server (only after the merge).
- Note: the test "puts a kart back at its start on restart, without touching anyone else" in `room.test.js` still passes but now proves little, because the karts cannot drive away before a race. It was not on the list, so it was left alone. The team may want to look at it.

**How to check it yourself**
Two browsers on the online page. In the second one, hold the up arrow: nothing moves. In the first (the host), press Enter: 3, 2, 1, GO!, and only then do both karts move.

**What comes next**
Piece 3: dropping the Cup from the brief.

### 17 November 2026: no more ghost karts in online play

**What was done**
Francisco reported that after leaving online play for the menu (with "← Menu" or Back) and joining again, his kart was on the track twice, then three times. Now the online page closes its connection itself when it is left, and reloads if Back brings it back from the browser's back/forward cache. The server also checks every 5 seconds instead of 15 that each browser is still there. Branch `fix-duplicate-online-karts`.

| File | What changed |
|---|---|
| `client/page-life.js` | New. On "pagehide" it closes the connection. On "pageshow" from the cache it reloads the page |
| `client/online.js` | Two lines: uses `page-life.js` |
| `server/online.js` | The still-there check every 5 seconds instead of 15, and a setting so tests can make it shorter |
| `tests/leaving.test.js`, `tests/page-life.test.js` | New. 10 tests |
| `WALKTHROUGH.md`, `client/README.md`, `tests/README.md` | Kept true |

**Why it was done this way**
- The bug could not be made to happen here (see below), so the fix covers the likely cause without relying on it: whatever the browser does, a page that is hidden closes its connection, and a kart whose browser stops answering goes within 10 seconds.
- 5 seconds, not 1: a real player on a slow connection must have time to answer. The cost is one tiny message per player every 5 seconds.
- The new code is in its own small file so it can be tested without a browser.

**Decisions**
- Francisco approved the fix on 17 November before it was built.
- Decision made by the agent, please confirm: this diary stays `fran.md`. Francisco's instructions named `francisco.md`, but his entries are already in `fran.md`.
- `server/online.js` and `client/online.js` belong to the "game server and multiplayer" area, which has no owner yet in `docs/team-guide.md`. Whoever takes it should know about this change.

**What was checked, and what was not**
- Tried to reproduce the bug before changing anything, with a small script that counts the karts in the room from the server's side. On the laptop: "← Menu" left 0 karts at once, coming back 1, Back 0, Forward 1. On the live server: "← Menu" left 0 karts at once, still 0 every 4 seconds for 35 seconds. **The bug did not happen.** The Claude app's browser used for this never keeps pages in a back/forward cache (checked: a page brought back with Back was always loaded fresh), so the likely cause could not be tested there.
- After the fix, in the same browser on the laptop: open 1 kart, "← Menu" 0, Back to online 1, Back to the menu 0.
- The new code was broken on purpose in four ways (every 15 seconds again, a silent browser never removed, the page not saying goodbye, reloading on the wrong occasion). Each made a test fail.
- `npm test`: 1319 passed, 5 skipped. Then Pedro's characters (pull request 20) were merged into `main`, touching the same two online files. `main` was merged into this branch without conflicts, and `npm test` on the combination gave 1368 passed, 5 skipped. The browser check above was done before that merge.
- **Not checked:** Chrome, Edge or Safari with their back/forward cache, and the live server after this change (it changes only after the merge).

**How to check it yourself**
After the merge, on the live site in Chrome: go Online, "← Menu", Online, Back, Forward, several times, with a second laptop on the online page. The second laptop should never see more than one kart of yours.

**What comes next**
Piece 2: the online lobby where nobody moves until the host starts.

### 11 November 2026: the main menu, settings and your own best times

**What was done**
The game now opens on a main menu instead of straight on the race. It has Single race, Cup (greyed out), Online and Leaderboard, and a ⚙ Settings button in the top right corner. Settings lets you choose the camera view a race starts in. The Leaderboard shows your own best race time and best lap, kept in your browser. Branch `main-menu`.

| File | What changed |
|---|---|
| `client/index.html` | Now the menu, with the Leaderboard and Settings panels |
| `client/race.html` | New. The race page that used to be `index.html`, with a "← Menu" link |
| `client/menu.js` | New. Opens the two panels and fills them in |
| `client/storage.js` | New. Reads and writes the browser's storage carefully |
| `client/settings.js` | New. The starting camera view |
| `client/records.js` | New. Best race and best lap per track |
| `client/main.js` | Starts in the chosen view, records a finished race, says "New best time!" |
| `client/online.js` | One line: starts in the chosen view |
| `client/online.html` | "← Menu" and "Single race" links instead of "Practice alone" |
| `client/style.css` | How the menu and the panels look |
| `tests/menu.test.js`, `tests/settings.test.js`, `tests/records.test.js` | New. 34 tests |
| `WALKTHROUGH.md`, `README.md`, `PROJECT_BRIEF.md`, `client/README.md`, `tests/README.md`, `docs/team-guide.md`, `docs/two-laptop-checklist.md` | Kept true: the menu, where things are kept, the tests, the 3-track cup |

**Why it was done this way**
- The race code stays in `main.js`, so nothing about how a race runs changed. Only the page around it moved.
- No server change: the server already sends any `.html` and `.js` file from `client/`.
- Best times in the browser (option B) because a shared leaderboard needs accounts, and because a time from a race run in the browser can be faked. So they are never sent to the server.
- Everything read back from the browser's storage is checked, because a player can edit it.
- The panels use `<dialog>`, which is built into browsers, so no library was added.

**Decisions**
- Francisco chose: the menu choices, "Settings" as the button's name (instead of "Definitions"), and the Leaderboard as personal best times kept in the browser (option B).
- The team agreed on a cup of 3 tracks. Marked [DECIDED] in the brief.
- Decision made by the agent, please confirm: the race page is called `race.html`; "Online" in the menu opens the existing online test page; best times are kept per track name; the only real setting for now is the starting camera view.
- Decision made by the agent, please confirm: `client/online.js` (online play) got one changed line so it also starts in the chosen view. Online play has no owner yet; tell its owner.

**What was checked, and what was not**
- `npm test`: 437 passed, 5 skipped (34 new tests).
- The best-times code was broken on purpose in three ways. Two made tests fail. The third (one of two checks on the track name) changed nothing, because the other check still protects.
- In the Claude app's browser: the menu shows, a click on Cup does nothing, both panels open and close, choosing "From above" made the race page start in that view, a broken saved setting was ignored by the online page (it started in the first view and connected), and a saved time showed in the Leaderboard while a bad saved lap time showed as "–".
- Checked by hand by Francisco on his laptop, after the agent's checks: he drove a race through the new page and reported that everything worked (the test was: Settings, Single race, three laps, "New best time!", then the time in the Leaderboard). The agent did not watch this run.
- On the way, the race and online pages showed a white screen. The cause was the game server not running (the agent had stopped it after its checks), not the code. Started again with `npm start`, everything opened.
- Not checked on the live server: it changes only after the pull request is merged.

**How to check it yourself**
Run `npm start` and open http://localhost:3000. Open Settings and choose "From above". Click Single race, drive three laps and look for "New best time!". Go back to the menu and open Leaderboard: your time should be there. Race again more slowly: the time should not change.

**What comes next**
- Choose my area with the team.
- The team decides about characters based on real people (permission, the public repository).
- Later: the character page with a Start button, the Cup once there are three tracks, attract mode once there are computer karts.

### 11 November 2026: first pull request, two decisions, and the three-player test written up

**What was done**
Francisco's laptop was set up and checked. Then, on the branch `fran-first-pr`, his name went into the team tables, two decisions were written down, and the walkthrough was corrected about the online test. No code changed.

| File | What changed |
|---|---|
| `README.md` | Francisco's full name and student number in the team table, as the course requires |
| `PROJECT_BRIEF.md` | The same in the team table of section 12. JavaScript marked [DECIDED]. Drawing with plain canvas marked [DECIDED] |
| `WALKTHROUGH.md` | The two-laptop checklist was described as "not run yet". It was run on 10 November with three players. Also the reason for staying with canvas |
| `docs/diary/fran.md` | This diary, new |

Laptop set-up: Node.js 26.13.0 installed by Francisco. `npm install` added 50 packages and reported 0 known vulnerabilities.

**Why it was done this way**
- The name is a first, safe pull request. It also completes item 8 of the base for Francisco (every member merges one reviewed pull request) and gives him code in the repository from his own account.
- Canvas or Phaser: the agent compared them (what each is, the work to switch, the tilted view, libraries, explaining it to staff) and recommended staying with canvas. Francisco chose canvas.

**Decisions**
- JavaScript: Francisco reported that the professor accepted it.
- Plain canvas, not Phaser: chosen by Francisco on 11 November. Teammates confirm by approving this pull request.
- The diary is called `fran.md`, as in `docs/diary/README.md`. Decision made by the agent, please confirm.

**What was checked, and what was not**
- Checked: `npm test` on this branch: 311 passed, 5 skipped (the real-database tests). Only text files changed, so no test was expected to change.
- Checked on 11 November, on `main`, before this branch: `npm test` gave 311 passed and 5 skipped. `npm start` ran, the practice page drove (the clock counted while the up arrow was held), and the online page said "Connected. You are the red kart. You are alone here."
- Not checked: the three-player test itself. It is written up from Catarina's notes in `docs/two-laptop-checklist.md` and `docs/build-diary.md`. Whether the three laptops were on different internet connections was not recorded.
- Not checked: how driving feels. The check was done in the Claude app's own browser, which redraws slowly.

- Later the same day, Pedro's pull requests #9 and #11 were merged first and changed the row next to Francisco's in both team tables, so GitHub reported a conflict. `main` was merged into this branch and both rows were kept. Checked after the merge: `npm test` gave 403 passed and 5 skipped (Pedro's work added tests).

**How to check it yourself**
Open `README.md` on GitHub and look at the team table. Search `PROJECT_BRIEF.md` for "DECIDED 11 Nov". Run `npm test`.

**What comes next**
- Francisco chooses his area with the team (section 7 of `docs/team-guide.md`).
- Run the two-laptop checklist once more on two different connections (one laptop on a phone hotspot) and write the result of each check in it.
- Pedro's branch `countdown-start` also changes the team tables. Whichever pull request is merged second will need the two rows combined by hand.
