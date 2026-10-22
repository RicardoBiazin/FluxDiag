# FluxDiag

Editor web de **diagramas e fluxogramas** em quadro infinito (no estilo Miro / Lucid / FigJam), com
**modo apresentação**: os *frames* do quadro viram slides, com transição de câmera entre eles.

Funciona **no navegador** e como **programa para Windows** (desktop). Sem servidor e sem conta: os
diagramas ficam salvos no próprio computador e podem ser exportados/importados em arquivo.

## Baixar (Windows)

Na página de [Releases](https://github.com/RicardoBiazin/FluxDiag/releases/latest):

- **`FluxDiag-Setup-x.y.z.exe`** — instalador (cria atalho no menu Iniciar; não pede administrador).
- **`FluxDiag-x.y.z-portatil.exe`** — versão portátil, roda sem instalar (bom para pendrive).

Os executáveis não são assinados digitalmente: na primeira vez o Windows SmartScreen pode avisar —
clique em *Mais informações → Executar assim mesmo*.

## Recursos

- **Quadro infinito**: arrastar com o **botão direito** (ou do meio, ou espaço + arrastar) move o quadro;
  rolar move, Ctrl + rolar (ou pinça) dá zoom; grade de pontos ou **isométrica**, com encaixe.
- **Formas de fluxograma**: processo, decisão, início/fim, entrada/saída, documento, banco de dados,
  preparação, elipse, triângulo, nota adesiva e texto livre.
- **Sólidos isométricos 3D**: cubo, cilindro e pirâmide com faces sombreadas automaticamente a partir
  da cor escolhida (botão **3D** da barra da esquerda, atalho K; o botão **Mais**, atalho M, traz as outras formas); combinam com a grade isométrica.
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

## Usar a versão web localmente

Com o código baixado, dê dois cliques em **`FluxDiag.bat`**. Na primeira vez ele instala as dependências; depois gera o
site, sobe em http://127.0.0.1:5181 e abre o navegador. Fechar a janela preta encerra. Se já estiver
rodando, ele só abre o navegador.

## Desenvolvimento

Requer Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5180
npm run build      # gera dist/ (site estático)
npm run preview    # serve o dist/ em http://localhost:5181
npm run desktop    # abre a versão desktop (Electron) a partir do código
npm run dist:win   # gera o instalador e o portátil em release/
npm run release    # testa tudo, empacota, testa o .exe e publica a Release vX.Y.Z no GitHub
npm run release -- --verificar   # só confere a versão e mostra o texto da Release
```

## Testes

```bash
npm test           # unitários (vitest): geometria, modelo, store
npm run test:e2e   # ponta a ponta (Playwright, Chromium): desenhar, conectar, salvar, apresentar, exportar
npm run test:desktop                                   # mesma ideia, dirigindo a janela do Electron
FLUXDIAG_EXE=release/win-unpacked/FluxDiag.exe npx playwright test -c playwright.desktop.config.ts
                                                       # testa o executável já empacotado
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
electron/main.cjs     janela desktop (carrega o mesmo dist/, links externos vão para o navegador)
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

## Publicar uma versão

1. Suba a versão no `package.json` e escreva a seção dela no [CHANGELOG.md](CHANGELOG.md).
2. Faça o commit.
3. Rode `npm run release`: ele recusa árvore suja ou versão já publicada, roda os testes web e
   desktop, gera os `.exe`, cria a tag `vX.Y.Z` e publica a Release com o texto do CHANGELOG.

## Licença

[MIT](LICENSE) © 2026 Ricardo Biazin
