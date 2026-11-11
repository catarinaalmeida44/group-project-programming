# Pedro's diary

Entries from 10 November 2026 on, newest at the top. How to write one is in `README.md` in this folder.

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
