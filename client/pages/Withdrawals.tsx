import React from 'react';
import { formatCurrencyMRU, formatDateTime } from '@/utils/format';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Settings as SettingsIcon } from 'lucide-react';

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
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [minAmount, setMinAmount] = React.useState<number>(() => { try { return Number(localStorage.getItem('withdrawals_min')||'0'); } catch { return 0; } });
  const [maxAmount, setMaxAmount] = React.useState<number>(() => { try { return Number(localStorage.getItem('withdrawals_max')||'0'); } catch { return 0; } });
  const [maxMonthly, setMaxMonthly] = React.useState<number>(() => { try { return Number(localStorage.getItem('withdrawals_max_monthly')||'0'); } catch { return 0; } });
  const [commission, setCommission] = React.useState<number>(() => { try { return Number(localStorage.getItem('withdrawals_commission')||'0'); } catch { return 0; } });
  const [methods, setMethods] = React.useState<{ id: string; name: string; fee: number }[]>(() => { try { return JSON.parse(localStorage.getItem('withdrawals_methods')||'[]'); } catch { return []; } });
  const [notifRequest, setNotifRequest] = React.useState<boolean>(() => localStorage.getItem('withdrawals_notif_req') !== '0');
  const [notifDecision, setNotifDecision] = React.useState<boolean>(() => localStorage.getItem('withdrawals_notif_dec') !== '0');
  const [newMethod, setNewMethod] = React.useState<{ name: string; fee: number }>({ name: '', fee: 0 });
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
    if (minAmount && form.amount < minAmount) { alert(`الحد الأدنى للسحب هو ${minAmount} MRU`); return; }
    const fee = commission ? Math.round(form.amount * (commission/100)) : 0;
    const id = 't' + Date.now();
    setTxs((s) => [{ id, ...form, amount: form.amount - fee }, ...s]);
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
        <header className="mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold">السحوبات</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">إدارة معاملات السحب</p>
            </div>
            <button onClick={()=> setSettingsOpen(true)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 touch-manipulation">
              <SettingsIcon size={16} />
            </button>
          </div>
          <div className="hidden sm:block">
            <button onClick={() => setPanelOpen(true)} className="px-4 py-2 bg-brand-blue text-white rounded-lg inline-flex items-center gap-2">
              <Plus size={16} /> إضافة سحب
            </button>
          </div>
        </header>

        <div className="bg-card rounded-2xl shadow border p-4 mb-4 space-y-3">
          <input value={query} onChange={(e)=> setQuery(e.target.value)} placeholder="بحث بالاسم" className="w-full px-3 py-3 border rounded-lg text-base" />
          <select value={statusFilter} onChange={(e)=> setStatusFilter(e.target.value as any)} className="w-full px-3 py-3 border rounded-lg text-base">
            <option value="all">كل الحالات</option>
            <option value="pending">قيد المعالجة</option>
            <option value="done">منجز</option>
            <option value="rejected">مرفوض</option>
          </select>
        </div>

        <div className="space-y-3">
          {filtered.map(t => (
            <div key={t.id} className="p-4 rounded-2xl border bg-card shadow-sm touch-manipulation">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-base">{t.name}</div>
                    <div className="text-sm text-muted-foreground">{formatDateTime(t.date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg numeric">{formatCurrencyMRU(t.amount)}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${statusMap[t.status].cls}`}>{statusMap[t.status].label}</div>
                  </div>
                </div>
                <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value as Tx['status'])} className="w-full px-3 py-3 border rounded-lg text-base">
                  <option value="pending">قيد المعالجة</option>
                  <option value="done">منجز</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground">لا توجد عناصر مطابقة.</div>}
        </div>

        {/* Floating action button for mobile */}
        <button onClick={() => setPanelOpen(true)} className="fixed bottom-16 right-4 z-50 bg-brand-blue p-3 rounded-full text-white shadow-lg sm:hidden touch-manipulation">
          <Plus size={20} />
        </button>

        <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md max-h-screen overflow-y-auto">
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

        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md max-h-screen overflow-y-auto">
            <SheetHeader>
              <SheetTitle>إعدادات السحب</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <Tabs defaultValue="conditions">
                <TabsList className="flex gap-2 p-2 bg-gray-100 rounded-lg">
                  <TabsTrigger value="conditions">شروط السحب</TabsTrigger>
                  <TabsTrigger value="methods">طرق السحب</TabsTrigger>
                  <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
                </TabsList>

                <TabsContent value="conditions" className="mt-4 space-y-3">
                  <label className="text-sm">الحد الأدنى للسحب (MRU)
                    <input type="number" className="w-full mt-1 px-3 py-2 border rounded" value={minAmount} onChange={(e)=> { const v = Number(e.target.value||0); setMinAmount(v); try { localStorage.setItem('withdrawals_min', String(v)); } catch {} }} />
                  </label>
                  <label className="text-sm">الحد الأقصى للسحب (MRU)
                    <input type="number" className="w-full mt-1 px-3 py-2 border rounded" value={maxAmount} onChange={(e)=> { const v = Number(e.target.value||0); setMaxAmount(v); try { localStorage.setItem('withdrawals_max', String(v)); } catch {} }} />
                  </label>
                  <label className="text-sm">مرات السحب المسموحة شهرياً
                    <input type="number" className="w-full mt-1 px-3 py-2 border rounded" value={maxMonthly} onChange={(e)=> { const v = Number(e.target.value||0); setMaxMonthly(v); try { localStorage.setItem('withdrawals_max_monthly', String(v)); } catch {} }} />
                  </label>
                  <label className="text-sm">نسبة العمولة (%)
                    <input type="number" className="w-full mt-1 px-3 py-2 border rounded" value={commission} onChange={(e)=> { const v = Number(e.target.value||0); setCommission(v); try { localStorage.setItem('withdrawals_commission', String(v)); } catch {} }} />
                  </label>
                </TabsContent>

                <TabsContent value="methods" className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input placeholder="اسم الطريقة" className="px-3 py-2 border rounded" value={newMethod.name} onChange={(e)=> setNewMethod(s=> ({ ...s, name: e.target.value }))} />
                    <input type="number" placeholder="رسوم (MRU)" className="px-3 py-2 border rounded" value={newMethod.fee} onChange={(e)=> setNewMethod(s=> ({ ...s, fee: Number(e.target.value||0) }))} />
                    <button className="px-3 py-2 bg-gray-100 rounded" onClick={()=> { if (!newMethod.name.trim()) return; const next = [{ id: 'm'+Date.now(), ...newMethod }, ...methods]; setMethods(next); try { localStorage.setItem('withdrawals_methods', JSON.stringify(next)); } catch {} }}>إضافة</button>
                  </div>
                  <div className="space-y-2">
                    {methods.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="text-sm">{m.name} • رسوم: {m.fee}</div>
                        <div className="flex items-center gap-2">
                          <button className="px-2 py-1 text-sm border rounded" onClick={()=> { setNewMethod({ name: m.name, fee: m.fee }); const rest = methods.filter(x=> x.id !== m.id); setMethods(rest); try { localStorage.setItem('withdrawals_methods', JSON.stringify(rest)); } catch {} }}>تعديل</button>
                          <button className="px-2 py-1 text-sm border rounded text-red-600" onClick={()=> { const next = methods.filter(x=> x.id !== m.id); setMethods(next); try { localStorage.setItem('withdrawals_methods', JSON.stringify(next)); } catch {} }}>حذف</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="notifications" className="mt-4 space-y-3">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notifRequest} onChange={(e)=> { setNotifRequest(e.target.checked); try { localStorage.setItem('withdrawals_notif_req', e.target.checked ? '1':'0'); } catch {} }} /> إشعار عند تقديم طلب سحب</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notifDecision} onChange={(e)=> { setNotifDecision(e.target.checked); try { localStorage.setItem('withdrawals_notif_dec', e.target.checked ? '1':'0'); } catch {} }} /> إشعار عند قبول/رفض الطلب</label>
                </TabsContent>
              </Tabs>
            </div>
            <SheetFooter className="mt-4 flex justify-end">
              <button onClick={()=> { alert('تم الحفظ'); setSettingsOpen(false); }} className="px-4 py-2 bg-brand-blue text-white rounded">حفظ</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default Withdrawals;
