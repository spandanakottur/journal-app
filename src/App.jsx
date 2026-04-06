import { useState } from 'react'
import { AppProvider, useAppState } from './hooks/useAppState.jsx'
import OnboardingScreen from './screens/OnboardingScreen.jsx'
import JournalScreen from './screens/JournalScreen.jsx'

// ─── ResetButton ──────────────────────────────────────────
// A small "start over" escape hatch that floats in the top-right
// corner of every screen. Two-step confirmation prevents accidents.
//
// Why two-step instead of window.confirm?
// window.confirm is a browser dialog — it looks jarring in a calm
// app like this. Inline confirmation keeps the same quiet tone.
function ResetButton() {
  const { resetProfile } = useAppState()
  const [isConfirming, setIsConfirming] = useState(false)

  if (isConfirming) {
    return (
      <div style={resetStyles.wrap}>
        <span style={resetStyles.label}>sure?</span>
        <button
          style={resetStyles.confirmBtn}
          onClick={() => { resetProfile(); setIsConfirming(false) }}
        >
          yes
        </button>
        <button
          style={resetStyles.cancelBtn}
          onClick={() => setIsConfirming(false)}
        >
          no
        </button>
      </div>
    )
  }

  return (
    <div style={resetStyles.wrap}>
      <button style={resetStyles.btn} onClick={() => setIsConfirming(true)}>
        start over
      </button>
    </div>
  )
}

// ─── AppContent ───────────────────────────────────────────
// This component lives *inside* AppProvider so it can call
// useAppState(). App() itself can't call the hook directly
// because the provider hasn't wrapped it yet at that point.
function AppContent() {
  const { isLoading, isOnboarding } = useAppState()

  // Still reading from localStorage — render nothing yet
  if (isLoading) return null

  return (
    <>
      <ResetButton />
      {isOnboarding ? <OnboardingScreen /> : <JournalScreen />}
    </>
  )
}

// ─── App ──────────────────────────────────────────────────
// Wraps everything in AppProvider so any component in the
// tree can access global state via useAppState().
export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

// ─── Reset button styles ──────────────────────────────────
// Kept separate from any screen-level styles.
// Very subtle by design — small, gray, uppercase.
// Should feel like a footnote, not a call to action.
const sharedTinyBtn = {
  background:    'none',
  border:        'none',
  fontSize:      '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor:        'pointer',
  padding:       '0',
}

const resetStyles = {
  wrap: {
    position:        'fixed',
    top:             '0.5rem',
    right:           '1rem',
    height:          '32px',
    display:         'flex',
    gap:             '6px',
    alignItems:      'center',
    border:          '1px solid var(--gray-200)',
    borderRadius:    '6px',
    padding:         '0 0.75rem',
    backgroundColor: 'white',
    zIndex:          100,
  },
  btn: {
    ...sharedTinyBtn,
    color: 'var(--gray-400)',
  },
  label: {
    fontSize:      '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color:         'var(--gray-400)',
  },
  confirmBtn: {
    ...sharedTinyBtn,
    color: 'var(--blue-600)',
  },
  cancelBtn: {
    ...sharedTinyBtn,
    color: 'var(--gray-400)',
  },
}
