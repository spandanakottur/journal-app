import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import {
  forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide,
  select, zoom, zoomIdentity,
} from 'd3'

// ─── Constants ─────────────────────────────────────────────────────────────────

// Zoom scale at which the word cloud "explodes" into entry constellations
const EXPAND_THRESHOLD = 2.2

// ─── Category colour map ───────────────────────────────────────────────────────
export const CATEGORY_COLORS = {
  identity:      '#A78BFA',
  emotions:      '#F87171',
  relationships: '#FB923C',
  memory:        '#FBBF24',
  future:        '#34D399',
  values:        '#38BDF8',
  everyday:      '#94A3B8',
  fears:         '#C084FC',
  media:         '#4ADE80',
}

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

function fontSize(weight, maxWeight) {
  return 11 + (weight / Math.max(maxWeight, 1)) * 13   // 11–24px
}

function collideRadius(weight, maxWeight, word) {
  const fs = fontSize(weight, maxWeight)
  return (fs * 0.55 * word.length) / 2 + 8
}

// ─── PreviewCard ────────────────────────────────────────────────────────────────
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
  overlay: { position:'absolute', bottom:0, left:0, right:0, top:0, display:'flex', alignItems:'flex-end', pointerEvents:'auto' },
  card: { backgroundColor:'var(--white)', border:'1px solid var(--blue-100)', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:'560px', margin:'0 auto', overflow:'hidden', animation:'slideUp 0.22s ease-out' },
  accentBar: { height:'4px', width:'100%' },
  body: { padding:'1.25rem 1.5rem 0.75rem', display:'flex', flexDirection:'column', gap:'0.5rem' },
  meta: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  date: { fontSize:'0.8rem', fontWeight:'500', color:'var(--gray-500)' },
  tag:  { fontSize:'10px', fontWeight:'600', letterSpacing:'0.08em', textTransform:'uppercase' },
  prompt:   { fontSize:'0.82rem', fontStyle:'italic', color:'var(--gray-400)', lineHeight:'1.5', margin:0 },
  response: { fontSize:'0.9rem', color:'var(--gray-700)', lineHeight:'1.6', margin:0 },
  closeBtn: { display:'block', width:'100%', padding:'0.75rem', background:'none', border:'none', borderTop:'1px solid var(--blue-100)', fontSize:'0.8rem', color:'var(--blue-400)', cursor:'pointer', letterSpacing:'0.05em', textTransform:'lowercase' },
}

// ─── ZoomControls ─────────────────────────────────────────────────────────────
export function ZoomControls({ onIn, onOut, onReset }) {
  return (
    <div style={zoomCtrlStyles.wrap}>
      <button style={zoomCtrlStyles.btn} onClick={onIn}  title="Zoom in">+</button>
      <button style={zoomCtrlStyles.btn} onClick={onOut} title="Zoom out">−</button>
      <button style={{ ...zoomCtrlStyles.btn, fontSize:'11px' }} onClick={onReset} title="Reset">↺</button>
    </div>
  )
}
const zoomCtrlStyles = {
  wrap: { position:'absolute', bottom:'1rem', right:'1rem', display:'flex', flexDirection:'column', gap:'3px' },
  btn:  { width:'28px', height:'28px', background:'var(--white)', border:'1px solid var(--blue-100)', borderRadius:'8px', fontSize:'16px', color:'var(--gray-500)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
}

// ─── ClusterView ───────────────────────────────────────────────────────────────
//
// COLLAPSED (zoom < 2.2×)  — word cloud
//   One node per unique keyword across all entries.
//   Sized by total weight. Words from the same entry attract each other.
//
// EXPANDED (zoom ≥ 2.2×)  — entry constellations
//   One dated "anchor" circle per entry + keyword satellites around it.
//   Thin threads connect each keyword to its anchor.
//   Anchors strongly repel each other, keywords pull tight to their anchor.
//   This view is structurally different regardless of whether keywords repeat.
//
// Zoom is an action: it reorganises the data model, not just the scale.
export default function ClusterView({ entries }) {
  const svgRef        = useRef(null)
  const simulationRef = useRef(null)
  const zoomRef       = useRef(null)
  const zoomScaleRef  = useRef(1)
  const [selectedEntry,  setSelectedEntry]  = useState(null)
  const [highlightedIds, setHighlightedIds] = useState(null)
  const [isExpanded,     setIsExpanded]     = useState(false)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = '@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }'
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  // ── COLLAPSED: aggregate same keyword across entries ─────────────────────
  const { collapsedNodes, collapsedLinks, maxCollapsedWeight } = useMemo(() => {
    const wordMap = new Map()
    entries.forEach(entry => {
      const theme = entry.analysis.themes[0]
      entry.analysis.keywords.forEach(({ word, weight }) => {
        if (wordMap.has(word)) {
          const n = wordMap.get(word)
          n.weight += weight
          n.entries.push({ entry, weight })
          if (weight > n.topWeight) { n.theme = theme; n.topWeight = weight }
        } else {
          wordMap.set(word, { id: word, word, weight, topWeight: weight, theme, entries: [{ entry, weight }] })
        }
      })
    })
    const nodes     = Array.from(wordMap.values())
    const maxWeight = Math.max(...nodes.map(n => n.weight), 1)
    const links     = []
    entries.forEach(entry => {
      const words = entry.analysis.keywords.map(k => k.word).filter(w => wordMap.has(w))
      for (let i = 0; i < words.length; i++)
        for (let j = i + 1; j < words.length; j++)
          links.push({ source: words[i], target: words[j] })
    })
    return { collapsedNodes: nodes, collapsedLinks: links, maxCollapsedWeight: maxWeight }
  }, [entries])

  // ── EXPANDED: entry anchor circles + keyword satellites ──────────────────
  // Each entry becomes a dated anchor node. Its keywords orbit it via link force.
  // This layout is structurally different from the word cloud even when
  // every keyword appears in only one entry.
  const { expandedNodes, expandedLinks, maxExpandedWeight } = useMemo(() => {
    const nodes = []
    const links = []
    entries.forEach(entry => {
      const theme    = entry.analysis.themes[0]
      const anchorId = `anchor__${entry.id}`

      // Anchor — rendered as a labelled circle
      nodes.push({
        id:       anchorId,
        isAnchor: true,
        word:     formatDate(entry.date),
        weight:   0,
        theme,
        entries:  [{ entry, weight: 1 }],
      })

      // Keyword satellites
      entry.analysis.keywords.forEach(({ word, weight }) => {
        const kwId = `${entry.id}__${word}`
        nodes.push({
          id:        kwId,
          isAnchor:  false,
          word,
          weight,
          topWeight: weight,
          theme,
          entries:   [{ entry, weight }],
        })
        // Thread connecting keyword back to its anchor
        links.push({ source: anchorId, target: kwId })
      })
    })
    const maxWeight = Math.max(...nodes.filter(n => !n.isAnchor).map(n => n.weight), 1)
    return { expandedNodes: nodes, expandedLinks: links, maxExpandedWeight: maxWeight }
  }, [entries])

  // ── Click handler (both modes) ────────────────────────────────────────────
  const handleNodeClick = useCallback((d) => {
    const best = d.entries.reduce((a, b) => a.weight >= b.weight ? a : b)
    setSelectedEntry(best.entry)

    const clickedEntryIds = new Set(d.entries.map(e => e.entry.id))
    const activeNodes     = isExpanded ? expandedNodes : collapsedNodes
    const highlighted     = new Set()
    activeNodes.forEach(n => {
      if (n.entries.some(e => clickedEntryIds.has(e.entry.id))) highlighted.add(n.id)
    })
    setHighlightedIds(highlighted)
  }, [isExpanded, expandedNodes, collapsedNodes])

  // ── Force simulation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return
    const activeNodes = isExpanded ? expandedNodes : collapsedNodes
    const activeLinks = isExpanded ? expandedLinks : collapsedLinks
    const maxW        = isExpanded ? maxExpandedWeight : maxCollapsedWeight
    if (activeNodes.length === 0) return

    const savedTransform = svgRef.current.__zoom ?? zoomIdentity

    const svg    = select(svgRef.current)
    svg.selectAll('*').remove()

    const width  = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    // Position seeding on mode transition
    if (isExpanded) {
      // Anchors start near the centroid of their keywords' collapsed positions.
      // Keywords start near their anchor — giving the "burst outward" feeling.
      entries.forEach(entry => {
        const anchorId = `anchor__${entry.id}`
        const kwIds    = entry.analysis.keywords.map(k => `${entry.id}__${k.word}`)
        const parents  = entry.analysis.keywords
          .map(k => collapsedNodes.find(cn => cn.word === k.word))
          .filter(Boolean)

        const cx = parents.length
          ? parents.reduce((s, n) => s + (n.x ?? width / 2),  0) / parents.length
          : width  / 2 + (Math.random() - 0.5) * width  * 0.5
        const cy = parents.length
          ? parents.reduce((s, n) => s + (n.y ?? height / 2), 0) / parents.length
          : height / 2 + (Math.random() - 0.5) * height * 0.5

        const anchor = expandedNodes.find(n => n.id === anchorId)
        if (anchor) { anchor.x = cx; anchor.y = cy }
        kwIds.forEach(id => {
          const kw = expandedNodes.find(n => n.id === id)
          if (kw) { kw.x = cx + (Math.random() - 0.5) * 30; kw.y = cy + (Math.random() - 0.5) * 30 }
        })
      })
    } else {
      // On collapse: nudge nodes slightly off their expanded positions so the
      // simulation visibly re-settles, but not so far that they fly wildly.
      collapsedNodes.forEach(cn => {
        cn.x = width  / 2 + (Math.random() - 0.5) * width  * 0.25
        cn.y = height / 2 + (Math.random() - 0.5) * height * 0.25
        delete cn.vx; delete cn.vy
      })
    }

    const g = svg.append('g')

    // restoringRef: prevents the transform-restore call from triggering another
    // threshold crossing. Without this, restoring a saved transform that happens
    // to cross the boundary would cause an infinite expand/collapse loop.
    const restoringRef = { current: true }

    const zoomBehavior = zoom()
      .scaleExtent([0.4, 5])
      .on('zoom', event => {
        g.attr('transform', event.transform)
        if (restoringRef.current) return   // skip threshold check during restore
        const prev = zoomScaleRef.current
        const next = event.transform.k
        zoomScaleRef.current = next
        if      (prev < EXPAND_THRESHOLD && next >= EXPAND_THRESHOLD) setIsExpanded(true)
        else if (prev >= EXPAND_THRESHOLD && next < EXPAND_THRESHOLD) setIsExpanded(false)
      })

    svg.call(zoomBehavior)
    // Cancel any ongoing zoom transitions from the previous simulation before
    // restoring position — prevents old transitions from fighting the new state.
    svg.interrupt()
    svg.call(zoomBehavior.transform, savedTransform)
    restoringRef.current = false   // from here on, threshold checks are live
    zoomRef.current = zoomBehavior

    // ── Expanded mode: draw anchor → keyword threads ─────────────────────
    let linkSel = null
    if (isExpanded) {
      linkSel = g.append('g')
        .selectAll('line')
        .data(activeLinks)
        .enter()
        .append('line')
        .attr('stroke', d => {
          // Colour the thread by the anchor's theme
          const anchor = activeNodes.find(n => n.id === (d.source?.id ?? d.source))
          return CATEGORY_COLORS[anchor?.theme] ?? '#CBD5E1'
        })
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.3)
    }

    // ── Nodes ─────────────────────────────────────────────────────────────
    const nodeSel = g
      .selectAll('g.word-node')
      .data(activeNodes)
      .enter()
      .append('g')
      .attr('class', 'word-node')
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .on('click', (event, d) => { event.stopPropagation(); handleNodeClick(d) })

    if (isExpanded) {
      // Anchor: coloured circle + date label
      const anchorSel = nodeSel.filter(d => d.isAnchor)
      anchorSel.append('circle')
        .attr('r', 22)
        .attr('fill', 'var(--white)')
        .attr('stroke', d => CATEGORY_COLORS[d.theme] ?? '#94A3B8')
        .attr('stroke-width', 2)
      anchorSel.append('text')
        .text(d => d.word)
        .attr('font-size', '9px')
        .attr('font-family', 'var(--font)')
        .attr('font-weight', '500')
        .attr('fill', d => CATEGORY_COLORS[d.theme] ?? '#94A3B8')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('user-select', 'none')

      // Keyword satellite: small coloured word
      const kwSel = nodeSel.filter(d => !d.isAnchor)
      kwSel.append('text')
        .text(d => d.word)
        .attr('font-size', d => `${fontSize(d.weight, maxW)}px`)
        .attr('font-family', 'var(--font)')
        .attr('fill', d => CATEGORY_COLORS[d.theme] ?? '#94A3B8')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('user-select', 'none')
    } else {
      // Collapsed: word text, optional ×N badge for multi-entry words
      nodeSel.append('text')
        .text(d => d.word)
        .attr('font-size',   d => `${fontSize(d.weight, maxW)}px`)
        .attr('font-family', 'var(--font)')
        .attr('font-weight', d => d.weight > maxW * 0.6 ? '500' : '400')
        .attr('fill',        d => CATEGORY_COLORS[d.theme] ?? '#94A3B8')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('user-select', 'none')

      // ×N badge — tells the user this word spans multiple entries
      nodeSel.filter(d => d.entries.length > 1)
        .append('text')
        .text(d => `×${d.entries.length}`)
        .attr('font-size', '8px')
        .attr('font-family', 'var(--font)')
        .attr('fill', d => CATEGORY_COLORS[d.theme] ?? '#94A3B8')
        .attr('fill-opacity', 0.6)
        .attr('text-anchor', 'start')
        .attr('x', d => (fontSize(d.weight, maxW) * 0.55 * d.word.length) / 2 + 2)
        .attr('y', d => -(fontSize(d.weight, maxW) / 2))
        .style('user-select', 'none')
    }

    svg.on('click', () => { setSelectedEntry(null); setHighlightedIds(null) })

    // ── Simulation forces ─────────────────────────────────────────────────
    // velocityDecay (friction): 0.4 is D3's default; 0.6 makes nodes feel
    //   heavier and damps oscillation — the main fix for erratic movement.
    // alphaDecay: higher than the default 0.0228 so the simulation cools
    //   faster and nodes settle into place sooner.
    const simulation = forceSimulation(activeNodes)
      .velocityDecay(0.6)
      .alphaDecay(0.04)
      .force('link', forceLink(activeLinks)
        .id(d => d.id)
        .distance(isExpanded ? 50 : 18)
        .strength(isExpanded ? 0.7 : 0.3))
      .force('charge', forceManyBody()
        .strength(d => isExpanded
          ? (d.isAnchor ? -180 : -8)  // gentler repulsion between anchors
          : -30))                       // softer repulsion in word cloud
      .force('center',  forceCenter(width / 2, height / 2).strength(0.08))
      .force('collide', forceCollide(d =>
        isExpanded
          ? (d.isAnchor ? 28 : collideRadius(d.weight, maxW, d.word))
          : collideRadius(d.weight, maxW, d.word)
      ))

    simulationRef.current = simulation

    simulation.on('tick', () => {
      if (!isExpanded) {
        activeNodes.forEach(d => {
          const pad = collideRadius(d.weight, maxW, d.word)
          d.x = Math.max(pad, Math.min(width  - pad, d.x))
          d.y = Math.max(pad, Math.min(height - pad, d.y))
        })
      }
      nodeSel.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
      if (linkSel) {
        linkSel
          .attr('x1', d => d.source.x ?? 0).attr('y1', d => d.source.y ?? 0)
          .attr('x2', d => d.target.x ?? 0).attr('y2', d => d.target.y ?? 0)
      }
    })

    return () => { simulation.stop(); svg.on('.zoom', null) }
  }, [
    collapsedNodes, collapsedLinks, maxCollapsedWeight,
    expandedNodes, expandedLinks, maxExpandedWeight,
    isExpanded, handleNodeClick, entries,
  ])

  // ── Highlight via opacity on <g> (propagates to all children) ────────────
  useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)
    if (highlightedIds === null) {
      svg.selectAll('g.word-node').attr('opacity', 0.85)
    } else {
      svg.selectAll('g.word-node')
        .attr('opacity', d => highlightedIds.has(d.id) ? 1.0 : 0.1)
    }
  }, [highlightedIds])

  const zoomIn  = () => select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, 1.4)
  const zoomOut = () => select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, 1 / 1.4)
  const zoomReset = () => {
    zoomScaleRef.current = 1
    setIsExpanded(false)
    select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, zoomIdentity)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '60vh' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <ZoomControls onIn={zoomIn} onOut={zoomOut} onReset={zoomReset} />
      <p style={{
        position: 'absolute', bottom: '1rem', left: 0, right: 0,
        textAlign: 'center', fontSize: '11px', pointerEvents: 'none',
        color: isExpanded ? 'var(--blue-400)' : 'var(--gray-400)',
        transition: 'color 0.3s',
      }}>
        {isExpanded ? 'zoom out to collapse' : 'zoom in to see entries'}
      </p>
      {selectedEntry && (
        <PreviewCard entry={selectedEntry} onDismiss={() => setSelectedEntry(null)} />
      )}
    </div>
  )
}
