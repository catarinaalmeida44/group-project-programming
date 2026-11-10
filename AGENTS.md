# Rules for coding agents

> Draft of 10 November 2026. Approving the pull request that adds this file means the team accepts these rules.
> Change this file only through a pull request, like any other file.

Every coding agent working in this repository (Claude Code, Codex or another) follows these rules, whoever is using it.

## Before anything else

1. Read `PROJECT_BRIEF.md` completely. It says what we are building and what is decided, proposed or still open.
2. Read the latest entries in `docs/build-diary.md` to see what was done last.

We are programming beginners. Every member must be able to explain every part of the project to the teaching staff.

## How to run the app and the tests

Not available yet. Whoever adds these commands also writes them here and in `README.md`.

- Run the app: _to be added_
- Run the tests: _to be added_

## How to work with us

1. **Explain before you build.** Say in plain language what you will do, which files you will create or change, and why. Wait for an OK on anything big.
2. **Explain after you build.** Say what changed, where it lives, why it was done this way, what it does not handle yet, and how we can check it ourselves.
3. **Use plain language.** Explain a technical term the first time you use it.
4. **Never decide silently.** If something is marked [OPEN] in the brief, or is not covered, give the options, your recommendation and a short example. If nobody is available, choose the simplest option that is easy to undo and write "Decision made by the agent: ... please confirm" in the pull request and in the build diary.
5. **Small steps.** One task per branch, small pull requests, merged often.
6. **Stay inside the task.** Do not change files that the task does not need.
7. **Be honest about checks.** Say which tests and checks you actually ran and which you could not run. Never say something works without having run it.

## Tests

- Every game rule gets a test, including rejected actions (things that must NOT be allowed).
- Never edit or delete an existing test to make it pass. If you think a test is wrong, say why and let the team decide.
- All tests must pass before a pull request is opened.

## Secrets

- No passwords, database connection strings or keys in the repository, in chat, in issues or in screenshots. Ever.
- Code reads secrets from environment variables (settings kept outside the code).
- Real values live only in a local `.env` file (git ignores it) and in the hosting settings. Only `.env.example`, with fake values, is committed.
- Never ask a team member to paste a secret into the chat. Never open or print the `.env` file.

## Outside libraries

- Use as few as possible. Before adding one, say what it does, why we need it and what the alternative is, and wait for an OK.
- Pin exact version numbers and check for known vulnerabilities.

## Git and GitHub

- Start every task on a new branch made from an up-to-date `main`. Never commit directly to `main`.
- Never merge a pull request into `main`. A teammate reviews it and merges it. Nobody merges their own pull request without a review.
- Never force-push and never rewrite history.
- Run git commands (create a branch, commit, push) only when the member you are working with has asked you to. Explain each step and record it in `docs/build-diary.md`. Members who prefer GitHub Desktop do these steps themselves.
- One agent per folder at a time. Commit before another agent takes over.

## Notes to keep up to date

- `docs/build-diary.md`: after each task, add a dated entry in plain language: what was done, why, where it lives and how to check it.
- `WALKTHROUGH.md`: keep the answers to the staff's likely questions correct.
- `PROJECT_BRIEF.md`: when a decision changes, move the item between [OPEN], [PROPOSED] and [DECIDED] and add the date.
- `README.md`: keep the deployed URL, the team table and the run and test commands correct.

## Where things live

| Folder | What goes there |
|---|---|
| `client/` | What the browser shows: page, drawing, keyboard controls |
| `server/` | The game server: sends the page, runs the races, talks to the database |
| `shared/` | The game rules (physics, laps), used by both the browser and the server |
| `tests/` | Automatic tests |
| `docs/` | Build diary and checklists |

## Owners of shared files

One owner per shared structure. Ask the owner before changing it.

| Shared structure | Owner |
|---|---|
| Database tables | [OPEN] |
| Main server file | [OPEN] |
| Rules file (`shared/`) | [OPEN] |
| `AGENTS.md` | [OPEN] |

## Never

- Use Nintendo characters, names, music or images. Everything in the game is original.
- Add accounts, items, computer karts or other features before the base (section 8 of the brief) is done.
