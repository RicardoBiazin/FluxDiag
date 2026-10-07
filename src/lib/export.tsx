import { renderToStaticMarkup } from 'react-dom/server'
import type { Diagram, Rect } from './types'
import { diagramBounds } from './model'
import { nodeRect } from './geometry'
import { StaticDiagram, SvgDefs } from '../components/Graphics'

export function diagramToSvg(doc: Diagram, area?: Rect, background = '#ffffff'): string | null {
  const b = area ?? diagramBounds(doc)
  if (!b) return null
  const pad = area ? 0 : 30
  const r = { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 }
  const markup = renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${r.x} ${r.y} ${r.w} ${r.h}`}
      width={Math.round(r.w)}
      height={Math.round(r.h)}
    >
      <SvgDefs />
      {background !== 'none' && <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={background} />}
      <StaticDiagram doc={doc} showFrameTitles={!area} />
    </svg>,
  )
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + markup
}

export function safeFileName(name: string): string {
  return (name || 'diagrama').replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 80) || 'diagrama'
}

export function download(filename: string, data: Blob) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function exportJson(doc: Diagram) {
  download(`${safeFileName(doc.name)}.fluxdiag.json`, new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }))
}

export function exportSvg(doc: Diagram): boolean {
  const svg = diagramToSvg(doc)
  if (!svg) return false
  download(`${safeFileName(doc.name)}.svg`, new Blob([svg], { type: 'image/svg+xml' }))
  return true
}

export function svgToPngBlob(svg: string, w: number, h: number, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const max = 16000
      const k = Math.min(scale, max / w, max / h)
      canvas.width = Math.max(1, Math.round(w * k))
      canvas.height = Math.max(1, Math.round(h * k))
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar PNG'))), 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Falha ao desenhar o SVG'))
    }
    img.src = url
  })
}

export async function exportPng(doc: Diagram): Promise<boolean> {
  const b = diagramBounds(doc)
  const svg = diagramToSvg(doc)
  if (!b || !svg) return false
  const blob = await svgToPngBlob(svg, b.w + 60, b.h + 60)
  download(`${safeFileName(doc.name)}.png`, blob)
  return true
}

/** Abre a janela de impressão com um slide (frame) por página — "Salvar como PDF". */
export function printSlides(doc: Diagram): boolean {
  const frames = doc.slides.map((id) => doc.nodes.find((n) => n.id === id)).filter(Boolean)
  const areas: Rect[] = frames.length ? frames.map((f) => nodeRect(f!)) : []
  if (!areas.length) {
    const b = diagramBounds(doc)
    if (!b) return false
    areas.push({ x: b.x - 30, y: b.y - 30, w: b.w + 60, h: b.h + 60 })
  }
  const pages = areas
    .map((r) => `<section class="page">${diagramToSvg(doc, r)!.replace(/^<\?xml[^>]*>\s*/, '')}</section>`)
    .join('')
  const landscape = areas[0].w >= areas[0].h
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(doc.name)}</title>
<style>
@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
.page { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; page-break-after: always; break-after: page; overflow: hidden; }
.page:last-child { page-break-after: auto; break-after: auto; }
.page svg { width: 96%; height: 96%; }
</style></head><body>${pages}</body></html>`
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)
  const w = iframe.contentWindow!
  w.document.open()
  w.document.write(html)
  w.document.close()
  setTimeout(() => {
    w.focus()
    w.print()
    setTimeout(() => iframe.remove(), 1000)
  }, 300)
  return true
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}
