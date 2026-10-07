import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import type { ShapeKind, Tool } from '../lib/types'
import { SHAPE_LABELS } from '../lib/model'
import { Icon, ShapeIcon } from './Icons'

const MORE_SHAPES: ShapeKind[] = [
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
  'isoCube',
  'isoCylinder',
  'isoPyramid',
]

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
  const [open, setOpen] = useState(false)
  const [lastShape, setLastShape] = useState<ShapeKind>('rounded')
  const tool = useStore((s) => s.tool)
  const setTool = useStore((s) => s.setTool)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (MORE_SHAPES.includes(tool as ShapeKind) && tool !== 'rect' && tool !== 'ellipse' && tool !== 'diamond')
      setLastShape(tool as ShapeKind)
  }, [tool])

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

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
        <ToolButton tool={lastShape} label={SHAPE_LABELS[lastShape]}>
          <ShapeIcon kind={lastShape} />
        </ToolButton>
        <button className="tool-more-btn" title="Mais formas" aria-label="Mais formas" data-testid="more-shapes" onClick={() => setOpen((v) => !v)}>
          ▸
        </button>
        {open && (
          <div className="shape-menu">
            {MORE_SHAPES.map((k) => (
              <button
                key={k}
                className={tool === k ? 'active' : ''}
                title={SHAPE_LABELS[k]}
                data-testid={`shape-${k}`}
                onClick={() => {
                  setTool(k)
                  setLastShape(k)
                  setOpen(false)
                }}
              >
                <ShapeIcon kind={k} size={26} />
                <span>{SHAPE_LABELS[k]}</span>
              </button>
            ))}
          </div>
        )}
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
