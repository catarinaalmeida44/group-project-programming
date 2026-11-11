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
| `countdown.test.js` | `shared/countdown.js`: what the countdown says at each moment, that the kart cannot move and the clock cannot run before GO whatever keys are held, that the race after GO is the normal race, and refusing bad step counts |
| `small-track.js` | Not a test. A tiny track that the track and lap tests share |
| `campus-loop.test.js` | `shared/tracks/campus-loop.js`: the campus loop is accepted and small enough to paint, starts on the road, every checkpoint closes the road from wall to wall, a robot drives the whole race without touching a wall, and skipping either detour or driving the wrong way round never counts a lap |
| `buildings.test.js` | `client/buildings.js`: the sides and roofs of blocks of different heights, refusing storeys that do not fit the track, and which pieces can be seen from behind the kart (facing the camera, standing up, smaller further away, nothing behind the camera or below the screen) |
| `track-choice.test.js` | `client/track-choice.js` and `shared/tracks/index.js`: choosing the track from the address, and refusing names that are not tracks (including names every JavaScript object has, such as `constructor`). Also asks a real copy of the server for the race page and the new files |
| `room.test.js` | `server/room.js` and `server/messages.js`, without any network: joining and leaving, a full room, only your own kart moves, and every kind of message a browser might send that must be refused |
| `room-race.test.js` | The race start in `server/room.js`, without any network: who the host is, who may not start a race, nothing moving during the countdown, everyone starting on the same step, joining and leaving during a race, and the end of a race |
| `race-view.test.js` | `client/race-view.js`: what the online page says about the race (the countdown, who may start, racing or watching), and the Enter key in `client/keyboard.js` |
| `online.test.js` | `server/online.js`, with real live connections to a real copy of the server: two browsers see each other's kart move, and the server disconnects or turns away what it should |
| `net.test.js` | `client/net.js`: online karts move smoothly between updates, hold still when updates stop, and are not thrown off by a late update |
| `db.test.js` | `server/db.js`, with a pretend database: which questions the code asks and in which order, reusing an answer for ten seconds, what happens when the database fails, and refusing an unsafe table name |
| `db-live.test.js` | `server/db.js` against the real database. Skipped unless run with `npm run test:database`, which needs the database address in `.env` |
| `camera.test.js` | `client/camera.js`: where the camera points in the view from above (looks ahead, stops at the edges, always keeps the kart on screen, glides), and where ground lands on the screen in the tilted view |
| `client.test.js` | The parts of the browser code that need no browser: `client/format.js` (a race time as text) and `client/keyboard.js` (arrow keys into gas, brake, left, right, plus R and V) and `client/hud.js` (lap times as text). The drawing is checked by eye instead |
| `menu.test.js` | The main menu in `client/index.html`, asked from a real copy of the server: it is the first page, its choices lead to the right pages, the Cup cannot be clicked yet, and the race and online pages lead back to the menu |
| `settings.test.js` | `client/storage.js` and `client/settings.js`, with a pretend browser storage: remembering the starting camera view, refusing a view that does not exist, and ignoring broken or edited saved data and a browser that refuses storage |
| `records.test.js` | `client/records.js`: keeping your best race and best lap, only a faster time replacing it, each track apart, and never recording an unfinished race, impossible times, or saved times that are not sensible |
| `server.test.js` | `server/app.js`: the server sends the page, the game rules, the health check and the database check, and refuses requests that change things, files outside the `client/` and `shared/` folders, file kinds not on its list, and broken addresses |
