import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, Settings, LogOut, User, BarChart3,
  Package, Truck, Archive, ClipboardList, FileText,
  DollarSign, Calendar, TrendingUp, Users, UserCheck,
  Wallet, Shield, Activity
} from 'lucide-react';
import Logo from './Logo';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

interface NavigationProps {
  userRole: 'admin' | 'investor' | 'employee' | 'delivery';
  currentSystem?: 'admin' | 'investment';
  onSystemChange?: (system: 'admin' | 'investment') => void;
}

const Navigation: React.FC<NavigationProps> = ({
  userRole,
  currentSystem = 'admin',
  onSystemChange
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // معالج تسجيل الخروج
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // منع التمرير في الخلفية عندما تكون القائمة مفتوحة
  useEffect(() => {
    if (isMobileMenuOpen) {
      // منع التمرير في الصفحة الخلفية
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // إعادة التمرير الط��يعي
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }

    // تنظيف التأثير عند إلغاء المكون
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleSystemChange = (system: 'admin' | 'investment') => {
    if (onSystemChange) {
      onSystemChange(system);
      // الانتقال التلقائي للوحة التحكم المناسبة
      if (system === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/investment-dashboard');
      }
    }
  };

  const settingsCtx = useSettings();
  const rolePerm = (settingsCtx?.settings?.rolePermissions || {})[userRole as any] || {};

  // determine allowed systems for this role
  let allowedSystems: { admin: boolean; investment: boolean } = { admin: false, investment: false };
  if (userRole === 'admin') allowedSystems = { admin: true, investment: true };
  else if (userRole === 'investor') allowedSystems = { admin: false, investment: true };
  else if (userRole === 'employee') allowedSystems = { admin: true, investment: false };
  else {
    // custom roles
    allowedSystems = {
      admin: !!(rolePerm && rolePerm.systems && rolePerm.systems.admin && rolePerm.systems.admin.enabled),
      investment: !!(rolePerm && rolePerm.systems && rolePerm.systems.investment && rolePerm.systems.investment.enabled)
    };
  }

  const adminMenuItems = [
    { path: '/dashboard', label: 'لوحة التحكم', icon: BarChart3 },
    { path: '/orders', label: 'الطلبات', icon: Package },
    { path: '/shipments', label: 'الشحنات', icon: Truck },
    { path: '/inventory', label: 'المخزن', icon: Archive },
    { path: '/delivery-tasks', label: 'مهام التوصيل', icon: ClipboardList },
    { path: '/invoices', label: 'الفواتير', icon: FileText },
    { path: '/logs', label: 'السجل', icon: Activity },
    { path: '/settings', label: 'الإعدادات', icon: Settings }
  ];

  const investmentMenuItems = [
    { path: '/investment-dashboard', label: 'لوحة التحكم', icon: BarChart3 },
    { path: '/meetings', label: 'الاجتماعات', icon: Calendar },
    { path: '/revenue', label: 'الإيرادات', icon: TrendingUp },
    { path: '/expenses', label: 'المصاريف', icon: DollarSign },
    { path: '/investment-logs', label: 'السجل', icon: Activity },
    { path: '/withdrawals', label: 'السحوبات', icon: Wallet },
    { path: '/investors', label: 'إدارة ��لمستثمرين', icon: Users },
    { path: '/users', label: 'إدارة المستخدمين', icon: UserCheck },
    { path: '/investment-settings', label: 'الإعدادات', icon: Settings }
  ];

  const employeeMenuItems = [
    { path: '/orders', label: 'الطلبات', icon: Package },
    { path: '/inventory', label: 'المخزن', icon: Archive },
    { path: '/invoices', label: 'الفواتير', icon: FileText },
    { path: '/delivery-tasks', label: 'مهام التوصيل', icon: ClipboardList }
  ];

  const deliveryMenuItems = [
    { path: '/my-tasks', label: 'مهامي', icon: ClipboardList },
    { path: '/profile', label: 'ملفي الشخصي', icon: User }
  ];

  const getMenuItems = () => {
    const filterByVisibility = (items: any[], systemKey: 'admin' | 'investment') => {
      if (!rolePerm || !rolePerm.pages) return items.map(it => ({ ...it, __locked: false }));
      return items
        .filter(it => {
          const key = it.path.replace('/', '');
          const entry = rolePerm.pages?.[systemKey]?.[key];
          if (!entry) return true;
          return entry.state !== 'hidden';
        })
        .map(it => {
          const key = it.path.replace('/', '');
          const entry = rolePerm.pages?.[systemKey]?.[key];
          const locked = entry && (entry.state === 'locked' || entry?.perms?.view === false);
          return { ...it, __locked: !!locked };
        });
    };

    if (!allowedSystems.admin && !allowedSystems.investment) return [];

    if (userRole === 'admin') {
      const base = currentSystem === 'admin' ? adminMenuItems : investmentMenuItems;
      return base.map(it => ({ ...it, __locked: false }));
    }

    if (userRole === 'delivery') {
      return deliveryMenuItems.map(it => ({ ...it, __locked: false }));
    }

    if (currentSystem === 'admin') {
      if (!allowedSystems.admin) return [];
      return filterByVisibility(adminMenuItems, 'admin');
    }
    if (currentSystem === 'investment') {
      if (!allowedSystems.investment) return [];
      return filterByVisibility(investmentMenuItems, 'investment');
    }
    return [];
  };

  const menuItems = getMenuItems();

  // Show system toggle if user can access both systems
  const showSystemToggle = onSystemChange && (allowedSystems.admin && allowedSystems.investment);

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden bg-gradient-to-r from-white via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-200/50 dark:border-gray-700/50 px-4 py-1.5 sticky top-0 z-50 backdrop-blur-xl shadow-lg">
        <div className="flex items-center justify-between">
          <Logo size="lg" />
          
          <div className="flex items-center space-x-4">
            {/* System Toggle */}
            {showSystemToggle && (
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => handleSystemChange('admin')}
                  className={cn(
                    'px-3 py-1 text-xs rounded-md transition-colors',
                    currentSystem === 'admin'
                      ? 'bg-brand-blue text-white'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                >
                  الإدارة
                </button>
                <button
                  onClick={() => handleSystemChange('investment')}
                  className={cn(
                    'px-3 py-1 text-xs rounded-md transition-colors',
                    currentSystem === 'investment'
                      ? 'bg-brand-orange text-white'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                >
                  الاستثمار
                </button>
              </div>
            )}
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-600 dark:text-gray-400"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:h-screen bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-r border-gray-200/50 dark:border-gray-700/50 shadow-xl">
        <div className="flex items-center justify-center h-20 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 shadow-sm">
          <Logo size="xl" />
        </div>
        
        {/* System Toggle */}
        {showSystemToggle && (
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-1.5 shadow-inner">
              <button
                onClick={() => handleSystemChange('admin')}
                className={cn(
                  'flex-1 px-3 py-2.5 text-sm rounded-lg transition-all duration-300 font-medium',
                  currentSystem === 'admin'
                    ? 'bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white shadow-md transform scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'
                )}
              >
                الإدارة
              </button>
              <button
                onClick={() => handleSystemChange('investment')}
                className={cn(
                  'flex-1 px-3 py-2.5 text-sm rounded-lg transition-all duration-300 font-medium',
                  currentSystem === 'investment'
                    ? 'bg-gradient-to-r from-brand-orange to-brand-orange-dark text-white shadow-md transform scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'
                )}
              >
                الاستثمار
              </button>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gradient-to-b from-transparent to-gray-50/30 dark:to-gray-800/30" style={{height: 'calc(100vh - 240px)'}}>
          <ul className="space-y-2">
            {menuItems.map((item: any) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const disabled = !!item.__locked;

              return (
                <li key={item.path}>
                  {disabled ? (
                    <div
                      className={cn(
                        'flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-300 text-right group shadow-sm opacity-60 cursor-not-allowed',
                        isActive
                          ? 'bg-gradient-to-r from-gray-300 to-gray-200 text-gray-600'
                          : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
                      )}
                      aria-disabled="true"
                      title="الوصول مقفل"
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </div>
                  ) : (
                    <Link
                      to={item.path}
                      className={cn(
                        'flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-300 text-right group shadow-sm',
                        isActive
                          ? 'bg-gradient-to-r from-brand-blue to-brand-blue-light text-white shadow-lg transform scale-105'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 dark:hover:from-gray-800 dark:hover:to-gray-700 hover:shadow-md hover:transform hover:scale-102'
                      )}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-3 py-3 w-full text-left text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 dark:hover:from-red-900/20 dark:hover:to-red-800/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 right-0 w-64 bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 shadow-2xl border-l border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
              <Logo size="xl" />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-300"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4" style={{maxHeight: 'calc(100vh - 200px)'}}>
              <ul className="space-y-2">
                {menuItems.map((item: any) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const disabled = !!item.__locked;

                  return (
                    <li key={item.path}>
                      {disabled ? (
                        <div
                          className={cn(
                            'flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-300 text-right shadow-sm opacity-60 cursor-not-allowed',
                            isActive
                              ? 'bg-gradient-to-r from-gray-300 to-gray-200 text-gray-600'
                              : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
                          )}
                          aria-disabled="true"
                          title="الوصول مقفل"
                        >
                          <Icon size={20} />
                          <span>{item.label}</span>
                        </div>
                      ) : (
                        <Link
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-300 text-right shadow-sm',
                            isActive
                              ? 'bg-gradient-to-r from-brand-blue to-brand-blue-light text-white shadow-lg'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 dark:hover:from-gray-800 dark:hover:to-gray-700 hover:shadow-md'
                          )}
                        >
                          <Icon size={20} />
                          <span>{item.label}</span>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-3 py-2 w-full text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <LogOut size={20} />
                <span>تسجل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
