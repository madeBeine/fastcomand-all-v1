import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

import { formatCurrencyMRU, formatDate, formatDateTime, formatNumberEN, normalizeNumericInput, toEnglishDigits } from '@/utils/format';
import { eventBus } from '@/lib/eventBus';

export type Language = 'ar' | 'en';
export type Role = 'admin' | 'employee' | 'delivery' | 'investor';

export interface UserPermission { read: boolean; write: boolean; update: boolean; delete: boolean; }
export interface AppUser { id: string; name: string; phone?: string; email?: string; role: Role | string; permissions: UserPermission; passwordHash?: string; }

export interface ShippingCompany { id: string; name: string; countries: string[]; }
export type ShippingKind = 'air_standard' | 'air_express' | 'sea' | 'land';
export interface ShippingTypeCfg { id: string; kind: ShippingKind; country?: string; pricePerKgMRU: number; durationDays?: number; companyId?: string; effectiveFrom?: string; effectiveTo?: string; }

export interface AppSettings {
  general: {
    logoUrl?: string;
    businessName: string;
    phone?: string;
    email?: string;
    address?: string;
    language: Language;
    defaultCurrency: 'MRU' | 'USD' | 'AED' | 'EUR';
  };
  users: AppUser[];
  rolePermissions?: Record<string, { manageSettings: boolean; viewLogs: boolean; manageUsers: boolean; approveWithdrawals: boolean; manageOrdersSettings: boolean; manageShipmentsSettings: boolean; }>; // Admin/Manager/Editor/Viewer
  currencies: {
    base: 'MRU' | 'USD' | 'AED' | 'EUR';
    rates: Record<string, number>; // map currency -> MRU per 1 unit
    lastUpdated?: string;
    source?: 'Manual' | 'API';
  };
  shipping: {
    companies: ShippingCompany[];
    types: ShippingTypeCfg[]; // prices per kg and duration per kind/country
    preferredCurrency?: 'MRU'|'USD'|'AED'|'EUR';
    defaultInstructions?: string;
    companyMinChargePerShipment?: number;
    shippingsTransitDays?: { air_express?: number; air_standard?: number; sea?: number; land?: number };
    handlingFee?: { type: 'fixed'|'percentage'; value: number };
    customsFee?: { type: 'fixed'|'percentage'; value: number };
    consolidationRules?: { minWeightToShip?: number; maxPiecesPerParcel?: number };
    integrations?: { reservableEnabled?: boolean; provider?: string; apiKey?: string };
  };
  ordersInvoices: {
    defaultCommissionPercent: number; // 3..10
    defaultDiscountType: 'none' | 'fixed' | 'percentage';
    defaultDiscountValue: number;
    enableDiscounts?: boolean;
    invoiceBranding: { logoUrl?: string; header?: string; signature?: string };
    autoPrintAfterPayment: boolean;
    commissionPolicies?: { id: string; storeId?: string; type: 'percentage'|'fixed'; value: number; effectiveFrom?: string; effectiveTo?: string }[];
  };
  // Orders-specific preferences
  ordersPreferences?: {
    displayCurrency: 'MRU' | 'USD' | 'EUR' | 'AED';
    platformFeePercent?: number; // 0..100
    showEstimatedShippingOnOrderEntry?: boolean;
    minOrderEnabled?: boolean;
    minOrderValueMRU?: number;
    reviewPolicy?: { enabled: boolean; requireManualApprovalOverMRU: number };
  };
  ordersWarranty?: {
    defaultDays: number;
    guidanceText?: string;
  };
  ordersWarrantyByCategory?: { id: string; category: string; days: number }[];
  ordersCustomerShipping?: {
    air_standard_perKg: number;
    air_express_perKg: number;
    sea_perKg: number;
    land_perKg: number;
    minChargePerItem?: number;
  };
  ordersExtras?: {
    minOrderValueMRU: number;
    extraFeeType: 'fixed' | 'percentage';
    extraFeeValue: number;
    fixedFeeMRU?: number;
    percentageFee?: number;
    defaultNotes: string;
  };
  ordersDiscounts?: {
    codes: { id: string; code: string; type: 'percentage'|'fixed'; value: number; validFrom?: string; validTo?: string; enabled: boolean; targetCategory?: string }[];
    defaultNewCustomer?: { enabled: boolean; type: 'percentage'|'fixed'; value: number };
  };
  ordersPolicies?: {
    maxItemsPerOrder?: number;
    defaultProcessingDays?: number;
    notifySMS?: boolean;
    notifyEmail?: boolean;
  };
  warehouse: {
    drawers: { id: string; name: string; capacity: number }[];
    fullAlertThresholdPercent: number; // 0..100
    unitsDefault?: 'kg'|'g'|'unit';
    conversions?: Record<string, number>; // e.g., g:1, kg:1000
    reorderPolicy?: { threshold: number; reorderQuantity: number; backorderMode: 'backorder'|'reject' };
    multiLocation?: { enabled: boolean; locations?: { id: string; name: string }[] };
    tolerancePercent?: number;
    alerts?: { email?: string; slackWebhook?: string; lowStockEnabled?: boolean; lowStockThreshold?: number; periodicReports?: { enabled: boolean; frequency: 'daily'|'weekly'|'monthly' } };
    categories?: { id: string; name: string; minStock: number }[];
    pricingInventory?: { enablePurchasePrice: boolean; enableSalePrice: boolean; defaultMarginPercent?: number; showOutOfStock?: boolean; showStockOnProductCard?: boolean; allowNegativeStock?: boolean };
  };
  delivery: {
    insideNKCPrice: number;
    outsideNKCPrice: number;
    courierProfitPercent: number;
    mode?: 'fixed'|'per_km'|'zone'|'percentage';
    perKm?: { pricePerKm: number; minCharge: number };
    zones?: { id: string; name: string; fee: number }[];
    feeRules?: { id: string; zoneId?: string; minWeightKg?: number; maxWeightKg?: number; minOrderAmountMRU?: number; feeMRU: number }[];
    regions?: { id: string; name: string; enabled: boolean; specialFeeMRU?: number }[];
    drivers?: { id: string; name: string; phone?: string; commissionPercent: number; active: boolean }[];
    cancelFeeMRU?: number;
    sameDayExtraMRU?: number;
    workWindows?: { from: string; to: string }[];
    holidays?: string[];
    estimation?: { baseMinutes: number; perKmMinutes: number };
    payoutPolicy?: { period: 'daily'|'weekly'|'monthly' };
    policies?: { redeliveryAttempts: number; notifySMS: boolean; notifyWhatsApp?: boolean };
    maxWeightPerRider?: number;
  };
  notifications: {
    missingTracking: boolean;
    unweighedShipments: boolean;
    unpaidInvoices: boolean;
    channelInApp: boolean;
    channelPush: boolean;
  };
  auth?: { sessionDurationMinutes: number; enable2FA: boolean; passwordPolicy: { minLength: number; requireUpper: boolean; requireNumber: boolean; requireSpecial: boolean } };
  email?: { smtpHost?: string; smtpPort?: number; username?: string; fromAddress?: string; useTLS?: boolean };
  logging?: { level: 'error'|'warning'|'info'|'debug'; retentionDays: number; autoExport?: { enabled: boolean; frequency: 'daily'|'weekly'; format: 'CSV'|'PDF' } };
  invoicesConfig?: { numbering: { prefix: string; startNumber: number; padding: number }; tax: { vatPercent: number }; fees?: { extraEnabled: boolean; type: 'fixed'|'percentage'; value: number }; discounts?: { enableManual: boolean; enableAuto: boolean; maxPercent: number; maxAmountMRU?: number }; payments?: { allowPartial: boolean; dueAlerts: { enabled: boolean; daysBefore: number } }; branding?: { logoUrl?: string; primaryColor?: string; secondaryColor?: string; signature?: string; stampUrl?: string }; notifications?: { sendCopyToCustomer: boolean; internalAlerts: boolean; autoReminder: { enabled: boolean; daysBefore: number } }; paymentMethods: { cash: boolean; bankTransfer: boolean; mobile: { bankily: boolean; cedad: boolean; masrifi: boolean } }; issueTiming: 'on_order'|'after_shipping'|'after_payment'; export: { pdf: boolean; csv: boolean; digitalSignature?: boolean } };
}

const DEFAULT_SETTINGS: AppSettings = {
  general: { businessName: 'Fast Command', language: 'ar', defaultCurrency: 'MRU', phone: '+222 00000000', email: 'support@example.com', address: 'Nouakchott' },
  users: [
    { id: 'u_admin', name: 'Admin', role: 'admin', email: 'admin@example.com', permissions: { read: true, write: true, update: true, delete: true }, passwordHash: '' },
    { id: 'u_emp', name: 'Employee', role: 'employee', email: 'emp@example.com', permissions: { read: true, write: true, update: true, delete: false }, passwordHash: '' },
  ],
  rolePermissions: {
    Admin: { manageSettings: true, viewLogs: true, manageUsers: true, approveWithdrawals: true, manageOrdersSettings: true, manageShipmentsSettings: true },
    Manager: { manageSettings: true, viewLogs: true, manageUsers: false, approveWithdrawals: false, manageOrdersSettings: true, manageShipmentsSettings: true },
    Editor: { manageSettings: false, viewLogs: false, manageUsers: false, approveWithdrawals: false, manageOrdersSettings: true, manageShipmentsSettings: false },
    Viewer: { manageSettings: false, viewLogs: false, manageUsers: false, approveWithdrawals: false, manageOrdersSettings: false, manageShipmentsSettings: false },
  },
  currencies: { base: 'MRU', rates: { USD: 40, AED: 11, EUR: 43 }, lastUpdated: new Date().toISOString(), source: 'Manual' },
  shipping: {
    companies: [ { id: 'sc1', name: 'Aramex', countries: ['UAE','CN'] }, { id: 'sc2', name: 'DHL', countries: ['UAE'] } ],
    types: [
      { id: 'st1', kind: 'air_standard', country: 'UAE', pricePerKgMRU: 1000, durationDays: 7 },
      { id: 'st2', kind: 'air_express', country: 'UAE', pricePerKgMRU: 1800, durationDays: 3 },
      { id: 'st3', kind: 'sea', country: 'CN', pricePerKgMRU: 600, durationDays: 30 },
      { id: 'st4', kind: 'land', country: 'MA', pricePerKgMRU: 900, durationDays: 15 },
    ],
    preferredCurrency: 'MRU',
    defaultInstructions: '',
    companyMinChargePerShipment: 0,
    shippingsTransitDays: { air_express: 3, air_standard: 7, sea: 30, land: 15 },
    handlingFee: { type: 'fixed', value: 0 },
    customsFee: { type: 'fixed', value: 0 },
    consolidationRules: { minWeightToShip: 0, maxPiecesPerParcel: 0 },
    integrations: { reservableEnabled: false, provider: '', apiKey: '' },
  },
  ordersInvoices: {
    defaultCommissionPercent: 5,
    defaultDiscountType: 'none',
    defaultDiscountValue: 0,
    enableDiscounts: true,
    invoiceBranding: {},
    autoPrintAfterPayment: false,
    commissionPolicies: []
  },
  ordersPreferences: { displayCurrency: 'MRU', platformFeePercent: 0, showEstimatedShippingOnOrderEntry: true, minOrderEnabled: false, minOrderValueMRU: 0, reviewPolicy: { enabled: false, requireManualApprovalOverMRU: 0 } },
  ordersWarranty: { defaultDays: 7, guidanceText: '' },
  ordersWarrantyByCategory: [],
  ordersCustomerShipping: { air_standard_perKg: 1000, air_express_perKg: 1800, sea_perKg: 600, land_perKg: 900, minChargePerItem: 0 },
  ordersExtras: { minOrderValueMRU: 0, extraFeeType: 'fixed', extraFeeValue: 0, fixedFeeMRU: 0, percentageFee: 0, defaultNotes: '' },
  ordersDiscounts: { codes: [], defaultNewCustomer: { enabled: false, type: 'percentage', value: 0 } },
  ordersPolicies: { maxItemsPerOrder: 0, defaultProcessingDays: 0, notifySMS: false, notifyEmail: false },
  warehouse: {
    drawers: [ { id: 'A', name: 'الدرج A', capacity: 50 }, { id: 'B', name: 'الدرج B', capacity: 40 } ],
    fullAlertThresholdPercent: 90,
    unitsDefault: 'kg',
    conversions: { g: 1, kg: 1000, unit: 1 },
    reorderPolicy: { threshold: 10, reorderQuantity: 50, backorderMode: 'backorder' },
    multiLocation: { enabled: false, locations: [] },
    tolerancePercent: 2,
    alerts: { lowStockEnabled: true, lowStockThreshold: 10, periodicReports: { enabled: false, frequency: 'weekly' }, email: '', slackWebhook: '' },
    categories: [],
    pricingInventory: { enablePurchasePrice: true, enableSalePrice: true, defaultMarginPercent: 10, showOutOfStock: true, showStockOnProductCard: true, allowNegativeStock: false }
  },
  delivery: { insideNKCPrice: 500, outsideNKCPrice: 1500, courierProfitPercent: 20, mode: 'fixed', perKm: { pricePerKm: 0, minCharge: 0 }, zones: [], feeRules: [], regions: [], drivers: [], cancelFeeMRU: 0, sameDayExtraMRU: 0, workWindows: [], holidays: [], estimation: { baseMinutes: 20, perKmMinutes: 3 }, payoutPolicy: { period: 'weekly' }, policies: { redeliveryAttempts: 2, notifySMS: true, notifyWhatsApp: false }, maxWeightPerRider: 25 },
  notifications: { missingTracking: true, unweighedShipments: true, unpaidInvoices: true, channelInApp: true, channelPush: false },
  auth: { sessionDurationMinutes: 480, enable2FA: false, passwordPolicy: { minLength: 8, requireUpper: true, requireNumber: true, requireSpecial: false } },
  email: { smtpHost: '', smtpPort: 587, username: '', fromAddress: '', useTLS: true },
  logging: { level: 'info', retentionDays: 90, autoExport: { enabled: false, frequency: 'weekly', format: 'CSV' } },
  invoicesConfig: { numbering: { prefix: 'INV-', startNumber: 1, padding: 5 }, tax: { vatPercent: 0 }, fees: { extraEnabled: false, type: 'fixed', value: 0 }, discounts: { enableManual: true, enableAuto: false, maxPercent: 50, maxAmountMRU: 0 }, payments: { allowPartial: true, dueAlerts: { enabled: false, daysBefore: 3 } }, branding: { logoUrl: '', primaryColor: '#0ea5e9', secondaryColor: '#f97316', signature: '', stampUrl: '' }, notifications: { sendCopyToCustomer: true, internalAlerts: true, autoReminder: { enabled: false, daysBefore: 2 } }, paymentMethods: { cash: true, bankTransfer: true, mobile: { bankily: true, cedad: true, masrifi: true } }, issueTiming: 'after_payment', export: { pdf: true, csv: true, digitalSignature: false } }
};

const STORAGE_KEY = 'app_settings_v1';

// Safe fetch wrapper to avoid uncaught network errors and provide fallback
async function safeFetch(input: RequestInfo, init?: RequestInit) {
  try {
    return await fetch(input, init as any);
  } catch (err) {
    console.warn('safeFetch failed for', input, err);
    return {
      ok: false,
      status: 0,
      statusText: String(err),
      text: async () => '',
      json: async () => ({}),
    } as unknown as Response;
  }
}

const SettingsContext = createContext<{
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  replace: (next: AppSettings) => Promise<void>;
  publishVersion: (versionId: string) => Promise<void>;
  getVersions: () => Promise<any[]>;
  getAuditLog: () => Promise<any[]>;
  exportSettings: () => Promise<string>;
  importSettings: (content: any) => Promise<any>;
  rollbackVersion: (versionId: string) => Promise<any>;
  validateVersion: (versionId?: string) => Promise<{ issues: any[] }>;
  // helpers
  formatCurrency: (v: number | string) => string;
  formatDate: (d: Date | string) => string;
  formatDateTime: (d: Date | string) => string;
  formatNumber: (n: number | string) => string;
  normalizeNumericInput: (s: string) => string;
  toEnglishDigits: (s: string) => string;
} | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(raw);
      const merged = { ...DEFAULT_SETTINGS, ...parsed } as AppSettings;
      // ensure currencies shape
      if (!('base' in merged.currencies)) merged.currencies = { base: 'MRU', rates: (merged as any).currencies?.rates || DEFAULT_SETTINGS.currencies.rates, lastUpdated: new Date().toISOString(), source: 'Manual' } as any;
      return merged;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
  }, [settings]);

  // Sync from server on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await safeFetch('/api/settings');
        if (!res.ok) return;
        const server = await res.json();
        if (mounted && server && Object.keys(server).length > 0) {
          setSettings(prev => ({ ...prev, ...server }));
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  function deepDiff(oldObj: any, newObj: any, pathPrefix = ''): any[] {
    const diffs: any[] = [];
    const keys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
    keys.forEach(k => {
      const oldVal = oldObj ? oldObj[k] : undefined;
      const newVal = newObj ? newObj[k] : undefined;
      const path = pathPrefix ? `${pathPrefix}.${k}` : k;
      if (typeof oldVal === 'object' && oldVal !== null && typeof newVal === 'object' && newVal !== null && !Array.isArray(oldVal) && !Array.isArray(newVal)) {
        diffs.push(...deepDiff(oldVal, newVal, path));
      } else if (Array.isArray(oldVal) || Array.isArray(newVal)) {
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) diffs.push({ path, old: oldVal, new: newVal });
      } else {
        if (oldVal !== newVal) diffs.push({ path, old: oldVal, new: newVal });
      }
    });
    return diffs;
  }

  const { toast } = useToast();

  const update = async (patch: Partial<AppSettings>) => {
    const prev = settings;
    const next = { ...prev, ...patch } as AppSettings;
    const diffs = deepDiff(prev as any, next as any);
    setSettings(next);
    try { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {} } catch {}
    try {
      eventBus.emit('settings.updated', { user: user || { id: 'system' }, diffs, patch });
      if (diffs.some(d => d.path.startsWith('shipping'))) eventBus.emit('settings.shipping.changed', { diffs });
      if (diffs.some(d => d.path.startsWith('currencies'))) eventBus.emit('settings.currencies.changed', { diffs });
      if (diffs.some(d => d.path.startsWith('ordersInvoices'))) eventBus.emit('settings.commissions.changed', { diffs });
      eventBus.emit('settings.saved', { user: user || { id: 'system' }, diffs });
      try { toast({ title: 'تم الحفظ', description: 'تم حفظ التغييرا�� بنجاح.' }); } catch {}
      try {
        const res = await safeFetch('/api/settings/versions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author: user || { id: 'system' }, content: next, message: 'Edit via UI' })
        });
        if (!res.ok) {
          try { toast({ title: 'تحذير', description: 'تم الحفظ محلياً. فشل المزامنة مع الخادم.' }); } catch {}
        }
      } catch (e) {
        try { toast({ title: 'تحذير', description: 'تم الحفظ محلياً. فشل الاتصال بالخادم.' }); } catch {}
      }
    } catch (e) { console.error(e); }
  };

  const replace = async (next: AppSettings) => {
    const prev = settings;
    setSettings(next);
    try { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {} } catch {}
    try {
      const diffs = deepDiff(prev as any, next as any);
      eventBus.emit('settings.updated', { user: user || { id: 'system' }, diffs, replace: true });
      eventBus.emit('settings.saved', { user: user || { id: 'system' }, diffs });
      try { toast({ title: 'تم الحفظ', description: 'تم استبدال الإعدادات وحفظها.' }); } catch {}
      const res = await safeFetch('/api/settings/versions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: user || { id: 'system' }, content: next, message: 'Replace settings' })
      });
      if (!res.ok) {
        try { toast({ title: 'تحذير', description: 'تم الاستبدال محلياً. فشل المزامنة مع الخادم.' }); } catch {}
      }
    } catch (e) {}
  };

  const publishVersion = async (versionId: string) => {
    try {
      const res = await safeFetch(`/api/settings/versions/${versionId}/publish`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author: user || { id: 'system' } }) });
      if (res.ok) {
        const data = await res.json();
        if (data?.version?.content) {
          setSettings(prev => ({ ...prev, ...data.version.content }));
          try { toast({ title: 'تم النشر', description: 'تم نشر الإعدادات بنجاح.' }); } catch {}
          eventBus.emit('settings.published', { version: data.version });
        }
      } else {
        try { const err = await res.json(); toast({ title: 'فشل ا��نشر', description: err?.error || 'حدث خطأ أثناء النشر.' }); } catch { }
      }
    } catch (e) { console.error(e); }
  };

  const getVersions = async () => {
    try {
      const res = await safeFetch('/api/settings/versions');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  };

  const getAuditLog = async () => {
    try {
      const res = await safeFetch('/api/settings/audit-log');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  };

  const exportSettings = async () => {
    try {
      const res = await safeFetch('/api/settings/export');
      if (!res.ok) return JSON.stringify(settings, null, 2);
      return await res.text();
    } catch (e) { return JSON.stringify(settings, null, 2); }
  };

  const importSettings = async (content: any) => {
    try {
      const res = await safeFetch('/api/settings/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author: user || { id: 'system' }, content }) });
      if (!res.ok) throw new Error('import_failed');
      const v = await res.json();
      try { toast({ title: 'تم الإستيراد', description: 'تم إنشاء مسودة من الملف المستورد.' }); } catch {}
      eventBus.emit('settings.imported', { version: v });
      return v;
    } catch (e) { throw e; }
  };

  const rollbackVersion = async (versionId: string) => {
    try {
      const res = await safeFetch(`/api/settings/versions/${versionId}/rollback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author: user || { id: 'system' } }) });
      if (!res.ok) throw new Error('rollback_failed');
      const data = await res.json();
      if (data?.version?.content) {
        setSettings(prev => ({ ...prev, ...data.version.content }));
        try { toast({ title: 'تم الاسترجاع', description: 'تم استرجاع الإصدار وتطبيقه.' }); } catch {}
        eventBus.emit('settings.rollback', { version: data.version });
      }
      return data;
    } catch (e) { throw e; }
  };

  const validateVersion = async (versionId?: string) => {
    const qs = versionId ? `?versionId=${encodeURIComponent(versionId)}` : '';
    const res = await safeFetch(`/api/settings/validate${qs}`);
    if (!res.ok) return { issues: [] };
    return await res.json();
  };

  const value = useMemo(() => ({
    settings,
    setSettings,
    update,
    replace,
    publishVersion,
    getVersions,
    getAuditLog,
    exportSettings,
    importSettings,
    rollbackVersion,
    validateVersion,
    formatCurrency: (v: number | string) => formatCurrencyMRU(typeof v === 'string' ? Number(toEnglishDigits(v)) : v),
    formatDate: (d: Date | string) => formatDate(d),
    formatDateTime: (d: Date | string) => formatDateTime(d),
    formatNumber: (n: number | string) => formatNumberEN(n),
    normalizeNumericInput: (s: string) => normalizeNumericInput(s),
    toEnglishDigits: (s: string) => toEnglishDigits(s),
  }), [settings, user]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
