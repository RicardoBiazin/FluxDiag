// npm run release: testa tudo, empacota, testa o .exe e publica a Release vX.Y.Z no GitHub.
// Pré-requisitos: versão nova no package.json, seção dela no CHANGELOG.md e árvore git limpa.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const tag = `v${version}`

// Terminais do VS Code herdam ELECTRON_RUN_AS_NODE=1, que impede o Electron de abrir janela.
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`)
  const r = spawnSync(cmd, { cwd: root, stdio: opts.capture ? 'pipe' : 'inherit', shell: true, env: { ...env, ...opts.env }, encoding: 'utf8' })
  if (r.status !== 0 && !opts.allowFail) {
    console.error(`\nFalhou: ${cmd}`)
    if (opts.capture) console.error(r.stdout, r.stderr)
    process.exit(1)
  }
  return r
}

function out(cmd) {
  return run(cmd, { capture: true }).stdout.trim()
}

// 1. Conferências antes de gastar tempo com build.
if (out('git status --porcelain')) {
  console.error('A árvore git tem alterações não commitadas. Commit antes de publicar a Release.')
  process.exit(1)
}
if (out('git rev-parse --abbrev-ref HEAD') !== 'main') {
  console.error('Publique a Release a partir do branch main.')
  process.exit(1)
}
if (run(`gh release view ${tag}`, { capture: true, allowFail: true }).status === 0) {
  console.error(`A Release ${tag} já existe. Suba a versão no package.json.`)
  process.exit(1)
}
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
const section = changelog.match(new RegExp(`^## \[${version.replace(/\./g, '\.')}\][^\n]*\n([\s\S]*?)(?=^## \[|(?![\s\S]))`, 'm'))
if (!section || !section[1].trim()) {
  console.error(`O CHANGELOG.md não tem a seção "## [${version}]".`)
  process.exit(1)
}

// 2. Testes, empacotamento e teste do executável.
run('npx tsc --noEmit -p .')
run('npm test')
run('npm run test:e2e')
run('npm run dist:win')
const setup = join(root, 'release', `FluxDiag-Setup-${version}.exe`)
const portable = join(root, 'release', `FluxDiag-${version}-portatil.exe`)
const unpacked = join(root, 'release', 'win-unpacked', 'FluxDiag.exe')
for (const f of [setup, portable, unpacked]) {
  if (!existsSync(f)) {
    console.error(`Não encontrei ${f}`)
    process.exit(1)
  }
}
run('npx playwright test -c playwright.desktop.config.ts', { env: { FLUXDIAG_EXE: unpacked } })

// 3. Publicação: push, tag anotada e Release com os dois .exe.
run('git push origin main')
run(`git tag -a ${tag} -m "FluxDiag ${version}"`)
run(`git push origin ${tag}`)
const notesFile = join(mkdtempSync(join(tmpdir(), 'fluxdiag-release-')), 'notas.md')
const notes =
  section[1].trim() +
  `\n\n### Downloads\n\n- **FluxDiag-Setup-${version}.exe** — instalador (não pede administrador).\n` +
  `- **FluxDiag-${version}-portatil.exe** — roda sem instalar.\n\n` +
  'Os executáveis não são assinados: se o SmartScreen avisar, clique em *Mais informações → Executar assim mesmo*.\n'
writeFileSync(notesFile, notes)
run(`gh release create ${tag} "${setup}" "${portable}" --verify-tag --title "FluxDiag ${version}" --notes-file "${notesFile}"`)
console.log(`\nRelease ${tag} publicada.`)
