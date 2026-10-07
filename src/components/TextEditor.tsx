import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { textBox, worldToScreen, type EdgeGeometry } from '../lib/geometry'
import { FONT_FAMILY } from '../lib/text'

interface Props {
  id: string
  geoms: Map<string, EdgeGeometry>
}

/** Caixa de texto HTML sobreposta à forma (ou ao rótulo do conector) em edição. */
export default function TextEditor({ id, geoms }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const camera = useStore((s) => s.camera)
  const node = useStore((s) => s.doc.nodes.find((n) => n.id === id))
  const edge = useStore((s) => s.doc.edges.find((e) => e.id === id))
  const initial = node ? node.text : (edge?.label ?? '')
  const [value, setValue] = useState(initial)
  const done = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.select()
  }, [])

  if (!node && !edge) return null

  const finish = (save: boolean) => {
    if (done.current) return
    done.current = true
    const st = useStore.getState()
    if (save && value !== initial) {
      if (node) {
        // Texto vazio em caixa de texto: a caixa some.
        if (node.kind === 'text' && !value.trim()) {
          st.commit((d) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== id) }))
          st.select([])
        } else st.updateNode(id, { text: node.kind === 'frame' ? value.replace(/\n/g, ' ') : value })
      } else if (edge) st.updateEdge(id, { label: value })
    } else if (node && node.kind === 'text' && !node.text && !value.trim()) {
      st.commit((d) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== id) }))
      st.select([])
    }
    st.setEditing(null)
  }

  const z = camera.zoom
  let style: React.CSSProperties
  if (node) {
    const isFrame = node.kind === 'frame'
    const tb = isFrame ? { x: 0, y: -34 / z, w: Math.max(node.w * 0.6, 200 / z), h: 28 / z } : textBox(node.kind, node.w, node.h)
    const p = worldToScreen({ x: node.x + tb.x, y: node.y + tb.y }, camera)
    const fs = isFrame ? 14 : node.style.fontSize * z
    style = {
      left: p.x,
      top: p.y,
      width: tb.w * z,
      height: tb.h * z,
      fontSize: fs,
      lineHeight: 1.25,
      color: isFrame ? '#495057' : node.style.textColor,
      fontWeight: node.style.bold ? 700 : 400,
      textAlign: isFrame ? 'left' : node.style.align,
      paddingTop: !isFrame && node.kind !== 'sticky' ? Math.max(0, (tb.h * z - fs * 1.25 * Math.max(1, value.split('\n').length)) / 2) : 0,
      background: isFrame ? '#fff' : 'transparent',
    }
  } else {
    const geo = geoms.get(id)!
    const p = worldToScreen(geo.mid, camera)
    const fs = edge!.style.fontSize * z
    const w = Math.max(120, fs * 10)
    style = {
      left: p.x - w / 2,
      top: p.y - fs,
      width: w,
      height: fs * 2.6,
      fontSize: fs,
      lineHeight: 1.25,
      color: edge!.style.textColor,
      textAlign: 'center',
      background: '#fff',
    }
  }

  return (
    <textarea
      ref={ref}
      className="text-editor"
      data-testid="text-editor"
      style={{ ...style, fontFamily: FONT_FAMILY }}
      value={value}
      spellCheck={false}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') {
          e.preventDefault()
          finish(true)
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (node?.kind === 'frame'))) {
          e.preventDefault()
          finish(true)
        }
      }}
    />
  )
}
