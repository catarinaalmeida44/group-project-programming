# Catarina's diary

Entries from 11 November 2026 on, newest at the top. How to write one is in `README.md` in this folder.

Everything built on 10 November is in `docs/build-diary.md`.

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
