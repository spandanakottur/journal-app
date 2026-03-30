import { createContext, useContext, useState, useEffect } from 'react'
import { getProfile, saveProfile, getEntries, saveEntry, getFreeTextBudget } from '../lib/storage.js'

// ─── 1. Create the context ────────────────────────────────
// Think of this as creating the broadcast channel.
// It starts with null — nothing is in it yet.
const AppContext = createContext(null)

// ─── 2. Create the Provider ───────────────────────────────
// The Provider is a component that wraps the whole app.
// Everything inside it can access the context.
// This is where the actual state lives.
export function AppProvider({ children }) {

  // ── State ──────────────────────────────────────────────
  // useState gives us a value and a function to update it.
  // When the update function is called, React re-renders
  // every component that uses this value.
  const [profile,  setProfile]  = useState(null)
  const [entries,  setEntries]  = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // ── Load from localStorage on startup ─────────────────
  // useEffect runs code *after* the component renders.
  // The empty [] means "run this once, when the app first loads".
  // This is where we hydrate React state from localStorage.
  useEffect(() => {
    const savedProfile = getProfile()
    const savedEntries = getEntries()
    setProfile(savedProfile)
    setEntries(savedEntries)
    setIsLoading(false)
  }, [])

  // ── Actions ────────────────────────────────────────────
  // These functions are the only way anything in the app
  // should modify state. They update both localStorage
  // (permanent) and React state (what's on screen right now).

  // Update the user profile
  function updateProfile(updates) {
    const updated = saveProfile(updates)
    setProfile(updated)
    return updated
  }

  // Save a new journal entry
  function addEntry(entryData) {
    const newEntry = saveEntry(entryData)
    setEntries(prev => [...prev, newEntry])
    return newEntry
  }

  // Derived values — calculated from state, not stored
  const budget         = profile ? getFreeTextBudget() : null
  const onboardingStep = profile?.onboardingStep ?? 0
  const isOnboarding   = onboardingStep < 4

  // ── What gets broadcast to the whole app ──────────────
  const value = {
    profile,
    entries,
    isLoading,
    budget,
    onboardingStep,
    isOnboarding,
    updateProfile,
    addEntry,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

// ─── 3. Create the hook ───────────────────────────────────
// This is what components call to access the context.
// Instead of writing useContext(AppContext) everywhere,
// they just write useAppState().
export function useAppState() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppState must be used inside AppProvider')
  }
  return context
}