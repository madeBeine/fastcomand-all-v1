import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, Settings, Percent, Calculator, Target, 
  DollarSign, Shield, Save, Plus, Trash2, Edit, 
  BarChart3, PieChart, AlertTriangle, Building2,
  FileText, Clock, Users, Wallet
} from 'lucide-react';
import { 
  loadProjectSettings, 
  saveProjectSettings, 
  ProjectSettings,
  formatMRU 
} from '@/lib/investmentCalculations';

interface FinancialCategory {
  id: string;
  name: string;
  type: 'revenue' | 'expense';
  isDefault: boolean;
}

interface WithdrawalPolicy {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  requiresApproval: boolean;
  approvalThreshold: number;
  cooldownPeriod: number; // days
}

const InvestmentSettings: React.FC = () => {
  const { toast } = useToast();

  // Project Settings State
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>(() => loadProjectSettings());
  
  // Financial Categories State
  const [revenueCategories, setRevenueCategories] = useState<FinancialCategory[]>([
    { id: '1', name: 'أرباح المبيعات', type: 'revenue', isDefault: true },
    { id: '2', name: 'أرباح الاستثمار', type: 'revenue', isDefault: true },
    { id: '3', name: 'أرباح أخرى', type: 'revenue', isDefault: true }
  ]);
  
  const [expenseCategories, setExpenseCategories] = useState<FinancialCategory[]>([
    { id: '1', name: 'الرواتب', type: 'expense', isDefault: true },
    { id: '2', name: 'اللوجستيك', type: 'expense', isDefault: true },
    { id: '3', name: 'المصاريف الإدارية', type: 'expense', isDefault: true },
    { id: '4', name: 'مصاريف التسويق', type: 'expense', isDefault: true }
  ]);

  // Withdrawal Policies State
  const [withdrawalPolicies, setWithdrawalPolicies] = useState<WithdrawalPolicy[]>([
    {
      id: '1',
      name: 'سحب عادي',
      minAmount: 1000,
      maxAmount: 50000,
      requiresApproval: false,
      approvalThreshold: 25000,
      cooldownPeriod: 7
    },
    {
      id: '2', 
      name: 'سحب كبير',
      minAmount: 50000,
      maxAmount: 500000,
      requiresApproval: true,
      approvalThreshold: 50000,
      cooldownPeriod: 30
    }
  ]);

  // Risk Management Settings
  const [riskSettings, setRiskSettings] = useState({
    maxInvestorPercentage: 50,
    minInvestmentAmount: 10000,
    maxTotalInvestment: 10000000,
    autoRebalancing: true,
    riskAssessmentRequired: true,
    diversificationThreshold: 25
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    weeklyReports: true,
    monthlyReports: true,
    profitAlerts: true,
    lossAlerts: true,
    withdrawalAlerts: true
  });

  // Form States
  const [newRevenueCategory, setNewRevenueCategory] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editPolicyId, setEditPolicyId] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState<Omit<WithdrawalPolicy, 'id'>>({
    name: '',
    minAmount: 1000,
    maxAmount: 50000,
    requiresApproval: false,
    approvalThreshold: 25000,
    cooldownPeriod: 7
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedRevenue = localStorage.getItem('investment_revenue_categories');
      const savedExpense = localStorage.getItem('investment_expense_categories');
      const savedPolicies = localStorage.getItem('investment_withdrawal_policies');
      const savedRisk = localStorage.getItem('investment_risk_settings');
      const savedNotifications = localStorage.getItem('investment_notification_settings');

      if (savedRevenue) setRevenueCategories(JSON.parse(savedRevenue));
      if (savedExpense) setExpenseCategories(JSON.parse(savedExpense));
      if (savedPolicies) setWithdrawalPolicies(JSON.parse(savedPolicies));
      if (savedRisk) setRiskSettings({ ...riskSettings, ...JSON.parse(savedRisk) });
      if (savedNotifications) setNotificationSettings({ ...notificationSettings, ...JSON.parse(savedNotifications) });
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
  }, []);

  // Save Project Settings
  const saveProject = () => {
    try {
      saveProjectSettings(projectSettings);
      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات المشروع بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في حفظ إعدادات المشروع' });
    }
  };

  // Financial Categories Functions
  const addRevenueCategory = () => {
    if (!newRevenueCategory.trim()) return;
    
    const newCategory: FinancialCategory = {
      id: Date.now().toString(),
      name: newRevenueCategory.trim(),
      type: 'revenue',
      isDefault: false
    };
    
    const updated = [...revenueCategories, newCategory];
    setRevenueCategories(updated);
    localStorage.setItem('investment_revenue_categories', JSON.stringify(updated));
    setNewRevenueCategory('');
    toast({ title: 'تم الإضافة', description: 'تم إضافة فئة الإيرادات بنجاح' });
  };

  const addExpenseCategory = () => {
    if (!newExpenseCategory.trim()) return;
    
    const newCategory: FinancialCategory = {
      id: Date.now().toString(),
      name: newExpenseCategory.trim(),
      type: 'expense',
      isDefault: false
    };
    
    const updated = [...expenseCategories, newCategory];
    setExpenseCategories(updated);
    localStorage.setItem('investment_expense_categories', JSON.stringify(updated));
    setNewExpenseCategory('');
    toast({ title: 'تم الإضافة', description: 'تم إضافة فئة المصاريف بنجاح' });
  };

  const removeCategory = (id: string, type: 'revenue' | 'expense') => {
    if (type === 'revenue') {
      const category = revenueCategories.find(c => c.id === id);
      if (category?.isDefault) {
        toast({ title: 'تحذير', description: 'لا يمكن حذف الفئات الافتراضية' });
        return;
      }
      const updated = revenueCategories.filter(c => c.id !== id);
      setRevenueCategories(updated);
      localStorage.setItem('investment_revenue_categories', JSON.stringify(updated));
    } else {
      const category = expenseCategories.find(c => c.id === id);
      if (category?.isDefault) {
        toast({ title: 'تحذير', description: 'لا يمكن حذف الفئات الافتراضية' });
        return;
      }
      const updated = expenseCategories.filter(c => c.id !== id);
      setExpenseCategories(updated);
      localStorage.setItem('investment_expense_categories', JSON.stringify(updated));
    }
    toast({ title: 'تم الحذف', description: 'تم حذف الفئة بنجاح' });
  };

  // Risk Settings Functions
  const saveRiskSettings = () => {
    try {
      localStorage.setItem('investment_risk_settings', JSON.stringify(riskSettings));
      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات إدارة المخاطر بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في حفظ إعدادات إدارة المخاطر' });
    }
  };

  // Notification Settings Functions
  const saveNotificationSettings = () => {
    try {
      localStorage.setItem('investment_notification_settings', JSON.stringify(notificationSettings));
      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات التنبيهات بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في حفظ إعدادات التنبيهات' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              إعدادات الاستثمار
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              إدارة المشروع والمعاملات المالية وسياسات الاستثمار
            </p>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="project" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="project" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              إعدادات المشروع
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              الفئات المالية
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              إدارة المخاطر
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              التنبيهات
            </TabsTrigger>
          </TabsList>

          {/* Project Settings Tab */}
          <TabsContent value="project" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-500" />
                  معلومات المشروع الأساسية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      اسم المشروع
                    </label>
                    <Input
                      value={projectSettings.projectName}
                      onChange={(e) => setProjectSettings({
                        ...projectSettings,
                        projectName: e.target.value
                      })}
                      placeholder="اسم المشروع"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Percent className="h-4 w-4 inline mr-1" />
                      نسبة أرباح المشروع (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={projectSettings.profitPercentage}
                      onChange={(e) => setProjectSettings({
                        ...projectSettings,
                        profitPercentage: Math.min(100, Math.max(0, Number(e.target.value) || 0))
                      })}
                      placeholder="نسبة أرباح المشروع"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      النسبة التي يحصل عليها المشر��ع من إجمالي الأرباح
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      معدل الضريبة (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={projectSettings.taxRate}
                      onChange={(e) => setProjectSettings({
                        ...projectSettings,
                        taxRate: Math.min(50, Math.max(0, Number(e.target.value) || 0))
                      })}
                      placeholder="معدل الضريبة"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      رسوم الإدارة (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="20"
                      value={projectSettings.managementFee}
                      onChange={(e) => setProjectSettings({
                        ...projectSettings,
                        managementFee: Math.min(20, Math.max(0, Number(e.target.value) || 0))
                      })}
                      placeholder="رسوم الإدارة"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveProject}>
                    <Save className="h-4 w-4 mr-2" />
                    حفظ إعدادات المشروع
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-500" />
                  ملخص التوزيع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                    <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                      نسبة المشروع
                    </div>
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {projectSettings.profitPercentage}%
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      نسبة المستثمرين
                    </div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {100 - projectSettings.profitPercentage}%
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      إجمالي الرسوم
                    </div>
                    <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                      {projectSettings.taxRate + projectSettings.managementFee}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    فئات الإيرادات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newRevenueCategory}
                      onChange={(e) => setNewRevenueCategory(e.target.value)}
                      placeholder="اسم فئة الإيرادات الجديدة"
                      onKeyPress={(e) => e.key === 'Enter' && addRevenueCategory()}
                    />
                    <Button onClick={addRevenueCategory} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {revenueCategories.map(category => (
                      <div key={category.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 dark:text-white">{category.name}</span>
                          {category.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              افتراضي
                            </Badge>
                          )}
                        </div>
                        {!category.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCategory(category.id, 'revenue')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Expense Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-red-500" />
                    فئات المصاريف
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newExpenseCategory}
                      onChange={(e) => setNewExpenseCategory(e.target.value)}
                      placeholder="اسم فئة المصاريف الجديدة"
                      onKeyPress={(e) => e.key === 'Enter' && addExpenseCategory()}
                    />
                    <Button onClick={addExpenseCategory} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {expenseCategories.map(category => (
                      <div key={category.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 dark:text-white">{category.name}</span>
                          {category.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              افتراضي
                            </Badge>
                          )}
                        </div>
                        {!category.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCategory(category.id, 'expense')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Risk Management Tab */}
          <TabsContent value="risk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-yellow-500" />
                  إعدادات إدارة المخاطر
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الحد الأقصى لنسبة المستثمر الواحد (%)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={riskSettings.maxInvestorPercentage}
                      onChange={(e) => setRiskSettings({
                        ...riskSettings,
                        maxInvestorPercentage: Math.min(100, Math.max(1, Number(e.target.value) || 50))
                      })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الحد الأدنى للاستثمار (MRU)
                    </label>
                    <Input
                      type="number"
                      min="1000"
                      value={riskSettings.minInvestmentAmount}
                      onChange={(e) => setRiskSettings({
                        ...riskSettings,
                        minInvestmentAmount: Math.max(1000, Number(e.target.value) || 10000)
                      })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الحد الأقصى لإجمالي الاستثمار (MRU)
                    </label>
                    <Input
                      type="number"
                      min="100000"
                      value={riskSettings.maxTotalInvestment}
                      onChange={(e) => setRiskSettings({
                        ...riskSettings,
                        maxTotalInvestment: Math.max(100000, Number(e.target.value) || 10000000)
                      })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      حد التنويع (%)
                    </label>
                    <Input
                      type="number"
                      min="10"
                      max="50"
                      value={riskSettings.diversificationThreshold}
                      onChange={(e) => setRiskSettings({
                        ...riskSettings,
                        diversificationThreshold: Math.min(50, Math.max(10, Number(e.target.value) || 25))
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      تفعيل إعادة التوازن التلقائي
                    </label>
                    <button
                      onClick={() => setRiskSettings({
                        ...riskSettings,
                        autoRebalancing: !riskSettings.autoRebalancing
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        riskSettings.autoRebalancing ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          riskSettings.autoRebalancing ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      وجوب تقييم المخاطر للمستثمر الجديد
                    </label>
                    <button
                      onClick={() => setRiskSettings({
                        ...riskSettings,
                        riskAssessmentRequired: !riskSettings.riskAssessmentRequired
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        riskSettings.riskAssessmentRequired ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          riskSettings.riskAssessmentRequired ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveRiskSettings}>
                    <Save className="h-4 w-4 mr-2" />
                    حفظ إعدادات المخاطر
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Risk Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  ملخص إدارة المخاطر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                    <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                      الحد الأدنى للاستثمار
                    </div>
                    <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
                      {formatMRU(riskSettings.minInvestmentAmount)}
                    </div>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                      أقصى نسبة للمستثمر
                    </div>
                    <div className="text-lg font-bold text-red-700 dark:text-red-300">
                      {riskSettings.maxInvestorPercentage}%
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      حد التنويع
                    </div>
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      {riskSettings.diversificationThreshold}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-500" />
                  إعدادات التنبيهات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      قنوات التنبيه
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          تنبيهات البريد الإلكتروني
                        </label>
                        <button
                          onClick={() => setNotificationSettings({
                            ...notificationSettings,
                            emailNotifications: !notificationSettings.emailNotifications
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            notificationSettings.emailNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationSettings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          تنبيهات الرسائل النصية
                        </label>
                        <button
                          onClick={() => setNotificationSettings({
                            ...notificationSettings,
                            smsNotifications: !notificationSettings.smsNotifications
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            notificationSettings.smsNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationSettings.smsNotifications ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          الإشعارات الفورية
                        </label>
                        <button
                          onClick={() => setNotificationSettings({
                            ...notificationSettings,
                            pushNotifications: !notificationSettings.pushNotifications
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            notificationSettings.pushNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationSettings.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      التقارير الدورية
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          تقارير أسبوعية
                        </label>
                        <button
                          onClick={() => setNotificationSettings({
                            ...notificationSettings,
                            weeklyReports: !notificationSettings.weeklyReports
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            notificationSettings.weeklyReports ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationSettings.weeklyReports ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          تقارير شهرية
                        </label>
                        <button
                          onClick={() => setNotificationSettings({
                            ...notificationSettings,
                            monthlyReports: !notificationSettings.monthlyReports
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            notificationSettings.monthlyReports ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationSettings.monthlyReports ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      تنبيهات الأحداث المهمة
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          تنبيهات الأرباح
                        </label>
                        <button
                          onClick={() => setNotificationSettings({
                            ...notificationSettings,
                            profitAlerts: !notificationSettings.profitAlerts
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            notificationSettings.profitAlerts ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationSettings.profitAlerts ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          تنبيهات الخسائر
                        </label>
                        <button
                          onClick={() => setNotificationSettings({
                            ...notificationSettings,
                            lossAlerts: !notificationSettings.lossAlerts
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            notificationSettings.lossAlerts ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationSettings.lossAlerts ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          تنبيهات السحوبات
                        </label>
                        <button
                          onClick={() => setNotificationSettings({
                            ...notificationSettings,
                            withdrawalAlerts: !notificationSettings.withdrawalAlerts
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            notificationSettings.withdrawalAlerts ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationSettings.withdrawalAlerts ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveNotificationSettings}>
                    <Save className="h-4 w-4 mr-2" />
                    حفظ إعدادات التنبيهات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InvestmentSettings;
