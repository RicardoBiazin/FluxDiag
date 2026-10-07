# FluxDiag

Editor web de **diagramas e fluxogramas** em quadro infinito (no estilo Miro / Lucid / FigJam), com
**modo apresentação**: os *frames* do quadro viram slides, com transição de câmera entre eles.

Roda 100% no navegador — sem servidor, sem conta. Os diagramas ficam salvos no próprio navegador
(localStorage) e podem ser exportados/importados em arquivo.

## Recursos

- **Quadro infinito**: rolar move, Ctrl + rolar (ou pinça) dá zoom, espaço + arrastar, grade com encaixe.
- **Formas de fluxograma**: processo, decisão, início/fim, entrada/saída, documento, banco de dados,
  preparação, elipse, triângulo, nota adesiva e texto livre.
- **Conectores** ligados às formas (acompanham ao mover): cotovelo, reta ou curva; setas configuráveis
  nas duas pontas; rótulo ("Sim" / "Não"); tracejado.
  - Passe o mouse numa forma e **arraste o ponto azul** até outra forma.
  - **Clique** no ponto azul para criar a próxima etapa já conectada.
- Edição de texto com duplo clique, cores, bordas, fonte, alinhamento, posição/tamanho exatos.
- Seleção múltipla (Shift / seleção por área), alinhar e distribuir, trazer para frente / enviar para trás.
- Desfazer/refazer, copiar/colar/duplicar; colar texto de fora vira nota adesiva.
- **Frames** (16:9, 4:3, 1:1, A4) com título e **anotações do apresentador**; mover o frame leva o conteúdo.
- **Apresentação** em tela cheia: ← → navegam, N mostra as anotações, Esc sai. Sem frames, o
  diagrama inteiro vira um slide.
- **Exportar**: PNG, SVG, slides em PDF (pela janela de impressão) e arquivo `.fluxdiag.json`.
- Vários diagramas guardados no navegador, modelos prontos, tema claro/escuro.

## Rodar

Requer Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5180
npm run build      # gera dist/ (site estático)
npm run preview    # serve o dist/ em http://localhost:5181
```

## Testes

```bash
npm test           # unitários (vitest): geometria, modelo, store
npm run test:e2e   # ponta a ponta (Playwright, Chromium): desenhar, conectar, salvar, apresentar, exportar
```

## Estrutura

```
src/
  lib/types.ts        modelo de dados (formas, conectores, diagrama)
  lib/geometry.ts     câmera, contornos das formas, rotas dos conectores, redimensionamento
  lib/model.ts        operações puras sobre o diagrama (criar, remover, clonar, validar import)
  lib/storage.ts      persistência no localStorage
  lib/export.tsx      SVG / PNG / JSON / PDF
  lib/templates.ts    modelos (exemplo de fluxo com 3 slides)
  store.ts            estado (zustand) com histórico de desfazer
  components/         Canvas, Toolbar, Properties, SlidesPanel, Presenter, ...
```

## Atalhos

| Tecla | Ação |
|---|---|
| V / H | Selecionar / mover quadro |
| R, O, D | Retângulo, elipse, decisão |
| S, T | Nota adesiva, texto |
| L | Conector |
| F | Frame (slide) |
| Enter / duplo clique | Editar texto |
| Shift+1 / Shift+2 | Ver tudo / zoom na seleção |
| Ctrl+Z / Ctrl+Y | Desfazer / refazer |
| Ctrl+C / X / V / D | Copiar, recortar, colar, duplicar |
| Setas (+Shift) | Mover 1 px (10 px) |
| F5 | Apresentar |
| ? | Lista de atalhos |
