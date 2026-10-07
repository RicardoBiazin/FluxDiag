import { memo } from 'react'
import type { ArrowHead, DiagramEdge, DiagramNode, Diagram, Point } from '../lib/types'
import { edgeGeometry, shapePath, textBox, type EdgeGeometry } from '../lib/geometry'
import { FONT_FAMILY, wrapText } from '../lib/text'

const LINE_HEIGHT = 1.25

export function SvgDefs() {
  return (
    <defs>
      <filter id="fx-shadow" x="-10%" y="-10%" width="130%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.18" />
      </filter>
      <filter id="fx-frame-shadow" x="-5%" y="-5%" width="110%" height="115%">
        <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#000" floodOpacity="0.10" />
      </filter>
    </defs>
  )
}

interface TextProps {
  text: string
  x: number
  y: number
  w: number
  h: number
  fontSize: number
  color: string
  bold: boolean
  align: 'left' | 'center' | 'right'
  valign: 'top' | 'middle'
}

export function TextBlock({ text, x, y, w, h, fontSize, color, bold, align, valign }: TextProps) {
  if (!text) return null
  const lines = wrapText(text, fontSize, Math.max(w, fontSize), bold)
  const lh = fontSize * LINE_HEIGHT
  const total = lines.length * lh
  const top = valign === 'top' ? y : y + (h - total) / 2
  const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle'
  const tx = align === 'left' ? x : align === 'right' ? x + w : x + w / 2
  return (
    <text
      fontFamily={FONT_FAMILY}
      fontSize={fontSize}
      fontWeight={bold ? 700 : 400}
      fill={color}
      textAnchor={anchor}
      style={{ userSelect: 'none' }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={tx} y={top + i * lh + fontSize * 0.95}>
          {line || ' '}
        </tspan>
      ))}
    </text>
  )
}

interface NodeGraphicProps {
  node: DiagramNode
  /** Esconde o texto (enquanto está sendo editado). */
  hideText?: boolean
  /** Zoom atual: o título do frame mantém tamanho legível na tela. */
  zoom?: number
  showFrameTitle?: boolean
}

export const NodeGraphic = memo(function NodeGraphic({ node, hideText, zoom = 1, showFrameTitle = true }: NodeGraphicProps) {
  const { kind, w, h, style } = node
  const d = shapePath(kind, w, h)
  const tb = textBox(kind, w, h)
  const filter = kind === 'sticky' ? 'url(#fx-shadow)' : kind === 'frame' ? 'url(#fx-frame-shadow)' : undefined
  const isFrame = kind === 'frame'
  const titleSize = Math.min(48, style.fontSize / Math.max(zoom, 0.3))
  return (
    <g transform={`translate(${node.x} ${node.y})`}>
      {kind !== 'text' && (
        <path
          d={d}
          fill={style.fill === 'none' ? 'transparent' : style.fill}
          stroke={style.stroke === 'none' ? 'none' : style.stroke}
          strokeWidth={style.strokeWidth}
          strokeDasharray={style.dashed ? `${style.strokeWidth * 4} ${style.strokeWidth * 3}` : undefined}
          strokeLinejoin="round"
          filter={filter}
        />
      )}
      {isFrame
        ? showFrameTitle &&
          !hideText && (
            <text
              x={0}
              y={-titleSize * 0.5}
              fontFamily={FONT_FAMILY}
              fontSize={titleSize}
              fill="#6c757d"
              style={{ userSelect: 'none' }}
            >
              {node.text}
            </text>
          )
        : !hideText && (
            <TextBlock
              text={node.text}
              x={tb.x}
              y={tb.y}
              w={tb.w}
              h={tb.h}
              fontSize={style.fontSize}
              color={style.textColor}
              bold={style.bold}
              align={style.align}
              valign={kind === 'sticky' ? 'top' : 'middle'}
            />
          )}
    </g>
  )
})

function arrowPath(kind: ArrowHead, p: Point, angle: number, size: number): { d: string; filled: boolean } | null {
  if (kind === 'none') return null
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const pt = (along: number, across: number) => `${p.x + c * along - s * across} ${p.y + s * along + c * across}`
  switch (kind) {
    case 'arrow':
      return { d: `M ${pt(-size, -size * 0.55)} L ${pt(0, 0)} L ${pt(-size, size * 0.55)}`, filled: false }
    case 'triangle':
      return { d: `M ${pt(0, 0)} L ${pt(-size, -size * 0.5)} L ${pt(-size, size * 0.5)} Z`, filled: true }
    case 'diamond':
      return {
        d: `M ${pt(0, 0)} L ${pt(-size * 0.7, -size * 0.4)} L ${pt(-size * 1.4, 0)} L ${pt(-size * 0.7, size * 0.4)} Z`,
        filled: true,
      }
    case 'circle': {
      const r = size * 0.4
      const cx = p.x - c * r
      const cy = p.y - s * r
      return { d: `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`, filled: true }
    }
  }
}

interface EdgeGraphicProps {
  edge: DiagramEdge
  geom: EdgeGeometry
  hideLabel?: boolean
  highlight?: boolean
}

export const EdgeGraphic = memo(function EdgeGraphic({ edge, geom, hideLabel, highlight }: EdgeGraphicProps) {
  const { style } = edge
  const size = 8 + style.strokeWidth * 2.5
  const heads = [
    arrowPath(style.startArrow, geom.start, geom.startAngle, size),
    arrowPath(style.endArrow, geom.end, geom.endAngle, size),
  ]
  const lines = edge.label ? edge.label.split('\n') : []
  const fs = style.fontSize
  const labelW = Math.max(...lines.map((l) => l.length * fs * 0.58), 0) + 12
  const labelH = lines.length * fs * LINE_HEIGHT + 6
  return (
    <g>
      {highlight && (
        <path d={geom.d} fill="none" stroke="#4dabf7" strokeWidth={style.strokeWidth + 6} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
      )}
      <path
        d={geom.d}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.dashed ? `${style.strokeWidth * 4} ${style.strokeWidth * 3}` : undefined}
        strokeLinejoin="round"
      />
      {heads.map(
        (hd, i) =>
          hd && (
            <path
              key={i}
              d={hd.d}
              fill={hd.filled ? style.stroke : 'none'}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ),
      )}
      {!hideLabel && lines.length > 0 && (
        <g>
          <rect
            x={geom.mid.x - labelW / 2}
            y={geom.mid.y - labelH / 2}
            width={labelW}
            height={labelH}
            rx={4}
            fill="#ffffff"
            fillOpacity={0.92}
          />
          <text fontFamily={FONT_FAMILY} fontSize={fs} fill={style.textColor} textAnchor="middle" style={{ userSelect: 'none' }}>
            {lines.map((l, i) => (
              <tspan key={i} x={geom.mid.x} y={geom.mid.y - labelH / 2 + 3 + i * fs * LINE_HEIGHT + fs * 0.95}>
                {l || ' '}
              </tspan>
            ))}
          </text>
        </g>
      )}
    </g>
  )
})

/** Desenho estático do diagrama inteiro (miniaturas, apresentação, exportação). */
export function StaticDiagram({ doc, showFrameTitles = false }: { doc: Diagram; showFrameTitles?: boolean }) {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]))
  return (
    <>
      {doc.nodes.map((n) => (
        <NodeGraphic key={n.id} node={n} showFrameTitle={showFrameTitles} />
      ))}
      {doc.edges.map((e) => (
        <EdgeGraphic key={e.id} edge={e} geom={edgeGeometry(e, byId)} />
      ))}
    </>
  )
}
