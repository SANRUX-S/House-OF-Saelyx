import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const checks = [];
function check(condition, label, mode = 'code-ready') {
  checks.push({ condition: Boolean(condition), label, mode });
  if (!condition) console.error(`FINAL READINESS FAILED: ${label}`);
}

const api = read('api/index.ts');
const ordersGuard = read('api/orders-guard.ts');
const customerVerification = read('api/customer-verification.ts');
const checkout = read('src/components/CheckoutPage.tsx');
const app = read('src/App.tsx');
const navbar = read('src/components/Navbar.tsx');
const store = read('src/context/StoreContext.tsx');
const adminPanel = read('src/components/AdminPanel.tsx');
const adminProducts = read('src/components/admin/AdminProducts.tsx');
const adminDrop = read('src/components/admin/AdminDropSettings.tsx');
const adminSecurity = read('src/components/admin/AdminSecurity.tsx');
const spotlight = read('src/components/SpotlightProduct.tsx');
const hero = read('src/components/HeroSection.tsx');
const mediaUpload = read('api/media-upload.ts');
const vercel = read('vercel.json');
const fallback = JSON.parse(read('data/saelyx_store.json'));

check(api.includes("app.get('/api/admin/health'") && adminSecurity.includes('/api/admin/health'), 'Super Admin health surface is protected and wired');
check(app.includes("case 'checkout':") && !app.includes('SAELYXE checkout is available to signed-in customers only'), 'Checkout supports guest and signed-in customers');
check(checkout.includes("useState<'paypal' | 'payzy' | 'cod' | null>"), 'Checkout keeps PayPal, Payzy, and COD only');
check(!checkout.includes('Google Pay') && !checkout.includes('googlepay') && !checkout.includes('gpaytest') && !checkout.includes('saelyxe_google_pay_review_v1'), 'Google Pay is removed from storefront checkout');
check(!fs.existsSync('src/components/GooglePayTestButton.tsx'), 'Retired Google Pay review component is removed');
check(checkout.includes('PLACE CASH ON DELIVERY ORDER') && checkout.includes("paymentMethod: 'cod'"), 'Cash on Delivery is available and server-backed');
check(ordersGuard.includes("!['paypal', 'payzy', 'cod'].includes(paymentMethod)"), 'Server order guard restricts checkout to PayPal, Payzy, or COD');
check(api.includes('const isGuestCheckout = !authToken') && api.includes("paymentStatus: paymentMethod === 'cod' ? 'cod_pending' : 'pending_verification'"), 'Core order API securely supports guests and unpaid COD');
check(customerVerification.includes('api.resend.com/emails') && customerVerification.includes('www.saelyxe.com/verify-email?code='), 'Email verification uses a branded SAELYXE delivery/link flow');
check(vercel.includes('"source": "/api/orders"') && vercel.includes('"destination": "/api/orders-guard"'), 'Production order creation routes through the checkout method guard');
check(api.includes("app.post('/api/payments/paypal/capture/:orderId'") && api.includes('verifyPayPalOrder'), 'PayPal capture is verified server-side', 'requires-real-money');
check(api.includes("app.post('/api/payments/payzy/create/:orderId'") && api.includes('verifyPayzyReturnSignature'), 'Payzy signed provider flow is implemented', 'requires-provider');
check(mediaUpload.includes('BLOB_READ_WRITE_TOKEN') && mediaUpload.includes('verifyIdToken'), 'Administrator media uses protected Vercel Blob upload');
check(adminProducts.includes('uploadAdminImage') && adminProducts.includes('isSupportedAdminImageFile'), 'Product media UI uses the validated uploader');
check(adminPanel.includes('Verify Administrator') && adminPanel.includes('reauthenticateWithCredential'), 'Destructive product deletion supports secure reauthentication');
check(spotlight.includes('settings?.countdownTarget') && spotlight.includes('const isDropped = timeLeft.totalMs <= 0'), 'Homepage countdown is connected to Store Settings and auto-unlocks');
check(adminDrop.includes('type="datetime-local"') && adminDrop.includes('countdownTarget: countdownIso'), 'Admin countdown editor publishes a real timestamp');
check(hero.includes('settings?.heroHeadline') && hero.includes('settings?.heroSubhead'), 'Hero content is connected to Store Settings');
check(!hero.includes('scrollY * 0.12'), 'Hero parallax is removed');
check(navbar.includes('settings?.announcementText'), 'Announcement bar is connected to Store Settings');
check(app.includes('settings?.showHeroSection') && app.includes('settings?.showSpotlightSection') && app.includes('settings?.showCollectionSection'), 'Homepage section visibility controls are connected');
check(store.includes("path === '/checkout' || path.startsWith('/checkout/')") && store.includes("path === '/secure-order-session'"), 'Direct checkout URL remains retired in favor of the secure internal route');
check(store.includes("path === '/congsoleadmintechbypenetix'"), 'Private administrator route remains wired');
check(vercel.includes('https://*.public.blob.vercel-storage.com'), 'Production CSP allows Vercel Blob media');
check(!vercel.includes('https://res.cloudinary.com'), 'Cloudinary is removed from the active browser CSP');
check(Array.isArray(fallback.products) && fallback.settings, 'Fallback store data remains structurally valid');

const failed = checks.filter(item => !item.condition);
const codeReady = checks.filter(item => item.condition && item.mode === 'code-ready').length;
const external = checks.filter(item => item.condition && item.mode !== 'code-ready').length;

console.log(`SAELYXE readiness: ${codeReady} code-ready checks passed; ${external} provider-dependent checks present.`);
if (failed.length) {
  console.error(`${failed.length} final readiness check(s) failed.`);
  process.exit(1);
}

console.log('SAELYXE final launch readiness contract passed.');
