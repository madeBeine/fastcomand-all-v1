import React, { useMemo, useState } from 'react';
import { Search, Filter, Activity, User, Package, Truck, Archive, Settings, DollarSign, FileText, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export type LogType = 'order' | 'shipment' | 'inventory' | 'delivery' | 'payment' | 'invoice' | 'settings';

export interface LogEntry {
  id: string;
  type: LogType;
  title: string;
  description: string;
  user: string;
  createdAt: Date;
}

const mockLogs: LogEntry[] = [
  { id: 'l1', type: 'order', title: 'تحديث حالة الطلب', description: 'تغيير الحالة إلى مشحون', user: 'Admin', createdAt: new Date('2024-01-18T11:30:00') },
  { id: 'l2', type: 'inventory', title: 'تخزين طلب', description: 'تخزين الطلب في الدرج A1', user: 'المخزن', createdAt: new Date('2024-01-18T12:00:00') },
  { id: 'l3', type: 'delivery', title: 'إسناد مهمة', description: 'إسناد إلى الموصل محمد', user: 'التوصيل', createdAt: new Date('2024-01-19T09:00:00') },
  { id: 'l4', type: 'payment', title: 'تسجيل دفعة', description: 'استلام 50000 MRU', user: 'المحاسبة', createdAt: new Date('2024-01-19T10:00:00') },
  { id: 'l5', type: 'invoice', title: 'طباعة فاتورة', description: 'فاتورة #5001', user: 'Admin', createdAt: new Date('2024-01-19T10:30:00') },
  { id: 'l6', type: 'settings', title: 'تحديث الإعدادات', description: 'تعديل سعر الشحن السريع', user: 'Admin', createdAt: new Date('2024-01-20T14:00:00') }
];

const formatDate = (date: Date) => new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);

const ICONS: Record<LogType, React.ComponentType<any>> = { order: User, shipment: Truck, inventory: Archive, delivery: Activity, payment: DollarSign, invoice: FileText, settings: Settings };

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<LogType | 'all'>('all');

  const filtered = useMemo(() => {
    let list = [...logs];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(l => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.user.toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') list = list.filter(l => l.type === typeFilter);
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [logs, search, typeFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white arabic-safe">سجل النظام</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 arabic-safe">متابعة جميع العمليات</p>
          </div>
        </div>

        <Card className="mb-6"><CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative lg:col-span-2"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} /><Input placeholder="بحث بالعنوان، الوصف أو المستخدم..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 arabic-safe">
              <option value="all">كل الأنواع</option>
              <option value="order">الطلبات</option>
              <option value="shipment">الشحنات</option>
              <option value="inventory">المخزن</option>
              <option value="delivery">التوصيل</option>
              <option value="payment">المدفوعات</option>
              <option value="invoice">الفواتير</option>
              <option value="settings">الإعدادات</option>
            </select>
            <Button variant="outline" onClick={() => { setSearch(''); setTypeFilter('all'); }} className="flex items-center gap-2 arabic-safe"><X size={16} /> مسح</Button>
          </div>
          <div className="text-sm text-gray-600 arabic-safe">عرض {filtered.length} من {logs.length} عملية</div>
        </CardContent></Card>

        <div className="space-y-3">
          {filtered.map(l => {
            const Icon = ICONS[l.type];
            return (
              <div key={l.id} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-2 rounded bg-gray-50 border border-gray-200 text-gray-700"><Icon size={16} /></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900 dark:text-white arabic-safe">{l.title}</div>
                    <div className="text-xs text-gray-500 numeric"><Calendar size={12} className="inline mr-1" />{formatDate(l.createdAt)}</div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 arabic-safe mt-0.5">{l.description}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 arabic-safe mt-1">بواسطة: {l.user}</div>
                </div>
                <Badge className="text-xs arabic-safe">{l.type}</Badge>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (<div className="text-center py-12"><Activity size={48} className="text-gray-400 mx-auto mb-4" /><p className="text-gray-600 dark:text-gray-400 text-lg arabic-safe">لا توجد سجلات</p></div>)}
      </div>
    </div>
  );
};

export default Logs;
