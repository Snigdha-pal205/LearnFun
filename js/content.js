/*
 * Little Explorers — game content (data, not code).
 * Add or edit words, countries and animal pairs here; no game code changes needed.
 *
 *  spell: word, level (easy | normal | hard), image (path, optional), emoji (placeholder picture
 *         used when there is no image yet), sound (spoken on win, optional), say (optional intro
 *         phrase, e.g. "some milk" — default is "a/an <word>").
 *  map:   id (must match a shape in js/map.js), country, level, fact (spoken on win).
 *  baby:  parent, baby, parentImg / babyImg (optional), parentEmoji / babyEmoji (placeholders),
 *         group, level, similar (parents whose babies look alike — used as decoys at normal level),
 *         sound (spoken on win).
 *
 * Kept as a .js file (not .json) so the game also works when index.html is opened straight from a
 * folder without a web server. Everything inside the braces is plain JSON.
 */
window.LE_CONTENT = {
  "spell": [
    { "word": "CAT", "level": "easy", "emoji": "🐱", "sound": "Meow!" },
    { "word": "RAT", "level": "easy", "emoji": "🐀", "sound": "Squeak squeak!" },
    { "word": "ANT", "level": "easy", "emoji": "🐜" },
    { "word": "COW", "level": "easy", "emoji": "🐄", "sound": "Moo!" },
    { "word": "DOG", "level": "easy", "emoji": "🐶", "sound": "Woof woof!" },
    { "word": "PIG", "level": "easy", "emoji": "🐷", "sound": "Oink oink!" },
    { "word": "HEN", "level": "easy", "emoji": "🐔", "sound": "Cluck cluck!" },
    { "word": "BAT", "level": "easy", "image": "assets/img/bat.jpg", "emoji": "🏏", "say": "a cricket bat" },
    { "word": "FOX", "level": "easy", "emoji": "🦊" },
    { "word": "BEE", "level": "easy", "emoji": "🐝", "sound": "Buzz buzz!" },
    { "word": "OWL", "level": "easy", "emoji": "🦉", "sound": "Hoot hoot!" },
    { "word": "SUN", "level": "easy", "emoji": "☀️" },
    { "word": "BUS", "level": "easy", "emoji": "🚌" },
    { "word": "CUP", "level": "easy", "emoji": "☕" },
    { "word": "HAT", "level": "easy", "image": "assets/img/hat.jpg", "emoji": "👒" },
    { "word": "BAG", "level": "easy", "image": "assets/img/bag.jpg", "emoji": "🎒" },
    { "word": "PEN", "level": "easy", "emoji": "🖊️" },
    { "word": "BED", "level": "easy", "image": "assets/img/bed.jpg", "emoji": "🛏️" },
    { "word": "EGG", "level": "easy", "emoji": "🥚" },
    { "word": "BOX", "level": "easy", "image": "assets/img/box.jpg", "emoji": "📦" },
    { "word": "CAR", "level": "easy", "emoji": "🚗" },
    { "word": "VAN", "level": "easy", "emoji": "🚐" },
    { "word": "JAR", "level": "easy", "emoji": "🫙" },

    { "word": "FISH", "level": "normal", "image": "assets/img/fish.jpg", "emoji": "🐟" },
    { "word": "BOAT", "level": "normal", "image": "assets/img/boat.jpg", "emoji": "⛵" },
    { "word": "DUCK", "level": "normal", "emoji": "🦆", "sound": "Quack quack!" },
    { "word": "FROG", "level": "normal", "emoji": "🐸", "sound": "Ribbit!" },
    { "word": "LION", "level": "normal", "emoji": "🦁", "sound": "Roar!" },
    { "word": "BALL", "level": "normal", "emoji": "⚽" },
    { "word": "TREE", "level": "normal", "emoji": "🌳" },
    { "word": "CAKE", "level": "normal", "emoji": "🎂" },
    { "word": "BOOK", "level": "normal", "emoji": "📖" },
    { "word": "KITE", "level": "normal", "emoji": "🪁" },
    { "word": "STAR", "level": "normal", "emoji": "⭐" },
    { "word": "MILK", "level": "normal", "emoji": "🥛", "say": "some milk" },
    { "word": "DRUM", "level": "normal", "emoji": "🥁" },
    { "word": "SHIP", "level": "normal", "emoji": "🚢" },
    { "word": "BELL", "level": "normal", "emoji": "🔔" },
    { "word": "NEST", "level": "normal", "emoji": "🪺" },

    { "word": "HORSE", "level": "hard", "emoji": "🐎", "sound": "Neigh!" },
    { "word": "TIGER", "level": "hard", "emoji": "🐅", "sound": "Roar!" },
    { "word": "APPLE", "level": "hard", "emoji": "🍎" },
    { "word": "MANGO", "level": "hard", "emoji": "🥭" },
    { "word": "HOUSE", "level": "hard", "emoji": "🏠" },
    { "word": "CHAIR", "level": "hard", "emoji": "🪑" },
    { "word": "TRAIN", "level": "hard", "emoji": "🚆" },
    { "word": "CLOCK", "level": "hard", "emoji": "🕐" }
  ],

  "map": [
    { "id": "LBY", "country": "Libya",   "level": "easy", "fact": "Libya is next to Egypt. It is mostly desert." },
    { "id": "DZA", "country": "Algeria", "level": "easy", "fact": "Algeria is the biggest country in Africa." },
    { "id": "EGY", "country": "Egypt",   "level": "easy", "fact": "Egypt has the river Nile and the pyramids." },
    { "id": "SDN", "country": "Sudan",   "level": "easy", "fact": "The river Nile flows through Sudan." },
    { "id": "TCD", "country": "Chad",    "level": "easy", "fact": "Chad has Lake Chad." },
    { "id": "NER", "country": "Niger",   "level": "easy", "fact": "Niger is named after the river Niger." },
    { "id": "TUN", "country": "Tunisia", "level": "hard", "fact": "Tunisia is small, and it is by the sea." }
  ],

  "baby": [
    { "parent": "dog",       "baby": "puppy",       "parentEmoji": "🐕", "babyImg": "assets/img/puppy.jpg", "babyEmoji": "🐶", "group": "pets", "level": "easy",   "similar": ["lion", "horse"],   "sound": "Woof woof!" },
    { "parent": "cat",       "baby": "kitten",      "parentEmoji": "🐈", "babyImg": "assets/img/cat.jpg",   "babyEmoji": "🐱", "group": "pets", "level": "easy",   "similar": ["dog", "lion"],     "sound": "Meow!" },
    { "parent": "cow",       "baby": "calf",        "parentImg": "assets/img/cow.jpg", "parentEmoji": "🐄", "babyEmoji": "🐮", "group": "farm", "level": "easy", "similar": ["dog", "horse"], "sound": "Moo!" },
    { "parent": "hen",       "baby": "chick",       "parentEmoji": "🐔", "babyEmoji": "🐥", "group": "birds", "level": "easy",  "similar": ["duck", "butterfly"], "sound": "Cluck cluck!" },
    { "parent": "duck",      "baby": "duckling",    "parentEmoji": "🦆", "babyEmoji": "🦆", "group": "birds", "level": "easy",  "similar": ["hen", "frog"],     "sound": "Quack quack!" },
    { "parent": "goat",      "baby": "kid",         "parentEmoji": "🐐", "babyEmoji": "🐐", "group": "farm", "level": "easy",   "similar": ["sheep", "dog"],    "sound": "Maa maa!" },
    { "parent": "sheep",     "baby": "lamb",        "parentEmoji": "🐑", "babyEmoji": "🐑", "group": "farm", "level": "easy",   "similar": ["goat", "cat"],     "sound": "Baa baa!" },
    { "parent": "horse",     "baby": "foal",        "parentEmoji": "🐎", "babyEmoji": "🐴", "group": "farm", "level": "easy",   "similar": ["cow", "dog"],      "sound": "Neigh!" },
    { "parent": "elephant",  "baby": "calf",        "parentEmoji": "🐘", "babyEmoji": "🐘", "group": "wild", "level": "easy",   "similar": ["sheep", "goat"],   "sound": "Pawoo!" },
    { "parent": "lion",      "baby": "cub",         "parentEmoji": "🦁", "babyEmoji": "🦁", "group": "wild", "level": "easy",   "similar": ["cat", "dog"],      "sound": "Roar!" },
    { "parent": "kangaroo",  "baby": "joey",        "parentEmoji": "🦘", "babyEmoji": "🦘", "group": "wild", "level": "normal", "similar": ["horse", "goat"] },
    { "parent": "frog",      "baby": "tadpole",     "parentEmoji": "🐸", "babyImg": "assets/img/tadpole.svg", "babyEmoji": "🐸", "group": "small", "level": "hard", "similar": ["butterfly", "duck"], "sound": "Ribbit!" },
    { "parent": "butterfly", "baby": "caterpillar", "parentEmoji": "🦋", "babyEmoji": "🐛", "group": "small", "level": "hard", "similar": ["frog", "hen"] }
  ]
};
