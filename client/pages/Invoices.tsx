import React, { useMemo, useState } from 'react';
import { Search, Plus, Printer, CheckCircle, AlertCircle, DollarSign, Calendar, Hash, FileText, X, User, Store, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumericInput from '@/components/NumericInput';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { generateInvoiceHTML } from '@/utils/invoiceTemplate';
import { getInvoices, setInvoices as persistInvoices } from '@/utils/invoiceStorage';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrencyMRU, formatDate as fmtDate } from '@/utils/format';
import { eventBus } from '@/lib/eventBus';

interface Customer { id: string; name: string; phone: string; address?: string; }
interface StoreInfo { id: string; name: string; country: string; currency: 'USD' | 'AED'; }

interface InvoiceItemInput { storeId: string; title?: string; quantity: number; unitPrice: number; currency: 'USD' | 'AED'; }

interface InvoiceItem { title: string; quantity: number; unitPrice: number; currency: 'USD' | 'AED'; storeName: string; mruTotal: number; }

type InvoiceStatus = 'paid' | 'unpaid' | 'partial';

interface Invoice {
  id: string;
  invoiceNumber: number;
  orderNumber?: number;
  customer: Customer;
  items: InvoiceItem[];
  totalMRU: number; // MRU
  commissionMRU?: number;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number; // if fixed -> MRU, if percentage -> %
  finalMRU: number; // MRU after commission/discount
  status: InvoiceStatus;
  createdAt: Date;
  printed?: boolean;
  printedAt?: Date;
  expectedDeliveryDate?: Date;
  notes?: string;
}

const mockCustomers: Customer[] = [
  { id: 'c1', name: 'أحمد محمد', phone: '+222 12345678', address: 'حي عرفات، شارع الجمهورية' },
  { id: 'c2', name: 'فاطمة أحمد', phone: '+222 87654321', address: 'حي النصر، شارع المدينة' },
  { id: 'c3', name: 'محمد الأمين', phone: '+222 55443322', address: 'حي دار النعيم، شارع الاستقلال' },
  { id: 'c8', name: 'محمد ولد أحمد الشيخ', phone: '+222 66778899', address: 'حي تفرغ زينة' }
];

const mockStores: StoreInfo[] = [
  { id: 's1', name: 'أمازون الولايات المتحدة', country: 'USA', currency: 'USD' },
  { id: 's2', name: 'علي إكسبريس', country: 'China', currency: 'USD' },
  { id: 's3', name: 'نون الإمارات', country: 'UAE', currency: 'AED' },
];

// Exchange rates -> MRU
const mockOrders: { id: string; orderId: number; customerId: string; }[] = [
  { id: 'o1', orderId: 1001, customerId: 'c1' },
  { id: 'o2', orderId: 1005, customerId: 'c1' },
  { id: 'o3', orderId: 1002, customerId: 'c2' },
  { id: 'o4', orderId: 1008, customerId: 'c8' },
  { id: 'o5', orderId: 1010, customerId: 'c3' }
];

const formatPrice = (price: number) => formatCurrencyMRU(price);
const formatDate = (date: Date) => fmtDate(date);

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try { return getInvoices() as Invoice[]; } catch { return []; }
  });
  const [search, setSearch] = useState('');
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  useLockBodyScroll(showNewInvoice);

  // Persist to storage on change
  React.useEffect(() => {
    try { persistInvoices(invoices as any); } catch {}
  }, [invoices]);

  // Sync invoices when order updates (e.g., mark invoice paid when order is paid)
  React.useEffect(() => {
    const off = (eventBus as any).on('order.updated', (updated: any) => {
      setInvoices(prev => prev.map(inv => {
        if (inv.orderNumber && inv.orderNumber === updated.orderId) {
          // if order became paid, mark invoice paid
          if (updated.status === 'paid') return { ...inv, status: 'paid' };
        }
        return inv;
      }));
    });
    return () => off();
  }, []);

  const nextInvoiceNumber = useMemo(() => {
    const max = invoices.reduce((m, i) => Math.max(m, i.invoiceNumber || 0), 0);
    return (max || 0) + 1;
  }, [invoices]);

  // Show all invoices to ensure newly saved invoices are visible
  const filtered = useMemo(() => {
    let list = [...invoices];
    if (search.trim()) {
      const q = search.trim();
      list = list.filter(inv =>
        inv.invoiceNumber.toString().includes(q) ||
        inv.orderNumber?.toString().includes(q) ||
        inv.customer.name.includes(q) ||
        inv.customer.phone.includes(q)
      );
    }
    return list.sort((a, b) => (b.printedAt?.getTime() || b.createdAt.getTime()) - (a.printedAt?.getTime() || a.createdAt.getTime()));
  }, [invoices, search]);

  const handlePrint = (inv: Invoice) => {
    const invoiceData = {
      orderNumber: inv.orderNumber || inv.invoiceNumber,
      customerName: inv.customer.name,
      customerPhone: inv.customer.phone,
      storeName: 'Fast Command',
      products: inv.items.map(i => ({ url: i.title || i.storeName, quantity: i.quantity })),
      originalPrice: inv.totalMRU,
      originalCurrency: 'MRU',
      finalPrice: inv.finalMRU,
      commission: inv.commissionMRU || 0,
      discount: computeDiscountAmount(inv),
      date: formatDate(new Date()),
      qrCode: `INV-${inv.invoiceNumber}-${Date.now()}`
    };
    const html = generateInvoiceHTML(invoiceData, inv.status !== 'paid');
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }

    // mark as printed and persist
    setInvoices(prev => prev.map(x => x.id === inv.id ? { ...x, printed: true, printedAt: new Date() } : x));
  };

  const computeDiscountAmount = (inv: Pick<Invoice,'discountType'|'discountValue'|'totalMRU'>) => {
    if (!inv.discountType || !inv.discountValue) return 0;
    return inv.discountType === 'fixed' ? inv.discountValue : Math.round(inv.totalMRU * (inv.discountValue / 100));
  };

  const InvoiceCard: React.FC<{ inv: Invoice }> = ({ inv }) => (
    <Card className={cn('w-full bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] border border-gray-200 dark:border-gray-700')}>
      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-t-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash size={16} className="text-gray-500" />
            <span className="font-bold text-lg text-gray-900 dark:text-white numeric">فاتورة #{inv.invoiceNumber}</span>
            {inv.orderNumber && <span className="text-sm text-gray-500 numeric">طلب #{inv.orderNumber}</span>}
          </div>
          <Badge className={cn('text-xs arabic-safe', inv.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : inv.status === 'partial' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200')}>
            {inv.status === 'paid' ? 'مدفوعة' : inv.status === 'partial' ? 'مدفوعة جزئياً' : 'غير مدفوعة'}
          </Badge>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-2 numeric">
          <Calendar size={14} /> {formatDate(inv.createdAt)} {inv.printedAt && <span className="text-xs text-gray-500">• طُبعت: {formatDate(inv.printedAt)}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <User size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white arabic-safe">{inv.customer.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 numeric">{inv.customer.phone}</div>
          </div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 arabic-safe">الإجمالي (قبل العمولة/الخصم):</span>
            <span className="font-bold text-lg text-gray-900 dark:text-white numeric">{formatPrice(inv.totalMRU)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="arabic-safe">العمولة:</span>
            <span className="numeric">{formatPrice(inv.commissionMRU || 0)}</span>
          </div>
          {inv.discountType && inv.discountValue ? (
            <div className="flex items-center justify-between text-sm">
              <span className="arabic-safe">الخصم:</span>
              <span className="numeric text-red-600">-{formatPrice(computeDiscountAmount(inv))}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between font-bold border-t pt-1 mt-1">
            <span className="arabic-safe">الم��لغ النهائي:</span>
            <span className="text-green-600 numeric">{formatPrice(inv.finalMRU)}</span>
          </div>
        </div>
        <div className="pt-2 space-y-2">
          <Button size="sm" variant="outline" className="w-full flex items-center justify-center gap-2 h-11 hover:bg-blue-50" onClick={() => handlePrint(inv)}>
            <Printer size={18} />
            <span className="text-sm font-medium arabic-safe">طباعة الفاتورة</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white arabic-safe">الفواتير المطبوعة</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 arabic-safe">عرض كل الفواتير المطبوعة لكل طلب + إنشاء فاتورة جديدة</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setShowSettings(true)}
              className="w-full sm:w-auto h-12 sm:h-10 arabic-safe"
              title="إعدادات الفواتير"
            >
              <SettingsIcon size={18} />
              إعدادات
            </Button>
            <Button onClick={() => setShowNewInvoice(true)} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto h-12 sm:h-10 arabic-safe">
              <Plus size={20} /> فاتورة جديدة
            </Button>
          </div>
        </div>

        <Sheet open={showSettings} onOpenChange={setShowSettings}>
          <SheetContent side="right" className="w-full sm:max-w-2xl max-h-screen overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <SettingsIcon size={18} />
                إعدادات الفواتير
              </SheetTitle>
            </SheetHeader>
            <InvoicesSettingsPanel onClose={() => setShowSettings(false)} />
          </SheetContent>
        </Sheet>

        <Card className="mb-6"><CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative lg:col-span-3"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} /><Input placeholder="بحث برقم الفاتورة، الطلب، أو العميل..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div>
            <Button variant="outline" onClick={() => { setSearch(''); }} className="flex items-center gap-2 arabic-safe"><X size={16} /> مسح الفلاتر</Button>
          </div>
          <div className="text-sm text-gray-600 arabic-safe">عرض {filtered.length} فاتورة (المطبوعة: {invoices.filter(i=>i.printed).length})</div>
        </CardContent></Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(inv => (<InvoiceCard key={inv.id} inv={inv} />))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12"><FileText size={48} className="text-gray-400 mx-auto mb-4" /><p className="text-gray-600 dark:text-gray-400 text-lg arabic-safe">لا توجد فواتير مطبوعة بعد</p></div>
        )}
      </div>

      {showNewInvoice && (
        <NewInvoiceModal
          customers={mockCustomers}
          stores={mockStores}
          initialInvoiceNumber={nextInvoiceNumber}
          onClose={() => setShowNewInvoice(false)}
          onCreate={(inv) => { setInvoices(prev => [inv, ...prev]); }}
        />
      )}
    </div>
  );
};

const NewInvoiceModal: React.FC<{
  customers: Customer[];
  stores: StoreInfo[];
  initialInvoiceNumber: number;
  onCreate: (inv: Invoice) => void;
  onClose: () => void;
}> = ({ customers, stores, initialInvoiceNumber, onCreate, onClose }) => {
  const { settings } = useSettings();
  const rates = { USD: settings.currencies.rates.USD || 40, AED: settings.currencies.rates.AED || 11, EUR: settings.currencies.rates.EUR || 43 } as any;
  const [invoiceNumber, setInvoiceNumber] = useState<string>(initialInvoiceNumber.toString());
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('unpaid');

  const [items, setItems] = useState<InvoiceItemInput[]>([
    { storeId: stores[0]?.id || '', title: '', quantity: 1, unitPrice: 0, currency: stores[0]?.currency || 'USD' }
  ]);
  const [commissionPercent, setCommissionPercent] = useState<number>(Math.min(10, Math.max(3, settings.ordersInvoices.defaultCommissionPercent || 5)));
  const [discountType, setDiscountType] = useState<'fixed'|'percentage'|'none'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');

  useLockBodyScroll(true);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q));
  }, [customerSearch, customers]);

  const customerOrders = useMemo(() => mockOrders.filter(o => o.customerId === selectedCustomerId), [selectedCustomerId]);

  const selectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    const c = customers.find(x => x.id === id);
    if (c) {
      setCustomerName(c.name);
      setCustomerPhone(c.phone);
      setCustomerAddress(c.address || '');
    }
    setOrderNumber('');
  };

  const addItem = () => setItems(prev => [...prev, { storeId: stores[0]?.id || '', title: '', quantity: 1, unitPrice: 0, currency: stores[0]?.currency || 'USD' }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<InvoiceItemInput>) => setItems(prev => prev.map((it,i) => i===idx ? { ...it, ...patch } : it));

  const computeTotals = () => {
    const enriched: InvoiceItem[] = items.map(it => {
      const store = stores.find(s => s.id === it.storeId);
      const title = it.title && it.title.trim() ? it.title : (store ? store.name : 'بند');
      const rate = (rates as any)[it.currency] || 1;
      const mruTotal = Math.round(it.quantity * it.unitPrice * rate);
      return { title, quantity: it.quantity, unitPrice: it.unitPrice, currency: it.currency, storeName: store ? store.name : '-', mruTotal };
    });
    const totalMRU = enriched.reduce((s, r) => s + r.mruTotal, 0);
    const commission = Math.round(totalMRU * Math.min(10, Math.max(3, commissionPercent)) / 100);
    const discountAmount = discountType === 'fixed' ? discountValue : discountType === 'percentage' ? Math.round(totalMRU * (discountValue / 100)) : 0;
    const finalMRU = Math.max(0, totalMRU + commission - discountAmount);
    return { enriched, totalMRU, commissionMRU: commission, discountAmount, finalMRU };
  };

  const totals = computeTotals();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || !customerName || !customerPhone) return alert('يرجى إدخال الحقول المطلبة');
    if (items.length === 0) return alert('أضف على الأقل بنداً واحداً');

    const inv: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber: parseInt(invoiceNumber),
      orderNumber: orderNumber ? parseInt(orderNumber) : undefined,
      customer: { id: selectedCustomerId || `c_${Date.now()}`, name: customerName, phone: customerPhone, address: customerAddress || undefined },
      items: totals.enriched,
      totalMRU: totals.totalMRU,
      commissionMRU: totals.commissionMRU || 0,
      discountType: discountType === 'none' ? undefined : (discountType as any),
      discountValue: discountType === 'none' ? undefined : discountValue,
      finalMRU: totals.finalMRU,
      status,
      createdAt: new Date(),
      printed: false,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
      notes: notes || undefined
    };

    onCreate(inv);
    if (settings.ordersInvoices.autoPrintAfterPayment && status === 'paid') {
      const invoiceData = {
        orderNumber: inv.orderNumber || inv.invoiceNumber,
        customerName: inv.customer.name,
        customerPhone: inv.customer.phone,
        storeName: settings.general.businessName,
        products: inv.items.map(i => ({ url: i.title || i.storeName, quantity: i.quantity })),
        originalPrice: inv.totalMRU,
        originalCurrency: 'MRU',
        finalPrice: inv.finalMRU,
        commission: inv.commissionMRU || 0,
        discount: (discountType === 'fixed' ? discountValue : discountType === 'percentage' ? Math.round(totals.totalMRU * (discountValue / 100)) : 0),
        date: formatDate(new Date()),
        qrCode: `INV-${inv.invoiceNumber}-${Date.now()}`
      };
      const html = generateInvoiceHTML(invoiceData, false);
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 modal-overlay">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-4xl w-full mx-auto" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold text-lg arabic-safe">فاتورة جديدة</h3><Button variant="ghost" onClick={onClose}>إغلاق</Button></div>
        <form onSubmit={submit} className="p-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">رقم الفاتورة</label><NumericInput value={String(invoiceNumber)} onChange={(v) => setInvoiceNumber(v)} className="" /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">رقم الطلب (حسب العميل)</label>
              <select value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} disabled={!selectedCustomerId || customerOrders.length === 0} className="w-full px-3 py-2 border rounded">
                <option value="">{selectedCustomerId ? (customerOrders.length ? "-- اختر طلب --" : "لا توجد طلبات") : "اختر عميل أولاً"}</option>
                {customerOrders.map(o => (<option key={o.id} value={String(o.orderId)}>طلب #{o.orderId}</option>))}
              </select>
            </div>
          </div>

          {/* اختيار العمي */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">اختر الميل</label>
              <div className="flex gap-2">
                <Input placeholder="ابح بالاسم أو الهاتف..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                <select value={selectedCustomerId} onChange={(e) => selectCustomer(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 arabic-safe flex-1">
                  <option value="">-- اختر عميل --</option>
                  {filteredCustomers.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.phone})</option>))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">الهاتف</label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+222 12345678" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">اسم العميل</label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="ام العميل" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">نوان العميل</label>
              <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full px-3 py-2 border rounded" rows={2} />
            </div>
          </div>

          {/* البنود */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2"><div className="font-medium arabic-safe">بنود الفاتورة</div><Button type="button" onClick={addItem} className="bg-purple-600 hover:bg-purple-700">إضافة بند</Button></div>
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 rounded border">
                  <div>
                    <label className="block text-xs text-gray-600 arabic-safe mb-1">المتجر</label>
                    <select value={it.storeId} onChange={(e) => updateItem(idx, { storeId: e.target.value, currency: (stores.find(s => s.id === e.target.value)?.currency || it.currency) })} className="w-full px-2 py-2 border rounded">
                      {stores.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 arabic-safe mb-1">وصف/عنوان</label>
                    <Input value={it.title || ''} onChange={(e) => updateItem(idx, { title: e.target.value })} placeholder="اختياري" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 arabic-safe mb-1">الكمية</label>
                    <NumericInput value={String(it.quantity)} onChange={(v) => updateItem(idx, { quantity: Math.max(1, parseInt(v) || 1) })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 arabic-safe mb-1">السعر</label>
                    <NumericInput value={String(it.unitPrice)} onChange={(v) => updateItem(idx, { unitPrice: Math.max(0, parseFloat(v) || 0) })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 arabic-safe mb-1">العملة</label>
                    <select value={it.currency} onChange={(e) => updateItem(idx, { currency: e.target.value as any })} className="w-full px-2 py-2 border rounded">
                      <option value="USD">USD</option>
                      <option value="AED">AED</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div className="md:col-span-5 flex justify-end">
                    <Button type="button" variant="outline" onClick={() => removeItem(idx)} className="text-red-600 border-red-200 hover:bg-red-50">حذف</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* العمولة والخصم */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">العمولة (%)</label>
              <NumericInput value={String(commissionPercent)} onChange={(v) => setCommissionPercent(Math.min(10, Math.max(3, Math.round(Number(v) || 0))))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">نوع الخصم</label>
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className="w-full px-3 py-2 border rounded">
                <option value="none">بدون</option>
                <option value="fixed">مبلغ ثابت (MRU)</option>
                <option value="percentage">نسبة مئوية (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">قيمة الخصم</label>
              <NumericInput value={String(discountValue)} onChange={(v) => setDiscountValue(parseInt(v) || 0)} />
            </div>
          </div>

          {/* ملخص التحويل */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg border">
            <div className="text-sm text-gray-700 arabic-safe mb-2">ملخص:</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="arabic-safe">الإجمالي (MRU):</span><span className="numeric">{formatPrice(totals.totalMRU)}</span></div>
              <div className="flex justify-between"><span className="arabic-safe">العمولة ({commissionPercent}%):</span><span className="numeric">{formatPrice(totals.commissionMRU || 0)}</span></div>
              {discountType !== 'none' && (<div className="flex justify-between"><span className="arabic-safe">الخصم:</span><span className="numeric text-red-600">-{formatPrice(totals.discountAmount)}</span></div>)}
              <div className="flex justify-between font-bold border-t pt-1"><span className="arabic-safe">المبلغ النهائي:</span><span className="text-green-600 numeric">{formatPrice(totals.finalMRU)}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">تاريخ وصول الطلب المتوقع</label>
              <Input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">ملاحظات</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border rounded" rows={3} />
            </div>
          </div>
        </form>
        <div className="p-4 border-t flex justify-end gap-2"><Button variant="ghost" onClick={onClose} type="button">إغء</Button><Button type="submit" onClick={submit} className="bg-blue-600 hover:bg-blue-700">حفظ الفاتورة</Button></div>
      </div>
    </div>
  );
};

const InvoicesSettingsPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { settings, update } = useSettings();
  const [num, setNum] = useState({ ...settings.invoicesConfig?.numbering });
  const [vat, setVat] = useState<number>(settings.invoicesConfig?.tax?.vatPercent || 0);
  const [fees, setFees] = useState({ ...(settings.invoicesConfig?.fees || { extraEnabled: false, type: 'fixed' as const, value: 0 }) });
  const [discounts, setDiscounts] = useState({ ...(settings.invoicesConfig?.discounts || { enableManual: true, enableAuto: false, maxPercent: 50, maxAmountMRU: 0 }) });
  const [payments, setPayments] = useState({ ...(settings.invoicesConfig?.payments || { allowPartial: true, dueAlerts: { enabled: false, daysBefore: 3 } }) });
  const [methods, setMethods] = useState({ ...(settings.invoicesConfig?.paymentMethods || { cash: true, bankTransfer: true, mobile: { bankily: true, cedad: true, masrifi: true } }) });
  const [branding, setBranding] = useState({ ...(settings.invoicesConfig?.branding || { logoUrl: '', primaryColor: '#0ea5e9', secondaryColor: '#f97316', signature: '', stampUrl: '' }) });
  const [notif, setNotif] = useState({ ...(settings.invoicesConfig?.notifications || { sendCopyToCustomer: true, internalAlerts: true, autoReminder: { enabled: false, daysBefore: 2 } }) });

  const saveGeneral = async () => {
    await update({ invoicesConfig: { ...(settings.invoicesConfig||{}), numbering: num } });
  };
  const saveTaxesFees = async () => {
    await update({ invoicesConfig: { ...(settings.invoicesConfig||{}), tax: { vatPercent: Math.max(0, Math.round(vat||0)) }, fees } });
  };
  const saveDiscounts = async () => {
    await update({ invoicesConfig: { ...(settings.invoicesConfig||{}), discounts } });
  };
  const savePayments = async () => {
    await update({ invoicesConfig: { ...(settings.invoicesConfig||{}), payments, paymentMethods: methods } });
  };
  const saveDesign = async () => {
    await update({ invoicesConfig: { ...(settings.invoicesConfig||{}), branding } });
  };
  const saveNotifications = async () => {
    await update({ invoicesConfig: { ...(settings.invoicesConfig||{}), notifications: notif } });
    onClose?.();
  };

  return (
    <div className="mt-4">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="flex gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto whitespace-nowrap sticky top-0 z-10">
          <TabsTrigger value="general">إعدادات عامة</TabsTrigger>
          <TabsTrigger value="taxes">الضرائب والرسوم</TabsTrigger>
          <TabsTrigger value="discounts">الخصومات</TabsTrigger>
          <TabsTrigger value="payments">الدفع</TabsTrigger>
          <TabsTrigger value="design">التصميم</TabsTrigger>
          <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card><CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">بادئة الترقيم</label>
                <Input value={num.prefix} onChange={(e)=> setNum({ ...num, prefix: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">رقم البدء</label>
                <NumericInput value={String(num.startNumber)} onChange={(v)=> setNum({ ...num, startNumber: Math.max(1, parseInt(v)||1) })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">التصفير إلى</label>
                <NumericInput value={String(num.padding)} onChange={(v)=> setNum({ ...num, padding: Math.max(1, parseInt(v)||1) })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">العملة الافتراضية</label>
                <select value={settings.general.defaultCurrency} onChange={(e)=> update({ general: { ...settings.general, defaultCurrency: e.target.value as any } })} className="w-full px-3 py-2 border rounded">
                  {['MRU','USD','AED','EUR'].map(c=> (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">اللغة</label>
                <select value={settings.general.language} onChange={(e)=> update({ general: { ...settings.general, language: e.target.value as any } })} className="w-full px-3 py-2 border rounded">
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end"><Button className="bg-blue-600 hover:bg-blue-700" onClick={saveGeneral}>حفظ</Button></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="taxes" className="mt-4">
          <Card><CardContent className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">نسبة الضريبة (%)</label>
              <NumericInput value={String(vat)} onChange={(v)=> setVat(Math.max(0, Math.round(Number(v)||0)))} />
            </div>
            <div className="p-3 rounded border">
              <div className="font-medium arabic-safe mb-2">رسوم إضافية اختيارية</div>
              <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!fees.extraEnabled} onChange={(e)=> setFees({ ...fees, extraEnabled: e.target.checked })} /> تفعيل رسوم إضافية</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <select value={fees.type} onChange={(e)=> setFees({ ...fees, type: e.target.value as any })} className="px-3 py-2 border rounded"><option value="fixed">مبلغ ثابت</option><option value="percentage">نسبة</option></select>
                <NumericInput value={String(fees.value || 0)} onChange={(v)=> setFees({ ...fees, value: Math.max(0, Math.round(Number(v)||0)) })} />
              </div>
            </div>
            <div className="flex justify-end"><Button className="bg-blue-600 hover:bg-blue-700" onClick={saveTaxesFees}>حفظ</Button></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="discounts" className="mt-4">
          <Card><CardContent className="p-4 sm:p-6 space-y-3">
            <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!discounts.enableManual} onChange={(e)=> setDiscounts({ ...discounts, enableManual: e.target.checked })} /> تفعيل خصومات يدوية</label>
            <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!discounts.enableAuto} onChange={(e)=> setDiscounts({ ...discounts, enableAuto: e.target.checked })} /> تفعيل خصومات تلقائية</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">حد أقصى للخصم (%)</label>
                <NumericInput value={String(discounts.maxPercent || 0)} onChange={(v)=> setDiscounts({ ...discounts, maxPercent: Math.max(0, Math.min(100, Math.round(Number(v)||0))) })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">حد أقصى (MRU)</label>
                <NumericInput value={String(discounts.maxAmountMRU || 0)} onChange={(v)=> setDiscounts({ ...discounts, maxAmountMRU: Math.max(0, Math.round(Number(v)||0)) })} />
              </div>
            </div>
            <div className="flex justify-end"><Button className="bg-blue-600 hover:bg-blue-700" onClick={saveDiscounts}>حفظ</Button></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card><CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!methods.cash} onChange={(e)=> setMethods({ ...methods, cash: e.target.checked })} /> نقداً</label>
              <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!methods.bankTransfer} onChange={(e)=> setMethods({ ...methods, bankTransfer: e.target.checked })} /> تحويل بنكي</label>
              <div className="space-y-1">
                <div className="text-sm arabic-safe">محافظ إلكترونية</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!methods.mobile?.bankily} onChange={(e)=> setMethods({ ...methods, mobile: { ...(methods.mobile||{}), bankily: e.target.checked } })} /> Bankily</label>
                  <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!methods.mobile?.cedad} onChange={(e)=> setMethods({ ...methods, mobile: { ...(methods.mobile||{}), cedad: e.target.checked } })} /> Cedad</label>
                  <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!methods.mobile?.masrifi} onChange={(e)=> setMethods({ ...methods, mobile: { ...(methods.mobile||{}), masrifi: e.target.checked } })} /> Masrifi</label>
                </div>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!payments.allowPartial} onChange={(e)=> setPayments({ ...payments, allowPartial: e.target.checked })} /> تفعيل الدفع الجزئي</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!payments.dueAlerts?.enabled} onChange={(e)=> setPayments({ ...payments, dueAlerts: { ...(payments.dueAlerts||{ daysBefore: 3 }), enabled: e.target.checked } })} /> تفعيل تنبيهات الاستحقاق</label>
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">أيام قبل الاستحقاق</label>
                <NumericInput value={String(payments.dueAlerts?.daysBefore || 0)} onChange={(v)=> setPayments({ ...payments, dueAlerts: { ...(payments.dueAlerts||{ enabled: true }), daysBefore: Math.max(0, Math.round(Number(v)||0)) } })} />
              </div>
            </div>
            <div className="flex justify-end"><Button className="bg-blue-600 hover:bg-blue-700" onClick={savePayments}>حفظ</Button></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="design" className="mt-4">
          <Card><CardContent className="p-4 sm:p-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">رابط الشعار</label>
                <Input value={branding.logoUrl || ''} onChange={(e)=> setBranding({ ...branding, logoUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">توقيع/ختم</label>
                <Input value={branding.signature || ''} onChange={(e)=> setBranding({ ...branding, signature: e.target.value })} placeholder="نص التوقيع أو اسم" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">لون أساسي</label>
                <Input type="color" value={branding.primaryColor || '#0ea5e9'} onChange={(e)=> setBranding({ ...branding, primaryColor: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">لون ثانوي</label>
                <Input type="color" value={branding.secondaryColor || '#f97316'} onChange={(e)=> setBranding({ ...branding, secondaryColor: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end"><Button className="bg-blue-600 hover:bg-blue-700" onClick={saveDesign}>حفظ</Button></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card><CardContent className="p-4 sm:p-6 space-y-3">
            <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!notif.sendCopyToCustomer} onChange={(e)=> setNotif({ ...notif, sendCopyToCustomer: e.target.checked })} /> إرسال نسخة للعميل</label>
            <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!notif.internalAlerts} onChange={(e)=> setNotif({ ...notif, internalAlerts: e.target.checked })} /> إشعارات داخلية</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!notif.autoReminder?.enabled} onChange={(e)=> setNotif({ ...notif, autoReminder: { ...(notif.autoReminder||{ daysBefore: 2 }), enabled: e.target.checked } })} /> تذكير آلي</label>
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">أيام قبل التذكير</label>
                <NumericInput value={String(notif.autoReminder?.daysBefore || 0)} onChange={(v)=> setNotif({ ...notif, autoReminder: { ...(notif.autoReminder||{ enabled: true }), daysBefore: Math.max(0, Math.round(Number(v)||0)) } })} />
              </div>
            </div>
            <div className="flex justify-end"><Button className="bg-blue-600 hover:bg-blue-700" onClick={saveNotifications}>حفظ الإعدادات</Button></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Invoices;
