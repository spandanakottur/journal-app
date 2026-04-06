# Code Guide — Self-Discovery Journal App

A plain-language reference for navigating this codebase.
Pull this in with `@docs/code-guide.md` when you need orientation.

---

## 1. How the app boots

```
main.jsx
  └─ <App />
       └─ <AppProvider>          ← reads localStorage, sets isLoading = true
            └─ <AppContent>
                 isLoading = true  →  render nothing (hydrating)
                 isLoading = false →
                   isOnboarding (onboardingStep < 4)  →  <OnboardingScreen />
                   else                               →  <JournalScreen />
                 <ResetButton />   ← floats in top-right on every screen
```

`isOnboarding` is derived, not stored. It's simply `onboardingStep < 4`.
Updating `onboardingStep` in the profile is what transitions between screens.

---

## 2. Global state — `src/hooks/useAppState.jsx`

This is the **single source of truth** for the whole app.
Any component can call `useAppState()` to read or update state.
Never read/write localStorage directly in a component — use these instead.

| Key | Type | What it is |
|---|---|---|
| `profile` | object | User identity + onboarding progress |
| `entries` | array | Every journal entry ever written |
| `isLoading` | bool | `true` while localStorage is being read on boot |
| `budget` | object | `{ used, limit: 3, available, daysUntilReset }` |
| `onboardingStep` | number | 0–3 = in onboarding, 4 = complete |
| `isOnboarding` | bool | Derived: `onboardingStep < 4` |
| `updateProfile(updates)` | fn | Merges updates into profile + saves to localStorage |
| `addEntry(data)` | fn | Creates a new entry with UUID + timestamp, saves it |
| `resetProfile()` | fn | Clears all localStorage keys, resets React state |

### How Context works (quick explainer)

`AppProvider` is a wrapper component that holds state in one place.
Any component inside it can call `useAppState()` to get that state —
no prop-drilling needed. This is React Context.

The two-component split in `App.jsx` (`App` → `AppProvider` → `AppContent`)
exists because `useAppState()` must be called *inside* the provider, not above it.

---

## 3. Data models

### Profile — stored at `journal_profile` in localStorage

```js
{
  name:             string | null,   // what they want to be called
  intention:        string | null,   // 'understand' | 'thoughts' | 'process' (Session 1)
  hobbies:          [],              // declared in Session 2 (not built yet)
  writingMode:      'auto',          // 'journal' | 'conversation' | 'auto' (Session 3)
  depthPreference:  null,            // 'easy' | 'deep' (Session 3)
  onboardingStep:   0,               // 0–3 = in progress, 4 = done
  createdAt:        null,            // ISO timestamp, set at end of Session 1
}
```

`intention` is saved but not yet wired into prompt selection.
See the build status table for what's upcoming.

### Entry — stored at `journal_entries` (array) in localStorage

```js
{
  id:          string,    // UUID — never changes
  date:        string,    // ISO timestamp of when it was written
  prompt: {               // null for free text entries
    id:       string,
    text:     string,
    category: string,     // one of the 9 CATEGORIES
  },
  response:    string,    // the raw text the user wrote
  mode:        string,    // 'journal' | 'conversation'
  isFreeText:  bool,      // true = counted against the weekly budget
  context: {
    moodBefore: number | null,  // 1–5 scale
    tags:       [],
  },
  // --- Populated by future analysis pipelines ---
  analysis: {
    sentiment:           null,   // { score, label }
    keywords:            [],     // [{ word, weight }]
    themes:              [],     // e.g. ['identity', 'loss'] — will power the Map tab
    emotionDensity:      null,   // 0–1
    sentenceLengthSpike: false,
  },
  media: {
    form:                null,   // 'reading' | 'watching' | 'listening' | 'scrolling'
    intentional:         null,
    retentionConfidence: null,
    breadthSignal:       null,
    keywords:            [],
  },
}
```

> `analysis.themes[]` is the field that will eventually power the Map tab's
> cluster and river views. It's a stub for now.

---

## 4. Prompt selection — `src/lib/promptSelector.js`

**Entry point:** `selectPrompt()` — call this to get the prompt for today.
Returns a prompt object with an extra `reason` field.

```js
const prompt = selectPrompt()
// → { id, category, register, tone, text, followUp, minWeek, reason }
// reason: 'exploit' | 'explore' | 'media_interval' | 'deep_hobby' | 'fallback'
```

**Selection order (checked top to bottom):**
1. Media prompt — if ≥7 days since the last one, and ≥3 entries exist
2. Deep hobby prompt — if ≥14 days since last one, ≥5 entries, and hobbies are declared
3. Exploit (60% chance) — random unused prompt from the user's highest-engagement category
4. Explore (40% chance) — random unused prompt from a category they haven't used recently

**Hard constraints applied at every step:**
- Never >2 prompts in a row from the same category
- `fears` category locked until week 3 of use
- Prompts have a `minWeek` field — early-stage prompts appear from day 1, others are gated

**Engagement scoring** (used by exploit path):
- +1 for any entry in that category
- +2 if the entry was >300 characters
- +2 if `sentenceLengthSpike` was detected
- +1 if `emotionDensity` > 0.3

---

## 5. Free text budget — `getFreeTextBudget()` in `src/lib/storage.js`

**Rule:** 3 free text entries per week (Monday–Sunday). Resets every Monday.

```js
import { getFreeTextBudget } from '../lib/storage.js'
const budget = getFreeTextBudget()
// → { used: 1, limit: 3, available: true, daysUntilReset: 5 }
```

The `budget` object from `useAppState()` calls this automatically —
components should use that, not import `getFreeTextBudget` directly.

**Intentional product constraint:** The limit is 3/week by design.
It's not a technical limitation. Do not raise or remove it.

---

## 6. File map

| File | What it does |
|---|---|
| `src/main.jsx` | Entry point — mounts React into `#root` |
| `src/App.jsx` | AppProvider wrapper, screen routing, ResetButton |
| `src/index.css` | CSS custom properties (colour palette + font) + global reset |
| `src/hooks/useAppState.jsx` | Global state via React Context — the single source of truth |
| `src/lib/storage.js` | All localStorage reads/writes. Never bypass this. |
| `src/lib/promptSelector.js` | Prompt selection algorithm (exploit/explore logic) |
| `src/data/prompts.js` | Static prompt library — 9 categories, 3 registers, hobby packs |
| `src/screens/OnboardingScreen.jsx` | 5-step Session 1 onboarding flow |
| `src/screens/JournalScreen.jsx` | Main journal — today / entries / map tabs |
| `docs/design-decisions.md` | Full prompt system design, media layer scope, research context |
| `docs/code-guide.md` | This file |

---

## 7. CSS — available variables

Defined in `src/index.css`. Use these everywhere — don't introduce new colours.

```
Blues:  --blue-50  --blue-100  --blue-200  --blue-400  --blue-600  --blue-800
Grays:  --gray-50  --gray-100  --gray-300  --gray-400  --gray-500  --gray-700  --gray-900
Other:  --white    --font
```

**Common pairings:**
- Page background: `--blue-50`
- Cards: `--white` background, `1px solid --blue-100` border
- Primary button: `--blue-600` background, `--white` text
- Body text: `--gray-700`
- Muted text: `--gray-400` or `--gray-500`
- Active/accent: `--blue-600`

---

## 8. Build status

| Feature | Status | Notes |
|---|---|---|
| Session 1 onboarding | ✅ Built | name → intention → mood → warmup → completion |
| Journal screen shell | ✅ Built | tab bar + today / entries / map views |
| Prompt writing flow | ✅ Built | selectPrompt → textarea → save → done screen |
| Free text flow | ✅ Built | budget check → textarea → save → done screen |
| Past entries list | ✅ Built | reverse-chron, category tag, truncated preview |
| Thoughts map | 🔲 Placeholder | D3 cluster + river views — not yet built |
| Session 2 onboarding | 🔲 Not built | Hobbies — surfaces naturally during use |
| Session 3 onboarding | 🔲 Not built | Writing preferences |
| Session 4 onboarding | 🔲 Not built | Intention-setting |
| Intention bias in prompts | 🔲 Not wired | `profile.intention` is saved but not consulted by promptSelector |
| Entry analysis pipeline | 🔲 Stub | `analysis` fields in schema, not populated |
| Media tracking layer | 🔲 Not built | Schema exists, weekly prompt schedule ready in promptSelector |
| D3 cluster view | 🔲 Not built | Entries linked by shared `analysis.themes` |
| D3 river view | 🔲 Not built | Theme threads across time (x = date, y = theme lane) |

---

## 9. Where to add things

**New screen**
→ Create `src/screens/YourScreen.jsx`
→ Add a tab or route condition in `App.jsx` or `JournalScreen.jsx`

**New global state or action**
→ Add `useState` + function inside `AppProvider` in `useAppState.jsx`
→ Expose it in the `value` object at the bottom of `AppProvider`

**New localStorage key**
→ Add to `KEYS` constant in `storage.js`
→ Write a getter and setter function there
→ Never use the string key name anywhere else

**New prompts**
→ Add to the `prompts` array in `src/data/prompts.js`
→ Follow the existing shape: `{ id, category, register, tone, text, followUp, minWeek }`
→ IDs are permanent — once set, never change them (they're stored in entry history)

**New hobby pack**
→ Add to `hobbyPrompts` object in `prompts.js`
→ Key = the hobby's slug (e.g. `'rock-climbing'`)
→ Must stay inside the hobby world — see `docs/design-decisions.md` for the rules
