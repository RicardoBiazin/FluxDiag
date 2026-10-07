import type { Diagram, DiagramNode, ShapeKind } from './types'
import { emptyDiagram, makeEdge, makeNode, STICKY_COLORS, syncSlides } from './model'

function node(kind: ShapeKind, x: number, y: number, text: string, w?: number, h?: number): DiagramNode {
  return makeNode(kind, x, y, w, h, text)
}

/** Diagrama de exemplo: três frames que já viram uma apresentação. */
export function exampleDiagram(): Diagram {
  const d = emptyDiagram('Exemplo — Fluxo de atendimento')

  const f1 = node('frame', 0, 0, 'Capa', 960, 540)
  f1.notes = 'Apresente o objetivo: padronizar o atendimento do primeiro contato até a solução.'
  const title = node('text', 80, 170, 'Fluxo de atendimento', 800, 90)
  title.style = { ...title.style, fontSize: 56, bold: true, textColor: '#1971c2' }
  const sub = node('text', 80, 280, 'Do primeiro contato à solução — feito no FluxDiag', 800, 50)
  sub.style = { ...sub.style, fontSize: 24, textColor: '#495057' }

  const f2 = node('frame', 1060, 0, 'Fluxo', 960, 540)
  f2.notes = 'Percorra o fluxo: triagem decide se resolve na hora ou abre chamado.'
  const ox = 1060
  const start = node('terminator', ox + 60, 60, 'Cliente entra em contato', 180, 70)
  const tri = node('rounded', ox + 60, 200, 'Triagem', 180, 80)
  const dec = node('diamond', ox + 330, 185, 'Resolve na hora?', 180, 110)
  const solve = node('rounded', ox + 620, 200, 'Orientar o cliente', 180, 80)
  const ticket = node('document', ox + 330, 380, 'Abrir chamado', 180, 90)
  const db = node('cylinder', ox + 620, 370, 'Base de chamados', 160, 110)
  const end = node('terminator', ox + 620, 60, 'Fim', 180, 70)

  const f3 = node('frame', 2120, 0, 'Próximos passos', 960, 540)
  f3.notes = 'Peça para o time votar nas prioridades.'
  const head = node('text', 2120 + 60, 40, 'Próximos passos', 840, 60)
  head.style = { ...head.style, fontSize: 36, bold: true, align: 'left' }
  const notes = ['Treinar a equipe de triagem', 'Medir o tempo até a solução', 'Revisar o fluxo em 30 dias']
  const stickies = notes.map((t, i) => {
    const s = node('sticky', 2120 + 80 + i * 280, 170, t, 220, 220)
    s.style = { ...s.style, fill: STICKY_COLORS[i] }
    return s
  })

  d.nodes = [f1, f2, f3, title, sub, start, tri, dec, solve, ticket, db, end, head, ...stickies]
  const sim = makeEdge({ nodeId: dec.id }, { nodeId: solve.id }, 'Sim')
  const nao = makeEdge({ nodeId: dec.id, side: 'bottom' }, { nodeId: ticket.id, side: 'top' }, 'Não')
  const reg = makeEdge({ nodeId: ticket.id }, { nodeId: db.id })
  reg.style = { ...reg.style, dashed: true, routing: 'curved' }
  d.edges = [
    makeEdge({ nodeId: start.id }, { nodeId: tri.id }),
    makeEdge({ nodeId: tri.id }, { nodeId: dec.id }),
    sim,
    nao,
    makeEdge({ nodeId: solve.id }, { nodeId: end.id }),
    reg,
  ]
  return syncSlides(d)
}

export interface Template {
  id: string
  name: string
  description: string
  build: () => Diagram
}

export const TEMPLATES: Template[] = [
  { id: 'blank', name: 'Em branco', description: 'Quadro vazio', build: () => emptyDiagram() },
  {
    id: 'example',
    name: 'Fluxo de atendimento',
    description: 'Fluxograma com 3 frames prontos para apresentar',
    build: exampleDiagram,
  },
  {
    id: 'slides',
    name: 'Apresentação vazia',
    description: '4 frames 16:9 lado a lado',
    build: () => {
      const d = emptyDiagram('Apresentação')
      d.nodes = [0, 1, 2, 3].map((i) => node('frame', i * 1060, 0, `Slide ${i + 1}`, 960, 540))
      return syncSlides(d)
    },
  },
]
