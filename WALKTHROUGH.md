# Walkthrough notes

Plain-language answers to the questions the teaching staff may ask when they open this repository. Any member can be asked about any part, so everyone should be able to give these answers.

**State on 12 November 2026:** the game opens on a main menu with a drawn picture of the campus by the sea. From it a player chooses a track (the test oval or the campus loop) for a single race in the browser or for an online race, chooses the colours of their kart, opens the leaderboard, changes the settings, and creates an account or signs in. A race is seen from behind the kart, with a sky, buildings and trees. It starts on a grid behind the start line, under a gantry with start lights. Karts bump into each other, and banana peels on the road make a kart spin. A race has a lap counter, a finish time and three camera views. Online, up to eight browsers in the room of a track see each other's karts, the host starts a race for everyone, and when a signed-in player finishes, our server saves the time. The shared leaderboard shows the ten fastest races and laps of each track. The server is on the internet at https://novasbe-kart.onrender.com, with a database that holds the accounts and the results. Accounts have no email yet, and there are no characters, items, computer karts or cup, so some answers below still describe the plan. Each answer is rewritten as the real thing gets built.

## Where does each part live?

| Part | Where | Built yet? |
|---|---|---|
| The main menu, the first page | `client/index.html` and `client/menu.js` | Yes: Single race, Cup (greyed out until the tracks exist), Online, Leaderboard, Settings and the account corner |
| Choosing a track in the menu | `client/track-panel.js`, `client/track-list.js`, `client/mini-map.js` | Yes: a card with a small map for each track |
| The leaderboard in the menu | `client/leaderboard.js`, `client/leaderboard-view.js`, `client/leaderboard-panel.js` | Yes: the shared boards of each track, and your own practice bests |
| Accounts in the menu | `client/account.js`, `client/account-view.js`, `client/account-panel.js` | Yes: create an account, sign in, sign out, change your password, delete your account |
| How a page asks the server about accounts | `client/account-api.js`, read carefully by `client/answers.js` | Yes |
| Accounts on the server | `server/api.js` (the addresses), `server/accounts.js` (the rules), `server/passwords.js` (scrambling), `server/store.js` (the database questions) | Yes: a user name and a password. No email yet |
| Which user names and passwords are allowed | `shared/account-rules.js` | Yes, used by the page and by the server |
| How every page looks | `client/style.css` | Yes |
| The single race page | `client/race.html` | Yes, on either track |
| The practice race in the browser | `client/main.js` | Yes |
| Keeping settings and best times in the browser | `client/storage.js`, `client/settings.js`, `client/records.js` | Yes: the starting camera view, and your best race and best lap per track |
| The keyboard controls | `client/keyboard.js` | Yes |
| The camera: which part of the track is shown | `client/camera.js` | Yes, three views. The race view is low behind the kart, with a horizon |
| Putting the picture together | `client/draw.js` | Yes: sky, ground, buildings, trees, karts, in the right order |
| The ground, the sky, and the things beside the road | `client/ground.js`, `client/sky.js`, `client/props.js` | Yes: our own drawings, no image files |
| How each track looks | `client/track-looks.js` | Yes: a circuit in the woods for the oval, the campus for the campus loop |
| The kart and its driver as a 3D shape, and painting it | `client/kart-shape.js`, `client/kart-paint.js` | Yes: one shape, in any colours, from any side |
| Choosing the colours of your kart | `client/kart-choice.js`, `client/kart-panel.js`, and the rule in `shared/kart-looks.js` | Yes: kart, helmet and suit |
| Arrows, arrow boards and the "wrong way" warning | `client/route.js` | Yes |
| The yellow light on the next checkpoint, and the warning for a missed one | `client/checkpoints.js` | Yes, since 13 November |
| Your place in an online race, and the order of the results at its end | `client/standings.js` | Yes, since 13 November |
| The results board that comes up when an online race is over | `client/results-board.js`, and how it moves in `client/style.css` | Yes, since 13 November |
| How long an online race may last | `shared/race-time.js` | Yes: two minutes after the first finish, ten minutes after GO |
| The camera coming down at the start, the start lights, the spin | `client/scene.js` | Yes |
| The starting grid | `shared/grid.js` | Yes: eight places behind the start line |
| Karts bumping into each other | `shared/bumps.js` | Yes |
| Banana peels | `shared/hazards.js` | Yes: they appear during a race and make a kart spin |
| The online page | `client/online.html` and `client/online.js` | Yes: one room for each track, and it says who you are signed in as and whether your result was saved |
| Smooth movement of online karts | `client/net.js` | Yes |
| What the online page says about the race | `client/race-view.js` | Yes |
| The game server | `server/app.js` builds it, `server/start.js` starts it | Yes |
| Online play on the server | `server/online.js` (connections), `server/room.js` (the karts), `server/messages.js` (checking what browsers send) | Yes: a room per track, with a host, a race start, watching, a finishing order, and results saved for signed-in players |
| The driving rules | `shared/physics.js` | Yes, a first version: speeding up, braking, steering, grip, grass |
| Tracks, the ground and walls | `shared/track.js` | Yes |
| Laps and race time | `shared/laps.js` | Yes |
| All the rules put together for one racer | `shared/race.js` | Yes |
| The 3, 2, 1, GO! before a race | `shared/countdown.js` | Yes, in the practice race and in online races |
| The test track | `shared/tracks/test-oval.js` | Yes. It is a simple loop, not a campus track |
| The first campus track | `shared/tracks/campus-loop.js` | Yes: the campus loop, round the outside of the campus. A first version, to be improved |
| How tall the campus buildings are | `shared/tracks/campus-loop-storeys.js` | Yes: storeys per square, for the picture only |
| Buildings standing up behind the kart | `client/buildings.js`, painted by `client/draw.js` | Yes, on the campus loop |
| The list of tracks | `shared/tracks/index.js` | Yes: the test oval and the campus loop |
| Reading the chosen track from a page's address | `client/track-choice.js` | Yes: `race.html?track=campus-loop` and `online.html?track=campus-loop` |
| The drivers and their scores | `shared/characters.js` | One placeholder driver |
| The kinds of ground | `shared/surfaces.js` | Road and grass |
| The automatic tests | `tests/` | Yes, for the driving rules, the server and a number helper |
| The instructions that make GitHub run the tests | `.github/workflows/tests.yml` | Yes |
| The instructions that tell Render how to run the server | `render.yaml` and `.node-version` | Yes, in use since 10 November |
| The database connection | `server/db.js` | Yes. Works on the live server and from a laptop that has the address |
| The game on a laptop with pretend accounts | `server/start-pretend.js` (`npm run start:pretend`) | Yes: for trying accounts without the database's secret address |

## How does a page reach the browser?

1. The browser asks our server for an address, for example `/`.
2. `server/app.js` looks for the matching file in the `client/` folder (`/` means `index.html`). An address that starts with `/shared/` is looked up in the `shared/` folder instead, because the browser needs the game rules too.
3. If the file exists and is a kind the server is allowed to send, the server sends it. Otherwise it answers "Page not found".

The server refuses four things, and each has a test:

- requests that try to change something. Only the account addresses, which all start with `/api/`, accept such a request, and they check each one (see the answer about accounts below)
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
2. Ask the rules where the kart is now. This is one call to `stepCountdownRace` in `shared/countdown.js` for each sixtieth of a second that has passed. During the countdown that call only counts. From GO on it passes the work to `stepRacer` in `shared/race.js`.
3. Ask `client/camera.js` where the camera should be, then ask `client/draw.js` to draw the track and the kart from there, and fill in the lap counter and the clock.

Screens do not all refresh at the same speed, but the rules must always move in steps of exactly one sixtieth of a second. So `main.js` measures how much real time has passed and runs as many whole steps as fit in it.

The first press of an arrow key starts a countdown: 3, 2, 1, GO!, one second each. During 3, 2 and 1 the keys do nothing, the kart stands still and the clock stays at zero. At GO the clock starts, whether a key is held or not. The countdown is counted in steps of the game, 60 for each number, like the race time, so the server can use the same rule for online races later. Holding the gas early gives no head start, and there is a test for that. After the last lap, the keys are ignored, the kart rolls to a stop and the finish time is shown. R starts again.

The practice race runs entirely in the browser. Nothing is sent to the server. When a race is finished, `client/records.js` compares it with your best race time and best lap on that track, keeps the better ones in this browser, and the finish message says "New best time!" or "New best lap!". The Leaderboard button in the menu shows them.

Because the race runs in the browser, a player could fake those times. That is fine for personal records nobody else sees, and it is why they are never sent to the server and will never count for a shared leaderboard. A shared leaderboard needs accounts and races run by the server (sections 5 and 6 of `PROJECT_BRIEF.md`).

## What is the main menu, and what are the settings?

The address of the game opens the menu (`client/index.html`). It has four big choices, Single race, Cup, Online and Leaderboard, and at the top the account corner and the Settings button. Cup is shown but cannot be clicked yet: it needs the three campus tracks. Both the race page and the online page have a "← Menu" link back.

**The picture behind the menu** is our own drawing: a sunset over the sea, a lighthouse, white campus blocks, palms, and a road with a finish line and two karts. It is written as shapes inside the page (an SVG drawing) and moved with the style file. No image files, no outside fonts, nothing from another website, and no logo or official artwork.

**Choosing a track.** Single race and Online are plain links, so they work even if the page's code does not run. With the code, they open a "Choose a track" panel instead. It has one card for each track in our list (`shared/tracks/index.js`), with the name, the laps, and a small map painted from the very letters the track is drawn with (`client/mini-map.js`), so a new track gets its card and its map without any extra work. A card leads to `race.html?track=...` or `online.html?track=...`.

**The Leaderboard panel** has two parts. "All players" is the shared leaderboard of the chosen track, asked from our server: the fastest races and the fastest laps, the first three on a podium, your own row marked, and your own rank underneath if you are outside the ten. "Your practice bests" are the times of your single races, which stay in your browser. While the answer is on its way, when nobody has raced yet, and when the server has no accounts, the panel says so in words.

**The account corner** shows "Sign in" and "Create account", or your user name and "Sign out". Three panels belong to it: Sign in, Create account, and Your account. In Your account two things are folded away: "Change my password", which asks for the password you have now and a new one, and "Delete my account", which asks for the password and a tick. The forms check the name and the password by the same rules file the server uses and say what is wrong before anything is sent. The server checks again in any case.

Every panel is a `<dialog>`, a kind of panel built into browsers: Escape or the Close button closes it, the keyboard stays inside it while it is open, and no library is needed.

**How the menu code is split.** For each panel, one file works out what to show from plain facts and needs no browser, so it has tests (`track-list.js`, `leaderboard-view.js`, `account-view.js`), and another file puts that on the page (`track-panel.js`, `leaderboard-panel.js`, `account-panel.js`). `menu.js` only starts them. Everything that comes from the server or from the browser's storage, such as a user name, is put on the page as text (`client/page-parts.js`), never as HTML.

**Settings** has one real choice today: the camera view a race starts in. The race page and the online page read it when they open. V still changes the view during a race. Sound is shown but greyed out, because the game has no sound yet, and the panel lists the controls.

**Where settings and best times are kept:** in the browser's own storage (`localStorage`), a small space every website gets that keeps short texts after the page is closed. Nothing is sent to our server, and other players never see it. Two things can go wrong and neither may break the game, and each has a test: the browser may refuse storage (some private windows), and what we read back may not be what we wrote, because a player can edit it. So every value read back is checked: an unknown camera view or a time that is not a whole positive number of steps is ignored and the default is used. Times are shown with `textContent`, never as HTML, so a saved text cannot add anything to the page.

## How does online play work, and can a player cheat?

When someone opens the online page, their browser opens a live connection to our server. A normal web request is "ask once, get one answer". A live connection (a WebSocket) stays open, and both sides can send short messages at any time. The `ws` library handles the details of that connection.

- **The browser sends only three things:** which of the four driving keys are held, "restart", and "start a race". It sends them only when something changes or a key is pressed.
- **The server moves every kart.** `server/room.js` keeps one kart per connected browser and moves them all 60 times a second with `stepRacer`, the very same function the practice race uses in the browser.
- **The server tells everyone what happened.** 20 times a second it sends all browsers the position, direction and lap progress of every kart on the track, and the state of the race: its phase, how far the countdown is, who the host is and who is watching.
- **The browser only draws.** `client/online.js` moves no kart itself.

So a player cannot go faster, pass through a wall or skip a lap by changing the page in their browser. The page decides nothing. The worst a changed page can do is hold keys its player is not holding.

The server also protects itself, and each of these has a test:

- Every message is checked in `server/messages.js`. Anything that is not exactly one of the three allowed kinds gets the browser disconnected.
- A browser that sends more than 60 messages in a second is disconnected. A real player sends a handful.
- A connection can only act on its own kart. A message has no way to name another player, and anything extra in a message is dropped.
- A room takes eight players. A ninth is told the room is full.
- A live connection is only accepted at one address (`/play`, with the short name of a track that exists), and only from a page of our own site, so another website cannot use a visitor's browser to connect to our game.

**One room for each track.** `online.html?track=campus-loop` connects to the room of the campus loop, and without a choice it is the room of the test oval. The page takes the short name from its own address, but only if it is a name in our list of tracks (`client/track-choice.js`), and the server checks it again.

**Why karts move smoothly:** updates arrive 20 times a second, at slightly uneven moments, but the screen shows 60 pictures a second. `client/net.js` shows the race a tenth of a second in the past and draws each kart at the right point between the two updates on either side of that moment. If updates stop arriving, the karts hold still instead of guessing.

**A fourth thing a browser may send, since 12 November:** "paint my kart in these colours", three small whole numbers (see the answer about how a kart is drawn). It changes how the kart looks and nothing else.

**What this version does not have:** rooms with codes, or a results screen that shows everyone's position. Everyone who opens the page of a track is in the same room.

## How do accounts work, and what do they refuse?

An account is a user name and a password. There is no email yet. The menu has the forms; the server does the deciding.

1. **Signing up.** The page sends the name and the password to `/api/signup`. The server checks both against the rules in `shared/account-rules.js` (the page uses the same file to warn early, but the server never trusts the page). The name must be 3 to 16 letters, digits or underscores, and "Ana" and "ana" count as the same name. The password must be at least 8 characters.
2. **The password is scrambled, never kept.** `server/passwords.js` runs it through `scrypt`, a function that comes with Node.js, together with a random "salt", so two players with the same password get different results. What is stored cannot be turned back into the password. It is slow on purpose, about a tenth of a second, so that someone who stole the database could not try millions of guesses.
3. **Staying signed in.** After a correct password the server makes up a long random "ticket" (32 random bytes) and gives it to the browser in a cookie. The browser sends the cookie back with every later request, and that is how the server knows who is asking. The database holds only a scrambled copy of the ticket, so someone who could read the database still could not use it.
4. **Signing out** removes the ticket on the server, so a copy of the cookie stops working too. A ticket also stops working after seven days.
5. **Changing your password** (since 13 November 2026). In the menu, under "Your account", "Change my password" asks for the password you have now and a new one. The page sends both to `/api/change-password`. The server checks the current password again, with the same lock after five wrong tries: being signed in is not enough, so someone who finds a laptop open cannot take the account over. The new password has to keep the rules and has to be a different one. It is scrambled like any other. Then you are signed out on every other phone or computer, so that someone who knew the old password is out, and you stay signed in on the one you used.
6. **Deleting your account** asks for the password again and removes your sessions and results with it.

There is still no way to get back into an account when the password is forgotten. That needs email, which the team has not decided on (see the known limits).

The cookie is marked in three ways. `HttpOnly`: the page's own code cannot read it, so a script that somehow got into a page could not steal it. `SameSite=Lax`: the browser does not send it with requests that another website starts. `Secure`: on the live site it only travels over the protected connection (https).

What the server refuses, each with a test in `tests/api.test.js` or `tests/accounts.test.js`:

- A name or password that breaks the rules, also when it is not text at all, and a name that is taken. Two sign-ups for the same new name at the same moment: the database lets exactly one in.
- A wrong password. A name nobody has gets exactly the same answer, after the same amount of work, so trying names does not reveal which exist.
- A sign-in while the account is locked. After five wrong passwords in a row an account is locked for ten minutes, and then even the right password is refused.
- A ticket that is made up, damaged, already signed out or older than seven days.
- Deleting an account without being signed in or without the right password. The request has no way to name another player: the server only ever uses the player the ticket belongs to.
- Changing a password without being signed in, with a wrong current password, to a new one that breaks the rules, or to the same one. Here too nothing in the message can name another player. More than ten tries a minute from one computer are refused, and each change counts twice towards the limit on password work, because it checks one password and scrambles another.
- A request to change something that comes from a page on another website. A browser always says which site started such a request, and the server refuses any that is not our own. It also refuses anything that is not in our format (JSON), which a plain form on another site cannot send.
- A message longer than a couple of lines, or one that is not one object.
- Too many tries in a minute from one computer, and too much password work in total. Scrambling is slow on purpose, so without a limit a flood of sign-in tries could keep the server too busy to run races.
- A name that looks like a database command is just an odd name. Values are never glued into the text of a database question (`server/store.js`), and a test checks that for every question.

When the server runs without a database, which is the normal case on a teammate's laptop, every one of these addresses answers "not available" and the menu says so. The game itself still works.

## How does a time get onto the shared leaderboard, and can it be faked?

Only the server can put a time there, and only a time from a race it ran itself.

1. When a browser opens the online page, it sends its cookie along with the request for the live connection. `server/online.js` looks up whose ticket that is and remembers it for that connection. No ticket, or one that does not work, means a guest. The page is told which ("Signed in as Ana" or "You are playing as a guest").
2. The host starts a race. The room (`server/room.js`) moves every kart with the shared rules and notices the step on which each racer completes the last lap. It keeps the finishing order: position, race time in steps, fastest lap. Two racers who cross the line in the very same step share a position.
3. For each finisher who is signed in, the server writes one row to `race_results`: the player, the track of that room, the two times and the position. Then it tells that browser "saved", and the page shows the place and the time.
4. The Leaderboard in the menu asks `/api/leaderboard?track=...` and gets, for that track, the ten fastest races and the ten fastest laps, one row per player, plus the signed-in player's own best and rank. Only user names and times are sent.

Why it cannot be faked from a browser:

- There is no address that accepts a result, and no message a browser may send that contains one. A browser that sends a made-up "saved" or "result" message is sent away. A made-up finish added to a real "keys" message is dropped. Both have tests.
- The time, the track and the player all come from the server: the room's own count of steps, the room the connection is in, and the cookie.
- Laps driven while the room is open, without a race, are not saved. Neither is anything a guest drives, or a race a player left before the line.
- Practice races never count. They run in the browser, and their best times stay in that browser.

What a player can still do: drive well. And two friends can agree that one of them wins, as in any game.

The leaderboard is read from the database at most once every 30 seconds per track, however many people open it, and at once after a new result or a deleted account.

## How does an online race start, and who may start it?

The room in `server/room.js` is always in one of four phases, and the server tells every browser which:

| Phase | What happens |
|---|---|
| open | Nobody has started a race. Everyone drives around freely, and each player's own clock starts at their first key press |
| countdown | The host started a race. Every kart is back on its starting place and 3, 2, 1 is counted. Keys do nothing |
| racing | GO! Every racer's clock started on the same step, key held or not |
| finished | The race is over: every racer has completed the laps, or the time ran out. The room waits for the host to start the next race |

- **The host is whoever has been in the room longest.** When the host leaves, the next longest becomes host. The host presses Enter to start, and only when no race is on.
- **A race that has begun is driven to its end** (since 13 November 2026). Before, the host could press Enter in the middle of a race, by accident too, and the race everyone was driving was thrown away. Now the server refuses that start.
- **So that a race always does end, it has two time limits**, counted in steps on the server (`FINISH_WINDOW_STEPS` and `RACE_LIMIT_STEPS` in `shared/race-time.js`, which the server and the page both read). Once the first racer has finished, the others have two minutes left. And no race lasts longer than ten minutes after GO. Without them, one racer who walks away from their laptop would hold the room for ever. A racer who has not finished when the time runs out gets no result: their keys stop working, their kart rolls to a stop, and nothing is saved for them. From the first finish on, the page shows the time left at the top of the picture: "The race ends in 1:42", and in the last minute "The race ends in 42 s". (Why two minutes: Catarina asked for three on 13 November, or two if three was too long. A whole race takes between one and two and a half minutes, so with three the winner would wait longer than the race took.)
- **When the race is over, a results board comes up over the track** (`client/results-board.js`). The winner is on top, large, with their kart turning round in their own colours. Everyone else is below in the order they crossed the line, each with a small picture of their kart, their time, and how far behind the winner they were. Karts that ran out of time come last, the one that was closest to the finish first: more checkpoints passed, and of two with the same count, the one nearer to its next checkpoint. They are marked "did not finish" with the lap they were on. The board pops up, the rows slide in one after the other and confetti falls. A player who has asked their computer for less motion gets the board without any of that. The board stays until the host starts the next race.
- **During the race** the page shows the player's place, such as "2nd of 4", and a racer who has finished sees a small list in the corner while the others are still driving. All of this is worked out by the page from what the server sends about every kart (`client/standings.js`). It is for showing only: what is saved to the leaderboard is the server's own count.
- **The countdown is the rule the practice race uses**, `countdownAt` in `shared/countdown.js`. It is counted in steps on the server, so every browser sees the same number and all karts are let go on the same step. Holding the gas early gives no head start.
- **Someone who joins during a race watches.** They are in the room and count towards the eight, but they have no kart on the track. Their camera follows the kart that has done the most laps, and V changes the view as usual, for example to the whole track from above. They join at the next start. If every racer leaves, the room goes back to open, so watchers are never stuck.

What the server refuses here, each with a test:

- A start from anyone but the host. Any browser can send "start", and nothing in the message can claim to be the host: the server looks only at which connection sent it. A start from someone else is ignored. That browser is not sent away, because a slightly out-of-date page of our own could send it honestly.
- A second start while the countdown is running, so pressing Enter twice does not start the countdown over.
- A start while a race is being driven, from the host too. The test checks that nothing at all changes: no kart is sent back to the grid and every clock runs on.
- A finish after the time has run out. The laps and the clock of a racer who is out of time stay as they were, however long they hold the gas.
- "Restart" (the R key) during a countdown or a race. A racer could otherwise give themselves a fresh clock.
- Keys from someone who is watching: they move nothing.

The words on the page (the big number, "You are the host: press Enter", "You are watching") are worked out in `client/race-view.js` from what the server sent. The page decides nothing about the race.

## How does the camera work?

There are three views. The game starts in the first one and the V key switches to the next. The camera only changes what is shown. The kart moves by the same rules in every view.

- **Behind the kart** (the race view). The camera is low and close behind the kart and looks along the road. The horizon is on the screen, with sky above it, and buildings and trees stand tall on both sides. The camera swings round behind the kart a moment after the kart has turned, so you see your own kart turn.
- **From above.** The screen shows a zoomed-in part of the track from straight above. North stays up and the kart turns on the screen. The camera aims a little ahead of the kart, in the direction it is moving, glides instead of jumping, and stops at the edges of the track.
- **Whole track.** Everything at once, without moving.

The first two have a small map in the corner with a dot for every kart.

**How the race view is put together**, for every picture, in this order (`client/draw.js`):

1. **The sky** (`client/sky.js`): blue, a sun, clouds, and what lies on the horizon in each direction. A cloud is in one direction, like a compass point, so it slides across the screen when the camera turns and stays put when the kart drives.
2. **The ground** (`client/ground.js`). The whole track was painted once from straight above when the page opened: road, grass, kerbs, the start line, the grid, arrows. For every picture that painting is laid flat under the camera. The screen is filled one row of pixels at a time: for each row we work out how far away the ground on it is and how large it is drawn there, and fill the row from the painting, turned and sized to match. Rows near the horizon show ground far away, drawn small. Rows near the bottom show ground close by, drawn large. Together that is the tilt. Far away the ground fades into a pale haze.
3. **Everything that stands on the ground**, the furthest first, so nearer things cover further ones: buildings, banks, trees, arrow boards, bananas, the start gantry, the other karts.
4. **Smoke and dust.**
5. **Our own kart**, last, so nothing ever hides it.

The arithmetic that says where a spot of the track lands on the screen is in `client/camera.js` and has tests. It is the same for the ground, the buildings, the trees and every corner of a kart, which is why they all line up. No 3D library is used.

**The start of a race.** Before the countdown the camera is high above the grid, looking down at it like a tilted map (this was the game's first "behind the kart" view). While 3, 2, 1 is counted it comes down to its place behind the kart, and the lights on the gantry over the start line go red one by one, then green at GO (`client/scene.js`).

**A history of this view.** The team's original decision was the view from above with north up. A tilted view was added on 10 November because the still map looked flat. On 12 November Catarina asked for much better graphics, and the tilted view became the race view described here: lower, with a horizon, a sky, and things standing beside the road. The view from above is still there, one press of V away.

## How does a player know which way to go?

Three things in the picture, all worked out from one list (`client/route.js`): the track's "route", points along the middle of the road in the order they are driven.

- **Arrows painted on the road**, all the way round.
- **Arrow boards at the bends**, standing where a driver who missed the bend would end up. They point left or right, as the driver sees it.
- **A warning.** A kart that drives against the route for more than a moment gets "Wrong way! Turn round and follow the arrows." A kart that is standing, spinning, or just crossing the road does not.

- **A yellow light on the next checkpoint** (since 13 November 2026). The checkpoint the kart has to drive through next is lit up: a low, see-through curtain of yellow light across the road in the race view, and a yellow line in the views from above and on the small map. It is only light, karts pass through it (`client/checkpoints.js`, painted by `client/draw.js`).
- **A warning for a missed checkpoint.** "You missed a checkpoint: round the end of the CTT Student Hall. This lap does not count until you drive through the yellow light." The name comes from the track file.

None of this counts laps. A lap counts only if the kart went through every checkpoint in order, and the server decides that. A test checks that following the route goes through every checkpoint in order on both tracks, so the arrows cannot lead a player wrong.

**Why did a lap sometimes not count on the campus loop?** Catarina reported this on 13 November. The lap rule was right, but the game did not explain itself. On the west side of the campus loop the road makes a hairpin round the end of the CTT Student Hall, and checkpoint 5 sits at the end of that hairpin. The square there is open, so a kart can drive straight on and never touch checkpoint 5. Crossing the finish line then counts for nothing, on that lap and on every lap after it, until the kart has gone through checkpoint 5. Nothing on the screen said so. The other five checkpoints reach from wall to wall and cannot be driven round. We did not change the track, which is Rodrigo's and waits for the videos from campus. We made the game say what is happening: the light shows where to go, and the warning names the checkpoint that was left out.

**How does the page know a checkpoint was missed?** A kart is only ever expected inside three checkpoints: the one it passed last, the next one, and the one before the last. Inside any other checkpoint, it must have left one out on the way. Online, the server sends every kart's count of checkpoints for this ("passed"). The warning is words on the page and decides nothing.

## How is a track described, and how do walls work?

A track is drawn with letters in a file, one letter for each square of ground: `#` is wall, `.` is road and `,` is grass. Open `shared/tracks/test-oval.js` to see one. When the game starts, `shared/track.js` checks the drawing and stops with a clear error if it is wrong, for example if the start is inside a wall.

For walls, a kart is treated as a circle. After every move, the game checks whether the circle overlaps a wall square. If it does, the kart is pushed back out and bounces: the part of its speed going into the wall is turned round and halved, and the part going along the wall is kept. A head-on hit sends the kart back at half speed. A scrape costs very little. Everything outside the drawing counts as wall, so a kart can never leave the track.

## Where do the campus tracks come from?

From the real campus. The tracks are taken from the Nova SBE campus and its building. The first one, the campus loop (`shared/tracks/campus-loop.js`), goes round the outside of the campus.

**The source is OpenStreetMap**, a free map of the world that anyone may reuse if they credit it ("© OpenStreetMap contributors", in the README). We chose it because it draws the campus from straight above, in metres, with every building named. We also looked at the school's online campus map, whose drawing of each floor is at a slant (its walls meet at about 123° instead of 90°) and belongs to the school, and at the architects' published pictures, which are taken at an angle and cannot be measured. No floor plans of the building are published.

**How the letters were made.** A short script, run in a browser, took the OpenStreetMap data of the campus, turned it 21° so that the buildings run along the squares, and gave every 6-by-6-metre square a letter: buildings and everything outside the campus are wall, gardens are grass, paths and squares are road. Then the road along the driving line was widened to about 4 squares, so that several karts fit side by side, and the start and the checkpoints were placed by hand. The script is not in the repository yet.

**Why 6 metres a square.** The game paints the whole track once as one hidden picture (`client/draw.js`, 2 pixels per unit). At 6 metres a square the campus is 64 by 62 squares, a picture of 4096 by 3968 pixels, about 65 MB. Smaller squares would make that picture too big. A test checks that the track stays within this size.

**The route** is driven clockwise as it looks on the map: east along the Walk of Founders, south past the Library and Navigator Park, round the gym to EDP Plaza, round the southern tip of the Grand Auditorium, north-west along the outer path, up the western gardens, a hairpin through the courtyards on either side of the CTT Student Hall, and back. About 1.1 km. Away from the driving line there is open ground, so a kart can leave the line and skip a detour, but it gains nothing: there is a checkpoint in each detour, and a lap only counts if every checkpoint was passed in order.

**Recognisable, not exact.** The roads are much wider than the real paths (24 metres), the CTT Student Hall is shorter than it really is because the hairpin cuts through its end, and north is not up. The Hovione Atrium and the KPMG Gallery are walls on this track; they are meant for an indoor track of their own, where the karts would be miniatures in a building of its real size.

## How do the buildings stand up?

Only in the picture. The driving rules know nothing about height: a wall is a wall, and karts bounce off it as before.

A track can come with the number of storeys of each square, in a second drawing of digits: `shared/tracks/campus-loop-storeys.js`, where 0 is flat and 2 means two storeys. One storey is 3.5 metres. When the race page opens, `client/buildings.js` turns every wall square with storeys into a block: a flat roof, and an upright side wherever the square next door is lower. For every picture, it works out which sides and roofs can be seen from behind the kart and where they go on the screen, with the same arithmetic that places the karts (`chasePoint` in `client/camera.js`): further ahead means higher up and smaller, and a side goes up by its height times the size at that distance. Sides that face away from the camera are left out, because the roof and the other sides hide them. A roof higher than the camera's eye is left out too: it would be seen from below.

**Walls without storeys** used to be flat, so a kart bounced off thin air. Now every such wall that touches open ground becomes a low bank (`barrierHeight` in the track's look): red and white blocks round the test oval, a clipped hedge round the campus.

**What is painted on a building** (`client/draw.js`): each side in a shade of white that depends on which way it faces, so corners can be seen, and on every storey a long band of dark glass, as the campus buildings have. Far-away buildings get no windows and fade into the haze.

**Painting in the right order.** Everything that stands is painted from the furthest to the nearest, so nearer things cover further ones and a kart behind a building disappears. The squares of the map make "furthest" easy to get right: seen from the camera's own square, a thing in a row of squares further away can never be in front of a thing in a nearer row, and within a row the same goes for columns. So the furthest row is painted first, and within a row the furthest column. Our own kart is painted last.

**Walls beside and behind the kart** (changed on 13 November 2026, after Catarina saw buildings beside her "cut off"). Two things were wrong. First, every wall was cut where its foot left the bottom of the screen. But a tall wall beside the camera is still in the picture long after that, so there was a gap between the end of the wall and the edge of the screen. Now each piece is cut where its top leaves the screen: a wall taller than the camera's eye is shown right up to the camera. Second, the rule that removes a wall standing between the camera and the kart was too wide: it also removed squares of a wall that the kart was merely driving close to. Now a wall is left out only if it crosses the line from the camera to the middle of the kart and is tall enough to hide the kart. The rest of the same straight wall behind the kart goes with it, so no loose slabs are left standing. A wall that the kart touches is never left out.

**From above**, buildings show their roofs, some with rows of solar panels, and every building and bank throws a shadow on the ground (`client/ground.js`).

**Where the storeys come from.** OpenStreetMap has the shapes of the buildings but no storey counts for the campus. The school's campus map (campustour.novasbe.pt) lists what is on each floor of each building, so a building counts the floors on which something of it is listed: for example Cascais Academic Hall 3, the Library 2. These are a first guess, to be checked on campus.

## What makes the campus loop look like the campus?

The layout is the real one (see above). On 12 November the picture was brought closer to the real place, from what can be read and seen online: the school's own campus tour, its 2018 campus map, newspaper reports and OpenStreetMap. No picture was copied: everything is our own drawing. What was taken from the real campus (`client/track-looks.js`):

- **White, flat-roofed buildings with long bands of dark glass**, and rows of solar panels on the roofs.
- **Pale stone paving** for the paths and squares, and green lawns.
- **The sea** on the horizon to the south and west, **the São Julião da Barra fort** with its red roofs and small lighthouse to the south, **the Bugio lighthouse** out in the river mouth, and the red roofs of Carcavelos inland.
- **Palms** on the side of the coast road, **pines** inland, young trees on the lawns.
- **Slim black signs** with the names of the places: Walk of Founders, Green Park, Library, Horizon Hall, Grand Auditorium, Student Hall.
- **The painted tunnel to the beach** at the southern tip.

What is still wrong or missing: every building looks the same (the real ones differ: the Auditorium is a windowless wedge, the entrance has a blank cream wall and white trusses), the storeys are a first guess, there are no stairs, ramps, pools or benches where the real ones are, and nobody has compared it with the place itself. Catarina has asked people to film the campus. Their videos are the next source.

## What happens when karts touch, and what do the banana peels do?

Both are rules, so they are in the `shared/` folder, the server runs them for online races, and a browser cannot change them.

**Bumping** (`shared/bumps.js`). Every kart is a circle. When two circles overlap, the karts are pushed apart along the line between their middles, and the parts of their speeds along that line are swapped, with half of the closing speed lost. So a kart hit from behind is shoved forward and the one behind is slowed, and a side swipe pushes both sideways. After a bump the wall rule runs again, so a bump can never leave a kart inside a wall. A bump never changes a lap count or a clock.

**Banana peels** (`shared/hazards.js`). In a race, a banana peel appears on the road from time to time: the first one four seconds after GO, then one every two to five seconds, up to a number that grows with the size of the track (five on the test oval, twelve on the campus loop). A kart that drives over one spins out for 1.2 seconds: its keys do nothing, it slides the way it was going and slows down, and the banana is gone. For one second after a spin it cannot be spun again. The rules do not turn the kart: the spinning is only drawn (`spinTurnOf` in `client/scene.js`), and after the spin the kart points where it pointed before.

**Where a banana may appear:** only on road, never next to a wall, never near the start line or the grid, never close to a kart or to another banana. One banana can therefore never block the road.

**Chance, but honest chance.** Where and when bananas appear comes from a number picked when the race starts, the "seed", and a small formula that turns it into a long row of numbers that look random. The same seed always gives the same bananas. Online, the server picks the seed and never tells anyone, and no message from a browser can place or remove a banana. That also lets the tests give a seed and know exactly what will happen.

What must NOT happen, each with a test: karts passing through each other at the highest speed, a bump creating speed out of nothing, a kart inside a wall after a bump, a banana on grass or in a wall or on the grid or on top of a kart, a spinning kart being steered, a second banana making a spin longer, a banana being hit during 3, 2, 1 or by someone who is only watching, and a browser message that places or removes a banana.

## How is a kart drawn, and how does a player choose its colours?

**A kart is a small model, not a picture** (`client/kart-shape.js`): boxes, wedges and wheels with real positions in space, about 22 units long, 17 wide and 16 high, with a driver who has a body, arms on the steering wheel and a helmet. `client/kart-paint.js` paints it from any direction: it leaves out the faces that point away from the eye, paints the furthest parts first, and makes each face brighter the more squarely it faces the sun. So a kart turns smoothly, its front wheels and its driver turn with the steering, and the same model is used in all three views. Before 12 November a kart was four flat pictures and jumped from one to the next.

**The colours come from a "look"**: the colour of the kart, of the helmet and of the driver's suit. In the menu, "Your kart" lets a player pick each from a short list and shows the kart turning round in the chosen colours. The choice is kept in the browser.

**A choice is three small whole numbers, never a colour or a text** (`shared/kart-looks.js`): "kart colour number 6, helmet number 2, suit number 1". That matters online. The browser tells the server its choice, and the server passes it on to the other players. A number from a known range cannot carry anything harmful. A free text could. The server checks each number and drops anything else that came with it, and a browser that sends something that is not three numbers in range is sent away. Each of those has a test. A player who never chose gets the colours of their starting place, as before.

Online, the name of a signed-in player is shown above their kart.

## How are laps counted, and can a player cheat?

A track has checkpoints: invisible rectangles across the road, in driving order. The first one is the finish line. The game keeps one count for each kart: checkpoints passed.

**The karts start behind the line** (changed on 12 November at Catarina's request: before, they started just after it, so there was no start line ahead of them). The grid is two columns of four places behind the line (`shared/grid.js`). Crossing the line for the first time starts lap 1 and does not count as a lap. The clock still starts at GO, so the time of lap 1 includes the short run to the line.

- Driving into the next checkpoint adds one.
- Driving back into the checkpoint before the last one takes one away.
- Driving into any other checkpoint changes nothing.

A lap is complete each time the count reaches a new full round. These cannot complete a lap, and each has a test: skipping a checkpoint, taking them in the wrong order, driving the wrong way round, going back and forth over the finish line, and reversing over the finish line to count the same lap twice.

Race time is counted in steps of the game, 60 per second, not with a clock. A finish time is therefore exact and the same on every computer.

Our first version of this rule had a mistake: a kart driving the wrong way round was given a lap after about three rounds. A test that drives a "robot" kart the wrong way round the test track found it, and the rule was rewritten as described above.

## Where is data stored, and what exactly is stored?

In a Postgres database kept by a company called Neon, in Frankfurt, on its free plan. Everything else the server knows, such as the karts in the online room, lives only in its memory and is gone when it restarts.

**What is stored today:** four tables.

| Table | One row for | What is in a row |
|---|---|---|
| `server_starts` | each time the server started (the newest 50 are kept) | a number, and the date and time. It exists to prove that the server can write to the database and read from it |
| `players` | each account | the user name as typed, the same name in small letters (so "Ana" and "ana" cannot both exist), the scrambled password, how many wrong passwords in a row, locked until when, and the date joined |
| `sessions` | each browser that is signed in | a scrambled copy of the ticket, whose it is, and when it stops working |
| `race_results` | each finished online race of a signed-in player | the player, the track, the mode ("online"), the race time and the fastest lap in steps, the finishing position, and the date |

The only personal data is the user name a player chose. There is no email, no real name and no readable password. Deleting an account deletes that player's rows in all three tables: the database does that by itself, because sessions and results are tied to their player.

**Stored in each player's own browser, not by us:** the camera view chosen in Settings, and that player's best practice race time and best lap on each track. They never reach our server. Clearing the browser's data deletes them. The cookie that keeps a player signed in is also in the browser, but the page's code cannot read it.

**What will be stored later:** progress such as trophies and unlocked characters (section 6 of `PROJECT_BRIEF.md`).

**How the server reaches it:** through a secret address that includes a password, the setting `DATABASE_URL`. It is in two places only: Render's Environment page, and a file called `.env` on Catarina's laptop, which git ignores. It is not in the code, and the code never prints it. On the first day the address was once pasted into a chat with the coding agent by mistake. The password was changed in Neon straight away, before anything used it.

**How to see it working:** the address `/database-check` on our site answers with the number of starts recorded and the time of the latest. Without a database it answers "The database is not set up on this computer", and when the database cannot be reached, "The database could not be reached".

**The code talks to the database safely.** Values are never glued into the text of a question. They are handed over separately, which is what stops the classic attack on databases (SQL injection). The one name that is written into a question, the table's, is checked to be small letters and underscores only. All the questions about players, sessions and results are in one file, `server/store.js`.

**Tests never touch the real players.** The tests that use the real database work in tables whose names start with `test_` and remove them at the end. The code that removes tables refuses to run without such a prefix.

## What do the tests cover, and what do they miss?

We run them with `npm test`. GitHub also runs them by itself on every pull request and on every change to `main`. There are 1,275 tests today, plus 23 that only run against the real database. They take about 40 seconds, most of it online races that run in real time.

**Covered today**

- A race driven to its end, in `tests/room-race.test.js` (ten new tests on 13 November). The host's start is refused while a race is being driven and changes nothing, the race is over exactly two minutes after the first finish, a second finish gives no extra time, a racer who is out of time cannot finish however long they hold the gas, a race nobody finishes ends at the ten-minute limit, the host can start the next race afterwards, and time limits that are not whole numbers above zero are refused.
- The missed checkpoint, in `tests/checkpoints.test.js`. Thirteen tests. One drives the exact line Catarina drove on the campus loop, with the real lap rules: past the CTT Student Hall, onto the finish line, no lap, a warning that names checkpoint 5, and the lap counting once the kart has gone back through it. Others check that a clean lap never warns, that rolling back into the checkpoint before is not taken for a missed one, and that the light stands only on open squares.
- Places and results, in `tests/standings.test.js`. Eighteen tests: finished karts first by time, then by checkpoints passed, then by distance to the next one, two karts with the same time sharing a place as on the server, and a list of karts with strange numbers that must not break the page. Six of them are for the results board: finishers in the order of arrival with how far behind they were, then the karts that ran out of time by who was closest to the finish, a race nobody finished, and a list with things in it that are not karts.
- Changing a password, in four files. `tests/accounts.test.js` (eleven tests, with a pretend clock): the new password signs in and the old one does not, every other browser is signed out and the one that asked is not, and the refusals: a wrong or missing current password, a new one that breaks the rules, the same one again, the lock after five wrong tries, and another player's ticket and password. `tests/api.test.js` (eleven, with real requests): the same through the server, nobody signed in, a request from another website, a GET, a form, more than ten tries a minute from one computer, and that a change counts twice as password work. `tests/store-contract.js` (two more checks, run on the pretend store and on the real database): one player's password is replaced and nobody else's, and one player's other sessions are removed and nobody else's. `tests/account.test.js` (eleven): what the form says before anything is sent, where each refusal is shown, and that neither password is ever in anything the page code gives back.
- Walls beside and behind the kart, twelve new tests in `tests/buildings.test.js`: a tall wall beside the kart reaches the edge of the screen, nothing is filled below the screen, a tall block between the camera and the kart is left out together with the rest of its straight wall, and what must NOT be left out: a wall the kart touches, a low block, a block off to the side, a separate building in the same line.
- Three new tests in `tests/page-safety.test.js` for two more rules the server sends with every answer: always use https (only said to a visitor who already came over https), and do not tell other sites which page a visitor came from.
- Eight older tests were changed on 13 November, because the rule they pinned was changed on purpose. Six pinned "the host can start a new race in the middle of one" or "a race never ends while someone is still driving". One pinned the exact list of what the server sends about a kart, which gained one word, "passed". One pinned the page telling a finished host to press Enter during the race. Each has a comment that says what it said before, and they are listed in `docs/diary/catarina.md` for the team to check.
- To check that the new tests really guard the rules, the new code was broken on purpose in 30 ways, one at a time (for example "the host can start during a race", "a racer who is out of time can still finish", "a second finish gives more time", "walls are cut at their foot again", "a wall the kart touches is left out", "the warning forgets itself"). Twenty-eight made a test fail at once. Two did not: "a racer who is out of time can still drive" (the test kart drove into a wall and stood still there anyway) and "the light stands on walls too" (no checkpoint of our two tracks crosses a wall, so the test had nothing to check). Both tests were made stricter, and then every one of the 30 made a test fail. In the evening the results board, the two-minute limit and the password change were broken in 21 more ways (for example "the current password is not checked", "the new password is stored unscrambled", "a message can name another player's account", "other browsers stay signed in"). Twenty made a test fail at once. One did not, "no limit per computer on changing passwords": there was no test for it. One was written, and then it failed too.

- The starting grid and the start behind the line, in `tests/grid.test.js`. Sixty-two tests: all eight places are on road, behind the line and clear of the walls on both tracks, the first crossing of the line starts lap 1 without counting as a lap, and driving backwards from the grid or back and forth over the line still never earns a lap.
- Bumping, in `tests/bumps.test.js`. Fifty-one tests: a kart hit from behind is shoved on and the one behind slowed, a side swipe pushes both, and what must not happen: passing through each other at top speed, speed out of nothing, a kart inside a wall or outside the map after a bump, a changed lap count or clock, and broken arithmetic when two karts are on exactly the same spot.
- Banana peels, in `tests/hazards.test.js` (eighty-five tests) and `tests/room-bananas.test.js` (thirty-eight, in a room): where one may appear and where never, the spin, the second banana that must not lengthen it, the same seed always giving the same bananas, none during 3, 2, 1 or while the room is open, and no message from a browser that can place or remove one.
- The kart as a shape, in `tests/kart-shape.test.js`. Twenty-five tests: every face of every part points outwards (one that pointed inwards would vanish from some directions), the kart stands on the ground and is the size the driving rules assume, steering turns only the front wheels and the driver, a look that is incomplete or holds anything but plain colours is not trusted, and the painter agrees with the camera about where every point lands. One of these tests found the wheels floating a little above the ground.
- The race camera, the countdown picture, the route and the sky's directions, in `tests/race-camera.test.js`. Thirty-nine tests: the horizon is on the screen, further ground is higher and smaller on every row, the camera comes down without ever going up again, the start lights are never green before GO, "wrong way" is not set off by a standing, spinning or crossing kart, and a spin is drawn ending on whole turns.
- The looks of the tracks, in `tests/track-looks.test.js`. Twenty-three tests: every colour is one the canvas can use, the painted route runs over road and through every checkpoint in order, no tree stands on the road, beside it or on a building, the arrow boards point the way the bends turn, and banks appear exactly where a wall touches open ground.
- Choosing kart colours, in `tests/kart-choice.test.js` (seventeen tests) and `tests/kart-look-online.test.js` (eighteen, some over real connections): only three whole numbers in range are a choice, a saved choice that was changed by hand is ignored, the server drops anything extra, a player cannot paint someone else's kart, colours change nothing about the driving, and a browser that sends a colour written out, a name or a number out of range is sent away.
- To check that these tests really guard the rules, the new code was broken on purpose in 68 ways, one at a time (for example "bananas can appear on grass", "a spinning kart can still steer", "the first crossing of the line counts as a lap", "green light before GO", "the server passes on any look"). Every one made at least one test fail.
- Five older tests were changed, because the rule they pinned was changed on purpose. Four pinned the old start (a kart just after the line, a hard-coded start position, one robot's path from it, the start dot on the small map) and now pin the new one. One pinned the exact list of what the server sends about a kart, and that list gained one word, "spin". Nothing else was removed or loosened. They are listed in `docs/diary/catarina.md` for the team to check.

- The account rules in `server/accounts.js`, in `tests/accounts.test.js`. Forty-seven tests with a pretend store kept in memory and a pretend clock: signing up, names and passwords that must be refused, signing in whatever capitals the name is typed in, the same refusal for a wrong password and for a name nobody has, the lock after five wrong passwords and its end ten minutes later, sessions that stop after seven days, signing out, deleting an account, results that cannot be real (zero steps, a lap longer than the race), and the leaderboard: ten rows, one per player, own rank outside the ten.
- The account addresses in `server/api.js`, in `tests/api.test.js`. Fifty-three tests that send real requests to a real copy of the server. More than half are refusals: a request started by another website, a form instead of our format, a message that is too long or not one object, the wrong kind of request, an address that does not exist, a made-up or damaged cookie, deleting someone else's account, too many tries from one computer, too much password work in total, a track that does not exist, and every address on a server without a database. One test goes through a whole visit with the same helper the pages use, and one uses the real, slow password scrambler.
- Scrambling passwords, in `tests/passwords.test.js`. Nine tests: the password is not in what is stored, the same password scrambles differently each time, only the right one matches, and a damaged stored form is refused without breaking.
- The database questions in `server/store.js`. One list of checks (`tests/store-contract.js`) is run on the pretend store (`tests/store.test.js`, twenty tests) and on the real database (`tests/store-live.test.js`, eighteen tests, in tables that start with `test_`). It includes two sign-ups for the same name at the same moment, a name that looks like a database command, and a deleted player's sessions and results going with them.
- The finishing order in `server/room.js`, in `tests/room-finishes.test.js`. Twelve tests: positions in the order of crossing the line, two racers on the same step sharing a position, each finish handed out once, and what is never listed: laps driven outside a race, watchers, racers who left.
- Saving results over real connections, in `tests/online-accounts.test.js`. Twenty-two tests, with whole races on a short straight test track: a signed-in racer's time is saved and they are told, two racers are each saved under their own name, nothing is saved for a guest or for free driving, a browser that sends a made-up result is sent away, the player is told when the database fails, the names of signed-in players are sent to their room only, and each track has its own room.
- What the online page shows about accounts, in `tests/online-page.test.js`. Twenty-three tests: the messages it accepts, the line about your account, the names of the others, and the short name it puts in the address of its connection.
- The pages under the browser's rule, in `tests/page-safety.test.js`. Thirteen tests: the rule comes with every answer, allows nothing written inside a page and nothing from other sites, and every page and script in `client/` keeps to it.
- The new menu, in four files. `tests/track-list.test.js` (twenty-three tests): what a track's card says and what the small map paints. `tests/leaderboard.test.js` (thirty-seven): which rows are shown, the podium, your own row, the sentence for each state, and an answer that arrives too late being dropped. `tests/account.test.js` (forty-five): the words in the account corner, what is wrong with a form before it is sent, every refusal the server can give, and that a password is never kept. `tests/menu-page.test.js` (twenty-five): the parts of the page the code needs are there, the text colours can be read against their background, and no code turns text into HTML.
- The game with pretend accounts, in `tests/start-pretend.test.js`. Four tests that start `npm run start:pretend` as a program of its own: it works without a database, never uses the real one, forgets everything after a restart, and only listens on the laptop itself.
- To check that these tests really guard the rules, we broke the new code on purpose in 26 ways, one at a time (for example "accept requests from other websites", "the lock is not enforced", "tickets never run out", "a guest's result is saved"). Every one made at least one test fail.

- The campus loop, in `tests/campus-loop.test.js`. Eight tests: the game accepts it and it is small enough to paint, the start is on the road just after the finish line, every checkpoint reaches a wall at both ends, a robot driver drives all 3 laps without ever being inside a wall, and three things that must not count a lap: skipping the detour round the Grand Auditorium, skipping the hairpin round the CTT Student Hall, and driving the wrong way round. We broke the track on purpose in eight ways (a checkpoint too short, a wall across the road, the start in the wrong place or pointing the wrong way, a detour's checkpoint removed, and others). Each made a test fail.
- Choosing the track of a single race, in `tests/track-choice.test.js`. Twelve tests: the address chooses the campus loop or the test oval, no choice gives the test oval, and a name that is not a track is refused, including names that every JavaScript object has, such as `constructor` and `__proto__`, which a careless check would accept. Two of the tests ask a real copy of the server for the race page and the new files.
- The main menu, in `tests/menu.test.js`. Seven tests with a real copy of the server: the main address opens the menu and not the race, Single race and Online lead to the right pages, the Cup is shown but cannot be clicked, the Leaderboard and Settings buttons are there, the race page still has the track and runs the race, and both pages lead back to the menu.
- Settings kept in the browser, in `client/storage.js` and `client/settings.js`. Twelve tests with a pretend storage: a choice is remembered, a camera view that does not exist is refused when saving and ignored when read back (for example edited by hand), broken saved text is ignored, and a browser that refuses storage does not break anything.
- Best times kept in the browser, in `client/records.js`. Fifteen tests: the first finished race is kept, only a faster time replaces it (an equal one does not), the best lap is kept on its own, each track has its own times, and an unfinished race or impossible times (a lap ending before the one before, negative, not whole, not numbers) are never recorded. Saved times that are not sensible are ignored. We broke this code on purpose in three ways. Two made tests fail. The third, removing one of two checks on the track name, changed nothing, because the second check still refuses what the first would have let through.
- The database code in `server/db.js`. Fifteen tests with a pretend database that writes down every question it is asked: the right questions in the right order, an answer reused for ten seconds, a failure not mistaken for an answer, a pause of three seconds before asking an unreachable database again, and an unsafe table name refused. Five more tests in `tests/server.test.js` check the `/database-check` address, including that an error from the database never reaches the visitor.
- The real database. Five tests in `tests/db-live.test.js`, run with `npm run test:database`. They write to a table of their own and remove it afterwards. They are skipped on GitHub, because the database address is a secret that GitHub does not have.
- The room and the message checks in `server/room.js` and `server/messages.js`. Thirty-two tests, without any network: joining and leaving, a full room, only your own kart moves, a kart moves online exactly as it would in practice, and ten tests of messages a browser might send, most of which must be refused.
- The online race start in `server/room.js`, in `tests/room-race.test.js`. Forty-six tests, without any network, three of them for reading the "start" message: who the host is, the host starting a race, six ways a start must be refused, nothing moving and no clock running during the countdown, everyone's clock starting on the same step, no head start for holding the gas early, R refused during a race, joining during a race (no kart, keys ignored, in the next race), leaving during a race, and the end of a race. For the end, two small "robot drivers" really drive three laps in the room. We broke these rules on purpose in eight ways. Seven made tests fail. The eighth, moving the hidden karts of people who are watching, changed nothing a player could ever see, because those karts are put back on the grid before they are shown again.
- The race start over real connections, six more tests in `tests/online.test.js`: the host's start reaches every browser, a start from someone else is ignored without sending them away, a browser cannot claim to be the host inside its message, and a browser that joins during a race is told it is watching.
- What the online page says about the race, in `client/race-view.js`, and the Enter key. Twenty-nine tests, including a strange "race" part from the server that must not break the page, that only the host is ever told to press Enter, and only once the race is over.
- Online play in `server/online.js`. Twenty-two tests with real live connections to a real copy of the server on the computer running the tests. Two pretend browsers see each other's kart move. Thirteen tests are refusals: messages that are not understood, data that is not text, a message far too long, too many messages, a full room, a wrong address, another website, a player claiming to be someone else, and a "deaf" browser that breaks a rule and then never answers the server's goodbye.
- Smooth online movement and the connection notice in `client/net.js`. Thirty-four tests: a kart that was put back on the grid is shown there at once instead of sliding across the track, karts glide between updates, hold still when updates stop, are not thrown off by a late or repeated update, and the line under the track warns when the server has gone quiet.
- Tracks and walls in `shared/track.js`. Thirty-five tests: reading a track, twelve kinds of badly drawn track that must be refused, the ground at a spot, and bouncing off walls from every side and in a corner.
- Laps in `shared/laps.js`. Twenty-seven tests. Fourteen of them are laps that must not count.
- Whole races in `shared/race.js`. Thirteen tests. A small "robot driver" written in the test file steers a kart round the test track: three whole laps, the wrong way round, and flat out into a wall.
- The countdown in `shared/countdown.js`. Twenty-three tests: what it says at each moment, when the race begins, and step counts that must be refused. Four are things that must not happen before GO: the kart moving or turning with keys held, the clock running, and a head start for holding the gas early. One test checks that a race after the countdown is exactly the race without one, three seconds later. We broke this rule on purpose in four ways, and each made tests fail.
- The driving rules in `shared/physics.js`. Thirty-four tests: speeding up, top speed, coasting, braking, reversing, steering, grip, grass, and bad input that must be refused or ignored (keys that are not exactly "pressed", scores that are out of range, a driver with a missing score). They compare behaviours, such as "more acceleration reaches top speed sooner", instead of exact numbers, so we can tune the numbers without breaking the tests.
- `clamp` in `shared/numbers.js`, which keeps a number between a lowest and a highest value. Ten tests: six for normal use and four for bad input that must be refused.
- The server in `server/app.js`. Nineteen tests. Ten check what it must do: send the page, its style and code, the game rules and the health check. Nine check what it must refuse: missing pages, requests that change things, file kinds not on the list, files outside the `client/` and `shared/` folders (thirteen different ways of writing such an address), the server's own code and the tests, and two kinds of broken address.
- The parts of the browser code that need no browser, in `client/format.js`, `client/keyboard.js` and `client/hud.js`. Twenty-seven tests: a race time and lap times as text, arrow keys into gas, brake, left and right, R to start again, V to change the camera, and letting go of every key when the player switches to another window.
- Buildings standing up, in `tests/buildings.test.js`. Twenty-eight tests (twelve of them added on 13 November, see the top of this list): a block gets four sides and a roof of the right height, a taller block next to a lower one stands only the part that sticks out, walls with 0 storeys stay flat, bad storeys are refused (storeys on a road square, a letter, a row too short, wrong sizes), and from behind the kart only the sides facing the camera are shown, every side stands up, a further building is drawn smaller, and nothing behind the camera or below the bottom of the screen is drawn. We broke `client/buildings.js` on purpose in five ways. One was missed at first, because the test for the bottom of the screen was too loose; it was tightened, and then every one made a test fail.
- The arithmetic of the camera in `client/camera.js`. Thirty-five tests: the view from above looks ahead, stops at every edge of the track and always keeps the kart on screen, the camera glides without overshooting, and in the tilted view ground further ahead lands higher on the screen and is drawn smaller.

The server tests start a real copy of the server on the computer running the tests and send it real requests.

To check that the tests really guard the rules, we broke the code on purpose in 57 different ways, one at a time (for example "grass is as fast as road", "driving backwards is not counted" and "other websites may connect"). In the end every one made at least one test fail. One did not at first: accepting an update that arrives late. The test for it was too weak, and it was tightened.

**Not covered today**

- The work of 13 November tried by people. The walls beside the kart, the yellow light and the results list were looked at in the agent's browser as single pictures, on a laptop. In the real online page, pressing Enter in the middle of a race did nothing, as it should. Nobody has driven a whole online race to the results list by hand, nobody has waited out the two minutes after the first finish with real players, and the missed-checkpoint warning was only set off in the tests, not by a person in the page. None of it has been on the live server yet.
- Whether two minutes after the first finish is the right length. It is to be tried with real players.
- The results board and the password change with real players. In the agent's browser, on a laptop with pretend accounts: a robot drove a whole online race in the real page, the notice "The race ends in 2:00" came when it finished, the board came up by itself when the race was over, the time was saved, and Enter started the next race and took the board away. A board with five made-up lines was looked at as one picture. The password was changed through the real form with the real, slow scrambling: afterwards the old password was refused and the new one accepted. Nobody has seen the board move, and two people have not finished a race against each other.
- The password change on the live server and its real database. On the real database only the two new questions were tried, in tables that start with `test_`.

- How the new race view looks in motion, and whether it runs smoothly. The files that paint (`client/draw.js`, `client/ground.js`, `client/sky.js`, `client/props.js`, `client/kart-paint.js`, `client/kart-panel.js`) need a real page and have no tests of their own beyond the arithmetic they share. On 12 November they were looked at in the agent's browser as single pictures: both tracks in all three views, the start with its lights, karts from every side, every tree and sign, the "Your kart" panel, three karts on the online grid. That browser was not on the screen, so nothing was seen moving.
- Bumping, bananas and the "wrong way" warning tried by a person. In the real page a robot drove a race with bananas and spun once, reversing down the straight brought up "Wrong way!" and driving forwards again took it away, and two pretend players bumped the page's kart forward on the online grid. Nobody has held the keys.
- The new work on the live server. It was only run on a laptop.

- Accounts on the live server. Until this work is merged, the live server has no accounts, and the real tables `players`, `sessions` and `race_results` do not exist yet: the server creates them the first time it needs them. On the real database only tables starting with `test_` were used, from a laptop on home Wi-Fi. After the merge, someone has to create an account on the public link, finish an online race and see the time on the leaderboard. `docs/two-laptop-checklist.md` has the checks.
- Accounts used by real people. On 12 November the whole visit was done once in the agent's browser, on a laptop, with pretend accounts kept in memory: create an account through the menu, join the online room, a small robot drove three laps in the real page, the page said "Saved to the leaderboard: 1st place", the Leaderboard panel showed the time, then sign out, a wrong password, sign in, and delete the account. Nobody has typed a password by hand yet, and two signed-in players on two laptops have not raced each other.
- How long the password scrambling takes on the live server, and whether a burst of sign-ins there can be felt in a race.
- Whether the limit per computer works as intended behind our hosting company's network, which decides what address we see for a visitor.
- The new menu in Firefox, Safari, on a real phone and with a screen reader. It was looked at in one browser, at laptop, tablet and phone sizes. How smooth its moving parts are could not be judged there.

- How the standing-up karts look in a real race. Choosing which side of a kart to draw is tested. The pictures themselves were looked at once, in a made-up scene with seven karts, and not yet with real players: they were added after the three-player test.
- The database on the live server, beyond one look: `/database-check` on the public link answered `"ok":true` with 3 starts on 10 November. On a laptop it works: with the laptop on a phone hotspot, the five tests against the real database passed, and the real server recorded a start, was stopped and started again, and then reported two starts. On the university's student Wi-Fi the same five tests fail, because that network does not let database traffic through. Nothing checks the live server's database automatically.
- The five real-database tests are never run by GitHub, which does not have the database address. They only run when someone runs them by hand, on a network that allows it.
- Online play between two real laptops on two different internet connections. The tests use pretend browsers on one computer, where messages arrive instantly. Delay, uneven arrival and lost connections are checked by hand with `docs/two-laptop-checklist.md`. It was run once, on 10 November, by three players on three laptops on the live server: everyone saw the others drive. The result of each single check was not written down, nor whether the laptops were on different internet connections, so the checks for a lost connection and for a new version going online are still unconfirmed.
- Anything that only happens on the real internet. We have one example already. On the first day online, a browser that broke a rule was not removed from the live server, although the test for exactly that passed on one computer: the server was waiting for the browser to answer its goodbye, and through Render's network the answer did not come. It is fixed, there is now a test with a browser that never answers, and the fix was checked on the live server. The lesson is that passing tests show the code does what the tests imagined, not that it works everywhere.
- How the standing buildings look. They were looked at in a browser without a screen, on the Walk of Founders and down the east side, and the test oval still has flat walls. Nobody has driven past them yet. The storeys are a first guess from the school's campus map, not measured.
- The campus loop driven by a person. A robot drove it, and it was looked at in a browser without a screen: the three views draw it, and the small map fits in its corner. In that browser the view behind the kart ran at 30 pictures a second on the campus loop, against 60 on the test oval. That browser has no graphics card, so how smooth it is on a real laptop is not checked yet.
- The "server has gone quiet" notice appearing for real. Its wording and timing are tested, but on one computer a cut connection is noticed at once, so the notice never shows there.
- How the driving feels. No test can say whether a kart is fun to drive. That needs a person at the keyboard.
- The files that put the menu's panels on the page (`client/track-panel.js`, `client/leaderboard-panel.js`, `client/account-panel.js`, `client/settings-panel.js`) need a real page and have no tests of their own. They were checked in a browser on 12 November, in every state: loading, empty, full, not available, each refusal.
- The moment a finished single race is recorded. The few lines in `client/main.js` that call the records need a real page. Earlier checks, on the first menu: The menu, both panels, the Cup refusing a click, a saved camera view being used by the race page, and a saved best time appearing in the Leaderboard were checked in a browser on 11 November. A whole race driven to the finish through the new page, with "New best time!" and the time then in the Leaderboard, was checked by hand by Francisco on his laptop the same day. Nothing checks this automatically.
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

**The database is asleep, slow or cannot be reached.** The game keeps working: the pages, the practice race and the driving in online play do not use the database. What stops for that moment is accounts. Signing in, signing up and the shared leaderboard answer "Accounts could not be reached just now. Try again in a moment." A browser that connects to an online race is let in as a guest. A signed-in racer who finishes is told "Your last result could not be saved", and the race goes on for everyone. That one result is lost: the server does not try again later. The tables for accounts are created the first time they are needed, so a database that was asleep when the server started is not a problem. The details of a database error only ever go to the server's own log. Each of these has a test with a pretend database that fails.

The server does not wait for the database when it starts. `/database-check` answers "The database could not be reached. Try again in a moment." An unreachable database takes ten seconds to give up on, so after a failure the server does not ask again for three seconds, and visitors in that time get the same answer at once. This was tried for real on 10 November, when the university Wi-Fi blocked the database: the server started, sent the game, and answered the check with that message.

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
- **Signing in uses a cookie the page cannot read, not something kept by the page's own code.** The other common way is to hand the page a token to keep in the browser's storage. Any script running in the page could then read it. With our cookie, even a mistake that let someone's text run as code in a page could not steal a sign-in.
- **The account rules, the database questions and the internet side are three files.** `server/accounts.js` decides, `server/store.js` asks the database, `server/api.js` reads requests and sets the cookie. The rules can then be tested in a fraction of a second with a pretend store kept in memory and a pretend clock that jumps ten minutes or seven days. So that the pretend store cannot drift away from the real one, one list of checks (`tests/store-contract.js`) is run on both.
- **Passwords are scrambled with `scrypt`, which comes with Node.js.** No library to add, and it is one of the functions recommended for passwords: slow, and heavy on memory, on purpose.
- **Results are written by the server at the moment a racer crosses the line.** There is nothing for a browser to send, so there is nothing to fake.
- **The browser is told to run only our own files.** With every answer the server sends a rule (a "Content-Security-Policy") that allows scripts and styles only from files on our own site. It is a second lock. The first is that our pages put every text on the screen as text, never as HTML. A test reads every page and script in `client/` and fails if one breaks either rule. Since 13 November two more rules go out with every answer: a browser that came over https is told to use only https for this site from now on, and browsers are told not to say to other websites which of our pages a visitor came from.
- **The room knows nothing about the internet.** `server/room.js` only keeps the karts and moves them. `server/online.js` does the connections. The room can then be tested without any network, and the rules for "who may do what" sit in one small file.
- **Online, the browser shows the past.** Showing other karts a tenth of a second late lets them glide smoothly between updates. The alternative, guessing where they are now, makes them jump back when the guess is wrong.
- **A browser that sends anything unexpected is sent away at once.** Our own page never sends such a message, so there is no reason to be patient with one. Its kart leaves the track immediately, and the server cuts the connection itself after two seconds instead of waiting for the browser to agree.
- **The server only sends file kinds on a short list, and only from two folders.** A file we forget somewhere cannot leak by accident.
- **No drawing library.** The track and the kart are drawn with the canvas that is built into every browser. All the drawing is in two files, `client/draw.js` and `client/camera.js`. On 11 November the team chose to stay with this rather than switch to a game library such as Phaser: switching would have cost days, our tilted view is our own code either way, it keeps us at three libraries, and we can explain every line. Phaser would have made effects such as sparks and animations quicker to add.
- **The browser code is split by job.** Keys, camera, drawing, time as text and the race loop each have their own file, and none of them decides how a kart moves. That is why adding two new camera views changed nothing in the rules or their tests.
- **The server's settings for Render are a file in the repository** (`render.yaml`), not something typed into a web form. Anyone can read how the live server is set up, and changes to it go through a pull request.

## What are the known limits, and what would we change next?

- On the university's student Wi-Fi a laptop cannot reach the database. The connection opens and then nothing comes back. The live server is not on that network. For database work on a laptop we need a phone hotspot or home Wi-Fi, or we switch to Neon's own library.
- There is no email. An account is a user name and a password, so nothing proves who someone is, anyone can take any free name, and a forgotten password cannot be reset: that account can no longer be used. A player who knows their password can change it (since 13 November). Email needs an outside service and a new secret key, which the team has not chosen yet.
- Anyone can make as many accounts as they like. The limits on sign-ups are per minute, to protect the server, not per person.
- The limit per computer goes by the address our hosting company tells us a visitor came from. Everyone on the campus Wi-Fi shares one address, so the limits are set for a whole classroom, and someone who really wanted to could pretend to come from many addresses. Two things do not depend on it: the lock on one account after five wrong passwords, and the limit on password work in total.
- Anyone who knows a user name can lock that account for ten minutes by typing five wrong passwords. That is the price of the lock, which is what stops someone from guessing a password.
- How long the password scrambling takes on the live server is not measured yet. On a laptop it is under a tenth of a second. The free server is much slower, so the limit on password work in total (60 a minute) is a first guess.
- A result that could not be saved because the database did not answer at that moment is lost. The player is told.
- The leaderboard shows the fastest times ever, with no date and no way for us to remove a time except in the database itself. A player who drives online in two tabs appears in a race twice.
- Guests can drive in online races. Their karts look the same as everyone else's. A signed-in player's name is shown above their kart; a guest has no name.
- There is no profile page and no saved progress yet (trophies, unlocked characters).
- Online, your own kart reacts a moment late: your key press travels to the server and the result travels back, and then the picture is a tenth of a second behind. On one laptop this is small. Over the internet it will be bigger. The fix is "prediction": the browser moves your own kart at once with the shared rules and corrects it when the server answers. The rules were written to make that possible, but it is not built.
- Online has one fixed room for each track and no rooms with codes. Anyone with the link can join, signed in or not. The results board at the end of a race (since 13 November) names guests only by their player number, "Guest 3".
- On the campus loop a kart can still drive past checkpoint 5 without touching it, at the hairpin round the CTT Student Hall. The game now shows where the checkpoint is and says when it was missed, but the player still has to drive back for it. The better fix is in the track itself (a hedge that closes the short cut, or no hairpin). That is for Rodrigo, who owns the track, once the videos from campus are here.
- The warning for a missed checkpoint only comes when the kart reaches a later checkpoint, which on the campus loop is the finish line. A warning at the moment of driving past would be kinder.
- The place shown during a race ("2nd of 4") is worked out by the page from the checkpoints passed and the distance to the next one. On a long stretch between two checkpoints it can be a little off. The order at the finish is the server's.
- Bumping and bananas were tried by robots in the tests and by pretend players in the agent's browser, never by people. How hard a bump is, how long a spin lasts and how many bananas there are are first guesses, to be tuned by playing (the numbers are named at the top of `shared/bumps.js` and `shared/hazards.js`).
- A kart that spins into a wall can end up standing nose to the wall. The player then has to reverse, as after any crash.
- Bananas make a race partly luck, and the shared leaderboard does not know that: a time set in a race with a lucky run of bananas counts the same as any other.
- Two players can choose the same colours. Online, names above the karts and the dots on the small map tell them apart only if they are signed in.
- Every kart has the same shape and every driver wears a helmet. Characters that look like particular people, which the team wants, are not built: the model was made so that parts of it can be swapped, but only the colours can be chosen today.
- The host is simply whoever has been in the room longest. Since 13 November they can no longer start a new race in the middle of one. The other side of that: nobody can stop a race early. If everyone agrees to start over, they have to wait for the end: two minutes after the first finish, or ten minutes after GO if nobody finishes, or until every racer has left the page.
- A racer who is far behind when the first kart finishes may not make it in the two minutes that are left, and then gets no result. The results board still shows them, by how close to the finish they were.
- The results board covers the middle of the picture until the host starts the next race. It cannot be put away.
- On the results board a guest is named by their player number, "Guest 3", and two guests with the same colours look the same.
- Someone watching always follows the kart with the most laps. They cannot choose which kart to follow. The line under the track still tells them their own kart's colour, although that kart is not on the track.
- The online race start was checked by hand in two tabs of one browser on one laptop, not yet with real players on different laptops. `docs/two-laptop-checklist.md` has the checks for that.
- There is no boost for pressing the gas at the right moment of the countdown, and no sound.
- A very short key tap, shorter than one picture on the screen, is not sent to the server.
- The limit of 60 messages a second is per connection. Nothing yet limits how many connections one computer may open, beyond the room being full at eight.
- The numbers in the driving rules are first guesses. No person has driven the kart for long yet, so they will change with playtesting.
- The driving rules have no drifting, sand or sea yet.
- Buildings are blocks of 6-metre squares, so their corners are steps, like the walls, and every building is painted the same way: white with bands of glass. The real buildings differ from each other.
- Trees, signs and bananas are flat pictures that always face the camera. That is fine for a tree. The rules do not know the trees, so a kart that leaves the road can drive straight through one on a lawn. Trees never stand on the road or right beside it.
- Things are painted furthest first, by the square of the map they stand on. A wide thing can stick out of its square, so now and then a piece of a kart or a tree is covered by a wall beside it for a moment. Real 3D drawing would sort this out exactly, but needs a 3D library.
- A wall between the camera and our own kart is left out of the picture, so a building right behind the kart can seem to vanish, and the camera can end up inside a building, looking out through its walls. A camera that moves closer to the kart instead of going through a wall would be better. That is not built.
- Trees and lamps beside the road fade away as they pass the kart, so that they do not vanish in one go. Close to the kart they are see-through for a moment.
- Buildings far ahead appear at the top right of the screen, where the small map in the corner can cover them.
- The race view was looked at in the agent's browser, which was not on the screen: single pictures, not movement. Whether it runs smoothly on a normal laptop, and how the camera's swing feels, has to be judged by a person. Working out one picture took about 2 to 5 thousandths of a second there, of the 16 there are.
- The race view fills the screen row by row for every picture and keeps the whole track as one large hidden picture with five smaller copies. That is fine on a laptop. It was not tried on a phone or an old computer.
- The game needs a keyboard. There are no touch controls for phones.
- The kart is drawn exactly where the last step of the rules put it. On screens faster than 60 pictures a second the movement can look slightly uneven. Drawing in-between positions would fix that.
- If the browser tab is in the background, the practice race runs in slow motion instead of jumping ahead.
- A kart is a circle for walls, although it is drawn as a rectangle. Its corners can look as if they poke slightly into a wall.
- Walls are whole squares. A track cannot have a diagonal or curved wall yet, only steps.
- The campus loop: a lap takes about 20 seconds for the robot, not the 30 to 40 we want. At this scale a kart drives at about 200 km/h. Slower karts would fix it; that is for the team to decide. It is not in the menu yet (only in the address), the Leaderboard panel does not list it, and the online page still uses the test oval.
- A track bigger than about 64 by 64 squares would make the hidden picture of the track too big. Painting only the part of the track that is on screen would remove that limit, and would probably also make the view behind the kart faster on a big track.
- The server reads a file from disk for every request. That is fine for a few players. With many visitors we would keep the files in memory.
- The rest is to be filled in as we build.
