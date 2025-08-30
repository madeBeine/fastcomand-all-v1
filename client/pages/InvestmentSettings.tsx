import React from 'react';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';

const Section: React.FC<{ title: string; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>> = ({ title, children, ...rest }) => {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="border rounded-2xl overflow-hidden shadow bg-card" {...rest}>
      <button onClick={() => setOpen((s) => !s)} className="w-full px-4 py-3 text-left flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{open ? 'إخفاء' : 'عرض'}</div>
      </button>
      {open && <div className="p-4 bg-white dark:bg-gray-900">{children}</div>}
    </div>
  );
};

const InvestmentSettings: React.FC = () => {
  useLockBodyScroll(false);

  const [roles, setRoles] = React.useState({ admin: true, investor: true, employee: true });
  const [fx, setFx] = React.useState({ USD: 40, EUR: 43 });
  const [shippers, setShippers] = React.useState<string[]>(['DHL', 'ARAMEX']);
  const [shipTypes, setShipTypes] = React.useState<string[]>(['جوي', 'أرضي', 'بحري']);
  const [shipDays, setShipDays] = React.useState<string[]>(['الأحد', 'الثلاثاء', 'الخميس']);
  const [kiloPrice, setKiloPrice] = React.useState<number>(120);
  const [advanced, setAdvanced] = React.useState({ autoArchive: true, require2FA: false });

  const [newItem, setNewItem] = React.useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-4">
          <h1 className="text-2xl font-bold">إعدادات الاستثمار</h1>
          <p className="text-sm text-muted-foreground">إعدادات احترافية ومتناسقة مع صفحات الإدارة</p>
        </header>

        <div className="space-y-4">
          <Section title="صلاحيات الأدوار">
            <div className="space-y-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={roles.admin} onChange={(e)=> setRoles(s => ({ ...s, admin: e.target.checked }))} /> مدير — صلاحيات كاملة</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={roles.investor} onChange={(e)=> setRoles(s => ({ ...s, investor: e.target.checked }))} /> مستثمر — عرض فقط</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={roles.employee} onChange={(e)=> setRoles(s => ({ ...s, employee: e.target.checked }))} /> موظف — عمليات محدودة</label>
            </div>
          </Section>

          <Section title="أسعار العملات (MRU)">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm">USD
                <input type="number" value={fx.USD} onChange={(e)=> setFx(s => ({ ...s, USD: Number(e.target.value||0) }))} className="w-full mt-1 px-3 py-2 border rounded" />
              </label>
              <label className="text-sm">EUR
                <input type="number" value={fx.EUR} onChange={(e)=> setFx(s => ({ ...s, EUR: Number(e.target.value||0) }))} className="w-full mt-1 px-3 py-2 border rounded" />
              </label>
            </div>
            <div className="mt-3">
              <button className="px-3 py-2 bg-brand-blue text-white rounded">حفظ الأسعار</button>
            </div>
          </Section>

          <Section title="شركات الشحن">
            <div className="flex gap-2 mb-2">
              <input value={newItem} onChange={(e)=> setNewItem(e.target.value)} placeholder="اسم الشركة" className="flex-1 px-3 py-2 border rounded" />
              <button onClick={()=> { if (!newItem.trim()) return; setShippers(s => [...s, newItem.trim()]); setNewItem(''); }} className="px-3 py-2 bg-gray-100 rounded">أضف</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {shippers.map((c, idx) => (
                <div key={idx} className="p-2 border rounded flex items-center justify-between text-sm">
                  <div className="truncate">{c}</div>
                  <button onClick={()=> setShippers(s => s.filter((_, i)=> i!==idx))} className="px-2 py-1 bg-red-50 text-red-700 rounded">حذف</button>
                </div>
              ))}
            </div>
          </Section>

          <Section title="أنواع الشحن">
            <div className="flex gap-2 mb-2">
              <input value={newItem} onChange={(e)=> setNewItem(e.target.value)} placeholder="نوع الشحن" className="flex-1 px-3 py-2 border rounded" />
              <button onClick={()=> { if (!newItem.trim()) return; setShipTypes(s => [...s, newItem.trim()]); setNewItem(''); }} className="px-3 py-2 bg-gray-100 rounded">أضف</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {shipTypes.map((c, idx) => (
                <div key={idx} className="p-2 border rounded flex items-center justify-between text-sm">
                  <div className="truncate">{c}</div>
                  <button onClick={()=> setShipTypes(s => s.filter((_, i)=> i!==idx))} className="px-2 py-1 bg-red-50 text-red-700 rounded">حذف</button>
                </div>
              ))}
            </div>
          </Section>

          <Section title="أيام الشحن">
            <div className="flex gap-2 mb-2">
              <input value={newItem} onChange={(e)=> setNewItem(e.target.value)} placeholder="اليوم" className="flex-1 px-3 py-2 border rounded" />
              <button onClick={()=> { if (!newItem.trim()) return; setShipDays(s => [...s, newItem.trim()]); setNewItem(''); }} className="px-3 py-2 bg-gray-100 rounded">أضف</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {shipDays.map((c, idx) => (
                <div key={idx} className="p-2 border rounded flex items-center justify-between text-sm">
                  <div className="truncate">{c}</div>
                  <button onClick={()=> setShipDays(s => s.filter((_, i)=> i!==idx))} className="px-2 py-1 bg-red-50 text-red-700 rounded">حذف</button>
                </div>
              ))}
            </div>
          </Section>

          <Section title="سعر الكيلو (MRU)">
            <div className="flex items-center gap-2">
              <input type="number" value={kiloPrice} onChange={(e)=> setKiloPrice(Number(e.target.value||0))} className="w-40 px-3 py-2 border rounded" />
              <button className="px-3 py-2 bg-brand-blue text-white rounded">حفظ</button>
            </div>
          </Section>

          <Section title="الإعدادات المتقدمة">
            <div className="space-y-3">
              <label className="flex items-center gap-2"><input type="checkbox" checked={advanced.autoArchive} onChange={(e)=> setAdvanced(s => ({ ...s, autoArchive: e.target.checked }))} /> أرشفة تلقائية بعد 60 يوماً</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={advanced.require2FA} onChange={(e)=> setAdvanced(s => ({ ...s, require2FA: e.target.checked }))} /> تفعيل التحقق الثنائي</label>
              <div className="flex gap-2">
                <button className="px-3 py-2 bg-brand-blue text-white rounded">حفظ الإعدادات</button>
                <button className="px-3 py-2 bg-gray-100 rounded">إلغاء</button>
              </div>
            </div>
          </Section>

          <Section title="خيارات العرض">
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" /> إظهار البيانات التوضيحية</label>
              <label className="flex items-center gap-2"><input type="checkbox" /> تفعيل الوضع التجريبي</label>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default InvestmentSettings;
