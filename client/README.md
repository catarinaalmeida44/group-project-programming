# client

Everything the browser shows and does: the web page, the drawing of the track and the kart, the camera, and the keyboard controls.

"Client" is the usual name for the browser's side of an app.

| File | What it does |
|---|---|
| `index.html` | The main menu, the first page: the picture behind it, the account corner and the Settings button at the top, and the four big choices: Single race, Cup (greyed out until the tracks exist), Online and Leaderboard. The panels that open over the menu are in this page too: choosing a track, the leaderboard, the settings, and the three account panels |
| `menu.js` | Starts the panels of the menu and hands each one what it needs: the browser's storage, the list of tracks, and the way to talk to the server (`account-api.js`) |
| `page-parts.js` | Makes new parts of the page from code. Text always goes in as plain text, so a name from the server can never become part of the page |
| `track-list.js` | What the cards for choosing a track say: name, laps, the address of the race (single or online) and your own best times. No browser needed, so it has tests |
| `mini-map.js` | The small map on a track's card, painted from the track's own letters |
| `track-panel.js` | The "Choose a track" panel on the page: builds the cards, and makes Single race and Online open it |
| `answers.js` | Reads an answer from the server carefully: did it say yes, and which sentence to show when it said no or sent something broken |
| `leaderboard-view.js` | What the Leaderboard panel shows for an answer from the server: which rows, the podium, your own row, and the sentence for loading, empty and "not available". No browser needed, so it has tests |
| `leaderboard.js` | Remembers the chosen track and who is signed in, asks the server for the boards, and drops an answer that comes too late |
| `leaderboard-panel.js` | Puts the leaderboard on the page and listens to its buttons |
| `account-view.js` | The words for the account corner, and what is wrong with a form before it is sent, by the rules in `shared/account-rules.js`. No browser needed, so it has tests |
| `account.js` | Creating an account, signing in and out, deleting the account: checks the form, asks the server, remembers who is signed in. It never keeps a password |
| `account-panel.js` | Puts accounts on the page: the account corner and the panels "Sign in", "Create account" and "Your account" |
| `settings-panel.js` | The Settings panel on the page: the camera view a race starts in |
| `favicon.svg` | The small picture on the browser's tab: our own drawing of a finish flag |
| `race.html` | The single race page: the title, the lap counter and clock, the canvas the track is drawn on, and the help text. The track is chosen in the address: `race.html?track=campus-loop` |
| `track-choice.js` | Reads the track from the address of the race page. Only a short name from `shared/tracks/index.js` is accepted; anything else gives the test oval |
| `storage.js` | Keeps short texts in the browser's own storage (`localStorage`), carefully: a browser that refuses, or text that was changed, must not break the game |
| `settings.js` | The player's settings. Today: the camera view a race starts in |
| `records.js` | Your best race time and best lap on each track, kept in this browser only |
| `online.html` | The online page. The same layout, plus a line that says whether you are connected and how many players are there |
| `style.css` | How both pages look: colours, sizes, spacing |
| `main.js` | Runs the practice race. Many times a second it asks the keyboard which keys are held, asks the rules in `shared/` where the kart is now, moves the camera, and draws the picture |
| `online.js` | Runs the online page. It moves no kart itself: it tells the server which keys are held and draws what the server says is happening |
| `net.js` | Makes online karts move smoothly. The server sends updates 20 times a second, and this file works out where each kart is in between |
| `race-view.js` | Turns what the server says about the race into words for the online page: the big countdown number, who may press Enter to start, and whether you are racing or watching |
| `hud.js` | Fills in the lap counter, the clock, the lap times, the camera name and the message. Used by both pages |
| `keyboard.js` | Turns the arrow keys into the four answers the rules expect: gas, brake, left, right. Also listens for R (start again), V (change the camera) and Enter (online: the host starts a race) |
| `camera.js` | The arithmetic of the camera: which part of the track is on the screen, and where things land on it. No painting |
| `draw.js` | Paints the track, the kart and the small map in the corner on the canvas, in one of the three views |
| `buildings.js` | Makes the buildings of a track stand up in the view behind the kart: works out their sides and roofs from the storeys of each square, and which of them can be seen from the kart. No painting; `draw.js` paints them |
| `format.js` | Turns a number of seconds into a race time such as `1:23.45` |

## The three camera views

The game starts in the first one. The V key switches to the next.

| View | What you see |
|---|---|
| Behind the kart | Tilted, from behind and above. The track turns around the kart, so the kart always drives up the screen, and ground further ahead is drawn smaller. On the campus loop the buildings stand up |
| From above | Zoomed in, from straight above, moving with the kart. North stays up and the kart turns on the screen. The camera looks a little ahead and stops at the edges of the track |
| Whole track | The whole track at once, without moving |

The first two show only part of the track, so they have a small map in the corner with a dot for the kart.

The numbers to tune by eye (how far zoomed in, how tilted, how far ahead you can see) are together at the top of `camera.js`.

Nothing in this folder decides how a kart moves. That is the job of the rules in `shared/`, which the browser also downloads. The camera only changes what is shown.

## Practice and online

| | Single race (`/race.html`) | Online test (`/online.html`) |
|---|---|---|
| Who moves the kart | This browser, with the rules in `shared/` | Our server, with the same rules |
| What the browser sends | Nothing | Only which keys are held, "restart" and "start a race" |
| Other players | None | Everyone who has the page open, up to eight, each in a different colour |
| How a race starts | An arrow key, then 3, 2, 1, GO! | The host presses Enter, then 3, 2, 1, GO! for everyone together. Before that, everyone drives freely |
| Arriving during a race | Does not apply | You watch the kart in front and join at the next start |
| Works when the server is down | Yes, once the page is loaded | No |

In the view from behind, every kart stands up on the road with its driver. A kart is drawn from behind, from the front or from one side, depending on which way it points compared with you, and smaller the further ahead it is. The karts are drawn with simple coloured shapes in `draw.js`; real character artwork would replace those.

Drawing uses the canvas that is built into every browser. No drawing library is used.

Everything in this folder can be downloaded by anyone who visits the site, so nothing private ever goes here. This note itself is not sent to browsers, because the server does not send `.md` files.
