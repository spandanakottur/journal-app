// ─── Key names ─────────────────────────────────────────────
// All localStorage keys live here so they never get mistyped
// elsewhere in the app.
const KEYS = {
  PROFILE:    'journal_profile',
  ENTRIES:    'journal_entries',
  MEDIA:      'journal_media',
  SETTINGS:   'journal_settings',
  THEME_DICT: 'journal_theme_dict',
}

// ─── Profile ───────────────────────────────────────────────
// The user's identity and onboarding state. This grows across
// sessions 1, 2 and 3 as we learn more about them.
const defaultProfile = {
  name:          null,    // what they want to be called
  intention:     null,    // why they're here (session 1)
  hobbies:       [],      // declared at session 2
  writingMode:   'auto',  // 'journal' | 'conversation' | 'auto'
  depthPreference: null,  // 'easy' | 'deep' — set at session 3
  onboardingStep: 0,      // how far through onboarding they are
  createdAt:     null,
}

export function getProfile() {
  const raw = localStorage.getItem(KEYS.PROFILE)
  return raw ? JSON.parse(raw) : { ...defaultProfile }
}

export function saveProfile(updates) {
  const current = getProfile()
  const updated = { ...current, ...updates }
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(updated))
  return updated
}

// ─── Entries ───────────────────────────────────────────────
// Every journal entry ever written. Each entry is a rich
// object that carries the raw text AND the analysis results.
export function getEntries() {
  const raw = localStorage.getItem(KEYS.ENTRIES)
  return raw ? JSON.parse(raw) : []
}

export function saveEntry(entry) {
  const entries = getEntries()
  const newEntry = {
    id:          crypto.randomUUID(),
    date:        new Date().toISOString(),
    prompt:      null,   // { text, category, id } or null for free text
    response:    '',     // the raw text the user wrote
    mode:        'journal', // 'journal' | 'conversation'
    followUps:   [],     // [{ prompt, response }]
    imageId:     null,   // reference to IndexedDB image if uploaded
    isFreeText:  false,  // was this a free text entry?
    context: {
      moodBefore: null,  // optional mood check-in
      tags:       [],    // context tags e.g. 'poor sleep', 'work stress'
    },
    analysis: {
      sentiment:        null,  // { score, label }
      keywords:         [],    // [{ word, weight }]
      themes:           [],    // ['identity', 'relationships', ...]
      emotionDensity:   null,  // 0–1
      sentenceLengthSpike: false,
    },
    media: {
      form:               null, // 'reading'|'watching'|'listening'|'scrolling'
      intentional:        null, // true | false
      retentionConfidence: null, // 0–1
      breadthSignal:      null, // 'familiar' | 'new_perspective'
      keywords:           [],
    },
    ...entry, // caller can override any of the above
  }
  entries.push(newEntry)
  localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries))
  return newEntry
}

// ─── Free text budget ──────────────────────────────────────
// Returns how many free text entries have been used this week
// and whether free text is available today.
export function getFreeTextBudget() {
  const entries   = getEntries()
  const now       = new Date()
  const monday    = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)

  const usedThisWeek = entries.filter(e => {
    return e.isFreeText && new Date(e.date) >= monday
  }).length

  const daysUntilReset = 7 - ((now.getDay() + 6) % 7)

  return {
    used:          usedThisWeek,
    limit:         3,
    available:     usedThisWeek < 3,
    daysUntilReset,
  }
}

// ─── Reset ─────────────────────────────────────────────────
// Wipes all journal data from localStorage.
// Used by the "start over" button to return to onboarding.
export function clearStorage() {
  localStorage.removeItem(KEYS.PROFILE)
  localStorage.removeItem(KEYS.ENTRIES)
  localStorage.removeItem(KEYS.MEDIA)
  localStorage.removeItem(KEYS.SETTINGS)
  localStorage.removeItem(KEYS.THEME_DICT)
}

// ─── Theme dictionary ──────────────────────────────────────
// Stores the Datamuse-expanded keyword dictionary with a
// timestamp so themeExpander.js can decide when to refresh.
export function getThemeDict() {
  const raw = localStorage.getItem(KEYS.THEME_DICT)
  return raw ? JSON.parse(raw) : null
}

export function saveThemeDict(dict) {
  localStorage.setItem(KEYS.THEME_DICT, JSON.stringify(dict))
}

// ─── Settings ──────────────────────────────────────────────
export function getSettings() {
  const raw = localStorage.getItem(KEYS.SETTINGS)
  return raw ? JSON.parse(raw) : {
    moodCheckInEnabled: false,
  }
}

export function saveSettings(updates) {
  const current = getSettings()
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...updates }))
}