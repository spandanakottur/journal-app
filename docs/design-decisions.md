# Design Decisions & Research Context

Reference this file when working on the prompt system, media consumption layer, or onboarding.
In Claude Code: `@docs/design-decisions.md`

---

## Product Philosophy

The core differentiator: **journal-derived signals are more honest than implicit behavioural data.**
Platforms that rely on viewing history can only see what you consumed. This app learns from what you
actually thought and felt about it. This distinction must be preserved in every design decision.

Users disengage when they feel analysed. The app should never feel clinical. Every prompt should
feel like an invitation, not a test.

---

## Prompt System — Full Detail

### Nine Categories

1. Identity
2. Emotions
3. Relationships
4. Memory and Past
5. Future Self
6. Values and Beliefs
7. The Everyday
8. Fears and Shadows
9. Media and Consumption

### Three Registers

| Register | Proportion | Description |
|---|---|---|
| Psychological | ~40% | Direct self-reflection prompts, optionally anchored to user interests as a suffix |
| Abstract / Rorschach | ~25% | Open-ended, metaphorical, no clear "right" answer |
| Interest-based | ~35% | Grounded in user's hobbies — but stays inside the hobby world |

### Exploit / Explore Logic

- 60% exploit: serve prompts from categories the user engages with most
- 40% explore: rotate through less-used categories
- Hard cap: maximum two prompts from the same category in a row before forced rotation
- Engagement scoring lives in `src/lib/promptSelector.js`

### Hobby Prompt Rules — CRITICAL

This was a key correction during design. Do not revert it.

**Hobby prompts must stay inside the hobby world.** They are subtle. They do not telegraph
psychological intent. A prompt about climbing should feel like it's about climbing.

❌ Wrong: "When you're climbing, what does it reveal about how you handle fear in daily life?"
✅ Right: "What's a route you've been avoiding, and what keeps drawing you back to look at it?"

The psychological dimension emerges naturally — it is never stated.

**Direct psychological prompts** (e.g. "What fear are you carrying right now?") belong in the
psychological register of the relevant category (Fears and Shadows, Emotions, etc.).
They can optionally be anchored to a user's interest as a *suffix*, not as the frame.

❌ Wrong: "Your love of climbing makes me wonder — what are you most afraid of losing?"
✅ Right: "What are you most afraid of losing? (If it helps, think about what you'd miss most
   at the crag.)" [suffix anchor — the hobby grounds it, doesn't interrogate it]

### Three-Tier Hobby Specificity

Tiers are a specificity ladder, not equals. Always prefer the most specific tier available.

1. **Hobby-specific** — prompt written for this exact hobby (e.g. rock climbing)
2. **Category** — prompt written for the hobby's category (e.g. outdoor adventure sports)
3. **Universal** — generic interest-agnostic prompt

Universal templates are a LAST RESORT. Only use when no specific or category prompt exists.

---

## Media Consumption Layer — Scope

**In scope now:** Track what users consume (books, films, music, games, etc.) and surface patterns.
**Out of scope:** Building the recommendation engine. Spandana needs more time to design this.

### What the tracking layer does

- Prompted once a week (not on demand)
- Captures: form, intentionality (chosen vs. ambient), retention confidence, breadth signals
- Surfaces patterns to the user without recommending specific titles
- Data stored separately from journal entries to allow the layer to spin out later

### What it does NOT do

- Does not recommend titles
- Does not repeat genre (future recommendations should vary flavour within genre, not repeat genre)
- Does not use viewing history as the signal — journal entries are the signal

### Theme Extraction (future, scraping pipeline)

Deep-dive hobby prompts run once or twice a month. They collect genre and a recent title from
the user, then extract themes via external APIs. The title is never named in the prompt itself.

**APIs used for theme extraction:**
- TMDB — film/TV
- Hardcover — books (preferred over Goodreads)
- MusicBrainz + Last.fm — music
- Open Library — books (fallback)
- IGDB — games
- iTunes Search — music/podcasts

These feed a theme normaliser that maps to the internal taxonomy.
**Never use generative AI for theme extraction.**

---

## Research Distillations

### Why journal-derived signals beat behavioural data

Platforms using implicit signals (watch history, listen time) measure consumption, not meaning.
Two people can watch the same film for completely different reasons. Journal entries capture the
"why" — which is what makes recommendations personally meaningful rather than statistically
similar.

Research context: bidirectional media effects literature — Social Learning Theory (Bandura),
Cultivation Theory (Gerbner), Agenda-Setting, Priming. These describe how media shapes users;
the app inverts the relationship by letting users articulate how media lands for them.

ACM RecSys papers on filter bubbles informed the flavour-within-genre principle: repeating genre
deepens filter bubbles; varying expression within a genre maintains breadth while feeling coherent.

### Prompt design principles derived from research

- Users abandon journaling when prompts feel evaluative — phrasing matters more than topic
- Abstract / Rorschach prompts have high completion rates because there is no "wrong" answer
- Interest anchoring improves engagement but backfires when it feels like surveillance
- Frequency matters: prompting too often creates pressure; once a day max, skippable

---

## Theme Analysis — How `analysis.themes` Gets Populated

### Why we built this before the map

The map tab visualises patterns across entries grouped by theme. Without populated `themes[]` fields, there's nothing to visualise. Theme analysis is the data layer the map depends on.

### Approach: prompt category + keyword scoring

Two signals combined:

1. **Primary theme** = the prompt's `category` field (e.g. `'identity'`). This is always accurate because the prompt system already categorises every prompt. For free-text entries with no prompt, the top keyword scorer becomes primary.
2. **Secondary themes** = categories where keyword scoring crosses both a frequency threshold (≥ 0.03 normalised score) and a minimum hit count (≥ 2 tokens). This catches genuine cross-theme entries without false positives from single-word coincidences.

Up to 4 themes per entry. Deduplication ensures primary is never repeated in secondary.

### Why Datamuse for dictionary expansion

Base seed words (20–30 per category in `src/data/themeKeywords.js`) cover the most common vocabulary but miss synonyms, related terms, and informal variants.

**Datamuse** (`api.datamuse.com/words?ml=<seed>&max=20`) returns semantically related words for any seed term. It's:
- Free, no API key, no auth
- Rate-limit friendly (we fetch 3 seeds × 9 categories = 27 requests, once per week)
- Safe: we send category seed words (e.g. "identity", "fear") — **never journal text**

The expanded dictionary is cached in `localStorage` under `journal_theme_dict` with a `lastFetched` timestamp. TTL = 7 days. On boot, `ensureDictionaryLoaded()` fires in the background. If it fails, base seeds are the fallback — the analyser always has something to work with.

### Thresholds

- **Score ≥ 0.03**: normalised by dict size, so larger expanded dicts don't dominate. 0.03 ≈ ~3 hits per 100 words — enough to be meaningful, not so high that nuanced entries get missed.
- **Hits ≥ 2**: rules out single-word coincidences (e.g. "read" appearing once in a relationships entry shouldn't tag it as `media`).
- **Max 4 themes**: beyond 4 the signal degrades. Most entries touch 1–3 themes genuinely.

### Retroactive migration

Entries saved before the pipeline existed have `themes: []`. On app boot, `useAppState.jsx` detects these and re-analyses them in place, writing the result back to localStorage. This runs once per session until all entries have themes.

---

## Map Views — Cluster + River

### Why two views exist

The two views answer different questions:

- **Cluster** — *What are my recurring themes?* Zoom out = keyword patterns across all entries.
  Zoom in = individual entry constellations with their satellite keywords.
- **River** — *How have my themes changed over time?* Vertical swimlanes make it easy to scan
  a single category column and see how active it was across weeks.

Neither view is a "table" of entries. Both are spatial — patterns emerge from position and
proximity, not from reading rows.

---

### ClusterView — Design Decisions

#### Zoom as an action, not just a scale change

The zoom level is the mode switch. Below 2.2× the user sees the **word cloud** (keyword aggregate
view). At 2.2× the SVG reorganises into **entry constellations** (one dated anchor per entry,
keywords orbiting it as satellites).

This was chosen over:
- A toggle button — less discoverable, breaks the spatial metaphor
- Showing entry detail on click only — click already opens the preview card; zoom needed its
  own action so it wasn't wasted UI

The 2.2× threshold was chosen empirically: it's far enough from the reset scale (1×) that
accidental threshold crossings are rare, but reachable with two clicks of the `+` button.

#### Word cloud (collapsed mode)

Keyword nodes are **aggregated across entries**: if "grief" appears in three entries it becomes
one node weighted by the sum of those weights. This lets the user see their vocabulary patterns
without the noise of repeated identical words.

`×N` badges on multi-entry nodes tell the user a keyword spans more than one entry without
requiring them to click.

Links connect keyword pairs that co-appear in the same entry. This creates natural "entry
clusters" via the force simulation — related entries drift together without explicit grouping.

#### Entry constellations (expanded mode)

Each entry becomes a **dated anchor** (filled circle with category-coloured stroke + date label)
surrounded by its keyword satellites. Anchor–keyword threads are drawn as lines.

This mode is structurally different from the word cloud even when every keyword appears in
only one entry — the distinction is anchor circles vs. word text, date labels, and radial
spatial arrangement. The visual difference is always visible.

Anchors use high repulsion (`−180`) relative to keywords (`−8`) so constellations spread apart
without keywords flying off from their anchor.

#### D3 + React hybrid pattern

D3 manages the SVG DOM directly inside `useEffect`. React manages state-driven overlays only
(preview card, highlight opacity, mode flag). This keeps force simulation tick updates at ~60fps
without triggering React re-renders on every frame.

Two separate `useEffect` calls:
1. `[...nodes, ...links, isExpanded, handleNodeClick]` — rebuilds the full simulation. Runs
   only when data or mode changes.
2. `[highlightedIds]` — applies opacity changes via D3 selections. Runs on every node click
   without rebuilding the simulation.

#### Force simulation tuning — why these values

The default D3 `velocityDecay` (0.4) and charge strength (−120) produce noticeably erratic
motion on a small dataset where nodes start close together. The tuned values prioritise a calm,
deliberate animation:

| What changed | Default → New | Effect |
|---|---|---|
| `velocityDecay` | 0.4 → **0.6** | More friction; nodes slow down faster, less oscillation |
| `alphaDecay` | 0.023 → **0.04** | Simulation cools ~2× faster; nodes reach resting positions sooner |
| Charge (collapsed) | −120 → **−30** | Softer repulsion; words don't launch off-screen on load |
| Charge (anchors) | — → **−180** | Pushes constellations apart without erratic bursts |
| Link strength | 0.4 → **0.3** (collapsed) | Looser attraction; groups form without yanking |
| Collapse scatter | ±60% → **±25%** | Nodes re-seed near centre so they animate in, not from edges |

#### `restoringRef` — preventing infinite mode-switch loops

When `isExpanded` changes, the simulation `useEffect` re-runs and re-attaches the D3 zoom
behavior. It must restore the user's saved pan/zoom position via
`svg.call(zoomBehavior.transform, savedTransform)`. This fires a synthetic `zoom` event,
which would cross the threshold again and flip `isExpanded` back — an infinite loop.

`restoringRef = { current: true }` blocks threshold checks for the duration of that one
synchronous call. `svg.interrupt()` cancels any in-progress D3 transitions (e.g. from the
zoom buttons) before the restore so they don't fight the new transform.

---

### RiverView — Design Decisions

#### Why vertical, not horizontal

A horizontal layout (categories on Y, time on X) reads like a spreadsheet. A vertical layout
(categories as columns, time flowing down) reads like a river — the word in the name is
intentional. Time flows naturally downward; the user can see which themes a period of their
life touched by scanning across columns.

#### Dot encoding

Each dot encodes two variables simultaneously:
- **Position (Y)** = date — when the entry was written
- **Radius** = `emotionDensity` — how emotionally dense the entry was (`4 + density * 6`)

`emotionDensity` is `null` for un-expanded entries from before the analysis pipeline was
built; those get a fixed `5px` radius so the view is never broken by missing data.

An entry appears as a dot **in every column** whose category is in `entry.analysis.themes` —
not just the primary theme. This is deliberate: a cross-theme entry should be visible across
multiple lanes, not just one.

#### Connector lines

Within each column, consecutive entry dots (sorted oldest → newest) are joined by a vertical
line (`strokeOpacity: 0.35`). Lines are rendered before dots so circles sit on top.

This makes gaps in a category's timeline immediately visible — a long unconnected stretch
signals a period where that theme was absent from the user's writing.

#### Zoom implementation

The `<svg>` is wrapped in two `<g>` elements:
1. Outer `<g ref={zoomGRef}>` — D3 zoom writes its transform here directly via
   `select(zoomGRef.current).attr('transform', event.transform)`, bypassing React entirely
2. Inner `<g transform="translate(margin)">` — static margin offset, never touched by zoom

Zoom is attached once on mount. This means pan/zoom works at full 60fps inside an otherwise
fully React-rendered SVG.

---

## Onboarding — Four Sessions

Progressive onboarding to avoid front-loading. Sessions spread across first days of use.

| Session | Content | Status |
|---|---|---|
| 1 | Name, why they're here, one thing they want to understand, first prompt | ✅ Built |
| 2 | Hobbies and interests | ⬜ Not built |
| 3 | Writing preferences (freeform vs. guided, tone) | ⬜ Not built |
| 4 | Intention-setting (what does progress look like for them) | ⬜ Not built |

Sessions 2–4 reveal themselves naturally during use, not as a forced sequence at sign-up.
