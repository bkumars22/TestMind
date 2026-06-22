import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const API  = process.env.API_URL  || 'http://localhost:8080';

test.describe('Authentication', () => {
  test('login with valid credentials shows dashboard', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'admin@testmind.io');
    await page.fill('input[type="password"]', 'Admin@2026');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Total Projects')).toBeVisible();
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'admin@testmind.io');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="error-message"], .text-red-600')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('login with empty fields shows validation errors', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.click('button[type="submit"]');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeFocused();
  });

  test('accessing protected route without token redirects to login', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('API returns 401 without JWT token', async ({ request }) => {
    const res = await request.get(`${API}/api/projects`);
    expect(res.status()).toBe(401);
  });

  test('logout clears session and redirects to login', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'admin@testmind.io');
    await page.fill('input[type="password"]', 'Admin@2026');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    await page.click('[data-testid="logout-btn"], button:has-text("Logout")');
    await expect(page).toHaveURL(/\/login/);
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });
});
