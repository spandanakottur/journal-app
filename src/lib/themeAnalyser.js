// ─── Theme Analyser ───────────────────────────────────────
// Scores a journal entry's response text against the expanded
// theme dictionary and returns populated analysis fields.
//
// This is SYNCHRONOUS — it reads from the in-memory dict
// so addEntry() doesn't need to become async.
//
// Output shape matches entry.analysis in storage.js:
//   { themes, keywords, emotionDensity, sentenceLengthSpike }
//
// Called in two places:
//   1. addEntry() in useAppState.jsx — for new entries
//   2. Boot migration in useAppState.jsx — for old entries with themes: []

import { getExpandedDict } from './themeExpander.js'

// ─── Public API ───────────────────────────────────────────

// analyseEntry(responseText, promptCategory)
//
// promptCategory: the category slug from the prompt (e.g. 'identity'),
//   or null for free-text entries. Used as the guaranteed primary theme.
//
// Returns an object that can be spread into entry.analysis.
export function analyseEntry(responseText, promptCategory) {
  if (!responseText || responseText.trim().length === 0) {
    return emptyAnalysis()
  }

  const dict   = getExpandedDict()
  const tokens = tokenize(responseText)

  if (tokens.length === 0) return emptyAnalysis()

  // ── Score each category ─────────────────────────────────
  const scores = scoreCategories(tokens, dict)

  // ── Primary theme ───────────────────────────────────────
  // Always use the prompt's category as primary (we know it's accurate).
  // For free-text entries with no category, fall back to the top scorer.
  const primary = promptCategory ?? topScorer(scores)

  // ── Secondary themes ────────────────────────────────────
  // Include categories that score above a minimum threshold AND
  // have at least 2 matching tokens — avoids false positives from
  // single-word coincidences.
  const MIN_SCORE = 0.03
  const MIN_HITS  = 2

  const secondary = Object.entries(scores)
    .filter(([cat, { score, hits }]) =>
      cat !== primary && score >= MIN_SCORE && hits >= MIN_HITS
    )
    .sort((a, b) => b[1].score - a[1].score)
    .map(([cat]) => cat)

  const themes = [primary, ...secondary].filter(Boolean).slice(0, 4)

  // ── Keywords ────────────────────────────────────────────
  // Tokens that matched any category dict, weighted by how many
  // categories they appear in (cross-category = more meaningful).
  const keywords = extractKeywords(tokens, dict)

  // ── Emotion density ─────────────────────────────────────
  // Ratio of emotion-category hits to total token count.
  const emotionHits    = scores['emotions']?.hits ?? 0
  const emotionDensity = Math.min(emotionHits / tokens.length, 1)

  // ── Sentence length spike ───────────────────────────────
  // True when there's high variance in sentence length —
  // a signal of emotional intensity or non-linear thinking.
  const sentenceLengthSpike = detectSentenceLengthSpike(responseText)

  return { themes, keywords, emotionDensity, sentenceLengthSpike }
}

// ─── Internals ────────────────────────────────────────────

function emptyAnalysis() {
  return { themes: [], keywords: [], emotionDensity: null, sentenceLengthSpike: false }
}

// Lowercase, strip punctuation, split on whitespace.
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, '')  // keep apostrophes + hyphens
    .split(/\s+/)
    .filter(t => t.length > 2)   // drop very short tokens (a, is, to, etc.)
}

// For each category, count hits and compute a normalised score.
// score = hits / dict size — so larger dicts don't dominate unfairly.
function scoreCategories(tokens, dict) {
  const tokenSet = new Set(tokens)
  const scores   = {}

  for (const [category, words] of Object.entries(dict)) {
    let hits = 0
    for (const word of words) {
      if (tokenSet.has(word)) hits++
    }
    scores[category] = { hits, score: hits / words.length }
  }

  return scores
}

// Returns the category slug with the highest score, or null.
function topScorer(scores) {
  let best = null
  let bestScore = -1
  for (const [cat, { score }] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; best = cat }
  }
  return best
}

// Returns top 8 tokens that appear in any category dict,
// each with a weight = number of categories it appears in.
function extractKeywords(tokens, dict) {
  const allWords = {}
  for (const words of Object.values(dict)) {
    for (const w of words) allWords[w] = (allWords[w] ?? 0) + 1
  }

  const seen = new Set()
  const hits  = []
  for (const token of tokens) {
    if (!seen.has(token) && allWords[token]) {
      hits.push({ word: token, weight: allWords[token] })
      seen.add(token)
    }
  }

  return hits
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
}

// True when the standard deviation of sentence lengths (in words)
// exceeds a threshold — a rough proxy for emotional spike or
// fragmented vs. flowing writing.
function detectSentenceLengthSpike(text) {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim().split(/\s+/).filter(Boolean).length)
    .filter(len => len > 0)

  if (sentences.length < 3) return false  // not enough data

  const mean   = sentences.reduce((a, b) => a + b, 0) / sentences.length
  const stddev = Math.sqrt(
    sentences.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / sentences.length
  )

  return stddev > 8  // more than 8 words of variance = spike
}
