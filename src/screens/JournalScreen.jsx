import { useState, useRef, useEffect } from 'react'
import { useAppState } from '../hooks/useAppState.jsx'
import { selectPrompt } from '../lib/promptSelector.js'
import { saveImage, getImage } from '../lib/imageStore.js'
import ClusterView from '../components/ClusterView.jsx'
import RiverView from '../components/RiverView.jsx'

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

// Strip HTML tags and return plain text — used for submit guards and entry previews
function stripHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
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

// ─── ImageStrip ───────────────────────────────────────────
// Shown in the write views (prompt + freewrite).
// Renders a row of thumbnails for attached images/GIFs and an
// "add" button for picking more files (up to maxImages).
//
// Props:
//   attachments — array of { file: File, previewUrl: string }
//   onAdd(att)  — called with a new { file, previewUrl } object
//   onRemove(i) — called with the index to remove
//   maxImages   — hard cap (default 5)
//
// Why does ImageStrip own the <input>?
// The file input needs a local ref so we can call .click() on it
// programmatically (hidden inputs can't be triggered any other way).
// Keeping the ref inside this component avoids cluttering TodayTab's state.
function ImageStrip({ attachments, onAdd, onRemove, maxImages = 5 }) {
  const fileInputRef = useRef(null)
  const canAddMore   = attachments.length < maxImages

  function handleFileChange(e) {
    const files     = Array.from(e.target.files)
    const remaining = maxImages - attachments.length
    // Slice to the remaining budget so we never exceed the cap
    files.slice(0, remaining).forEach(file => {
      // createObjectURL makes a temporary local URL for previewing the file
      // without reading it into memory as a string. It's revoked on submit/remove.
      const previewUrl = URL.createObjectURL(file)
      onAdd({ file, previewUrl })
    })
    // Reset so selecting the same file again still fires onChange
    e.target.value = ''
  }

  if (!canAddMore && attachments.length === 0) return null

  return (
    <div style={imageStyles.strip}>
      {attachments.map((att, i) => (
        <div key={att.previewUrl} style={imageStyles.thumb}>
          <img src={att.previewUrl} alt="" style={imageStyles.thumbImg} />
          <button
            style={imageStyles.thumbRemove}
            onClick={() => onRemove(i)}
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      ))}

      {canAddMore && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            style={imageStyles.addThumb}
            onClick={() => fileInputRef.current.click()}
            title="Add photo or GIF"
          >
            {attachments.length === 0 ? (
              <>
                <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
                <span style={{ fontSize: '10px', marginTop: '3px' }}>photo / gif</span>
              </>
            ) : (
              <span style={{ fontSize: '20px', lineHeight: 1 }}>+</span>
            )}
          </button>
        </>
      )}
    </div>
  )
}

// ─── ImageGallery ─────────────────────────────────────────
// Shown in the entry detail view.
// Fetches Blobs from IndexedDB by UUID, converts them to object URLs,
// and renders them as images. Cleans up the URLs on unmount.
//
// Why does this component own the async loading?
// The parent (EntriesTab) only stores IDs — it has no concept of images.
// Keeping the fetch inside this component means EntriesTab doesn't need
// to know anything about IndexedDB, and the loading/cleanup logic is
// co-located with the rendering.
function ImageGallery({ imageIds }) {
  const [urls, setUrls] = useState([])

  useEffect(() => {
    if (!imageIds?.length) {
      setUrls([])
      return
    }

    let active      = true
    // We track created URLs in a local array so the cleanup function
    // can revoke them even if the component unmounts before the
    // Promise resolves (the array is shared by reference).
    const createdUrls = []

    Promise.all(imageIds.map(id => getImage(id)))
      .then(blobs => {
        if (!active) return
        const newUrls = blobs
          .filter(Boolean)
          .map(blob => {
            const url = URL.createObjectURL(blob)
            createdUrls.push(url)
            return url
          })
        setUrls(newUrls)
      })
      .catch(() => {/* silently degrade if IndexedDB fails */})

    // Cleanup: cancel the state update and revoke any object URLs we created.
    // This runs when `imageIds` changes (new entry selected) or on unmount.
    return () => {
      active = false
      createdUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [imageIds])

  if (!urls.length) return null

  return (
    <div style={imageStyles.gallery}>
      {urls.map((url, i) => (
        <img
          key={url}
          src={url}
          alt={`Attachment ${i + 1}`}
          style={imageStyles.galleryImg}
        />
      ))}
    </div>
  )
}

// ─── RichTextEditor ───────────────────────────────────────
// A WYSIWYG writing area with a minimal formatting toolbar.
// Uses contentEditable so the browser handles selection + formatting natively.
// document.execCommand is technically deprecated but still works across all
// modern browsers — it's the only way to apply formatting without a library.
//
// Why onMouseDown + e.preventDefault() on toolbar buttons?
// Clicking a button normally shifts focus away from the editor, which would
// clear the selection that document.execCommand needs to act on. preventDefault
// stops the focus shift, keeping the selection intact.
//
// Props:
//   placeholder  — gray hint text shown when empty
//   onChange(html) — called on every keystroke with the current innerHTML
//   minHeight    — CSS value for the editable area height (default '280px')
//   autoFocus    — whether to focus on mount (default false)
function RichTextEditor({ placeholder, onChange, minHeight = '280px', autoFocus = false }) {
  const editorRef = useRef(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [activeFormats, setActiveFormats] = useState({})

  // Focus on mount if requested
  useEffect(() => {
    if (autoFocus) editorRef.current?.focus()
  }, [autoFocus])

  // Track which formats are active at the current cursor position.
  // selectionchange fires whenever the cursor moves or selection changes.
  // queryCommandState returns true if the current selection/caret has that format.
  useEffect(() => {
    function update() {
      setActiveFormats({
        bold:                 document.queryCommandState('bold'),
        italic:               document.queryCommandState('italic'),
        underline:            document.queryCommandState('underline'),
        strikeThrough:        document.queryCommandState('strikeThrough'),
        insertUnorderedList:  document.queryCommandState('insertUnorderedList'),
      })
    }
    document.addEventListener('selectionchange', update)
    return () => document.removeEventListener('selectionchange', update)
  }, [])

  function applyFormat(command) {
    editorRef.current?.focus()
    document.execCommand(command, false, null)
  }

  function handleInput() {
    const html  = editorRef.current.innerHTML
    const text  = editorRef.current.textContent.trim()
    setIsEmpty(!text && html !== '<br>')
    onChange(html)
  }

  function toolBtn(command, label, extraStyle = {}) {
    const isActive = activeFormats[command]
    return (
      <button
        key={command}
        onMouseDown={e => { e.preventDefault(); applyFormat(command) }}
        style={{
          ...rtStyles.toolBtn,
          ...(isActive ? rtStyles.toolBtnActive : {}),
          ...extraStyle,
        }}
        title={command}
        aria-label={command}
        aria-pressed={isActive}
      >
        {label}
      </button>
    )
  }

  return (
    <div style={rtStyles.wrapper}>
      <div style={rtStyles.toolbar}>
        {toolBtn('bold',                <strong>B</strong>)}
        {toolBtn('italic',              <em style={{ fontStyle: 'italic' }}>I</em>)}
        {toolBtn('underline',           <span style={{ textDecoration: 'underline' }}>U</span>)}
        {toolBtn('strikeThrough',       <span style={{ textDecoration: 'line-through' }}>S</span>)}
        <div style={rtStyles.divider} />
        {toolBtn('insertUnorderedList', '• list')}
      </div>

      <div style={rtStyles.editorWrapper}>
        {isEmpty && (
          <span style={rtStyles.placeholder} aria-hidden="true">{placeholder}</span>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          style={{ ...rtStyles.editor, minHeight }}
          onInput={handleInput}
        />
      </div>
    </div>
  )
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
  // attachments: array of { file: File, previewUrl: string }
  // Files are held in memory during writing and saved to IndexedDB on submit.
  const [attachments,   setAttachments]   = useState([])

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

  // Helpers for ImageStrip callbacks
  function handleAddAttachment(att) {
    setAttachments(prev => [...prev, att])
  }
  function handleRemoveAttachment(index) {
    setAttachments(prev => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }
  // Revoke all preview URLs and clear the list after saving
  function clearAttachments() {
    setAttachments(prev => {
      prev.forEach(a => URL.revokeObjectURL(a.previewUrl))
      return []
    })
  }

  // handleSubmitPrompt is async because saveImage() (IndexedDB) is async.
  // React event handlers can be async — React just won't await the result,
  // but since we manage all state changes ourselves inside the function
  // that's fine. The alternative (saving images before calling this) would
  // force TodayTab to know about IndexedDB, breaking the separation of concerns.
  async function handleSubmitPrompt() {
    if (!stripHtml(response).trim() || isSaving) return
    setIsSaving(true)

    // Save each image Blob to IndexedDB, get back UUID keys.
    // If this fails (e.g. quota exceeded) we degrade gracefully and save
    // the text entry without images rather than blocking the user.
    let imageIds = []
    try {
      imageIds = await Promise.all(attachments.map(a => saveImage(a.file)))
    } catch (err) {
      console.warn('Could not save images to IndexedDB:', err)
    }

    addEntry({
      prompt: {
        id:       currentPrompt.id,
        text:     currentPrompt.text,
        category: currentPrompt.category,
      },
      response:   response.trim(),
      mode:       'journal',
      isFreeText: false,
      imageIds,
      context: { moodBefore: null, tags: [] },
    })

    clearAttachments()
    setIsSaving(false)
    setResponse('')
    setView('done')
  }

  async function handleSubmitFreeWrite() {
    if (!stripHtml(response).trim() || isSaving) return
    setIsSaving(true)

    let imageIds = []
    try {
      imageIds = await Promise.all(attachments.map(a => saveImage(a.file)))
    } catch (err) {
      console.warn('Could not save images to IndexedDB:', err)
    }

    addEntry({
      prompt:     null,
      response:   response.trim(),
      mode:       'journal',
      isFreeText: true,
      imageIds,
      context: { moodBefore: null, tags: [] },
    })

    clearAttachments()
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
          <RichTextEditor
            placeholder="Start writing..."
            onChange={setResponse}
            autoFocus
          />
          <ImageStrip
            attachments={attachments}
            onAdd={handleAddAttachment}
            onRemove={handleRemoveAttachment}
          />
          <button
            style={{ ...styles.button, opacity: stripHtml(response).trim() ? 1 : 0.4 }}
            onClick={handleSubmitPrompt}
            disabled={!stripHtml(response).trim() || isSaving}
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
          <RichTextEditor
            placeholder="Just write..."
            onChange={setResponse}
            minHeight="220px"
            autoFocus
          />
          <ImageStrip
            attachments={attachments}
            onAdd={handleAddAttachment}
            onRemove={handleRemoveAttachment}
          />
          <button
            style={{ ...styles.button, opacity: stripHtml(response).trim() ? 1 : 0.4 }}
            onClick={handleSubmitFreeWrite}
            disabled={!stripHtml(response).trim() || isSaving}
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
          <div
            style={styles.detailResponse}
            dangerouslySetInnerHTML={{ __html: selected.response }}
          />
          {/* ImageGallery fetches Blobs from IndexedDB by UUID and renders them.
              It handles its own loading state and cleans up object URLs. */}
          <ImageGallery imageIds={selected.imageIds} />
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
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {entry.imageIds?.length > 0 && (
                <span style={styles.imageCountBadge}>
                  {entry.imageIds.length === 1 ? '1 image' : `${entry.imageIds.length} images`}
                </span>
              )}
              <span style={styles.entryTag}>
                {entry.isFreeText ? 'free write' : (entry.prompt?.category ?? '—')}
              </span>
            </div>
          </div>
          <p style={styles.entryPreview}>
            {(() => {
              const plain = stripHtml(entry.response)
              return plain.length > 120 ? plain.slice(0, 120) + '…' : plain
            })()}
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── MapTab ───────────────────────────────────────────────
// Two views toggled by a cluster · river control:
//
//   cluster — force-directed graph. Entries are nodes sized by text length,
//             coloured by primary theme. Edges connect entries that share a
//             theme. Tap a node to see a preview card + highlight related nodes.
//
//   river   — swimlane timeline. 9 horizontal lanes (one per category),
//             entry dots plotted by date. Dot size = emotionDensity.
//
// Empty state shown until ≥3 entries have been analysed (themes populated).
function MapTab() {
  const { entries } = useAppState()
  const [view, setView] = useState('cluster')

  // Only entries that have been through theme analysis are useful here.
  // useAppState runs retroactive migration on boot, so this list grows
  // automatically as older entries are backfilled.
  const analysedEntries = entries.filter(e => e.analysis.themes.length > 0)

  if (analysedEntries.length < 3) {
    return (
      <div style={styles.centred}>
        <div style={styles.card}>
          <p style={styles.eyebrow}>your thoughts map</p>
          <p style={styles.body}>
            Write a few more entries and patterns will start to appear here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={mapStyles.wrapper}>
      {/* cluster · river toggle — same typographic language as the tab bar */}
      <div style={mapStyles.toggleRow}>
        <button
          style={{
            ...mapStyles.toggleBtn,
            color:      view === 'cluster' ? 'var(--blue-600)' : 'var(--gray-400)',
            fontWeight: view === 'cluster' ? '500' : '400',
          }}
          onClick={() => setView('cluster')}
        >
          cluster
        </button>
        <span style={{ color: 'var(--gray-300)', fontSize: '13px' }}>·</span>
        <button
          style={{
            ...mapStyles.toggleBtn,
            color:      view === 'river' ? 'var(--blue-600)' : 'var(--gray-400)',
            fontWeight: view === 'river' ? '500' : '400',
          }}
          onClick={() => setView('river')}
        >
          river
        </button>
      </div>

      <div style={mapStyles.vizArea}>
        {view === 'cluster' && <ClusterView entries={analysedEntries} />}
        {view === 'river'   && <RiverView   entries={analysedEntries} />}
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

  // ── Image count badge (entry list cards) ────────────────
  imageCountBadge: {
    fontSize:        '10px',
    fontWeight:      '500',
    letterSpacing:   '0.06em',
    color:           'var(--blue-400)',
    backgroundColor: 'var(--blue-50)',
    border:          '1px solid var(--blue-100)',
    borderRadius:    '4px',
    padding:         '2px 6px',
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
  },
}

// ─── Image component styles ────────────────────────────────
// Used by ImageStrip (write-time) and ImageGallery (detail view).
const imageStyles = {
  // ── ImageStrip — write-time thumbnail row ────────────────
  strip: {
    display:     'flex',
    flexWrap:    'wrap',
    gap:         '8px',
    alignItems:  'center',
  },
  // Each thumbnail slot: fixed 72×72, clips the image to a rounded square
  thumb: {
    position:     'relative',
    width:        '72px',
    height:       '72px',
    borderRadius: '8px',
    overflow:     'hidden',
    flexShrink:   0,
    border:       '1px solid var(--blue-100)',
  },
  thumbImg: {
    width:      '100%',
    height:     '100%',
    objectFit:  'cover',
    display:    'block',
  },
  // Small × button overlaid top-right on each thumbnail
  thumbRemove: {
    position:        'absolute',
    top:             '3px',
    right:           '3px',
    width:           '18px',
    height:          '18px',
    borderRadius:    '50%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    color:           'white',
    border:          'none',
    cursor:          'pointer',
    fontSize:        '13px',
    lineHeight:      '1',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         0,
  },
  // The dashed "add more" tile — same size as thumbnails so the row stays uniform
  addThumb: {
    width:           '72px',
    height:          '72px',
    borderRadius:    '8px',
    border:          '1.5px dashed var(--blue-200)',
    backgroundColor: 'var(--blue-50)',
    color:           'var(--blue-400)',
    fontSize:        '0.7rem',
    cursor:          'pointer',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
    padding:         0,
    transition:      'border-color 0.15s, background-color 0.15s',
  },

  // ── ImageGallery — detail view ────────────────────────────
  gallery: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '8px',
    borderTop:     '1px solid var(--blue-100)',
    paddingTop:    '1rem',
    marginTop:     '0.25rem',
  },
  galleryImg: {
    width:        '100%',
    borderRadius: '8px',
    display:      'block',
    // GIFs animate automatically — no extra handling needed
  },
}

// ─── Rich text editor styles ──────────────────────────────
const rtStyles = {
  wrapper: {
    border:          '1px solid var(--blue-200)',
    borderRadius:    '8px',
    overflow:        'hidden',
    backgroundColor: 'var(--white)',
  },
  toolbar: {
    display:         'flex',
    alignItems:      'center',
    gap:             '2px',
    padding:         '5px 8px',
    borderBottom:    '1px solid var(--blue-100)',
    backgroundColor: 'var(--blue-50)',
  },
  toolBtn: {
    background:      'none',
    border:          'none',
    cursor:          'pointer',
    padding:         '3px 8px',
    borderRadius:    '4px',
    fontSize:        '13px',
    color:           'var(--gray-500)',
    lineHeight:      '1.4',
    transition:      'background-color 0.1s, color 0.1s',
    minWidth:        '26px',
    textAlign:       'center',
  },
  toolBtnActive: {
    backgroundColor: 'var(--blue-100)',
    color:           'var(--blue-600)',
  },
  divider: {
    width:           '1px',
    height:          '16px',
    backgroundColor: 'var(--blue-200)',
    margin:          '0 4px',
    flexShrink:      0,
  },
  editorWrapper: {
    position: 'relative',
  },
  editor: {
    display:         'block',
    width:           '100%',
    padding:         '0.75rem 1rem',
    fontSize:        '1rem',
    outline:         'none',
    lineHeight:      '1.65',
    color:           'var(--gray-900)',
    fontFamily:      'var(--font)',
    boxSizing:       'border-box',
    overflowY:       'auto',
  },
  placeholder: {
    position:        'absolute',
    top:             '0.75rem',
    left:            '1rem',
    color:           'var(--gray-300)',
    fontSize:        '1rem',
    lineHeight:      '1.65',
    pointerEvents:   'none',
    userSelect:      'none',
  },
}

// ─── Map tab styles ────────────────────────────────────────
// Kept separate from `styles` to avoid polluting the shared namespace.
const mapStyles = {
  wrapper: {
    flex:            '1',
    display:         'flex',
    flexDirection:   'column',
    paddingTop:      '3rem',   // clears the fixed tab bar
    overflow:        'hidden',
  },
  toggleRow: {
    display:         'flex',
    justifyContent:  'center',
    alignItems:      'center',
    gap:             '0.5rem',
    padding:         '0.75rem 0',
    borderBottom:    '1px solid var(--blue-100)',
    backgroundColor: 'var(--white)',
  },
  toggleBtn: {
    background:    'none',
    border:        'none',
    fontSize:      '13px',
    letterSpacing: '0.04em',
    cursor:        'pointer',
    padding:       '0',
    textTransform: 'lowercase',
    transition:    'color 0.15s',
  },
  vizArea: {
    flex:     '1',
    overflow: 'auto',
    padding:  '1rem',
  },
}
