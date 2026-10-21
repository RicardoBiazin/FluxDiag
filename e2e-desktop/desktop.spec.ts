import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let app: ElectronApplication
let userData: string

// Terminais do VS Code herdam ELECTRON_RUN_AS_NODE=1, que faz o Electron rodar como Node puro.
const env = Object.fromEntries(Object.entries(process.env).filter(([k, v]) => k !== 'ELECTRON_RUN_AS_NODE' && v !== undefined)) as Record<string, string>

function launch(dir: string) {
  const exe = process.env.FLUXDIAG_EXE
  return electron.launch(
    exe
      ? { executablePath: exe, args: [`--user-data-dir=${dir}`], env }
      : { args: ['.', `--user-data-dir=${dir}`], env },
  )
}

test.beforeEach(async () => {
  // Perfil isolado: o teste nunca mexe nos diagramas salvos de verdade.
  userData = mkdtempSync(join(tmpdir(), 'fluxdiag-teste-'))
  app = await launch(userData)
})

test.afterEach(async () => {
  await app?.close()
  rmSync(userData, { recursive: true, force: true })
})

test('abre a janela com o editor e o exemplo', async () => {
  const win = await app.firstWindow()
  await expect(win.getByTestId('canvas')).toBeVisible()
  expect(await win.locator('[data-testid=canvas] g.node').count()).toBeGreaterThan(10)
  await expect(win).toHaveTitle(/FluxDiag/)
  const version = await app.evaluate(({ app }) => app.getVersion())
  expect(version).toMatch(/^\d+\.\d+\.\d+$/)
  await win.screenshot({ path: 'test-results/desktop-01.png' })
})

test('desenha, salva e mantém depois de reabrir', async () => {
  let win = await app.firstWindow()
  await expect(win.getByTestId('canvas')).toBeVisible()
  await win.getByTestId('open-docs').click()
  await win.getByTestId('tpl-blank').click()
  const box = (await win.getByTestId('canvas').boundingBox())!
  await win.keyboard.press('s')
  await win.mouse.click(box.x + 400, box.y + 300)
  await win.keyboard.type('Desktop ok')
  await win.keyboard.press('Escape')
  await win.waitForTimeout(900)
  await app.close()

  app = await launch(userData)
  win = await app.firstWindow()
  await expect(win.locator('[data-testid=canvas] text', { hasText: 'Desktop ok' })).toBeVisible()
})

test('apresentação abre e navega', async () => {
  const win = await app.firstWindow()
  await win.getByTestId('present').click()
  await expect(win.getByTestId('slide-counter')).toHaveText('1 / 3')
  await win.keyboard.press('ArrowRight')
  await expect(win.getByTestId('slide-counter')).toHaveText('2 / 3')
  await win.keyboard.press('Escape')
  await expect(win.getByTestId('presenter')).toHaveCount(0)
})
