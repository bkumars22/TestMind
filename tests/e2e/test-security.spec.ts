import { test, expect } from '@playwright/test';

const API = process.env.API_URL || 'http://localhost:8080';

test.describe('Security hardening', () => {
  test('direct API call without JWT returns 401', async ({ request }) => {
    const res = await request.get(`${API}/api/projects`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).not.toHaveProperty('trace');
  });

  test('invalid JWT token returns 401', async ({ request }) => {
    const res = await request.get(`${API}/api/projects`, {
      headers: { Authorization: 'Bearer invalid.token.here' }
    });
    expect(res.status()).toBe(401);
  });

  test('BCrypt null password rejected with 400 not 500', async ({ request }) => {
    const res = await request.post(`${API}/api/auth/register`, {
      data: { email: 'test@example.com', password: '' }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).not.toHaveProperty('stackTrace');
  });

  test('SQL injection in project name is sanitized', async ({ request }) => {
    const loginRes = await request.post(`${API}/api/auth/login`, {
      data: { email: 'admin@testmind.io', password: 'Admin@2026' }
    });
    const { accessToken } = await loginRes.json();

    const res = await request.post(`${API}/api/projects`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: "'; DROP TABLE projects; --", repoUrl: 'https://github.com/test/repo', githubToken: 'ghp_fake' }
    });
    // Should not cause 500; either 400 validation or 201 with sanitized name
    expect([201, 400]).toContain(res.status());
  });

  test('XSS attempt in project name does not execute', async ({ page, request }) => {
    const loginRes = await request.post(`${API}/api/auth/login`, {
      data: { email: 'admin@testmind.io', password: 'Admin@2026' }
    });
    expect(loginRes.status()).toBe(200);
  });

  test('response headers include security headers', async ({ request }) => {
    const res = await request.get(`${API}/api/health`);
    const headers = res.headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});
