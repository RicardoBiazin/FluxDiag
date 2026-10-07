import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import type { Rect } from '../lib/types'
import { diagramBounds } from '../lib/model'
import { nodeRect } from '../lib/geometry'
import { StaticDiagram, SvgDefs } from './Graphics'

function lerp(a: Rect, b: Rect, t: number): Rect {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t }
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Slides da apresentação: os frames na ordem definida; sem frames, o diagrama inteiro. */
export function useSlides() {
  const doc = useStore((s) => s.doc)
  return useMemo(() => {
    const frames = doc.slides.map((id) => doc.nodes.find((n) => n.id === id)).filter(Boolean)
    if (frames.length) return frames.map((f) => ({ id: f!.id, title: f!.text, rect: nodeRect(f!), notes: f!.notes ?? '' }))
    const b = diagramBounds(doc)
    if (!b) return []
    const pad = 40
    return [{ id: 'all', title: doc.name, rect: { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 }, notes: '' }]
  }, [doc])
}

export default function Presenter() {
  const doc = useStore((s) => s.doc)
  const index = useStore((s) => s.presenting)!
  const setSlide = useStore((s) => s.setSlide)
  const stop = useStore((s) => s.stopPresentation)
  const slides = useSlides()
  const [showNotes, setShowNotes] = useState(false)
  const [showHelp, setShowHelp] = useState(true)
  const [view, setView] = useState<Rect | null>(null)
  const viewRef = useRef<Rect | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const anim = useRef<number>(0)
  const [idle, setIdle] = useState(false)

  const cur = slides[Math.min(index, slides.length - 1)]

  // Tela cheia ao entrar; sair da tela cheia encerra a apresentação.
  useEffect(() => {
    const el = rootRef.current
    if (el && document.fullscreenEnabled && !document.fullscreenElement) el.requestFullscreen?.().catch(() => {})
    const onFs = () => {
      if (!document.fullscreenElement) stop()
    }
    document.addEventListener('fullscreenchange', onFs)
    const t = setTimeout(() => setShowHelp(false), 3500)
    return () => {
      clearTimeout(t)
      document.removeEventListener('fullscreenchange', onFs)
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [stop])

  // Câmera voando entre os frames.
  useEffect(() => {
    if (!cur) return
    const target = cur.rect
    const from = viewRef.current
    cancelAnimationFrame(anim.current)
    if (!from) {
      viewRef.current = target
      setView(target)
      return
    }
    const t0 = performance.now()
    const dur = 650
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      const r = lerp(from, target, ease(t))
      viewRef.current = r
      setView(r)
      if (t < 1) anim.current = requestAnimationFrame(step)
    }
    anim.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(anim.current)
  }, [cur?.id, cur?.rect.x, cur?.rect.y, cur?.rect.w, cur?.rect.h])

  useEffect(() => {
    const go = (i: number) => setSlide(Math.max(0, Math.min(slides.length - 1, i)))
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
        case 'Enter':
          e.preventDefault()
          go(index + 1)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
        case 'Backspace':
          e.preventDefault()
          go(index - 1)
          break
        case 'Home':
          go(0)
          break
        case 'End':
          go(slides.length - 1)
          break
        case 'Escape':
          stop()
          break
        case 'n':
        case 'N':
          setShowNotes((v) => !v)
          break
        case 'f':
        case 'F':
          if (document.fullscreenElement) document.exitFullscreen()
          else rootRef.current?.requestFullscreen?.()
          break
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [index, slides.length, setSlide, stop])

  // Esconde os controles com o mouse parado.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const wake = () => {
      setIdle(false)
      clearTimeout(t)
      t = setTimeout(() => setIdle(true), 2500)
    }
    wake()
    window.addEventListener('mousemove', wake)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousemove', wake)
    }
  }, [])

  if (!cur || !view) {
    return (
      <div className="presenter" ref={rootRef} onClick={stop}>
        <div className="presenter-empty">Nada para apresentar. Adicione formas ou frames. (Esc para sair)</div>
      </div>
    )
  }

  const big = 1e6
  return (
    <div className={`presenter${idle ? ' idle' : ''}`} ref={rootRef} data-testid="presenter">
      <svg
        className="presenter-svg"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          setSlide(Math.max(0, Math.min(slides.length - 1, index + (e.clientX < r.left + r.width * 0.25 ? -1 : 1))))
        }}
      >
        <SvgDefs />
        <rect x={-big} y={-big} width={big * 2} height={big * 2} fill="#f1f3f5" />
        <StaticDiagram doc={doc} />
        {/* Escurece tudo fora do slide atual. */}
        <path
          d={`M ${-big} ${-big} H ${big} V ${big} H ${-big} Z M ${view.x} ${view.y} v ${view.h} h ${view.w} v ${-view.h} Z`}
          fill="#111"
          fillRule="evenodd"
        />
      </svg>
      <div className="presenter-bar">
        <button onClick={() => setSlide(Math.max(0, index - 1))} disabled={index === 0} title="Anterior (←)">
          ‹
        </button>
        <span data-testid="slide-counter">
          {index + 1} / {slides.length}
        </span>
        <button onClick={() => setSlide(Math.min(slides.length - 1, index + 1))} disabled={index >= slides.length - 1} title="Próximo (→)">
          ›
        </button>
        <span className="presenter-title">{cur.title}</span>
        <button onClick={() => setShowNotes((v) => !v)} className={showNotes ? 'on' : ''} title="Anotações (N)">
          Notas
        </button>
        <button onClick={stop} title="Sair (Esc)">
          Sair
        </button>
      </div>
      <div className="presenter-progress" style={{ width: `${((index + 1) / slides.length) * 100}%` }} />
      {showNotes && <div className="presenter-notes">{cur.notes || <em>Sem anotações neste slide.</em>}</div>}
      {showHelp && <div className="presenter-help">← → navegar · N anotações · F tela cheia · Esc sair</div>}
    </div>
  )
}
