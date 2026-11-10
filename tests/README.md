# tests

Automatic tests: small programs that check the project still works. They cover things that must happen (a kart speeds up when you press the gas) and things that must NOT be allowed (a lap that skipped a checkpoint does not count).

Run them with `npm test`. GitHub also runs them on every pull request.

Each file here ends in `.test.js`.

| Test file | What it checks |
|---|---|
| `numbers.test.js` | `shared/numbers.js`: keeping a number between a lowest and a highest value, and refusing bad input |
| `physics.test.js` | `shared/physics.js`: speeding up, top speed, coasting, braking, reversing, steering, grip, grass, and refusing bad input. The tests compare behaviours ("more acceleration reaches top speed sooner") instead of exact numbers, so the numbers can be tuned without breaking them |
| `track.test.js` | `shared/track.js`: reading a track, refusing a badly drawn one, the ground at a spot, and bouncing off walls |
| `laps.test.js` | `shared/laps.js`: laps that count, laps that must not count (skipped checkpoint, wrong order, wrong way round, back and forth over the finish line), and race time |
| `race.test.js` | `shared/race.js`: everything together on the test oval. A small "robot driver" drives three whole laps, drives the wrong way round, and drives flat out into a wall |
| `small-track.js` | Not a test. A tiny track that the track and lap tests share |
| `server.test.js` | `server/app.js`: the server sends the page and the health check, and refuses requests that change things, files outside the `client/` folder, file kinds not on its list, and broken addresses |
