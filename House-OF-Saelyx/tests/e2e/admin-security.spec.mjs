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
  await page.goto('/congsoleadmintechbypenetix');
  await expect(page.getByRole('heading', { name: 'SAELYXE ADMIN' })).toBeVisible();
  await expect(page.getByPlaceholder('admin@your-domain.com')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Sign In$/i })).toBeVisible();
  await expect(page.getByText(/Verified Revenue/i)).toHaveCount(0);
  await expect(page.getByText(/INVITE ADMINISTRATOR/i)).toHaveCount(0);
});

test('admin login remains usable on a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/congsoleadmintechbypenetix');
  await expect(page.getByRole('heading', { name: 'SAELYXE ADMIN' })).toBeVisible();
  const noHorizontalOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth <= window.innerWidth + 2
  );
  expect(noHorizontalOverflow).toBe(true);
});

test('order tracking supports account or scoped guest access without leaking private data', async ({ page }) => {
  await page.goto('/track-order?id=SLX-PRIVATE-TEST');
  await expect(page.getByText(/TRACK YOUR ORDER/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /TRACK ORDER/i })).toBeVisible();
  await expect(page.getByText(/browser used at checkout/i).first()).toBeVisible();
  await expect(page.getByText(/Customer Name|Street Address|Payment Method/i)).toHaveCount(0);
});

test('legacy admin entry routes are retired to the storefront', async ({ page }) => {
  for (const route of ['/admin', '/atelier-console']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'SAELYXE ADMIN' })).toHaveCount(0);
  }
});

test('direct checkout URLs cannot open the checkout page', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('saelyxe_checkout_entry_v2', JSON.stringify({
      nonce: 'ci-secure-checkout-entry',
      issuedAtMs: Date.now()
    }));
  });
  await page.goto('/secure-order-session');
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/secure-order-session');
  await expect(page).toHaveURL(/\/$/);
});

test('public health endpoint is intentionally minimal', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  const payload = await response.json();
  expect(payload).toEqual({ ok: true, service: 'saelyxe-api' });
  expect(payload.firebaseAdminConfigured).toBeUndefined();
  expect(payload.payPalServerConfigured).toBeUndefined();
});


const responsiveViewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 1000 }
];

for (const viewport of responsiveViewports) {
  test(`responsive storefront routes avoid horizontal overflow on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const overflowFailures = [];
    for (const route of ['/', '/contact-support', '/orders', '/track-order', '/checkout']) {
      const response = await page.goto(route);
      expect(response).not.toBeNull();
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator('body')).toContainText(/SAELYXE/i);
      const metrics = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        bodyWidth: document.body.scrollWidth
      }));
      if (metrics.documentWidth > metrics.viewportWidth + 2 || metrics.bodyWidth > metrics.viewportWidth + 2) {
        const offenders = await page.evaluate(() => {
          const width = window.innerWidth;
          return Array.from(document.querySelectorAll('body *'))
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                tag: element.tagName,
                className: typeof element.className === 'string' ? element.className.slice(0, 180) : '',
                text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                scrollWidth: element.scrollWidth
              };
            })
            .filter(item => item.right > width + 2 || item.left < -2 || item.scrollWidth > Math.max(item.width + 2, width + 2))
            .sort((a, b) => Math.max(b.right - width, b.scrollWidth - width) - Math.max(a.right - width, a.scrollWidth - width))
            .slice(0, 12);
        });
        overflowFailures.push({ route, ...metrics, offenders });
      }
    }
    expect(overflowFailures, JSON.stringify(overflowFailures)).toEqual([]);
  });
}

for (const viewport of responsiveViewports) {
  test(`admin login remains responsive on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const response = await page.goto('/congsoleadmintechbypenetix');
    expect(response).not.toBeNull();
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: 'SAELYXE ADMIN' })).toBeVisible();
    const noHorizontalOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth + 2 &&
      document.body.scrollWidth <= window.innerWidth + 2
    );
    expect(noHorizontalOverflow).toBe(true);
  });
}

test('unauthenticated account routes do not leak customer order details', async ({ page }) => {
  for (const route of ['/orders', '/track-order?id=SOX-PRIVATE-CHECK']) {
    await page.goto(route);
    await expect(page.getByText(/ashan\.perera@gmail\.com|sarah\.k@fashionstudio\.co\.uk|Ashan Perera|Sarah Kingsley/i)).toHaveCount(0);
  }
});

test('product page enforces explicit size selection before adding to bag', async ({ page }) => {
  await page.goto('/product/s-signature-oversized-tee');
  await expect(page.getByRole('heading', { name: /SÆ SIGNATURE OVERSIZED TEE/i })).toBeVisible();

  // Main product Add to Bag button starts with SELECT SIZE and is disabled
  const mainAddBtn = page.locator('#btn-product-add-to-bag');
  await expect(mainAddBtn).toBeVisible();
  await expect(mainAddBtn).toBeDisabled();
  await expect(mainAddBtn).toContainText(/SELECT SIZE/i);

  // Clicking size 'M' enables the button and changes text to ADD TO BAG
  const sizeMBtn = page.locator('div.grid button', { hasText: /^M$/ }).first();
  await expect(sizeMBtn).toBeVisible();
  await sizeMBtn.click();

  // Button becomes enabled and changes text
  await expect(mainAddBtn).toBeEnabled();
  await expect(mainAddBtn).toContainText(/ADD TO BAG/i);

  // PDP Matching Set button shows SELECT SIZE and opens modal on click
  const completeSetSection = page.getByText(/COMPLETE THE SET/i);
  if (await completeSetSection.isVisible()) {
    const matchingSetCard = completeSetSection.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]');
    const setSelectSizeBtn = matchingSetCard.locator('button:has-text("SELECT SIZE")');
    if (await setSelectSizeBtn.isVisible()) {
      await setSelectSizeBtn.click();
      // Product modal opens for the matching set item
      await expect(page.locator('#btn-modal-add-to-bag, button:has-text("SELECT A SIZE")').first()).toBeVisible();
    }
  }
});

test('checkout payment selection starts unselected and toggles cleanly without temporary test wording', async ({ page }) => {
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

  // CI intentionally has no real PayPal credentials. Mock only the public
  // payment-config response so this remains a safe UI-state test and never
  // starts a provider payment or real-money transaction.
  await page.route('**/api/payments/config', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        paypal: { enabled: true, clientId: '', mode: 'sandbox' }
      })
    });
  });

  await page.goto('/checkout');
  await expect(page.locator('body')).toContainText(/Sri Lanka/i);

  // Neither payment method starts selected
  const codRadio = page.getByRole('radio', { name: /Cash on Delivery/i });
  const paypalRadio = page.getByRole('radio', { name: /PayPal/i });

  await expect(codRadio).toBeVisible();
  await expect(paypalRadio).toBeVisible();
  await expect(codRadio).toHaveAttribute('aria-checked', 'false');
  await expect(paypalRadio).toHaveAttribute('aria-checked', 'false');

  // No Temporary Test text anywhere
  await expect(page.getByText(/Temporary Test/i)).toHaveCount(0);

  // Clicking Cash on Delivery selects COD
  await codRadio.click();
  await expect(codRadio).toHaveAttribute('aria-checked', 'true');
  await expect(paypalRadio).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('#payment-cod-details')).toBeVisible();
  await expect(page.getByText(/Pay in cash when your order is delivered\./i)).toBeVisible();

  // Clicking PayPal selects PayPal and cleanly unmounts COD
  await paypalRadio.click();
  await expect(paypalRadio).toHaveAttribute('aria-checked', 'true');
  await expect(codRadio).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('#payment-cod-details')).toHaveCount(0);
  await expect(page.locator('#payment-paypal-details')).toBeVisible();

  // Switching back to COD cleanly unmounts PayPal
  await codRadio.click();
  await expect(codRadio).toHaveAttribute('aria-checked', 'true');
  await expect(paypalRadio).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('#payment-paypal-details')).toHaveCount(0);
  await expect(page.locator('#payment-cod-details')).toBeVisible();
});

test('storefront social proof shows 10+ Customers without fake testimonials', async ({ page }) => {
  await page.goto('/');
  const socialSection = page.getByText(/\+ Customers/i);
  await socialSection.scrollIntoViewIfNeeded();
  await expect(page.getByText(/10\+ Customers/i)).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Brody');
});

test('auth drawer enforces minimum 8-character password on signup', async ({ page }) => {
  await page.goto('/');
  const userAccountBtn = page.locator('button[aria-label="User account"]:visible, #btn-nav-login-desktop:visible').first();
  await expect(userAccountBtn).toBeVisible();
  await userAccountBtn.click();

  const drawer = page.locator('aside[role="dialog"]');
  await expect(drawer).toBeVisible();

  const switchModeBtn = drawer.locator('p button', { hasText: /Create account/i });
  await expect(switchModeBtn).toBeVisible();
  await switchModeBtn.click();

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

test('forgot-password view is reachable from the sign-in drawer and uses privacy-safe wording', async ({ page }) => {
  await page.goto('/');

  // Prefer the explicit desktop LOGIN control. Fall back to the mobile account
  // button only when the desktop navbar is not rendered at this viewport.
  const desktopLogin = page.locator('#btn-nav-login-desktop');
  const mobileLogin = page.locator('#btn-nav-login-mobile');
  if (await desktopLogin.isVisible()) {
    await desktopLogin.click();
  } else {
    await expect(mobileLogin).toBeVisible();
    await mobileLogin.click();
  }

  const drawer = page.locator('aside[role="dialog"]');
  await expect(drawer).toBeVisible();

  // LOGIN is expected to open sign-in mode. If a stale UI transition ever
  // presents create-account mode, normalize through the visible Sign in switch
  // before asserting the forgot-password control.
  let forgotPasswordBtn = drawer.getByRole('button', { name: 'Forgot password?' });
  if (!(await forgotPasswordBtn.isVisible())) {
    const signInSwitch = drawer.getByRole('button', { name: /Sign in/i });
    if (await signInSwitch.isVisible()) {
      await signInSwitch.click();
      forgotPasswordBtn = drawer.getByRole('button', { name: 'Forgot password?' });
    }
  }

  await expect(forgotPasswordBtn).toBeVisible();
  await forgotPasswordBtn.click();

  await expect(drawer.getByText(/RESET PASSWORD/i)).toBeVisible();
  await expect(drawer.getByText(/Enter your registered email address/i)).toBeVisible();

  // Do not dispatch a real Firebase password-reset email from CI.
  // Static regression coverage verifies the neutral post-submit wording.
});

