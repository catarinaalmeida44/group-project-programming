# Build diary

A dated record, in plain language, of what was done in this project, why, and how to check it. Anyone on the team can read it and ask questions about it later. The newest entry is at the top of the "Entries" section.

## The plan for the base

The base is the working foundation described in section 8 of `PROJECT_BRIEF.md`. It is built in nine small steps. Each step is one pull request.

| Step | What it adds | State |
|---|---|---|
| 1 | Project skeleton: folders, README, rules for agents, example secrets file, these notes | Waiting for review |
| 2 | Automatic tests: one example test, and GitHub runs the tests on every pull request | Not started |
| 3 | A small server on Render that shows a "hello" page at a public link | Not started |
| 4 | Database: the server writes and reads one row in Neon | Not started |
| 5 | Driving rules, first version: one kart speeds up, brakes, steers, bounces off walls (tests only, no screen) | Not started |
| 6 | Test track and laps: a simple oval, and laps that only count if no checkpoint is skipped (tests only) | Not started |
| 7 | Drive in the browser: arrow keys, lap counter, finish time | Not started |
| 8 | First online connection: two browsers see each other's kart | Not started |
| 9 | Two-laptop checklist, run on two different networks | Not started |

Steps 3 and 4, step 5 and step 6 touch different files, so three people can build them at the same time once step 2 is merged.

## Words used in this diary

| Word | Meaning |
|---|---|
| Repository (repo) | The project folder with its whole history. One copy is on GitHub, one on each laptop |
| `main` | The official version of the project. This is the version that gets put online |
| Branch | A separate copy of the project where changes can be made without touching `main` |
| Commit | A saved snapshot of changes, with a short message saying what changed |
| Push | Send the commits from a laptop to GitHub |
| Pull request (PR) | A request to bring a branch's changes into `main`. A teammate reads it and approves it |
| Merge | Bring the changes of a pull request into `main` |
| Deploy | Put the app online at a public link |
| Library | Ready-made code written by other people that our project uses |
| Node.js | The program that runs JavaScript outside a browser. Our server and our tests need it |
| Agent | The AI coding assistant (Claude Code or Codex) that writes most of the code |

## Entries

### 10 November 2026: Step 1, project skeleton

Done on Catarina's laptop with Claude Code.

**What was done**

No game code yet. This step only prepares the project so that everything built later has a clear place and clear rules.

| File or folder | What it is for |
|---|---|
| `README.md` | Rewritten. It was broken by Notepad (the "Team" heading showed as plain text). It now has the fields the course requires: deployed link, team table, commands to run the app and the tests. The link and the commands are placeholders until they exist |
| `AGENTS.md` | The rules every coding agent must follow in this project, so all four of us get the same behaviour. It is a draft for the team to approve |
| `CLAUDE.md` | Two lines telling Claude Code to follow `AGENTS.md` |
| `.env.example` | A list of the secret settings the app will need, with fake values. The real values go in a file called `.env`, which git ignores |
| `client/`, `server/`, `shared/`, `tests/` | The four folders of the project. Each has a short note saying what will live there. Git does not keep empty folders, which is why each one has a note in it |
| `WALKTHROUGH.md` | Starter answers to the questions staff may ask. Most say "not built yet" for now |
| `docs/build-diary.md` | This diary |
| `PROJECT_BRIEF.md` | Three small updates: the team table, the git decision below, and a line about this diary |

**Why it was done this way**

- The course grades the README fields and forbids secrets in the repository, so both are set up before any code exists.
- The rules file comes first so that every later step, by any member's agent, follows the same rules.
- The course pages have no ready-made list of rules to copy. `AGENTS.md` is built from section 2 of our brief and from the advice in the course guides "Coding agents" and "Working as a team".

**Decisions**

- Decided by Catarina on 10 November: the agent may do the git steps itself (create a branch, commit, push), as long as it explains each step and writes it down here. The agent never merges into `main`. Teammates confirm this by approving the pull request.
- Decision made by the agent, please confirm: the folder names `client`, `server`, `shared`, `tests` and `docs`.
- Decision made by the agent, please confirm: keeping this diary as a file in the repository, so all four members can read it.

**Git steps the agent ran, and what each one means**

| Command | In plain words |
|---|---|
| `git switch main` | Go to the official version of the project on this laptop |
| `git switch -c project-skeleton` | Make a new branch called `project-skeleton` and move onto it, so `main` is not touched |
| `git add` | Choose which changed files go into the next snapshot |
| `git commit` | Save the snapshot with a message |
| `git push` | Send the branch to GitHub so teammates can see it. **This one did not work**, see below |

The push failed because the login to GitHub on this laptop is kept inside GitHub Desktop, and the agent cannot use it from outside. So Catarina sends the branch to GitHub herself with the "Publish branch" button in GitHub Desktop, and then opens the pull request with the "Create Pull Request" button.

**What was checked, and what was not**

- There is no program yet, so there was nothing to run or test.
- Checked: git ignores a file called `.env` and does not ignore `.env.example`.
- Checked: no real secret is in any file. The values in `.env.example` are fake.

**Found along the way**

- Catarina's pull request #1 (adding her name) was already merged into `main`.
- Node.js is not installed on Catarina's laptop. It is needed from step 2 onwards.
- Git is not installed on its own on this laptop. The agent uses the copy of git that comes inside GitHub Desktop.
- There is a branch called `Name` on GitHub with no changes in it. It looks like a leftover and can be deleted on GitHub.

**Still open**

- The teaching staff have not yet confirmed in writing that JavaScript is approved. The course guide says a move away from Python is decided case by case with the staff.
- Full names and student numbers of Fran, Pedro and Rodrigo are missing from the README. Each of them can add their own as a first small pull request.
- Who owns which area (the table at the end of `AGENTS.md`).

**How to check this step yourself**

Open the repository on GitHub and look at the `project-skeleton` branch. The README should show a proper "Team" heading with a table, and the folders `client`, `server`, `shared`, `tests` and `docs` should be there.

**What comes next**

Step 2, automatic tests. It needs Node.js on the laptop.
