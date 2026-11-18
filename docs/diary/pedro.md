# Pedro's diary

Entries from 10 November 2026 on, newest at the top. How to write one is in `README.md` in this folder.

### 18 November 2026: the podium

**What was done**
When a race is over, the race picture becomes a podium in the Hovione Atrium.
- **The hall:** a white hall with tall glass panes and a big NOVA SBE sign.
- **The steps:** 2nd on the left, 1st in the middle and highest, 3rd on the right.
- **The drivers:** the first three stand on the steps as in "Choose your character", in their suits but with no helmet. The winner lifts a gold trophy. The other two do their own dance.
- **The crowd:** 28 students cheer round the podium with their arms up.
- **Confetti** falls, and a line under the picture gives the places, names and times.

It comes:
- **Online,** when the server says the race is over. After 10 seconds the results board comes up on top of it, as before.
- **In a single race,** when every kart has finished, or at the latest 30 seconds after the player finished. It stays until R starts a new race.

| File | What it is for |
|---|---|
| `client/podium.js` (new) | Who stands on the podium and when it comes |
| `client/podium-shape.js` (new) | The hall, the sign, the steps, the drivers without helmets, the crowd |
| `client/podium-view.js` (new) | Paints it on the race picture, with the camera, the words, the confetti and the line of results |
| `client/pilot-shape.js` | A "trophy" pose and the trophy itself (`trophyParts`), and a way to leave the helmet out |
| `client/kart-paint.js` | `paintScene()` paints any list of parts; each head can carry its own picture, so three different people can be painted together |
| `client/main.js`, `client/online.js` | Show the podium at the end of a race |
| `tests/podium.test.js` (new) | 28 tests. No existing test was changed |
| `WALKTHROUGH.md`, the READMEs in `client/` and `tests/` | Kept true. New section: "What happens at the end of a race: the podium" |

**Why it was done this way**
- The podium is its own scene, not a place on the Nova lap's map. That way it is the same atrium after every track, as Pedro chose, and the track drawing did not have to change.
- It is built from the same blocks and painted by the same painter as the karts and the pilots, so the drivers look exactly as in "Choose your character".
- "trophy" is not added to the list of movements `MOVES`, because an existing test checks that exact list. It has its own list, `PODIUM_MOVES`.

**Decisions**
- Decided by Pedro: a podium in single and online races; always the Hovione Atrium; NOVA SBE in our own letters, not the school's logo; no helmet at all on the podium; the winner lifts a trophy; lots of people cheering.
- Decision made by the agent, please confirm: in a single race, the podium waits at most 30 seconds after the player finished. Karts still driving then are left off it.
- Decision made by the agent, please confirm: online, the podium is shown alone for 10 seconds, then the results board comes up on top of it.
- Decision made by the agent, please confirm: 2nd and 3rd do their own dance; a kart that is no character keeps a helmet on, so no empty head is shown.
- Git: the agent made the branch `podium` from an up-to-date `main` and made the commits. Nothing was pushed.

**What was checked, and what was not**
- `npm test`: all tests pass (1834 passed, 5 skipped).
- One test drives a whole single race with no browser, the computer driving the player's kart too. It ends on the podium with three different characters, the fastest first.
- Eight rules were broken on purpose, and each made a test fail:
  - a kart that did not finish on the podium
  - the podium not waiting for the others
  - the podium before the player finished
  - helmets on the podium
  - everyone lifting the trophy
  - drivers floating above their step
  - the crowd standing on the podium
  - 2nd on the wrong side
- In the app's built-in browser, the podium was painted on its own with a pretend top 3, and looked at and improved twice:
  - the trophy was half hidden behind the winner's head
  - the drivers' arms overlapped
  - there was too much empty floor
- The single race and online pages load without errors.
- NOT checked: a race driven by hand to the end, in the browser, until the podium comes. Single or online.
- NOT checked: two real laptops, and the live site.

**How to check it yourself**
Run `npm start`, open http://localhost:3000, and drive a single race to the end. When every kart has finished (or 30 seconds after you), the podium comes up. Online, finish a race with a teammate. Run `npm test` and look for `podium.test.js`.

**What comes next**
- Pedro tries it, then publishes the branch `podium` from GitHub Desktop and opens the pull request. Ask the teammate to merge only after the last push.

### 17 November 2026 (fifth piece): real heads, the photo beside the pilot, and a dance for each character

**What was done**
Pedro wanted the pilots to really be the people in the photos, the normal photo on the right with the pilot on the left, and a different dance for each character (one pretending to drive, one doing the CR7 celebration). Now:
- **Real heads.** Each pilot has the person's own head: hair, face and ears, cut out of their photo with the background made see-through.
- **Cards.** Each card shows the pilot standing on the left and the normal photo on the right, with the name under both.
- **A dance each.** When the mouse passes over a card, that pilot does their own dance:
  - Dean claps.
  - Professor Ricardo Pereira does the robot.
  - Ró Versos drives, with a steering wheel.
  - Cici Boss waves both arms.
  - FranFon flies like a plane.
  - PCP does the "siu": a run, a jump with a whole turn in the air, and the landing with arms spread and feet apart.
- **The big picture** shows the chosen one beside their kart, doing their dance, then crossing arms, and again.

| File | What it is for |
|---|---|
| `client/heads/` (new) | The six heads cut out of the photos, see-through round them, 180 pixels tall, about 40 KB each |
| `client/faces/` | Back to the head-and-shoulders photos, for the right side of the cards |
| `client/pilot-shape.js` | Rewritten. A body that can bounce, sway, lean, jump, spin and spread its feet. Arms that keep their length (`armWith`). The six dances, crossed arms and standing (`poseAt`). The steering wheel. The chosen pilot's round of dance and crossed arms (`chosenPose`) |
| `client/kart-paint.js` | Paints the cut-out head straight on. In a spin it gets narrower, and from behind only the back of the head shows |
| `client/cast-choice.js` | `headOf()` and `danceOf()`: each character's head picture and dance |
| `client/kart-panel.js`, `client/style.css` | The cards (pilot left, photo right) and the big picture. Lighter floors, so dark suits show up |
| `tests/pilot-shape.test.js` | Rewritten: 42 tests. These were my own tests from earlier today, for movements that no longer exist; none of the tests merged into `main` was changed |
| `WALKTHROUGH.md`, the READMEs, `docs/two-laptop-checklist.md` | Kept true |

**Why it was done this way**
- **Cutting out the heads.** A small program found each photo's background by spreading from the picture's edges to neighbouring pixels of nearly the same colour, inside an oval round the head. It was written for this and ran once on Pedro's laptop, with the image tools that come with Windows, so no new library. Pictures were checked one by one on a dark and on a light background. PCP's skin is close to the colour of his wall, so his needed a stricter setting.
- **Arms that keep their length.** The elbow is worked out from the shoulder and the hand, as a real arm bends. Without this, an arm reaching up would stretch like rubber.
- **Every dance is a formula of time.** The same moment always gives the same pose, so each dance can be tested without a browser. A test plays every dance at 60 pictures a second and checks that no glove jumps more than two units from one picture to the next. The siu at first moved a glove 2.3 units in one picture during the spin, so the jump was made slower.

**Decisions**
- Decided by Pedro: real heads; photo on the right, pilot on the left; a different dance for each, including driving and the CR7 celebration.
- Decision made by the agent, please confirm: which dance goes to whom. Dean: clap; Professor: robot; Ró Versos: drive; Cici Boss: wave; FranFon: plane; PCP: siu.
- Decision made by the agent, please confirm: the helmet now lies on the ground beside the pilot, because the dances need both hands.
- Decision made by the agent, please confirm: the big picture keeps the kart beside the pilot; the cards show the pilot alone.

**What was checked, and what was not**
- `npm test`: 1400 passed, 5 skipped, twice in a row. The first full run had one failure: the test "never has the pilot inside the kart" ran out of time (5 seconds) while all the test files ran together. It now checks 15 moments a second instead of 30, still more than ten during the spin, and the two heavy tests may take up to 20 seconds. It still catches a pilot standing inside the kart.
- Eight rules were broken on purpose, and each made a test fail:
  - the pilot standing in the kart
  - arms changing length
  - the siu without its spin
  - the wave covering the face
  - no steering wheel
  - feet leaving the ground in the clap
  - two characters sharing a dance
  - a head picture for an unknown id
- In the app's built-in browser:
  - A sheet with every dance at six moments was drawn and looked at. Each person is recognisable, and each dance reads as what it should be.
  - In the real panel, the mouse over Dean's card made him clap, and the chosen PCP and Ró Versos showed their dances beside their karts.
  - No errors on the page.
- NOT checked:
  - the dances at full speed with human eyes (the built-in browser redraws slowly)
  - a phone
  - two real laptops, and the live site

**How to check it yourself**
Run `npm start`, open http://localhost:3000 in a normal browser, click "Single race" or "Online", pick a track, move the mouse slowly over each card, and click PCP to see the siu. Run `npm test` and look for `pilot-shape.test.js`.

**What comes next**
- Pedro pushes the new commits from GitHub Desktop. The pull request updates itself.
- Next piece: the podium, with the same pilots and dances.

### 17 November 2026 (fourth piece): real heads, and pilots who dance and cross their arms

**What was done**
Pedro found the faces still not centred and asked for them smaller, inside the characters' heads, and for some movement. Now:
- **The head** is a ball in the colour of the person's hair, with the face as an oval inside it, a little below the middle. No photo background is left.
- **The faces** were cut again, from the hairline to the chin and from cheek to cheek, all the same shape, so each fills its oval the same way and sits in the middle.
- **Dancing:** when the mouse passes over a character (or the keyboard reaches one), that pilot dances. They bounce on the beat, sway, pump a fist and lift the helmet up and down.
- **The chosen one,** shown big, dances for a moment, then puts the helmet down in front of their feet and crosses their arms.
- **Less movement:** someone who asked their computer for less movement on screen gets still pictures.

| File | What it is for |
|---|---|
| `client/faces/` | The six faces, cut from hairline to chin, 216 by 252 pixels each |
| `client/pilot-shape.js` | The head of hair with the face oval, and the poses: `poseAt()` (standing, dancing, arms crossed at any moment), `blendPoses()` (smoothly from one to another), `chosenPose()` and `cardPose()` |
| `client/kart-paint.js` | Paints the hair, then the face in its oval with a soft edge |
| `client/cast-choice.js` | `hairOf()`: each character's hair colour, taken by eye from the photos |
| `client/kart-panel.js` | Starts a pilot dancing when the mouse arrives and stops it when it leaves, and plays the chosen pilot's dance and crossed arms |
| `tests/pilot-shape.test.js` | Now 29 tests. My own tests from earlier today were rewritten for the new head and the poses; none of the tests merged into `main` was changed |
| `WALKTHROUGH.md`, the READMEs, `docs/two-laptop-checklist.md` | Kept true |

**Why it was done this way**
- Every movement is a formula of time (sine waves for the beat), so the same moment always gives the same pose and can be tested without a browser.
- The pose is blended from one movement to the next, so nothing jumps: a test moves through the chosen pilot's whole animation at 60 pictures a second and checks that no hand or helmet ever jumps more than about one unit between two pictures.
- The face stays straight on: a photo taken from the front looks wrong when it is turned sideways.

**Decisions**
- Decided by Pedro: faces smaller and inside the heads; a dance or crossed arms when passing over a character.
- Decision made by the agent, please confirm: the mouse over a card makes that pilot dance; the chosen one dances for 1.8 seconds, then crosses arms with the helmet on the ground.
- Decision made by the agent, please confirm: the hair colours. Dark brown for everyone except Cici Boss (light blonde).

**What was checked, and what was not**
- `npm test`: 1387 passed, 5 skipped.
- Six rules were broken on purpose (a bounce below standing, arms that do not cross, the helmet leaving the hand, arms crossing in a jump, the face falling out of the head, feet lifting off the ground). Each made a test fail.
- In the app's built-in browser, at two window sizes: the faces sit inside heads of hair; the mouse over the Professor's card made him dance (pictures taken at three moments of the dance); the chosen PCP, Cici Boss and Dean crossed their arms with the helmet on the ground. No errors on the page.
- NOT checked: how the dance feels at full speed with human eyes (the built-in browser redraws slowly); a phone; two real laptops; the live site.

**How to check it yourself**
Run `npm start`, open http://localhost:3000, click "Single race" or "Online", pick a track, move the mouse over the pilots, and click one. Run `npm test` and look for `pilot-shape.test.js`.

**What comes next**
- Pedro pushes the new commits from GitHub Desktop. The pull request updates itself.
- Next piece: the podium, with the same pilots.

### 17 November 2026 (third piece): the pilot stands beside the kart, face centred

**What was done**
Pedro looked at the second piece and found the faces off-centre in the round heads. He asked for something better: each character standing, holding the helmet, with the kart next to them. Now "Choose your character" shows exactly that. Each pilot stands in a racing suit in the character's colours, with a stripe in the kart's colour, holding the helmet on the right hand. Their face is a round picture in the middle of the head, always straight on. The empty kart stands behind them and to one side. In the race nothing changed: the pilot sits in the kart with the helmet on.

| File | What it is for |
|---|---|
| `client/faces/` | The six photos cut again, each square centred on the face (nose in the middle), so every face fills its head the same way |
| `client/pilot-shape.js` (new) | The standing pilot, made of the same boxes and bars as the kart, and the scene: the empty kart beside the pilot |
| `client/kart-paint.js` | `paintPilotScene` paints the scene with the same painter as the race. The face is a round picture, centred on the head |
| `client/kart-panel.js` | The step uses the scene, with the camera in front of the pilot |
| `tests/pilot-shape.test.js` (new) | 14 tests |
| `client/face-head.js`, `tests/face-head.test.js` | Removed. They were the bobblehead on the seated pilot, which this replaces. Their 14 tests went with them, because what they tested no longer exists; they were not removed to make anything pass. This happened in the commit called "Faces: cut the photos again", which also put `client/kart-paint.js` back as it was before the bobblehead (those changes were already staged when that commit was made) |
| `WALKTHROUGH.md`, the READMEs, `docs/team-guide.md`, `docs/two-laptop-checklist.md` | Kept true |

**Why it was done this way**
- Off-centre faces had two causes. The photos were cut with the face not exactly in the middle (FranFon and Ró Versos most of all), and the old head moved the face round the ball as the kart turned. Now the photos are centred, and the face is painted straight on, in the middle of the head.
- A photo taken from the front looks wrong when it is turned sideways, so the face does not turn. The pilot only turns a little either way, so this looks natural.
- The pilot is built from the same blocks as the kart and painted by the same painter, so the colours and the light match the race.

**Decisions**
- Decided by Pedro: the character stands with the helmet in the hand and the kart next to them.
- Decision made by the agent, please confirm: the helmet is in the right hand, the kart stands behind on the other side, and the suit has a stripe in the kart's colour.
- Decision made by the agent, please confirm: the head is a little big for the body, like a toy figure, so the face can be seen on the small cards.
- Git: the agent made the commits on the branch `character-select`, which Pedro had already pushed. Nothing new was pushed.

**What was checked, and what was not**
- `npm test`: 1372 passed, 5 skipped. 14 tests were removed with `face-head.js` and 14 new ones added.
- The new shape was broken on purpose in four ways (the pilot inside the kart, the head off to one side, the helmet away from the hand, the seated driver left in the kart). Each made a test fail.
- In the app's built-in browser, at two window sizes: the six pilots stand beside their karts with their faces centred, and the chosen one is shown big. "Race" opens the race on the chosen track, where the pilot wears the helmet and no face is seen. No errors on the page.
- NOT checked: a phone-sized screen, two real laptops, the live site.

**How to check it yourself**
Run `npm start`, open http://localhost:3000, click "Single race" or "Online", pick a track, and look at the pilots. Run `npm test` and look for `pilot-shape.test.js`.

**What comes next**
- Pedro pushes the new commits from GitHub Desktop. The pull request updates itself.
- Next piece: the podium, with the same standing pilots.

### 17 November 2026 (second piece): choose your character before the race, as a pilot with a face

**What was done**
Pedro tried the characters on the live site and wanted two changes. First, the character is now chosen at the moment of the race: Single race or Online, then a track, then "Choose your character", then a button "Race" or "Join the room". The "Your character" button at the top of the menu is gone. Second, each character is shown as their pilot in their kart, with their real face on the pilot's head, instead of a face in a square. The chosen one is shown big, swinging from side to side. In the race every pilot still wears a helmet.

| File | What it is for |
|---|---|
| `client/face-head.js` (new) | The sums for a pilot with a face: a head 1.8 times bigger than the helmet (like a bobblehead toy), sitting on the shoulders, and how much of the face the eye sees from each side |
| `client/kart-paint.js` | `paintKart` can be handed a face picture. It then paints the big head with the photo on its front, squeezed when seen from the side, and the back of the head when seen from behind. Without a face, nothing changes |
| `client/kart-panel.js` | Now the "Choose your character" step: a card for each pilot, the big picture of the chosen one, and the button that starts the race |
| `client/track-panel.js`, `client/menu.js` | Clicking a track opens the character step instead of the race. The track cards are still real links, so they still work if the code did not load |
| `client/index.html`, `client/style.css` | The step on the page. The button at the top of the menu was removed |
| `tests/face-head.test.js` (new) | 14 tests. No existing test was changed |
| `WALKTHROUGH.md`, the READMEs, `docs/team-guide.md`, `docs/two-laptop-checklist.md` | Kept true. Checks 76 to 80 follow the new way |

**Why it was done this way**
- The face is painted on the same kart model as in the race, with the same painter. So the pilot on the card is exactly the kart you drive, only with a face instead of a helmet.
- The head is bigger than the helmet, because a real-size head is only a few pixels on a small card.
- Faces are only painted when a picture is handed to the painter. The race pages never hand one in, and a test checks that their code does not even mention the face pictures.

**Decisions**
- Decided by Pedro: choose the character after choosing the race and the track; faces on the pilots, only when choosing and on the podium.
- Decision made by the agent, please confirm: the "Your character" button at the top of the menu was removed, since the choice is now made before each race.
- Decision made by the agent, please confirm: a player who never chose a character starts with the first one (Dean) already chosen, so the button always works. The last choice is remembered for the next race.
- Decision made by the agent, please confirm: the head with a face is a bobblehead, 1.8 times the size of the helmet, with the helmet's colour round the face and on the back of the head.
- Not done, possible later: in an online room, showing which characters are already taken before you join. Today you find out after joining, and get the first free one.
- Git: the agent made the branch `character-select` from an up-to-date `main` and made the commits. Nothing was pushed.

**What was checked, and what was not**
- `npm test`: 1372 passed, 5 skipped (before: 1358 and 5).
- In the app's built-in browser: Online, then a track, opens "Choose your character" with "Who do you want to be on Test oval?" and the button "Join the room". Single race, then a track, gives the button "Race" leading to that track's race. The six pilots show their faces on big heads in their kart colours. No errors on the page.
- NOT checked: driving a race after choosing, by eye. The race pages did not change.
- NOT checked: a narrow screen. In a narrow window the big picture goes above the cards; that was only glanced at.
- NOT checked: two real laptops and the live site.

**How to check it yourself**
Run `npm start`, open http://localhost:3000, click "Online" or "Single race", pick a track, pick a pilot, and press the button. Run `npm test` and look for `face-head.test.js`.

**What comes next**
- Publish the branch from GitHub Desktop, open the pull request, a teammate approves.
- Next piece: the podium with the pilots' faces at the end of an online race.

### 17 November 2026: six characters, chosen by face

**What was done**
The menu button "Your kart" is now "Your character". It shows six faces with names: Dean, Professor Ricardo Pereira, Ró Versos, Cici Boss, FranFon and PCP. Clicking one chooses it, and the small kart turns round in that character's colours. In a single race and online, your kart has those colours. The faces are only in the menu: in the race the driver wears a helmet. Online, two players in a room cannot be the same character. The second one gets the first free character, and the page tells them: "Someone in this room is already PCP, so you are Dean."

| File | What it is for |
|---|---|
| `shared/cast.js` (new) | The six characters: id, name and kart colours |
| `client/faces/` (new) | One face picture per character, 256 by 256 pixels, about 10 KB each |
| `client/cast-choice.js` (new) | Remembers your character in the browser, finds its face and colours, and writes the sentence the online page shows |
| `client/kart-panel.js`, `client/index.html`, `client/style.css` | The "Your character" panel: a grid of faces instead of rows of colours |
| `client/main.js`, `client/online.js` | The single race and the online page use the character's colours. Online, the page tells the server which character you chose |
| `server/cast-keeper.js` (new) | Who in a room is which character: one player per character, the first free one if yours is taken, freed when a player leaves, no change during a race |
| `server/messages.js`, `server/online.js` | A browser may say one more thing, `{"type":"character","id":"pcp"}`. Only the exact id of a character gets through |
| `server/app.js` | The server may now send `.jpg` pictures (the faces) |
| `tests/cast.test.js`, `tests/room-characters.test.js` (new) | 24 and 29 tests. No existing test was changed |
| `WALKTHROUGH.md`, `PROJECT_BRIEF.md`, the READMEs, `docs/team-guide.md`, `docs/two-laptop-checklist.md` | Kept true. The checklist has seven new checks (76 to 82) |

**Why it was done this way**
- A character is a name, a face and a choice of colours of the kind the game already had (three small numbers). So the drawing of karts did not change at all, and the server already knew how to pass colours on to the other players.
- The faces were cut from the photos with the image tools that come with Windows, so no new library was needed. Only the pixels were copied: nothing hidden in a phone photo (where or when it was taken) is in the pictures. The Professor's picture shows only his face, nothing of the Outlook screen it was taken from.
- The rule "one player per character" was first put in `server/room.js`. An existing test (`room-bananas.test.js`) checks the exact list of things the room can do, so that nothing new can touch the bananas, and it failed. The test was not changed. The rule went into its own file, `server/cast-keeper.js`, instead: characters have nothing to do with driving anyway.
- A test checks that `client/faces/` holds exactly one picture per character and nothing else, so no photo can sit on the internet without being used.

**Decisions**
- Decided by Pedro: six characters, their names and colours, faces only in the menu. A normal photo, not a video.
- Decided by Pedro: all six people said yes to being in the game and in the public repository, before their photos went in (Pedro collected the yeses).
- Decided by Catarina, through Pedro: option A. Choosing a character replaces choosing the kart colours one by one.
- Decision made by the agent, please confirm: the name is written "Professor Ricardo Pereira" (Pedro wrote "Profesor").
- Decision made by the agent, please confirm: Dean has a black kart, a white helmet and a white suit; Professor Ricardo Pereira an orange kart, a blue helmet and a navy suit; Ró Versos a pink kart with a yellow helmet and suit; Cici Boss a blue kart, a pink helmet and a navy suit (there is no pink suit); FranFon all black; PCP a red kart, a yellow helmet and a red suit.
- Decision made by the agent, please confirm: a room still takes eight players, but there are six characters. A seventh and eighth player drive a plain kart in the colours of their place on the grid.
- Decision made by the agent, please confirm: a player who has not chosen a character keeps the kart colours they chose before (or the colours of their place), as before.
- Decision made by the agent, please confirm: a character cannot be changed during the countdown or the race. Someone who is watching can, and races with it next time.
- Git: the agent made the branch `characters` from an up-to-date `main` and made the commits. Nothing was pushed.

**What was checked, and what was not**
- `npm test`: 1358 passed, 5 skipped (before: 1309 and 5).
- The new rules were broken on purpose in six ways (two players with one character, a free character given during a race, a racer allowed to change during a race, a character not freed when its player leaves, a character's colours overwritten, any text accepted as a character). Each made between 1 and 3 tests fail. The code was then put back.
- In the app's built-in browser: the panel shows the six faces, choosing PCP turns the small kart red with a yellow helmet and says "Saved". On the online page, the first tab was told "You are PCP." A second tab (same browser, so also PCP) was told "Someone in this room is already PCP, so you are Dean." and its kart was black and white. No errors on the page.
- NOT checked: a single race driven with a character, by eye. The tests check the colours.
- NOT checked: two real laptops and the live site. Checks 76 to 82 in `docs/two-laptop-checklist.md` are for that.
- NOT checked: how the faces look on a phone or a small screen.

**How to check it yourself**
Run `npm start`, open http://localhost:3000, click "Your character" and pick one. Then open "Online" in two windows. Both windows share one saved choice, so the second is given another character. Run `npm test` and look for `cast.test.js` and `room-characters.test.js`.

**What comes next**
- Pedro tells the team, and Catarina in particular, that "Your kart" is now "Your character".
- Publish the branch from GitHub Desktop, open the pull request, a teammate approves.
- Next piece: the podium with faces at the end of an online race.

### 11 November 2026: a race start for online play

**What was done**
Online play now has a real race start. Before a race everyone drives around freely, as before. The host presses Enter: every kart goes back to the grid, the server counts 3, 2, 1, GO! for everyone together, and all karts are let go on the same step. Someone who opens the page during a race watches it and joins at the next start. (The countdown from 10 November was merged as pull request #9 and is live.)

| File | What it is for |
|---|---|
| `server/room.js` | The room now has four phases: open, countdown, racing, finished. It knows who the host is, starts a race, refuses R during a race, and keeps the karts of people who are watching off the track |
| `server/messages.js` | A browser may now send a third kind of message: "start" |
| `server/online.js` | Passes "start" to the room |
| `client/race-view.js` (new) | Turns what the server says about the race into words for the page: the big number, who may press Enter, racing or watching |
| `client/online.js`, `client/online.html` | The online page shows all that, sends "start" on Enter for the host, and follows the kart in front when watching |
| `client/keyboard.js` | Listens for Enter |
| `client/net.js` | A kart that was put back on the grid is shown there at once, instead of sliding across the track |
| `tests/room-race.test.js`, `tests/race-view.test.js` (new) | 36 and 23 tests |
| `tests/online.test.js`, `tests/net.test.js` | 6 and 4 tests added at the end. No existing test was changed |
| `WALKTHROUGH.md`, `README.md`, `PROJECT_BRIEF.md`, the READMEs in `client/`, `server/` and `tests/`, `docs/two-laptop-checklist.md` | Kept true. The checklist has ten new checks for the race start |

**Why it was done this way**
- The room starts "open" and behaves exactly as before until the host starts a race. That is why every one of the older tests still passes untouched.
- The server counts the countdown, in steps, with the same `countdownAt` rule as practice. The browser only shows the number it is told. So nobody can start early by changing their page, and every clock starts on the same step.
- The server works out who the host is from the connection a message came on. A message cannot claim to be the host.
- The karts of people who are watching are left out of what the server sends, and their numbers are listed separately as "watching". The page needs nothing more to know it should follow someone else's kart.

**Decisions**
- Decided by Pedro: one shared race start (not a private countdown per player), and someone who joins during a race watches, from above or following a player.
- Decision made by the agent, please confirm: the host is whoever has been in the room longest, and only the host can start. Pedro was asked and did not answer this one.
- Decision made by the agent, please confirm: the key is Enter.
- Decision made by the agent, please confirm: the host can also start a new race while one is on (not during the countdown). Otherwise one player who walks away from their laptop would block the room for ever.
- Decision made by the agent, please confirm: a start from someone who is not the host is ignored, and that browser is not disconnected.
- Decision made by the agent, please confirm: a watcher's camera follows the kart with the most laps, and V switches to the whole track. The watcher cannot choose which kart to follow.
- Decision made by the agent, please confirm: if every racer leaves, the room goes back to free driving.
- Git: the agent made the branch `online-race-start` from an up-to-date `main` and made the commits. Nothing was pushed.

**What was checked, and what was not**
- `npm test`: 403 passed, 5 skipped (before: 334 and 5).
- The room's race rules were broken on purpose in eight ways. Seven made between 1 and 6 tests fail. The eighth (moving the hidden karts of people who are watching) made no test fail, and changes nothing anyone can see, because those karts are put back on the grid before they are shown.
- In the app's built-in browser, two tabs on Pedro's laptop: Enter from the tab that was not the host did nothing. Enter from the host started the countdown, a big "3" appeared, and afterwards both karts showed the same clock. A tab reloaded during the race had no kart, followed the other kart, was told it was watching, and V showed the whole track.
- Found while checking, and fixed: at a race start a kart could be seen sliding from where it was back to the grid. `client/net.js` now shows it on the grid at once, with tests.
- NOT checked: the whole countdown at full speed with a person's eyes. The built-in browser only redraws now and then, so 2, 1 and GO! were not seen on screen, only "3". The tests cover what the page says at each moment.
- NOT checked: a race driven by hand to the finish, and the messages after the finish.
- NOT checked: two real laptops on two internet connections, and the live server. Checks 15 to 24 in `docs/two-laptop-checklist.md` are for that.

**How to check it yourself**
Run `npm start` and open http://localhost:3000/online.html in two browser windows side by side. The first window is the host. Press Enter there. Open a third window during the race to see the watching view. Run `npm test`.

**What comes next**
- Pedro tries it in two windows and confirms the decisions above.
- Publish the branch from GitHub Desktop, open the pull request, a teammate approves.
- After the merge: run checks 15 to 24 of the two-laptop checklist with teammates on the live site.
- Next piece, asked for by Pedro: a boost for pressing the gas exactly at GO. It needs a new driving rule in `shared/physics.js`.
- Later: a finishing order and a results screen.

### 10 November 2026: a 3, 2, 1, GO! countdown before the practice race

**What was done**
The practice race now begins with a countdown. The first press of an arrow key shows 3, 2, 1, GO! in the middle of the track, one second each. During 3, 2 and 1 the keys do nothing, the kart stands still and the clock stays at zero. At GO the clock starts and the kart can be driven. R resets everything, and the next key press counts down again.

Before this, Pedro's laptop was set up: the project copy was brought up to date from GitHub and Node.js 26.13.0 was installed.

| File | What it is for |
|---|---|
| `shared/countdown.js` (new) | The rule. `countdownAt(steps)` says what to show ("3", "2", "1", "GO!" or nothing) and whether the race has begun. `stepCountdownRace` moves a race forward one step: before GO it leaves the racer exactly as it was, from GO on it calls the normal `stepRacer` |
| `tests/countdown.test.js` (new) | 23 tests for the rule |
| `client/main.js` | The practice race uses the rule instead of "the clock starts at the first key press" |
| `client/style.css` | The countdown is shown as one big number, without the dark box of the other messages |
| `client/keyboard.js` | One comment corrected. No change in behaviour |
| `WALKTHROUGH.md`, `shared/README.md`, `tests/README.md` | Kept true |

**Why it was done this way**
- The countdown is counted in steps of the game (60 per second, so 60 steps for each number), like the race time. The same number of steps always gives the same answer on every computer, and the server can reuse the rule when online races get a start.
- The rule lives in `shared/`, not in the browser code, so that "the kart cannot move before GO" can be tested without a browser.
- The racer is handed back untouched during the countdown. That way the race after GO is exactly the race there was before this change, and a test proves it.

**Decisions**
- Practice only, not online. Chosen by Pedro. Online needs a race start on the server first, which is a bigger piece of work.
- Decision made by the agent, please confirm: the countdown starts at the first press of an arrow key, as the clock did before. The other option was to start it by itself when the page opens or R is pressed. The agent recommended the key press, so nobody misses the start while the page loads. Pedro was asked and answered only the first question.
- Decision made by the agent, please confirm: each number lasts one second, "GO!" stays on screen for one second after the race has begun, and from GO the clock runs even if no key is held (before, the clock waited for a key).
- Git: the agent made the branch `countdown-start` from an up-to-date `main` and made the commits, at Pedro's request. Nothing was pushed.

**What was checked, and what was not**
- `npm test`: 334 passed, 5 skipped (before: 311 and 5). The 5 skipped need the real database.
- The rule was broken on purpose in four ways (racing during the countdown, moving the racer during the countdown, counting from 2, accepting a step count below zero). Each made between 1 and 8 tests fail. The rule was then restored.
- In the app's built-in browser, on Pedro's laptop: after an arrow key the page showed 3, 2, 1, GO! in order, the kart's position and the clock did not change until GO, the kart then drove, R brought back "Press an arrow key to start the countdown", holding left during the countdown did not turn the kart, and R with a key still held started a new countdown.
- NOT checked: how it looks and feels in a normal browser at full speed. The built-in browser redraws slowly. Pedro should look himself.
- NOT checked: a whole three-lap race to the finish message after this change. The automatic tests still drive three laps with the unchanged rules, but nobody drove them by hand.
- NOT checked: the live server. Nothing was pushed or merged.

**How to check it yourself**
Run `npm start`, open http://localhost:3000 in a normal browser and press an arrow key. Hold the gas during the countdown: the kart must not move before GO. Press R and try again. Run `npm test` and look for `countdown.test.js`.

**What comes next**
- Pedro tries it in a normal browser and confirms the two decisions above.
- Done on the same branch: Pedro's full name and student number are in the team tables in `README.md` and `PROJECT_BRIEF.md`, as the course requires.
- The agent's push was refused, because git was not signed in to GitHub from the agent's side. Pedro publishes the branch from GitHub Desktop, opens the pull request, and a teammate approves.
- Later: use the same rule for a real online race start.
