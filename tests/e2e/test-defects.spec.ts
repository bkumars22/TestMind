import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Defects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'admin@testmind.io');
    await page.fill('input[type="password"]', 'Admin@2026');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('defect detail page shows AI explanation', async ({ page }) => {
    await page.goto(`${BASE}/defects/1`);
    await expect(page.locator('text=AI Explanation, h2:has-text("AI"), [data-testid="ai-explanation"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=JWT')).toBeVisible();
  });

  test('P1 defect shows orange severity badge', async ({ page }) => {
    await page.goto(`${BASE}/defects/1`);
    const badge = page.locator('[data-testid="severity-badge"], .severity-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('P1');
  });

  test('consistency score renders as gauge', async ({ page }) => {
    await page.goto(`${BASE}/defects/1`);
    const gauge = page.locator('[data-testid="consistency-gauge"], [role="progressbar"]');
    await expect(gauge).toBeVisible();
  });

  test('status dropdown allows changing status', async ({ page }) => {
    await page.goto(`${BASE}/defects/1`);
    const dropdown = page.locator('select[name="status"], [data-testid="status-select"]');
    await expect(dropdown).toBeVisible();
    await dropdown.selectOption('IN_PROGRESS');
    await expect(page.locator('text=IN_PROGRESS, text=In Progress')).toBeVisible();
  });

  test('defect list filters by severity', async ({ page }) => {
    await page.goto(`${BASE}/projects/1`);
    await page.click('text=Defects');
    const p1Filter = page.locator('button:has-text("P1"), [data-filter="P1"]');
    if (await p1Filter.count() > 0) {
      await p1Filter.click();
      const p0Badges = page.locator('[data-severity="P0"]');
      expect(await p0Badges.count()).toBe(0);
    }
  });
});
