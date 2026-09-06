import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Test accounts.
 *
 * Emails are not secret and live here so the suite is readable. The password
 * comes from the environment and is never committed — put E2E_PASSWORD in
 * `.env.local`, which is git-ignored.
 */
export const ACCOUNTS = {
  superadmin: { email: 'superadmin@logiflow.sa', name: 'Faisal Al-Qahtani', role: 'Superadmin' },
  gm: { email: 'gm@logiflow.sa', name: 'Khalid Omar', role: 'General Manager' },
  admin: { email: 'admin@logiflow.sa', name: 'Ahmed Hassan', role: 'Admin' },
  warehouse: { email: 'warehouse@logiflow.sa', name: 'Yousef Al-Harbi', role: 'Warehouse' },
  driver: { email: 'driver1@logiflow.sa', name: 'Mohamed Salah', role: 'Driver' },
} as const;

export type AccountKey = keyof typeof ACCOUNTS;

export function password(): string {
  const value = process.env.E2E_PASSWORD;
  if (!value) {
    throw new Error(
      'E2E_PASSWORD is not set. Add it to .env.local (git-ignored) or pass it on the command line.',
    );
  }
  return value;
}

/**
 * Signs in and waits for the application shell.
 *
 * The wait is on the sidebar rather than on a URL, because the app routes in
 * state rather than in the address bar. It also happens to be the assertion
 * that catches the "Profile Not Found" flash: if the gate rendered before the
 * profile had loaded, the navigation would never appear.
 */
export async function signIn(page: Page, key: AccountKey): Promise<void> {
  const account = ACCOUNTS[key];

  await page.goto('/');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(password());
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 20_000 });
}

/** The navigation item labels this account can see. */
export async function navLabels(page: Page): Promise<string[]> {
  const items = page.getByRole('navigation').getByRole('button');
  return (await items.allInnerTexts()).map((t) => t.split('\n')[0].trim()).filter(Boolean);
}

/**
 * The first row of the receiving queue, once the queue has finished loading.
 *
 * Without the wait a test counts the rows while the spinner is still up, finds
 * none, and skips itself — passing while asserting nothing. Waiting for either
 * a row OR the empty state is what makes the difference real.
 *
 * Returns null when the queue is genuinely empty.
 */
export async function firstQueueRow(page: Page) {
  const row = page.locator('li', { hasText: 'Delivery note says' }).first();
  const empty = page.getByText('Nothing to receive');
  await expect(row.or(empty)).toBeVisible({ timeout: 20_000 });

  return (await row.count()) > 0 ? row : null;
}

/** The quantity the supplier's note claims, read off a queue row. */
export async function noteQuantity(row: NonNullable<Awaited<ReturnType<typeof firstQueueRow>>>) {
  const text = await row.innerText();
  const qty = Number(text.match(/Delivery note says\s*([\d.]+)/)?.[1]);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error(`Could not read the delivery note quantity from:\n${text}`);
  }
  return { qty, dn: text.match(/DN\s*([\w-]+)/)?.[1] ?? '' };
}

/**
 * The navigation item currently marked `aria-current="page"`.
 *
 * Which view is open is asserted through the navigation rather than through
 * the page heading: several older views still carry headings that do not
 * match their nav label, and the question here is which view the app chose,
 * not what that view happens to call itself.
 */
export async function activeNavLabel(page: Page): Promise<string> {
  const current = page.getByRole('navigation').locator('[aria-current="page"]');
  await current.waitFor({ state: 'visible' });
  return (await current.innerText()).split('\n')[0].trim();
}
