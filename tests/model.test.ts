import { describe, expect, it } from 'vitest'
import { cloneItems, emptyDiagram, makeEdge, makeNode, moveNodes, nodesInsideFrames, removeItems, sortNodes, syncSlides, validateDiagram } from '../src/lib/model'
import { exampleDiagram, TEMPLATES } from '../src/lib/templates'

describe('modelo', () => {
  it('excluir forma remove conectores ligados', () => {
    const d = emptyDiagram()
    const a = makeNode('rect', 0, 0)
    const b = makeNode('rect', 300, 0)
    d.nodes = [a, b]
    d.edges = [makeEdge({ nodeId: a.id }, { nodeId: b.id })]
    const out = removeItems(d, new Set([a.id]))
    expect(out.nodes.map((n) => n.id)).toEqual([b.id])
    expect(out.edges).toHaveLength(0)
  })
  it('frames ficam atrás e slides acompanham', () => {
    const d = emptyDiagram()
    const n = makeNode('rect', 0, 0)
    const f = makeNode('frame', 0, 0)
    d.nodes = sortNodes([n, f])
    expect(d.nodes[0].id).toBe(f.id)
    const s = syncSlides(d)
    expect(s.slides).toEqual([f.id])
    expect(removeItems(s, new Set([f.id])).slides).toEqual([])
  })
  it('formas dentro do frame vão junto', () => {
    const d = emptyDiagram()
    const f = makeNode('frame', 0, 0, 500, 300)
    const inside = makeNode('rect', 10, 10)
    const outside = makeNode('rect', 600, 10)
    d.nodes = [f, inside, outside]
    expect(nodesInsideFrames(d, [f.id])).toEqual([inside.id])
  })
  it('mover desloca pontas soltas de conectores selecionados', () => {
    const d = emptyDiagram()
    const e = makeEdge({ x: 0, y: 0 }, { x: 10, y: 10 })
    d.edges = [e]
    const out = moveNodes(d, new Set([e.id]), 5, 5)
    expect(out.edges[0].from).toEqual({ x: 5, y: 5 })
  })
  it('clonar preserva ligações internas e descarta externas', () => {
    const a = makeNode('rect', 0, 0)
    const b = makeNode('rect', 300, 0)
    const c = makeNode('rect', 600, 0)
    const ab = makeEdge({ nodeId: a.id }, { nodeId: b.id })
    const bc = makeEdge({ nodeId: b.id }, { nodeId: c.id })
    const { nodes, edges } = cloneItems([a, b], [ab, bc], 20, 20)
    expect(nodes).toHaveLength(2)
    expect(edges).toHaveLength(1)
    expect(edges[0].from.nodeId).toBe(nodes[0].id)
    expect(edges[0].to.nodeId).toBe(nodes[1].id)
    expect(nodes[0].x).toBe(20)
  })
  it('validateDiagram aceita a exportação e rejeita lixo', () => {
    const ex = exampleDiagram()
    const back = validateDiagram(JSON.parse(JSON.stringify(ex)))
    expect(back.nodes).toHaveLength(ex.nodes.length)
    expect(back.edges).toHaveLength(ex.edges.length)
    expect(back.slides).toEqual(ex.slides)
    expect(() => validateDiagram({ foo: 1 })).toThrow()
    expect(() => validateDiagram(null)).toThrow()
  })
  it('validateDiagram descarta conector para nó inexistente e completa estilo', () => {
    const d = validateDiagram({
      nodes: [{ id: 'a', kind: 'rect', x: 0, y: 0, w: 10, h: 10, text: 'x' }],
      edges: [
        { id: 'e1', from: { nodeId: 'a' }, to: { nodeId: 'zz' } },
        { id: 'e2', from: { nodeId: 'a' }, to: { x: 5, y: 5 } },
      ],
    })
    expect(d.edges.map((e) => e.id)).toEqual(['e2'])
    expect(d.nodes[0].style.fill).toBeDefined()
    expect(d.edges[0].style.routing).toBe('orthogonal')
  })
  it('modelos geram diagramas válidos', () => {
    for (const t of TEMPLATES) {
      const d = t.build()
      expect(validateDiagram(JSON.parse(JSON.stringify(d))).nodes.length).toBe(d.nodes.length)
    }
    expect(exampleDiagram().slides).toHaveLength(3)
  })
})
