import { useState, useMemo, useEffect, useRef } from 'react'
import { scaleTime, extent, zoom, zoomIdentity, select } from 'd3'
import { CATEGORY_COLORS, ZoomControls } from './ClusterView.jsx'

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'identity', 'emotions', 'relationships', 'memory',
  'future', 'values', 'everyday', 'fears', 'media',
]

const COL_WIDTH = 72                              // px per theme column
const MARGIN    = { top: 88, right: 20, bottom: 32, left: 52 }

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(isoString) {
  const date      = new Date(isoString)
  const today     = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString())     return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── PreviewCard ────────────────────────────────────────────────────────────────
// Fixed to the bottom of the viewport so it works inside a scrollable container.
function PreviewCard({ entry, onDismiss }) {
  const primary    = entry.analysis.themes[0]
  const color      = CATEGORY_COLORS[primary] ?? '#94A3B8'
  const preview    = entry.response.slice(0, 100) + (entry.response.length > 100 ? '…' : '')
  const promptText = entry.prompt?.text ?? null

  return (
    <div style={cardStyles.overlay} onClick={onDismiss}>
      <div style={cardStyles.card} onClick={e => e.stopPropagation()}>
        <div style={{ ...cardStyles.accentBar, backgroundColor: color }} />
        <div style={cardStyles.body}>
          <div style={cardStyles.meta}>
            <span style={cardStyles.date}>{formatDate(entry.date)}</span>
            <span style={{ ...cardStyles.tag, color }}>{primary}</span>
          </div>
          {promptText && <p style={cardStyles.prompt}>{promptText}</p>}
          <p style={cardStyles.response}>{preview}</p>
        </div>
        <button style={cardStyles.closeBtn} onClick={onDismiss}>close</button>
      </div>
    </div>
  )
}

const cardStyles = {
  overlay: {
    position: 'fixed',
    bottom:   0,
    left:     0,
    right:    0,
    zIndex:   1000,
    display:  'flex',
    alignItems: 'flex-end',
  },
  card: {
    backgroundColor: 'var(--white)',
    border:          '1px solid var(--blue-100)',
    borderRadius:    '16px 16px 0 0',
    width:           '100%',
    maxWidth:        '560px',
    margin:          '0 auto',
    overflow:        'hidden',
    animation:       'slideUp 0.22s ease-out',
  },
  accentBar:  { height: '4px', width: '100%' },
  body: {
    padding:       '1.25rem 1.5rem 0.75rem',
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.5rem',
  },
  meta: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  date: { fontSize: '0.8rem', fontWeight: '500', color: 'var(--gray-500)' },
  tag: {
    fontSize:      '10px',
    fontWeight:    '600',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  prompt: {
    fontSize:   '0.82rem',
    fontStyle:  'italic',
    color:      'var(--gray-400)',
    lineHeight: '1.5',
    margin:     0,
  },
  response: { fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.6', margin: 0 },
  closeBtn: {
    display:       'block',
    width:         '100%',
    padding:       '0.75rem',
    background:    'none',
    border:        'none',
    borderTop:     '1px solid var(--blue-100)',
    fontSize:      '0.8rem',
    color:         'var(--blue-400)',
    cursor:        'pointer',
    letterSpacing: '0.05em',
    textTransform: 'lowercase',
  },
}

// ─── RiverView ─────────────────────────────────────────────────────────────────
// Vertical swimlane timeline:
//   - 9 columns (one per theme category) run left → right
//   - Time runs top → bottom (oldest entries at top, newest at bottom)
//   - Each entry appears as a dot in every column matching its themes
//   - Dot size = emotionDensity (4–10px), fixed 5px if not populated
//   - Clicking a dot opens the same preview card as the cluster view
//
// Why vertical instead of horizontal?
// A horizontal layout reads like a table. A vertical layout reads like a river —
// time flows down naturally, and you can see which themes a period of your life
// touched by scanning across the columns.
export default function RiverView({ entries }) {
  const [selectedEntry, setSelectedEntry] = useState(null)
  const svgRef   = useRef(null)
  const zoomGRef = useRef(null)   // the <g> that receives the zoom transform
  const zoomRef  = useRef(null)   // the D3 zoom behaviour instance

  // Attach D3 zoom to the SVG once on mount.
  // The zoom transform is written directly onto zoomGRef (bypasses React
  // re-render) for smooth, jank-free animation on every wheel/pinch event.
  useEffect(() => {
    if (!svgRef.current) return
    const zoomBehavior = zoom()
      .scaleExtent([0.4, 5])
      .on('zoom', event => {
        if (zoomGRef.current) {
          select(zoomGRef.current).attr('transform', event.transform)
        }
      })
    select(svgRef.current).call(zoomBehavior)
    zoomRef.current = zoomBehavior
    return () => select(svgRef.current).on('.zoom', null)
  }, [])

  const zoomIn    = () => select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, 1.4)
  const zoomOut   = () => select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, 1 / 1.4)
  const zoomReset = () => select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, zoomIdentity)

  // Inject @keyframes slideUp for the preview card animation.
  // Same pattern as ClusterView — @keyframes can't be expressed as inline styles.
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = '@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }'
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  const innerWidth = CATEGORIES.length * COL_WIDTH
  const SVG_WIDTH  = MARGIN.left + innerWidth + MARGIN.right

  // useMemo: only recompute scales when entries change.
  // The y-axis maps dates to vertical pixel positions.
  // Oldest date → top (y = 0), newest → bottom (y = innerHeight).
  const { yScale, innerHeight } = useMemo(() => {
    if (entries.length === 0) return { yScale: null, innerHeight: 400 }

    const [min, max] = extent(entries, e => new Date(e.date))

    // Pad 12h on each side so edge dots aren't clipped by the margin
    const paddedMin = new Date(min.getTime() - 12 * 3600_000)
    const paddedMax = new Date(max.getTime() + 12 * 3600_000)

    // ~80px per day, minimum 420px so a single-day range isn't just a dot
    const days        = (paddedMax - paddedMin) / 86_400_000
    const innerHeight = Math.max(420, Math.round(days * 80))

    const yScale = scaleTime()
      .domain([paddedMin, paddedMax])   // oldest at domain start → top of SVG
      .range([0, innerHeight])
      .nice()

    return { yScale, innerHeight }
  }, [entries])

  const dotRadius = e => {
    const d = e.analysis.emotionDensity
    return d != null ? 4 + d * 6 : 5
  }

  // Horizontal centre of each category column
  const colX = i => i * COL_WIDTH + COL_WIDTH / 2

  if (!yScale) return null

  const SVG_HEIGHT = MARGIN.top + innerHeight + MARGIN.bottom
  const yTicks     = yScale.ticks(6)

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* zoomGRef wraps everything — D3 zoom writes its transform here directly.
            The inner <g> keeps the margin offset separate from the zoom transform. */}
        <g ref={zoomGRef}>
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>

          {/* ── Column backgrounds + rotated headers ─────────────────── */}
          {CATEGORIES.map((cat, i) => {
            const x = colX(i)
            return (
              <g key={cat}>
                {/* Alternating column shade for readability */}
                <rect
                  x={i * COL_WIDTH}
                  y={0}
                  width={COL_WIDTH}
                  height={innerHeight}
                  fill={i % 2 === 0 ? 'rgba(239,246,255,0.65)' : 'transparent'}
                />

                {/* Vertical separator between columns */}
                <line
                  x1={i * COL_WIDTH} x2={i * COL_WIDTH}
                  y1={0}             y2={innerHeight}
                  stroke="#E2E8F0"   strokeWidth={1}
                />

                {/* Category label rotated -45°, ending just above the column centre.
                    textAnchor="end" means the label reads up-left from (x, -12),
                    so the right end of the text aligns to the column centre. */}
                <text
                  x={x}
                  y={-12}
                  textAnchor="end"
                  transform={`rotate(-45, ${x}, -12)`}
                  style={{
                    fontSize:   '11px',
                    fill:       CATEGORY_COLORS[cat],
                    fontFamily: 'var(--font)',
                    fontWeight: '500',
                  }}
                >
                  {cat}
                </text>
              </g>
            )
          })}

          {/* Right border of last column */}
          <line
            x1={innerWidth} x2={innerWidth}
            y1={0}          y2={innerHeight}
            stroke="#E2E8F0" strokeWidth={1}
          />

          {/* ── Y-axis: date ticks on the left ───────────────────────── */}
          {yTicks.map((tick, i) => (
            <g key={i} transform={`translate(0, ${yScale(tick)})`}>
              {/* Horizontal grid line across all columns */}
              <line
                x1={0} x2={innerWidth}
                y1={0} y2={0}
                stroke="#E2E8F0" strokeWidth={1}
              />
              <text
                x={-8}
                y={0}
                textAnchor="end"
                dominantBaseline="middle"
                style={{ fontSize: '10px', fill: '#9CA3AF', fontFamily: 'var(--font)' }}
              >
                {tick.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </text>
            </g>
          ))}

          {/* ── Connector lines ──────────────────────────────────────── */}
          {/* For each category column, draw a line between consecutive entries
              (sorted oldest→newest = top→bottom). Rendered before dots so
              circles sit on top of the lines. */}
          {CATEGORIES.map((cat, i) => {
            const colEntries = entries
              .filter(e => e.analysis.themes.includes(cat))
              .sort((a, b) => new Date(a.date) - new Date(b.date))

            return colEntries.slice(0, -1).map((entry, j) => {
              const next = colEntries[j + 1]
              return (
                <line
                  key={`${cat}-line-${j}`}
                  x1={colX(i)}
                  y1={yScale(new Date(entry.date))}
                  x2={colX(i)}
                  y2={yScale(new Date(next.date))}
                  stroke={CATEGORY_COLORS[cat]}
                  strokeWidth={1.5}
                  strokeOpacity={0.35}
                />
              )
            })
          })}

          {/* ── Entry dots ───────────────────────────────────────────── */}
          {/* An entry appears once per theme it holds — one dot per column it belongs to. */}
          {entries.map(entry =>
            entry.analysis.themes.map(cat => {
              const i = CATEGORIES.indexOf(cat)
              if (i === -1) return null
              return (
                <circle
                  key={`${entry.id}-${cat}`}
                  cx={colX(i)}
                  cy={yScale(new Date(entry.date))}
                  r={dotRadius(entry)}
                  fill={CATEGORY_COLORS[cat]}
                  fillOpacity={0.8}
                  stroke="#fff"
                  strokeWidth={1.5}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedEntry(entry)}
                />
              )
            })
          )}

        </g>
        </g>
      </svg>

      <ZoomControls onIn={zoomIn} onOut={zoomOut} onReset={zoomReset} />

      {selectedEntry && (
        <PreviewCard
          entry={selectedEntry}
          onDismiss={() => setSelectedEntry(null)}
        />
      )}
    </div>
  )
}
