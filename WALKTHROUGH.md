# Walkthrough notes

Plain-language answers to the questions the teaching staff may ask when they open this repository. Any member can be asked about any part, so everyone should be able to give these answers.

**State on 23 November 2026, the day we handed the project in.** The game opens on a main menu with a drawn picture of the campus by the sea. A player chooses one of three ways to play: a single race against five computer karts, two players on one keyboard on a split screen, or an online race with up to six people, each on their own computer, where computer karts fill the empty places. Then they choose a track (the Nova lap, a lap of our campus made from a video we filmed there, or a plain test oval), one of six characters, and the game settings (computer karts or not, and how good they are). Enter starts the countdown in every kind of race. A race is seen from behind the kart, with three camera views, a small map, arrows that show the way, banana peels, ramps, sound effects made by our code and recorded music. At the end the first three stand on a podium. With an account (a user name and a password, no email) a player's online results are saved: the shared leaderboard shows the ten fastest races and laps of each track, and "My stats" shows each player their own numbers. The server is on the internet at https://novasbe-kart.onrender.com, with a database that holds the accounts and the results. What is not built is in Part 9.

**How this document is organised.** It was written piece by piece between 10 and 23 November, and on the last day the answers were checked against the code, the outdated ones were corrected, and all were put in order.

- **The short answers** come first: twelve questions, each answered in a few lines. Read these before the presentation.
- **Part 1** is a map: where each part of the project lives.
- **Parts 2 to 6** are the long answers to what the staff ask most: how it is built and why, online play, accounts and data, what happens when something goes wrong, and the tests.
- **Parts 7 and 8** explain the game itself: the rules of a race, and what a player sees and hears.
- **Part 9** is the list of known limits and what we would change next.
- **Part 10** is history: our first campus track, which left the game on 20 November.

Sentences that begin "Until ..." say how something was before a date. They are kept because the staff may ask why something changed.

## The short answers

Twelve questions the staff are likely to ask, each answered in a few lines. Every answer says where the long one is.

Three words come back all the time:

- **The browser** is the program a player opens the game in, such as Chrome.
- **The server** is a computer somewhere else that is always on and runs our program. We rent ours for free from a company called Render.
- **The database** is where things are saved for good, like a big spreadsheet on the internet. Ours is at a company called Neon.

### 1. How is the project built?

A player opens our link. Their browser asks our server for the game, and the server sends the pages and their code. A single race and a two-player race then run entirely in that browser. In an online race the browser stays connected to the server, which runs the race for everyone. When a signed-in player finishes online, the server writes the time into the database.

The folders follow this: `client/` is what the server sends to the browser, `server/` is the program on Render's computer, `shared/` holds the rules of driving that both use, and `tests/` holds the automatic tests. Long answer: Parts 1 and 2.

### 2. Why JavaScript?

- A browser only runs JavaScript, and the game is drawn in the browser, 60 pictures a second.
- With Node.js the server runs JavaScript too. So one file of rules (`shared/`) runs in the browser for a single race and on the server for an online race, and a kart drives exactly the same in both.
- The course's usual tool, Python with Streamlit, is made for pages and forms. A live game needs a connection that stays open, which the course's own guide says needs another stack.
- The course asks for the staff's approval for JavaScript. Our professor gave it on 11 November 2026.

### 3. Where is the data stored?

In three places, by how long it has to last:

- **Accounts and race results** are in the database (Postgres, at Neon), because they must last and everyone must see the same.
- **A player's own settings and practice times** are kept in that player's browser, because only they need them.
- **Where the karts are right now** is only in the server's memory, because it matters only during the race.

The weak spot: if the server restarts during an online race, that race is gone. Saved results are safe. Long answer: Part 4.

### 4. How does online play work, and can someone cheat?

The browser keeps a connection open to the server (a WebSocket), like a phone call instead of letters. A browser tells the server which keys are held, and a few requests such as "start a race" or "I want to be this character". It never says where its kart is. The server moves every kart, 60 times a second, and tells every browser where all the karts are, 30 times a second. The browser only draws.

So nobody can go faster or skip a lap by changing the code in their own browser: the page decides nothing. The weak spot: a key press has to travel to the server and the picture has to travel back, so a player's own kart reacts a fraction of a second late. Long answer: Part 3.

### 5. How do accounts and passwords work?

- An account is a user name and a password. There is no email.
- **The password is never saved.** The server saves a scrambled version (a "hash", made with `scrypt`, which comes with Node.js) that cannot be turned back. A random extra piece (a "salt") makes two equal passwords look different. Scrambling is slow on purpose, so a thief could not try millions of guesses.
- **Staying signed in:** after a correct password the server gives the browser a long random code in a cookie. The page's own code cannot read that cookie. It lasts seven days.
- Five wrong passwords lock an account for ten minutes. A wrong name and a wrong password get the same answer.
- The weak spot: there is no "forgot my password", because that needs email.

Long answer: Part 4.

### 6. Can the leaderboard be faked? Can someone race without an account?

Only the server writes a result, and only from a race it ran itself. There is no address a browser could send a time to. Single races and two-player races run in the browser, so they never count on the shared leaderboard.

Anyone can race online without an account, as a guest. A guest is told that nothing is saved, has no name above the kart, and is called "Guest 3" on the results board. Long answer: Part 4.

### 7. Which libraries do we use, and why so few?

A library is code that other people wrote and that we download and use. We use three, each at one exact version: `ws` keeps the live connection of online play open, `pg` talks to the database, and `vitest` runs the tests. Everything else is our own code: the drawing, the driving, the sound effects, the accounts.

Few libraries means fewer things that can have a security problem, and nothing in the project that we cannot explain. `npm audit` checks them against a list of known problems and reports none. Long answer: Part 2.

### 8. What do the tests cover, and what do they miss?

A test is a small program that checks one thing by itself and says pass or fail. We have about 2,800. `npm test` runs them all in under a minute, and GitHub runs them by itself on every pull request and on every change to `main`.

- **Covered:** every rule of the game, and the things that must be refused: a seventh player in a full room, a faked result, a wrong password, a message the server does not know.
- **Missed:** how the game looks, sounds and feels, and real people racing on different laptops. Those we check by hand, with the list in `docs/two-laptop-checklist.md`.
- Tests never touch the real players: they use a pretend database kept in memory, or tables of their own that they remove afterwards.

Long answer: Part 6.

### 9. What happens when something we depend on is down?

We depend on two companies: Render for the server and Neon for the database.

- **The database cannot be reached:** the game still runs. Signing in and the leaderboard say "try again", and online racers are let in as guests.
- **The server is asleep:** Render's free plan puts it to sleep after 15 minutes without visitors, and it takes about a minute to wake. Our pages say "The server is waking up" and connect again by themselves.
- **The server restarts:** the race in progress is lost, and the page joins the new room by itself.

We built the game so that it does not need the database to run. Long answer: Part 5.

### 10. How is it kept safe?

- **No secrets in the repository.** The database address holds a password, so it lives in Render's settings and in a local file that git ignores.
- **Nothing a browser sends is trusted.** Every message and every request is checked, and too many in a short time are refused.
- **Passwords are scrambled**, and the sign-in cookie cannot be read by the page's code.
- **Text stays text.** A user name is always put on the page as plain text, and the browser is told to run only our own files.
- **Three libraries, at exact versions,** with no known problems.

Long answer: Parts 2, 3 and 4.

### 11. What are its limits, and what would we change next?

- Online, a player's own kart reacts a moment late. The fix is to move it in the browser at once and correct it when the server answers ("prediction"). The rules were written to allow that, but it is not built.
- A forgotten password cannot be reset. That needs email.
- Each track has one online room that anyone can join. There are no private rooms.
- The game needs a keyboard, so it does not work on a phone.
- The free server sleeps, and a restart loses the race in progress.

Long answer: Part 9.

### 12. How did four people work on one project?

- Nobody changes `main` directly. Every change is made on a branch (a copy to work on) and comes into `main` through a pull request that a teammate has to approve, and GitHub's tests have to pass first.
- The rules for the coding agents we used are in `AGENTS.md`, the same for all four of us. One of them: an agent never changes a test to make it pass.
- Each member keeps a diary in `docs/diary/` of what was built, why, and what was and was not checked.
- Decisions, with their dates, are in `PROJECT_BRIEF.md`.

## Part 1: Where everything is

### Where does each part live?

| Part | Where | Built yet? |
|---|---|---|
| The main menu, the first page | `client/index.html` and `client/menu.js` | Yes, with the NOVA SBE logo above "Kart racer" (since 20 November, instead of "Nova SBE" on a red label): Single race, Two players, Online, Leaderboard, Settings and the account corner. (The Cup, shown greyed out until then, left the menu on 19 November: the team dropped it) |
| Choosing a track in the menu | `client/track-panel.js`, `client/track-list.js`, `client/mini-map.js` | Yes: a card with a small map for each track |
| The leaderboard in the menu | `client/leaderboard.js`, `client/leaderboard-view.js`, `client/leaderboard-panel.js` | Yes: the shared boards of each track, and your own practice bests. It opens on the Nova lap (`tracksInBoardOrder` in `leaderboard-view.js`) |
| Accounts in the menu | `client/account.js`, `client/account-view.js`, `client/account-panel.js` | Yes: create an account, sign in, sign out, change your password, delete your account |
| How a page asks the server about accounts | `client/account-api.js`, read carefully by `client/answers.js` | Yes |
| Accounts on the server | `server/api.js` (the addresses), `server/accounts.js` (the rules), `server/passwords.js` (scrambling), `server/store.js` (the database questions) | Yes: a user name and a password. No email |
| Which user names and passwords are allowed | `shared/account-rules.js` | Yes, used by the page and by the server |
| How every page looks | `client/style.css` | Yes |
| The single race page | `client/race.html` | Yes, on either track |
| The practice race in the browser | `client/main.js`, with the race itself in `shared/practice-race.js` | Yes, against five computer karts, or alone if the player switches them off in the game settings |
| The game on the whole screen | `client/full-screen.js`, the F key in `client/keyboard.js`, the look in `client/style.css` | Yes, since 19 November, on the three race pages |
| How a computer kart decides what to do | `shared/computer-driver.js` | Yes, since 17 November in a single race, and since 18 November online |
| How good the computer karts are (Easy, Normal, Hard) | `LEVELS` and `atLevel` in `shared/computer-driver.js`, the words in `client/difficulty.js` | Yes, since 19 November: in a single race, in a two-player race and, chosen by the host, online. Decided on 19 November (the team had dropped levels on 17 November) |
| Computer karts in an online room | `server/computer-players.js`, switched on and off in `server/online.js`, their names in `client/computers-switch.js` | Yes, since 18 November |
| The game settings: computer karts or not, their level, and online at most how many people | The rule in `shared/game-settings.js`, the words in `client/game-settings-view.js`, the card on the page in `client/game-settings-card.js`, the room's settings in `server/online.js` | Yes, since 19 November, on the three race pages. Online only the host chooses |
| Two players on one computer, on a split screen | `client/double.html` and `client/double.js`, the words in `client/double-view.js`, the race itself in `shared/two-player-race.js`, the second set of keys in `client/keyboard.js` | Yes, since 19 November: player 1 with the arrows, player 2 with W A S D, with or without four computer karts. Nothing is saved |
| What a driver sees after their own finish, while others still drive | `kartToWatchAfterFinish` and `finishedBanner` in `client/race-view.js`, used by `client/main.js`, `client/online.js` and `client/double.js` | Yes, since 20 November: the camera moves to a kart that still drives, and a banner says whose |
| Keeping settings and best times in the browser | `client/storage.js`, `client/settings.js`, `client/records.js` | Yes: the starting camera view, the time of day and the sound switches, the character, the game settings of a single and a two-player race, that the "How to play" card was shown, and your best race and best lap per track |
| The keyboard controls | `client/keyboard.js` | Yes |
| The camera: which part of the track is shown | `client/camera.js` | Yes, three views. The race view is low behind the kart, with a horizon |
| Putting the picture together | `client/draw.js` | Yes: sky, ground, buildings, trees, karts, in the right order |
| The ground, the sky, and the things beside the road | `client/ground.js`, `client/sky.js`, `client/props.js` | Yes: our own drawings, no image files |
| How each track looks | `client/track-looks.js` | Yes: a circuit in the woods for the oval, the campus for the Nova lap (`client/nova-lap-look.js`). The campus loop's look is still there, for the tests |
| The kart and its driver as a 3D shape, and painting it | `client/kart-shape.js`, `client/kart-paint.js` | Yes: one shape, in any colours, from any side |
| The colours a kart can have | `client/kart-choice.js`, and the rule in `shared/kart-looks.js` | Yes: kart, helmet and suit. Since 17 November they come with the character: a player no longer picks them one by one |
| The characters: names, colours and faces | `shared/cast.js`, the heads cut out of the photos in `client/heads/` (the whole photos in `client/faces/` are no longer shown), `client/cast-choice.js`, the "Choose your character" step in `client/kart-panel.js`, the pilot standing beside the kart in `client/pilot-shape.js`, and online `server/cast-keeper.js` | Yes, since 17 November: six characters, chosen after the track, before each race, each shown standing with their own head cut out of their photo, doing their own dance. They only change the colours: everyone drives the same way |
| Arrows, arrow boards and the "wrong way" warning | `client/route.js` | Yes |
| Sound: when each one is due, and how the engine should sound | `client/sound-cues.js` | Yes, since 15 November |
| Sound: making the sounds themselves, with no sound files | `client/sound.js` | Yes, since 15 November. Judged by ear on `sound-test.html` |
| Music: the menu, the three parts of a race and the podium | five recorded tunes in `client/music/`, which one plays when in `client/music-files.js`, played by `client/music.js` | Yes, since 20 November (afternoon). To be judged by ear |
| The songs made of notes, which were the music for a few hours | the notes in `client/music-score.js`, when each played in `client/music-cues.js` | The songs are only on the sound check page `sound-test.html` now. `music-cues.js` still tells the race pages which moment of a race it is, and keeps the Music switch |
| The sound switches in Settings (all sound, music, race sounds, menu sounds) | `client/audio-switches.js`, the panel in `client/settings-panel.js` | Yes, since 20 November. M during a race is the "all sound" switch |
| Button clicks and the hype sound | `client/ui-sound.js`, which clicks count in `client/ui-sound-cues.js` | Yes, since 20 November |
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
| The 3, 2, 1, GO! before a race | `shared/countdown.js` | Yes, in all three kinds of race |
| The test track | `shared/tracks/test-oval.js` | Yes. It is a simple loop, not a campus track |
| The first campus track, the campus loop | `shared/tracks/campus-loop.js` | No longer in the game since 20 November: the Nova lap replaced it. Its map is kept because many tests drive on it |
| How tall the campus loop's buildings are | `shared/tracks/campus-loop-storeys.js` | Kept with it, for the tests |
| Buildings standing up as plain blocks | `client/buildings.js`, painted by `client/draw.js` | Only the campus loop used them. The test oval gets low barriers from the same file, and the Nova lap has its own scenery |
| The Nova lap, the track made from the video filmed on campus | `shared/tracks/nova-lap.js` | Yes, since 17 November: the ground and the buildings, trees, benches, lamps and flags, four ramps and five people who walk across the track. Three laps |
| Buildings with real fronts, roofs to drive under, railings | `client/scenery.js`, `client/scenery-paint.js`, `client/wall-art.js`, `client/nova-lap-buildings.js` | Yes, on the Nova lap |
| Ground drawn as shapes, with its own pavings | `client/ground-art.js`, `client/nova-lap-ground.js` | Yes, on the Nova lap |
| The beach and the sea past the coast road of the Nova lap | `client/shore.js`, painted by `client/ground.js`, set in `client/nova-lap-look.js` | Yes, since 19 November |
| A page that flies the camera round a track | `client/track-tour.html` | Yes, for the team: `track-tour.html?track=nova-lap` |
| The time of day: morning, afternoon, sunset or night | `client/time-of-day.js`, chosen in Settings (`client/settings-panel.js`), the light laid in `client/draw.js`, the moon and stars in `client/sky.js` | Yes, since 20 November. Only the picture changes |
| The fly-over before a single race | `client/fly-over.js`, used by `client/main.js` and the track tour | Yes, since 20 November |
| The "How to play" card | `client/how-to-play.js`, on the three race pages | Yes, since 20 November |
| The list of tracks | `shared/tracks/index.js` | Yes: the Nova lap, which is the track of the game, and the test oval, a plain loop for a quick race and for the tests |
| Reading the chosen track from a page's address | `client/track-choice.js` | Yes: `race.html?track=nova-lap`, `online.html?track=nova-lap` and `double.html?track=nova-lap` |
| The drivers and their scores | `shared/characters.js` | One placeholder driver |
| The kinds of ground | `shared/surfaces.js` | Road and grass |
| The automatic tests | `tests/` | Yes: 105 test files, for the rules of the game, the server, accounts, online rooms, the computer karts and the parts of the pages that need no browser |
| The instructions that make GitHub run the tests | `.github/workflows/tests.yml` | Yes |
| The instructions that ask GitHub to visit the live server every five minutes | `.github/workflows/keep-awake.yml` | Yes, but GitHub runs it only every few hours, so the server still sleeps (see "When something goes wrong") |
| The instructions that tell Render how to run the server | `render.yaml` and `.node-version` | Yes, in use since 10 November |
| The database connection | `server/db.js` | Yes. Works on the live server and from a laptop that has the address |
| The game on a laptop with pretend accounts | `server/start-pretend.js` (`npm run start:pretend`) | Yes: for trying accounts without the database's secret address |
| The podium at the end of a race | `client/podium.js` (who stands on it, and when), `client/podium-shape.js`, `client/podium-view.js` | Yes, on the three race pages: the first three, and with four or more karts the one who came last cries beside it |
| "My stats" and "Download my results" in "Your account" | `client/stats-panel.js`, the words in `client/stats-view.js`, the sums in `server/stats.js`, `/api/stats` and `/api/my-results.csv` in `server/api.js` | Yes: races, wins, podiums, best times and best lap on the Nova lap |
| A finished single race reported for your own stats | `saveSingleResult` in `client/account-api.js`, called by `client/main.js`; checked by `server/single-results.js` | Yes: only for a signed-in player, only against computer karts, never for the shared leaderboard |
| Ramps: a kart jumps and gets extra speed for a moment | `shared/ramps.js`, used by `shared/race.js` | Yes: four on the Nova lap |
| People who walk across the track | `shared/walkers.js`, shown through `client/street-life.js` | Yes: five on the Nova lap. A kart that drives into one makes them sit down, seeing stars |
| Cars on the roads beside the Nova lap | `client/traffic.js` | Yes, a picture only |
| The Nova lap at two levels, and the jolt on its stairs | `client/levels.js`, `client/stairs-bump.js`, set in `client/nova-lap-look.js` | Yes, a picture only |
| The connection meter (L) | `client/meter.js`, shown by `client/online.js` | Yes, on the online page |
| Connecting again by itself, and "The server is waking up" | `client/link.js`, `client/waking.js` | Yes |
| Leaving the online page without leaving a kart behind | `client/page-life.js` | Yes |
| The "page not found" page | `client/not-found.html`, sent by `server/app.js` | Yes |
| The sound check page, for the team | `client/sound-test.html`, `client/sound-test.js` | Yes |

## Part 2: The big picture

### How does a page reach the browser?

1. The browser asks our server for an address, for example `/`.
2. `server/app.js` looks for the matching file in the `client/` folder (`/` means `index.html`). An address that starts with `/shared/` is looked up in the `shared/` folder instead, because the browser needs the game rules too.
3. If the file exists and is a kind the server is allowed to send, the server sends it. Otherwise it answers "not found": a person gets a small page of the game, "Off the track", with a button back to the menu, and anything else gets the plain words "Page not found."

Before it looks for a file, the server answers three kinds of address itself: the ones that start with `/api/` (accounts, the leaderboard, the stats), `/health` ("I am alive") and `/database-check`. Every answer also carries safety rules for the browser (see "Why did we build it this way?").

The server refuses four things, and each has a test:

- requests that try to change something. Only addresses that start with `/api/` accept such a request: the account ones, and the one a finished single race is reported to. `server/api.js` checks each one (see the answer about accounts)
- files outside those two folders, for example an address such as `/../server/app.js`. The server's own code, the tests and the project settings can never be downloaded
- kinds of file that are not on its list (web pages, styles, scripts, data files, three kinds of image and two kinds of music file)
- addresses that are broken

### How does the menu work?

The address of the game opens the menu (`client/index.html`). It has four big choices, Single race, Two players, Online and Leaderboard, and at the top the account corner and the Settings button. (Until 19 November there was also a greyed-out Cup; the team dropped the Cup on 17 November, so it left the menu.) All three race pages have a "← Menu" link back.

**The picture behind the menu** is our own drawing: a sunset over the sea, a lighthouse, white campus blocks, palms, and a road with a finish line and two karts. It is written as shapes inside the page (an SVG drawing) and moved with the style file. The picture itself uses no image files, no outside fonts and nothing from another website. The only image on the menu is the Nova SBE logo in the title, which is the school's.

**Choosing a track.** Single race, Two players and Online are plain links, so they work even if the page's code does not run. With the code, they open a "Choose a track" panel instead. It has one card for each track in our list (`shared/tracks/index.js`), with the name, the laps, and a small map painted from the very letters the track is drawn with (`client/mini-map.js`), so a new track gets its card and its map without any extra work. A click on a card opens the next step, "Choose your character" (for two players, once for each), and its button leads to `race.html?track=...`, `double.html?track=...` or `online.html?track=...`.

**The Leaderboard panel** has two parts. "All players" is the shared leaderboard of the chosen track, asked from our server: the fastest races and the fastest laps, the first three on a podium, your own row marked, and your own rank underneath if you are outside the ten. "Your practice bests" are the times of your single races, which stay in your browser. While the answer is on its way, when nobody has raced yet, and when the server has no accounts, the panel says so in words.

**The account corner** shows "Sign in" and "Create account", or your user name and "Sign out". Three panels belong to it: Sign in, Create account, and Your account. In Your account two things are folded away: "Change my password", which asks for the password you have now and a new one, and "Delete my account", which asks for the password and a tick. The forms check the name and the password by the same rules file the server uses and say what is wrong before anything is sent. The server checks again in any case.

Every panel is a `<dialog>`, a kind of panel built into browsers: Escape or the Close button closes it, the keyboard stays inside it while it is open, and no library is needed.

**How the menu code is split.** For each panel, one file works out what to show from plain facts and needs no browser, so it has tests (`track-list.js`, `leaderboard-view.js`, `account-view.js`), and another file puts that on the page (`track-panel.js`, `leaderboard-panel.js`, `account-panel.js`). `menu.js` only starts them. Everything that comes from the server or from the browser's storage, such as a user name, is put on the page as text (`client/page-parts.js`), never as HTML.

**Settings** has three choices: the camera view a race starts in, the time of day (morning, afternoon, sunset or night: only the picture changes), and four sound switches (all sound, music, race sounds, menu sounds). The three race pages read them when they open. V still changes the view during a race, and the panel lists the controls.

**Where settings and best times are kept:** in the browser's own storage (`localStorage`), a small space every website gets that keeps short texts after the page is closed. The settings and the best times are never sent to our server, and other players never see them. (The full list of what a browser keeps is in "Where is data stored?".) Two things can go wrong and neither may break the game, and each has a test: the browser may refuse storage (some private windows), and what we read back may not be what we wrote, because a player can edit it. So every value read back is checked: an unknown camera view or a time that is not a whole positive number of steps is ignored and the default is used. Times are shown with `textContent`, never as HTML, so a saved text cannot add anything to the page.

### Why did we build it this way?

- **Our own server runs every online race.** The browser sends which keys are held and a few requests such as "start a race", never a position or a time, so nobody can fake an online result from their browser. (A single race and a two-player race run in the browser, which is why they never count for the shared leaderboard.)
- **Our own driving physics.** The server has to run the races, and the physics inside game libraries only runs in a browser.
- **The driving rules never change the kart they are given.** They give back a new kart instead. A test can then compare "before" and "after", and later the browser can try a move without disturbing the real one.
- **Time moves in fixed steps of one sixtieth of a second.** The same keys then always give exactly the same result, on any computer, fast or slow. The browser and the server must agree on where every kart is, so this matters.
- **Only an exact "pressed" counts as a pressed key.** Anything else a browser might send counts as not pressed, so a strange message cannot produce a strange movement.
- **One language, JavaScript, for the browser and the server.** A browser only runs JavaScript, and with Node.js the server runs it too. This lets both use the very same rules, the files in `shared/`: a single race in the browser and an online race on the server drive exactly alike. The course asks for the staff's approval for JavaScript; our professor gave it on 11 November 2026.
- **Secrets stay out of the repository.** The repository is public, so passwords and keys live only in a local `.env` file and in the hosting settings.
- **Two outside libraries in the running game. The first is `ws`, and only for live connections.** Writing that part ourselves would be long and easy to get wrong in ways that matter for security. `ws` is the standard choice, brings no other packages with it, and its version is pinned. Everything else is built on `http`, the web server that comes with Node.js. Fewer libraries means fewer things that can have security problems. The usual alternative for the web part is a library called Express.
- **A second outside library, `pg`, to talk to the database.** Node.js cannot talk to a database by itself. `pg` is the standard choice and works with any Postgres database, not only Neon's. The alternative is Neon's own library. It sends everything over the normal web channel, which would also work on the university Wi-Fi, but it ties the code to Neon. Which to use is an open question for the team.
- **The game does not depend on the database.** The server starts without it and runs without it. That is why a teammate needs no secret to work on the game, and why a sleeping database cannot stop a race.
- **The database check is public but cannot be used to wear the database out.** Its answer is reused for ten seconds, and it only reads. The one thing that writes is the server starting.
- **Signing in uses a cookie the page cannot read, not something kept by the page's own code.** The other common way is to hand the page a token to keep in the browser's storage. Any script running in the page could then read it. With our cookie, even a mistake that let someone's text run as code in a page could not steal a sign-in.
- **The account rules, the database questions and the internet side are three files.** `server/accounts.js` decides, `server/store.js` asks the database, `server/api.js` reads requests and sets the cookie. The rules can then be tested in a fraction of a second with a pretend store kept in memory and a pretend clock that jumps ten minutes or seven days. So that the pretend store cannot drift away from the real one, one list of checks (`tests/store-contract.js`) is run on both.
- **Passwords are scrambled with `scrypt`, which comes with Node.js.** No library to add, and it is one of the functions recommended for passwords: slow, and heavy on memory, on purpose.
- **Online results are written by the server at the moment a racer crosses the line.** There is nothing for a browser to send, so there is nothing to fake. (The one result a browser does send is a signed-in player's finished single race. It is checked for numbers that could be real, counts only in that player's own stats, and never reaches the shared leaderboard.)
- **The browser is told to run only our own files.** With every answer the server sends a rule (a "Content-Security-Policy") that allows scripts and styles only from files on our own site. It is a second lock. The first is that our pages put every text on the screen as text, never as HTML. A test reads every page and script in `client/` and fails if one breaks either rule. Since 13 November two more rules go out with every answer: a browser that came over https is told to use only https for this site from now on, and browsers are told not to say to other websites which of our pages a visitor came from.
- **The room knows nothing about the internet.** `server/room.js` only keeps the karts and moves them. `server/online.js` does the connections. The room can then be tested without any network. (The rules for "who may do what" are in a few small files: the host and the start in `room.js`, the game settings and the characters in `online.js` and `cast-keeper.js`, the messages in `messages.js`.)
- **Online, the browser shows the past.** Showing other karts a moment late (a fifteenth to a tenth of a second) lets them glide smoothly between updates. The alternative, guessing where they are now, makes them jump back when the guess is wrong.
- **A browser that sends anything unexpected is sent away at once.** Our own page never sends such a message, so there is no reason to be patient with one. Its kart leaves the track immediately, and the server cuts the connection itself after two seconds instead of waiting for the browser to agree.
- **The server only sends file kinds on a short list, and only from two folders.** A file we forget somewhere cannot leak by accident.
- **No drawing library.** The track and the kart are drawn with the canvas that is built into every browser. The drawing started in two files, `client/draw.js` and `client/camera.js`, and is now about twenty, each for one kind of thing (the ground, the sky, the scenery, the kart, the pilot, the podium). On 11 November the team chose to stay with this rather than switch to a game library such as Phaser: switching would have cost days, our tilted view is our own code either way, it keeps us at three libraries, and we can explain every line. Phaser would have made effects such as sparks and animations quicker to add.
- **The browser code is split by job.** Keys, camera, drawing, time as text and the race loop each have their own file, and none of them decides how a kart moves. That is why adding two new camera views changed nothing in the rules or their tests.
- **The server's settings for Render are a file in the repository** (`render.yaml`), not something typed into a web form. Anyone can read how the live server is set up, and changes to it go through a pull request.

## Part 3: Online play

### How does online play work, and can a player cheat?

When someone opens the online page, their browser opens a live connection to our server. A normal web request is "ask once, get one answer". A live connection (a WebSocket) stays open, and both sides can send short messages at any time. The `ws` library handles the details of that connection.

- **The browser may send seven kinds of message and nothing else** (`server/messages.js`): which of the four driving keys are held, "restart", "start a race", the character it wants to be, the colours of its kart, computer karts on or off, and the game settings of the room. It sends them only when something changes or a key is pressed. None of them says where a kart is, how fast it goes or which lap it is on.
- **The server moves every kart.** `server/room.js` keeps one kart for each person in the race and one for each computer kart. In a race it moves them all 60 times a second with `stepRacer`, the very same function the single race uses in the browser. The server presses the computer karts' keys itself (`server/computer-players.js`).
- **The server tells everyone what happened.** 30 times a second (20 until 19 November 2026) it sends all browsers the position, direction and lap progress of every kart on the track, and the state of the race: its phase, how far the countdown is, who the host is and who is watching.
- **The browser only draws.** `client/online.js` moves no kart itself.

So a player cannot go faster, pass through a wall or skip a lap by changing the page in their browser. The page decides nothing. The worst a changed page can do is hold keys its player is not holding.

The server also protects itself, and each of these has a test:

- Every message is checked in `server/messages.js`. Anything that is not exactly one of the seven allowed kinds, is longer than 200 characters, or is not text gets the browser disconnected.
- A browser that sends more than 60 messages in a second is disconnected. A real player sends a handful.
- A connection can only act on its own kart. A message has no way to name another player, and anything extra in a message is dropped.
- A room takes six players, one for each character (eight until 19 November 2026, when a seventh and eighth drove a plain kart). A seventh is told the room is full.
- A live connection is only accepted at one address (`/play`, with the short name of a track that exists), and only from a page of our own site, so another website cannot use a visitor's browser to connect to our game.

**One room for each track.** `online.html?track=nova-lap` connects to the room of the Nova lap, and without a choice it is the room of the test oval. The page takes the short name from its own address, but only if it is a name in our list of tracks (`client/track-choice.js`), and the server checks it again.

**Why karts move smoothly:** updates arrive 30 times a second, at slightly uneven moments, but the screen shows 60 pictures a second. `client/net.js` shows the race a little in the past and draws each kart at the right point between the two updates on either side of that moment. If updates stop arriving, the karts hold still instead of guessing.

**How far in the past, and why that is the "lag"** (19 November 2026, after Catarina asked what can be done about lag online). The further in the past the picture is, the later a key press shows on the screen. Until that day it was always 6 steps (a tenth of a second) with 20 updates a second. Measured from her laptop: the live server, in Frankfurt, answers in about 70 thousandths of a second, so with the wait for the next update and those 6 steps a key press showed about a fifth of a second later, with one player or with six. Two small things were changed:

- The server sends 30 updates a second (`STEPS_PER_UPDATE` in `server/room.js`).
- The page measures how late updates arrive on this connection and keeps just enough spare (`createPlayback()` in `client/net.js`): the steps between two updates, plus the worst lateness seen lately, plus one step. That is 4 steps on a steady connection and never more than the 6 it always was. A late update is forgotten slowly, over about ten seconds, so a connection that hiccups keeps its spare.

Together that takes about 40 thousandths of a second off on a steady connection, a fifth of the wait. An uneven connection is no worse off than before. The rest of the wait can only go with "prediction" (the browser moving your own kart at once), which is not built: see the known limits.

**The connection meter** (`client/meter.js`): on the online page, **L** shows a small box in the corner of the picture, and L again hides it. It is off until a player asks for it. It shows how long the server takes to answer, how many updates and pictures a second arrive, the longest wait between two updates, and about how long a key press takes to reach the screen. Under the numbers is one sentence: "All fine", or which of the three it is: the way to the server, uneven updates (both the connection, often Wi-Fi), or this computer drawing slowly. It changes nothing about the race. While it is shown it asks the server's "I am alive" address every two seconds to time the answer; hidden, it asks nothing.

**Characters and colours.** The page sends the character the player chose in the menu. If someone in the room already is that character, the server gives the first free one. A character only changes how the kart looks. The older "paint my kart in these colours" message, three small whole numbers, is from before the characters: only a browser without a character still sends it, and the server ignores it for a player who is a character.

**Computer karts and the results.** Online the empty places of a race are filled with computer karts, up to six karts in all. The server drives them, and no browser can. They count in the finishing order, so a signed-in player who finishes behind two of them is saved as 3rd, and their own results are never saved.

**What this version does not have:** rooms with codes. Everyone who opens the page of a track is in the same room, up to six people or the lower limit its host chose.

### How does an online race start, and who may start it?

The room in `server/room.js` is always in one of four phases, and the server tells every browser which:

| Phase | What happens |
|---|---|
| open | Waiting for the host. Every kart stands on its own place on the starting grid, and the arrow keys do nothing: nobody moves and nobody's clock runs. (Until 17 November 2026 everyone could drive around freely here) |
| countdown | The host started a race. Every kart is back on its starting place and 3, 2, 1 is counted. Keys do nothing |
| racing | GO! Every racer's clock started on the same step, key held or not |
| finished | The race is over: every racer has completed the laps, or the time ran out. The room waits for the host to start the next race |

- **The host is whoever has been in the room longest and is at their keyboard**, so normally the first player to enter. When the host leaves, the next longest becomes host. The host presses Enter to start, and only when no race is on. Everyone else just joins and waits on the grid.
- **A host who is away passes the room on** (since 19 November 2026, `AWAY_AFTER_STEPS` in `server/room.js`). A player who has pressed no key for a minute counts as away, and the host is then the next player in the order they arrived. Before, a tab someone had forgotten, or a player who had walked off, stayed the host for ever and nobody else could start a race. An arrow key, R or Enter brings a player back, so a host who only sat still loses nothing. Keys that only change this player's own page (V, M, F, L) and mouse clicks do not count: the server never hears of them. Three things count as being there without a key: having just arrived, having finished the race that just ended, and, for the host, a newcomer walking in (so a host who waited for friends keeps the room). If everyone is away, the host is simply whoever has been here longest.
- **A signed-in player has one kart in a room** (since 19 November 2026, `sendOlderOnesAway` in `server/online.js`). When they join the room again, from another tab or another computer, the new connection stays and the older one is told why ("elsewhere") and sent away. Its page shows "You are playing somewhere else", with a button to play there instead, and does not come back by itself, or the two tabs would throw each other out for ever. A guest has no name to be recognised by, so two tabs of a guest are two karts.
- **Someone who arrives during a race is told so on the picture** (since 19 November 2026, `watchBanner` and `kartToFollow` in `client/race-view.js`). A banner in big letters says "A race is on: you are watching", whose kart the camera is on, and that they join the next race. The camera is on the person who was furthest ahead when they arrived, and stays with that kart until it finishes. It is never on a computer kart, and the left and right arrows move it to another person (`nextToWatch`): a watcher wants to see how their friends are doing. Before, the picture looked exactly as if they were driving, and the arrow keys did nothing without a word of why: now the banner answers a key press.
- **Nobody can move until the host starts** (the team's rule since 17 November 2026). Before, everyone could drive around freely while waiting, which meant karts were all over the track, could bump into each other and drive laps that did not count. Now the waiting room is calm, and every race starts from the grid with everyone in place. The page only makes the kart lean, the engine rev and the next checkpoint light up when the keys really do something: in a race after GO (`keysWork` in `client/race-view.js`).
- **A race that has begun is driven to its end** (since 13 November 2026). Before, the host could press Enter in the middle of a race, by accident too, and the race everyone was driving was thrown away. Now the server refuses that start.
- **So that a race always does end, it has two time limits**, counted in steps on the server (`FINISH_WINDOW_STEPS` and `RACE_LIMIT_STEPS` in `shared/race-time.js`, which the server and the page both read). Once the first racer has finished, the others have two minutes left. And no race lasts longer than ten minutes after GO. Without them, one racer who walks away from their laptop would hold the room for ever. A racer who has not finished when the time runs out gets no result: their keys stop working, their kart rolls to a stop, and nothing is saved for them. From the first finish on, the page shows the time left at the top of the picture: "The race ends in 1:42", and in the last minute "The race ends in 42 s". (Why two minutes: Catarina asked for three on 13 November, or two if three was too long. A whole race takes between one and two and a half minutes, so with three the winner would wait longer than the race took.)
- **When the race is over, the podium comes first. Ten seconds later a results board comes up over it** (`client/results-board.js`). The winner is on top, large, with their kart turning round in their own colours. Everyone else is below in the order they crossed the line, each with a small picture of their kart, their time, and how far behind the winner they were. Karts that ran out of time come last, the one that was closest to the finish first: more checkpoints passed, and of two with the same count, the one nearer to its next checkpoint. They are marked "did not finish" with the lap they were on. The board pops up, the rows slide in one after the other and confetti falls. A player who has asked their computer for less motion gets the board without any of that. The board stays until the host starts the next race.
- **During the race** the page shows the player's place, such as "2nd of 4", and a racer who has finished sees a small list in the corner while the others are still driving. All of this is worked out by the page from what the server sends about every kart (`client/standings.js`). It is for showing only: what is saved to the leaderboard is the server's own count.
- **The countdown is the rule the practice race uses**, `countdownAt` in `shared/countdown.js`. It is counted in steps on the server, so every browser sees the same number and all karts are let go on the same step. Holding the gas early gives no head start.
- **Someone who joins during a race watches.** They are in the room and count towards its limit, but they have no kart on the track. Their camera is on the person who was furthest ahead when they arrived, never on a computer kart, a banner on the picture says that they are watching, and V changes the view as usual, for example to the whole track from above. They join at the next start. If every racer leaves, the room goes back to open, so watchers are never stuck.

What the server refuses here, each with a test:

- A start from anyone but the host. Any browser can send "start", and nothing in the message can claim to be the host: the server looks only at which connection sent it. A start from someone else is ignored. That browser is not sent away, because a slightly out-of-date page of our own could send it honestly.
- A second start while the countdown is running, so pressing Enter twice does not start the countdown over.
- A start while a race is being driven, from the host too. The test checks that nothing at all changes: no kart is sent back to the grid and every clock runs on.
- A finish after the time has run out. The laps and the clock of a racer who is out of time stay as they were, however long they hold the gas.
- "Restart" (the R key) during a countdown or a race. A racer could otherwise give themselves a fresh clock.
- Keys from someone who is watching: they move nothing.

The words on the page (the big number, "You are the host: press Enter", "You are watching") are worked out in `client/race-view.js` from what the server sent. The page decides nothing about the race.

### What are the game settings, and who may change them?

Three things can be chosen before a race (`shared/game-settings.js`, since 19 November 2026):

| Setting | What it is | Where it counts |
|---|---|---|
| Computer karts | On or off. On, they fill the race up to six karts | Everywhere |
| Their level | Easy, Normal or Hard (`atLevel` in `shared/computer-driver.js`) | Everywhere |
| Players | At most how many people the room takes, from 2 to 6 | Online only |

The same card comes up over the picture on the three race pages (`client/game-settings-card.js`, with its words in `client/game-settings-view.js`). Pressing a button on the card changes nothing yet: only "Confirm game settings" does.

- **In a single race and a two-player race the player chooses.** The card is the first thing on the page, and the browser remembers the choice (`readGameChoice`). Confirming starts the race again. A single race with computer karts off is the player alone against the clock. It is not sent to the server for "My stats", because with nobody to beat it would count as a win every time.
- **Online only the host chooses.** Whoever is the host while the room waits for a race gets the card by itself, once, titled "Start online game", with "You are the host" on top. Until the race starts, everyone sees a small label in the corner that says who the host is and what they chose; the host's label has a "Game settings" button. Between two races the host opens the card again with "Game settings" on the results board.
- **The server keeps the room's settings, not any browser** (`server/online.js`). The card only sends a wish: `{"type":"settings", ...}`. The server takes it from the host alone, and only while no race is on. Every update carries the settings, so every page shows the same thing. When the last person leaves, they go back to the defaults: computer karts on, Normal, six people.
- **The limit never throws anyone out.** The host cannot set it below the number of people who are already in the room (`settingsAfter`): the limit then stays as it was, and the rest of what was asked still counts. Computer karts never count towards it, and they still fill the race to six karts whatever the limit is.
- **A room that has reached its limit says "The room is full" to whoever arrives.** There is one room for each track for the whole site, so a host who sets 2 keeps everyone else out until someone leaves. One exception: a signed-in player who is already in the room is let back in (their page lost the connection for a moment, or they opened another tab). Their older kart leaves first, as the "one kart for each player" rule says. A guest has no name to be recognised by, so a guest is told the room is full.

What the server refuses here, each with a test (`tests/online-settings.test.js`, `tests/game-settings.test.js`):

- Settings from anyone but the host, and from the host during a race. Nothing changes.
- A level that is not one of the three words ("medium"), a limit below 2 or above 6, computer karts that are not exactly true or false, or a message with a part missing. Like every other strange message, it sends its sender away.
- A limit below the people who are in the room.
- A newcomer when the room has as many people as the limit.

## Part 4: Accounts, results and data

### How do accounts work, and what do they refuse?

An account is a user name and a password. There is no email: the team dropped it on 15 November 2026. The menu has the forms; the server does the deciding.

1. **Signing up.** The page sends the name and the password to `/api/signup`. The server checks both against the rules in `shared/account-rules.js` (the page uses the same file to warn early, but the server never trusts the page). The name must be 3 to 16 letters, digits or underscores, and "Ana" and "ana" count as the same name. The password must be at least 8 characters, and since 19 November 2026 it cannot be the user name itself, whatever the capital letters: that is the first thing anyone would try. This is asked when a password is chosen (signing up, changing it), not when signing in, so an account made before that day still opens.
2. **The password is scrambled, never kept.** `server/passwords.js` runs it through `scrypt`, a function that comes with Node.js, together with a random "salt", so two players with the same password get different results. What is stored cannot be turned back into the password. It is slow on purpose, about a tenth of a second, so that someone who stole the database could not try millions of guesses.
3. **Staying signed in.** After a correct password the server makes up a long random "ticket" (32 random bytes) and gives it to the browser in a cookie. The browser sends the cookie back with every later request, and that is how the server knows who is asking. The database holds only a scrambled copy of the ticket, so someone who could read the database still could not use it.
4. **Signing out** removes the ticket on the server, so a copy of the cookie stops working too. A ticket also stops working after seven days.
5. **Changing your password** (since 13 November 2026). In the menu, under "Your account", "Change my password" asks for the password you have now and a new one. The page sends both to `/api/change-password`. The server checks the current password again, with the same lock after five wrong tries: being signed in is not enough, so someone who finds a laptop open cannot take the account over. The new password has to keep the rules and has to be a different one. It is scrambled like any other. Then you are signed out on every other phone or computer, so that someone who knew the old password is out, and you stay signed in on the one you used.
6. **Deleting your account** asks for the password again and removes your sessions and results with it.

There is no way to get back into an account when the password is forgotten. That needs email, which the game does not have (see the known limits).

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

### How does a time get onto the shared leaderboard, and can it be faked?

Only the server can put a time there, and only a time from a race it ran itself.

1. When a browser opens the online page, it sends its cookie along with the request for the live connection. `server/online.js` looks up whose ticket that is and remembers it for that connection. No ticket, or one that does not work, means a guest. The page is told which ("Signed in as Ana" or "You are playing as a guest").
2. The host starts a race. The room (`server/room.js`) moves every kart with the shared rules and notices the step on which each racer completes the last lap. It keeps the finishing order: position, race time in steps, fastest lap. Two racers who cross the line in the very same step share a position.
3. For each finisher who is signed in, the server writes one row to `race_results`: the player, the track of that room, the two times, the position and (since 19 November 2026) the character they drove. Then it tells that browser "saved", and the page shows the place and the time.
4. The Leaderboard in the menu asks `/api/leaderboard?track=...` and gets, for that track, the ten fastest races and the ten fastest laps, one row per player, plus the signed-in player's own best and rank. Only user names and times are sent.

Why it cannot be faked from a browser:

- There is no address that accepts an online result, and no message a browser may send that contains one. A browser that sends a made-up "saved" or "result" message is sent away. A made-up finish added to a real "keys" message is dropped. Both have tests.
- The time, the track and the player all come from the server: the room's own count of steps, the room the connection is in, and the cookie.
- Nothing can be driven while the room waits for the host, so there are no laps outside a race to save. Neither is anything a guest drives, or a race a player left before the line.
- Single races never count. They run in the browser. Since 19 November 2026 a signed-in player's finished single race is reported to the server for that player's own stats (next question), through the one address that accepts a result, `/api/single-result`. It can only ever save a row marked "single", and both leaderboard questions in `server/store.js` leave those rows out (`mode = 'online'`). A test saves a single race faster than every online one and checks that the leaderboard does not move.

What a player can still do: drive well. And two friends can agree that one of them wins, as in any game.

The leaderboard is read from the database at most once every 30 seconds per track, however many people open it, and at once after a new result or a deleted account.

### What are "My stats", and can they be faked or read by someone else?

*Asked for by Catarina on 19 November 2026.* A signed-in player who clicks their name in the menu opens "Your account". At the top is a driver's card for the Nova lap, the track of the game (races on the test oval are saved too and are in the downloaded file, but not on the card): the character they drove most, dancing beside their kart; their name; how many races, wins and podiums; their three best race times with a medal each; their best lap; and where they stand on the shared leaderboard. Under it is **Download my results**, and at the bottom the account itself: change the password, delete the account.

**Where the numbers come from.** `server/store.js` gives the list of that one player's saved races (`resultsOf`). `server/stats.js` turns the list into the numbers, with no database and no internet in it, so it is tested with plain lists. `client/stats-view.js` turns the numbers into words ("1:23.45", "Driven in 5 of your 9 races"), and `client/stats-panel.js` puts them on the page.

**Both kinds of race count** (her decision): online races, and single races against the computer karts. When a signed-in player finishes a single race, the page tells the server once (`reportFinish()` in `client/main.js`).

**Can someone read another player's stats?** No. The addresses `/api/stats` and `/api/my-results.csv` take no name and no number. The server looks at the cookie, finds whose ticket it is, and answers about that player only. Tests ask with another player's name and number in the address and get nothing of theirs.

**Can a player fake them?** Their online races: no, the server ran those. Their single races: partly, and only for themselves. A single race runs in the player's own browser, so the server cannot watch it. What the server does about that (`server/single-results.js`, `saveSingleResult` in `server/accounts.js`):

- The race is saved as "single" and never reaches the shared leaderboard. Nobody else ever sees it.
- The numbers must make sense, or nothing is saved: a track that exists, whole numbers, a best lap that fits into the race time, a place from 1st to 6th, a character of the cast, a level that exists, and a race no faster than all laps at twice the top speed of a kart. (On the Nova lap that is 36.5 seconds. The computer karts need more than a third longer on every track, which a test checks by driving a real race.)
- A second race is refused until as much time has passed as the reported race took. Two hundred made-up races sent at once save one row.
- The player is the one in the cookie. A player named in the message is ignored, and so is a message that calls itself "online".

What is left: someone who knows how can report a believable time they did not drive. It changes only what they see about themselves.

**Easy, Normal and Hard.** Since Rodrigo's levels for the computer karts of a single race (the same day), a win on Easy counts like any other: Catarina's decision. So that it is clear which is which, each best time and the best lap carry a little label beside them: "on Easy", "on Normal", "on Hard" (the words on the buttons of the "Game settings" card, from `client/difficulty.js`), or "Online". One line says where the wins come from: "3 wins: 1 online · 1 on Easy · 1 on Hard". The page sends the level with the finished race, the server refuses anything that is not one of the three, and an online race never has one (`raceTag()` and `winsLine()` in `client/stats-view.js`, `winsBy` in `server/stats.js`). The downloaded file has a column for it.

**Most played character** counts from 19 November 2026: races saved before that did not note the character. The card then says "of the N races that noted the character".

**The file** (`resultsAsCsv()` in `server/stats.js`): one line for each saved race on any track, the newest first, with the day and time, the track, the kind of race, the level of the computer karts, the place, both times and the character: ten columns. It is a ".csv" file, which Excel and every other spreadsheet program open. Each time is there twice: as on the screen, and as a whole number of thousandths of a second, which sorts and adds up the same in every country. A text that a spreadsheet could take for a formula gets an apostrophe in front; every text comes from our own lists, so this is a second lock. Checked in Excel on Catarina's laptop: nine columns, and "Ró Versos" spelled right. Not checked: a laptop whose region writes numbers with a comma (as in Portugal), where Excel may put each line into one cell; "Data, From Text/CSV" in Excel reads it properly there.

**The database** got two new columns for this in `race_results`: `character`, and `level` (easy, normal or hard, for single races). The server adds them by itself when it starts (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`), which does nothing if they are already there and never touches what is saved. A test on the real database makes a table the old way, with a race in it, and checks exactly that.

### Where is data stored, and what exactly is stored?

In a Postgres database kept by a company called Neon, in Frankfurt, on its free plan. Everything else the server knows, such as the karts in the online room, lives only in its memory and is gone when it restarts.

**What is stored today:** four tables.

| Table | One row for | What is in a row |
|---|---|---|
| `server_starts` | each time the server started (the newest 50 are kept) | a number, and the date and time. It exists to prove that the server can write to the database and read from it |
| `players` | each account | the user name as typed, the same name in small letters (so "Ana" and "ana" cannot both exist), the scrambled password, how many wrong passwords in a row, locked until when, and the date joined |
| `sessions` | each browser that is signed in | a scrambled copy of the ticket, whose it is, and when it stops working |
| `race_results` | each finished race of a signed-in player | the player, the track, the mode ("online" for a race our server ran, "single" for a single race the player's browser reported), the race time and the fastest lap in steps, the finishing position, the character driven and, for a single race, the level of the computer karts (both since 19 November 2026; empty for older races), and the date |

The only personal data is the user name a player chose. There is no email, no real name and no readable password. Deleting an account deletes that player's rows in all three tables: the database does that by itself, because sessions and results are tied to their player.

**Stored in each player's own browser, not by us:** the camera view, the time of day and the four sound switches from Settings; the character chosen (and the second driver's, for two players); whether a single race has computer karts and how good they are; that the "How to play" card was already shown; and the best single race time and best lap on each track. Clearing the browser's data deletes them. The best times and the settings never reach our server. The character does, when you race online. And when a signed-in player finishes a single race, the page sends that one race to the server for their own stats. A two-player race is never saved anywhere. The cookie that keeps a player signed in is also in the browser, but the page's code cannot read it.

**What a player can get back:** a signed-in player can see their own rows as "My stats" and download them as a file. Nobody else can.

**Nothing more is planned to be stored.** Trophies were dropped with the cup on 17 November, and unlocking characters was never built. For counting tries, the server keeps each visitor's network address in its memory for a minute. It is never written to the database.

**How the server reaches it:** through a secret address that includes a password, the setting `DATABASE_URL`. It is in two places only: Render's Environment page, and a file called `.env` on Catarina's laptop, which git ignores. It is not in the code, and the code never prints it. On the first day the address was once pasted into a chat with the coding agent by mistake. The password was changed in Neon straight away, before anything used it.

**How to see it working:** the address `/database-check` on our site answers with the number of starts recorded and the time of the latest. Without a database it answers "The database is not set up on this computer", and when the database cannot be reached, "The database could not be reached".

**The code talks to the database safely.** Values are never glued into the text of a question. They are handed over separately, which is what stops the classic attack on databases (SQL injection). The only names written into a question are the table's, which is checked to be small letters and underscores only, and one of two column names that are fixed in our own code. All the questions about players, sessions and results are in one file, `server/store.js`.

**Tests never touch the real players.** The tests that use the real database work in tables of their own (`server_starts_test`, and tables whose names start with `test_`) and remove them at the end. The code that removes the account tables refuses to run on the real ones.

## Part 5: When something goes wrong

### What happens if the server restarts or sleeps, or the database pauses?

(There is no email service: an account is a user name and a password, so nothing can fail there.)

The server runs on Render's free plan. Render takes the code from the `main` branch on GitHub and follows the settings in `render.yaml`. What the code does today:

- **The server restarts or stops.** This happens every time a new version goes online. The room is gone, because it lives only in the server's memory. On the online page the karts stand still. We measured that a browser can go on believing it is connected for 10 to 20 seconds after our server has cut it, because the news passes through Render's network. So the page does not rely on that: after two seconds without an update a card over the picture says "The server has gone quiet". After eight seconds without news the page lets go of the connection and tries again by itself, soon at first and then every five seconds. The card then says "Connection lost" and counts the seconds. As soon as the server is back, the page is in the room again without a reload: a new, empty room, where everyone who was there meets again. Someone who comes back like this while a race is on watches it and drives in the next one. Until 19 November the page only said "reload the page", and the player had to do it by hand. Practice keeps working in a page that is already open, because it runs in the browser.
- **The server cannot be reached, or is waking up.** The online page keeps trying by itself (`client/link.js`). After three seconds the card says "The server is waking up" and that this can take up to a minute, with a little kart that drives along a road while it waits. After two and a half minutes without success the page stops and offers a "Try again" button. In the menu, signing in, the account corner and the leaderboard add "The server is waking up, which can take up to a minute" when an answer takes more than three seconds (`client/waking.js`), and a question that gets no answer for a minute and a half ends with "The server could not be reached. Try again in a moment."
- **Someone opens an address that does not exist.** A browser gets a page of the game that says "Off the track", with a button back to the menu (`client/not-found.html`), still with the number 404. A script or a program that asks gets the three plain words "Page not found.", as before.
- **A player leaves the online page** (the "← Menu" link, Back, or closing the tab). The page closes its connection itself as it is hidden, so the server removes the kart at once (`client/page-life.js`). If Back brings the page back from the browser's back/forward cache (a memory where browsers keep a page you left, to show it again instantly), the page reloads and joins as one fresh player. This was added on 17 November after a player saw their kart twice, then three times, after leaving and coming back: a page kept in that cache can keep its connection open, so the server kept the old kart.
- **A browser vanishes without saying goodbye** (a closed lid, lost Wi-Fi). The server checks every 5 seconds that each browser still answers, and removes the kart of one that has not answered by the next check, so such a kart stays for 5 to 10 seconds. Until 17 November it was every 15 seconds, so up to 30. Much shorter would risk removing a real player whose answer is slow, for example on a phone hotspot.

These are the limits we expect from the free hosting plans:

- Render's free server sleeps after 15 minutes without visitors and takes about a minute to wake up. Since 19 November 2026 a job on GitHub is asked to open `/health` every five minutes (`.github/workflows/keep-awake.yml`), which counts as a visitor. In practice that is not enough: GitHub runs the timed jobs of a free repository when it has room, and from 19 to 23 November 2026 it ran ours only once every five to eight hours. So the server still sleeps most of the time, and the first visitor waits about a minute; our own pages then say "The server is waking up". Render has no switch for this on the free plan. What would keep it awake is a paid Render plan, or a visitor from outside that really comes every few minutes. Before a demo, someone opens the link a few minutes early. GitHub only runs timed jobs from `main`.
- Render can restart a free server at any time. An online session in progress is lost, as described above, but anything saved in the database will be safe.
- Render's free plan gives 750 running hours a month, which is enough for one server that is always on.
- Neon's free database pauses after 5 minutes without use and wakes on the next request.

**The database is asleep, slow or cannot be reached.** The game keeps working: the pages, the practice race and the driving in online play do not use the database. What stops for that moment is accounts. Signing in, signing up, the shared leaderboard and a player's own stats answer "Accounts could not be reached just now. Try again in a moment." A browser that connects to an online race is let in as a guest. A signed-in racer who finishes is told "Your last result could not be saved", and the race goes on for everyone. That one result is lost: the server does not try again later. A single race that cannot be saved is lost too; the page says so when the server cannot be reached, and says nothing when only the database is down. The tables for accounts are created the first time they are needed, so a database that was asleep when the server started is not a problem. The details of a database error only ever go to the server's own log. Each of these has a test with a pretend database that fails.

The server does not wait for the database when it starts. `/database-check` answers "The database could not be reached. Try again in a moment." An unreachable database takes ten seconds to give up on, so after a failure the server does not ask again for three seconds, and visitors in that time get the same answer at once. This was tried for real on 10 November, when the university Wi-Fi blocked the database: the server started, sent the game, and answered the check with that message.

## Part 6: The tests

### What do the tests cover, and what do they miss?

We run them with `npm test`. GitHub also runs them by itself on every pull request and on every change to `main`. On 23 November 2026 there are 2,804 tests in 105 files, and 5 more that are skipped without the database's secret address. They take about 40 seconds, most of it online races that run in real time.

`tests/README.md` lists every test file with what it checks. This is the summary. (Until 23 November 2026 this answer was a long list that grew with every pull request, with the story of each change. That story is in the diaries in `docs/diary/`.)

**What the tests cover**

- **The rules of driving** (`shared/`): speeding up, braking, steering, grass and walls; laps and checkpoints, including driving the wrong way and going back and forth over the line; the countdown; the starting grid; karts that bump; banana peels; ramps; the people who walk across the track.
- **Whole races driven by robots:** three laps of the test oval, of the Nova lap and of the campus loop (which is kept for the tests), a single race against computer karts, a two-player race.
- **The computer karts:** how each one decides what to press, the three levels, and that none ever drives faster than a player's kart can.
- **The online room.** First without any network (`server/room.js`): who the host is, who may start a race, the countdown, watching, the finishing order, the time limits, a host who is away. Then through a real connection (`server/online.js`): what a browser may send, what gets it sent away, a full room, one kart for each signed-in player, and results saved for the right player.
- **Accounts:** every refusal in the answer about accounts, the scrambling of passwords, the lock, the sign-in ticket, and the questions to the database. The same list of checks runs on a pretend database kept in memory and on the real one (`tests/store-contract.js`).
- **The leaderboard and "My stats":** only online races count, a single race never reaches the shared boards, and a single race whose numbers cannot be real is refused.
- **What the pages say:** the words of the menu, the leaderboard, the account panels, the game settings, the banners and the "How to play" card; which key does what; and that only Enter starts a countdown.
- **The safety of the pages:** a test reads every page and script in `client/` and fails if one could put a text on the page as HTML, or loads anything from another website.
- **The pictures, as far as they are sums:** the camera, the shapes of the kart, the pilot and the podium, the Nova lap's picture against its map, the ground at two levels.
- **Sound and music:** which sound or tune is due at which moment, on a pretend sound system that makes no sound.

**Things that must be refused have tests too.** Some examples: a seventh player in a full room, a start from someone who is not the host, a second start during the countdown, a made-up "result" message, a wrong password, a user name that is taken, a request from another website, a track that does not exist, a key other than Enter starting a race.

**We also broke the code on purpose.** For many parts we changed the code in a wrong way, one change at a time, and checked that at least one test then failed. A test that still passes when the code is wrong checks nothing. The diaries say which changes were tried.

**What the tests miss**

- **How the game looks, sounds and feels.** No test paints a picture or plays a sound. The files that draw (`client/draw.js`, `client/ground.js`) and the pages that run a race (`client/main.js`, `client/online.js`, `client/double.js`) need a real browser. A few tests read their text, nothing more. We look and listen by hand.
- **The files that put a panel on the page** (`client/account-panel.js`, `client/leaderboard-panel.js`, `client/settings-panel.js`, `client/stats-panel.js`, `client/results-board.js`). They are checked by eye in a browser.
- **Real people on different laptops:** online races between laptops, two people on one keyboard, a slow or uneven connection. These are checked by hand with `docs/two-laptop-checklist.md`.
- **The live server.** Nothing tests it automatically. GitHub does not have the database's address, so it never runs the tests against the real database: a team member runs `npm run test:database` on a laptop.
- **Differences between browsers.** No test runs the game in a real browser, so a problem that only one browser has would not be caught.
- **How long things take on the free server,** such as scrambling a password.

**Our rules about tests** (from `AGENTS.md`): every rule of the game gets a test, including what must not be allowed; nobody edits or deletes a test to make it pass; and all tests pass before a pull request is opened. When the game itself changed, so that what a test said was no longer true, the test was changed with a comment that says what it said before. That happened when the campus loop left the game, and when Enter became the key that starts every race.

## Part 7: The rules of a race

### How does a kart move?

Time moves in small steps, 60 per second. For each step, the function `stepKart` in `shared/physics.js` takes the kart as it is now, the keys that are pressed, the driver's scores and the kind of ground, and gives back the kart one step later. It does four things in order:

1. **Steering.** It turns the direction the kart points. There is no turning when standing still, and turning is a little slower at top speed.
2. **Pedals.** Gas makes the speed climb toward the top speed, quickly at first and gently near the top. Brake stops the kart quickly and then reverses slowly. With no pedal, the kart slows down gradually.
3. **Grip.** A kart can be moving in a slightly different direction from the one it points: that is a slide. The tyres remove part of the slide in every step. More grip removes it faster.
4. **Moving.** It moves the kart by its speed for one sixtieth of a second.

A driver's scores go from 1 to 5.75. They are not speeds. At the top of `physics.js` there is a short list that says what the lowest and the highest score mean in real motion, for example a top speed from 240 to 360 units per second. Those are the numbers we tune by playtesting.

Our placeholder driver, with middle scores, reaches 80% of its top speed in about 1.2 seconds, stops in about half a second when braking, and keeps about 75% of its top speed on grass.

### How are laps counted, and can a player cheat?

A track has checkpoints: invisible rectangles across the road, in driving order. The first one is the finish line. The game keeps one count for each kart: checkpoints passed.

**The karts start behind the line** (changed on 12 November at Catarina's request: before, they started just after it, so there was no start line ahead of them). The grid is two columns of four places behind the line (`shared/grid.js`). Crossing the line for the first time starts lap 1 and does not count as a lap. The clock still starts at GO, so the time of lap 1 includes the short run to the line.

- Driving into the next checkpoint adds one.
- Driving back into the checkpoint before the last one takes one away.
- Driving into any other checkpoint changes nothing.

A lap is complete each time the count reaches a new full round. These cannot complete a lap, and each has a test: skipping a checkpoint, taking them in the wrong order, driving the wrong way round, going back and forth over the finish line, and reversing over the finish line to count the same lap twice.

Race time is counted in steps of the game, 60 per second, not with a clock. A finish time is therefore exact and the same on every computer.

Our first version of this rule had a mistake: a kart driving the wrong way round was given a lap after about three rounds. A test that drives a "robot" kart the wrong way round the test track found it, and the rule was rewritten as described above.

### What happens when karts touch, and what do the banana peels do?

Both are rules, so they are in the `shared/` folder, the server runs them for online races, and a browser cannot change them.

**Bumping** (`shared/bumps.js`). Every kart is a circle. When two circles overlap, the karts are pushed apart along the line between their middles, and the parts of their speeds along that line are swapped, with half of the closing speed lost. So a kart hit from behind is shoved forward and the one behind is slowed, and a side swipe pushes both sideways. After a bump the wall rule runs again, so a bump can never leave a kart inside a wall. A bump never changes a lap count or a clock.

**Banana peels** (`shared/hazards.js`). In a race, a banana peel appears on the road from time to time: the first one four seconds after GO, then one every two to five seconds, up to a number that grows with the size of the track (about five on the test oval, and never more than twelve on any track). A kart that drives over one spins out for 1.2 seconds: its keys do nothing, it slides the way it was going and slows down, and the banana is gone. For one second after a spin it cannot be spun again. The rules do not turn the kart: the spinning is only drawn (`spinTurnOf` in `client/scene.js`), and after the spin the kart points where it pointed before.

**Where a banana may appear:** only on road, never next to a wall, never near the start line or the grid, never close to a kart or to another banana. One banana can therefore never block the road.

**Chance, but honest chance.** Where and when bananas appear comes from a number picked when the race starts, the "seed", and a small formula that turns it into a long row of numbers that look random. The same seed always gives the same bananas. Online, the server picks the seed and never tells anyone, and no message from a browser can place or remove a banana. That also lets the tests give a seed and know exactly what will happen.

What must NOT happen, each with a test: karts passing through each other at the highest speed, a bump creating speed out of nothing, a kart inside a wall after a bump, a banana on grass or in a wall or on the grid or on top of a kart, a spinning kart being steered, a second banana making a spin longer, a banana being hit during 3, 2, 1 or by someone who is only watching, and a browser message that places or removes a banana.

### How does a single race run in the browser?

`client/main.js` repeats three things for every picture the screen shows, usually 60 times a second:

1. Ask `client/keyboard.js` which arrow keys are held.
2. Ask the rules where every kart is now. This is one call to `stepPracticeRace` in `shared/practice-race.js` for each sixtieth of a second that has passed. During the countdown that call only counts. From GO on it moves your kart with your keys and each computer kart with the keys its driver chose (next section), all through `stepRacer` in `shared/race.js`, then lets karts bump and looks after the bananas.
3. Ask `client/camera.js` where the camera should be, then ask `client/draw.js` to draw the track and the kart from there, and fill in the lap counter and the clock.

Screens do not all refresh at the same speed, but the rules must always move in steps of exactly one sixtieth of a second. So `main.js` measures how much real time has passed and runs as many whole steps as fit in it.

When the page opens, the "Game settings" card comes up first (and the "How to play" card on a first visit). Then the picture says "Press Enter to start the countdown", and the arrow keys do nothing. Enter starts a countdown: 3, 2, 1, GO!, one second each. During 3, 2 and 1 the keys do nothing, the kart stands still and the clock stays at zero. At GO the clock starts, whether a key is held or not. The countdown is counted in steps of the game, 60 for each number, like the race time, so the server uses the same rule for online races. Holding the gas early gives no head start, and there is a test for that. After the last lap, the keys are ignored, the kart rolls to a stop and the finish time is shown. R starts again.

The place line ("3rd of 6") uses the same `placeLine` as the online page. When you finish, a banner says "You finished 3rd, in 1:02.34!" and the camera moves to a computer kart that is still driving. When all have finished, or 30 seconds after you, the podium comes up, with the buttons "Race again" and "Back to menu".

**Full screen.** The **Full screen** button at the right of the numbers, or **F**, puts the numbers and the picture on the whole screen (`client/full-screen.js`, on the three race pages). The browser does the work; the picture is the same 960 by 576 points, made bigger until it touches the edges, keeping its shape. **Esc** or F again goes back.

The practice race runs entirely in the browser. While it runs, nothing is sent to the server. When a signed-in player finishes a race against computer karts, the page reports the result once, so that it counts in "My stats". When a race is finished, `client/records.js` compares it with your best race time and best lap on that track, keeps the better ones in this browser, and the finish message says "New best time!" or "New best lap!". The Leaderboard button in the menu shows them.

Because the race runs in the browser, a player could fake those times. That is fine for personal records nobody else sees, and it is why a single race never counts for the shared leaderboard. The server keeps a reported single race only for that player's own stats, after checking that the numbers could be real (`server/single-results.js`). The shared leaderboard counts only online races, which the server runs itself.

### How do the computer karts decide what to do?

Since 17 November a single race has five computer karts. They are the five characters of the cast (`shared/cast.js`) that you did not choose, so no character is in the race twice; if you chose none, they are the first five. They start on the front of the grid and you start behind them. Their brain is `shared/computer-driver.js`. It uses an idea our professor suggested, **utility AI**: "utility" means how useful something is. Many times a second each driver:

1. **Looks around** (`lookAround`). How fast am I? Where is a point on the racing line a little ahead of me (further ahead the faster I go)? How sharp is the next bend, and how far? Is a kart close in front? Is a banana on my way? Is there road to my left and right? Have I been standing still for a while?
2. **Scores each thing it could do**, from 0 (useless now) to 1 (very useful now) (`scoreActions`). There are five: *follow* the racing line, *brake* for a bend, *overtake* the kart in front, *dodge* a banana, and *recover* (back away from a wall). Follow always scores 0.3, so it wins when nothing else matters much. The others grow as the danger or the chance grows: braking when the bend is sharp, close and the kart too fast for it; overtaking when a kart is close in front and there is road beside it; dodging when a banana is close.
3. **Does the one with the highest score** (`bestAction`) and turns it into the same four keys a player has (`keysFor`): gas, brake, left, right. A computer kart cannot do anything a player cannot. It drives with the same rules in `shared/race.js`, the same top speed and the same driver stats.

**Personalities are weights.** There are six ways of driving, one for each character, and a character always drives the same way: PCP is the Daredevil, Dean Steady, Professor Ricardo Pereira Careful, Cici Boss the Hunter, FranFon Smooth and Ró Versos Calm (`PERSONALITY_OF_CHARACTER` in `shared/computer-driver.js`). Each is three numbers. *Daring* makes it take bends faster and want to overtake more. *Care* makes it brake earlier and dodge bananas sooner. *Pace* is how close to top speed it drives on a straight. A personality changes only the decisions: every kart has the same top speed and the same driver stats, because all characters drive the same kart. That is why they finish at different times and in different orders, and why a different one can win each race.

**The racing line** is the chain of points the arrows on the road already follow (the `route` of the track's look: `client/track-looks.js`, and for the Nova lap `client/nova-lap-look.js`). The page turns it into points and gives it to the race. Each driver remembers which stretch of the line it is on, and only moves on to the next stretch, never jumps to one beside it. That matters where two parts of the line run close side by side (on the old campus loop that was the hairpin round the CTT Student Hall). Only a kart that is thrown far from its stretch looks along the whole line again.

**Getting stuck.** A kart that has stood still for three quarters of a second, and is not spinning from a banana, counts as stuck. It then backs away for just under a second (the brake reverses once a kart has stopped), steering the other way so its nose turns towards the road.

**The mood of the day.** Without chance, a computer kart would drive the same race every time from the same place on the grid, and Rodrigo saw exactly that. So since 18 November each computer kart gets a "mood" for each race (`moodFor`): its daring and care move by up to 0.15 up or down, its pace by up to 0.03, and it likes to drive up to 10 units (about 1 metre on the Nova lap) to the left or right of the racing line. The Daredevil stays daring, but no two races are driven alike: in 40 races on each of the two tracks we had then (the test oval and the campus loop) the finishing order was different in 28 to 31 of them, and four or five different characters won. The mood is picked from the race's random number (the same one the bananas come from), so the same number always gives the same race. That is what lets the tests still play a whole race again exactly.

**Easy, Normal and Hard** (built by Rodrigo and decided on 19 November; the team had dropped difficulty levels on 17 November). The level is chosen on the "Game settings" card, which comes up when a race page opens and again with the "Game settings" button. Confirming starts the race again, and for a single or a two-player race the browser remembers the choice. Online the host chooses the level for the room. A level moves every personality's numbers the same way, after the mood of the day (`atLevel`): on Easy pace goes down by 0.18, daring by 0.4 and care up by 0.3; on Hard pace up by 0.08, daring up by 0.35 and care down by 0.3. A level never changes the kart: pace stays at most 1, so a computer kart never drives faster than a player can. Measured over 20 races on each of the two tracks we had then, the winning computer kart was 12 to 17% slower on Easy than on Normal, and 1 to 4% faster on Hard. Hard cannot be much harder in a fair way: on Normal they already drive close to the kart's top speed.

**Computer karts online.** Since 18 November, when the host starts an online race, the characters nobody in the room is become computer karts for that race, up to 6 karts in all (one for each character). With one person there are 5 computer karts, with four people 2, with six none. (A two-player race has four computer karts, a single race five, and they can be switched off in every kind of race.) To the room (`server/room.js`) a computer kart is simply one more player, with a place on the grid and a kart that the room moves with the shared rules. The only difference is who presses its keys: the server, once every step, with the same brain and the same moods as in a single race (`server/computer-players.js`). So the room's own code did not change, a computer kart can do nothing a player could not, and no browser can steer one. Their results are never saved to the leaderboard. They leave before the next start (so someone who arrives can take their character), at once when no person is racing any more, and when one of them would otherwise become the host. A person always comes before a computer kart: if someone arrives at a full room (six), the computer karts leave when no race is on, and during a race the last one to come in makes way so the person can watch. The host can switch them off on the "Game settings" card, while no race is on, and can also limit the room to between two and six people. Everyone else sees a small label in the corner of the picture that says who the host is and how the races are run. Their names show as, for example, "Dean (computer)". The real server starts every room with them switched on; the test server keeps them off unless a test asks for them, so the older online tests are unchanged.

**Why utility AI, and not something else?** The two usual alternatives were a fixed list of rules ("if a bend is close, brake") and a "state machine" (the kart is in one mode at a time, with rules for switching). With scores, two things that matter at once are weighed against each other instead of one rule always winning, and a personality is just different weights, not different code. Learning by trial ("machine learning") was not considered: it needs a lot of training and the result cannot be explained line by line.



### How do two people race on one computer?

"Two players" in the menu (since 19 November 2026) is a race for two on one keyboard, on a split screen: `client/double.html` and `client/double.js`.

- **Each driver has their own keys.** Player 1, who chooses a character first, drives with the arrow keys, as in every other race. Player 2 drives with W, A, S and D (`client/keyboard.js`). The letters only drive on this page: on the other pages they do nothing. They are kept in small type, so Caps Lock makes no difference. (On 19 November it was the other way round. Catarina tried it and asked for this on the 20th.)
- **Each driver has half of the screen, on the side where their keys are.** W, A, S and D are on the left of the keyboard, so player 2 has the left half; the arrows are on the right, so player 1 has the right half (`DRIVERS` in `client/double-view.js`). On the grid they stand the same way round. There are two pictures, each painted by its own painter (`createPainter` in `client/draw.js`) from behind one driver's kart. Each half shows the middle of its picture, so the two fit side by side without becoming tiny, and the small map moves in from the edge. Under each half is the driver's name plate in the colour of their kart: lap, time and place. In the other driver's half your kart carries a tag, "P1" or "P2".
- **The race is one race** (`shared/two-player-race.js`). It is the single race's rule with two players instead of one: the same countdown, the same driving rules, bumps, bananas and walkers, in the same order. The two players are racers 0 and 1 and start side by side, so neither has a head start. With computer karts on, the four characters the two did not choose race too, and start in front of them. With computer karts off, only the two race.
- **It has an end of its own.** A single race ends when the player finishes. Here one of the two may never finish, so the race is over when every kart has finished, or when both players have finished and waited 30 seconds for the computer karts, or two minutes after the first kart finished, or ten minutes after GO. Those are the two limits of an online race (`shared/race-time.js`).
- **Each driver chooses a character in the menu.** The character step comes twice (`chooseTwoDrivers` in `client/track-panel.js`), and the second driver cannot take the first one's character. The page itself also makes sure they differ (`twoCharacters` in `client/cast-choice.js`), so it works when its address is opened directly.
- **Nothing is saved.** It runs in the browser, like a single race, but nothing is sent to the server: no stats, no leaderboard, no best time. Two people share one account's browser, so there is nobody to save it for.
- **A driver who finishes first watches the other one.** Their half moves to the other driver's kart while that driver is still racing, and after that to the computer kart in last place, with a banner that says so (see "What does a driver see after their own finish?" below).
- **When it is over, player 1's picture grows over both halves and shows the podium**, with "Race again" and "Back to menu". It is the same podium as in a single race and online: the three pages call the same painter (`client/podium-view.js`).
- **One limit we cannot fix in code:** many laptop keyboards cannot tell more than a few keys apart when they are held at the same moment, so now and then one driver's key may be ignored while the other holds theirs. The page says so under the pictures.

What the race rule refuses, each with a test (`tests/two-player-race.test.js`): the same character for both drivers, a character that is not in the cast, a level that is not one of the three, a number of computer karts that is not a whole number from 0 up (too many are cut down to six karts in all), one driver's keys moving the other's kart or a computer kart, and keys from a driver who has finished.

### What does a driver see after their own finish?

Until 19 November 2026 a driver who had finished sat looking at their own kart standing still until everyone was home. Since 20 November, at Catarina's request, their camera moves to a kart that is still driving, the way it does for someone who arrives during a race. The rule is one function, `kartToWatchAfterFinish` in `client/race-view.js`, and the three race pages use it:

- **A person rather than a computer kart.** Only when no person is still driving is it a computer kart: in a single race that is always so.
- **The one in last place** at that moment: the one everybody is waiting for.
- **The camera stays with that kart until it finishes**, then moves on by the same rule. The podium comes when nobody else is driving any more, or when the waiting time is up: 30 seconds after your finish in a single race, and the time limits of the race in the other two.
- **A banner across the top of the picture says it** (`finishedBanner`): "You finished 2nd, in 1:02.34!" in big letters, and under it "Waiting until every player finishes. You are watching Ana." The middle of the picture stays free. Online the banner also carries the time left, and the left and right arrows move the camera to another person, as for a watcher.
- **It is for showing only.** The driver's time and place were fixed when they crossed the line: on the server online, by the rules in the browser otherwise. Their keys still do nothing, and the laps and the finish that the sound cheers stay their own.

What the rule refuses, each with a test (`tests/after-finish.test.js`): the driver's own kart, a kart that has finished, a computer kart while a person is still driving, and jumping away from a kart that is still driving.

### What happens at the end of a race: the podium

*18 November 2026, on top of Pedro's podium, asked for by Catarina: the students of the crowd no longer all do the same. One in three waves both arms, one jumps off the ground, one claps over the head (`crowdPerson()` in `client/podium-shape.js`; which one a student does comes from their number in the crowd, so nobody stands anywhere else than before). A driver with long hair keeps it on the podium, and the second and third do their own dance there, so Cici Boss does the gangnam.*

*The same evening Catarina tried the podium of the Nova lap inside the Hovione Atrium, looked at it, and put it back where Pedro had it: on the lawn in front of the white wall with the school's name. It is one line in `client/nova-lap-look.js` (`podium: { at, camera }`). What stayed from that evening is "more exaggerated": the crowd is 80 students instead of 28, in four rows behind the podium and a group reaching forwards on each side (`crowdSpots()` in `client/podium-shape.js`); the camera starts four times further away and comes in to the podium in under three seconds, fast at first and gently at the end (`cameraPullBack()` in `client/podium.js`); the drivers are shown bigger; and there is more confetti.*

**At the finish, before it comes**: a driver who has finished while others still drive gets a banner across the top: "You finished 2nd, in 1:02.34!" and under it "Waiting until every player finishes. You are watching Ana." (`finishedBanner()` in `client/race-view.js`; see "What does a driver see after their own finish?").

**When it comes** (`client/podium.js`): online, when the server says the race is over (everyone finished, or the time ran out). In a single race, when every kart has finished, or at the latest 30 seconds after the player finished, so a computer kart that is stuck cannot keep the player waiting. It never comes before the player finished. Online, the podium is shown alone for 10 seconds, then the results board comes up on top of it, with everyone.

**Who cries beside it** (Catarina's idea, 19 November 2026): when four or more karts raced, the driver on the last line of the results, finished or not, stands on the lawn beside the step of second place with both fists at the eyes, shoulders shaking, and blue tears flying out like a little fountain, while everyone else cheers. Only that one: with five karts the fourth is neither on the podium nor crying, and with three or fewer nobody cries. It is the same in all three kinds of race (`podiumLoser()` in `client/podium.js`, `cryingPose()` in `client/pilot-shape.js`, `cryingDriver()` in `client/podium-shape.js`).

**Who stands on it**: the first three karts that finished, the fastest on the top step. A kart that did not finish never stands on it, even if it was in front on the track. Each driver is their character, with their own head, suit and dance. A kart that is no character keeps a helmet on, so no empty head is shown.

**Where**: on the Nova lap, on the track itself: on the lawn right in front of the white wall with the school's name, at the end of the entrance avenue, by the start (`podium` in `client/nova-lap-look.js`). The race view (`client/draw.js`) paints each step with its driver and each student of the crowd among the walls and trees, like a kart, with a camera of its own that looks at the podium and the name above it. The other tracks have no such wall, so there the podium stands in a hall of its own: white, with tall glass panes and a big NOVA SBE sign in our own letters, not with the school's logo. (Pedro first chose the hall for every track, then, on 18 November, the real wall on the Nova lap.)

**What it shows** (`client/podium-shape.js`, painted by `client/podium-view.js` with the same painter as the karts): three steps, 2nd on the left, 1st in the middle and highest, 3rd on the right; the drivers standing on them in their suits with no helmet; the winner lifting a gold trophy (`trophyParts()` and the "trophy" pose in `client/pilot-shape.js`); the other two doing their own dance; 80 students cheering round the podium, waving, jumping or clapping, always in the same places and colours; confetti; a line along the bottom of the picture with the places, names and times; and the podium tune, trumpets and clapping, played once. (`cheersDue()` is still in `client/podium.js` with its tests, but no page calls it since the recorded music came.)

**What to do next, with one click** (19 November 2026): in a single race, two buttons come onto the picture with the podium, in the top right corner where they cover nobody: **Race again** (what R does) and **Back to menu**. Under them a small line says whether the race was saved for a signed-in player's stats. Online, the results board has **Start next race** for the host (what Enter does; the server obeys nobody else) and **Back to menu** for everyone. On a low screen the list of the board scrolls and the buttons stay in view. They sit inside the play area, so they come along on the whole screen (Rodrigo's full screen). Checked by eye in a browser, not by a test.

**Tested in `tests/podium.test.js`**: who stands where; that a kart that did not finish is never on it; when a single race is over (never before the player finished, at once when everyone has, and at the latest after 30 seconds); a whole single race driven by the computer, including the player's kart, which ends with three different characters on the podium, fastest first; the drivers' feet on their own step; no helmet; the trophy only for the winner and high above the shoulders; and a crowd that never stands on or in front of the podium.

## Part 8: What a player sees and hears

### How does the camera work?

There are three views. A race starts in the view chosen in Settings (the first one, unless the player chose another), and the V key switches to the next. The camera only changes what is shown. The kart moves by the same rules in every view.

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

**The start of a race.** When the countdown starts, the camera is high above the grid, looking down at it like a tilted map (this was the game's first "behind the kart" view). Before that, a single race shows the fly-over, a two-player race already waits in this high view, and online the camera sits behind the kart. While 3, 2, 1 is counted it comes down to its place behind the kart, and the lights on the gantry over the start line go red one by one, then green at GO (`client/scene.js`).

**A history of this view.** The team's original decision was the view from above with north up. A tilted view was added on 10 November because the still map looked flat. On 12 November Catarina asked for much better graphics, and the tilted view became the race view described here: lower, with a horizon, a sky, and things standing beside the road. The view from above is still there, one press of V away.

### How does a player know which way to go?

Five things in the picture. The first three are worked out from one list (`client/route.js`), and the last two from the checkpoints (`client/checkpoints.js`). The list is the track's "route", points along the middle of the road in the order they are driven.

- **Arrows painted on the road**, all the way round.
- **Arrow boards at the bends**, standing where a driver who missed the bend would end up. They point left or right, as the driver sees it.
- **A warning.** A kart that drives against the route for more than a moment gets "Wrong way! Turn round and follow the arrows." A kart that is standing, spinning, or just crossing the road does not.

- **A yellow light on the next checkpoint** (since 13 November 2026). The checkpoint the kart has to drive through next is lit up: a low, see-through curtain of yellow light across the road in the race view, and a yellow line in the views from above and on the small map. It is only light, karts pass through it (`client/checkpoints.js`, painted by `client/draw.js`).
- **A warning for a missed checkpoint.** "You missed a checkpoint: the stairs. This lap does not count until you drive through the yellow light." The name comes from the track file.

None of this counts laps. A lap counts only if the kart went through every checkpoint in order, and the server decides that. A test checks that following the route goes through every checkpoint in order on both tracks, so the arrows cannot lead a player wrong.

**Why did a lap sometimes not count on the campus loop?** Catarina reported this on 13 November. The lap rule was right, but the game did not explain itself. On the west side of the campus loop the road makes a hairpin round the end of the CTT Student Hall, and checkpoint 5 sits at the end of that hairpin. The square there is open, so a kart can drive straight on and never touch checkpoint 5. Crossing the finish line then counts for nothing, on that lap and on every lap after it, until the kart has gone through checkpoint 5. Nothing on the screen said so. The other five checkpoints reach from wall to wall and cannot be driven round. We did not change the track, which is Rodrigo's and waits for the videos from campus. We made the game say what is happening: the light shows where to go, and the warning names the checkpoint that was left out.

**How does the page know a checkpoint was missed?** A kart is only ever expected inside three checkpoints: the one it passed last, the next one, and the one before the last. Inside any other checkpoint, it must have left one out on the way. Online, the server sends every kart's count of checkpoints for this ("passed"). The warning is words on the page and decides nothing.

### What do the time of day, the fly-over and the "How to play" card do?

All three since 20 November (Rodrigo). None of them changes a rule, a lap or a time.

**The time of day** (`client/time-of-day.js`). Settings has four choices: Morning, Afternoon (the game as it always looked, and the default), Sunset and Night. The browser remembers the choice, and the race pages read it when they open. A time changes the track's look before the painter is made: the colours of the sky; where the sun stands and how high (it rises in the east and sets low over the sea in the west, since Carcavelos faces south); the colour of its glow and of the clouds; at night a moon and stars; the haze, the hills, the town and the beach take on the light; and on the Nova lap the shadows fall away from the sun, longest at sunset. Then `client/draw.js` lays a light over the picture: warm orange at sunset, dark blue at night (never more than 0.55, so the road stays clear). The light must not fall on the sky (the stars would go grey), so at another time than the afternoon the sky is painted on a canvas of its own and slipped in behind the finished picture at the end ("destination-over"): buildings still hide the sun and the stars, as before. The small map is not touched.

**The fly-over** (`client/fly-over.js`). While a single race waits to be started, the camera glides round the track along its arrows, over the karts waiting on the grid, as television does before a race; the message says "Press Enter to start the countdown". Enter starts the countdown and the camera comes down behind your kart as before. (Until 23 November 2026 any arrow key started it. Now Enter starts the countdown in every kind of race: a single race, two players, and online, where only the host's Enter counts. A driving key only drives. The rule is two lines, `onStart: start` in `client/main.js` and `client/double.js`, and `tests/race-start.test.js` checks it.) The track tour (`track-tour.html`) uses the same sums, which moved there from the tour.

**The "How to play" card** (`client/how-to-play.js`). The first time a player opens a race page in a browser, a card comes up over the picture: the goal, the main keys (two players get both sets; every page has Enter, and online has no R, because nobody can start a race again alone), and four tips, the checkpoints first because a lap does not count without them. "Let's race", Enter or Esc closes it, and it is remembered. It comes back with the "How to play" button above the track. While it is up the race does not start; when it closes, the "Game settings" card underneath gets the keyboard back.

### How is a track described, and how do walls work?

A track is drawn with letters in a file, one letter for each square of ground: `#` is wall, `.` is road and `,` is grass. Open `shared/tracks/test-oval.js` to see one. When the game starts, `shared/track.js` checks the drawing and stops with a clear error if it is wrong, for example if the start is inside a wall.

For walls, a kart is treated as a circle. After every move, the game checks whether the circle overlaps a wall square. If it does, the kart is pushed back out and bounces: the part of its speed going into the wall is turned round and halved, and the part going along the wall is kept. A head-on hit sends the kart back at half speed. A scrape costs very little. Everything outside the drawing counts as wall, so a kart can never leave the track.

### What is the Nova lap, and how was it made from a video?

The campus loop was made from a map and from what can be read online, and nobody recognised the campus in it. So on 17 November the team filmed the lap they wanted, nine minutes of walking: from the entrance avenue through the Hovione Atrium, onto the terrace, under the library, down the promenade and the wide stairs, past the tunnel to the beach, along the coast road, up the west street and back. The coding agent went through that film picture by picture and built a new track from it, the **Nova lap** (`shared/tracks/nova-lap.js`). The campus loop left the game on 20 November; its files are kept only for the tests.

**Bigger.** One square is 3 by 3 metres, half the size of a square of the campus loop. Compared with a kart, everything is twice as big, so a tall building looks tall and a low one low. A lap is about 690 metres.

**Not a survey.** The real coast road runs at a slant to the buildings. Here it runs straight along the bottom of the map, so that walls run along the squares. Paths were widened so karts can pass each other. The stairs are driven as a flat ramp, because the driving rules have no hills.

**The ground is drawn as shapes, not square by square** (`client/nova-lap-ground.js`): a rectangle of cobbles here, a slanting strip of ochre concrete there. Each kind of ground is a small picture that repeats (`client/ground-art.js`). The letters of the track (wall, road, grass) are made from the same shapes, and a test checks that the two agree, square by square. So the picture cannot show road where the rules say wall.

**The buildings are boxes with a picture on each side** (`client/nova-lap-buildings.js`). A box has a place on the map, a height in metres, and for each side the name of a picture. A box that starts above the ground is a roof or a bridge: karts drive under it and see its underside. That is how the atrium has a ceiling with a skylight and a gallery with wooden beams, and how the library bridges the way. The pictures are painted once by our own code when the page opens (`client/wall-art.js`): there are still no image files of buildings.

**How a picture gets onto a wall** (`client/scenery.js`, `client/scenery-paint.js`). A canvas can only draw a picture as a slanted rectangle, not narrowing to one side. So every wall is cut into strips one square wide, and each strip is drawn as several thin upright slices, each a little shorter than the one before. Thin enough slices look like one wall running into the distance. The furthest things are painted first, as before.

**The ground close to the kart is painted twice.** The whole track is one hidden picture, and on a track this large that picture is too coarse for the ground right in front of the kart. Because the ground is shapes, it can be painted again at any moment: a second, small picture holds only the ground round the kart, almost three times as sharp, and is painted again every time the kart has moved a little (`client/ground.js`).

**No invisible walls.** A wall with no scenery of its own still gets the low bank of the other tracks. A test builds the track the way the page does and checks that no bank is needed anywhere: every wall beside the road has a building, a railing, a hedge or a low wall.

**What is on the walls.** The names on the walls are the names on the real walls (Hovione Atrium, Westmont Hospitality Hall, Sagres Beach Way and so on), drawn with letters by our code. The school's name on the entrance is drawn with lines, not copied from a logo file. The banner on the entrance is our own ("We race the times"): the real one is an advertisement.

**Things that stand on a square of their own.** The letters N O V A in the atrium are four standing pictures on a long black box, and the box is what a kart bumps into. The tables, the Christmas tree, the statue, the bins, the parked bikes, the trees and benches of the avenue are each one entry in a list (`NOVA_LAP_FURNITURE` in `client/nova-lap-buildings.js`). The same entry makes the square solid for the driving rules and stands the picture on it, so a kart can never drive through a table.

**The cars on the roads are only a picture** (`client/traffic.js`). The coast road and the west street are outside the track: no kart can reach them. Cars follow lanes there at a steady speed, by each browser's own clock. The server knows nothing about them and they cannot change a race. A test checks that no lane crosses ground a kart can drive on.

**The beach and the sea** (19 November, Rodrigo). The map of the Nova lap ends 12 metres past the coast road, and past the edge of a map the race view used to paint one plain colour, so the sea was only a thin line on the horizon. Now, past the bottom of the map, the race view paints Carcavelos beach: dry sand, wet sand, a line of surf, shallow water and the sea out to the horizon (`client/shore.js`, called from `paintTilted` in `client/ground.js`). Each row of the race view shows one straight line of ground, so on each row every band is one piece of that row, from some point to the edge of the screen; the map is laid over it as before. The haze near the horizon would turn the far sea almost white, so the water is painted again over the haze, at 60% strength. It is only a picture: no kart can reach it, the letters of the map did not change, and nothing about laps or times did. The widths (about 55 metres of sand, then the water) are a sensible guess, not a survey: Google Earth pictures may not be copied into another product, and OpenStreetMap's own services refused the agent's automatic requests. The Nova lap is not to scale anyway (its coast road is straight).

**Ramps: a jump and extra speed** (`shared/ramps.js`, called from `shared/race.js`). A track can list ramps, each one square of road with the direction it is driven in. A kart that drives over one in that direction, fast enough, takes off. While it is in the air the keys do nothing: it keeps its speed and direction, flies over bananas and people, and only a wall stops it. It comes down after seven tenths of a second with a higher top speed for one more second. A racer carries two counters for this, `airSteps` and `boostSteps`, next to the `spinSteps` of the bananas. The rules know only "in the air or not": how high the kart is drawn is for the picture alone (`jumpHeight`). On the Nova lap the first ramp of each long straight is where everybody drives, and the others are in the outer lanes with a parked bike or bins after them, so nobody gets them all by driving straight on.

**Walkers: people who cross the track** (`shared/walkers.js`). A track can list walkers, each with a path from one door to another. A walker walks its path, goes inside for a moment, comes out and walks back, for ever. Where it is follows from its path and its own clock alone, so the server only has to send two numbers for each walker and every browser works out the same place. A kart that drives into a walker loses most of its speed and spins out, exactly as if it had slipped on a banana: for a little over a second its keys do nothing. The walker sits down on the ground for about two seconds, seeing stars. While it sits, its clock stands still, and nobody can bump it again. A walker inside a building cannot be bumped either. The computer karts are told where the walkers are, as they are told about bananas, and try to steer round them.

**Can a player cheat with these?** No more than with bananas. The server runs both rules. A browser still sends only its keys: nothing it sends can make a kart jump or move a walker. The page draws what the server says.

**What the picture adds** (`client/street-life.js`, `client/props.js`, `client/draw.js`). A ramp is a yellow wedge with arrows on the road before it. A kart in the air is drawn higher, with its shadow left on the road, and trails sparks while it has extra speed. A walker is a small drawn student whose legs swing; toppled, it sits with stars going round its head and its coffee cup beside it. A jump and a topple each have a sound (`client/sound-cues.js`).

**Karts jolt on the wide stairs** (`client/stairs-bump.js`, the stairs listed in `client/nova-lap-look.js`, since 20 November). In the race view a moving kart bounces up and down once for every step it goes over, more when it is fast, not at all when it stands still or is in the air. Only the picture: on the stairs a kart drives as on any road. The same day the team asked for real slopes, and a version was tried where the stairs made karts faster and the path past the beach tunnel slower. It was taken back out (with `git revert`, so it stays in the history): the ground is still drawn flat, so a kart that was only faster or slower did not feel like going up or down, and a kart that stopped on the way up could not start again. Making the ground itself go down and up needs the ground to be drawn at more than one height, which it was not yet. The next paragraph says how that was then done, for the picture only.

**The ground at two levels, in the race view** (`client/levels.js`, used by `client/ground.js` and `client/draw.js`; the levels are listed in `client/nova-lap-look.js`; since 20 November, at the team's request). The wide stairs go down 2.2 metres to the lower plaza in front of the Grand Auditorium, in 12 steps. The path past the beach tunnel rises smoothly back up to the west. The beach tunnel stands right at the west edge of the lower plaza (moved there, 5.5 squares east, on 20 November; the side wall of its old ramp was taken out), and the Sagres Beach Way, the sandy floor in front of its mouth, lies at the bottom with it: driving up the path it drops away on the left, below the railing that stands on the path's edge. The tunnel's mouth is solid: the painting of the tunnel and the name beam are on its front, so there is nothing hollow to look into, and its outer sides are white. White stone walls, the same white as the tunnel's sides, stand where the ground changes level. Only the picture: karts drive on all of it as on any road, online too, and the views from above and the small map are flat as before.
How it is drawn: the camera knows how high its eye is above the ground. Each thing is drawn with the eye as high above *its own* ground as it really is ("eyeLift" in `client/camera.js`): something lower is drawn lower, something higher higher, and the horizon stays where it is. The ground of the track has holes where the sunken part is; under it, each step and each part of the sunken ground is painted at its depth, the deepest first, and each wall that faces the camera right after the floor it stands on (so a higher part in front of it, such as the path, covers its foot); then the ground of the track over them. The camera goes down with the kart and up again, smoothly. The look lists by name the pieces of scenery that stand at the bottom (the tunnel). Things at the bottom are painted after the ground, like everything that stands, so each one is cut, by the real rule: a part of it above the level of the ground of the track can never be hidden by that ground, and a part below that level is seen only through the holes. Without that, the tunnel showed through the bank in front of it. The shapes that say where a thing may be seen are all traced the same way round: the canvas leaves out the overlap of two shapes traced opposite ways, and there a wall of the tunnel was not painted and what stood behind it showed through. The holes reach down to the bottom of the screen, so a railing beside the kart does not vanish as it comes close. (A first version cut at one line per thing, measured from its middle: railings running towards the camera lost their near end, and the foot of the tunnel walls was cut away.)
Known limits: the drop is a guess, kept smaller than the height of the camera's eye so it can see over the edge from below. A kart right at the foot of a wall can look slightly in front of it. In the lower plaza the picture takes about 1.7 times as long to draw as elsewhere.

**What is missing.** The slopes elsewhere on the lap are flat. The stairs and the sunken part are only a picture: the driving does not go faster down or slower up (a try at that was taken back out, above). Nobody has tuned the numbers of ramps and walkers by playing: they are first guesses. Heights are estimates from the film. The halls and lawns west of the main building were placed to fit, not measured. Nobody has yet raced it on a real screen and said how it feels.

### How is a kart drawn, and where do its colours come from?

**A kart is a small model, not a picture** (`client/kart-shape.js`): boxes, wedges and wheels with real positions in space, about 22 units long, 17 wide and 16 high, with a driver who has a body, arms on the steering wheel and a helmet. `client/kart-paint.js` paints it from any direction: it leaves out the faces that point away from the eye, paints the furthest parts first, and makes each face brighter the more squarely it faces the sun. So a kart turns smoothly, its front wheels and its driver turn with the steering, and the same model is used in all three views. Before 12 November a kart was four flat pictures and jumped from one to the next.

**The colours come from a "look"**: the colour of the kart, of the helmet and of the driver's suit. Since 17 November a player does not pick these one by one any more: they choose a character, and each character has its own look (see the next question). From 12 to 17 November the menu had a "Your kart" panel to pick each colour from a short list; a choice saved then still counts for a player who has not chosen a character.

**A choice is three small whole numbers, never a colour or a text** (`shared/kart-looks.js`): "kart colour number 6, helmet number 2, suit number 1". That matters online. Online the browser tells the server which character it wants, and the server gives the kart that character's three numbers and passes them on to the other players. Only a browser without a character, with colours saved before 17 November, still sends three numbers itself. A number from a known range cannot carry anything harmful. A free text could. The server checks each number and drops anything else that came with it, and a browser that sends something that is not three numbers in range is sent away. Each of those has a test. A player who never chose gets the colours of their starting place, as before.

Online, the name of a signed-in player is shown above their kart.

**The big screen in the atrium** (18 November 2026, asked for by Catarina). In the far corner of the Hovione Atrium, on the left of the doors to the terrace as you leave, stands a big screen, slanting across the corner as the real one does. It is white with black letters and the school's name in a corner, as the school's own notices are (first it was blue with a yellow band: Catarina asked for white). It shows a notice from the IT help desk: "We regret to inform you that, unfortunately, MOODLE IS DOWN." Moodle is the school's site for courses, so everybody at Nova gets the joke. It is one more "fence" in `client/nova-lap-buildings.js` (a picture that stands up, here on a slanting line) with the picture `it-screen` in `client/wall-art.js`, painted by our code like every wall. The six squares of the corner behind it are wall (`SCREEN_CORNER`), in three steps that follow the slant, so no kart drives through the screen or behind it. A line of the notice that would not fit is written smaller, whatever font the browser has. `tests/atrium-screen.test.js` checks where it stands, that the corner is closed, that the lap stays far from it, and what it says. Known limit: from behind, a fence shows its picture the wrong way round. Nobody can get behind this one, but a camera in a corner might for a moment.

### What are the characters, and how is a character kept to one player?

**Six characters, each a real person who said yes** (`shared/cast.js`): Dean, Professor Ricardo Pereira, Ró Versos, Cici Boss, FranFon and PCP. Each has a short id ("pcp"), a name, and a look: three colour numbers, the same kind of choice as above. PCP, for example, is a red kart with a yellow helmet. Before a photo went in, each person said yes to Pedro to being in the game and in the public repository.

**The character is chosen before each race.** In the menu a player picks Single race, Two players or Online, then a track, and then "Choose your character" opens (`client/kart-panel.js`). At the top is a poster of the chosen one, in the colour of their kart: on the left the pilot, big, beside their kart (they do their dance, then cross their arms for a moment, and start again), on the right their number in the cast, their name, the name of their dance ("Signature move", from `danceNameOf()`), and the button that starts the race. Moving the mouse over someone in the line-up puts them on the poster to look at, without choosing them: a click chooses, and when the mouse leaves, the poster shows the chosen one again. Under the poster is the line-up, all six in a row: each tile is the pilot standing, with the person's own head, in front of the colour of their kart, and the name. When the mouse passes over a tile (or the keyboard reaches it), that pilot does their own dance, and the chosen tile stands out of the row with a small "YOU" flag. The colours reach the page as two named values that `client/kart-panel.js` sets on the poster and `client/style.css` mixes into its background. (Until 18 November each card also had the person's photo beside the pilot. Catarina asked for the pilots alone and a better design, twice, so the photos are no longer shown anywhere. The files are still in `client/faces/`, because tests of 17 November check them: whether to delete them is for the team.) Someone who has asked their computer for less movement on screen gets still pictures. The button on the poster ("Race", "Join the room", or "Next: player 2" for the first of two players) starts the race on the track that was picked. The last choice is kept in the browser (`client/cast-choice.js`) and is ready the next time. (The first version, earlier on 17 November, had a "Your character" button at the top of the menu instead. Pedro tried it and wanted the choice at the moment of the race.)

**A dance for each character** (`poseAt()` in `client/pilot-shape.js`, chosen by `danceOf()` in `client/cast-choice.js`): Dean does the floss, both straight arms swinging from side to side past his hips while the hips go the other way; Professor Ricardo Pereira does the dab, one arm straight up to the side, the other across the face, leaning into it, to one side and then the other; Ró Versos does the griddy (he asked for it): turned to the side, his heels tapping out in front in turn and both arms swinging back and forwards, then to the front with the hands in front of the eyes like glasses. (The first griddy faced the front the whole time. Arms and feet that move towards the camera can hardly be seen, so it did not look like one: that is why he now turns to the side, and why a pose can put a foot out in front, "kick".) (Until 18 November they clapped, did the robot and pretended to drive. Those three dances are still in the list, danced by nobody.) Cici Boss does the "gangnam" (since 18 November, at her own request: before that she waved both arms, and "wave" is still in the list of dances, danced by nobody): she rides an invisible horse, the wrists crossed in front and pumping on the beat, jumping on every beat with the feet apart and one knee higher than the other, and then swings a lasso with one arm up beside her head; FranFon plays golf (since 19 November, at his own request: before that he flew like a plane, and "plane" is still in the list, danced by nobody): with a club in his hands he stands over the ball, swings slowly back, hits it, and holds the finish, turned to watch the ball fly up and far away until it is gone, then a new ball each round; PCP does the "siu": a little run, a jump with a whole turn in the air, and the landing with arms spread down and feet apart.

**The standing pilot is built like the kart** (`client/pilot-shape.js`): boxes and bars from `client/kart-shape.js`, for shoes, legs, a racing suit with a stripe in the kart's colour, arms, gloves and the helmet lying on the ground beside them. `pilotScene()` can put the empty kart (the seated driver's parts left out) beside the pilot. `paintPilotScene()` in `client/kart-paint.js` paints it with the same painter as the race, so the kart in the big picture is exactly the kart you drive.

**How the pilot moves**: a "pose" says where the hands go and which way the elbows bend, how far the body bounces, sways, leans, jumps and spins, and how far apart the feet are. The arms keep their length: `armWith()` works out the elbow from the shoulder and the hand, with the sums of a triangle whose three sides are known (upper arm, forearm, and the distance from shoulder to hand). A hand out of reach is pulled in, so the arm is straight, as in the plane. Since 18 November a pose can also lift one foot ("hop"): the foot is then nearer the hip than the leg is long, so `legWith()` bends the leg at the knee, forwards, with the same kind of sum. A leg that stands is one straight piece, exactly as before. `blendPoses()` goes smoothly from one pose to another. Tests check, for every movement and at many moments, that nothing goes below the ground, the feet stay on the ground except in the jumps of the siu and the gangnam, the arms keep their length, no glove jumps from one picture to the next, and that each dance really does its thing (the hands meet in the clap, the steering wheel turns in the drive, the siu turns all the way round in the air).

**The heads are the people's own heads, shown when choosing and on the podium.** The pictures in `client/heads/` were cut out of the photos with a small program written for this (it ran on Pedro's laptop with the image tools that come with Windows, and is not part of the game): it keeps an oval round the head and hair, finds the background by spreading from the edges of the picture to neighbouring pixels of nearly the same colour, makes it see-through, and softens the edge. The head is painted straight on, like a cut-out: a photo taken from the front looks wrong when it is turned sideways. In the spin of the siu, the head gets narrower as it turns, and from behind only the back of the head shows, in the colour of the hair. **Long hair: a head picture that goes on below the chin** (since 18 November). The head pictures end at the chin, and the first one of Cici Boss was an oval cut from a square photo that itself ended under her lip: it looked like an egg, with the chin missing. A first try that day painted long hair with our own code. She did not like it and sent her whole photo instead, so her head was cut again from that, with a small program of the same kind as Pedro's (it ran on her laptop with the image tools that come with Windows, and is not part of the game): it takes the wall away by spreading from the edges, the clothes by spreading from the bottom, and under the line of the chin and jaw it keeps only hair. Her picture is therefore longer than the others: `longHairOf()` in `client/cast-choice.js` says how much of it is below the chin (about half a head), and `paintHead()` in `client/kart-paint.js` paints the head as big as everybody else's and lets the hair hang down over the shoulders. It is on the podium too. To do the same for another character, cut their picture the same way and add a line to `LONG_HAIR`. Known limits: from behind, only the back of the head shows, without the long hair; and her picture is 141 dots tall from hair to chin where the others are 180, to stay under the 60 KB a test allows. The photos that were on the cards until 18 November are in `client/faces/`. Only the pixels were copied, so nothing hidden in a phone photo (where or when it was taken) is in any of these pictures. While a race is driven every pilot wears a helmet; the podium shows the heads again. A test checks that `main.js`, `online.js` and `draw.js` never name the heads, the faces or the standing pilot themselves: the podium has its own files. (Earlier versions on 17 November were not good enough for Pedro: a face on a big round head on the seated pilot, then a round photo with the background still in it, then a face oval in a ball of hair.)

**Online, a character belongs to one player in a room at a time.** The browser says `{"type":"character","id":"pcp"}`. The server checks it is exactly the id of a character, or sends the browser away. Then `server/cast-keeper.js` checks that nobody else in the room is that character. If someone is, the player gets the first free one and the page says so: "Someone in this room is already PCP, so you are Dean." A room takes at most six people, one for each character, so a seventh is told the room is full. (The plain kart for "every character is taken" is still in the code as a safety net.) A character is free again when its player leaves, and cannot be changed during a race. A player who is a character cannot paint the kart differently.

**Why the characters are kept apart from the room** (`server/room.js`): a test checks the exact list of things the room can be asked to do, so that nothing new can touch the bananas. Characters do not change how a kart drives, so they live in their own small file, and `server/online.js` passes the character's colours to the room.

Tested in `tests/cast.test.js`, `tests/room-characters.test.js` and `tests/pilot-shape.test.js`.

### How is the sound made?

The sounds of a race and of the menu are made by our own code, with no sound files (since 15 November 2026). The music is the exception: since 20 November it is five recorded tunes made by others.

**How a browser makes sound.** Every browser has a small sound workshop built in (it is called Web Audio). We ask it for simple waves, for hiss, and for filters that dull or sharpen them, and shape those into what we need. All of it is in `client/sound.js`:

- **The engine** is two buzzing waves an octave apart, through a filter that takes the sharp edge off. The faster the kart, the higher the note and the more the filter opens. Holding the gas makes it a little fuller.
- **The tyres** are hiss through two filters: a low rumble on grass, and a narrow, high squeal when the kart slides sideways or spins.
- **The short sounds** are a few notes and bursts of hiss each. The countdown beeps have a drum thump under them. GO is a swoop into a chord. A lap is four notes running up. The last lap is a trumpet call. The finish is a fanfare followed by a crowd: a roar (hiss, swelling up), whistles and clapping. A banana slip is a whistle sliding down and a tone that whirls round for as long as the kart spins. A bump into a kart is a knock with a clang, a wall is a boom with a crash, and both get more on top when the hit was hard.

**Two files, split the same way as everywhere else.** `client/sound-cues.js` decides WHEN a sound is due and how the engine should sound. It is plain arithmetic and has tests. `client/sound.js` is HOW each one sounds. It needs loudspeakers, so it is judged by ear.

**How the page knows a sound is due.** For every picture, the race page hands over a few facts: what the countdown shows, the kart's speed, whether it is on grass, spinning or finished, how many laps are done. `sound-cues.js` compares them with the picture before. A new number on the countdown is a beep. One more lap is a chime. A bump is noticed from the speed alone: a kart cannot speed up or brake harder than about 600 units per second every second by itself, so a change of speed much quicker than that was a knock. If another kart is right there it was a kart, otherwise a wall. Nothing in the rules had to change for sound, and sound changes nothing about a race: online, it is made in each browser from what the server says is happening.

**Why nothing is heard before the first key press.** A browser only lets a page make sound after the player has pressed a key or clicked. So the sound wakes at the first key press. Enter, which starts a race, is a key press like any other, so whoever starts the race always hears the countdown. Online, someone else in the room hears it once they have pressed a key or clicked on the page.

**Music** (since 20 November, afternoon, chosen by Catarina). The game plays five recorded tunes, kept in `client/music/`:

| When | Tune | Made by, licence |
|---|---|---|
| The menu, and an online room before a race | `menu.mp3`, round and round | MintoDog, OpenGameArt, CC0 |
| The countdown | Silence, so the beeps are heard | |
| The first lap | `lap-first.mp3`, round and round | MintoDog, CC0 |
| The laps between | `lap-middle.mp3`, round and round | MintoDog, CC0 |
| The last lap, and on until the podium | `lap-last.mp3`, round and round | MintoDog, CC0 |
| The podium | `podium.flac`, trumpets and clapping, once | "YoFrankie! (c) 2008, Blender Foundation, www.blender.org", CC-BY 3.0 |

- **Which tune plays when is a rule with tests** (`tuneFor` in `client/music-files.js`). It uses the same words for the moments of a race as before (`raceMoment` in `client/music-cues.js`), plus the lap. With two players the lap is that of the driver further ahead; someone who is watching online hears the tune of the lap of the kart they watch.
- **How they are played** (`createFilePlayer` in `client/music.js`). A page fetches its tunes from our server as soon as it opens, and the browser turns them into sound at the first key press or click, because it allows no sound before. A tune that is not ready yet starts when it is, and the one before plays on until then, so there is no hole between two laps. A tune that goes round jumps back just inside the short silence an MP3 file has at each end (`loopPoints`), so the join is not heard.
- **The server sends music files now** (`server/app.js`): MP3 and FLAC were added to the short list of kinds of file it is willing to send. They may be kept by the browser for a day, because they are large (10.5 MB together) and never change; every other file is still asked for afresh each time.
- **The licences.** CC0 means the maker gave the music to everybody. CC-BY 3.0 means it may be used if the maker is named, so the line in quotes is in the credits of `README.md` and must stay there. The files are as downloaded; only their names are ours. `client/music/README.md` says which file is which.
- **The podium no longer cheers by itself.** Until 20 November the crowd's cheering was made by `client/sound.js` and played again and again while the podium was up. The trumpets and clapping of the recorded tune replaced it, as Catarina asked.
- **What became of the songs made of notes.** They are described in the next paragraph. The game no longer plays them; the sound check page (`sound-test.html`) still does, and their code and tests are untouched, so the team can go back.

**The songs made of notes** (20 November, morning, Rodrigo; in the game until the recorded tunes replaced them that afternoon). Made the same way as the sound effects: no music files, and no tune from any other game (the brief says no Nintendo music). Four songs were composed for the game and written down as notes in `client/music-score.js`, eight steps (eighth notes) to a bar: the **menu** (relaxed, C major, 108 beats a minute, also in an online room before a race), the **race** (driving, A minor, 152, from GO; on the final lap it plays 15% faster), the **finish** fanfare (when you cross the line, played once) and the **podium** (happy, F major, 120), which follows the fanfare by itself. During the countdown there is no music, so the beeps are heard. Each song has four voices: the tune (a softened square wave), the bass (a triangle wave), the chords played one note at a time, and drums (a falling low note for the kick, hiss for the snare and hi-hat). `client/music.js` books the notes a moment ahead of time, as music programs do, so the beat stays steady even when a picture is late. Which song plays when is decided in `client/music-cues.js`, which has tests.

**Menu sounds** (since 20 November). Every button, link drawn as a button, round choice and tick box clicks softly (`client/ui-sound.js`; which clicks count is in `client/ui-sound-cues.js`). When the character choice is done and Race is pressed, a hype sound plays (a rising whoosh, a run up the notes and a big chord with a cymbal), and the menu waits for it, about a second, before going to the race. Online the hype plays once when two or more people are in the room before a race and every one of them has a character.

**Switching it off.** Settings > Sound has four switches (`client/audio-switches.js`): **All sound**, and one for each kind: **Music**, **Race sounds** (engine, bumps, the countdown: the box that was there before, kept where it was saved so nobody's choice is lost) and **Menu sounds** (clicks and the hype). A kind is heard only when its own switch and All sound are on; while All sound is off, the others are greyed out. M during a race is the All sound switch. The choices are kept in the browser.

**Switching it off, before 20 November.** M switches the sound off and on during a race, and Settings in the menu has a box for it. The choice is kept in the browser. A page that is not being looked at (another tab is in front) falls silent by itself.

**How it was tuned.** Catarina listened on a page made for that, `sound-test.html`, which has nearly every sound on a button (not the jump and the toppled walker), the songs made of notes, the menu sounds, and an engine to rev with a slider. It is not linked from the menu. Her first verdict: the engine was too loud at top speed and the short sounds too tame. So the engine became about half as loud and duller, and the short sounds bigger. She then asked for a "yaaay" of children cheering at the finish, like a well-known sound effect. That recording is not ours to use. A try at making voices by code came out, in her words, "demonic", and was taken out: a crowd from a distance is mostly hiss, which code does well, and that is what the finish has now.

**So that nothing crackles.** Everything passes through one volume knob and a limiter, which turns the loudest moments down by itself, and then a last small turn-down. We measured it: with every sound of the game played in the same moment on top of the engine at full speed, the loudest point stays at about 0.92 of the limit.

## Part 9: Limits

### What are the known limits, and what would we change next?

These are the limits we know of on 23 November 2026. Each one was checked against the code that day. The last list says what we would do next.

**Online play**

- **Your own kart reacts a moment late.** Your key press travels to the server and the result travels back, and then the picture is 4 to 6 steps behind, at most a tenth of a second. Over the internet we measured about a sixth of a second in all (19 November 2026; the connection meter, key L, shows it for each player). The fix is "prediction": the browser moves your own kart at once with the shared rules and corrects it when the server answers. The rules were written to make that possible, but it is not built.
- **One room for each track, and no rooms with codes.** Anyone with the link can join, signed in or not, up to six people or the lower limit the host chose.
- **A restart of the server ends every race in progress.** The rooms live only in its memory, and every change to `main` puts a new version online. Saved results are safe.
- **Someone whose connection drops during a race comes back as a watcher** and drives again in the next race.
- **Nobody can stop a race early.** The host cannot start a new race in the middle of one. A race ends when everyone has finished, two minutes after the first finish, or ten minutes after GO.
- **A racer who is far behind when the first kart finishes may not make it** in the two minutes that are left, and then gets no result. The results board still shows them, by how close to the finish they were.
- **For the host rule only keys count.** A host who presses no key for a minute passes the room on. Choosing game settings with the mouse does not count as being there, so a host who only uses the mouse for a minute can lose the room to a player who pressed a key.
- **A watcher can move the camera only between people,** never to a computer kart.
- **The results board covers the middle of the picture** until the host starts the next race. It cannot be put away.
- **One driver has two names at the end of a race.** The podium names a driver by their character, and the results board by their user name, or "Guest 3" for a guest.
- **A very short key tap,** shorter than one picture on the screen, is not sent to the server.
- **The limit of 60 messages a second is per connection.** Nothing limits how many connections one computer may open, beyond the room being full. A signed-in player can hold only one place in a room; a guest in two tabs is two karts.
- **The place shown during a race** ("2nd of 4") is worked out by the page from the checkpoints passed and the distance to the next one. On a long stretch between two checkpoints it can be a little off. The order at the finish is the server's.
- **Computer karts fill an online race only when the host starts it,** and they have no catch-up: a computer kart that is far behind stays behind.

**Accounts and results**

- **There is no email.** So nothing proves who someone is, anyone can take any free name, and a forgotten password cannot be reset: that account can no longer be used. A player who knows their password can change it.
- **Anyone can make as many accounts as they like.** The limits on sign-ups are per minute, to protect the server, not per person.
- **The limit per computer goes by the address our hosting company tells us a visitor came from.** Everyone on the campus Wi-Fi shares one address, so the limits are set for a whole classroom, and someone who really wanted to could pretend to come from many addresses. Two things do not depend on it: the lock on one account after five wrong passwords, and the limit on password work in total.
- **Anyone who knows a user name can lock that account for ten minutes** by typing five wrong passwords. That is the price of the lock, which is what stops someone from guessing a password.
- **A result that could not be saved because the database did not answer is lost.** The server does not try again later. Online the player is told. After a single race the page says nothing when only the database is down.
- **The leaderboard shows the fastest times ever,** with no date, and we cannot remove a time except in the database itself.
- **The leaderboard does not know how a time was driven.** Bananas make a race partly luck. And a race driven alone in a room against Easy computer karts is saved like a race against five people.
- **A single race is run and reported by the player's own browser, so its time could be faked.** That is why it counts only in that player's own stats and never on the shared leaderboard.
- **"My stats" is about the Nova lap only.** Races on the test oval are saved, but appear only in the downloaded file. A single race without computer karts does not count in the stats, and a two-player race saves nothing at all.
- **No saved progress:** no trophies and no characters to unlock.
- How long the password scrambling takes on the live server is not measured. On a laptop it is under a tenth of a second. The limit on password work in total (60 a minute) is a first guess.

**The driving**

- **Every character drives exactly the same.** A character changes the colours of the kart, and for a computer kart its style of driving.
- **The rules have no hills.** The stairs and the lower plaza of the Nova lap are only in the picture: for the rules the ground is flat.
- **No drifting, sand or sea,** and no boost for pressing the gas at the right moment of the countdown. The only extra speed is the moment after a ramp.
- **Walls are whole squares.** A track cannot have a diagonal or curved wall, only steps. A kart is a circle for walls, although it is drawn as a rectangle, so its corners can look as if they poke slightly into a wall.
- A kart that spins into a wall can end up standing nose to the wall. The player then has to reverse, as after any crash.
- The numbers in the driving rules, the bumps and the bananas are first guesses, to be tuned by playing. They are named at the top of `shared/physics.js`, `shared/bumps.js` and `shared/hazards.js`.
- Computer karts follow the racing line drawn for the arrows. If the line is changed, they change with it, and a track without a line has no computer karts. Hard is only a little harder than Normal.
- The warning for a missed checkpoint only comes when the kart reaches a later checkpoint. On the Nova lap and the test oval every checkpoint reaches from wall to wall, so one cannot be driven round there.

**The picture**

- **Full screen enlarges the picture; it does not draw more of it.** The picture is always 960 by 576 dots, so on a big screen it is a little soft. The help lines and the status lines under the picture are not shown in full screen.
- **The game needs a keyboard.** There are no touch controls for phones.
- In the race every kart has the same shape and every driver wears a helmet. The faces only show when choosing a character and on the podium.
- Trees, signs and bananas are flat pictures that always face the camera. A kart can drive straight through the olive trees and the flags that stand on the grass of the Nova lap. The trees of its avenue are solid.
- Things are painted furthest first, by the square of the map they stand on. A wide thing can stick out of its square, so now and then a piece of a kart or a tree is covered by a wall beside it for a moment.
- A wall between the camera and our own kart is left out of the picture, so a building right behind the kart can seem to vanish. A camera that moves closer to the kart instead would be better. That is not built.
- Trees and lamps beside the road fade away as they pass the kart, so close to the kart they are see-through for a moment.
- Buildings far ahead appear at the top right of the screen, where the small map can cover them.
- On a big track the hidden picture of the ground is less sharp. Only the ground close to the kart is painted again sharply.
- In a single race and with two players the kart is drawn exactly where the last step of the rules put it. On a screen faster than 60 pictures a second the movement can look slightly uneven.
- If the browser tab is in the background, a single race runs in slow motion instead of jumping ahead.
- The race view fills the screen row by row for every picture. That is fine on a laptop. It was not tried on a phone or an old computer.

**Sound**

- You hear the kart your camera is on, and no other engine. A banana that someone else hits is silent. With two players on one keyboard both karts are heard.
- Every sound effect is made by code, so there are no voices. The music is recorded, by others.
- A bump is noticed from a sudden change of speed. A gentle touch is silent, and online a soft bump can be missed, because the picture glides between the server's updates.
- A browser allows no sound before the first key press or click. So online, a player who has not touched the page yet hears nothing when the host starts the race.
- The sound check page `sound-test.html` and the track tour `track-tour.html` are for the team, but anyone who types their address can open them. They only play sounds and show a track.
- The five music files are 10.5 MB together, which a slow connection notices the first time. Browsers keep them for a day, so a replaced file can take a day to reach players.

**Hosting**

- **The free server sleeps** after 15 minutes without visitors and takes about a minute to wake. A job on GitHub is asked to visit it every five minutes, but GitHub ran it only every five to eight hours when we looked (19 to 23 November 2026). Our pages say "The server is waking up" meanwhile. Before a demo, someone opens the link a few minutes early.
- On the university's student Wi-Fi a laptop cannot reach the database. The live server is not on that network. For database work on a laptop we need a phone hotspot or home Wi-Fi.
- The server reads a file from disk for every request. That is fine for a few players. With many visitors we would keep the files in memory.
- The test oval is a test track, but it is still offered to players, with its own online room and leaderboard.

**What we would change next, most useful first**

1. Move a player's own kart at once online ("prediction").
2. Email, to reset a forgotten password.
3. Private rooms that open with a code.
4. Touch controls, so the game works on a phone.
5. A server that does not sleep: a paid plan, or a visitor from outside that really comes every few minutes.
6. Different driving for each character, and items to pick up.

## Part 10: History: the campus loop, our first campus track

The campus loop was our first campus track. It left the game on 20 November 2026, when the Nova lap replaced it, and no player can open it any more. Its map and its look are still in the repository, because about a dozen test files drive on it. These three answers are kept as they were written, so they speak of it in the present. Where they describe code that the game still uses (how a wall is stood up and painted in order, the low barriers round the test oval), that is still true.

### Where do the campus tracks come from?

**The campus loop is no longer in the game.** The team took it out on 20 November 2026: the Nova lap, built from our own video, replaced it. Nobody can choose it, it has no online room and no leaderboard, and its old address opens the test oval. Its map (`shared/tracks/campus-loop.js`), its storeys and its look are still in the repository for one reason: about ten test files drive on it, because it has real corners that the test oval does not have. What follows is how it was made, kept for the history, and because the Nova lap learnt from it.

From the real campus. The tracks are taken from the Nova SBE campus and its building. The first one, the campus loop (`shared/tracks/campus-loop.js`), goes round the outside of the campus.

**The source is OpenStreetMap**, a free map of the world that anyone may reuse if they credit it ("© OpenStreetMap contributors", in the README). We chose it because it draws the campus from straight above, in metres, with every building named. We also looked at the school's online campus map, whose drawing of each floor is at a slant (its walls meet at about 123° instead of 90°) and belongs to the school, and at the architects' published pictures, which are taken at an angle and cannot be measured. No floor plans of the building are published.

**How the letters were made.** A short script, run in a browser, took the OpenStreetMap data of the campus, turned it 21° so that the buildings run along the squares, and gave every 6-by-6-metre square a letter: buildings and everything outside the campus are wall, gardens are grass, paths and squares are road. Then the road along the driving line was widened to about 4 squares, so that several karts fit side by side, and the start and the checkpoints were placed by hand. The script is not in the repository yet.

**Why 6 metres a square.** The game paints the whole track once as one hidden picture (`client/draw.js`, 2 pixels per unit). At 6 metres a square the campus is 64 by 62 squares, a picture of 4096 by 3968 pixels, about 65 MB. Smaller squares would make that picture too big. A test checks that the track stays within this size.

**The route** is driven clockwise as it looks on the map: east along the Walk of Founders, south past the Library and Navigator Park, round the gym to EDP Plaza, round the southern tip of the Grand Auditorium, north-west along the outer path, up the western gardens, a hairpin through the courtyards on either side of the CTT Student Hall, and back. About 1.1 km. Away from the driving line there is open ground, so a kart can leave the line and skip a detour, but it gains nothing: there is a checkpoint in each detour, and a lap only counts if every checkpoint was passed in order.

**Recognisable, not exact.** The roads are much wider than the real paths (24 metres), the CTT Student Hall is shorter than it really is because the hairpin cuts through its end, and north is not up. The Hovione Atrium and the KPMG Gallery are walls on this track; they are meant for an indoor track of their own, where the karts would be miniatures in a building of its real size.

### How do the buildings stand up?

Only in the picture. The driving rules know nothing about height: a wall is a wall, and karts bounce off it as before.

A track can come with the number of storeys of each square, in a second drawing of digits: `shared/tracks/campus-loop-storeys.js`, where 0 is flat and 2 means two storeys. One storey is 3.5 metres. When the race page opens, `client/buildings.js` turns every wall square with storeys into a block: a flat roof, and an upright side wherever the square next door is lower. For every picture, it works out which sides and roofs can be seen from behind the kart and where they go on the screen, with the same arithmetic that places the karts (`chasePoint` in `client/camera.js`): further ahead means higher up and smaller, and a side goes up by its height times the size at that distance. Sides that face away from the camera are left out, because the roof and the other sides hide them. A roof higher than the camera's eye is left out too: it would be seen from below.

**Walls without storeys** used to be flat, so a kart bounced off thin air. Now every such wall that touches open ground becomes a low bank (`barrierHeight` in the track's look): red and white blocks round the test oval, a clipped hedge round the campus.

**What is painted on a building** (`client/draw.js`): each side in a shade of white that depends on which way it faces, so corners can be seen, and on every storey a long band of dark glass, as the campus buildings have. Far-away buildings get no windows and fade into the haze.

**Painting in the right order.** Everything that stands is painted from the furthest to the nearest, so nearer things cover further ones and a kart behind a building disappears. The squares of the map make "furthest" easy to get right: seen from the camera's own square, a thing in a row of squares further away can never be in front of a thing in a nearer row, and within a row the same goes for columns. So the furthest row is painted first, and within a row the furthest column. Our own kart is painted last.

**Walls beside and behind the kart** (changed on 13 November 2026, after Catarina saw buildings beside her "cut off"). Two things were wrong. First, every wall was cut where its foot left the bottom of the screen. But a tall wall beside the camera is still in the picture long after that, so there was a gap between the end of the wall and the edge of the screen. Now each piece is cut where its top leaves the screen: a wall taller than the camera's eye is shown right up to the camera. Second, the rule that removes a wall standing between the camera and the kart was too wide: it also removed squares of a wall that the kart was merely driving close to. Now a wall is left out only if it crosses the line from the camera to the middle of the kart and is tall enough to hide the kart. The rest of the same straight wall behind the kart goes with it, so no loose slabs are left standing. A wall that the kart touches is never left out.

**From above**, buildings show their roofs, some with rows of solar panels, and every building and bank throws a shadow on the ground (`client/ground.js`).

**Where the storeys come from.** OpenStreetMap has the shapes of the buildings but no storey counts for the campus. The school's campus map (campustour.novasbe.pt) lists what is on each floor of each building, so a building counts the floors on which something of it is listed: for example Cascais Academic Hall 3, the Library 2. These are a first guess, to be checked on campus.

### What makes the campus loop look like the campus?

The layout is the real one (see above). On 12 November the picture was brought closer to the real place, from what can be read and seen online: the school's own campus tour, its 2018 campus map, newspaper reports and OpenStreetMap. No picture was copied: everything is our own drawing. What was taken from the real campus (`client/track-looks.js`):

- **White, flat-roofed buildings with long bands of dark glass**, and rows of solar panels on the roofs.
- **Pale stone paving** for the paths and squares, and green lawns.
- **The sea** on the horizon to the south and west, **the São Julião da Barra fort** with its red roofs and small lighthouse to the south, **the Bugio lighthouse** out in the river mouth, and the red roofs of Carcavelos inland.
- **Palms** on the side of the coast road, **pines** inland, young trees on the lawns.
- **Slim black signs** with the names of the places: Walk of Founders, Green Park, Library, Horizon Hall, Grand Auditorium, Student Hall.
- **The painted tunnel to the beach** at the southern tip.

What is still wrong or missing: every building looks the same (the real ones differ: the Auditorium is a windowless wedge, the entrance has a blank cream wall and white trusses), the storeys are a first guess, there are no stairs, ramps, pools or benches where the real ones are, and nobody has compared it with the place itself. Catarina has asked people to film the campus. Their videos are the next source.
