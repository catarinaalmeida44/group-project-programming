# shared

The rules of the game: how a kart speeds up, turns, brakes and slides, how it bounces off walls and off other karts, where the karts start, how laps are counted, and the bananas that make a kart spin out.

These files are used by both the browser and the server, so both follow exactly the same rules. They contain only calculations: nothing here draws on the screen or touches the database, which is what makes the rules easy to test. Nothing here uses real chance (`Math.random`) either: the same start and the same keys always give the same race.

| File | What it does |
|---|---|
| `race.js` | Puts the other files together. `createRacer` puts a racer on a place of the starting grid. `stepRacer` moves one racer forward by one step: look at the ground, move the kart, bounce off walls, update the laps. A racer that is spinning out ignores its keys and slides instead. The browser and the server both call this |
| `countdown.js` | The 3, 2, 1, GO! before a race. `countdownAt` says what to show after a number of steps and whether the race has begun. `stepCountdownRace` leaves the racer alone until GO, then calls `stepRacer` and looks after the bananas. `createCountdownRace(track, seed)` makes the practice race: with a seed it has bananas, without one it has none. The online room uses `countdownAt` |
| `grid.js` | The starting grid. `gridSpot(track, place)` says where each of the eight places is: two columns, each row further back. The server puts the karts there and the page can paint the grid boxes at the same spots |
| `bumps.js` | Karts bumping into each other. `bumpKarts` takes all the karts on a track, pushes apart the ones that overlap, passes their speed on, and keeps everyone out of the walls |
| `hazards.js` | The bananas. Where one may appear, when the next one appears, which kart hit which banana, and making that kart spin out. Its stand-in for dice, `nextRandom`, is why the same seed always gives the same bananas |
| `track.js` | Reads a track drawn with letters, says what the ground is at any spot, and makes karts bounce off walls. Also checks a track that says its start is behind the finish line |
| `laps.js` | Counts checkpoints, laps and race time. Knows the two ways a kart can start: behind the finish line (the real tracks) or just after it (the small tracks in the tests) |
| `tracks/test-oval.js` | The test track: a simple loop drawn with letters |
| `tracks/campus-loop.js` | The first campus track: a loop round the outside of the Nova SBE campus, made from OpenStreetMap, 6 metres a square. How it was made is explained at the top of the file |
| `tracks/campus-loop-storeys.js` | How many storeys tall each square of the campus loop is. Only the picture uses it, to stand the buildings up; the rules do not |
| `tracks/index.js` | The list of all tracks, each with a short name for addresses (`test-oval`, `campus-loop`). A new track is added here |
| `physics.js` | The driving rules. `stepKart` takes a kart and the keys that are pressed, and gives back the kart one sixtieth of a second later. `slideKart` does the same for a kart that is spinning out, which has no keys. The numbers to tune by playtesting are together at the top of the file |
| `characters.js` | The drivers and their scores. For now one placeholder driver with middle scores |
| `surfaces.js` | The kinds of ground. For now road and grass |
| `numbers.js` | Small number helpers. For now one: `clamp`, which keeps a number between a lowest and a highest value |
| `kart-looks.js` | What a player may choose for the look of their kart: a colour for the kart, the helmet and the suit, each as a small whole number from a short list. The browser checks a choice with it before sending, and the server checks it again before passing it on to other players. It changes nothing about how a kart drives |
| `account-rules.js` | Which user names and passwords are allowed. The page uses it to warn early, the server to decide |

## The driving rules in plain words

| Rule | What happens | Controlled by |
|---|---|---|
| Speeding up | Speed climbs toward the top speed, quickly when slow and gently near the top | Acceleration score |
| Top speed | The highest speed on the road. Lower on grass | Speed score, off-road score |
| Coasting | With no pedal, the kart slows down gradually and stops | Same for everyone |
| Braking | The kart stops quickly. Holding the brake after stopping reverses, slowly | Same for everyone |
| Gas and brake together | The brake wins | Same for everyone |
| Steering | No turning when standing still. Slightly slower turning at top speed. Mirrored when reversing | Handling score |
| Grip | A kart can slide sideways in a corner. More grip stops the slide sooner | Grip score |
| Walls | A head-on hit sends the kart back at half speed. A scrape along a wall costs very little | Same for everyone |
| Bumps | Two karts that touch are pushed apart, and the speed along the line between them is passed on with half of the bounce lost. Hit from behind, a kart is shoved forward and the one behind is slowed. A side swipe pushes both sideways | Same for everyone for now. `bumpKarts` already takes a weight for each kart, for heavy and light drivers later |
| Spinning out | A kart that drives over a banana spins for 1.2 seconds. Its keys do nothing, it slides the way it was going and slows down quickly. It cannot be spun again until one second after the spin | Same for everyone |

## Where the karts start

On the real tracks the starting grid is behind the finish line, as in real racing. Crossing the line for the first time starts lap 1 and does not count as a lap. The race clock starts at GO, so the time of lap 1 includes the short run from the grid to the line.

A track says so with `behindLine: true` in its start. The small tracks in the tests do not say it, and keep the older rule: the karts start just after the line.

## Bananas

- A banana only appears on a road square that is not next to a wall, not near the finish line or the starting grid, not near a kart and not near another banana. The gap between bananas is wider than the road, so they can never close it.
- The first one appears 4 seconds after GO, then one every 2 to 5 seconds, up to a number that grows with the track (5 on the test oval, 12 on the campus loop). A track that is too small gets none. A banana stays until a kart hits it.
- Whoever starts a race gives it a number, the "seed". The same seed and the same driving always give the same bananas. A race that is given no seed has no bananas.

## How laps are counted

A track has checkpoints: invisible rectangles across the road. The first one is the finish line. The game keeps one count for each kart: checkpoints passed.

- Driving into the next checkpoint adds one.
- Driving back into the checkpoint before the last one takes one away.
- Driving into any other checkpoint changes nothing.

A lap is complete each time the count reaches a new full round. So skipping a checkpoint, taking them in the wrong order or driving the wrong way round can never complete a lap.

Time is counted in steps of the game (60 per second), not with a clock, so a finish time is exact and the same on every computer.

Not written yet: drifting and boosts, drivers of different weight, sand and sea.
