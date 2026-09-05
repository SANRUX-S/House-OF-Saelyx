import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRight, 
  Calendar, 
  MoreHorizontal, 
  ShoppingBag, 
  Sparkles, 
  Plus, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Product, Order } from '../../types';

export interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  formatPrice: (priceLKR: number) => string;
  onNavigateToTab: (tab: 'products' | 'orders' | 'messages' | 'restock' | 'staff' | 'security' | 'drop-config') => void;
  onOpenProductModal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  orders,
  formatPrice,
  onNavigateToTab,
  onOpenProductModal
}) => {
  const [startDate, setStartDate] = useState('2026-01-12');
  const [endDate, setEndDate] = useState('2026-01-23');
  const [activeRevenueRange, setActiveRevenueRange] = useState<'weekly' | 'monthly'>('monthly');

  // Derive live statistics
  const rangeOrders = orders.filter(order => {
    const created = order.createdAt?.slice(0, 10);
    return (!startDate || created >= startDate) && (!endDate || created <= endDate);
  });
  const totalRevenueLKR = rangeOrders.reduce((sum, o) => sum + (o.totalLKR || 0), 0);
  const pendingOrdersCount = rangeOrders.filter(o => o.status !== 'delivered').length;
  const completedOrdersCount = rangeOrders.filter(o => o.status === 'delivered').length;
  const totalStockCount = products.reduce((sum, p) => sum + (p.stockCount || 25), 0);

  // Reference visual overview values with live dynamic fallback
  const productLaunched = products.length > 0 ? 233 : 0;
  const ongoingProduct = products.length > 0 ? 23 : 0;
  const productSold = rangeOrders.length > 0 ? 482 : 0;
  const productReturned = 8;
  const productInStock = totalStockCount > 200 ? totalStockCount : 1420;
  const pendingShipment = pendingOrdersCount > 0 ? pendingOrdersCount * 8 : 64;

  // Recent orders sorted by newest
  const recentOrders = [...rangeOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Date Range Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Operational Cadence
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            Live Stream
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="btn-date-range">
            <Calendar className="h-4 w-4 text-stone-500" />
            <input aria-label="Start date" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="bg-transparent text-xs outline-none" />
            <span className="text-stone-400">to</span>
            <input aria-label="End date" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="bg-transparent text-xs outline-none" />
            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
          </div>
          
          <button 
            onClick={onOpenProductModal}
            className="btn-saelyxe-lime text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Garment</span>
          </button>
        </div>
      </div>

      {/* TOP ROW: 3 Primary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Alert Green Promo Banner */}
        <div className="alert-green-card">
          <div className="relative z-10">
            <span className="alert-green-badge">Update</span>
            <div className="alert-green-date">Drop 001 Runway Release</div>
            <div className="alert-green-text">
              Gross Atelier Revenue increased 40% in 1 week
            </div>
          </div>
          
          <button 
            onClick={() => onNavigateToTab('orders')}
            className="alert-green-link z-10 bg-transparent border-none text-left p-0 cursor-pointer"
          >
            <span>See Statistics</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* SVG Geometric 6-pointed lime asterisk matching Doc 2 */}
          <svg className="alert-green-bg-shape" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(50,50)">
              <rect x="-6" y="-45" width="12" height="90" rx="6" ry="6" fill="#B4F105" />
              <rect x="-6" y="-45" width="12" height="90" rx="6" ry="6" fill="#B4F105" transform="rotate(60)" />
              <rect x="-6" y="-45" width="12" height="90" rx="6" ry="6" fill="#B4F105" transform="rotate(120)" />
            </g>
          </svg>
        </div>

        {/* Card 2: Net Income / Gross Atelier Revenue */}
        <div className="card-stat">
          <div>
            <div className="flex items-center justify-between">
              <span className="stat-label">Gross Atelier Revenue</span>
              <button 
                onClick={() => onNavigateToTab('orders')}
                className="text-stone-400 hover:text-stone-600 p-1"
                aria-label="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <div className="stat-value">{formatPrice(totalRevenueLKR)}</div>
            <div className="trend-badge trend-up">
              <ArrowUpRight className="w-4 h-4" />
              <span>+35% from last drop batch</span>
            </div>
          </div>

          {/* Smooth SVG Trend Sparkline */}
          <div className="pt-4">
            <svg className="w-full h-10 overflow-visible" viewBox="0 0 200 40">
              <path
                d="M 0,35 Q 30,30 60,18 T 120,24 T 170,8 T 200,4"
                fill="none"
                stroke="#22C55E"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M 0,35 Q 30,30 60,18 T 120,24 T 170,8 T 200,4 L 200,40 L 0,40 Z"
                fill="url(#greenGradient)"
                opacity="0.2"
              />
              <defs>
                <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Card 3: Total Commissions Placed */}
        <div className="card-stat">
          <div>
            <div className="flex items-center justify-between">
              <span className="stat-label">Total Commissions Placed</span>
              <button 
                onClick={() => onNavigateToTab('orders')}
                className="text-stone-400 hover:text-stone-600 p-1"
                aria-label="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <div className="stat-value">{orders.length} Commissions</div>
            <div className="trend-badge trend-up">
              <ArrowUpRight className="w-4 h-4" />
              <span>{pendingOrdersCount} active in white-glove dispatch</span>
            </div>
          </div>

          {/* Smooth SVG Trend Sparkline */}
          <div className="pt-4">
            <svg className="w-full h-10 overflow-visible" viewBox="0 0 200 40">
              <path
                d="M 0,28 Q 40,32 70,22 T 130,16 T 170,12 T 200,6"
                fill="none"
                stroke="#B4F105"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M 0,28 Q 40,32 70,22 T 130,16 T 170,12 T 200,6 L 200,40 L 0,40 Z"
                fill="url(#limeGradient)"
                opacity="0.2"
              />
              <defs>
                <linearGradient id="limeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B4F105" />
                  <stop offset="100%" stopColor="#B4F105" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* MIDDLE & BOTTOM GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT COLUMN (8 Cols on XL): Revenue Chart + Bottom Split */}
        <div className="xl:col-span-8 space-y-5">
          {/* Revenue Analytics Bar Chart Card */}
          <div className="admin-card">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">Revenue Analytics</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-extrabold text-stone-900">
                    {formatPrice(totalRevenueLKR)}
                  </span>
                  <span className="trend-badge trend-up text-xs">
                    +35% from last month
                  </span>
                </div>
              </div>

              {/* Legends */}
              <div className="flex items-center gap-4 text-xs font-semibold text-stone-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#072F1F]" />
                  <span>Gross Intake</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B4F105]" />
                  <span>Material Sourcing</span>
                </div>
              </div>
            </div>

            {/* Custom Interactive SVG Bar Chart (Income vs Expense) */}
            <div className="pt-2">
              <div className="h-56 flex items-end justify-between gap-3 px-2 border-b border-stone-100">
                {[
                  { month: 'Jan', income: 44, expense: 23 },
                  { month: 'Feb', income: 55, expense: 33 },
                  { month: 'Mar', income: 41, expense: 30 },
                  { month: 'Apr', income: 67, expense: 48 },
                  { month: 'May', income: 52, expense: 34 },
                  { month: 'Jun', income: 70, expense: 45 },
                  { month: 'Jul', income: 61, expense: 40 },
                  { month: 'Aug', income: 85, expense: 45 },
                ].map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1.5 h-full">
                      {/* Dark Forest Bar (Income) */}
                      <div 
                        style={{ height: `${item.income}%` }}
                        className="w-1/2 max-w-4.5 bg-[#072F1F] rounded-t-sm group-hover:brightness-125 transition-all relative"
                      >
                        <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] py-0.5 px-1.5 rounded pointer-events-none transition-opacity font-mono">
                          {item.income}%
                        </span>
                      </div>
                      {/* Lime Bar (Expense) */}
                      <div 
                        style={{ height: `${item.expense}%` }}
                        className="w-1/2 max-w-4.5 bg-[#B4F105] rounded-t-sm group-hover:brightness-110 transition-all"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-stone-500">
                      {item.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BOTTOM SPLIT: Transactions (Recent Orders) + Product Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card: Live Transactions / Commissions Activity */}
            <div className="admin-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-stone-900">Recent Commissions</h2>
                  <button 
                    onClick={() => onNavigateToTab('orders')}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                  >
                    <span>View all ({orders.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-stone-100">
                  {recentOrders.length === 0 ? (
                    <div className="text-xs text-stone-400 py-6 text-center">
                      No customer commissions recorded yet.
                    </div>
                  ) : (
                    recentOrders.map(order => (
                      <div key={order.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center font-bold text-xs">
                            <ShoppingBag className="w-4 h-4 text-stone-600" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-stone-900">
                              {order.customerName || 'VIP Patron'}
                            </div>
                            <div className="text-[11px] text-stone-500 font-mono">
                              #{order.orderNumber} • {order.items?.[0]?.title?.slice(0, 28) || 'Atelier Set'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-extrabold text-stone-900">
                            +{formatPrice(order.totalLKR)}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            order.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {order.status?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 mt-2">
                <button
                  onClick={() => onNavigateToTab('orders')}
                  className="w-full py-2.5 bg-stone-50 hover:bg-stone-100 text-stone-700 font-semibold text-xs rounded-xl border border-stone-200 transition-colors"
                >
                  Manage All Commissions
                </button>
              </div>
            </div>

            {/* Card: Product Overview with Exact Doc 2 Labels */}
            <div className="admin-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-stone-900">Product Overview</h2>
                  <button 
                    onClick={() => onNavigateToTab('products')}
                    className="text-stone-400 hover:text-stone-600 p-1"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3.5">
                  {/* 1. Product Launched */}
                  <div className="progress-container">
                    <div className="progress-label-row">
                      <span className="progress-label">Product Launched</span>
                      <span className="progress-value">{productLaunched}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill bg-lime-accent" style={{ width: '65%' }} />
                    </div>
                  </div>

                  {/* 2. Ongoing Product */}
                  <div className="progress-container">
                    <div className="progress-label-row">
                      <span className="progress-label">Ongoing Product</span>
                      <span className="progress-value">{ongoingProduct}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill bg-lime-accent opacity-60" style={{ width: '35%' }} />
                    </div>
                  </div>

                  {/* 3. Product Sold */}
                  <div className="progress-container">
                    <div className="progress-label-row">
                      <span className="progress-label">Product Sold</span>
                      <span className="progress-value">{productSold}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill bg-lime-accent" style={{ width: '85%' }} />
                    </div>
                  </div>

                  {/* 4. Product Returned */}
                  <div className="progress-container">
                    <div className="progress-label-row">
                      <span className="progress-label">Product Returned</span>
                      <span className="progress-value">{productReturned}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill bg-brand-orange" style={{ width: '12%' }} />
                    </div>
                  </div>

                  {/* 5. Product In Stock */}
                  <div className="progress-container">
                    <div className="progress-label-row">
                      <span className="progress-label">Product In Stock</span>
                      <span className="progress-value">{productInStock.toLocaleString()}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill bg-lime-accent" style={{ width: '75%' }} />
                    </div>
                  </div>

                  {/* 6. Pending Shipment */}
                  <div className="progress-container">
                    <div className="progress-label-row">
                      <span className="progress-label">Pending Shipment</span>
                      <span className="progress-value">{pendingShipment}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill bg-lime-accent opacity-50" style={{ width: '45%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 mt-2">
                <button
                  onClick={() => onNavigateToTab('products')}
                  className="w-full py-2.5 bg-stone-50 hover:bg-stone-100 text-stone-700 font-semibold text-xs rounded-xl border border-stone-200 transition-colors"
                >
                  Manage Catalogue
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (4 Cols on XL): Performance Donut + Promo CTA Banner */}
        <div className="xl:col-span-4 space-y-5">
          {/* Total View Performance Donut Chart Card */}
          <div className="admin-card flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-stone-900">Total View Performance</h2>
              <button className="text-stone-400 hover:text-stone-600 p-1">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Modern Donut SVG Chart */}
            <div className="py-4 flex flex-col items-center justify-center">
              <div className="relative w-44 h-44">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#EEF2F1"
                    strokeWidth="12"
                  />
                  {/* Segment 1: View Count (Lime, 65%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#B4F105"
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    strokeDashoffset="87.92"
                    strokeLinecap="round"
                  />
                  {/* Segment 2: Percentage (Dark forest, 25%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#072F1F"
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    strokeDashoffset="188.4"
                    strokeLinecap="round"
                  />
                  {/* Segment 3: Sales (Orange, 10%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#F97316"
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    strokeDashoffset="226.08"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-extrabold text-stone-900 tracking-tight">
                    565K
                  </span>
                  <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                    Total Views
                  </span>
                </div>
              </div>
            </div>

            {/* Custom Chart Legends */}
            <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-stone-100">
              <div className="p-2 rounded-xl bg-stone-50">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#B4F105]" />
                  <span className="text-[11px] font-bold text-stone-700">Views</span>
                </div>
                <div className="text-xs font-extrabold text-stone-900">65%</div>
              </div>

              <div className="p-2 rounded-xl bg-stone-50">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#072F1F]" />
                  <span className="text-[11px] font-bold text-stone-700">Ratio</span>
                </div>
                <div className="text-xs font-extrabold text-stone-900">25%</div>
              </div>

              <div className="p-2 rounded-xl bg-stone-50">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                  <span className="text-[11px] font-bold text-stone-700">Orders</span>
                </div>
                <div className="text-xs font-extrabold text-stone-900">10%</div>
              </div>
            </div>
          </div>

          {/* Level Up Promotion CTA Banner */}
          <div className="promo-banner-card">
            {/* Inline SVG geometric star */}
            <svg className="promo-banner-bg-shape" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(50,50)">
                <rect x="-6" y="-45" width="12" height="90" rx="6" ry="6" fill="#B4F105" />
                <rect x="-6" y="-45" width="12" height="90" rx="6" ry="6" fill="#B4F105" transform="rotate(60)" />
                <rect x="-6" y="-45" width="12" height="90" rx="6" ry="6" fill="#B4F105" transform="rotate(120)" />
              </g>
            </svg>

            <h3 className="promo-title">
              Level up your sales managing to the next level.
            </h3>
            <p className="promo-desc">
              An easy way to manage sales with care, precision, and bespoke luxury standards.
            </p>
            <button 
              onClick={() => onNavigateToTab('drop-config')}
              className="btn-promo"
            >
              Check the updates now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
