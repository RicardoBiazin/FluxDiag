import { useStore, selectedEdges, selectedNodes, type AlignMode } from '../store'
import type { ArrowHead, NodeStyle, Routing, ShapeKind } from '../lib/types'
import { PALETTE, SHAPE_LABELS, STICKY_COLORS } from '../lib/model'
import { Icon } from './Icons'
import CommitInput from './CommitInput'
import { useShallow } from 'zustand/react/shallow'


function Swatches({ value, onPick, colors, allowNone }: { value: string; onPick: (c: string) => void; colors: string[]; allowNone?: boolean }) {
  return (
    <div className="swatches">
      {allowNone && (
        <button className={`swatch none${value === 'none' ? ' sel' : ''}`} title="Sem cor" onClick={() => onPick('none')} />
      )}
      {colors.map((c) => (
        <button key={c} className={`swatch${value.toLowerCase() === c ? ' sel' : ''}`} style={{ background: c }} title={c} onClick={() => onPick(c)} />
      ))}
      <label className="swatch custom" title="Outra cor">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onPick(e.target.value)} />
      </label>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="prop-row">
      <span className="prop-label">{label}</span>
      <div className="prop-value">{children}</div>
    </div>
  )
}

function Seg<T extends string>({ value, options, onPick }: { value: T | undefined; options: [T, string][]; onPick: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? 'on' : ''} onClick={() => onPick(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

function common<T>(values: T[]): T | undefined {
  return values.length && values.every((v) => v === values[0]) ? values[0] : undefined
}

const ARROWS: [ArrowHead, string][] = [
  ['none', '—'],
  ['arrow', '>'],
  ['triangle', '▶'],
  ['circle', '●'],
  ['diamond', '◆'],
]

export default function Properties() {
  const nodes = useStore(useShallow((s) => selectedNodes(s)))
  const edges = useStore(useShallow((s) => selectedEdges(s)))
  const doc = useStore((s) => s.doc)
  const st = useStore.getState()

  if (!nodes.length && !edges.length) {
    const frames = doc.nodes.filter((n) => n.kind === 'frame').length
    return (
      <aside className="panel props">
        <h3>Documento</h3>
        <Row label="Nome">
          <CommitInput value={doc.name} onCommit={st.rename} />
        </Row>
        <p className="muted">
          {doc.nodes.length - frames} formas · {doc.edges.length} conectores · {frames} frames
        </p>
        <h3>Dicas</h3>
        <ul className="tips">
          <li>Passe o mouse numa forma e <b>arraste o ponto azul</b> para conectar; <b>clique</b> nele para criar a próxima etapa.</li>
          <li>Duplo clique edita o texto; no vazio cria um texto.</li>
          <li>Crie <b>frames</b> (F) para montar os slides e clique em <b>Apresentar</b>.</li>
          <li>Espaço + arrastar move o quadro; Ctrl + rolar dá zoom.</li>
        </ul>
      </aside>
    )
  }

  const ids = nodes.map((n) => n.id)
  const setStyle = (patch: Partial<NodeStyle>) => st.updateNodeStyle(ids, patch)
  const single = nodes.length === 1 && !edges.length ? nodes[0] : undefined
  const kinds = new Set(nodes.map((n) => n.kind))
  const onlyKind = kinds.size === 1 ? ([...kinds][0] as ShapeKind) : undefined
  const fill = common(nodes.map((n) => n.style.fill)) ?? ''
  const stroke = common(nodes.map((n) => n.style.stroke)) ?? ''

  return (
    <aside className="panel props" data-testid="properties">
      {nodes.length > 0 && (
        <>
          <h3>{single ? SHAPE_LABELS[single.kind] : `${nodes.length} formas`}</h3>
          {single?.kind === 'frame' && (
            <>
              <Row label="Título">
                <CommitInput value={single.text} onCommit={(v) => st.updateNode(single.id, { text: v })} />
              </Row>
              <Row label="Anotações">
                <CommitInput
                  multiline
                  placeholder="Anotações do apresentador (tecla N na apresentação)"
                  value={single.notes ?? ''}
                  onCommit={(v) => st.updateNode(single.id, { notes: v })}
                />
              </Row>
              <Row label="Proporção">
                <div className="seg">
                  {(
                    [
                      ['16:9', 960, 540],
                      ['4:3', 960, 720],
                      ['1:1', 720, 720],
                      ['A4', 1123, 794],
                    ] as const
                  ).map(([label, w, h]) => (
                    <button key={label} className={single.w === w && single.h === h ? 'on' : ''} onClick={() => st.updateNode(single.id, { w, h })}>
                      {label}
                    </button>
                  ))}
                </div>
              </Row>
            </>
          )}
          {onlyKind !== 'text' && (
            <Row label="Preenchimento">
              <Swatches value={fill} onPick={(c) => setStyle({ fill: c })} colors={onlyKind === 'sticky' ? STICKY_COLORS : PALETTE} allowNone={onlyKind !== 'sticky'} />
            </Row>
          )}
          {onlyKind !== 'sticky' && onlyKind !== 'text' && (
            <>
              <Row label="Borda">
                <Swatches value={stroke} onPick={(c) => setStyle({ stroke: c, strokeWidth: c === 'none' ? 0 : Math.max(1, nodes[0].style.strokeWidth || 2) })} colors={PALETTE} allowNone />
              </Row>
              <Row label="Espessura">
                <input type="range" min={0} max={10} value={common(nodes.map((n) => n.style.strokeWidth)) ?? 2} onChange={(e) => setStyle({ strokeWidth: +e.target.value })} />
                <label className="check">
                  <input type="checkbox" checked={!!common(nodes.map((n) => n.style.dashed))} onChange={(e) => setStyle({ dashed: e.target.checked })} /> tracejada
                </label>
              </Row>
            </>
          )}
          {onlyKind !== 'frame' && (
            <>
              <Row label="Texto">
                <Swatches value={common(nodes.map((n) => n.style.textColor)) ?? ''} onPick={(c) => setStyle({ textColor: c })} colors={['#212529', '#495057', '#ffffff', '#e03131', '#f08c00', '#2f9e44', '#1971c2', '#6741d9']} />
              </Row>
              <Row label="Fonte">
                <select value={common(nodes.map((n) => n.style.fontSize)) ?? ''} onChange={(e) => setStyle({ fontSize: +e.target.value })}>
                  {common(nodes.map((n) => n.style.fontSize)) === undefined && <option value="">—</option>}
                  {[10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 80].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button className={`mini${common(nodes.map((n) => n.style.bold)) ? ' on' : ''}`} onClick={() => setStyle({ bold: !nodes[0].style.bold })} title="Negrito">
                  <b>N</b>
                </button>
                <Seg
                  value={common(nodes.map((n) => n.style.align))}
                  options={[
                    ['left', '⇤'],
                    ['center', '≡'],
                    ['right', '⇥'],
                  ]}
                  onPick={(v) => setStyle({ align: v })}
                />
              </Row>
            </>
          )}
          {single && (
            <Row label="Posição">
              <div className="xywh">
                {(['x', 'y', 'w', 'h'] as const).map((k) => (
                  <label key={k}>
                    {k.toUpperCase()}
                    <input
                      type="number"
                      value={Math.round(single[k])}
                      onChange={(e) => {
                        const v = +e.target.value
                        if (Number.isFinite(v)) st.updateNode(single.id, { [k]: k === 'w' || k === 'h' ? Math.max(10, v) : v })
                      }}
                    />
                  </label>
                ))}
              </div>
            </Row>
          )}
        </>
      )}

      {edges.length > 0 && (
        <>
          <h3>{edges.length === 1 ? 'Conector' : `${edges.length} conectores`}</h3>
          <Row label="Cor">
            <Swatches value={common(edges.map((e) => e.style.stroke)) ?? ''} onPick={(c) => st.updateEdgeStyle(edges.map((e) => e.id), { stroke: c })} colors={['#495057', '#212529', '#adb5bd', '#e03131', '#f08c00', '#2f9e44', '#1971c2', '#6741d9']} />
          </Row>
          <Row label="Espessura">
            <input type="range" min={1} max={8} value={common(edges.map((e) => e.style.strokeWidth)) ?? 2} onChange={(ev) => st.updateEdgeStyle(edges.map((e) => e.id), { strokeWidth: +ev.target.value })} />
            <label className="check">
              <input type="checkbox" checked={!!common(edges.map((e) => e.style.dashed))} onChange={(ev) => st.updateEdgeStyle(edges.map((e) => e.id), { dashed: ev.target.checked })} /> tracejada
            </label>
          </Row>
          <Row label="Traçado">
            <Seg<Routing>
              value={common(edges.map((e) => e.style.routing))}
              options={[
                ['orthogonal', 'Cotovelo'],
                ['straight', 'Reta'],
                ['curved', 'Curva'],
              ]}
              onPick={(v) => st.updateEdgeStyle(edges.map((e) => e.id), { routing: v })}
            />
          </Row>
          <Row label="Início">
            <Seg<ArrowHead> value={common(edges.map((e) => e.style.startArrow))} options={ARROWS} onPick={(v) => st.updateEdgeStyle(edges.map((e) => e.id), { startArrow: v })} />
          </Row>
          <Row label="Fim">
            <Seg<ArrowHead> value={common(edges.map((e) => e.style.endArrow))} options={ARROWS} onPick={(v) => st.updateEdgeStyle(edges.map((e) => e.id), { endArrow: v })} />
          </Row>
          {edges.length === 1 && (
            <Row label="Rótulo">
              <CommitInput placeholder="Ex.: Sim / Não" value={edges[0].label} onCommit={(v) => st.updateEdge(edges[0].id, { label: v })} />
            </Row>
          )}
          <button
            className="btn"
            onClick={() =>
              st.commit((d) => {
                const s = new Set(edges.map((e) => e.id))
                return { ...d, edges: d.edges.map((e) => (s.has(e.id) ? { ...e, from: e.to, to: e.from } : e)) }
              })
            }
          >
            Inverter sentido
          </button>
        </>
      )}

      {nodes.length > 1 && (
        <>
          <h3>Alinhar</h3>
          <div className="icon-row">
            {(['left', 'hcenter', 'right', 'top', 'vcenter', 'bottom'] as AlignMode[]).map((m) => (
              <button key={m} className="icon-btn" title={`Alinhar: ${m}`} onClick={() => st.align(m)}>
                <Icon name={`align-${m}`} />
              </button>
            ))}
            <button className="icon-btn" title="Distribuir na horizontal" disabled={nodes.length < 3} onClick={() => st.distribute('h')}>
              <Icon name="dist-h" />
            </button>
            <button className="icon-btn" title="Distribuir na vertical" disabled={nodes.length < 3} onClick={() => st.distribute('v')}>
              <Icon name="dist-v" />
            </button>
          </div>
        </>
      )}

      <h3>Ações</h3>
      <div className="icon-row">
        <button className="icon-btn" title="Trazer para frente" onClick={st.toFront}>
          <Icon name="front" />
        </button>
        <button className="icon-btn" title="Enviar para trás" onClick={st.toBack}>
          <Icon name="back" />
        </button>
        <button className="icon-btn" title="Duplicar (Ctrl+D)" onClick={st.duplicate}>
          <Icon name="copy" />
        </button>
        <button className="icon-btn danger" title="Excluir (Del)" onClick={st.deleteSelection} data-testid="delete-selection">
          <Icon name="trash" />
        </button>
      </div>
    </aside>
  )
}
