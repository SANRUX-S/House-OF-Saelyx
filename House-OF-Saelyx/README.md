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
