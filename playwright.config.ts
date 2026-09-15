import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against a running dev server. Set PLAYWRIGHT_BASE_URL when `pnpm dev` is not on :3000
 * (e.g. `PLAYWRIGHT_BASE_URL=http://localhost:3001 pnpm test:e2e`); otherwise Playwright starts it.
 * Specs log in as the seeded admin (`pnpm db:seed`) and create uniquely named data.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-ES',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/admin.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: 'pnpm dev', url: baseURL, reuseExistingServer: true, timeout: 180_000 },
});
