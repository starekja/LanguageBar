# Contributing to LanguageBar

Thanks for considering a contribution! This document explains how to set up the dev environment, the project conventions, and how to submit changes.

## Quick setup

There's no build step. The extension folder is the source code.

1. Clone the repo
2. Open `chrome://extensions/` → enable Developer mode → **Load unpacked** → select `extension/`
3. Edit any file in `extension/`
4. Click the reload icon on the extension card to apply changes
5. Test on any web page

For options page changes, right-click the extension icon → **Options** to test.

## Project structure

```
extension/         # The actual code
├── manifest.json  # Permissions, commands, scripts
├── content.js     # Main logic (~600 lines, all in one file by design)
├── background.js  # Service worker for keyboard shortcut
├── options.html   # Settings page markup
├── options.js     # Settings page logic
└── icon*.png      # Toolbar icons

docs/              # Documentation for contributors
├── ARCHITECTURE.md  # How it's built, why
└── CONTRIBUTING.md  # This file

README.md          # English readme (primary)
README.cs.md       # Czech readme
CHANGELOG.md       # Version history
LICENSE            # MIT
```

## What kind of contributions are welcome

**Yes please:**
- Bug fixes (especially for non-German target languages)
- New target languages in the `LANGS` array (`options.js`)
- UI translations for the `UI` object in `content.js` (currently CS, DE, EN, SK)
- Better grammar prompts for non-German languages
- Documentation improvements
- Reduced bundle size, faster startup
- Firefox manifest variant (would need a parallel `manifest.firefox.json`)

**Probably no:**
- Adding a build step (React, TypeScript, bundlers) — keeping it dependency-free is a feature
- Adding analytics or telemetry of any kind
- Adding paid API integrations as the default
- Major UI redesigns without prior discussion in an issue

## Code conventions

Reading `content.js` is the best way to understand the style. Key points:

### Use plain JavaScript

No frameworks. No transpilation. Code should run as-is in modern Chromium.

### Compactness over verbosity

Where it doesn't hurt readability, the code is compact:
- Single-letter variables for short-scoped values (`r`, `d`, `s`)
- Inline arrow functions for one-shot handlers
- Template strings for HTML

But always:
- Meaningful function names (`getDict`, `showLoad`, `startTimer`)
- Clear comments at section boundaries
- No clever tricks where a clear line works

### Single file `content.js`

Don't split `content.js` into modules. Loading multiple JS files in a content script is fine technically, but keeping it one file is **the** ergonomic choice — anyone can copy the file, paste into a sandbox, and understand it without resolving imports.

### CSS as template literal

All extension CSS lives in the `CSS` constant at the bottom of `content.js`. Keep selectors short (`.bar`, `.tr`, `.gri`) since they're scoped inside Shadow DOM.

## Testing checklist

Before submitting a PR, verify:

- [ ] Translation works for at least one language pair
- [ ] Word click opens the dictionary card
- [ ] Grammar button works on a 2+ word selection
- [ ] Grammar button is disabled for single-word selections
- [ ] Ctrl+B toggles on/off and shows the notification
- [ ] No console errors in the page where the extension is loaded
- [ ] No console errors in the extension's service worker (chrome://extensions/ → "service worker")
- [ ] The extension still works after a manual reload

## Pull request process

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-thing`
3. Make your changes in `extension/`
4. Test manually using the checklist above
5. Update `CHANGELOG.md` under `[Unreleased]` if your change is user-facing
6. Push and open a PR with a clear description of what changed and why

## Reporting bugs

When opening an issue, include:
- Browser + version (e.g. `Chrome 132`)
- OS (Windows / macOS / Linux)
- The exact steps to reproduce
- What you expected vs. what happened
- Any console errors (open DevTools → Console)
- A short text sample that triggers the bug, if relevant

## Suggesting features

Open an issue with the `enhancement` label. Tell me:
- What problem you're solving (use case, not solution)
- Why current behavior doesn't work
- What you'd ideally want

I'll read every issue. Response times vary but I'll get back to you.

## Code of conduct

Be kind, be specific, be patient. This project is built for fellow language learners — let's keep it friendly.

## License

By contributing, you agree your contributions will be licensed under the MIT License.
