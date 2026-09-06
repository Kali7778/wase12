import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Load `.env.local` the way Vite does, so `npm run test:e2e` works with no
 * extra setup. Written by hand rather than pulling in dotenv: it reads one
 * small file, and a dependency for that is not worth the supply chain.
 * Anything already in the environment wins, so CI can override.
 */
function loadEnvLocal(): void {
  let text: string;
  try {
    text = readFileSync(new URL('.env.local', import.meta.url), 'utf8');
  } catch {
    return; // Not there — the variables may come from the environment instead.
  }

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

loadEnvLocal();

/**
 * End-to-end tests against a real browser and the real Supabase project.
 *
 * There is no mock layer here on purpose: the whole point of these tests is
 * that the role rules the database enforces are the ones the UI actually
 * shows. A mocked backend would agree with the UI and prove nothing.
 *
 * Two projects:
 *   `readonly`  — the default. Signs in as each role and asserts what that
 *                 person can see. Changes nothing, so it is safe to run at
 *                 any time and as often as you like.
 *   `mutating`  — drives a real receiving flow, which creates real stock.
 *                 Excluded from the default run; see `npm run test:e2e:full`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-GB',
    timezoneId: 'Asia/Riyadh',
  },

  projects: [
    {
      name: 'readonly',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mutating\./,
    },
    {
      name: 'mutating',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /mutating\./,
    },
    {
      // Same tests, but in a browser you can watch. Slowed down so each
      // click and each field is visible rather than a blur.
      name: 'demo',
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        launchOptions: { slowMo: Number(process.env.E2E_SLOW_MO ?? 700) },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
