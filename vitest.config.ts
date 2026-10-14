import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Unit test hanya di src/ — spec Playwright di e2e/ dijalankan terpisah (npm run test:e2e)
export default mergeConfig(viteConfig, defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
}))
