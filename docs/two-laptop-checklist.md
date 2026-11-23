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
| 11 | A: switch off the Wi-Fi and leave it off for one minute | On A, the karts stop moving and after two seconds a card over the picture says "The server has gone quiet", then "No internet connection" or "Connection lost". On B, the red kart disappears within about ten seconds | |
| 12 | A: switch the Wi-Fi on again, and do NOT reload the page | Within a few seconds the card goes away by itself and A is back in the room with a kart (new on 19 November: the page tries again by itself). This one has never been tried on two laptops, so write down what really happens | |
| 13 | A: reload the page anyway | A is back in the room with a kart, once and not twice | |

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
| 29 | A: click "Online" and choose the Nova lap (the campus loop of these checks left the game on 20 November). B: do the same | Both are in the same room. Under the track each sees "Signed in as ..." with their own name, and "With you: ..." with the other's name | |
| 30 | A (the host): press Enter. Both: drive the three laps | When each crosses the line, the line under the track says "Saved to the leaderboard", with a place (1st or 2nd) and the time. The times match the clocks above the track | |
| 31 | Both: go back to the menu and open "Leaderboard", then "Nova lap" | Both names are there with the times from check 30, the faster one first. Your own row is marked "you" | |
| 32 | A: open "Leaderboard" and choose "Test oval" | Nobody raced there: it says there are no times yet | |
| 33 | B: click "Sign out", then "Online", choose the Nova lap, and A starts another race. Both finish | B's page says it is playing as a guest and that results are not saved. A sees "With you: 1 guest". After the race the leaderboard has no new time for B | |
| 34 | B: click "Sign in" and type the right name with a wrong password | "Wrong user name or password." B is not signed in | |
| 35 | A: close the browser completely, open it again and open the link | A is still signed in | |
| 36 | A: click your user name, open "Delete my account", type the password, tick the box and press the button | A is signed out. On B, after reopening the Leaderboard, A's name and times are gone | |

Write down as well: how long does "Create account" take after pressing the button? On the free server the password scrambling is slow, and we have not measured it there.

## The new race view, bumping, bananas and kart colours

Added on 12 November 2026. Not run yet by people: these were only tried by robots and pretend players on one laptop. This is also the first chance to say how the new pictures look when they move.

| # | Do this | You should see | Result |
|---|---|---|---|
| 37 | A: on the menu, click "Your kart" and choose a colour for the kart, the helmet and the suit | The small kart in the panel turns round in those colours, and it says "Saved" | |
| 38 | A and B: click "Online" and choose the same track | Each sees the other's kart in the colours the other chose. A kart whose player chose nothing has the colour of its starting place | |
| 39 | Both: look at the start | The karts stand in painted boxes behind a chequered line, under a gantry with three lights | |
| 40 | A (the host): press Enter | The camera comes down from above the grid to behind your kart while 3, 2, 1 is counted. The lights go red one by one and turn green at GO, at the same moment on both laptops | |
| 41 | Both: drive off and cross the line | The lap counter stays on "Lap 1" when you cross the line the first time, and goes to 2 only after a whole lap | |
| 42 | B: drive into the back of A's kart | A is shoved forward and B is slowed. Neither kart passes through the other. Both laptops show the same thing | |
| 43 | Both: drive side by side and steer into each other | The karts push each other sideways and neither ends up inside a wall | |
| 44 | Both: keep racing for half a minute | Yellow banana peels appear on the road, in the same places on both laptops, and as yellow marks on the small map | |
| 45 | A: drive over a banana | A's kart spins round twice and slows down, the banana is gone on both laptops, and A's keys do nothing for about a second. On B, A's kart is seen spinning | |
| 46 | A: turn round and drive against the arrows | After a moment: "Wrong way! Turn round and follow the arrows." It goes away when A turns back | |
| 47 | Both, signed in: look at the other kart from close by | The other player's user name is shown above their kart | |
| 48 | Both: press V | The view from above and the view of the whole track still work, with the same karts, trees and bananas | |

## A race driven to its end, the yellow light and the results (added 13 November 2026)

Use the Nova lap for these: in the menu, choose Online and the Nova lap on both laptops. (They were written for the campus loop, which left the game on 20 November 2026.)

| # | What to do | What should happen | OK? |
|---|---|---|---|
| 49 | A (the host): press Enter. After GO, both drive off. Then A: press Enter again, in the middle of the race | Nothing happens. Nobody is sent back to the grid and both clocks run on | |
| 50 | Both: look at the road ahead and at the small map | A low curtain of yellow light stands across the road at the next checkpoint, and a yellow line marks it on the small map. After you drive through it, the light moves to the next checkpoint | |
| 51 | Both, during the race: look above the track | "Place 1st of 2" or "Place 2nd of 2", and it changes when one overtakes the other | |
| 52 | A: on the west side, do NOT follow the arrows round the end of the CTT Student Hall. Drive straight on, up to the finish line | On the finish line: "You missed a checkpoint: round the end of the CTT Student Hall. This lap does not count until you drive through the yellow light." The lap counter does not go up | |
| 53 | A: drive back to the yellow light, through it, and on to the finish line | The warning goes away at the light, and this time the lap counts | |
| 54 | B: finish the three laps. A: stop driving | B sees its time and a small list "Results" in the corner with "still racing" for A. On both laptops, at the top of the picture: "The race ends in 2:00", counting down, and "42 s" in the last minute | |
| 55 | Both: wait for the two minutes to pass | On both laptops a results board comes up over the track: B on top as the winner, with B's kart turning round in B's colours, and A below with "did not finish" and the lap A was on. A's keys do nothing any more. At the bottom of the board A (the host) is told to press Enter for the next race, B to wait for the host | |
| 56 | B, signed in: look at the line under the track and at the leaderboard in the menu | B's time was saved. Nothing was saved for A | |
| 57 | A: press Enter | A new countdown, with both karts on the grid | |
| 58 | Both: drive close along a building, and turn round right in front of one | The building beside you is whole, up to the edge of the picture. A building straight behind your kart may disappear so that you can see your kart. No loose pieces of wall flicker in and out | |
| 59 | Both: drive a whole race and both finish | The results board comes up at once when the second kart finishes: the winner on top, the other below with the time and how far behind ("+0:03.50"). Your own line is yellow. The board pops up, the rows slide in, confetti falls | |
| 60 | A: press Enter | The board goes away and a new countdown starts | |

## Changing your password (added 13 November 2026)

| # | What to do | What should happen | OK? |
|---|---|---|---|
| 61 | A, signed in on the laptop and also on a phone: in the menu on the laptop, click your name, then "Change my password". Type a wrong password in "Your password now" | "That is not your current password." Nothing changes | |
| 62 | A: type the right password now, and the same one as the new password | "That is the password you already have. Choose a different one.", before anything is sent | |
| 63 | A: type the right password now and a new one of at least 8 characters, and click "Change my password" | The panel closes. The top of the menu says "Your password is changed. You were signed out on your other devices." A is still signed in on the laptop | |
| 64 | A: reload the menu on the phone | The phone is signed out | |
| 65 | A: sign out on the laptop and sign in again, first with the old password, then with the new one | The old one is refused, the new one works | |

## Sound (added 15 November 2026)

Turn the loudspeakers on. One laptop is enough for checks 66 to 72.

| # | What to do | What should happen | OK? |
|---|---|---|---|
| 66 | Open a Single race and wait without touching a key | Silence. (A browser only lets a page make sound after a key press) | |
| 67 | Press an arrow key, then Enter (since 23 November 2026 Enter starts the countdown) | The arrow key starts nothing. After Enter: a beep with a thump for 3, 2 and 1, and a big chord at GO. The engine hums | |
| 68 | Drive off and reach top speed, then let go of the gas | The engine sings higher as you speed up and stays in the background. It is a little fuller while the gas is held | |
| 69 | Drive onto the grass, then steer hard at speed | A low rumble on the grass. The tyres squeal when the kart slides | |
| 70 | Touch a wall gently, then drive into one at full speed | A soft thud, then a boom with a crash and bits tinkling down. Not twenty times while you grind along the wall | |
| 71 | Drive over a banana | A whistle sliding down and a whirling sound for as long as the kart spins, then "boing" | |
| 72 | Finish a lap, start the last lap, and finish the race | A chime for the lap, a trumpet call for the last lap, and at the finish a fanfare. (Until 20 November 2026 a crowd made by code also cheered on the podium. The podium now has recorded trumpets and clapping: see "Music" below) | |
| 73 | Press M, drive, press M again | "it is off" under the track and silence at once, then "on" and the sound again. Open the menu, Settings: the box "Sound in races" says the same | |
| 74 | Switch to another tab during a race, and come back | Silence while the page is not in front, sound again when you come back | |
| 75 | Online, with two laptops: B drives into the back of A | Both hear a knock with a clang, each on their own laptop. Write down if one of them hears nothing | |

Write down as well: is anything too loud, too long, or annoying after three laps? Does the engine fit the speed?

## Characters (added 17 November 2026)

Since the second change of 17 November the character is chosen after the track, before each race: checks 37 and 38 above now happen through a character. Not run yet with two laptops: only tried in two tabs of one browser, which share one saved choice.

| # | Do this | You should see | Result |
|---|---|---|---|
| 76 | A: on the menu, click "Single race", then a track | "Choose your character" opens, with six cards: Dean, Professor Ricardo Pereira, Ró Versos, Cici Boss, FranFon, PCP. The chosen one is shown big, beside their kart | |
| 77 | A: move the mouse slowly over the six cards, then click PCP | Each card has the pilot on the left, with the person's own head, and the photo on the right. Each pilot does their own dance while the mouse is over them: Dean claps, the Professor does the robot, Ró Versos drives, Cici Boss waves, FranFon flies like a plane, PCP does the "siu" (jump, spin, land with arms spread). PCP gets a yellow frame; the big picture shows PCP beside a red kart, doing the siu, then crossing arms, and again | |
| 78 | A: click "Race" | The race on the track you picked. Your kart is red, and your pilot wears a yellow helmet. No face anywhere in the race | |
| 79 | B: "Online", a track, Cici Boss, "Join the room". A: the same track, PCP, "Join the room" | A is told "You are PCP.", B "You are Cici Boss." Each sees the other's kart in that character's colours | |
| 80 | B: go back to the menu, "Online", the same track, choose PCP, "Join the room" | B is told "Someone in this room is already PCP, so you are Dean." B's kart is black with a white helmet | |
| 81 | A: close the online page. B: reload it | B is now told "You are PCP." | |
| 82 | A (the host) starts a race. C: choose a character and open "Online" during the race | C watches. At the next start C has a kart in that character's colours | |

Write down as well:

- Does the race view run smoothly on each laptop? "Smooth", "a little jerky" or "jerky", and which laptop.
- How does it feel that the camera swings round a moment after the kart turns? "Good", "too slow" or "too fast".
- Is a bump too hard, too soft or about right? Does a spin last too long?
- Are there too many bananas, too few, or about right?
- On the campus loop: what looks like the real campus, and what does not?
- Are two minutes after the first finish too short, too long or about right?
- How does the results board feel? Is anything on it hard to read, or in the way?
- Did a lap ever not count without the page saying why? Where on the track were you?
- Do buildings beside you still look "cut off" anywhere? Where, and in which direction were you driving?

## One more check, when a new version goes online

This cannot be done at any moment. Do it the next time a pull request is merged while both laptops have the online page open.

| # | Do this | You should see | Result |
|---|---|---|---|
| 14 | Keep both pages open while Render puts the new version online (a few minutes after the merge) | The karts stop. After two seconds a card on both pages says "The server has gone quiet", and some seconds later "Connection lost", counting the seconds. When the new version is up, both pages are back in a new, empty room by themselves, without a reload | |

## Lag: the connection meter

Added on 19 November 2026. Not run yet with real laptops. Do it on the public link, with as many laptops as you have (up to six), each on the connection it will really use (campus Wi-Fi, home, a phone's hotspot).

| # | Do this | You should see | Result |
|---|---|---|---|
| 83 | Everyone: open "Online" on the Nova lap. Look at the picture before pressing anything | No meter anywhere. The page looks as it always did | |
| 84 | The host starts a race. Everyone: press L while driving | A small box in the bottom left corner of the picture: "Connection", five numbers and one sentence. It covers no kart and no part of the road you need | |
| 85 | Everyone: read out the five numbers and the sentence after about ten seconds of driving, and write them down below | "Updates a second" is about 30 on every laptop. The sentence is "All fine." or names the connection or the computer | |
| 86 | Everyone: press L again | The box is gone. The race carries on as before | |
| 87 | One player on a phone's hotspot or weak Wi-Fi, if there is one: press L | "Server and back" or "Longest wait" is higher than on the others and turns red, and the sentence says it is the connection | |

Write the numbers of each laptop here (one line each): server and back, updates a second, longest wait, pictures a second, key to screen, and the sentence.

## Game settings online

Added on 19 November 2026 (night). Not run yet with real laptops. Three laptops, A, B and C, on the public link. Everyone leaves the online page first, so the room is empty.

| # | Do this | You should see | Result |
|---|---|---|---|
| 88 | A: open "Online" on the Nova lap | A card over the picture: "You are the host", "Start online game", Players 6, Computer karts On, Their level Normal | |
| 89 | A: choose Players 2, level Hard, press "Confirm game settings" | The card goes. In the corner of the picture: "You are the host", "Up to 2 players · Computer karts: Hard" and a button "Game settings" | |
| 90 | B: open "Online" on the Nova lap | B gets no card. In the corner: "Host:" and A's user name (or "a guest"), with the same settings, and no button | |
| 91 | C: open "Online" on the Nova lap | C is told "The room is full" | |
| 92 | A: press "Game settings", try Players 2 again, then choose 3 and confirm. C: press the button on the card to try again | On A's card nothing below 2 can be pressed while two people are there. After the change C gets in | |
| 93 | A: press Enter. Everyone drives | Six karts: three people and three computer karts, and the computer karts are clearly faster than on Normal | |
| 94 | C: reload the page during the race | C watches a person's kart, never a computer kart. The banner says "Press ← or → to watch another player", and the arrows move the camera between A and B | |
| 95 | When the race is over: A presses "Game settings" on the results board, switches computer karts Off, confirms, and starts the next race | Only A, B and C race | |
| 96 | Everyone leaves the page. A opens "Online" again | The card shows the defaults again: 6, On, Normal | |

## Two players on one laptop

Added on 19 November 2026 (night), changed on the 20th: player 1 has the arrows. One laptop, two people side by side: player 2 (W A S D) sits on the left, player 1 (the arrows) on the right. Catarina tried it on her laptop on 20 November and it worked; the other laptops have not been tried. Try it on every kind of laptop the team has: keyboards differ.

| # | Do this | You should see | Result |
|---|---|---|---|
| 97 | Menu: "Two players", the Nova lap. Player 1 chooses a character, "Next: player 2", player 2 chooses another one, "Race" | Player 1's character is grey for player 2 and cannot be chosen. Then the "Game settings" card on a split screen | |
| 98 | Confirm the settings. Both hold their gas key (↑ for player 1, W for player 2): nothing starts, both halves say "Press Enter to start". Then one of you presses Enter (since 23 November 2026) | 3, 2, 1, GO! in both halves. Player 1's half is on the right and player 2's on the left, each behind its own kart, with the driver's name under it | |
| 99 | Both steer hard at the same time, in every combination: W+A with ↑+→, W+D with ↑+←, and so on. Say out loud if your kart ignores a key | Both karts answer. **Write down any combination that fails, and on which laptop**: a keyboard that cannot tell the keys apart is something code cannot fix | |
| 100 | Drive the three laps. Watch how smooth the two pictures are | Smooth on both halves. Write down a laptop where it stutters | |
| 101 | Finish, one after the other | The first to finish gets a banner at the top of their half: their place and time, "Waiting until every player finishes", and "You are watching" the other driver, whose kart their half now follows. When both are home it follows the computer kart in last place. When every kart is home (or two minutes after the first), one big picture with the podium, and "Race again" and "Back to menu" | |
| 102 | Press F during a race | The two halves fill the screen, side by side. F or Esc brings the page back | |
| 103 | Open "Your account" in the menu afterwards, signed in | The two-player race is not in the stats | |

## After your own finish

Added on 20 November 2026. Not run yet with real laptops. Two laptops, A and B, on the public link, on the Nova lap, with computer karts on.

| # | Do this | You should see | Result |
|---|---|---|---|
| 104 | Online: A (the host) starts a race. A drives it to the end. B drives slowly and stays behind | When A finishes: a banner across the top of A's picture with A's place and time, "Waiting until every player finishes. You are watching" and B's name. A's picture follows B's kart, not a computer kart. The results list is in the bottom right corner | |
| 105 | B finishes | A's camera moves to the computer kart in last place, if one is still driving. When everyone is home: the podium, then the results board | |
| 106 | Single race: finish before at least one computer kart (on Easy that is easy) | The same banner, "You are watching" a computer kart, and the picture follows it until the podium comes, at the latest 30 seconds later | |
| 107 | Compare the podium of a single race, a two-player race and an online race on the Nova lap | The same scene in all three: in front of the school's name, the camera coming in, the first three on the steps, the crowd, and with four or more karts the driver who came last crying on the left | |

## Music, by ear

Added on 20 November 2026 (afternoon). **Nobody has listened to it in the game yet**: it was checked with the loudspeakers cut off. One laptop with the sound on is enough. Sound must be on in Settings (All sound, and Music).

| # | Do this | You should hear | Result |
|---|---|---|---|
| 108 | Open the menu and click anywhere | The menu tune starts and goes round and round. No click or gap where it starts again (it is about two minutes long) | |
| 109 | Single race on the Nova lap. Press Enter | Silence and the beeps during 3, 2, 1. At GO a calm tune | |
| 110 | Drive into the second lap, then into the third | A faster tune on the second lap, the fastest on the third. One fades into the next: no hole, no two tunes on top of each other for long | |
| 111 | While driving: is the music too loud or too quiet next to the engine and the beeps? | You can hear the engine and every beep clearly over the music. **Write down "too loud", "too quiet" or "right"**: it is one number to change | |
| 112 | Finish and wait for the podium | The last lap's tune goes on while you watch the others. On the podium: trumpets and clapping, once, and no other cheering | |
| 113 | Press M during a race, and switch Music off in Settings | M silences everything at once and brings it back. With Music off the engine is still heard | |
| 114 | Two players, and Online with two laptops | The same tunes. Online each laptop plays the tune of its own driver's lap | |

## Things to write down

- How long after pressing a key does your own kart react? "Barely noticeable", "noticeable" or "annoying". Is it better than before 19 November?
- Did any kart jump or stutter? On which laptop, and on which connection? What did the meter (L) say at that moment?
- Anything else that looked wrong.

## Known limits, so you do not report them as mistakes

- Your own kart reacts a moment late. Your key press travels to the server and the result travels back.
- All karts are shown a little in the past (a fifteenth to a tenth of a second), so that they move smoothly.
- A kart that spins into a wall can end up standing nose to the wall. Reverse with the down arrow to get away.
- A kart can drive straight through a tree on a lawn. Only walls, banks and other karts are solid.
- In a tight corner a building between the camera and your kart can vanish from the picture for a moment.
- There is no results screen yet. Each player sees their own finish time, and a signed-in player also their own place.
- Each track has its own room. Two players who choose different tracks do not see each other.
- A guest's results are not saved, and a guest has no name: others see "1 guest".
- Only the host can start a race, and the host is whoever has been in the room longest and has pressed a key in the last minute (new on 19 November: a host who is away passes the room on, and a signed-in player has one kart in a room).
- On the test oval you can see a kart on the other side of the middle block, between the trees: the bank round the block is low.
