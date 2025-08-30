import React from 'react';
import { Package, Truck, CheckCircle, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { formatNumberEN, formatCurrencyMRU } from '@/utils/format';
import { eventBus } from '@/lib/eventBus';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'orange' | 'green' | 'purple';
  trend?: string;
  trendUp?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = 'blue', trend, trendUp }) => {
  const colorGrad = {
    blue: 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10',
    orange: 'from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10',
    green: 'from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10',
    purple: 'from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10',
  } as const;
  const iconGrad = {
    blue: 'from-brand-blue to-brand-blue-dark',
    orange: 'from-brand-orange to-brand-orange-dark',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
  } as const;

  return (
    <div className={`relative bg-gradient-to-br ${colorGrad[color]} rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 p-5 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group overflow-hidden`}>
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]">
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${iconGrad[color]} rounded-full blur-3xl`} />
      </div>
      <div className="relative flex items-center justify-between">
        <div className="flex-1 text-right">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</div>
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <div className={`text-xs font-medium ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{trend}</div>
          )}
        </div>
        <div className={`p-3 rounded-2xl bg-gradient-to-br ${iconGrad[color]} text-white shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const readEntries = (type: 'revenue' | 'expense') => {
  try {
    const raw = localStorage.getItem(`finance-entries-${type}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const sumEntries = (entries: any[]) => entries.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

const SmallSplitBar: React.FC<{ manual: number; automatic: number }> = ({ manual, automatic }) => {
  const total = manual + automatic || 1;
  const manualPct = Math.round((manual / total) * 100);
  const autoPct = 100 - manualPct;
  return (
    <div className="mt-2 w-full bg-gray-100 rounded h-2 overflow-hidden">
      <div className="h-2 bg-blue-500" style={{ width: `${manualPct}%` }} />
      <div className="h-2 bg-green-400" style={{ width: `${autoPct}%`, marginLeft: `-${autoPct}%`, display: 'inline-block' }} />
    </div>
  );
};

const InvestmentDashboard: React.FC = () => {
  const [revenueManual, setRevenueManual] = React.useState(0);
  const [revenueAuto, setRevenueAuto] = React.useState(0);
  const [expenseManual, setExpenseManual] = React.useState(0);
  const [expenseAuto, setExpenseAuto] = React.useState(0);

  const recompute = () => {
    const rev = readEntries('revenue');
    const exp = readEntries('expense');
    const rManual = rev.filter((e:any) => !e.automatic);
    const rAuto = rev.filter((e:any) => e.automatic);
    const eManual = exp.filter((e:any) => !e.automatic);
    const eAuto = exp.filter((e:any) => e.automatic);
    setRevenueManual(sumEntries(rManual));
    setRevenueAuto(sumEntries(rAuto));
    setExpenseManual(sumEntries(eManual));
    setExpenseAuto(sumEntries(eAuto));
  };

  React.useEffect(() => {
    recompute();
    const off1 = eventBus.on('finance.updated', () => recompute());
    return () => { try { off1(); } catch {} };
  }, []);

  const totalRevenue = revenueManual + revenueAuto;
  const totalExpense = expenseManual + expenseAuto;
  const netProfit = totalRevenue - totalExpense;

  const stats = [
    { title: 'إجمالي الإيرادات', value: formatCurrencyMRU(totalRevenue), icon: <DollarSign size={22} />, color: 'green' as const, manual: revenueManual, auto: revenueAuto },
    { title: 'إجمالي المصاريف', value: formatCurrencyMRU(totalExpense), icon: <TrendingUp size={22} />, color: 'orange' as const, manual: expenseManual, auto: expenseAuto },
    { title: 'صافي الربح', value: formatCurrencyMRU(netProfit), icon: <TrendingUp size={22} />, color: netProfit >= 0 ? 'green' : 'purple' as const, manual: netProfit >=0 ? Math.max(0, revenueManual - expenseManual) : 0, auto: netProfit >=0 ? Math.max(0, revenueAuto - expenseAuto) : 0 },
  ];

  const quick = [
    { title: 'الطلبات', value: formatNumberEN(1258), icon: <Package size={22} />, color: 'blue' as const, trend: '+2.4%', trendUp: true },
    { title: 'الشحنات', value: formatNumberEN(342), icon: <Truck size={22} />, color: 'orange' as const, trend: '+1.1%', trendUp: true },
    { title: 'المسلمة', value: formatNumberEN(856), icon: <CheckCircle size={22} />, color: 'green' as const, trend: '+3.2%', trendUp: true },
    { title: 'غير المسلمة', value: formatNumberEN(144), icon: <TrendingUp size={22} />, color: 'purple' as const, trend: '-0.6%', trendUp: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-brand-blue to-brand-blue-dark rounded-xl shadow-lg">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">لوحة ��حكم الاستثمار</h1>
            <p className="text-sm text-muted-foreground">ملخص الأرقام المالية مع فصل واضح بين العمليات اليدوية والتلقائية</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quick.map((s) => (
            <StatCard key={s.title} {...s} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl"><TrendingUp size={18} className="text-white" /></div>
              <h3 className="text-lg font-bold">نظرة مالية</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stats.map((s) => (
                <div key={s.title}>
                  <StatCard title={s.title} value={s.value} icon={s.icon} color={s.color as any} />
                  <SmallSplitBar manual={(s as any).manual || 0} automatic={(s as any).auto || 0} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl"><BarChart3 size={18} className="text-white" /></div>
              <h3 className="text-lg font-bold">المخططات</h3>
            </div>
            <div className="h-56 bg-gradient-to-br from-blue-50 to-blue-100/40 dark:from-blue-900/10 dark:to-blue-800/10 rounded-2xl border border-blue-200/30 dark:border-blue-700/20 flex items-center justify-center">
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <BarChart3 size={28} className="text-white" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">المخططات التفصيلية قريباً</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentDashboard;
