# Start here

For Fran, Pedro and Rodrigo, and for the coding agent each of you works with (Claude Code, Codex or another). Written on 10 November 2026, after the first day of building on Catarina's laptop.

It tells you where the project stands, what you need on your laptop, and how to work so that four people's work fits together at the end.

## 1. Where the project stands

The game is online at https://novasbe-kart.onrender.com

| What | State |
|---|---|
| Driving one kart round a test track in the browser, with laps and a clock | Works |
| Three camera views, switched with V | Works |
| "Online test" page: up to eight browsers see each other's karts | Works. Tried with three players on three laptops |
| Automatic tests | About 300. GitHub runs them on every pull request |
| The server on the internet | Works. It updates itself a few minutes after every merge into `main` |
| The database | Works. The server saves one row each time it starts, and remembers it after a restart. See section 8 for a catch on the university Wi-Fi |
| Accounts, campus tracks, characters, items, computer karts, cup, leaderboards | Not started. This is the work ahead |

The full story of how each part was built, and why, is in `docs/build-diary.md`. The answers to likely staff questions are in `WALKTHROUGH.md`.

## 2. What you need

| Thing | Who needs it | Notes |
|---|---|---|
| A GitHub account | Everyone | You have one. Catarina has to add you as a collaborator on the repository |
| GitHub Desktop | Everyone | To get the project onto your laptop |
| Node.js version 26 | Everyone | Free, from nodejs.org. Take the "LTS" download. It runs the game and the tests |
| A coding agent | Everyone who builds | Claude Code, Codex or another. It reads our rules by itself (section 4) |
| VS Code | Recommended | For reading files. Do not edit project files in Windows Notepad: it damaged the README once |
| A Render account | Nobody but Catarina | Render keeps the server online and follows `main` by itself |
| A Neon account | Nobody but Catarina | Neon keeps the database. The game runs on your laptop without it |

You do not need any password, key or secret to work on the game.

## 3. First time on your laptop

1. Install Node.js 26 and restart your laptop, or at least the apps you had open.
2. In GitHub Desktop: File, Clone repository, and pick `catarinaalmeida44/group-project-programming`.
3. Open a terminal in the project folder and run `npm install`. It downloads the libraries the project uses.
4. Run `npm test`. The last lines should say that about 300 tests passed and 5 were skipped.
5. Run `npm start` and open http://localhost:3000 in a browser. Drive with the arrow keys. Press Ctrl+C in the terminal to stop.

**Your first pull request:** put your full name and student number in your row of the table in `README.md`. The course requires both, and it requires that every member has code in the repository from their own account. It is also a safe way to try the whole route once: branch, change, commit, push, pull request, a teammate approves, merge.

## 4. Starting your coding agent

Our rules for agents are in `AGENTS.md`. Claude Code reads them by itself, through `CLAUDE.md`. Other agents usually read `AGENTS.md` directly.

For your first session, paste this, with your own name:

> I am Fran, one of four students building this kart racing game. I am a programming beginner. Before doing anything, read AGENTS.md, PROJECT_BRIEF.md, docs/team-guide.md and WALKTHROUGH.md completely, and the three newest entries in docs/build-diary.md. Then tell me in plain language where the project stands and what you understand my part to be. Do not write any code yet.

Good to know about working with an agent, from the first day:

- **It can do the git steps for you**, if you ask: branches, commits and sending to GitHub. The first time, it has to send from the app's Terminal panel, so that your browser can open GitHub's "Authorize" page. Sign in there yourself. Never give a password to the agent.
- **It cannot open a pull request or merge.** You click "Create pull request" on GitHub, and a teammate approves.
- **Ask it to check its own work.** On day one it broke its own code on purpose, 57 times, to see whether the tests would notice. They missed once, and that test was fixed.
- **Believe the live server over the tests.** One thing passed every test and still failed on the real server. Details are in the diary entry "First look at the live server".
- **Keep your answers to it short and say when you do not understand.** It will explain again more simply.

## 5. How we work

The full rules are in `AGENTS.md`. The short version:

1. **Start from an up-to-date `main`.** In GitHub Desktop: switch to `main`, Fetch, Pull. Then make a new branch for your piece of work.
2. **One branch for one piece of work.** Save each step as its own commit, with a message that says what it does.
3. **Run `npm test` before you ask for a pull request.** GitHub runs the tests again, and a pull request with failing tests should not be merged.
4. **A teammate approves every pull request.** Nobody merges their own without a review. GitHub enforces one approval.
5. **Merging puts it online.** A few minutes after a merge into `main`, the public link shows the new version. Anyone on the "Online test" page at that moment is disconnected and has to reload.
6. **New libraries need a yes first.** Say what it does, why we need it and what the alternative is. We have three so far: `vitest` (tests), `ws` (live connections), `pg` (database).
7. **No secrets anywhere.** Not in the repository, not in a chat with an agent, not in a screenshot.

## 6. Keeping memory, so everything fits together at the end

Four people and four agents will work on this at the same time. At the presentation, any of us can be asked about any part. So every piece of work leaves a written trace, and the traces are kept so that they cannot clash.

**Your own diary.** Each member's agent writes in that member's own file: `docs/diary/fran.md`, `docs/diary/pedro.md`, `docs/diary/rodrigo.md`, `docs/diary/catarina.md`. Because nobody else writes in your file, two diaries can never collide when branches are merged. How to write an entry is explained in `docs/diary/README.md`.

`docs/build-diary.md` is the diary of the first day. Read it for the history. From 11 November on, new entries go into the personal files.

**The shared notes.** Three files belong to everyone, and each of your pull requests should leave them true:

| File | Keep it true about |
|---|---|
| `WALKTHROUGH.md` | How your part works, what its tests cover and miss, and its known limits. Change only the sections about your part |
| `README.md` | The commands to run the app and the tests, and the team table |
| `PROJECT_BRIEF.md` | Decisions. When one changes, mark it [DECIDED] with the date and who decided |

If two pull requests change the same lines of a shared file, GitHub will say there is a conflict. The second person then brings `main` into their branch and keeps both changes. Your agent can do that with you. Ask it to explain what it kept.

**Decisions made by an agent.** When your agent chooses something that the brief leaves open, it must write "Decision made by the agent, please confirm" in your diary. Read those lines before you ask for a review, and tell your reviewer about them.

## 7. Who does what

The brief (section 10) proposes four areas. The owners are not decided yet. Fill this in together, in a pull request.

| Area | Owner | Shared file the owner looks after |
|---|---|---|
| Accounts, email, security, database | | The database tables |
| Driving physics, characters, items | | The rules in `shared/` |
| Campus tracks, computer karts | | The track files in `shared/tracks/` |
| Game server and multiplayer: rooms, character selection, cup | | `server/online.js` and `server/room.js` |

Ask the owner before changing a file they look after. That is the main way we avoid two people rewriting the same thing.

## 8. Things that will trip you up

- **The university Wi-Fi blocks the database.** On `students.novasbe.pt`, a laptop cannot reach our database: the connection opens and then nothing comes back. This was measured on 10 November: the same laptop, file and code failed on that Wi-Fi and worked on a phone hotspot. The game still runs, and it says "The database could not be reached". For database work, use a phone hotspot or your home Wi-Fi. The tests that use a pretend database run anywhere. The live server is not on that Wi-Fi and is not affected.
- **Only Catarina has the database address.** It is a secret and is not in the repository. If your part needs the real database on your laptop, ask her in person. Do not send it through a chat.
- **The free server sleeps.** After 15 minutes without visitors it takes about a minute to wake up. Open the link a few minutes before you show it to anyone.
- **Right after installing Node.js, `npm` may be "not found".** Close and reopen the app or terminal you are using.
- **An agent's own browser can be slow.** The built-in browser of the Claude app redraws about once a second when it is not on screen, so the game looks jerky there. Judge how the game feels in a normal browser.
- **Online, your own kart reacts a moment late.** That is known and written down. It is not a mistake in your code.
- **Karts are drawn with simple shapes, in four fixed pictures** (from behind, from the front, from each side). A turning kart snaps from one picture to the next. That is known. Real artwork would replace the shapes.

## 9. Where everything is

The table "Where things are" in `README.md` lists every folder and file. Each of the folders `client/`, `server/`, `shared/` and `tests/` also has a short `README.md` of its own that says what each file in it does.

## 10. What to ask Catarina for

- To be added as a collaborator on the GitHub repository.
- To look at Render's log when the live server misbehaves. Only her account can see it.
- The database address, in person, if your part needs the real database on your laptop.
