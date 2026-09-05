import React, { useState, useEffect } from 'react';
import '../styles/admin.css';
import { useStore } from '../context/StoreContext';
import { Product, Order, OrderStatus, AdminStaff } from '../types';

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

export const AdminPanel: React.FC = () => {
  const { 
    products, 
    orders, 
    messages, 
    auditLogs,
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
    deleteProduct,
    staffList,
    addStaff,
    activateStaff,
    updateStaffRole,
    deleteStaff,
    updateSettings
  } = useStore();

  // Active Tab State with URL query sync
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      const tabParam = search.get('tab') as AdminTab;
      if (tabParam && ['overview', 'products', 'orders', 'messages', 'restock', 'staff', 'security', 'drop-config'].includes(tabParam)) {
        return tabParam;
      }
    } catch (e) {}
    return 'overview';
  });

  // Track visited tabs to dismiss notification badges
  const [visitedTabs, setVisitedTabs] = useState<{ [tab: string]: boolean }>({ overview: true });

  // Custom confirmation dialog state
  const [customDialog, setCustomDialog] = useState<{
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  // New/Edit product modal state (lifted for seamless trigger from dashboard or products page)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  useEffect(() => {
    const superAdminOnlyTabs: AdminTab[] = ['staff', 'security', 'drop-config'];
    if (!isSuperAdmin && superAdminOnlyTabs.includes(activeTab)) {
      setActiveTab('overview');
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'overview');
        window.history.replaceState(null, '', url.toString());
      } catch (e) {}
    }
  }, [activeTab, isSuperAdmin]);

  // Sync tab with URL
  const handleSwitchTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setVisitedTabs(prev => ({ ...prev, [tab]: true }));
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState(null, '', url.toString());
    } catch (e) {}
  };

  // Safe delete product (Super Admin Only)
  const handleDeleteProduct = (id: string) => {
    if (!isSuperAdmin) {
      setCustomDialog({
        type: 'alert',
        title: 'Access Restricted',
        message: 'Only Super Admins may permanently retire creations from the boutique catalogue.'
      });
      return;
    }
    setCustomDialog({
      type: 'confirm',
      title: 'Retire Creation Silhouette',
      message: 'Are you sure you want to permanently retire this garment from the boutique catalog?',
      onConfirm: async () => {
        await deleteProduct(id);
        setCustomDialog(null);
      }
    });
  };

  // Staff directory removal (Super Admin Only). This does not alter Firebase Auth access.
  const handleDeleteStaff = (id: string, name: string) => {
    if (!isSuperAdmin) return;
    setCustomDialog({
      type: 'confirm',
      title: 'Revoke Administrator Access',
      message: `Revoke administrator access for ${name}? This clears SAELYXE admin claims, revokes refresh tokens, and marks the staff record as revoked.`,
      onConfirm: async () => {
        const result = await deleteStaff(id);
        if (!result.success) {
          setCustomDialog({
            type: 'alert',
            title: 'Access Revoke Failed',
            message: result.error || 'Unable to revoke this staff account.'
          });
          return;
        }
        setCustomDialog(null);
      }
    });
  };

  // Restock cloud function handler
  const handleTriggerRestock = async (productId?: string): Promise<{ success: boolean; message: string }> => {
    if (!productId) {
      return { success: false, message: 'Please select a garment silhouette.' };
    }
    try {
      const res = await triggerStockReplenishedFunction(productId);
      if (res.success) {
        refetchData();
        return {
          success: true,
          message: `Restock email dispatch completed successfully! Processed: ${res.processedCount || 0} notifications for product ID: ${productId}`
        };
      } else {
        return {
          success: false,
          message: res.error || 'Failed to execute restock email dispatch.'
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Restock email dispatch failed.'
      };
    }
  };

  // Export JSON Database
  const handleExportDatabase = () => {
    if (!isSuperAdmin) return;
    if (!window.confirm('Export the administrator database snapshot? This file contains customer and operational personal data.')) return;
    const backupData = {
      exportedAt: new Date().toISOString(),
      products,
      orders,
      messages,
      auditLogs,
      staff: staffList,
      settings
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saelyxe_atelier_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    void logAuditEvent('DATABASE_EXPORT', 'Exported administrator database snapshot from Security & Audit.');
  };

  // If not authenticated as Admin, show luxury Login Screen
  if (!isAdmin || !user) {
    return (
      <AdminLogin
        onLogin={loginAdmin}
        onReturnToStore={() => navigateTo({ name: 'home' })}
      />
    );
  }

  // Active badges for pending operations
  const pendingOrdersCount = orders.filter(o => o.status !== 'delivered').length;
  const unreadMessagesCount = messages.filter(m => m.status === 'unread').length;
  const pendingRestockCount = stockNotifications.filter(n => n.status === 'pending').length;

  const badges = {
    orders: !visitedTabs['orders'] && pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    messages: !visitedTabs['messages'] && unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    restock: !visitedTabs['restock'] && pendingRestockCount > 0 ? pendingRestockCount : undefined,
  };

  // Page title, subtitle, and breadcrumb mapping
  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'overview':
        return {
          title: 'Dashboard',
          subtitle: 'An easy way to manage sales with care and precision.',
          breadcrumb: [{ label: 'Dashboard' }]
        };
      case 'products':
        return {
          title: 'Products',
          subtitle: 'Manage atelier silhouettes, fabric specifications, imagery, and inventory.',
          breadcrumb: [{ label: 'Operations' }, { label: 'Products' }]
        };
      case 'orders':
        return {
          title: 'Commissions & Dispatch',
          subtitle: 'Track bespoke customer orders, dispatch schedules, and courier handovers.',
          breadcrumb: [{ label: 'Operations' }, { label: 'Commissions & Dispatch' }]
        };
      case 'messages':
        return {
          title: 'Concierge Inquiries',
          subtitle: 'Client inquiries, private appointments, and bespoke couture requests.',
          breadcrumb: [{ label: 'Operations' }, { label: 'Concierge Inquiries' }]
        };
      case 'restock':
        return {
          title: 'Restock Waitlist',
          subtitle: 'Automated waitlist email dispatches powered by the protected Vercel API and Resend.',
          breadcrumb: [{ label: 'Operations' }, { label: 'Restock Waitlist' }]
        };
      case 'staff':
        return {
          title: 'Staff & Privileges',
          subtitle: 'Atelier command center operator access and role authorization management.',
          breadcrumb: [{ label: 'Administration' }, { label: 'Staff & Privileges' }]
        };
      case 'security':
        return {
          title: 'Security Hardening & Cryptographic Audit',
          subtitle: 'Cryptographic testing suite, authorization audits, and database backups.',
          breadcrumb: [{ label: 'Administration' }, { label: 'Security & Audit' }]
        };
      case 'drop-config':
        return {
          title: 'Drop Settings',
          subtitle: 'Spotlight copy, pricing, editorial story, and background imagery.',
          breadcrumb: [{ label: 'Operations' }, { label: 'Drop Settings' }]
        };
    }
  };

  const headerMeta = getHeaderMeta();

  const globalSearchItems = [
    ...products.map(product => ({
      id: product.id,
      label: product.title,
      meta: `Product · ${product.category} · ${product.stockCount ?? 0} in stock`,
      tab: 'products' as const
    })),
    ...orders.map(order => ({
      id: order.id,
      label: order.orderNumber,
      meta: `Order · ${order.customerName} · ${order.status}`,
      tab: 'orders' as const
    })),
    ...messages.map(message => ({
      id: message.id,
      label: message.name || message.email,
      meta: `Inquiry · ${message.email} · ${message.status}`,
      tab: 'messages' as const
    })),
    ...staffList.map(staff => ({
      id: staff.id,
      label: staff.name || staff.displayName || staff.username,
      meta: `Staff · ${staff.email} · ${staff.status}`,
      tab: 'staff' as const
    }))
  ];



  return (
    <AdminLayout
      activeTab={activeTab}
      onSwitchTab={handleSwitchTab}
      user={user}
      isSuperAdmin={isSuperAdmin}
      badges={badges}
      onLogout={async () => {
        await logout();
        navigateTo({ name: 'home' });
      }}
      onNavigateHome={() => navigateTo({ name: 'home' })}
      title={headerMeta.title}
      subtitle={headerMeta.subtitle}
      breadcrumb={headerMeta.breadcrumb}
      globalSearchItems={globalSearchItems}
    >
      {/* Tab Content Routers */}
      {activeTab === 'overview' && (
        <AdminDashboard
          products={products}
          orders={orders}
          formatPrice={formatPrice}
          onNavigateToTab={handleSwitchTab}
          onOpenProductModal={() => {
            setEditingProduct(null);
            setIsProductModalOpen(true);
          }}
        />
      )}

      {activeTab === 'products' && (
        <AdminProducts
          products={products}
          formatPrice={formatPrice}
          isSuperAdmin={isSuperAdmin}
          onSaveProduct={saveProduct}
          onDeleteProduct={handleDeleteProduct}
          isProductModalOpen={isProductModalOpen}
          setIsProductModalOpen={setIsProductModalOpen}
          editingProduct={editingProduct}
          setEditingProduct={setEditingProduct}
        />
      )}

      {activeTab === 'orders' && (
        <AdminCommissions
          orders={orders}
          formatPrice={formatPrice}
          onUpdateOrderStatus={updateOrderStatus}
          isSuperAdmin={isSuperAdmin}
          onAudit={logAuditEvent}
          hasMoreOrders={hasMoreAdminOrders}
          onLoadOlderOrders={loadOlderOrders}
        />
      )}

      {activeTab === 'messages' && (
        <AdminConcierge
          messages={messages}
          onUpdateMessageStatus={updateMessageStatus}
        />
      )}

      {activeTab === 'restock' && (
        <AdminRestock
          stockNotifications={stockNotifications}
          products={products}
          onTriggerRestock={handleTriggerRestock}
        />
      )}

      {activeTab === 'staff' && (
        <AdminStaffView
          staffList={staffList}
          isSuperAdmin={isSuperAdmin}
          onAddStaff={addStaff}
          onActivateStaff={activateStaff}
          onUpdateStaffRole={updateStaffRole}
          onDeleteStaff={handleDeleteStaff}
        />
      )}

      {activeTab === 'security' && (
        <AdminSecurity
          onExportDatabase={handleExportDatabase}
        />
      )}

      {activeTab === 'drop-config' && (
        <AdminDropSettings
          settings={settings}
          onUpdateSettings={updateSettings}
        />
      )}

      {/* Reusable Confirmation / Alert Dialog Modal */}
      {customDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <h3 className="text-base font-bold text-stone-900">{customDialog.title}</h3>
            <p className="text-xs text-stone-600 leading-relaxed">{customDialog.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              {customDialog.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => setCustomDialog(null)}
                  className="btn-table-action"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (customDialog.onConfirm) {
                    customDialog.onConfirm();
                  } else {
                    setCustomDialog(null);
                  }
                }}
                className="btn-saelyxe-primary bg-rose-700! hover:bg-rose-800!"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
