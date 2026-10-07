import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import type { ShapeKind, Tool } from '../lib/types'
import { SHAPE_LABELS } from '../lib/model'
import { Icon, ShapeIcon } from './Icons'

const FLOW_SHAPES: ShapeKind[] = [
  'rect',
  'rounded',
  'ellipse',
  'diamond',
  'terminator',
  'parallelogram',
  'hexagon',
  'document',
  'cylinder',
  'triangle',
]

const ISO_SHAPES: ShapeKind[] = ['isoCube', 'isoCylinder', 'isoPyramid']

type Menu = 'flow' | 'iso' | null

export const TOOL_KEYS: Record<string, Tool> = {
  v: 'select',
  h: 'hand',
  l: 'connector',
  r: 'rect',
  o: 'ellipse',
  d: 'diamond',
  s: 'sticky',
  t: 'text',
  f: 'frame',
}

function ToolButton({ tool, label, keyHint, children }: { tool: Tool; label: string; keyHint?: string; children: React.ReactNode }) {
  const active = useStore((s) => s.tool === tool)
  const locked = useStore((s) => s.toolLocked && s.tool === tool)
  const setTool = useStore((s) => s.setTool)
  return (
    <button
      className={`tool${active ? ' active' : ''}${locked ? ' locked' : ''}`}
      title={`${label}${keyHint ? ` (${keyHint.toUpperCase()})` : ''} — duplo clique trava a ferramenta`}
      aria-label={label}
      data-testid={`tool-${tool}`}
      onClick={() => setTool(tool)}
      onDoubleClick={() => setTool(tool, true)}
    >
      {children}
    </button>
  )
}

export default function Toolbar() {
  const [open, setOpen] = useState<Menu>(null)
  const tool = useStore((s) => s.tool)
  const setTool = useStore((s) => s.setTool)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  // Atalhos: M abre "Mais formas", K abre "Formas 3D".
  useEffect(() => {
    const onToggle = (e: Event) => setOpen((cur) => ((e as CustomEvent<Menu>).detail === cur ? null : (e as CustomEvent<Menu>).detail))
    window.addEventListener('fluxdiag:shape-menu', onToggle)
    return () => window.removeEventListener('fluxdiag:shape-menu', onToggle)
  }, [])

  const inFlow = FLOW_SHAPES.includes(tool as ShapeKind) && !['rect', 'ellipse', 'diamond'].includes(tool)
  const inIso = ISO_SHAPES.includes(tool as ShapeKind)

  const menu = (kinds: ShapeKind[], title: string, hint: string) => (
    <div className="shape-menu" role="menu" aria-label={title}>
      <div className="shape-menu-title">
        {title} <span>{hint}</span>
      </div>
      {kinds.map((k) => (
        <button
          key={k}
          className={tool === k ? 'active' : ''}
          title={SHAPE_LABELS[k]}
          data-testid={`shape-${k}`}
          onClick={() => {
            setTool(k)
            setOpen(null)
          }}
        >
          <ShapeIcon kind={k} size={28} />
          <span>{SHAPE_LABELS[k].replace(/ \(isométric[oa]\)/, '')}</span>
        </button>
      ))}
      <p className="shape-menu-tip">Clique no quadro para inserir, ou arraste para escolher o tamanho.</p>
    </div>
  )

  return (
    <div className="toolbar" ref={ref}>
      <ToolButton tool="select" label="Selecionar" keyHint="v">
        <Icon name="select" />
      </ToolButton>
      <ToolButton tool="hand" label="Mover quadro" keyHint="h">
        <Icon name="hand" />
      </ToolButton>
      <div className="sep" />
      <ToolButton tool="sticky" label="Nota adesiva" keyHint="s">
        <ShapeIcon kind="sticky" />
      </ToolButton>
      <ToolButton tool="text" label="Texto" keyHint="t">
        <ShapeIcon kind="text" />
      </ToolButton>
      <ToolButton tool="rect" label="Retângulo" keyHint="r">
        <ShapeIcon kind="rect" />
      </ToolButton>
      <ToolButton tool="ellipse" label="Elipse" keyHint="o">
        <ShapeIcon kind="ellipse" />
      </ToolButton>
      <ToolButton tool="diamond" label="Decisão" keyHint="d">
        <ShapeIcon kind="diamond" />
      </ToolButton>
      <div className="tool-more">
        <button
          className={`tool labeled${inFlow || open === 'flow' ? ' active' : ''}`}
          title="Mais formas de fluxograma (M)"
          aria-label="Mais formas"
          aria-expanded={open === 'flow'}
          data-testid="more-shapes"
          onClick={() => setOpen((v) => (v === 'flow' ? null : 'flow'))}
        >
          <Icon name="shapes" />
          <small>Mais</small>
        </button>
        {open === 'flow' && menu(FLOW_SHAPES, 'Mais formas', 'M')}
      </div>
      <div className="tool-more">
        <button
          className={`tool labeled${inIso || open === 'iso' ? ' active' : ''}`}
          title="Formas 3D isométricas (K)"
          aria-label="Formas 3D"
          aria-expanded={open === 'iso'}
          data-testid="iso-shapes"
          onClick={() => setOpen((v) => (v === 'iso' ? null : 'iso'))}
        >
          <ShapeIcon kind="isoCube" />
          <small>3D</small>
        </button>
        {open === 'iso' && menu(ISO_SHAPES, 'Formas 3D isométricas', 'K')}
      </div>
      <div className="sep" />
      <ToolButton tool="connector" label="Conector" keyHint="l">
        <Icon name="connector" />
      </ToolButton>
      <ToolButton tool="frame" label="Frame / slide" keyHint="f">
        <ShapeIcon kind="frame" />
      </ToolButton>
    </div>
  )
}
