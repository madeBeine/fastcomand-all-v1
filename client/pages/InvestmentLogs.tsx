import React from 'react';
import { formatDateTime } from '@/utils/format';
import { Package, FileText, User, CheckCircle } from 'lucide-react';

type LogItem = { id: string; type: 'order' | 'invoice' | 'user' | 'execution'; title: string; date: string; meta?: string };

const sample: LogItem[] = [
  { id: 'l1', type: 'order', title: 'طلب جديد #1023', date: new Date().toISOString(), meta: 'قيمة 1200 MRU' },
  { id: 'l2', type: 'invoice', title: 'فاتورة #887', date: new Date(Date.now() - 3600 * 1000).toISOString(), meta: 'مستلمة' },
  { id: 'l3', type: 'user', title: 'مستخدم جديد - علي', date: new Date(Date.now() - 3600 * 1000 * 5).toISOString(), meta: 'تم التحقق' },
  { id: 'l4', type: 'execution', title: 'اكتمال تنفيذ قرار', date: new Date(Date.now() - 3600 * 1000 * 24).toISOString(), meta: 'اجتماع #5' },
];

const iconFor = (t: LogItem['type']) => {
  const wrap = (el: React.ReactNode, grad: string) => (
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} text-white flex items-center justify-center shadow`}>{el}</div>
  );
  switch (t) {
    case 'order': return wrap(<Package size={18} />, 'from-blue-500 to-blue-600');
    case 'invoice': return wrap(<FileText size={18} />, 'from-purple-500 to-purple-600');
    case 'user': return wrap(<User size={18} />, 'from-emerald-500 to-emerald-600');
    case 'execution': return wrap(<CheckCircle size={18} />, 'from-orange-500 to-orange-600');
  }
};

const InvestmentLogs: React.FC = () => {
  const [logs] = React.useState<LogItem[]>(sample.sort((a,b)=> new Date(b.date).getTime()-new Date(a.date).getTime()));
  const [query, setQuery] = React.useState('');

  const filtered = logs.filter(l => !query || l.title.toLowerCase().includes(query.toLowerCase()) || (l.meta || '').toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-4">
          <h1 className="text-2xl font-bold">سجل النشاط</h1>
          <p className="text-sm text-muted-foreground">عرض زمني مرتّب مع بحث وفلاتر مبسطة</p>
        </header>

        <div className="bg-card p-3 rounded-2xl shadow border mb-4">
          <div className="flex gap-2 items-center">
            <input value={query} onChange={(e)=> setQuery(e.target.value)} placeholder="بحث..." className="flex-1 px-3 py-2 border rounded" />
            <div className="text-sm text-muted-foreground">النتائج: {filtered.length}</div>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((l) => (
            <div key={l.id} className="flex items-center gap-3 p-3 rounded-2xl border bg-card shadow-sm">
              {iconFor(l.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate">{l.title}</div>
                  <div className="text-xs text-muted-foreground flex-shrink-0">{formatDateTime(l.date)}</div>
                </div>
                {l.meta && <div className="text-sm text-muted-foreground mt-1 truncate">{l.meta}</div>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-sm text-muted-foreground">لا توجد سجلات مطابقة.</div>}
        </div>
      </div>
    </div>
  );
};

export default InvestmentLogs;
