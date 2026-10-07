import type { Diagram, DiagramEdge, DiagramNode, EdgeStyle, NodeStyle, Rect, ShapeKind } from './types'
import { nodeRect, rectContains, unionRect } from './geometry'

let counter = 0
export function uid(prefix = 'n'): string {
  counter = (counter + 1) % 1e6
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export const SHAPE_LABELS: Record<ShapeKind, string> = {
  rect: 'Retângulo',
  rounded: 'Processo (arredondado)',
  ellipse: 'Elipse',
  diamond: 'Decisão',
  parallelogram: 'Entrada/Saída',
  hexagon: 'Preparação',
  triangle: 'Triângulo',
  cylinder: 'Banco de dados',
  document: 'Documento',
  terminator: 'Início/Fim',
  isoCube: 'Cubo 3D (isométrico)',
  isoCylinder: 'Cilindro 3D (isométrico)',
  isoPyramid: 'Pirâmide 3D (isométrica)',
  sticky: 'Nota adesiva',
  text: 'Texto',
  frame: 'Frame (slide)',
}

export const DEFAULT_SIZE: Record<ShapeKind, [number, number]> = {
  rect: [160, 80],
  rounded: [160, 80],
  ellipse: [140, 90],
  diamond: [150, 110],
  parallelogram: [170, 80],
  hexagon: [170, 80],
  triangle: [120, 100],
  cylinder: [120, 110],
  document: [160, 90],
  terminator: [160, 60],
  isoCube: [140, 160],
  isoCylinder: [120, 150],
  isoPyramid: [140, 130],
  sticky: [180, 180],
  text: [200, 40],
  frame: [960, 540],
}

export const STICKY_COLORS = ['#fff59d', '#ffcc80', '#f8bbd0', '#b3e5fc', '#c5e1a5', '#d1c4e9', '#ffffff']

export const PALETTE = [
  '#ffffff', '#f1f3f5', '#ced4da', '#495057', '#212529',
  '#ffe3e3', '#ff8787', '#e03131',
  '#fff3bf', '#ffd43b', '#f08c00',
  '#d3f9d8', '#69db7c', '#2f9e44',
  '#d0ebff', '#74c0fc', '#1971c2',
  '#e5dbff', '#b197fc', '#6741d9',
]

export function defaultNodeStyle(kind: ShapeKind): NodeStyle {
  const base: NodeStyle = {
    fill: '#ffffff',
    stroke: '#343a40',
    strokeWidth: 2,
    dashed: false,
    textColor: '#212529',
    fontSize: 16,
    bold: false,
    align: 'center',
  }
  switch (kind) {
    case 'sticky':
      return { ...base, fill: STICKY_COLORS[0], stroke: 'none', strokeWidth: 0, fontSize: 18, align: 'left' }
    case 'text':
      return { ...base, fill: 'none', stroke: 'none', strokeWidth: 0, fontSize: 20 }
    case 'frame':
      return { ...base, fill: '#ffffff', stroke: '#adb5bd', strokeWidth: 1, fontSize: 14 }
    case 'diamond':
      return { ...base, fill: '#fff3bf', stroke: '#f08c00' }
    case 'isoCube':
    case 'isoCylinder':
    case 'isoPyramid':
      return { ...base, fill: '#74c0fc', stroke: '#1864ab', strokeWidth: 1.5 }
    case 'terminator':
      return { ...base, fill: '#d3f9d8', stroke: '#2f9e44' }
    case 'cylinder':
      return { ...base, fill: '#e5dbff', stroke: '#6741d9' }
    case 'parallelogram':
      return { ...base, fill: '#d0ebff', stroke: '#1971c2' }
    default:
      return base
  }
}

export function defaultEdgeStyle(): EdgeStyle {
  return {
    stroke: '#495057',
    strokeWidth: 2,
    dashed: false,
    routing: 'orthogonal',
    startArrow: 'none',
    endArrow: 'triangle',
    textColor: '#212529',
    fontSize: 14,
  }
}

export function makeNode(kind: ShapeKind, x: number, y: number, w?: number, h?: number, text?: string): DiagramNode {
  const [dw, dh] = DEFAULT_SIZE[kind]
  return {
    id: uid(kind === 'frame' ? 'f' : 'n'),
    kind,
    x,
    y,
    w: w ?? dw,
    h: h ?? dh,
    text: text ?? (kind === 'frame' ? 'Slide' : kind === 'text' ? 'Texto' : ''),
    style: defaultNodeStyle(kind),
    ...(kind === 'frame' ? { notes: '' } : {}),
  }
}

export function makeEdge(from: DiagramEdge['from'], to: DiagramEdge['to'], label = ''): DiagramEdge {
  return { id: uid('e'), from, to, label, style: defaultEdgeStyle() }
}

export function emptyDiagram(name = 'Sem título'): Diagram {
  return { version: 1, name, nodes: [], edges: [], slides: [] }
}

/** Mantém `slides` coerente com os frames existentes (remove órfãos, acrescenta novos). */
export function syncSlides(d: Diagram): Diagram {
  const frames = d.nodes.filter((n) => n.kind === 'frame').map((n) => n.id)
  const set = new Set(frames)
  const slides = d.slides.filter((id) => set.has(id))
  for (const id of frames) if (!slides.includes(id)) slides.push(id)
  if (slides.length === d.slides.length && slides.every((s, i) => s === d.slides[i])) return d
  return { ...d, slides }
}

/** Frames sempre ficam atrás das outras formas. */
export function sortNodes(nodes: DiagramNode[]): DiagramNode[] {
  const frames = nodes.filter((n) => n.kind === 'frame')
  if (!frames.length) return nodes
  const others = nodes.filter((n) => n.kind !== 'frame')
  return [...frames, ...others]
}

export function removeItems(d: Diagram, ids: Set<string>): Diagram {
  const nodes = d.nodes.filter((n) => !ids.has(n.id))
  const alive = new Set(nodes.map((n) => n.id))
  const edges = d.edges.filter(
    (e) =>
      !ids.has(e.id) &&
      (!e.from.nodeId || alive.has(e.from.nodeId)) &&
      (!e.to.nodeId || alive.has(e.to.nodeId)),
  )
  return syncSlides({ ...d, nodes, edges })
}

/** Ao mover um frame, as formas totalmente dentro dele vão junto. */
export function nodesInsideFrames(d: Diagram, frameIds: string[]): string[] {
  const out = new Set<string>()
  for (const fid of frameIds) {
    const f = d.nodes.find((n) => n.id === fid)
    if (!f || f.kind !== 'frame') continue
    const fr = nodeRect(f)
    for (const n of d.nodes) {
      if (n.id !== f.id && n.kind !== 'frame' && rectContains(fr, nodeRect(n))) out.add(n.id)
    }
  }
  return [...out]
}

export function moveNodes(d: Diagram, ids: Set<string>, dx: number, dy: number): Diagram {
  if (!dx && !dy) return d
  return {
    ...d,
    nodes: d.nodes.map((n) => (ids.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n)),
    edges: d.edges.map((e) => {
      // Pontas soltas de conectores selecionados acompanham o movimento.
      if (!ids.has(e.id)) return e
      const mv = (end: DiagramEdge['from']) =>
        end.nodeId ? end : { ...end, x: (end.x ?? 0) + dx, y: (end.y ?? 0) + dy }
      return { ...e, from: mv(e.from), to: mv(e.to) }
    }),
  }
}

export function diagramBounds(d: Diagram, ids?: Set<string>): Rect | null {
  const nodes = ids ? d.nodes.filter((n) => ids.has(n.id)) : d.nodes
  const rects = nodes.map(nodeRect)
  for (const e of d.edges) {
    if (ids && !ids.has(e.id)) continue
    for (const end of [e.from, e.to]) if (!end.nodeId) rects.push({ x: end.x ?? 0, y: end.y ?? 0, w: 0, h: 0 })
  }
  return unionRect(rects)
}

/** Copia nós e conectores (com novos ids), mantendo ligações entre os copiados. */
export function cloneItems(nodes: DiagramNode[], edges: DiagramEdge[], dx: number, dy: number) {
  const map = new Map<string, string>()
  const newNodes = nodes.map((n) => {
    const id = uid(n.kind === 'frame' ? 'f' : 'n')
    map.set(n.id, id)
    return { ...n, id, x: n.x + dx, y: n.y + dy, style: { ...n.style } }
  })
  const newEdges: DiagramEdge[] = []
  for (const e of edges) {
    const end = (x: DiagramEdge['from']) => {
      if (x.nodeId) return map.has(x.nodeId) ? { ...x, nodeId: map.get(x.nodeId) } : null
      return { ...x, x: (x.x ?? 0) + dx, y: (x.y ?? 0) + dy }
    }
    const from = end(e.from)
    const to = end(e.to)
    if (!from || !to) continue
    newEdges.push({ ...e, id: uid('e'), from, to, style: { ...e.style } })
  }
  return { nodes: newNodes, edges: newEdges }
}

export function validateDiagram(raw: unknown): Diagram {
  if (!raw || typeof raw !== 'object') throw new Error('Arquivo inválido')
  const r = raw as Partial<Diagram>
  if (!Array.isArray(r.nodes) || !Array.isArray(r.edges)) throw new Error('Arquivo não é um diagrama do FluxDiag')
  const nodes: DiagramNode[] = r.nodes
    .filter((n) => n && typeof n.id === 'string' && typeof n.kind === 'string' && n.kind in DEFAULT_SIZE)
    .map((n) => ({
      ...n,
      x: Number(n.x) || 0,
      y: Number(n.y) || 0,
      w: Math.max(10, Number(n.w) || DEFAULT_SIZE[n.kind][0]),
      h: Math.max(10, Number(n.h) || DEFAULT_SIZE[n.kind][1]),
      text: String(n.text ?? ''),
      style: { ...defaultNodeStyle(n.kind), ...(n.style ?? {}) },
    }))
  const ids = new Set(nodes.map((n) => n.id))
  const edges: DiagramEdge[] = r.edges
    .filter((e) => e && typeof e.id === 'string' && e.from && e.to)
    .filter((e) => (!e.from.nodeId || ids.has(e.from.nodeId)) && (!e.to.nodeId || ids.has(e.to.nodeId)))
    .map((e) => ({ ...e, label: String(e.label ?? ''), style: { ...defaultEdgeStyle(), ...(e.style ?? {}) } }))
  return syncSlides({
    version: 1,
    name: typeof r.name === 'string' && r.name ? r.name : 'Importado',
    nodes: sortNodes(nodes),
    edges,
    slides: Array.isArray(r.slides) ? r.slides.filter((s): s is string => typeof s === 'string') : [],
  })
}
