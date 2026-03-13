import { expect, test } from '@playwright/test';

test('basic Maxro user smoke flow', async ({ page, browserName }) => {
  const unique = `${Date.now()}-${browserName}`.replace(/[^a-z0-9-]/gi, '').toLowerCase();
  const email = `codex.${unique}@example.com`;
  const password = 'MaxroTest!123';
  const customFoodName = `Codex Test Food ${unique}`;

  await test.step('Register with Maxro auth', async () => {
    await page.goto('/register');
    await page.getByLabel(/First Name/i).fill('Codex');
    await page.getByLabel(/Last Name/i).fill('Tester');
    await page.getByLabel(/^Email/i).fill(email);
    await page.getByLabel(/^Password/i).first().fill(password);
    await page.getByLabel(/Confirm Password/i).fill(password);
    await page.getByLabel(/Date of Birth/i).fill('01/15/1998');
    await page.getByLabel(/Gender/i).click();
    await page.getByRole('option', { name: /^Male$/ }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /Create Account/i }).click();
    await page.waitForURL(/\/dashboard$/, { timeout: 20000 });
    await expect(page.getByRole('button', { name: /Log Workout/i }).first()).toBeVisible();
  });

  await test.step('Create a bodyweight workout', async () => {
    await page.goto('/workouts/log');
    await page.getByLabel(/Exercise Name/i).fill('Push Up');
    await page.getByLabel(/Muscle Group/i).click();
    await page.getByRole('option', { name: 'Chest' }).click();

    const setRow = page.locator('.set-row').first();
    await setRow.locator('input').nth(0).fill('0');
    await setRow.locator('input').nth(1).fill('15');

    await page.getByRole('button', { name: /Save Workout/i }).click();
    await page.waitForURL(/\/workouts$/, { timeout: 15000 });
    await expect(page.locator('.workout-card .ex-name').filter({ hasText: 'Push Up' }).first()).toBeVisible();
  });

  await test.step('Verify PRs reflect the new workout', async () => {
    await page.goto('/prs');
    await expect(page.getByRole('heading', { name: /Personal Records/i })).toBeVisible();
    await expect(page.getByText(/Push Up/i)).toBeVisible();
  });

  await test.step('Log water and verify today log updates', async () => {
    await page.goto('/water');
    await page.getByRole('button', { name: '8 oz' }).click();
    await expect(page.getByRole('heading', { name: /Today's Log/i })).toBeVisible();
    await expect(page.locator('.log-card .entry-amount').filter({ hasText: '8 oz' }).first()).toBeVisible();
  });

  await test.step('Add a custom food entry', async () => {
    await page.goto('/nutrition');
    await page.getByRole('button', { name: /Add Food/i }).click();
    const modal = page.locator('.modal-panel');
    await expect(modal.getByRole('heading', { name: /Add Food/i })).toBeVisible();
    await modal.getByRole('button', { name: 'Custom' }).click();
    await modal.getByLabel(/Food Name/i).fill(customFoodName);
    await modal.getByLabel(/Serving Qty/i).fill('1');
    await modal.getByLabel(/^Unit$/i).fill('serving');
    await modal.getByLabel(/^Calories$/i).fill('105');
    await modal.getByLabel(/Protein \(g\)/i).fill('1');
    await modal.getByLabel(/Carbs \(g\)/i).fill('27');
    await modal.getByLabel(/Fat \(g\)/i).fill('0');
    await modal.getByRole('button', { name: /Add Custom Food/i }).click();
    await expect(page.locator('.entry-name').filter({ hasText: customFoodName }).first()).toBeVisible();
  });

  await test.step('Check analytics layout at desktop size', async () => {
    await page.setViewportSize({ width: 2560, height: 1290 });
    await page.goto('/analytics');
    await expect(page.getByRole('heading', { name: /Analytics/i })).toBeVisible();

    const content = page.locator('main.content');
    await expect.poll(async () => {
      return await content.evaluate((node) => node.scrollHeight - node.clientHeight);
    }).toBeLessThanOrEqual(2);
  });

  await test.step('Open AI chat and verify quick-help block stays usable', async () => {
    await page.goto('/dashboard');
    const openAiButton = page.getByRole('button', { name: /Ask a question/i });
    await expect(openAiButton).toBeVisible();
    await openAiButton.click();
    await expect(page.getByText(/Pick a topic to see common questions/i)).toBeVisible();
    const quickHelpList = page.locator('.suggestion-list');
    await expect(quickHelpList).toBeVisible();
    await expect.poll(async () => {
      return await quickHelpList.evaluate((node) => node.scrollHeight >= node.clientHeight);
    }).toBeTruthy();
  });
});
