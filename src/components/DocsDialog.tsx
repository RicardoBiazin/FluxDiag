import { useRef, useState } from 'react'
import { useStore } from '../store'
import { deleteDoc, listDocs, loadDoc, saveDoc } from '../lib/storage'
import { TEMPLATES } from '../lib/templates'
import { uid, validateDiagram } from '../lib/model'

function when(ts: number) {
  return new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

/** Abrir/criar diagramas guardados no navegador e importar arquivos. */
export default function DocsDialog({ onClose }: { onClose: () => void }) {
  const docId = useStore((s) => s.docId)
  const [docs, setDocs] = useState(listDocs)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const open = (id: string) => {
    const st = useStore.getState()
    saveDoc(st.docId, st.doc)
    const d = loadDoc(id)
    if (!d) return setError('Não foi possível abrir este diagrama.')
    st.loadDocument(id, d)
    onClose()
  }

  const create = (tplId: string) => {
    const st = useStore.getState()
    saveDoc(st.docId, st.doc)
    const tpl = TEMPLATES.find((t) => t.id === tplId)!
    const d = tpl.build()
    const id = uid('d')
    saveDoc(id, d)
    st.loadDocument(id, d)
    onClose()
  }

  const importFile = async (file: File) => {
    try {
      const d = validateDiagram(JSON.parse(await file.text()))
      const st = useStore.getState()
      saveDoc(st.docId, st.doc)
      const id = uid('d')
      saveDoc(id, d)
      st.loadDocument(id, d)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Arquivo inválido')
    }
  }

  return (
    <div className="modal-back" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Diagramas" data-testid="docs-dialog">
        <div className="panel-head">
          <h2>Diagramas</h2>
          <button className="icon-btn" onClick={onClose} title="Fechar">
            ×
          </button>
        </div>
        <h3>Novo</h3>
        <div className="tpl-grid">
          {TEMPLATES.map((t) => (
            <button key={t.id} className="tpl" onClick={() => create(t.id)} data-testid={`tpl-${t.id}`}>
              <b>{t.name}</b>
              <span>{t.description}</span>
            </button>
          ))}
          <button className="tpl" onClick={() => fileRef.current?.click()}>
            <b>Importar arquivo…</b>
            <span>.fluxdiag.json exportado antes</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importFile(f)
              e.target.value = ''
            }}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <h3>Salvos neste navegador</h3>
        {!docs.length && <p className="muted">Nenhum diagrama salvo ainda.</p>}
        <ul className="doc-list">
          {docs.map((m) => (
            <li key={m.id} className={m.id === docId ? 'current' : ''}>
              <button className="doc-open" onClick={() => open(m.id)}>
                <b>{m.name}</b>
                <span>{m.id === docId ? 'aberto agora' : when(m.updatedAt)}</span>
              </button>
              <button
                className="icon-btn danger"
                title="Excluir"
                disabled={m.id === docId}
                onClick={() => {
                  if (!confirm(`Excluir "${m.name}"? Não dá para desfazer.`)) return
                  deleteDoc(m.id)
                  setDocs(listDocs())
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <p className="muted small">Os diagramas ficam salvos só neste navegador. Use Exportar → JSON para guardar uma cópia ou levar para outro computador.</p>
      </div>
    </div>
  )
}
