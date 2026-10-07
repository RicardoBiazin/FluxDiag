import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import Canvas from './components/Canvas'
import Toolbar, { TOOL_KEYS } from './components/Toolbar'
import Properties from './components/Properties'
import SlidesPanel from './components/SlidesPanel'
import Presenter from './components/Presenter'
import DocsDialog from './components/DocsDialog'
import { Icon } from './components/Icons'
import CommitInput from './components/CommitInput'
import { currentDocId, getPref, loadDoc, saveDoc, setPref } from './lib/storage'
import { exampleDiagram } from './lib/templates'
import { makeNode, uid } from './lib/model'
import { exportJson, exportPng, exportSvg, printSlides } from './lib/export'

declare const __APP_VERSION__: string
export const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

const CLIP_MARK = '⁣fluxdiag-clipboard'

const SHORTCUTS: [string, string][] = [
  ['V / H', 'Selecionar / mover quadro'],
  ['R O D', 'Retângulo, elipse, decisão'],
  ['S / T', 'Nota adesiva / texto'],
  ['L', 'Conector'],
  ['F', 'Frame (slide)'],
  ['Duplo clique', 'Editar texto · no vazio cria texto'],
  ['Enter', 'Editar texto da seleção'],
  ['Ctrl+Enter / Esc', 'Concluir edição'],
  ['Botão direito + arrastar', 'Mover o quadro'],
  ['Espaço + arrastar', 'Mover o quadro'],
  ['Ctrl + rolar', 'Zoom'],
  ['Shift+1', 'Ver tudo'],
  ['Shift+2', 'Zoom na seleção'],
  ['Ctrl+0', 'Zoom 100%'],
  ['Ctrl+Z / Ctrl+Y', 'Desfazer / refazer'],
  ['Ctrl+C / X / V / D', 'Copiar, recortar, colar, duplicar'],
  ['Ctrl+A', 'Selecionar tudo'],
  ['Setas (Shift)', 'Mover 1 px (10 px)'],
  ['Del', 'Excluir'],
  ['F5 / Ctrl+Shift+Enter', 'Apresentar'],
  ['Ctrl+S', 'Exportar JSON'],
]

function isField(t: EventTarget | null) {
  return t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
}

export default function App() {
  const doc = useStore((s) => s.doc)
  const docId = useStore((s) => s.docId)
  const presenting = useStore((s) => s.presenting)
  const camera = useStore((s) => s.camera)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const snapOn = useStore((s) => s.snapToGrid)
  const gridOn = useStore((s) => s.showGrid)
  const gridType = useStore((s) => s.gridType)
  const [showSlides, setShowSlides] = useState(() => getPref('slides', '1') === '1')
  const [showDocs, setShowDocs] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [theme, setTheme] = useState(() => getPref('theme', matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [toast, setToast] = useState('')
  const [saved, setSaved] = useState(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const st = useStore.getState()

  const notify = (msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2600)
  }

  // Carrega o último diagrama aberto (ou o exemplo na primeira vez).
  useEffect(() => {
    const id = currentDocId()
    const d = id ? loadDoc(id) : null
    if (id && d) st.loadDocument(id, d)
    else {
      const nid = uid('d')
      const ex = exampleDiagram()
      saveDoc(nid, ex)
      st.loadDocument(nid, ex)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Salvamento automático.
  useEffect(() => {
    setSaved(false)
    const t = setTimeout(() => {
      if (!saveDoc(docId, doc)) notify('Não foi possível salvar no navegador (armazenamento cheio?). Exporte em JSON.')
      setSaved(true)
    }, 500)
    return () => clearTimeout(t)
  }, [doc, docId])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    setPref('theme', theme)
  }, [theme])

  useEffect(() => setPref('slides', showSlides ? '1' : '0'), [showSlides])

  useEffect(() => {
    document.title = `${doc.name} — FluxDiag`
  }, [doc.name])

  const present = () => {
    st.startPresentation(0)
  }

  // Atalhos de teclado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState()
      if (s.presenting !== null) return
      if (isField(e.target)) return
      const mod = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()
      if (e.key === 'F5' || (mod && e.shiftKey && e.key === 'Enter')) {
        e.preventDefault()
        return present()
      }
      if (mod) {
        if (k === 'z' && !e.shiftKey) s.undo()
        else if (k === 'y' || (k === 'z' && e.shiftKey)) s.redo()
        else if (k === 'd') s.duplicate()
        else if (k === 'a') s.selectAll()
        else if (k === 's') exportJson(s.doc)
        else if (k === '0') s.setCamera({ ...s.camera, ...zoomCenter(1) })
        else if (k === '=' || k === '+') s.zoomBy(1.2)
        else if (k === '-') s.zoomBy(1 / 1.2)
        else return
        e.preventDefault()
        return
      }
      if (e.shiftKey && (e.code === 'Digit1' || e.key === '!')) {
        e.preventDefault()
        return s.zoomToFit()
      }
      if (e.shiftKey && (e.code === 'Digit2' || e.key === '@')) {
        e.preventDefault()
        if (s.selection.length) s.zoomToRect(s.selection)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        return s.deleteSelection()
      }
      if (e.key === 'Escape') {
        s.select([])
        s.setTool('select')
        setShowExport(false)
        return
      }
      if (e.key === 'Enter' && s.selection.length === 1) {
        e.preventDefault()
        return s.setEditing(s.selection[0])
      }
      if (e.key.startsWith('Arrow') && s.selection.length) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        return s.nudge(dx, dy)
      }
      if (!e.altKey && !e.shiftKey && TOOL_KEYS[k]) {
        s.setTool(TOOL_KEYS[k])
        return
      }
      if (e.key === '?') setShowHelp((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Copiar/colar pelos eventos do navegador: a área de transferência do sistema recebe um
  // marcador, assim um texto copiado de outro programa depois tem prioridade e vira nota.
  useEffect(() => {
    const onCopy = (e: ClipboardEvent, cut: boolean) => {
      if (isField(e.target)) return
      const s = useStore.getState()
      if (!s.selection.length) return
      if (cut) s.cut()
      else s.copy()
      e.clipboardData?.setData('text/plain', CLIP_MARK)
      e.preventDefault()
    }
    const copy = (e: ClipboardEvent) => onCopy(e, false)
    const cut = (e: ClipboardEvent) => onCopy(e, true)
    const onPaste = (e: ClipboardEvent) => {
      if (isField(e.target)) return
      const s = useStore.getState()
      const text = e.clipboardData?.getData('text/plain')?.trim() ?? ''
      e.preventDefault()
      if (!text || text === CLIP_MARK) return s.paste()
      const { w, h } = s.viewport
      const c = { x: (w / 2 - s.camera.x) / s.camera.zoom, y: (h / 2 - s.camera.y) / s.camera.zoom }
      s.addNode(makeNode('sticky', Math.round(c.x - 90), Math.round(c.y - 90), undefined, undefined, text.slice(0, 2000)))
    }
    // Botões não guardam o foco (Espaço/Enter não podem "clicar" de novo no último botão).
    const blurButton = () => {
      const a = document.activeElement
      if (a instanceof HTMLButtonElement) a.blur()
    }
    window.addEventListener('copy', copy)
    window.addEventListener('cut', cut)
    window.addEventListener('paste', onPaste)
    window.addEventListener('pointerup', blurButton)
    return () => {
      window.removeEventListener('copy', copy)
      window.removeEventListener('cut', cut)
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('pointerup', blurButton)
    }
  }, [])

  function zoomCenter(z: number) {
    const s = useStore.getState()
    const { w, h } = s.viewport
    const c = { x: (w / 2 - s.camera.x) / s.camera.zoom, y: (h / 2 - s.camera.y) / s.camera.zoom }
    return { zoom: z, x: w / 2 - c.x * z, y: h / 2 - c.y * z }
  }

  const doExport = async (kind: 'png' | 'svg' | 'json' | 'pdf') => {
    setShowExport(false)
    try {
      let ok = true
      if (kind === 'png') ok = await exportPng(doc)
      else if (kind === 'svg') ok = exportSvg(doc)
      else if (kind === 'json') exportJson(doc)
      else ok = printSlides(doc)
      if (!ok) notify('O diagrama está vazio.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Falha na exportação')
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="icon-btn" onClick={() => setShowDocs(true)} title="Diagramas" data-testid="open-docs">
          <Icon name="menu" />
        </button>
        <div className="brand" title={`FluxDiag v${VERSION}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
            <rect x="2" y="3" width="8" height="6" rx="1.5" fill="var(--accent)" />
            <path d="M18 9l4 4-4 4-4-4z" fill="#f08c00" />
            <rect x="2" y="15" width="8" height="6" rx="3" fill="#2f9e44" />
            <path d="M6 9v6M10 6h4l4 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span>FluxDiag</span>
        </div>
        <CommitInput className="doc-name" value={doc.name} onCommit={st.rename} ariaLabel="Nome do diagrama" />
        <span className="save-state" title="Salvo automaticamente neste navegador">
          {saved ? 'Salvo' : 'Salvando…'}
        </span>
        <div className="spacer" />
        <button className="icon-btn" onClick={st.undo} disabled={!canUndo} title="Desfazer (Ctrl+Z)" data-testid="undo">
          <Icon name="undo" />
        </button>
        <button className="icon-btn" onClick={st.redo} disabled={!canRedo} title="Refazer (Ctrl+Y)" data-testid="redo">
          <Icon name="redo" />
        </button>
        <div className="menu-wrap">
          <button className="btn" onClick={() => setShowExport((v) => !v)} data-testid="export">
            <Icon name="download" size={18} /> Exportar
          </button>
          {showExport && (
            <div className="menu" onPointerLeave={() => setShowExport(false)}>
              <button onClick={() => doExport('png')}>Imagem PNG</button>
              <button onClick={() => doExport('svg')}>Vetor SVG</button>
              <button onClick={() => doExport('pdf')}>Slides em PDF (imprimir)</button>
              <button onClick={() => doExport('json')} data-testid="export-json">
                Arquivo FluxDiag (.json)
              </button>
            </div>
          )}
        </div>
        <button className={`btn${showSlides ? ' on' : ''}`} onClick={() => setShowSlides((v) => !v)} title="Painel de slides" data-testid="toggle-slides">
          <Icon name="slides" size={18} /> Slides
        </button>
        <button className="btn primary" onClick={present} title="Apresentar (F5)" data-testid="present">
          <Icon name="play" size={16} /> Apresentar
        </button>
        <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Tema claro/escuro">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <button className="icon-btn" onClick={() => setShowHelp(true)} title="Atalhos (?)">
          <Icon name="help" />
        </button>
      </header>

      <main className="workspace">
        <Toolbar />
        <Canvas />
        <div className="zoombar">
          <button className="icon-btn" onClick={() => st.zoomBy(1 / 1.2)} title="Diminuir zoom (Ctrl -)">
            <Icon name="minus" size={18} />
          </button>
          <button className="zoom-val" onClick={() => st.setCamera(zoomCenter(1))} title="Zoom 100% (Ctrl+0)" data-testid="zoom-value">
            {Math.round(camera.zoom * 100)}%
          </button>
          <button className="icon-btn" onClick={() => st.zoomBy(1.2)} title="Aumentar zoom (Ctrl +)">
            <Icon name="plus" size={18} />
          </button>
          <button className="icon-btn" onClick={st.zoomToFit} title="Ver tudo (Shift+1)">
            <Icon name="fit" size={18} />
          </button>
          <span className="sep-v" />
          <button className={`icon-btn${gridOn ? ' on' : ''}`} onClick={st.cycleGrid} title={`Grade: ${!gridOn ? 'desligada' : gridType === 'iso' ? 'isométrica' : 'pontos'} (clique para alternar)`} data-testid="grid-toggle">
            <Icon name={gridType === 'iso' && gridOn ? 'grid-iso' : 'grid'} size={18} />
          </button>
          <button className={`icon-btn${snapOn ? ' on' : ''}`} onClick={st.toggleSnap} title="Encaixar na grade">
            <Icon name="magnet" size={18} />
          </button>
        </div>
        <div className="side">
          {showSlides && <SlidesPanel onClose={() => setShowSlides(false)} />}
          <Properties />
        </div>
      </main>

      {presenting !== null && <Presenter />}
      {showDocs && <DocsDialog onClose={() => setShowDocs(false)} />}
      {showHelp && (
        <div className="modal-back" onPointerDown={(e) => e.target === e.currentTarget && setShowHelp(false)}>
          <div className="modal" role="dialog" aria-label="Atalhos">
            <div className="panel-head">
              <h2>Atalhos</h2>
              <button className="icon-btn" onClick={() => setShowHelp(false)}>
                ×
              </button>
            </div>
            <table className="shortcuts">
              <tbody>
                {SHORTCUTS.map(([k, v]) => (
                  <tr key={k}>
                    <td>
                      <kbd>{k}</kbd>
                    </td>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted small">FluxDiag v{VERSION}</p>
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
