import React from 'react';
import { formatCurrencyMRU, formatDateTime } from '@/utils/format';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';

type Investor = { id: string; name: string; email: string; balance: number; joined: string };

const sample: Investor[] = [
  { id: 'u1', name: 'أحمد بن زين', email: 'ahmed@example.com', balance: 12500, joined: new Date().toISOString() },
  { id: 'u2', name: 'سارة العمر', email: 'sarah@example.com', balance: 32000, joined: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: 'u3', name: 'علي حسن', email: 'ali@example.com', balance: 8000, joined: new Date(Date.now() - 86400000 * 200).toISOString() },
  { id: 'u4', name: 'مؤسسة XYZ', email: 'corp@example.com', balance: 50000, joined: new Date(Date.now() - 86400000 * 400).toISOString() },
];

const Investors: React.FC = () => {
  const [items] = React.useState<Investor[]>(sample);
  const [selected, setSelected] = React.useState<Investor | null>(null);
  const open = (i: Investor) => setSelected(i);
  const close = () => setSelected(null);

  useLockBodyScroll(!!selected);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-4">
          <h1 className="text-2xl font-bold">إدارة المستثمرين</h1>
          <p className="text-sm text-muted-foreground">شبكة بسيطة ومظهر واضح. اضغط للاطّلاع أو التعديل.</p>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((it) => (
            <button key={it.id} onClick={() => open(it)} className="text-left p-3 rounded-lg border bg-card hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-blue to-brand-blue-dark text-white flex items-center justify-center font-semibold">{it.name.split(' ').map(n => n[0]).slice(0,2).join('')}</div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.name}</div>
                  <div className="text-xs text-muted-foreground">{it.email}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40" onClick={close} />
            <aside className="relative ml-auto w-full sm:w-96 bg-card shadow-xl p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{selected.name}</h3>
                <button onClick={close} className="px-2 py-1 bg-gray-100 rounded">إغلاق</button>
              </div>
              <div className="space-y-3">
                <div className="text-sm">البريد: {selected.email}</div>
                <div className="text-sm">انضم: {formatDateTime(selected.joined)}</div>
                <div className="text-sm">الرصيد: {formatCurrencyMRU(selected.balance)}</div>
                <div className="mt-3">
                  <h4 className="font-medium">نشاط</h4>
                  <div className="text-sm text-muted-foreground">آخر نشاط قبل 3 أيام • 12 عملية</div>
                </div>

                <div className="mt-3 space-y-2">
                  <button className="w-full px-3 py-2 bg-brand-blue text-white rounded">تعديل الرصيد</button>
                  <button className="w-full px-3 py-2 bg-gray-100 rounded">تعديل صلاحيات</button>
                </div>
              </div>
            </aside>
          </div>
        )}

      </div>
    </div>
  );
};

export default Investors;
