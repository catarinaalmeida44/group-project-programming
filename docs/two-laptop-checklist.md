# Two-laptop checklist

The automatic tests check online play with pretend browsers on one computer. They cannot check the real thing: two people, two laptops, two different internet connections. This checklist does that by hand.

Run it after anything that touches online play, and before the demo.

**Last run:** not run yet. It can be run now: the "Online test" page is at the public link.

On 10 November the agent connected two pretend browsers from one laptop to the live server. They saw each other, with 20 updates a second. That is not this checklist: it was one laptop and one internet connection.

## Before you start

- Two laptops, each with a keyboard.
- Two different internet connections. The easiest way: one laptop on Wi-Fi, the other on a phone's hotspot.
- The public link of the game: https://novasbe-kart.onrender.com
- If nobody has opened the link in the last 15 minutes, the server is asleep. Open it and wait about a minute before starting.

## The checks

Write "yes" or what went wrong next to each one.

| # | Do this | You should see | Result |
|---|---|---|---|
| 1 | Laptop A: open the link and click "Online test" | "Connected. You are the red kart. You are alone here." | |
| 2 | Laptop B: do the same | B says it is the blue kart. Both laptops say "2 players here" | |
| 3 | Both: look at the small map | Two dots, one red and one blue | |
| 4 | A: hold the up arrow for two seconds | On B, the red kart drives away smoothly, without jumping | |
| 5 | B: drive after A | On A, the blue kart appears and moves smoothly | |
| 6 | Both: drive one lap, clockwise | Each lap counter goes from 1 to 2 on its own laptop only | |
| 7 | A: press V twice | A's camera changes. Nothing changes on B | |
| 8 | A: press R | A's kart is back at the start with the clock at zero. B's kart is not affected | |
| 9 | B: close the browser tab | Within a few seconds the blue kart disappears on A, and A says "You are alone here" | |
| 10 | B: open the link and "Online test" again | B is back in the room. Both say "2 players here" | |
| 11 | A: switch off the Wi-Fi and leave it off for one minute | On A, the karts stop moving and after two seconds the line under the track says "The server has gone quiet". On B, the red kart disappears within about half a minute | |
| 12 | A: switch the Wi-Fi on again | A says the connection was lost. This one has never been tried, so write down what really happens | |
| 13 | A: reload the page | A is back in the room with a kart | |

## One more check, when a new version goes online

This cannot be done at any moment. Do it the next time a pull request is merged while both laptops have the "Online test" page open.

| # | Do this | You should see | Result |
|---|---|---|---|
| 14 | Keep both pages open while Render puts the new version online (a few minutes after the merge) | The karts stop. After two seconds both pages say "The server has gone quiet". Some seconds later they say the connection was lost. After a reload, both are in a new, empty room | |

## Things to write down

- How long after pressing a key does your own kart react? "Barely noticeable", "noticeable" or "annoying".
- Did any kart jump or stutter? On which laptop, and on which connection?
- Anything else that looked wrong.

## Known limits, so you do not report them as mistakes

- Your own kart reacts a moment late. Your key press travels to the server and the result travels back.
- Other karts are shown a tenth of a second in the past, so that they move smoothly.
- Karts pass through each other. Bumping comes later.
- There is no race start and no finishing order yet. Everyone just drives.
- In the view from behind, other karts look flat, like stickers on the road.
