# Security policy

This is the Nova SBE kart racer, a student project for Introduction to
Programming (course 2477) at Nova SBE. The live version is at
https://novasbe-kart.onrender.com.

## Reporting a problem

If you find a security problem (for example a way into someone else's
account, a way to change a race you are not in, or a secret that should not
be visible), please **do not open a public issue**, and do not post it in a
pull request or a chat. Tell us privately instead:

1. On this repository's **Security** tab, press **Report a vulnerability**.
   Only the team can read what you write there.
2. If that button is not there, write to one of the team members on GitHub
   (their GitHub usernames are in the **Team** section of `README.md`) and
   ask how to send the details privately.

Please tell us what you found, how to see it happen step by step, and what
someone could do with it. Do **not** include anyone's password or session.

We are students, so we answer on a best-effort basis, usually within a few
days. Until the course ends (23 November 2026) we will try to fix a real
problem quickly and tell you when it is fixed.

## Please do not

- use another player's account, or try to guess their password;
- send so much traffic that the live server slows down or stops for others
  (it is on a free plan and runs one server);
- look at, copy or change anyone else's data.

Testing on your own computer is always fine and needs no secret:
`npm start` runs the whole game locally without accounts, and
`npm run start:pretend` runs the real server with pretend accounts kept in
memory (see `README.md`).

## What we already do

- **Passwords are never stored.** Only a salted `scrypt` scramble is kept
  (`server/passwords.js`). After five wrong passwords in a row an account
  is locked for ten minutes.
- **Sessions** are long random tickets in a cookie marked `HttpOnly`,
  `SameSite=Lax` and, on the live site, `Secure`. They end at sign-out and
  after seven days.
- **The server trusts no browser.** Every message is checked before it is
  used (`server/messages.js`, `shared/account-rules.js`), and the races are
  run by the server, not by the players' browsers.
- **No secrets in the repository.** The database address lives in the
  server's settings and in a `.env` file that git ignores.
- **Few outside libraries, pinned to exact versions:** `pg` and `ws` to run
  the game, `vitest` for the tests. `npm audit` is checked for known
  vulnerabilities.
- **Every rule has tests**, including the things the server must refuse.
  GitHub runs them on every pull request.

## Which versions

Only the newest version on the `main` branch, which is also what runs on the
live server, gets fixes.
