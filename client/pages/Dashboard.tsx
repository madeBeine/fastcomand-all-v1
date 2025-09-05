import React from 'react';
import { BarChart3, Package, Truck, DollarSign, Users, TrendingUp, Clock, CheckCircle, ArrowUp, ArrowDown, Sparkles, Star, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'orange' | 'green' | 'red' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  color = 'blue' 
}) => {
  const colorClasses = {
    blue: 'from-brand-blue to-brand-blue-dark',
    orange: 'from-brand-orange to-brand-orange-dark',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600'
  };

  const bgColorClasses = {
    blue: 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10',
    orange: 'from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10',
    green: 'from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10',
    red: 'from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10',
    purple: 'from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10'
  };

  return (
    <div className={`relative bg-gradient-to-br ${bgColorClasses[color]} rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 p-6 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-105 group overflow-hidden`}>
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color]} rounded-full blur-3xl`}></div>
      </div>
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 text-right mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
          {trend && (
            <div className={`flex items-center text-sm font-medium ${
              trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {trendUp ? (
                <ArrowUp size={16} className="mr-1" />
              ) : (
                <ArrowDown size={16} className="mr-1" />
              )}
              {trend}
            </div>
          )}
        </div>
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: 'إجمالي الطلبات',
      value: '1,234',
      icon: <Package size={24} />,
      trend: '+12%',
      trendUp: true,
      color: 'blue' as const
    },
    {
      title: 'الطلبات المسلمة',
      value: '856',
      icon: <CheckCircle size={24} />,
      trend: '+8%',
      trendUp: true,
      color: 'green' as const
    },
    {
      title: 'قيد التوصيل',
      value: '234',
      icon: <Truck size={24} />,
      trend: '+15%',
      trendUp: true,
      color: 'orange' as const
    },
    {
      title: 'إجمالي الإيرادات',
      value: '$45,230',
      icon: <DollarSign size={24} />,
      trend: '+23%',
      trendUp: true,
      color: 'purple' as const
    }
  ];

  const recentActivities = [
    { id: 1, action: 'تم إنشاء طلب جديد', customer: 'أحمد محمد', time: 'منذ 5 دقائق', type: 'order' },
    { id: 2, action: 'تم تسليم الطلب', customer: 'فاطمة أحمد', time: 'منذ 15 دقيقة', type: 'delivery' },
    { id: 3, action: 'تم إضافة شحنة جديدة', customer: 'شحنة #345', time: 'منذ 30 دقيقة', type: 'shipment' },
    { id: 4, action: 'تم الدفع', customer: 'محمد علي', time: 'منذ ساعة', type: 'payment' },
    { id: 5, action: 'تم تحديث المخزن', customer: 'منتج #789', time: 'منذ ساعتين', type: 'inventory' }
  ];

  const getActivityIcon = (type: string) => {
    const iconClasses = "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md";
    switch (type) {
      case 'order':
        return <div className={`${iconClasses} bg-gradient-to-br from-blue-500 to-blue-600`}><Package size={20} /></div>;
      case 'delivery':
        return <div className={`${iconClasses} bg-gradient-to-br from-green-500 to-green-600`}><CheckCircle size={20} /></div>;
      case 'shipment':
        return <div className={`${iconClasses} bg-gradient-to-br from-orange-500 to-orange-600`}><Truck size={20} /></div>;
      case 'payment':
        return <div className={`${iconClasses} bg-gradient-to-br from-purple-500 to-purple-600`}><DollarSign size={20} /></div>;
      case 'inventory':
        return <div className={`${iconClasses} bg-gradient-to-br from-indigo-500 to-indigo-600`}><Target size={20} /></div>;
      default:
        return <div className={`${iconClasses} bg-gradient-to-br from-gray-500 to-gray-600`}><Clock size={20} /></div>;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Welcome Section */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-brand-blue to-brand-blue-dark rounded-2xl shadow-lg">
              <Sparkles size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
                مرحباً، {user?.name}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                إليك نظرة عامة على نشاط اليوم
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          
          {/* Orders Chart */}
          <div className="bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <BarChart3 size={20} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                إحصائيات الطلبات
              </h3>
            </div>
            
            <div className="h-64 bg-gradient-to-br from-blue-50 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/5 rounded-2xl flex items-center justify-center border border-blue-200/30 dark:border-blue-700/20 chart-container chart-mini">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <BarChart3 size={32} className="text-white" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">مخطط الطلبات الشهرية</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">البيانات التفصيلية قريباً</p>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <TrendingUp size={20} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                الإيرادات والمصاريف
              </h3>
            </div>
            
            <div className="h-64 bg-gradient-to-br from-purple-50 to-purple-100/30 dark:from-purple-900/10 dark:to-purple-800/5 rounded-2xl flex items-center justify-center border border-purple-200/30 dark:border-purple-700/20 chart-container chart-mini">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <TrendingUp size={32} className="text-white" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">مخطط الإيرادات الشهرية</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">البيانات التفصيلية قريباً</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm overflow-hidden">
          
          <div className="p-8 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
                <Star size={20} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                النشاط الأخير
              </h3>
            </div>
          </div>
          
          <div className="p-8">
            <div className="space-y-6">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-700/50 rounded-2xl border border-gray-200/30 dark:border-gray-700/30 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                  
                  {getActivityIcon(activity.type)}
                  
                  <div className="flex-1 text-right">
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {activity.customer}
                    </p>
                  </div>
                  
                  <div className="text-left">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {activity.time}
                    </span>
                  </div>
                  
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
