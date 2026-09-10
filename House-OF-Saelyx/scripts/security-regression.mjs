import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`SECURITY CHECK FAILED: ${message}`);
  }
}

const api = read('api/index.ts');
const ordersGuard = read('api/orders-guard.ts');
const mediaUpload = read('api/media-upload.ts');
const store = read('src/context/StoreContext.tsx');
const app = read('src/App.tsx');
const navbar = read('src/components/Navbar.tsx');
const checkout = read('src/components/CheckoutPage.tsx');
const googlePayTest = read('src/components/GooglePayTestButton.tsx');
const spotlight = read('src/components/SpotlightProduct.tsx');
const hero = read('src/components/HeroSection.tsx');
const adminPanel = read('src/components/AdminPanel.tsx');
const adminProducts = read('src/components/admin/AdminProducts.tsx');
const adminDrop = read('src/components/admin/AdminDropSettings.tsx');
const adminLogin = read('src/components/admin/AdminLogin.tsx');
const firebaseClient = read('src/lib/firebase.ts');
const rules = read('firestore.rules');
const vercel = read('vercel.json');
const indexHtml = read('index.html');
const seoManager = read('src/components/SEOManager.tsx');
const tracker = read('src/components/TrackOrderPage.tsx');
const adminSecurity = read('src/components/admin/AdminSecurity.tsx');

const trackingStart = api.indexOf("app.get('/api/orders/:id'");
const trackingEnd = api.indexOf("app.post('/api/orders/:id/cancellation-request'", trackingStart);
const trackingRoute = trackingStart >= 0 && trackingEnd > trackingStart ? api.slice(trackingStart, trackingEnd) : '';
assert(trackingRoute.length > 0, 'customer order tracking route must exist');
assert(trackingRoute.includes('authorizeCustomerOrderAccess(req, adminDb, order)'), 'order tracking must authorize ownership');
assert(trackingRoute.includes('hasValidAppCheck(req)'), 'order tracking must enforce App Check');
assert(!trackingRoute.includes('customerName:'), 'tracking response must not expose customer name');
assert(!trackingRoute.includes('phone:'), 'tracking response must not expose phone number');
assert(!trackingRoute.includes('address:'), 'tracking response must not expose street address');
assert(tracker.includes("'Not assigned yet'") && tracker.includes("'Pending courier update'"), 'tracking UI must not invent courier data');

assert(rules.includes("request.resource.data.role == 'patron'"), 'new customer profiles must remain patron-only');
assert(rules.includes('request.resource.data.role == resource.data.role'), 'profile updates must preserve role');
assert(rules.includes("data.status == 'active'"), 'admin records must be active');
assert(rules.includes('data.email == request.auth.token.email'), 'admin records must bind to authenticated email');
assert(rules.includes('allow create, update, delete: if false;'), 'server-owned sensitive collections must deny browser mutation');
assert(rules.includes("request.auth.token.email == 'saelyxe.co@gmail.com'"), 'bootstrap root must remain the configured root identity');
assert(!rules.includes("saelyx.co+admin@gmail.com") && !rules.includes("saelyx.co+super@gmail.com"), 'legacy administrator aliases must not retain access');

assert(firebaseClient.includes("adminData?.status === 'active'"), 'administrator login must require active staff records');
assert(firebaseClient.includes("'auth/too-many-requests'") && firebaseClient.includes("'auth/network-request-failed'"), 'administrator login must surface auth throttling/network failures');
assert(firebaseClient.includes('verifyAdminCredentialsViaServer(username, pass, rememberMe)'), 'administrator login must retain same-origin fallback');
assert(firebaseClient.includes('/api/admin/auth/session'), 'administrator fallback session restoration must exist');
assert(store.includes('getAdminAccessToken()'), 'admin API calls must use validated Firebase access tokens');
assert(store.includes('setOrders([]);') && store.includes('setMessages([]);') && store.includes('setStaffList([]);'), 'session loss must clear privileged state');
assert(adminLogin.includes('Admin Email') && adminLogin.includes('Password'), 'administrator login must stay email/password based');
assert(!adminLogin.includes('CONTINUE WITH GOOGLE'), 'administrator console must not expose social admin login');
assert(api.includes('hasRecentAuthentication(token)'), 'sensitive administrator actions must retain recent-auth protection');
assert(adminPanel.includes('Verify Administrator') && adminPanel.includes('reauthenticateWithCredential'), 'product deletion must reauthenticate without weakening backend security');

assert(store.includes('/api/admin/products/'), 'product writes must use the trusted admin API');
assert(store.includes('/api/admin/settings'), 'storefront settings writes must use the trusted admin API');
assert(adminProducts.includes('isSupportedAdminImageFile') && adminProducts.includes('uploadAdminImage'), 'product images must use the validated upload helper');
assert(mediaUpload.includes('BLOB_READ_WRITE_TOKEN'), 'admin media must use the connected Vercel Blob credential');
assert(mediaUpload.includes('hasValidAppCheck') || mediaUpload.includes('verifyToken'), 'media upload must validate App Check');
assert(mediaUpload.includes('verifyIdToken'), 'media upload must validate Firebase administrator identity');
assert(!mediaUpload.includes('CLOUDINARY_API_SECRET'), 'Cloudinary secrets must not return to the media path');

assert(app.includes("case 'checkout':") && app.includes('if (!user)'), 'storefront must block guest checkout before rendering payment UI');
assert(app.includes('SAELYXE checkout is available to signed-in customers only'), 'guest checkout block must explain the requirement');
assert(checkout.includes("useState<'paypal' | 'payzy' | 'googlepay' | null>"), 'checkout may expose the isolated Google Pay review mode in addition to live PayPal/Payzy');
assert(checkout.includes("saelyxe_google_pay_review_v1") && checkout.includes("gpaytest"), 'Google Pay review UI must remain explicitly gated');
assert(googlePayTest.includes("environment: 'TEST'"), 'Google Pay review flow must stay in the non-chargeable TEST environment');
assert(googlePayTest.includes("gateway: 'example'") && googlePayTest.includes("gatewayMerchantId: 'exampleGatewayMerchantId'"), 'Google Pay review flow must use test tokenization only');
assert(googlePayTest.includes('no card can be charged') && checkout.includes('no production order was created'), 'Google Pay review flow must not masquerade as a live paid order');
assert(!checkout.includes("paymentMethod: 'googlepay'"), 'Google Pay review mode must not persist production orders before a real processor is connected');
assert(!checkout.includes("paymentMethod: 'cod'"), 'checkout must not create Cash on Delivery orders');
assert(!checkout.includes('PLACE CASH ON DELIVERY ORDER'), 'checkout must not expose a Cash on Delivery action');
assert(!checkout.includes('createCodCheckoutAttemptId'), 'COD idempotency flow must be removed from customer checkout');
assert(ordersGuard.includes('verifyIdToken'), 'order-creation guard must cryptographically verify the customer Firebase token');
assert(ordersGuard.includes("!['paypal', 'payzy'].includes(paymentMethod)"), 'order-creation guard must reject non-live payment methods');
assert(ordersGuard.includes('email_verified !== true'), 'order-creation guard must require a verified account');
assert(vercel.includes('"source": "/api/orders"') && vercel.includes('"destination": "/api/orders-guard"'), 'production order creation must pass through the account-only guard');

assert(api.includes("app.post('/api/payments/paypal/capture/:orderId'"), 'PayPal server capture route must exist');
assert(api.includes('verifyPayPalOrder'), 'PayPal provider result must be verified server-side');
assert(api.includes("app.post('/api/payments/payzy/create/:orderId'"), 'Payzy checkout creation route must exist');
assert(api.includes('verifyPayzyReturnSignature'), 'Payzy provider return signature must be verified server-side');
assert(api.includes("app.post('/api/admin/orders/:id/refund'"), 'Super Admin PayPal refund endpoint must remain available');
assert(api.includes('paymentCaptureId'), 'PayPal capture ID must be persisted for refunds');

assert(spotlight.includes('settings?.countdownTarget'), 'spotlight countdown must use the admin-managed target');
assert(spotlight.includes('const isDropped = timeLeft.totalMs <= 0'), 'spotlight must unlock from the real countdown target');
assert(!spotlight.includes('const isDropped = false'), 'spotlight release state must not be hardcoded');
assert(adminDrop.includes('type="datetime-local"'), 'admin countdown must use a safe date/time control');
assert(hero.includes('settings?.heroHeadline') && hero.includes('settings?.heroSubhead'), 'hero copy must use admin settings');
assert(!hero.includes('scrollY * 0.12'), 'hero parallax must remain removed');
assert(navbar.includes('settings?.announcementText'), 'announcement bar must be connected to admin settings');
assert(navbar.includes('fixed top-0') && navbar.includes('{announcementText &&'), 'announcement must be integrated with fixed navigation without overlay duplication');

assert(store.includes("path === '/congsoleadmintechbypenetix'"), 'private administrator route must remain available');
assert(store.includes("path === '/admin'") && store.includes("path === '/atelier-console'"), 'legacy admin routes must remain retired');
assert(vercel.includes('"Content-Security-Policy"'), 'production CSP must be enforced');
assert(!vercel.includes('Content-Security-Policy-Report-Only'), 'CSP must not be report-only');
assert(vercel.includes("script-src-attr 'none'"), 'inline script attributes must be blocked');
assert(vercel.includes('https://*.public.blob.vercel-storage.com'), 'CSP must allow product media from Vercel Blob');
assert(vercel.includes('https://pay.google.com'), 'CSP must allow the official Google Pay web library in gated review mode');
assert(!vercel.includes('https://res.cloudinary.com'), 'unused Cloudinary image origin must be removed from CSP');
assert(!indexHtml.includes('<script type="application/ld+json">'), 'static HTML must not require inline JSON-LD');
assert(seoManager.includes("'application/ld+json'"), 'SEO structured data must be injected by trusted application code');
assert(adminSecurity.includes('/api/admin/health'), 'admin health panel must use protected diagnostics');

if (failures > 0) {
  console.error(`\n${failures} security regression check(s) failed.`);
  process.exit(1);
}

console.log('SAELYXE security regression checks passed.');
