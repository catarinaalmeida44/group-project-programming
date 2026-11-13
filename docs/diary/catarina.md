# Catarina's diary

Entries from 11 November 2026 on, newest at the top. How to write one is in `README.md` in this folder.

Everything built on 10 November is in `docs/build-diary.md`.

### 13 November 2026: laps that did not count, buildings cut off, Enter restarting a race

**What Catarina reported, after playing**

1. On the campus loop, crossing the finish line sometimes did not count a lap, and the race did not end.
2. Buildings beside the kart were "cut off" and looked buggy.
3. When the host pressed Enter by accident during a race, the race was thrown away and a new one started. A race should be played to its end.

She also asked for a step back: what does the grading value, what is missing, what about accounts and security. And she said not to rework the campus layout, because the videos from campus are not here yet. The agent worked alone and did not use helper agents, to save her usage.

**What was found, and what was done**

1. **The laps.** The lap rule was right. The game did not explain itself. On the west side of the campus loop the road makes a hairpin round the end of the CTT Student Hall, and checkpoint 5 is at the end of that hairpin. The square is open, so a kart can drive straight on and never touch checkpoint 5. From then on the finish line counts for nothing until the kart has gone through checkpoint 5, and nothing on the screen said so. The other five checkpoints go from wall to wall. The track was not changed (it is Rodrigo's, and the videos will change it anyway). Now:
   - the checkpoint to drive through next is **lit up in yellow**: a low curtain of light across the road, and a yellow line on the small map and in the views from above;
   - when a checkpoint was left out, the page says **"You missed a checkpoint: round the end of the CTT Student Hall. This lap does not count until you drive through the yellow light."**
2. **The buildings.** Two mistakes in `client/buildings.js` and `client/draw.js`. Every wall was cut where its foot left the bottom of the screen, but a tall wall beside the camera is in the picture much longer, so there was a gap up to the edge of the screen. And the rule that removes a wall standing between the camera and the kart also removed squares of a wall that the kart was only driving close to. Now a wall is cut where its top leaves the screen, and only a wall that really stands in the line from the camera to the middle of the kart is left out, together with the rest of that straight wall behind the kart. Trees and lamps now fade away as they pass the kart, instead of vanishing in one go.
3. **Enter during a race.** The server now refuses a start from the countdown until the race is over, from the host too. Because nobody can restart any more, a race needs to end by itself: it is over **one minute after the first kart has finished**, and **ten minutes after GO** at the latest. A racer who has not finished by then gets no result. The page shows "The race ends in 42 s" at the top of the picture in the last minute.
4. **New, because the grading asks for results that are clearly shown:** during an online race the page shows your place ("2nd of 4"), and at the end a **results list** with place, name and time for every kart.
5. **Security.** The server now tells a browser that came over https to always use https for this site, and tells browsers not to say to other websites which of our pages a visitor came from. `npm audit` finds no known vulnerabilities in our three libraries.

| Where | What it is for |
|---|---|
| `client/checkpoints.js` (new) | Which checkpoint is next, where its light stands, and noticing a missed one |
| `client/standings.js` (new) | The order of an online race, your place, the lines of the results list |
| `client/buildings.js`, `client/draw.js` | Changed: walls beside and behind the kart; painting the yellow light; fading trees |
| `client/race-view.js` | Changed: Enter is only offered when the race is over; "Time is up"; the time left |
| `client/main.js`, `client/online.js`, `client/online.html`, `client/style.css` | Changed: both race pages show the light and the warning; the online page shows place, time left and results |
| `server/room.js` | Changed: no start during a race, the two time limits, and two more things in the update (`passed` for every kart, `endsIn`) |
| `server/app.js` | Changed: two more safety rules with every answer |
| `tests/checkpoints.test.js`, `tests/standings.test.js` (new) | 25 tests |
| `tests/room-race.test.js`, `tests/race-view.test.js`, `tests/buildings.test.js`, `tests/page-safety.test.js` | 31 more tests |

**Eight older tests were changed. Please check them.**

Our rule is never to change a test to make it pass. These eight pinned a rule that was changed on purpose, at Catarina's request (no restart in the middle of a race), or something that follows from it (a race now ends by itself). Each has a comment in the test file that says what it said before.

| Test | Before | Now | Why |
|---|---|---|---|
| `room-race.test.js`, "can be started again by the host..." | The host could start again after everyone had finished "or while a race is on" | Only once the race is over. A new test checks the refusal during a race | This is the rule Catarina asked to change |
| `room-race.test.js`, "puts the people who were watching into the next race" | The host started the next race in the middle of the first | The start is refused first, the host drives to the end, then starts | Same rule |
| `room-race.test.js`, "is not finished while one racer is still driving" | The robot drove for two minutes and the race stayed "racing" for ever | The robot stops when the host has finished, and the race is checked then | A race now ends one minute after the first finish |
| `room-race.test.js`, "is finished when the only racer still driving leaves" | Same two minutes | Same change | Same reason |
| `room-bananas.test.js`, "picks a seed once for each race..." | A second start during the race was accepted and picked a new seed | It is refused and picks none. The next race starts after the time is up | Same rule |
| `room-bananas.test.js`, "happens when the next race starts, and nobody is still spinning then" | The host restarted while a kart was spinning | The race is given a time limit that runs out during the spin, and then the host starts | Same rule. What the test protects (no spin carried into the next race) is still checked |
| `room.test.js`, the exact list of what is sent about a kart | 12 words | 13: "passed" was added | The page needs the count of checkpoints for the light, the warning and the places |
| `race-view.test.js`, "tells a finished host how to start the next race" | Told to press Enter while the others were still racing | Told "when this one is over" during the race, and to press Enter once it is over | Enter does nothing during a race now, so the page must not offer it |

The test helper `robotsDrive` in `room-race.test.js` got one more optional setting ("stop when..."). One existing building test ("cuts a building that reaches behind the bottom of the screen") was NOT changed and still passes: the outline that is filled still never goes below the screen.

**Decisions made by the agent, please confirm**

- The others get **one minute** after the first finish. A first guess. The number is at the top of `server/room.js`.
- No race lasts longer than **ten minutes** after GO.
- A racer who runs out of time gets **no result**, and nothing is saved for them.
- The fix for the laps is guidance, not a change to the track. The better fix is for Rodrigo: close the short cut past the CTT Student Hall with a hedge, or take the hairpin out.

**What was checked**

- `npm test`: 1,234 tests pass, 5 are skipped (they need the database address). Before this work there were 1,178.
- The new code was broken on purpose in 30 ways, one at a time. 28 made a test fail at once. Two did not ("a racer who is out of time can still drive", "the light stands on walls too"). Those two tests were made stricter, and then all 30 were caught.
- In the agent's browser, on a laptop: the campus loop painted at several spots close to buildings (the wall beside the kart now reaches the edge of the picture), the yellow light on the road and on the small map, and the real online page: the host started a race, drove, pressed Enter in the middle, and nothing happened. The results list was looked at with made-up lines.
- The live server, from outside, without an account: it sends the browser rule, refuses a sign-in that comes from another website (403) and one in the wrong format (415), and the leaderboard answers.
- `npm audit`: no known vulnerabilities.

**What was NOT checked**

- Nobody has driven any of this by hand. The agent's browser shows single pictures, not movement. Whether the buildings look right in motion is for Catarina to say.
- A whole online race to the results list, the minute after the first finish with real players, and the missed-checkpoint warning set off by a person in the page. They are checks 49 to 58 in `docs/two-laptop-checklist.md`.
- Nothing of this is on the live server until the pull request is merged. The always-https rule can only be seen there.
- The tests against the real database were not run (nothing about the database changed).

**How to check it yourself**

1. `npm start`, open http://localhost:3000, Single race, Campus loop. Drive, and look for the yellow light on the road ahead and on the small map.
2. On the west side, drive straight past the CTT Student Hall instead of round its end, up to the finish line. The warning should come, and the lap should not count.
3. Drive close along a building. It should be whole up to the edge of the picture.
4. Online, as host: press Enter, drive off, press Enter again. Nothing should happen.

**Git steps, done by the agent at Catarina's request**

- Fetched from GitHub: pull request 16 was merged, and the live server runs it.
- Made the branch `race-fixes` from the up-to-date `main`.
- Six commits, one per step: the race rules, the buildings, the checkpoint light with places and results, the safety rules, stricter tests, the notes.
- Pushed the branch to GitHub as a backup. The pull request is for Catarina to open and for a teammate to approve.

### 12 November 2026, later: the race view, karts as 3D models, bumping, bananas, kart colours

**What was done**

Catarina said the graphics were underwhelming and asked for much more: better karts above all, a campus loop that looks like Nova SBE, a real start line, karts that bump, bananas that make a kart spin, and arrows that show the way. She asked the agent to work freely and be ambitious. Three agents worked at the same time: one on all the pictures (on the branch `race-graphics`), one on the new rules in its own copy of the folder (branch `race-rules`), and one that only read about the real campus online and wrote a report. The rules branch was merged into the pictures branch without a clash, because the split was strict: rules own `shared/` and `server/`, pictures own `client/`.

What a player sees now:

- **The race from behind the kart**, low and close, with a horizon, a sky, clouds, and buildings and trees standing on both sides.
- **Karts as small 3D models** with a driver, a helmet, wings and wheels. They turn smoothly, and the front wheels and the driver turn with the steering.
- **"Your kart" in the menu**: choose the colour of the kart, the helmet and the suit. Other players see them online.
- **A real start**: a grid of painted boxes behind a chequered line, a gantry with three lights, and the camera coming down from above the grid during 3, 2, 1.
- **Arrows** painted on the road, **arrow boards** at the bends, and a **"Wrong way!" warning**.
- **Bumping**: karts push each other instead of passing through.
- **Banana peels** that appear on the road during a race and make a kart spin.
- **The campus loop looking like the campus**: white buildings with dark glass, pale paving, lawns, hedges, palms and pines, the sea, the fort and the lighthouse on the horizon, name signs, the painted beach tunnel.
- **The test oval as a circuit in the woods**, with red and white banks.

| Where | What it is for |
|---|---|
| `client/kart-shape.js`, `client/kart-paint.js` | The kart as a 3D shape, and painting it from any side |
| `client/draw.js` | Puts the whole picture together, in the right order |
| `client/ground.js`, `client/sky.js`, `client/props.js` | The ground, the sky, and trees, signs and bananas |
| `client/track-looks.js` | How each track looks |
| `client/route.js`, `client/scene.js` | Arrows and "wrong way"; the start lights, the camera coming down, the spin |
| `client/camera.js`, `client/buildings.js` | Changed: a low race camera next to the high one; banks, and what a low camera sees |
| `client/kart-choice.js`, `client/kart-panel.js`, `shared/kart-looks.js` | Choosing kart colours, and the rule for what may be chosen |
| `shared/grid.js`, `shared/laps.js`, `shared/track.js` | The starting grid, and the start behind the line |
| `shared/bumps.js` | Karts bumping into each other |
| `shared/hazards.js`, `shared/countdown.js`, `shared/race.js`, `shared/physics.js` | Banana peels and the spin |
| `server/room.js`, `server/online.js`, `server/messages.js` | Changed: the room uses the grid, bumps the karts, looks after the bananas, and passes on kart colours |
| `client/main.js`, `client/online.js`, `client/net.js` | Changed: both race pages show all of the above |
| `tests/` | 9 new files, 358 new tests |

**Why it was done this way**

- **Still no library and no image files.** Everything is drawn by our own code on the browser's canvas, as the team decided on 11 November. A kart is boxes and wheels with real positions, so it can be painted from any side and recoloured. A picture could not.
- **One piece of arithmetic for everything.** The same sum says where the ground, a building, a tree and every corner of a kart land on the screen. That is why they line up, and it has tests.
- **Rules stay rules.** Bumping, bananas and the start are in `shared/` and the server runs them. The pictures only show what the rules worked out. A spinning kart is turned in the picture only: the rules do not turn it.
- **Bananas are chance, but honest chance.** They grow from a number picked at the start of a race. The server picks it, and no message from a browser can place or remove a banana.
- **Kart colours travel as three small numbers**, never as a colour or a text, so nothing harmful can ride along to other players' screens.
- **The campus comes from reading, not from copying.** A helper read the school's campus tour, its campus map and newspaper reports, and described the place in its own words. Nothing was copied, and no logo is used.

**Existing tests that were changed, for the team to check**

The team's rule is never to change a test to make it pass. These five were changed because the rule they pinned was changed on purpose, at Catarina's request. Nothing was deleted or loosened.

| Test | Before | Now | Why |
|---|---|---|---|
| `tests/race.test.js`, the racer at the start | on `track.start`, with the old progress | on pole, behind the line, with the new progress | the start moved |
| `tests/campus-loop.test.js`, where the track starts | just after the finish line | just behind it | the start moved |
| `tests/campus-loop.test.js`, the robot's path that skips the Auditorium | a point at column 31, row 49 | row 48 | from the new start the simple robot got stuck on a corner. What the test checks is unchanged |
| `tests/track-list.test.js`, the start dot on the small map | column 16.5 | column 13.5 | the start moved |
| `tests/room.test.js`, what the server sends about a kart | eleven things | twelve: "spin" was added | a spinning kart has to be shown |

**Decisions**

Decided by Catarina: karts start behind the line; karts bump; bananas; arrows that show the way; better graphics with the karts first.

Decisions made by the agent, please confirm:

1. **Rodrigo's track.** Only where the campus loop starts was changed in `shared/tracks/campus-loop.js` (four squares back, behind the line). The layout, the checkpoints and the storeys are untouched. Everything about how it looks is in new files. Rodrigo should review this.
2. **Bananas appear by themselves**, about one every 2 to 5 seconds, up to 5 on the oval and 12 on the campus loop. They are not items a player holds. They also appear in a single race.
3. **Races with bananas count for the shared leaderboard** like any other, although bananas make a race partly luck.
4. **A bump** gives back half of the closing speed, and all karts weigh the same for now.
5. **A spin** lasts 1.2 seconds, and for 1 second after it a kart cannot be spun again.
6. **The camera swings round a moment after the kart turns**, so you see your kart turn.
7. **The looks**: a circuit in the woods for the oval; for the campus white buildings with glass bands, pale paving, hedges round the edge, palms on the sea side and pines inland.
8. **Names on the campus signs**: Walk of Founders, Green Park, Library, Horizon Hall, Grand Auditorium, Student Hall. No sponsor names and no logos.
9. **Two players may choose the same kart colours.**
10. **A browser may now send a fourth kind of message**, the colours of its kart.

**What was checked, and what was not**

Checked:

- `npm test`: 1,178 tests pass, 5 are skipped (they need the database address). Before this work there were 820.
- The new code was broken on purpose in 68 ways, one at a time (42 in the rules, 26 in the pictures and the kart colours). Every one made at least one test fail.
- One test found a real mistake while it was being written: the wheels of the kart floated a little above the ground.
- In the agent's browser, as single pictures: both tracks in all three views, the start with its lights, the eight kart colours from every side, every tree, sign and banana, the "Your kart" panel, three karts on the online grid in their chosen colours.
- In the real page: a robot drove a race with bananas and spun once; reversing down the straight brought up "Wrong way!"; two pretend players bumped the page's kart forward on the online grid.
- Working out one picture took 2 to 5 thousandths of a second in that browser.

Not checked:

- **How any of it looks in motion.** The agent's browser was not on the screen, so it showed single pictures only. Whether the race view is smooth, and how the camera's swing feels, has to be judged by a person.
- **Bumping and bananas played by people.** All the numbers are first guesses.
- **The live server.** This was only run on a laptop.
- **The campus compared with the real place.** It was built from descriptions. The videos Catarina asked people to film are the next step.
- Firefox, Safari, a phone, an old laptop.
- One thing a robot showed: after a spin a kart can end up standing nose to a wall, and the player has to reverse. The test robot cannot reverse and got stuck there.

**What was done in git**

- A branch `race-graphics` was made from `main` after pull request 15 was merged.
- The rules helper worked in a separate folder, `.worktrees/rules`, on the branch `race-rules`. It was merged into `race-graphics` in two steps and then removed.
- Small commits, one per step, pushed to GitHub as a backup. Nothing was merged into `main`.

**How to check it yourself**

1. Run `npm start` (or `npm run start:pretend`) and open http://localhost:3000.
2. Click "Your kart" and choose colours.
3. Click "Single race" and choose the campus loop. Press an arrow key and watch the start. Follow the arrows. Drive over a banana.
4. Turn round and drive the wrong way for a moment.
5. Open "Online" in two browser windows, choose the same track in both, and drive one kart into the other.
6. `docs/two-laptop-checklist.md` has checks 37 to 48 for all of this with two laptops.

**What comes next**

- People play it and say how it feels. The numbers to tune are named at the top of `shared/bumps.js`, `shared/hazards.js`, `client/camera.js` and `client/draw.js`.
- The campus videos, to make the buildings differ from each other as the real ones do.
- Characters that look different from each other. The kart model was made so that its parts can be swapped.
- Still open from before: slower karts on the campus loop, a results screen with everyone's position, the cup.

### 12 November 2026: accounts, the shared leaderboard, and a new menu

**What was done**

Catarina asked for three things in one pull request: accounts and a shared leaderboard, a better-looking menu and leaderboard, and the campus track reachable from the menu. Two agents worked at the same time. One built the accounts on the branch `accounts-and-design`. A second one built the design in its own copy of the folder, on a branch called `design-menu`. They agreed first on one small file, `client/account-api.js`, which says how a page asks the server about accounts. Each side was written against that file, and at the end the design branch was merged into the accounts branch without any clash.

What a player can do now:

- Open the menu and see a drawn picture of the campus by the sea, with four big choices.
- Click Single race or Online and choose a track from cards with a small map: the test oval or the campus loop.
- Create an account with a user name and a password, sign in, sign out, and delete the account.
- Race online in the room of a track. If signed in, the server saves the time at the finish, and the page says "Saved to the leaderboard: 1st place, 0:28.25".
- Open the Leaderboard and see, for each track, the ten fastest races and laps of all players, with their own row marked.

| Where | What it is for |
|---|---|
| `shared/account-rules.js` | Which user names and passwords are allowed. Used by the page and by the server |
| `server/passwords.js` | Scrambles a password so it is never kept in a readable form |
| `server/store.js` | Every database question about players, sessions and results |
| `server/accounts.js` | The rules: signing in, the lock after wrong passwords, how long a sign-in lasts, the leaderboard |
| `server/api.js` | The addresses the pages use, all starting with `/api/`, and everything they refuse |
| `server/room.js`, `server/online.js` | Changed: the room keeps the finishing order, there is one room per track, and a signed-in racer's result is saved |
| `server/app.js`, `server/db.js`, `server/start.js` | Changed: the account addresses are switched on, the database connection is shared, and browsers are told to run only our own scripts |
| `server/start-pretend.js` | New command `npm run start:pretend`: the game with pretend accounts, for laptops without the database address |
| `client/account-api.js` | How a page asks the server about accounts and the leaderboard |
| `client/index.html`, `client/style.css`, `client/menu.js` | The new menu and the new look of all three pages |
| `client/track-*.js`, `client/mini-map.js` | The "Choose a track" panel |
| `client/leaderboard*.js`, `client/answers.js` | The Leaderboard panel |
| `client/account*.js` | The account corner and its three panels |
| `client/online.js`, `client/online.html`, `client/net.js`, `client/track-choice.js` | Changed: the online page takes the track from its address, and shows who you are signed in as, who is with you, and whether your result was saved |
| `tests/` | 18 new files: 15 with tests and 3 helpers they share. `tests/README.md` lists what each one checks |

**Why it was done this way**

- The server decides, the page asks. A page never sends a time, a player number or a track for a result. The server ran the race, knows the room, and knows the player from the cookie. So there is nothing to fake.
- The password is scrambled with `scrypt`, which comes with Node.js, so no new library was needed. Staying signed in uses a cookie that the page's own code cannot read.
- The rules, the database questions and the internet side are three separate files. The rules can then be tested in a fraction of a second with a pretend store and a pretend clock. The same list of checks runs on the pretend store and on the real database, so the two cannot drift apart.
- The menu's files are split the same way: one file works out what to show and has tests, another puts it on the page.
- No new library was added. The picture in the menu is drawn in the page itself, with no image files and nothing from another website.

**Decisions**

Decided by Catarina on 12 November: the characters will be based on real people. It is written in the brief, with one condition the agent added: a real person's name or face goes into the game or this public repository only after that person said yes.

Decisions made by the agent, please confirm:

1. **No email yet.** An account is a user name and a password. A forgotten password cannot be reset, and that account can then no longer be used. Email needs an outside service and a new secret key. The options: (a) stay like this, simplest, fine for a course demo; (b) add email later for verifying and resetting, as the brief proposes. The agent recommends (a) for now and deciding (b) as a team.
2. **Guests can race online.** Only signed-in players' results are saved. The brief proposed that online races need an account. Letting guests in keeps the demo easy: nobody has to sign up to try it.
3. **One fixed room per track**, instead of rooms with codes. It is a step towards them, not a replacement.
4. **Limits on tries.** Per computer: 20 sign-ups and 30 sign-ins a minute. Those are high on purpose, because the whole campus Wi-Fi looks like one computer to the server. In total: 60 password checks a minute, so a flood of tries cannot slow the races down.
5. **Single race and Online open the track panel** instead of going straight to their pages.
6. **The look**: navy, red and yellow stay. The picture is our own drawing, with no logo and no official artwork.
7. **"Online test" is now called "Online"** on the pages.
8. **A new command, `npm run start:pretend`**, and a line about it in `AGENTS.md` and `README.md`.
9. **Who owns the database tables** is still open in `AGENTS.md`. Catarina built them, so she is the natural owner, but that is for the team to say.

**What was checked, and what was not**

Checked:

- `npm test`: 820 tests pass, 5 are skipped (the ones that need the database address). Before this work there were 473.
- `npm run test:database`, on home Wi-Fi: the tests against the real database pass. They only used tables whose names start with `test_`, and removed them.
- The code was broken on purpose in 26 ways, one at a time, for example "accept requests from other websites", "the lock is not enforced", "a guest's result is saved". Every one made at least one test fail.
- A whole visit through the real server code with a robot driver, outside the browser: sign up, connect, three laps of the test oval, the time on the leaderboard, sign out, delete.
- The same visit in the agent's browser, through the new menu, with pretend accounts: create an account (first with a name and a password that are too short), join the room, a robot drove three laps in the real page, "Saved to the leaderboard: 1st place, 0:28.25", the Leaderboard panel showed that time, sign out, a wrong password, sign in, a wrong password for deleting, delete. The page's code could not see the cookie.
- The real `npm start` with a database address that cannot work: the game ran, and the account addresses answered "could not be reached" without any detail.
- The menu at laptop, tablet and phone sizes, the online page at phone size, and no error in the browser's console under the new rule about scripts.

Not checked:

- **The live server.** It has no accounts until this is merged. The real tables do not exist yet: the server creates them the first time they are needed. After the merge, checks 25 to 36 in `docs/two-laptop-checklist.md` need to be done on the public link.
- Two real people, signed in, racing each other on two laptops.
- How long the password scrambling takes on the free server. On this laptop it takes 70 thousandths of a second.
- Whether the limit per computer sees the right address behind Render's network.
- Whether GitHub runs the tests on this pull request. On 12 November its test runs had been stuck waiting since the evening before, and nobody knows why yet.
- Firefox, Safari, a real phone, a screen reader, and how smooth the menu's moving parts are. The agent's browser was not on screen, where nothing moves smoothly.
- How the campus loop feels online. Karts are still too fast for it, which the team has not decided on.

**What was done in git**

- A branch `accounts-and-design` was made from `main` as it was after pull request 14.
- The second agent's work was kept in a separate folder, `.worktrees/design`, on the branch `design-menu`, so the two agents never wrote in the same folder. That folder was never part of the repository, and it was removed at the end, together with the `design-menu` branch, once everything in it was merged.
- The work was saved as small commits, one per step, and the branch was pushed to GitHub several times as a backup.
- `design-menu` was merged into `accounts-and-design`. Nothing was merged into `main`: that happens when a teammate approves the pull request.

**How to check it yourself**

1. In the project folder run `npm run start:pretend` and open http://localhost:3000.
2. Click "Create account". Try a name of two letters first. Then make a real one.
3. Click "Online", choose a track, press Enter, and drive the three laps.
4. Go back to the menu and open "Leaderboard". Your time is there.
5. Stop the server with Ctrl+C and start it again: the account is gone. That is what "pretend" means.

**What comes next**

- A teammate reviews and merges the pull request. Then the live server needs the checks above.
- The team confirms or changes the decisions listed above.
- Still to build: characters, items, computer karts, the cup, more campus tracks, and a results screen that shows everyone's position (Pedro's plan).
