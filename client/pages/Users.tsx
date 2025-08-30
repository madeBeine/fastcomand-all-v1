import React from 'react';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { formatDateTime, formatNumberEN } from '@/utils/format';
import { eventBus } from '@/lib/eventBus';

type User = { id: string; name: string; email: string; role: 'admin' | 'investor' | 'employee' | 'delivery'; joined: string; active: boolean };
type UserLog = { id: string; userId: string; message: string; date: string };

const SAMPLE_USERS: User[] = [
  { id: 'u1', name: 'أحمد بن زين', email: 'ahmed@example.com', role: 'admin', joined: new Date().toISOString(), active: true },
  { id: 'u2', name: 'سارة العمر', email: 'sarah@example.com', role: 'investor', joined: new Date(Date.now() - 86400000 * 30).toISOString(), active: true },
  { id: 'u3', name: 'محمود علي', email: 'mahmoud@example.com', role: 'employee', joined: new Date(Date.now() - 86400000 * 120).toISOString(), active: false },
  { id: 'u4', name: 'ليلى حسن', email: 'layla@example.com', role: 'delivery', joined: new Date(Date.now() - 86400000 * 200).toISOString(), active: true },
];

const USERS_KEY = 'app_users_v1';
const USER_LOGS_KEY = 'app_user_logs_v1';

const loadFromStorage = <T,>(key: string, fallback: T) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (e) {
    return fallback;
  }
};

const saveToStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore
  }
};

const UsersPage: React.FC = () => {
  const [items, setItems] = React.useState<User[]>(() => loadFromStorage(USERS_KEY, SAMPLE_USERS));
  const [logs, setLogs] = React.useState<UserLog[]>(() => loadFromStorage(USER_LOGS_KEY, [] as UserLog[]));
  const [selected, setSelected] = React.useState<User | null>(null);
  const [query, setQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<'all' | User['role']>('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive'>('all');

  useLockBodyScroll(!!selected);

  React.useEffect(() => saveToStorage(USERS_KEY, items), [items]);
  React.useEffect(() => saveToStorage(USER_LOGS_KEY, logs), [logs]);

  // Listen to external events and add to logs
  React.useEffect(() => {
    const off = eventBus.on('user.activity', (payload: any) => {
      if (!payload || !payload.userId) return;
      const entry: UserLog = { id: String(Date.now()) + Math.random().toString(36).slice(2, 8), userId: payload.userId, message: payload.message || payload.action || 'نشاط', date: new Date().toISOString() };
      setLogs((s) => [entry, ...s]);
    });
    return off;
  }, []);

  const open = (u: User) => setSelected(u);
  const close = () => setSelected(null);

  const pushLog = (userId: string, message: string) => {
    const entry: UserLog = { id: String(Date.now()) + Math.random().toString(36).slice(2, 8), userId, message, date: new Date().toISOString() };
    setLogs((s) => [entry, ...s]);
    try { eventBus.emit('user.activity', { userId, message }); } catch {}
  };

  const save = (u: User) => {
    setItems((s) => s.map(it => it.id === u.id ? u : it));
    setSelected(u);
    pushLog(u.id, `تم تحديث بيانات المستخدم بواسطة لوحة التحكم`);
  };

  const toggleActive = (u: User) => {
    const toggled = { ...u, active: !u.active };
    setItems((s) => s.map(it => it.id === u.id ? toggled : it));
    setSelected(toggled);
    pushLog(u.id, toggled.active ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم');
  };

  const filtered = items.filter(i => {
    if (roleFilter !== 'all' && i.role !== roleFilter) return false;
    if (statusFilter === 'active' && !i.active) return false;
    if (statusFilter === 'inactive' && i.active) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q);
  });

  const exportCSV = () => {
    const rows = [ ['ID', 'Name', 'Email', 'Role', 'Active', 'Joined'] ];
    filtered.forEach(u => rows.push([u.id, u.name, u.email, u.role, u.active ? 'true' : 'false', new Date(u.joined).toISOString()]));
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getUserLogs = (userId: string) => logs.filter(l => l.userId === userId).slice(0, 50);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-4">
          <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
          <p className="text-sm text-muted-foreground">شبكة مستخدمين، سجل نشاط، تصدير CSV، وفلاتر متقدمة.</p>
        </header>

        <div className="bg-card rounded-lg p-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث بالاسم أو البريد" className="flex-1 px-3 py-2 border rounded" />

            <div className="flex items-center gap-2">
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)} className="px-3 py-2 border rounded">
                <option value="all">جميع الأدوار</option>
                <option value="admin">مدير</option>
                <option value="investor">مستثمر</option>
                <option value="employee">موظف</option>
                <option value="delivery">موصل</option>
              </select>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 border rounded">
                <option value="all">الكل</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>

              <button onClick={exportCSV} className="px-3 py-2 bg-gray-100 rounded">تصدير CSV</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((it) => (
            <button key={it.id} onClick={() => open(it)} className="text-left p-3 rounded-lg border bg-card hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-orange to-brand-orange-dark text-white flex items-center justify-center font-semibold">{it.name.split(' ').map(n => n[0]).slice(0,2).join('')}</div>
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
                <div className="text-sm">الحالة: {selected.active ? 'نشط' : 'غير نشط'}</div>

                <div>
                  <label className="text-sm font-medium">الدور</label>
                  <select value={selected.role} onChange={(e) => setSelected((s) => s ? { ...s, role: e.target.value as any } : s)} className="w-full mt-2 px-3 py-2 border rounded">
                    <option value="admin">مدير</option>
                    <option value="investor">مستثمر</option>
                    <option value="employee">موظف</option>
                    <option value="delivery">موصل</option>
                  </select>
                </div>

                <div>
                  <h4 className="font-medium">صلاحيات</h4>
                  <div className="space-y-2 text-sm mt-2">
                    <label className="flex items-center gap-2"><input type="checkbox" /> عرض التقارير</label>
                    <label className="flex items-center gap-2"><input type="checkbox" /> تعديل المحتوى</label>
                    <label className="flex items-center gap-2"><input type="checkbox" /> إدارة المستخدمين</label>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium">نشاط حديث</h4>
                  <div className="text-sm text-muted-foreground">عرض آخر 50 مدخلة</div>
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded p-2 bg-white/50">
                    {getUserLogs(selected.id).length === 0 && <div className="text-sm text-muted-foreground">لا توجد أنشطة حديثة.</div>}
                    {getUserLogs(selected.id).map(l => (
                      <div key={l.id} className="text-sm">
                        <div className="font-medium">{l.message}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(l.date)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <button onClick={() => { if (selected) save(selected); }} className="w-full px-3 py-2 bg-brand-blue text-white rounded">حفظ التغييرات</button>
                  <button onClick={() => { if (selected) toggleActive(selected); }} className="w-full px-3 py-2 bg-gray-100 rounded">تفعيل/إيقاف</button>
                </div>
              </div>
            </aside>
          </div>
        )}

      </div>
    </div>
  );
};

export default UsersPage;
