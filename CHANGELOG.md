# Changelog

Formato: uma seção por versão. O `npm run release` usa a seção da versão do `package.json`
como texto da Release no GitHub.

## [0.4.1] - 2026-10-24

- electron-builder 26.18.0 (gerador do instalador e do portátil). Todas as dependências na
  última versão e `npm audit` sem achados.

## [0.4.0] - 2026-10-23

- Dependências atualizadas: React 19, TypeScript 7, Vitest 5, Vite 8.3 e Playwright 1.64.
- Vulnerabilidades de dependências de teste corrigidas (`npm audit` sem achados).

## [0.3.1] - 2026-10-21

- `npm run release`: um comando roda todos os testes, gera o instalador e o portátil, testa o
  executável empacotado, cria a tag e publica a Release com os dois `.exe`.
- CHANGELOG.md com o histórico de todas as versões.

Para atualizar: baixe o instalador novo e rode por cima (os diagramas são mantidos), ou troque o portátil.

## [0.3.0] - 2026-10-21

- Versão desktop para Windows (Electron): instalador e portátil.
- Repositório público com licença MIT.

## [0.2.1] - 2026-10-07

- Botões visíveis **Mais** (atalho M) e **3D** (atalho K) na barra de formas, no lugar da setinha
  que passava despercebida.

## [0.2.0] - 2026-10-07

- Arrastar com o botão direito move o quadro.
- Sólidos isométricos 3D: cubo, cilindro e pirâmide, com faces sombreadas a partir da cor.
- Grade isométrica (o botão de grade alterna pontos → isométrica → desligada).

## [0.1.1] - 2026-10-07

- `FluxDiag.bat`: abre a versão web com dois cliques.

## [0.1.0] - 2026-10-07

- Primeira versão: quadro infinito, formas de fluxograma, conectores ligados, frames que viram
  slides, modo apresentação com anotações, exportação PNG/SVG/PDF/JSON e salvamento no navegador.
