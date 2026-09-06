import { expect, test } from '@playwright/test';
import { firstQueueRow, noteQuantity, signIn } from './accounts';

/**
 * The count form, driven for real in a browser.
 *
 * ⚠️  The last test writes to the live database: confirming an arrival creates
 * a stock movement, and the ledger is append-only, so a test cannot undo it.
 * That one is skipped unless E2E_ALLOW_WRITE is set. Everything before it only
 * fills the form and asserts what the form does — nothing is submitted.
 *
 *     npm run test:e2e        role and navigation rules only  (safe)
 *     npm run test:e2e:full   adds this file                  (still safe
 *                             unless E2E_ALLOW_WRITE=1)
 *
 * Every rule asserted here is also enforced in the database. The browser
 * checks exist so the keeper is told what is wrong before submitting rather
 * than after — they are not the security boundary and are not treated as one.
 */

test.describe('the count form', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'warehouse');
    await expect(page.getByRole('heading', { level: 1, name: 'Receiving' })).toBeVisible();
  });

  test('a matching count needs no reason', async ({ page }) => {
    const row = await firstQueueRow(page);
    test.skip(row === null, 'the receiving queue is empty');

    const { qty } = await noteQuantity(row!);
    await row!.getByRole('button', { name: 'Count and confirm' }).click();
    await page.getByLabel('Actually received').fill(String(qty));

    await expect(page.getByText('Quantity matches the delivery note.')).toBeVisible();
    await expect(page.getByLabel('Reason')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Confirm arrival' })).toBeEnabled();
  });

  test('a short count cannot be submitted without a reason', async ({ page }) => {
    const row = await firstQueueRow(page);
    test.skip(row === null, 'the receiving queue is empty');

    const { qty } = await noteQuantity(row!);
    await row!.getByRole('button', { name: 'Count and confirm' }).click();
    await page.getByLabel('Actually received').fill(String(qty - 20));

    await expect(page.getByText(/short of what the supplier/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm arrival' })).toBeDisabled();

    // The reason list follows the direction of the difference: an
    // over-delivery reason must never be offered for a shortage.
    const reason = page.getByLabel('Reason');
    const options = (await reason.locator('option').allInnerTexts()).join(' | ');
    expect(options).toContain('Lost in transit');
    expect(options).toContain('Supplier loaded less');
    expect(options).not.toContain('Supplier loaded more');

    await reason.selectOption('transit_loss');
    await expect(page.getByRole('button', { name: 'Confirm arrival' })).toBeEnabled();
  });

  test('an over count offers only over-delivery reasons', async ({ page }) => {
    const row = await firstQueueRow(page);
    test.skip(row === null, 'the receiving queue is empty');

    const { qty } = await noteQuantity(row!);
    await row!.getByRole('button', { name: 'Count and confirm' }).click();
    await page.getByLabel('Actually received').fill(String(qty + 10));

    await expect(page.getByText(/more than the supplier/i)).toBeVisible();

    const options = (await page.getByLabel('Reason').locator('option').allInnerTexts()).join(' | ');
    expect(options).toContain('Supplier loaded more');
    expect(options).not.toContain('Lost in transit');
  });

  test('the reason is dropped when the count changes direction', async ({ page }) => {
    const row = await firstQueueRow(page);
    test.skip(row === null, 'the receiving queue is empty');

    const { qty } = await noteQuantity(row!);
    await row!.getByRole('button', { name: 'Count and confirm' }).click();

    const received = page.getByLabel('Actually received');
    await received.fill(String(qty - 20));
    await page.getByLabel('Reason').selectOption('transit_loss');
    await expect(page.getByRole('button', { name: 'Confirm arrival' })).toBeEnabled();

    // A shortage reason must not survive into an over-delivery.
    await received.fill(String(qty + 20));
    await expect(page.getByRole('button', { name: 'Confirm arrival' })).toBeDisabled();
    await expect(page.getByLabel('Reason')).toHaveValue('');
  });

  test('"Other" demands a description', async ({ page }) => {
    const row = await firstQueueRow(page);
    test.skip(row === null, 'the receiving queue is empty');

    const { qty } = await noteQuantity(row!);
    await row!.getByRole('button', { name: 'Count and confirm' }).click();
    await page.getByLabel('Actually received').fill(String(qty - 5));
    await page.getByLabel('Reason').selectOption('other');

    await expect(page.getByRole('button', { name: 'Confirm arrival' })).toBeDisabled();
    await page.getByRole('textbox', { name: 'Note', exact: true }).fill('Counted by hand, two pallets were opened');
    await expect(page.getByRole('button', { name: 'Confirm arrival' })).toBeEnabled();
  });

  test('a negative count is refused', async ({ page }) => {
    const row = await firstQueueRow(page);
    test.skip(row === null, 'the receiving queue is empty');

    await row!.getByRole('button', { name: 'Count and confirm' }).click();
    await page.getByLabel('Actually received').fill('-5');

    await expect(page.getByRole('button', { name: 'Confirm arrival' })).toBeDisabled();
  });
});

test.describe('confirming an arrival', () => {
  test('records the counted quantity, not the delivery note quantity', async ({ page }) => {
    test.skip(
      !process.env.E2E_ALLOW_WRITE,
      'creates real stock in the live database; set E2E_ALLOW_WRITE=1 to run',
    );

    await signIn(page, 'warehouse');
    const row = await firstQueueRow(page);
    test.skip(row === null, 'the receiving queue is empty');

    const { qty, dn } = await noteQuantity(row!);
    const counted = qty - 20;

    await row!.getByRole('button', { name: 'Count and confirm' }).click();
    await page.getByLabel('Actually received').fill(String(counted));
    await page.getByLabel('Reason').selectOption('transit_loss');
    await page.getByRole('textbox', { name: 'Note', exact: true }).fill('Automated end-to-end test');
    await page.getByRole('button', { name: 'Confirm arrival' }).click();

    // The confirmation says what actually went into stock. It must be the
    // counted figure: the delivery note quantity never becomes stock.
    const notice = page.getByText(new RegExp(`DN ${dn} received`));
    await expect(notice).toBeVisible({ timeout: 20_000 });
    await expect(notice).toContainText(String(counted));
    await expect(notice).toContainText('20');
    await expect(notice).toContainText('short');

    // And the note leaves the queue.
    await expect(page.getByRole('heading', { level: 2, name: 'Recently received' })).toBeVisible();
  });
});
