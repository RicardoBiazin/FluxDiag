import type { Camera, DiagramEdge, DiagramNode, EdgeEnd, Point, Rect, Routing, ShapeKind, Side } from './types'

export const GRID = 10

export function snap(v: number, on: boolean, step = GRID): number {
  return on ? Math.round(v / step) * step : v
}

export function normRect(a: Point, b: Point): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }
}

export function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  )
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function pointInRect(p: Point, r: Rect, pad = 0): boolean {
  return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad
}

export function unionRect(rects: Rect[]): Rect | null {
  if (!rects.length) return null
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (const r of rects) {
    x1 = Math.min(x1, r.x)
    y1 = Math.min(y1, r.y)
    x2 = Math.max(x2, r.x + r.w)
    y2 = Math.max(y2, r.y + r.h)
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

export function screenToWorld(p: Point, cam: Camera): Point {
  return { x: (p.x - cam.x) / cam.zoom, y: (p.y - cam.y) / cam.zoom }
}

export function worldToScreen(p: Point, cam: Camera): Point {
  return { x: p.x * cam.zoom + cam.x, y: p.y * cam.zoom + cam.y }
}

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4

/** Zoom mantendo fixo o ponto de tela `anchor`. */
export function zoomAt(cam: Camera, anchor: Point, zoom: number): Camera {
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
  const w = screenToWorld(anchor, cam)
  return { zoom: z, x: anchor.x - w.x * z, y: anchor.y - w.y * z }
}

/** Câmera que enquadra `r` numa viewport `vw` x `vh`. */
export function fitRect(r: Rect, vw: number, vh: number, pad = 60, maxZoom = 1.5): Camera {
  const zoom = Math.min(
    maxZoom,
    Math.max(MIN_ZOOM, Math.min((vw - pad * 2) / Math.max(r.w, 1), (vh - pad * 2) / Math.max(r.h, 1))),
  )
  return { zoom, x: vw / 2 - (r.x + r.w / 2) * zoom, y: vh / 2 - (r.y + r.h / 2) * zoom }
}

/** Contorno SVG de uma forma em coordenadas locais (0,0)-(w,h). */
export function shapePath(kind: ShapeKind, w: number, h: number): string {
  switch (kind) {
    case 'ellipse':
      return `M ${w / 2} 0 A ${w / 2} ${h / 2} 0 1 1 ${w / 2} ${h} A ${w / 2} ${h / 2} 0 1 1 ${w / 2} 0 Z`
    case 'diamond':
      return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`
    case 'parallelogram': {
      const s = Math.min(w * 0.2, h * 0.6)
      return `M ${s} 0 L ${w} 0 L ${w - s} ${h} L 0 ${h} Z`
    }
    case 'hexagon': {
      const s = Math.min(w * 0.25, h * 0.5)
      return `M ${s} 0 L ${w - s} 0 L ${w} ${h / 2} L ${w - s} ${h} L ${s} ${h} L 0 ${h / 2} Z`
    }
    case 'triangle':
      return `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`
    case 'cylinder': {
      const ry = Math.min(h * 0.15, 18)
      return (
        `M 0 ${ry} A ${w / 2} ${ry} 0 0 1 ${w} ${ry} L ${w} ${h - ry} ` +
        `A ${w / 2} ${ry} 0 0 1 0 ${h - ry} Z M 0 ${ry} A ${w / 2} ${ry} 0 0 0 ${w} ${ry}`
      )
    }
    case 'document': {
      const wave = Math.min(h * 0.15, 16)
      return (
        `M 0 0 L ${w} 0 L ${w} ${h - wave} ` +
        `C ${w * 0.75} ${h - wave * 2.2} ${w * 0.5} ${h + wave * 0.6} 0 ${h - wave * 0.6} Z`
      )
    }
    case 'terminator': {
      const r = Math.min(h / 2, w / 2)
      return `M ${r} 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w - r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 ${r} 0 Z`
    }
    case 'rounded':
      return roundedRect(w, h, Math.min(16, w / 4, h / 4))
    case 'sticky':
      return roundedRect(w, h, 3)
    case 'frame':
      return roundedRect(w, h, 6)
    default:
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`
  }
}

function roundedRect(w: number, h: number, r: number): string {
  return (
    `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} ` +
    `L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`
  )
}

/** Área útil para o texto dentro da forma (coordenadas locais). */
export function textBox(kind: ShapeKind, w: number, h: number): Rect {
  switch (kind) {
    case 'diamond':
      return { x: w * 0.2, y: h * 0.2, w: w * 0.6, h: h * 0.6 }
    case 'ellipse':
      return { x: w * 0.12, y: h * 0.12, w: w * 0.76, h: h * 0.76 }
    case 'triangle':
      return { x: w * 0.25, y: h * 0.4, w: w * 0.5, h: h * 0.55 }
    case 'parallelogram':
    case 'hexagon':
      return { x: w * 0.18, y: 4, w: w * 0.64, h: h - 8 }
    case 'cylinder':
      return { x: 8, y: Math.min(h * 0.3, 36), w: w - 16, h: h - Math.min(h * 0.3, 36) - 6 }
    case 'document':
      return { x: 8, y: 4, w: w - 16, h: h * 0.82 }
    case 'sticky':
      return { x: 12, y: 12, w: w - 24, h: h - 24 }
    default:
      return { x: 8, y: 4, w: w - 16, h: h - 8 }
  }
}

export const SIDES: Side[] = ['top', 'right', 'bottom', 'left']

export function sidePoint(n: Rect, side: Side): Point {
  switch (side) {
    case 'top':
      return { x: n.x + n.w / 2, y: n.y }
    case 'right':
      return { x: n.x + n.w, y: n.y + n.h / 2 }
    case 'bottom':
      return { x: n.x + n.w / 2, y: n.y + n.h }
    case 'left':
      return { x: n.x, y: n.y + n.h / 2 }
  }
}

export function sideDir(side: Side): Point {
  switch (side) {
    case 'top':
      return { x: 0, y: -1 }
    case 'right':
      return { x: 1, y: 0 }
    case 'bottom':
      return { x: 0, y: 1 }
    case 'left':
      return { x: -1, y: 0 }
  }
}

export function center(r: Rect): Point {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}

/** Lado de `n` voltado para o ponto `toward`. */
export function autoSide(n: Rect, toward: Point): Side {
  const c = center(n)
  const dx = (toward.x - c.x) / Math.max(n.w, 1)
  const dy = (toward.y - c.y) / Math.max(n.h, 1)
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left'
  return dy >= 0 ? 'bottom' : 'top'
}

/** Lado mais próximo de um ponto (para soltar um conector numa forma). */
export function nearestSide(n: Rect, p: Point): Side {
  let best: Side = 'top'
  let bestD = Infinity
  for (const s of SIDES) {
    const q = sidePoint(n, s)
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return best
}

interface ResolvedEnd {
  p: Point
  dir: Point | null
}

function resolveEnd(end: EdgeEnd, other: EdgeEnd, byId: Map<string, DiagramNode>): ResolvedEnd {
  const n = end.nodeId ? byId.get(end.nodeId) : undefined
  if (!n) return { p: { x: end.x ?? 0, y: end.y ?? 0 }, dir: null }
  const on = other.nodeId ? byId.get(other.nodeId) : undefined
  const target = on ? center(on) : { x: other.x ?? 0, y: other.y ?? 0 }
  const side = end.side ?? autoSide(n, target)
  return { p: sidePoint(n, side), dir: sideDir(side) }
}

export interface EdgeGeometry {
  d: string
  points: Point[]
  mid: Point
  start: Point
  end: Point
  /** Ângulos (rad) das pontas, apontando para fora da linha. */
  startAngle: number
  endAngle: number
}

const STUB = 24

export function edgeGeometry(edge: DiagramEdge, byId: Map<string, DiagramNode>): EdgeGeometry {
  const a = resolveEnd(edge.from, edge.to, byId)
  const b = resolveEnd(edge.to, edge.from, byId)
  return routePath(a, b, edge.style.routing)
}

export function routePath(a: ResolvedEnd, b: ResolvedEnd, routing: Routing): EdgeGeometry {
  let points: Point[]
  let d: string
  if (routing === 'curved') {
    const dist = Math.max(40, Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y) * 0.4)
    const da = a.dir ?? unit(b.p, a.p)
    const db = b.dir ?? unit(a.p, b.p)
    const c1 = { x: a.p.x + da.x * dist, y: a.p.y + da.y * dist }
    const c2 = { x: b.p.x + db.x * dist, y: b.p.y + db.y * dist }
    d = `M ${a.p.x} ${a.p.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.p.x} ${b.p.y}`
    points = [a.p, bezier(a.p, c1, c2, b.p, 0.5), b.p]
    return {
      d,
      points,
      mid: bezier(a.p, c1, c2, b.p, 0.5),
      start: a.p,
      end: b.p,
      startAngle: Math.atan2(a.p.y - c1.y, a.p.x - c1.x),
      endAngle: Math.atan2(b.p.y - c2.y, b.p.x - c2.x),
    }
  }
  if (routing === 'straight') {
    points = [a.p, b.p]
  } else {
    points = orthogonal(a, b)
  }
  points = dedupe(points)
  d = points.map((p, i) => `${i ? 'L' : 'M'} ${round(p.x)} ${round(p.y)}`).join(' ')
  const n = points.length
  return {
    d,
    points,
    mid: polylineMid(points),
    start: points[0],
    end: points[n - 1],
    startAngle: Math.atan2(points[0].y - points[1].y, points[0].x - points[1].x),
    endAngle: Math.atan2(points[n - 1].y - points[n - 2].y, points[n - 1].x - points[n - 2].x),
  }
}

function round(v: number) {
  return Math.round(v * 100) / 100
}

function unit(from: Point, to: Point): Point {
  const dx = from.x - to.x
  const dy = from.y - to.y
  const l = Math.hypot(dx, dy) || 1
  return { x: dx / l, y: dy / l }
}

function bezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  }
}

function dedupe(pts: Point[]): Point[] {
  const out: Point[] = []
  for (const p of pts) {
    const last = out[out.length - 1]
    if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue
    out.push(p)
  }
  // Remove pontos colineares do meio.
  for (let i = out.length - 2; i > 0; i--) {
    const p = out[i - 1], q = out[i], r = out[i + 1]
    const col = (Math.abs(p.x - q.x) < 0.01 && Math.abs(q.x - r.x) < 0.01) || (Math.abs(p.y - q.y) < 0.01 && Math.abs(q.y - r.y) < 0.01)
    if (col) out.splice(i, 1)
  }
  if (out.length < 2) out.push({ ...out[0] })
  return out
}

/** Rota em cotovelos: sai de cada ponta na direção do lado e se encontra no meio. */
export function orthogonal(a: ResolvedEnd, b: ResolvedEnd): Point[] {
  const da = a.dir ?? guessDir(a.p, b.p)
  const db = b.dir ?? guessDir(b.p, a.p)
  const s1 = { x: a.p.x + da.x * STUB, y: a.p.y + da.y * STUB }
  const s2 = { x: b.p.x + db.x * STUB, y: b.p.y + db.y * STUB }
  const aH = da.x !== 0
  const bH = db.x !== 0
  let middle: Point[]
  if (aH && bH) {
    // Os dois saem na horizontal.
    const facing = (da.x > 0 && s2.x >= s1.x) || (da.x < 0 && s2.x <= s1.x)
    if (facing && da.x === -db.x) {
      const mx = (a.p.x + b.p.x) / 2
      middle = [{ x: mx, y: a.p.y }, { x: mx, y: b.p.y }]
    } else if (da.x === db.x) {
      const x = da.x > 0 ? Math.max(s1.x, s2.x) : Math.min(s1.x, s2.x)
      middle = [{ x, y: a.p.y }, { x, y: b.p.y }]
    } else {
      const my = (s1.y + s2.y) / 2
      middle = [s1, { x: s1.x, y: my }, { x: s2.x, y: my }, s2]
    }
  } else if (!aH && !bH) {
    const facing = (da.y > 0 && s2.y >= s1.y) || (da.y < 0 && s2.y <= s1.y)
    if (facing && da.y === -db.y) {
      const my = (a.p.y + b.p.y) / 2
      middle = [{ x: a.p.x, y: my }, { x: b.p.x, y: my }]
    } else if (da.y === db.y) {
      const y = da.y > 0 ? Math.max(s1.y, s2.y) : Math.min(s1.y, s2.y)
      middle = [{ x: a.p.x, y }, { x: b.p.x, y }]
    } else {
      const mx = (s1.x + s2.x) / 2
      middle = [s1, { x: mx, y: s1.y }, { x: mx, y: s2.y }, s2]
    }
  } else if (aH) {
    // a horizontal, b vertical: um cotovelo se der, senão contorna.
    const corner = { x: b.p.x, y: a.p.y }
    const okA = (corner.x - a.p.x) * da.x > 0
    const okB = (corner.y - b.p.y) * db.y > 0
    middle = okA && okB ? [corner] : [s1, { x: s1.x, y: s2.y }, s2]
  } else {
    const corner = { x: a.p.x, y: b.p.y }
    const okA = (corner.y - a.p.y) * da.y > 0
    const okB = (corner.x - b.p.x) * db.x > 0
    middle = okA && okB ? [corner] : [s1, { x: s2.x, y: s1.y }, s2]
  }
  return [a.p, ...middle, b.p]
}

function guessDir(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) >= Math.abs(dy)) return { x: Math.sign(dx) || 1, y: 0 }
  return { x: 0, y: Math.sign(dy) || 1 }
}

export function polylineMid(pts: Point[]): Point {
  let total = 0
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  let half = total / 2
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    if (half <= seg && seg > 0) {
      const t = half / seg
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t }
    }
    half -= seg
  }
  return pts[0]
}

export function nodeRect(n: DiagramNode): Rect {
  return { x: n.x, y: n.y, w: n.w, h: n.h }
}

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export function handlePoint(r: Rect, h: Handle): Point {
  const x = h.includes('w') ? r.x : h.includes('e') ? r.x + r.w : r.x + r.w / 2
  const y = h.includes('n') ? r.y : h.includes('s') ? r.y + r.h : r.y + r.h / 2
  return { x, y }
}

/** Novo retângulo ao arrastar a alça `h` por (dx, dy). */
export function resizeRect(r: Rect, h: Handle, dx: number, dy: number, min = 20, keepRatio = false): Rect {
  let { x, y, w, h: hh } = r
  if (h.includes('e')) w = r.w + dx
  if (h.includes('s')) hh = r.h + dy
  if (h.includes('w')) {
    w = r.w - dx
    x = r.x + dx
  }
  if (h.includes('n')) {
    hh = r.h - dy
    y = r.y + dy
  }
  if (keepRatio && r.w > 0 && r.h > 0 && h.length === 2) {
    const ratio = r.w / r.h
    if (w / hh > ratio) w = hh * ratio
    else hh = w / ratio
    if (h.includes('w')) x = r.x + r.w - w
    if (h.includes('n')) y = r.y + r.h - hh
  }
  if (w < min) {
    if (h.includes('w')) x = r.x + r.w - min
    w = min
  }
  if (hh < min) {
    if (h.includes('n')) y = r.y + r.h - min
    hh = min
  }
  return { x, y, w, h: hh }
}
