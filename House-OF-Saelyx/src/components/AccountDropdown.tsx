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

  // Close when clicking outside or pressing Escape
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

  const handleAction = (action: () => void) => {
    onClose();
    action();
  };

  const handleLogoutClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
    await logout();
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
      desc: 'Purchase history & order details'
    },
    {
      label: 'TRACK MY ORDER',
      icon: Truck,
      action: () => navigateTo({ name: 'track-order' }),
      desc: 'Live order status & delivery tracking'
    },
    {
      label: 'VIP ELIGIBLE',
      icon: Sparkles,
      action: () => navigateTo({ name: 'vip' }),
      desc: 'Exclusive client tier'
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
      className="absolute right-0 top-full mt-2.5 w-[280px] sm:w-[300px] bg-white text-[#1A1816] rounded-2xl border border-[#EAE3D9] shadow-[0_16px_44px_rgba(0,0,0,0.1)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 transform-gpu select-none"
    >
      {/* Top Header with Authenticated Customer Info */}
      <div className="p-3.5 sm:p-4 border-b border-[#ECE3D8] bg-[#FAF8F5]/80">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[9px] uppercase tracking-[0.25em] font-semibold text-[#8C7A68]">
            ACCOUNT
          </span>
          <span className="text-[8px] uppercase tracking-wider bg-[#F2EDE4] text-[#5A4E40] px-1.5 py-0.5 rounded font-medium border border-[#E5DDD2]">
            {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Director' : 'VIP Patron'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white text-[#1A1816] border border-[#DCD3C7] flex items-center justify-center font-serif text-sm font-semibold flex-shrink-0 shadow-sm overflow-hidden">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              (user.name ? user.name[0]?.toUpperCase() : 'S')
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-[#1A1816] truncate tracking-wide">
              {user.name || 'Patron'}
            </h4>
            <p className="text-[10.5px] text-[#7A6E60] truncate mt-0.5">
              {user.email || 'patron@houseofsaelyx.com'}
            </p>
          </div>
        </div>
      </div>

      {/* Admin Shortcut (For Directors & Super Admins) */}
      {(user.role === 'admin' || user.role === 'super_admin') && (
        <div className="p-1.5 border-b border-[#ECE3D8] bg-[#FAF8F5]">
          <button
            onClick={() => handleAction(() => navigateTo({ name: 'admin' }))}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-[#F2ECE2] text-[#1A1816] text-[10px] uppercase font-semibold tracking-wider transition-colors cursor-pointer border border-[#EAE3D9] shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-800 stroke-[1.75]" />
              <span>ATELIER ADMIN PANEL</span>
            </div>
            <ChevronRight className="w-3 h-3 text-[#7A6E60]" />
          </button>
        </div>
      )}

      {/* Menu Navigation Items */}
      <div className="p-1.5 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => handleAction(item.action)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF8F5] active:bg-[#F2ECE2] transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#EAE3D9] group-hover:bg-[#F2ECE2] group-hover:border-[#DDD3C5] flex items-center justify-center text-[#1A1816] transition-colors flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 stroke-[1.5]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-semibold tracking-wider uppercase text-[#1A1816] truncate">
                    {item.label}
                  </div>
                  <div className="text-[9px] text-[#7A6E60] font-normal truncate">
                    {item.desc}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#B8ADA0] group-hover:text-[#1A1816] group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-1" />
            </button>
          );
        })}
      </div>

      {/* Bottom Logout Button */}
      <div className="p-1.5 border-t border-[#ECE3D8] bg-[#FAF8F5]/60">
        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-rose-700 hover:text-rose-800 hover:bg-rose-50 text-[10.5px] font-semibold uppercase tracking-widest transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 stroke-[1.75]" />
          <span>LOG OUT</span>
        </button>
      </div>
    </div>
  );
};
