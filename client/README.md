# client

Everything the browser shows and does: the web page, the drawing of the track and the kart, and the keyboard controls.

"Client" is the usual name for the browser's side of an app.

| File | What it does |
|---|---|
| `index.html` | The page: the title, the lap counter and clock, the canvas the track is drawn on, and the help text |
| `style.css` | How the page looks: colours, sizes, spacing |
| `main.js` | Connects the parts and runs the practice race. Many times a second it asks the keyboard which keys are held, asks the rules in `shared/` where the kart is now, and draws the picture |
| `keyboard.js` | Turns the arrow keys into the four answers the rules expect: gas, brake, left, right |
| `draw.js` | Draws the track and the kart on the canvas |
| `format.js` | Turns a number of seconds into a race time such as `1:23.45` |

Nothing in this folder decides how a kart moves. That is the job of the rules in `shared/`, which the browser also downloads.

Drawing uses the canvas that is built into every browser. No drawing library is used.

Everything in this folder can be downloaded by anyone who visits the site, so nothing private ever goes here. This note itself is not sent to browsers, because the server does not send `.md` files.
