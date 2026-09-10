# SAELYXE Final Launch Runbook

This file is the single source of truth for the final production release.

## Release rule

- Use PR #59 as the only final release PR.
- Do not trigger feature-branch Vercel previews.
- Merge PR #59 to `main` only after the complete SAELYXE CI workflow is green.
- Allow one production deployment from `main`.

## Final release scope

The release includes the completed storefront/admin hardening pass:

- Admin Store Settings drive the live second-section countdown and automatic unlock.
- Hero headline, hero subheading, announcement bar, homepage section visibility, and spotlight background are wired to Store Settings.
- Hero parallax has been removed.
- Spotlight price now always uses the actual catalog product price; the legacy separate spotlight price control is retired so display and checkout amounts cannot diverge.
- Admin number inputs that begin at `0` select the placeholder zero on focus so entering `1` replaces it instead of creating an awkward `01` edit flow.
- Product badges using `PRE-ORDER`, `PRE ORDER`, or `PREORDER` render with a visible clock icon on storefront catalog cards and quick view; pre-order labeling is not hidden by zero stock.
- Customer checkout requires an authenticated SAELYXE account.
- Cash on Delivery is removed from customer checkout; live checkout accepts only PayPal and Payzy.
- Server order creation rejects guest checkout and rejects unsupported payment methods.
- Firebase Authentication, App Check, administrator authorization, destructive-action recent-authentication checks, and rate limiting remain enabled.
- Admin product media uses Firebase Storage through the protected server upload route.
- Legacy Cloudinary image origin is removed from the production CSP.
- Admin bootstrap reads are cached/deduplicated to reduce unnecessary Firestore load while realtime client listeners remain authoritative.
- Legal copy and regression tests are aligned with the account-only, PayPal/Payzy checkout policy.

## Required CI gate

The PR may be merged only when all of the following pass:

1. Security regression check.
2. Final launch readiness contract.
3. Production dependency vulnerability audit.
4. TypeScript check.
5. Production build.
6. Firestore authorization emulator tests.
7. Browser end-to-end security smoke.

## Production verification after merge

After Vercel deploys `main`, verify the following on `https://www.saelyxe.com`:

1. Home page, navigation, announcement bar, hero, spotlight countdown, and catalog render without runtime errors.
2. Admin console login works at the private SAELYXE admin route.
3. Product create/edit accepts price and stock numbers normally, including changing a zero value directly to `1`.
4. Product image upload succeeds through Firebase Storage.
5. A product with a pre-order badge visibly shows the pre-order clock badge on catalog cards/quick view.
6. Permanent product deletion succeeds for a freshly authenticated Super Admin and a blocked recent-auth attempt shows the security message instead of failing silently.
7. Direct `/checkout` access is retired and authenticated internal checkout navigation works.
8. Guest checkout and COD are unavailable.
9. PayPal and Payzy payment configuration endpoints respond correctly without exposing secrets.
10. `/api/health` returns the intentionally minimal public health payload.

If any production verification item fails, do not stack unrelated fixes onto `main`; repair it on a new branch and run the full CI gate again.
