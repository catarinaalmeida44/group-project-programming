# Walkthrough notes

Plain-language answers to the questions the teaching staff may ask when they open this repository. Any member can be asked about any part, so everyone should be able to give these answers.

**State on 10 November 2026:** one kart can be driven round a test track in the browser, with a lap counter, a finish time and three camera views. On the "Online test" page, up to eight browsers connected to our server see each other's karts. The server is on the internet at https://novasbe-kart.onrender.com, and it has a database that so far only records when the server starts. There are no accounts yet, so several answers below describe the plan. Each answer is rewritten as the real thing gets built.

## Where does each part live?

| Part | Where | Built yet? |
|---|---|---|
| The page | `client/index.html` and `client/style.css` | Yes |
| The practice race in the browser | `client/main.js` | Yes |
| The keyboard controls | `client/keyboard.js` | Yes |
| The camera: which part of the track is shown | `client/camera.js` | Yes, three views |
| The drawing of the track and the kart | `client/draw.js` | Yes, simple shapes, no artwork yet |
| The online page | `client/online.html` and `client/online.js` | Yes, a first version: everyone drives on the same track |
| Smooth movement of online karts | `client/net.js` | Yes |
| The game server | `server/app.js` builds it, `server/start.js` starts it | Yes |
| Online play on the server | `server/online.js` (connections), `server/room.js` (the karts), `server/messages.js` (checking what browsers send) | Yes, a first version: one room, no race start yet |
| The driving rules | `shared/physics.js` | Yes, a first version: speeding up, braking, steering, grip, grass |
| Tracks, the ground and walls | `shared/track.js` | Yes |
| Laps and race time | `shared/laps.js` | Yes |
| All the rules put together for one racer | `shared/race.js` | Yes |
| The test track | `shared/tracks/test-oval.js` | Yes. It is a simple loop, not a campus track |
| The drivers and their scores | `shared/characters.js` | One placeholder driver |
| The kinds of ground | `shared/surfaces.js` | Road and grass |
| The automatic tests | `tests/` | Yes, for the driving rules, the server and a number helper |
| The instructions that make GitHub run the tests | `.github/workflows/tests.yml` | Yes |
| The instructions that tell Render how to run the server | `render.yaml` and `.node-version` | Yes, in use since 10 November |
| The database connection | `server/db.js` | Yes, a first version with one small table. Checked with a pretend database and by hand. Not yet seen working on the live server |

## How does a page reach the browser?

1. The browser asks our server for an address, for example `/`.
2. `server/app.js` looks for the matching file in the `client/` folder (`/` means `index.html`). An address that starts with `/shared/` is looked up in the `shared/` folder instead, because the browser needs the game rules too.
3. If the file exists and is a kind the server is allowed to send, the server sends it. Otherwise it answers "Page not found".

The server refuses four things, and each has a test:

- requests that try to change something (only reading is allowed for now)
- files outside those two folders, for example an address such as `/../server/app.js`. The server's own code, the tests and the project settings can never be downloaded
- kinds of file that are not on its list (web pages, styles, scripts, data files and two kinds of image)
- addresses that are broken

## How does a kart move?

Time moves in small steps, 60 per second. For each step, the function `stepKart` in `shared/physics.js` takes the kart as it is now, the keys that are pressed, the driver's scores and the kind of ground, and gives back the kart one step later. It does four things in order:

1. **Steering.** It turns the direction the kart points. There is no turning when standing still, and turning is a little slower at top speed.
2. **Pedals.** Gas makes the speed climb toward the top speed, quickly at first and gently near the top. Brake stops the kart quickly and then reverses slowly. With no pedal, the kart slows down gradually.
3. **Grip.** A kart can be moving in a slightly different direction from the one it points: that is a slide. The tyres remove part of the slide in every step. More grip removes it faster.
4. **Moving.** It moves the kart by its speed for one sixtieth of a second.

A driver's scores go from 1 to 5.75. They are not speeds. At the top of `physics.js` there is a short list that says what the lowest and the highest score mean in real motion, for example a top speed from 240 to 360 units per second. Those are the numbers we tune by playtesting.

Our placeholder driver, with middle scores, reaches 80% of its top speed in about 1.2 seconds, stops in about half a second when braking, and keeps about 75% of its top speed on grass.

## How does the practice race run in the browser?

`client/main.js` repeats three things for every picture the screen shows, usually 60 times a second:

1. Ask `client/keyboard.js` which arrow keys are held.
2. Ask the rules where the kart is now. This is one call to `stepRacer` in `shared/race.js` for each sixtieth of a second that has passed.
3. Ask `client/camera.js` where the camera should be, then ask `client/draw.js` to draw the track and the kart from there, and fill in the lap counter and the clock.

Screens do not all refresh at the same speed, but the rules must always move in steps of exactly one sixtieth of a second. So `main.js` measures how much real time has passed and runs as many whole steps as fit in it.

The clock starts at the first key press. After the last lap, the keys are ignored, the kart rolls to a stop and the finish time is shown. R starts again.

The practice race runs entirely in the browser. Nothing is sent to the server and nothing is saved. That also means a practice time could be faked by a player, which is why practice times will never count for leaderboards. Online races will be run by the server.

## How does online play work, and can a player cheat?

When someone opens the "Online test" page, their browser opens a live connection to our server. A normal web request is "ask once, get one answer". A live connection (a WebSocket) stays open, and both sides can send short messages at any time. The `ws` library handles the details of that connection.

- **The browser sends only two things:** which of the four driving keys are held, and "restart". It sends them only when something changes.
- **The server moves every kart.** `server/room.js` keeps one kart per connected browser and moves them all 60 times a second with `stepRacer`, the very same function the practice race uses in the browser.
- **The server tells everyone what happened.** 20 times a second it sends all browsers the position, direction and lap progress of every kart.
- **The browser only draws.** `client/online.js` moves no kart itself.

So a player cannot go faster, pass through a wall or skip a lap by changing the page in their browser. The page decides nothing. The worst a changed page can do is hold keys its player is not holding.

The server also protects itself, and each of these has a test:

- Every message is checked in `server/messages.js`. Anything that is not exactly one of the two allowed kinds gets the browser disconnected.
- A browser that sends more than 60 messages in a second is disconnected. A real player sends a handful.
- A connection can only act on its own kart. A message has no way to name another player, and anything extra in a message is dropped.
- The room takes eight players. A ninth is told the room is full.
- A live connection is only accepted at one address, and only from a page of our own site, so another website cannot use a visitor's browser to connect to our game.

**Why karts move smoothly:** updates arrive 20 times a second, at slightly uneven moments, but the screen shows 60 pictures a second. `client/net.js` shows the race a tenth of a second in the past and draws each kart at the right point between the two updates on either side of that moment. If updates stop arriving, the karts hold still instead of guessing.

**What this first version does not have:** rooms with codes, a host, a race start, a finishing order, or karts bumping into each other. Everyone who opens the page drives on the same track.

## How does the camera work?

There are three views. The game starts in the first one and the V key switches to the next. The camera only changes what is shown. The kart moves by the same rules in every view.

- **Behind the kart.** The track is turned so that the kart always drives up the screen, and it is tilted: ground further ahead is drawn smaller and higher. The kart is drawn from behind.
- **From above.** The screen shows a zoomed-in part of the track from straight above. North stays up and the kart turns on the screen. The camera aims a little ahead of the kart, in the direction it is moving, glides instead of jumping, and stops at the edges of the track.
- **Whole track.** Everything at once, without moving.

The first two have a small map in the corner with a dot for the kart.

How the tilt is made: for every picture, the track is first painted flat on a hidden canvas, turned so the kart points up. Then it is copied to the screen one thin row at a time. A row near the top of the screen takes a wide slice from far ahead and squeezes it. A row near the bottom takes a narrow slice from close by and stretches it. The arithmetic for "which slice goes on which row" is in `client/camera.js` and has tests. No 3D library is used.

The team's original decision was the view from above with north up. The tilted view was added on 10 November because the still map looked flat, and Catarina chose it as the view the game starts in. The view from above is still there, one press of V away.

## How is a track described, and how do walls work?

A track is drawn with letters in a file, one letter for each square of ground: `#` is wall, `.` is road and `,` is grass. Open `shared/tracks/test-oval.js` to see one. When the game starts, `shared/track.js` checks the drawing and stops with a clear error if it is wrong, for example if the start is inside a wall.

For walls, a kart is treated as a circle. After every move, the game checks whether the circle overlaps a wall square. If it does, the kart is pushed back out and bounces: the part of its speed going into the wall is turned round and halved, and the part going along the wall is kept. A head-on hit sends the kart back at half speed. A scrape costs very little. Everything outside the drawing counts as wall, so a kart can never leave the track.

## How are laps counted, and can a player cheat?

A track has checkpoints: invisible rectangles across the road, in driving order. The first one is the finish line. The game keeps one count for each kart: checkpoints passed.

- Driving into the next checkpoint adds one.
- Driving back into the checkpoint before the last one takes one away.
- Driving into any other checkpoint changes nothing.

A lap is complete each time the count reaches a new full round. These cannot complete a lap, and each has a test: skipping a checkpoint, taking them in the wrong order, driving the wrong way round, going back and forth over the finish line, and reversing over the finish line to count the same lap twice.

Race time is counted in steps of the game, 60 per second, not with a clock. A finish time is therefore exact and the same on every computer.

Our first version of this rule had a mistake: a kart driving the wrong way round was given a lap after about three rounds. A test that drives a "robot" kart the wrong way round the test track found it, and the rule was rewritten as described above.

## Where is data stored, and what exactly is stored?

In a Postgres database kept by a company called Neon, in Frankfurt, on its free plan. Everything else the server knows, such as the karts in the online room, lives only in its memory and is gone when it restarts.

**What is stored today:** one table, `server_starts`. It has two columns: a number, and the date and time. The server adds one row each time it starts and keeps only the newest 50. No personal data. The table exists to prove that the server can write to the database and read from it.

**What will be stored later:** players, sessions, progress and race results (section 6 of `PROJECT_BRIEF.md`).

**How the server reaches it:** through a secret address that includes a password, the setting `DATABASE_URL`. It is in two places only: Render's Environment page, and a file called `.env` on Catarina's laptop, which git ignores. It is not in the code, and the code never prints it. On the first day the address was once pasted into a chat with the coding agent by mistake. The password was changed in Neon straight away, before anything used it.

**How to see it working:** the address `/database-check` on our site answers with the number of starts recorded and the time of the latest. Without a database it answers "The database is not set up on this computer", and when the database cannot be reached, "The database could not be reached".

**The code talks to the database safely.** Values are never glued into the text of a question. They are handed over separately, which is what stops the classic attack on databases (SQL injection). The one name that is written into a question, the table's, is checked to be small letters and underscores only.

## What do the tests cover, and what do they miss?

We run them with `npm test`. GitHub also runs them by itself on every pull request and on every change to `main`. There are 305 tests today, plus 5 that only run against the real database.

**Covered today**

- The database code in `server/db.js`. Fifteen tests with a pretend database that writes down every question it is asked: the right questions in the right order, an answer reused for ten seconds, a failure not mistaken for an answer, a pause of three seconds before asking an unreachable database again, and an unsafe table name refused. Five more tests in `tests/server.test.js` check the `/database-check` address, including that an error from the database never reaches the visitor.
- The real database. Five tests in `tests/db-live.test.js`, run with `npm run test:database`. They write to a table of their own and remove it afterwards. They are skipped on GitHub, because the database address is a secret that GitHub does not have.
- The room and the message checks in `server/room.js` and `server/messages.js`. Thirty-two tests, without any network: joining and leaving, a full room, only your own kart moves, a kart moves online exactly as it would in practice, and ten tests of messages a browser might send, most of which must be refused.
- Online play in `server/online.js`. Twenty-two tests with real live connections to a real copy of the server on the computer running the tests. Two pretend browsers see each other's kart move. Thirteen tests are refusals: messages that are not understood, data that is not text, a message far too long, too many messages, a full room, a wrong address, another website, a player claiming to be someone else, and a "deaf" browser that breaks a rule and then never answers the server's goodbye.
- Smooth online movement and the connection notice in `client/net.js`. Thirty tests: karts glide between updates, hold still when updates stop, are not thrown off by a late or repeated update, and the line under the track warns when the server has gone quiet.
- Tracks and walls in `shared/track.js`. Thirty-five tests: reading a track, twelve kinds of badly drawn track that must be refused, the ground at a spot, and bouncing off walls from every side and in a corner.
- Laps in `shared/laps.js`. Twenty-seven tests. Fourteen of them are laps that must not count.
- Whole races in `shared/race.js`. Thirteen tests. A small "robot driver" written in the test file steers a kart round the test track: three whole laps, the wrong way round, and flat out into a wall.
- The driving rules in `shared/physics.js`. Thirty-four tests: speeding up, top speed, coasting, braking, reversing, steering, grip, grass, and bad input that must be refused or ignored (keys that are not exactly "pressed", scores that are out of range, a driver with a missing score). They compare behaviours, such as "more acceleration reaches top speed sooner", instead of exact numbers, so we can tune the numbers without breaking the tests.
- `clamp` in `shared/numbers.js`, which keeps a number between a lowest and a highest value. Ten tests: six for normal use and four for bad input that must be refused.
- The server in `server/app.js`. Nineteen tests. Ten check what it must do: send the page, its style and code, the game rules and the health check. Nine check what it must refuse: missing pages, requests that change things, file kinds not on the list, files outside the `client/` and `shared/` folders (thirteen different ways of writing such an address), the server's own code and the tests, and two kinds of broken address.
- The parts of the browser code that need no browser, in `client/format.js`, `client/keyboard.js` and `client/hud.js`. Twenty-seven tests: a race time and lap times as text, arrow keys into gas, brake, left and right, R to start again, V to change the camera, and letting go of every key when the player switches to another window.
- The arithmetic of the camera in `client/camera.js`. Thirty-five tests: the view from above looks ahead, stops at every edge of the track and always keeps the kart on screen, the camera glides without overshooting, and in the tilted view ground further ahead lands higher on the screen and is drawn smaller.

The server tests start a real copy of the server on the computer running the tests and send it real requests.

To check that the tests really guard the rules, we broke the code on purpose in 57 different ways, one at a time (for example "grass is as fast as road", "driving backwards is not counted" and "other websites may connect"). In the end every one made at least one test fail. One did not at first: accepting an update that arrives late. The test for it was too weak, and it was tightened.

**Not covered today**

- The five tests against the real database have never passed. They were run once, on the university's student Wi-Fi, which does not let database traffic through, and all five failed for that reason. The address and password in `.env` were confirmed another way: the database answered a question sent over the normal web channel. Whether our code and the real database work together will first be seen on the live server, or on a laptop on another network.
- Online play between two real laptops on two different internet connections. The tests use pretend browsers on one computer, where messages arrive instantly. Delay, uneven arrival and lost connections are checked by hand with `docs/two-laptop-checklist.md`, which has not been run yet.
- Anything that only happens on the real internet. We have one example already. On the first day online, a browser that broke a rule was not removed from the live server, although the test for exactly that passed on one computer: the server was waiting for the browser to answer its goodbye, and through Render's network the answer did not come. It is fixed, there is now a test with a browser that never answers, and the fix was checked on the live server. The lesson is that passing tests show the code does what the tests imagined, not that it works everywhere.
- The "server has gone quiet" notice appearing for real. Its wording and timing are tested, but on one computer a cut connection is noticed at once, so the notice never shows there.
- How the driving feels. No test can say whether a kart is fun to drive. That needs a person at the keyboard.
- The drawing (`client/draw.js`) and the loop that runs the race (`client/main.js`). They need a real page. They were checked in a browser: by looking at the page, and by a script that pressed the keys and drove a whole three-lap race while we watched the lap counter, the clock and the finish message.
- How smooth the race looks at full speed on a normal screen. The browser used for that check was running in the background, where browsers redraw only about once a second.
- The server on Render, beyond two looks by hand: it answers its health check, sends the game pages, updated itself after a merge into `main`, and let two connections see each other at 20 updates a second. Nothing tests the live server automatically.
- Everything that is not built yet.

The tests use a library called Vitest. It is only used while developing. It is not part of what runs on Render or what players get. The online tests also use `ws` to play the part of a browser.

## What happens if the server restarts, the database pauses, or the email service is down?

The server runs on Render's free plan. Render takes the code from the `main` branch on GitHub and follows the settings in `render.yaml`. What the code does today:

- **The server restarts or stops.** This happens every time a new version goes online. The room is gone, because it lives only in the server's memory. On the online page the karts stand still. We measured that a browser can go on believing it is connected for 10 to 20 seconds after our server has cut it, because the news passes through Render's network. So the page does not rely on that: after two seconds without an update it says "The server has gone quiet. If the karts stay still, reload the page to join again." Later it says the connection was lost. After a reload the players are in a new, empty room. Practice keeps working in a page that is already open, because it runs in the browser.
- **The server cannot be reached at all.** The online page shows "Could not connect to the server. It may be waking up: wait a minute and reload the page."
- **A browser vanishes without saying goodbye** (a closed lid, lost Wi-Fi). The server checks every 15 seconds that each browser still answers, and removes the kart of one that does not.

These are the limits we expect from the free hosting plans:

- Render's free server sleeps after 15 minutes without visitors and takes about a minute to wake up.
- Render can restart a free server at any time. An online session in progress is lost, as described above, but anything saved in the database will be safe.
- Render's free plan gives 750 running hours a month, which is enough for one server that is always on.
- Neon's free database pauses after 5 minutes without use and wakes on the next request.

**The database is asleep, slow or cannot be reached.** The game keeps working: the pages, the practice race and online play do not use the database. The server does not wait for the database when it starts. `/database-check` answers "The database could not be reached. Try again in a moment." An unreachable database takes ten seconds to give up on, so after a failure the server does not ask again for three seconds, and visitors in that time get the same answer at once. This was tried for real on 10 November, when the university Wi-Fi blocked the database: the server started, sent the game, and answered the check with that message.

## Why did we build it this way?

- **Our own server runs every race.** The browser only sends which keys are pressed, so nobody can fake a result from their browser.
- **Our own driving physics.** The server has to run the races, and the physics inside game libraries only runs in a browser.
- **The driving rules never change the kart they are given.** They give back a new kart instead. A test can then compare "before" and "after", and later the browser can try a move without disturbing the real one.
- **Time moves in fixed steps of one sixtieth of a second.** The same keys then always give exactly the same result, on any computer, fast or slow. The browser and the server must agree on where every kart is, so this matters.
- **Only an exact "pressed" counts as a pressed key.** Anything else a browser might send counts as not pressed, so a strange message cannot produce a strange movement.
- **One language, JavaScript, for the browser and the server.** This lets both use the very same rules file.
- **Secrets stay out of the repository.** The repository is public, so passwords and keys live only in a local `.env` file and in the hosting settings.
- **One outside library for the server, `ws`, and only for live connections.** Writing that part ourselves would be long and easy to get wrong in ways that matter for security. `ws` is the standard choice, brings no other packages with it, and its version is pinned. Everything else is built on `http`, the web server that comes with Node.js. Fewer libraries means fewer things that can have security problems. The usual alternative for the web part is a library called Express.
- **A second outside library, `pg`, to talk to the database.** Node.js cannot talk to a database by itself. `pg` is the standard choice and works with any Postgres database, not only Neon's. The alternative is Neon's own library. It sends everything over the normal web channel, which would also work on the university Wi-Fi, but it ties the code to Neon. Which to use is an open question for the team.
- **The game does not depend on the database.** The server starts without it and runs without it. That is why a teammate needs no secret to work on the game, and why a sleeping database cannot stop a race.
- **The database check is public but cannot be used to wear the database out.** Its answer is reused for ten seconds, and it only reads. The one thing that writes is the server starting.
- **The room knows nothing about the internet.** `server/room.js` only keeps the karts and moves them. `server/online.js` does the connections. The room can then be tested without any network, and the rules for "who may do what" sit in one small file.
- **Online, the browser shows the past.** Showing other karts a tenth of a second late lets them glide smoothly between updates. The alternative, guessing where they are now, makes them jump back when the guess is wrong.
- **A browser that sends anything unexpected is sent away at once.** Our own page never sends such a message, so there is no reason to be patient with one. Its kart leaves the track immediately, and the server cuts the connection itself after two seconds instead of waiting for the browser to agree.
- **The server only sends file kinds on a short list, and only from two folders.** A file we forget somewhere cannot leak by accident.
- **No drawing library for now.** The track and the kart are drawn with the canvas that is built into every browser. All the drawing is in two files, `client/draw.js` and `client/camera.js`, so it can be replaced by a game library such as Phaser later without touching the rules. Whether to do that is still an open decision for the team.
- **The browser code is split by job.** Keys, camera, drawing, time as text and the race loop each have their own file, and none of them decides how a kart moves. That is why adding two new camera views changed nothing in the rules or their tests.
- **The server's settings for Render are a file in the repository** (`render.yaml`), not something typed into a web form. Anyone can read how the live server is set up, and changes to it go through a pull request.

## What are the known limits, and what would we change next?

- On the university's student Wi-Fi a laptop cannot reach the database. The connection opens and then nothing comes back. The live server is not on that network. For database work on a laptop we need a phone hotspot or home Wi-Fi, or we switch to Neon's own library.
- The database holds nothing useful yet, only a count of server starts.
- Online, your own kart reacts a moment late: your key press travels to the server and the result travels back, and then the picture is a tenth of a second behind. On one laptop this is small. Over the internet it will be bigger. The fix is "prediction": the browser moves your own kart at once with the shared rules and corrects it when the server answers. The rules were written to make that possible, but it is not built.
- Online has one room for everyone, no race start, no finishing order and no bumping between karts. There are no accounts, so anyone with the link can join.
- A very short key tap, shorter than one picture on the screen, is not sent to the server.
- The limit of 60 messages a second is per connection. Nothing yet limits how many connections one computer may open, beyond the room being full at eight.
- The numbers in the driving rules are first guesses. No person has driven the kart for long yet, so they will change with playtesting.
- The driving rules have no drifting, bumping between karts, sand or sea yet.
- In the tilted view everything is flat. Walls are painted on the ground with a striped edge and do not stand up, and there is no sky or scenery. Making things stand up would need more drawing code or a 3D library.
- The kart is drawn with a few coloured shapes, from above and from behind. Real artwork would need a picture of each character from several sides.
- In the tilted view, other players' karts are painted flat on the road, like stickers. Drawing them standing up needs a picture of each kart from several sides, placed and sized by distance. The arithmetic for placing them exists (`chasePoint` in `client/camera.js`) but is not used yet.
- The tilted view redraws the whole screen row by row for every picture. That is fine on a laptop, but it is more work for the computer than the view from above.
- The game needs a keyboard. There are no touch controls for phones.
- The kart is drawn exactly where the last step of the rules put it. On screens faster than 60 pictures a second the movement can look slightly uneven. Drawing in-between positions would fix that.
- If the browser tab is in the background, the practice race runs in slow motion instead of jumping ahead.
- A kart is a circle for walls, although it is drawn as a rectangle. Its corners can look as if they poke slightly into a wall.
- Walls are whole squares. A track cannot have a diagonal or curved wall yet, only steps.
- The server reads a file from disk for every request. That is fine for a few players. With many visitors we would keep the files in memory.
- The rest is to be filled in as we build.
