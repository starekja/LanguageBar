# LanguageBar

> A lightweight Chrome/Edge browser extension for active language learners. Select any text → get instant translation, click any word → see grammar, gender, plural, and examples. Powered by Google Translate (free) and Gemini AI (free tier).

[🇨🇿 Česká verze README](README.cs.md)

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![No build step](https://img.shields.io/badge/build-none-brightgreen)

## What it does

LanguageBar helps you train **active language production** while reading articles in your native language. Highlight a sentence → see how a native speaker would say it in your target language. Click any word in the translation to get a full dictionary entry: gender, article, plural form, multiple meanings, and example sentences.

When you want to understand the grammar, click the **GRAMMAR** button. Gemini AI acts as a tutor — it picks 1–2 of the most useful grammar points from the actual sentence and explains them in plain language (no jargon like "accusative" or "preterite"). It uses four teaching modules: verb position, cases & articles, sentence frame, and word choice.

Toggle the extension on/off with **Ctrl+B**. Or create your own shorcut

## Features

- 🚀 **Instant translation** of selected text via Google Translate (free, unlimited)
- 📖 **Rich word details** on click — gender, article, plural, definitions, example sentences (Gemini, lazy)
- 🎓 **Tutor-style grammar analysis** — modular, in plain language, no linguistic jargon
- 🔊 **Text-to-speech** — built-in Web Speech API
- 🌐 **3 target languages** — switch between them with one click
- ⌨️ **Keyboard shortcut** — Ctrl+B to toggle
- 📋 **Copy to clipboard** — formatted for spreadsheets (`word TAB translation`)
- 🌱 **No build step** — pure JavaScript, easy to read and modify
- 🔒 **Shadow DOM** isolation — won't break host page styles

## Quick start

### 1. Get a free Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **Create API key**
3. Copy the key — you'll need it in step 4 below

> 💡 **Tip:** Create a second key in a different Google Cloud project. The extension supports two keys with automatic fallback when one hits the daily rate limit. Effectively doubles your free tier.

### 2. Download the extension

Either:
- **Clone this repo:** `git clone https://github.com/starekja/languagebar.git`
- Or **download as ZIP** (green Code button → Download ZIP) and extract somewhere persistent (e.g. `Documents/LanguageBar/`)

### 3. Load it in your browser

#### Chrome / Edge / Brave / Opera

1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Toggle **Developer mode** in the top-right corner
3. Click **Load unpacked**
4. Select the `extension/` folder from this repo

That's it.

### 4. Configure

1. Click the LanguageBar icon in your toolbar → **Options**
2. Paste your Gemini API key
3. (Optional) Paste a backup key from a different project
4. Pick 3 translation languages (e.g. `de`, `en`, `fr`)
5. Pick the explanation language (the one you understand — e.g. `cs` for Czech)
6. Click **Save**

### 5. Use it

- Select any text on any web page → translation appears at the bottom
- Click any word in the translation → dictionary card opens
- Click the **GRAMMAR** button → tutor-style explanation
- Press **Ctrl+B** to toggle the extension on/off

## How it works (architecture)

```
User selects text
       │
       ▼
┌─────────────────────┐
│  Google Translate   │  ◄─── Free, unlimited, no key needed
│  (sentence)         │
└─────────────────────┘
       │
       ▼
   Bar displays
       │
       ├── Click word ──► Gemini API ──► Dictionary card
       │                  (lazy, ~1 request)
       │
       └── Click GRAMMAR ─► Gemini API ──► Tutor analysis
                            (lazy, ~1 request)
```

**Why this split?** Gemini's free tier is **20 requests/day per key** for Flash Lite. If we called Gemini on every translation, you'd hit the limit in minutes. By using Google Translate for the bulk of work and Gemini only when you actually need rich info, the free tier lasts much longer.

## Tech stack

- **Manifest V3** — Chrome/Edge native format
- **Pure JavaScript** — no React, no build step, no transpiler
- **Shadow DOM** — UI isolation from host page
- **Google Translate (unofficial endpoint)** — for sentence translation
- **Gemini 2.5 Flash Lite** — for dictionary and grammar (lazy)
- **Web Speech API** — for pronunciation (local, no network)

## Permissions explained

| Permission | Why |
|------------|-----|
| `storage` | Save your API keys and language preferences |
| `activeTab` | Read the selected text on the current page |
| `tabs` | Send the toggle on/off message across tabs |
| `https://generativelanguage.googleapis.com/*` | Gemini API for grammar/dictionary |
| `https://translate.googleapis.com/*` | Google Translate for sentence translation |

The extension does **not** collect, transmit, or store any of your reading history or selected text on third-party servers other than Google's own translate and Gemini APIs.

## Repo structure

```
languagebar/
├── extension/              # The actual extension (load this folder unpacked)
│   ├── manifest.json
│   ├── content.js          # Main logic, UI, API calls
│   ├── background.js       # Service worker for Ctrl+B shortcut
│   ├── options.html        # Settings page
│   ├── options.js          # Settings logic
│   ├── icon48.png
│   └── icon128.png
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md     # How it's built, design decisions
│   └── CONTRIBUTING.md     # How to contribute
├── README.md               # This file
├── README.cs.md            # Czech version
├── CHANGELOG.md            # Version history
└── LICENSE                 # MIT
```

## Customization

### Change the keyboard shortcut

Open `chrome://extensions/shortcuts` (or `edge://extensions/shortcuts`) and bind any key combo to LanguageBar.

### Change supported languages

Edit `extension/options.js` — there's a `LANGS` array with `[code, name]` pairs. Add or remove languages there.

### Customize grammar prompts

Open `extension/content.js` and find the `getGram` function. The prompt is plain text — modify it to fit your target language better. The four teaching modules (A/B/C/D) are designed for German, but the structure works for any language.

## Limitations

- **Google Translate** uses an unofficial endpoint. It's been stable for years but isn't an official API. Could in theory change.
- **Gemini free tier** = 20 RPD per key. Heavy users should consider creating a second project for a backup key (extension supports two keys natively).
- **Firefox** support is not included in this build (Manifest V3 has quirks). Could be added with minor changes.

## Roadmap / ideas

See [CHANGELOG.md](CHANGELOG.md) for what's done and what's coming.

Loose ideas for future iterations:
- Auto-export learned words to Google Sheets
- Spaced repetition quiz for words from recent pages
- Reading-level detection (is this article appropriate for my A2/B1 level?)
- Mobile companion via Tampermonkey

## Contributing

PRs and issues welcome. See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE). Use freely, fork freely, ship freely.

## Credits

- Built iteratively with **Claude** (AI by Anthropic) — about 20 iterations from idea to working tool
- Thanks to everyone who tested early versions and gave honest feedback
- Inspired by the frustration of every language learner who's ever switched browser tabs to look up a word

---

*Made with ❤️ for fellow language learners.*
