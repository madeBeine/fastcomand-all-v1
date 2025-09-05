import React from 'react';
import {
  Package, Truck, CheckCircle, DollarSign, TrendingUp, TrendingDown, BarChart3,
  Settings, AlertTriangle, PieChart, Calendar, Filter, Download,
  Plus, Minus, Eye, Edit, Trash, Save, X, Building2, Users,
  ArrowUpCircle, ArrowDownCircle, Wallet, Target, ShieldCheck
} from 'lucide-react';
import { formatNumberEN, formatCurrencyMRU, formatDateTime, formatDate } from '@/utils/format';
import { eventBus } from '@/lib/eventBus';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import InvestmentChart from '@/components/InvestmentChart';
import FinancialSummary from '@/components/FinancialSummary';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'orange' | 'green' | 'purple' | 'red';
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
  chart?: boolean;
}

interface ProjectSettings {
  profitPercentage: number; // نسبة المشروع من الأرباح
  projectName: string;
  taxRate: number;
  managementFee: number;
}

interface ProjectWithdrawal {
  id: string;
  amount: number;
  date: string;
  description: string;
  approvedBy: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface Investor {
  id: string;
  name: string;
  capital: number;
  percent: number;
  totalProfit: number;
  balance: number;
  totalWithdrawals: number;
  joined: string;
}

interface TimeFilter {
  period: 'all' | 'week' | 'month' | 'quarter' | 'year';
  customStart?: string;
  customEnd?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, value, icon, color = 'blue', trend, trendUp, subtitle, chart 
}) => {
  const colorClasses = {
    blue: {
      bg: 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10',
      icon: 'from-brand-blue to-brand-blue-dark',
      border: 'border-blue-200/30 dark:border-blue-700/20'
    },
    orange: {
      bg: 'from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10',
      icon: 'from-brand-orange to-brand-orange-dark',
      border: 'border-orange-200/30 dark:border-orange-700/20'
    },
    green: {
      bg: 'from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10',
      icon: 'from-green-500 to-green-600',
      border: 'border-green-200/30 dark:border-green-700/20'
    },
    purple: {
      bg: 'from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10',
      icon: 'from-purple-500 to-purple-600',
      border: 'border-purple-200/30 dark:border-purple-700/20'
    },
    red: {
      bg: 'from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10',
      icon: 'from-red-500 to-red-600',
      border: 'border-red-200/30 dark:border-red-700/20'
    }
  };

  const classes = colorClasses[color];

  return (
    <Card className={`relative bg-gradient-to-br ${classes.bg} ${classes.border} hover:shadow-lg transition-all duration-300 group overflow-hidden`}>
      <CardContent className="p-6">
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]">
          <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${classes.icon} rounded-full blur-3xl`} />
        </div>
        <div className="relative flex items-start justify-between">
          <div className="flex-1">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{title}</div>
            <div className="text-2xl font-bold mb-1">{value}</div>
            {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
            {trend && (
              <div className={`flex items-center text-sm font-medium mt-2 ${
                trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {trendUp ? <ArrowUpCircle size={14} className="mr-1" /> : <ArrowDownCircle size={14} className="mr-1" />}
                {trend}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${classes.icon} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
        </div>
        {chart && (
          <div className="mt-4 h-16 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-lg flex items-end gap-1 px-2">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className={`bg-gradient-to-t ${classes.icon} rounded-sm opacity-60`}
                style={{ height: `${Math.random() * 100}%`, width: '6px' }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  amount?: number;
}> = ({ isOpen, onClose, onConfirm, title, message, amount }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={24} className="text-white" />
          </div>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
          {amount && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatCurrencyMRU(amount)}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">إلغاء</Button>
          <Button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white">تأكيد</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const InvestmentDashboard: React.FC = () => {
  // State management
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>({ period: 'month' });
  const [projectSettings, setProjectSettings] = React.useState<ProjectSettings>({
    profitPercentage: 10,
    projectName: 'Fast Command',
    taxRate: 5,
    managementFee: 2
  });
  
  const [projectWithdrawals, setProjectWithdrawals] = React.useState<ProjectWithdrawal[]>([]);
  const [investors] = React.useState<Investor[]>([
    {
      id: 'u1',
      name: 'أحمد بن زين',
      capital: 50000,
      percent: 20,
      totalProfit: 15000,
      balance: 12500,
      totalWithdrawals: 2500,
      joined: new Date().toISOString()
    },
    {
      id: 'u2',
      name: 'سارة العمر',
      capital: 80000,
      percent: 25,
      totalProfit: 30000,
      balance: 32000,
      totalWithdrawals: 5000,
      joined: new Date(Date.now() - 86400000 * 30).toISOString()
    }
  ]);

  // Financial data
  const [revenueEntries, setRevenueEntries] = React.useState<any[]>([]);
  const [expenseEntries, setExpenseEntries] = React.useState<any[]>([]);
  
  // UI State
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = React.useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [pendingWithdrawal, setPendingWithdrawal] = React.useState<Omit<ProjectWithdrawal, 'id'> | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = React.useState(false);
  
  const [newWithdrawal, setNewWithdrawal] = React.useState({
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10)
  });

  // Load financial data
  const loadFinancialData = React.useCallback(() => {
    try {
      const revenue = JSON.parse(localStorage.getItem('finance-entries-revenue') || '[]');
      const expenses = JSON.parse(localStorage.getItem('finance-entries-expense') || '[]');
      setRevenueEntries(revenue);
      setExpenseEntries(expenses);
    } catch (error) {
      setRevenueEntries([]);
      setExpenseEntries([]);
    }
  }, []);

  React.useEffect(() => {
    loadFinancialData();
    const unsubscribe = eventBus.on('finance.updated', loadFinancialData);
    return () => { try { unsubscribe(); } catch {} };
  }, [loadFinancialData]);

  // Financial calculations with new formulas
  const calculateFinancials = React.useMemo(() => {
    const totalRevenue = revenueEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const totalExpenses = expenseEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const grossProfit = totalRevenue - totalExpenses;
    
    // Total invested capital
    const totalInvestment = investors.reduce((sum, inv) => sum + inv.capital, 0);
    
    // Project percentage from profits (before distributing to investors)
    const projectShare = grossProfit * (projectSettings.profitPercentage / 100);
    const netProfitForDistribution = grossProfit - projectShare;
    
    // Total investor withdrawals
    const totalInvestorWithdrawals = investors.reduce((sum, inv) => sum + inv.totalWithdrawals, 0);
    
    // Total project withdrawals
    const totalProjectWithdrawals = projectWithdrawals
      .filter(w => w.status === 'approved')
      .reduce((sum, w) => sum + w.amount, 0);
    
    // Updated investor calculations
    const updatedInvestors = investors.map(investor => {
      // Individual investor profit calculation
      const individualProfit = netProfitForDistribution * (investor.percent / 100);
      const totalInvestorProfit = individualProfit;
      const currentBalance = investor.capital + totalInvestorProfit - investor.totalWithdrawals;
      
      return {
        ...investor,
        calculatedProfit: totalInvestorProfit,
        currentBalance: Math.max(0, currentBalance)
      };
    });
    
    // Project balance calculations
    const projectBalanceBeforeWithdrawals = projectShare;
    const projectBalanceAfterWithdrawals = projectBalanceBeforeWithdrawals - totalProjectWithdrawals;
    
    // Total project current balance
    const totalProjectBalance = totalInvestment + totalRevenue - totalExpenses - totalInvestorWithdrawals - totalProjectWithdrawals + projectBalanceAfterWithdrawals;
    
    return {
      totalRevenue,
      totalExpenses,
      grossProfit,
      projectShare,
      netProfitForDistribution,
      totalInvestment,
      totalInvestorWithdrawals,
      totalProjectWithdrawals,
      projectBalanceBeforeWithdrawals,
      projectBalanceAfterWithdrawals,
      totalProjectBalance,
      updatedInvestors
    };
  }, [revenueEntries, expenseEntries, investors, projectSettings.profitPercentage, projectWithdrawals]);

  const handleProjectWithdrawal = () => {
    if (!newWithdrawal.amount || Number(newWithdrawal.amount) <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    const withdrawal: Omit<ProjectWithdrawal, 'id'> = {
      amount: Number(newWithdrawal.amount),
      description: newWithdrawal.description || 'سحب للمشروع',
      date: new Date(newWithdrawal.date).toISOString(),
      approvedBy: 'النظام',
      status: 'pending'
    };

    setPendingWithdrawal(withdrawal);
    setConfirmModalOpen(true);
  };

  const confirmProjectWithdrawal = () => {
    if (pendingWithdrawal) {
      const newWithdrawalEntry: ProjectWithdrawal = {
        ...pendingWithdrawal,
        id: 'pw_' + Date.now(),
        status: 'approved'
      };

      setProjectWithdrawals(prev => [newWithdrawalEntry, ...prev]);
      setNewWithdrawal({ amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
      setWithdrawalModalOpen(false);
      setConfirmModalOpen(false);
      setPendingWithdrawal(null);

      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  };

  const stats = [
    {
      title: 'إجمالي الاستثمار',
      value: formatCurrencyMRU(calculateFinancials.totalInvestment),
      icon: <Wallet size={22} />,
      color: 'blue' as const,
      subtitle: `من ${investors.length} مستثمر`,
      chart: true
    },
    {
      title: 'إجمالي الإيرادات',
      value: formatCurrencyMRU(calculateFinancials.totalRevenue),
      icon: <DollarSign size={22} />,
      color: 'green' as const,
      trend: '+12.5%',
      trendUp: true,
      chart: true
    },
    {
      title: 'إجمالي المصاريف',
      value: formatCurrencyMRU(calculateFinancials.totalExpenses),
      icon: <TrendingDown size={22} />,
      color: 'red' as const,
      trend: '+8.2%',
      trendUp: false,
      chart: true
    },
    {
      title: 'إجمالي الربح',
      value: formatCurrencyMRU(calculateFinancials.grossProfit),
      icon: <TrendingUp size={22} />,
      color: calculateFinancials.grossProfit >= 0 ? 'green' : 'red' as const,
      trend: '+23.1%',
      trendUp: calculateFinancials.grossProfit >= 0,
      chart: true
    },
    {
      title: 'نسبة المشروع',
      value: formatCurrencyMRU(calculateFinancials.projectShare),
      icon: <Building2 size={22} />,
      color: 'purple' as const,
      subtitle: `${projectSettings.profitPercentage}% من الأرباح`,
      chart: true
    },
    {
      title: 'رصيد المشروع',
      value: formatCurrencyMRU(calculateFinancials.projectBalanceAfterWithdrawals),
      icon: <Target size={22} />,
      color: 'orange' as const,
      subtitle: 'بعد السحوبات',
      chart: true
    },
    {
      title: 'سحوبات المستثمرين',
      value: formatCurrencyMRU(calculateFinancials.totalInvestorWithdrawals),
      icon: <Users size={22} />,
      color: 'red' as const,
      subtitle: 'إجمالي السحوبات',
      chart: true
    },
    {
      title: 'الرصيد الإجمالي',
      value: formatCurrencyMRU(calculateFinancials.totalProjectBalance),
      icon: <BarChart3 size={22} />,
      color: calculateFinancials.totalProjectBalance >= 0 ? 'green' : 'red' as const,
      subtitle: 'الرصيد النهائي للمشروع',
      chart: true
    }
  ];

  const chartData = [
    { label: 'الاستثمار', value: calculateFinancials.totalInvestment, color: 'bg-blue-500' },
    { label: 'الإيرادات', value: calculateFinancials.totalRevenue, color: 'bg-green-500' },
    { label: 'المصاريف', value: calculateFinancials.totalExpenses, color: 'bg-red-500' },
    { label: 'نسبة المشروع', value: calculateFinancials.projectShare, color: 'bg-purple-500' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-brand-blue to-brand-blue-dark rounded-xl shadow-lg">
              <BarChart3 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">{projectSettings.projectName} - لوحة الاستثمار</h1>
              <p className="text-sm text-muted-foreground">نظام إدارة شامل مع نسبة المشروع وسحوبات محدثة</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setWithdrawalModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Minus size={16} />
              سحب للمشروع
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2"
            >
              <Settings size={16} />
              إعدادات
            </Button>
          </div>
        </div>

        {/* Time Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">فترة التحليل:</span>
              <div className="flex gap-2">
                {(['week', 'month', 'quarter', 'year', 'all'] as const).map(period => (
                  <Button
                    key={period}
                    variant={timeFilter.period === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeFilter({ period })}
                  >
                    {period === 'week' ? 'أسبوع' : 
                     period === 'month' ? 'شهر' :
                     period === 'quarter' ? 'ربع سنة' :
                     period === 'year' ? 'سنة' : 'الكل'}
                  </Button>
                ))}
              </div>
              <Calendar size={16} className="text-gray-400" />
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Profit Distribution Chart */}
          <InvestmentChart
            title="توزيع الأرباح"
            type="pie"
            data={[
              {
                label: `نسبة المشروع (${projectSettings.profitPercentage}%)`,
                value: calculateFinancials.projectShare,
                color: 'bg-purple-500'
              },
              {
                label: 'نسبة المستثمرين',
                value: calculateFinancials.netProfitForDistribution,
                color: 'bg-green-500'
              }
            ]}
            showPercentages={true}
          />

          {/* Financial Flow Chart */}
          <InvestmentChart
            title="التدفق المالي"
            type="bar"
            data={chartData}
            height="h-80"
          />
        </div>

        {/* Additional Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Investor Performance */}
          <InvestmentChart
            title="أداء المستثمرين"
            type="bar"
            data={calculateFinancials.updatedInvestors.slice(0, 5).map(inv => ({
              label: inv.name.split(' ')[0],
              value: inv.currentBalance,
              color: 'bg-blue-500'
            }))}
            height="h-64"
          />

          {/* Monthly Trend */}
          <InvestmentChart
            title="الاتجاه الشهري"
            type="line"
            data={[
              { label: 'يناير', value: calculateFinancials.totalRevenue * 0.7, color: 'bg-blue-500' },
              { label: 'فبراير', value: calculateFinancials.totalRevenue * 0.8, color: 'bg-blue-500' },
              { label: 'مارس', value: calculateFinancials.totalRevenue * 0.9, color: 'bg-blue-500' },
              { label: 'أبريل', value: calculateFinancials.totalRevenue, color: 'bg-blue-500' }
            ]}
            height="h-64"
          />
        </div>

        {/* Financial Summary */}
        <div className="mb-8">
          <FinancialSummary
            financials={calculateFinancials}
            projectSettings={projectSettings}
            timeFilter={timeFilter.period}
          />
        </div>

        {/* Project Withdrawals Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 size={20} />
              سحوبات المشروع
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectWithdrawals.length > 0 ? (
              <div className="space-y-3">
                {projectWithdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{withdrawal.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDateTime(withdrawal.date)} • بواسطة {withdrawal.approvedBy}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatCurrencyMRU(withdrawal.amount)}</div>
                      <Badge variant={withdrawal.status === 'approved' ? 'default' : 'secondary'}>
                        {withdrawal.status === 'approved' ? 'مؤكد' : 'معلق'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد سحوبات للمشروع بع��
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Withdrawal Modal */}
        <Sheet open={withdrawalModalOpen} onOpenChange={setWithdrawalModalOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Building2 size={20} />
                سحب جديد للمشروع
              </SheetTitle>
            </SheetHeader>
            
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium">المبلغ (MRU)</label>
                <Input
                  type="number"
                  value={newWithdrawal.amount}
                  onChange={(e) => setNewWithdrawal(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">الوصف</label>
                <Input
                  value={newWithdrawal.description}
                  onChange={(e) => setNewWithdrawal(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="سبب السحب..."
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">التاريخ</label>
                <Input
                  type="date"
                  value={newWithdrawal.date}
                  onChange={(e) => setNewWithdrawal(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {/* Available Balance Warning */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400 text-sm">
                  <AlertTriangle size={16} />
                  <span>الرصيد المتاح للمشروع: {formatCurrencyMRU(calculateFinancials.projectBalanceAfterWithdrawals)}</span>
                </div>
              </div>
            </div>

            <SheetFooter className="mt-6">
              <Button variant="outline" onClick={() => setWithdrawalModalOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleProjectWithdrawal} className="flex items-center gap-2">
                <ShieldCheck size={16} />
                تأكيد السحب
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Settings Modal */}
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>إعدادات المشروع</SheetTitle>
            </SheetHeader>
            
            <div className="mt-6">
              <Tabs defaultValue="project">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="project">المشروع</TabsTrigger>
                  <TabsTrigger value="calculations">الحسابات</TabsTrigger>
                </TabsList>
                
                <TabsContent value="project" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">اسم المشروع</label>
                    <Input
                      value={projectSettings.projectName}
                      onChange={(e) => setProjectSettings(prev => ({ ...prev, projectName: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">نسبة المشروع من الأرباح (%)</label>
                    <Input
                      type="number"
                      value={projectSettings.profitPercentage}
                      onChange={(e) => setProjectSettings(prev => ({ ...prev, profitPercentage: Number(e.target.value) }))}
                      className="mt-1"
                      min="0"
                      max="100"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="calculations" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">معدل الضريبة (%)</label>
                    <Input
                      type="number"
                      value={projectSettings.taxRate}
                      onChange={(e) => setProjectSettings(prev => ({ ...prev, taxRate: Number(e.target.value) }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">رسوم الإدارة (%)</label>
                    <Input
                      type="number"
                      value={projectSettings.managementFee}
                      onChange={(e) => setProjectSettings(prev => ({ ...prev, managementFee: Number(e.target.value) }))}
                      className="mt-1"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <SheetFooter className="mt-6">
              <Button onClick={() => setSettingsOpen(false)}>
                حفظ الإعدادات
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmModalOpen}
          onClose={() => {
            setConfirmModalOpen(false);
            setPendingWithdrawal(null);
          }}
          onConfirm={confirmProjectWithdrawal}
          title="تأكيد سحب المشروع"
          message="هل أنت متأكد من تسجيل هذا السحب للمشروع؟ لا يمكن التراجع عن هذا الإجراء."
          amount={pendingWithdrawal?.amount}
        />

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="fixed top-4 right-4 z-50 max-w-sm">
            <div className="bg-green-600 text-white p-4 rounded-lg shadow-lg flex items-center gap-3">
              <CheckCircle size={20} />
              <div>
                <div className="font-medium">تم السحب بنجاح!</div>
                <div className="text-sm opacity-90">تم تسجيل السحب وتحديث الأرصدة</div>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="text-white hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestmentDashboard;
