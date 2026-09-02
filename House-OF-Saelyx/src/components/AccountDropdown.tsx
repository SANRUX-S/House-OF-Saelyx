import React, { useEffect, useRef } from 'react';
import { 
  User, 
  ShoppingBag, 
  Truck, 
  Sparkles, 
  Headset, 
  LogOut, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { AppUser } from '../types';

interface AccountDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
}

export const AccountDropdown: React.FC<AccountDropdownProps> = ({ isOpen, onClose, user }) => {
  const { navigateTo, logout } = useStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNav = (action: () => void) => {
    action();
    onClose();
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    navigateTo({ name: 'home' });
  };

  const menuItems = [
    {
      label: 'MY PROFILE',
      icon: User,
      action: () => navigateTo({ name: 'profile' }),
      desc: 'Personal details & delivery address'
    },
    {
      label: 'MY ORDERS',
      icon: ShoppingBag,
      action: () => navigateTo({ name: 'orders' }),
      desc: 'Purchase history & commission status'
    },
    {
      label: 'TRACK MY ORDER',
      icon: Truck,
      action: () => navigateTo({ name: 'track-order' }),
      desc: 'Live courier & white-glove status'
    },
    {
      label: 'VIP ELIGIBLE',
      icon: Sparkles,
      action: () => navigateTo({ name: 'vip' }),
      desc: 'Exclusive private client tier'
    },
    {
      label: 'CONTACT SUPPORT',
      icon: Headset,
      action: () => navigateTo({ name: 'contact-support' }),
      desc: 'Atelier concierge assistance'
    }
  ];

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2.5 w-[290px] sm:w-[320px] bg-[#141210]/95 backdrop-blur-2xl border border-[#2E2A25] text-stone-200 rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.6)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 transform-gpu select-none"
    >
      {/* Top Header with User Info */}
      <div className="p-4 sm:p-4.5 border-b border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] uppercase tracking-[0.25em] font-semibold text-stone-400">
            ACCOUNT
          </span>
          <span className="text-[9px] uppercase tracking-widest font-mono text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Director' : 'VIP Patron'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2A2420] to-[#1A1614] border border-amber-500/30 text-amber-200 flex items-center justify-center font-serif text-sm font-semibold flex-shrink-0 shadow-inner">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              (user.name ? user.name[0]?.toUpperCase() : 'S')
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-white truncate tracking-wide">
              {user.name || 'Patron'}
            </h4>
            <p className="text-[10.5px] text-stone-400 truncate mt-0.5">
              {user.email || 'patron@houseofsaelyx.com'}
            </p>
          </div>
        </div>
      </div>

      {/* Admin Shortcut (If Admin/Super Admin) */}
      {(user.role === 'admin' || user.role === 'super_admin') && (
        <div className="p-2 border-b border-white/10 bg-amber-500/5">
          <button
            onClick={() => handleNav(() => navigateTo({ name: 'admin' }))}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] uppercase font-semibold tracking-wider transition-colors cursor-pointer border border-amber-500/20"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ATELIER ADMIN PANEL</span>
            </div>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Menu Navigation Items */}
      <div className="p-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => handleNav(item.action)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-stone-300 group-hover:text-white group-hover:bg-white/10 transition-colors flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 stroke-[1.75]" />
                </div>
                <div>
                  <div className="text-[11px] font-medium tracking-wider uppercase text-stone-200 group-hover:text-white transition-colors">
                    {item.label}
                  </div>
                  <div className="text-[9.5px] text-stone-400 font-normal">
                    {item.desc}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-300 group-hover:translate-x-0.5 transition-all" />
            </button>
          );
        })}
      </div>

      {/* Logout Bottom Row */}
      <div className="p-2 border-t border-white/10 bg-black/30">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-rose-300/90 hover:text-rose-200 hover:bg-rose-500/10 text-[11px] font-semibold uppercase tracking-widest transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>LOG OUT</span>
        </button>
      </div>
    </div>
  );
};
