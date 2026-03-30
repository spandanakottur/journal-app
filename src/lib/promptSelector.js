import { prompts, hobbyPrompts, getHobbyPrompt, CATEGORIES, REGISTERS } from '../data/prompts.js'
import { getProfile, getEntries } from './storage.js'

// ─── Constants ────────────────────────────────────────────
const EXPLOIT_RATIO = 0.6  // 60% serve from familiar territory
const EXPLORE_RATIO = 0.4  // 40% push into new territory
const MAX_SAME_CATEGORY_STREAK = 2  // never more than 2 in a row
const MEDIA_PROMPT_INTERVAL = 7     // media prompt once a week
const DEEP_HOBBY_INTERVAL   = 14    // deep hobby prompt twice a month
const FEARS_UNLOCK_DAYS     = 14    // fears & shadows after 2 weeks

// ─── Main selector ────────────────────────────────────────
// This is the single function the app calls to get today's prompt.
// It knows everything about the user's history and applies
// the exploit/explore logic to pick the right prompt.
export function selectPrompt() {
  const profile = getProfile()
  const entries = getEntries()

  // How long has this user been using the app?
  const daysSinceStart = profile.createdAt
    ? Math.floor((Date.now() - new Date(profile.createdAt)) / (1000 * 60 * 60 * 24))
    : 0

  const weekNumber = Math.floor(daysSinceStart / 7) + 1

  // What prompts has this user already seen?
  const usedPromptIds = entries
    .map(e => e.prompt?.id)
    .filter(Boolean)

  // What category did they last write in?
  const recentCategories = entries
    .slice(-MAX_SAME_CATEGORY_STREAK)
    .map(e => e.prompt?.category)
    .filter(Boolean)

  // Is the last category repeated MAX times already?
  const lastCategory = recentCategories[recentCategories.length - 1]
  const categoryStreak = recentCategories.filter(c => c === lastCategory).length
  const blockedCategory = categoryStreak >= MAX_SAME_CATEGORY_STREAK
    ? lastCategory
    : null

  // Should we serve a media prompt today?
  if (shouldServeMediaPrompt(entries)) {
    const mediaPrompt = getPromptFromCategory(
      CATEGORIES.MEDIA, usedPromptIds, weekNumber
    )
    if (mediaPrompt) return { ...mediaPrompt, reason: 'media_interval' }
  }

  // Should we serve a deep hobby prompt today?
  if (shouldServeDeepHobbyPrompt(entries, profile)) {
    const hobbyPrompt = getDeepHobbyPrompt(profile, usedPromptIds)
    if (hobbyPrompt) return { ...hobbyPrompt, reason: 'deep_hobby' }
  }

  // Exploit or explore?
  const shouldExplore = Math.random() > EXPLOIT_RATIO

  if (shouldExplore) {
    return selectExplorePrompt(
      profile, entries, usedPromptIds, weekNumber, blockedCategory
    )
  } else {
    return selectExploitPrompt(
      profile, entries, usedPromptIds, weekNumber, blockedCategory
    )
  }
}

// ─── Exploit ──────────────────────────────────────────────
// Serve from a category the user has engaged with before.
// "Engage" means they wrote a long entry or had a sentiment spike.
function selectExploitPrompt(profile, entries, usedPromptIds, weekNumber, blockedCategory) {
  const engagedCategories = getEngagedCategories(entries)

  for (const category of engagedCategories) {
    if (category === blockedCategory) continue
    if (category === CATEGORIES.FEARS && weekNumber < 3) continue

    const prompt = getPromptFromCategory(category, usedPromptIds, weekNumber)
    if (prompt) return { ...prompt, reason: 'exploit' }
  }

  // Fall back to explore if nothing found
  return selectExplorePrompt(
    profile, entries, usedPromptIds, weekNumber, blockedCategory
  )
}

// ─── Explore ──────────────────────────────────────────────
// Serve from a category the user has NOT explored recently —
// surface their blind spots.
function selectExplorePrompt(profile, entries, usedPromptIds, weekNumber, blockedCategory) {
  const usedCategories = new Set(
    entries.map(e => e.prompt?.category).filter(Boolean)
  )

  // Prioritise categories never touched at all
  const allCategories = Object.values(CATEGORIES)
  const untouched = allCategories.filter(c => {
    if (usedCategories.has(c)) return false
    if (c === blockedCategory) return false
    if (c === CATEGORIES.FEARS && weekNumber < 3) return false
    if (c === CATEGORIES.MEDIA) return false // media has its own schedule
    return true
  })

  // Try untouched first, then least recently used
  const orderedCategories = [
    ...untouched,
    ...allCategories.filter(c =>
      !untouched.includes(c) &&
      c !== blockedCategory &&
      c !== CATEGORIES.MEDIA &&
      !(c === CATEGORIES.FEARS && weekNumber < 3)
    ),
  ]

  for (const category of orderedCategories) {
    const prompt = getPromptFromCategory(category, usedPromptIds, weekNumber)
    if (prompt) return { ...prompt, reason: 'explore' }
  }

  // Last resort — any available prompt
  const fallback = prompts.find(p =>
    !usedPromptIds.includes(p.id) && p.minWeek <= weekNumber
  )
  return fallback ? { ...fallback, reason: 'fallback' } : null
}

// ─── Helpers ──────────────────────────────────────────────

// Gets a random unused prompt from a specific category
function getPromptFromCategory(category, usedPromptIds, weekNumber) {
  const available = prompts.filter(p =>
    p.category === category &&
    p.register !== REGISTERS.HOBBY &&  // hobby prompts have their own path
    !usedPromptIds.includes(p.id) &&
    p.minWeek <= weekNumber
  )
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}

// Categories the user has written the most / most emotionally
// in, sorted by engagement score
function getEngagedCategories(entries) {
  const scores = {}

  entries.forEach(entry => {
    const cat = entry.prompt?.category
    if (!cat) return

    // Base score — wrote something
    scores[cat] = (scores[cat] || 0) + 1

    // Bonus for long entries — they cared
    if (entry.response?.length > 300) scores[cat] += 2

    // Bonus for sentiment spike — emotionally significant
    if (entry.analysis?.sentenceLengthSpike) scores[cat] += 2

    // Bonus for high emotion density
    if (entry.analysis?.emotionDensity > 0.3) scores[cat] += 1
  })

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category)
}

// Should we serve a media prompt today?
function shouldServeMediaPrompt(entries) {
  const mediaEntries = entries.filter(e => e.prompt?.category === CATEGORIES.MEDIA)
  if (mediaEntries.length === 0) return entries.length >= 3 // first media prompt after 3 entries
  const lastMedia = new Date(mediaEntries[mediaEntries.length - 1].date)
  const daysSince = (Date.now() - lastMedia) / (1000 * 60 * 60 * 24)
  return daysSince >= MEDIA_PROMPT_INTERVAL
}

// Should we serve a deep hobby prompt today?
function shouldServeDeepHobbyPrompt(entries, profile) {
  if (!profile.hobbies || profile.hobbies.length === 0) return false
  const hobbyEntries = entries.filter(e => e.prompt?.register === REGISTERS.HOBBY)
  if (hobbyEntries.length === 0) return entries.length >= 5
  const lastHobby = new Date(hobbyEntries[hobbyEntries.length - 1].date)
  const daysSince = (Date.now() - lastHobby) / (1000 * 60 * 60 * 24)
  return daysSince >= DEEP_HOBBY_INTERVAL
}

// Gets a hobby prompt using the 3-tier specificity ladder
function getDeepHobbyPrompt(profile, usedPromptIds) {
  if (!profile.hobbies || profile.hobbies.length === 0) return null

  // Pick a random hobby from their declared list
  const hobby = profile.hobbies[
    Math.floor(Math.random() * profile.hobbies.length)
  ]

  const result = getHobbyPrompt(hobby.slug, usedPromptIds)
  if (!result) return null

  return {
    ...result.prompt,
    category: CATEGORIES.EVERYDAY,
    register: REGISTERS.HOBBY,
    hobbySlug: hobby.slug,
    tier: result.tier,
  }
}