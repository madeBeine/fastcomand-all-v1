// Investment calculation utilities with new formulas

export interface ProjectSettings {
  profitPercentage: number;
  projectName: string;
  taxRate: number;
  managementFee: number;
}

export interface Investor {
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
}

export interface ProjectWithdrawal {
  id: string;
  amount: number;
  date: string;
  description: string;
  approvedBy: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface FinancialEntry {
  id: string;
  description: string;
  date: string;
  amount: number;
  category: string;
  automatic?: boolean;
}

export interface CalculatedFinancials {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  projectShare: number;
  netProfitForDistribution: number;
  totalInvestment: number;
  totalInvestorWithdrawals: number;
  totalProjectWithdrawals: number;
  projectBalanceBeforeWithdrawals: number;
  projectBalanceAfterWithdrawals: number;
  totalProjectBalance: number;
  updatedInvestors: Array<Investor & {
    calculatedProfit: number;
    currentBalance: number;
    projectedAnnualReturn: number;
    profitMargin: number;
  }>;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  profitPercentage: 10,
  projectName: 'Fast Command',
  taxRate: 5,
  managementFee: 2
};

// Load settings from localStorage
export const loadProjectSettings = (): ProjectSettings => {
  try {
    const stored = localStorage.getItem('investment_project_settings');
    return stored ? { ...DEFAULT_PROJECT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_PROJECT_SETTINGS;
  } catch {
    return DEFAULT_PROJECT_SETTINGS;
  }
};

// Save settings to localStorage
export const saveProjectSettings = (settings: ProjectSettings): void => {
  try {
    localStorage.setItem('investment_project_settings', JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save project settings:', error);
  }
};

// Load project withdrawals from localStorage
export const loadProjectWithdrawals = (): ProjectWithdrawal[] => {
  try {
    const stored = localStorage.getItem('investment_project_withdrawals');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save project withdrawals to localStorage
export const saveProjectWithdrawals = (withdrawals: ProjectWithdrawal[]): void => {
  try {
    localStorage.setItem('investment_project_withdrawals', JSON.stringify(withdrawals));
  } catch (error) {
    console.error('Failed to save project withdrawals:', error);
  }
};

// Load financial entries
export const loadFinancialEntries = (type: 'revenue' | 'expense'): FinancialEntry[] => {
  try {
    const stored = localStorage.getItem(`finance-entries-${type}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Calculate comprehensive financial metrics
export const calculateInvestmentFinancials = (
  investors: Investor[],
  projectSettings: ProjectSettings,
  projectWithdrawals: ProjectWithdrawal[],
  revenueEntries: FinancialEntry[] = [],
  expenseEntries: FinancialEntry[] = []
): CalculatedFinancials => {
  // Basic financial calculations
  const totalRevenue = revenueEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const totalExpenses = expenseEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const grossProfit = totalRevenue - totalExpenses;
  
  // Total invested capital
  const totalInvestment = investors.reduce((sum, inv) => sum + inv.capital, 0);
  
  // Project percentage calculation (before distributing to investors)
  const projectShare = Math.max(0, grossProfit * (projectSettings.profitPercentage / 100));
  const netProfitForDistribution = Math.max(0, grossProfit - projectShare);
  
  // Total investor withdrawals
  const totalInvestorWithdrawals = investors.reduce((sum, inv) => sum + inv.totalWithdrawals, 0);
  
  // Total approved project withdrawals
  const totalProjectWithdrawals = projectWithdrawals
    .filter(w => w.status === 'approved')
    .reduce((sum, w) => sum + w.amount, 0);
  
  // Project balance calculations
  const projectBalanceBeforeWithdrawals = projectShare;
  const projectBalanceAfterWithdrawals = Math.max(0, projectBalanceBeforeWithdrawals - totalProjectWithdrawals);
  
  // Updated investor calculations with new formulas
  const updatedInvestors = investors.map(investor => {
    // New formula: Individual investor profit calculation
    // إجمالي الأرباح = (قيمة الاستثمار × النسبة %) + أي أرباح إضافية − خصم نسبة المشروع
    const baseProfit = netProfitForDistribution * (investor.percent / 100);
    const additionalProfits = 0; // يمكن إضافة أرباح إضافية هنا
    const calculatedProfit = baseProfit + additionalProfits;
    
    // الرصيد الحالي = إجمالي الأرباح − إجمالي السحوبات الخاصة بالمستثمر
    const currentBalance = Math.max(0, investor.capital + calculatedProfit - investor.totalWithdrawals);
    
    // Additional metrics for better analysis
    const projectedAnnualReturn = totalInvestment > 0 ? (calculatedProfit / investor.capital) * 100 : 0;
    const profitMargin = investor.capital > 0 ? (calculatedProfit / investor.capital) * 100 : 0;
    
    return {
      ...investor,
      calculatedProfit,
      currentBalance,
      projectedAnnualReturn,
      profitMargin
    };
  });
  
  // Total project current balance calculation
  // الرصيد الحالي للمشروع = إجمالي الاستثمار + إجمالي الإيرادات − إجمالي المصاريف − سحوبات المستثمرين − سحوبات المشروع + رصيد المشروع من النسبة المخصصة
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
    totalProjectBalance: Math.max(0, totalProjectBalance),
    updatedInvestors
  };
};

// Calculate individual investor metrics
export const calculateInvestorMetrics = (
  investor: Investor,
  totalProfit: number,
  projectSettings: ProjectSettings
) => {
  const investorShare = totalProfit * (investor.percent / 100);
  const projectCut = investorShare * (projectSettings.profitPercentage / 100);
  const netInvestorProfit = investorShare - projectCut;
  const currentBalance = investor.capital + netInvestorProfit - investor.totalWithdrawals;
  
  return {
    investorShare,
    projectCut,
    netInvestorProfit,
    currentBalance: Math.max(0, currentBalance),
    roi: investor.capital > 0 ? (netInvestorProfit / investor.capital) * 100 : 0
  };
};

// Format currency specifically for MRU
export const formatMRU = (amount: number): string => {
  return new Intl.NumberFormat('ar-MR', {
    style: 'currency',
    currency: 'MRU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Calculate percentage change
export const calculatePercentageChange = (current: number, previous: number): {
  percentage: number;
  isPositive: boolean;
  formatted: string;
} => {
  if (previous === 0) {
    return { percentage: 0, isPositive: true, formatted: '0%' };
  }
  
  const percentage = ((current - previous) / previous) * 100;
  const isPositive = percentage >= 0;
  const formatted = `${isPositive ? '+' : ''}${percentage.toFixed(1)}%`;
  
  return { percentage, isPositive, formatted };
};

// Time-based filtering
export const filterByTimeRange = <T extends { date: string }>(
  items: T[],
  period: 'week' | 'month' | 'quarter' | 'year' | 'all',
  customStart?: string,
  customEnd?: string
): T[] => {
  if (period === 'all') return items;
  
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      return items;
  }
  
  if (customStart && customEnd) {
    startDate = new Date(customStart);
    const endDate = new Date(customEnd);
    return items.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate && itemDate <= endDate;
    });
  }
  
  return items.filter(item => new Date(item.date) >= startDate);
};

// Validate withdrawal amount
export const validateWithdrawalAmount = (
  amount: number,
  availableBalance: number,
  type: 'investor' | 'project'
): { isValid: boolean; message?: string } => {
  if (amount <= 0) {
    return { isValid: false, message: 'المبلغ يجب أن يكون أكبر من صفر' };
  }
  
  if (amount > availableBalance) {
    return { 
      isValid: false, 
      message: `المبلغ يتجاوز الرصيد المتاح (${formatMRU(availableBalance)})` 
    };
  }
  
  return { isValid: true };
};
