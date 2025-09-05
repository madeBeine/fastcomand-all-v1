import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyMRU } from '@/utils/format';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  Building2,
  Users,
  Target,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import type { CalculatedFinancials, ProjectSettings } from '@/lib/investmentCalculations';

interface FinancialSummaryProps {
  financials: CalculatedFinancials;
  projectSettings: ProjectSettings;
  timeFilter?: string;
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  financials,
  projectSettings,
  timeFilter = 'month'
}) => {
  // Safety check for props
  if (!financials || !projectSettings) {
    return (
      <div className="p-4 text-center text-gray-500">
        جاري تحميل البيانات المالية...
      </div>
    );
  }
  const profitabilityRatio = financials?.totalInvestment > 0
    ? ((financials.grossProfit || 0) / financials.totalInvestment) * 100
    : 0;

  const projectEfficiency = financials?.grossProfit > 0
    ? ((financials.projectShare || 0) / financials.grossProfit) * 100
    : 0;

  const investorSatisfaction = financials?.updatedInvestors?.length > 0
    ? financials.updatedInvestors.filter(
        inv => (inv?.projectedAnnualReturn || 0) > 10
      ).length / financials.updatedInvestors.length * 100
    : 0;

  const getHealthColor = (value: number, thresholds: { good: number; fair: number }) => {
    if (value >= thresholds.good) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (value >= thresholds.fair) return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20';
  };

  const getHealthIcon = (value: number, thresholds: { good: number; fair: number }) => {
    if (value >= thresholds.good) return <CheckCircle className="w-4 h-4" />;
    if (value >= thresholds.fair) return <AlertTriangle className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  const metrics = [
    {
      title: 'نسبة الربحية',
      value: `${profitabilityRatio.toFixed(1)}%`,
      description: 'العائد على الاستثمار الإجمالي',
      icon: <Target className="w-5 h-5" />,
      health: profitabilityRatio,
      thresholds: { good: 15, fair: 8 },
      trend: '+2.3%'
    },
    {
      title: 'كفاءة المشروع',
      value: `${projectEfficiency.toFixed(1)}%`,
      description: `نسبة ${projectSettings.profitPercentage}% من الأرباح`,
      icon: <Building2 className="w-5 h-5" />,
      health: projectSettings.profitPercentage,
      thresholds: { good: 10, fair: 5 },
      trend: '+0.5%'
    },
    {
      title: 'رضا المستثمرين',
      value: `${investorSatisfaction.toFixed(0)}%`,
      description: 'المستثمرون بعائد +10%',
      icon: <Users className="w-5 h-5" />,
      health: investorSatisfaction,
      thresholds: { good: 80, fair: 60 },
      trend: '+5.2%'
    }
  ];

  const keyInsights = [
    {
      title: 'أعلى أداء',
      content: (() => {
        if (!financials?.updatedInvestors || financials.updatedInvestors.length === 0) return 'لا توجد بيانات متاحة';
        const bestInvestor = financials.updatedInvestors.reduce((best, inv) =>
          (inv?.projectedAnnualReturn || 0) > (best?.projectedAnnualReturn || 0) ? inv : best
        );
        return `${bestInvestor?.name || 'غير محدد'} بعائد ${(bestInvestor?.projectedAnnualReturn || 0).toFixed(1)}%`;
      })(),
      icon: <TrendingUp className="w-4 h-4 text-green-600" />
    },
    {
      title: 'المشروع النشط',
      content: `رصيد متاح ${formatCurrencyMRU(financials.projectBalanceAfterWithdrawals)} للمشروع`,
      icon: <DollarSign className="w-4 h-4 text-blue-600" />
    },
    {
      title: 'التوزيع المتوازن',
      content: `${financials?.updatedInvestors?.length || 0} مستثمر يحصلون على ${(financials?.grossProfit || 0) > 0 ? (((financials.netProfitForDistribution || 0) / financials.grossProfit) * 100).toFixed(0) : '0'}% من الأرباح`,
      icon: <Users className="w-4 h-4 text-purple-600" />
    }
  ];

  const alerts: Array<{type: 'error' | 'warning'; message: string; icon: React.ReactNode}> = [];

  if ((financials?.projectBalanceAfterWithdrawals || 0) < 0) {
    alerts.push({
      type: 'error' as const,
      message: 'رصيد المشروع سالب - يتطلب مراجعة عاجلة',
      icon: <AlertTriangle className="w-4 h-4" />
    });
  }

  if (profitabilityRatio < 5) {
    alerts.push({
      type: 'warning' as const,
      message: 'نسبة الربحية منخفضة - يُنصح بمراجعة الاستراتيجية',
      icon: <TrendingDown className="w-4 h-4" />
    });
  }

  if (investorSatisfaction < 60) {
    alerts.push({
      type: 'warning' as const,
      message: 'انخفاض في رضا المستثمرين - قد يحتاج لتحسين الأداء',
      icon: <Users className="w-4 h-4" />
    });
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {metric.icon}
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {metric.title}
                    </span>
                  </div>
                  <div className="text-2xl font-bold mb-1">{metric.value}</div>
                  <div className="text-xs text-gray-500">{metric.description}</div>
                  
                  {/* Trend */}
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUpCircle className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">{metric.trend}</span>
                  </div>
                </div>
                
                {/* Health Indicator */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  getHealthColor(metric.health, metric.thresholds)
                }`}>
                  {getHealthIcon(metric.health, metric.thresholds)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-l-4 border-l-orange-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              تنبيهات مالية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${
                alert.type === 'error' 
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
              }`}>
                {alert.icon}
                <span className="text-sm">{alert.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            رؤى أساسية - {timeFilter === 'month' ? 'هذا الشهر' : 'الفترة المحددة'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {keyInsights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {insight.icon}
                <div>
                  <div className="font-medium text-sm mb-1">{insight.title}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{insight.content}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Financial Health Score */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            مؤشر الصحة المالية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {Math.round((profitabilityRatio + projectEfficiency + investorSatisfaction) / 3)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                متوسط الأداء العام للمشروع
              </div>
            </div>
            
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                مستقر
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                نمو إيجابي
              </Badge>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(100, Math.round((profitabilityRatio + projectEfficiency + investorSatisfaction) / 3))}%` 
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSummary;
