# Walkthrough notes

Plain-language answers to the questions the teaching staff may ask when they open this repository. Any member can be asked about any part, so everyone should be able to give these answers.

**State on 23 November 2026, the day we handed the project in.** The game opens on a main menu with a drawn picture of the campus by the sea. A player chooses one of three ways to play: a single race against five computer karts, two players on one keyboard on a split screen, or an online race with up to six people, each on their own computer, where computer karts fill the empty places. Then they choose a track (the Nova lap, a lap of our campus made from a video we filmed there, or a plain test oval), one of six characters, and the game settings (computer karts or not, and how good they are). Enter starts the countdown in every kind of race. A race is seen from behind the kart, with three camera views, a small map, arrows that show the way, banana peels, ramps, sound effects made by our code and recorded music. At the end the first three stand on a podium. With an account (a user name and a password, no email) a player's online results are saved: the shared leaderboard shows the ten fastest races and laps of each track, and "My stats" shows each player their own numbers. The server is on the internet at https://novasbe-kart.onrender.com, with a database that holds the accounts and the results. What is not built is in Part 7.

**How this document is organised.** It was written piece by piece between 10 and 23 November, and on the last day the answers were checked against the code, the outdated ones were corrected, and all were put in order.

- **The short answers** come first: twelve questions, each answered in a few lines. Read these before the presentation.
- **Part 1** is a map: where each part of the project lives.
- **Parts 2 to 6** are the long answers to what the staff ask most: how it is built and why, online play, accounts and data, what happens when something goes wrong, and the tests.
- **Part 7** is the list of known limits and what we would change next.
- **The details of the game itself** (how a kart moves, the camera, the sound, how the Nova lap was made, the characters, the podium) are in a file of their own, `docs/game-details.md`, so that this one stays short.

Sentences that begin "Until ..." say how something was before a date. They are kept because the staff may ask why something changed.

## The short answers

Twelve questions the staff are likely to ask, each answered in a few lines. Most answers end with where the long one is.

Three words come back all the time:

- **The browser** is the program a player opens the game in, such as Chrome.
- **The server** is a computer somewhere else that runs our program and answers the browsers. We rent ours for free from a company called Render. (On the free plan it sleeps when nobody visits: see answer 9.)
- **The database** is where things are saved for good, like a big spreadsheet on the internet. Ours is at a company called Neon.

### 1. How is the project built?

A player opens our link. Their browser asks our server for the game, and the server sends the pages and their code. A single race and a two-player race then run entirely in that browser. In an online race the browser stays connected to the server, which runs the race for everyone. When a signed-in player finishes online, the server writes the time into the database.

The folders follow this: `client/` is what the server sends to the browser, `server/` is the program on Render's computer, `shared/` holds the rules of driving that both use, and `tests/` holds the automatic tests. Long answer: Parts 1 and 2.

### 2. Why JavaScript?

- A browser only runs JavaScript, and the game is drawn in the browser, 60 pictures a second.
- With Node.js (a program that runs JavaScript outside a browser) the server runs JavaScript too. So one set of rules (`shared/`) runs in the browser for a single race and on the server for an online race, and a kart drives exactly the same in both.
- The course's usual tool, Python with Streamlit, is made for pages and forms. A live game needs a connection that stays open, and the course's own guide says that needs other tools.
- The course asks for the staff's approval for JavaScript. Our professor gave it on 11 November 2026.

### 3. Where is the data stored?

In three places, by how long it has to last:

- **Accounts and race results** are in the database (a Postgres database at Neon; Postgres is the name of the database program), because they must last and everyone must see the same.
- **A player's own settings and practice times** are kept in that player's browser, because only they need them.
- **Where the karts are right now** is only in the server's memory, because it matters only during the race.

The weak spot: if the server restarts during an online race, that race is gone. Saved results are safe. Long answer: Part 4.

### 4. How does online play work, and can someone cheat?

The browser keeps a connection open to the server (a WebSocket), like a phone call instead of letters. A browser tells the server which keys are held, and a few requests such as "start a race" or "I want to be this character". It never says where its kart is. The server moves every kart, 60 times a second, and tells every browser where all the karts are, 30 times a second. The browser only draws.

So nobody can go faster or skip a lap by changing the code in their own browser: the page decides nothing. The weak spot: a key press has to travel to the server and the picture has to travel back, so a player's own kart reacts a fraction of a second late. Long answer: Part 3.

### 5. How do accounts and passwords work?

- An account is a user name and a password. There is no email.
- **The password is never saved.** The server saves a scrambled version (a "hash", made with `scrypt`, which comes with Node.js) that cannot be turned back. A random extra piece (a "salt") makes two equal passwords look different. Scrambling is slow on purpose, so a thief could not try millions of guesses.
- **Staying signed in:** after a correct password the server gives the browser a long random code in a cookie (a small note the browser keeps for our site and sends back with every request). The page's own code cannot read that cookie. It lasts seven days.
- Five wrong passwords lock an account for ten minutes. A wrong name and a wrong password get the same answer.
- The weak spot: there is no "forgot my password", because that needs email.

Long answer: Part 4.

### 6. Can the leaderboard be faked? Can someone race without an account?

Only the server writes a time onto the shared leaderboard, and only from an online race it ran itself. There is no address a browser could send a leaderboard time to. Single races and two-player races run in the browser, so they never count on the shared leaderboard. (A signed-in player's browser does report a finished single race, to `/api/single-result`. That race is saved as "single", counts only in that player's own stats, and never reaches the leaderboard.)

Anyone can race online without an account, as a guest. A guest is told that nothing is saved, has no name above the kart, and is called "Guest 3" on the results board. Long answer: Part 4.

### 7. Which libraries do we use, and why so few?

A library is code that other people wrote and that we download and use. We use three, each at one exact version: `ws` keeps the live connection of online play open, `pg` talks to the database, and `vitest` runs the tests. Everything else is our own code: the drawing, the driving, the sound effects, the accounts.

Few libraries means fewer things that can have a security problem, and nothing in the project that we cannot explain. `npm audit` checks them against a list of known problems and reports none. Long answer: Part 2.

### 8. What do the tests cover, and what do they miss?

A test is a small program that checks one thing by itself and says pass or fail. We have about 2,800. `npm test` runs them all in under a minute, and GitHub runs them by itself on every pull request (a change that waits for a teammate's approval) and on every change to `main` (the official version of the code).

- **Covered:** every rule of the game, and the things that must be refused: a seventh player in a full room, a faked result, a wrong password, a message the server does not know.
- **Missed:** how the game looks, sounds and feels, and real people racing on different laptops. Those we check by hand, with the list in `docs/two-laptop-checklist.md`.
- Tests never touch the real players: they use a pretend database kept in memory, or tables of their own that they remove afterwards.

Long answer: Part 6.

### 9. What happens when something we depend on is down?

We depend on two companies: Render for the server and Neon for the database.

- **The database cannot be reached:** the game still runs. Signing in and the leaderboard say "try again", and online racers are let in as guests.
- **The server is asleep:** Render's free plan puts it to sleep after 15 minutes without visitors, and it takes up to a minute to wake. Our pages say "The server is waking up" and connect again by themselves.
- **The server restarts:** the race in progress is lost, and the page joins the new room by itself.

We built the game so that it does not need the database to run. Long answer: Part 5.

### 10. How is it kept safe?

- **No secrets in the repository** (the project's folder on GitHub, which anyone can read). The database address holds a password, so it lives in Render's settings and in a local file that git ignores.
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

Long answer: Part 7.

### 12. How did four people work on one project?

- Nobody changes `main` directly. Every change is made on a branch (a copy to work on) and comes into `main` through a pull request that a teammate has to approve, and GitHub's tests have to pass first.
- The rules for the coding agents we used are in `AGENTS.md`, the same for all four of us. One of them: an agent never changes a test to make it pass.
- Each member keeps a diary in `docs/diary/` of what was built, why, and what was and was not checked.
- Decisions, with their dates, are in `PROJECT_BRIEF.md`.

## Part 1: Where everything is

### Where does each part live?

| Part | Where | State |
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
| The single race in the browser | `client/main.js`, with the race itself in `shared/practice-race.js` | Yes, against five computer karts, or alone if the player switches them off in the game settings |
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
| Music: the menu, the three parts of a race and the podium | five recorded tunes in `client/music/`, which one plays when in `client/music-files.js`, played by `client/music.js` | Yes, since 20 November (afternoon). How it sounds is judged by ear |
| The songs made of notes, which were the music for a few hours | the notes in `client/music-score.js`, when each played in `client/music-cues.js` | The songs are only on the sound check page `sound-test.html` now. `music-cues.js` still tells the race pages which moment of a race it is, and keeps the Music switch |
| The sound switches in Settings (all sound, music, race sounds, menu sounds) | `client/audio-switches.js`, the panel in `client/settings-panel.js` | Yes, since 20 November. M during a race is the "all sound" switch |
| Button clicks and the hype sound | `client/ui-sound.js`, which clicks count in `client/ui-sound-cues.js` | Yes, since 20 November |
| The yellow light on the next checkpoint, and the warning for a missed one | `client/checkpoints.js` | Yes, since 13 November |
| Your place in an online race, and the order of the results at its end | `client/standings.js` | Yes, since 13 November |
| The results board that comes up when an online race is over | `client/results-board.js`, and how it moves in `client/style.css` | Yes, since 13 November |
| How long an online race may last | `shared/race-time.js` | Yes: two minutes after the first finish, ten minutes after GO |
| The camera coming down at the start, the start lights, the spin | `client/scene.js` | Yes |
| The starting grid | `shared/grid.js` | Yes: eight places behind the start line, of which a race uses at most six |
| Karts bumping into each other | `shared/bumps.js` | Yes |
| Banana peels | `shared/hazards.js` | Yes: they appear during a race and make a kart spin |
| The online page | `client/online.html` and `client/online.js` | Yes: one room for each track, and it says who you are signed in as and whether your result was saved |
| Smooth movement of online karts | `client/net.js` | Yes |
| What the online page says about the race | `client/race-view.js` | Yes |
| The game server | `server/app.js` builds it, `server/start.js` starts it | Yes |
| Online play on the server | `server/online.js` (connections), `server/room.js` (the karts), `server/messages.js` (checking what browsers send) | Yes: a room per track, with a host, a race start, watching, a finishing order, and results saved for signed-in players |
| The driving rules | `shared/physics.js` | Yes: speeding up, braking, steering, grip, grass |
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

**How the menu code is split.** For each panel, one file works out what to show from plain facts and needs no browser, so it has tests (`track-list.js`, `leaderboard-view.js`, `account-view.js`), and another file puts that on the page (`track-panel.js`, `leaderboard-panel.js`, `account-panel.js`). `menu.js` only starts them. Everything that comes from the server or from the browser's storage, such as a user name, is put on the page as text (`client/page-parts.js`), never as HTML (the language web pages are written in, in which a text could carry code).

**Settings** has three choices: the camera view a race starts in, the time of day (morning, afternoon, sunset or night: only the picture changes), and four sound switches (all sound, music, race sounds, menu sounds). The three race pages read them when they open. V still changes the view during a race, and the panel lists the controls.

**Where settings and best times are kept:** in the browser's own storage (`localStorage`), a small space every website gets that keeps short texts after the page is closed. The settings and the best times are never sent to our server, and other players never see them. (The full list of what a browser keeps is in "Where is data stored?".) Two things can go wrong and neither may break the game, and each has a test: the browser may refuse storage (some private windows), and what we read back may not be what we wrote, because a player can edit it. So every value read back is checked: an unknown camera view or a time that is not a whole positive number of steps is ignored and the default is used. Times are put on the page as plain text (`textContent`), never as HTML, so a saved text cannot add anything to the page.

### Why did we build it this way?

- **Our own server runs every online race.** The browser sends which keys are held and a few requests such as "start a race", never a position or a time, so nobody can fake an online result from their browser. (A single race and a two-player race run in the browser, which is why they never count for the shared leaderboard.)
- **Our own driving physics.** The server has to run the races, and the physics inside game libraries only runs in a browser.
- **The driving rules never change the kart they are given.** They give back a new kart instead. A test can then compare "before" and "after". It would also let the browser try a move ahead of the server ("prediction"), which is not built.
- **Time moves in fixed steps of one sixtieth of a second.** The same keys then always give exactly the same result, on any computer, fast or slow. The browser and the server must agree on where every kart is, so this matters.
- **Only an exact "pressed" counts as a pressed key.** Anything else a browser might send counts as not pressed, so a strange message cannot produce a strange movement.
- **One language, JavaScript, for the browser and the server.** A browser only runs JavaScript, and with Node.js the server runs it too. This lets both use the very same rules, the files in `shared/`: a single race in the browser and an online race on the server drive exactly alike. The course asks for the staff's approval for JavaScript; our professor gave it on 11 November 2026.
- **Secrets stay out of the repository.** The repository is public, so passwords and keys live only in a local `.env` file and in the hosting settings.
- **Two outside libraries in the running game. The first is `ws`, and only for live connections.** Writing that part ourselves would be long and easy to get wrong in ways that matter for security. `ws` is the standard choice, brings no other packages with it, and we use one exact version of it. Everything else is built on `http`, the web server that comes with Node.js. Fewer libraries means fewer things that can have security problems. The usual alternative for the web part is a library called Express.
- **A second outside library, `pg`, to talk to the database.** Node.js cannot talk to a database by itself. `pg` is the standard choice and works with any Postgres database, not only Neon's. The alternative is Neon's own library. It sends everything over the normal web channel, which would also work on the university Wi-Fi, but it ties the code to Neon. We stayed with `pg`.
- **The game does not depend on the database.** The server starts without it and runs without it. That is why a teammate needs no secret to work on the game, and why a sleeping database cannot stop a race.
- **The database check is public but cannot be used to wear the database out.** Its answer is reused for ten seconds, and it only reads. The one thing that writes is the server starting.
- **Signing in uses a cookie the page cannot read, not something kept by the page's own code.** The other common way is to hand the page a secret code (a "token") to keep in the browser's storage. Any script running in the page could then read it. With our cookie, even a mistake that let someone's text run as code in a page could not steal a sign-in.
- **The account rules, the database questions and the internet side are three files.** `server/accounts.js` decides, `server/store.js` asks the database, `server/api.js` reads requests and sets the cookie. The rules can then be tested in a fraction of a second with a pretend store kept in memory and a pretend clock that jumps ten minutes or seven days. So that the pretend store cannot drift away from the real one, one list of checks (`tests/store-contract.js`) is run on both.
- **Passwords are scrambled with `scrypt`, which comes with Node.js.** No library to add, and it is one of the functions recommended for passwords: slow, and heavy on memory, on purpose.
- **Online results are written by the server at the moment a racer crosses the line.** There is nothing for a browser to send, so there is nothing to fake. (The one result a browser does send is a signed-in player's finished single race. It is checked for numbers that could be real, counts only in that player's own stats, and never reaches the shared leaderboard.)
- **The browser is told to run only our own files.** With every answer the server sends a rule (a "Content-Security-Policy") that allows scripts and styles only from files on our own site. It is a second lock. The first is that our pages put every text on the screen as text, never as HTML. A test reads every page and script in `client/` and fails if one breaks either rule. Since 13 November two more rules go out with every answer: a browser that came over the protected connection (https) is told to use only that for this site from now on, and browsers are told not to say to other websites which of our pages a visitor came from.
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

**Computer karts and the results.** Online the empty places of a race are filled with computer karts, up to six karts in all. The server drives them, and no browser can. They count in the finishing order, so a signed-in player who finishes behind two of them is saved as 3rd. The computer karts' own results are never saved.

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
- **A host who is away passes the room on** (since 19 November 2026, `AWAY_AFTER_STEPS` in `server/room.js`). A player who has pressed no key for a minute counts as away, and the host is then the next player in the order they arrived. Before, a tab someone had forgotten, or a player who had walked off, stayed the host for ever and nobody else could start a race. An arrow key, R or Enter brings a player back, so a host who only sat still loses nothing. Keys that only change this player's own page (V, M, F, L) do not count: the server never hears of them. Mouse clicks do not count either, with one exception: the "Start next race" button does what Enter does. Three things count as being there without a key: having just arrived, having finished the race that just ended, and, for the host, a newcomer walking in (so a host who waited for friends keeps the room). If everyone is away, the host is simply whoever has been here longest.
- **A signed-in player has one kart in a room** (since 19 November 2026, `sendOlderOnesAway` in `server/online.js`). When they join the room again, from another tab or another computer, the new connection stays and the older one is told why ("elsewhere") and sent away. Its page shows "You are playing somewhere else", with a button to play there instead, and does not come back by itself, or the two tabs would throw each other out for ever. A guest has no name to be recognised by, so two tabs of a guest are two karts.
- **Someone who arrives during a race is told so on the picture** (since 19 November 2026, `watchBanner` and `kartToFollow` in `client/race-view.js`). A banner in big letters says "A race is on: you are watching", whose kart the camera is on, and that they join the next race. The camera is on the person who was furthest ahead when they arrived, and stays with that kart until it finishes. It is never on a computer kart, and the left and right arrows move it to another person (`nextToWatch`): a watcher wants to see how their friends are doing. Before, the picture looked exactly as if they were driving, and the arrow keys did nothing without a word of why: now the banner answers a key press.
- **Nobody can move until the host starts** (the team's rule since 17 November 2026). Before, everyone could drive around freely while waiting, which meant karts were all over the track, could bump into each other and drive laps that did not count. Now the waiting room is calm, and every race starts from the grid with everyone in place. The page only makes the kart lean, the engine rev and the next checkpoint light up when the keys really do something: in a race after GO (`keysWork` in `client/race-view.js`).
- **A race that has begun is driven to its end** (since 13 November 2026). Before, the host could press Enter in the middle of a race, by accident too, and the race everyone was driving was thrown away. Now the server refuses that start.
- **So that a race always does end, it has two time limits**, counted in steps on the server (`FINISH_WINDOW_STEPS` and `RACE_LIMIT_STEPS` in `shared/race-time.js`, which the server and the page both read). Once the first racer has finished, the others have two minutes left. And no race lasts longer than ten minutes after GO. Without them, one racer who walks away from their laptop would hold the room for ever. A racer who has not finished when the time runs out gets no result: their keys stop working, their kart rolls to a stop, and nothing is saved for them. From the first finish on, the page shows the time left at the top of the picture: "The race ends in 1:42", and in the last minute "The race ends in 42 s". (Why two minutes: Catarina asked for three on 13 November, or two if three was too long. A whole race takes between one and two and a half minutes, so with three the winner would wait longer than the race took.)
- **When the race is over, the podium comes first. Ten seconds later a results board comes up over it** (`client/results-board.js`). The winner is on top, large, with their kart turning round in their own colours. Everyone else is below in the order they crossed the line, each with a small picture of their kart, their time, and how far behind the winner they were. Karts that ran out of time come last, the one that was closest to the finish first: more checkpoints passed, and of two with the same count, the one nearer to its next checkpoint. They are marked "did not finish" with the lap they were on. The board pops up, the rows slide in one after the other and confetti falls. A player who has asked their computer for less motion gets the board without any of that. The board stays until the host starts the next race.
- **During the race** the page shows the player's place, such as "2nd of 4", and a racer who has finished sees a small list in the corner while the others are still driving. All of this is worked out by the page from what the server sends about every kart (`client/standings.js`). It is for showing only: what is saved to the leaderboard is the server's own count.
- **The countdown is the same rule a single race uses**, `countdownAt` in `shared/countdown.js`. It is counted in steps on the server, so every browser sees the same number and all karts are let go on the same step. Holding the gas early gives no head start.
- **A watcher counts towards the room's limit but has no kart on the track.** V changes the view as usual, for example to the whole track from above. They join at the next start. If every racer leaves, the room goes back to open, so watchers are never stuck.

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
- A message longer than about 2,000 characters (a real one is two short texts), or one that is not one object.
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

**Easy, Normal and Hard.** The computer karts of a single race have three levels (Rodrigo's work, also 19 November 2026). A win on Easy counts like any other: Catarina's decision. So that it is clear which is which, each best time and the best lap carry a little label beside them: "on Easy", "on Normal", "on Hard" (the words on the buttons of the "Game settings" card, from `client/difficulty.js`), or "Online". One line says where the wins come from: "3 wins: 1 online · 1 on Easy · 1 on Hard". The page sends the level with the finished race, the server refuses anything that is not one of the three, and an online race never has one (`raceTag()` and `winsLine()` in `client/stats-view.js`, `winsBy` in `server/stats.js`). The downloaded file has a column for it.

**Most played character** counts from 19 November 2026: races saved before that did not note the character. The card then says "of the N races that noted the character".

**The file** (`resultsAsCsv()` in `server/stats.js`): one line for each saved race on any track, the newest first, with the day and time, the track, the kind of race, the level of the computer karts, the place, both times and the character: ten columns. It is a ".csv" file, which Excel and every other spreadsheet program open. Each time is there twice: as on the screen, and as a whole number of thousandths of a second, which sorts and adds up the same in every country. A text that a spreadsheet could take for a formula gets an apostrophe in front; every text comes from our own lists, so this is a second lock. Checked in Excel on Catarina's laptop while the file still had nine columns (before the column for the level was added): every value in its own column, and "Ró Versos" spelled right. Not checked: a laptop whose region writes numbers with a comma (as in Portugal), where Excel may put each line into one cell; "Data, From Text/CSV" in Excel reads it properly there.

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

The only personal data is the user name a player chose. There is no email, no real name and no readable password. Deleting an account deletes that player's rows in the three tables about players (`players`, `sessions` and `race_results`): the database does that by itself, because sessions and results are tied to their player.

**Stored in each player's own browser, not by us:** the camera view, the time of day and the four sound switches from Settings; the character chosen (and the second driver's, for two players); whether a single race or a two-player race has computer karts and how good they are; that the "How to play" card was already shown; and the best single race time and best lap on each track. Clearing the browser's data deletes them. The best times and the settings never reach our server. The character does, when you race online. And when a signed-in player finishes a single race, the page sends that one race to the server for their own stats. A two-player race is never saved anywhere. The cookie that keeps a player signed in is also in the browser, but the page's code cannot read it.

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

- **The server restarts or stops.** This happens every time a new version goes online. The room is gone, because it lives only in the server's memory. On the online page the karts stand still. We measured that a browser can go on believing it is connected for 10 to 20 seconds after our server has cut it, because the news passes through Render's network. So the page does not rely on that: after two seconds without an update a card over the picture says "The server has gone quiet". After eight seconds without news the page lets go of the connection and tries again by itself, soon at first and then every five seconds. The card then says "Connection lost" and counts the seconds. As soon as the server is back, the page is in the room again without a reload: a new, empty room, where everyone who was there meets again. Someone who comes back like this while a race is on watches it and drives in the next one. Until 19 November the page only said "reload the page", and the player had to do it by hand. A single race or a two-player race keeps working in a page that is already open, because it runs in the browser.
- **The server cannot be reached, or is waking up.** The online page keeps trying by itself (`client/link.js`). After three seconds the card says "The server is waking up" and that this can take up to a minute, with a little kart that drives along a road while it waits. After two and a half minutes without success the page stops and offers a "Try again" button. In the menu, signing in, the account corner and the leaderboard add "The server is waking up, which can take up to a minute" when an answer takes more than three seconds (`client/waking.js`), and a question that gets no answer for a minute and a half ends with "The server could not be reached. Try again in a moment."
- **Someone opens an address that does not exist.** A browser gets a page of the game that says "Off the track", with a button back to the menu (`client/not-found.html`), still with the number 404. A script or a program that asks gets the three plain words "Page not found.", as before.
- **A player leaves the online page** (the "← Menu" link, Back, or closing the tab). The page closes its connection itself as it is hidden, so the server removes the kart at once (`client/page-life.js`). If Back brings the page back from the browser's back/forward cache (a memory where browsers keep a page you left, to show it again instantly), the page reloads and joins as one fresh player. This was added on 17 November after a player saw their kart twice, then three times, after leaving and coming back: a page kept in that cache can keep its connection open, so the server kept the old kart.
- **A browser vanishes without saying goodbye** (a closed lid, lost Wi-Fi). The server checks every 5 seconds that each browser still answers, and removes the kart of one that has not answered by the next check, so such a kart stays for 5 to 10 seconds. Until 17 November it was every 15 seconds, so up to 30. Much shorter would risk removing a real player whose answer is slow, for example on a phone hotspot.

**The database is asleep, slow or cannot be reached.** The game keeps working: the pages, single and two-player races and the driving in online play do not use the database. What stops for that moment is accounts. Signing in, signing up, the shared leaderboard and a player's own stats answer "Accounts could not be reached just now. Try again in a moment." A browser that connects to an online race is let in as a guest. A signed-in racer who finishes is told "Your last result could not be saved", and the race goes on for everyone. That one result is lost: the server does not try again later. A single race that cannot be saved is lost too; the page says so when the server cannot be reached, and says nothing when only the database is down. The tables for accounts are created the first time they are needed, so a database that was asleep when the server started is not a problem. The details of a database error only ever go to the server's own log. Each of these has a test with a pretend database that fails.

The server does not wait for the database when it starts. `/database-check` answers "The database could not be reached. Try again in a moment." An unreachable database takes ten seconds to give up on, so after a failure the server does not ask again for three seconds, and visitors in that time get the same answer at once. This was tried for real on 10 November, when the university Wi-Fi blocked the database: the server started, sent the game, and answered the check with that message.

These are the limits of the free hosting plans:

- Render's free server sleeps after 15 minutes without visitors and takes up to a minute to wake up. Since 19 November 2026 a job on GitHub is asked to open `/health` every five minutes (`.github/workflows/keep-awake.yml`), which counts as a visitor. In practice that is not enough: GitHub runs the timed jobs of a free repository when it has room, and from 19 to 23 November 2026 it ran ours only once every five to eight hours. So the server still sleeps most of the time, and the first visitor waits up to a minute; our own pages then say "The server is waking up". Render has no switch for this on the free plan. What would keep it awake is a paid Render plan, or a visitor from outside that really comes every few minutes. Before a demo, someone opens the link a few minutes early. GitHub only runs timed jobs from `main`.
- Render can restart a free server at any time. A race in progress is lost, as described above, but anything saved in the database is safe.
- Render's free plan gives 750 running hours a month, which is enough for one server that is always on.
- Neon's free database pauses after 5 minutes without use and wakes on the next request.

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

## Part 7: Limits

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
- How long the password scrambling takes on the live server is not measured. On a laptop it is about a tenth of a second. The limit on password work in total (60 a minute) is a first guess.

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
- In the race every kart has the same shape and every driver wears a helmet. The faces only show when choosing a character, on the podium and on the driver's card in "Your account".
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

- **The free server sleeps** after 15 minutes without visitors and takes up to a minute to wake. A job on GitHub is asked to visit it every five minutes, but GitHub ran it only every five to eight hours when we looked (19 to 23 November 2026). Our pages say "The server is waking up" meanwhile. Before a demo, someone opens the link a few minutes early.
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

## Where the rest is

- **How the game itself works** (how a kart moves, laps and checkpoints, bumps and bananas, the computer karts, two players, the podium, the camera, the Nova lap and how it was made from a video, the characters, the sound), and the history of our first campus track: `docs/game-details.md`.
- **What every file does:** the `README.md` in each of `client/`, `server/`, `shared/` and `tests/`.
- **What was built when, why, and what was and was not checked:** the diaries in `docs/diary/`.
- **What we planned, and every decision with its date:** `PROJECT_BRIEF.md`.
