# Changelog

All notable changes to LanguageBar will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] – 2026-05-08

Initial public release. Stable architecture after ~20 iterations.

### Added
- Sentence translation via Google Translate (free, unlimited, no API key)
- Word details on click — gender, article, plural, definitions, examples (Gemini AI, lazy)
- Modular grammar analysis with 4 teaching modules:
  - **A** — Verb position (V2 rule, word order)
  - **B** — Cases & articles (der/den/dem, declension)
  - **C** — Sentence frame (split verbs, compound tenses)
  - **D** — Word choice (idioms, false friends, collocations)
- Visual map for grammar (e.g. `[Morgen] › [V2: helfe] › [ich] › [dir]`)
- 3 selectable target languages with one-click switching
- Configurable explanation language (independent of target language)
- Keyboard shortcut `Ctrl+B` to toggle on/off
- Text-to-speech via Web Speech API
- Copy translation and word entries to clipboard (TAB-separated for spreadsheets)
- Dual API key support with automatic fallback (effectively doubles free tier)
- 30-second auto-hide timer, paused on hover
- Visible green progress bar showing remaining time
- Disable grammar button for single-word selections (use dictionary instead)
- Shadow DOM isolation for UI styling

### Technical
- Manifest V3 (Chrome/Edge native)
- Pure JavaScript, no build step
- Lazy AI calls — Gemini only invoked on explicit user action
- Single API call architecture for grammar (one request returns all modules)

## Roadmap

Loose ideas for future versions, no commitments:

### [2.1.0] — Planned
- [ ] Auto-export learned words to Google Sheets
- [ ] Spaced repetition quiz for recently-clicked words

### [2.2.0] — Considered
- [ ] Reading-level assessment for current article
- [ ] Per-website language preferences (auto-switch target language)
- [ ] Custom grammar prompts per language family

### Known limitations
- Google Translate uses an unofficial endpoint (stable but not guaranteed)
- Gemini free tier = 20 RPD per key; heavy users should configure two keys
- Firefox not yet supported in this build (Manifest V3 quirks)
