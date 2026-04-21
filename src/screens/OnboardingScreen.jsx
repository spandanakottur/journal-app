import { useState } from 'react'
import { useAppState } from '../hooks/useAppState.jsx'

// ─── Constants ────────────────────────────────────────────
const INTENTIONS = [
  { id: 'understand', text: 'I want to understand myself better' },
  { id: 'thoughts',   text: 'I need somewhere to put my thoughts' },
  { id: 'process',    text: 'I am going through something and need to process it' },
]

const EMOTION_WHEEL = [
  {
    id: 'happy', label: 'Happy',
    fills: ['#FFF9C4', '#FFF176', '#FFD54F'], selected: '#F9A825',
    children: [
      { id: 'excited', label: 'Excited', children: [
        { id: 'playful',    label: 'Playful'    },
        { id: 'optimistic', label: 'Optimistic' },
      ]},
      { id: 'content', label: 'Content', children: [
        { id: 'peaceful', label: 'Peaceful' },
        { id: 'grateful', label: 'Grateful' },
      ]},
    ],
  },
  {
    id: 'sad', label: 'Sad',
    fills: ['#BBDEFB', '#90CAF9', '#64B5F6'], selected: '#1565C0',
    children: [
      { id: 'hurt', label: 'Hurt', children: [
        { id: 'heartbroken', label: 'Heartbroken' },
        { id: 'fragile',     label: 'Fragile'     },
      ]},
      { id: 'lonely', label: 'Lonely', children: [
        { id: 'empty', label: 'Empty' },
        { id: 'lost',  label: 'Lost'  },
      ]},
    ],
  },
  {
    id: 'angry', label: 'Angry',
    fills: ['#FFCDD2', '#EF9A9A', '#E57373'], selected: '#C62828',
    children: [
      { id: 'frustrated', label: 'Frustrated', children: [
        { id: 'annoyed',   label: 'Annoyed'   },
        { id: 'impatient', label: 'Impatient' },
      ]},
      { id: 'bitter', label: 'Bitter', children: [
        { id: 'resentful', label: 'Resentful' },
        { id: 'jealous',   label: 'Jealous'   },
      ]},
    ],
  },
  {
    id: 'fearful', label: 'Fearful',
    fills: ['#E1BEE7', '#CE93D8', '#BA68C8'], selected: '#6A1B9A',
    children: [
      { id: 'anxious', label: 'Anxious', children: [
        { id: 'worried',     label: 'Worried'     },
        { id: 'overwhelmed', label: 'Overwhelmed' },
      ]},
      { id: 'helpless', label: 'Helpless', children: [
        { id: 'trapped',    label: 'Trapped'    },
        { id: 'vulnerable', label: 'Vulnerable' },
      ]},
    ],
  },
  {
    id: 'disgusted', label: 'Disgusted',
    fills: ['#C8E6C9', '#A5D6A7', '#81C784'], selected: '#2E7D32',
    children: [
      { id: 'ashamed', label: 'Ashamed', children: [
        { id: 'guilty',      label: 'Guilty'      },
        { id: 'embarrassed', label: 'Embarrassed' },
      ]},
      { id: 'critical', label: 'Critical', children: [
        { id: 'skeptical', label: 'Skeptical' },
        { id: 'withdrawn', label: 'Withdrawn' },
      ]},
    ],
  },
]

const WARMUP_PROMPT = "Don't think. Just write the first three words that describe where you are right now — in life, not location. Then say more if you want to."

// ─── Arc helper ───────────────────────────────────────────
function arcPath(cx, cy, r1, r2, startAngle, endAngle) {
  const x0 = cx + r2 * Math.cos(startAngle)
  const y0 = cy + r2 * Math.sin(startAngle)
  const x1 = cx + r2 * Math.cos(endAngle)
  const y1 = cy + r2 * Math.sin(endAngle)
  const x2 = cx + r1 * Math.cos(endAngle)
  const y2 = cy + r1 * Math.sin(endAngle)
  const x3 = cx + r1 * Math.cos(startAngle)
  const y3 = cy + r1 * Math.sin(startAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M${x0},${y0} A${r2},${r2} 0 ${largeArc},1 ${x1},${y1} L${x2},${y2} A${r1},${r1} 0 ${largeArc},0 ${x3},${y3} Z`
}

// ─── EmotionWheel component ───────────────────────────────
// Three-ring SVG donut: 5 core → 10 sub → 20 leaf emotions.
// All rings are selectable. selected = emotion id string.
function EmotionWheel({ selected, onSelect }) {
  const cx = 155, cy = 155
  const innerR  = { r1: 38,  r2: 80  }
  const middleR = { r1: 82,  r2: 118 }
  const outerR  = { r1: 120, r2: 152 }

  const coreCount  = EMOTION_WHEEL.length        // 5
  const coreAngle  = (2 * Math.PI) / coreCount   // 72°
  const subAngle   = coreAngle / 2               // 36°
  const leafAngle  = subAngle / 2                // 18°
  const startOff   = -Math.PI / 2               // 12 o'clock

  // Find which core emotion a given id belongs to
  function findCore(id) {
    return EMOTION_WHEEL.find(c =>
      c.id === id || c.children.some(s => s.id === id || s.children.some(l => l.id === id))
    )
  }

  // Find which sub-emotion a given id belongs to
  function findSub(id) {
    for (const core of EMOTION_WHEEL) {
      const sub = core.children.find(s => s.id === id || s.children.some(l => l.id === id))
      if (sub) return sub
    }
    return null
  }

  const selectedCore = selected ? findCore(selected) : null
  const selectedSub  = selected ? findSub(selected)  : null

  // Label for the centre hole
  const centreLabel = selected
    ? EMOTION_WHEEL.flatMap(c => [c, ...c.children, ...c.children.flatMap(s => s.children)])
        .find(e => e.id === selected)?.label ?? ''
    : null

  const segments = []

  EMOTION_WHEEL.forEach((core, ci) => {
    const coreStart = startOff + ci * coreAngle
    const coreEnd   = coreStart + coreAngle
    const coreIsSelected = selected === core.id
    const coreIsAncestor = selectedCore?.id === core.id && !coreIsSelected

    // ── Inner ring (core emotion)
    const cMid = coreStart + coreAngle / 2
    const cLx  = cx + ((innerR.r1 + innerR.r2) / 2) * Math.cos(cMid)
    const cLy  = cy + ((innerR.r1 + innerR.r2) / 2) * Math.sin(cMid)

    segments.push(
      <g key={core.id} onClick={() => onSelect(core.id)} style={{ cursor: 'pointer' }}>
        <path
          d={arcPath(cx, cy, innerR.r1, innerR.r2, coreStart, coreEnd)}
          fill={coreIsSelected ? core.selected : coreIsAncestor ? core.fills[1] : core.fills[0]}
          stroke={coreIsSelected ? core.selected : 'rgba(255,255,255,0.8)'}
          strokeWidth={coreIsSelected ? 2 : 1}
        />
        <text
          x={cLx} y={cLy}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={11} fontWeight={coreIsSelected ? 700 : 500}
          fill="#3E2723"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {core.label}
        </text>
      </g>
    )

    // ── Middle + outer rings (sub + leaf emotions)
    core.children.forEach((sub, si) => {
      const subStart = coreStart + si * subAngle
      const subEnd   = subStart + subAngle
      const subIsSelected = selected === sub.id
      const subIsAncestor = selectedSub?.id === sub.id && !subIsSelected

      const sMid = subStart + subAngle / 2
      const sLx  = cx + ((middleR.r1 + middleR.r2) / 2) * Math.cos(sMid)
      const sLy  = cy + ((middleR.r1 + middleR.r2) / 2) * Math.sin(sMid)

      segments.push(
        <g key={sub.id} onClick={() => onSelect(sub.id)} style={{ cursor: 'pointer' }}>
          <path
            d={arcPath(cx, cy, middleR.r1, middleR.r2, subStart, subEnd)}
            fill={subIsSelected ? core.selected : subIsAncestor ? core.fills[2] : core.fills[1]}
            stroke={subIsSelected ? core.selected : 'rgba(255,255,255,0.8)'}
            strokeWidth={subIsSelected ? 2 : 1}
          />
          <text
            x={sLx} y={sLy}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={9.5} fontWeight={subIsSelected ? 700 : 400}
            fill="#3E2723"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {sub.label}
          </text>
        </g>
      )

      // ── Outer ring (leaf emotions)
      sub.children.forEach((leaf, li) => {
        const leafStart = subStart + li * leafAngle
        const leafEnd   = leafStart + leafAngle
        const leafIsSelected = selected === leaf.id

        const lMid = leafStart + leafAngle / 2
        const lLx  = cx + ((outerR.r1 + outerR.r2) / 2) * Math.cos(lMid)
        const lLy  = cy + ((outerR.r1 + outerR.r2) / 2) * Math.sin(lMid)

        // Rotate label to follow the arc curve for outer ring
        const labelAngleDeg = (lMid * 180) / Math.PI + 90

        segments.push(
          <g key={leaf.id} onClick={() => onSelect(leaf.id)} style={{ cursor: 'pointer' }}>
            <path
              d={arcPath(cx, cy, outerR.r1, outerR.r2, leafStart, leafEnd)}
              fill={leafIsSelected ? core.selected : core.fills[2]}
              stroke={leafIsSelected ? core.selected : 'rgba(255,255,255,0.8)'}
              strokeWidth={leafIsSelected ? 2 : 1}
            />
            <text
              x={lLx} y={lLy}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={8} fontWeight={leafIsSelected ? 700 : 400}
              fill="#3E2723"
              transform={`rotate(${labelAngleDeg}, ${lLx}, ${lLy})`}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {leaf.label}
            </text>
          </g>
        )
      })
    })
  })

  return (
    <svg width={310} height={310} viewBox="0 0 310 310" style={{ display: 'block' }}>
      {segments}
      {/* Centre hole */}
      <circle cx={cx} cy={cy} r={37} fill="white" />
      <text
        x={cx} y={cy}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={centreLabel ? 10 : 9}
        fontWeight={centreLabel ? 600 : 400}
        fill={centreLabel ? '#5D4037' : '#BDBDBD'}
      >
        {centreLabel || 'tap to choose'}
      </text>
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────
export default function OnboardingScreen() {
  const { updateProfile, addEntry } = useAppState()

  const [step, setStep]         = useState(0)
  const [name, setName]         = useState('')
  const [intention, setIntention] = useState(null)
  const [mood, setMood]         = useState(null)
  const [response, setResponse] = useState('')
  const [isSaving, setIsSaving] = useState(false)

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

    updateProfile({
      name:           name.trim(),
      intention:      intention,
      onboardingStep: 1,
      createdAt:      new Date().toISOString(),
    })

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
    setStep(4)
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
              style={{ ...styles.button, opacity: name.trim() ? 1 : 0.4 }}
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
              style={{ ...styles.button, opacity: intention ? 1 : 0.4 }}
              onClick={handleIntentionSubmit}
              disabled={!intention}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2 — Emotion wheel */}
        {step === 2 && (
          <div style={styles.step}>
            <p style={styles.eyebrow}>right now</p>
            <h1 style={styles.heading}>
              How are you feeling today?
            </h1>
            <p style={styles.body}>
              Tap any ring — broad or specific, whatever feels right.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
              <EmotionWheel selected={mood} onSelect={setMood} />
            </div>
            <button
              style={{ ...styles.button, opacity: mood ? 1 : 0.4 }}
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
              style={{ ...styles.button, opacity: response.trim() ? 1 : 0.4 }}
              onClick={handleWarmupSubmit}
              disabled={!response.trim() || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save my entry'}
            </button>
          </div>
        )}

        {/* Step 4 — Completion */}
        {step === 4 && (
          <div style={styles.step}>
            <p style={styles.eyebrow}>you're in</p>
            <h1 style={styles.heading}>
              You're all set, {name}.
            </h1>
            <p style={styles.body}>
              Your first prompt will be here when you come back.
              No pressure, no schedule — just you and the page.
            </p>
            <button
              style={styles.button}
              onClick={() => updateProfile({ onboardingStep: 4 })}
            >
              Start journaling
            </button>
          </div>
        )}

        {/* Step indicator dots */}
        <div style={styles.dots}>
          {[0, 1, 2, 3, 4].map(i => (
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
const styles = {
  container: {
    minHeight:       '100vh',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         '2rem',
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
    width:           '100%',
    padding:         '0.75rem 1rem',
    fontSize:        '1rem',
    border:          '1px solid var(--blue-200)',
    borderRadius:    '8px',
    outline:         'none',
    color:           'var(--gray-900)',
    backgroundColor: 'var(--white)',
  },
  textarea: {
    width:           '100%',
    minHeight:       '160px',
    padding:         '0.75rem 1rem',
    fontSize:        '1rem',
    border:          '1px solid var(--blue-200)',
    borderRadius:    '8px',
    outline:         'none',
    resize:          'vertical',
    lineHeight:      '1.6',
    color:           'var(--gray-900)',
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
