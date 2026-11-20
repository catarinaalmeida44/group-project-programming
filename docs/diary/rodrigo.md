# Rodrigo's diary

Rodrigo Simeão Versos (GitHub rodrigosversos). Entries from 11 November 2026 on, newest at the top. How to write one is in `README.md` in this folder.

### 20 November 2026: the NOVA SBE logo on the menu

**What was done**
- The menu title showed "Nova SBE" as words on a slanted red label. It now shows the school's real logo, above "Kart racer", which stays as it was.
- The logo file is the one I gave (black on a see-through background). The agent only cut it to the logo and made it white, so it shows on the dark menu: `client/images/nova-sbe-logo.png`. The picture says "Nova SBE" to screen readers and if it cannot load.
- Files: `client/index.html` and `client/style.css` (Catarina's), the new `client/images/` folder, the new `tests/nova-logo.test.js`, and the notes.

Branch `rodrigo-nova-logo`, from `main` after the recorded music (#42).

**Decisions**
- Mine: the real logo instead of the red label.
- Decision made by the agent, please confirm: the logo in white; its size (between 136 and 224 dots wide, growing with the window); only the menu gets it, the race pages keep "Nova SBE kart racer" as words in the top bar.
- **Question for the team:** NOVA SBE has rules for using its logo, and our project is public on GitHub. We should check with the professor that a class project may show it.

**What was checked, and what was not**
- `npm test`: 2,742 passed, 5 skipped (7 new tests).
- Broken on purpose four ways, and a test failed every time: the alt text removed, the logo loaded from another website, the old red label put back, the file missing.
- In a Chrome browser without a screen, at 1280 and at 420 dots wide: the logo loads, is sharp and sits above "Kart racer". The only error was the accounts service (no database on the agent's computer), as before.
- **Not checked:** on my laptop and on the live server.

**How to check it yourself**
Run `npm start`, open http://localhost:3000, and look at the top left of the menu. Make the window narrow: the logo gets smaller but keeps its shape.

### 20 November 2026: time of day, fly-over, How to play

**What was done**
- **Time of day**, in Settings: Morning, Afternoon (as before), Sunset, Night. The sky, the sun (or the moon and stars), the haze, the horizon, the shadows and the light over the picture change. Only the picture: no rule, lap or time.
- **Fly-over**: before a single race starts, the camera glides round the track over the karts waiting on the grid. An arrow key starts the countdown as before.
- **How to play**: a card with the goal, the keys of that page and four tips, by itself the first time on a race page, then with a button next to "Game settings".

Branch `rodrigo-time-of-day`, from `main` after the security policy (#40).

| File | What changed |
|---|---|
| `client/time-of-day.js` | New. The four times, remembered, and how each changes a track's look |
| `client/fly-over.js` | New. The camera gliding round a track (moved from the track tour) |
| `client/how-to-play.js` | New. The card and its words |
| `client/draw.js`, `client/sky.js` | The light over the picture, the sky behind it, a coloured sun glow, the moon, stars, tinted clouds |
| `client/index.html`, `client/settings-panel.js` | The time of day in Settings |
| `client/main.js` | The fly-over before the start; the time of day; the card |
| `client/online.js`, `client/double.js`, `client/track-tour.js` | The time of day and the card (the tour: also `?time=sunset`) |
| `client/race.html`, `client/double.html`, `client/online.html`, `client/style.css` | The card's box and button, and its look |
| `tests/time-of-day.test.js` | New. 37 tests |
| `WALKTHROUGH.md`, `PROJECT_BRIEF.md`, the READMEs | Kept true |

**Why it was done this way**
- **A changed look, not changed drawings.** Every track already describes its sky, haze and horizon (`track-looks.js`); a time of day changes those numbers, and one light is laid over the picture. Nothing in the tracks had to change.
- **The sky goes behind the picture at the end**, so the light falls on the ground, buildings and karts but not on the stars, and buildings still hide the sun.
- **The fly-over only before the first key press**, so it never delays a race.
- **The card on top of the game settings card**, and the race waits until it is closed.

**Decisions**
- Mine: time of day you can choose, sunset, the fly-over, How to play.
- Decision made by the agent, please confirm: the four times and their colours; the choice in the menu's Settings (not the game settings card); the fly-over only in a single race; the card's words; the card comes by itself only once per browser.
- Decision made by the agent, please confirm, and tell the owner: Catarina's `draw.js`, `sky.js`, `index.html`, `settings-panel.js`, the three race pages and `style.css` changed.

**What was checked, and what was not**
- `npm test`: 2,689 passed, 5 skipped (37 new tests).
- Broken on purpose in 7 ways; all 7 made a test fail.
- In Chrome without a screen: the four times on the Nova lap (pictures compared); Settings saves Sunset and says "Races will be at sunset"; on a first visit the card comes up over the game settings card, an arrow key does not start the race, Enter closes it and it is remembered, a second Enter confirms the game settings; the fly-over moves while nothing is pressed; the race starts and drives; a second visit has no card; the button opens it on the online and two-player pages, Esc closes it; no page errors. Two problems were found this way and fixed: the game settings card took the keyboard from the new card, and then the other way round.
- **Not checked:** how night looks on a real laptop screen (it may be too dark or too light); the fly-over on the campus loop and test oval was only checked by the tests (never over a wall), not by eye.

**How to check it yourself**
Run `npm start`, open http://localhost:3000, Settings, choose **Sunset**, then a Single race: the card comes up; press Let's race, confirm the settings, and watch the camera fly round the track until you press an arrow key. Try **Night** too. Or look without driving: http://localhost:3000/track-tour.html?track=nova-lap&time=night.

### 20 November 2026: a security policy

**What was done**
A security policy, `SECURITY.md`, so that GitHub's Security tab no longer says "Security policy: Disabled". It says how to report a security problem privately (the **Report a vulnerability** button on the Security tab, or a team member on GitHub) instead of in a public issue, what not to do while testing, and what the game already does to stay safe. Also a line for it in `README.md`. Branch `rodrigo-security-policy`, from `main` after the README for the submission (#39).

**Why**
Security is 10% of the grade ("minimal, pinned dependencies with no known vulnerabilities"). A policy shows how problems would be handled. Everything it says the game does was checked against the code: passwords scrambled with `scrypt` and never stored, five wrong passwords lock an account for ten minutes, sessions in an `HttpOnly`, `SameSite=Lax`, `Secure` cookie that ends after seven days, every browser message checked, `.env` ignored by git, three pinned libraries.

**Decisions**
- Mine: turn on everything on the Security tab.
- Decision made by the agent, please confirm: what the policy says (reporting privately, "best effort, usually within a few days", only `main` gets fixes).
- **For Catarina (only the owner can):** turn on **Dependabot alerts** and **Dependabot security updates** (not the routine version updates: they would open a pull request for every new library version), **code scanning** with "Default" setup, and **private vulnerability reporting**, so that the "Report a vulnerability" button in the policy exists.

**What was checked**
- `npm audit` on 20 November: 0 known vulnerabilities, also counting only the libraries the game runs on.
- `npm test`: all pass (no code changed).

### 20 November 2026: music, button clicks, the hype sound and the sound switches

**What was done**
- **Music**, as in kart games: the **menu** song (also in an online room before a race), the **race** song from GO, 15% faster on the final lap, the **finish** fanfare when you cross the line, and the **podium** song after it. No music in the countdown, so the beeps are heard.
- **Button clicks** in the menu and on the race pages.
- The **hype sound** when the character choice is done: the menu waits about a second for it before going to the race. Online it plays once when two or more people are in the room and all have a character.
- **Settings > Sound**: **All sound** (and M during a race), and one switch for each kind: **Music**, **Race sounds**, **Menu sounds**.

Branch `rodrigo-music`, from `main` after the game settings and two players (#37).

| File | What changed |
|---|---|
| `client/music-score.js` | New. The four songs as notes, and the timing sums |
| `client/music-cues.js` | New. Which song when, and "music on or off" |
| `client/music.js` | New. Plays the songs |
| `client/audio-switches.js` | New. The four switches |
| `client/ui-sound.js`, `client/ui-sound-cues.js` | New. The click and the hype, and when each plays |
| `client/sound.js` | The race sounds also obey All sound |
| `client/settings-panel.js`, `client/index.html` | The four switches in Settings |
| `client/menu.js`, `client/main.js`, `client/double.js`, `client/online.js` | Music, clicks and hype on every page; M is All sound |
| `client/sound-test.html`, `client/sound-test.js` | Buttons to listen to every song, the fast final lap, the click and the hype |
| `tests/music.test.js`, `tests/audio-switches.test.js` | New. 45 and 15 tests |
| `WALKTHROUGH.md`, `PROJECT_BRIEF.md`, the READMEs | Kept true |

**Why it was done this way**
- **No Mario Kart music.** The brief says no Nintendo music, and copying it would break copyright. The tunes were composed for our game; they sound like a kart game, but they are our own.
- **Made by our own code, no music files**, as Catarina decided for all sound on 15 November: nothing to download and no licences.
- **The notes are written down as data and tested**, the player is checked by ear: the same split as the other sounds.
- **"Race sounds" is the old box**, kept where it was saved, so nobody's earlier choice is lost.

**Decisions**
- Mine: music for menus, race and winning; clicks; the hype; switches by kind plus a master; the hype "when choosing is done".
- Decision made by the agent, please confirm: the music is made in code (I did not answer that question); the four songs, speeds and loudness; silence in the countdown; the menu waits about a second for the hype; online the hype needs two or more people; M is now All sound (it was the race sounds).
- Decision made by the agent, please confirm, and tell the owner: `client/sound.js`, `client/settings-panel.js`, `client/index.html`, `client/menu.js`, `client/main.js`, `client/double.js`, `client/online.js` and the sound check page changed (Catarina's area). She should listen to the songs on `sound-test.html`.

**What was checked, and what was not**
- `npm test`: 2,652 passed, 5 skipped (60 new tests).
- Broken on purpose in 10 ways; 9 made a test fail at once, the tenth after the pretend page parts in a test were made stricter.
- In Chrome without loudspeakers, counting the notes each page asks for: the menu is silent until the first click and then plays; Music off stops it, on again starts it; All sound off stops it and greys out the other switches; Race plays the hype and goes to the race after about 1.4 seconds; in a race the countdown has only beeps, after GO the race music plays, M silences everything and the page says "off"; the sound check page plays every song, the click and the hype; online, two players both hear the room music and the hype comes when the second arrives; no page errors.
- **Not checked:** how it sounds to a person: nobody has listened yet. That is the next step (`sound-test.html`).

**How to check it yourself**
Run `npm start`, open http://localhost:3000 and click anywhere: the menu music starts. Open Settings: four switches. Choose a track and a character and press Race: the hype, then the race. After GO the race music; on the last lap it speeds up; at the finish the fanfare, then the podium song. To listen to each piece alone: http://localhost:3000/sound-test.html.

### 19 November 2026: the sea on the Nova lap

**What was done**
On the Nova lap you now see Carcavelos beach and the sea past the coast road: dry sand, wet sand, a line of surf, and blue water out to the horizon. Before, the ground past the edge of the map was one plain pale colour and the sea was only a thin line on the horizon. Branch `rodrigo-sea`, from `main` after my difficulty levels (#33) were merged.

| File | What changed |
|---|---|
| `client/shore.js` | New. For each row of the race view, which part of it lies past each band of the beach and sea |
| `client/ground.js` | Paints the shore under the map, and the water again over the haze |
| `client/nova-lap-look.js` | The beach and sea of the Nova lap: where each band starts and its colour |
| `tests/shore.test.js` | New. 12 tests |
| `WALKTHROUGH.md`, `PROJECT_BRIEF.md`, the READMEs | Kept true |

**Why it was done this way**
- **Only a picture.** No rule changed: karts cannot reach the beach, the map's letters are the same, and laps and times are not affected.
- **Under the map**, row by row, the same way the race view already paints the ground, so the sea lines up with the road and moves with the camera.
- **The water again over the haze**, partly see-through, because otherwise the far sea looks almost white.
- **No Google Earth picture.** I asked for a Google Earth or Maps scan. Their terms do not allow copying their pictures into another product, so the agent did not. It tried OpenStreetMap instead (free, used for the campus loop), but its services refused automatic requests. So the beach width (about 55 m of sand) is a guess; the Nova lap is not to scale anyway (its coast road is straight).

**Decisions**
- Mine: see the sea from the outdoor parts of the Nova lap.
- Decision made by the agent, please confirm: no satellite picture (see above); the bands and their colours; about 55 m of sand; the water painted 60% over the haze.
- Decision made by the agent, please confirm, and tell the owner: `client/ground.js` and `client/nova-lap-look.js` changed (Catarina's area).

**What was checked, and what was not**
- `npm test`: 2,174 passed, 5 skipped (12 new tests).
- Broken on purpose in 6 ways; 5 made a test fail at once, the sixth after I added one more case to a test.
- With the track tour (`track-tour.html?track=nova-lap`) in Chrome without a screen: along the coast road and from the path to the beach the sand and the blue sea show to the left; no page errors. About 23 frames a second with the sea and without it: no difference.
- **Not checked:** how it looks on a real laptop with a graphics card, and whether the beach width matches what you see on campus.

**How to check it yourself**
Run `npm start` and open http://localhost:3000/track-tour.html?track=nova-lap, which flies round the lap by itself. Or race the Nova lap: on the path west past the beach tunnel and along the coast road, the beach and the sea are on your left.

### 19 November 2026: Easy, Normal and Hard

**What was done**
In a single race the computer karts now have three levels, chosen with three buttons above the track: **Easy**, **Normal**, **Hard**. Pressing one starts the race again at that level, and the browser remembers it. Online stays Normal. Branch `rodrigo-difficulty`, from `main` after full screen (#32) was merged.

| File | What changed |
|---|---|
| `shared/computer-driver.js` | The levels (`LEVELS`, `LEVEL_SHIFT`, `atLevel`) |
| `shared/practice-race.js` | A single race at a level (Normal if none is given) |
| `client/difficulty.js` | New. The remembered level and the buttons |
| `client/race.html`, `client/main.js`, `client/style.css` | The three buttons, and a new race at the chosen level |
| `tests/difficulty.test.js` | New. 17 tests |
| `WALKTHROUGH.md`, `PROJECT_BRIEF.md`, the READMEs | Kept true |

**Why it was done this way**
- **A level moves the personality, never the kart.** On Easy they drive slower and more carefully, on Hard faster and bolder, but never faster than the kart can go: no cheating. PCP is still the Daredevil on Easy.
- **Single race only** (my choice): online every room plays the same.
- **Hard is only a little harder.** On Normal the computer karts already drive close to top speed; more would need a faster kart, which would be unfair.

**Decisions**
- Mine: bring levels back for the single race; build it now and propose it to the team in the pull request.
- **The team decided on 17 November: no difficulty levels.** This reverses that, so the team must accept or close the pull request.
- Decision made by the agent, please confirm: the buttons on the race page (not in the menu); how much each level moves the numbers; the browser remembers the level; the level buttons are hidden on a track without computer karts.
- Decision made by the agent, please confirm, and tell the owner: `client/race.html`, `client/main.js` and `client/style.css` changed (Catarina's area).

**What was checked, and what was not**
- `npm test`: 2,143 passed, 5 skipped (17 new tests).
- Broken on purpose in 7 ways; all 7 made a test fail. One of my tests was wrong at first: on Hard a kart went a little past top speed, but always with another kart within 40 units, so it was a bump (the shared bump rules, the same for players and on Normal too). The test now leaves out the moments right next to another kart.
- 20 races per level on each track: everyone finished, never in a wall. The winning computer kart takes, on average: test oval 29.6 s / 26.0 s / 25.2 s (Easy / Normal / Hard), campus loop 71.2 / 63.5 / 60.9 s, Nova lap 89.6 / 76.5 / 74.7 s.
- In Chrome without a screen: Normal pressed at first, Easy pressed and saved, still Easy after reloading the page, Hard pressed; no page errors.
- **Not checked:** whether a beginner can really win on Easy.

**How to check it yourself**
Run `npm start`, open http://localhost:3000, choose Single race. Above the track: Computer karts **Easy · Normal · Hard**. Press Easy and race: they are slower. Reload the page: Easy is still chosen.

### 19 November 2026: full screen

**What was done**
Both race pages (single race and online) can now be played on the whole screen: a **Full screen** button at the right end of the numbers above the track, or the **F** key. **Esc** or F again goes back. The numbers (lap, time, place) stay at the top, and the picture grows until it touches the edges of the screen, keeping its shape. Branch `rodrigo-full-screen`, from `main` after my online computer karts (#31) were merged.

| File | What changed |
|---|---|
| `client/full-screen.js` | New. Asks the browser for full screen, or to leave it, and keeps the button's words right |
| `client/keyboard.js` | The F key (not with Ctrl, Cmd or Alt) |
| `client/race.html`, `client/online.html` | A "play area" around the numbers and the picture (what goes on the whole screen), the button, and F in the help line |
| `client/style.css` | The button, and how the play area looks on the whole screen |
| `client/main.js`, `client/online.js` | Set up the button and the F key |
| `tests/full-screen.test.js` | New. 14 tests |
| `WALKTHROUGH.md`, `PROJECT_BRIEF.md`, the READMEs | Kept true |

**Why it was done this way**
- **The browser's own full screen** (the "Fullscreen API"): the same thing a video player uses. Nothing to install.
- **The picture is enlarged, not redrawn** (my choice): quick and safe, and the drawing code did not change. The price: on a big screen it is a little soft.
- **The numbers come along**, so lap, time and place can still be seen. Messages and results on top of the picture come along too.
- **Ctrl+F is left alone**, because it is how a browser searches a page.

**Decisions**
- Mine: full screen on both pages; enlarge rather than redraw; build it and ask Catarina to review, rather than ask her first.
- Decision made by the agent, please confirm: the button's place (right end of the numbers) and words ("Full screen" / "Leave full screen"); the F key; the help lines and the online status lines are not shown in full screen.
- Decision made by the agent, please confirm, and tell the owner: `client/race.html`, `client/online.html`, `client/style.css`, `client/keyboard.js`, `client/main.js` and `client/online.js` changed. They are Catarina's area.

**What was checked, and what was not**
- `npm test`: 2,126 passed, 5 skipped (14 new tests).
- The new code was broken on purpose in 8 ways. 7 made a test fail at once. "The button is shown where full screen cannot be used" did not: my pretend button already started hidden. The test was made strict and then failed.
- In Chrome without a screen, 1600 by 900, on both pages: F put the play area on the whole screen and the picture grew from 928 by 557 to 1581 by 829; F again and the button switched back and forth; the button's words followed; no page errors.
- **Not checked:** a real laptop screen and Esc pressed by a person (the test browser has no person to press it); Safari and Firefox; a phone.

**How to check it yourself**
Run `npm start`, open http://localhost:3000, choose Single race. Press **F**: the game fills the screen. Drive a bit, press **Esc**: back to the page. Click **Full screen** at the right of the numbers: the same. Do it on the Online page too.

### 18 November 2026: computer karts online, and a mood for each race

**What was done**
- Online races are now filled with computer karts, as I wanted. When the host starts a race, the characters nobody in the room is become computer karts, up to 6 karts in all. The host can switch them off with a tick box under the track.
- I saw the computer karts drive the same race over and over. That was because they used no chance and always started from the same place. Now each one gets a "mood of the day" for each race: its personality's numbers move a little. Branch `rodrigo-online-computer-karts`, first from `main` after Nova lap; on 19 November put on top of `main` again after the room of six and one kart per signed-in player were merged.

| File | What changed |
|---|---|
| `server/computer-players.js` | New. Adds the computer karts to the room as ordinary players, presses their keys every step, and says when they must leave |
| `server/online.js` | Fills a race at the start, the on/off switch (host only, no race on), sends them away at the right moments, tells every browser whether they are on |
| `server/messages.js` | The new message: computer karts on or off |
| `server/start.js`, `server/start-pretend.js` | Every room starts with computer karts on |
| `client/computers-switch.js` | New. What the tick box shows, and the "(computer)" names |
| `client/online.html`, `client/online.js` | The tick box, the names, and "players here" counting only people |
| `shared/computer-driver.js` | The mood of the day (`moodFor`) |
| `shared/practice-race.js` | Each computer kart of a single race gets a mood from the race's seed |
| `tests/computer-players.test.js`, `tests/online-computers.test.js`, `tests/computers-switch.test.js`, `tests/computer-moods.test.js` | New. 25, 10, 13 and 10 tests |
| `WALKTHROUGH.md`, `PROJECT_BRIEF.md`, the READMEs | Kept true |

**Why it was done this way**
- **A computer kart online is just a player whose keys the server presses.** So the room (`room.js`, not my area) did not change, the test that guards the bananas stays as it is, and a computer kart can do nothing a person could not.
- **The server decides for them**, not a browser, so no one can steer a computer kart.
- **Moods come from the race's random number.** Races differ, but the same number gives the same race, so the tests can still replay one exactly.
- **A person comes before a computer kart.** Since 19 November a room takes six, so one person and five computer karts fill it. Someone who arrives then still gets in: between races the computer karts leave, during a race one makes way and the person watches.
- **The test server keeps computer karts off** unless a test asks for them, so the older online tests (not mine) did not need to change.

**Decisions**
- Mine: computer karts fill empty places online; 6 karts in all, one per character; the host can switch them off; a mood for each race (not a shuffled grid, not mistakes).
- Decision made by the agent, please confirm: the switch starts on in every room; computer karts leave before each start, when no person is racing any more, and if one would become the host; someone who arrives during a race still only watches; how much a mood can move each number (daring and care 0.15, pace 0.03, 10 units aside); the page names them "Dean (computer)" and counts only people in "players here".
- Decision made by the agent, please confirm, and tell the owners: `server/online.js`, `server/messages.js`, `server/start.js`, `client/online.html` and `client/online.js` changed. They are not in my area.

**What was checked, and what was not**
- `npm test` on 19 November, on top of the newest `main`: 2,112 passed, 5 skipped (58 new tests). One of my online tests had to change after the rebase: its pretend accounts signed every browser in as the same player, which the new "one kart per signed-in player" rule (rightly) sends away; now each browser is its own player.
- The new code was broken on purpose in 22 ways. 20 made a test fail. "Computer karts stay after the last person leaves" changes nothing you can see (the server sends them away on its next step anyway). "A person's result is never saved" is caught by the existing account tests. One of my new tests was too loose at first and was made strict.
- 40 single races on each of the three tracks with moods: every computer kart finished, none was ever inside a wall, and the finishing order changed in 28 to 31 of the 40.
- Two Chrome browsers without a screen, on the campus loop online: the host could use the tick box and the other could not; at the start the 4 free characters joined as computer karts; the line said "With you: Professor Ricardo Pereira (computer), Cici Boss (computer), FranFon (computer), PCP (computer) and 1 guest"; no page errors.
- **Not checked:** a real online race between two laptops over the internet; how the server copes with six full rooms of computer karts at once (each computer kart is a little extra work, 60 times a second); a whole online race to the results board in a browser.
- **Not handled:** a computer kart taking over the kart of someone who drops out (in the brief, not built); items; catch-up.

**How to check it yourself**
Run `npm start`, open http://localhost:3000, pick a character, choose Online and a track. Under the track the box "Computer karts fill the empty places" is ticked. Press Enter: the characters you did not pick line up in front of you and race. Race again: they drive differently. Untick the box (you are the host while alone) and press Enter after the race: you race alone. Open a second browser window to see that only the host can use the box.

### 17 November 2026: computer karts in a single race

**What was done**
A single race is now against five computer karts: the five characters of Pedro's cast that I did not choose (if I chose none, the first five). Each character always drives with its own personality: PCP Daredevil, Dean Steady, Professor Ricardo Pereira Careful, Cici Boss Hunter, FranFon Smooth, Ró Versos Calm. They start on the front of the grid and I start behind them. They decide what to do with utility AI, the method our professor suggested: many times a second each one looks around, gives a score from 0 to 1 to each thing it could do (follow the racing line, brake for a bend, overtake, dodge a banana, back away from a wall), and does the one with the highest score, by pressing the same four keys a player has. The race page now also shows my place ("3rd of 6"), and the finish message says where I finished. Branch `rodrigo-computer-karts`, from `main` after Pedro's characters and the fix for duplicate online karts were merged.

| File | What changed |
|---|---|
| `shared/computer-driver.js` | New. The brain of a computer kart: looking around, the five scores, the best one, the keys. The six personalities, their weights, and which character drives with which |
| `shared/practice-race.js` | New. The single race with computer karts: which characters race, the grid, the countdown, every kart moving each step, bumps and bananas, and the karts in the form the place line needs |
| `client/main.js` | Runs the new race instead of the race with one kart, with the character I chose in the menu; draws the computer karts in their characters' colours; shows the place and the place at the finish |
| `client/race.html` | The place next to the time |
| `tests/computer-driver.test.js` | New. 38 tests |
| `tests/practice-race.test.js` | New. 19 tests |
| `WALKTHROUGH.md`, `PROJECT_BRIEF.md`, `client/README.md`, `shared/README.md`, `tests/README.md` | Kept true |

**Why it was done this way**
- **Utility AI** (my choice, as the professor suggested). With scores, two things that matter at once are weighed against each other, and a personality is only a different set of weights, not different code. A fixed list of rules would let one rule always win; a "state machine" (one mode at a time) needs rules for every switch.
- **The same keys and the same rules as a player.** A computer kart cannot cheat: it goes through `stepRacer` like me, with the same top speed. This is also what will let the server use the same drivers online later.
- **In `shared/`.** Deciding is a calculation, so it sits with the rules, can be tested without a browser, and can run on the server later.
- **The racing line the arrows already use.** No second line to draw for each track. Each driver remembers which stretch of it it is on, so it does not cut across at the CTT hairpin.
- **No dice.** The same race gives the same decisions, so the tests can drive whole races.

**Decisions**
- Mine: computer karts in single race, with utility AI; the computer karts are the characters available online.
- The team's (17 Nov): no difficulty levels, so there is one level.
- Decision made by the agent, please confirm: five computer karts, and I start at the back of the grid; which personality each character has (the people in the cast may have an opinion about who is the Daredevil and who is Calm); without a chosen character, the first five of the cast race; the same driver stats as the player; a finished computer kart rolls to a stop; the race is over for me when I finish, even if computer karts are still driving; the campus loop's racing line and hairpin as they are.
- Decision made by the agent, please confirm, and tell the owner: `client/main.js` and `client/race.html` changed. They are not in my area.

**What was checked, and what was not**
- `npm test`: 1,460 passed, 5 skipped (57 new tests).
- The new code was broken on purpose in 12 ways. Nine made a test fail at once. Two tests were too loose ("a spinning kart counts as stuck", "a kart may jump to any stretch of the line"): they were tightened, and then failed as they should. The third ("a finished computer kart keeps choosing keys") cannot fail, because `shared/race.js` already ignores the keys of a finished kart. After the characters came in, five more breaks: four made tests fail; the fifth ("names like toString count") changes nothing that can be seen.
- One of my own tests was wrong at first (the sharp bend was too close for the difference between careful and daring to show). The test was fixed, not the code.
- Whole races in Node, for every character I could choose and for none: all five computer karts finish all laps on both tracks, never inside a wall, never stuck. A race takes them about 25 to 30 seconds on the test oval and 59 to 69 seconds on the campus loop, and the winner changes from race to race.
- In a Chrome browser without a screen, on both tracks, with Ró Versos chosen: the other five characters stand on the grid in their colours, Ró is not among them, drive off at GO, all finish 3 laps, the place shows "6th of 6" for a kart that does not move, and there were no errors.
- **Not checked:** a person racing them on a real laptop; whether they are too fast or too slow for a beginner; how they look from behind in a long race.
- **Not handled:** computer karts online, items, catch-up.

**How to check it yourself**
Run `npm start`, open http://localhost:3000, choose Single race and then the campus loop. Five karts in the colours of the characters you did not choose should stand in front of you. Choose another character in the menu and race again: the line-up changes. Press an arrow to start. They drive off at GO, the place shows next to the time, and when you finish the message says your place. Try also the test oval.

### 11 November 2026: buildings that stand up

**What was done**
In the view behind the kart, the buildings of the campus loop now stand up, as tall as their storeys, with shaded sides and flat roofs. A kart driving behind a building disappears behind it. Only the picture changed: the driving rules are the same, and the test oval and the online page still have flat walls. Branch `rodrigo-building-heights`, which starts from `rodrigo-campus-loop`, so it can only be merged after that one.

| File | What changed |
|---|---|
| `shared/tracks/campus-loop-storeys.js` | New. One digit per square of the campus loop: how many storeys tall it is (0 is flat) |
| `shared/tracks/index.js` | `storeysOf(track)`: the storeys of a track, or none |
| `client/buildings.js` | New. Turns storeys into sides and roofs, and works out which can be seen from behind the kart, and where on the screen |
| `client/draw.js` | Paints the sides and roofs with the other karts, furthest first. Our own kart is now painted last, so nothing covers it |
| `client/main.js` | Gives the painter the buildings of the chosen track |
| `tests/buildings.test.js` | New. 16 tests |
| `WALKTHROUGH.md`, `PROJECT_BRIEF.md`, `client/README.md`, `shared/README.md`, `tests/README.md` | Kept true |

**Why it was done this way**
- **No new library.** The karts already stand up in this view, using the camera arithmetic in `client/camera.js`. The buildings use the same arithmetic, so they line up with the karts and the ground, and every line can be explained.
- **Height only in the picture.** The rules (`shared/`) run on the server too, which draws nothing. Keeping the storeys out of the rules means nothing about driving or laps changed.
- **The storeys.** I asked for the storey counts from OpenStreetMap, but OpenStreetMap has none for the campus (no `building:levels` or `height` on any campus building). So they come from the school's campus map, which lists what is on each floor of each building. A building counts the floors from 0 up on which something of it is listed: Cascais Academic Hall 3, CTT Student Hall 2, Santander Academic Hall 3, Ming C. Hsu Executive Hall 3, Grand Auditorium 3, gym and Horizon Hall 3, Library 2, main building (Hovione Atrium, KPMG Gallery) 3, Milestone residence 3.
- **Furthest first.** Painting from far to near (the painter's way) is simple and enough for blocks. Each side and roof is one square (6 metres), so pieces are small and the order is mostly right.

**Decisions**
- Mine: the buildings stand up; their heights come from storey counts.
- Decision made by the agent, please confirm: the storeys above, from the school's campus map, as a first guess for me to check on campus; 3.5 metres a storey; buildings with no count get 2 storeys; the edge of the campus stays flat; light grey sides with a different shade per direction and darker roofs; our own kart always painted on top.
- Decision made by the agent, please confirm, and tell the owner: `client/draw.js` (the drawing) and `client/main.js` changed again. Neither has an owner yet.

**What was checked, and what was not**
- `npm test`: 473 passed, 5 skipped (16 new tests).
- `client/buildings.js` was broken on purpose in five ways: sides facing away shown, sides drawn downwards, nothing cut at the bottom of the screen, storeys allowed on road, a side on every edge. Four made tests fail at once. The third did not: the test for the bottom of the screen allowed too much. It was tightened (nothing may be drawn below the screen at all), and then it failed as it should, for the sides and for the roofs.
- One of the new tests was wrong at first (it looked for the side between two blocks at the wrong place). The test was fixed, not the code.
- In a Chrome browser without a screen: the buildings stand up along the Walk of Founders and the east side, roofs and sides are painted in the right order there, the test oval is still flat, and there were no errors. Pictures per second in the view behind the kart: about 30 on the campus loop, as before the buildings, and 60 on the test oval.
- **Not checked:** a person driving past the buildings, on a real laptop; how it looks in the courtyards and round the Auditorium (my test drives did not get there); whether the storeys are right.
- **Not handled:** buildings far ahead show at the top right, where the small map can cover them; no windows, glass or sloping roofs; where two pieces are about as far away, the wrong one can end up on top for a moment.

**How to check it yourself**
Run `npm start`, open http://localhost:3000/race.html?track=campus-loop and stay in the first view (behind the kart). The Milestone residence should stand on your left at the start and the main building on your right. Drive round the loop and look at the halls round the CTT hairpin and the Grand Auditorium. Open http://localhost:3000/race.html: the test oval should look as before.

**What comes next**
- Check the storeys on campus and tell me which are wrong. Each is one digit per square.
- The team: confirm the decisions above. This branch can only be merged after `rodrigo-campus-loop`.
- If it feels slow on a real laptop: paint only the part of the track that is on screen.

### 11 November 2026: the campus loop, the first campus track

**What was done**
My area is the maps: the race tracks, taken from the Nova SBE campus and its building. The first one is built: the **campus loop**, a loop round the outside of the campus, made from OpenStreetMap. It can be driven on the single race page at `race.html?track=campus-loop`. It is not in the menu yet. Branch `rodrigo-campus-loop`.

| File | What changed |
|---|---|
| `shared/tracks/campus-loop.js` | New. The campus loop: 64 by 62 squares of 6 metres, a start, a finish line and five checkpoints |
| `shared/tracks/index.js` | New. The list of all tracks, each with a short name for addresses (`test-oval`, `campus-loop`) |
| `client/track-choice.js` | New. Reads the track from the address of the race page. Anything that is not on the list gives the test oval |
| `client/main.js` | Uses the chosen track instead of always the test oval, and writes its name on the page |
| `client/race.html` | "A race on the test track" now shows the name of the chosen track |
| `client/draw.js` | The small map in the corner is never bigger than 180 pixels. On the campus loop it covered much of the screen |
| `tests/campus-loop.test.js` | New. 8 tests |
| `tests/track-choice.test.js` | New. 12 tests |
| `README.md`, `PROJECT_BRIEF.md`, `WALKTHROUGH.md`, `docs/team-guide.md`, `shared/README.md`, `client/README.md`, `tests/README.md` | Kept true: the campus loop, my area, my name in the team tables, the tests |

The route, driven clockwise as it looks on the map: east along the Walk of Founders, south past the Library and Navigator Park, round the gym to EDP Plaza, round the southern tip of the Grand Auditorium, north-west along the outer path, up the western gardens, a hairpin through the two courtyards on either side of the CTT Student Hall, and back to the Walk of Founders. About 1.1 km along the driving line.

**Why it was done this way**
- **Where the layout comes from.** We looked for plans first. The school's online campus map (campustour.novasbe.pt) has a drawing of every floor, but it is drawn at a slant: its walls meet at about 123° instead of 90°, and it belongs to the school. No floor plans of the building are published. The architects (Vítor Carvalho Araújo and António Barreiros Ferreira) have only published pictures, not plans, and pictures taken at an angle cannot be measured. OpenStreetMap draws the campus from straight above, in metres, and anyone may reuse it with the credit "© OpenStreetMap contributors", which is already in the README.
- **How the letters were made.** A short script, run in the Claude app's browser, took the OpenStreetMap data of the campus, turned it 21° so the buildings run along the squares, and gave every 6-metre square a letter: buildings and outside the campus are wall, gardens are grass, paths and squares are road. Then the road along the driving line was widened to about 4 squares, the start and the checkpoints were placed, and the whole thing was checked. The script is not in the repository yet.
- **Why 6 metres a square, and not smaller.** The game paints the whole track once as a hidden picture, at 2 pixels per unit. At 6 metres a square that picture is already 4096 by 3968 pixels (about 65 MB). Smaller squares would make the campus too big to paint.
- **Why the roads are so wide.** A road has to be about 4 squares wide for several karts side by side. At 6 metres a square that is 24 metres, much wider than the real paths. Where the widened road met a building or the edge of the campus, the road won.
- **Why the detours.** The first draft had a 15-second lap, which I found far too short. I asked for 30 to 40 seconds and chose two detours: round the Grand Auditorium, and a hairpin round the CTT Student Hall. Away from the driving line there is open ground, so a kart can skip a detour. It gains nothing: each detour has a checkpoint, and a lap only counts if the kart went through every checkpoint in order.
- **Why the track is chosen in the address.** It needs no change to the menu, which Fran built. A choice of track in the menu can come next, with Fran.

**Decisions**
- Mine: my area is the maps, taken from the Nova SBE building. Inside the building would be the ideal; outside is fine too. Indoor maps keep the building's real proportions, and the karts are miniatures, instead of making the corridors wider. Laps of 30 to 40 seconds. The two detours: the Grand Auditorium and a courtyard between the halls.
- Decision made by the agent, please confirm: OpenStreetMap instead of the school's drawing; the map turned 21° (north is not up, the sea is towards the bottom left); 6 metres a square and roads about 4 squares wide; the Hovione Atrium and the KPMG Gallery are walls here (they are for an indoor track); paths and squares away from the driving line stay road; the CTT Student Hall is shorter than it really is, because the hairpin cuts through its end; 3 laps.
- Decision made by the agent, please confirm, and tell the owner: `client/main.js` and `client/race.html` (the race page, built by Fran) changed so the page can show another track; `client/draw.js` (the drawing) changed so the small map in the corner stays small. Neither has an owner yet.
- **Question for the team:** a lap still takes about 20 seconds for the test kart, not 30 to 40. The reason is speed: at this scale a kart drives at about 200 km/h. I propose making all karts about 40% slower. That is a change to the numbers at the top of `shared/physics.js`, which belongs to whoever takes the driving physics, and it also makes laps of the test oval longer. Not done; for the team to decide.
- Not decided: whether computer karts are part of my area (the team guide puts them with campus tracks).

**What was checked, and what was not**
- `npm test`: 457 passed, 5 skipped (20 new tests). Run with Node.js 26.13.0 on the agent's computer, not on my laptop.
- The campus loop was broken on purpose, one way at a time, and every time at least one test failed. First version: a checkpoint too short to reach the wall, a doorway cut through the KPMG Gallery, the start pointing the wrong way, the start on the finish line, a wall across the road. After the detours: each detour's checkpoint removed, and the CTT checkpoint too short. The track choice was broken in three ways (a weaker name check, the campus loop missing from the list, another default track), and tests failed each time.
- The first version had a test that no shortcut existed at all. The detours put open campus ground beside the driving line on purpose, so that test no longer fitted. It was replaced by two tests that drive a robot round the loop without each detour and check that no lap counts. A doorway through the KPMG Gallery is no longer caught by a test. It would not let a kart win anything, because a lap still needs every checkpoint in order (that rule has its own tests in `laps.test.js`).
- One of the new tests was wrong at first: its "skip the Auditorium" robot drove into the Auditorium's corner and got stuck. The robot's route was fixed, not the rule.
- In a Chrome browser without a screen, on the agent's computer: the page says "Campus loop", holding the gas drives the kart along the Walk of Founders, all three camera views draw the track, the small map now fits in the corner, and the test oval looks as before. `?track=moon` and `?track=__proto__` open the test oval. No errors, apart from the browser asking for a site icon that the project has never had.
- In that browser the view behind the kart ran at 30 pictures a second on the campus loop, against 60 on the test oval. The other two views ran at 60. That browser has no graphics card, so this needs checking on a real laptop. If it is slow there too, the drawing should copy only the part of the track that is on screen.
- **Not checked:** a person driving the campus loop; my own laptop (the project is not on it yet, so Node.js, `npm install`, `npm test` and `npm start` have not been run there); the live server (it changes only after the merge).
- **Not handled yet:** the menu has no way to choose the campus loop; the Leaderboard panel shows only the test oval, although best times on the campus loop are kept; the online page still uses the test oval. The OpenStreetMap data is from 11 November 2026 and may change.

**How to check it yourself**
Run `npm start` and open http://localhost:3000/race.html?track=campus-loop. The note under the track should say "A race on Campus loop". Drive clockwise from the start: east, then right down the east side, round the Auditorium, up the west side, into the courtyard below the CTT Student Hall, round its far end and out through the courtyard above it. Try skipping a detour: the lap counter should not move. Press V to see the other views, and check the small map stays in its corner. Then open http://localhost:3000/race.html: it should still be the test oval.

**What comes next**
- Get the project onto my laptop with GitHub Desktop, run the four checks, and add my student number to the README and the brief.
- The team: confirm the decisions above, and decide about slower karts.
- With Fran: a choice of track in the menu, and the campus loop in the Leaderboard panel.
- The indoor maps: photos of the evacuation plans, or a floor plan from Facilities & Services (Hovione Atrium, floor 2, room A203C). OpenStreetMap already has the outline of the Hovione Atrium (about 68 by 67 metres) and the KPMG Gallery.
