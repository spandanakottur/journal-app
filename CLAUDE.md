# Self-Discovery Journal App — Project Context

A self-discovery journaling web app for expressive people who want to understand themselves better.
Core purpose: give users the right hook to unlock genuine self-reflection.
This is NOT a general-audience product.

## Stack

- React + Vite (frontend)
- localStorage — profile, entry metadata, settings, free text budget
- IndexedDB — images only
- D3 — visualisations (not yet built)
- Lightweight free-tier backend — scraping pipeline ONLY (not yet built)
- No auth, no server-side user data

## Folder Structure

```
src/
  components/       # Reusable UI pieces
  screens/          # Full screens (Onboarding, Journal, etc.)
  hooks/            # useAppState.jsx — global state via React Context
  lib/              # storage.js, promptSelector.js
  data/             # prompts.js
```

## Commands

```bash
npm run dev         # Start dev server
npm run build       # Production build
npm run preview     # Preview production build
```

## Theme Analysis Pipeline

Runs at entry save time. Fully synchronous and client-side — no user text ever leaves the device.

**Files:**
- `src/data/themeKeywords.js` — base seed words per category (20–30 per category)
- `src/lib/themeExpander.js` — fetches related words from Datamuse API weekly, caches in `journal_theme_dict` localStorage key. Exposes `ensureDictionaryLoaded()` (async, fire-and-forget on boot) and `getExpandedDict()` (sync, used by analyser)
- `src/lib/themeAnalyser.js` — scores entry text against expanded dict, returns `{ themes, keywords, emotionDensity, sentenceLengthSpike }`. Called by `addEntry()` in `useAppState.jsx`

**How it works:**
1. On boot, `ensureDictionaryLoaded()` fires in the background — fetches Datamuse if cache is missing or >7 days old
2. When `addEntry()` is called, `analyseEntry(response, promptCategory)` runs synchronously against the in-memory dict
3. Primary theme = prompt's category (guaranteed). Secondary themes = categories scoring ≥ 0.03 with ≥ 2 token hits
4. Result is merged into `entry.analysis` before `saveEntry()` — so themes are always populated on save

**Datamuse API:** `api.datamuse.com/words?ml=<seed>&max=20` — fetches semantically related words for the first 3 seeds per category. No user data sent. No API key required.

**Retroactive migration:** On boot, any entry with `themes: []` is re-analysed in place and re-saved to localStorage. Runs once.

## What's Already Built

- `src/lib/storage.js` — storage abstraction (profile, entries, free text budget, settings)
- `src/data/prompts.js` — prompt library with three-tier hobby structure + `getHobbyPrompt` selector
- `src/lib/promptSelector.js` — exploit/explore logic with engagement scoring
- `src/hooks/useAppState.jsx` — global state + localStorage hydration via React Context
- `src/screens/OnboardingScreen.jsx` — Session 1 onboarding (four steps, indicator dots)
- `src/screens/JournalScreen.jsx` — main journal screen: today / entries / map tabs
- `docs/code-guide.md` — full codebase reference (boot flow, data models, file map, build status)

## Non-Negotiable Architecture Rules

**Client-side only.** All user data stays local. The backend exists solely for the scraping pipeline (future). Never suggest moving user data, journal entries, or profile data to a server.

**Media consumption layer is in scope. Recommendation engine is NOT.** The app will track media consumption habits (built into the current app, data stored separately to allow future spin-out). Do NOT build or suggest building a recommendation engine. Spandana needs more time to design how it will work.

**Free text budget: 3×/week.** Users can write freely three times per week. A gentle locked-state message appears when spent. Budget unlocks immediately after completing a prompt. Never suggest increasing this limit or removing it — it is an intentional product constraint.

## Prompt System Rules

**CRITICAL — Read before touching anything in `src/data/prompts.js` or `src/lib/promptSelector.js`.**

For full detail: `@docs/design-decisions.md`

Quick rules:
- Nine categories: Identity, Emotions, Relationships, Memory and Past, Future Self, Values and Beliefs, The Everyday, Fears and Shadows, Media and Consumption
- Three registers: psychological (~40%), abstract Rorschach (~25%), interest-based (~35%)
- Exploit/explore ratio: 60/40. Max two-in-a-row category streak before forced rotation
- Hobby prompts MUST stay inside the hobby world — subtle, never telegraphing psychological intent
- Direct psychological prompts belong in the psychological category, optionally anchored to interests as a suffix — NOT inside hobby prompts
- Three-tier hobby specificity: hobby-specific → category → universal. Always prefer the more specific tier. Universal templates are a LAST RESORT only
- Theme extraction uses external APIs (TMDB, Hardcover, MusicBrainz, Last.fm, Open Library, IGDB, iTunes Search) — never generative AI

## Design Language

Light, clean, calm. Whites and blues. The app should feel like a quiet space, not a productivity tool.
Prompt language should feel like a curious friend, not a therapist.
Never make the user feel analysed.

## Spandana is Learning React

Explain React patterns, JS methods, and design decisions as you go. When introducing something new:
- Say what it is
- Say why you're using it here (not just "it's best practice")
- Mention one alternative that was considered and why you didn't choose it

## Screen Routing

No router — conditional rendering in `src/App.jsx`:
- `isOnboarding` (`onboardingStep < 4`) → `<OnboardingScreen />`
- otherwise → `<JournalScreen />`

`onboardingStep` is stored in `profile` in localStorage and updated via `updateProfile({ onboardingStep: N })`.

## JournalScreen Architecture

Three tabs (tab bar fixed to top): `today · entries · map`

- **TodayTab** — internal view state machine: `choose → prompt | freewrite → done`
  - `hasDonePromptToday(entries)` gates the prompt button
  - `budget.available` gates the free write button
  - Calls `selectPrompt()` from `src/lib/promptSelector.js` on mount
- **EntriesTab** — reverse-chron list; click a card to open full-text detail view
- **MapTab** — placeholder card; D3 cluster + river views not yet built

## ResetButton

Two-step inline confirmation ("sure? yes / no") — avoids jarring `window.confirm`.
Positioned top-right in the nav bar. Styled to be quiet (gray, no border) — it is an escape hatch, not a call to action.

## CSS Conventions

All styles are inline JS objects (`style={...}`). No CSS modules, no Tailwind.
CSS variables defined in `src/index.css`: `--blue-100` through `--blue-600`, `--gray-200` through `--gray-500`.
Card pattern: white background, `1px solid var(--blue-100)` border, `borderRadius: '16px'`.

## Reference Docs

Pull these in with @ when working on the relevant area:

- `@docs/design-decisions.md` — full prompt system design, media layer scope, research distillations
- `@docs/onboarding-plan.md` — four-session onboarding structure (Sessions 2–4 not yet built)
- `@docs/code-guide.md` — full file map, data models, build status, where to add things
