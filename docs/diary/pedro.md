# Pedro's diary

Entries from 10 November 2026 on, newest at the top. How to write one is in `README.md` in this folder.

### 17 November 2026: six characters, chosen by face

**What was done**
The menu button "Your kart" is now "Your character". It shows six faces with names: Dean, Professor Ricardo Pereira, Ró Versos, Cici Boss, FranFon and PCP. Clicking one chooses it, and the small kart turns round in that character's colours. In a single race and online, your kart has those colours. The faces are only in the menu: in the race the driver wears a helmet. Online, two players in a room cannot be the same character. The second one gets the first free character, and the page tells them: "Someone in this room is already PCP, so you are Dean."

| File | What it is for |
|---|---|
| `shared/cast.js` (new) | The six characters: id, name and kart colours |
| `client/faces/` (new) | One face picture per character, 256 by 256 pixels, about 10 KB each |
| `client/cast-choice.js` (new) | Remembers your character in the browser, finds its face and colours, and writes the sentence the online page shows |
| `client/kart-panel.js`, `client/index.html`, `client/style.css` | The "Your character" panel: a grid of faces instead of rows of colours |
| `client/main.js`, `client/online.js` | The single race and the online page use the character's colours. Online, the page tells the server which character you chose |
| `server/cast-keeper.js` (new) | Who in a room is which character: one player per character, the first free one if yours is taken, freed when a player leaves, no change during a race |
| `server/messages.js`, `server/online.js` | A browser may say one more thing, `{"type":"character","id":"pcp"}`. Only the exact id of a character gets through |
| `server/app.js` | The server may now send `.jpg` pictures (the faces) |
| `tests/cast.test.js`, `tests/room-characters.test.js` (new) | 24 and 29 tests. No existing test was changed |
| `WALKTHROUGH.md`, `PROJECT_BRIEF.md`, the READMEs, `docs/team-guide.md`, `docs/two-laptop-checklist.md` | Kept true. The checklist has seven new checks (76 to 82) |

**Why it was done this way**
- A character is a name, a face and a choice of colours of the kind the game already had (three small numbers). So the drawing of karts did not change at all, and the server already knew how to pass colours on to the other players.
- The faces were cut from the photos with the image tools that come with Windows, so no new library was needed. Only the pixels were copied: nothing hidden in a phone photo (where or when it was taken) is in the pictures. The Professor's picture shows only his face, nothing of the Outlook screen it was taken from.
- The rule "one player per character" was first put in `server/room.js`. An existing test (`room-bananas.test.js`) checks the exact list of things the room can do, so that nothing new can touch the bananas, and it failed. The test was not changed. The rule went into its own file, `server/cast-keeper.js`, instead: characters have nothing to do with driving anyway.
- A test checks that `client/faces/` holds exactly one picture per character and nothing else, so no photo can sit on the internet without being used.

**Decisions**
- Decided by Pedro: six characters, their names and colours, faces only in the menu. A normal photo, not a video.
- Decided by Pedro: all six people said yes to being in the game and in the public repository, before their photos went in (Pedro collected the yeses).
- Decided by Catarina, through Pedro: option A. Choosing a character replaces choosing the kart colours one by one.
- Decision made by the agent, please confirm: the name is written "Professor Ricardo Pereira" (Pedro wrote "Profesor").
- Decision made by the agent, please confirm: Dean has a black kart, a white helmet and a white suit; Professor Ricardo Pereira an orange kart, a blue helmet and a navy suit; Ró Versos a pink kart with a yellow helmet and suit; Cici Boss a blue kart, a pink helmet and a navy suit (there is no pink suit); FranFon all black; PCP a red kart, a yellow helmet and a red suit.
- Decision made by the agent, please confirm: a room still takes eight players, but there are six characters. A seventh and eighth player drive a plain kart in the colours of their place on the grid.
- Decision made by the agent, please confirm: a player who has not chosen a character keeps the kart colours they chose before (or the colours of their place), as before.
- Decision made by the agent, please confirm: a character cannot be changed during the countdown or the race. Someone who is watching can, and races with it next time.
- Git: the agent made the branch `characters` from an up-to-date `main` and made the commits. Nothing was pushed.

**What was checked, and what was not**
- `npm test`: 1358 passed, 5 skipped (before: 1309 and 5).
- The new rules were broken on purpose in six ways (two players with one character, a free character given during a race, a racer allowed to change during a race, a character not freed when its player leaves, a character's colours overwritten, any text accepted as a character). Each made between 1 and 3 tests fail. The code was then put back.
- In the app's built-in browser: the panel shows the six faces, choosing PCP turns the small kart red with a yellow helmet and says "Saved". On the online page, the first tab was told "You are PCP." A second tab (same browser, so also PCP) was told "Someone in this room is already PCP, so you are Dean." and its kart was black and white. No errors on the page.
- NOT checked: a single race driven with a character, by eye. The tests check the colours.
- NOT checked: two real laptops and the live site. Checks 76 to 82 in `docs/two-laptop-checklist.md` are for that.
- NOT checked: how the faces look on a phone or a small screen.

**How to check it yourself**
Run `npm start`, open http://localhost:3000, click "Your character" and pick one. Then open "Online" in two windows. Both windows share one saved choice, so the second is given another character. Run `npm test` and look for `cast.test.js` and `room-characters.test.js`.

**What comes next**
- Pedro tells the team, and Catarina in particular, that "Your kart" is now "Your character".
- Publish the branch from GitHub Desktop, open the pull request, a teammate approves.
- Next piece: the podium with faces at the end of an online race.

### 11 November 2026: a race start for online play

**What was done**
Online play now has a real race start. Before a race everyone drives around freely, as before. The host presses Enter: every kart goes back to the grid, the server counts 3, 2, 1, GO! for everyone together, and all karts are let go on the same step. Someone who opens the page during a race watches it and joins at the next start. (The countdown from 10 November was merged as pull request #9 and is live.)

| File | What it is for |
|---|---|
| `server/room.js` | The room now has four phases: open, countdown, racing, finished. It knows who the host is, starts a race, refuses R during a race, and keeps the karts of people who are watching off the track |
| `server/messages.js` | A browser may now send a third kind of message: "start" |
| `server/online.js` | Passes "start" to the room |
| `client/race-view.js` (new) | Turns what the server says about the race into words for the page: the big number, who may press Enter, racing or watching |
| `client/online.js`, `client/online.html` | The online page shows all that, sends "start" on Enter for the host, and follows the kart in front when watching |
| `client/keyboard.js` | Listens for Enter |
| `client/net.js` | A kart that was put back on the grid is shown there at once, instead of sliding across the track |
| `tests/room-race.test.js`, `tests/race-view.test.js` (new) | 36 and 23 tests |
| `tests/online.test.js`, `tests/net.test.js` | 6 and 4 tests added at the end. No existing test was changed |
| `WALKTHROUGH.md`, `README.md`, `PROJECT_BRIEF.md`, the READMEs in `client/`, `server/` and `tests/`, `docs/two-laptop-checklist.md` | Kept true. The checklist has ten new checks for the race start |

**Why it was done this way**
- The room starts "open" and behaves exactly as before until the host starts a race. That is why every one of the older tests still passes untouched.
- The server counts the countdown, in steps, with the same `countdownAt` rule as practice. The browser only shows the number it is told. So nobody can start early by changing their page, and every clock starts on the same step.
- The server works out who the host is from the connection a message came on. A message cannot claim to be the host.
- The karts of people who are watching are left out of what the server sends, and their numbers are listed separately as "watching". The page needs nothing more to know it should follow someone else's kart.

**Decisions**
- Decided by Pedro: one shared race start (not a private countdown per player), and someone who joins during a race watches, from above or following a player.
- Decision made by the agent, please confirm: the host is whoever has been in the room longest, and only the host can start. Pedro was asked and did not answer this one.
- Decision made by the agent, please confirm: the key is Enter.
- Decision made by the agent, please confirm: the host can also start a new race while one is on (not during the countdown). Otherwise one player who walks away from their laptop would block the room for ever.
- Decision made by the agent, please confirm: a start from someone who is not the host is ignored, and that browser is not disconnected.
- Decision made by the agent, please confirm: a watcher's camera follows the kart with the most laps, and V switches to the whole track. The watcher cannot choose which kart to follow.
- Decision made by the agent, please confirm: if every racer leaves, the room goes back to free driving.
- Git: the agent made the branch `online-race-start` from an up-to-date `main` and made the commits. Nothing was pushed.

**What was checked, and what was not**
- `npm test`: 403 passed, 5 skipped (before: 334 and 5).
- The room's race rules were broken on purpose in eight ways. Seven made between 1 and 6 tests fail. The eighth (moving the hidden karts of people who are watching) made no test fail, and changes nothing anyone can see, because those karts are put back on the grid before they are shown.
- In the app's built-in browser, two tabs on Pedro's laptop: Enter from the tab that was not the host did nothing. Enter from the host started the countdown, a big "3" appeared, and afterwards both karts showed the same clock. A tab reloaded during the race had no kart, followed the other kart, was told it was watching, and V showed the whole track.
- Found while checking, and fixed: at a race start a kart could be seen sliding from where it was back to the grid. `client/net.js` now shows it on the grid at once, with tests.
- NOT checked: the whole countdown at full speed with a person's eyes. The built-in browser only redraws now and then, so 2, 1 and GO! were not seen on screen, only "3". The tests cover what the page says at each moment.
- NOT checked: a race driven by hand to the finish, and the messages after the finish.
- NOT checked: two real laptops on two internet connections, and the live server. Checks 15 to 24 in `docs/two-laptop-checklist.md` are for that.

**How to check it yourself**
Run `npm start` and open http://localhost:3000/online.html in two browser windows side by side. The first window is the host. Press Enter there. Open a third window during the race to see the watching view. Run `npm test`.

**What comes next**
- Pedro tries it in two windows and confirms the decisions above.
- Publish the branch from GitHub Desktop, open the pull request, a teammate approves.
- After the merge: run checks 15 to 24 of the two-laptop checklist with teammates on the live site.
- Next piece, asked for by Pedro: a boost for pressing the gas exactly at GO. It needs a new driving rule in `shared/physics.js`.
- Later: a finishing order and a results screen.

### 10 November 2026: a 3, 2, 1, GO! countdown before the practice race

**What was done**
The practice race now begins with a countdown. The first press of an arrow key shows 3, 2, 1, GO! in the middle of the track, one second each. During 3, 2 and 1 the keys do nothing, the kart stands still and the clock stays at zero. At GO the clock starts and the kart can be driven. R resets everything, and the next key press counts down again.

Before this, Pedro's laptop was set up: the project copy was brought up to date from GitHub and Node.js 26.13.0 was installed.

| File | What it is for |
|---|---|
| `shared/countdown.js` (new) | The rule. `countdownAt(steps)` says what to show ("3", "2", "1", "GO!" or nothing) and whether the race has begun. `stepCountdownRace` moves a race forward one step: before GO it leaves the racer exactly as it was, from GO on it calls the normal `stepRacer` |
| `tests/countdown.test.js` (new) | 23 tests for the rule |
| `client/main.js` | The practice race uses the rule instead of "the clock starts at the first key press" |
| `client/style.css` | The countdown is shown as one big number, without the dark box of the other messages |
| `client/keyboard.js` | One comment corrected. No change in behaviour |
| `WALKTHROUGH.md`, `shared/README.md`, `tests/README.md` | Kept true |

**Why it was done this way**
- The countdown is counted in steps of the game (60 per second, so 60 steps for each number), like the race time. The same number of steps always gives the same answer on every computer, and the server can reuse the rule when online races get a start.
- The rule lives in `shared/`, not in the browser code, so that "the kart cannot move before GO" can be tested without a browser.
- The racer is handed back untouched during the countdown. That way the race after GO is exactly the race there was before this change, and a test proves it.

**Decisions**
- Practice only, not online. Chosen by Pedro. Online needs a race start on the server first, which is a bigger piece of work.
- Decision made by the agent, please confirm: the countdown starts at the first press of an arrow key, as the clock did before. The other option was to start it by itself when the page opens or R is pressed. The agent recommended the key press, so nobody misses the start while the page loads. Pedro was asked and answered only the first question.
- Decision made by the agent, please confirm: each number lasts one second, "GO!" stays on screen for one second after the race has begun, and from GO the clock runs even if no key is held (before, the clock waited for a key).
- Git: the agent made the branch `countdown-start` from an up-to-date `main` and made the commits, at Pedro's request. Nothing was pushed.

**What was checked, and what was not**
- `npm test`: 334 passed, 5 skipped (before: 311 and 5). The 5 skipped need the real database.
- The rule was broken on purpose in four ways (racing during the countdown, moving the racer during the countdown, counting from 2, accepting a step count below zero). Each made between 1 and 8 tests fail. The rule was then restored.
- In the app's built-in browser, on Pedro's laptop: after an arrow key the page showed 3, 2, 1, GO! in order, the kart's position and the clock did not change until GO, the kart then drove, R brought back "Press an arrow key to start the countdown", holding left during the countdown did not turn the kart, and R with a key still held started a new countdown.
- NOT checked: how it looks and feels in a normal browser at full speed. The built-in browser redraws slowly. Pedro should look himself.
- NOT checked: a whole three-lap race to the finish message after this change. The automatic tests still drive three laps with the unchanged rules, but nobody drove them by hand.
- NOT checked: the live server. Nothing was pushed or merged.

**How to check it yourself**
Run `npm start`, open http://localhost:3000 in a normal browser and press an arrow key. Hold the gas during the countdown: the kart must not move before GO. Press R and try again. Run `npm test` and look for `countdown.test.js`.

**What comes next**
- Pedro tries it in a normal browser and confirms the two decisions above.
- Done on the same branch: Pedro's full name and student number are in the team tables in `README.md` and `PROJECT_BRIEF.md`, as the course requires.
- The agent's push was refused, because git was not signed in to GitHub from the agent's side. Pedro publishes the branch from GitHub Desktop, opens the pull request, and a teammate approves.
- Later: use the same rule for a real online race start.
