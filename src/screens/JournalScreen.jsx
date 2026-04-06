import { useState } from 'react'
import { useAppState } from '../hooks/useAppState.jsx'
import { selectPrompt } from '../lib/promptSelector.js'

// ─── Helpers ──────────────────────────────────────────────

// Check whether the user has already written to the daily prompt today.
// We exclude the 'warmup' entry (Session 1) because it's not a real daily prompt.
function hasDonePromptToday(entries) {
  const today = new Date().toDateString()
  return entries.some(e =>
    !e.isFreeText &&
    e.prompt?.id !== 'warmup' &&
    new Date(e.date).toDateString() === today
  )
}

// Format a date as "Today", "Yesterday", or "Apr 2"
function formatDate(isoString) {
  const date  = new Date(isoString)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString())     return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── TodayTab ─────────────────────────────────────────────
// Internal state machine:
//   'choose'    → opening card, two options
//   'prompt'    → writing to a selected prompt
//   'freewrite' → open-ended free write
//   'done'      → submitted, showing what's next
function TodayTab() {
  const { entries, budget, addEntry } = useAppState()

  // view drives which screen is shown inside this tab
  const [view,          setView]          = useState('choose')
  const [currentPrompt, setCurrentPrompt] = useState(null)
  const [response,      setResponse]      = useState('')
  const [isSaving,      setIsSaving]      = useState(false)

  // Derived — re-computed on every render so the done screen is always accurate
  const donePromptToday = hasDonePromptToday(entries)

  // ── Handlers ────────────────────────────────────────────

  function handleChoosePrompt() {
    if (donePromptToday) return
    // selectPrompt() reads localStorage directly — safe to call here
    const prompt = selectPrompt()
    setCurrentPrompt(prompt)
    setView('prompt')
  }

  function handleChooseFreeWrite() {
    if (!budget?.available) return
    setView('freewrite')
  }

  function handleSubmitPrompt() {
    if (!response.trim() || isSaving) return
    setIsSaving(true)
    addEntry({
      prompt: {
        id:       currentPrompt.id,
        text:     currentPrompt.text,
        category: currentPrompt.category,
      },
      response:   response.trim(),
      mode:       'journal',
      isFreeText: false,
      context: { moodBefore: null, tags: [] },
    })
    setIsSaving(false)
    setResponse('')
    setView('done')
  }

  function handleSubmitFreeWrite() {
    if (!response.trim() || isSaving) return
    setIsSaving(true)
    addEntry({
      prompt:     null,
      response:   response.trim(),
      mode:       'journal',
      isFreeText: true,
      context: { moodBefore: null, tags: [] },
    })
    setIsSaving(false)
    setResponse('')
    setView('done')
  }

  // ── Render ──────────────────────────────────────────────

  // ── Choose ──────────────────────────────────────────────
  if (view === 'choose') {
    return (
      <div style={styles.centred}>
        <div style={styles.card}>
          <p style={styles.eyebrow}>today</p>
          <h1 style={styles.heading}>What kind of writing do you want to do?</h1>

          <div style={styles.choiceRow}>

            {/* Prompt option */}
            <button
              style={{
                ...styles.choiceBtn,
                ...(donePromptToday ? styles.choiceBtnMuted : {}),
              }}
              onClick={handleChoosePrompt}
              disabled={donePromptToday}
            >
              <span style={styles.choiceLabel}>Write to a prompt</span>
              {donePromptToday && (
                <span style={styles.choiceSub}>Done for today</span>
              )}
            </button>

            {/* Free write option */}
            <button
              style={{
                ...styles.choiceBtn,
                ...(!budget?.available ? styles.choiceBtnMuted : {}),
              }}
              onClick={handleChooseFreeWrite}
              disabled={!budget?.available}
            >
              <span style={styles.choiceLabel}>Write freely</span>
              {budget && (
                <span style={styles.choiceSub}>
                  {budget.available
                    ? `${budget.limit - budget.used} left this week`
                    : 'Resets Monday'}
                </span>
              )}
            </button>

          </div>
        </div>
      </div>
    )
  }

  // ── Prompt writing ───────────────────────────────────────
  if (view === 'prompt') {
    return (
      <div style={styles.centred}>
        <div style={styles.card}>
          {currentPrompt && (
            <>
              <p style={styles.eyebrow}>{currentPrompt.category}</p>
              <p style={styles.promptText}>{currentPrompt.text}</p>
            </>
          )}
          <textarea
            style={styles.textarea}
            placeholder="Start writing..."
            value={response}
            onChange={e => setResponse(e.target.value)}
            autoFocus
          />
          <button
            style={{ ...styles.button, opacity: response.trim() ? 1 : 0.4 }}
            onClick={handleSubmitPrompt}
            disabled={!response.trim() || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save entry'}
          </button>
        </div>
      </div>
    )
  }

  // ── Free write ───────────────────────────────────────────
  if (view === 'freewrite') {
    return (
      <div style={styles.centred}>
        <div style={styles.card}>
          <p style={styles.eyebrow}>free write</p>
          <textarea
            style={{ ...styles.textarea, minHeight: '220px' }}
            placeholder="Just write..."
            value={response}
            onChange={e => setResponse(e.target.value)}
            autoFocus
          />
          <button
            style={{ ...styles.button, opacity: response.trim() ? 1 : 0.4 }}
            onClick={handleSubmitFreeWrite}
            disabled={!response.trim() || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save entry'}
          </button>
        </div>
      </div>
    )
  }

  // ── Done ─────────────────────────────────────────────────
  if (view === 'done') {
    // Re-check state now that the entry has been saved
    // budget is recalculated from context on every render
    const canFreeWrite  = budget?.available
    const canDoPrompt   = !hasDonePromptToday(entries)
    const nothingLeft   = !canFreeWrite && !canDoPrompt

    return (
      <div style={styles.centred}>
        <div style={styles.card}>
          <p style={styles.eyebrow}>saved</p>
          <h1 style={styles.heading}>
            {nothingLeft ? 'See you tomorrow.' : 'Done for today.'}
          </h1>

          {!nothingLeft && (
            <p style={styles.body}>Want to keep writing?</p>
          )}

          <div style={styles.doneOptions}>
            {canDoPrompt && (
              <button
                style={styles.ghostButton}
                onClick={() => {
                  setResponse('')
                  handleChoosePrompt()
                }}
              >
                Write to a prompt
              </button>
            )}
            {canFreeWrite && (
              <button
                style={styles.ghostButton}
                onClick={() => {
                  setResponse('')
                  setView('freewrite')
                }}
              >
                Write freely
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ─── EntriesTab ───────────────────────────────────────────
// Reverse-chronological list of all past entries.
// Each card shows date, category tag, and a preview of the response.
function EntriesTab() {
  const { entries } = useAppState()
  const [selected, setSelected] = useState(null)

  const sorted = entries.slice().reverse()

  // ── Detail view ─────────────────────────────────────────
  if (selected) {
    return (
      <div style={styles.entriesList}>
        <button style={styles.backBtn} onClick={() => setSelected(null)}>
          ← back
        </button>
        <div style={styles.entryDetail}>
          <div style={styles.entryMeta}>
            <span style={styles.entryDate}>{formatDate(selected.date)}</span>
            <span style={styles.entryTag}>
              {selected.isFreeText ? 'free write' : (selected.prompt?.category ?? '—')}
            </span>
          </div>
          {selected.prompt?.text && (
            <p style={styles.detailPrompt}>{selected.prompt.text}</p>
          )}
          <p style={styles.detailResponse}>{selected.response}</p>
        </div>
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────
  if (sorted.length === 0) {
    return (
      <div style={styles.centred}>
        <div style={styles.card}>
          <p style={styles.eyebrow}>entries</p>
          <p style={styles.body}>Nothing here yet. Write your first entry in the Today tab.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.entriesList}>
      {sorted.map(entry => (
        <div
          key={entry.id}
          style={styles.entryCard}
          onClick={() => setSelected(entry)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setSelected(entry)}
        >
          <div style={styles.entryMeta}>
            <span style={styles.entryDate}>{formatDate(entry.date)}</span>
            <span style={styles.entryTag}>
              {entry.isFreeText ? 'free write' : (entry.prompt?.category ?? '—')}
            </span>
          </div>
          <p style={styles.entryPreview}>
            {entry.response.length > 120
              ? entry.response.slice(0, 120) + '…'
              : entry.response}
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── MapTab ───────────────────────────────────────────────
// Placeholder for the D3 thoughts map (cluster + river views).
// Will be built once entry analysis populates analysis.themes[].
function MapTab() {
  return (
    <div style={styles.centred}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>your thoughts map</p>
        <p style={styles.body}>
          As you write more, patterns will start to appear here.
          Come back after a few entries.
        </p>
      </div>
    </div>
  )
}

// ─── TabBar ───────────────────────────────────────────────
// Three minimal text labels fixed to the bottom.
// Active tab = blue-600. Inactive = gray-400.
//
// Why fixed at the bottom?
// Keeps the writing area visually clean — the nav never intrudes
// on the prompt or textarea. It's always there but never in the way.
function TabBar({ tab, setTab }) {
  const tabs = ['today', 'entries', 'map']

  return (
    <nav style={styles.tabBar}>
      {tabs.map(t => (
        <button
          key={t}
          style={{
            ...styles.tabBtn,
            color: t === tab ? 'var(--blue-600)' : 'var(--gray-400)',
            fontWeight: t === tab ? '500' : '400',
          }}
          onClick={() => setTab(t)}
        >
          {t}
        </button>
      ))}
    </nav>
  )
}

// ─── JournalScreen ────────────────────────────────────────
// Shell component. Owns which tab is active.
// Each tab manages its own internal state.
export default function JournalScreen() {
  const [tab, setTab] = useState('today')

  return (
    <div style={styles.shell}>
      {tab === 'today'   && <TodayTab />}
      {tab === 'entries' && <EntriesTab />}
      {tab === 'map'     && <MapTab />}
      <TabBar tab={tab} setTab={setTab} />
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────
const styles = {
  // ── Shell ───────────────────────────────────────────────
  shell: {
    minHeight:       '100vh',
    display:         'flex',
    flexDirection:   'column',
    backgroundColor: 'var(--blue-50)',
  },

  // ── Tab bar ─────────────────────────────────────────────
  tabBar: {
    position:        'fixed',
    top:             0,
    left:            0,
    right:           0,
    display:         'flex',
    justifyContent:  'center',
    gap:             '2.5rem',
    padding:         '0.85rem 0',
    backgroundColor: 'var(--white)',
    borderBottom:    '1px solid var(--blue-100)',
  },
  tabBtn: {
    background:    'none',
    border:        'none',
    fontSize:      '13px',
    letterSpacing: '0.04em',
    cursor:        'pointer',
    padding:       '0',
    textTransform: 'lowercase',
    transition:    'color 0.15s',
  },

  // ── Layout helpers ───────────────────────────────────────
  // centred: used by Today/Map — card sits in the middle of the page
  centred: {
    flex:            '1',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         '5rem 1.5rem 2rem', // top pad clears the tab bar
  },
  // entries list scrolls naturally — no centring needed
  entriesList: {
    flex:      '1',
    padding:   '5rem 1.5rem 1.5rem',
    display:   'flex',
    flexDirection: 'column',
    gap:       '0.75rem',
    maxWidth:  '560px',
    margin:    '0 auto',
    width:     '100%',
  },

  // ── Card (shared with onboarding aesthetic) ─────────────
  card: {
    backgroundColor: 'var(--white)',
    borderRadius:    '16px',
    padding:         '2rem',
    width:           '100%',
    maxWidth:        '720px',
    border:          '1px solid var(--blue-100)',
    display:         'flex',
    flexDirection:   'column',
    gap:             '1.25rem',
  },

  // ── Typography ──────────────────────────────────────────
  eyebrow: {
    fontSize:      '11px',
    fontWeight:    '500',
    color:         'var(--blue-400)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  heading: {
    fontSize:   '1.4rem',
    fontWeight: '500',
    color:      'var(--gray-900)',
    lineHeight: '1.35',
  },
  promptText: {
    fontSize:   '1.1rem',
    fontWeight: '400',
    color:      'var(--gray-700)',
    lineHeight: '1.65',
  },
  body: {
    fontSize:   '0.9rem',
    color:      'var(--gray-500)',
    lineHeight: '1.6',
  },

  // ── Inputs ──────────────────────────────────────────────
  textarea: {
    width:           '100%',
    minHeight:       '280px',
    padding:         '0.75rem 1rem',
    fontSize:        '1rem',
    border:          '1px solid var(--blue-200)',
    borderRadius:    '8px',
    outline:         'none',
    resize:          'vertical',
    lineHeight:      '1.65',
    color:           'var(--gray-900)',
    backgroundColor: 'var(--white)',
    fontFamily:      'var(--font)',
  },

  // ── Buttons ─────────────────────────────────────────────
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
  ghostButton: {
    width:           '100%',
    padding:         '0.7rem',
    fontSize:        '0.9rem',
    fontWeight:      '400',
    color:           'var(--blue-600)',
    backgroundColor: 'transparent',
    border:          '1px solid var(--blue-200)',
    borderRadius:    '8px',
    cursor:          'pointer',
    transition:      'border-color 0.15s',
  },

  // ── Choose view ─────────────────────────────────────────
  choiceRow: {
    display:   'flex',
    gap:       '0.75rem',
  },
  choiceBtn: {
    flex:            '1',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'flex-start',
    gap:             '6px',
    padding:         '1rem',
    backgroundColor: 'var(--gray-50)',
    border:          '1px solid var(--gray-100)',
    borderRadius:    '10px',
    cursor:          'pointer',
    transition:      'border-color 0.15s, background-color 0.15s',
    textAlign:       'left',
  },
  choiceBtnMuted: {
    opacity: 0.45,
    cursor:  'default',
  },
  choiceLabel: {
    fontSize:   '0.9rem',
    fontWeight: '500',
    color:      'var(--gray-800)',
  },
  choiceSub: {
    fontSize: '0.75rem',
    color:    'var(--gray-400)',
  },

  // ── Done view ────────────────────────────────────────────
  doneOptions: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.5rem',
  },

  // ── Entry cards ─────────────────────────────────────────
  entryMeta: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  entryDate: {
    fontSize:   '0.8rem',
    fontWeight: '500',
    color:      'var(--gray-700)',
  },
  entryTag: {
    fontSize:        '10px',
    fontWeight:      '500',
    letterSpacing:   '0.08em',
    textTransform:   'uppercase',
    color:           'var(--blue-400)',
    backgroundColor: 'var(--blue-50)',
    border:          '1px solid var(--blue-100)',
    borderRadius:    '4px',
    padding:         '2px 6px',
  },
  entryPreview: {
    fontSize:   '0.875rem',
    color:      'var(--gray-500)',
    lineHeight: '1.5',
  },
  entryCard: {
    backgroundColor: 'var(--white)',
    border:          '1px solid var(--blue-100)',
    borderRadius:    '12px',
    padding:         '1rem 1.25rem',
    display:         'flex',
    flexDirection:   'column',
    gap:             '0.4rem',
    cursor:          'pointer',
  },

  // ── Entry detail view ────────────────────────────────────
  backBtn: {
    background:    'none',
    border:        'none',
    fontSize:      '0.85rem',
    color:         'var(--blue-600)',
    cursor:        'pointer',
    padding:       '0',
    textAlign:     'left',
    marginBottom:  '0.5rem',
  },
  entryDetail: {
    backgroundColor: 'var(--white)',
    border:          '1px solid var(--blue-100)',
    borderRadius:    '12px',
    padding:         '1.5rem',
    display:         'flex',
    flexDirection:   'column',
    gap:             '1rem',
  },
  detailPrompt: {
    fontSize:    '0.9rem',
    fontStyle:   'italic',
    color:       'var(--gray-400)',
    lineHeight:  '1.6',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid var(--blue-100)',
  },
  detailResponse: {
    fontSize:   '1rem',
    color:      'var(--gray-700)',
    lineHeight: '1.8',
    whiteSpace: 'pre-wrap',
  },
}
