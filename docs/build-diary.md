# Build diary

A dated record, in plain language, of what was done in this project, why, and how to check it. Anyone on the team can read it and ask questions about it later. The newest entry is at the top of the "Entries" section.

## The plan for the base

The base is the working foundation described in section 8 of `PROJECT_BRIEF.md`. It is built in nine small steps. Each step is one pull request.

| Step | What it adds | State |
|---|---|---|
| 1 | Project skeleton: folders, README, rules for agents, example secrets file, these notes | Merged into `main` on 10 Nov (pull request #2) |
| 2 | Automatic tests: one example test, and GitHub runs the tests on every pull request | Waiting for review |
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

### 10 November 2026: Step 2, automatic tests

Done on Catarina's laptop with Claude Code.

**What was done**

The project can now check itself. One command, `npm test`, runs a set of small checks and says whether they pass. GitHub will run the same checks by itself on every pull request.

First, with Catarina's OK, Node.js version 26.13.0 was installed on her laptop. It came from the official Node.js package, through `winget`, the installer tool that is part of Windows.

| File | What it is for |
|---|---|
| `package.json` | The project's identity card: its name, the command `npm test`, and the libraries it uses with their exact versions |
| `package-lock.json` | Written automatically by `npm`. It lists the exact version of every library, including the helpers our library needs. Never edited by hand |
| `.npmrc` | One setting: when a library is added, write down its exact version number |
| `shared/numbers.js` | The first real piece of the rules: `clamp`, which keeps a number between a lowest and a highest value. The driving rules will use it, for example so a kart's speed never goes above its top speed |
| `tests/numbers.test.js` | Ten tests for `clamp`: six for normal use, four for bad input that must be refused |
| `.github/workflows/tests.yml` | Instructions for GitHub: on every pull request, install the libraries and run `npm test` |
| `README.md`, `AGENTS.md`, `WALKTHROUGH.md`, `tests/README.md`, `shared/README.md` | Updated with the new commands and files |

**New library: Vitest 5.1.0**

- What it does: finds the test files, runs them and reports which passed and which failed.
- Why we need it: the brief proposes it (section 7), and it gives clear messages when a test fails.
- The alternative: the test runner that is built into Node.js, which needs no library at all.
- It is only used while developing. It is not part of the game that players get.
- It brings 35 small packages with it (its own helpers). `npm audit`, the command that looks for known security problems, found 0 on 10 November 2026.

**Why it was done this way**

- A real helper (`clamp`) was tested instead of a pretend example such as "1 + 1 = 2", so the first test already protects something the game will use.
- `clamp` stops with an error on bad input instead of quietly returning a wrong number. One wrong number in the driving rules would spread to the kart's position and be hard to find.
- The GitHub instructions only have permission to read the project, not to change it.

**Decisions**

- Decision made by the agent, please confirm: using Vitest, as the brief proposes, instead of the test runner built into Node.js.
- Decision made by the agent, please confirm: the project needs Node.js 26 or newer (the current long-term version).
- Decision made by the agent, please confirm: libraries are added one at a time, when they are first needed. Earlier the agent had suggested adding three at once, but that was to help three people work at the same time, which is not what is happening now.

**Git steps the agent ran, and what each one means**

| Command | In plain words |
|---|---|
| `git fetch` | Ask GitHub what changed there, without changing any file on the laptop. This showed that `project-skeleton` had arrived on GitHub and was not merged yet |
| `git switch -c automatic-tests` | Make a new branch called `automatic-tests`. It starts from `project-skeleton`, not from `main`, because step 1 is not merged yet and step 2 builds on it |
| `git add` and `git commit` | Save the snapshot with a message |

Sending the branch to GitHub is done by Catarina with "Publish branch" in GitHub Desktop, as in step 1.

**What was checked, and what was not**

- Checked: `npm test` on this laptop. 10 of 10 tests pass.
- Checked: `npm ci`, the clean install that GitHub will do, works, and the tests pass after it.
- Checked: `npm audit` reports 0 known vulnerabilities.
- **Not checked yet:** that GitHub really runs the tests on a pull request. This can only be seen once the pull request for this branch is open. Look for a line called "Run the tests" with a green tick near the bottom of the pull request page.

**How to check this step yourself**

In a terminal in the project folder, run `npm install` once and then `npm test`. The last lines should say "Tests 10 passed (10)".

**Step 1 was merged in the meantime**

While this step was being built, the step 1 pull request (#2) was merged into `main`. So the pull request for this step shows only the step 2 files.

**Still to do after this is merged**

Protect `main` in the GitHub settings: changes only through a pull request, with one approval and passing tests. Only Catarina can do this, as the owner of the repository.

**What comes next**

Step 3, a small server that shows a "hello" page.

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
