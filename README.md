# Little Explorers

A drag-and-drop learning game for Class 1–2 children (age 6–8). It runs in any web browser on laptops, tablets and classroom smartboards. There is nothing to install.

Each session has 9 short rounds from three mini-games, served in a shuffled order:

| Mini-game | What the child does | What they learn |
|---|---|---|
| 🔤 **Spell It** | Sees a picture (box, bed, bat, hat, bag, pig, mug) and drags the shuffled letters into the boxes to make the word | Letters, 3-letter words, linking a word to a picture and its sound |
| 🌍 **Map Puzzle** | Drags a country piece, cut from an illustrated 3D map, into its empty slot. A card shows its flag, name and famous monument | Country shapes and neighbours from Algeria to Sudan |
| 🐾 **Find the Baby** | Draws a line from a grown-up animal to its baby | Animals and their young (dog → puppy, cow → calf) |

## How to play

- **On your computer:** download or clone the repo and open `index.html` in Chrome, Edge, Safari or Firefox.
- **Online:** host the folder as static files, for example with GitHub Pages (Settings → Pages → branch `main`, folder `/ (root)`).

Tap the splash screen first, because browsers only play sound after a tap. On the home screen, the big ▶ button starts a mixed session. The three small buttons (A, 🌍, 🐾) practise one mini-game for 5 rounds.

## Made for young children

- **No reading needed:** Ollie the owl speaks every instruction, and the 🔊 button repeats it. An animated hand shows the gesture the first time each mini-game comes up.
- **No failure screens:** a wrong move bounces back gently, and every round ends with at least 1 star.
- **Easy dragging:** large letter tiles and forgiving drop zones. A tap works too, for children who cannot drag yet.
- **Hints:** a 💡 bulb appears after 15 seconds without progress.
- **Rewards:** stars for each round, and a sticker for the sticker book at the end of the session. 20 or more stars earns a golden sticker.
- **Adjusts by itself:** each mini-game moves up or down a level based on how the child is doing.

## Teacher mode

On the home screen, **hold the 🔒 button for 3 seconds** to open the teacher settings. You can:

- add child profiles, each with its own progress
- choose Class 1 (each letter is checked straight away) or Class 2 (letters are checked at the end)
- switch between UPPERCASE and lowercase letters
- choose which mini-games are on and how many rounds a session has (6, 9 or 12)
- change the volume of voice and sounds and of music, turn on reduced motion, and turn on smartboard mode (bigger buttons, and the teacher taps Next)
- turn words, countries and animal pairs on or off, and add new words
- see a report for each child: rounds played, stars, and items they needed help with

Progress is saved in the browser on the device. No personal data leaves the device.

## Project structure

```
index.html         page and screens
css/style.css      all styles (landscape and portrait layouts)
js/content.js      game content: words, countries, animal pairs
js/core.js         screen scaling, dragging, voice, sounds, saving, mascot
js/spell.js        Spell It
js/map.js          Map Puzzle (country shapes and flags)
js/baby.js         Find the Baby
js/game.js         game flow, shuffling, stars, stickers, teacher mode
assets/img/        pictures and backgrounds
```

It is plain HTML, CSS and JavaScript, with no frameworks and no build step.

## Adding content

All words, countries and animal pairs live in `js/content.js`. You can change them without touching the game code. For example, to add a Spell It word with a picture:

1. Put the picture in `assets/img/`, for example `cup.jpg` (a single object on a white background works best).
2. Add or update its entry in `js/content.js`:
   ```js
   { "word": "CUP", "level": "easy", "image": "assets/img/cup.jpg", "emoji": "☕" }
   ```

Spell It uses 3-letter words that have a picture.

## Notes

- Voice uses the browser's built-in text-to-speech and prefers an Indian English voice where the device has one. Recorded voice clips would sound more natural.
- Sound effects and background music are generated in the browser, so there are no audio files.
- The Map Puzzle uses one illustrated picture (`assets/img/map-africa.jpg`). Each country's outline is traced on it in `js/map.js`, and the piece is cut from the same picture with the same outline, so it fits its slot exactly. If you replace the picture, re-trace the outlines.
- The game design is described in `Little_Explorers_GDD.pdf`.
