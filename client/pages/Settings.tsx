import React, { useMemo, useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import Modal from '@/components/Modal';
import NumericInput from '@/components/NumericInput';
import AuditLogModal from '@/components/AuditLogModal';
import SlideIn from '@/components/SlideIn';
import VersionsModal from '@/components/VersionsModal';
import { Settings as SettingsIcon, Users, Globe, Truck, Percent, Warehouse as WarehouseIcon, PackageCheck, Bell, FileText, Building2, UserPlus, Edit, Trash2, Plus, X } from 'lucide-react';
import { eventBus } from '@/lib/eventBus';

const SettingsPage: React.FC = () => {
  const { settings, update, setSettings, exportSettings, importSettings, getVersions, publishVersion, rollbackVersion } = useSettings();
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUserSettings = settings.users.find(u => (u.email && user?.email && u.email === user.email) || u.name === user?.name);

  const handleExport = async () => {
    try {
      const txt = await exportSettings();
      const blob = new Blob([txt], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'settings-export.json'; a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'تم التصدير', description: 'تم تنزيل ملف الإعدادات.' });
    } catch (e) { toast({ title: 'خطأ', description: 'فشل التصدير.' }); }
  };

  const handleImport = async (file: File | null) => {
    if (!file) return; const txt = await file.text();
    try {
      const parsed = JSON.parse(txt);
      await importSettings(parsed);
      toast({ title: 'تم الإستيراد', description: 'تم إنشاء مسودة من الملف المستورد.' });
    } catch (e) { toast({ title: 'خطأ', description: 'فشل الإستيراد. تأكد من صحة الملف.' }); }
  };

  const [showVersions, setShowVersions] = useState(false);
  const handleVersions = async () => { setShowVersions(true); };

  // General
  const [general, setGeneral] = useState(settings.general);

  // Users
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', role: 'employee' as const, permissions: { read: true, write: false, update: false, delete: false } });

  // Currencies
  const [rates, setRates] = useState(settings.currencies.rates);

  // Shipping
  const [companies, setCompanies] = useState(settings.shipping.companies);
  const [types, setTypes] = useState(settings.shipping.types);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showSlide, setShowSlide] = useState(false);
  const [companyForm, setCompanyForm] = useState({ id: '', name: '', countries: '' });
  const [typeForm, setTypeForm] = useState({ id: '', kind: 'air_standard' as const, country: 'UAE', pricePerKgMRU: 1000, durationDays: 7, effectiveFrom: '', effectiveTo: '' });

  // Orders & Invoices
  const [ordersInvoices, setOrdersInvoices] = useState(settings.ordersInvoices);

  // Warehouse
  const [warehouse, setWarehouse] = useState(settings.warehouse);
  const [showDrawerModal, setShowDrawerModal] = useState(false);
  const [drawerForm, setDrawerForm] = useState({ id: '', name: '', capacity: 50 });

  // Delivery
  const [delivery, setDelivery] = useState(settings.delivery);

  // Notifications
  const [notifications, setNotifications] = useState(settings.notifications);

  useLockBodyScroll(showUserModal || showCompanyModal || showTypeModal || showDrawerModal);

  const saveSection = (key: keyof typeof settings, value: any) => {
    // check permissions
    const canWrite = currentUserSettings ? currentUserSettings.permissions.write : (user?.role === 'admin');
    if (!canWrite) {
      toast({ title: 'ممنوع', description: 'ليس لديك صلاحية تعديل هذه الإعدادات.' });
      return;
    }

    update({ [key]: value } as any);
    // emit suggestion for reprice or notify affected subsystems
    try {
      eventBus.emit('settings.saved', { key, value, user: null });
      if (key === 'shipping') {
        toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات الشحن — يمكنك إعادة تسعير الشحنات المفتوحة.', action: { label: 'عرض الشحنات', onClick: () => { window.location.href = '/shipments'; } } });
      } else if (key === 'currencies') {
        toast({ title: 'تم الحفظ', description: 'تم تحديث أسعار الصرف — سيتم اقتراح إعادة تسعير العروض المفتوحة.', action: { label: 'عرض الطلبات', onClick: () => { window.location.href = '/orders'; } } });
      } else {
        toast({ title: 'تم الحفظ', description: 'تم تطبيق الإعدادات على النظام.' });
      }
    } catch (e) { toast({ title: 'تم الحفظ', description: 'تم تطبيق الإعدادات على النظام.' }); }
  };

  const startAddUser = () => {
    setEditUserId(null);
    setUserForm({ name: '', email: '', phone: '', role: 'employee', permissions: { read: true, write: false, update: false, delete: false } });
    setShowUserModal(true);
  };
  const startEditUser = (id: string) => {
    const u = settings.users.find(x => x.id === id);
    if (!u) return;
    setEditUserId(id);
    setUserForm({ name: u.name, email: u.email || '', phone: u.phone || '', role: u.role, permissions: { ...u.permissions } });
    setShowUserModal(true);
  };
  const submitUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim()) return;
    if (editUserId) {
      const next = settings.users.map(u => u.id === editUserId ? { ...u, ...userForm } : u);
      update({ users: next });
    } else {
      const id = 'u_' + Date.now();
      const next = [{ id, ...userForm }, ...settings.users];
      update({ users: next });
    }
    setShowUserModal(false);
    toast({ title: 'تم الحفظ', description: 'تم تحديث المستخدمين.' });
  };
  const removeUser = (id: string) => {
    const next = settings.users.filter(u => u.id !== id);
    update({ users: next });
    toast({ title: 'تم الحذف', description: 'تم حذف المستخدم.' });
  };

  const submitCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name.trim()) return;
    const id = companyForm.id || ('sc_' + Date.now());
    const item = { id, name: companyForm.name.trim(), countries: companyForm.countries.split(',').map(s => s.trim()).filter(Boolean) };
    const next = companies.some(c => c.id === id) ? companies.map(c => c.id === id ? item : c) : [item, ...companies];
    setCompanies(next);
    setShowCompanyModal(false);
  };
  const submitType = (e: React.FormEvent) => {
    e.preventDefault();
    const id = typeForm.id || ('st_' + Date.now());
    const item = { ...typeForm, id };
    const next = types.some(t => t.id === id) ? types.map(t => t.id === id ? item : t) : [item, ...types];
    setTypes(next);
    setShowTypeModal(false);
  };

  const submitDrawer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerForm.name.trim()) return;
    const id = drawerForm.id || ('d_' + Date.now());
    const item = { id, name: drawerForm.name.trim(), capacity: Math.max(1, drawerForm.capacity|0) };
    const next = warehouse.drawers.some(d => d.id === id) ? warehouse.drawers.map(d => d.id === id ? item : d) : [item, ...warehouse.drawers];
    setWarehouse({ ...warehouse, drawers: next });
    setShowDrawerModal(false);
  };

  const CommissionPoliciesEditor: React.FC<{ value: { id: string; storeId?: string; type: 'percentage'|'fixed'; value: number; effectiveFrom?: string; effectiveTo?: string }[]; onChange: (v: any[]) => void }> = ({ value, onChange }) => {
    const [policies, setPolicies] = useState(value);
    useEffect(()=> setPolicies(value), [value]);
    const [form, setForm] = useState({ id: '', storeId: '', type: 'percentage' as const, value: 5, effectiveFrom: '', effectiveTo: '' });
    const addOrUpdate = () => {
      const id = form.id && form.id.trim() !== '' ? form.id : 'cp_' + Date.now();
      const item = { ...form, id, value: Math.max(0, Math.round(Number(form.value) || 0)) } as any;
      const next = policies.some(p => p.id === id) ? policies.map(p => p.id === id ? item : p) : [item, ...policies];
      setPolicies(next); onChange(next);
      setForm({ id: '', storeId: '', type: 'percentage', value: 5, effectiveFrom: '', effectiveTo: '' });
    };
    const remove = (id: string) => { const next = policies.filter(p => p.id !== id); setPolicies(next); onChange(next); };

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <Input placeholder="storeId (اختياري)" value={form.storeId} onChange={(e)=> setForm({ ...form, storeId: e.target.value })} />
          <select value={form.type} onChange={(e)=> setForm({ ...form, type: e.target.value as any })} className="w-full px-3 py-2 border rounded">
            <option value="percentage">نسبة %</option>
            <option value="fixed">مبلغ ثابت</option>
          </select>
          <Input placeholder="قيمة" type="number" value={form.value} onChange={(e)=> setForm({ ...form, value: parseInt(e.target.value)||0 })} />
          <Input placeholder="من (YYYY-MM-DD)" value={form.effectiveFrom} onChange={(e)=> setForm({ ...form, effectiveFrom: e.target.value })} />
          <Input placeholder="إلى (YYYY-MM-DD)" value={form.effectiveTo} onChange={(e)=> setForm({ ...form, effectiveTo: e.target.value })} />
          <Button onClick={addOrUpdate}>حفظ السياسة</Button>
        </div>
        <div className="space-y-2">
          {policies.map(p => (
            <div key={p.id} className="p-2 rounded border flex items-center justify-between text-xs">
              <div>{p.storeId || 'كل المتاجر'} • {p.type} • {p.value} • {p.effectiveFrom || '-'} → {p.effectiveTo || '-'}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={()=> setForm({ id: p.id, storeId: p.storeId || '', type: p.type, value: p.value, effectiveFrom: p.effectiveFrom || '', effectiveTo: p.effectiveTo || '' })}>تعديل</Button>
                <Button size="sm" variant="destructive" onClick={()=> remove(p.id)}>حذف</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const FinanceCategoriesEditor: React.FC<{ storageKey: string; defaultValue: string[] }> = ({ storageKey, defaultValue }) => {
    const [local, setLocal] = useState<string[]>(() => {
      try { const raw = localStorage.getItem(storageKey); return raw ? JSON.parse(raw) : defaultValue; } catch (e) { return defaultValue; }
    });
    const [newCat, setNewCat] = useState('');

    const save = () => {
      try { localStorage.setItem(storageKey, JSON.stringify(local)); toast({ title: 'تم الحفظ', description: 'تم تحديث الفئات.' }); } catch (e) { console.error(e); }
    };

    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input value={newCat} onChange={(e)=> setNewCat(e.target.value)} placeholder="أضف فئة" />
          <Button onClick={() => { if (!newCat.trim()) return; setLocal(s => [newCat.trim(), ...s]); setNewCat(''); }} className="px-3">إضافة</Button>
        </div>
        <div className="space-y-2">
          {local.map((c, idx) => (
            <div key={c} className="p-3 rounded border flex items-center justify-between">
              <div>
                <div className="font-medium arabic-safe">{c}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { const updated = local.filter((_, i)=> i!==idx); setLocal(updated); }}><Trash2 size={14} /></Button>
                <Button variant="outline" size="sm" onClick={() => { const val = prompt('عدل اسم الفئة', c); if (val && val.trim()) { const next = [...local]; next[idx] = val.trim(); setLocal(next); } }}><Edit size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end"><Button className="bg-blue-600 hover:bg-blue-700" onClick={save}>حفظ</Button></div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>تصدير</Button>
            <label className="btn btn-sm cursor-pointer">
              <input type="file" accept="application/json" onChange={(e) => handleImport(e.target.files ? e.target.files[0] : null)} className="hidden" />
              <Button variant="outline" size="sm">استيراد</Button>
            </label>
            <Button variant="outline" size="sm" onClick={handleVersions}>الإصدارات</Button>
            <VersionsModal isOpen={showVersions} onClose={() => setShowVersions(false)} />
            <Button variant="outline" size="sm" onClick={() => setShowAuditModal(true)}>سجل التغييرات</Button>
            <Button variant="outline" size="sm" onClick={() => setShowSlide(true)}>محرر سريع</Button>
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white arabic-safe">مركز الإعدادات</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 arabic-safe">كل إعاد هنا ينعكس تلقائياً على النظام</p>
          </div>
        </div>

        <Card className="mb-4"><CardContent className="p-2 sm:p-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="flex gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto whitespace-nowrap sticky top-2 z-10">
              <TabsTrigger value="general" className="px-3 py-2 text-sm arabic-safe">عام</TabsTrigger>
              <TabsTrigger value="users" className="px-3 py-2 text-sm arabic-safe">المستخدمون والصلاحيات</TabsTrigger>
              <TabsTrigger value="currencies" className="px-3 py-2 text-sm arabic-safe">العملات</TabsTrigger>
              <TabsTrigger value="shipping" className="px-3 py-2 text-sm arabic-safe">الشحن</TabsTrigger>
              <TabsTrigger value="ordersInvoices" className="px-3 py-2 text-sm arabic-safe">الطلبات والفواتير</TabsTrigger>
              <TabsTrigger value="warehouse" className="px-3 py-2 text-sm arabic-safe">المخزن</TabsTrigger>
              <TabsTrigger value="delivery" className="px-3 py-2 text-sm arabic-safe">التوصيل</TabsTrigger>
              <TabsTrigger value="notifications" className="px-3 py-2 text-sm arabic-safe">التنبيهات</TabsTrigger>
              <TabsTrigger value="finance" className="px-3 py-2 text-sm arabic-safe">الإيرادات والمصاريف</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4">
              <Card><CardHeader /><CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">الاسم التجاري</label>
                  <Input value={general.businessName} onChange={(e) => setGeneral({ ...general, businessName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">شعار (رابط)</label>
                  <Input value={general.logoUrl || ''} onChange={(e) => setGeneral({ ...general, logoUrl: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">الهاتف</label>
                  <Input value={general.phone || ''} onChange={(e) => setGeneral({ ...general, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">البري�� الإلكتروني</label>
                  <Input value={general.email || ''} onChange={(e) => setGeneral({ ...general, email: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">العنوان</label>
                  <Input value={general.address || ''} onChange={(e) => setGeneral({ ...general, address: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">اللغة الافتراضية</label>
                  <select value={general.language} onChange={(e) => setGeneral({ ...general, language: e.target.value as any })} className="w-full px-3 py-2 border rounded">
                    <option value="ar">العربية</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700" onClick={() => saveSection('general', general)}>حفظ</Button>
                </div>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="users" className="mt-4">
              <Card><CardContent className="p-4 sm:p-6 space-y-3">
                <div className="flex justify-end"><Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 arabic-safe" onClick={startAddUser}><UserPlus size={16} /> إضافة مستخدم</Button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {settings.users.map(u => (
                    <div key={u.id} className="p-3 rounded border flex items-center justify-between">
                      <div>
                        <div className="font-medium arabic-safe">{u.name}</div>
                        <div className="text-xs text-gray-600 arabic-safe">{u.email}</div>
                        <div className="text-xs text-gray-600 arabic-safe">الدور: {u.role}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEditUser(u.id)}><Edit size={14} /></Button>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => removeUser(u.id)}><Trash2 size={14} /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="currencies" className="mt-4">
              <Card><CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['USD','AED','EUR'] as const).map((c) => (
                  <div key={c} className="p-3 rounded border">
                    <div className="text-sm font-medium">{c}</div>
                    <Input type="number" value={rates[c]} onChange={(e) => setRates({ ...rates, [c]: parseFloat(e.target.value)||0 })} />
                  </div>
                ))}
                <div className="md:col-span-3"><Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700" onClick={() => saveSection('currencies', { rates })}>حفظ</Button></div>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="shipping" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader />
                  <CardContent className="p-4 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium arabic-safe">شركات الشحن</div>
                      <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setCompanyForm({ id: '', name: '', countries: '' }); setShowCompanyModal(true); }}><Plus size={16} /> إضافة</Button>
                    </div>
                    <div className="space-y-2">
                      {companies.map(c => (
                        <div key={c.id} className="p-3 rounded border flex items-center justify-between">
                          <div>
                            <div className="font-medium arabic-safe">{c.name}</div>
                            <div className="text-xs text-gray-600">الدول: {c.countries.join(', ')}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setCompanyForm({ id: c.id, name: c.name, countries: c.countries.join(', ') }); setShowCompanyModal(true); }}><Edit size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => setCompanies(prev => prev.filter(x => x.id !== c.id))}><Trash2 size={14} /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div><Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700" onClick={() => saveSection('shipping', { companies, types })}>حفظ</Button></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader />
                  <CardContent className="p-4 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium arabic-safe">أنواع الشحن وأسعار الكيلوجرام</div>
                      <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setTypeForm({ id: '', kind: 'air_standard', country: 'UAE', pricePerKgMRU: 1000, durationDays: 7 }); setShowTypeModal(true); }}><Plus size={16} /> إضافة</Button>
                    </div>
                    <div className="space-y-2">
                      {types.map(t => (
                        <div key={t.id} className="p-3 rounded border flex items-center justify-between">
                          <div>
                            <div className="font-medium arabic-safe">{t.kind}</div>
                            <div className="text-xs text-gray-600 arabic-safe">الدولة: {t.country || '-'}</div>
                            <div className="text-xs text-gray-600">MRU/كجم: {new Intl.NumberFormat('en-US').format(t.pricePerKgMRU)}</div>
                            {t.durationDays ? (<div className="text-xs text-gray-600">المدة: {t.durationDays} يوم</div>) : null}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setTypeForm({ id: t.id, kind: t.kind, country: t.country || '', pricePerKgMRU: t.pricePerKgMRU, durationDays: t.durationDays || 0, effectiveFrom: t.effectiveFrom || '', effectiveTo: t.effectiveTo || '' }); setShowTypeModal(true); }}><Edit size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => setTypes(prev => prev.filter(x => x.id !== t.id))}><Trash2 size={14} /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div><Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700" onClick={() => saveSection('shipping', { companies, types })}>حفظ</Button></div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="ordersInvoices" className="mt-4">
              <Card><CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">نسبة العمولة الافتراضية (%)</label>
                  <NumericInput value={String(ordersInvoices.defaultCommissionPercent)} onChange={(v) => setOrdersInvoices({ ...ordersInvoices, defaultCommissionPercent: Math.min(10, Math.max(3, Math.round(Number(v) || 0))) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">نوع الخصم الافتراضي</label>
                  <select value={ordersInvoices.defaultDiscountType} onChange={(e) => setOrdersInvoices({ ...ordersInvoices, defaultDiscountType: e.target.value as any })} className="w-full px-3 py-2 border rounded">
                    <option value="none">بدون</option>
                    <option value="fixed">مبلغ ثابت</option>
                    <option value="percentage">نسبة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">قيمة الخصم الافتراضي</label>
                  <NumericInput value={String(ordersInvoices.defaultDiscountValue)} onChange={(v) => setOrdersInvoices({ ...ordersInvoices, defaultDiscountValue: Math.round(Number(v) || 0) })} />
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">شعار الفاتورة</label>
                      <Input value={ordersInvoices.invoiceBranding.logoUrl || ''} onChange={(e) => setOrdersInvoices({ ...ordersInvoices, invoiceBranding: { ...ordersInvoices.invoiceBranding, logoUrl: e.target.value } })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">الترويسة</label>
                      <Input value={ordersInvoices.invoiceBranding.header || ''} onChange={(e) => setOrdersInvoices({ ...ordersInvoices, invoiceBranding: { ...ordersInvoices.invoiceBranding, header: e.target.value } })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">التوقيع</label>
                      <Input value={ordersInvoices.invoiceBranding.signature || ''} onChange={(e) => setOrdersInvoices({ ...ordersInvoices, invoiceBranding: { ...ordersInvoices.invoiceBranding, signature: e.target.value } })} />
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={ordersInvoices.autoPrintAfterPayment} onChange={(e) => setOrdersInvoices({ ...ordersInvoices, autoPrintAfterPayment: e.target.checked })} /> تفعيل الطباعة التلقائية بعد الدفع</label>
                </div>
                <div className="md:col-span-2">
                  <div className="mt-4 p-3 rounded border">
                    <div className="font-medium mb-2 arabic-safe">سياسات العمولة</div>
                    <CommissionPoliciesEditor value={ordersInvoices.commissionPolicies || []} onChange={(policies)=> setOrdersInvoices({ ...ordersInvoices, commissionPolicies: policies })} />
                  </div>
                </div>
                <div className="md:col-span-2"><Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700" onClick={() => saveSection('ordersInvoices', ordersInvoices)}>حفظ</Button></div>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="warehouse" className="mt-4">
              <Card><CardContent className="p-4 sm:p-6 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium arabic-safe">الأدراج</div>
                      <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setDrawerForm({ id: '', name: '', capacity: 50 }); setShowDrawerModal(true); }}><Plus size={16} /> إضافة درج</Button>
                    </div>
                    <div className="space-y-2">
                      {warehouse.drawers.map(d => (
                        <div key={d.id} className="p-3 rounded border flex items-center justify-between">
                          <div>
                            <div className="font-medium arabic-safe">{d.name}</div>
                            <div className="text-xs text-gray-600">السعة القصوى: {d.capacity}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setDrawerForm({ id: d.id, name: d.name, capacity: d.capacity }); setShowDrawerModal(true); }}><Edit size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => setWarehouse(prev => ({ ...prev, drawers: prev.drawers.filter(x => x.id !== d.id) }))}><Trash2 size={14} /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">عتبة التنبيه عند الامتلاء (%)</label>
                    <Input type="number" value={warehouse.fullAlertThresholdPercent} onChange={(e) => setWarehouse({ ...warehouse, fullAlertThresholdPercent: Math.max(1, Math.min(100, parseInt(e.target.value)||0)) })} />
                  </div>
                </div>
                <div><Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700" onClick={() => saveSection('warehouse', warehouse)}>حفظ</Button></div>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="delivery" className="mt-4">
              <Card><CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">سعر التوصيل داخل نواكشوط (MRU)</label>
                  <NumericInput value={String(delivery.insideNKCPrice)} onChange={(v) => setDelivery({ ...delivery, insideNKCPrice: Math.round(Number(v) || 0) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">سعر التوصيل خارج نواكشوط (MRU)</label>
                  <NumericInput value={String(delivery.outsideNKCPrice)} onChange={(v) => setDelivery({ ...delivery, outsideNKCPrice: Math.round(Number(v) || 0) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">نسبة أرباح الموصل (%)</label>
                  <NumericInput value={String(delivery.courierProfitPercent)} onChange={(v) => setDelivery({ ...delivery, courierProfitPercent: Math.max(0, Math.min(100, Math.round(Number(v) || 0))) })} />
                </div>
                <div className="md:col-span-3"><Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700" onClick={() => saveSection('delivery', delivery)}>حفظ</Button></div>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="finance" className="mt-4">
              <Card><CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium arabic-safe">فئات الإيرادات</div>
                  </div>
                  <FinanceCategoriesEditor storageKey="finance-cats-revenue" defaultValue={["مبيعات", "استثمار", "إيراد آخر"]} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium arabic-safe">فئات المصاريف</div>
                  </div>
                  <FinanceCategoriesEditor storageKey="finance-cats-expense" defaultValue={["رواتب", "لوجيستيك", "مصاريف مكتبية"]} />
                </div>

              </CardContent></Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-4">
              <Card><CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={notifications.missingTracking} onChange={(e) => setNotifications({ ...notifications, missingTracking: e.target.checked })} /> تنبيه لط��بات دون رقم تتبع</label>
                  <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={notifications.unweighedShipments} onChange={(e) => setNotifications({ ...notifications, unweighedShipments: e.target.checked })} /> تنبيه شحنات غير موزونة</label>
                  <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={notifications.unpaidInvoices} onChange={(e) => setNotifications({ ...notifications, unpaidInvoices: e.target.checked })} /> تنبيه فواتير غير مدفوعة</label>
                </div>
                <div className="space-y-3">
                  <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={notifications.channelInApp} onChange={(e) => setNotifications({ ...notifications, channelInApp: e.target.checked })} /> إشعارات داخل التطبيق</label>
                  <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={notifications.channelPush} onChange={(e) => setNotifications({ ...notifications, channelPush: e.target.checked })} /> Push إشعارات</label>
                </div>
                <div className="md:col-span-2"><Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700" onClick={() => saveSection('notifications', notifications)}>حفظ</Button></div>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </CardContent></Card>
      </div>

      {/* Modals */}
      {showUserModal && (
        <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={editUserId ? 'تعديل مستخد��' : 'إضافة مستخدم'}>
          <form onSubmit={submitUser} className="space-y-3">
            <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">الاسم</label><Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">البريد</label><Input value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">الهاتف</label><Input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">الدور</label><select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })} className="w-full px-3 py-2 border rounded"><option value="admin">مدير</option><option value="employee">موظف</option><option value="delivery">موصل</option><option value="investor">مستثمر</option></select></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={userForm.permissions.read} onChange={(e) => setUserForm({ ...userForm, permissions: { ...userForm.permissions, read: e.target.checked } })} /> قراءة</label><label className="inline-flex items-center gap-2"><input type="checkbox" checked={userForm.permissions.write} onChange={(e) => setUserForm({ ...userForm, permissions: { ...userForm.permissions, write: e.target.checked } })} /> كتابة</label><label className="inline-flex items-center gap-2"><input type="checkbox" checked={userForm.permissions.update} onChange={(e) => setUserForm({ ...userForm, permissions: { ...userForm.permissions, update: e.target.checked } })} /> تعديل</label><label className="inline-flex items-center gap-2"><input type="checkbox" checked={userForm.permissions.delete} onChange={(e) => setUserForm({ ...userForm, permissions: { ...userForm.permissions, delete: e.target.checked } })} /> حذف</label></div>
          </form>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowUserModal(false)} type="button">إلغاء</Button><Button onClick={submitUser} className="bg-blue-600 hover:bg-blue-700">حفظ</Button></div>
        </Modal>
      )}

      {showCompanyModal && (
        <Modal isOpen={showCompanyModal} onClose={() => setShowCompanyModal(false)} title="شركة شحن">
          <form onSubmit={submitCompany} className="space-y-3">
            <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">الاسم</label><Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} required /></div>
            <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">الدول (مفصولة بفواصل)</label><Input value={companyForm.countries} onChange={(e) => setCompanyForm({ ...companyForm, countries: e.target.value })} placeholder="UAE, CN" /></div>
          </form>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowCompanyModal(false)} type="button">إلغاء</Button><Button onClick={submitCompany} className="bg-blue-600 hover:bg-blue-700">حفظ</Button></div>
        </Modal>
      )}

      <AuditLogModal isOpen={showAuditModal} onClose={() => setShowAuditModal(false)} />

      {showTypeModal && (
        <SlideIn isOpen={showTypeModal} onClose={() => setShowTypeModal(false)} title="نوع الشحن">
          <form onSubmit={submitType} className="space-y-3">
            <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">النوع</label><select value={typeForm.kind} onChange={(e) => setTypeForm({ ...typeForm, kind: e.target.value as any })} className="w-full px-3 py-2 border rounded"><option value="air_standard">جوي عادي</option><option value="air_express">جوي سريع</option><option value="sea">بحري</option></select></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">الدولة</label><Input value={typeForm.country} onChange={(e) => setTypeForm({ ...typeForm, country: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">MRU/كجم</label><NumericInput value={String(typeForm.pricePerKgMRU)} onChange={(v) => setTypeForm({ ...typeForm, pricePerKgMRU: Math.round(Number(v) || 0) })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">المدة (يوم)</label><NumericInput value={String(typeForm.durationDays)} onChange={(v) => setTypeForm({ ...typeForm, durationDays: Math.max(0, Math.round(Number(v) || 0)) })} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">ساري من</label><Input placeholder="YYYY-MM-DD" value={typeForm.effectiveFrom} onChange={(e)=> setTypeForm({ ...typeForm, effectiveFrom: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">ساري إلى</label><Input placeholder="YYYY-MM-DD" value={typeForm.effectiveTo} onChange={(e)=> setTypeForm({ ...typeForm, effectiveTo: e.target.value })} /></div>
            </div>
          </form>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowTypeModal(false)} type="button">إلغاء</Button><Button onClick={submitType} className="bg-blue-600 hover:bg-blue-700">حفظ</Button></div>
        </SlideIn>
      )}

      {showSlide && (
        <SlideIn isOpen={showSlide} onClose={() => setShowSlide(false)} title="محرر سريع">
          <div>
            <p className="text-sm text-gray-600">محرر سريع للوصول للتعديلات السريعة. يمكنك تعديل الأقسام وحفظها كمسودة.</p>
            <div className="mt-3 space-y-2">
              <Button className="w-full" onClick={() => { setShowSlide(false); setShowTypeModal(true); }}>تحرير أنواع الشحن</Button>
              <Button className="w-full" onClick={() => { setShowSlide(false); setShowAuditModal(true); }}>عرض سجل التغييرات</Button>
            </div>
          </div>
        </SlideIn>
      )}

      {showDrawerModal && (
        <Modal isOpen={showDrawerModal} onClose={() => setShowDrawerModal(false)} title="درج المخزن">
          <form onSubmit={submitDrawer} className="space-y-3">
            <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">الاسم</label><Input value={drawerForm.name} onChange={(e) => setDrawerForm({ ...drawerForm, name: e.target.value })} required /></div>
            <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">السعة القصوى</label><NumericInput value={String(drawerForm.capacity)} onChange={(v) => setDrawerForm({ ...drawerForm, capacity: Math.max(1, Math.round(Number(v) || 0)) })} /></div>
          </form>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowDrawerModal(false)} type="button">إلغاء</Button><Button onClick={submitDrawer} className="bg-blue-600 hover:bg-blue-700">حفظ</Button></div>
        </Modal>
      )}
    </div>
  );
};

export default SettingsPage;
