# LETRAX — Infinite Wordle

<p align="center">
  <img src="https://img.shields.io/badge/stack-HTML%20%2B%20CSS%20%2B%20JS-blueviolet?style=flat-square" alt="Stack">
  <img src="https://img.shields.io/badge/dependencies-zero-brightgreen?style=flat-square" alt="Zero Dependencies">
  <img src="https://img.shields.io/badge/deploy-Vercel-black?style=flat-square" alt="Vercel">
  <img src="https://img.shields.io/badge/PWA-ready-00e5a0?style=flat-square" alt="PWA Ready">
</p>

An unlimited Wordle clone with English 5-letter words. No daily limits — play as many rounds as you want.

## Features

- **Unlimited games** — no once-a-day restriction, play endlessly
- **500+ English words** — curated list of common 5-letter words
- **Persistent stats** — tracks games played, win %, streak, best streak, and guess distribution via `localStorage`
- **PWA support** — installable on mobile home screens, works offline via Service Worker
- **Virtual + physical keyboard** — tap on-screen keys or type on your keyboard
- **Dark neon theme** — dark background with green/orange/purple neon accents and glow effects
- **Responsive** — adapts to any screen size, including small mobile devices
- **3 difficulty modes** — Easy (hints), Normal (classic), Hard (timed) with separate scoring
- **Points system** — earn more points on harder difficulties and fewer guesses
- **Animations** — tile flip reveals, shake on invalid input, bounce on win

## How to Play

1. Type a 5-letter English word and press **Enter**
2. Tiles change color to show how close your guess is:
   - **Green** — correct letter in the correct position
   - **Orange** — correct letter in the wrong position
   - **Gray** — letter is not in the word
3. You have **6 attempts** to guess the word
4. After each round (win or lose), click **Play Again** for a new word

## Tech Stack

| Layer     | Technology                      |
|-----------|---------------------------------|
| Markup    | HTML5                           |
| Styling   | CSS3 (custom properties, grid, flexbox, animations) |
| Logic     | Vanilla JavaScript (ES6+)       |
| Fonts     | Google Fonts (Space Mono, Outfit)|
| Deploy    | Vercel (static)                 |
| PWA       | Inline Service Worker + Web App Manifest |

Zero build step. Zero dependencies. Single HTML file.

## Project Structure

```
Wordle_Letrax/
├── public/
│   ├── index.html         # HTML structure + script imports
│   ├── manifest.json      # PWA manifest
│   ├── css/
│   │   └── style.css      # All styles (theme, tiles, keyboard, modal)
│   └── js/
│       ├── words.js       # Word list + valid set
│       ├── stats.js       # Stats persistence + modal rendering
│       ├── ui.js          # Toast, animations, modal controls
│       ├── game.js        # Core game logic (board, keyboard, evaluate)
│       └── app.js         # Initialization + event listeners + SW
├── docs/
│   └── PLAN_CLOUD_STATS.md  # Plan for Supabase cloud sync
├── package.json           # Project metadata
├── vercel.json            # Vercel deployment config
└── README.md
```

## Running Locally

Just open the HTML file in a browser:

```bash
# Option 1: direct open
open public/index.html

# Option 2: local server (any will do)
npx serve public
```

## Deploy to Vercel

### Via Dashboard

1. Push this repo to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Deploy — no configuration needed

### Via CLI

```bash
npm i -g vercel
vercel
```

The [vercel.json](vercel.json) already configures the output directory (`public`), SPA rewrites, and cache headers.

## Stats & Persistence

All statistics are stored in `localStorage` under the key `letrax-stats-en`:

| Stat        | Description                          |
|-------------|--------------------------------------|
| Played      | Total games completed                |
| Win %       | Percentage of games won              |
| Streak      | Current consecutive wins             |
| Best        | Longest win streak ever              |
| Distribution| Histogram of guesses needed (1–6)    |

Stats persist across sessions and are never sent to any server.

## License

MIT
