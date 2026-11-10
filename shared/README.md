# shared

The rules of the game: how a kart speeds up, turns, brakes and slides. Laps and walls come next.

These files are used by both the browser and the server, so both follow exactly the same rules. They contain only calculations: nothing here draws on the screen or touches the database, which is what makes the rules easy to test.

| File | What it does |
|---|---|
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

Not written yet: walls, laps, drifting and boosts, karts bumping each other, sand and sea.
