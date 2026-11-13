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
| `account-api.js` | How a page asks the server about accounts and the shared leaderboard: one function per question, and an answer that never breaks the page, also when the server cannot be reached or has no database. The page never holds the password or the sign-in ticket: the browser keeps the ticket in a cookie the page's code cannot read |
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
| `track-choice.js` | Reads the track from the address of the race page or the online page. Only a short name from `shared/tracks/index.js` is accepted; anything else gives the test oval |
| `storage.js` | Keeps short texts in the browser's own storage (`localStorage`), carefully: a browser that refuses, or text that was changed, must not break the game |
| `settings.js` | The player's settings. Today: the camera view a race starts in |
| `records.js` | Your best race time and best lap on each track, kept in this browser only |
| `online.html` | The online page. The same layout, plus three lines under the track: whether you are connected and how many players are there, who you are signed in as and whether your last result was saved, and the names of the signed-in players with you. The track, and with it the room, is chosen in the address: `online.html?track=campus-loop` |
| `style.css` | How all three pages look: colours, sizes, spacing |
| `main.js` | Runs the practice race. Many times a second it asks the keyboard which keys are held, asks the rules in `shared/` where the kart is now, moves the camera, and draws the picture |
| `online.js` | Runs the online page. It moves no kart itself: it tells the server which keys are held and draws what the server says is happening. It never sends a time: the server saves a signed-in player's result by itself and tells the page |
| `net.js` | Makes online karts move smoothly. The server sends updates 20 times a second, and this file works out where each kart is in between. It also checks every message from the server, and writes the lines about your account and about who is in the room |
| `race-view.js` | Turns what the server says about the race into words for the online page: the big countdown number, who may press Enter to start (only when no race is on), whether you are racing or watching, "Time is up", and the notice "The race ends in 42 s" |
| `standings.js` | Who is in front in an online race ("2nd of 4") and the lines of the results list at its end. For showing only: what is saved is the server's own count |
| `hud.js` | Fills in the lap counter, the clock, the lap times, the camera name and the message. Used by both pages |
| `keyboard.js` | Turns the arrow keys into the four answers the rules expect: gas, brake, left, right. Also listens for R (start again), V (change the camera) and Enter (online: the host starts a race) |
| `camera.js` | The arithmetic of the camera: which part of the track is on the screen, and where things land on it. Two cameras for the view behind the kart: high above the grid, and low behind the kart with the horizon on the screen. No painting |
| `draw.js` | Puts the picture together on the canvas, in one of the three views: the sky, the ground, everything that stands on it from the furthest to the nearest, smoke and dust, the player's own kart, and the small map in the corner |
| `ground.js` | Paints the whole track once from straight above (road, grass, kerbs, roofs, shadows, the start line, the grid, arrows) and lays that picture flat for the race view, row by row, up to the horizon |
| `sky.js` | The sky of the race view and what is on the horizon in each direction: hills, the sea, a town, a fort, a lighthouse |
| `props.js` | The things that stand beside the road or lie on it, each as a flat picture that faces the camera: trees, pines, palms, arrow boards, name signs, cones, banana peels |
| `track-looks.js` | How each track looks: its colours, the route for the arrows, its sky, and where its trees and signs stand. Changes nothing about how a kart moves |
| `route.js` | Which way round a track is driven: the direction of the road at a spot, the bends for the arrow boards, and the "wrong way" warning. For the picture only: laps are counted by the rules |
| `checkpoints.js` | Which checkpoint comes next and where its yellow light stands, and noticing when the kart has left a checkpoint out, so the page can say why a lap does not count. For the picture and the words only: laps are counted by the rules |
| `scene.js` | What depends on the countdown: how far the camera has come down, which start lights are on. Also how far a spinning kart is turned in the picture |
| `kart-shape.js` | The kart and its driver as a shape in three dimensions: boxes, wedges and wheels with real positions, in the colours of a "look". No painting, so it has tests |
| `kart-paint.js` | Paints that shape from any direction: leaves out the faces that point away, paints the furthest parts first, and makes each face brighter the more it faces the sun |
| `kart-choice.js` | The colours a player can choose for their kart, turning a choice into a look, and keeping the choice in the browser. The rule for what may be chosen is `shared/kart-looks.js` |
| `kart-panel.js` | The "Your kart" panel of the menu on the page: the colours to pick, and the kart turning round in a small picture |
| `buildings.js` | Makes the buildings of a track stand up in the view behind the kart: works out their sides and roofs from the storeys of each square, and which of them can be seen from the kart. Walls without storeys that touch open ground become low banks. No painting; `draw.js` paints them |
| `format.js` | Turns a number of seconds into a race time such as `1:23.45` |

## The three camera views

The game starts in the first one. The V key switches to the next.

| View | What you see |
|---|---|
| Behind the kart | The race view: low and close behind the kart, looking along the road, with a horizon, a sky, and buildings and trees standing on both sides. The camera swings round behind the kart a moment after it turns, so you see your kart turn. A race opens with the camera high above the grid, and it comes down during 3, 2, 1 |
| From above | Zoomed in, from straight above, moving with the kart. North stays up and the kart turns on the screen. The camera looks a little ahead and stops at the edges of the track |
| Whole track | The whole track at once, without moving |

The first two show only part of the track, so they have a small map in the corner with a dot for the kart.

The numbers to tune by eye (how far zoomed in, where the horizon is, how strong the lens is) are together at the top of `camera.js`. How quickly the camera swings round, and the size of the start gantry, are at the top of `draw.js`.

Nothing in this folder decides how a kart moves. That is the job of the rules in `shared/`, which the browser also downloads. The camera only changes what is shown.

## Practice and online

| | Single race (`/race.html`) | Online (`/online.html`) |
|---|---|---|
| Who moves the kart | This browser, with the rules in `shared/` | Our server, with the same rules |
| What the browser sends | Nothing | Only which keys are held, "restart", "start a race" and the colours of its kart, as three numbers |
| Other players | None | Everyone who has the page of the same track open, up to eight, each in the colours they chose, or in the colour of their starting place. Karts bump into each other |
| Banana peels | They appear from time to time and make your kart spin | The same, but the server decides where and when |
| Where your time goes | Your best times stay in this browser. Nobody else sees them | If you are signed in, the server saves the time it measured, and it appears on the shared leaderboard |
| How a race starts | An arrow key, then 3, 2, 1, GO! | The host presses Enter, then 3, 2, 1, GO! for everyone together. Before that, everyone drives freely |
| Arriving during a race | Does not apply | You watch the kart in front and join at the next start |
| Works when the server is down | Yes, once the page is loaded | No |

Every kart is the same small 3D shape (`kart-shape.js`), painted from wherever the camera is, in its own colours: a nose, pods, wings, four wheels, and a driver with a helmet whose arms turn the steering wheel. Because it is a shape and not a picture, it turns smoothly and can be recoloured. Changing the shape itself, for characters that look different from each other, would be done in that one file.

Drawing uses the canvas that is built into every browser. No drawing library is used.

Everything in this folder can be downloaded by anyone who visits the site, so nothing private ever goes here. This note itself is not sent to browsers, because the server does not send `.md` files.
