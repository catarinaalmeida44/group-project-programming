# client

Everything the browser shows and does: the web page, the drawing of the track and the kart, the camera, and the keyboard controls.

"Client" is the usual name for the browser's side of an app.

| File | What it does |
|---|---|
| `index.html` | The main menu, the first page: Single race, Cup (greyed out until the tracks exist), Online, Leaderboard, and the Settings button in the top right corner. The Leaderboard and Settings panels are in this page too |
| `menu.js` | Opens the Leaderboard and Settings panels and fills them in |
| `race.html` | The single race page: the title, the lap counter and clock, the canvas the track is drawn on, and the help text |
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
| `format.js` | Turns a number of seconds into a race time such as `1:23.45` |

## The three camera views

The game starts in the first one. The V key switches to the next.

| View | What you see |
|---|---|
| Behind the kart | Tilted, from behind and above. The track turns around the kart, so the kart always drives up the screen, and ground further ahead is drawn smaller |
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
