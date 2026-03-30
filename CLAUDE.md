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

## What's Already Built

- `src/lib/storage.js` — storage abstraction (profile, entries, free text budget, settings)
- `src/data/prompts.js` — prompt library with three-tier hobby structure + `getHobbyPrompt` selector
- `src/lib/promptSelector.js` — exploit/explore logic with engagement scoring
- `src/hooks/useAppState.jsx` — global state + localStorage hydration via React Context
- `src/screens/OnboardingScreen.jsx` — Session 1 onboarding (four steps, indicator dots)

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

## Reference Docs

Pull these in with @ when working on the relevant area:

- `@docs/design-decisions.md` — full prompt system design, media layer scope, research distillations
- `@docs/onboarding-plan.md` — four-session onboarding structure (Sessions 2–4 not yet built)
