# shared

The rules of the game: how a kart speeds up, turns, brakes and bounces off walls, and how laps are counted.

These files are used by both the browser and the server, so both follow exactly the same rules. They contain only calculations: nothing here draws on the screen or touches the database, which is what makes the rules easy to test.

| File | What it does |
|---|---|
| `numbers.js` | Small number helpers. For now one: `clamp`, which keeps a number between a lowest and a highest value |

The driving rules themselves are not written yet.
