# Rodrigo's diary

Rodrigo Simeão Versos (GitHub rodrigosversos). Entries from 11 November 2026 on, newest at the top. How to write one is in `README.md` in this folder.

### 11 November 2026: buildings that stand up

**What was done**
In the view behind the kart, the buildings of the campus loop now stand up, as tall as their storeys, with shaded sides and flat roofs. A kart driving behind a building disappears behind it. Only the picture changed: the driving rules are the same, and the test oval and the online page still have flat walls. Branch `rodrigo-building-heights`, which starts from `rodrigo-campus-loop`, so it can only be merged after that one.

| File | What changed |
|---|---|
| `shared/tracks/campus-loop-storeys.js` | New. One digit per square of the campus loop: how many storeys tall it is (0 is flat) |
| `shared/tracks/index.js` | `storeysOf(track)`: the storeys of a track, or none |
| `client/buildings.js` | New. Turns storeys into sides and roofs, and works out which can be seen from behind the kart, and where on the screen |
| `client/draw.js` | Paints the sides and roofs with the other karts, furthest first. Our own kart is now painted last, so nothing covers it |
| `client/main.js` | Gives the painter the buildings of the chosen track |
| `tests/buildings.test.js` | New. 16 tests |
| `WALKTHROUGH.md`, `PROJECT_BRIEF.md`, `client/README.md`, `shared/README.md`, `tests/README.md` | Kept true |

**Why it was done this way**
- **No new library.** The karts already stand up in this view, using the camera arithmetic in `client/camera.js`. The buildings use the same arithmetic, so they line up with the karts and the ground, and every line can be explained.
- **Height only in the picture.** The rules (`shared/`) run on the server too, which draws nothing. Keeping the storeys out of the rules means nothing about driving or laps changed.
- **The storeys.** I asked for the storey counts from OpenStreetMap, but OpenStreetMap has none for the campus (no `building:levels` or `height` on any campus building). So they come from the school's campus map, which lists what is on each floor of each building. A building counts the floors from 0 up on which something of it is listed: Cascais Academic Hall 3, CTT Student Hall 2, Santander Academic Hall 3, Ming C. Hsu Executive Hall 3, Grand Auditorium 3, gym and Horizon Hall 3, Library 2, main building (Hovione Atrium, KPMG Gallery) 3, Milestone residence 3.
- **Furthest first.** Painting from far to near (the painter's way) is simple and enough for blocks. Each side and roof is one square (6 metres), so pieces are small and the order is mostly right.

**Decisions**
- Mine: the buildings stand up; their heights come from storey counts.
- Decision made by the agent, please confirm: the storeys above, from the school's campus map, as a first guess for me to check on campus; 3.5 metres a storey; buildings with no count get 2 storeys; the edge of the campus stays flat; light grey sides with a different shade per direction and darker roofs; our own kart always painted on top.
- Decision made by the agent, please confirm, and tell the owner: `client/draw.js` (the drawing) and `client/main.js` changed again. Neither has an owner yet.

**What was checked, and what was not**
- `npm test`: 473 passed, 5 skipped (16 new tests).
- `client/buildings.js` was broken on purpose in five ways: sides facing away shown, sides drawn downwards, nothing cut at the bottom of the screen, storeys allowed on road, a side on every edge. Four made tests fail at once. The third did not: the test for the bottom of the screen allowed too much. It was tightened (nothing may be drawn below the screen at all), and then it failed as it should, for the sides and for the roofs.
- One of the new tests was wrong at first (it looked for the side between two blocks at the wrong place). The test was fixed, not the code.
- In a Chrome browser without a screen: the buildings stand up along the Walk of Founders and the east side, roofs and sides are painted in the right order there, the test oval is still flat, and there were no errors. Pictures per second in the view behind the kart: about 30 on the campus loop, as before the buildings, and 60 on the test oval.
- **Not checked:** a person driving past the buildings, on a real laptop; how it looks in the courtyards and round the Auditorium (my test drives did not get there); whether the storeys are right.
- **Not handled:** buildings far ahead show at the top right, where the small map can cover them; no windows, glass or sloping roofs; where two pieces are about as far away, the wrong one can end up on top for a moment.

**How to check it yourself**
Run `npm start`, open http://localhost:3000/race.html?track=campus-loop and stay in the first view (behind the kart). The Milestone residence should stand on your left at the start and the main building on your right. Drive round the loop and look at the halls round the CTT hairpin and the Grand Auditorium. Open http://localhost:3000/race.html: the test oval should look as before.

**What comes next**
- Check the storeys on campus and tell me which are wrong. Each is one digit per square.
- The team: confirm the decisions above. This branch can only be merged after `rodrigo-campus-loop`.
- If it feels slow on a real laptop: paint only the part of the track that is on screen.

### 11 November 2026: the campus loop, the first campus track

**What was done**
My area is the maps: the race tracks, taken from the Nova SBE campus and its building. The first one is built: the **campus loop**, a loop round the outside of the campus, made from OpenStreetMap. It can be driven on the single race page at `race.html?track=campus-loop`. It is not in the menu yet. Branch `rodrigo-campus-loop`.

| File | What changed |
|---|---|
| `shared/tracks/campus-loop.js` | New. The campus loop: 64 by 62 squares of 6 metres, a start, a finish line and five checkpoints |
| `shared/tracks/index.js` | New. The list of all tracks, each with a short name for addresses (`test-oval`, `campus-loop`) |
| `client/track-choice.js` | New. Reads the track from the address of the race page. Anything that is not on the list gives the test oval |
| `client/main.js` | Uses the chosen track instead of always the test oval, and writes its name on the page |
| `client/race.html` | "A race on the test track" now shows the name of the chosen track |
| `client/draw.js` | The small map in the corner is never bigger than 180 pixels. On the campus loop it covered much of the screen |
| `tests/campus-loop.test.js` | New. 8 tests |
| `tests/track-choice.test.js` | New. 12 tests |
| `README.md`, `PROJECT_BRIEF.md`, `WALKTHROUGH.md`, `docs/team-guide.md`, `shared/README.md`, `client/README.md`, `tests/README.md` | Kept true: the campus loop, my area, my name in the team tables, the tests |

The route, driven clockwise as it looks on the map: east along the Walk of Founders, south past the Library and Navigator Park, round the gym to EDP Plaza, round the southern tip of the Grand Auditorium, north-west along the outer path, up the western gardens, a hairpin through the two courtyards on either side of the CTT Student Hall, and back to the Walk of Founders. About 1.1 km along the driving line.

**Why it was done this way**
- **Where the layout comes from.** We looked for plans first. The school's online campus map (campustour.novasbe.pt) has a drawing of every floor, but it is drawn at a slant: its walls meet at about 123° instead of 90°, and it belongs to the school. No floor plans of the building are published. The architects (Vítor Carvalho Araújo and António Barreiros Ferreira) have only published pictures, not plans, and pictures taken at an angle cannot be measured. OpenStreetMap draws the campus from straight above, in metres, and anyone may reuse it with the credit "© OpenStreetMap contributors", which is already in the README.
- **How the letters were made.** A short script, run in the Claude app's browser, took the OpenStreetMap data of the campus, turned it 21° so the buildings run along the squares, and gave every 6-metre square a letter: buildings and outside the campus are wall, gardens are grass, paths and squares are road. Then the road along the driving line was widened to about 4 squares, the start and the checkpoints were placed, and the whole thing was checked. The script is not in the repository yet.
- **Why 6 metres a square, and not smaller.** The game paints the whole track once as a hidden picture, at 2 pixels per unit. At 6 metres a square that picture is already 4096 by 3968 pixels (about 65 MB). Smaller squares would make the campus too big to paint.
- **Why the roads are so wide.** A road has to be about 4 squares wide for several karts side by side. At 6 metres a square that is 24 metres, much wider than the real paths. Where the widened road met a building or the edge of the campus, the road won.
- **Why the detours.** The first draft had a 15-second lap, which I found far too short. I asked for 30 to 40 seconds and chose two detours: round the Grand Auditorium, and a hairpin round the CTT Student Hall. Away from the driving line there is open ground, so a kart can skip a detour. It gains nothing: each detour has a checkpoint, and a lap only counts if the kart went through every checkpoint in order.
- **Why the track is chosen in the address.** It needs no change to the menu, which Fran built. A choice of track in the menu can come next, with Fran.

**Decisions**
- Mine: my area is the maps, taken from the Nova SBE building. Inside the building would be the ideal; outside is fine too. Indoor maps keep the building's real proportions, and the karts are miniatures, instead of making the corridors wider. Laps of 30 to 40 seconds. The two detours: the Grand Auditorium and a courtyard between the halls.
- Decision made by the agent, please confirm: OpenStreetMap instead of the school's drawing; the map turned 21° (north is not up, the sea is towards the bottom left); 6 metres a square and roads about 4 squares wide; the Hovione Atrium and the KPMG Gallery are walls here (they are for an indoor track); paths and squares away from the driving line stay road; the CTT Student Hall is shorter than it really is, because the hairpin cuts through its end; 3 laps.
- Decision made by the agent, please confirm, and tell the owner: `client/main.js` and `client/race.html` (the race page, built by Fran) changed so the page can show another track; `client/draw.js` (the drawing) changed so the small map in the corner stays small. Neither has an owner yet.
- **Question for the team:** a lap still takes about 20 seconds for the test kart, not 30 to 40. The reason is speed: at this scale a kart drives at about 200 km/h. I propose making all karts about 40% slower. That is a change to the numbers at the top of `shared/physics.js`, which belongs to whoever takes the driving physics, and it also makes laps of the test oval longer. Not done; for the team to decide.
- Not decided: whether computer karts are part of my area (the team guide puts them with campus tracks).

**What was checked, and what was not**
- `npm test`: 457 passed, 5 skipped (20 new tests). Run with Node.js 26.13.0 on the agent's computer, not on my laptop.
- The campus loop was broken on purpose, one way at a time, and every time at least one test failed. First version: a checkpoint too short to reach the wall, a doorway cut through the KPMG Gallery, the start pointing the wrong way, the start on the finish line, a wall across the road. After the detours: each detour's checkpoint removed, and the CTT checkpoint too short. The track choice was broken in three ways (a weaker name check, the campus loop missing from the list, another default track), and tests failed each time.
- The first version had a test that no shortcut existed at all. The detours put open campus ground beside the driving line on purpose, so that test no longer fitted. It was replaced by two tests that drive a robot round the loop without each detour and check that no lap counts. A doorway through the KPMG Gallery is no longer caught by a test. It would not let a kart win anything, because a lap still needs every checkpoint in order (that rule has its own tests in `laps.test.js`).
- One of the new tests was wrong at first: its "skip the Auditorium" robot drove into the Auditorium's corner and got stuck. The robot's route was fixed, not the rule.
- In a Chrome browser without a screen, on the agent's computer: the page says "Campus loop", holding the gas drives the kart along the Walk of Founders, all three camera views draw the track, the small map now fits in the corner, and the test oval looks as before. `?track=moon` and `?track=__proto__` open the test oval. No errors, apart from the browser asking for a site icon that the project has never had.
- In that browser the view behind the kart ran at 30 pictures a second on the campus loop, against 60 on the test oval. The other two views ran at 60. That browser has no graphics card, so this needs checking on a real laptop. If it is slow there too, the drawing should copy only the part of the track that is on screen.
- **Not checked:** a person driving the campus loop; my own laptop (the project is not on it yet, so Node.js, `npm install`, `npm test` and `npm start` have not been run there); the live server (it changes only after the merge).
- **Not handled yet:** the menu has no way to choose the campus loop; the Leaderboard panel shows only the test oval, although best times on the campus loop are kept; the online page still uses the test oval. The OpenStreetMap data is from 11 November 2026 and may change.

**How to check it yourself**
Run `npm start` and open http://localhost:3000/race.html?track=campus-loop. The note under the track should say "A race on Campus loop". Drive clockwise from the start: east, then right down the east side, round the Auditorium, up the west side, into the courtyard below the CTT Student Hall, round its far end and out through the courtyard above it. Try skipping a detour: the lap counter should not move. Press V to see the other views, and check the small map stays in its corner. Then open http://localhost:3000/race.html: it should still be the test oval.

**What comes next**
- Get the project onto my laptop with GitHub Desktop, run the four checks, and add my student number to the README and the brief.
- The team: confirm the decisions above, and decide about slower karts.
- With Fran: a choice of track in the menu, and the campus loop in the Leaderboard panel.
- The indoor maps: photos of the evacuation plans, or a floor plan from Facilities & Services (Hovione Atrium, floor 2, room A203C). OpenStreetMap already has the outline of the Hovione Atrium (about 68 by 67 metres) and the KPMG Gallery.
