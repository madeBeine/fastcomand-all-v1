import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

import { formatCurrencyMRU, formatDate, formatDateTime, formatNumberEN, normalizeNumericInput, toEnglishDigits } from '@/utils/format';
import { eventBus } from '@/lib/eventBus';

export type Language = 'ar' | 'en';
export type Role = 'admin' | 'employee' | 'delivery' | 'investor';

export interface UserPermission { read: boolean; write: boolean; update: boolean; delete: boolean; }
export interface AppUser { id: string; name: string; phone?: string; email?: string; role: Role; permissions: UserPermission; }

export interface ShippingCompany { id: string; name: string; countries: string[]; }
export type ShippingKind = 'air_standard' | 'air_express' | 'sea';
export interface ShippingTypeCfg { id: string; kind: ShippingKind; country?: string; pricePerKgMRU: number; durationDays?: number; companyId?: string; effectiveFrom?: string; effectiveTo?: string; }

export interface AppSettings {
  general: {
    logoUrl?: string;
    businessName: string;
    phone?: string;
    email?: string;
    address?: string;
    language: Language;
    defaultCurrency: 'MRU';
  };
  users: AppUser[];
  currencies: {
    rates: { USD: number; AED: number; EUR: number };
  };
  shipping: {
    companies: ShippingCompany[];
    types: ShippingTypeCfg[]; // prices per kg and duration per kind/country
  };
  ordersInvoices: {
    defaultCommissionPercent: number; // 3..10
    defaultDiscountType: 'none' | 'fixed' | 'percentage';
    defaultDiscountValue: number;
    invoiceBranding: { logoUrl?: string; header?: string; signature?: string };
    autoPrintAfterPayment: boolean;
    commissionPolicies?: { id: string; storeId?: string; type: 'percentage'|'fixed'; value: number; effectiveFrom?: string; effectiveTo?: string }[];
  };
  warehouse: {
    drawers: { id: string; name: string; capacity: number }[];
    fullAlertThresholdPercent: number; // 0..100
  };
  delivery: {
    insideNKCPrice: number;
    outsideNKCPrice: number;
    courierProfitPercent: number;
  };
  notifications: {
    missingTracking: boolean;
    unweighedShipments: boolean;
    unpaidInvoices: boolean;
    channelInApp: boolean;
    channelPush: boolean;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  general: { businessName: 'Fast Command', language: 'ar', defaultCurrency: 'MRU', phone: '+222 00000000', email: 'support@example.com', address: 'Nouakchott' },
  users: [
    { id: 'u_admin', name: 'Admin', role: 'admin', email: 'admin@example.com', permissions: { read: true, write: true, update: true, delete: true } },
    { id: 'u_emp', name: 'Employee', role: 'employee', email: 'emp@example.com', permissions: { read: true, write: true, update: true, delete: false } },
  ],
  currencies: { rates: { USD: 40, AED: 11, EUR: 43 } },
  shipping: {
    companies: [ { id: 'sc1', name: 'Aramex', countries: ['UAE','CN'] }, { id: 'sc2', name: 'DHL', countries: ['UAE'] } ],
    types: [
      { id: 'st1', kind: 'air_standard', country: 'UAE', pricePerKgMRU: 1000, durationDays: 7 },
      { id: 'st2', kind: 'air_express', country: 'UAE', pricePerKgMRU: 1800, durationDays: 3 },
      { id: 'st3', kind: 'sea', country: 'CN', pricePerKgMRU: 600, durationDays: 30 },
    ],
  },
  ordersInvoices: {
    defaultCommissionPercent: 5,
    defaultDiscountType: 'none',
    defaultDiscountValue: 0,
    invoiceBranding: {},
    autoPrintAfterPayment: false,
    commissionPolicies: []
  },
  warehouse: {
    drawers: [ { id: 'A', name: 'الدرج A', capacity: 50 }, { id: 'B', name: 'الدرج B', capacity: 40 } ],
    fullAlertThresholdPercent: 90,
  },
  delivery: { insideNKCPrice: 500, outsideNKCPrice: 1500, courierProfitPercent: 20 },
  notifications: { missingTracking: true, unweighedShipments: true, unpaidInvoices: true, channelInApp: true, channelPush: false },
};

const STORAGE_KEY = 'app_settings_v1';

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
      return { ...DEFAULT_SETTINGS, ...parsed } as AppSettings;
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
        const res = await fetch('/api/settings');
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
    // optimistic local update with diff emission
    setSettings(prev => {
      const next = { ...prev, ...patch } as AppSettings;
      try {
        const diffs = deepDiff(prev as any, next as any);
        eventBus.emit('settings.updated', { user: user || { id: 'system' }, diffs, patch });
        // specific events for subsystems
        if (diffs.some(d => d.path.startsWith('shipping'))) eventBus.emit('settings.shipping.changed', { diffs });
        if (diffs.some(d => d.path.startsWith('currencies'))) eventBus.emit('settings.currencies.changed', { diffs });
        if (diffs.some(d => d.path.startsWith('ordersInvoices'))) eventBus.emit('settings.commissions.changed', { diffs });
        // notify saved
        eventBus.emit('settings.saved', { user: user || { id: 'system' }, diffs });
        try { toast({ title: 'تم الحفظ', description: 'تم حفظ التغييرات بنجاح.' }); } catch {};
      } catch (e) { console.error(e); }

      (async () => {
        try {
          await fetch('/api/settings/versions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author: user || { id: 'system' }, content: next, message: 'Edit via UI' })
          });
        } catch (e) {
          // ignore failures (still saved locally)
        }
      })();

      return next;
    });
  };

  const replace = async (next: AppSettings) => {
    const prev = settings;
    setSettings(next);
    try {
      const diffs = deepDiff(prev as any, next as any);
      eventBus.emit('settings.updated', { user: user || { id: 'system' }, diffs, replace: true });
      eventBus.emit('settings.saved', { user: user || { id: 'system' }, diffs });
      try { toast({ title: 'تم الحفظ', description: 'تم استبدال الإعدادات وحفظها.' }); } catch {}
      await fetch('/api/settings/versions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: user || { id: 'system' }, content: next, message: 'Replace settings' })
      });
    } catch (e) {}
  };

  const publishVersion = async (versionId: string) => {
    try {
      const res = await fetch(`/api/settings/versions/${versionId}/publish`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author: user || { id: 'system' } }) });
      if (res.ok) {
        const data = await res.json();
        if (data?.version?.content) {
          setSettings(prev => ({ ...prev, ...data.version.content }));
          try { toast({ title: 'تم النشر', description: 'تم نشر الإعدادات بنجاح.' }); } catch {}
          eventBus.emit('settings.published', { version: data.version });
        }
      } else {
        try { const err = await res.json(); toast({ title: 'فشل النشر', description: err?.error || 'حدث خطأ أثناء النشر.' }); } catch { }
      }
    } catch (e) { console.error(e); }
  };

  const getVersions = async () => {
    try {
      const res = await fetch('/api/settings/versions');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  };

  const getAuditLog = async () => {
    try {
      const res = await fetch('/api/settings/audit-log');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  };

  const exportSettings = async () => {
    try {
      const res = await fetch('/api/settings/export');
      if (!res.ok) return JSON.stringify(settings, null, 2);
      return await res.text();
    } catch (e) { return JSON.stringify(settings, null, 2); }
  };

  const importSettings = async (content: any) => {
    try {
      const res = await fetch('/api/settings/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author: user || { id: 'system' }, content }) });
      if (!res.ok) throw new Error('import_failed');
      const v = await res.json();
      try { toast({ title: 'تم الإستيراد', description: 'تم إنشاء مسودة من الملف المستورد.' }); } catch {}
      eventBus.emit('settings.imported', { version: v });
      return v;
    } catch (e) { throw e; }
  };

  const rollbackVersion = async (versionId: string) => {
    try {
      const res = await fetch(`/api/settings/versions/${versionId}/rollback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author: user || { id: 'system' } }) });
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
    const res = await fetch(`/api/settings/validate${qs}`);
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
