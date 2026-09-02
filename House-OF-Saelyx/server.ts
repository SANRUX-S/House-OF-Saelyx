import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';

export function createApp() {
  const app = express();
  app.use(express.json());

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

  app.post('/api/products', (req, res) => {
    try {
      const newProduct = db.addProduct(req.body);
      res.status(201).json(newProduct);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/products/:id', (req, res) => {
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

  app.delete('/api/products/:id', (req, res) => {
    try {
      const ok = db.deleteProduct(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Product not found' });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3. Orders & Hand-Delivery Tracking API
  app.get('/api/orders', (req, res) => {
    try {
      const orders = db.getOrders();
      res.json(orders);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/orders/:id', (req, res) => {
    try {
      const order = db.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found. Please check your order reference or phone number.' });
      }
      res.json(order);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Helper: Automated Order Confirmation Email Dispatch
  function sendOrderConfirmationEmail(order: any) {
    try {
      console.log(`\n======================================================`);
      console.log(`[SAELYX LUXURY EMAIL DISPATCH]`);
      console.log(`To: ${order.email}`);
      console.log(`Subject: Your SAELYX Order #${order.orderNumber} is Confirmed`);
      console.log(`Customer: ${order.customerName}`);
      console.log(`Order Number: #${order.orderNumber}`);
      console.log(`Date: ${order.createdAt}`);
      console.log(`Payment Method: ${order.paymentMethod || 'Cash on Delivery'} (${order.paymentStatus || 'Pending'})`);
      console.log(`Delivery Address: ${order.address}, ${order.city} ${order.postalCode}`);
      console.log(`Total: ${order.currencyUsed || 'LKR'} ${order.totalInCurrency || order.totalLKR}`);
      console.log(`Items: ${order.items?.map((i: any) => `${i.title} (${i.size}) × ${i.quantity}`).join(', ')}`);
      console.log(`Tracking Link: https://houseofsaelyx.com/track-order?id=${order.orderNumber}`);
      console.log(`======================================================\n`);
    } catch (e) {
      console.error('Email dispatch error:', e);
    }
  }

  app.post('/api/orders', (req, res) => {
    try {
      const newOrder = db.createOrder(req.body);
      sendOrderConfirmationEmail(newOrder);
      res.status(201).json(newOrder);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/orders/:id/status', (req, res) => {
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

  app.put('/api/settings', (req, res) => {
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
      const { email } = req.body;
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
  app.get('/api/staff', (req, res) => {
    try {
      res.json(db.getStaff());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/staff', (req, res) => {
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

  app.put('/api/staff/:id', (req, res) => {
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

  app.delete('/api/staff/:id', (req, res) => {
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
  app.get('/api/messages', (req, res) => {
    try {
      res.json(db.getMessages());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/messages', (req, res) => {
    try {
      const msg = db.addMessage(req.body);
      res.status(201).json(msg);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/messages/:id/status', (req, res) => {
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
  app.get('/api/audit-logs', (req, res) => {
    try {
      res.json(db.getAuditLogs());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/audit-logs', (req, res) => {
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
  app.get('/api/stock-notifications', (req, res) => {
    try {
      res.json(db.getStockNotifications());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/stock-notifications', (req, res) => {
    try {
      const notification = db.addStockNotification(req.body);
      res.status(201).json(notification);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/stock-notifications/:id', (req, res) => {
    try {
      const ok = db.deleteStockNotification(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Notification entry not found' });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Firebase Cloud Function trigger simulation & execution endpoint
  app.post('/api/functions/onStockReplenished', (req, res) => {
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
    console.log(`SAELYX Server running on http://localhost:${PORT}`);
  });
}

// Start standalone server if not in Vercel serverless environment
if (!process.env.VERCEL) {
  startServer();
}
