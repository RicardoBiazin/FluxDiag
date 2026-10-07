import type { ShapeKind } from '../lib/types'
import { isoFaces, shapePath } from '../lib/geometry'

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true }
  switch (name) {
    case 'select':
      return <svg {...s}><path {...P} d="M5 3l14 8-6 1.5L10 19z" /></svg>
    case 'hand':
      return <svg {...s}><path {...P} d="M8 13V5.5a1.5 1.5 0 013 0V11m0-6.5a1.5 1.5 0 013 0V11m0-5a1.5 1.5 0 013 0v7c0 4-2.5 7-6.5 7-3 0-4.5-1.5-6-4l-2-3.5a1.5 1.5 0 012.6-1.5L8 13" /></svg>
    case 'connector':
      return <svg {...s}><path {...P} d="M4 18h6V6h8" /><path {...P} d="M15 3l3 3-3 3" /></svg>
    case 'undo':
      return <svg {...s}><path {...P} d="M9 14L4 9l5-5" /><path {...P} d="M4 9h10a6 6 0 010 12h-3" /></svg>
    case 'redo':
      return <svg {...s}><path {...P} d="M15 14l5-5-5-5" /><path {...P} d="M20 9H10a6 6 0 000 12h3" /></svg>
    case 'play':
      return <svg {...s}><path d="M7 4.5v15l12-7.5z" fill="currentColor" /></svg>
    case 'menu':
      return <svg {...s}><path {...P} d="M4 6h16M4 12h16M4 18h16" /></svg>
    case 'plus':
      return <svg {...s}><path {...P} d="M12 5v14M5 12h14" /></svg>
    case 'minus':
      return <svg {...s}><path {...P} d="M5 12h14" /></svg>
    case 'fit':
      return <svg {...s}><path {...P} d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
    case 'download':
      return <svg {...s}><path {...P} d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" /></svg>
    case 'trash':
      return <svg {...s}><path {...P} d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
    case 'copy':
      return <svg {...s}><rect {...P} x="8" y="8" width="12" height="12" rx="2" /><path {...P} d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" /></svg>
    case 'up':
      return <svg {...s}><path {...P} d="M6 15l6-6 6 6" /></svg>
    case 'down':
      return <svg {...s}><path {...P} d="M6 9l6 6 6-6" /></svg>
    case 'grid':
      return <svg {...s}><path {...P} d="M4 4h16v16H4zM4 12h16M12 4v16" /></svg>
    case 'shapes':
      return <svg {...s}><rect {...P} x="3" y="13" width="8" height="8" rx="1" /><circle {...P} cx="17" cy="17" r="4" /><path {...P} d="M12 3l5 8H7z" /></svg>
    case 'grid-iso':
      return <svg {...s}><path {...P} d="M3 7l18 10M3 17L21 7M12 3v18" /></svg>
    case 'magnet':
      return <svg {...s}><path {...P} d="M6 4v8a6 6 0 0012 0V4h-4v8a2 2 0 01-4 0V4z" /><path {...P} d="M6 8h4M14 8h4" /></svg>
    case 'sun':
      return <svg {...s}><circle {...P} cx="12" cy="12" r="4" /><path {...P} d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
    case 'moon':
      return <svg {...s}><path {...P} d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" /></svg>
    case 'help':
      return <svg {...s}><circle {...P} cx="12" cy="12" r="9" /><path {...P} d="M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5M12 17h.01" /></svg>
    case 'slides':
      return <svg {...s}><rect {...P} x="3" y="5" width="18" height="12" rx="1.5" /><path {...P} d="M8 21h8M12 17v4" /></svg>
    case 'align-left':
      return <svg {...s}><path {...P} d="M4 3v18M8 7h10v4H8zM8 14h6v4H8z" /></svg>
    case 'align-hcenter':
      return <svg {...s}><path {...P} d="M12 3v18M6 7h12v4H6zM8 14h8v4H8z" /></svg>
    case 'align-right':
      return <svg {...s}><path {...P} d="M20 3v18M6 7h10v4H6zM10 14h6v4h-6z" /></svg>
    case 'align-top':
      return <svg {...s}><path {...P} d="M3 4h18M7 8v10h4V8zM14 8v6h4V8z" /></svg>
    case 'align-vcenter':
      return <svg {...s}><path {...P} d="M3 12h18M7 6v12h4V6zM14 8v8h4V8z" /></svg>
    case 'align-bottom':
      return <svg {...s}><path {...P} d="M3 20h18M7 6v10h4V6zM14 10v6h4v-6z" /></svg>
    case 'dist-h':
      return <svg {...s}><path {...P} d="M4 4v16M20 4v16M10 8h4v8h-4z" /></svg>
    case 'dist-v':
      return <svg {...s}><path {...P} d="M4 4h16M4 20h16M8 10h8v4H8z" /></svg>
    case 'front':
      return <svg {...s}><rect {...P} x="4" y="4" width="10" height="10" /><rect x="10" y="10" width="10" height="10" fill="currentColor" /></svg>
    case 'back':
      return <svg {...s}><rect x="4" y="4" width="10" height="10" fill="currentColor" /><rect {...P} x="10" y="10" width="10" height="10" fill="var(--panel)" /></svg>
    default:
      return <svg {...s} />
  }
}

export function ShapeIcon({ kind, size = 20 }: { kind: ShapeKind; size?: number }) {
  if (kind === 'text')
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path {...P} d="M5 6V4h14v2M12 4v16M9 20h6" />
      </svg>
    )
  if (kind === 'frame')
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path {...P} d="M7 3v18M17 3v18M3 7h18M3 17h18" />
      </svg>
    )
  const dims: Partial<Record<ShapeKind, [number, number]>> = {
    diamond: [18, 16],
    ellipse: [18, 13],
    triangle: [16, 15],
    cylinder: [14, 17],
    sticky: [16, 16],
    terminator: [20, 10],
    isoCube: [17, 20],
    isoCylinder: [15, 20],
    isoPyramid: [18, 17],
  }
  const [w, h] = dims[kind] ?? [18, 12]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <g transform={`translate(${(24 - w) / 2} ${(24 - h) / 2})`}>
        {isoFaces(kind, w, h)?.map((f, i) => (
          <path key={i} d={f.d} fill="currentColor" fillOpacity={f.light > 1 ? 0.08 : f.light < 1 ? 0.35 : 0.18} stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />
        )) ?? (
        <path
          d={shapePath(kind, w, h)}
          fill={kind === 'sticky' ? '#ffd43b' : 'none'}
          stroke={kind === 'sticky' ? 'none' : 'currentColor'}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        )}
      </g>
    </svg>
  )
}
