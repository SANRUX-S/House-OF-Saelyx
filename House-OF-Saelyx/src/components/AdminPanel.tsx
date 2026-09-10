import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import '../styles/admin.css';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { auth, getAppCheckRequestHeaders } from '../lib/firebase';

import { AdminLayout } from './admin/AdminLayout';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminProducts } from './admin/AdminProducts';
import { AdminCommissions } from './admin/AdminCommissions';
import { AdminConcierge } from './admin/AdminConcierge';
import { AdminRestock } from './admin/AdminRestock';
import { AdminStaffView } from './admin/AdminStaff';
import { AdminSecurity } from './admin/AdminSecurity';
import { AdminDropSettings } from './admin/AdminDropSettings';
import { AdminLogin } from './admin/AdminLogin';

type AdminTab = 'overview' | 'products' | 'orders' | 'messages' | 'restock' | 'staff' | 'security' | 'drop-config';

type AdminDialog = {
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm?: () => Promise<void> | void;
};

function safeApiError(status: number, payload: any, fallback: string) {
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error.trim();
  if (status === 401) return 'App integrity verification failed. Refresh the admin page and retry.';
  if (status === 403) return 'Administrator access expired. Sign out and sign in again.';
  if (status === 428) return 'For security, please sign out and sign in again before this sensitive action.';
  if (status === 429) return 'Too many requests were sent. Wait a moment and retry.';
  return fallback;
}

async function readJsonResponse(response: Response) {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const text = await response.text();
  if (!contentType.includes('application/json')) {
    if (/^\s*(<!doctype html|<html)/i.test(text) || contentType.includes('text/html')) {
      throw new Error('The admin API returned HTML instead of JSON. The API route is not being reached correctly.');
    }
    throw new Error('The admin API returned an unexpected response.');
  }
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('The admin API returned invalid JSON.');
  }
}

function getHeaderMeta(activeTab: AdminTab) {
  switch (activeTab) {
    case 'products': return { title: 'Products', subtitle: 'Manage products, imagery, fabric specifications, and inventory.', breadcrumb: [{ label: 'Operations' }, { label: 'Products' }] };
    case 'orders': return { title: 'Orders', subtitle: 'Manage customer orders, payment state, fulfillment, and delivery details.', breadcrumb: [{ label: 'Operations' }, { label: 'Orders' }] };
    case 'messages': return { title: 'Customer Support', subtitle: 'Review customer messages and keep support requests moving.', breadcrumb: [{ label: 'Operations' }, { label: 'Customer Support' }] };
    case 'restock': return { title: 'Restock', subtitle: 'Review waitlist demand and send verified restock notifications.', breadcrumb: [{ label: 'Operations' }, { label: 'Restock' }] };
    case 'staff': return { title: 'Staff', subtitle: 'Manage administrator access, roles, activation, and revocation.', breadcrumb: [{ label: 'Administration' }, { label: 'Staff' }] };
    case 'security': return { title: 'Security', subtitle: 'Review protected service health, authorization controls, and backups.', breadcrumb: [{ label: 'Administration' }, { label: 'Security & Audit' }] };
    case 'drop-config': return { title: 'Store Settings', subtitle: 'Manage homepage content, thresholds, imagery, and visibility.', breadcrumb: [{ label: 'Administration' }, { label: 'Store Settings' }] };
    default: return { title: 'Dashboard', subtitle: 'Manage SAELYXE operations with care and precision.', breadcrumb: [{ label: 'Dashboard' }] };
  }
}

export const AdminPanel: React.FC = () => {
  const {
    products,
    orders,
    messages,
    logAuditEvent,
    settings,
    stockNotifications,
    triggerStockReplenishedFunction,
    formatPrice,
    user,
    loginAdmin,
    logout,
    navigateTo,
    refetchData,
    updateOrderStatus,
    hasMoreAdminOrders,
    loadOlderOrders,
    updateMessageStatus,
    saveProduct,
    staffList,
    addStaff,
    activateStaff,
    updateStaffRole,
    deleteStaff,
    updateSettings
  } = useStore();

  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    try {
      const tabParam = new URLSearchParams(window.location.search).get('tab') as AdminTab;
      if (tabParam && ['overview', 'products', 'orders', 'messages', 'restock', 'staff', 'security', 'drop-config'].includes(tabParam)) return tabParam;
    } catch (error) {
      console.warn('Admin URL state note:', error);
    }
    return 'overview';
  });
  const [customDialog, setCustomDialog] = useState<AdminDialog | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      () => setFirebaseAuthReady(true),
      () => setFirebaseAuthReady(true)
    );
    return unsubscribe;
  }, []);

  // When Firebase already has a signed-in user, wait until StoreContext has finished
  // translating that Firebase session into the application admin user before rendering login.
  const isAuthHydrating = !firebaseAuthReady || Boolean(auth.currentUser && !user);

  useEffect(() => {
    const superAdminOnlyTabs: AdminTab[] = ['staff', 'security', 'drop-config'];
    if (firebaseAuthReady && !isSuperAdmin && superAdminOnlyTabs.includes(activeTab)) {
      setActiveTab('overview');
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'overview');
        window.history.replaceState(null, '', url.toString());
      } catch (error) {
        console.warn('Admin permission URL sync note:', error);
      }
    }
  }, [activeTab, firebaseAuthReady, isSuperAdmin]);

  const handleSwitchTab = (tab: AdminTab) => {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState(null, '', url.toString());
    } catch (error) {
      console.warn('Admin tab URL sync note:', error);
    }
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setActiveTab('products');
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'products');
      window.history.pushState(null, '', url.toString());
    } catch (error) {
      console.warn('Admin product URL sync note:', error);
    }
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = (id: string) => {
    if (!isSuperAdmin) {
      setCustomDialog({ type: 'alert', title: 'Access Restricted', message: 'Only Super Admins may permanently retire products.' });
      return;
    }

    setCustomDialog({
      type: 'confirm',
      title: 'Retire Product',
      message: 'Are you sure you want to permanently retire this product from the catalogue?',
      confirmLabel: 'Retire Product',
      onConfirm: async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setCustomDialog({ type: 'alert', title: 'Authentication Required', message: 'Please sign out and sign in again before deleting a product.' });
          return;
        }

        try {
          const token = await currentUser.getIdToken();
          const appCheckHeaders = await getAppCheckRequestHeaders();
          const response = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
              ...appCheckHeaders
            },
            cache: 'no-store'
          });
          const payload = await readJsonResponse(response);
          if (!response.ok) {
            const message = response.status === 428
              ? 'For security, please sign out and sign in again before permanently deleting a product.'
              : safeApiError(response.status, payload, 'Product deletion failed.');
            setCustomDialog({ type: 'alert', title: 'Product Delete Failed', message });
            return;
          }
          await refetchData();
          setCustomDialog(null);
        } catch (error) {
          setCustomDialog({
            type: 'alert',
            title: 'Product Delete Failed',
            message: error instanceof Error ? error.message : 'Unable to delete the product.'
          });
        }
      }
    });
  };

  const handleDeleteStaff = (id: string, name: string) => {
    if (!isSuperAdmin) return;
    setCustomDialog({
      type: 'confirm',
      title: 'Revoke Administrator Access',
      message: `Revoke administrator access for ${name}? This clears SAELYXE admin claims and revokes refresh tokens.`,
      confirmLabel: 'Revoke Access',
      onConfirm: async () => {
        const result = await deleteStaff(id);
        if (!result.success) {
          setCustomDialog({ type: 'alert', title: 'Access Revoke Failed', message: result.error || 'Unable to revoke this staff account.' });
          return;
        }
        setCustomDialog(null);
      }
    });
  };

  const handleTriggerRestock = async (productId?: string): Promise<{ success: boolean; message: string }> => {
    if (!productId) return { success: false, message: 'Please select a product.' };
    try {
      const result = await triggerStockReplenishedFunction(productId);
      if (!result.success) return { success: false, message: result.error || 'Failed to send restock notifications.' };
      await refetchData();
      return { success: true, message: `Restock dispatch completed. Processed ${result.processedCount || 0} notification(s).` };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Restock dispatch failed.' };
    }
  };

  const handleExportDatabase = async () => {
    if (!isSuperAdmin) return;
    if (!window.confirm('Export a protected administrator database snapshot? This file contains personal and operational data.')) return;
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setCustomDialog({ type: 'alert', title: 'Authentication Required', message: 'Sign in again before exporting a backup.' });
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const appCheckHeaders = await getAppCheckRequestHeaders();
      const response = await fetch('/api/admin/export', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, ...appCheckHeaders },
        cache: 'no-store'
      });
      if (!response.ok) {
        let payload: any = {};
        try { payload = await readJsonResponse(response); } catch { /* use fallback below */ }
        setCustomDialog({ type: 'alert', title: 'Backup Export Blocked', message: safeApiError(response.status, payload, 'Unable to export the administrator backup.') });
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `saelyxe-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setCustomDialog({ type: 'alert', title: 'Backup Export Failed', message: error instanceof Error ? error.message : 'Unable to export the administrator backup.' });
    }
  };

  if (isAuthHydrating) {
    return (
      <div className="login-screen-container flex items-center justify-center">
        <div className="login-card-custom text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#051C12] text-[#B4F105] flex items-center justify-center font-extrabold text-base mx-auto mb-3"><span>SÆ</span></div>
          <h2 className="text-lg font-extrabold text-stone-900">SAELYXE ADMIN</h2>
          <p className="text-xs text-stone-500 mt-2">Restoring secure administrator session...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin || !user) {
    return <AdminLogin onLogin={loginAdmin} onReturnToStore={() => navigateTo({ name: 'home' })} />;
  }

  const badges = {
    orders: orders.filter(order => !['delivered', 'cancelled'].includes(order.status)).length || undefined,
    messages: messages.filter(message => message.status === 'unread').length || undefined,
    restock: stockNotifications.filter(notification => ['pending', 'failed'].includes(notification.status)).length || undefined
  };

  const headerMeta = getHeaderMeta(activeTab);

  const globalSearchItems = [
    ...products.map(product => ({ id: product.id, label: product.title, meta: `Product · ${product.category} · ${product.stockCount ?? 0} in stock`, tab: 'products' as const })),
    ...orders.map(order => ({ id: order.id, label: order.orderNumber, meta: `Order · ${order.customerName} · ${order.status}`, tab: 'orders' as const })),
    ...messages.map(message => ({ id: message.id, label: message.name || message.email, meta: `Inquiry · ${message.email} · ${message.status}`, tab: 'messages' as const })),
    ...staffList.map(staff => ({ id: staff.id, label: staff.name || staff.displayName || staff.username, meta: `Staff · ${staff.email} · ${staff.status}`, tab: 'staff' as const }))
  ];

  return (
    <AdminLayout
      activeTab={activeTab}
      onSwitchTab={handleSwitchTab}
      user={user}
      isSuperAdmin={isSuperAdmin}
      badges={badges}
      onLogout={async () => { await logout(); navigateTo({ name: 'home' }); }}
      onNavigateHome={() => navigateTo({ name: 'home' })}
      title={headerMeta.title}
      subtitle={headerMeta.subtitle}
      breadcrumb={headerMeta.breadcrumb}
      globalSearchItems={globalSearchItems}
    >
      {activeTab === 'overview' && <AdminDashboard products={products} orders={orders} messages={messages} stockNotifications={stockNotifications} formatPrice={formatPrice} onNavigateToTab={handleSwitchTab} onOpenProductModal={openNewProduct} />}
      {activeTab === 'products' && <AdminProducts products={products} formatPrice={formatPrice} isSuperAdmin={isSuperAdmin} onSaveProduct={saveProduct} onDeleteProduct={handleDeleteProduct} isProductModalOpen={isProductModalOpen} setIsProductModalOpen={setIsProductModalOpen} editingProduct={editingProduct} setEditingProduct={setEditingProduct} />}
      {activeTab === 'orders' && <AdminCommissions orders={orders} formatPrice={formatPrice} onUpdateOrderStatus={updateOrderStatus} isSuperAdmin={isSuperAdmin} onAudit={logAuditEvent} hasMoreOrders={hasMoreAdminOrders} onLoadOlderOrders={loadOlderOrders} />}
      {activeTab === 'messages' && <AdminConcierge messages={messages} onUpdateMessageStatus={updateMessageStatus} />}
      {activeTab === 'restock' && <AdminRestock stockNotifications={stockNotifications} products={products} onTriggerRestock={handleTriggerRestock} />}
      {activeTab === 'staff' && <AdminStaffView staffList={staffList} isSuperAdmin={isSuperAdmin} onAddStaff={addStaff} onActivateStaff={activateStaff} onUpdateStaffRole={updateStaffRole} onDeleteStaff={handleDeleteStaff} />}
      {activeTab === 'security' && <AdminSecurity onExportDatabase={handleExportDatabase} />}
      {activeTab === 'drop-config' && <AdminDropSettings settings={settings} onUpdateSettings={updateSettings} />}

      {customDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in" role="presentation">
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <h3 className="text-base font-bold text-stone-900">{customDialog.title}</h3>
            <p className="text-xs text-stone-600 leading-relaxed">{customDialog.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              {customDialog.type === 'confirm' && <button type="button" disabled={dialogBusy} onClick={() => setCustomDialog(null)} className="btn-table-action disabled:opacity-50">Cancel</button>}
              <button
                type="button"
                disabled={dialogBusy}
                onClick={async () => {
                  if (!customDialog.onConfirm) { setCustomDialog(null); return; }
                  setDialogBusy(true);
                  try { await customDialog.onConfirm(); } finally { setDialogBusy(false); }
                }}
                className="btn-saelyxe-primary bg-rose-700! hover:bg-rose-800! disabled:opacity-50"
              >
                {dialogBusy ? 'Working...' : customDialog.confirmLabel || (customDialog.type === 'alert' ? 'Close' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
