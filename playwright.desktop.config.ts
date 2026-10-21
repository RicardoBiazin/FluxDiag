import { defineConfig } from '@playwright/test'

// Testes da versão desktop (Electron). Rodar com `npm run test:desktop`.
// Com FLUXDIAG_EXE apontando para o .exe empacotado, testa o executável em vez do `electron .`.
export default defineConfig({
  testDir: 'e2e-desktop',
  timeout: 60_000,
  workers: 1,
})
