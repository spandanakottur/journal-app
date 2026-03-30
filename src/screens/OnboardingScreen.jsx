import { useState } from 'react'
import { useAppState } from '../hooks/useAppState.jsx'

// ─── Constants ────────────────────────────────────────────
const INTENTIONS = [
  { id: 'understand', text: 'I want to understand myself better' },
  { id: 'thoughts',   text: 'I need somewhere to put my thoughts' },
  { id: 'process',    text: 'I am going through something and need to process it' },
]

const MOODS = [
  { value: 1, label: 'Heavy' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Light' },
]

const WARMUP_PROMPT = "Don't think. Just write the first three words that describe where you are right now — in life, not location. Then say more if you want to."

// ─── Main component ───────────────────────────────────────
export default function OnboardingScreen() {
  const { updateProfile, addEntry } = useAppState()

  // Which step are we on — 0, 1, 2, or 3
  const [step, setStep] = useState(0)

  // The data we're collecting across all steps
  const [name,      setName]      = useState('')
  const [intention, setIntention] = useState(null)
  const [mood,      setMood]      = useState(null)
  const [response,  setResponse]  = useState('')
  const [isSaving,  setIsSaving]  = useState(false)

  // ── Step handlers ──────────────────────────────────────

  function handleNameSubmit() {
    if (!name.trim()) return
    setStep(1)
  }

  function handleIntentionSubmit() {
    if (!intention) return
    setStep(2)
  }

  function handleMoodSubmit() {
    if (!mood) return
    setStep(3)
  }

  async function handleWarmupSubmit() {
    if (!response.trim() || isSaving) return
    setIsSaving(true)

    // Save profile with everything we collected
    updateProfile({
      name:           name.trim(),
      intention:      intention,
      onboardingStep: 1,
      createdAt:      new Date().toISOString(),
    })

    // Save the warmup entry
    addEntry({
      prompt: {
        id:       'warmup',
        text:     WARMUP_PROMPT,
        category: 'everyday',
      },
      response:   response.trim(),
      mode:       'journal',
      isFreeText: false,
      context: {
        moodBefore: mood,
        tags:       [],
      },
    })

    setIsSaving(false)
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {/* Step 0 — Name */}
        {step === 0 && (
          <div style={styles.step}>
            <p style={styles.eyebrow}>welcome</p>
            <h1 style={styles.heading}>
              This is your space to think.
            </h1>
            <p style={styles.body}>
              No performance. No audience. Just you and the page.
              To start — what should we call you?
            </p>
            <input
              style={styles.input}
              type="text"
              placeholder="Your name or a nickname"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
              autoFocus
            />
            <button
              style={{
                ...styles.button,
                opacity: name.trim() ? 1 : 0.4,
              }}
              onClick={handleNameSubmit}
              disabled={!name.trim()}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 1 — Intention */}
        {step === 1 && (
          <div style={styles.step}>
            <p style={styles.eyebrow}>one more thing</p>
            <h1 style={styles.heading}>
              What brings you here, {name}?
            </h1>
            <p style={styles.body}>
              There is no wrong answer. This just helps us understand
              what kind of space you need.
            </p>
            <div style={styles.optionList}>
              {INTENTIONS.map(opt => (
                <button
                  key={opt.id}
                  style={{
                    ...styles.optionButton,
                    ...(intention === opt.id ? styles.optionButtonSelected : {}),
                  }}
                  onClick={() => setIntention(opt.id)}
                >
                  {opt.text}
                </button>
              ))}
            </div>
            <button
              style={{
                ...styles.button,
                opacity: intention ? 1 : 0.4,
              }}
              onClick={handleIntentionSubmit}
              disabled={!intention}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2 — Mood */}
        {step === 2 && (
          <div style={styles.step}>
            <p style={styles.eyebrow}>right now</p>
            <h1 style={styles.heading}>
              How are you feeling today?
            </h1>
            <p style={styles.body}>
              Just a rough sense. You can always say more in a moment.
            </p>
            <div style={styles.moodRow}>
              {MOODS.map(m => (
                <button
                  key={m.value}
                  style={{
                    ...styles.moodButton,
                    ...(mood === m.value ? styles.moodButtonSelected : {}),
                  }}
                  onClick={() => setMood(m.value)}
                >
                  <span style={styles.moodValue}>{m.value}</span>
                  <span style={styles.moodLabel}>{m.label}</span>
                </button>
              ))}
            </div>
            <button
              style={{
                ...styles.button,
                opacity: mood ? 1 : 0.4,
              }}
              onClick={handleMoodSubmit}
              disabled={!mood}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3 — Warmup prompt */}
        {step === 3 && (
          <div style={styles.step}>
            <p style={styles.eyebrow}>your first entry</p>
            <h1 style={styles.promptText}>
              {WARMUP_PROMPT}
            </h1>
            <textarea
              style={styles.textarea}
              placeholder="Just start writing..."
              value={response}
              onChange={e => setResponse(e.target.value)}
              autoFocus
            />
            <button
              style={{
                ...styles.button,
                opacity: response.trim() ? 1 : 0.4,
              }}
              onClick={handleWarmupSubmit}
              disabled={!response.trim() || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save my entry'}
            </button>
          </div>
        )}

        {/* Step indicator dots */}
        <div style={styles.dots}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                ...styles.dot,
                ...(i === step ? styles.dotActive : {}),
                ...(i < step ? styles.dotComplete : {}),
              }}
            />
          ))}
        </div>

      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────
// We are using plain JS style objects for now.
// Every property is camelCase instead of kebab-case.
// e.g. background-color becomes backgroundColor.
const styles = {
  container: {
    minHeight:      '100vh',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '2rem',
    backgroundColor: 'var(--blue-50)',
  },
  card: {
    backgroundColor: 'var(--white)',
    borderRadius:    '16px',
    padding:         '2.5rem',
    width:           '100%',
    maxWidth:        '480px',
    border:          '1px solid var(--blue-100)',
  },
  step: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '1.25rem',
  },
  eyebrow: {
    fontSize:      '11px',
    fontWeight:    '500',
    color:         'var(--blue-400)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  heading: {
    fontSize:   '1.5rem',
    fontWeight: '500',
    color:      'var(--gray-900)',
    lineHeight: '1.3',
  },
  promptText: {
    fontSize:   '1.1rem',
    fontWeight: '400',
    color:      'var(--gray-700)',
    lineHeight: '1.6',
  },
  body: {
    fontSize:   '0.95rem',
    color:      'var(--gray-500)',
    lineHeight: '1.6',
  },
  input: {
    width:        '100%',
    padding:      '0.75rem 1rem',
    fontSize:     '1rem',
    border:       '1px solid var(--blue-200)',
    borderRadius: '8px',
    outline:      'none',
    color:        'var(--gray-900)',
    backgroundColor: 'var(--white)',
  },
  textarea: {
    width:        '100%',
    minHeight:    '160px',
    padding:      '0.75rem 1rem',
    fontSize:     '1rem',
    border:       '1px solid var(--blue-200)',
    borderRadius: '8px',
    outline:      'none',
    resize:       'vertical',
    lineHeight:   '1.6',
    color:        'var(--gray-900)',
    backgroundColor: 'var(--white)',
  },
  button: {
    width:           '100%',
    padding:         '0.75rem',
    fontSize:        '0.95rem',
    fontWeight:      '500',
    color:           'var(--white)',
    backgroundColor: 'var(--blue-600)',
    border:          'none',
    borderRadius:    '8px',
    cursor:          'pointer',
    transition:      'opacity 0.2s',
  },
  optionList: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.5rem',
  },
  optionButton: {
    padding:         '0.85rem 1rem',
    fontSize:        '0.9rem',
    color:           'var(--gray-700)',
    backgroundColor: 'var(--gray-50)',
    border:          '1px solid var(--gray-100)',
    borderRadius:    '8px',
    textAlign:       'left',
    cursor:          'pointer',
    transition:      'all 0.15s',
  },
  optionButtonSelected: {
    backgroundColor: 'var(--blue-50)',
    border:          '1px solid var(--blue-400)',
    color:           'var(--blue-800)',
  },
  moodRow: {
    display:        'flex',
    gap:            '0.5rem',
    justifyContent: 'space-between',
  },
  moodButton: {
    flex:            '1',
    padding:         '0.75rem 0.25rem',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    gap:             '4px',
    backgroundColor: 'var(--gray-50)',
    border:          '1px solid var(--gray-100)',
    borderRadius:    '8px',
    cursor:          'pointer',
    transition:      'all 0.15s',
  },
  moodButtonSelected: {
    backgroundColor: 'var(--blue-50)',
    border:          '1px solid var(--blue-400)',
  },
  moodValue: {
    fontSize:   '1.1rem',
    fontWeight: '500',
    color:      'var(--gray-900)',
  },
  moodLabel: {
    fontSize: '0.7rem',
    color:    'var(--gray-400)',
  },
  dots: {
    display:        'flex',
    justifyContent: 'center',
    gap:            '6px',
    marginTop:      '2rem',
  },
  dot: {
    width:           '6px',
    height:          '6px',
    borderRadius:    '50%',
    backgroundColor: 'var(--gray-300)',
    transition:      'all 0.2s',
  },
  dotActive: {
    backgroundColor: 'var(--blue-600)',
    width:           '18px',
    borderRadius:    '3px',
  },
  dotComplete: {
    backgroundColor: 'var(--blue-200)',
  },
}