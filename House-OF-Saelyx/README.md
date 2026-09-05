<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9fd90c38-837e-435e-b027-e53891c99a41

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Firebase Admin API configuration

The browser Firebase settings are not sufficient for protected admin API routes. Set these server-only variables in the local environment and in Vercel Project Settings > Environment Variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (the service-account private key, with newlines preserved or encoded as `\\n`)

Use a Firebase service-account key from Project settings > Service accounts. Never commit the key or put it in a `VITE_*` variable.


## Production hardening checklist

Before promoting a deployment to production:

1. Configure the Firebase browser variables and set `VITE_FIREBASE_ENABLE_REALTIME=true`.
2. Configure the server-only Firebase Admin variables: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
3. Add `saelyxe.com` and `www.saelyxe.com` to Firebase Authentication authorized domains and enable only the sign-in providers used by the UI.
4. Deploy `firestore.rules` after reviewing the target Firebase project. SAELYXE media uploads use signed Cloudinary uploads; Firebase Storage is not required.
5. For transactional email, configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Vercel. For Firebase Functions, set the same values with Firebase Functions secrets before deploying functions.
6. Do not mark PayPal orders as paid until the payment has been verified server-side against the linked PayPal order and completed capture.
7. Run `npm run lint` and `npm run build` before merging production changes.
