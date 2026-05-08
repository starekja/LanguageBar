# Architecture

This document explains how LanguageBar is built and why specific design choices were made.

## Goals

1. **Stay free** — no paid APIs, no credit card required.
2. **Stay fast** — translation should appear in <500ms.
3. **Stay simple** — no build step, no dependencies, easy to read and modify.
4. **Stay useful for learning** — not just translation, but rich linguistic info.

## High-level flow

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (host page)                                         │
│                                                              │
│  User selects text                                           │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────────────────────────────────────┐            │
│  │  content.js (injected into every page)       │            │
│  │                                              │            │
│  │  ┌─────────────────────────────────────┐    │            │
│  │  │  Shadow DOM (isolated from page)    │    │            │
│  │  │                                     │    │            │
│  │  │  - Bottom bar UI                    │    │            │
│  │  │  - Word detail card                 │    │            │
│  │  │  - Grammar analysis panel           │    │            │
│  │  └─────────────────────────────────────┘    │            │
│  └─────────────────────────────────────────────┘            │
│        │                                                     │
│        ▼                                                     │
│  ┌──────────────────────┐    ┌──────────────────────┐       │
│  │  Google Translate    │    │  Gemini API          │       │
│  │  (sentence)          │    │  (lazy: word/grammar)│       │
│  │                      │    │                      │       │
│  │  Free, unlimited     │    │  20 RPD free tier    │       │
│  └──────────────────────┘    └──────────────────────┘       │
└─────────────────────────────────────────────────────────────┘

         ┌─────────────────────────────┐
         │  background.js (service     │
         │  worker)                    │
         │  - Listens for Ctrl+B       │
         │  - Broadcasts toggle to all │
         │    tabs                     │
         └─────────────────────────────┘
```

## Key design decisions

### Why two different APIs?

Initially everything was on Gemini. One request returned translation + grammar + dictionary. It worked, but:

- Free tier = 20 requests/day. You'd hit the limit in 10 minutes of active reading.
- Big prompts = slow responses. The bar would auto-hide before translation arrived.

The fix: split responsibility.

| Job | API | Cost | Speed |
|-----|-----|------|-------|
| Sentence translation | Google Translate (unofficial endpoint) | Free, unlimited | <300ms |
| Word dictionary | Gemini 2.5 Flash Lite | Free, 20 RPD | ~1-2s |
| Grammar analysis | Gemini 2.5 Flash Lite | Free, 20 RPD | ~1-2s |

Now Gemini is only called when the user **explicitly** wants rich info. Casual reading uses zero Gemini quota.

### Why no build step?

I'm not a professional developer. Every dependency I add is something I have to maintain when something breaks.

- No React → no Virtual DOM, no JSX, no transpiler. Just `document.createElement` and template literals.
- No CSS framework → just plain CSS in a single string at the bottom of `content.js`.
- No bundler → the extension folder you load is exactly the source code.

Result: ~600 lines of `content.js` that anyone can read top-to-bottom and understand.

### Why Shadow DOM?

Some sites (especially those with `* { all: revert }` or aggressive CSS) would break the bar's styling. Shadow DOM creates an isolated DOM tree where:
- Host page CSS doesn't leak in
- The bar's CSS doesn't leak out
- Click events still bubble to the page when needed (via `composedPath()`)

### Why dual API keys?

Gemini's free tier limit is **per key**, not per user. By creating two API keys in two different Google Cloud projects, you get 40 RPD instead of 20. The extension automatically falls back to the second key when the first hits the limit (returns 429).

This is a legitimate use of the free tier — you're not violating any terms by using multiple projects under your single Google account.

### Why Manifest V3?

It's the only option for new Chrome extensions as of 2024. V2 is being phased out. V3 has stricter security (no remote code execution, mandatory service workers) but works fine for our use case since we don't need persistent background pages.

## Code layout

### `content.js` — main logic (~600 lines)

```
┌──────────────────────────────────────────────────────────┐
│  CONSTANTS (debounce, max chars, model name, language    │
│  names, UI translations)                                 │
├──────────────────────────────────────────────────────────┤
│  STATE (current selection, active language, loading flag)│
├──────────────────────────────────────────────────────────┤
│  SHADOW DOM SETUP (ensHost, CSS injection)               │
├──────────────────────────────────────────────────────────┤
│  UI RENDERING                                            │
│  - showLoad: shows loading bar                           │
│  - showRes: shows translation result                     │
│  - showErr: shows error                                  │
│  - togHtml: language toggle buttons                      │
│  - wireBar: attaches event listeners                     │
├──────────────────────────────────────────────────────────┤
│  TIMER (startTimer, stopTimer, hover handlers)           │
├──────────────────────────────────────────────────────────┤
│  API CALLS                                               │
│  - gTr: Google Translate                                 │
│  - getDict: Gemini word dictionary (lazy)                │
│  - getGram: Gemini grammar analysis (lazy)               │
├──────────────────────────────────────────────────────────┤
│  CHAT-STYLE GRAMMAR RENDERING                            │
│  - renderGram: JSON modules → HTML                       │
│  - renderVisualMap: tokens → colored chips               │
├──────────────────────────────────────────────────────────┤
│  EVENT LISTENERS (mouseup, keydown, runtime.onMessage)   │
├──────────────────────────────────────────────────────────┤
│  CSS (single template string at bottom)                  │
└──────────────────────────────────────────────────────────┘
```

### `background.js` — service worker (~10 lines)

Listens for `Ctrl+B` keyboard command. When fired:
1. Reads current `lbActive` state from storage
2. Toggles it
3. Broadcasts a message to all open tabs
4. Each tab's `content.js` receives the message and shows a toast notification

### `options.html` + `options.js` — settings page

Loads on `chrome-extension://...` URL. Stores:
- `lpKeys` — array of API keys (1-2)
- `lpL1`, `lpL2`, `lpL3` — three target language codes
- `lpLE` — explanation language code
- `lbActive` — current toggle state (set by background.js)

## Prompt design

### Word dictionary prompt

Returns structured JSON:
```json
{
  "base_form": "der Hund",
  "pos": "podstatné jméno",
  "gender": "mužský",
  "plural": "Hunde",
  "meanings": [
    { "def": "domácí zvíře", "example": "...", "example_tr": "..." }
  ]
}
```

Key constraints:
- Article (der/die/das) is folded into `base_form` for German
- All explanatory text is in the user's chosen explanation language
- Examples come in pairs (target language + translation)

### Grammar analysis prompt

Returns array of 1-3 teaching modules. Each module has:
```json
{
  "type": "A | B | C | D",
  "title": "...",
  "explanation": "...",
  "visual_map": ["[Morgen]", "[V2: helfe]", "[ich]", "[dir]"],
  "tip": "..."
}
```

The prompt explicitly forbids linguistic Latin jargon and requires plain-language equivalents. This is the single biggest quality lever — the same Gemini model produces unhelpful jargon by default and excellent tutor explanations with the right prompt.

## Testing notes

The extension has been tested on:
- Chrome 130+ (primary)
- Microsoft Edge 130+
- Articles in Czech, English (translating to German, French, Spanish)
- Long-form content (Wikipedia, news sites)
- Single-page apps (Twitter, Gmail) — Shadow DOM isolation matters here

Not tested on:
- Firefox (build doesn't include the gecko-specific manifest)
- Mobile browsers (extension API not supported)
- Sites with strict Content Security Policy that blocks injected scripts

## Performance characteristics

- **Bundle size:** ~28 KB total (content.js + background.js + options.js)
- **Memory:** Shadow DOM root + one bar element — negligible
- **Network:** Zero passive traffic; only on user action (selection or click)
- **CPU:** Idle except during active translation (200-500ms bursts)

The extension makes **zero network requests** until the user actively selects text or clicks a word. There is no telemetry, no analytics, no background sync.
