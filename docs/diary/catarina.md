# Catarina's diary

Entries from 11 November 2026 on, newest at the top. How to write one is in `README.md` in this folder.

Everything built on 10 November is in `docs/build-diary.md`.

### 19 November 2026, late evening: less lag online, and a connection meter that stays out of the way

**What she said**

- "Yes lets build the small ones": the server sending positions more often with the page drawing less far in the past, and a little meter.
- About the meter: "make sure this doesnt reduce the interface experience for a player".
- "Some other pull request was merged so afterwards check that it is compatible with us."

**The other pull request: Rodrigo's Easy, Normal and Hard (number 33)**

- It was merged into `main` at 16:31. It gives the computer karts of a single race three levels, with three buttons above the track. It changed `client/main.js`, `client/race.html` and `client/style.css`, which the stats work also changes.
- `main` was merged into `my-stats-and-results-buttons`. The code fitted together by itself. The one overlap was the number of tests in `WALKTHROUGH.md`. All tests pass on the combination (2,259 at that point), and the single race page loads with his three buttons and the new buttons for the end of the race.
- His level buttons start a new race through the same `startAgain()` as the new "Race again" button, so the two cannot get out of step.
- One thing to know, not changed: a win against Easy computer karts counts in "My stats" exactly like a win against Hard ones. The level is not saved with a race.
- A small fix went onto the stats branch at the same time: a guest's finished single race is no longer sent to the server at all (before, it was sent and refused, which left a red line in the browser's console).

**What was built** (branch `online-lag-small-fixes`, on top of the stats branch)

| What | Where |
|---|---|
| The server sends every kart's position 30 times a second instead of 20 | `STEPS_PER_UPDATE` in `server/room.js` |
| The online page shows the race 4 steps in the past on a steady connection instead of always 6. It measures how late updates arrive and keeps just enough spare, up to the 6 steps it always had | `createPlayback()`, `DELAY_STEPS`, `DELAY_STEPS_MOST`, `LATENESS_FADES` in `client/net.js` |
| The connection meter: a small box in the bottom left corner of the picture with five numbers and one sentence. **Off until a player presses L**, and L hides it again | `client/meter.js` (counting and words), `client/online.js`, `client/online.html`, `client/style.css`, the L key in `client/keyboard.js` |
| A part for the team's laptop test: checks 83 to 87, and a place to write each laptop's numbers | `docs/two-laptop-checklist.md` |

**Why it was done this way**

- **Where the lag comes from.** The page draws every kart, the player's own too, a little in the past, so it can glide between two updates. A key press therefore shows after: the way to the server and back (about 70 thousandths of a second from her laptop), the wait for the next update, and that step back in time. Before: about 200 thousandths. Now, on a steady connection: about 160. That is a fifth less. It is not gone: only the browser moving the player's own kart at once ("prediction") would do that, and that is a bigger piece of work that was not started.
- **Never worse than before.** Drawing closer to the present leaves less spare when an update is late. So the page measures the lateness on each connection and, on an uneven one, goes back up to the 6 steps it always had. Measured the same evening against the live server (which still runs the old code): updates arrive at most about 15 to 18 thousandths of a second late, which is under one step, so there the page will stay at 4.
- **The meter does not touch the experience** (her condition): it is hidden until asked for; hidden, the page looks exactly as before and asks the server nothing; shown, it is a small box that lets clicks through, sits where no kart is, and steps aside for the podium and the results. It is on the picture, not another line under it, and comes along on the whole screen.
- **Its sentence is the point.** Three things can make a race feel slow, and they have different cures: the way to the server, uneven updates (both the connection), or the computer drawing too few pictures. The meter says which, in plain words, and never blames the game or the number of players.

**Two existing tests were changed, because the rule changed (30 updates a second)**

Each has a comment in its file that says what it said before. Whoever wrote them should know, and say if they disagree.

| Test | It said | It says now |
|---|---|---|
| `tests/room.test.js`, "is sent every third step, which is 20 times a second" | `60 / STEPS_PER_UPDATE` is 20 | "is sent every second step, which is 30 times a second": it is 30 |
| `tests/online.test.js`, "sends updates about 20 times a second" | from 5 to 15 updates in half a second | "sends updates about 30 times a second": from 8 to 22 |

`tests/net.test.js` was not touched: it still plays updates back at the old rhythm, which the page must also cope with, and all of it passes.

**Decisions made by the agent: please confirm**

- The key is L ("lag"). Ctrl+L, Cmd+L and Alt+L are left to the browser.
- The meter is only on the online page, bottom left, and is hidden while the podium and the results are up.
- Its limits: more than 150 thousandths of a second to the server and back is "slow"; a wait of more than 120 between two updates, or fewer than 24 updates a second, is "uneven"; fewer than 40 pictures a second is "this computer is drawing slowly".
- To time the server, the meter asks the address `/health` every two seconds while it is shown. That goes the normal web way, not through the race's own live connection, so it is a close estimate, not the exact same path.
- The lateness of an update is forgotten slowly (it halves in a little over two seconds), so a connection that hiccups every few seconds keeps its spare.

**Checked, and not checked**

- `npm test`: 2,307 passed, 5 skipped (87 files). 48 are new: `tests/playback-delay.test.js` 16 and `tests/meter.test.js` 32. One of them found a slip in the meter before anyone saw it: 30 updates a second could read as 31.
- Measured with a robot player (a guest, no account) and six karts, five of them computer karts:
  - This laptop's server with the new code: 359 updates in 12 seconds (30 a second), usually 31 thousandths of a second apart, the game at 100% of real speed, 1,398 characters an update. That is about 42,000 characters a second for each player, half as much again as before.
  - The live server, which still has the old code: usually 49 apart, 95 of 100 within 64, the worst 68, the game at 100% of real speed. So the server keeps its pace with Rodrigo's computer karts in the race.
- In the browser pane, on the pretend server, sound off: the online page looks as before when the meter is off, and asks the server nothing; L shows the box (248 by 134 on a picture of 862 by 382, a tenth of it; a normal-sized picture is larger and the box is not); the numbers move twice a second; "Updates a second" read 30; L hides it and the questions stop. In the hidden pane the picture is drawn slowly, and the meter said so in its sentence, correctly.
- **Not checked:** how it feels. The pane cannot show smoothness, and nobody has driven it. The live server with the new code (only after the merge). Real laptops on campus Wi-Fi: that is what checks 83 to 87 are for. How much more the server sends in a month (Render shows it on its dashboard).

**How to check it yourself**

Run `npm start`, open http://localhost:3000, choose Online and the Nova lap, press Enter and drive. Nothing new is on the screen. Press **L**: the small box appears bottom left; "Updates a second" says about 30 and the sentence says "All fine." Press L again: it is gone. Then drive and judge: does the kart answer the keys a little sooner than on the live site?

### 19 November 2026, evening: my stats in "Your account", single races that count, buttons on the results screens

**What she said**

- From the feedback on the grading points: does the results screen offer "Race again" and "Back to menu" with one click? (It did not: only the R key, the host's Enter, and a small link above the picture.)
- "We should do the profile page with your own stats, and maybe things like most played character. Best top 3 times, only for the track we have been working on."
- The stats go into "Your account": "it has there my stats, and at the bottom of the page has the usual change password and all that."
- Yes to "Download my results". "I would also put single races counting in the stats."
- Mid-way: "Rodrigo did a pull request just a few moments ago, check if what we are doing does not break on what he did."

**What was built** (branch `my-stats-and-results-buttons`)

| What | Where |
|---|---|
| "Your account" starts with a driver's card: the character driven most, dancing beside their kart; the player's name; races, wins, podiums; the three best race times with medals; the best lap; the place on the shared leaderboard. Nova lap only. The account itself (password, delete) is at the bottom | `client/index.html`, `client/stats-panel.js`, the words in `client/stats-view.js`, the look in `client/style.css` |
| The sums behind it, from the list of one player's saved races | `server/stats.js`, `statsOf()` in `server/accounts.js`, `resultsOf()` in `server/store.js` |
| Three new addresses, each only for the signed-in player's own races: `/api/stats`, `/api/single-result`, `/api/my-results.csv` | `server/api.js`, asked from `client/account-api.js` |
| The character driven is saved with every online result | `server/online.js` (`saveFinish`), a new column `character` in `race_results` (`server/store.js`) |
| A finished single race is reported to the server once and saved as "single". It counts in the player's own stats and never for the shared leaderboard | `reportFinish()` in `client/main.js`, `saveSingleResult()` in `server/accounts.js`, the checks in `server/single-results.js` |
| "Download my results": a ".csv" file of every saved race, for Excel | `resultsAsCsv()` in `server/stats.js`, the button in `client/stats-panel.js` |
| Single race, on the podium: "Race again" and "Back to menu" as buttons, top right, with a small line "Saved to your stats." | `client/race.html`, `client/main.js` |
| Online, on the results board: "Start next race" (host only) and "Back to menu". On a low screen the list scrolls and the buttons stay in view | `client/results-board.js`, `client/online.js`, `client/style.css` |

**Why it was done this way**

- **A single race cannot be checked by the server**, because it runs in the player's browser. So it is kept apart: marked "single", shown only to that player, and left out of the two questions that make the leaderboard. "The server decides the results" stays true for everything other players can see.
- **Nobody can ask for someone else's stats.** The addresses take no name and no number: the server knows who asks from the cookie.
- **The sums are in a file of their own with no database in it** (`server/stats.js`), so each rule (what a podium is, which character wins a tie) has a plain test.
- **The card is the poster of "Choose your character" again**, in the colours of the most played character's kart, because a tidy table is not what a game looks like.

**Rodrigo's two pull requests arrived underneath**

- Number 31 (computer karts online) was already in `main` when this branch started.
- Number 32 (full screen) was merged into `main` while this was being built. It changed four files this work also changes: `client/race.html`, `client/main.js`, `client/online.js`, `client/style.css`. `main` was merged into this branch. Three of the four fitted together by themselves. In `client/race.html` both had changed the same lines (his "play area" around the numbers and the picture, my buttons for the end of the race): the buttons now sit inside his play area, so they come along on the whole screen.
- Nothing of his was removed or changed. All his 14 full-screen tests and his computer-kart tests pass on the combination.

**Decisions made by the agent: please confirm**

- `race_results` has a new column, `character`. Nobody owns the database tables yet, so the team should be told. The server adds it by itself the next time it starts on Render. Older races have no character: "most played" counts from today.
- What makes a reported single race believable: a real track, whole numbers, a best lap that fits the race, a place from 1st to 6th, a character of the cast, no faster than all laps at twice top speed (36.5 seconds on the Nova lap), and not sooner after the last one than the race itself took.
- The stats are about the Nova lap only, but the downloaded file has the races on every track.
- The file is a ".csv" with commas. An extra first line that would make Excel split the columns in every country was tried and dropped: with it, Excel on this laptop wrote "RÃ³ Versos" for "Ró Versos".
- The single race buttons are in the top right corner of the picture, where they cover nobody on the podium. "Your account" is now a wide panel. On a low screen the winner on the online results board is drawn smaller.
- With the same number of races for two characters, "most played" is the one driven most recently.

**Checked, and not checked**

- `npm test`: 2,242 passed, 5 skipped (84 files). 109 are new: `tests/stats.test.js` 28, `tests/single-results.test.js` 14, `tests/my-stats.test.js` 44, `tests/stats-view.test.js` 23. The list of checks that the pretend store and the real database must both pass (`tests/store-contract.js`) got 7 more. No existing test was changed.
- `npm audit` on 19 November 2026: 0 known vulnerabilities, in 75 packages (our three, `pg` 8.23.1, `ws` 8.22.2 and `vitest` 5.1.0, pinned to exact versions, and the helpers they bring). Newer small versions exist for `ws` (8.23.0) and `vitest` (5.1.1); not taken this close to the deadline.
- In the browser pane, on the server with pretend accounts (`npm run start:pretend`), sound off, with a test account:
  - "Your account": the card with no races, then with real saved single races; the tie between two characters; the account part at the bottom.
  - A nonsense single race was refused (400), a second one sent at once was refused (429).
  - "Download my results": the page got the file with the right name, the right lines and the mark for Excel. The file was caught before the browser saved it, so the very last step (the browser writing it to Downloads) was not seen.
  - A robot drove a whole single race on the test oval through the real keyboard: "Saved to your stats." appeared, the podium came up with both buttons, "Race again" started a new race and the arrow keys worked at once.
  - The same robot hosted an online race against five computer karts: the results board came up with "Start next race" and "Back to menu", and the button started the next race. At first the buttons were below the edge of the board on the small window of the pane; that is what the scrolling list fixes.
  - A test version of the file opened in Excel on this laptop (not shown, read back by a script): nine columns, "Ró Versos" right.
- The real database: `npm run test:database` ran from this laptop (the network of that evening let it through): 33 passed, 2 skipped. These tests only ever use tables whose names start with `test_`, and remove them afterwards. Ten of them are new: the 7 added to the shared list of checks, and 3 in `tests/store-live.test.js` that make a results table the old way, with a race in it, and check that it gets the `character` column when the store starts, keeps the old race exactly as it was, and then saves a new race with its character.
- **Not checked:** the live site, which gets this only after the merge (there the real `race_results` table gets its column at the server's next start); full screen with the new buttons on a real screen (the pane cannot go full screen); a laptop set to Portuguese number format opening the file in Excel; a real person clicking the buttons; the card on a phone.

**Online lag: what was measured** (she asked what can be done in practice)

- From this laptop the live server answers in about 70 thousandths of a second, and it is in Frankfurt, Render's region closest to Portugal. Distance is not the problem.
- The online page draws every kart, the player's own included, as it was a tenth of a second ago, so that movement between two updates is smooth (`DELAY_STEPS` in `client/net.js`). Add the way to the server and back and the wait for the next update (20 a second): a key press shows on the screen about a fifth of a second later. In a single race it is one picture later. That is the lag, and it is the same with one player or six. Worked out from those three numbers, not measured with a stopwatch.
- Nothing was changed about it today. The options are in the chat of this day.

**How to check it yourself**

Run `npm run start:pretend` and open http://localhost:3000. Create an account, drive a single race on the Nova lap to the end: the podium has "Race again" and "Back to menu". Go back to the menu and click your name: your stats are at the top, "Download my results" under them, and the password and delete parts at the bottom. Sign in on a second browser as someone else: their card shows nothing of yours.

### 19 November 2026, afternoon: a room of six, a job that keeps the server awake, and the driver who cries

**What she said**

- Cap the online room at six players, "because we only have 6 characters anyway".
- Yes to the small GitHub file that keeps the site awake.
- The driver who came last cries beside the podium. Her answers to the three open points: "last" is the last line of the results, finished or not; it is also in the single race against the computer karts; and it is fine if the one crying is the Dean or the professor.
- Show the banner for watching, and the podium with the character crying.

**What was built**

| What | Where |
|---|---|
| A room takes six players, one for each character, and never more than the grid has places. A seventh is told "The room is full" | `MAX_PLAYERS` in `server/room.js`, the words in `client/link.js` |
| A job on GitHub opens the live server's `/health` every five minutes, so the server does not fall asleep. It needs nothing from the repository and can change nothing in it | `.github/workflows/keep-awake.yml` |
| Who cries: with four or more karts, the driver on the last line of the results, finished or not. With five karts the fourth is neither on the podium nor crying. With three or fewer, nobody | `podiumLoser()` and `CRY_FROM_KARTS` in `client/podium.js` |
| The pose: both fists at the eyes, rubbing, elbows out, shoulders shaking in bursts, bent forwards a little, the head rocking slowly. Not a dance: nobody can choose it | `cryingPose()` in `client/pilot-shape.js` |
| The figure: the same pilot as on the podium, with their own head (or a helmet for a kart that is no character), and five blue tears from each eye flying out like a little fountain. It stands on the lawn beside the step of second place, between the podium and the students at the side (see "Her first look" below: it was on the other side at first) | `cryingDriver()`, `tearParts()`, `LOSER_SPOT` in `client/podium-shape.js` |
| Both race pages work out who came last and hand them to the podium, on the Nova lap and in the hall of the other tracks | `client/podium-view.js`, `client/online.js`, `client/main.js` |

**Four existing tests were changed, because the rule changed (a room of six)**

They are not Catarina's alone: whoever wrote them should know, and say if they disagree. Each has a comment in its file that says what it said before.

| Test | It said | It says now |
|---|---|---|
| `tests/room.test.js`, "holds eight players unless told otherwise" | `MAX_PLAYERS` is 8 | "holds six players unless told otherwise: one for each character": it is 6, and the number of characters |
| `tests/grid.test.js`, "has eight places, one for each player a room can hold" | the grid has 8 places and a room takes exactly as many | "has eight places, enough for every player a room can hold": the grid still has 8, and a room takes no more than that |
| `tests/room-bananas.test.js`, "ends for a full room of eight robots too" | a race with 8 robots ends, with 8 finishes | "ends for a full room of robots too (six)": the same with a full room, which is now 6 |
| `tests/bumps.test.js`, "never leave a kart in a wall ... when eight karts race for the same corner" | made its room with `roomWith(8)` | still races eight karts, one on every place of the grid, in a room made for eight on purpose (`roomWith(8, TEST_OVAL, 8)`), because eight jam a corner worse than six |

**For Pedro: his podium files were touched**

`client/podium.js`, `client/podium-shape.js` and `client/podium-view.js` are his (pull request 28). Nothing of his was removed. Added: the driver who cries. Moved without changing what it does: the lines that give a driver their own head or a helmet (now `withTheirOwnHead()`), and the lines that turn a kart into a driver (now `driverOf()`), so both the podium and the crying driver use them. All his tests in `tests/podium.test.js` pass as they were.

**Decisions made by the agent: please confirm**

- The crying driver stands on the camera's left, beside second place, a little towards the camera (at first on the right: see "Her first look").
- The fists cover the eyes of the head picture. The rest of the face, the hair and the suit stay visible, so it is still clear who it is.
- The first tears (three small drops an eye) could not be seen at the size of the podium. They are now five an eye, bigger, in a higher arc.
- GitHub visits every five minutes. Render switches off after fifteen, so two visits can be late before the server naps.
- `MAX_PLAYERS` is worked out from the list of characters, not written as "6": a seventh character would make room for a seventh player.

**Her first look: "the layer on the gray floor is weirdly over their feet"**

She was right, and the agent had not seen it in its own pictures: it had looked at the face and the tears, not at the feet. The driver stood at the right of third place, and exactly there the low wall along the avenue runs (`avenue parapet` in `client/nova-lap-buildings.js`, rows 6.7 to 7 of the map; the podium is at row 6.1). The driver was standing inside the wall, so the wall was painted over the feet and shins.

- Fixed: the driver now stands on the lawn at the camera's left, beside second place, a little towards the camera so that a dancing arm of second place passes behind them (`LOSER_SPOT` in `client/podium-shape.js`).
- So that it cannot come back: a test works out where the spot is on the map of every track that has a podium, and fails if a wall, fence, tree or bench is within reach of it, elbows included. A second test puts the old spot in and expects it to be caught, to prove the first one can see such a mistake.
- Found on the way, NOT changed: two of the eighty students of the crowd (numbers 8 and 9) stand right at the trunk of the tree behind second place. They have stood there since the crowd was made bigger on 18 November.

**Checked, and not checked**

- `npm test`: 2,054 passed, 5 skipped. 30 are new, in `tests/crying-driver.test.js`.
- In the browser on the laptop, sound off: the podium of the Nova lap painted with five and with six drivers, with Cici Boss and with the Dean as the one crying, close up and whole; the hall of another track with a plain kart crying, and with three karts and nobody crying, without an error; six robot players filling the room and a seventh page told "The room is full"; the single race page and the online page still open without errors.
- NOT checked: the crying driver at the end of a real race, driven to the finish (the pictures were made with the same code and made-up results). How the crying looks in motion: the agent only sees single pictures, and has been wrong about movement before. The GitHub job: it cannot run before it is on `main`. Anything on the live site.

**How to check it yourself**

1. `npm start`, Single race on the Nova lap, and finish it (or wait 30 seconds after you finish): with six karts in the race, the last one cries at the right of the podium.
2. After merging: on GitHub, the "Actions" tab shows "Keep the server awake" running every few minutes. "Run workflow" there starts it by hand.

### 19 November 2026, midday: watching a race, one kart per player, a host who is away, and how many karts fit

**What she said, after reading the entry below**

- Two tabs giving two karts is a problem: one kart per signed-in player. A person using two different browsers on purpose is fine.
- A password must not be the same as the user name.
- Someone who arrives during a race must be told so in big letters on the picture: a race is on, you are watching, a new race starts soon and you join it. And they should see the kart that is in first place when they arrive.
- If the host is inactive (their kart does not move and the race ends by the two minutes), the host passes to the next person, the one who entered the room second.
- Later, in the clean-up: the race should fill more of the screen, without the little lines under the picture ("Connected. 3 players here."), or with them worked into the picture. Not now, but new things should be built with that in mind.
- To think about and discuss: how many players the online room should hold (three felt boring, more than three felt laggy, never more than six because there are six characters); whether two players can be the same character; and a podium where the driver who came last stands down with the crowd and cries.

**What was measured about the number of karts**

| What | 1 kart | 3 karts | 6 karts | 8 karts |
|---|---|---|---|---|
| The live server at Render, robot karts driving for 15 seconds: the usual gap between two updates (it should be 50 thousandths of a second) | 49 | 49 | 49 | 49 |
| The same: the worst gap | 70 | 66 | 97 | 98 |
| The same: how fast the game ran, against real time | 100% | 100% | 100% | 100% |
| The room's rules alone, on this laptop: work for one second of racing, in thousandths of a second | 0.6 | 0.6 | 1.4 | 2.2 |
| This laptop painting one picture of the online page, all karts in view, in thousandths of a second (16 are allowed) | 3.3 | 3.9 | 4.4 | not measured |

So neither the server nor the painting slows down with six karts: each extra kart costs about a fifth of a thousandth of a second to paint. What this does NOT show: six different laptops on the campus Wi-Fi. All the robots ran from one computer on one connection. Where "more than three is laggy" came from could not be found in the notes; the only record is three players on three laptops on 10 November.

**Characters:** two players in a room are never the same character, already. The server gives the second one the first character nobody has, and their page says "Someone in this room is already Cici Boss, so you are Dean." (`server/cast-keeper.js`). What a player cannot do is see in the menu who is already taken.

**What was built**

| What | Where |
|---|---|
| A password cannot be the user name, whatever the capital letters. Asked when a password is chosen (sign-up, change of password), on the server and in the sign-up form. Not asked at sign-in, so an account made before today still opens | `checkPasswordIsNotName()` in `shared/account-rules.js`, `server/accounts.js`, `signUpFormErrors()` in `client/account-view.js` |
| A banner in big letters across the top of the picture for someone who arrived during a race: "A RACE IS ON: YOU ARE WATCHING", then "The camera is on Dean. A new race starts when this one is over, and you join it." Pressing an arrow key makes it light up and say "Your keys do nothing yet: you drive in the next race." | `watchBanner()` in `client/race-view.js`, `client/online.js`, `client/online.html`, `client/style.css` |
| The camera of someone watching is on the kart in first place when they arrive (by checkpoints passed, as the place "2nd of 4" is worked out). It stays with that kart, and moves to the new leader only when its kart has finished or left | `kartToFollow()` in `client/race-view.js` |
| One kart for each signed-in player in a room. Joining again from another tab or computer keeps the new one; the older one is told why and closed, and its page shows "You are playing somewhere else" with "Play here instead" | `sendOlderOnesAway()` in `server/online.js`, `client/net.js`, `client/link.js`, `client/online.js` |
| The host is whoever has been in the room longest AND has pressed a key in the last minute. One who is away passes the room to the next player in the order they arrived | `isAway()`, `hostId()`, `AWAY_AFTER_STEPS` in `server/room.js` |
| The page sends "start" for Enter whenever no race is on, host or not, and the server decides. So a host who was counted as away gets the room back by pressing Enter | `client/online.js` |

**Decisions made by the agent: please confirm**

- "Inactive" is one minute without a key, counted all the time, not only at the end of a race. Her case (the host's kart never moved, the race ended by the two minutes) is covered: by then the host has long passed on. Counting all the time also covers the case she did not name: a host who is away before the first race, where no race ever ends.
- Three things count as being there without a key: having just arrived; having finished the race that just ended (a host who won and then waited two minutes for the others keeps the room); and, for the host, a newcomer walking in (a host who waited for friends keeps the room for another minute).
- Pressing any key, R or Enter brings an away player back at once. If everyone is away, the host is whoever has been here longest.
- Of two connections of the same player, the newer one stays: a forgotten tab is the old one.
- Guests are not limited: two tabs of a guest are still two karts. (The server has nothing to recognise a guest by. A rule inside the page, "one kart per browser", could cover it: not built, say if you want it.)
- The camera stays with the kart it started on instead of jumping to each new leader.
- The banner sits at the top of the picture and stops before the small map. It is on the picture, not under it, with the fuller screen in mind.

**No existing test was changed.** All 1,960 from this morning pass as they were.

**Still to decide together**

1. The size of the room. Today eight fit. By the measurements six is safe; her limit is six, because there are six characters. Changing it means two existing tests that say "eight" change too.
2. The driver who came last, crying among the crowd at the podium, when four or more raced.
3. Whether to keep the server awake (asked this morning).

**Checked, and not checked**

- `npm test`: 2,024 passed, 5 skipped. 64 are new: `tests/password-not-name.test.js` (16), `tests/host-away.test.js` (20), `tests/watching.test.js` (16), `tests/one-kart-per-player.test.js` (12).
- In the browser on the laptop, with the sound switched off: the banner with two robot karts racing and the camera on the one in front (the old rule would have shown the other); the banner answering a key; the sign-up form refusing a password equal to the name; a second tab of the same signed-in player putting the card on the first, and "Play here instead" putting it on the second.
- On the laptop's real server: two robot players, the first silent, the second pressing a key every five seconds. The first was host at 2, 30 and 58 seconds, the second at 63 and 70, and the first again as soon as it pressed a key.
- NOT checked: any of this on the live site (it runs the old version); real people on several laptops; how the banner looks on a small screen; a screen reader.
- The agent's test drives in the browser pane played the engine sound on her speakers until she asked for mute. The pane's sound setting is now switched off before any test and put back afterwards.

**How to check it yourself**

1. `npm run start:pretend`. In one browser window open Online on the Nova lap and press Enter. In a second window (a private one, so it is a different player) open the same page: the banner is there.
2. Create an account with the password equal to the name: the form says no.
3. Signed in, open the online page in two tabs: the first one says "You are playing somewhere else".
4. With two windows in the room, leave the first alone for a minute and press an arrow key in the second now and then: the second is told "You are the host".

### 19 November 2026, morning: bad inputs, a sleeping server, and a lost connection

**What she asked for**

A run aimed at two things from yesterday's list of ideas. One: try the bad inputs (wrong password, taken user name, joining mid-race, two tabs, reloading during a race, the server waking from sleep) and fix whatever shows a raw error. Two: a clear "the server is waking up, about a minute" message instead of a blank wait. And: "tell me what I have to decide". The other two tracks will be removed in the final polish, not now.

**What the sweep found**

Tried on the laptop with pretend accounts (`npm run start:pretend`) and, for the room, also on the live site. The agent does not type passwords into the live site, so the account forms were tried on the laptop only: the code is the same.

| Tried | What the game said | Verdict |
|---|---|---|
| Sign up with nothing, a short name, `<b>x</b>`, an accent, 5,000 letters, a 5,000-letter password | A sentence under the box that is wrong, before anything is sent | fine |
| A taken user name, also in other capitals | "Someone already has that user name. Choose another one." | fine |
| Wrong password, unknown user | "Wrong user name or password." for both, so names cannot be guessed | fine |
| Five wrong passwords, then the right one | "Too many wrong passwords. Try again in 10 minutes." | fine |
| Change password: wrong current one, the same new one, a short new one | A sentence each | fine |
| Delete account without the tick, or with a wrong password | A sentence each | fine |
| Pressing "Sign in" twice at once | One sign-in | fine |
| Everything above with the server switched off | "The server could not be reached. Try again in a moment." The leaderboard says so too, with "Try again" | fine |
| Two tabs in the same room | Two karts. Nothing breaks | a choice, see below |
| Opening the online page during a race | You watch, and drive in the next race | fine |
| Reloading during a race | Your kart leaves the race, and you watch until the next one | a choice, see below |
| A track that does not exist in the address, or `<script>` | The test oval, and nothing of the address on the page | fine |
| An address that does not exist | Three bare words on a white page: "Page not found." | **fixed** |
| The server stops or restarts under an open online page | A small line under the picture: "reload the page". The player had to reload by hand | **fixed** |
| The server is slow to answer because it is waking up | "Signing in…" and nothing else, for as long as it takes | **fixed** |
| Arriving during a race as a character someone else already has | The line said "You are Cici Boss" although you had no kart yet and would get another character | **fixed** |

No raw error, code or stack of technical words was shown anywhere. What was missing was what to tell the player while waiting, and doing the retrying for them.

**What was built**

| What | Where |
|---|---|
| The online page tries to connect again by itself: after half a second, then 1, 2, 3 and every 5 seconds. A card over the picture says what is happening: "Connecting…", after 3 seconds "The server is waking up" with a little kart driving along a road and the seconds counted, after 75 seconds "Still waking up", after two and a half minutes "The server cannot be reached" with a "Try again" button and "Back to the menu". Also "Connection lost", "No internet connection", "The room is full", "The server has gone quiet" | `client/link.js` (the words and the sums), `client/online.js` (`connect`, `connectionClosed`, `tryAgain`, `forgetTheRoom`, `showCard`), `client/online.html`, `client/style.css` |
| In the room, eight seconds without any news from the server count as a lost connection: the page lets go of it and joins again | `LOST_AFTER_QUIET_MS` in `client/link.js` |
| In the menu, signing in, creating an account, changing a password, deleting the account, signing out, the account corner and the leaderboard add "The server is waking up, which can take up to a minute." when an answer takes more than three seconds | `client/waking.js`, `client/account-panel.js`, `client/account-view.js`, `client/leaderboard.js`, `client/leaderboard-view.js` |
| A question to the server that gets no answer for a minute and a half is given up, with "The server could not be reached." If the hosting company answers in our server's place while it starts, the form says "The server is starting up. Try again in a minute." | `client/account-api.js` |
| A wrong address gives a page of the game, "Off the track", with a button back to the menu, still with the number 404. Scripts and programs get the plain words as before | `client/not-found.html`, `sendNotFound()` in `server/app.js` |
| Someone who arrives during a race is told who they are only once they have a kart | `client/online.js` |

**About the sleeping server**

- Render's own page about the free plan says: the server is switched off after 15 minutes without visitors, waking takes about a minute, and a browser that opens the site meanwhile is shown a loading page by Render itself. Messages of a race count as visitors, so a race is never cut off by this.
- Measured on 19 November at 10:35: the sleeping server answered after 17 seconds.
- So someone who opens the link cold sees Render's loading page, not a blank one, and we cannot change that page. Our own message is for a page that was already open: the menu left alone for a quarter of an hour, then "Sign in" or the leaderboard.
- Two more tries to catch the server asleep, after leaving it alone for 17 and then 21 minutes, found it awake both times (it answered in a tenth of a second). Something else was visiting it: a teammate, or a program that scans the internet. So what an open page of ours gets from Render during the waking was not seen, and neither was Render's loading page. The code copes with all three possibilities: the answer is held back (the "waking up" words after three seconds), the connection is refused (the page tries again), or Render answers in our place (the "starting up" sentence).

**Decisions made by the agent: please confirm**

- This branch, `waking-up-and-lost-connection`, is built on top of `atrium-screen-and-characters`, which is built on Pedro's `podium`. It touches the same files, so starting from `main` would have meant conflicts. Pull requests 28 and 29 have to be merged before this one.
- After a lost connection the page comes back by itself. During a race the returning player watches, as before: the rule was not changed.
- The numbers: 3 seconds before "waking up", 8 seconds of silence before "lost", 2.5 minutes before giving up, 1.5 minutes for a question in the menu. All are named at the top of `client/waking.js`, `client/link.js` and `client/account-api.js`.
- Nothing was done to keep the server awake. That is a choice for her (below).

**What she has to decide**

1. Should the server never sleep? Free ways: a job on GitHub that opens `/health` every ten minutes (a small file in the repository, no new account), or a free "is my site up" service (she makes an account). Paid: Render's always-on plan. Or leave it, and open the link a few minutes before any demo.
2. Reloading during a race: keep "you watch until the next race", or hold the kart for a few seconds so a reload brings you back into the race? The second is a change to the rules of the room.
3. The same person in two tabs: allow two karts (today), or one kart per signed-in player?
4. A password that is the same as the user name is accepted today. Refuse it?

**Checked, and not checked**

- `npm test`: 1,960 passed, 5 skipped. 45 are new, in `tests/link.test.js` and `tests/not-found-page.test.js`. No existing test was changed.
- In the browser, on the laptop: every row of the table above; the card for a lost connection (server stopped) and the page joining again by itself when it came back; the waking card from the first second to "The server cannot be reached" and the "Try again" button, against a copy of the server without race rooms; the three waking sentences in the menu with answers slowed down to five seconds; the "Off the track" page.
- On the live site: two tabs, joining and reloading during a race, a wrong track, a wrong address. It runs the old version, so the new card and page were not seen there.
- NOT checked: the new card on the live site against a server that is really asleep (only possible after merging). Two real laptops. Wi-Fi switched off and on (rows 11 to 13 of `docs/two-laptop-checklist.md`, rewritten for the new behaviour). A screen reader reading the card.

**How to check it yourself**

1. `npm run start:pretend`, open http://localhost:3000, click Online and a track. Stop the server with Ctrl+C: the card says "Connection lost". Start it again: the card goes away and you are back in the room, without touching the page.
2. Open http://localhost:3000/anything-at-all: "Off the track".
3. After merging: leave the live menu open for 20 minutes, then press "Sign in" with any name and password. After three seconds the form should say the server is waking up.

### 18 November 2026, late evening: the podium inside the atrium, a white screen, more dances

**What she said, after looking at the entry below**

- The podium should be inside the Hovione Atrium, on the floor the race drives over. She drew where on a screenshot. (She had meant this from the start: the agent had taken "inside the atrium" for the Moodle screen only.)
- The Moodle screen: white with black letters, in the lettering Nova uses for announcements.
- "Choose your character": moving the mouse over a driver should show them in the big picture. No colours listed. The signature move stays, "it's fun".
- Rodrigo asked her for the griddy as his dance. Better dances for Professor Ricardo and the Dean. Her own gangnam was underwhelming: more energy, jumping.
- A pop of green somewhere in the Dean's colours.

**What was done**

| What | Where |
|---|---|
| The podium of the Nova lap stands in the atrium, a little past the black letters, seen from nearer the entrance, so the letters are behind the drivers and the Moodle screen is at the edge of the picture | one line, `podium: { at, camera }`, in `client/nova-lap-look.js` |
| The screen is white with black letters: the school's name in a corner (drawn with lines by our code, as on the walls), "IT HELP DESK", a thin line, the sentence, "MOODLE IS DOWN." in heavy capitals | `it-screen` in `client/wall-art.js` |
| Moving the mouse over a driver (or the keyboard) puts them on the poster. It does not choose them: a click does, and "YOU" stays on the chosen one. When the mouse leaves, the chosen one is back | `showOnPoster()` in `client/kart-panel.js` |
| The dots of colour are gone from the poster; the signature move is there | `client/index.html`, `client/style.css`, `danceNameOf()` in `client/cast-choice.js` |
| Three new dances: "griddy" (Ró Versos: skipping feet, both arms swinging forwards and back, then the hands in front of the eyes like glasses), "floss" (Dean: straight arms from side to side past the hips, hips the other way), "disco" (Professor Ricardo Pereira: one arm up to the side, then down across the body) | `client/pilot-shape.js`, `client/cast-choice.js` |
| The gangnam jumps on every beat, ten beats a round instead of eight, with bigger arms | `gangnamAt()` in `client/pilot-shape.js` |
| Dean's helmet is green | `shared/cast.js` |

**About Nova's lettering**

The agent searched for the school's brand book and did not find which typeface it uses. So the screen has what could be seen without it: white, black, plain heavy capitals, the name in a corner. The letters are the browser's own Helvetica or Arial, because the game has no font files. If she has a photo of a real notice on that screen, it can be matched more closely.

**Six existing tests were changed, because the rules changed**

All six were Pedro's, from 17 and 18 November. He should know, and say if he disagrees.

| Test | It said | It says now |
|---|---|---|
| `tests/pilot-shape.test.js`, the list of dances | six dances (seven since this afternoon) | ten: "griddy", "floss" and "disco" were added at the end |
| `tests/pilot-shape.test.js`, "keeps the feet on the ground, except during the jump of the siu" | only the siu leaves the ground | the siu and the gangnam do |
| `tests/pilot-shape.test.js`, "...PCP the siu and Ró Versos the driving" | Ró Versos pretends to drive | Ró Versos does the griddy |
| `tests/cast.test.js`, "paints each character in the colours the team chose" | Dean: black, white, white | Dean: black, green, white |
| `tests/podium.test.js`, "stands right in front of the white wall with the name" | the podium is on the lawn at the end of the avenue | the podium and its camera are inside the atrium, away from the walls |
| `tests/podium.test.js`, "stands on the lawn and not in the way of the karts" | no part of the podium on a road square | every step and every student stands on the floor of the hall, none inside a wall, the letters or a table |

One more of his tests kept its checks and lost the word "lawn" in its name. Two of the agent's own tests from this afternoon were changed too (the gangnam's feet, and which dances bend a leg).

**Decisions made by the agent, please confirm**

- The exact spot of the podium in the atrium, and that it replaces Pedro's lawn.
- The floss for Dean and the disco point for the Professor. She asked for "better" ones and left the choice open.
- The green is Dean's helmet.
- On the Test oval and the Campus loop the podium is still in Pedro's separate hall. It could be shown in the real atrium after every track: not done, to be asked.

**What was checked, and what was not**

- `npm test`: 1,901 pass, 5 skipped.
- In the agent's browser: the podium in the atrium with a pretend top three; the white screen from the kart; the poster while the mouse is over Dean and over Ró Versos, and that the saved choice stays Cici Boss; six moments of each of the four new or changed dances side by side.
- NOT checked: the new rules were not broken on purpose this time. NOT checked: anything in motion, a race driven by hand to the podium, a phone, the live site.

**Later still: the griddy again, and the dab**

She looked at the griddy and said it did not look like one, and chose the dab for the Professor.

- **Why the first griddy did not work.** The pilot faced the camera the whole time, and the griddy is arms that swing forwards and back and heels that tap out in front. Anything that moves towards the camera hardly changes on the screen. So the new one turns to the side for the swinging and the tapping, turns to the front to put the hands in front of the eyes like glasses, and then turns to the other side (`griddyAt()` in `client/pilot-shape.js`).
- **A foot out in front.** A pose can now put one foot forwards, flat on the ground ("kick"), next to lifting one ("hop").
- **The dab** replaces the disco point, which is deleted: one arm straight up to the side, the other across the face, leaning into it, to the right, then to the left, with both fists at the chest in between (`dabAt()`).
- The list of dances in `tests/pilot-shape.test.js` now ends with "dab" where it said "disco". The tests for the disco point, written an hour earlier, were replaced by tests for the dab, and the tests for the griddy were rewritten for the new one.
- Checked: `npm test`, 1,904 pass, 5 skipped. Eight moments of each of the two dances side by side in the agent's browser. NOT checked: in motion.

**Last of the evening: the podium back outside, and "more exaggerated"**

She looked at the podium in the atrium and liked it better outside, where Pedro had it. So it is back on the lawn in front of the school's name, and his three tests about that spot are again exactly as he wrote them. That leaves four of his tests changed this evening, not six: the list of dances, the jump of the gangnam, Ró Versos's dance, and Dean's colours.

What she asked for instead: more people or people further apart, a small animation of the camera coming in, more exaggerated.

| What | Where |
|---|---|
| 80 students instead of 28: four rows behind the podium in three blocks, with a way through on each side, and a group that reaches forwards on each side. On the Nova lap one block stands on the avenue, and the low wall runs through a way through | `crowdSpots()` in `client/podium-shape.js` |
| They jump higher | `CROWD_JUMP` |
| The camera starts four times further away, with the whole crowd in the picture, and comes in to the podium in 2.8 seconds, fast at first and gently at the end. In the hall of the other tracks the picture grows the same way | `cameraPullBack()` in `client/podium.js`, used in `client/podium-view.js` |
| The drivers are shown bigger, and there is more confetti | `TRACK_CAMERA` and `CONFETTI_PIECES` in `client/podium-view.js` |

Checked: `npm test`, 1,915 pass, 5 skipped. The start, a moment on the way and the end of the camera's move, on the Nova lap, and the hall of the Test oval, in the agent's browser, as single pictures. NOT checked: the move itself in motion, and whether 80 students slow a slow laptop down.

**After she raced it: the griddy and the dab a third time, and the school's name**

She drove a race to the podium and sent a screenshot: the podium looks good, the name on the wall behind it looks weird, and "neither the dab is good nor the griddy".

- **The name.** In her screenshot its top was cut off by the edge of the picture. The podium's camera now sits 45 dots lower on the screen (`TRACK_CAMERA` in `client/podium-view.js`), so the whole name is in the picture with room above it. If "weird" meant something else about the name, she has to say what.
- **The dab.** The arm lay right across the face, so nobody could tell who was dabbing. The bent arm now crosses under the eyes, over the mouth and chin, its forearm the same way as the straight arm; the pilot goes up on the toes and turns into it a little.
- **The griddy.** Three things it lacked: the upper body leans back (a pose can now lean back, "pitch"), the foot that taps stands on its heel with the toe up (`shoeFaces()`), and the bounce is nearly twice as big. It turns a little less far to the side, so the face stays wider.
- Checked: `npm test`, and eight moments of each dance side by side, and the end of the podium's camera move, in the agent's browser. NOT checked: in motion. These two dances have now been judged "not good" twice by her eye after the agent thought they were fine in still pictures, so the agent's own look at them is worth little here.

**The dab a fourth time, and the school's logo**

- **The dab.** "Not recognizable as a dab at all." The cause, found at last: the wrong arm was bent. In a dab the straight arm points up and out to one side, the elbow of the other arm sticks out beside the head on the other side, its forearm runs the same way as the straight arm, and the head drops into that elbow. The earlier tries crossed an arm over the face from the pointing side and kept the head upright, which reads as someone covering their mouth. Now the arms are the right way round, and a pose can tip the head over towards a shoulder ("tilt"): `paintHead()` in `client/kart-paint.js` turns the head picture round the chin.
- **The logo.** She meant the name on the wall itself: "the font is not like that, search online". The agent looked at the school's logo as Wikipedia shows it (the file `Nova_logo.png` on Wikimedia Commons). It is heavy: a bold N, a thick ring bigger than the letters and standing higher, with a long bar under it on the line, a V, and an A without a crossbar right beside the V. Ours had thin lines and a small ring. `novaName()` in `client/wall-art.js` now draws it with those shapes and sizes, measured on that picture. It is still drawn by our code: no picture file and no font. It changes everywhere the name stands: the white wall behind the podium, the glass doors, the Moodle screen.
- Checked: `npm test`, 1,915 pass, 5 skipped. The wall behind the podium and six moments of the dab, in the agent's browser. NOT checked: in motion; the doors and the screen up close after the new logo.

**Git**

Same branch, `atrium-screen-and-characters`, pushed. No pull request yet.

### 18 November 2026, evening: where the podium was, the Moodle screen, a new "Choose your character", and Cici Boss

**What she asked**

1. Pedro said he had built a podium for the end of a race. She played a single race and an online race and did not see one. Did he really build it, why does it not show, how can it be better?
2. A big screen in the corner of the Hovione Atrium, as on the real campus, with a message from the IT help desk that Moodle is down. An inside joke.
3. "Choose your character": no photos beside the pilots, and a better layout. Her own character looked odd. Her dance should be the Gangnam Style dance.

While the work was going on she looked at it and said more: the long hair the agent had painted looked awful, her face was off-centre and her chin was cut off, and the panel's design could be better still. She then sent her whole photo.

**1. The podium: it exists, it was not merged**

Pedro built it on 18 November on the branch `podium` and opened pull request 28. Rodrigo approved it. Nobody has pressed "Merge" yet. The live site and Catarina's copy both follow `main`, so neither had it. Nothing is broken.

The agent looked at it on screen with a pretend top three, on the Nova lap (in front of the NOVA wall) and on the Test oval (in the hall): it works. This work is built on top of his branch, so it has the podium in it.

One thing was made better, because she had described a crowd "cheering and jumping and applauding" and his all waved: one student in three now waves, one jumps, one claps over the head (`crowdPerson()` in `client/podium-shape.js`). Which one comes from the student's number in the crowd, so nobody stands anywhere else than before and Pedro's tests still pass unchanged.

**2. The screen**

| What | Where |
|---|---|
| The screen: a slanting "fence" in the south-east corner of the atrium, 4.2 metres tall, under the gallery | `client/nova-lap-buildings.js` ("IT help desk screen") |
| What is on it: a black cabinet, a yellow band "IT HELP DESK · SERVICE NOTICE", "We regret to inform you that, unfortunately," and "MOODLE IS DOWN." in big letters, signed "Your IT Help Desk team" | `client/wall-art.js` (`it-screen`) |
| The six squares behind it are wall, so no kart drives through it | `SCREEN_CORNER` in `client/nova-lap-buildings.js`; the letters in `shared/tracks/nova-lap.js` were made again with `node tests/nova-lap-letters.js` |

It was made wider once after a first look, and the big line is written smaller by itself if the browser's font would make it too long.

**3. "Choose your character"**

- The photos are gone. Only the pilots are shown.
- First design: the chosen one big on the left, six tiles on the right. She said it could be better. Second design, the one that is in: a poster of the chosen one on top (the colour of their kart, their number, name, "Signature move", colours, the Race button, which no longer needs scrolling) and the six in a line-up under it, the chosen one marked "YOU".
- The pictures are painted with twice as many dots as before, so they stay sharp when shown large.

All of it is in `client/kart-panel.js`, `client/index.html` and `client/style.css`.

**Cici Boss**

- **The dance.** "gangnam" in `client/pilot-shape.js`: the wrists crossed in front and pumping, the feet apart and stepping in turn, then one arm up swinging a lasso. For the stepping, a pose can now lift a foot, and a leg bends at the knee when its foot is lifted (`legWith()`). Every other dance is exactly as it was.
- **The head.** Her old head picture was an oval cut from `client/faces/cici.jpg`, a square that ends under her lip: so the chin was never in it. The agent first painted long hair with code. She did not like it, and it was taken out again. The head was then cut again from the whole photo she sent (it was in her Downloads folder; the photo itself was not copied into the project): the wall, the clothes, the neck and the necklaces are taken away, the hair stays, with its purple and blue ends. `longHairOf()` in `client/cast-choice.js` says how far her picture goes on below the chin, and `paintHead()` in `client/kart-paint.js` lets that part hang over the shoulders. The cutting was done by a small program written for this, which is not part of the game. Only the pixels were copied, so nothing hidden in a phone photo is in the picture.

**One existing test was changed, because the rule changed**

| Test | It said | It says now |
|---|---|---|
| `tests/pilot-shape.test.js`, "is one of standing, arms crossed, and the six dances" | the list of dances is exactly six | the list has a seventh, "gangnam", at its end. Catarina asked for a new dance, so the list had to grow. Pedro wrote this test: he should know |

No other existing test was changed or deleted.

**Decisions made by the agent, please confirm**

- The size, colours and extra words of the screen, and that the corner behind it is wall.
- The design of the panel, the number of each character (their place in the cast) and the names of the dances.
- The photo files stay in `client/faces/`, shown nowhere, because tests of 17 November check that they exist. The team says whether to delete them.
- "wave" stays in the list of dances, danced by nobody.
- Which students of the crowd wave, jump and clap.
- This branch starts from Pedro's `podium`, not from `main`, because it changes the same files. It should be merged after his pull request 28.

**What was checked, and what was not**

- `npm test`: 1,895 pass, 5 skipped (on Pedro's branch before: 1,848 and 5). The 5 need the real database.
- Nine rules were broken on purpose, one at a time (her dance back to the wave, the corner behind the screen open, "Moodle is up", the screen taller than the gallery, a leg that never bends, no foot lifted, long hair not passed on, nobody jumping, the photos back). Each made between 1 and 3 tests fail. This was before the head was cut again and the second design: the tests for those were run, not broken on purpose.
- In the agent's browser: the screen from three places in the atrium, readable from the kart; both designs of the panel at 1280 by 800, where the whole panel fits without scrolling; her new head in the panel and on the podium; ten moments of the gangnam side by side; the podium on the Nova lap and in the hall. The single race and online pages load on the Nova lap. The only errors on the pages are the ones about accounts, which a laptop without the database always has.
- NOT checked: anything in motion. The agent's browser shows single pictures, so how the dance and the crowd feel is for a person to judge. NOT checked: a race driven by hand to the podium. NOT checked: the panel on a phone or a small laptop screen (under about 830 dots wide it becomes one column, which was not looked at). NOT checked: the live site, where none of this is until it is merged.

**How to check it yourself**

Run `npm start` and open http://localhost:3000. Click Single race, then Race on the Nova lap: the new panel opens. Move the mouse over the six. Choose Cici Boss and watch the poster. Then race: after the doors of the atrium, the screen is ahead on the left. For the screen without racing: http://localhost:3000/track-tour.html?track=nova-lap. Finish the race to see the podium. `npm test` runs everything; `atrium-screen.test.js` is the new file.

**Git**

Branch `atrium-screen-and-characters`, made from Pedro's `origin/podium`, pushed to GitHub. No pull request yet.

### 17 November 2026, night: after Catarina played it

**What she said**

She played the new version and sent three screenshots. One complaint about the students: "when you go against a student, you don't get delayed, and it should somehow be like a banana." A sound for hitting a student: she may do that later herself. And in the screenshots the gantry over the start line, the one with the 3, 2, 1 lights, had a hole in its beam where the buildings behind showed through.

**What was done**

| What | Where |
|---|---|
| A kart that topples a student now spins out exactly as on a banana, on top of the speed it loses: for 1.2 seconds its keys do nothing and it slides. It is the banana's own code that is called, so the two cannot drift apart. A kart that cannot be spun at that moment (it is already spinning) only loses the speed | `shared/walkers.js` (it calls `spinOut` from `shared/hazards.js`) |
| The hole in the gantry | `client/draw.js` |

**Why the gantry had a hole**

The picture is painted from the furthest thing to the nearest, and what is "furthest" is worked out from the square of the map a thing stands on. That works for anything that stands on one square. The gantry stands across several. It was sorted by the square under its middle, so a far building in a row of squares nearer to the camera than that middle was painted after the gantry, over part of its beam. On the old track there was no building straight behind the start. On the Nova lap the entrance front is exactly there. The gantry is now cut into one piece for each square it crosses, and each piece takes its own turn. The squares along the beam and the three lights are counted along the whole beam, so they still line up.

**A sound for hitting a student**

There already is one since this evening: a silly two-note sound (`oops` in `client/sound.js`), and now the banana's slip sound plays with it, because the kart spins. Catarina can hear and change both on http://localhost:3000/sound-test.html. The agent cannot hear.

**Three tests were changed, because the rule changed**

All three are from this same evening and this same pull request.

| Test | It said | It says now |
|---|---|---|
| `tests/walkers.test.js`, "is not moved or turned, and its laps, clock and spin are left as they were" | the spin of the kart is untouched | the same, for a kart that cannot be spun at that moment. Two new tests after it pin the new rule: it spins out as on a banana, and a kart that drove past or only nudged does not |
| `tests/walkers.test.js`, "drives on afterwards: the walker on the ground is not a wall" | 30 steps later the kart is faster again | it first sits out its spin with the gas doing nothing, then drives on through the spot |
| `tests/room-street-life.test.js`, "keeps its laps and its clock: a walker costs speed and nothing else" | `spin` is 0 after the bump | the server reports the spin to every browser, the laps and the clock are still untouched, and the keys work again when the spin is over |

**What was checked, and what was not**

- The tests: 1,806 pass, 5 skipped.
- The gantry, in the agent's browser, from the two places her screenshots were taken from: the beam is whole.
- Not checked: the spin after a student in a real race on a real screen, and how it feels. The rule itself is tested, and it is the same spin as the banana's.

### 17 November 2026, late evening: students who walk, ramps to jump, things in the way

**What she said**

After the first round of fixes: "The nova logo in the atrium is buggy." "It is MON caffe, not moon." Make the statue of the lady with the surfboard bigger. One pull request with everything. And on the ideas for making the lap fun:

1. People walking: yes. They must come in and out of doors that make sense: "look at the video to see entry ways that students could possibly come out of."
2. Speed boosts: yes, but as ramps you jump, with a new animation, and placed so that a player "cannot just go straight and hit all of them".
3. Things in the way: yes, "and trashcans and things like that".
4. A jump at the stairs: no. The stairs go down. Ramps along the boring part instead.

**What was done**

| What | Where |
|---|---|
| The letters N O V A were smeared out to the side. Their picture was narrower than the stand it was put on, and the last column of the picture was repeated to fill the gap. A picture that "fits" is now stretched along its whole stand. The letters also got a long black base, which is what a kart bumps into | `client/scenery-paint.js`, `client/scenery.js`, `client/nova-lap-buildings.js` |
| MON CAFFE on the roof sign and the board by the door, with a coffee cup instead of a moon | `client/wall-art.js` |
| The statue: redrawn as a woman standing with her surfboard, and one and three quarter times as big | `client/props.js`, `client/nova-lap-buildings.js` |
| **Walkers.** Five students, each walking between two doors and back. The agent went back to the film for the doors: the library's sliding doors under its bridge (with the red sticker), the entrance of the main building halfway down the promenade, the tall glass entrance opposite in its frame of pale stone, and the café. Two doors the agent had drawn on the main building without having seen them in the film were taken out again | `shared/walkers.js` (the rule), `shared/tracks/nova-lap.js` (the five paths), `client/street-life.js`, `client/props.js` (the drawing) |
| **Ramps.** Four: one on the coast road, three on the west street. The first of each straight is in the middle, where everybody drives. The other two are in the outer lanes of the west street, with a parked bike or bins some way after them, so whoever wants them has to change lanes at speed | `shared/ramps.js` (the rule), `shared/tracks/nova-lap.js` (where they are), `client/scenery.js` (the wedge), `client/ground.js` (the arrows), `client/draw.js` (the kart in the air, the sparks) |
| **Things in the way.** Parked blue bikes, recycling bins with blue, yellow and green lids (as beside the library in the film), cones, and two of the grey benches of the promenade | `client/nova-lap-buildings.js` (`NOVA_LAP_FURNITURE`), `client/props.js` |
| Sounds: a rising whoop for a jump, a silly two-note sound when a student near you topples | `client/sound.js`, `client/sound-cues.js` |
| The track tour shows the students walking, each sitting down every 25 seconds so the sit-down can be looked at, and hops when it crosses a ramp | `client/track-tour.js` |

**How the two rules work, in short**

- A ramp is one square of road with a direction. Drive over it that way, fast enough, and the kart is in the air for 0.7 seconds: the keys do nothing, it flies over bananas and students, a wall still stops it. Then one second of higher top speed.
- A walker's place follows from its path and its own clock. A kart that drives into one keeps 40% of its speed. The walker sits for 2.2 seconds, its clock standing still, and nobody can bump it again until it is up. A walker inside a building cannot be bumped. A kart that only creeps into one does nothing.
- Both run on the server, like the bananas. A browser sends only its keys.

**Why it was done this way**

- **Two agents again.** A helper wrote the rules in `shared/` and `server/` with their tests, in its own folder, while the main agent drew them in `client/`. They agreed first on two small files that say what a ramp and a walker are (`shared/ramps.js`, `shared/walkers.js`), and neither touched the other's folders.
- **The walkers need almost nothing sent.** Because a walker's place follows from its clock, the server sends two numbers for each, and every browser draws the same place.
- **Fun, not grotesque.** A toppled student sits up straight, legs out, with stars going round their head and their coffee cup beside them, and gets up again. Karts cannot hit someone who is sitting.

**A mistake of the agent's, found and repaired**

One commit of this evening (`a4c1080`) left both race pages broken: a script that edits files dropped an import and three lines from `client/main.js` and `client/online.js` without saying so, and the pages stopped with an error. The tests did not notice, because no test loads those two pages. The agent found it a few minutes later, repaired it in the next commit and opened both pages to check. Nothing of it was ever on `main`. What it shows: the pages themselves have no automatic test, so every change to them has to be opened in a browser.

**One existing test was changed, and why**

`tests/scenery.test.js`, "slopes the top of a box along x": it said that a sloping top is not painted. Ramps need a sloping top that is painted, so the rule changed, and the test now says that a sloping top is painted with each corner at its own height. The test file is one day old and from this same pull request.

**What the helper reported at the end, and what was done about it**

- It changed no existing test. It broke its own rules on purpose 15 times (a flying kart that can steer, a sitting student who can be hit again, walkers that walk during 3, 2, 1, and so on): a test failed every time, and the code was put back.
- **Two landings were too tight.** A kart that had just landed from the ramp on the coast road had only five squares before the cones, and on the west street the bins stood level with the landing. The robot of the tests clipped both. The cones and bins of the coast road moved to the start of the corner, the bins of the west street moved on, the two outer ramps of the west street moved, and one bike was taken out. The rule for placing them is now written in `client/nova-lap-buildings.js`: the lane a kart flies along and the lanes beside it stay clear, and the next thing in its lane comes at least six squares after the landing.
- **The computer karts got stuck at single obstacles.** Measured with five computer karts over three laps, on four different races: before the move they stood nearly still for 9 to 18 seconds a race, most of it at those bins. After the move: 0.4 to 4.3 seconds. They finish in 80 to 90 seconds.
- **Tried and taken out again:** telling the computer karts where single obstacles stand, so that they steer round them as they do round bananas. Measured the same way, it did not help (1.5 to 5 seconds stuck), so it was removed rather than left in as code that does nothing useful.
- **The helper's own choices, please confirm:** a kart that has finished can still jump; a kart that lands on a ramp takes off again; a student can be toppled again in the very step they get up; the students keep walking after a race is over, until the next start, as the bananas stay.

**What was checked, and what was not**

Checked:

- The tests: 1,804 pass, 5 are skipped (the ones that need the database address). Before this round there were 1,605. Of the 199 new ones, 179 are the helper's (ramps, walkers, the room) and 20 are for the picture side.
- The new rules have their own tests, written by the helper: a kart takes off only when it drives over a ramp the right way and fast enough, cannot steer in the air, lands after exactly the time the rule says, is still stopped by a wall, and flies over a banana; a walker is toppled by a fast kart and not by a slow one, not when inside a building, not when already sitting, not by a kart in the air; the server sends the walkers only on a track that has them; nothing a browser sends can make a kart jump or move a walker. On the real track: every walker's whole path is on open ground, and the flight after every ramp is clear of walls.
- The picture side has its own tests too (`tests/street-life.test.js`): a walker is drawn exactly where the rules say it is.
- A robot drove a whole lap in the real single race page, in the agent's browser: it took the ramp on the coast road, its speed went from about 300 to 409 units a second, and the picture taken at that moment shows the kart in the air above its shadow, with a computer kart ahead of it jumping too.
- The online room, in the agent's browser: the server sends the five walkers, their clocks stand still during 3, 2, 1 and run from GO. No error on the page.
- The agent looked at the students walking, at one sitting on the ground with its stars, at the ramps, bikes, bins and cones, at the letters, the café sign and the statue.

Not checked:

- **How it feels.** Whether the jump is fun, whether the students are too many or too few, whether the bikes are fair. The numbers are first guesses. Catarina or a teammate has to play it.
- Two people online on two laptops, and the live server.
- The sounds: the agent cannot hear. Catarina asked for the sound to be switched off during the agent's own test drive, which had left an engine humming in the hidden browser.
- Whether the lag she felt near the café is gone.

**What was done in git**

- Everything is on the one branch `nova-track`, for one pull request, as she asked.
- The helper worked on the branch `nova-track-rules` in the folder `.worktrees/nova-rules`. Its work was merged into `nova-track` in two steps (ramps first, then walkers and the server). The folder and the branch were removed once it had reported.
- Small commits, pushed to GitHub as a backup. Nothing was merged into `main`.

**How to check it yourself**

1. `npm start`, then http://localhost:3000/track-tour.html?track=nova-lap: the students walk, the tour hops over each ramp.
2. Menu, Single race, Nova lap. Drive over the yellow ramp on the coast road. On the west street, try to get the two ramps in the outer lanes. On the promenade, drive into a student.
3. `npm test`.

### 17 November 2026, evening: Catarina's first feedback on the Nova lap

**What she said**

She drove it full screen. "A great base to start off with." She likes the entrance, the atrium, the statue. What she asked for:

- The NOVA letters more in the middle of the atrium, and black. Some tables and chairs, to show it is a sitting area.
- Around the Moon Café it felt laggy and the ceiling was weird. The café should stand out more: tables, a logo.
- The Sagres beach entrance was lazy and did not look like the real one.
- After the tunnel, a block of grass that is "one sheet", not something with depth.
- More details in parts of the map.
- The second half of the lap is boring: one long straight. She wants ideas to make it fun (obstacles, a bike in the way, a jump with a speed boost). While the agent was working she added one more: people walking in and out of the buildings along the promenade, who fall over, in a funny way, when a kart bumps them.

**What was done**

| What | Where |
|---|---|
| The beach tunnel was rebuilt. Its mouth now runs along the path, as the real one does: a long concrete beam with "Sagres Beach Way", a real hollow two squares deep with painted walls, the tunnel running away to the daylight of the beach at the back, reeds on top, and the sloping side wall of the ramp | `client/nova-lap-buildings.js` (seven boxes), `client/wall-art.js` (`tunnel-beam`, `tunnel-mural`, `tunnel-back`, `reeds`) |
| The Moon Café: a navy sign on its roof with a crescent moon, a board with its name beside the door, a counter and shelves seen through the glass, three tables outside | `client/wall-art.js` (`cafe-front`, `moon-sign`), `client/nova-lap-buildings.js` |
| The ceiling by the café. The roof over the terrace was drawn 4.6 metres up, barely above the camera, so it filled the top of the screen like a lid. It is now 8.6 metres up, on two slim posts, with panels and lamps on its underside | `client/nova-lap-buildings.js` |
| The atrium: big black letters N O V A in the middle of the hall (karts have to go round them), eight tables with chairs, two boxes of plants | `client/nova-lap-buildings.js` (`NOVA_LAP_FURNITURE`), `client/props.js` |
| The sheet of grass became a low stone edge with round lavender bushes behind it | `client/nova-lap-look.js`, `client/props.js` (`shrub`) |
| Details: the young red trees and stone benches of the avenue, lamp posts along both roads, doors on the long building beside the promenade | the same files |
| Cars drive along the coast road and the west street, round the roundabout. They are only a picture: no kart can reach them and the server knows nothing of them | `client/traffic.js` (new), `client/draw.js`, `client/props.js` (`car`) |
| Lighter to draw: walls are cut into fewer slices, the ground close to the kart is painted again less often and reuses its patterns | `client/scenery-paint.js`, `client/ground.js`, `client/ground-art.js` |

**About the lag**

The agent could not make it lag: at the café a picture took about 6 thousandths of a second in its browser, and a screen needs one every 16. So this was not measured as fixed. Three things were made lighter anyway (the last row above), and the low ceiling, which made that spot look wrong, is gone. If it still stutters there on Catarina's laptop, the next step is to measure on her laptop, not to guess.

**Decisions made by the agent, please confirm**

- Tables, plants, the letters, the trees and the benches each stand on a square that karts cannot cross. They are at the sides, away from the driving line, so they only matter when karts are side by side.
- The café's name is on it because that is its name. The crescent moon is our own drawing, not the café's logo.
- The fun ideas (people walking, speed boosts, obstacles on the straights) were NOT built. They are new rules of the game, they have to run on the server as well, and they need tests. The agent described them to Catarina and asked which to build.

**What was checked, and what was not**

- `npm test`: 1,605 tests pass, 5 skipped. 11 are new, for the cars (`tests/traffic.test.js`): every car stays on its lane, and no lane crosses ground a kart can drive on. The tests of the track itself ran again on the changed layout: letters match the shapes, no checkpoint can be driven round, the robot and the five computer karts finish three laps, no wall is invisible.
- The agent looked at each changed place in its browser: the tunnel from two sides, the café, the terrace, the atrium, the bushes, the avenue, the cars.
- Not checked: how it feels in motion, and whether the lag is gone on Catarina's laptop.

**What comes next**

Catarina chooses among the fun ideas. Then they are built as rules, with tests, for the single race and for online.

### 17 November 2026: the Nova lap, a new track made from the video filmed on campus

**What was asked**

Catarina sent a nine-minute video of the lap the team wants, walked on campus, and described it in words: start at the entrance, through the Hovione Atrium (the only part indoors, a big square hall with a Christmas tree), out past the cafe and the library, everything else outdoors, down a ramp, with the tunnel to the street on the left, and back to where the video started. The old campus track, made from a map, was not recognisable: "the buildings were just a white wall with windows painted on", and everything round the campus looked like a forest. She asked for the base only (ground and buildings; tables, bikes, lamps and trees later), at a bigger scale, and for it to look like Nova. "Do not settle for less."

**What was done**

A new track, the **Nova lap**, and new drawing code for it. The campus loop was not touched.

How the video was read: the laptop has no program for cutting a video into pictures, so the agent made a small page that steps through the video (muted) in its own browser and saves still pictures. It looked at one picture every two seconds, then at about 130 pictures of the important places at full size, and wrote down what is there: which paving, which building on which side, what is written on the walls. Nothing was installed and the video was not sent anywhere.

What a player sees now, in the order of the lap:

1. The avenue: small cobbles, a band of smooth slabs, the residence with its balconies on the left, the Cascais hall with its tall white frame on the right. At the end the entrance: the white wall with the school's name, the glass front, the white steel roof edge and the blue banner.
2. Through the doors into the atrium: a polished floor, the white letters N O V A, the Christmas tree, a gallery with red-brown wooden beams underneath, a ceiling with a long skylight, the wall with the strokes of colour.
3. Out onto the terrace: the roof overhead, the cafe behind glass, the sea-green glass floor, the turquoise statue.
4. Under the library and down the promenade on ochre concrete: the long building with the deep white roof edge and the coloured rooms on the right, the Westmont Hospitality Hall on the left.
5. The terracotta stairs (driven as a ramp), the lower plaza, the white Grand Auditorium.
6. West along the path: brown slats, the tall white wall, and on the left the mouth of the beach tunnel with "Sagres Beach Way" over it.
7. The coast road: flagstones, the low stone wall, the road with its white lines, palms and the sea.
8. Up the west street past the lawns, the Santander hall and the Cascais hall, round the flags, back into the avenue.

| Where | What it is for |
|---|---|
| `shared/tracks/nova-lap.js` | The track for the driving rules: letters for wall, road and grass, the start, eight checkpoints |
| `client/nova-lap-ground.js` | The ground as shapes: which paving, lawn or road lies where |
| `client/nova-lap-buildings.js` | Every building as a box: where it stands, how tall, which picture on which side. Also the railings and letters |
| `client/nova-lap-look.js` | Sky, horizon, the way round, lines on the roads, the tree, the statue, the flags |
| `client/wall-art.js` | The 45 pictures that go on walls, each painted by code |
| `client/ground-art.js` | The 16 kinds of ground, each a small repeating picture, and the shadows of buildings |
| `client/scenery.js`, `client/scenery-paint.js` | The new drawing code: where each strip of wall lands on the screen, and painting its picture there |
| `client/ground.js`, `client/draw.js`, `client/buildings.js`, `client/props.js`, `client/track-looks.js` | Changed, to use the above. Other tracks are drawn as before |
| `client/track-tour.html`, `client/track-tour.js` | A page that flies the camera round a track, to look without racing |
| `tests/nova-lap.test.js`, `tests/nova-lap-look.test.js`, `tests/scenery.test.js` | The new tests |

**Why it was done this way**

- **A new track beside the old one, not instead of it.** The campus loop is Rodrigo's, and many tests are written against it. Removing it is for the team to decide.
- **Twice the scale** (3 metres a square instead of 6). Beside a kart, a 12-metre front now looks like a 12-metre front. A lap is about 690 metres.
- **Pictures on walls** are what makes a building recognisable: a name, a banner, a row of coloured rooms. The old code could only paint every wall the same. The pictures are painted by our own code when the page opens, so there are still no image files for buildings.
- **Boxes that start above the ground** give the atrium a ceiling, the gallery its wooden underside and the library its bridge, with one idea instead of three.
- **The ground as shapes** lets a path run at a slant and lets each place have its own paving. The letters of the track are made from the same shapes and a test checks they agree, so the picture cannot lie about where a wall is.
- **The coast road was straightened.** The real one runs at a slant to the buildings. Walls at a slant are bumpy to drive along, because the rules only know squares.

**Decisions made by the agent, please confirm**

They are listed in `PROJECT_BRIEF.md` under the tracks: keeping the campus loop for now, the scale, the straightened coast road, the names on the walls and our own words on the banner, the sunny afternoon, and the track tour page.

**What was checked, and what was not**

Checked:

- The agent flew the camera round the whole lap and looked at each place, and at each hall, the cafe, the auditorium and the inside of the atrium from the side, comparing with the pictures from the video.
- A race in the agent's browser: holding the gas from the grid drives through the doors and across the atrium.
- How long one picture takes to draw, in the agent's browser: 7 to 12 thousandths of a second on the new track, against 5 to 15 on the campus loop. So it is not slower than what the team already has.
- `npm test`: 1,594 tests pass, 5 are skipped (the ones that need the database address). Before this work there were 1,488. The 106 new ones were written by the helper agent and run again by the main agent after the merge.
- What the new tests showed about the track: its letters match the shapes on every square; no checkpoint can be driven round (a search over the squares, which was also tried on a checkpoint shortened on purpose, and caught it); a simple robot drives the three laps in 74 seconds without touching a wall; the five computer karts all finish three laps, in about 88 seconds; the wrong way round counts no lap; no wall beside the road is invisible.
- The helper noticed three small things, all corrected: a lap is about 690 metres, not 730 as first written; one comment named the wrong test file; and the scenery code accepted a text or an endless number where it needs a real number.
- The menu shows the Nova lap as a third card with its small map, and the server has an online room for it (it answered "welcome" with the track's name).

Not checked:

- **How it feels to race it.** The agent's browser was not on screen, where nothing moves smoothly. Catarina or a teammate needs to drive three laps and say what is wrong.
- Whether it is smooth on a slow laptop or a phone.
- Online, with two laptops, and the live server (nothing is merged yet).
- Heights and sizes are estimates from the video. The halls and lawns west of the main building were placed to fit, not measured.

**What was done in git**

- A branch `nova-track` was made from `main` as it was after pull request 26.
- A helper agent wrote the tests in a separate folder, `.worktrees/nova-tests`, on the branch `nova-track-tests`. That branch was merged into `nova-track` and the folder removed.
- Small commits, one per step, pushed to GitHub as a backup. Nothing was merged into `main`.

**How to check it yourself**

1. Run `npm start` and open http://localhost:3000/track-tour.html?track=nova-lap. The camera flies round the lap by itself. Space stops it, the arrow keys move it, V shows the map from above.
2. Open the menu, Single race, choose "Nova lap", choose a character, and drive.
3. Run `npm test`.

**What comes next**

- Catarina says what does not look like Nova yet. Each building's front is one small piece of `client/wall-art.js`, so one can be changed without touching the others.
- The things left out on purpose: the trees and benches of the avenue, lamp posts, tables, plants in the atrium, cars on the roads.
- The team decides whether the campus loop leaves the menu.

### 15 November 2026: no email after all, decisions for the week, and sound

**Email: built, then decided against**

On 13 November Catarina asked for a plan for email, so that a forgotten password can be reset, and then said "build it". It was built on 15 November on a branch of its own, `email-reset` (pull request 18). When it came to the one step only she can do, making an account at an email service with a sender address of ours, she did not want that, and asked whether accounts are safe without it. They are: email was only ever for getting back into an account, not for keeping it safe. She decided to **skip email**. Pull request 18 is to be closed without merging. The work stays on its branch.

The agent's mistake here: the plan said "create one free account at an email service" and "confirm one sender address", but did not say plainly that this means an email address of ours that players see. That only came up when the work was done. A step that only the member can do has to be spelled out before building, not after.

Also on 15 November: Catarina could not find the pull request for the race fixes. The agent can only give a link, and the link has to be clicked and "Create pull request" pressed. She did that, and Pedro approved and merged it the same afternoon (pull request 17). It then sat under "Closed", not "Open", which is why she could not see it. The new version went live.

**Her decisions for the coming week** (also in `PROJECT_BRIEF.md`)

- No email.
- Characters and the race track are the big pieces. The team thinks about them as ideas first, before anything is built.
- Checkpoints against short cuts: she does not like that the checkpoints forbid short cuts. To be discussed with the new map. Nothing changes until then.
- The camera that goes through walls: after the map is final.
- Not for now: a one-lap race for the demo, touch controls for phones.
- Meanwhile: sound.

**Sound: what was done**

Every sound is made by our own code. There are no sound files.

- **Engine and tyres**: a hum that goes higher with speed, a rumble on grass, a squeal when the kart slides or spins.
- **Short sounds**: the countdown beeps and GO, a chime for a lap, a call for the last lap, a fanfare with a cheering crowd at the finish, the banana slip, bumps into karts and walls, and a buzz when a warning comes up.
- **M** switches the sound off and on during a race. Settings in the menu has a box for it too. The choice is kept in the browser.
- **A sound check page**, `sound-test.html`, with every sound on a button, for tuning by ear. It is not in the menu.

Catarina listened on that page and asked for changes twice:

1. "The engine is too loud at top speed, and the short sounds can be more over the top." The engine became about half as loud and duller. The short sounds got more notes, a thump underneath and a longer tail.
2. "The banana, and the bumps, more over the top, and a YAYYY at the end of the finish", with a link to a well-known sound effect of children cheering. That recording is not ours to use. The agent tried to make children's voices by code. Her verdict: "that yay sounds demonic". The voices were taken out. The finish now ends with a crowd made of hiss, whistles and clapping. For a real "yay" the team would have to record their own voices.

| Where | What it is for |
|---|---|
| `client/sound-cues.js` (new) | Decides which sound is due when, and how the engine should sound. Has tests |
| `client/sound.js` (new) | Makes the sounds. The numbers to tune are at the top |
| `client/sound-test.html`, `client/sound-test.js` (new) | The sound check page |
| `client/main.js`, `client/online.js` | Changed: hand the facts of every picture to the sound |
| `client/keyboard.js` | Changed: the M key |
| `client/settings-panel.js`, `client/index.html` | Changed: the box "Sound in races" in Settings (it was there before, greyed out, as "coming later") |
| `client/race.html`, `client/online.html`, `client/style.css` | Changed: the line about M, and the look of the sound check page |
| `tests/sound-cues.test.js` (new) | 34 tests |

No older test was changed. One page test (`menu-page.test.js`, "gives every box of a form a label of its own") failed on the first version of the new box in Settings. The page was fixed, not the test.

**Decisions made by the agent, please confirm**

- Sound is on for a player who never chose.
- You hear your own kart only, not the engines of others.
- A page that is not in front falls silent.
- A hard bump into a kart gets a double honk on top. If that gets annoying in a full race, it is one line to take out.

**What was checked**

- `npm test`: 1,309 tests pass, 5 are skipped. Before the sound there were 1,275.
- The deciding code was broken on purpose in 19 ways. Every one made a test fail.
- Catarina listened to every sound on the sound check page, twice, and said "Good, finish it" after the second round.
- The agent cannot hear. It played every sound into a silent recorder inside the browser and measured: none is silent, none has broken numbers, an unknown name plays nothing, mute is silent, and every sound at once on top of the engine at full speed stays at 0.92 of the point where loudspeakers crackle.
- In the real race page, with the loudspeakers switched away: the sound started at the first key press, M switched it off and on and the choice was saved, and driving into a wall caused no error.

**What was NOT checked**

- Nobody has heard the sound in a real race over three laps, or online with two laptops. Checks 66 to 75 in `docs/two-laptop-checklist.md` are for that.
- Only one browser. Not Firefox, Safari or a phone.
- The email work is not in this branch and was not merged anywhere.

**How to check it yourself**

1. `npm start`, open http://localhost:3000/sound-test.html and click the buttons.
2. Open a Single race, press an arrow key, and drive. Press M to switch the sound.

**Git steps, done by the agent at Catarina's request**

- Made the branch `email-reset` on top of `race-fixes`, five commits, pushed. Catarina opened pull request 18 from it, to be closed without merging.
- Made the branch `sound` from the new `main`. Four commits: the sound, the second round, the tests, the notes. Pushed. The pull request is for Catarina to create and a teammate to approve.

### 13 November 2026, evening: two minutes, a results board, changing your password

**What Catarina asked for, after reading the report of the day**

1. Give the others about three minutes after the first kart finishes, or two if three is too long.
2. At the end of a race with several players, show the order of arrival with some sort of animation: the winner highlighted, the others below. If the time ran out before everyone finished, order the rest by who was closest to the finish line.
3. Start on a way to change your password.

**What was done**

1. **Two minutes.** The agent chose two of her two offers and said why: a whole race takes between one and two and a half minutes, so with three the winner would wait longer than the race took. The number is in a new small file, `shared/race-time.js`, which the server and the page both read. The notice at the top of the picture now starts at the first finish: "The race ends in 2:00", and in the last minute "The race ends in 42 s".
2. **The results board.** When the race is over for everyone, a board comes up over the track. The winner is on top, large, with their kart turning round in their own colours and a yellow "Winner" ribbon. Below are the others in the order they crossed the line, each with a small picture of their kart, their time and how far behind the winner they were ("+0:06.83"). Karts that ran out of time come last, the one closest to the finish first, marked "did not finish" with the lap they were on. Your own line is yellow. The board pops up, the rows slide in one after the other, and confetti falls. For a player whose computer asks for less motion, nothing moves. The board stays until the host starts the next race. If nobody finished at all, the title is "Time is up" and the kart on top is "Closest to the finish".
3. **Changing your password.** In the menu, click your name, then "Change my password". It asks for the password you have now and a new one. The server checks the current password again (with the same lock after five wrong tries), so someone who finds your laptop open cannot take the account over. Afterwards you are signed out on every other phone or computer, and stay signed in on the one you used. "Forgot my password" is still not possible: that needs email, which the team has not decided on.

| Where | What it is for |
|---|---|
| `shared/race-time.js` (new) | The two time limits of a race, for the server and the page |
| `client/results-board.js` (new) | Puts the board on the page and paints the karts |
| `client/standings.js` | Changed: works out the lines of the board and their order |
| `client/style.css` | Changed: how the board looks and moves ("The results board") |
| `client/online.js`, `client/online.html`, `client/race-view.js` | Changed: the board comes up when the race is over; the notice counts from two minutes |
| `server/accounts.js` | Changed: the rule for changing a password |
| `server/api.js` | Changed: the new address `/api/change-password` |
| `server/store.js`, `tests/memory-store.js` | Changed: two new database questions (replace a password; remove a player's other sessions) |
| `client/account-api.js`, `client/account.js`, `client/account-view.js`, `client/account-panel.js`, `client/index.html` | Changed: the form in "Your account" |
| `tests/` | 41 new tests, in `standings`, `accounts`, `api`, `account` and the store checks |

**Tests that were changed**

No test from before today was changed. Four tests that the agent itself wrote this morning, on this same branch, were changed with the rule: two pinned "one minute" (`room-race.test.js`), two pinned the notice only in the last minute (`race-view.test.js`). A page test (`menu-page.test.js`, "gives every box of a form a label of its own") failed on the first version of the new form, which had a hidden box without a label. The form was fixed, not the test.

**Decisions made by the agent, please confirm**

- Two minutes, not three (Catarina offered both).
- After a password change, every other device is signed out, and the one that made the change stays signed in.
- A new password must be different from the old one.
- At most ten tries at changing a password per minute from one computer.

**What was checked**

- `npm test`: 1,275 tests pass, 5 are skipped. This morning there were 1,234.
- `npm run test:database`: 23 pass, 2 are skipped. This is the real database, in tables that start with `test_`, never the players' tables. It includes the two new database questions.
- The new code was broken on purpose in 21 ways. 20 made a test fail at once. One did not ("no limit per computer on changing passwords"): there was no test for it. One was written, and then it failed too.
- In the agent's browser, on a laptop, with pretend accounts (`npm run start:pretend`):
  - A robot drove a whole online race in the real page against a second kart that stood still. "1st of 2" showed during the race. At the finish: "The race ends in 2:00", the small list in the corner, and "You can start the next race when this one is over." When the race was over, the board came up by itself with the winner and the time, the time was saved to the leaderboard, and Enter started the next race and took the board away.
  - A board with five made-up lines was looked at as one picture: winner, own line in yellow, two karts that did not finish.
  - The password was changed through the real form, with the real, slow scrambling: the same password again was refused on the page, a wrong current password by the server, and after the change the old password was refused and the new one accepted.

**What was NOT checked**

- Nobody has seen the board move. The agent's browser does not play animations while it is not on the screen, so only the finished picture was seen.
- A board with several real players. The race in the browser ended with one racer on the board, because the second kart left instead of waiting two minutes.
- Signing out the other devices was checked in the tests, not with two real devices.
- None of this is on the live server yet. The password change has not touched the real players' tables.

**How to check it yourself**

1. `npm run start:pretend`, open http://localhost:3000, create an account, click your name, "Change my password".
2. Open Online in two browser windows, start a race in the first, and finish it in both. The board should come up.
3. Checks 54 to 65 in `docs/two-laptop-checklist.md` are for two laptops on the live server, after the merge.

**Git steps, done by the agent at Catarina's request**

- Four more commits on the branch `race-fixes`: the two-minute limit, the results board, changing a password, the notes.
- Pushed to GitHub. Still one pull request for the whole day, for Catarina to open and a teammate to approve.

### 13 November 2026: laps that did not count, buildings cut off, Enter restarting a race

**What Catarina reported, after playing**

1. On the campus loop, crossing the finish line sometimes did not count a lap, and the race did not end.
2. Buildings beside the kart were "cut off" and looked buggy.
3. When the host pressed Enter by accident during a race, the race was thrown away and a new one started. A race should be played to its end.

She also asked for a step back: what does the grading value, what is missing, what about accounts and security. And she said not to rework the campus layout, because the videos from campus are not here yet. The agent worked alone and did not use helper agents, to save her usage.

**What was found, and what was done**

1. **The laps.** The lap rule was right. The game did not explain itself. On the west side of the campus loop the road makes a hairpin round the end of the CTT Student Hall, and checkpoint 5 is at the end of that hairpin. The square is open, so a kart can drive straight on and never touch checkpoint 5. From then on the finish line counts for nothing until the kart has gone through checkpoint 5, and nothing on the screen said so. The other five checkpoints go from wall to wall. The track was not changed (it is Rodrigo's, and the videos will change it anyway). Now:
   - the checkpoint to drive through next is **lit up in yellow**: a low curtain of light across the road, and a yellow line on the small map and in the views from above;
   - when a checkpoint was left out, the page says **"You missed a checkpoint: round the end of the CTT Student Hall. This lap does not count until you drive through the yellow light."**
2. **The buildings.** Two mistakes in `client/buildings.js` and `client/draw.js`. Every wall was cut where its foot left the bottom of the screen, but a tall wall beside the camera is in the picture much longer, so there was a gap up to the edge of the screen. And the rule that removes a wall standing between the camera and the kart also removed squares of a wall that the kart was only driving close to. Now a wall is cut where its top leaves the screen, and only a wall that really stands in the line from the camera to the middle of the kart is left out, together with the rest of that straight wall behind the kart. Trees and lamps now fade away as they pass the kart, instead of vanishing in one go.
3. **Enter during a race.** The server now refuses a start from the countdown until the race is over, from the host too. Because nobody can restart any more, a race needs to end by itself: it is over **one minute after the first kart has finished**, and **ten minutes after GO** at the latest. A racer who has not finished by then gets no result. The page shows "The race ends in 42 s" at the top of the picture in the last minute.
4. **New, because the grading asks for results that are clearly shown:** during an online race the page shows your place ("2nd of 4"), and at the end a **results list** with place, name and time for every kart.
5. **Security.** The server now tells a browser that came over https to always use https for this site, and tells browsers not to say to other websites which of our pages a visitor came from. `npm audit` finds no known vulnerabilities in our three libraries.

| Where | What it is for |
|---|---|
| `client/checkpoints.js` (new) | Which checkpoint is next, where its light stands, and noticing a missed one |
| `client/standings.js` (new) | The order of an online race, your place, the lines of the results list |
| `client/buildings.js`, `client/draw.js` | Changed: walls beside and behind the kart; painting the yellow light; fading trees |
| `client/race-view.js` | Changed: Enter is only offered when the race is over; "Time is up"; the time left |
| `client/main.js`, `client/online.js`, `client/online.html`, `client/style.css` | Changed: both race pages show the light and the warning; the online page shows place, time left and results |
| `server/room.js` | Changed: no start during a race, the two time limits, and two more things in the update (`passed` for every kart, `endsIn`) |
| `server/app.js` | Changed: two more safety rules with every answer |
| `tests/checkpoints.test.js`, `tests/standings.test.js` (new) | 25 tests |
| `tests/room-race.test.js`, `tests/race-view.test.js`, `tests/buildings.test.js`, `tests/page-safety.test.js` | 31 more tests |

**Eight older tests were changed. Please check them.**

Our rule is never to change a test to make it pass. These eight pinned a rule that was changed on purpose, at Catarina's request (no restart in the middle of a race), or something that follows from it (a race now ends by itself). Each has a comment in the test file that says what it said before.

| Test | Before | Now | Why |
|---|---|---|---|
| `room-race.test.js`, "can be started again by the host..." | The host could start again after everyone had finished "or while a race is on" | Only once the race is over. A new test checks the refusal during a race | This is the rule Catarina asked to change |
| `room-race.test.js`, "puts the people who were watching into the next race" | The host started the next race in the middle of the first | The start is refused first, the host drives to the end, then starts | Same rule |
| `room-race.test.js`, "is not finished while one racer is still driving" | The robot drove for two minutes and the race stayed "racing" for ever | The robot stops when the host has finished, and the race is checked then | A race now ends one minute after the first finish |
| `room-race.test.js`, "is finished when the only racer still driving leaves" | Same two minutes | Same change | Same reason |
| `room-bananas.test.js`, "picks a seed once for each race..." | A second start during the race was accepted and picked a new seed | It is refused and picks none. The next race starts after the time is up | Same rule |
| `room-bananas.test.js`, "happens when the next race starts, and nobody is still spinning then" | The host restarted while a kart was spinning | The race is given a time limit that runs out during the spin, and then the host starts | Same rule. What the test protects (no spin carried into the next race) is still checked |
| `room.test.js`, the exact list of what is sent about a kart | 12 words | 13: "passed" was added | The page needs the count of checkpoints for the light, the warning and the places |
| `race-view.test.js`, "tells a finished host how to start the next race" | Told to press Enter while the others were still racing | Told "when this one is over" during the race, and to press Enter once it is over | Enter does nothing during a race now, so the page must not offer it |

The test helper `robotsDrive` in `room-race.test.js` got one more optional setting ("stop when..."). One existing building test ("cuts a building that reaches behind the bottom of the screen") was NOT changed and still passes: the outline that is filled still never goes below the screen.

**Decisions made by the agent, please confirm**

- The others get **one minute** after the first finish. A first guess. (Changed to two minutes the same evening, at Catarina's request: see the entry above. The number is now in `shared/race-time.js`.)
- No race lasts longer than **ten minutes** after GO.
- A racer who runs out of time gets **no result**, and nothing is saved for them.
- The fix for the laps is guidance, not a change to the track. The better fix is for Rodrigo: close the short cut past the CTT Student Hall with a hedge, or take the hairpin out.

**What was checked**

- `npm test`: 1,234 tests pass, 5 are skipped (they need the database address). Before this work there were 1,178.
- The new code was broken on purpose in 30 ways, one at a time. 28 made a test fail at once. Two did not ("a racer who is out of time can still drive", "the light stands on walls too"). Those two tests were made stricter, and then all 30 were caught.
- In the agent's browser, on a laptop: the campus loop painted at several spots close to buildings (the wall beside the kart now reaches the edge of the picture), the yellow light on the road and on the small map, and the real online page: the host started a race, drove, pressed Enter in the middle, and nothing happened. The results list was looked at with made-up lines.
- The live server, from outside, without an account: it sends the browser rule, refuses a sign-in that comes from another website (403) and one in the wrong format (415), and the leaderboard answers.
- `npm audit`: no known vulnerabilities.

**What was NOT checked**

- Nobody has driven any of this by hand. The agent's browser shows single pictures, not movement. Whether the buildings look right in motion is for Catarina to say.
- A whole online race to the results list, the minute after the first finish with real players, and the missed-checkpoint warning set off by a person in the page. They are checks 49 to 58 in `docs/two-laptop-checklist.md`.
- Nothing of this is on the live server until the pull request is merged. The always-https rule can only be seen there.
- The tests against the real database were not run (nothing about the database changed).

**How to check it yourself**

1. `npm start`, open http://localhost:3000, Single race, Campus loop. Drive, and look for the yellow light on the road ahead and on the small map.
2. On the west side, drive straight past the CTT Student Hall instead of round its end, up to the finish line. The warning should come, and the lap should not count.
3. Drive close along a building. It should be whole up to the edge of the picture.
4. Online, as host: press Enter, drive off, press Enter again. Nothing should happen.

**Git steps, done by the agent at Catarina's request**

- Fetched from GitHub: pull request 16 was merged, and the live server runs it.
- Made the branch `race-fixes` from the up-to-date `main`.
- Six commits, one per step: the race rules, the buildings, the checkpoint light with places and results, the safety rules, stricter tests, the notes.
- Pushed the branch to GitHub as a backup. The pull request is for Catarina to open and for a teammate to approve.

### 12 November 2026, later: the race view, karts as 3D models, bumping, bananas, kart colours

**What was done**

Catarina said the graphics were underwhelming and asked for much more: better karts above all, a campus loop that looks like Nova SBE, a real start line, karts that bump, bananas that make a kart spin, and arrows that show the way. She asked the agent to work freely and be ambitious. Three agents worked at the same time: one on all the pictures (on the branch `race-graphics`), one on the new rules in its own copy of the folder (branch `race-rules`), and one that only read about the real campus online and wrote a report. The rules branch was merged into the pictures branch without a clash, because the split was strict: rules own `shared/` and `server/`, pictures own `client/`.

What a player sees now:

- **The race from behind the kart**, low and close, with a horizon, a sky, clouds, and buildings and trees standing on both sides.
- **Karts as small 3D models** with a driver, a helmet, wings and wheels. They turn smoothly, and the front wheels and the driver turn with the steering.
- **"Your kart" in the menu**: choose the colour of the kart, the helmet and the suit. Other players see them online.
- **A real start**: a grid of painted boxes behind a chequered line, a gantry with three lights, and the camera coming down from above the grid during 3, 2, 1.
- **Arrows** painted on the road, **arrow boards** at the bends, and a **"Wrong way!" warning**.
- **Bumping**: karts push each other instead of passing through.
- **Banana peels** that appear on the road during a race and make a kart spin.
- **The campus loop looking like the campus**: white buildings with dark glass, pale paving, lawns, hedges, palms and pines, the sea, the fort and the lighthouse on the horizon, name signs, the painted beach tunnel.
- **The test oval as a circuit in the woods**, with red and white banks.

| Where | What it is for |
|---|---|
| `client/kart-shape.js`, `client/kart-paint.js` | The kart as a 3D shape, and painting it from any side |
| `client/draw.js` | Puts the whole picture together, in the right order |
| `client/ground.js`, `client/sky.js`, `client/props.js` | The ground, the sky, and trees, signs and bananas |
| `client/track-looks.js` | How each track looks |
| `client/route.js`, `client/scene.js` | Arrows and "wrong way"; the start lights, the camera coming down, the spin |
| `client/camera.js`, `client/buildings.js` | Changed: a low race camera next to the high one; banks, and what a low camera sees |
| `client/kart-choice.js`, `client/kart-panel.js`, `shared/kart-looks.js` | Choosing kart colours, and the rule for what may be chosen |
| `shared/grid.js`, `shared/laps.js`, `shared/track.js` | The starting grid, and the start behind the line |
| `shared/bumps.js` | Karts bumping into each other |
| `shared/hazards.js`, `shared/countdown.js`, `shared/race.js`, `shared/physics.js` | Banana peels and the spin |
| `server/room.js`, `server/online.js`, `server/messages.js` | Changed: the room uses the grid, bumps the karts, looks after the bananas, and passes on kart colours |
| `client/main.js`, `client/online.js`, `client/net.js` | Changed: both race pages show all of the above |
| `tests/` | 9 new files, 358 new tests |

**Why it was done this way**

- **Still no library and no image files.** Everything is drawn by our own code on the browser's canvas, as the team decided on 11 November. A kart is boxes and wheels with real positions, so it can be painted from any side and recoloured. A picture could not.
- **One piece of arithmetic for everything.** The same sum says where the ground, a building, a tree and every corner of a kart land on the screen. That is why they line up, and it has tests.
- **Rules stay rules.** Bumping, bananas and the start are in `shared/` and the server runs them. The pictures only show what the rules worked out. A spinning kart is turned in the picture only: the rules do not turn it.
- **Bananas are chance, but honest chance.** They grow from a number picked at the start of a race. The server picks it, and no message from a browser can place or remove a banana.
- **Kart colours travel as three small numbers**, never as a colour or a text, so nothing harmful can ride along to other players' screens.
- **The campus comes from reading, not from copying.** A helper read the school's campus tour, its campus map and newspaper reports, and described the place in its own words. Nothing was copied, and no logo is used.

**Existing tests that were changed, for the team to check**

The team's rule is never to change a test to make it pass. These five were changed because the rule they pinned was changed on purpose, at Catarina's request. Nothing was deleted or loosened.

| Test | Before | Now | Why |
|---|---|---|---|
| `tests/race.test.js`, the racer at the start | on `track.start`, with the old progress | on pole, behind the line, with the new progress | the start moved |
| `tests/campus-loop.test.js`, where the track starts | just after the finish line | just behind it | the start moved |
| `tests/campus-loop.test.js`, the robot's path that skips the Auditorium | a point at column 31, row 49 | row 48 | from the new start the simple robot got stuck on a corner. What the test checks is unchanged |
| `tests/track-list.test.js`, the start dot on the small map | column 16.5 | column 13.5 | the start moved |
| `tests/room.test.js`, what the server sends about a kart | eleven things | twelve: "spin" was added | a spinning kart has to be shown |

**Decisions**

Decided by Catarina: karts start behind the line; karts bump; bananas; arrows that show the way; better graphics with the karts first.

Decisions made by the agent, please confirm:

1. **Rodrigo's track.** Only where the campus loop starts was changed in `shared/tracks/campus-loop.js` (four squares back, behind the line). The layout, the checkpoints and the storeys are untouched. Everything about how it looks is in new files. Rodrigo should review this.
2. **Bananas appear by themselves**, about one every 2 to 5 seconds, up to 5 on the oval and 12 on the campus loop. They are not items a player holds. They also appear in a single race.
3. **Races with bananas count for the shared leaderboard** like any other, although bananas make a race partly luck.
4. **A bump** gives back half of the closing speed, and all karts weigh the same for now.
5. **A spin** lasts 1.2 seconds, and for 1 second after it a kart cannot be spun again.
6. **The camera swings round a moment after the kart turns**, so you see your kart turn.
7. **The looks**: a circuit in the woods for the oval; for the campus white buildings with glass bands, pale paving, hedges round the edge, palms on the sea side and pines inland.
8. **Names on the campus signs**: Walk of Founders, Green Park, Library, Horizon Hall, Grand Auditorium, Student Hall. No sponsor names and no logos.
9. **Two players may choose the same kart colours.**
10. **A browser may now send a fourth kind of message**, the colours of its kart.

**What was checked, and what was not**

Checked:

- `npm test`: 1,178 tests pass, 5 are skipped (they need the database address). Before this work there were 820.
- The new code was broken on purpose in 68 ways, one at a time (42 in the rules, 26 in the pictures and the kart colours). Every one made at least one test fail.
- One test found a real mistake while it was being written: the wheels of the kart floated a little above the ground.
- In the agent's browser, as single pictures: both tracks in all three views, the start with its lights, the eight kart colours from every side, every tree, sign and banana, the "Your kart" panel, three karts on the online grid in their chosen colours.
- In the real page: a robot drove a race with bananas and spun once; reversing down the straight brought up "Wrong way!"; two pretend players bumped the page's kart forward on the online grid.
- Working out one picture took 2 to 5 thousandths of a second in that browser.

Not checked:

- **How any of it looks in motion.** The agent's browser was not on the screen, so it showed single pictures only. Whether the race view is smooth, and how the camera's swing feels, has to be judged by a person.
- **Bumping and bananas played by people.** All the numbers are first guesses.
- **The live server.** This was only run on a laptop.
- **The campus compared with the real place.** It was built from descriptions. The videos Catarina asked people to film are the next step.
- Firefox, Safari, a phone, an old laptop.
- One thing a robot showed: after a spin a kart can end up standing nose to a wall, and the player has to reverse. The test robot cannot reverse and got stuck there.

**What was done in git**

- A branch `race-graphics` was made from `main` after pull request 15 was merged.
- The rules helper worked in a separate folder, `.worktrees/rules`, on the branch `race-rules`. It was merged into `race-graphics` in two steps and then removed.
- Small commits, one per step, pushed to GitHub as a backup. Nothing was merged into `main`.

**How to check it yourself**

1. Run `npm start` (or `npm run start:pretend`) and open http://localhost:3000.
2. Click "Your kart" and choose colours.
3. Click "Single race" and choose the campus loop. Press an arrow key and watch the start. Follow the arrows. Drive over a banana.
4. Turn round and drive the wrong way for a moment.
5. Open "Online" in two browser windows, choose the same track in both, and drive one kart into the other.
6. `docs/two-laptop-checklist.md` has checks 37 to 48 for all of this with two laptops.

**What comes next**

- People play it and say how it feels. The numbers to tune are named at the top of `shared/bumps.js`, `shared/hazards.js`, `client/camera.js` and `client/draw.js`.
- The campus videos, to make the buildings differ from each other as the real ones do.
- Characters that look different from each other. The kart model was made so that its parts can be swapped.
- Still open from before: slower karts on the campus loop, a results screen with everyone's position, the cup.

### 12 November 2026: accounts, the shared leaderboard, and a new menu

**What was done**

Catarina asked for three things in one pull request: accounts and a shared leaderboard, a better-looking menu and leaderboard, and the campus track reachable from the menu. Two agents worked at the same time. One built the accounts on the branch `accounts-and-design`. A second one built the design in its own copy of the folder, on a branch called `design-menu`. They agreed first on one small file, `client/account-api.js`, which says how a page asks the server about accounts. Each side was written against that file, and at the end the design branch was merged into the accounts branch without any clash.

What a player can do now:

- Open the menu and see a drawn picture of the campus by the sea, with four big choices.
- Click Single race or Online and choose a track from cards with a small map: the test oval or the campus loop.
- Create an account with a user name and a password, sign in, sign out, and delete the account.
- Race online in the room of a track. If signed in, the server saves the time at the finish, and the page says "Saved to the leaderboard: 1st place, 0:28.25".
- Open the Leaderboard and see, for each track, the ten fastest races and laps of all players, with their own row marked.

| Where | What it is for |
|---|---|
| `shared/account-rules.js` | Which user names and passwords are allowed. Used by the page and by the server |
| `server/passwords.js` | Scrambles a password so it is never kept in a readable form |
| `server/store.js` | Every database question about players, sessions and results |
| `server/accounts.js` | The rules: signing in, the lock after wrong passwords, how long a sign-in lasts, the leaderboard |
| `server/api.js` | The addresses the pages use, all starting with `/api/`, and everything they refuse |
| `server/room.js`, `server/online.js` | Changed: the room keeps the finishing order, there is one room per track, and a signed-in racer's result is saved |
| `server/app.js`, `server/db.js`, `server/start.js` | Changed: the account addresses are switched on, the database connection is shared, and browsers are told to run only our own scripts |
| `server/start-pretend.js` | New command `npm run start:pretend`: the game with pretend accounts, for laptops without the database address |
| `client/account-api.js` | How a page asks the server about accounts and the leaderboard |
| `client/index.html`, `client/style.css`, `client/menu.js` | The new menu and the new look of all three pages |
| `client/track-*.js`, `client/mini-map.js` | The "Choose a track" panel |
| `client/leaderboard*.js`, `client/answers.js` | The Leaderboard panel |
| `client/account*.js` | The account corner and its three panels |
| `client/online.js`, `client/online.html`, `client/net.js`, `client/track-choice.js` | Changed: the online page takes the track from its address, and shows who you are signed in as, who is with you, and whether your result was saved |
| `tests/` | 18 new files: 15 with tests and 3 helpers they share. `tests/README.md` lists what each one checks |

**Why it was done this way**

- The server decides, the page asks. A page never sends a time, a player number or a track for a result. The server ran the race, knows the room, and knows the player from the cookie. So there is nothing to fake.
- The password is scrambled with `scrypt`, which comes with Node.js, so no new library was needed. Staying signed in uses a cookie that the page's own code cannot read.
- The rules, the database questions and the internet side are three separate files. The rules can then be tested in a fraction of a second with a pretend store and a pretend clock. The same list of checks runs on the pretend store and on the real database, so the two cannot drift apart.
- The menu's files are split the same way: one file works out what to show and has tests, another puts it on the page.
- No new library was added. The picture in the menu is drawn in the page itself, with no image files and nothing from another website.

**Decisions**

Decided by Catarina on 12 November: the characters will be based on real people. It is written in the brief, with one condition the agent added: a real person's name or face goes into the game or this public repository only after that person said yes.

Decisions made by the agent, please confirm:

1. **No email yet.** An account is a user name and a password. A forgotten password cannot be reset, and that account can then no longer be used. Email needs an outside service and a new secret key. The options: (a) stay like this, simplest, fine for a course demo; (b) add email later for verifying and resetting, as the brief proposes. The agent recommends (a) for now and deciding (b) as a team.
2. **Guests can race online.** Only signed-in players' results are saved. The brief proposed that online races need an account. Letting guests in keeps the demo easy: nobody has to sign up to try it.
3. **One fixed room per track**, instead of rooms with codes. It is a step towards them, not a replacement.
4. **Limits on tries.** Per computer: 20 sign-ups and 30 sign-ins a minute. Those are high on purpose, because the whole campus Wi-Fi looks like one computer to the server. In total: 60 password checks a minute, so a flood of tries cannot slow the races down.
5. **Single race and Online open the track panel** instead of going straight to their pages.
6. **The look**: navy, red and yellow stay. The picture is our own drawing, with no logo and no official artwork.
7. **"Online test" is now called "Online"** on the pages.
8. **A new command, `npm run start:pretend`**, and a line about it in `AGENTS.md` and `README.md`.
9. **Who owns the database tables** is still open in `AGENTS.md`. Catarina built them, so she is the natural owner, but that is for the team to say.

**What was checked, and what was not**

Checked:

- `npm test`: 820 tests pass, 5 are skipped (the ones that need the database address). Before this work there were 473.
- `npm run test:database`, on home Wi-Fi: the tests against the real database pass. They only used tables whose names start with `test_`, and removed them.
- The code was broken on purpose in 26 ways, one at a time, for example "accept requests from other websites", "the lock is not enforced", "a guest's result is saved". Every one made at least one test fail.
- A whole visit through the real server code with a robot driver, outside the browser: sign up, connect, three laps of the test oval, the time on the leaderboard, sign out, delete.
- The same visit in the agent's browser, through the new menu, with pretend accounts: create an account (first with a name and a password that are too short), join the room, a robot drove three laps in the real page, "Saved to the leaderboard: 1st place, 0:28.25", the Leaderboard panel showed that time, sign out, a wrong password, sign in, a wrong password for deleting, delete. The page's code could not see the cookie.
- The real `npm start` with a database address that cannot work: the game ran, and the account addresses answered "could not be reached" without any detail.
- The menu at laptop, tablet and phone sizes, the online page at phone size, and no error in the browser's console under the new rule about scripts.

Not checked:

- **The live server.** It has no accounts until this is merged. The real tables do not exist yet: the server creates them the first time they are needed. After the merge, checks 25 to 36 in `docs/two-laptop-checklist.md` need to be done on the public link.
- Two real people, signed in, racing each other on two laptops.
- How long the password scrambling takes on the free server. On this laptop it takes 70 thousandths of a second.
- Whether the limit per computer sees the right address behind Render's network.
- Whether GitHub runs the tests on this pull request. On 12 November its test runs had been stuck waiting since the evening before, and nobody knows why yet.
- Firefox, Safari, a real phone, a screen reader, and how smooth the menu's moving parts are. The agent's browser was not on screen, where nothing moves smoothly.
- How the campus loop feels online. Karts are still too fast for it, which the team has not decided on.

**What was done in git**

- A branch `accounts-and-design` was made from `main` as it was after pull request 14.
- The second agent's work was kept in a separate folder, `.worktrees/design`, on the branch `design-menu`, so the two agents never wrote in the same folder. That folder was never part of the repository, and it was removed at the end, together with the `design-menu` branch, once everything in it was merged.
- The work was saved as small commits, one per step, and the branch was pushed to GitHub several times as a backup.
- `design-menu` was merged into `accounts-and-design`. Nothing was merged into `main`: that happens when a teammate approves the pull request.

**How to check it yourself**

1. In the project folder run `npm run start:pretend` and open http://localhost:3000.
2. Click "Create account". Try a name of two letters first. Then make a real one.
3. Click "Online", choose a track, press Enter, and drive the three laps.
4. Go back to the menu and open "Leaderboard". Your time is there.
5. Stop the server with Ctrl+C and start it again: the account is gone. That is what "pretend" means.

**What comes next**

- A teammate reviews and merges the pull request. Then the live server needs the checks above.
- The team confirms or changes the decisions listed above.
- Still to build: characters, items, computer karts, the cup, more campus tracks, and a results screen that shows everyone's position (Pedro's plan).
