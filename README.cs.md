# LanguageBar

> Lehký doplněk pro Chrome/Edge pro aktivní studium jazyků. Označ text → okamžitý překlad. Klikni na slovo → vidíš rod, člen, množné číslo a příklady. Funguje na bázi Google Translate (zdarma) a Gemini AI (free tier).

[🇬🇧 English README](README.md)

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue) ![Licence](https://img.shields.io/badge/licence-MIT-green) ![Bez build kroku](https://img.shields.io/badge/build-none-brightgreen)

## Co to umí

LanguageBar pomáhá trénovat **aktivní produkci v cílovém jazyce** při čtení článků v rodném jazyce. Označ větu → uvidíš, jak by ji řekl rodilý mluvčí. Klikni na libovolné slovo v překladu a otevře se ti slovníková karta: rod, člen, množné číslo, několik významů a příkladové věty.

Když chceš pochopit gramatiku, klikni na tlačítko **GRAMATIKA**. Gemini AI se zachová jako lektor — vybere si 1–2 nejužitečnější jevy z konkrétní věty a vysvětlí je v lidské řeči (žádné „akuzativ" nebo „préteritum"). Používá čtyři výukové moduly: pozice slovesa, pády a členy, větný rámec, slovní volba.

Doplněk vypneš/zapneš klávesovou zkratkou **Ctrl+B**. Klávesovou zkratku lze nastavit dle svých preferencí

## Hlavní funkce

- 🚀 **Okamžitý překlad** označeného textu přes Google Translate (zdarma, neomezeno)
- 📖 **Bohaté detaily slov** po kliknutí — rod, člen, množné číslo, definice, příkladové věty (Gemini, lazy)
- 🎓 **Gramatická analýza ve stylu lektora** — modulární, v běžném jazyce, bez žargonu
- 🔊 **Hlasová výslovnost** — vestavěné Web Speech API
- 🌐 **3 cílové jazyky** — přepínání jedním klikem
- ⌨️ **Klávesová zkratka** — Ctrl+B pro vypnutí/zapnutí
- 📋 **Kopírování do schránky** — formátováno pro tabulky (`slovo TAB překlad`)
- 🌱 **Žádný build krok** — čistý JavaScript, snadno čitelné a upravitelné
- 🔒 **Shadow DOM** — neporve se se styly hostujícího webu

## Rychlý start

### 1. Získej free Gemini API klíč

1. Jdi na [Google AI Studio](https://aistudio.google.com/apikey)
2. Klikni na **Create API key**
3. Zkopíruj klíč — budeš ho potřebovat v kroku 4

> 💡 **Tip:** Vytvoř si druhý klíč v jiném Google Cloud projektu. Doplněk podporuje dva klíče s automatickým přepnutím na záložní, když první narazí na denní limit. Efektivně to zdvojí tvůj free tier.

### 2. Stáhni doplněk

Buď:
- **Naklonuj repo:** `git clone https://github.com/starekja/languagebar.git`
- Nebo **stáhni jako ZIP** (zelené tlačítko Code → Download ZIP) a rozbal někam, kde ti zůstane (např. `Documents/LanguageBar/`)

### 3. Nainstaluj v prohlížeči

#### Chrome / Edge / Brave / Opera

1. Otevři `chrome://extensions/` (nebo `edge://extensions/`)
2. Vpravo nahoře zapni **Vývojářský režim**
3. Klikni na **Načíst rozbalený**
4. Vyber složku `extension/` z tohoto repa

A je to.

### 4. Nastav

1. Klikni na ikonu LanguageBar v liště → **Možnosti**
2. Vlož svůj Gemini API klíč
3. (Volitelně) Vlož záložní klíč z jiného projektu
4. Vyber 3 jazyky pro překlad (např. `de`, `en`, `fr`)
5. Vyber jazyk vysvětlení (ten, kterému rozumíš — např. `cs` pro češtinu)
6. Klikni na **Save**

### 5. Použij

- Označ kdekoliv text → překlad se objeví dole
- Klikni na slovo v překladu → otevře se slovníková karta
- Klikni na **GRAMATIKA** → vysvětlení od lektora
- Stiskni **Ctrl+B** pro vypnutí/zapnutí doplňku

## Jak to funguje (architektura)

```
Uživatel označí text
       │
       ▼
┌─────────────────────┐
│  Google Translate   │  ◄─── Zdarma, neomezeno, bez klíče
│  (věta)             │
└─────────────────────┘
       │
       ▼
   Lišta se zobrazí
       │
       ├── Klik na slovo ──► Gemini API ──► Slovníková karta
       │                     (lazy, ~1 request)
       │
       └── Klik GRAMATIKA ─► Gemini API ──► Lektorská analýza
                             (lazy, ~1 request)
```

**Proč takové rozdělení?** Gemini má ve free tieru limit **20 requestů za den** na klíč pro Flash Lite. Kdyby se Gemini volal při každém překladu, vyčerpáš limit za pár minut. Tím, že velký objem práce dělá Google Translate a Gemini se volá jen když opravdu potřebuješ bohaté info, vystačí ti free tier mnohem déle.

## Tech stack

- **Manifest V3** — nativní formát Chrome/Edge doplňků
- **Čistý JavaScript** — žádný React, žádný build step, žádný transpiler
- **Shadow DOM** — izolace UI od hostujícího webu
- **Google Translate (neoficiální endpoint)** — pro překlad vět
- **Gemini 2.5 Flash Lite** — pro slovník a gramatiku (lazy)
- **Web Speech API** — pro výslovnost (lokálně, bez sítě)

## Vysvětlení oprávnění

| Oprávnění | Důvod |
|-----------|-------|
| `storage` | Uložení tvých API klíčů a jazykových preferencí |
| `activeTab` | Čtení označeného textu na aktuální stránce |
| `tabs` | Odeslání zprávy o vypnutí/zapnutí napříč záložkami |
| `https://generativelanguage.googleapis.com/*` | Gemini API pro gramatiku/slovník |
| `https://translate.googleapis.com/*` | Google Translate pro překlad vět |

Doplněk **neukládá** ani **neposílá** historii čtení nebo označený text na žádné servery třetích stran kromě samotných Google API.

## Struktura repa

```
languagebar/
├── extension/              # Samotný doplněk (tuhle složku načti unpacked)
│   ├── manifest.json
│   ├── content.js          # Hlavní logika, UI, API volání
│   ├── background.js       # Service worker pro Ctrl+B
│   ├── options.html        # Stránka nastavení
│   ├── options.js          # Logika nastavení
│   ├── icon48.png
│   └── icon128.png
├── docs/                   # Dokumentace
│   ├── ARCHITECTURE.md     # Jak je to postavené, designová rozhodnutí
│   └── CONTRIBUTING.md     # Jak přispívat
├── README.md               # Anglická verze
├── README.cs.md            # Tato česká verze
├── CHANGELOG.md            # Historie verzí
└── LICENSE                 # MIT
```

## Úpravy

### Změna klávesové zkratky

Otevři `chrome://extensions/shortcuts` (nebo `edge://extensions/shortcuts`) a přiřaď LanguageBaru jakoukoliv kombinaci kláves.

### Přidání podporovaných jazyků

V souboru `extension/options.js` najdeš pole `LANGS` s dvojicemi `[kód, název]`. Přidej/odeber jazyky tady.

### Úprava promptů pro gramatiku

V `extension/content.js` najdi funkci `getGram`. Prompt je čistý text — uprav ho tak, aby seděl jinému cílovému jazyku. Čtyři výukové moduly (A/B/C/D) jsou navržené pro němčinu, ale struktura funguje pro libovolný jazyk.

## Omezení

- **Google Translate** používá neoficiální endpoint. Roky funguje stabilně, ale není to oficiální API. Teoreticky se to může změnit.
- **Gemini free tier** = 20 RPD na klíč. Aktivní uživatelé by si měli vytvořit druhý projekt pro záložní klíč (doplněk podporuje dva klíče nativně).
- **Firefox** v tomto buildu není podporován (Manifest V3 má specifika). S drobnými úpravami by šel přidat.

## Roadmap / nápady

V [CHANGELOG.md](CHANGELOG.md) najdeš, co je hotové a co přijde.

Volné nápady do dalších iterací:
- Automatický export naučených slov do Google Sheets
- Spaced repetition kvíz pro slova z poslední čtené stránky
- Detekce úrovně textu (je tenhle článek vhodný pro mou A2/B1 úroveň?)
- Mobilní verze přes Tampermonkey

## Příspěvky

PR a issues vítány. Viz [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## Licence

MIT — viz [LICENSE](LICENSE). Použij volně, forkuj volně, sdílej volně.

## Poděkování

- Vyvinuto iterativně s **Claude** (AI od Anthropicu) — kolem 20 iterací od nápadu k funkčnímu nástroji
- Díky všem, kdo testovali rané verze a dali upřímnou zpětnou vazbu
- Inspirováno frustrací každého studenta jazyka, který kdy musel přepínat záložky kvůli překladu jednoho slova

---

*Vytvořeno s ❤️ pro studenty jazyků.*
