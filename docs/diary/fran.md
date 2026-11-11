# Fran's diary

Francisco Fonseca (Fran, GitHub FranFon15). Entries from 11 November 2026 on, newest at the top. How to write one is in `README.md` in this folder.

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
- **Not checked:** driving a whole race to the finish on the new page, to see "New best time!" and the time appear in the Leaderboard. The rules behind it are tested, but nobody has driven three laps through it yet.
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
