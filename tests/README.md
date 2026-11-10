# tests

Automatic tests: small programs that check the game rules still work. They cover things that must happen (a kart speeds up when you press the gas) and things that must NOT be allowed (a lap that skipped a checkpoint does not count).

Run them with `npm test`. GitHub also runs them on every pull request.

Each file here ends in `.test.js` and tests the file with the same name in `shared/`.

| Test file | What it checks |
|---|---|
| `numbers.test.js` | `shared/numbers.js`: keeping a number between a lowest and a highest value, and refusing bad input |
