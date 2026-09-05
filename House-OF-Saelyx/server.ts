import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { requireAdmin, requireAuthenticated, requireSuperAdmin } from './server/auth.js';

export function createApp() {
  const app = express();
  const requestCounts = new Map<string, { count: number; resetAt: number }>();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.paypal.com https://*.paypalobjects.com https://www.gstatic.com https://apis.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.paypal.com https://*.paypalobjects.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https: wss: http://localhost:3000 ws:; frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://*.paypal.com https://*.paypalobjects.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/; child-src 'self' https://*.paypal.com https://*.paypalobjects.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self' https://*.paypal.com; frame-ancestors 'none';"
    );
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  app.use((req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const current = requestCounts.get(key);
    if (!current || current.resetAt <= now) {
      requestCounts.set(key, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    current.count += 1;
    if (current.count > 240) return res.status(429).json({ error: 'Too many requests. Try again shortly.' });
    return next();
  });
  const adminOnly = requireAdmin;

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 2. Products API
  app.get('/api/products', (req, res) => {
    try {
      let products = db.getProducts();
      const { category, search } = req.query;

      if (category && category !== 'all') {
        if (category === 'new') {
          products = products.filter(p => p.category === 'new' || p.badge?.includes('DROP') || p.badge?.includes('NEW'));
        } else {
          products = products.filter(p => p.category === category || p.subCategory?.toLowerCase() === (category as string).toLowerCase());
        }
      }

      if (search && typeof search === 'string') {
        const query = search.toLowerCase();
        products = products.filter(p =>
          p.title.toLowerCase().includes(query) ||
          p.subtitle.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
        );
      }

      res.json(products);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/products/:id', (req, res) => {
    try {
      const product = db.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/products', adminOnly, (req, res) => {
    try {
      const newProduct = db.addProduct(req.body);
      res.status(201).json(newProduct);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/products/:id', adminOnly, (req, res) => {
    try {
      const updated = db.updateProduct(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/products/:id', adminOnly, (req, res) => {
    try {
      const ok = db.deleteProduct(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Product not found' });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3. Orders & Hand-Delivery Tracking API
  app.get('/api/orders', adminOnly, (req, res) => {
    try {
      const orders = db.getOrders();
      res.json(orders);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/orders/:id', requireAuthenticated, (req, res) => {
    try {
      const order = db.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      const auth = (req as express.Request & { auth?: { uid?: string; email?: string; admin?: boolean; role?: string } }).auth;
      const isAdmin =
        auth?.admin === true ||
        auth?.role === 'admin' ||
        auth?.role === 'super_admin';
      if (order.userId !== auth?.uid && !isAdmin) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      res.json({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        trackingNumber: order.trackingNumber || '',
        courierName: order.courierName || '',
        deliveryEta: order.deliveryEta || '',
        statusHistory: order.statusHistory || [],
        createdAt: order.createdAt,
        city: order.city || '',
        country: order.country || '',
        items: (order.items || []).map(item => ({
          productId: item.productId,
          title: item.title,
          image: item.image,
          size: item.size,
          quantity: item.quantity
        }))
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Helper: Automated Order Confirmation Email Dispatch
  function sendOrderConfirmationEmail(order: any) {
    try {
      console.log(`[SAELYXE] Order confirmation queued for order ${order.orderNumber}`);
    } catch (e) {
      console.error('Email dispatch error:', e);
    }
  }

  app.post('/api/orders', (req, res) => {
    try {
      const body = req.body || {};
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length || items.length > 50) {
        return res.status(400).json({ error: 'Order must contain valid items' });
      }

      const validatedItems = items.map((item: any) => {
        const product = db.getProductById(String(item.productId || ''));
        const quantity = Number(item.quantity);
        if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
          throw new Error('Invalid product or quantity');
        }
        if (!product.inStock || (product.stockCount || 0) < quantity) {
          throw new Error(`Insufficient stock for ${product.title}`);
        }
        return {
          productId: product.id,
          title: product.title,
          image: product.images?.[0] || '',
          priceLKR: product.priceLKR,
          size: typeof item.size === 'string' ? item.size.slice(0, 20) : '',
          quantity
        };
      });

      const subtotalLKR = validatedItems.reduce((sum: number, item: any) => sum + item.priceLKR * item.quantity, 0);
      const shippingLKR = subtotalLKR > 50000 ? 0 : 2500;
      if (body.paymentMethod !== 'paypal') return res.status(400).json({ error: 'PayPal is the only supported payment method.' });
      const paymentMethod = 'paypal';
      const safeOrder = {
        ...body,
        items: validatedItems,
        subtotalLKR,
        shippingLKR,
        totalLKR: subtotalLKR + shippingLKR,
        paymentMethod,
        paymentStatus: 'pending_verification',
        status: 'placed',
        trackingNumber: undefined,
        orderNumber: undefined
      };
      const newOrder = db.createOrder(safeOrder);
      sendOrderConfirmationEmail(newOrder);
      res.status(201).json(newOrder);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/orders/:id/status', adminOnly, (req, res) => {
    try {
      const { status, note, location, trackingNumber, courierName, deliveryEta } = req.body;
      const updated = db.updateOrderStatus(
        req.params.id,
        status,
        note,
        location,
        trackingNumber,
        courierName,
        deliveryEta
      );
      if (!updated) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // 4. Drop Settings & Countdown API
  app.get('/api/settings', (req, res) => {
    try {
      const settings = db.getSettings();
      res.json(settings);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/settings', adminOnly, (req, res) => {
    try {
      const updated = db.updateSettings(req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // 5. Newsletter API
  app.post('/api/newsletter', (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return res.status(400).json({ error: 'Valid email address required.' });
      }
      const result = db.subscribeNewsletter(email);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // 6. Currencies Exchange Rates API
  app.get('/api/currencies', (req, res) => {
    // Real-world conversion values anchored to LKR (Sri Lankan Rupee)
    const currencies = [
      { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', rateFromLKR: 1, symbolPosition: 'before', flag: '🇱🇰' },
      { code: 'USD', symbol: '$', name: 'US Dollar', rateFromLKR: 0.0033, symbolPosition: 'before', flag: '🇺🇸' },
      { code: 'EUR', symbol: '€', name: 'Euro', rateFromLKR: 0.0031, symbolPosition: 'before', flag: '🇪🇺' },
      { code: 'GBP', symbol: '£', name: 'British Pound', rateFromLKR: 0.0026, symbolPosition: 'before', flag: '🇬🇧' },
      { code: 'AED', symbol: 'AED', name: 'UAE Dirham', rateFromLKR: 0.0121, symbolPosition: 'before', flag: '🇦🇪' },
      { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rateFromLKR: 0.0051, symbolPosition: 'before', flag: '🇦🇺' },
      { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rateFromLKR: 0.0044, symbolPosition: 'before', flag: '🇸🇬' },
      { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rateFromLKR: 0.0045, symbolPosition: 'before', flag: '🇨🇦' },
      { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateFromLKR: 0.28, symbolPosition: 'before', flag: '🇮🇳' },
      { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateFromLKR: 0.51, symbolPosition: 'before', flag: '🇯🇵' }
    ];
    res.json(currencies);
  });

  // 7. Staff Management API (Super Admin)
  app.get('/api/staff', adminOnly, (req, res) => {
    try {
      res.json(db.getStaff());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/staff', requireSuperAdmin, (req, res) => {
    try {
      const newStaff = db.addStaff(req.body);
      db.addAuditLog({
        actor: req.body.createdBy || 'Super Admin',
        role: 'super_admin',
        action: 'STAFF_MEMBER_CREATED',
        details: `Created staff profile for @${newStaff.username} (${newStaff.displayName}) with role ${newStaff.role}`,
        ipAddress: req.ip
      });
      res.status(201).json(newStaff);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/staff/:id', requireSuperAdmin, (req, res) => {
    try {
      const updated = db.updateStaff(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Staff member not found' });
      db.addAuditLog({
        actor: 'Super Admin',
        role: 'super_admin',
        action: 'STAFF_MEMBER_MODIFIED',
        details: `Updated permissions or status for @${updated.username}`,
        ipAddress: req.ip
      });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/staff/:id', requireSuperAdmin, (req, res) => {
    try {
      const ok = db.deleteStaff(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Staff member not found' });
      db.addAuditLog({
        actor: 'Super Admin',
        role: 'super_admin',
        action: 'STAFF_MEMBER_TERMINATED',
        details: `Revoked access credentials for staff ID: ${req.params.id}`,
        ipAddress: req.ip
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 8. Contact & Concierge Messages API
  app.get('/api/messages', adminOnly, (req, res) => {
    try {
      res.json(db.getMessages());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/messages', (req, res) => {
    try {
      const body = req.body || {};
      const topicValues = ['order_inquiry', 'bespoke_sizing', 'concierge', 'press', 'authenticity', 'other'];
      const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const message = typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : '';
      if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !topicValues.includes(body.topic)) {
        return res.status(400).json({ error: 'Name, valid email, topic, and message are required.' });
      }
      const msg = db.addMessage({ name, email, message, topic: body.topic, phone: typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : '' });
      res.status(201).json(msg);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/messages/:id/status', adminOnly, (req, res) => {
    try {
      const { status, replyNotes } = req.body;
      const updated = db.updateMessageStatus(req.params.id, status, replyNotes);
      if (!updated) return res.status(404).json({ error: 'Message not found' });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // 9. Security Audit Logs API
  app.get('/api/audit-logs', adminOnly, (req, res) => {
    try {
      res.json(db.getAuditLogs());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/audit-logs', requireSuperAdmin, (req, res) => {
    try {
      const log = db.addAuditLog({
        ...req.body,
        ipAddress: req.ip
      });
      res.status(201).json(log);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // 10. Back-in-Stock Notifications & Firebase Cloud Functions API
  app.get('/api/stock-notifications', adminOnly, (req, res) => {
    try {
      res.json(db.getStockNotifications());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/stock-notifications', (req, res) => {
    try {
      const body = req.body || {};
      const email = typeof body.customerEmail === 'string' ? body.customerEmail.trim().toLowerCase() : '';
      const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
      const product = db.getProductById(productId);
      if (!product || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Valid product and email are required.' });
      }
      const notification = db.addStockNotification({
        productId: product.id,
        productTitle: product.title,
        productSlug: product.slug,
        productImage: product.images?.[0],
        selectedSize: typeof body.selectedSize === 'string' ? body.selectedSize.slice(0, 20) : 'Any Size',
        customerEmail: email,
        customerName: typeof body.customerName === 'string' ? body.customerName.slice(0, 120) : '',
        phone: typeof body.phone === 'string' ? body.phone.slice(0, 30) : '',
        channel: ['email', 'app', 'both'].includes(body.channel) ? body.channel : 'email'
      });
      res.status(201).json(notification);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/stock-notifications/:id', adminOnly, (req, res) => {
    try {
      const ok = db.deleteStockNotification(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Notification entry not found' });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Firebase Cloud Function trigger simulation & execution endpoint
  app.post('/api/functions/onStockReplenished', requireSuperAdmin, (req, res) => {
    try {
      const { productId } = req.body;
      const result = db.triggerRestockCloudFunction(productId);
      res.json({
        success: true,
        trigger: 'Firebase Cloud Functions (onStockReplenished / onDocumentUpdated)',
        timestamp: new Date().toISOString(),
        ...result
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return app;
}

export async function startServer() {
  const app = createApp();
  const PORT = Number(process.env.PORT) || 3000;

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SAELYXE Server running on http://localhost:${PORT}`);
  });
}

// Start standalone server if not in Vercel serverless environment
if (!process.env.VERCEL) {
  startServer();
}
