# Fran's diary

Francisco Fonseca (Fran, GitHub FranFon15). Entries from 11 November 2026 on, newest at the top. How to write one is in `README.md` in this folder.

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

**How to check it yourself**
Open `README.md` on GitHub and look at the team table. Search `PROJECT_BRIEF.md` for "DECIDED 11 Nov". Run `npm test`.

**What comes next**
- Francisco chooses his area with the team (section 7 of `docs/team-guide.md`).
- Run the two-laptop checklist once more on two different connections (one laptop on a phone hotspot) and write the result of each check in it.
- Pedro's branch `countdown-start` also changes the team tables. Whichever pull request is merged second will need the two rows combined by hand.
