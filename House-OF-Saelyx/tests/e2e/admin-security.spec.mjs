import { test, expect } from '@playwright/test';

test('public storefront loads with enforced CSP', async ({ page }) => {
  const response = await page.goto('/');
  expect(response).not.toBeNull();
  expect(response?.status()).toBeLessThan(400);
  const csp = response?.headers()['content-security-policy'] || '';
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  await expect(page.locator('body')).toContainText(/SAELYXE/i);
});

test('admin route stays behind Firebase administrator login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByText('SAELYXE ADMIN')).toBeVisible();
  await expect(page.getByPlaceholder('admin@your-domain.com')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Sign In to Dashboard/i })).toBeVisible();
  await expect(page.getByText(/Verified Revenue/i)).toHaveCount(0);
  await expect(page.getByText(/INVITE ADMINISTRATOR/i)).toHaveCount(0);
});

test('admin login remains usable on a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/admin');
  await expect(page.getByText('SAELYXE ADMIN')).toBeVisible();
  const noHorizontalOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth <= window.innerWidth + 2
  );
  expect(noHorizontalOverflow).toBe(true);
});

test('order tracking requires the authenticated purchasing account', async ({ page }) => {
  await page.goto('/track-order?id=SLX-PRIVATE-TEST');
  await expect(page.getByText(/TRACK YOUR ORDER/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /SIGN IN TO TRACK/i })).toBeVisible();
  await expect(page.getByText(/Customer Name|Street Address|Payment Method/i)).toHaveCount(0);
});

test('public health endpoint is intentionally minimal', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  const payload = await response.json();
  expect(payload).toEqual({ ok: true, service: 'saelyxe-api' });
  expect(payload.firebaseAdminConfigured).toBeUndefined();
  expect(payload.payPalServerConfigured).toBeUndefined();
});
