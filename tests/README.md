# tests

Automatic tests: small programs that check the project still works. They cover things that must happen (a kart speeds up when you press the gas) and things that must NOT be allowed (a lap that skipped a checkpoint does not count).

Run them with `npm test`. GitHub also runs them on every pull request.

Each file here ends in `.test.js`.

| Test file | What it checks |
|---|---|
| `numbers.test.js` | `shared/numbers.js`: keeping a number between a lowest and a highest value, and refusing bad input |
| `server.test.js` | `server/app.js`: the server sends the page and the health check, and refuses requests that change things, files outside the `client/` folder, file kinds not on its list, and broken addresses |
