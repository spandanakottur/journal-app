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
| `src/lib/themeAnalyser.js` | Scores entry text against expanded dict → `{ themes, keywords, emotionDensity, sentenceLengthSpike }` |
| `src/lib/themeExpander.js` | Fetches Datamuse weekly, caches expanded dict in `journal_theme_dict` localStorage key |
| `src/data/prompts.js` | Static prompt library — 9 categories, 3 registers, hobby packs |
| `src/data/themeKeywords.js` | Base seed words per category (20–30 each), used as Datamuse query seeds |
| `src/screens/OnboardingScreen.jsx` | 5-step Session 1 onboarding flow |
| `src/screens/JournalScreen.jsx` | Main journal — today / entries / map tabs |
| `src/components/ClusterView.jsx` | D3 force-directed word cloud + entry constellations (zoom-triggered). Exports `CATEGORY_COLORS` and `ZoomControls` |
| `src/components/RiverView.jsx` | Vertical swimlane timeline — 9 category columns, time top→bottom. Imports shared exports from ClusterView |
| `docs/design-decisions.md` | Full prompt system design, media layer scope, research context, map views design |
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
| Theme analysis pipeline | ✅ Built | `themeAnalyser.js` + `themeExpander.js` + `themeKeywords.js` — runs at entry save time, retroactive migration on boot |
| D3 cluster view | ✅ Built | Word cloud (collapsed) + entry constellations (expanded) — zoom is the trigger |
| D3 river view | ✅ Built | Vertical swimlanes, 9 columns (one per category), time flows top→bottom, dots clickable |
| Session 2 onboarding | 🔲 Not built | Hobbies — surfaces naturally during use |
| Session 3 onboarding | 🔲 Not built | Writing preferences |
| Session 4 onboarding | 🔲 Not built | Intention-setting |
| Intention bias in prompts | 🔲 Not wired | `profile.intention` is saved but not consulted by promptSelector |
| Media tracking layer | 🔲 Not built | Schema exists, weekly prompt schedule ready in promptSelector |

---

## 9. Map Views — ClusterView + RiverView

### Shared exports from `ClusterView.jsx`

Both map components live under `src/components/`. `ClusterView.jsx` owns two exports that
`RiverView.jsx` re-uses:

```js
export const CATEGORY_COLORS   // { identity, emotions, … } — one muted hex per category
export function ZoomControls   // { onIn, onOut, onReset } — ＋ / − / ↺ button group
```

Import pattern in `RiverView`:
```js
import { CATEGORY_COLORS, ZoomControls } from './ClusterView.jsx'
```

---

### ClusterView

**Two display modes, triggered by zoom level:**

| Mode | Zoom scale | What renders |
|---|---|---|
| Collapsed | < 2.2× | Word cloud — one node per unique keyword, sized by total weight |
| Expanded | ≥ 2.2× | Entry constellations — dated anchor circle + keyword satellites |

The `EXPAND_THRESHOLD = 2.2` constant controls the crossover.

**Data preparation (both via `useMemo([entries])`):**

- `collapsedNodes` — deduplicated keyword nodes; `weight` = sum of weights across all entries
- `collapsedLinks` — pairs of keywords that appear in the same entry (creates clusters)
- `expandedNodes` — one `anchor__<entryId>` node per entry + one `<entryId>__<word>` node per keyword
- `expandedLinks` — one link per keyword back to its anchor (drives the satellite orbit)

**D3 + React hybrid approach:**
D3 manages SVG DOM directly inside `useEffect` (needed for ~60fps tick updates during force
simulation). React manages state-driven overlays only: `selectedEntry` (preview card),
`highlightedIds` (dimming), `isExpanded` (mode flag). This avoids React re-render bottlenecks
during animation.

**Zoom threshold detection:**
`zoomScaleRef` (a ref, not state) tracks the current scale on every zoom event without
triggering re-renders. Only calls `setIsExpanded` when the value crosses the threshold:
```js
const prev = zoomScaleRef.current
const next = event.transform.k
zoomScaleRef.current = next
if      (prev < EXPAND_THRESHOLD && next >= EXPAND_THRESHOLD) setIsExpanded(true)
else if (prev >= EXPAND_THRESHOLD && next < EXPAND_THRESHOLD) setIsExpanded(false)
```

**`restoringRef` pattern:**
When `isExpanded` changes, the simulation `useEffect` re-runs and re-attaches the zoom
behavior. It must restore the previous transform (`svgRef.current.__zoom`) so the user's pan/
zoom position is preserved. But calling `svg.call(zoomBehavior.transform, savedTransform)`
fires a synthetic zoom event — which would trigger another threshold crossing and an infinite
loop. `restoringRef = { current: true }` blocks threshold checks for the duration of that one
synchronous call, then is set back to `false`.

`svg.interrupt()` is called before the restore to cancel any in-progress D3 transitions
(e.g. from the zoom buttons) that would otherwise fight the new transform.

**Force simulation parameters (tuned for calm motion):**

| Parameter | Value | Why |
|---|---|---|
| `velocityDecay` | `0.6` | D3 default is 0.4; higher = more friction, less oscillation |
| `alphaDecay` | `0.04` | Default ~0.023; higher = cools faster, nodes settle sooner |
| `charge` (collapsed) | `−30` | Softer repulsion so nodes don't fly wildly on load |
| `charge` (anchors) | `−180` | Pushes constellation anchors apart without launching them |
| `charge` (keywords) | `−8` | Minimal — they're held by their anchor link |
| `link distance` | `18` collapsed / `50` expanded | Short in word cloud, longer for satellite orbits |
| `link strength` | `0.3` collapsed / `0.7` expanded | Looser in word cloud, tighter for anchor threads |
| `center strength` | `0.08` | Gentle pull toward canvas centre — doesn't overwhelm charge |
| Collapse scatter radius | `±25% width/height` | Nodes re-seed near centre so they animate in, not from the edges |

**Position seeding on mode transitions:**

- Collapse → Expand: anchors start at the centroid of their keywords' last collapsed positions;
  keyword satellites start within 30px of their anchor → "burst outward" feel
- Expand → Collapse: nodes scattered ±25% from centre with velocities cleared (`delete vx/vy`)

**Highlight behaviour:**
`highlightedIds` is a `Set` of node IDs. The second `useEffect([highlightedIds])` applies
`opacity` to `<g.word-node>` elements — opacity propagates to all children (circle + text),
unlike `fill-opacity` which only affects fills.

**Clamping (collapsed mode only):**
In each tick, word nodes are clamped to the SVG bounds:
```js
d.x = Math.max(pad, Math.min(width - pad, d.x))
d.y = Math.max(pad, Math.min(height - pad, d.y))
```
Expanded mode is not clamped — constellations can extend slightly out of view and the user
can pan to reach them.

---

### RiverView

**Layout:** 9 columns (one per category), category labels rotated −45° at the top of each
column, time flows top → bottom. Oldest entry at the top of the SVG, newest at the bottom.

**Scales via `useMemo([entries])`:**
```js
const yScale = scaleTime()
  .domain([paddedMin, paddedMax])   // ± 12h padding so edge dots aren't clipped
  .range([0, innerHeight])
  .nice()
```
Height: `Math.max(420, days * 80)` — ~80px per day, minimum 420px for sparse datasets.

**Dot encoding:**
- X position: horizontal centre of the category column (`colX(i) = i * COL_WIDTH + COL_WIDTH / 2`)
- Y position: `yScale(new Date(entry.date))`
- Radius: `4 + emotionDensity * 6` (range 4–10px); fixed `5px` if `emotionDensity` is null
- Fill: `CATEGORY_COLORS[cat]`
- An entry appears as a dot in every column whose category is in `entry.analysis.themes`

**Connector lines:**
Within each column, entries are sorted by date and consecutive pairs are joined by a vertical
line (`strokeOpacity: 0.35`). Lines are rendered before dots so circles sit on top.

**D3 zoom:**
Three refs: `svgRef` (the `<svg>`), `zoomGRef` (the outer `<g>` that receives the D3 transform),
`zoomRef` (the zoom behavior instance). Two nested `<g>` elements separate the zoom transform
from the margin offset:
```jsx
<g ref={zoomGRef}>                        {/* D3 writes transform here */}
  <g transform={`translate(margin)`}>     {/* static margin offset */}
    ...
  </g>
</g>
```
Zoom is attached once on mount (`useEffect([], [])`). The event handler writes directly to
the DOM via `select(zoomGRef.current).attr('transform', event.transform)` — bypasses React
re-render entirely for smooth 60fps pan/zoom.

**Preview card:**
Clicking a dot calls `setSelectedEntry(entry)`. `PreviewCard` is `position: fixed; bottom: 0`
so it works inside the scrollable container without being clipped.

---

### MapTab (in `JournalScreen.jsx`)

Entry point for both views. Filters entries before passing them down:
```js
const analysedEntries = entries.filter(e => e.analysis.themes.length > 0)
```
Neither view component ever receives an un-analysed entry.

Empty state shown when `analysedEntries.length < 3` — "Write a few more entries and patterns
will start to appear here."

Toggle: `cluster · river` plain-text buttons, active state = `--blue-600`, inactive = `--gray-400`.

---

## 10. Where to add things

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
