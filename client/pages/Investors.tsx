import React from 'react';
import { formatCurrencyMRU, formatDateTime } from '@/utils/format';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings as SettingsIcon,
  Phone as PhoneIcon,
  MessageSquare,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Edit,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  History,
  Wallet,
  Calculator,
  Target,
  AlertCircle,
  Building2
} from 'lucide-react';
import {
  calculateInvestmentFinancials,
  loadProjectSettings,
  loadProjectWithdrawals,
  loadFinancialEntries,
  type Investor,
  type ProjectSettings
} from '@/lib/investmentCalculations';

type Investor = { 
  id: string; 
  name: string; 
  email: string; 
  phone?: string; 
  whatsapp?: string; 
  capital: number; 
  percent: number; 
  totalProfit: number; 
  balance: number; 
  totalWithdrawals: number; 
  joined: string;
  transactions?: Array<{
    id: string;
    type: 'investment' | 'withdrawal' | 'profit';
    amount: number;
    date: string;
    description: string;
  }>;
};

const sample: Investor[] = [
  { 
    id: 'u1', 
    name: 'أحمد بن زين', 
    email: 'ahmed@example.com', 
    phone: '+22211111111', 
    whatsapp: '+22211111111', 
    capital: 50000, 
    percent: 20, 
    totalProfit: 15000, 
    balance: 12500, 
    totalWithdrawals: 2500, 
    joined: new Date().toISOString(),
    transactions: [
      { id: 't1', type: 'investment', amount: 50000, date: new Date().toISOString(), description: 'استثمار أولي' },
      { id: 't2', type: 'profit', amount: 15000, date: new Date(Date.now() - 86400000 * 15).toISOString(), description: 'أرباح الربع الأول' },
      { id: 't3', type: 'withdrawal', amount: 2500, date: new Date(Date.now() - 86400000 * 5).toISOString(), description: 'سحب جزئي' }
    ]
  },
  { 
    id: 'u2', 
    name: 'سارة العمر', 
    email: 'sarah@example.com', 
    phone: '+22222222222', 
    whatsapp: '+22222222222', 
    capital: 80000, 
    percent: 25, 
    totalProfit: 30000, 
    balance: 32000, 
    totalWithdrawals: 5000, 
    joined: new Date(Date.now() - 86400000 * 30).toISOString(),
    transactions: [
      { id: 't4', type: 'investment', amount: 80000, date: new Date(Date.now() - 86400000 * 30).toISOString(), description: 'استثمار أولي' },
      { id: 't5', type: 'profit', amount: 30000, date: new Date(Date.now() - 86400000 * 10).toISOString(), description: 'أرباح متراكمة' }
    ]
  },
  { 
    id: 'u3', 
    name: 'علي حسن', 
    email: 'ali@example.com', 
    phone: '+22233333333', 
    whatsapp: '+22233333333', 
    capital: 20000, 
    percent: 15, 
    totalProfit: 7000, 
    balance: 8000, 
    totalWithdrawals: 2000, 
    joined: new Date(Date.now() - 86400000 * 200).toISOString(),
    transactions: [
      { id: 't6', type: 'investment', amount: 20000, date: new Date(Date.now() - 86400000 * 200).toISOString(), description: 'استثمار أولي' },
      { id: 't7', type: 'withdrawal', amount: 2000, date: new Date(Date.now() - 86400000 * 50).toISOString(), description: 'سحب جزئي' }
    ]
  },
  { 
    id: 'u4', 
    name: 'مؤسسة XYZ', 
    email: 'corp@example.com', 
    phone: '+22244444444', 
    whatsapp: '+22244444444', 
    capital: 100000, 
    percent: 30, 
    totalProfit: 50000, 
    balance: 50000, 
    totalWithdrawals: 10000, 
    joined: new Date(Date.now() - 86400000 * 400).toISOString(),
    transactions: [
      { id: 't8', type: 'investment', amount: 100000, date: new Date(Date.now() - 86400000 * 400).toISOString(), description: 'استثمار مؤسسي' },
      { id: 't9', type: 'profit', amount: 25000, date: new Date(Date.now() - 86400000 * 100).toISOString(), description: 'أرباح الربع الأول' },
      { id: 't10', type: 'profit', amount: 25000, date: new Date(Date.now() - 86400000 * 20).toISOString(), description: 'أرباح الر��ع الثاني' }
    ]
  },
];

const Investors: React.FC = () => {
  const [items] = React.useState<Investor[]>(sample);
  const [filteredItems, setFilteredItems] = React.useState<Investor[]>(sample);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedCards, setExpandedCards] = React.useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [filterBy, setFilterBy] = React.useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Load project settings and financial data
  const [projectSettings] = React.useState<ProjectSettings>(loadProjectSettings());
  const [revenueEntries] = React.useState(loadFinancialEntries('revenue'));
  const [expenseEntries] = React.useState(loadFinancialEntries('expense'));
  const [projectWithdrawals] = React.useState(loadProjectWithdrawals());

  // Calculate updated financials using new formulas
  const financials = React.useMemo(() => {
    return calculateInvestmentFinancials(
      items,
      projectSettings,
      projectWithdrawals,
      revenueEntries,
      expenseEntries
    );
  }, [items, projectSettings, projectWithdrawals, revenueEntries, expenseEntries]);

  useLockBodyScroll(settingsOpen);

  // Search and filter logic
  React.useEffect(() => {
    let filtered = items.filter(investor => 
      investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      investor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (investor.phone && investor.phone.includes(searchQuery))
    );

    if (filterBy !== 'all') {
      filtered = filtered.filter(investor => {
        if (filterBy === 'high') return investor.capital >= 70000;
        if (filterBy === 'medium') return investor.capital >= 30000 && investor.capital < 70000;
        if (filterBy === 'low') return investor.capital < 30000;
        return true;
      });
    }

    setFilteredItems(filtered);
  }, [searchQuery, filterBy, items]);

  const toggleExpanded = (investorId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(investorId)) {
      newExpanded.delete(investorId);
    } else {
      newExpanded.add(investorId);
    }
    setExpandedCards(newExpanded);
  };

  const getFilterButtonClass = (filter: string) => {
    return `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      filterBy === filter 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">إدارة المستثمرين</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                نظام محدث مع حسابات نسبة المشروع
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                نسبة المشروع: {projectSettings.profitPercentage}%
              </Badge>
              <Button
                onClick={() => setSettingsOpen(true)}
                variant="outline"
                className="h-12 px-4 text-base"
              >
                <SettingsIcon className="w-5 h-5" />
                إعدادات
              </Button>
            </div>
          </div>
        </header>

        {/* Financial Summary */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-blue-600 mb-1">إجمالي الاستثمار</div>
                  <div className="text-lg font-bold">{formatCurrencyMRU(financials.totalInvestment)}</div>
                </div>
                <Wallet className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-green-600 mb-1">الربح الإجمالي</div>
                  <div className="text-lg font-bold">{formatCurrencyMRU(financials.grossProfit)}</div>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-purple-600 mb-1">نسبة المشروع</div>
                  <div className="text-lg font-bold">{formatCurrencyMRU(financials.projectShare)}</div>
                </div>
                <Building2 className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-orange-600 mb-1">للتوزيع</div>
                  <div className="text-lg font-bold">{formatCurrencyMRU(financials.netProfitForDistribution)}</div>
                </div>
                <Target className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="البحث عن مستثمر (الاسم، الإيميل، الهاتف...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pr-12 text-base"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              <span>فلترة حسب رأس المال:</span>
            </div>
            <button 
              onClick={() => setFilterBy('all')} 
              className={getFilterButtonClass('all')}
            >
              الكل ({items.length})
            </button>
            <button 
              onClick={() => setFilterBy('high')} 
              className={getFilterButtonClass('high')}
            >
              عالي (+70,000) ({items.filter(i => i.capital >= 70000).length})
            </button>
            <button 
              onClick={() => setFilterBy('medium')} 
              className={getFilterButtonClass('medium')}
            >
              متوسط (30,000-70,000) ({items.filter(i => i.capital >= 30000 && i.capital < 70000).length})
            </button>
            <button 
              onClick={() => setFilterBy('low')} 
              className={getFilterButtonClass('low')}
            >
              منخفض (-30,000) ({items.filter(i => i.capital < 30000).length})
            </button>
          </div>
        </div>

        {/* Investors Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredItems.map((investor) => {
            const isExpanded = expandedCards.has(investor.id);
            return (
              <Card key={investor.id} className="overflow-hidden transition-all duration-200 hover:shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg sm:text-xl mb-1">{investor.name}</CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{investor.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleExpanded(investor.id)}
                      className="ml-2 h-8 w-8"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Contact Info */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    {investor.phone && (
                      <a 
                        href={`tel:${investor.phone}`}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                      >
                        <PhoneIcon className="w-4 h-4" />
                        <span>{investor.phone}</span>
                      </a>
                    )}
                    {investor.whatsapp && (
                      <a 
                        href={`https://wa.me/${investor.whatsapp.replace(/\D/g,'')}`}
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>واتساب</span>
                      </a>
                    )}
                  </div>

                  {/* Investment Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs mb-1">
                        <Wallet className="w-3 h-3" />
                        <span>رأس المال</span>
                      </div>
                      <div className="font-bold text-lg">{formatCurrencyMRU(investor.capital)}</div>
                      <div className="text-xs text-gray-500">نسبة: {investor.percent}%</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs mb-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>الرصيد المحدث</span>
                      </div>
                      <div className="font-bold text-lg text-green-700 dark:text-green-400">
                        {formatCurrencyMRU(financials.updatedInvestors.find(inv => inv.id === investor.id)?.currentBalance || investor.balance)}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="space-y-4 pt-4 border-t">
                      {(() => {
                        const updatedInvestor = financials.updatedInvestors.find(inv => inv.id === investor.id);
                        return (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs mb-1">
                                  <Calculator className="w-3 h-3" />
                                  <span>الأرباح المحسوبة</span>
                                </div>
                                <div className="font-bold text-lg text-blue-700 dark:text-blue-400">
                                  {formatCurrencyMRU(updatedInvestor?.calculatedProfit || investor.totalProfit)}
                                </div>
                                <div className="text-xs text-blue-600">
                                  بعد خصم نسبة المشروع ({projectSettings.profitPercentage}%)
                                </div>
                              </div>
                              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs mb-1">
                                  <TrendingDown className="w-3 h-3" />
                                  <span>إجمالي السحوبات</span>
                                </div>
                                <div className="font-bold text-lg text-red-700 dark:text-red-400">{formatCurrencyMRU(investor.totalWithdrawals)}</div>
                              </div>
                            </div>

                            {/* Performance Metrics */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs mb-1">
                                  <Target className="w-3 h-3" />
                                  <span>العائد المتوقع</span>
                                </div>
                                <div className="font-bold text-lg text-purple-700 dark:text-purple-400">
                                  {updatedInvestor?.projectedAnnualReturn.toFixed(1) || '0.0'}%
                                </div>
                              </div>
                              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs mb-1">
                                  <Building2 className="w-3 h-3" />
                                  <span>هامش الربح</span>
                                </div>
                                <div className="font-bold text-lg text-orange-700 dark:text-orange-400">
                                  {updatedInvestor?.profitMargin.toFixed(1) || '0.0'}%
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}

                      {/* Transaction History */}
                      {investor.transactions && investor.transactions.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-3">
                            <History className="w-4 h-4" />
                            <span>آخر العمليات</span>
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {investor.transactions.slice(0, 5).map((transaction) => (
                              <div key={transaction.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                                <div>
                                  <div className="font-medium">{transaction.description}</div>
                                  <div className="text-xs text-gray-500">{formatDateTime(transaction.date)}</div>
                                </div>
                                <div className={`font-bold ${
                                  transaction.type === 'profit' ? 'text-green-600' :
                                  transaction.type === 'withdrawal' ? 'text-red-600' :
                                  'text-blue-600'
                                }`}>
                                  {transaction.type === 'withdrawal' ? '-' : '+'}
                                  {formatCurrencyMRU(transaction.amount)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="gap-2 flex-wrap">
                  <Button variant="default" size="sm" className="flex-1 min-w-0">
                    <Edit className="w-4 h-4" />
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 min-w-0">
                    <Plus className="w-4 h-4" />
                    استثمار جديد
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 min-w-0">
                    <Minus className="w-4 h-4" />
                    تسجيل سحب
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد نتائج</h3>
            <p className="text-gray-600 dark:text-gray-400">
              لم يتم العثور على مستثمرين تطابق معايير البحث
            </p>
          </div>
        )}

        {/* Settings Sheet */}
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md max-h-screen overflow-y-auto">
            <SheetHeader>
              <SheetTitle>إعدادات صفحة المستثمرين</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <Tabs defaultValue="display">
                <TabsList className="flex gap-2 p-2 bg-gray-100 rounded-lg">
                  <TabsTrigger value="display">إعدادات العرض</TabsTrigger>
                  <TabsTrigger value="calc">الح��ابات والأرباح</TabsTrigger>
                  <TabsTrigger value="reports">التقارير</TabsTrigger>
                </TabsList>
                <TabsContent value="display" className="mt-4 space-y-3">
                  <div className="text-sm text-muted-foreground">تخصيص الأعمدة والفلاتر قريباً</div>
                </TabsContent>
                <TabsContent value="calc" className="mt-4 space-y-3">
                  <div className="text-sm text-muted-foreground">تحديد آلية الحساب وتحديث الأرباح قريباً</div>
                </TabsContent>
                <TabsContent value="reports" className="mt-4 space-y-3">
                  <div className="text-sm text-muted-foreground">تصدير وتقارير دورية قريباً</div>
                </TabsContent>
              </Tabs>
            </div>
            <SheetFooter className="mt-4 flex justify-end">
              <Button onClick={() => setSettingsOpen(false)}>حفظ</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default Investors;
