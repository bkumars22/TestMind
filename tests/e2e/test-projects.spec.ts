import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'admin@testmind.io');
    await page.fill('input[type="password"]', 'Admin@2026');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto(`${BASE}/projects`);
  });

  test('projects page shows project list', async ({ page }) => {
    await expect(page.locator('text=ARIA Demo')).toBeVisible();
  });

  test('create project appears in list', async ({ page }) => {
    await page.click('button:has-text("New Project")');
    await page.fill('input[placeholder*="project name"], input[name="name"]', 'Test Project E2E');
    await page.fill('input[placeholder*="github.com"], input[name="repoUrl"]', 'https://github.com/test/e2e-project');
    await page.fill('input[type="password"], input[name="githubToken"]', 'ghp_fake_token_for_test');
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
    await expect(page.locator('text=Test Project E2E')).toBeVisible({ timeout: 10000 });
  });

  test('trigger analysis shows loading state', async ({ page }) => {
    await page.click('button:has-text("Run Analysis")');
    await expect(page.locator('.animate-spin, [data-testid="loading"]')).toBeVisible({ timeout: 5000 });
  });

  test('MCP status shows 5 indicators per project', async ({ page }) => {
    const mcpDots = page.locator('[data-testid="mcp-dot"]');
    const count = await mcpDots.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
