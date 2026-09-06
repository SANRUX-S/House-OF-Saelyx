# SAELYXE Final Launch Runbook

This file is the single source of truth for the final production release.

## Release rule

- Use PR #32 as the only final release PR.
- Do not trigger feature-branch Vercel previews.
- When the Vercel Hobby deployment limit clears, merge PR #32 to `main`.
- Allow one production deployment from `main`.
- Do not create another production deployment unless a real post-deploy defect requires one final hotfix batch.

## Current pre-deploy state

- Latest customer/order/security work is already based on current `main`.
- Temporary Cash on Delivery (COD) checkout is included for no-money end-to-end testing.
- COD orders remain unpaid as `cod_pending` and are never marked PayPal verified.
- PayPal refund routes remain restricted to verified PayPal payments.
- Legacy demo/test operational cleanup is prepared.
- Exact legacy test-product cleanup is prepared.
- Admin Security reports physical cleanup completion and deleted counts.
- Branch preview deployments are disabled; only `main` may deploy.
- Security regression, dependency audit, TypeScript, production build, Firestore authorization tests and browser E2E must remain green before merge.

## 36-point final launch grid

| # | Check | Pre-deploy status | Final completion rule |
|---|---|---|---|
| 1 | Super Admin login | Ready | Sign in successfully on production |
| 2 | Physical legacy fake/test data cleanup | Auto-clean prepared | Super Admin login triggers cleanup; Admin Security shows completed |
| 3 | Normal customer COD test order | Pending production | Customer account places a COD order |
| 4 | Real PayPal payment | Deferred if no funds | Complete later with explicit real-money approval |
| 5 | Customer order reaches Admin Orders | Pending production | Same COD order is visible in Admin |
| 6 | Stock decreases after confirmation | Pending production | Confirming COD order reduces stock by exact quantity |
| 7 | Confirmed status | Pending production | Placed → Confirmed succeeds |
| 8 | Confirmed email | Pending production | Customer receives Confirmed email |
| 9 | Packed status | Pending production | Confirmed → Packed succeeds |
| 10 | Packed email | Pending production | Customer receives Packed email |
| 11 | Dispatched with courier + tracking | Pending production | Packed → Dispatched succeeds only with real test courier/tracking values |
| 12 | Dispatched email | Pending production | Customer receives courier/tracking email |
| 13 | Customer tracking page | Pending production | Customer sees correct status/courier/tracking and no fake telemetry |
| 14 | Out for Delivery status | Pending production | Dispatched → Out for Delivery succeeds |
| 15 | Out for Delivery email | Pending production | Customer receives lifecycle email |
| 16 | Delivered status | Pending production | Out for Delivery → Delivered succeeds |
| 17 | Delivered email | Pending production | Customer receives Delivered email |
| 18 | Customer cancellation request | Pending production | A separate placed/confirmed/packed COD test order submits cancellation request |
| 19 | Admin cancellation visibility | Pending production | Admin sees reason and request state |
| 20 | Real PayPal refund | Deferred if no paid capture | Complete only against a real verified PayPal payment |
| 21 | Refund order state | Deferred | Verify refunded/cancelled state after real refund |
| 22 | Refund stock restore | Deferred | Verify eligible pre-dispatch stock restoration |
| 23 | Refund email | Deferred | Verify customer refund email |
| 24 | Customer Support form | Pending production | Submit a real support inquiry |
| 25 | Support appears in Admin | Pending production | New inquiry appears unread |
| 26 | Support Read/Reply/status | Pending production | Admin processes inquiry without fake local success |
| 27 | Sold-out Notify Me | Pending production | Customer submits restock request for a real sold-out product |
| 28 | Restock appears in Admin | Pending production | Request appears in real notification queue |
| 29 | Restock email | Pending production | Dispatch real restock notification and verify inbox |
| 30 | Audit Logs | Pending production | Confirm order/status/cancellation/support/restock/admin actions are logged |
| 31 | Mobile QA | Pre-deploy passed | Recheck production critical flows |
| 32 | Tablet QA | Pre-deploy passed | Recheck production critical flows |
| 33 | Desktop QA | Pre-deploy passed | Recheck storefront + Admin |
| 34 | Remove final QA records | Pending | Delete/clean only the test records created during final QA |
| 35 | Product completeness | Ready | Confirm live catalog has no legacy test products and required fields are complete |
| 36 | Launch sign-off | Pending | All non-deferred checks pass; deferred PayPal checks are clearly recorded |

## Exact production test sequence

1. Open the public production store in a private/incognito window.
2. Sign in with a normal customer account, not the Admin account.
3. Add one in-stock product to cart and note its current stock count.
4. Go to Checkout and select Cash on Delivery.
5. Place the COD order and record the order number.
6. In a separate normal Admin window, open Admin Orders.
7. Verify the same order appears with payment method COD and unpaid/COD-pending state.
8. Move the order through each allowed lifecycle stage in order.
9. At Confirmed, verify stock decreases exactly once.
10. At Dispatched, enter a deliberate test courier name and tracking number; never use fake built-in fallbacks.
11. Verify every lifecycle email in the customer inbox.
12. Verify the customer My Orders and Track Order pages after each relevant stage.
13. Create a second COD order for cancellation testing before dispatch.
14. Submit a cancellation request from the customer account and verify it in Admin.
15. Submit a real Support form and process it from Admin.
16. Submit a real Notify Me request on a sold-out product and verify the Admin queue.
17. Trigger a restock notification only to the test customer and verify delivery.
18. Review Audit Logs.
19. Check Admin Security cleanup status for legacy operations and exact legacy test products.
20. Remove only the QA records created during this run.
21. Recheck mobile, tablet and desktop production layouts.
22. Mark launch sign-off complete.

## Safety / non-negotiable rules

- Never mark COD as paid or PayPal verified.
- Never run a PayPal refund for COD.
- Never perform a real PayPal payment/refund without explicit real-money approval.
- Never delete real products, real customers, real orders, staff, settings or audit history during legacy cleanup.
- Never skip order lifecycle transitions.
- Require courier + tracking from Dispatched onward.
- Do not claim email delivery until the inbox is actually checked.
- Do not claim physical legacy cleanup until Admin Security reports the server marker as completed.
- Do not create extra Vercel deployments while the Hobby rolling limit is being preserved.

## Final release acceptance

The release is considered launch-ready when:

- PR #32 is merged into `main`.
- The single production deployment is READY.
- `www.saelyxe.com` serves that deployment.
- COD is visible below PayPal at checkout.
- The normal-customer COD flow passes from checkout to Admin.
- Inventory, lifecycle, email, tracking, cancellation, support, restock and audit checks pass.
- Legacy physical cleanup is confirmed.
- Final QA records are removed.
- Real PayPal payment/refund checks are either passed or explicitly deferred because no real-money test was authorized.
