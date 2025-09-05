import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useSettings } from './contexts/SettingsContext';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InvestmentDashboard from './pages/InvestmentDashboard';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import DeliveryTasks from './pages/DeliveryTasks';
import PlaceholderPage from './components/PlaceholderPage';
import Shipments from './pages/Shipments';
import NotFound from './pages/NotFound';
import { Package, Truck, FileText, DollarSign, Users, Calendar, TrendingUp, Settings, ClipboardList, Archive } from 'lucide-react';
import Meetings from './pages/Meetings';
import Revenue from './pages/Revenue';
import Expenses from './pages/Expenses';
import InvestmentLogs from './pages/InvestmentLogs';
import Withdrawals from './pages/Withdrawals';
import Investors from './pages/Investors';
import UsersPage from './pages/Users';
import InvestmentSettings from './pages/InvestmentSettings';
import Invoices from './pages/Invoices';
import Logs from './pages/Logs';
import SettingsPage from './pages/Settings';
import OrdersSettings from './pages/OrdersSettings';
import { SettingsProvider } from './contexts/SettingsContext';
import { Toaster } from '@/components/ui/toaster';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'investor' | 'employee' | 'delivery'>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // check allowedRoles first
  const coreRoles: Array<'admin' | 'investor' | 'employee' | 'delivery'> = ['admin','investor','employee','delivery'];
  const isCustomRole = !coreRoles.includes(user.role as any);
  if (allowedRoles && !isCustomRole && !allowedRoles.includes(user.role)) {
    const fallback = user.role === 'investor' ? '/investment-dashboard' : user.role === 'delivery' ? '/my-tasks' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  // Enforce system access and per-page visibility/locked
  try {
    const rp = (settings.rolePermissions || {})[user.role as any] || {};
    const path = location.pathname;
    const pageKey = path.replace(/^\//, '');
    const isInvestment = (
      pageKey.startsWith('investment-dashboard') ||
      pageKey.startsWith('meetings') ||
      pageKey.startsWith('revenue') ||
      pageKey.startsWith('expenses') ||
      pageKey.startsWith('investment-logs') ||
      pageKey.startsWith('withdrawals') ||
      pageKey.startsWith('investors') ||
      pageKey.startsWith('investment-settings')
    );

    // Admin role always allowed
    if (user.role !== 'admin') {
      const systems = rp.systems || { admin: user.role === 'employee', investment: user.role === 'investor' };
      if (isInvestment && systems.investment === false) return <Navigate to="/dashboard" replace />;
      if (!isInvestment && systems.admin === false) return <Navigate to="/investment-dashboard" replace />;
    }

    const entry = (rp.pages && (rp.pages[isInvestment ? 'investment' : 'admin']?.[pageKey]));
    if (entry && entry.state === 'hidden') {
      return <Navigate to={isInvestment ? '/investment-dashboard' : '/dashboard'} replace />;
    }
    if (entry && (entry.state === 'locked' || entry.perms?.view === false)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-lg w-full p-6 bg-white dark:bg-gray-800 rounded-lg border">
            <h2 className="text-xl font-semibold mb-2">محظور</h2>
            <p className="text-gray-600 dark:text-gray-400">ليس لديك صلاحية الوصول إلى هذه الصفحة.</p>
          </div>
        </div>
      );
    }
  } catch (e) {
    // ignore
  }

  return <>{children}</>;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, currentSystem, setCurrentSystem } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    const p = location.pathname;
    const inv = p.startsWith('/investment-dashboard') || p.startsWith('/revenue') || p.startsWith('/expenses') || p.startsWith('/meetings') || p.startsWith('/investment-logs') || p.startsWith('/withdrawals') || p.startsWith('/investors') || p.startsWith('/investment-settings');
    setCurrentSystem(inv ? 'investment' : 'admin');
  }, [location.pathname, setCurrentSystem]);

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation
        userRole={user.role}
        currentSystem={currentSystem}
        onSystemChange={setCurrentSystem}
      />

      <main className="lg:ml-64 min-h-screen">
        <div className="lg:pt-0 pt-2 pb-20 sm:pb-0">
          {children}
        </div>
      </main>

      <Toaster />
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  const getHomeByRole = (role: 'admin' | 'investor' | 'employee' | 'delivery') => {
    switch (role) {
      case 'admin':
      case 'employee':
        return '/dashboard';
      case 'investor':
        return '/investment-dashboard';
      case 'delivery':
        return '/my-tasks';
      default:
        return '/dashboard';
    }
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          user ? <Navigate to={getHomeByRole(user.role)} replace /> : <Login />
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'employee']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/investment-dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'investor']}>
            <InvestmentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin System Routes */}
      <Route
        path="/orders"
        element={
          <ProtectedRoute allowedRoles={['admin', 'employee']}>
            <Orders />
          </ProtectedRoute>
        }
      />

      <Route
        path="/shipments"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Shipments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventory"
        element={
          <ProtectedRoute allowedRoles={['admin', 'employee']}>
            <Inventory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/delivery-tasks"
        element={
          <ProtectedRoute allowedRoles={['admin', 'employee']}>
            <DeliveryTasks />
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoices"
        element={
          <ProtectedRoute allowedRoles={['admin', 'employee']}>
            <Invoices />
          </ProtectedRoute>
        }
      />


      <Route
        path="/logs"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Logs />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/orders-settings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <OrdersSettings />
          </ProtectedRoute>
        }
      />

      {/* Investment System Routes */}
      <Route
        path="/meetings"
        element={
          <ProtectedRoute allowedRoles={['admin', 'investor']}>
            <Meetings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/revenue"
        element={
          <ProtectedRoute allowedRoles={['admin', 'investor']}>
            <Revenue />
          </ProtectedRoute>
        }
      />

      <Route
        path="/expenses"
        element={
          <ProtectedRoute allowedRoles={['admin', 'investor']}>
            <Expenses />
          </ProtectedRoute>
        }
      />

      <Route
        path="/investment-logs"
        element={
          <ProtectedRoute allowedRoles={['admin', 'investor']}>
            <InvestmentLogs />
          </ProtectedRoute>
        }
      />

      <Route
        path="/withdrawals"
        element={
          <ProtectedRoute allowedRoles={['admin', 'investor']}>
            <Withdrawals />
          </ProtectedRoute>
        }
      />

      <Route
        path="/investors"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Investors />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <UsersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/investment-settings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <InvestmentSettings />
          </ProtectedRoute>
        }
      />

      {/* Delivery Routes */}
      <Route
        path="/my-tasks"
        element={
          <ProtectedRoute allowedRoles={['delivery']}>
            <PlaceholderPage 
              title="مهامي"
              description="صفحة عرض مهام التوصيل الخاصة بك قيد التطوير"
              icon={<ClipboardList size={32} className="text-brand-blue" />}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['delivery']}>
            <PlaceholderPage 
              title="ملفي الشخصي"
              description="صفحة عرض الملف الشخصي والإحصائيات قيد التطوير"
              icon={<Users size={32} className="text-brand-blue" />}
            />
          </ProtectedRoute>
        }
      />

      {/* Default Routes */}
      <Route
        path="/"
        element={
          user ? <Navigate to={getHomeByRole(user.role)} replace /> : <Navigate to="/login" replace />
        }
      />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <AppLayout>
            <AppRoutes />
          </AppLayout>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
