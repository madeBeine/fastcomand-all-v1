import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import InvestmentBottomNav from './components/InvestmentBottomNav';
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
import { SettingsProvider } from './contexts/SettingsContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'investor' | 'employee' | 'delivery'>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, currentSystem, setCurrentSystem } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    const p = location.pathname;
    const inv = p.startsWith('/investment-dashboard') || p.startsWith('/revenue') || p.startsWith('/expenses') || p.startsWith('/meetings') || p.startsWith('/investment-logs') || p.startsWith('/withdrawals') || p.startsWith('/investors') || p.startsWith('/users') || p.startsWith('/investment-settings');
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
      <InvestmentBottomNav />
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          user ? <Navigate to="/dashboard" replace /> : <Login />
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
          user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
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
