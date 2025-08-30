import React from 'react';
import { formatCurrencyMRU, formatDateTime } from '@/utils/format';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Plus } from 'lucide-react';

type Tx = { id: string; name: string; amount: number; date: string; status: 'pending' | 'done' | 'rejected' };

const STORAGE_KEY = 'app_withdrawals_v1';

const load = (): Tx[] => { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? (JSON.parse(raw) as Tx[]) : []; } catch { return []; } };
const save = (items: Tx[]) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {} };

const statusMap: Record<Tx['status'], { label: string; cls: string }> = {
  pending: { label: 'قيد المعالجة', cls: 'bg-yellow-100 text-yellow-800' },
  done: { label: 'منجز', cls: 'bg-green-100 text-green-800' },
  rejected: { label: 'مرفوض', cls: 'bg-red-100 text-red-800' },
};

const Withdrawals: React.FC = () => {
  const [txs, setTxs] = React.useState<Tx[]>(() => {
    const seeded = load();
    if (seeded.length) return seeded;
    const sample: Tx[] = [
      { id: 't1', name: 'أحمد بن محمد', amount: 5000, date: new Date().toISOString(), status: 'pending' },
      { id: 't2', name: 'سارة العمر', amount: 12000, date: new Date(Date.now() - 86400000).toISOString(), status: 'done' },
      { id: 't3', name: 'مؤسسة XYZ', amount: 30000, date: new Date(Date.now() - 86400000 * 3).toISOString(), status: 'rejected' },
    ];
    save(sample);
    return sample;
  });

  const [panelOpen, setPanelOpen] = React.useState(false);
  const [form, setForm] = React.useState<Omit<Tx, 'id'>>({ name: '', amount: 0, date: new Date().toISOString(), status: 'pending' });
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | Tx['status']>('all');

  React.useEffect(() => save(txs), [txs]);

  // Freeze background when sheet is open
  React.useEffect(() => {
    if (panelOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [panelOpen]);

  const updateStatus = (id: string, status: Tx['status']) => {
    setTxs((s) => s.map(t => t.id === id ? { ...t, status } : t));
  };

  const create = () => {
    const id = 't' + Date.now();
    setTxs((s) => [{ id, ...form }, ...s]);
    setForm({ name: '', amount: 0, date: new Date().toISOString(), status: 'pending' });
    setPanelOpen(false);
  };

  const filtered = txs.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return t.name.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">السحوبات</h1>
            <p className="text-sm text-muted-foreground">قائمة معاملات احترافية مع شارات حالة وإجراءات سريعة</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPanelOpen(true)} className="px-3 py-2 bg-brand-blue text-white rounded inline-flex items-center gap-1"><Plus size={16} /> إضافة سحب</button>
          </div>
        </header>

        <div className="bg-card rounded-2xl shadow border p-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <input value={query} onChange={(e)=> setQuery(e.target.value)} placeholder="بحث بالاسم" className="flex-1 px-3 py-2 border rounded" />
            <select value={statusFilter} onChange={(e)=> setStatusFilter(e.target.value as any)} className="px-3 py-2 border rounded">
              <option value="all">كل الحالات</option>
              <option value="pending">قيد المعالجة</option>
              <option value="done">منجز</option>
              <option value="rejected">مرفوض</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-2xl border bg-card shadow-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{t.name}</div>
                <div className="text-xs text-muted-foreground">{formatDateTime(t.date)}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-semibold">{formatCurrencyMRU(t.amount)}</div>
                <div className={`text-sm px-2 py-1 rounded ${statusMap[t.status].cls}`}>{statusMap[t.status].label}</div>
                <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value as Tx['status'])} className="px-2 py-1 border rounded text-sm">
                  <option value="pending">قيد المعالجة</option>
                  <option value="done">منجز</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-sm text-muted-foreground">لا توجد عناصر مطابقة.</div>}
        </div>

        <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>إضافة سحب</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              <label className="text-sm">الاسم</label>
              <input value={form.name} onChange={(e)=> setForm((s)=> ({ ...s, name: e.target.value }))} className="w-full px-3 py-2 border rounded" />

              <label className="text-sm">المبلغ (MRU)</label>
              <input type="number" value={form.amount} onChange={(e)=> setForm((s)=> ({ ...s, amount: Number(e.target.value || 0) }))} className="w-full px-3 py-2 border rounded" />

              <label className="text-sm">التاريخ</label>
              <input type="date" value={form.date.slice(0,10)} onChange={(e)=> setForm((s)=> ({ ...s, date: new Date(e.target.value).toISOString() }))} className="w-full px-3 py-2 border rounded" />

              <label className="text-sm">الحالة</label>
              <select value={form.status} onChange={(e)=> setForm((s)=> ({ ...s, status: e.target.value as Tx['status'] }))} className="w-full px-3 py-2 border rounded">
                <option value="pending">قيد المعالجة</option>
                <option value="done">منجز</option>
                <option value="rejected">مرفوض</option>
              </select>
            </div>
            <SheetFooter className="mt-4 flex justify-end">
              <button onClick={create} className="px-4 py-2 bg-brand-blue text-white rounded">حفظ</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default Withdrawals;
