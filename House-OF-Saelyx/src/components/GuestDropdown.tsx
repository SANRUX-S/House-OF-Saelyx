import React, { useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  Truck, 
  Sparkles, 
  Headset, 
  LogOut, 
  ChevronRight
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface GuestDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuestDropdown: React.FC<GuestDropdownProps> = ({ isOpen, onClose }) => {
  const { navigateTo, setIsGuest, setAuthMode, setIsAuthOpen } = useStore();
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

  const handleExitGuest = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGuest(false);
    onClose();
  };

  const menuItems = [
    {
      label: 'TRACK MY ORDER',
      icon: Truck,
      action: () => navigateTo({ name: 'track-order' }),
      desc: 'Live order status & delivery tracking'
    },
    {
      label: 'CUSTOMER SUPPORT',
      icon: Headset,
      action: () => navigateTo({ name: 'contact-support' }),
      desc: 'Order assistance & inquiries'
    },
    {
      label: 'SAVE PROFILE / SIGN IN',
      icon: Sparkles,
      action: () => {
        setAuthMode('signup');
        setIsAuthOpen(true);
      },
      desc: 'Connect with Google for saved history'
    }
  ];

  return (
    <div
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full mt-3 w-80 sm:w-88.5 bg-white text-[#1A1816] rounded-2xl border border-[#E8E1D5] shadow-[0_22px_55px_rgba(0,0,0,0.14)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 select-none"
    >
      {/* Top Header with Guest Info */}
      <div className="p-4 sm:p-5 border-b border-[#EDE6DC] bg-[#FAF8F5]/90">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#8C7A68]">
            CLIENT SESSION
          </span>
          <span className="text-[8.5px] uppercase tracking-wider bg-[#F2EDE4] text-[#5A4E40] px-2.5 py-0.5 rounded-full font-medium border border-[#E5DDD2] shadow-2xs">
            Guest Patron
          </span>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-white text-[#786A58] border border-[#D5CBBF] flex items-center justify-center shrink-0 shadow-sm">
            <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-[#1A1816] truncate tracking-wide">
              Guest Client
            </h4>
            <p className="text-xs text-[#665A4E] truncate mt-0.5 font-sans">
              Active guest session
            </p>
          </div>
        </div>
      </div>

      {/* Menu Navigation Items */}
      <div className="divide-y divide-[#EDE6DC]">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="p-1.5 sm:p-2">
              <button
                onClick={(e) => handleAction(e, item.action)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FAF8F5] active:bg-[#F2ECE2] active:scale-[0.98] transition-all duration-200 text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-[#EAE3D9] group-hover:bg-[#F2EDE4] group-hover:border-[#DDD3C5] group-hover:scale-105 flex items-center justify-center text-[#1A1816] transition-all duration-200 shrink-0 shadow-2xs">
                    <Icon className="w-4.5 h-4.5 stroke-[2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold tracking-wider uppercase text-[#1A1816] truncate group-hover:text-black transition-colors">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-[#665A4E] font-normal truncate mt-0.5">
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

      {/* Bottom Exit Guest Button */}
      <div className="p-2.5 border-t border-[#EDE6DC] bg-[#FAF8F5]/80">
        <button
          onClick={handleExitGuest}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[#786A58] hover:text-[#25211D] hover:bg-[#F0EAE0] active:scale-[0.98] text-[11px] font-semibold uppercase tracking-widest transition-all duration-200 cursor-pointer shadow-2xs border border-transparent hover:border-[#D5CBBF]"
        >
          <LogOut className="w-4 h-4 stroke-[2]" />
          <span>EXIT GUEST SESSION</span>
        </button>
      </div>
    </div>
  );
};
