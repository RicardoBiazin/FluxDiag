import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:5182', viewport: { width: 1440, height: 900 } },
  webServer: {
    command: 'npx vite build && npx vite preview --host 127.0.0.1 --port 5182 --strictPort',
    url: 'http://127.0.0.1:5182',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
