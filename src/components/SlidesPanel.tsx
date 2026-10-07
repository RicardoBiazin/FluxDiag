import { useStore } from '../store'
import { StaticDiagram } from './Graphics'
import { Icon } from './Icons'

/** Lista dos frames na ordem da apresentação, com miniatura. */
export default function SlidesPanel({ onClose }: { onClose: () => void }) {
  const doc = useStore((s) => s.doc)
  const selection = useStore((s) => s.selection)
  const st = useStore.getState()
  const frames = doc.slides.map((id) => doc.nodes.find((n) => n.id === id)!).filter(Boolean)

  return (
    <aside className="panel slides" data-testid="slides-panel">
      <div className="panel-head">
        <h3>Slides ({frames.length})</h3>
        <button className="icon-btn" onClick={onClose} title="Fechar">
          ×
        </button>
      </div>
      <div className="slide-add">
        <span>Novo frame:</span>
        <button className="btn small" onClick={() => st.addFrame(960, 540)} data-testid="add-frame">
          16:9
        </button>
        <button className="btn small" onClick={() => st.addFrame(960, 720)}>
          4:3
        </button>
        <button className="btn small" onClick={() => st.addFrame(1123, 794)}>
          A4
        </button>
      </div>
      {!frames.length && (
        <p className="muted">
          Sem frames, a apresentação mostra o diagrama inteiro num slide só. Crie frames em volta do conteúdo para ter um slide por frame.
        </p>
      )}
      <ol className="slide-list">
        {frames.map((f, i) => (
          <li key={f.id} className={selection.includes(f.id) ? 'sel' : ''}>
            <button
              className="slide-thumb"
              title="Ir para o frame"
              onClick={() => {
                st.select([f.id])
                st.zoomToRect([f.id])
              }}
              onDoubleClick={() => st.startPresentation(i)}
            >
              <svg viewBox={`${f.x} ${f.y} ${f.w} ${f.h}`} preserveAspectRatio="xMidYMid meet">
                <StaticDiagram doc={doc} />
              </svg>
            </button>
            <div className="slide-meta">
              <span className="slide-num">{i + 1}</span>
              <span className="slide-title" title={f.text}>
                {f.text || 'Sem título'}
              </span>
              <button className="icon-btn" title="Subir" disabled={i === 0} onClick={() => st.moveSlide(f.id, -1)}>
                <Icon name="up" size={16} />
              </button>
              <button className="icon-btn" title="Descer" disabled={i === frames.length - 1} onClick={() => st.moveSlide(f.id, 1)}>
                <Icon name="down" size={16} />
              </button>
              <button className="icon-btn" title="Apresentar a partir daqui" onClick={() => st.startPresentation(i)}>
                <Icon name="play" size={14} />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  )
}
