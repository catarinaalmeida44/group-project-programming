# Project brief: Nova SBE kart racer (working title)

> How to use this file: this is the starting context for our coding agent (Claude Code or Codex). Read all of it before doing anything. It lives in the repository and is updated as decisions change.

## 1. What we want from you

We are a team of students (names in section 12) building our team project for Introduction to Programming (course 2477) at Nova SBE. We are programming beginners: most of us have never written code before. You will write most of the code, but **every member must understand the whole project well enough to answer staff questions about any part of it**. One person's gap lowers everyone's grade, because all members get the same grade.

**Your first goal is to help us build the base**: a deployed, working foundation. That means the repository, a server, a database connection, one kart driving on a test track, a first online connection between two laptops, and automatic tests (details in section 8). Once the base is done, we will build the features one at a time.

This brief is context, not a contract. Many details will change as we build and play. Each item has a status:

- **[DECIDED]**: the team decided this. Follow it unless we change it.
- **[PROPOSED]**: recommended during planning, not yet confirmed by the team. Treat it as the default, but check with us before building something that depends heavily on it.
- **[OPEN]**: not decided. Do not decide it silently: ask us.
- **[COURSE RULE]**: required by the course and graded. Not negotiable.

## 2. How to work with us

1. **Explain before you build.** Before each task, describe in plain language what you will do, which files you will create or change, and why. Wait for our OK on anything big.
2. **Explain after you build.** Summarize what changed, where it lives, why it was done this way, what it does not handle yet, and how we can check it ourselves (in the browser and in the tests).
3. **Plain language.** If you need a technical term, explain it the first time you use it (for example: "a session cookie is a random ticket the browser keeps so the server knows you are logged in").
4. **Never decide silently.** When something is [OPEN] or not covered here, give us the options, the reasoning behind each, your recommendation and a short concrete example. If we are not available, choose the simplest option that is easy to undo and flag it in the pull request as "Decision made by the agent: ... please confirm".
5. **Small steps.** One task per branch, small pull requests, merged often. *Changed 10 Nov 2026 at Catarina's request, teammates to confirm: each step is still its own commit, but the steps of one piece of work share a branch and one pull request, so work does not stop while a pull request waits for approval. See `AGENTS.md`.*
6. **Tests for every rule, including rejected actions** (things that must NOT be allowed). Never edit or delete existing tests to make them pass. If you think a test is wrong, tell us why.
7. **No secrets in the repository, ever** (passwords, database connection strings, API keys). Code reads secrets from environment variables. Real values live in a local `.env` file (ignored by git) and in the hosting settings. Only `.env.example`, with placeholder values, is committed.
8. **Few outside libraries.** Before adding one, tell us what it does, why we need it and what the alternative is. "Minimal, pinned dependencies with no known vulnerabilities" is part of the grade.
9. **Keep the walkthrough notes up to date** (section 9).
10. **Keep this brief up to date.** When a decision changes, move the item between [OPEN], [PROPOSED] and [DECIDED] and add the date.

## 3. The course: requirements and grading [COURSE RULE]

Course pages: https://2477-introduction-programming.gitlab.io/wiki/team-project/ and the guides at https://2477-introduction-programming.gitlab.io/wiki/guides/

- Worth 40% of the final grade. All members receive the same grade.
- Deadline: **23 November 2026, 23:59**. One member submits the GitHub repository link on Moodle. Commits after the deadline are not graded.
- The app must be deployed at a public URL, and the deployed code must be on the `main` branch.
- The repository must be public, with no keys or passwords in it.
- `README.md` must include the deployed URL, the names and student numbers of all members, and the commands to run the app and its tests locally.
- Every member must contribute code to the repository, from their own GitHub account.
- Presentation (weeks 11 to 12):
  1. **Live demo** at the deployed URL. Slides or recorded videos are not accepted as a replacement. Our demo slot is about 5 minutes.
  2. **Repository walkthrough.** Staff open the repo and ask high-level questions (for example: where data is stored, what the tests cover and miss, what happens if an external service is down). Any member can be asked about any part.
- The course's stack guide says projects in JavaScript need approval from the teaching staff. Our professor approved the game idea. **[DECIDED 11 Nov 2026] The professor accepted JavaScript** (reported by Francisco).

### Grading criteria

| Criterion | Weight | What the top band requires |
|---|---|---|
| It works | 20% | All workflows run without errors, including invalid input |
| UI and UX | 20% | Direct workflows; results and errors clearly shown |
| Scope and ambition | 20% | Substantial features well beyond a solo project, consistently implemented |
| Verification | 10% | Accepted and rejected actions and edge cases tested; all tests pass on `main` |
| Security | 10% | Access control and input validation enforced; minimal, pinned dependencies with no known vulnerabilities |
| Repository walkthrough | 20% | We can explain how and why it is built, its limits, and how it could change |

What this means for you: prefer finished, reliable features over many half-finished ones, show clear error messages, test the rejected actions, and keep the code simple enough for us to explain.

### Course workflow recommendations

- Keep an `AGENTS.md` rules file in the repository so every member's agent follows the same rules. Claude Code reads `CLAUDE.md`, which can simply say "Follow AGENTS.md". Change these files only through pull requests.
- For each task: new branch from an up-to-date `main`, agent makes the change, run the tests and the app, read every changed line, commit, open a pull request, a teammate reviews, then merge. Nobody merges their own pull request without a review.
- One owner per shared structure (database tables, the main server file, `AGENTS.md`).
- **[DECIDED 10 Nov 2026 by Catarina; teammates confirm by approving the skeleton pull request]** The agent may run git commands itself (create a branch, commit, push) when the member working with it asks. It must explain every step and record it in `docs/build-diary.md`. It never merges into `main`: a teammate reviews and merges. Members who prefer GitHub Desktop keep using it.

## 4. The game

### Concept

- [DECIDED] A 2D online kart racing game. Real-time: karts move continuously while you steer. Driving mechanics inspired by Mario Kart.
- [DECIDED] Set at the Nova SBE Carcavelos campus and its surroundings.
- [DECIDED] Online multiplayer: players race from different computers.
- [DECIDED] Original characters, names, items and art. No Nintendo characters, names, music or images anywhere in the game or the repository. We borrow mechanics and stat balance only.
- [OPEN] Game title, character names and designs, art style, item names and theme.

### Modes

- [DECIDED] Two modes: **Single race** (choose one track) and **Cup** (several tracks in a row, with points). There is no boss level.
- **[DECIDED 11 Nov 2026 by the team, reported by Francisco]** The cup has 3 tracks, not 5: more doable in the time left.
- [PROPOSED] Cup = all the tracks, 3 laps each. Points per finishing position: 10 / 7 / 5 / 3 / 2 / 1. Ties go to the better finish in the last race. You keep the same character for the whole cup.
- [PROPOSED] The cup can be played at three difficulties (Easy, Normal, Hard), set by how well the computer karts drive.
- [PROPOSED] The host can set races to 1 lap, for testing and for the 5-minute demo.

### Map and camera

- [DECIDED] Top-down view with a fixed map: north is always up, the kart turns but the map never rotates. The camera is zoomed in and follows each player's own kart. *10 Nov 2026: Catarina asked for a tilted view from behind the kart instead, in which the map turns around the kart. Both views are built and the V key switches between them, so the team can compare. **[DECIDED 10 Nov 2026 by Catarina; teammates confirm by approving the pull request]** The game starts in the tilted view from behind the kart. The view from above stays available with V.*
- *12 Nov 2026, at Catarina's request ("the graphics are underwhelming, be more ambitious"): the view behind the kart was rebuilt as a race view. The camera is low and close behind the kart, with a horizon, a sky, buildings with windows, trees, and karts drawn as small 3D models that turn smoothly. A race opens with the camera high above the grid, coming down during 3, 2, 1, under a gantry with start lights. Still drawn on the browser's own canvas, with no library and no image files: the decision of 11 Nov against a game library stands. The campus loop was made to look more like the campus, from what can be found online. Videos filmed on campus are to follow. Decisions made by the agent, please confirm: the looks of the two tracks (a circuit in the woods for the test oval; white buildings, pale paving, hedges, palms and pines for the campus), the names on the campus signs, and that the camera swings round a moment after the kart turns.*
- [PROPOSED] The camera looks slightly ahead in the driving direction and stops at the map edges. A minimap in a corner shows a dot for every kart, in each player's colour. After you finish, the camera follows the leader.
- [PROPOSED] Tracks are drawn in Tiled (a free map editor that Phaser can read), using the real OpenStreetMap layout as a template. Paths are widened to fit 3 to 4 karts and sharp corners are rounded: recognisable, not exact. The game shows the credit "© OpenStreetMap contributors". *11 Nov 2026: Phaser was dropped, so tracks are drawn with letters in a file (`shared/track.js`), not in Tiled. The campus loop was made from OpenStreetMap data by a short script run in the browser, then adjusted by hand. Details in `docs/diary/rodrigo.md`.*
- [PROPOSED] Surfaces:
  - road: full speed
  - grass: off-road, slower
  - beach sand: heavier off-road, slower still
  - sea: you fall in and restart at the last checkpoint after about 2 seconds
  - buildings and walls: you bounce off
  - boost pads and item boxes
- [PROPOSED] Five tracks:
  1. a campus loop (the learning track)
  2. through the beach tunnel and onto the sand (off-road grip, sea hazard)
  3. along the Marginal by the sea (top speed)
  4. around the São Julião da Barra fort walls (handling and drifting)
  5. a long track combining the campus areas

  **[OPEN]** Final choice of tracks: which 3 of these five (the team agreed on 3 tracks on 11 Nov 2026).

  **[DECIDED 11 Nov 2026, reported by Rodrigo, who owns the campus tracks]** The tracks are taken from the Nova SBE campus and its building, not from the beach, the Marginal or the fort. Tracks inside the building would be the ideal. Indoor tracks keep the building's real proportions, and the karts are miniatures, instead of making the corridors wider (Rodrigo's idea). Laps should take 30 to 40 seconds.

  *11 Nov 2026, built by Rodrigo:* the **campus loop** (`shared/tracks/campus-loop.js`), round the outside of the campus, with detours round the Grand Auditorium and the CTT Student Hall. 6 metres a square, turned 21° so the buildings line up with the squares. *Decision made by the agent, please confirm:* OpenStreetMap as the source rather than the school's campus-tour drawing (which is drawn at a slant), the 6-metre squares and the 21° turn.

  [PROPOSED 11 Nov 2026 by the agent] The other two tracks are indoor, for example the ground floor round the Hovione Atrium and the KPMG Gallery. They need a floor plan: photos of the evacuation plans on campus, or one from Facilities & Services.

  *11 Nov 2026, asked for by Rodrigo:* in the view behind the kart, the buildings of the campus loop stand up, as tall as their storeys. Only the picture changes; the driving rules do not. OpenStreetMap has no storey counts for the campus, so they come from the floors listed on the school's campus map, a first guess to check on campus. *Decision made by the agent, please confirm:* 3.5 metres a storey, buildings without a count get 2 storeys, the edge of the campus stays flat, and our own kart is always painted on top. This changes `client/draw.js`, which is not in Rodrigo's area.

  **[OPEN]** A lap of the campus loop takes about 20 seconds for the test kart, not 30 to 40, because at this scale a kart drives at about 200 km/h. Rodrigo proposes making all karts about 40% slower (the numbers at the top of `shared/physics.js`). This also makes laps of the test oval longer. For the team, and the owner of the driving physics, to decide.

### Driving physics

- [DECIDED] Our own physics code. This is required, not just a preference: the server runs the races, and game libraries' physics only runs inside a browser.
- [DECIDED] Character balance is adapted from Mario Kart 8 Deluxe's in-game stats, as documented by fans. Use only the ground stats: speed, acceleration, weight, ground handling, on-road traction (grip), off-road traction and mini-turbo. Drop the water, air and anti-gravity stats and the gliders.
- These stats are scores (roughly 1 to 5.75, in steps of 0.25), not physical units. We write the formulas that turn them into motion, then tune the numbers by playtesting.
- [PROPOSED] Off-road reference from Super Mario Kart (SNES) data: a medium character keeps about 74% of its top speed off-road (783 on road, 580 off-road at 50cc). Off-road grip moves that percentage up or down.
- Credit in the README: "Character balance adapted from Mario Kart 8 Deluxe stat tables compiled by the Super Mario Wiki community." Check the source's license before copying any file into the repo. Store only our own characters with their numbers.
- Sources:
  - https://www.mariowiki.com/Mario_Kart_8_Deluxe_in-game_statistics
  - CSV version: https://gitlab.isae.fr/a.stevan/mk8dx-datasets
  - SNES physics notes: https://tasvideos.org/GameResources/SNES/SuperMarioKart.html

[PROPOSED] Driving rules, each controlled by one stat:

| Rule | In plain words | Controlled by |
|---|---|---|
| Accelerating | Speed climbs toward top speed. Gains are fast when slow and gentle near the top | Acceleration |
| Top speed | Maximum on road, lower on grass and sand | Speed, off-road grip |
| Coasting and braking | Release the gas and you slow gradually. Brake and you stop fast. Reversing is slow | Same for everyone |
| Steering | How fast the kart turns. No turning when standing still, and slightly wider turns at top speed | Handling |
| Grip | How closely the kart follows the direction it points. Low grip slides wide in corners | On-road grip |
| Drift and boost | Hold drift while turning for a tighter, sliding turn. Sparks charge in 3 stages; release for a boost, longer at higher stages | Mini-turbo |
| Walls | Bounce back and lose about half your speed | Same for everyone |
| Bumps | Karts push each other apart, and the lighter one is pushed further | Weight |

- [PROPOSED] Physics runs in fixed steps of 1/60 of a second, the same way in the browser and on the server.
- Tests should compare characters (for example "higher acceleration reaches top speed sooner") instead of checking exact numbers, so that tuning the numbers does not break them.

### Laps, positions, items and computer karts

- [PROPOSED] Laps and positions:
  - A race is 3 laps. Invisible checkpoints are placed around the track, and a lap only counts if all of them were crossed in order (no shortcuts).
  - Who's ahead: first compare laps completed, then checkpoints passed, then distance to the next checkpoint.
  - A warning appears if you drive the wrong way.
  - *12 Nov 2026, at Catarina's request: the karts now start on a grid BEHIND the start line, as in real racing, instead of just after it. Crossing the line for the first time starts lap 1 and does not count as a lap. The clock still starts at GO. The "wrong way" warning is built, together with arrows on the road and arrow boards at the bends. "Who's ahead" during a race is still not built.*
  - *13 Nov 2026, after Catarina reported laps that did not count on the campus loop: the lap rule is unchanged. The checkpoint a kart has to reach next is now lit up in yellow, and the page says which checkpoint was missed. The cause was one checkpoint that can be driven past, at the hairpin round the CTT Student Hall. The track itself was not changed. **[OPEN]** For Rodrigo, who owns the track, once the campus videos are here: close that short cut with a hedge, or take the hairpin out. "Who's ahead" is now built for online races: your place during the race and a results list at its end, worked out by the page from what the server sends.*
- *12 Nov 2026, at Catarina's request: a first item-like thing is built, banana peels. They are not items a player holds: they appear on the road by themselves from time to time during a race, and a kart that drives over one spins for 1.2 seconds. Decisions made by the agent, please confirm: how often they appear and how many (the numbers are named at the top of `shared/hazards.js`), that they also appear in a single race, and that results of races with bananas count for the shared leaderboard like any other. Item boxes and the seven item effects below are not built. A banana peel is a common idea and our own drawing: nothing is taken from another game.*
- [PROPOSED] Items:
  - You get an item from an item box and can hold one at a time.
  - Catch-up rule: players further behind get better items, and first place never gets the strongest ones.
- [PROPOSED] Seven item effects (names [OPEN]):
  - boost
  - triple boost
  - trap dropped behind you (spins the kart that hits it for 1 second)
  - straight projectile that bounces off walls
  - homing projectile that chases the kart in front
  - shield that blocks one hit
  - short invincibility (faster and immune)
- [PROPOSED] Computer karts:
  - Each race has 6 karts: up to 4 humans, with computer karts filling the rest.
  - They follow a racing line (a chain of points around each track), brake before corners and use items.
  - Three difficulty levels.
  - Mild catch-up: slightly faster when far behind, slightly slower when far ahead.

### Characters and the selection menu

- [PROPOSED] 8 original characters: 6 available from the start (2 light, 2 medium, 2 heavy) and 2 to unlock. *Changed on 12 Nov 2026 at Catarina's request (teammates confirm by approving the pull request that contains this change): the characters will be based on real people, not only on campus "types" as first proposed. Before a real person's name or face goes into the game or into this repository, which anyone on the internet can read, that person has to have said yes. Still no Nintendo characters, names or images.*
- *12 Nov 2026: a first step towards characters is built. Every kart is one 3D model with a driver, and a player can choose the colour of the kart, the helmet and the suit in the menu ("Your kart"). Other players see those colours online. There are no characters with different shapes or different driving yet: everyone still drives the placeholder driver. Decision made by the agent, please confirm: two players may choose the same colours (the rule below about one character per player is about characters, which do not exist yet).*
- [DECIDED] Each character can be used by only one player per race. No duplicates.
- [DECIDED] All characters are available in the demo.
- [PROPOSED] Normal players unlock characters 7 and 8 by winning the cup on Normal and on Hard. Demo accounts get everything unlocked through their saved progress, never through a "demo mode" switch or a special address, which would be a security hole. **[OPEN]** The alternative is no unlocking at all.
- [PROPOSED] What the menu shows:
  - a grid of portraits, with locked characters shown as silhouettes with a padlock and their unlock condition
  - for the highlighted character: name, weight class, a one-line description and 7 stat bars, read from the same stats file the physics uses
  - control with arrow keys and Enter, or the mouse; it remembers your last choice
- [PROPOSED] How picking works online:
  - Everyone sees each other's picks live, in their player colours.
  - The first request to reach the server gets the character. The other player sees "Already taken by [name]".
  - You can change your pick until you press Ready.
  - There's a 30-second timer, after which anyone who hasn't picked gets a random free character.
  - Computer karts take free characters, chosen only from the 6 starting ones.
- Rejected actions to test:
  - picking a character someone else already has
  - picking a locked character, even by sending the request directly to the server
  - two requests for the same character at once: exactly one must succeed
  - picking after the timer runs out
  - changing character in the middle of a cup
  - a computer kart getting a character a human picked

### Menu flow [PROPOSED]

1. Title screen: log in, sign up, or practice as a guest
2. Main menu: Single race / Cup / Online / Leaderboards / Profile
3. Online: create a room (choose the mode, the track or difficulty, and the number of laps) or join one with a code, then the lobby
4. Character selection
5. Track selection (single race) or difficulty selection (cup)
6. Countdown, race, results. In a cup, a standings screen follows, then the next track.
7. Back to the main menu

*11 Nov 2026, built by Francisco: a first main menu is the first page of the game: Single race (the test track), Cup (shown greyed out until the tracks exist), Online (the online test page), Leaderboard and a Settings button in the top right corner. There is no title screen, login or Profile yet, because there are no accounts. Ideas from Francisco for later, not decided by the team: a character selection page before the race with a Start button, 2 computer karts to begin with, and the game itself driving in the background of the menu ("attract mode") instead of a video.*

*12 Nov 2026, at Catarina's request: the menu has a new design, a drawn picture of the campus by the sea behind four big choices, and it now has what was missing: a "Choose a track" panel for Single race and for Online, the shared leaderboard of section 6 in the Leaderboard panel, and an account corner with Sign in, Create account and Your account. There is still no title screen and no Profile page. Decisions made by the agent, please confirm: Single race and Online open the track panel instead of going straight to their pages; the picture is our own drawing with no logo or official artwork; the colours stay navy, red and yellow.*

*Your own practice bests: the Leaderboard panel also shows your best race time and best lap per track from single races, kept in your browser (chosen by Francisco on 11 Nov 2026 as the first step). These times can be faked, so they are never sent to the server and never count for the shared leaderboards described in section 6. Since 12 Nov 2026 the shared leaderboards exist, next to them in the same panel, fed only by races the server ran.*

## 5. Multiplayer

- [DECIDED] We run our own game server; no third-party realtime service. The server runs every race and decides the results, so scores cannot be faked from the browser.
- [PROPOSED] Rooms:
  - A room has a 4-letter code and up to 4 humans.
  - The host chooses the mode and the track or difficulty, and starts the race when everyone is ready.
  - Computer karts fill the empty seats.
- *10 Nov 2026: a first version of the items below is built as an "Online test" page: one room for everyone on the test track, up to 8 players, no race start. It follows the proposals under "During the race" (keys only, 60 steps and 20 updates a second, gliding). Rooms with codes, a host, computer karts, items and disconnect handling beyond removing the kart are not built.*
- *11 Nov 2026: the one room now has a race start. The host presses Enter, and the server counts 3, 2, 1, GO! for everyone together. Decision made by the agent, please confirm: the host is whoever has been in the room longest, and passes to the next longest when they leave (this matches "if the host leaves before the start, the next player becomes host" below). Decided by Pedro: someone who joins during a race watches it and joins at the next start. Rooms with codes, a "ready" step, a finishing order and results are still not built.*
- [PROPOSED] During the race:
  - The browser sends only which keys are pressed.
  - The server runs the shared rules for all karts 60 times per second and sends everyone an update 20 times per second.
  - Browsers glide the other karts smoothly between updates.
  - Stretch goal, "prediction": your own kart reacts instantly in your browser and is corrected by the server.
- [PROPOSED] Items: the browser sends "use item", and the server checks that you actually have one before applying it.
- [PROPOSED] Disconnects:
  - A computer driver takes over the kart of a player who drops out. If they come back within 30 seconds, they get it back.
  - If the host leaves before the start, the next player becomes host.
  - Nobody can join a cup that is already in progress.
- Rejected actions to test:
  - a wrong code
  - a full room
  - joining after the start
  - anyone but the host starting the race
  - using an item you don't have
  - sending too many messages per second

  Each connection controls exactly one kart.
- *12 Nov 2026: there is now one online room for each track, instead of one room on the test track: `online.html?track=campus-loop` is the room of the campus loop. The server also keeps the finishing order of a race (two karts that cross the line in the same step share a position) and uses it to save results, see section 6. Decision made by the agent, please confirm: one fixed room per track is a step towards rooms with codes, not a replacement for them. A results screen that shows everyone's position is still not built.*
- *12 Nov 2026, at Catarina's request: karts now bump into each other instead of passing through (equal weight for now; the rule already takes a weight for each kart, for heavy and light characters later). A browser may send one more thing, the colours of its kart, as three small whole numbers that the server checks and passes on to the other players.*
- *13 Nov 2026, at Catarina's request: **[DECIDED]** a race that has begun is driven to its end. The host can no longer start a new race in the middle of one (pressing Enter by accident used to throw the race away). The host can start the next race only when the race is over.*
- *Decisions made by the agent on 13 Nov 2026, please confirm: so that a race always ends, it has two time limits. (1) Once the first racer has finished, the others have one minute left. (2) No race lasts longer than ten minutes after GO. A racer who has not finished by then gets no result, and nothing is saved for them. Both numbers are at the top of `server/room.js` and easy to change. The other options were: no limit (one racer who walks away holds the room for ever), or letting the host end a race early with a second key (more to explain, and the same accident could happen again).*
- [PROPOSED] Practice mode runs entirely in the browser. It works even when the server is down, never counts for leaderboards, and is our backup for the demo.
- **[OPEN, decide around 13 Nov]** Fallback if live online races are not stable in time: ghost racing (racing against recorded runs of other players).

## 6. Accounts and data

- [DECIDED] Accounts exist to save progress and for leaderboards.
- *12 Nov 2026, built by Catarina: a first version of accounts and of the shared leaderboard. What is built follows the proposals below: sign up with a user name and a password, sign in, sign out, the session cookie, the wait after 5 wrong passwords, deleting your own account, and for each track the top 10 race times and top 10 laps plus your own rank. Results are written only by the server, when a signed-in player finishes an online race that began with the countdown. The tables are `players`, `sessions` and `race_results`.*
- *Decisions made by the agent on 12 Nov 2026, please confirm:*
  - *There is no email yet. An account is a user name and a password. So nothing is verified, and a forgotten password cannot be reset: that account can no longer be used. Email needs an outside service and a new secret key, which the team has not chosen yet. Everything below about email, verifying and "forgot password" is not built.*
  - *Guests can drive in online races. Only the results of signed-in players are saved. (The proposal below says online races need an account.)*
  - *Every saved result has the mode "online", because single race against the server and the cup do not exist yet.*
  - *On top of the wait after 5 wrong passwords, the server limits how many sign-up and sign-in tries it accepts per minute, from one computer and in total, so a flood of tries cannot slow the races down.*
- *Not built: progress (trophies, unlocked characters, last character chosen), a profile page, and the cup leaderboard.*
- [PROPOSED] Sign-up:
  - Username: 3 to 16 letters, numbers or underscores, and unique.
  - Email: one account per email, never shown publicly.
  - Password: at least 8 characters.
- [PROPOSED] Email is used to verify the account and to reset passwords. **[OPEN]** The team asked whether email improves security, and the recommendation was yes; confirm. Unverified accounts can log in and race against computer karts, but can't race online or appear on leaderboards.
- [DECIDED] Passwords are stored scrambled (hashed with the `scrypt` function built into Node.js), so nobody can read them, not even us.
- [PROPOSED] Login:
  - A successful login gives a session cookie: random, expires after 7 days, and unreadable by the page's scripts.
  - After 5 wrong passwords, the player has to wait 10 minutes.
  - Logging out ends the session, and resetting the password logs the player out everywhere.
- [PROPOSED] Forgot password:
  - The site always shows the same message: "If an account exists for this email, we sent a link."
  - The link is random, works only once, expires after 30 minutes, and is stored scrambled.
  - At most 3 reset emails per hour.
  - When a password changes, the player gets an email telling them.
- [PROPOSED] Guests can play practice mode only. Online races need an account. **[OPEN]** Confirm.
- [PROPOSED] What is stored:
  - **Players:** username, email, scrambled password, verified yes/no, date joined
  - **Sessions:** who is logged in, and until when
  - **Progress:** trophies per difficulty, unlocked characters, last character chosen
  - **Race results:** track, mode (single race or cup), total time, best lap, finishing position, date
- [PROPOSED] Who can do what:
  - You can see your own progress.
  - Nobody can change progress or results directly. Only the server does, after a race.
  - Leaderboards are public but show only usernames and times.
  - You can delete your own account and its data, but no one else's.
- [PROPOSED] Leaderboards:
  - For each track: top 10 race times and top 10 laps, plus your own rank. Every server-run race counts, whether single race or cup.
  - For the cup: best total time at each difficulty.
  - Practice mode never counts.
- Rejected actions to test:
  - a username or email that's already taken
  - a badly formatted email
  - a short password
  - a wrong password
  - logging in while locked out
  - reading another player's progress
  - an expired session
  - a reused or expired reset link
  - an unverified account joining an online race
  - too many reset requests
  - submitting a result directly

## 7. Technical setup [PROPOSED unless marked]

```
Browser (game screen, menus, keyboard)
   |  live two-way connection (WebSocket)
Our server (Node.js, JavaScript), hosted on Render
   - sends the game files to the browser
   - accounts and logins
   - race rooms; runs every race with the shared rules file
   |
Database (Postgres), hosted on Neon: players, sessions, progress, race results
Email service: Brevo (verification and password-reset emails)
```

- One language for the whole project: JavaScript.
- **[DECIDED 11 Nov 2026 by Francisco; teammates confirm by approving the pull request]** Drawing: plain HTML canvas, no Phaser. *History: the first recommendation was Phaser for drawing only. On 10 Nov the base was built with plain canvas, as the agent's choice of the simplest option that is easy to undo. On 11 Nov Francisco chose to stay with canvas: switching would cost days of the 12 left, the tilted view behind the kart is our own code either way, it keeps us at three libraries, and every drawing line stays ours to explain. How the game looks will come from artwork (kart pictures, ground textures) and a few simple effects drawn in `client/draw.js`.*
- The database is reached with the `pg` library (*added 10 Nov 2026, version 8.23.1, with Catarina's OK*). **[OPEN]** Whether to switch to Neon's own library. On the university's student Wi-Fi, `pg` cannot reach the database from a laptop, because that network blocks the channel databases normally use. Neon's library uses the normal web channel and would work there, but ties the code to Neon. The live server is not affected either way.
- The live connection uses the `ws` library (*added 10 Nov 2026, version 8.22.2, with Catarina's OK*). Password scrambling uses Node's built-in `scrypt`, so no extra library.
- Tests use Vitest and run automatically on every pull request (GitHub Actions). `main` is protected: changes need a pull request, 1 approval and passing tests.
- Hosting is Render's free web service, which redeploys automatically from `main`. The database is Neon's free plan. Do NOT use Render's free database: it expires 30 days after creation, which would be around presentation time.
- Known limits, which belong in the walkthrough notes:
  - Render's free servers sleep after 15 minutes without traffic and take about a minute to wake. Open the link before the demo.
  - Render can restart a free server at any time. A race in progress is lost, but accounts and results are safe in Neon.
  - Render's free servers can't use the normal email ports, so email goes through Brevo's web API. Brevo's free plan sends up to 300 emails a day. The sender address must be verified by email, emails may land in spam, and the Brevo key is a secret.
  - Neon's free plan gives 0.5 GB of storage per project. The database pauses after 5 minutes of inactivity and wakes on the next request.
  - Lag: other karts are shown slightly in the past, and your own kart reacts only after the round trip to the server, unless we add prediction.
- Secrets (`DATABASE_URL`, `BREVO_API_KEY`, a session secret) go in `.env` locally (ignored by git) and in Render's environment settings. Never in code, issues, chat or screenshots.

## 8. The base: the first milestone (target Friday 13 Nov, Saturday 14 at the latest)

The base is done when:

1. **Repository files:** the folder structure, a README skeleton with the required fields, a draft `AGENTS.md` for the team to approve (start from the course's suggested rules), a `CLAUDE.md` pointing to it, a `.gitignore` that covers `.env` before any secret exists, and `.env.example`.
2. **Server:** a small server running on Render sends a page to the browser, and automatic deployment from `main` works.
3. **Database:** Neon is connected, with the connection string only in `.env` and Render's settings, and one simple table proves it works.
4. **Rules file:** the shared rules file has a first version of the driving physics for one placeholder character, with tests.
5. **Test track:** one simple track, not the campus yet, where one kart drives with the arrow keys, bounces off walls, and has a lap counter and a finish time.
6. **Two-laptop test:** two browsers on different networks connect to our server and see each other's kart move.
7. **Protection:** tests run automatically on every pull request, and `main` is protected.
8. **Everyone has practised:** every member has merged one small reviewed pull request (for example, adding their name to the README).

Not in the base: accounts, email, items, computer karts, campus tracks, character selection, cup, leaderboards.

Explain the base to us as you build it. By the end, each of us should be able to say where the server, the rules file, the tests and the database connection live, and what each one does.

## 9. Walkthrough notes

Keep a `WALKTHROUGH.md` file up to date as you build, in plain language. It should answer the questions staff are likely to ask:

- Where is data stored, and what exactly is stored?
- What do the tests cover, and what do they miss? (For example, multiplayer timing is tested by hand, following a written two-laptop checklist.)
- What happens if the server restarts, the database pauses, or the email service is down?
- Why did we build it this way (our own server, our own physics, the server deciding results)?
- What are the known limits, and what would we change next?

[DECIDED 10 Nov 2026] Also keep `docs/build-diary.md` up to date: a dated diary, in plain language, of what was done, why, and how to check it, so any member can ask questions about it later.

## 10. Roadmap after the base [PROPOSED; owners OPEN]

| Owner | Area |
|---|---|
| 1 | Accounts, email, security, database (owns the database tables) |
| 2 | Driving physics, characters, items (owns the rules file) |
| 3 | Campus tracks, computer karts |
| 4 | Game server and multiplayer: rooms, syncing character selection, cup flow |

- **Sat 14 to Tue 17:** one complete track from start to finish: single race against computer karts, accounts, saved result, leaderboard, and an online race.
- **Wed 18 to Fri 20:** all tracks, the cup, all characters and items, email.
- **Sat 21 to Sun 22:** no new features. Handle invalid input everywhere, test on the public link with 4 laptops, rehearse the demo and the walkthrough, finish the README.
- **Mon 23:** submit during the day. After the deadline, no more pushes to `main`.

Priority rule: one complete, working track beats five unfinished ones.

## 11. The 5-minute demo [PROPOSED]

| Time | What happens |
|---|---|
| 0:00–0:30 | Log in and show the main menu |
| 0:30–1:15 | Create an online room. Teammates join, and one of them tries to pick a character that's already taken and sees "Already taken" |
| 1:15–2:45 | One 1-lap race on the campus track: drifting, items, a trip onto the grass, the minimap |
| 2:45–3:30 | Results, then the track leaderboard with the new time on it |
| 3:30–4:15 | Profile screen with the trophies from a cup the demo account played the day before |
| 4:15–5:00 | Buffer |

Before the demo:
- Wake the server 10 minutes early.
- Test online racing on the classroom Wi-Fi.
- Have the demo accounts verified and fully unlocked.
- Backup plan: practice mode, still live.

## 12. Team

| Name | Student number | GitHub username | Owns |
|---|---|---|---|
| Catarina Almeida | 70573 | catarinaalmeida44 | [OPEN] |
| Francisco Fonseca (Fran) | 72576 | FranFon15 | [OPEN] |
| Pedro Collares Pereira | 71022 | pedrocollarespereira | [OPEN] |
| Rodrigo Simeão Versos | _to add_ | rodrigosversos | Campus tracks (reported 11 Nov 2026; computer karts not yet confirmed) |
