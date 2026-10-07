import { expect, test, type Page } from '@playwright/test'

async function fresh(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByTestId('canvas')).toBeVisible()
}

async function canvasBox(page: Page) {
  const box = await page.getByTestId('canvas').boundingBox()
  if (!box) throw new Error('sem canvas')
  return box
}

async function blankDoc(page: Page) {
  await page.getByTestId('open-docs').click()
  await page.getByTestId('tpl-blank').click()
}

const nodeCount = (page: Page) => page.locator('[data-testid=canvas] g.node').count()
const edgeCount = (page: Page) => page.locator('[data-testid=canvas] g.edge').count()

test('abre com o exemplo e três slides', async ({ page }) => {
  await fresh(page)
  expect(await nodeCount(page)).toBeGreaterThan(10)
  expect(await edgeCount(page)).toBe(6)
  await expect(page.getByTestId('slides-panel').locator('.slide-list li')).toHaveCount(3)
  await page.screenshot({ path: 'test-results/01-exemplo.png' })
})

test('criar formas, editar texto, conectar, desfazer', async ({ page }) => {
  await fresh(page)
  await blankDoc(page)
  expect(await nodeCount(page)).toBe(0)
  const b = await canvasBox(page)

  // Retângulo com um clique.
  await page.keyboard.press('r')
  await page.mouse.click(b.x + 300, b.y + 300)
  await expect(page.getByTestId('text-editor')).toBeVisible()
  await page.keyboard.type('Início')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-testid=canvas] text', { hasText: 'Início' })).toBeVisible()

  // Losango arrastando.
  await page.keyboard.press('d')
  await page.mouse.move(b.x + 600, b.y + 250)
  await page.mouse.down()
  await page.mouse.move(b.x + 760, b.y + 360, { steps: 5 })
  await page.mouse.up()
  await page.keyboard.type('Ok?')
  await page.keyboard.press('Escape')
  expect(await nodeCount(page)).toBe(2)

  // Conector arrastando do ponto direito do retângulo até o losango.
  await page.mouse.click(b.x + 300, b.y + 300) // seleciona o retângulo -> mostra portas
  const port = page.locator('circle[data-kind=port][data-side=right]').first()
  const pb = (await port.boundingBox())!
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + 650, b.y + 300, { steps: 8 })
  await page.mouse.move(b.x + 680, b.y + 305, { steps: 3 })
  await page.mouse.up()
  expect(await edgeCount(page)).toBe(1)

  // Clique num ponto de conexão cria a próxima etapa ligada.
  await page.mouse.click(b.x + 680, b.y + 305)
  const down = page.locator('circle[data-kind=port][data-side=bottom]').first()
  await down.click()
  await page.keyboard.type('Próximo')
  await page.keyboard.press('Escape')
  expect(await nodeCount(page)).toBe(3)
  expect(await edgeCount(page)).toBe(2)

  // Desfazer tudo que foi feito por último.
  await page.mouse.click(b.x + 50, b.y + 50)
  await page.keyboard.press('Control+z') // texto
  await page.keyboard.press('Control+z') // forma + conector
  expect(await nodeCount(page)).toBe(2)
  expect(await edgeCount(page)).toBe(1)
  await page.keyboard.press('Control+y')
  await page.keyboard.press('Control+y')
  expect(await nodeCount(page)).toBe(3)
  await page.screenshot({ path: 'test-results/02-desenho.png' })

  // Mover: arrastar o retângulo leva o conector junto.
  const edgePath = page.locator('g.edge path').nth(1)
  const before = await edgePath.getAttribute('d')
  await page.mouse.move(b.x + 300, b.y + 300)
  await page.mouse.down()
  await page.mouse.move(b.x + 300, b.y + 450, { steps: 6 })
  await page.mouse.up()
  expect(await edgePath.getAttribute('d')).not.toBe(before)

  // Excluir.
  await page.keyboard.press('Delete')
  expect(await nodeCount(page)).toBe(2)
  expect(await edgeCount(page)).toBe(1)
})

test('salva no navegador e reabre depois de recarregar', async ({ page }) => {
  await fresh(page)
  await blankDoc(page)
  const b = await canvasBox(page)
  await page.keyboard.press('s')
  await page.mouse.click(b.x + 400, b.y + 300)
  await page.keyboard.type('Persistente')
  await page.keyboard.press('Escape')
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible()
  await page.waitForTimeout(700)
  await page.reload()
  await expect(page.locator('[data-testid=canvas] text', { hasText: 'Persistente' })).toBeVisible()
})

test('apresentação navega pelos frames', async ({ page }) => {
  await fresh(page)
  await page.getByTestId('present').click()
  const pres = page.getByTestId('presenter')
  await expect(pres).toBeVisible()
  await expect(page.getByTestId('slide-counter')).toHaveText('1 / 3')
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'test-results/03-slide1.png' })
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('slide-counter')).toHaveText('2 / 3')
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'test-results/04-slide2.png' })
  await page.keyboard.press('n')
  await expect(page.locator('.presenter-notes')).toContainText('triagem')
  await page.keyboard.press('End')
  await expect(page.getByTestId('slide-counter')).toHaveText('3 / 3')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('slide-counter')).toHaveText('3 / 3')
  await page.keyboard.press('Escape')
  await expect(pres).toHaveCount(0)
})

test('exporta JSON, SVG e PNG', async ({ page }) => {
  await fresh(page)
  for (const [label, ext] of [
    ['Arquivo FluxDiag (.json)', '.json'],
    ['Vetor SVG', '.svg'],
    ['Imagem PNG', '.png'],
  ] as const) {
    await page.getByTestId('export').click()
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: label }).click()])
    expect(dl.suggestedFilename().endsWith(ext)).toBe(true)
    const path = await dl.path()
    expect(path).toBeTruthy()
  }
})

test('zoom com Ctrl+roda e ver tudo', async ({ page }) => {
  await fresh(page)
  const b = await canvasBox(page)
  const before = await page.getByTestId('zoom-value').textContent()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -400)
  await page.keyboard.up('Control')
  await expect(page.getByTestId('zoom-value')).not.toHaveText(before!)
  await page.keyboard.press('Shift+Digit1')
  await expect(page.getByTestId('zoom-value')).toHaveText(before!)
})

test('botão direito arrasta o quadro', async ({ page }) => {
  await fresh(page)
  const b = await canvasBox(page)
  const layer = page.locator('[data-testid=canvas] svg > g').first()
  const before = await layer.getAttribute('transform')
  await page.mouse.move(b.x + 500, b.y + 400)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(b.x + 650, b.y + 480, { steps: 6 })
  await page.mouse.up({ button: 'right' })
  const after = await layer.getAttribute('transform')
  expect(after).not.toBe(before)
  const nums = (t: string | null) => t!.match(/-?[\d.]+/g)!.map(Number)
  expect(nums(after)[0] - nums(before)[0]).toBeCloseTo(150, 0)
  expect(nums(after)[1] - nums(before)[1]).toBeCloseTo(80, 0)
})

test('formas isométricas 3D e grade isométrica', async ({ page }) => {
  await fresh(page)
  await blankDoc(page)
  const b = await canvasBox(page)
  for (const [kind, x] of [['isoCube', 300], ['isoCylinder', 550], ['isoPyramid', 800]] as const) {
    await page.getByTestId('more-shapes').click()
    await page.getByTestId(`shape-${kind}`).click()
    await page.mouse.click(b.x + x, b.y + 350)
    await page.keyboard.type(kind === 'isoCube' ? 'Servidor' : kind === 'isoCylinder' ? 'Banco' : 'Meta')
    await page.keyboard.press('Escape')
  }
  expect(await nodeCount(page)).toBe(3)
  // 3 + 3 + 2 faces sombreadas.
  expect(await page.locator('[data-testid=canvas] g.node path').count()).toBe(8)
  await page.getByTestId('grid-toggle').click()
  await expect(page.locator('#grid-iso')).toHaveCount(1)
  await page.mouse.click(b.x + 50, b.y + 50)
  await page.screenshot({ path: 'test-results/05-isometrico.png' })
  await page.getByTestId('grid-toggle').click()
  await expect(page.locator('#grid-iso')).toHaveCount(0)
  await expect(page.locator('#grid-dots')).toHaveCount(0)
})

test('sem erros no console', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await fresh(page)
  await page.getByTestId('present').click()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Escape')
  await page.getByTestId('open-docs').click()
  await page.getByTestId('tpl-slides').click()
  expect(errors).toEqual([])
})
