export type ShapeKind =
  | 'rect'
  | 'rounded'
  | 'ellipse'
  | 'diamond'
  | 'parallelogram'
  | 'hexagon'
  | 'triangle'
  | 'cylinder'
  | 'document'
  | 'terminator'
  | 'isoCube'
  | 'isoCylinder'
  | 'isoPyramid'
  | 'sticky'
  | 'text'
  | 'frame'

export type TextAlign = 'left' | 'center' | 'right'

export interface NodeStyle {
  fill: string
  stroke: string
  strokeWidth: number
  dashed: boolean
  textColor: string
  fontSize: number
  bold: boolean
  align: TextAlign
}

export interface DiagramNode {
  id: string
  kind: ShapeKind
  x: number
  y: number
  w: number
  h: number
  text: string
  style: NodeStyle
  /** Anotações do apresentador (só para frames). */
  notes?: string
}

export type Side = 'top' | 'right' | 'bottom' | 'left'

export interface EdgeEnd {
  nodeId?: string
  /** Lado fixo; sem ele o lado é escolhido automaticamente. */
  side?: Side
  /** Ponto livre (quando não está ligado a um nó). */
  x?: number
  y?: number
}

export type Routing = 'orthogonal' | 'straight' | 'curved'
export type ArrowHead = 'none' | 'arrow' | 'triangle' | 'circle' | 'diamond'

export interface EdgeStyle {
  stroke: string
  strokeWidth: number
  dashed: boolean
  routing: Routing
  startArrow: ArrowHead
  endArrow: ArrowHead
  textColor: string
  fontSize: number
}

export interface DiagramEdge {
  id: string
  from: EdgeEnd
  to: EdgeEnd
  label: string
  style: EdgeStyle
}

export interface Diagram {
  version: 1
  name: string
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  /** Ordem dos frames na apresentação. */
  slides: string[]
}

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Camera {
  /** Deslocamento em pixels de tela. */
  x: number
  y: number
  zoom: number
}

export type Tool =
  | 'select'
  | 'hand'
  | 'connector'
  | ShapeKind
