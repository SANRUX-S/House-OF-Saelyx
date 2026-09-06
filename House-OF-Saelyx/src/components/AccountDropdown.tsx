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

  // Close on outside click or Escape key
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

    // Delay attaching event listener by 50ms so the opening click does NOT immediately close it!
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 50);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
    onClose();
  };

  const handleLogoutClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
    await logout();
  };

  const allMenuItems = [
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
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full mt-3 w-85 sm:w-92.5 bg-white text-[#1A1816] rounded-2xl border border-[#E8E1D5] shadow-[0_22px_55px_rgba(0,0,0,0.14)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 select-none"
    >
      {/* Top Header with Authenticated Customer Info */}
      <div className="p-4 sm:p-5 border-b border-[#EDE6DC] bg-[#FAF8F5]/90">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#8C7A68]">
            ACCOUNT
          </span>
          <span className="text-[8.5px] uppercase tracking-wider bg-[#F2EDE4] text-[#5A4E40] px-2.5 py-0.5 rounded-full font-medium border border-[#E5DDD2] shadow-2xs">
            {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Director' : 'VIP Patron'}
          </span>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-white text-[#1A1816] border border-[#D5CBBF] flex items-center justify-center font-serif text-lg font-semibold shrink-0 shadow-sm overflow-hidden transition-transform duration-200 hover:scale-105">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              (user.name ? user.name[0]?.toUpperCase() : 'S')
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-[#1A1816] truncate tracking-wide">
              {user.name || 'Patron'}
            </h4>
            <p className="text-xs text-[#7A6E60] truncate mt-0.5 font-sans">
              {user.email || 'patron@saelyxe.com'}
            </p>
          </div>
        </div>
      </div>

      {/* Admin Shortcut (For Directors & Super Admins) */}
      {(user.role === 'admin' || user.role === 'super_admin') && (
        <div className="border-b border-[#EDE6DC] bg-[#FAF8F5]/60 p-2">
          <button
            onClick={(e) => handleAction(e, () => navigateTo({ name: 'admin' }))}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#F2ECE2] active:scale-[0.98] text-[#1A1816] text-[10.5px] uppercase font-semibold tracking-wider transition-all duration-200 cursor-pointer border border-[#EAE3D9] shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-800 stroke-[1.75] group-hover:scale-110 transition-transform duration-200" />
              <span>ATELIER ADMIN PANEL</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#7A6E60] group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </div>
      )}

      {/* Menu Navigation Items with Divider Line for Every Single Item */}
      <div className="divide-y divide-[#EDE6DC]">
        {allMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="p-1.5 sm:p-2">
              <button
                onClick={(e) => handleAction(e, item.action)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FAF8F5] active:bg-[#F2ECE2] active:scale-[0.98] transition-all duration-200 text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-[#EAE3D9] group-hover:bg-[#F2EDE4] group-hover:border-[#DDD3C5] group-hover:scale-105 flex items-center justify-center text-[#1A1816] transition-all duration-200 shrink-0 shadow-2xs">
                    <Icon className="w-4.5 h-4.5 stroke-[1.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold tracking-wider uppercase text-[#1A1816] truncate group-hover:text-black transition-colors">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-[#7A6E60] font-normal truncate mt-0.5">
                      {item.desc}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#B8ADA0] group-hover:text-[#1A1816] group-hover:translate-x-1 transition-all duration-200 shrink-0 ml-1.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom Logout Button */}
      <div className="p-2.5 border-t border-[#EDE6DC] bg-[#FAF8F5]/80">
        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-rose-700 hover:text-rose-800 hover:bg-rose-50 active:scale-[0.98] text-[11px] font-semibold uppercase tracking-widest transition-all duration-200 cursor-pointer shadow-2xs border border-transparent hover:border-rose-200"
        >
          <LogOut className="w-4 h-4 stroke-[1.75]" />
          <span>LOG OUT</span>
        </button>
      </div>
    </div>
  );
};
