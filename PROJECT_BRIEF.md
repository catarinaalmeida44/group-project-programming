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
- **[DROPPED date]**: the team decided not to do this. It stays visible, with the date, so the history is clear. Do not build it.

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
- [OPEN] Game title, art style, item names and theme.
- [DECIDED 17 Nov 2026 by Pedro] The first six characters, each a real person who said yes: Dean (black and white), Professor Ricardo Pereira (orange and blue), Ró Versos (pink and yellow), Cici Boss (blue and pink), FranFon (all black), PCP (red and yellow). Their faces are shown only in the menu, when choosing, never in the race. Choosing a character replaces choosing the kart colours one by one (Catarina chose this, option A, through Pedro).
- **[DECIDED 18 Nov 2026 by Catarina; teammates confirm by approving the pull request]** When choosing a character, only the pilots are shown, each with the person's own head: the photos beside them are gone. Her own character, Cici Boss, dances the "gangnam" instead of the wave, and her head is cut from her whole photo, with her long hair. *Decisions made by the agent, please confirm: the new design of the panel (a poster of the chosen one, the six in a line-up under it); each character's number is their place in the cast; the names of the dances ("Signature move"); the photo files stay in `client/faces/`, unused, because tests of 17 November check them, until the team says whether to delete them; "wave" stays in the list of dances, danced by nobody.*
- **[DECIDED 18 Nov 2026 by Catarina]** A big screen in the far corner of the Hovione Atrium on the Nova lap shows a notice from the IT help desk: "We regret to inform you that, unfortunately, Moodle is down." A joke for everybody at Nova. *Decisions made by the agent, please confirm: its size (about 13 by 4 metres, under the gallery), its colours, the words "IT HELP DESK", "SERVICE NOTICE" and "Your IT Help Desk team" round her sentence, and that the six squares behind it are wall.*
- *18 Nov 2026, on top of Pedro's podium (pull request 28, not merged yet), asked for by Catarina: the students round the podium wave, jump or clap, one in three each, instead of all waving.*
- *18 Nov 2026: Catarina tried the podium of the Nova lap inside the Hovione Atrium, and after looking at it put it back on the lawn in front of the school's name, where Pedro decided. His decision stands and his tests are as he wrote them.* **[DECIDED 18 Nov 2026 by Catarina]** The podium is "more exaggerated": 80 students instead of 28, spread wide, and the camera comes in to the podium when it comes up. *Decisions made by the agent, please confirm: 80 students and where they stand, a camera that starts four times further away and takes 2.8 seconds, drivers shown about a sixth bigger, more confetti.*
- **[DECIDED 18 Nov 2026 by Catarina]** New dances: Ró Versos the griddy (he asked her for it), Dean the floss, Professor Ricardo Pereira the dab (her choice, after an hour of a disco point that the agent had picked), and the gangnam of Cici Boss jumps on every beat. Dean's helmet is green instead of white ("a pop of green"). The Moodle screen is white with black letters. On the poster of "Choose your character" the colours are not listed, the "Signature move" is, and moving the mouse over a driver shows them on the poster. *Decisions made by the agent, please confirm: the floss for Dean (she asked for a "better" dance and left it open), and that the green is the helmet.*

### Modes

- **[DECIDED 17 Nov 2026 by the team, reported by Francisco]** The game has only two modes: **Single race** (practice, in the browser) and **Online**. There is no Cup mode, no cup points and no difficulty levels. We prefer one good race to several mediocre ones. The items below that this replaces are marked [DROPPED 17 Nov 2026] and kept for the record.
- **[DROPPED 17 Nov 2026]** (was [DECIDED]) Two modes: **Single race** (choose one track) and **Cup** (several tracks in a row, with points). There is no boss level.
- **[DROPPED 17 Nov 2026]** (was [DECIDED 11 Nov 2026 by the team, reported by Francisco]) The cup has 3 tracks, not 5: more doable in the time left.
- **[DROPPED 17 Nov 2026]** (was [PROPOSED]) Cup = all the tracks, 3 laps each. Points per finishing position: 10 / 7 / 5 / 3 / 2 / 1. Ties go to the better finish in the last race. You keep the same character for the whole cup.
- **[DROPPED 17 Nov 2026]** (was [PROPOSED]) The cup can be played at three difficulties (Easy, Normal, Hard), set by how well the computer karts drive.
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

  *17 Nov 2026, at Catarina's request: a new track, the **Nova lap** (`shared/tracks/nova-lap.js`). The team filmed the lap it wants on campus (nine minutes of walking: the entrance avenue, through the Hovione Atrium, the terrace, under the library, the promenade, the stairs, past the beach tunnel, the coast road, the west street), because the campus loop, made from a map, was not recognisable. The agent went through the film picture by picture. Built so far is the base she asked for: the ground and the buildings. Benches, lamps, trees along the way and tables come later. How it is built is in `WALKTHROUGH.md`, "What is the Nova lap".*

  *Decisions made by the agent on 17 Nov 2026, please confirm:*
  - *The campus loop stays in the list of tracks for now, untouched, with its tests. Catarina said the new track replaces it. Taking it out means deleting Rodrigo's track and its tests, which is for the team, and Rodrigo, to say.*
  - *3 metres a square instead of 6, so buildings are twice as big beside a kart. A lap is about 690 metres. The simple robot of the tests needs about 25 seconds for one, the computer karts about 29.*
  - *The coast road runs straight along the bottom of the map, although the real one runs at a slant, so that walls follow the squares. The halls and lawns were placed to fit.*
  - *The names on the walls are the names on the real walls, sponsors included, drawn as letters by our code. The school's name on the entrance is drawn with lines, not taken from a logo file. The banner on the entrance has our own words ("We race the times"), because the real one is an advertisement. Say if a name should go.*
  - *A sunny afternoon, although the film was shot on a grey day.*
  - *A page for the team that flies the camera round a track: `track-tour.html?track=nova-lap`. It is not linked from the menu.*

  *17 Nov 2026, evening, after Catarina drove it: the beach tunnel was rebuilt, the Moon Café got its sign and tables, the atrium got black letters in the middle and tables, the avenue its trees and benches, and cars now drive along the two roads beside the track (a picture only, see `WALKTHROUGH.md`). Decisions made by the agent, please confirm: tables, letters, trees and benches stand on squares that karts cannot cross; the coffee cup on the café's sign is our own drawing.*

  ***[DECIDED 17 Nov 2026 by Catarina]** How the Nova lap is made more fun. Built the same evening:*
  - ***Walkers.** Students walk across the terrace and the promenade, each from one door to another and back. The doors are the ones in the film: the café, the library's sliding doors, the entrance of the main building, the glass entrance opposite. A kart that drives into one loses most of its speed, and the student sits down on the ground, seeing stars, for about two seconds, then gets up and walks on. "In a fun way and not in a grotesque way." **Changed the same night, after she played it:** losing speed alone was hardly a delay, so the kart now also spins out, exactly as on a banana.*
  - ***Ramps.** On the two long straights. A kart that drives over one the right way, fast enough, jumps and gets extra speed for a moment. She asked that nobody can get them all by driving straight on: the first ramp of each straight is where everybody drives, the others are in the outer lanes.*
  - ***Things in the way.** Parked bikes, recycling bins and cones on the straights, the grey benches on the promenade.*
  - *The café is called MON CAFFE. The statue of the woman with the surfboard is bigger. No jump at the stairs: they go down.*
  - *She wants one pull request with everything, not several.*

  *Decisions made by the agent on 17 Nov 2026, please confirm: all the numbers of the two rules (how long a jump lasts, how much faster, how fast a student walks, how long they sit: they are named at the top of `shared/ramps.js` and `shared/walkers.js`); a kart in the air cannot steer, flies over bananas and students, but is still stopped by a wall or a parked bike; a student who is inside a building or already sitting cannot be bumped; a kart that only creeps into a student does not topple them; the computer karts try to steer round students as they do round bananas; a jump has a rising "whoop" and a toppled student a silly two-note sound; a kart that has finished can still jump; the students keep walking after a race is over, until the next start.*

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
  - **[DROPPED 17 Nov 2026]** Three difficulty levels.
  - Mild catch-up: slightly faster when far behind, slightly slower when far ahead.
- *17 Nov 2026, built by Rodrigo: computer karts in a single race. Five of them: the characters the player did not choose. Each character drives with its own "personality" (PCP Daredevil, Dean Steady, Professor Ricardo Pereira Careful, Cici Boss Hunter, FranFon Smooth, Ró Versos Calm). They decide with utility AI, as our professor suggested: they score each thing they could do (follow the racing line, brake, overtake, dodge a banana, back away from a wall) and do the most useful one, pressing the same four keys a player has. They follow the racing line the arrows use. Not built: computer karts online, items, catch-up. Decisions made by the agent, please confirm: five computer karts with the player starting at the back of the grid; which personality each character has; without a chosen character, the first five of the cast; the same driver stats as the player; the race is over for the player when they finish.*
- *18 Nov 2026, built by Rodrigo: computer karts online, as Rodrigo asked: when the host starts an online race, the characters nobody in the room is become computer karts, up to 6 karts in all (Rodrigo's choice: one for each character). The host can switch them off with a tick box while no race is on (Rodrigo's choice). Their results are never saved. Also each computer kart now drives each race in a "mood of the day", its personality's numbers moved a little, so races are not all alike (Rodrigo's choice, after he saw them repeat). A room takes up to 6 people (Catarina, 19 Nov), so computer karts fill only the places people leave free. Decisions made by the agent, please confirm: the switch starts on in every room; computer karts leave before each start, when no person is racing, or if one would become the host; how far a mood may move each number (daring and care 0.15, pace 0.03, 10 units aside).*

- *19 Nov 2026, built by Rodrigo: full screen on both race pages, as Rodrigo asked: a button above the track and the F key; the picture is enlarged and keeps its shape (Rodrigo's choice, rather than drawing it sharper, which would have meant changing the drawing code). Files that are Catarina's changed: race.html, online.html, style.css, keyboard.js, main.js, online.js; she is asked to review.*

- *19 Nov 2026, built by Rodrigo, **[PROPOSED]**: Easy / Normal / Hard for the computer karts, in a single race only (three buttons above the track). This reverses the team's 17 Nov decision "no difficulty levels", so the pull request asks the team to accept or close it. Online stays Normal. Decisions made by the agent, please confirm: the buttons on the race page rather than in the menu; how much each level moves the numbers; the browser remembers the level.*

- **[DECIDED 19 Nov 2026 by Catarina, the team confirms by approving the pull request]** A "Two players" mode: two people on one computer, on a split screen, one with W A S D and one with the arrow keys, each choosing a character in the menu. Four computer karts fill the race (six karts). "For now these races should not count for the stats or the leaderboard." This is new scope, added four days before the deadline. **[DECIDED 20 Nov 2026 by Catarina, after trying it]** Player 1, the first to choose a character, drives with the arrow keys, and player 2 with W A S D. Each driver's half is on the side where their keys are on the keyboard, so player 2 (W A S D) has the left half and player 1 (the arrows) the right half (the agent's choice, confirmed by Catarina the same day: "Yes, keep it"). *Decisions made by the agent, please confirm: each half shows the middle 72% of its picture, with a name plate under it; the race ends when every kart has finished, 30 seconds after both players have, two minutes after the first kart, or ten minutes after GO; each driver hears their own kart; the tile is called "Two players".*
- **[DECIDED 19 Nov 2026 by Catarina]** "Game settings" before every race, the same on the three race pages: computer karts on or off (on fills the race to six), and their level, Easy, Normal or Hard. The default is on and Normal. Rodrigo's three level buttons above the single race moved onto this card; the level now also counts online and for two players. *Decisions made by the agent, please confirm: the card comes up on the race page, after the character was chosen in the menu (only the server knows who the host is, and that is known once you are in the room); a single race with computer karts off is not counted in "My stats".*

- *19 Nov 2026, built by Rodrigo: on the Nova lap the race view now shows Carcavelos beach and the sea past the coast road, out to the horizon (only a picture: no rule changed). Rodrigo asked for a Google Earth scan; the agent used neither Google imagery (its terms forbid copying it into a product) nor OpenStreetMap (its services refused automatic requests), so the beach width is a guess, about 55 m. Catarina's files changed: ground.js, nova-lap-look.js; she is asked to review.*

- *20 Nov 2026, built by Rodrigo: **music** for the menus (and an online room before a race), the race (faster on the final lap), the finish (a fanfare) and the podium; a click for buttons in the menus and race pages; a **hype sound** when the character choice is done (online: when everyone in the room has a character); and in Settings > Sound four switches: All sound (also M during a race), Music, Race sounds, Menu sounds. Everything made by our own code, with tunes composed for the game: no music files and no Nintendo music, as decided. Decisions made by the agent, please confirm: the music is made in code (Rodrigo did not answer that question; it is the only way that keeps the team's two decisions); the four songs, their speeds and loudness; no music in the countdown; the menu waits about a second for the hype before going to the race; online the hype needs two or more people; M is now the All sound switch (it was the race sounds); Catarina's sound.js, settings-panel.js, index.html, menu.js, main.js, double.js and online.js changed: she is asked to review and to listen on sound-test.html.*

### Characters and the selection menu

- [PROPOSED] 8 original characters: 6 available from the start (2 light, 2 medium, 2 heavy) and 2 to unlock. *Changed on 12 Nov 2026 at Catarina's request (teammates confirm by approving the pull request that contains this change): the characters will be based on real people, not only on campus "types" as first proposed. Before a real person's name or face goes into the game or into this repository, which anyone on the internet can read, that person has to have said yes. Still no Nintendo characters, names or images.*
- *12 Nov 2026: a first step towards characters is built. Every kart is one 3D model with a driver, and a player can choose the colour of the kart, the helmet and the suit in the menu ("Your kart"). Other players see those colours online. There are no characters with different shapes or different driving yet: everyone still drives the placeholder driver. Decision made by the agent, please confirm: two players may choose the same colours (the rule below about one character per player is about characters, which do not exist yet).*
- [DECIDED] Each character can be used by only one player per race. No duplicates.
- [DECIDED] All characters are available in the demo.
- **[OPEN since 17 Nov 2026]** (was [PROPOSED]) Normal players unlock characters 7 and 8 by winning the cup on Normal and on Hard. Demo accounts get everything unlocked through their saved progress, never through a "demo mode" switch or a special address, which would be a security hole. **Why this is open again:** the cup and its Normal and Hard levels were dropped on 17 Nov 2026, so there is no cup to win and this way of unlocking cannot work. The team has to choose: another way to unlock (for example winning an online race, or a number of finished races), or no unlocking at all, which was already the alternative. Until then, nothing is locked.
- [PROPOSED] What the menu shows:
  - a grid of portraits, with locked characters shown as silhouettes with a padlock and their unlock condition *(only if unlocking is kept: [OPEN] again since 17 Nov 2026, see above)*
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
  - **[DROPPED 17 Nov 2026]** changing character in the middle of a cup
  - a computer kart getting a character a human picked

### Menu flow [PROPOSED]

1. Title screen: log in, sign up, or practice as a guest
2. Main menu: Single race / Cup / Online / Leaderboards / Profile *(Cup dropped 17 Nov 2026)*
3. Online: create a room (choose the mode, the track or difficulty, and the number of laps) or join one with a code, then the lobby *(choosing a mode or a difficulty dropped 17 Nov 2026: there is only one online mode and no difficulty)*
4. Character selection
5. Track selection (single race) or difficulty selection (cup) *(difficulty selection and the cup dropped 17 Nov 2026)*
6. Countdown, race, results. In a cup, a standings screen follows, then the next track. *(the cup's standings screen and next track dropped 17 Nov 2026)*
7. Back to the main menu

*11 Nov 2026, built by Francisco: a first main menu is the first page of the game: Single race (the test track), Cup (shown greyed out until the tracks exist), Online (the online test page), Leaderboard and a Settings button in the top right corner. There is no title screen, login or Profile yet, because there are no accounts. Ideas from Francisco for later, not decided by the team: a character selection page before the race with a Start button, 2 computer karts to begin with, and the game itself driving in the background of the menu ("attract mode") instead of a video.*

*12 Nov 2026, at Catarina's request: the menu has a new design, a drawn picture of the campus by the sea behind four big choices, and it now has what was missing: a "Choose a track" panel for Single race and for Online, the shared leaderboard of section 6 in the Leaderboard panel, and an account corner with Sign in, Create account and Your account. There is still no title screen and no Profile page. Decisions made by the agent, please confirm: Single race and Online open the track panel instead of going straight to their pages; the picture is our own drawing with no logo or official artwork; the colours stay navy, red and yellow.*

*Your own practice bests: the Leaderboard panel also shows your best race time and best lap per track from single races, kept in your browser (chosen by Francisco on 11 Nov 2026 as the first step). These times can be faked, so they are never sent to the server and never count for the shared leaderboards described in section 6. Since 12 Nov 2026 the shared leaderboards exist, next to them in the same panel, fed only by races the server ran.*

## 5. Multiplayer

- [DECIDED] We run our own game server; no third-party realtime service. The server runs every race and decides the results, so scores cannot be faked from the browser.
- [PROPOSED] Rooms:
  - A room has a 4-letter code and up to 4 humans.
  - The host chooses the mode and the track or difficulty, and starts the race when everyone is ready. *(choosing a mode or a difficulty dropped 17 Nov 2026)*
  - Computer karts fill the empty seats.
- *10 Nov 2026: a first version of the items below is built as an "Online test" page: one room for everyone on the test track, up to 8 players, no race start. It follows the proposals under "During the race" (keys only, 60 steps and 20 updates a second, gliding). Rooms with codes, a host, computer karts, items and disconnect handling beyond removing the kart are not built.*
- *11 Nov 2026: the one room now has a race start. The host presses Enter, and the server counts 3, 2, 1, GO! for everyone together. Decision made by the agent, please confirm: the host is whoever has been in the room longest, and passes to the next longest when they leave (this matches "if the host leaves before the start, the next player becomes host" below). Decided by Pedro: someone who joins during a race watches it and joins at the next start. Rooms with codes, a "ready" step, a finishing order and results are still not built.*
- [PROPOSED] During the race:
  - The browser sends only which keys are pressed.
  - The server runs the shared rules for all karts 60 times per second and sends everyone an update 20 times per second.
  - Browsers glide the other karts smoothly between updates.
  - Stretch goal, "prediction": your own kart reacts instantly in your browser and is corrected by the server.
  - **[DECIDED 19 Nov 2026 by Catarina]** To shorten the lag online without prediction: the server sends an update 30 times per second (not 20), and the browser shows the race less far in the past on a steady connection (4 steps instead of always 6, and up to 6 again when updates arrive unevenly). This takes about a fifth off the wait between a key press and the picture. Prediction stays a stretch goal: it is the real fix and was offered, not started.
  - **[DECIDED 19 Nov 2026 by Catarina]** A small connection meter on the online page, shown with the L key and hidden until then ("make sure this doesn't reduce the interface experience for a player"). It says whether a slow race is the connection or the computer.
- [PROPOSED] Items: the browser sends "use item", and the server checks that you actually have one before applying it.
- [PROPOSED] Disconnects:
  - A computer driver takes over the kart of a player who drops out. If they come back within 30 seconds, they get it back.
  - If the host leaves before the start, the next player becomes host.
  - **[DROPPED 17 Nov 2026]** Nobody can join a cup that is already in progress.
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
- *13 Nov 2026, evening, decided by Catarina: **[DECIDED]** once the first racer has finished, the others have two minutes left (she asked for three, or two if three was too long; a whole race takes one to two and a half minutes, so two it is). When the race is over, a results board comes up over the track: the winner on top, then everyone else in the order of arrival, and the karts that ran out of time by who was closest to the finish.*
- *19 Nov 2026, decided by Catarina: **[DECIDED]** (1) A signed-in player has one kart in a room: joining it again from another tab or computer sends the older connection away. Two browsers used by a guest are two karts, and that is accepted. (2) The host is the player who has been in the room longest and is at their keyboard: one who is inactive passes the room to the next player in the order they arrived. (3) Someone who arrives during a race is told in big letters on the picture that they are watching, and sees the kart that was in first place when they arrived. Decisions made by the agent, please confirm: "inactive" is a minute without a key; having just arrived, having finished the race that just ended, and (for the host) a newcomer walking in count as being there; of two connections of one player the newer one stays; the camera stays with its kart until that kart finishes.*
- *19 Nov 2026, afternoon, decided by Catarina: **[DECIDED]** (1) A room takes six players, one for each character (it was eight; the live server and her laptop were measured with six and did not slow down). (2) On the podium, when four or more karts raced, the driver on the last line of the results, finished or not, stands beside the podium and cries while everyone else cheers. Only that one driver; with three or fewer nobody cries; the same in a single race and online; it may be any character, the Dean and the professor included. (3) A job on GitHub visits the live server every five minutes so that it stays awake (`.github/workflows/keep-awake.yml`).*
- *19 Nov 2026, night, decided by Catarina: **[DECIDED]** (1) The host of an online room has "Game settings": at most how many people the room takes, from 2 to 6; whether computer karts fill the race to six karts; and how good they are. The first person in the room gets them as a card titled "Start online game", with "You are the host" on top, and can open them again between races. (2) The limit can be raised or lowered, but never below the people who are already in the room: nobody is thrown out. (3) Someone who arrives during a race watches a person, never a computer kart, and can move the camera to another person. (4) They pick their character in the menu as before and get it at the next start if no person has it. Decisions made by the agent, please confirm: the limit counts people only, and computer karts still fill the race to six; there is one room per track, so a limit of 2 keeps everyone else out until someone leaves, and the settings go back to the defaults when the room is empty; a signed-in player who is already in a full room is let back in, a guest is not; the left and right arrows move a watcher's camera.*
- *20 Nov 2026, decided by Catarina: **[DECIDED]** A driver who has finished while others are still driving no longer looks at their own kart standing still: their camera moves to one of the others, "like it would if you were watching a race you are currently not in". Preferably a person, and a computer kart only when no person is still driving; preferably the kart in last place at that moment. On the screen: that they finished, that they are waiting until every player finishes, and whom they are watching. The same in a single race, with two players and online. The podium at the end is the same in the three kinds of race (checked on the Nova lap, the only track that stays). Decisions made by the agent, please confirm: the camera stays with that kart until it finishes and then moves on by the same rule; the words are a banner across the top of the picture, so the middle stays free; online the left and right arrows move the camera to another person, as for a watcher, and the banner also carries the time left.*
- *Decisions made by the agent on 13 Nov 2026, please confirm: so that a race always ends, it has two time limits. (1) Once the first racer has finished, the others have a fixed time left (one minute at first, two minutes since the evening, see above). (2) No race lasts longer than ten minutes after GO. A racer who has not finished by then gets no result, and nothing is saved for them. Both numbers are at the top of `server/room.js` and easy to change. The other options were: no limit (one racer who walks away holds the room for ever), or letting the host end a race early with a second key (more to explain, and the same accident could happen again).*
- *15 Nov 2026, decided by Catarina:*
  - *Sound is built: engine, tyres, bumps, the banana slip, the countdown, lap and finish, all made by our own code with no sound files (`client/sound.js`). She listened and asked for changes twice. Music during a race may come later.*
  - ***[OPEN]** Checkpoints against short cuts. She does not like that the checkpoints forbid short cuts. The team will discuss this when the campus map is redone. Until then nothing changes: the yellow light and the "missed a checkpoint" warning stay as they are. (An earlier warning, at the moment of driving past, was offered and put off for the same reason.)*
  - *The camera that goes through walls: to be looked at when the map is final, not before.*
  - *Not for now: a one-lap race for the demo, and touch controls for phones.*
  - *Characters and the race track are the big pieces. The team wants to think about them as ideas first, in the week of 16 Nov, before anything is built.*
- [PROPOSED] Practice mode runs entirely in the browser. It works even when the server is down, never counts for leaderboards, and is our backup for the demo.
- **[OPEN, decide around 13 Nov]** Fallback if live online races are not stable in time: ghost racing (racing against recorded runs of other players).

## 6. Accounts and data

- [DECIDED] Accounts exist to save progress and for leaderboards.
- *12 Nov 2026, built by Catarina: a first version of accounts and of the shared leaderboard. What is built follows the proposals below: sign up with a user name and a password, sign in, sign out, the session cookie, the wait after 5 wrong passwords, deleting your own account, and for each track the top 10 race times and top 10 laps plus your own rank. Results are written only by the server, when a signed-in player finishes an online race that began with the countdown. The tables are `players`, `sessions` and `race_results`.*
- *Decisions made by the agent on 12 Nov 2026, please confirm:*
  - *There is no email yet. An account is a user name and a password. So nothing is verified, and a forgotten password cannot be reset: that account can no longer be used. Email needs an outside service and a new secret key, which the team has not chosen yet. Everything below about email, verifying and "forgot password" is not built.*
  - *Guests can drive in online races. Only the results of signed-in players are saved. (The proposal below says online races need an account.)*
  - *Every saved result has the mode "online", because single race against the server and the cup do not exist yet. (Since 19 Nov 2026 there is a second mode, "single": see below.)*
  - *On top of the wait after 5 wrong passwords, the server limits how many sign-up and sign-in tries it accepts per minute, from one computer and in total, so a flood of tries cannot slow the races down.*
- *13 Nov 2026, at Catarina's request: a signed-in player can change their password in the menu ("Your account"). The server asks for the current password again, and signs the player out on every other device afterwards. "Forgot password" is still not built: it needs email (below), which is still **[OPEN]**. Without email there is no safe way to prove who is asking for a new password.*
- *15 Nov 2026, decided by Catarina: **no email**. Email and "forgot password" were built that day on the branch `email-reset` (pull request 18) and on purpose not merged. Email needs an account at an email service and a sender address of ours that players see, and she does not want that. Accounts stay a user name and a password. A forgotten password means a lost account, which the sign-up form says. Email was never what makes an account safe: it only helps someone who forgot their password. The work stays on its branch in case the team changes its mind. A recovery code shown once at sign-up (no email needed) was offered as another way and not chosen.*
- *Not built: progress (trophies, unlocked characters, last character chosen), a profile page, and the cup leaderboard. (Trophies and the cup leaderboard were dropped on 17 Nov 2026 with the cup. The profile page was built on 19 Nov 2026 as "My stats", next line.)*
- **[DECIDED 19 Nov 2026 by Catarina]** A signed-in player has their own stats, at the top of "Your account" (their name in the menu): most played character, races, wins, podiums, the three best race times and the best lap, for the Nova lap only, "because that is the one that will be in the final version". Changing the password and deleting the account are at the bottom of the same panel. A button downloads the player's results as a file for a spreadsheet (the course lists "reports and exports").
- **[DECIDED 19 Nov 2026 by Catarina]** Single races count in those stats too. They are reported by the player's own browser, which the server cannot check, so they are saved apart ("single") and **never** count for the shared leaderboard: that stays fed only by races the server ran.
- **[DECIDED 19 Nov 2026 by Catarina]** The results screen offers the next step with one click: "Race again" and "Back to menu" on the podium of a single race, "Start next race" (host only) and "Back to menu" on the online results board.
- **[DECIDED 19 Nov 2026 by Catarina]** A win against Easy computer karts counts in "My stats" like a win on Normal or Hard, with "a little thing on the side" that says which: each best time carries the label "on Easy", "on Normal" or "on Hard" (the names Rodrigo gave the levels), or "Online", and one line says where the wins come from.
- *Decisions made by the agent on 19 Nov 2026, please confirm:*
  - *The results table `race_results` got two new columns, `character` and `level`. Nobody owns the database tables yet (see `AGENTS.md`), so the whole team should know. The server adds them by itself at its next start; races saved before have neither, so "most played character" counts from 19 Nov 2026.*
  - *What makes a reported single race believable: a real track, whole numbers, a best lap that fits into the race, a place from 1st to 6th, a character of the cast, no faster than all laps at twice top speed, and not sooner after the last one than the race itself took.*
  - *The file is a ".csv" with commas, written in UTF-8, and has the races on every track, not only the Nova lap.*
  - *"Your account" became a wide panel. On a low screen the list of the online results board scrolls so that its buttons stay in view, and its winner is drawn smaller.*
- [PROPOSED] Sign-up:
  - Username: 3 to 16 letters, numbers or underscores, and unique.
  - Email: one account per email, never shown publicly.
  - Password: at least 8 characters. *19 Nov 2026, decided by Catarina: **[DECIDED]** and not the same as the user name, whatever the capital letters. Asked when a password is chosen, not at sign-in, so older accounts still open.*
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
  - **Progress:** trophies per difficulty, unlocked characters, last character chosen *(trophies per difficulty dropped 17 Nov 2026; unlocked characters depends on the [OPEN] unlocking question in section 4)*
  - **Race results:** track, mode (single race or cup), total time, best lap, finishing position, date *(cup dropped 17 Nov 2026)*
- [PROPOSED] Who can do what:
  - You can see your own progress.
  - Nobody can change progress or results directly. Only the server does, after a race.
  - Leaderboards are public but show only usernames and times.
  - You can delete your own account and its data, but no one else's.
- [PROPOSED] Leaderboards:
  - For each track: top 10 race times and top 10 laps, plus your own rank. Every server-run race counts, whether single race or cup. *(cup dropped 17 Nov 2026)*
  - **[DROPPED 17 Nov 2026]** For the cup: best total time at each difficulty.
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

Not in the base: accounts, email, items, computer karts, campus tracks, character selection, cup, leaderboards. *(The cup was dropped altogether on 17 Nov 2026.)*

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
| 4 | Game server and multiplayer: rooms, syncing character selection, cup flow *(cup flow dropped 17 Nov 2026)* |

- **Sat 14 to Tue 17:** one complete track from start to finish: single race against computer karts, accounts, saved result, leaderboard, and an online race.
- **Wed 18 to Fri 20:** all tracks, the cup, all characters and items, email. *(The cup was dropped on 17 Nov 2026, and email on 15 Nov 2026.)*
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
| 3:30–4:15 | **[DROPPED 17 Nov 2026]** Profile screen with the trophies from a cup the demo account played the day before. *This slot is free: the team decides what to show instead.* |
| 4:15–5:00 | Buffer |

Before the demo:
- Wake the server 10 minutes early.
- Test online racing on the classroom Wi-Fi.
- Have the demo accounts verified and fully unlocked. *(Unlocking is [OPEN] again since 17 Nov 2026, see section 4.)*
- Backup plan: practice mode, still live.

## 12. Team

| Name | Student number | GitHub username | Owns |
|---|---|---|---|
| Catarina Almeida | 70573 | catarinaalmeida44 | [OPEN] |
| Francisco Fonseca (Fran) | 72576 | FranFon15 | [OPEN] |
| Pedro Collares Pereira | 71022 | pedrocollarespereira | [OPEN] |
| Rodrigo Simeão Versos | 72677 | rodrigosversos | Campus tracks (reported 11 Nov 2026); computer karts (single race 17 Nov 2026, online 18 Nov 2026, to be confirmed by the team) |
