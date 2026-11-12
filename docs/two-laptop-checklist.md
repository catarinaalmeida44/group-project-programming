# Two-laptop checklist

The automatic tests check online play with pretend browsers on one computer. They cannot check the real thing: two people, two laptops, two different internet connections. This checklist does that by hand.

Run it after anything that touches online play, and before the demo.

**Last run:** 10 November 2026, by Catarina with two other players, so three laptops. Her report: it worked, and everyone saw the others drive. One thing she did not like: in the view from behind, the other players' karts look flat, with no driver. That was fixed the same day: karts now stand up, with a driver. It has not been looked at again with real players since. The result of each single check was not written down, and neither was the kind of internet connection each laptop used.

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
| 1 | Laptop A: open the link, click "Online" in the menu and choose the Test oval | "Connected. You are the red kart. You are alone here. You are the host: press Enter to start a race for everyone here." | |
| 2 | Laptop B: do the same | B says it is the blue kart. Both laptops say "2 players here". B is told to wait for the host | |
| 3 | Both: look at the small map | Two dots, one red and one blue | |
| 4 | A: hold the up arrow for two seconds | On B, the red kart drives away smoothly, without jumping | |
| 5 | B: drive after A | On A, the blue kart appears and moves smoothly | |
| 6 | Both: drive one lap, clockwise | Each lap counter goes from 1 to 2 on its own laptop only | |
| 7 | A: press V twice | A's camera changes. Nothing changes on B | |
| 8 | A: press R (before any race has been started) | A's kart is back at the start with the clock at zero. B's kart is not affected | |
| 9 | B: close the browser tab | Within a few seconds the blue kart disappears on A, and A says "You are alone here" | |
| 10 | B: open the link and click "Online" in the menu again | B is back in the room. Both say "2 players here" | |
| 11 | A: switch off the Wi-Fi and leave it off for one minute | On A, the karts stop moving and after two seconds the line under the track says "The server has gone quiet". On B, the red kart disappears within about half a minute | |
| 12 | A: switch the Wi-Fi on again | A says the connection was lost. This one has never been tried, so write down what really happens | |
| 13 | A: reload the page | A is back in the room with a kart | |

## The race start

Added on 11 November 2026. Not run yet with two laptops. Do checks 1 and 2 first, so that A is the host and B is not. A third laptop or a second browser window is needed for check 21.

| # | Do this | You should see | Result |
|---|---|---|---|
| 15 | B (not the host): press Enter | Nothing happens on either laptop | |
| 16 | Both: drive away from the start. Then A (the host): press Enter | On both laptops, both karts are back on the grid at once, without sliding there, and a big 3, 2, 1, GO! is counted. The numbers change at the same moment on both | |
| 17 | Both: hold the up arrow during 3, 2, 1 | No kart moves before GO. At GO both leave together | |
| 18 | B: press R during the race | Nothing happens. B's kart and clock carry on | |
| 19 | Both: look at the two clocks during the race | They show the same time, give or take a tenth of a second | |
| 20 | A: press Enter twice quickly | One countdown, not two | |
| 21 | C: click "Online" and choose the same track while A and B are racing | C has no kart. C sees the race, following the kart in front, and is told "You are watching". V on C shows the whole track. A and B say "3 players here" | |
| 22 | Both: finish the three laps | Each sees its finish time. A is told to press Enter for the next race, B to wait for the host | |
| 23 | A: press Enter | A new countdown, and this time C has a kart on the grid too | |
| 24 | A: close the tab during a race | B carries on racing. After the race, B is the host and can start the next one | |

## Accounts and the shared leaderboard

Added on 12 November 2026. Not run yet with two laptops, and not yet on the public link: the live server gets accounts when this work is merged. Make up a user name and a password for the test. Do not use a password you use anywhere else.

| # | Do this | You should see | Result |
|---|---|---|---|
| 25 | A: on the menu, click "Create account", type a user name of two letters and any password, and press the button | The panel stays open and says the name needs at least 3 characters. No account is made | |
| 26 | A: create an account with a proper user name and a password of 8 characters or more | The panel closes. The top of the menu shows your user name and "Sign out" | |
| 27 | B: try to create an account with the same user name, written in capital letters | "Someone already has that user name" | |
| 28 | B: create an account with another user name | B is signed in under that name | |
| 29 | A: click "Online" and choose the Campus loop. B: do the same | Both are in the same room. Under the track each sees "Signed in as ..." with their own name, and "With you: ..." with the other's name | |
| 30 | A (the host): press Enter. Both: drive the three laps | When each crosses the line, the line under the track says "Saved to the leaderboard", with a place (1st or 2nd) and the time. The times match the clocks above the track | |
| 31 | Both: go back to the menu and open "Leaderboard", then "Campus loop" | Both names are there with the times from check 30, the faster one first. Your own row is marked "you" | |
| 32 | A: open "Leaderboard" and choose "Test oval" | Nobody raced there: it says there are no times yet | |
| 33 | B: click "Sign out", then "Online", choose the Campus loop, and A starts another race. Both finish | B's page says it is playing as a guest and that results are not saved. A sees "With you: 1 guest". After the race the leaderboard has no new time for B | |
| 34 | B: click "Sign in" and type the right name with a wrong password | "Wrong user name or password." B is not signed in | |
| 35 | A: close the browser completely, open it again and open the link | A is still signed in | |
| 36 | A: click your user name, open "Delete my account", type the password, tick the box and press the button | A is signed out. On B, after reopening the Leaderboard, A's name and times are gone | |

Write down as well: how long does "Create account" take after pressing the button? On the free server the password scrambling is slow, and we have not measured it there.

## One more check, when a new version goes online

This cannot be done at any moment. Do it the next time a pull request is merged while both laptops have the online page open.

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
- There is no results screen yet. Each player sees their own finish time, and a signed-in player also their own place.
- Each track has its own room. Two players who choose different tracks do not see each other.
- A guest's results are not saved, and a guest has no name: others see "1 guest".
- Only the host can start a race, and the host is whoever has been in the room longest.
- In the view from behind, a kart that turns snaps between four pictures (back, front, left side, right side) instead of turning smoothly.
- Karts are not hidden by walls: you can see a kart that is on the other side of the middle block.
