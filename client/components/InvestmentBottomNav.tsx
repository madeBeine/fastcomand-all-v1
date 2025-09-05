import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Calendar, DollarSign, Package, Truck, ClipboardList, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const investmentItems = [
  { path: '/investment-dashboard', label: 'لوحة', icon: BarChart3 },
  { path: '/meetings', label: 'اجتماع', icon: Calendar },
  { path: '/revenue', label: 'إيراد', icon: TrendingUp },
  { path: '/expenses', label: 'مصروف', icon: DollarSign },
];

const adminItems = [
  { path: '/dashboard', label: 'لوحة', icon: BarChart3 },
  { path: '/orders', label: 'الطلبات', icon: Package },
  { path: '/shipments', label: 'الشحنات', icon: Truck },
  { path: '/delivery-tasks', label: 'التوصيل', icon: ClipboardList },
];

const isActivePath = (current: string, target: string) =>
  current === target || current.startsWith(target + '/') || (target !== '/' && current.startsWith(target));

const InvestmentBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSystem } = useAuth();

  const items = currentSystem === 'investment' ? investmentItems : adminItems;

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200/60 dark:border-gray-700/60 backdrop-blur bg-white/95 dark:bg-gray-900/95 safe-area-inset-bottom">
      <ul className="grid grid-cols-4 px-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActivePath(location.pathname, it.path);
          return (
            <li key={it.path}>
              <button
                onClick={() => navigate(it.path)}
                className={`relative w-full flex flex-col items-center justify-center py-1.5 text-[10px] transition-all ${active ? 'text-brand-orange' : 'text-gray-600 dark:text-gray-300'} active:scale-[0.95] touch-manipulation`}
              >
                <span className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full transition-opacity ${active ? 'opacity-100 bg-brand-orange' : 'opacity-0'}`} />
                <div className={`flex items-center justify-center rounded-lg ${active ? 'bg-brand-orange/10' : ''} p-1 mb-0.5`}>
                  <Icon size={16} className={active ? 'text-brand-orange' : ''} />
                </div>
                <span className="leading-tight">{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default InvestmentBottomNav;
