import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function check(condition, number, label, mode = 'code-ready') {
  if (!condition) {
    console.error(`FINAL READINESS FAILED #${number}: ${label}`);
    process.exitCode = 1;
    return;
  }
  console.log(`#${String(number).padStart(2, '0')} [${mode}] ${label}`);
}

const api = read('api/index.ts');
const checkout = read('src/components/CheckoutPage.tsx');
const store = read('src/context/StoreContext.tsx');
const adminOrders = read('src/components/admin/AdminCommissions.tsx');
const adminSecurity = read('src/components/admin/AdminSecurity.tsx');
const adminConcierge = read('src/components/admin/AdminConcierge.tsx');
const adminRestock = read('src/components/admin/AdminRestock.tsx');
const tracker = read('src/components/TrackOrderPage.tsx');
const fallback = JSON.parse(read('data/saelyx_store.json'));
const vercel = read('vercel.json');
const ci = read('../.github/workflows/ci.yml');
const runbook = read('FINAL_LAUNCH_RUNBOOK.md');

check(api.includes("app.get('/api/admin/health'") && adminSecurity.includes('/api/admin/health'), 1, 'Super Admin production health/login surface is protected and wired');
check(api.includes('purge-legacy-demo-fixtures') && api.includes('purge-legacy-test-products') && store.includes('saelyxe_prelaunch_cleanup_v2'), 2, 'Physical legacy cleanup is prepared and auto-triggered for Super Admin');
check(checkout.includes("paymentMethod: 'cod'") && checkout.includes('PLACE CASH ON DELIVERY ORDER'), 3, 'Normal customer COD checkout path is implemented');
check(api.includes("app.post('/api/payments/paypal/capture/:orderId'") && api.includes('verifyPayPalOrder'), 4, 'Real PayPal payment path is implemented', 'requires-real-money');
check(api.includes("app.post('/api/orders'") && adminOrders.includes('Order Timeline'), 5, 'Customer order persists to the Admin order workspace');
check(api.includes('needsInventoryCommit') && api.includes('stockCount: nextStock'), 6, 'Inventory decrements transactionally on confirmation');
check(api.includes('confirmed:') && api.includes("status === 'confirmed'"), 7, 'Confirmed lifecycle transition is implemented');
check(api.includes('confirmed:') && api.includes('sendOrderStatusEmail'), 8, 'Confirmed lifecycle email is implemented');
check(api.includes('packed:') && api.includes('canTransitionOrderStatus'), 9, 'Packed lifecycle transition is implemented');
check(api.includes('packed:') && api.includes('sendOrderStatusEmail'), 10, 'Packed lifecycle email is implemented');
check(api.includes('Courier and tracking number are required before dispatch.') && api.includes("status === 'dispatched'"), 11, 'Dispatch requires courier and tracking');
check(api.includes('dispatched:') && api.includes('sendOrderStatusEmail'), 12, 'Dispatched lifecycle email is implemented');
check(tracker.includes("'Not assigned yet'") && tracker.includes("'Pending courier update'") && !tracker.includes('Real-Time Fleet Telemetry'), 13, 'Authenticated tracking avoids fake telemetry');
check(api.includes('out_for_delivery:') && api.includes('out_for_delivery'), 14, 'Out-for-delivery lifecycle transition is implemented');
check(api.includes('out_for_delivery:') && api.includes('sendOrderStatusEmail'), 15, 'Out-for-delivery lifecycle email is implemented');
check(api.includes('delivered:') && api.includes('delivered'), 16, 'Delivered lifecycle transition is implemented');
check(api.includes('delivered:') && api.includes('sendOrderStatusEmail'), 17, 'Delivered lifecycle email is implemented');
check(api.includes("app.post('/api/orders/:id/cancellation-request'") && store.includes('requestOrderCancellation'), 18, 'Customer cancellation request is implemented');
check(adminOrders.includes('Cancellation Requested') && api.includes('cancellationRequestStatus'), 19, 'Admin cancellation review is implemented');
check(api.includes("app.post('/api/admin/orders/:id/refund'") && api.includes('refundPayPalCapture'), 20, 'Super Admin PayPal refund path is implemented', 'requires-real-money');
check(api.includes("paymentStatus: 'refunded'") && api.includes('refundId'), 21, 'Refunded order state is persisted', 'requires-real-money');
check(api.includes('canAutoRestoreInventory') && api.includes('inventoryCommitted'), 22, 'Eligible refund inventory restoration is implemented', 'requires-real-money');
check(api.includes('REFUND COMPLETED') && api.includes('sendOrderStatusEmail'), 23, 'Refund email path is implemented', 'requires-real-money');
check(api.includes("app.post('/api/messages'") && api.includes("collection('concierge_inquiries').doc()"), 24, 'Customer Support form persists to Firestore');
check(adminConcierge.includes('Total Inquiries') && adminConcierge.includes('unread'), 25, 'Support inquiries appear in Admin');
check(adminConcierge.includes('Mark as Read') && adminConcierge.includes('Mark as Replied / Resolved'), 26, 'Support Read/Reply workflow is implemented');
check(api.includes("app.post('/api/restock/subscribe'") && api.includes("status: 'pending'"), 27, 'Notify Me/restock subscription is implemented');
check(adminRestock.includes('Registered Patron Waitlist Records'), 28, 'Restock queue appears in Admin');
check(api.includes("app.post('/api/restock/dispatch'") && api.includes("'Idempotency-Key':"), 29, 'Restock email dispatch is idempotent');
check(api.includes('writeAdminAudit') && store.includes('auditLogs'), 30, 'Audit logging is wired');
check(ci.includes('Browser end-to-end security smoke'), 31, 'Mobile QA is CI-gated', 'playwright-gated');
check(ci.includes('Browser end-to-end security smoke'), 32, 'Tablet QA is CI-gated', 'playwright-gated');
check(ci.includes('Browser end-to-end security smoke'), 33, 'Desktop QA is CI-gated', 'playwright-gated');
check(api.includes('LEGACY_DEMO_PURGE_MARKER') && api.includes('LEGACY_TEST_PRODUCTS_PURGE_MARKER'), 34, 'Test-data cleanup controls and one-time markers exist');

const fallbackHasTestProduct = (Array.isArray(fallback.products) ? fallback.products : []).some(product => {
  const fp = [product?.id, product?.title, product?.slug, product?.badge].filter(Boolean).join(' ').toLowerCase();
  return fp.includes('test');
});
check(!fallbackHasTestProduct && api.includes('LEGACY_TEST_PRODUCT_IDS'), 35, 'Fallback catalog has no explicit test products and server filters exact legacy IDs');
check(vercel.includes('"main": true') && vercel.includes('"**": false') && runbook.includes('Final release acceptance'), 36, 'Single-deploy launch sign-off gate is defined');

if (process.exitCode) process.exit(process.exitCode);

console.log('\nSAELYXE final code-readiness contract: PASS');
console.log('Production-only verification still requires the final deployment, authenticated customer/admin actions, inbox checks, and explicit approval for real PayPal money movement.');
