import fs from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

const projectId = 'demo-saelyxe-rules';
const rules = fs.readFileSync('firestore.rules', 'utf8');

const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: { rules }
});

async function seed() {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'orders', 'order-owner'), {
      userId: 'customer-1',
      status: 'placed',
      paymentStatus: 'pending_verification',
      customerName: 'Customer One',
      email: 'customer@example.com',
      city: 'Colombo'
    });
    await setDoc(doc(db, 'users', 'customer-1'), {
      uid: 'customer-1',
      email: 'customer@example.com',
      role: 'patron',
      name: 'Customer One'
    });
    await setDoc(doc(db, 'admins', 'admin-1'), {
      email: 'ops@saelyxe.com',
      role: 'admin',
      status: 'active'
    });
    await setDoc(doc(db, 'admins', 'super-1'), {
      email: 'owner@saelyxe.com',
      role: 'super_admin',
      status: 'active'
    });
    await setDoc(doc(db, 'products', 'prod-1'), {
      id: 'prod-1',
      title: 'Test Product',
      priceLKR: 1000,
      stockCount: 1
    });
  });
}

try {
  await seed();

  const publicDb = testEnv.unauthenticatedContext().firestore();
  const customerDb = testEnv.authenticatedContext('customer-1', {
    email: 'customer@example.com',
    email_verified: true
  }).firestore();
  const newCustomerDb = testEnv.authenticatedContext('customer-new', {
    email: 'new@example.com',
    email_verified: true
  }).firestore();
  const escalationDb = testEnv.authenticatedContext('customer-escalation', {
    email: 'evil@example.com',
    email_verified: true
  }).firestore();
  const otherDb = testEnv.authenticatedContext('customer-2', {
    email: 'other@example.com',
    email_verified: true
  }).firestore();
  const adminDb = testEnv.authenticatedContext('admin-1', {
    email: 'ops@saelyxe.com',
    email_verified: true
  }).firestore();
  const unverifiedAdminDb = testEnv.authenticatedContext('admin-1', {
    email: 'ops@saelyxe.com',
    email_verified: false
  }).firestore();
  const superDb = testEnv.authenticatedContext('super-1', {
    email: 'owner@saelyxe.com',
    email_verified: true
  }).firestore();
  const unverifiedRootDb = testEnv.authenticatedContext('root-bootstrap', {
    email: 'saelyx.co+super@gmail.com',
    email_verified: false
  }).firestore();

  await assertSucceeds(getDoc(doc(publicDb, 'products', 'prod-1')));

  await assertSucceeds(setDoc(doc(newCustomerDb, 'users', 'customer-new'), {
    uid: 'customer-new',
    email: 'new@example.com',
    role: 'patron',
    name: 'Allowed Patron'
  }));
  await assertFails(setDoc(doc(escalationDb, 'users', 'customer-escalation'), {
    uid: 'customer-escalation',
    email: 'evil@example.com',
    role: 'admin',
    name: 'Escalation Attempt'
  }));

  await assertSucceeds(getDoc(doc(customerDb, 'orders', 'order-owner')));
  await assertFails(getDoc(doc(otherDb, 'orders', 'order-owner')));
  await assertSucceeds(updateDoc(doc(customerDb, 'orders', 'order-owner'), { city: 'Kandy' }));
  await assertFails(updateDoc(doc(customerDb, 'orders', 'order-owner'), { status: 'delivered' }));

  await assertSucceeds(getDoc(doc(adminDb, 'orders', 'order-owner')));
  await assertFails(getDoc(doc(unverifiedAdminDb, 'orders', 'order-owner')));
  await assertSucceeds(getDoc(doc(unverifiedRootDb, 'orders', 'order-owner')));
  await assertFails(updateDoc(doc(adminDb, 'products', 'prod-1'), { stockCount: 99 }));
  await assertFails(updateDoc(doc(superDb, 'products', 'prod-1'), { stockCount: 99 }));
  await assertFails(setDoc(doc(adminDb, 'audit_logs', 'forged'), {
    action: 'FORGED',
    timestamp: new Date().toISOString()
  }));
  await assertFails(setDoc(doc(adminDb, 'restock_dispatch_locks', 'prod-1'), {
    executionId: 'forged-client-lock',
    expiresAtMs: Date.now() + 60_000
  }));
  await assertFails(setDoc(doc(adminDb, 'stock_notifications', 'forged-waitlist'), {
    productId: 'prod-1',
    customerEmail: 'forged@example.com',
    status: 'pending'
  }));
  await assertFails(setDoc(doc(adminDb, 'subscribers', 'forged-subscriber'), {
    email: 'forged@example.com',
    status: 'subscribed'
  }));

  await assertSucceeds(setDoc(doc(superDb, 'admins', 'new-admin'), {
    email: 'new-admin@saelyxe.com',
    role: 'admin',
    status: 'active'
  }));
  await assertSucceeds(setDoc(doc(unverifiedRootDb, 'admins', 'root-created-admin'), {
    email: 'root-created-admin@saelyxe.com',
    role: 'admin',
    status: 'active'
  }));
  await assertFails(setDoc(doc(adminDb, 'admins', 'new-admin-2'), {
    email: 'new-admin-2@saelyxe.com',
    role: 'admin',
    status: 'active'
  }));

  await assertFails(deleteDoc(doc(customerDb, 'users', 'customer-1')));
  await assertSucceeds(deleteDoc(doc(superDb, 'users', 'customer-1')));

  console.log('SAELYXE Firestore emulator rules tests passed.');
} finally {
  await testEnv.cleanup();
}
