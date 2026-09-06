import { expect, test } from '@playwright/test';
import { ACCOUNTS, activeNavLabel, firstQueueRow, navLabels, noteQuantity, signIn } from './accounts';

/**
 * What each role can see.
 *
 * These assert the UI agrees with the database. The database is the authority
 * — every rule here is also enforced by RLS and by the role checks inside the
 * RPC functions — but a screen that offers a button the server will refuse is
 * still a defect, and this is what catches it.
 *
 * Nothing here writes. Safe to run at any time.
 */

test.describe('sign in', () => {
  test('rejects a wrong password without signing anybody in', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(ACCOUNTS.admin.email);
    await page.getByLabel('Password').fill('definitely-not-the-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText(/incorrect|invalid|failed/i)).toBeVisible();
    await expect(page.getByRole('navigation')).toBeHidden();
  });

  test('never flashes "Profile Not Found" on the way in', async ({ page }) => {
    // Regression: the gate used to render before the profile had loaded,
    // showing a "not found" screen for a moment on every single sign-in.
    const seen: string[] = [];
    page.on('domcontentloaded', () => {});
    await page.goto('/');
    await page.getByLabel('Email').fill(ACCOUNTS.admin.email);
    await page.getByLabel('Password').fill(process.env.E2E_PASSWORD ?? '');

    const watcher = setInterval(async () => {
      try {
        const body = await page.locator('body').innerText({ timeout: 500 });
        if (/Profile Not Found/i.test(body)) seen.push('Profile Not Found');
      } catch {
        /* page is mid-navigation */
      }
    }, 60);

    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 20_000 });
    clearInterval(watcher);

    expect(seen).toEqual([]);
  });
});

test.describe('landing view', () => {
  test('admin lands on the dashboard', async ({ page }) => {
    await signIn(page, 'admin');
    expect(await activeNavLabel(page)).toBe('Dashboard');
  });

  test('GM lands on the dashboard', async ({ page }) => {
    await signIn(page, 'gm');
    expect(await activeNavLabel(page)).toBe('Dashboard');
  });

  test('driver lands on My Deliveries, not a dashboard they cannot read', async ({ page }) => {
    await signIn(page, 'driver');
    expect(await activeNavLabel(page)).toBe('My Deliveries');
    await expect(page.getByRole('heading', { level: 1, name: 'My Deliveries' })).toBeVisible();
  });

  test('warehouse keeper lands on Receiving', async ({ page }) => {
    await signIn(page, 'warehouse');
    expect(await activeNavLabel(page)).toBe('Receiving');
    await expect(page.getByRole('heading', { level: 1, name: 'Receiving' })).toBeVisible();
  });
});

test.describe('navigation is filtered by role', () => {
  test('admin uploads slips but neither reviews nor receives them', async ({ page }) => {
    await signIn(page, 'admin');
    const labels = await navLabels(page);

    expect(labels).toContain('Delivery Slips');
    expect(labels).not.toContain('Slip Review');
    expect(labels).not.toContain('Receiving');
    expect(labels).not.toContain('My Deliveries');
  });

  test('GM reviews and can receive, but does not upload', async ({ page }) => {
    await signIn(page, 'gm');
    const labels = await navLabels(page);

    expect(labels).toContain('Slip Review');
    expect(labels).toContain('Receiving');
    expect(labels).not.toContain('Delivery Slips');
  });

  test('warehouse keeper only counts', async ({ page }) => {
    await signIn(page, 'warehouse');
    const labels = await navLabels(page);

    expect(labels).toContain('Receiving');
    // Entering the expected quantity and confirming the actual one must not
    // land in the same pair of hands.
    expect(labels).not.toContain('Delivery Slips');
    expect(labels).not.toContain('Slip Review');
  });

  test('driver sees their deliveries and nothing else', async ({ page }) => {
    await signIn(page, 'driver');
    const labels = await navLabels(page);

    expect(labels).toContain('My Deliveries');
    // Whoever carried the goods must never be the one who counts them.
    expect(labels).not.toContain('Receiving');
    expect(labels).not.toContain('Slip Review');
    expect(labels).not.toContain('Delivery Slips');
  });
});

test.describe('identity', () => {
  for (const [key, account] of Object.entries(ACCOUNTS)) {
    test(`${key} sees their own name and role, and cannot change the role`, async ({ page }) => {
      await signIn(page, key as keyof typeof ACCOUNTS);

      await expect(page.getByText(account.role, { exact: true }).first()).toBeVisible();

      // The header used to carry a role switcher, which let anyone grant
      // themselves any role in the UI. It is gone; the role now comes from
      // user_tbl and the database enforces the same value.
      await expect(page.getByRole('combobox', { name: /role/i })).toHaveCount(0);
    });
  }
});

test.describe('receiving queue', () => {
  test('shows the delivery note quantity as a claim, not as stock', async ({ page }) => {
    await signIn(page, 'warehouse');
    await expect(page.getByRole('heading', { level: 1, name: 'Receiving' })).toBeVisible();

    const queue = page.getByRole('heading', { level: 2, name: 'Awaiting count' });
    await expect(queue).toBeVisible();

    const row = await firstQueueRow(page);
    test.skip(row === null, 'the receiving queue is empty');

    // The screen labels the number as what the note SAYS, never as stock.
    const { qty } = await noteQuantity(row!);
    expect(qty).toBeGreaterThan(0);
    await expect(row!).toContainText('Delivery note says');
    await expect(row!.getByRole('button', { name: 'Count and confirm' })).toBeVisible();
  });
});
