import { test, expect } from '@playwright/test';

test('public storefront loads with enforced CSP', async ({ page }) => {
  const response = await page.goto('/');
  expect(response).not.toBeNull();
  expect(response?.status()).toBeLessThan(400);
  const csp = response?.headers()['content-security-policy'] || '';
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain('public.blob.vercel-storage.com');
  expect(csp).not.toContain('res.cloudinary.com');
  await expect(page.locator('body')).toContainText(/SAELYXE/i);
});

test('admin route stays behind Firebase administrator login', async ({ page }) => {
  await page.goto('/congsoleadmintechbypenetix');
  await expect(page.getByRole('heading', { name: 'SAELYXE ADMIN' })).toBeVisible();
  await expect(page.getByPlaceholder('saelyxe.co@gmail.com')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Sign In$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Google/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Forgot password\?/i })).toBeVisible();
  await expect(page.getByText(/Verified Revenue/i)).toHaveCount(0);
  await expect(page.getByText(/INVITE ADMINISTRATOR/i)).toHaveCount(0);
});

test('admin login remains usable on a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/congsoleadmintechbypenetix');
  await expect(page.getByRole('heading', { name: 'SAELYXE ADMIN' })).toBeVisible();
  const noOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth <= window.innerWidth + 2 &&
    document.body.scrollWidth <= window.innerWidth + 2
  );
  expect(noOverflow).toBe(true);
});

test('legacy admin and direct checkout URLs are retired', async ({ page }) => {
  for (const route of ['/admin', '/atelier-console', '/checkout']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/$/);
  }
});

test('secure checkout entry supports guest checkout and exposes COD', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('saelyx_cart', JSON.stringify([{
      productId: 'ci-checkout-product',
      title: 'CI Checkout Garment',
      image: '',
      priceLKR: 12000,
      size: 'M',
      quantity: 1,
      product: {
        id: 'ci-checkout-product',
        slug: 'ci-checkout-product',
        title: 'CI Checkout Garment',
        category: 'men',
        priceLKR: 12000,
        images: [],
        sizes: ['M'],
        stockCount: 5,
        inStock: true
      }
    }]));
  });

  await page.goto('/');
  await page.evaluate(() => {
    sessionStorage.setItem('saelyxe_checkout_entry_v2', JSON.stringify({
      nonce: 'ci-secure-checkout-entry',
      issuedAtMs: Date.now()
    }));
  });
  await page.goto('/secure-order-session');

  await expect(page).toHaveURL(/\/secure-order-session$/);
  await expect(page.getByText('Secure Guest Checkout')).toBeVisible();
  const cod = page.getByRole('radio', { name: /Cash on Delivery/i });
  await expect(cod).toBeVisible();
  await cod.click();
  await expect(page.getByText(/PLACE CASH ON DELIVERY ORDER/i)).toBeVisible();
});

test('order creation guard permits guest COD and rejects unsupported methods', async ({ request }) => {
  const guestCod = await request.post('/api/orders', {
    data: {
      customerName: 'CI Patron',
      firstName: 'CI',
      lastName: 'Patron',
      email: 'ci@example.com',
      phone: '+94771234567',
      address: 'CI Address',
      city: 'Colombo',
      country: 'Sri Lanka',
      items: [{ productId: 'ci-product', size: 'M', quantity: 1 }],
      currencyUsed: 'LKR',
      paymentMethod: 'cod'
    }
  });
  expect([401, 403]).not.toContain(guestCod.status());
  expect([400, 503]).toContain(guestCod.status());

  const unsupported = await request.post('/api/orders', {
    data: {
      customerName: 'CI Patron',
      firstName: 'CI',
      lastName: 'Patron',
      email: 'ci@example.com',
      phone: '+94771234567',
      address: 'CI Address',
      city: 'Colombo',
      country: 'Sri Lanka',
      items: [{ productId: 'ci-product', size: 'M', quantity: 1 }],
      currencyUsed: 'LKR',
      paymentMethod: 'bank-transfer'
    }
  });
  expect(unsupported.status()).toBe(400);
  const payload = await unsupported.json();
  expect(String(payload.error || '')).toMatch(/PayPal|Payzy|Cash on Delivery/i);
});

test('public health endpoint is intentionally minimal', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  const payload = await response.json();
  expect(payload).toEqual({ ok: true, service: 'saelyxe-api' });
  expect(payload.firebaseAdminConfigured).toBeUndefined();
  expect(payload.payPalServerConfigured).toBeUndefined();
});

test('homepage does not show the old SAELYX brand spelling', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).not.toContainText(/\bSAELYX\b/);
});

const responsiveViewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 1000 }
];

for (const viewport of responsiveViewports) {
  test(`core storefront routes avoid horizontal overflow on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const failures = [];
    for (const route of ['/', '/contact-support', '/track-order']) {
      const response = await page.goto(route);
      expect(response).not.toBeNull();
      expect(response?.status()).toBeLessThan(400);
      const metrics = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth
      }));
      if (metrics.documentWidth > metrics.viewportWidth + 2 || metrics.bodyWidth > metrics.viewportWidth + 2) {
        failures.push({ route, ...metrics });
      }
    }
    expect(failures).toEqual([]);
  });
}

test('unauthenticated order pages do not leak customer details', async ({ page }) => {
  for (const route of ['/orders', '/track-order?id=SOX-PRIVATE-CHECK']) {
    await page.goto(route);
    await expect(page.getByText(/ashan\.perera@gmail\.com|sarah\.k@fashionstudio\.co\.uk|Ashan Perera|Sarah Kingsley/i)).toHaveCount(0);
  }
});

test('auth drawer enforces minimum 8-character password on signup', async ({ page }) => {
  await page.goto('/');
  const desktopLogin = page.locator('#btn-nav-login-desktop');
  const mobileLogin = page.locator('#btn-nav-login-mobile');
  if (await desktopLogin.isVisible()) await desktopLogin.click();
  else await mobileLogin.click();

  const drawer = page.locator('aside[role="dialog"]');
  await expect(drawer).toBeVisible();
  const createAccount = drawer.getByRole('button', { name: /Create account/i });
  if (await createAccount.isVisible()) await createAccount.click();

  const nameInput = drawer.getByPlaceholder('Your full name');
  const emailInput = drawer.getByPlaceholder('you@example.com');
  const passwordInput = drawer.getByPlaceholder('At least 8 characters');
  const confirmPasswordInput = drawer.getByPlaceholder('Repeat your password');
  await nameInput.fill('Test Patron');
  await emailInput.fill('patron@example.com');
  await passwordInput.fill('short');
  await confirmPasswordInput.fill('short');
  await drawer.locator('button[type="submit"]').click();
  await expect(drawer.getByText(/at least 8 characters/i)).toBeVisible();
});

test('forgot-password view remains reachable with privacy-safe wording', async ({ page }) => {
  await page.goto('/');
  const desktopLogin = page.locator('#btn-nav-login-desktop');
  const mobileLogin = page.locator('#btn-nav-login-mobile');
  if (await desktopLogin.isVisible()) await desktopLogin.click();
  else await mobileLogin.click();

  const drawer = page.locator('aside[role="dialog"]');
  await expect(drawer).toBeVisible();
  const forgot = drawer.getByRole('button', { name: 'Forgot password?' });
  await expect(forgot).toBeVisible();
  await forgot.click();
  await expect(drawer).toContainText(/reset|email/i);
});