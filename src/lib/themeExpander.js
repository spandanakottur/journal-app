// ─── Theme Expander ───────────────────────────────────────
// Fetches semantically related words from the Datamuse API
// for each category's seed words, then caches the result in
// localStorage (refreshed weekly).
//
// WHY DATAMUSE?
// Free, no API key, no auth. Crucially, we never send journal
// text to Datamuse — we only fetch word lists keyed to category
// names. User data stays on-device at all times.
//
// HOW IT FITS IN:
// themeExpander.js   → builds + caches the expanded dictionary
// themeAnalyser.js   → reads the dictionary to score entries
// useAppState.jsx    → calls ensureDictionaryLoaded() on boot
//
// The expanded dict is an in-memory object. The analyser reads
// from it synchronously — it always falls back to base seeds
// if the fetch hasn't completed yet.

import { themeKeywords } from '../data/themeKeywords.js'
import { getThemeDict, saveThemeDict } from './storage.js'

// ─── In-memory dict ───────────────────────────────────────
// Starts as a copy of the base seeds. Overwritten when the
// expanded dict loads (from cache or from a fresh Datamuse fetch).
let expandedDict = { ...themeKeywords }

// ─── Public API ───────────────────────────────────────────

// Returns the current in-memory expanded dictionary.
// Always has at least the base seeds.
export function getExpandedDict() {
  return expandedDict
}

// Called once on app boot (fire-and-forget).
// Loads the cached dict if fresh, or fetches new expansions.
export async function ensureDictionaryLoaded() {
  try {
    const cached = getThemeDict()
    if (cached && isFresh(cached.lastFetched)) {
      expandedDict = cached.words
      return
    }
    await fetchExpansions()
  } catch {
    // Network failure — base seeds remain in expandedDict. Silent fallback.
  }
}

// ─── Internals ────────────────────────────────────────────

// A cached dictionary is "fresh" if it was fetched within 7 days.
function isFresh(lastFetched) {
  if (!lastFetched) return false
  const age = Date.now() - new Date(lastFetched).getTime()
  return age < 7 * 24 * 60 * 60 * 1000
}

// For each category, fetch related words for up to 3 seed words,
// merge with the base seeds, deduplicate.
async function fetchExpansions() {
  const categories = Object.keys(themeKeywords)
  const results    = {}

  await Promise.allSettled(
    categories.map(async (category) => {
      // Pick the first 3 seeds as query terms — enough signal, not too many requests
      const seeds     = themeKeywords[category].slice(0, 3)
      const fetched   = await fetchWordsForSeeds(seeds)
      const merged    = [...new Set([...themeKeywords[category], ...fetched])]
      results[category] = merged
    })
  )

  // Merge with base seeds for any category that failed
  const merged = { ...themeKeywords }
  for (const category of categories) {
    if (results[category]) merged[category] = results[category]
  }

  expandedDict = merged
  saveThemeDict({ words: merged, lastFetched: new Date().toISOString() })
}

// Fetches semantically related words for an array of seed words.
// Uses Datamuse's "means like" (ml) parameter.
async function fetchWordsForSeeds(seeds) {
  const fetched = []

  await Promise.allSettled(
    seeds.map(async (seed) => {
      const url  = `https://api.datamuse.com/words?ml=${encodeURIComponent(seed)}&max=20`
      const res  = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      // Datamuse returns [{ word, score, ... }] — we only want the word strings
      data.forEach(item => {
        if (item.word && !item.word.includes(' ')) {
          // Skip multi-word phrases — they won't match individual tokens
          fetched.push(item.word.toLowerCase())
        }
      })
    })
  )

  return fetched
}
