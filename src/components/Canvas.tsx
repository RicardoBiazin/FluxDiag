import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import type { DiagramNode, EdgeEnd, Point, Rect, ShapeKind, Side } from '../lib/types'
import {
  HANDLES,
  SIDES,
  autoSide,
  edgeGeometry,
  handlePoint,
  nearestSide,
  nodeRect,
  normRect,
  pointInRect,
  rectContains,
  rectsIntersect,
  resizeRect,
  routePath,
  screenToWorld,
  sideDir,
  sidePoint,
  snap,
  zoomAt,
  type Handle,
} from '../lib/geometry'
import { DEFAULT_SIZE, makeEdge, makeNode, moveNodes, nodesInsideFrames, sortNodes, syncSlides } from '../lib/model'
import { EdgeGraphic, NodeGraphic, SvgDefs } from './Graphics'
import TextEditor from './TextEditor'
import type { Diagram } from '../lib/types'

const SHAPE_TOOLS = new Set<string>(Object.keys(DEFAULT_SIZE))

type Gesture =
  | { type: 'pan'; start: Point; cam: { x: number; y: number } }
  | { type: 'marquee'; start: Point; cur: Point; additive: boolean; base: string[]; frameId?: string }
  | { type: 'move'; start: Point; ids: Set<string>; base: Diagram; anchor: Point; moved: boolean; clickId?: string }
  | { type: 'resize'; id: string; handle: Handle; start: Point; rect: Rect; base: Diagram }
  | { type: 'create'; kind: ShapeKind; start: Point; cur: Point }
  | { type: 'connect'; from: EdgeEnd; fromNode?: DiagramNode; start: Point; cur: Point; target?: string; port?: Side }
  | { type: 'edge-end'; edgeId: string; end: 'from' | 'to'; cur: Point; target?: string; base: Diagram }

const CURSORS: Record<string, string> = {
  nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
}

/** Lado fixo só quando o conector é solto perto de um ponto de conexão; senão, automático. */
function dropSide(r: Rect, p: Point, zoom: number): Side | undefined {
  const s = nearestSide(r, p)
  const q = sidePoint(r, s)
  return Math.hypot(q.x - p.x, q.y - p.y) * zoom <= 28 ? s : undefined
}

/** Forma (não frame) mais acima que contém o ponto. */
function hitNode(nodes: DiagramNode[], p: Point, pad = 0, exclude?: string): DiagramNode | undefined {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    if (n.kind === 'frame' || n.id === exclude) continue
    if (pointInRect(p, nodeRect(n), pad)) return n
  }
  return undefined
}

export default function Canvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const [, force] = useState(0)
  const rerender = () => force((v) => v + 1)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [spaceDown, setSpaceDown] = useState(false)

  const doc = useStore((s) => s.doc)
  const selection = useStore((s) => s.selection)
  const tool = useStore((s) => s.tool)
  const camera = useStore((s) => s.camera)
  const editingId = useStore((s) => s.editingId)
  const showGrid = useStore((s) => s.showGrid)

  const byId = useMemo(() => new Map(doc.nodes.map((n) => [n.id, n])), [doc.nodes])
  const selSet = useMemo(() => new Set(selection), [selection])
  const geoms = useMemo(() => {
    const m = new Map<string, ReturnType<typeof edgeGeometry>>()
    for (const e of doc.edges) m.set(e.id, edgeGeometry(e, byId))
    return m
  }, [doc.edges, byId])

  // Tamanho da viewport.
  useEffect(() => {
    const el = wrapRef.current!
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      useStore.getState().setViewport(r.width, r.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Roda do mouse: rolar = mover; Ctrl/⌘ + rolar ou pinça = zoom.
  useEffect(() => {
    const el = wrapRef.current!
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      const st = useStore.getState()
      const r = el.getBoundingClientRect()
      const anchor = { x: ev.clientX - r.left, y: ev.clientY - r.top }
      if (ev.ctrlKey || ev.metaKey) {
        const factor = Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.0025))
        st.setCamera(zoomAt(st.camera, anchor, st.camera.zoom * factor))
      } else {
        const k = ev.deltaMode === 1 ? 16 : 1
        const dx = ev.shiftKey && !ev.deltaX ? ev.deltaY : ev.deltaX
        const dy = ev.shiftKey && !ev.deltaX ? 0 : ev.deltaY
        st.setCamera({ ...st.camera, x: st.camera.x - dx * k, y: st.camera.y - dy * k })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Barra de espaço segura = mão temporária.
  useEffect(() => {
    const isField = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isField(e.target)) {
        e.preventDefault()
        setSpaceDown(true)
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const toWorld = (ev: { clientX: number; clientY: number }): Point => {
    const r = wrapRef.current!.getBoundingClientRect()
    return screenToWorld({ x: ev.clientX - r.left, y: ev.clientY - r.top }, useStore.getState().camera)
  }

  const onPointerDown = (ev: React.PointerEvent) => {
    if (ev.button === 2) return
    const st = useStore.getState()
    if (st.editingId) {
      // Clique fora do editor de texto: o blur do editor salva.
      ;(document.activeElement as HTMLElement | null)?.blur()
    }
    wrapRef.current!.setPointerCapture(ev.pointerId)
    const p = toWorld(ev)
    const el = (ev.target as Element).closest('[data-kind]') as HTMLElement | SVGElement | null
    const kind = el?.dataset.kind
    const id = el?.dataset.id

    // Mão: botão do meio, ferramenta mão ou espaço.
    if (ev.button === 1 || st.tool === 'hand' || spaceDown) {
      gesture.current = { type: 'pan', start: { x: ev.clientX, y: ev.clientY }, cam: { x: st.camera.x, y: st.camera.y } }
      rerender()
      return
    }

    if (kind === 'handle' && id) {
      const n = byId.get(id)!
      st.beginGesture()
      gesture.current = { type: 'resize', id, handle: el!.dataset.handle as Handle, start: p, rect: nodeRect(n), base: st.doc }
      return
    }

    if (kind === 'port' && id) {
      const n = byId.get(id)!
      const side = el!.dataset.side as Side
      gesture.current = { type: 'connect', from: { nodeId: id, side }, fromNode: n, start: p, cur: p, port: side }
      return
    }

    if (kind === 'edge-end' && id) {
      st.beginGesture()
      gesture.current = { type: 'edge-end', edgeId: id, end: el!.dataset.end as 'from' | 'to', cur: p, base: st.doc }
      return
    }

    if (SHAPE_TOOLS.has(st.tool)) {
      gesture.current = { type: 'create', kind: st.tool as ShapeKind, start: p, cur: p }
      return
    }

    if (st.tool === 'connector') {
      const n = hitNode(st.doc.nodes, p, 4)
      gesture.current = n
        ? { type: 'connect', from: { nodeId: n.id }, fromNode: n, start: p, cur: p }
        : { type: 'connect', from: { x: snap(p.x, st.snapToGrid), y: snap(p.y, st.snapToGrid) }, start: p, cur: p }
      return
    }

    if (kind === 'edge' && id) {
      if (ev.shiftKey) st.select([id], true)
      else if (!selSet.has(id)) st.select([id])
      return
    }

    // Formas (incluindo o título do frame).
    if (id && (kind === 'node' || kind === 'frame-title' || (kind === 'frame' && selSet.has(id)))) {
      const additive = ev.shiftKey || ev.ctrlKey || ev.metaKey
      let sel = st.selection
      if (additive) {
        st.select([id], true)
        sel = useStore.getState().selection
        if (!sel.includes(id)) return
      } else if (!selSet.has(id)) {
        st.select([id])
        sel = [id]
      }
      const nodeSel = sel.filter((s) => byId.has(s))
      const frames = nodeSel.filter((s) => byId.get(s)!.kind === 'frame')
      const ids = new Set([...nodeSel, ...nodesInsideFrames(st.doc, frames)])
      for (const s of sel) if (!byId.has(s)) ids.add(s) // conectores soltos selecionados
      const n = byId.get(id)!
      gesture.current = {
        type: 'move',
        start: p,
        ids,
        base: st.doc,
        anchor: { x: n.x, y: n.y },
        moved: false,
        clickId: !additive && selSet.has(id) && sel.length > 1 ? id : undefined,
      }
      return
    }

    // Fundo (ou corpo de frame): seleção por área.
    const additive = ev.shiftKey || ev.ctrlKey || ev.metaKey
    gesture.current = {
      type: 'marquee',
      start: p,
      cur: p,
      additive,
      base: additive ? st.selection : [],
      frameId: kind === 'frame' ? id : undefined,
    }
    if (!additive) st.select([])
    rerender()
  }

  const onPointerMove = (ev: React.PointerEvent) => {
    const g = gesture.current
    const st = useStore.getState()
    const p = toWorld(ev)
    if (!g) {
      // Realce de forma sob o cursor (mostra os pontos de conexão).
      if (st.tool === 'select' || st.tool === 'connector') {
        const n = hitNode(st.doc.nodes, p, 14 / st.camera.zoom)
        const hid = n?.id ?? null
        if (hid !== hoverId) setHoverId(hid)
      } else if (hoverId) setHoverId(null)
      return
    }
    switch (g.type) {
      case 'pan':
        st.setCamera({ ...st.camera, x: g.cam.x + ev.clientX - g.start.x, y: g.cam.y + ev.clientY - g.start.y })
        return
      case 'marquee':
        g.cur = p
        rerender()
        return
      case 'move': {
        let dx = p.x - g.start.x
        let dy = p.y - g.start.y
        if (!g.moved) {
          if (Math.hypot(dx, dy) * st.camera.zoom < 3) return
          g.moved = true
          st.beginGesture()
        }
        if (ev.shiftKey) {
          // Trava no eixo dominante.
          if (Math.abs(dx) > Math.abs(dy)) dy = 0
          else dx = 0
        }
        dx = snap(g.anchor.x + dx, st.snapToGrid) - g.anchor.x
        dy = snap(g.anchor.y + dy, st.snapToGrid) - g.anchor.y
        st.mutate(() => moveNodes(g.base, g.ids, dx, dy))
        return
      }
      case 'resize': {
        const n = g.base.nodes.find((x) => x.id === g.id)!
        let r = resizeRect(g.rect, g.handle, p.x - g.start.x, p.y - g.start.y, 20, ev.shiftKey)
        if (st.snapToGrid && !ev.shiftKey) {
          const x2 = snap(r.x + r.w, true)
          const y2 = snap(r.y + r.h, true)
          const x1 = g.handle.includes('w') ? snap(r.x, true) : r.x
          const y1 = g.handle.includes('n') ? snap(r.y, true) : r.y
          r = {
            x: x1,
            y: y1,
            w: Math.max(20, g.handle.includes('e') ? x2 - x1 : r.x + r.w - x1),
            h: Math.max(20, g.handle.includes('s') ? y2 - y1 : r.y + r.h - y1),
          }
        }
        st.mutate(() => ({
          ...g.base,
          nodes: g.base.nodes.map((x) => (x.id === n.id ? { ...x, ...r } : x)),
        }))
        return
      }
      case 'create':
        g.cur = p
        rerender()
        return
      case 'connect': {
        g.cur = p
        const t = hitNode(st.doc.nodes, p, 6)
        g.target = t && t.id !== g.from.nodeId ? t.id : undefined
        if (g.target !== hoverId) setHoverId(g.target ?? null)
        rerender()
        return
      }
      case 'edge-end': {
        g.cur = p
        const edge = g.base.edges.find((e) => e.id === g.edgeId)!
        const other = g.end === 'from' ? edge.to : edge.from
        const t = hitNode(st.doc.nodes, p, 6, other.nodeId)
        g.target = t?.id
        setHoverId(t?.id ?? null)
        const newEnd: EdgeEnd = t ? { nodeId: t.id, side: dropSide(nodeRect(t), p, st.camera.zoom) } : { x: snap(p.x, st.snapToGrid), y: snap(p.y, st.snapToGrid) }
        st.mutate(() => ({
          ...g.base,
          edges: g.base.edges.map((e) => (e.id === g.edgeId ? { ...e, [g.end]: newEnd } : e)),
        }))
        return
      }
    }
  }

  const onPointerUp = (ev: React.PointerEvent) => {
    const g = gesture.current
    gesture.current = null
    const st = useStore.getState()
    try {
      wrapRef.current!.releasePointerCapture(ev.pointerId)
    } catch {
      /* já liberado */
    }
    if (!g) return
    const p = toWorld(ev)
    switch (g.type) {
      case 'marquee': {
        const r = normRect(g.start, g.cur)
        const tiny = r.w * st.camera.zoom < 4 && r.h * st.camera.zoom < 4
        if (tiny) {
          // Clique simples no corpo de um frame seleciona o frame.
          if (g.frameId) st.select([g.frameId], g.additive)
          break
        }
        const hits: string[] = []
        for (const n of st.doc.nodes) {
          const nr = nodeRect(n)
          if (n.kind === 'frame' ? rectContains(r, nr) : rectsIntersect(r, nr)) hits.push(n.id)
        }
        for (const e of st.doc.edges) {
          const geo = geoms.get(e.id)
          if (geo && geo.points.every((q) => pointInRect(q, r))) hits.push(e.id)
        }
        st.select([...new Set([...g.base, ...hits])])
        break
      }
      case 'move':
        if (!g.moved && g.clickId) st.select([g.clickId])
        break
      case 'create': {
        const r = normRect(g.start, g.cur)
        const [dw, dh] = DEFAULT_SIZE[g.kind]
        const dragged = r.w * st.camera.zoom > 8 && r.h * st.camera.zoom > 8
        const x = snap(dragged ? r.x : g.start.x - dw / 2, st.snapToGrid)
        const y = snap(dragged ? r.y : g.start.y - dh / 2, st.snapToGrid)
        const n = makeNode(
          g.kind,
          x,
          y,
          dragged ? Math.max(20, snap(r.w, st.snapToGrid)) : dw,
          dragged ? Math.max(20, snap(r.h, st.snapToGrid)) : dh,
        )
        if (g.kind === 'frame') n.text = `Slide ${st.doc.nodes.filter((x) => x.kind === 'frame').length + 1}`
        st.addNode(n)
        if (!st.toolLocked) st.setTool('select')
        if (g.kind !== 'frame') st.setEditing(n.id)
        break
      }
      case 'connect': {
        const movedPx = Math.hypot(p.x - g.start.x, p.y - g.start.y) * st.camera.zoom
        if (movedPx < 5) {
          // Clique num ponto de conexão: cria uma forma igual ligada naquele lado.
          if (g.port && g.fromNode) quickAdd(g.fromNode, g.port)
          break
        }
        const target = g.target ? byId.get(g.target) : undefined
        const to: EdgeEnd = target
          ? { nodeId: target.id, side: dropSide(nodeRect(target), p, st.camera.zoom) }
          : { x: snap(p.x, st.snapToGrid), y: snap(p.y, st.snapToGrid) }
        const e = makeEdge(g.from, to)
        if (!g.port && g.from.nodeId) e.from = { nodeId: g.from.nodeId }
        st.addEdge(e)
        if (!st.toolLocked && st.tool === 'connector') st.setTool('select')
        break
      }
      case 'edge-end':
        break
    }
    setHoverId(null)
    rerender()
  }

  const quickAdd = (from: DiagramNode, side: Side) => {
    const st = useStore.getState()
    const gap = 80
    const d = sideDir(side)
    const kind: ShapeKind = from.kind === 'text' || from.kind === 'sticky' || from.kind === 'diamond' ? 'rounded' : from.kind
    const [w, h] = from.kind === kind ? [from.w, from.h] : DEFAULT_SIZE[kind]
    const c = { x: from.x + from.w / 2, y: from.y + from.h / 2 }
    const x = c.x + d.x * (from.w / 2 + gap + w / 2) - w / 2
    const y = c.y + d.y * (from.h / 2 + gap + h / 2) - h / 2
    const n = makeNode(kind, snap(x, st.snapToGrid), snap(y, st.snapToGrid), w, h)
    n.style = { ...from.style }
    if (from.kind === 'diamond' || from.kind === 'sticky' || from.kind === 'text') n.style = makeNode(kind, 0, 0).style
    const opposite: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
    const e = makeEdge({ nodeId: from.id, side }, { nodeId: n.id, side: opposite[side] })
    st.commit((doc) => syncSlides({ ...doc, nodes: sortNodes([...doc.nodes, n]), edges: [...doc.edges, e] }))
    st.select([n.id])
    st.setEditing(n.id)
  }

  const onDoubleClick = (ev: React.MouseEvent) => {
    const st = useStore.getState()
    if (st.tool !== 'select') return
    const el = (ev.target as Element).closest('[data-kind]') as HTMLElement | SVGElement | null
    const kind = el?.dataset.kind
    const id = el?.dataset.id
    if ((kind === 'node' || kind === 'frame-title' || kind === 'edge') && id) {
      st.select([id])
      st.setEditing(id)
      return
    }
    // Duplo clique no vazio: cria um texto.
    const p = toWorld(ev)
    const n = makeNode('text', snap(p.x - 100, st.snapToGrid), snap(p.y - 20, st.snapToGrid))
    n.text = ''
    st.addNode(n)
    st.setEditing(n.id)
  }

  const g = gesture.current
  const z = camera.zoom
  const inv = 1 / z
  const cursor =
    g?.type === 'pan'
      ? 'grabbing'
      : tool === 'hand' || spaceDown
        ? 'grab'
        : SHAPE_TOOLS.has(tool) || tool === 'connector'
          ? 'crosshair'
          : 'default'

  const singleNode = selection.length === 1 ? byId.get(selection[0]) : undefined
  const portNodes = new Set<string>()
  if (hoverId) portNodes.add(hoverId)
  if (singleNode && singleNode.kind !== 'frame') portNodes.add(singleNode.id)

  // Prévia do conector.
  let preview: string | null = null
  if (g?.type === 'connect') {
    const target = g.target ? byId.get(g.target) : undefined
    const fromN = g.from.nodeId ? byId.get(g.from.nodeId) : undefined
    const dropS = target ? dropSide(nodeRect(target), g.cur, z) : undefined
    const toP = target ? sidePoint(nodeRect(target), dropS ?? autoSide(nodeRect(target), g.start)) : g.cur
    const fromSide = fromN ? (g.from.side ?? autoSide(nodeRect(fromN), toP)) : undefined
    const a = fromN && fromSide ? { p: sidePoint(nodeRect(fromN), fromSide), dir: sideDir(fromSide) } : { p: { x: g.from.x ?? 0, y: g.from.y ?? 0 }, dir: null }
    const toSide = target ? (dropS ?? autoSide(nodeRect(target), a.p)) : undefined
    const b = target && toSide ? { p: sidePoint(nodeRect(target), toSide), dir: sideDir(toSide) } : { p: g.cur, dir: null }
    preview = routePath(a, b, 'orthogonal').d
  }

  const gridSize = 20 * z
  const showDots = showGrid && gridSize >= 6

  return (
    <div
      ref={wrapRef}
      className="canvas"
      data-testid="canvas"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg className="canvas-svg" width="100%" height="100%">
        <SvgDefs />
        {showDots && (
          <>
            <defs>
              <pattern
                id="grid-dots"
                width={gridSize}
                height={gridSize}
                patternUnits="userSpaceOnUse"
                x={camera.x % gridSize}
                y={camera.y % gridSize}
              >
                <circle cx={1} cy={1} r={1} fill="var(--grid-dot)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-dots)" />
          </>
        )}
        <g transform={`translate(${camera.x} ${camera.y}) scale(${z})`}>
          {doc.nodes.map((n) => (
            <g key={n.id} data-kind={n.kind === 'frame' ? 'frame' : 'node'} data-id={n.id} className="node">
              <NodeGraphic node={n} hideText={editingId === n.id} zoom={z} />
              {n.kind === 'frame' && (
                <rect
                  data-kind="frame-title"
                  data-id={n.id}
                  x={n.x}
                  y={n.y - Math.min(48, n.style.fontSize / Math.max(z, 0.3)) * 1.4}
                  width={Math.max(80, n.w * 0.5)}
                  height={Math.min(48, n.style.fontSize / Math.max(z, 0.3)) * 1.3}
                  fill="transparent"
                  style={{ cursor: 'move' }}
                />
              )}
              {n.kind === 'text' && !n.text && editingId !== n.id && (
                <rect x={n.x} y={n.y} width={n.w} height={n.h} fill="none" stroke="#adb5bd" strokeDasharray="4 4" strokeWidth={inv} />
              )}
            </g>
          ))}
          {doc.edges.map((e) => {
            const geo = geoms.get(e.id)!
            return (
              <g key={e.id} data-kind="edge" data-id={e.id} className="edge">
                <path d={geo.d} fill="none" stroke="transparent" strokeWidth={Math.max(12, 14 * inv)} />
                <EdgeGraphic edge={e} geom={geo} hideLabel={editingId === e.id} highlight={selSet.has(e.id)} />
              </g>
            )
          })}

          {/* Seleção */}
          {selection.map((id) => {
            const n = byId.get(id)
            if (!n) return null
            return (
              <rect
                key={'sel' + id}
                x={n.x - 3 * inv}
                y={n.y - 3 * inv}
                width={n.w + 6 * inv}
                height={n.h + 6 * inv}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={1.5 * inv}
                pointerEvents="none"
              />
            )
          })}
          {singleNode &&
            !editingId &&
            HANDLES.map((h) => {
              const hp = handlePoint(nodeRect(singleNode), h)
              const s = 9 * inv
              return (
                <rect
                  key={h}
                  data-kind="handle"
                  data-id={singleNode.id}
                  data-handle={h}
                  x={hp.x - s / 2}
                  y={hp.y - s / 2}
                  width={s}
                  height={s}
                  rx={2 * inv}
                  fill="#fff"
                  stroke="var(--accent)"
                  strokeWidth={1.5 * inv}
                  style={{ cursor: CURSORS[h] }}
                />
              )
            })}
          {(tool === 'select' || tool === 'connector') &&
            !g &&
            [...portNodes].map((id) => {
              const n = byId.get(id)
              if (!n || n.kind === 'frame') return null
              return SIDES.map((side) => {
                const sp = sidePoint(nodeRect(n), side)
                const d = sideDir(side)
                const off = 18 * inv
                return (
                  <circle
                    key={id + side}
                    data-kind="port"
                    data-id={id}
                    data-side={side}
                    className="port"
                    cx={sp.x + d.x * off}
                    cy={sp.y + d.y * off}
                    r={6 * inv}
                    strokeWidth={1.5 * inv}
                  >
                    <title>Arraste para conectar · clique para criar forma ligada</title>
                  </circle>
                )
              })
            })}
          {g?.type === 'connect' && hoverId && byId.get(hoverId) && (
            <rect
              x={byId.get(hoverId)!.x - 4 * inv}
              y={byId.get(hoverId)!.y - 4 * inv}
              width={byId.get(hoverId)!.w + 8 * inv}
              height={byId.get(hoverId)!.h + 8 * inv}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2 * inv}
              rx={4 * inv}
              pointerEvents="none"
            />
          )}
          {selection.map((id) => {
            const e = doc.edges.find((x) => x.id === id)
            if (!e || selection.length > 1) return null
            const geo = geoms.get(id)!
            return (['from', 'to'] as const).map((end) => {
              const pt = end === 'from' ? geo.start : geo.end
              return (
                <circle
                  key={id + end}
                  data-kind="edge-end"
                  data-id={id}
                  data-end={end}
                  cx={pt.x}
                  cy={pt.y}
                  r={6 * inv}
                  fill="#fff"
                  stroke="var(--accent)"
                  strokeWidth={2 * inv}
                  style={{ cursor: 'move' }}
                />
              )
            })
          })}
          {preview && (
            <path d={preview} fill="none" stroke="var(--accent)" strokeWidth={2 * inv} strokeDasharray={`${6 * inv} ${4 * inv}`} pointerEvents="none" />
          )}
          {g?.type === 'marquee' && (
            <rect
              {...(() => {
                const r = normRect(g.start, g.cur)
                return { x: r.x, y: r.y, width: r.w, height: r.h }
              })()}
              fill="var(--accent)"
              fillOpacity={0.08}
              stroke="var(--accent)"
              strokeWidth={inv}
              pointerEvents="none"
            />
          )}
          {g?.type === 'create' && (
            <rect
              {...(() => {
                const r = normRect(g.start, g.cur)
                return { x: r.x, y: r.y, width: r.w, height: r.h }
              })()}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1.5 * inv}
              strokeDasharray={`${5 * inv} ${4 * inv}`}
              pointerEvents="none"
            />
          )}
        </g>
      </svg>
      {editingId && <TextEditor key={editingId} id={editingId} geoms={geoms} />}
    </div>
  )
}

