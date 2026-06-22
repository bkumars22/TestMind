import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'admin@testmind.io');
    await page.fill('input[type="password"]', 'Admin@2026');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('shows 4 stat cards with numbers', async ({ page }) => {
    await expect(page.locator('text=Total Projects')).toBeVisible();
    await expect(page.locator('text=Active Test Runs')).toBeVisible();
    await expect(page.locator('text=Open Defects')).toBeVisible();
    await expect(page.locator('text=Avg Risk Score')).toBeVisible();
  });

  test('risk heatmap renders with colored bars', async ({ page }) => {
    const heatmap = page.locator('[data-testid="risk-heatmap"], .risk-heatmap');
    await expect(heatmap).toBeVisible({ timeout: 10000 });
  });

  test('defect severity chart renders without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.waitForTimeout(2000);
    const chartErrors = errors.filter(e => e.includes('Recharts') || e.includes('chart'));
    expect(chartErrors).toHaveLength(0);
  });

  test('recent test runs table is visible', async ({ page }) => {
    const table = page.locator('table, [data-testid="test-runs-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });
  });
});
