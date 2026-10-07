import { describe, expect, it } from 'vitest'
import { autoSide, edgeGeometry, fitRect, nearestSide, orthogonal, resizeRect, screenToWorld, worldToScreen, zoomAt } from '../src/lib/geometry'
import { makeEdge, makeNode } from '../src/lib/model'
import { wrapText } from '../src/lib/text'

describe('câmera', () => {
  it('ida e volta tela/mundo', () => {
    const cam = { x: 120, y: -40, zoom: 1.7 }
    const p = { x: 33, y: 77 }
    const back = worldToScreen(screenToWorld(p, cam), cam)
    expect(back.x).toBeCloseTo(33)
    expect(back.y).toBeCloseTo(77)
  })
  it('zoom mantém o ponto sob o cursor', () => {
    const cam = { x: 10, y: 20, zoom: 1 }
    const anchor = { x: 300, y: 200 }
    const before = screenToWorld(anchor, cam)
    const after = screenToWorld(anchor, zoomAt(cam, anchor, 2.5))
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })
  it('zoom respeita limites', () => {
    expect(zoomAt({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 }, 100).zoom).toBe(4)
    expect(zoomAt({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 }, 0.001).zoom).toBe(0.1)
  })
  it('fitRect centraliza o retângulo', () => {
    const cam = fitRect({ x: 100, y: 100, w: 200, h: 100 }, 1000, 800, 0, 10)
    const c = worldToScreen({ x: 200, y: 150 }, cam)
    expect(c.x).toBeCloseTo(500)
    expect(c.y).toBeCloseTo(400)
  })
})

describe('lados e conectores', () => {
  const r = { x: 0, y: 0, w: 100, h: 50 }
  it('autoSide escolhe o lado voltado ao alvo', () => {
    expect(autoSide(r, { x: 500, y: 25 })).toBe('right')
    expect(autoSide(r, { x: -500, y: 25 })).toBe('left')
    expect(autoSide(r, { x: 50, y: 400 })).toBe('bottom')
    expect(autoSide(r, { x: 50, y: -400 })).toBe('top')
  })
  it('nearestSide', () => {
    expect(nearestSide(r, { x: 98, y: 30 })).toBe('right')
    expect(nearestSide(r, { x: 50, y: 2 })).toBe('top')
  })
  it('rota ortogonal só tem segmentos horizontais/verticais', () => {
    const cases = [
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 200, y: 120 }, { x: -1, y: 0 }],
      [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 200, y: 120 }, { x: -1, y: 0 }],
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -200, y: 120 }, { x: 1, y: 0 }],
      [{ x: 0, y: 0 }, { x: 0, y: -1 }, { x: 50, y: 300 }, { x: 0, y: 1 }],
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -200, y: 120 }, { x: 0, y: -1 }],
    ] as const
    for (const [pa, da, pb, db] of cases) {
      const pts = orthogonal({ p: pa, dir: da }, { p: pb, dir: db })
      expect(pts[0]).toEqual(pa)
      expect(pts[pts.length - 1]).toEqual(pb)
      for (let i = 1; i < pts.length; i++) {
        const h = Math.abs(pts[i].y - pts[i - 1].y) < 1e-9
        const v = Math.abs(pts[i].x - pts[i - 1].x) < 1e-9
        expect(h || v).toBe(true)
      }
    }
  })
  it('conector ligado acompanha as formas', () => {
    const a = makeNode('rect', 0, 0, 100, 50)
    const b = makeNode('rect', 300, 0, 100, 50)
    const e = makeEdge({ nodeId: a.id }, { nodeId: b.id })
    const g = edgeGeometry(e, new Map([[a.id, a], [b.id, b]]))
    expect(g.start).toEqual({ x: 100, y: 25 })
    expect(g.end).toEqual({ x: 300, y: 25 })
    expect(g.endAngle).toBeCloseTo(0)
  })
  it('conector curvo, reto e cotovelo geram caminho', () => {
    const a = makeNode('rect', 0, 0, 100, 50)
    const e = makeEdge({ nodeId: a.id }, { x: 400, y: 300 })
    for (const routing of ['curved', 'straight', 'orthogonal'] as const) {
      e.style.routing = routing
      const g = edgeGeometry(e, new Map([[a.id, a]]))
      expect(g.d.startsWith('M')).toBe(true)
      expect(g.end).toEqual({ x: 400, y: 300 })
    }
  })
})

describe('redimensionar', () => {
  const r = { x: 10, y: 10, w: 100, h: 50 }
  it('alça sudeste', () => {
    expect(resizeRect(r, 'se', 20, 10)).toEqual({ x: 10, y: 10, w: 120, h: 60 })
  })
  it('alça noroeste move a origem', () => {
    expect(resizeRect(r, 'nw', 20, 10)).toEqual({ x: 30, y: 20, w: 80, h: 40 })
  })
  it('tamanho mínimo', () => {
    const out = resizeRect(r, 'w', 500, 0)
    expect(out.w).toBe(20)
    expect(out.x).toBe(90)
  })
  it('mantém proporção', () => {
    const out = resizeRect(r, 'se', 100, 0, 20, true)
    expect(out.w / out.h).toBeCloseTo(2)
  })
})

describe('quebra de texto', () => {
  it('quebra em linhas e respeita quebra manual', () => {
    const lines = wrapText('um dois três quatro cinco seis\nsete', 10, 60)
    expect(lines.length).toBeGreaterThan(2)
    expect(lines[lines.length - 1]).toBe('sete')
    for (const l of lines) expect(l.length * 5.5).toBeLessThanOrEqual(60 + 1e-9)
  })
  it('corta palavra gigante', () => {
    const lines = wrapText('a'.repeat(50), 10, 55)
    expect(lines.length).toBeGreaterThan(4)
  })
})

describe('isométrico', () => {
  it('cubo tem 3 faces visíveis, cilindro 3 e pirâmide 2', async () => {
    const { isoFaces } = await import('../src/lib/geometry')
    expect(isoFaces('isoCube', 140, 160)).toHaveLength(3)
    expect(isoFaces('isoCylinder', 120, 150)).toHaveLength(3)
    expect(isoFaces('isoPyramid', 140, 130)).toHaveLength(2)
    expect(isoFaces('rect', 100, 100)).toBeNull()
  })
  it('face de cima respeita 30° (largura/2 · tan 30°)', async () => {
    const { isoRise } = await import('../src/lib/geometry')
    expect(isoRise(200, 1000)).toBeCloseTo(100 * Math.tan(Math.PI / 6), 1)
    expect(isoRise(200, 50)).toBe(20) // limitado pela altura
  })
  it('shade clareia e escurece', async () => {
    const { shade } = await import('../src/lib/geometry')
    expect(shade('#808080', 1)).toBe('#808080')
    expect(shade('#808080', 0.5)).toBe('#404040')
    expect(parseInt(shade('#808080', 1.25).slice(1, 3), 16)).toBeGreaterThan(0x80)
    expect(shade('none', 0.5)).toBe('none')
  })
})
