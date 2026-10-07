import { create } from 'zustand'
import type { Camera, Diagram, DiagramEdge, DiagramNode, EdgeStyle, NodeStyle, Tool } from './lib/types'
import {
  cloneItems,
  diagramBounds,
  makeNode,
  moveNodes,
  nodesInsideFrames,
  removeItems,
  sortNodes,
  syncSlides,
  uid,
} from './lib/model'
import { fitRect, zoomAt } from './lib/geometry'

const HISTORY_LIMIT = 150

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'

interface Clipboard {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

export interface State {
  docId: string
  doc: Diagram
  selection: string[]
  tool: Tool
  /** Mantém a ferramenta de forma ativa depois de desenhar. */
  toolLocked: boolean
  camera: Camera
  viewport: { w: number; h: number }
  editingId: string | null
  snapToGrid: boolean
  showGrid: boolean
  past: Diagram[]
  future: Diagram[]
  presenting: number | null
  clipboard: Clipboard | null
  pasteCount: number

  loadDocument: (id: string, d: Diagram) => void
  setTool: (t: Tool, locked?: boolean) => void
  setCamera: (c: Camera) => void
  setViewport: (w: number, h: number) => void
  zoomBy: (factor: number) => void
  zoomToFit: () => void
  zoomToRect: (ids: string[]) => void
  select: (ids: string[], additive?: boolean) => void
  setEditing: (id: string | null) => void
  toggleSnap: () => void
  toggleGrid: () => void

  /** Altera o documento registrando um passo de desfazer. */
  commit: (fn: (d: Diagram) => Diagram) => void
  /** Marca o início de um gesto (arrastar, redimensionar): um passo de desfazer para o gesto todo. */
  beginGesture: () => void
  /** Altera o documento sem novo passo de desfazer (durante o gesto). */
  mutate: (fn: (d: Diagram) => Diagram) => void
  undo: () => void
  redo: () => void

  addNode: (n: DiagramNode, select?: boolean) => void
  addEdge: (e: DiagramEdge) => void
  updateNode: (id: string, patch: Partial<DiagramNode>) => void
  updateNodeStyle: (ids: string[], patch: Partial<NodeStyle>) => void
  updateEdge: (id: string, patch: Partial<DiagramEdge>) => void
  updateEdgeStyle: (ids: string[], patch: Partial<EdgeStyle>) => void
  rename: (name: string) => void
  deleteSelection: () => void
  selectAll: () => void
  nudge: (dx: number, dy: number) => void
  copy: () => void
  cut: () => void
  paste: () => void
  duplicate: () => void
  toFront: () => void
  toBack: () => void
  align: (mode: AlignMode) => void
  distribute: (axis: 'h' | 'v') => void
  moveSlide: (id: string, delta: number) => void
  addFrame: (w: number, h: number) => void

  startPresentation: (index?: number) => void
  setSlide: (index: number) => void
  stopPresentation: () => void
}

function pushPast(past: Diagram[], d: Diagram): Diagram[] {
  const next = past.length >= HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT + 1) : past.slice()
  next.push(d)
  return next
}

let viewportMeasured = false

export const useStore = create<State>((set, get) => ({
  docId: uid('d'),
  doc: { version: 1, name: 'Sem título', nodes: [], edges: [], slides: [] },
  selection: [],
  tool: 'select',
  toolLocked: false,
  camera: { x: 0, y: 0, zoom: 1 },
  viewport: { w: 1200, h: 800 },
  editingId: null,
  snapToGrid: true,
  showGrid: true,
  past: [],
  future: [],
  presenting: null,
  clipboard: null,
  pasteCount: 0,

  loadDocument: (id, d) => {
    set({ docId: id, doc: syncSlides({ ...d, nodes: sortNodes(d.nodes) }), selection: [], past: [], future: [], editingId: null })
    get().zoomToFit()
  },
  setTool: (tool, locked = false) => set({ tool, toolLocked: locked, editingId: null }),
  setCamera: (camera) => set({ camera }),
  setViewport: (w, h) => {
    const first = !viewportMeasured
    viewportMeasured = true
    set({ viewport: { w, h } })
    if (first) get().zoomToFit()
  },
  zoomBy: (factor) => {
    const { camera, viewport } = get()
    set({ camera: zoomAt(camera, { x: viewport.w / 2, y: viewport.h / 2 }, camera.zoom * factor) })
  },
  zoomToFit: () => {
    const { doc, viewport } = get()
    const b = diagramBounds(doc)
    if (!b) return set({ camera: { x: viewport.w / 2, y: viewport.h / 2, zoom: 1 } })
    set({ camera: fitRect(b, viewport.w, viewport.h, 60, 1) })
  },
  zoomToRect: (ids) => {
    const { doc, viewport } = get()
    const b = diagramBounds(doc, new Set(ids))
    if (b) set({ camera: fitRect(b, viewport.w, viewport.h, 50, 2) })
  },
  select: (ids, additive = false) => {
    if (!additive) return set({ selection: ids })
    const cur = new Set(get().selection)
    for (const id of ids) {
      if (cur.has(id)) cur.delete(id)
      else cur.add(id)
    }
    set({ selection: [...cur] })
  },
  setEditing: (editingId) => set({ editingId }),
  toggleSnap: () => set({ snapToGrid: !get().snapToGrid }),
  toggleGrid: () => set({ showGrid: !get().showGrid }),

  commit: (fn) => {
    const { doc, past } = get()
    const next = fn(doc)
    if (next === doc) return
    set({ doc: next, past: pushPast(past, doc), future: [] })
  },
  beginGesture: () => {
    const { doc, past } = get()
    set({ past: pushPast(past, doc), future: [] })
  },
  mutate: (fn) => set({ doc: fn(get().doc) }),
  undo: () => {
    const { past, future, doc } = get()
    if (!past.length) return
    const prev = past[past.length - 1]
    const alive = new Set([...prev.nodes.map((n) => n.id), ...prev.edges.map((e) => e.id)])
    set({
      doc: prev,
      past: past.slice(0, -1),
      future: [...future, doc],
      selection: get().selection.filter((id) => alive.has(id)),
      editingId: null,
    })
  },
  redo: () => {
    const { past, future, doc } = get()
    if (!future.length) return
    const next = future[future.length - 1]
    const alive = new Set([...next.nodes.map((n) => n.id), ...next.edges.map((e) => e.id)])
    set({
      doc: next,
      future: future.slice(0, -1),
      past: pushPast(past, doc),
      selection: get().selection.filter((id) => alive.has(id)),
      editingId: null,
    })
  },

  addNode: (n, select = true) => {
    get().commit((d) => syncSlides({ ...d, nodes: sortNodes([...d.nodes, n]) }))
    if (select) set({ selection: [n.id] })
  },
  addEdge: (e) => {
    get().commit((d) => ({ ...d, edges: [...d.edges, e] }))
    set({ selection: [e.id] })
  },
  updateNode: (id, patch) =>
    get().commit((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) })),
  updateNodeStyle: (ids, patch) => {
    const s = new Set(ids)
    get().commit((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (s.has(n.id) ? { ...n, style: { ...n.style, ...patch } } : n)),
    }))
  },
  updateEdge: (id, patch) =>
    get().commit((d) => ({ ...d, edges: d.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
  updateEdgeStyle: (ids, patch) => {
    const s = new Set(ids)
    get().commit((d) => ({
      ...d,
      edges: d.edges.map((e) => (s.has(e.id) ? { ...e, style: { ...e.style, ...patch } } : e)),
    }))
  },
  rename: (name) => get().commit((d) => ({ ...d, name: name.trim() || 'Sem título' })),
  deleteSelection: () => {
    const sel = get().selection
    if (!sel.length) return
    get().commit((d) => removeItems(d, new Set(sel)))
    set({ selection: [], editingId: null })
  },
  selectAll: () => {
    const { doc } = get()
    set({ selection: [...doc.nodes.map((n) => n.id), ...doc.edges.map((e) => e.id)] })
  },
  nudge: (dx, dy) => {
    const { selection, doc } = get()
    if (!selection.length) return
    const frames = doc.nodes.filter((n) => n.kind === 'frame' && selection.includes(n.id)).map((n) => n.id)
    const ids = new Set([...selection, ...nodesInsideFrames(doc, frames)])
    get().commit((d) => moveNodes(d, ids, dx, dy))
  },
  copy: () => {
    const { selection, doc } = get()
    const s = new Set(selection)
    const nodes = doc.nodes.filter((n) => s.has(n.id))
    const ids = new Set(nodes.map((n) => n.id))
    // Conectores entre formas copiadas vão junto, mesmo sem estarem selecionados.
    const edges = doc.edges.filter(
      (e) =>
        s.has(e.id) ||
        (e.from.nodeId && e.to.nodeId && ids.has(e.from.nodeId) && ids.has(e.to.nodeId)),
    )
    if (!nodes.length && !edges.length) return
    set({ clipboard: { nodes, edges }, pasteCount: 0 })
  },
  cut: () => {
    get().copy()
    get().deleteSelection()
  },
  paste: () => {
    const { clipboard, pasteCount } = get()
    if (!clipboard) return
    const off = 20 * (pasteCount + 1)
    const { nodes, edges } = cloneItems(clipboard.nodes, clipboard.edges, off, off)
    get().commit((d) => syncSlides({ ...d, nodes: sortNodes([...d.nodes, ...nodes]), edges: [...d.edges, ...edges] }))
    set({ selection: [...nodes.map((n) => n.id), ...edges.map((e) => e.id)], pasteCount: pasteCount + 1 })
  },
  duplicate: () => {
    const prev = get().clipboard
    get().copy()
    get().paste()
    set({ clipboard: prev })
  },
  toFront: () => {
    const s = new Set(get().selection)
    get().commit((d) => ({
      ...d,
      nodes: sortNodes([...d.nodes.filter((n) => !s.has(n.id)), ...d.nodes.filter((n) => s.has(n.id))]),
      edges: [...d.edges.filter((e) => !s.has(e.id)), ...d.edges.filter((e) => s.has(e.id))],
    }))
  },
  toBack: () => {
    const s = new Set(get().selection)
    get().commit((d) => ({
      ...d,
      nodes: sortNodes([...d.nodes.filter((n) => s.has(n.id)), ...d.nodes.filter((n) => !s.has(n.id))]),
      edges: [...d.edges.filter((e) => s.has(e.id)), ...d.edges.filter((e) => !s.has(e.id))],
    }))
  },
  align: (mode) => {
    const { selection, doc } = get()
    const nodes = doc.nodes.filter((n) => selection.includes(n.id))
    if (nodes.length < 2) return
    const b = diagramBounds(doc, new Set(nodes.map((n) => n.id)))!
    get().commit((d) => ({
      ...d,
      nodes: d.nodes.map((n) => {
        if (!selection.includes(n.id)) return n
        switch (mode) {
          case 'left':
            return { ...n, x: b.x }
          case 'right':
            return { ...n, x: b.x + b.w - n.w }
          case 'hcenter':
            return { ...n, x: b.x + b.w / 2 - n.w / 2 }
          case 'top':
            return { ...n, y: b.y }
          case 'bottom':
            return { ...n, y: b.y + b.h - n.h }
          case 'vcenter':
            return { ...n, y: b.y + b.h / 2 - n.h / 2 }
        }
      }),
    }))
  },
  distribute: (axis) => {
    const { selection, doc } = get()
    const nodes = doc.nodes.filter((n) => selection.includes(n.id))
    if (nodes.length < 3) return
    const sorted = [...nodes].sort((a, b) => (axis === 'h' ? a.x - b.x : a.y - b.y))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const total = sorted.reduce((acc, n) => acc + (axis === 'h' ? n.w : n.h), 0)
    const span = axis === 'h' ? last.x + last.w - first.x : last.y + last.h - first.y
    const gap = (span - total) / (sorted.length - 1)
    const pos = new Map<string, number>()
    let cur = axis === 'h' ? first.x : first.y
    for (const n of sorted) {
      pos.set(n.id, cur)
      cur += (axis === 'h' ? n.w : n.h) + gap
    }
    get().commit((d) => ({
      ...d,
      nodes: d.nodes.map((n) =>
        pos.has(n.id) ? (axis === 'h' ? { ...n, x: pos.get(n.id)! } : { ...n, y: pos.get(n.id)! }) : n,
      ),
    }))
  },
  moveSlide: (id, delta) =>
    get().commit((d) => {
      const i = d.slides.indexOf(id)
      const j = i + delta
      if (i < 0 || j < 0 || j >= d.slides.length) return d
      const slides = d.slides.slice()
      ;[slides[i], slides[j]] = [slides[j], slides[i]]
      return { ...d, slides }
    }),
  addFrame: (w, h) => {
    const { doc } = get()
    const frames = doc.nodes.filter((n) => n.kind === 'frame')
    let x = 0
    let y = 0
    if (frames.length) {
      const last = frames.reduce((a, b) => (b.x + b.w > a.x + a.w ? b : a))
      x = last.x + last.w + 100
      y = last.y
    } else {
      const b = diagramBounds(doc)
      if (b) {
        x = b.x
        y = b.y + b.h + 100
      }
    }
    const f = makeNode('frame', x, y, w, h, `Slide ${frames.length + 1}`)
    get().addNode(f)
    get().zoomToRect([f.id])
  },

  startPresentation: (index = 0) => set({ presenting: index, editingId: null, selection: [] }),
  setSlide: (index) => set({ presenting: index }),
  stopPresentation: () => set({ presenting: null }),
}))

export function selectedNodes(s: Pick<State, 'doc' | 'selection'>): DiagramNode[] {
  const sel = new Set(s.selection)
  return s.doc.nodes.filter((n) => sel.has(n.id))
}

export function selectedEdges(s: Pick<State, 'doc' | 'selection'>): DiagramEdge[] {
  const sel = new Set(s.selection)
  return s.doc.edges.filter((e) => sel.has(e.id))
}

