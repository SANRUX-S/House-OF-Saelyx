import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  MessageSquare, 
  Bell, 
  Users, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  User, 
  Menu, 
  ChevronDown, 
  ExternalLink, 
  Search, 
  Sparkles,
  Maximize,
  Minimize,
  GripVertical
} from 'lucide-react';
import { AppUser } from '../../types';
import { sendAdminPasswordReset } from '../../lib/firebase';

export interface AdminLayoutProps {
  activeTab: 'overview' | 'products' | 'orders' | 'messages' | 'restock' | 'staff' | 'security' | 'drop-config';
  onSwitchTab: (tab: 'overview' | 'products' | 'orders' | 'messages' | 'restock' | 'staff' | 'security' | 'drop-config') => void;
  user: AppUser;
  isSuperAdmin: boolean;
  badges: {
    orders?: number;
    messages?: number;
    restock?: number;
  };
  onLogout: () => void;
  onNavigateHome: () => void;
  children: React.ReactNode;
  title: string;
  subtitle: string;
  breadcrumb?: { label: string; tab?: string }[];
  headerAction?: React.ReactNode;
  globalSearchItems?: Array<{ id: string; label: string; meta: string; tab: 'products' | 'orders' | 'messages' | 'staff' }>;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onSwitchTab,
  user,
  isSuperAdmin,
  badges,
  onLogout,
  onNavigateHome,
  children,
  title,
  subtitle,
  breadcrumb = [],
  headerAction,
  globalSearchItems = []
}) => {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const searchResults = searchQuery.trim().length >= 2
    ? globalSearchItems.filter(item => `${item.label} ${item.meta}`.toLowerCase().includes(searchQuery.trim().toLowerCase())).slice(0, 8)
    : [];
  const [navOrder, setNavOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('saelyxe_admin_nav_order') || '[]'); } catch { return []; }
  });
  const [draggedNavItem, setDraggedNavItem] = useState<string | null>(null);
  const [accountMessage, setAccountMessage] = useState('');
  
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const navGroups = [
    {
      title: 'MENU',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'products', label: 'Products', icon: Package },
        { 
          id: 'orders', 
          label: 'Commissions & Dispatch', 
          icon: ShoppingBag, 
          badge: badges.orders 
        },
        { 
          id: 'messages', 
          label: 'Concierge Inquiries', 
          icon: MessageSquare, 
          badge: badges.messages 
        },
        { 
          id: 'restock', 
          label: 'Restock Waitlist', 
          icon: Bell, 
          badge: badges.restock 
        }
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        ...(isSuperAdmin ? [{ id: 'staff', label: 'Staff & Privileges', icon: Users }] : []),
        ...(isSuperAdmin ? [{ id: 'security', label: 'Security Hardening', icon: ShieldCheck }] : []),
        ...(isSuperAdmin ? [{ id: 'drop-config', label: 'Drop Settings', icon: Settings }] : [])
      ]
    }
  ];

  const orderNavItems = (items: typeof navGroups[number]['items']) => [...items].sort((a, b) => {
    const aIndex = navOrder.indexOf(a.id);
    const bIndex = navOrder.indexOf(b.id);
    return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
  });

  const moveNavItem = (targetId: string) => {
    if (!draggedNavItem || draggedNavItem === targetId) return;
    const order = navOrder.length ? [...navOrder] : navGroups.flatMap(group => group.items.map(item => item.id));
    const from = order.indexOf(draggedNavItem);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) return;
    order.splice(from, 1);
    order.splice(to, 0, draggedNavItem);
    setNavOrder(order);
    localStorage.setItem('saelyxe_admin_nav_order', JSON.stringify(order));
  };

  return (
    <div className="saelyxe-admin-root">
      {/* Mobile Backdrop */}
      {isSidebarOpenMobile && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpenMobile(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`saelyxe-sidebar ${isSidebarOpenMobile ? 'show' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <span>SÆ</span>
          </div>
          <span className="sidebar-brand-text">SAELYXE ADMIN</span>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-2">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="sidebar-menu-section">
              <div className="sidebar-menu-title">{group.title}</div>
              <div className="space-y-1">
                {orderNavItems(group.items).map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      draggable
                      onDragStart={() => setDraggedNavItem(item.id)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => moveNavItem(item.id)}
                      onDragEnd={() => setDraggedNavItem(null)}
                      onClick={() => {
                        onSwitchTab(item.id as any);
                        setIsSidebarOpenMobile(false);
                      }}
                      className={`sidebar-menu-link ${isActive ? 'active' : ''}`}
                    >
                      <GripVertical className="h-3.5 w-3.5 opacity-40" />
                      <Icon className="sidebar-menu-icon" />
                      <span>{item.label}</span>
                      {Boolean(item.badge) && (
                        <span className="sidebar-badge">{item.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Profile Card */}
        <div className="sidebar-profile">
          <div className="w-9 h-9 rounded-full bg-stone-800 text-stone-200 border border-stone-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
            {user.name?.slice(0, 2) || 'AD'}
          </div>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">{user.name || 'Administrator'}</div>
            <div className="sidebar-profile-role">
              {isSuperAdmin ? 'Super Admin (Director)' : 'Atelier Operator'}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="saelyxe-main-wrapper">
        {/* Top Navbar */}
        <header className="saelyxe-navbar">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
              className="lg:hidden btn-nav-icon"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick Search */}
            <div className="navbar-search-container hidden sm:flex relative">
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="text"
                placeholder="Search orders, products, inquiries, staff..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="navbar-search-input"
              />
              {searchQuery.trim().length >= 2 && (
                <div className="absolute left-0 top-full mt-2 w-[min(32rem,80vw)] rounded-xl border border-stone-200 bg-white p-2 shadow-xl z-50">
                  {searchResults.length ? searchResults.map(item => (
                    <button
                      key={`${item.tab}:${item.id}`}
                      type="button"
                      onClick={() => {
                        onSwitchTab(item.tab);
                        setSearchQuery('');
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left hover:bg-stone-50"
                    >
                      <div className="text-xs font-bold text-stone-800">{item.label}</div>
                      <div className="text-[10px] text-stone-500">{item.meta}</div>
                    </button>
                  )) : (
                    <div className="px-3 py-4 text-center text-xs text-stone-400">No admin records match this search.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="navbar-actions">
            {/* Public Store Link */}
            <button
              onClick={onNavigateHome}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
              title="Return to Public Store"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Store</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="btn-nav-icon hidden md:flex"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="btn-nav-icon"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {((badges.orders || 0) + (badges.messages || 0) + (badges.restock || 0)) > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                )}
                {((badges.orders || 0) + (badges.messages || 0) + (badges.restock || 0)) > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-stone-200 p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="text-xs font-bold uppercase tracking-wider text-stone-500 px-3 py-2 border-b border-stone-100">
                    Atelier Notifications
                  </div>
                  <div className="py-2 space-y-1">
                    {badges.orders ? (
                      <button
                        onClick={() => {
                          onSwitchTab('orders');
                          setIsNotificationsOpen(false);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-stone-50 flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="font-semibold text-stone-800">Pending Commissions</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold">
                          {badges.orders}
                        </span>
                      </button>
                    ) : null}
                    {badges.messages ? (
                      <button
                        onClick={() => {
                          onSwitchTab('messages');
                          setIsNotificationsOpen(false);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-stone-50 flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="font-semibold text-stone-800">Concierge Inquiries</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold">
                          {badges.messages}
                        </span>
                      </button>
                    ) : null}
                    {badges.restock ? (
                      <button
                        onClick={() => {
                          onSwitchTab('restock');
                          setIsNotificationsOpen(false);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-stone-50 flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="font-semibold text-stone-800">Waitlist Requests</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                          {badges.restock}
                        </span>
                      </button>
                    ) : null}
                    {!badges.orders && !badges.messages && !badges.restock && (
                      <div className="text-xs text-stone-400 text-center py-4">
                        All operations up to date
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="navbar-profile-btn"
                aria-expanded={isProfileOpen}
              >
                <div className="navbar-profile-avatar bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                  {user.name?.slice(0, 2) || 'AD'}
                </div>
                <span className="navbar-profile-name hidden md:inline">
                  {user.name || 'Administrator'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-stone-100">
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Welcome !</p>
                    <p className="text-xs font-bold text-stone-900 truncate">{user.name}</p>
                    <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
                  </div>
                  
                  <div className="py-1">
                    {isSuperAdmin && (
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          onSwitchTab('staff');
                        }}
                        className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-stone-400" />
                        <span>Administrator Access</span>
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const result = await sendAdminPasswordReset(user.email);
                        setAccountMessage(result.success ? 'Password reset request sent.' : (result.error || 'Unable to request password reset.'));
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-stone-400" />
                      <span>Send Password Reset</span>
                    </button>
                    
                    {isSuperAdmin && (
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          onSwitchTab('drop-config');
                        }}
                        className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5 text-stone-400" />
                        <span>Settings</span>
                      </button>
                    )}

                  </div>

                  {accountMessage && <div className="mx-2 mb-1 rounded-lg bg-stone-50 px-2 py-2 text-[10px] text-stone-600">{accountMessage}</div>}

                  <div className="border-t border-stone-100 pt-1">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Header Banner */}
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">{title}</h1>
            <p className="admin-page-subtitle">{subtitle}</p>
            {breadcrumb.length > 0 && (
              <div className="admin-breadcrumb mt-2">
                <button 
                  onClick={() => onSwitchTab('overview')}
                  className="hover:underline cursor-pointer"
                >
                  Home
                </button>
                {breadcrumb.map((b, idx) => (
                  <React.Fragment key={idx}>
                    <span>/</span>
                    {b.tab ? (
                      <button 
                        onClick={() => onSwitchTab(b.tab as any)}
                        className="hover:underline cursor-pointer"
                      >
                        {b.label}
                      </button>
                    ) : (
                      <span className="active">{b.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {headerAction}
          </div>
        </div>

        {/* Main Content Body */}
        <main className="admin-content-container">
          {children}
        </main>

        {/* Footer */}
        <footer className="admin-footer">
          <div>
            <strong>SAELYXE ATELIER ADMIN</strong> &copy; {new Date().getFullYear()} • High-Fashion Boutique Control Plane
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>Server: Active</span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
