# Pedro's diary

Entries from 10 November 2026 on, newest at the top. How to write one is in `README.md` in this folder.

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
