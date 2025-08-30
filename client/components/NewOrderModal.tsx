import React, { useState, useEffect } from 'react';
import {
  X, Plus, Minus, Calculator, User, Store as StoreIcon,
  Link as LinkIcon, DollarSign, Info, Check, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumericInput from '@/components/NumericInput';
import { formatCurrencyMRU } from '@/utils/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Customer, Store, ProductLink, Order } from '@/pages/Orders';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
}

// بيانات وهمية للعملاء والمتاجر
const mockCustomers: Customer[] = [
  { id: 'c1', name: 'أحمد محمد', phone: '+222 12345678', orderCount: 5 },
  { id: 'c2', name: 'فاطمة أحمد', phone: '+222 87654321', orderCount: 2 },
  { id: 'c3', name: 'محمد الأمين', phone: '+222 55443322', orderCount: 8 },
  { id: 'c4', name: 'عائشة بنت محمد', phone: '+222 77889900', orderCount: 1 },
  { id: 'c5', name: 'عبد الرحمن ولد أحمد', phone: '+222 33221100', orderCount: 12 },
];

const mockStores: Store[] = [
  { id: 's1', name: 'أمازون الولايات المتحدة', country: 'USA', currency: 'USD' },
  { id: 's2', name: 'علي إكسبرس', country: 'China', currency: 'USD' },
  { id: 's3', name: 'إيباي الولايات المتحدة', country: 'USA', currency: 'USD' },
  { id: 's4', name: 'نيوآيغ', country: 'USA', currency: 'USD' },
  { id: 's5', name: 'وول مارت', country: 'USA', currency: 'USD' },
];

// إعدادات التحويل والعمولة
const EXCHANGE_RATES = {
  AED: 106, // 1 AED = 106 MRU
  USD: 390, // 1 USD = 390 MRU
  EUR: 420, // 1 EUR = 420 MRU
  GBP: 480,
  CAD: 290,
};

const COMMISSION_RATES = {
  electronics: 0.08, // 8% للإلكترونيات
  clothing: 0.12,    // 12% للملابس
  cosmetics: 0.15,   // 15% لمستحضرات التجميل
  default: 0.10      // 10% افتراضي
};

const NewOrderModal: React.FC<NewOrderModalProps> = ({ isOpen, onClose, onOrderCreated }) => {
  // قفل التمرير في الخلفية عند فتح النافذة
  useLockBodyScroll(isOpen);

  // حالات النموذج
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [productLinks, setProductLinks] = useState<ProductLink[]>([{ url: '', quantity: 1, notes: '' }]);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [category, setCategory] = useState<keyof typeof COMMISSION_RATES>('default');
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [notes, setNotes] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('AED'); // العملة المختارة

  // حسابات السعر
  const exchangeRate = EXCHANGE_RATES[selectedCurrency as keyof typeof EXCHANGE_RATES] || 106;
  const priceInMRU = originalPrice * exchangeRate;
  const commissionRate = COMMISSION_RATES[category];
  const commission = priceInMRU * commissionRate;

  // حساب الخصم حسب النوع
  const discountAmount = discountType === 'percentage'
    ? (priceInMRU * (discount / 100))
    : discount;

  const finalPrice = priceInMRU + commission - discountAmount;

  // فلترة العملاء والمتاجر
  const filteredCustomers = mockCustomers
    .filter(customer => 
      customer.name.includes(customerSearch) || 
      customer.phone.includes(customerSearch)
    )
    .sort((a, b) => b.orderCount - a.orderCount);

  const filteredStores = mockStores.filter(store => 
    store.name.includes(storeSearch) || 
    store.country.includes(storeSearch)
  );

  // معالجة اختيار العميل مع تحسينات التفاعل
  const handleCustomerSelection = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowNewCustomerForm(false);
    setCustomerSearch('');

    // انتقال تلقائي للخطوة التالية بعد اختيار العميل
    setTimeout(() => {
      if (currentStep === 1) {
        setCurrentStep(2);
      }
    }, 300); // تأخير بسيط لإظهار التأثير البصري
  };

  // معالجة اختيار المتجر مع تحسينات التفاعل
  const handleStoreSelection = (store: Store) => {
    setSelectedStore(store);
    setStoreSearch('');

    // انتقال تلقائي للخطوة التالية بعد اختيار المتجر
    setTimeout(() => {
      if (currentStep === 2) {
        setCurrentStep(3);
      }
    }, 300); // تأخير بسيط لإظهار التأثير البصري
  };

  // دالة محسنة للانتقال بين الخطوات
  const goToStep = (step: number) => {
    if (step >= 1 && step <= 4) {
      setCurrentStep(step);
    }
  };

  // دالة للانتقال للخطوة التلية مع التحقق
  const goToNextStep = () => {
    if (currentStep < 4 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  // دالة للعودة للخطوة السابقة
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // إعادة تعيين النموذج عند إغلاقه
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setSelectedCustomer(null);
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
      setSelectedStore(null);
      setProductLinks([{ url: '', quantity: 1, notes: '' }]);
      setOriginalPrice(0);
      setCategory('default');
      setDiscount(0);
      setDiscountType('fixed');
      setSelectedCurrency('AED');
      setNotes('');
      setCustomerSearch('');
      setStoreSearch('');
      setShowNewCustomerForm(false);
    }
  }, [isOpen]);

  // إضافة رابط منتج جديد
  const addProductLink = () => {
    setProductLinks([...productLinks, { url: '', quantity: 1, notes: '' }]);
  };

  // حذف رابط منتج
  const removeProductLink = (index: number) => {
    if (productLinks.length > 1) {
      setProductLinks(productLinks.filter((_, i) => i !== index));
    }
  };

  // تحديث رابط منتج
  const updateProductLink = (index: number, field: keyof ProductLink, value: string | number) => {
    const updated = [...productLinks];
    updated[index] = { ...updated[index], [field]: value };
    setProductLinks(updated);
  };

  // إنشاء العميل الجديد
  const createNewCustomer = (): Customer => {
    const customer: Customer = {
      id: `c_${Date.now()}`,
      name: newCustomer.name,
      phone: newCustomer.phone,
      email: newCustomer.email,
      address: newCustomer.address,
      orderCount: 0
    };
    return customer;
  };

  // إنشاء الطلب
  const createOrder = () => {
    const customer = selectedCustomer || createNewCustomer();
    const totalQuantity = productLinks.reduce((sum, link) => sum + link.quantity, 0);
    
    // Generate new order ID (would come from backend in real app)
    const newOrderId = Math.max(...mockCustomers.map(c => c.orderCount)) + Math.floor(Math.random() * 1000) + 1000;

    const order: Order = {
      id: `order_${Date.now()}`,
      orderId: newOrderId,
      customer,
      store: selectedStore!,
      productLinks: productLinks.filter(link => link.url.trim() !== ''),
      productCount: totalQuantity,
      originalPrice,
      originalCurrency: selectedCurrency,
      finalPrice,
      commission,
      discount: discountAmount,
      discountType,
      discountValue: discount,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: notes || undefined
    };

    onOrderCreated(order);
    onClose();
  };

  // التحقق من صحة البيانات
  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return selectedCustomer || (newCustomer.name && newCustomer.phone);
      case 2:
        return selectedStore;
      case 3:
        return productLinks.some(link => link.url.trim() !== '') && originalPrice > 0;
      default:
        return true;
    }
  };

  const steps = [
    { number: 1, title: 'اختيار العميل', icon: Users },
    { number: 2, title: 'اختيار المتجر', icon: StoreIcon },
    { number: 3, title: 'تفاصيل الطلب', icon: LinkIcon },
    { number: 4, title: 'المراجعة والتأيد', icon: Check },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
        {/* رأس النافذة */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              إضافة طلب جديد
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {steps[currentStep - 1].title}
            </p>
          </div>
          <Button variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
            <X size={20} />
          </Button>
        </div>

        {/* مؤشر الخطوات */}
        <div className="flex-shrink-0 px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              const isValid = isStepValid(step.number);
              const canNavigate = isCompleted || (step.number === 1 && isValid);

              return (
                <div key={step.number} className="flex items-center">
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-200',
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                          ? 'bg-blue-500 text-white'
                          : isValid
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-gray-100 text-gray-400',
                      canNavigate && 'cursor-pointer hover:scale-110'
                    )}
                    onClick={() => canNavigate && goToStep(step.number)}
                    title={canNavigate ? `انتقال إلى ${step.title}` : ''}
                  >
                    {isCompleted ? <Check size={16} /> : <Icon size={16} />}
                  </div>
                  <span
                    className={cn(
                      'mr-2 text-sm hidden sm:inline transition-colors',
                      isActive ? 'text-blue-600 font-medium' : 'text-gray-600',
                      canNavigate && 'cursor-pointer hover:text-blue-600'
                    )}
                    onClick={() => canNavigate && goToStep(step.number)}
                    title={canNavigate ? `انتقال إلى ${step.title}` : ''}
                  >
                    {step.title}
                  </span>
                  {step.number < steps.length && (
                    <div className="hidden sm:block w-8 h-px bg-gray-300 mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* محتوى النافذة */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto modal-content-scrollable scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {/* الخطوة 1: اختيار العميل */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">اختيار العميل</h3>
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  عميل جديد
                </Button>
              </div>

              {!showNewCustomerForm ? (
                <>
                  {/* بحث العملاء */}
                  <Input
                    placeholder="بحث بالاسم أو رقم الهاتف..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />

                  {/* قائمة العملاء */}
                  <div className="grid gap-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {filteredCustomers.map((customer) => (
                      <Card
                        key={customer.id}
                        className={cn(
                          'cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
                          selectedCustomer?.id === customer.id
                            ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        )}
                        onClick={() => handleCustomerSelection(customer)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white arabic-safe break-words">
                                {customer.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 numeric break-words">
                                {customer.phone}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="arabic-safe">
                                {customer.orderCount} طلب
                              </Badge>
                              {selectedCustomer?.id === customer.id && (
                                <Check size={16} className="text-blue-500" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                /* نموذج عميل جديد */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="اسم العميل *"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    />
                    <Input
                      placeholder="رقم الهاتف *"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    />
                    <Input
                      placeholder="البريد الإلكتروني (اختياري)"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    />
                    <Input
                      placeholder="العنوان (اختياري)"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* الخطوة 2: اختيار المتجر */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">اختيار المتجر</h3>
              
              {/* بحث المتاجر */}
              <Input
                placeholder="بحث عن المتجر..."
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
              />

              {/* قائمة المتاجر */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {filteredStores.map((store) => (
                  <Card
                    key={store.id}
                    className={cn(
                      'cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
                      selectedStore?.id === store.id
                        ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    )}
                    onClick={() => handleStoreSelection(store)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <StoreIcon size={20} className="text-green-500 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white arabic-safe break-words">
                              {store.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 arabic-safe break-words">
                              {store.country} • {store.currency}
                            </div>
                          </div>
                        </div>
                        {selectedStore?.id === store.id && (
                          <Check size={16} className="text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* الخطوة 3: تفاصيل الطلب */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">تفاصيل الطلب</h3>
              
              {/* روابط المنتجات */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">روابط المنتجات</label>
                  <Button variant="outline" size="sm" onClick={addProductLink}>
                    <Plus size={16} />
                    إضافة رابط
                  </Button>
                </div>
                
                {productLinks.map((link, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-6">
                        <Input
                          placeholder="رابط المنتج"
                          value={link.url}
                          onChange={(e) => updateProductLink(index, 'url', e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <NumericInput
                          value={String(link.quantity)}
                          onChange={(v) => updateProductLink(index, 'quantity', Math.max(1, parseInt(v) || 1))}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Input
                          placeholder="ملاحظات (اختياري)"
                          value={link.notes}
                          onChange={(e) => updateProductLink(index, 'notes', e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeProductLink(index)}
                          disabled={productLinks.length === 1}
                          className="w-full"
                        >
                          <Minus size={16} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* تفاصيل السعر */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">السعر الأصلي</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-20"
                    >
                      <option value="AED">AED</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <NumericInput
                      value={String(originalPrice || '')}
                      onChange={(v) => setOriginalPrice(parseFloat(v) || 0)}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">فئة المنتج</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as keyof typeof COMMISSION_RATES)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="default">عام (10%)</option>
                    <option value="electronics">إلكترونيات (8%)</option>
                    <option value="clothing">ملابس (12%)</option>
                    <option value="cosmetics">مستحضرات التجميل (15%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">الخصم</label>
                  <div className="flex gap-2">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                    >
                      <option value="fixed">أوقية</option>
                      <option value="percentage">%</option>
                    </select>
                    <NumericInput
                      value={String(discount || '')}
                      onChange={(v) => setDiscount(parseFloat(v) || 0)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* حساب السعر */}
              {originalPrice > 0 && (
                <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator size={20} className="text-blue-500" />
                    <span className="font-medium">حساب السعر</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>السعر الأصلي:</span>
                      <span>{originalPrice} {selectedCurrency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>التحويل (1 {selectedCurrency} = {exchangeRate} أوقية):</span>
                      <span>{formatCurrencyMRU(priceInMRU)} أوقية</span>
                    </div>
                    <div className="flex justify-between">
                      <span>العمولة ({(commissionRate * 100).toFixed(0)}%):</span>
                      <span>{formatCurrencyMRU(commission)} أوقية</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>الخصم ({discountType === 'percentage' ? `${discount}%` : `${discount} أوقية`}):</span>
                        <span>-{formatCurrencyMRU(discountAmount)} أوقية</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>السعر النهائي:</span>
                      <span className="text-green-600">{formatCurrencyMRU(finalPrice)} أوقية</span>
                    </div>
                  </div>
                </Card>
              )}

              {/* ملاحظات */}
              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات إضافية</label>
                <textarea
                  placeholder="أي ملاحظات خاصة بالطلب..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* الخطوة 4: المراجعة */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">مراعة الطلب</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* معلومات العميل */}
                <Card>
                  <CardHeader className="pb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <User size={16} />
                      معلومات العميل
                    </h4>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>الاسم:</strong> {selectedCustomer?.name || newCustomer.name}</div>
                    <div><strong>الهاتف:</strong> {selectedCustomer?.phone || newCustomer.phone}</div>
                    {(selectedCustomer?.email || newCustomer.email) && (
                      <div><strong>البريد:</strong> {selectedCustomer?.email || newCustomer.email}</div>
                    )}
                  </CardContent>
                </Card>

                {/* معلومات المتجر */}
                <Card>
                  <CardHeader className="pb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <StoreIcon size={16} />
                      معلومات المتجر
                    </h4>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>المتجر:</strong> {selectedStore?.name}</div>
                    <div><strong>البلد:</strong> {selectedStore?.country}</div>
                    <div><strong>العملة:</strong> {selectedStore?.currency}</div>
                  </CardContent>
                </Card>
              </div>

              {/* تفاصيل المنتجات */}
              <Card>
                <CardHeader className="pb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <LinkIcon size={16} />
                    المنتجات
                  </h4>
                </CardHeader>
                <CardContent>
                  {productLinks.filter(link => link.url.trim()).map((link, index) => (
                    <div key={index} className="border-b last:border-b-0 pb-2 mb-2 last:mb-0">
                      <div className="text-sm text-blue-600 break-words">{link.url}</div>
                      <div className="text-sm text-gray-600">الكمية: {link.quantity}</div>
                      {link.notes && <div className="text-sm text-gray-500">ملاحظة: {link.notes}</div>}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* ملخص السعر */}
              <Card>
                <CardHeader className="pb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <DollarSign size={16} />
                    ملخص السعر
                  </h4>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>السعر الأصلي:</span>
                    <span>{originalPrice} {selectedCurrency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>بعد التحويل:</span>
                    <span>{formatCurrencyMRU(priceInMRU)} أوقية</span>
                  </div>
                  <div className="flex justify-between">
                    <span>العمولة:</span>
                    <span>{formatCurrencyMRU(commission)} أوقية</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>الخصم ({discountType === 'percentage' ? `${discount}%` : `${discount} أوقية`}):</span>
                      <span>-{formatCurrencyMRU(discountAmount)} أوقية</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>السعر النائي:</span>
                    <span className="text-green-600">{formatCurrencyMRU(finalPrice)} أوقية</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* أزرار التنقل */}
        <div className="flex-shrink-0 modal-footer flex items-center justify-between p-4 sm:p-6 bg-gray-50 dark:bg-gray-900">
          <Button
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStep === 1}
            className="arabic-safe"
          >
            السابق
          </Button>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={onClose} className="arabic-safe">
              إلغاء
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={goToNextStep}
                disabled={!isStepValid(currentStep)}
                className="arabic-safe"
              >
                التالي
              </Button>
            ) : (
              <Button
                onClick={createOrder}
                disabled={!isStepValid(4)}
                className="bg-green-600 hover:bg-green-700 arabic-safe"
              >
                إنشاء الطلب
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewOrderModal;
