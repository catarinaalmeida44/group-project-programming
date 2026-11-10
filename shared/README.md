# shared

The rules of the game: how a kart speeds up, turns, brakes and slides, how it bounces off walls, and how laps are counted.

These files are used by both the browser and the server, so both follow exactly the same rules. They contain only calculations: nothing here draws on the screen or touches the database, which is what makes the rules easy to test.

| File | What it does |
|---|---|
| `race.js` | Puts the other files together. `stepRacer` moves one racer forward by one step: look at the ground, move the kart, bounce off walls, update the laps. The browser and the server both call this |
| `track.js` | Reads a track drawn with letters, says what the ground is at any spot, and makes karts bounce off walls |
| `laps.js` | Counts checkpoints, laps and race time |
| `tracks/test-oval.js` | The test track: a simple loop drawn with letters |
| `physics.js` | The driving rules. `stepKart` takes a kart and the keys that are pressed, and gives back the kart one sixtieth of a second later. The numbers to tune by playtesting are together at the top of the file |
| `characters.js` | The drivers and their scores. For now one placeholder driver with middle scores |
| `surfaces.js` | The kinds of ground. For now road and grass |
| `numbers.js` | Small number helpers. For now one: `clamp`, which keeps a number between a lowest and a highest value |

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

## How laps are counted

A track has checkpoints: invisible rectangles across the road. The first one is the finish line. The game keeps one count for each kart: checkpoints passed.

- Driving into the next checkpoint adds one.
- Driving back into the checkpoint before the last one takes one away.
- Driving into any other checkpoint changes nothing.

A lap is complete each time the count reaches a new full round. So skipping a checkpoint, taking them in the wrong order or driving the wrong way round can never complete a lap.

Time is counted in steps of the game (60 per second), not with a clock, so a finish time is exact and the same on every computer.

Not written yet: drifting and boosts, karts bumping each other, sand and sea.
