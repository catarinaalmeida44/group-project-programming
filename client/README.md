# client

Everything the browser shows and does: the web page, the drawing of the track and the kart, the camera, and the keyboard controls.

"Client" is the usual name for the browser's side of an app.

| File | What it does |
|---|---|
| `index.html` | The page: the title, the lap counter and clock, the canvas the track is drawn on, and the help text |
| `style.css` | How the page looks: colours, sizes, spacing |
| `main.js` | Connects the parts and runs the practice race. Many times a second it asks the keyboard which keys are held, asks the rules in `shared/` where the kart is now, moves the camera, and draws the picture |
| `keyboard.js` | Turns the arrow keys into the four answers the rules expect: gas, brake, left, right. Also listens for R (start again) and V (change the camera) |
| `camera.js` | The arithmetic of the camera: which part of the track is on the screen, and where things land on it. No painting |
| `draw.js` | Paints the track, the kart and the small map in the corner on the canvas, in one of the three views |
| `format.js` | Turns a number of seconds into a race time such as `1:23.45` |

## The three camera views

The V key switches between them.

| View | What you see |
|---|---|
| From above | Zoomed in, from straight above, moving with the kart. North stays up and the kart turns on the screen. The camera looks a little ahead and stops at the edges of the track |
| Behind the kart | Tilted, from behind and above. The track turns around the kart, so the kart always drives up the screen, and ground further ahead is drawn smaller |
| Whole track | The whole track at once, without moving |

The first two show only part of the track, so they have a small map in the corner with a dot for the kart.

The numbers to tune by eye (how far zoomed in, how tilted, how far ahead you can see) are together at the top of `camera.js`.

Nothing in this folder decides how a kart moves. That is the job of the rules in `shared/`, which the browser also downloads. The camera only changes what is shown.

Drawing uses the canvas that is built into every browser. No drawing library is used.

Everything in this folder can be downloaded by anyone who visits the site, so nothing private ever goes here. This note itself is not sent to browsers, because the server does not send `.md` files.
