import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import productionApi from './api/index.js';
import mediaUploadHandler from './api/media-upload.js';
import adminBootstrapHandler from './api/admin-bootstrap.js';
import adminHealthHandler from './api/admin-health.js';
import ordersGuardHandler from './api/orders-guard.js';
import maintenanceRetiredHandler from './api/maintenance-retired.js';

const LOCAL_CSP =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' https://*.paypal.com https://*.paypalobjects.com https://www.gstatic.com https://apis.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.paypal.com https://*.paypalobjects.com; " +
  "font-src 'self' https://fonts.gstatic.com data:; " +
  "img-src 'self' data: blob: https:; " +
  "connect-src 'self' https: wss: http://localhost:3000 ws:; " +
  "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://*.paypal.com https://*.paypalobjects.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/; " +
  "child-src 'self' https://*.paypal.com https://*.paypalobjects.com; " +
  "worker-src 'self' blob:; object-src 'none'; base-uri 'self'; " +
  "form-action 'self' https://*.paypal.com; frame-ancestors 'none';";

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Content-Security-Policy', LOCAL_CSP);
    next();
  });

  app.use(express.json({ limit: '4mb' }));

  // Mirror the exact dedicated production routes locally so development and CI
  // cannot silently exercise a weaker code path than Vercel production.
  app.get('/api/admin/bootstrap', adminBootstrapHandler);
  app.get('/api/admin/health', adminHealthHandler);
  app.post('/api/media/upload', mediaUploadHandler);
  app.post('/api/orders', ordersGuardHandler as any);
  app.post('/api/admin/maintenance/purge-legacy-demo-fixtures', maintenanceRetiredHandler as any);
  app.post('/api/admin/maintenance/purge-legacy-test-products', maintenanceRetiredHandler as any);

  app.use(productionApi);
  return app;
}

export async function startServer() {
  const app = createApp();
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SAELYXE Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  void startServer();
}
