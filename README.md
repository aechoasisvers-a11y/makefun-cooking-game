# Sizzle & Serve — The Little Noodle Stall

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/competitions/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/aechoasisvers-a11y/makefun-cooking-game/rank.svg)](https://make.fun/competitions/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/aechoasisvers-a11y/makefun-cooking-game/reward.svg)](https://make.fun/competitions/best-cooking-game-20261125-0137)

A complete little cooking game that runs offline in a desktop browser from static files. You run a tiny noodle stall through three shifts: tickets come in on the order board, and you chop, boil, fry and grill each dish's parts, plate them, and ring the service bell before the customer's patience runs out.

## How to play

- **Tickets** appear on the order board (left). Each one shows a dish and the three parts it needs, plus a patience bar that drains.
- **Grab ingredients** from the bins along the top — click a bin, or press **1–6**.
- **Chop** greens and chilli on the chopping board (click it with the ingredient in hand; wait for the ring).
- **Cook** noodles, rice, egg and skewer on the two-burner stove (click a burner). The ring shows the cook timer — pick it up when it says DONE, or it burns.
- **Plate** finished parts at the plating station. A plate that matches a ticket glows green: **READY TO SERVE!**
- **Serve** at the window (click it, or the bell). Fresh tickets pay a tip; serving in a row builds a combo.
- **Trash** clears whatever you are carrying. Burnt food must be binned off the burner.
- **WASD / arrow keys** walk the chef; **Space / E** works the nearest station; **P** pauses; **M** toggles the music.
- Beat each shift's coin target before the shift timer ends to open the next shift. Three shifts, faster and hungrier each time.

## Run it

Serve `game/` with any static server (for example `python3 -m http.server` inside `game/`, or `node serve.ts` from the repo root) and open `index.html` in desktop Chrome. No network request is made: all art is drawn in canvas and all sound is synthesized with WebAudio.

## Screenshots

The cover shows the stall mid-rush: three tickets on the board, a dish mid-assembly on the plate, noodles boiling, greens being chopped, and the shift timer running. The other shots show the title screen, a four-ticket dinner rush with a burner about to burn, and a finished Noodle Bowl ready to ring the bell.

## Layout

- `game/index.html` — the page and canvas
- `game/src/config.js` — tuning, ingredients, recipes, kitchen layout
- `game/src/random.js` — seeded random numbers
- `game/src/audio.js` — synthesized sound effects and the stall jingle
- `game/src/world.js` — orders, cooking, plating, serving and scoring rules
- `game/src/input.js` — keyboard and mouse controls
- `game/src/render.js` — all canvas art: kitchen, board, tickets, chef, food
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/main.js` — boot, game loop, screens and the self-test
- `main.ts` — the make.fun hand-in program; `vendor/makefun-game.ts` is the kit's library, unchanged
