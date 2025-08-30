import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Plus, Eye, Edit, Printer, Share2,
  Package, Truck, MapPin, Calendar, DollarSign,
  CheckCircle, Clock, AlertCircle, ShoppingCart,
  Users, Store, Link, Hash, Weight, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { eventBus } from '@/lib/eventBus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumericInput from '@/components/NumericInput';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useSettings } from '@/contexts/SettingsContext';
import NewOrderModal from '@/components/NewOrderModal';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import WeightModal from '@/components/WeightModal';
import { generateInvoiceHTML } from '@/utils/invoiceTemplate';
import { getInvoices } from '@/utils/invoiceStorage';
import { formatCurrencyMRU, formatDate as fmtDate, formatNumberEN } from '@/utils/format';

// أنواع البيانات والواجهات
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  orderCount: number;
}

export interface Store {
  id: string;
  name: string;
  country: string;
  currency: string;
  baseUrl?: string;
}

// أنواع الشحن
export type ShippingType = 'normal' | 'express';

// إعدادات الشحن
export interface ShippingSettings {
  weightPricePerKg: number; // سعر الكيلو الواحد
  normalShippingFromDubai: number; // سعر الشحن العادي من دبي
  expressShippingFromDubai: number; // سعر الشحن السريع من دبي
  localDeliveryPrice: number; // سعر التوصيل داخل نواكشوط
}

// بيانات الشحنة
export interface Shipment {
  id: string;
  name: string;
  origin: string; // مصدر الشحنة (دبي، الصين، إلخ)
  destination: string;
  totalWeight: number;
  availableWeight: number; // الوزن المتاح
  shippingType: ShippingType;
  pricePerKg: number;
  arrivalDate?: Date;
  status: 'pending' | 'in_transit' | 'arrived' | 'distributed';
  trackingNumber?: string;
  notes?: string;
}

// بيانات ساب الوزن والشحن
export interface WeightCalculation {
  weight: number;
  shippingType: ShippingType;
  weightCost: number; // تكلفة الوزن
  shippingCost: number; // تكلفة الشحن من المصدر
  localDeliveryCost: number; // تكلفة التوصيل المحلي
  totalShippingCost: number; // إجمالي تكلفة الشحن
  shipmentId?: string; // معرف الشحنة المرتبطة
}

export type OrderStatus = 
  | 'new'            // جديد/قيد الإدخال
  | 'partially_paid' // مدفوع جزئياً
  | 'paid'           // مدفوع بالكامل
  | 'ordered'        // تم الطب من المتجر
  | 'shipped'        // مشحون/رقم تتبع مضاف
  | 'linked'         // مرتبط بشحنة
  | 'arrived'        // وصل إلى المخزن
  | 'weight_paid'    // مدفو الوزن
  | 'in_delivery'    // في التوصيل
  | 'delivered';     // تم التسليم

export interface ProductLink {
  url: string;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderId: number; // رقم الطلب التلقائي
  customer: Customer;
  store: Store;
  productLinks: ProductLink[];
  productCount: number;
  originalPrice: number;
  originalCurrency: string;
  finalPrice: number; // الس��ر النهائي بعد التحول + العمولة + الخصم
  commission: number;
  discount: number; // مبلغ الخصم الفعلي بعد التحويل للأوقية
  discountType?: 'percentage' | 'fixed'; // نوع الخصم
  discountValue?: number; // قيمة لخصم الأصلية (قبل لتحويل)
  status: OrderStatus;
  trackingNumber?: string; // للتوافق مع النسخة السابقة
  trackingNumbers?: string[]; // أرقام التتبع المتعددة
  internationalShippingNumbers?: string[]; // أرقام الشحن الدولي المتعددة
  weight?: number;
  storageLocation?: string;
  createdAt: Date;
  updatedAt: Date;
  images?: string[];
  notes?: string;
  shipmentId?: string; // ربط بالشحنة
  invoiceSent?: boolean; // هل تم إرسال الفاتورة
  // بيانا الوزن والشحن
  weightCalculation?: WeightCalculation;
  // بيانت الدفع
  paymentAmount?: number; // المبلغ المستلم فعلياً
  paymentMethod?: 'cash' | 'bank_transfer' | 'mobile_money' | 'card' | 'other'; // وسيلة الدفع
  paymentReceipt?: string; // صورة الإيصال
  paymentDate?: Date; // تاريخ استلام الدفع
  paymentNotes?: string; // ملاحظات إضافية عن الدفع
}

// أ��وا وأيقونات الحالات
export const ORDER_STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<any>;
}> = {
  new: {
    label: 'جديد',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: Clock
  },
  partially_paid: {
    label: 'مدفوع جزئياً',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: AlertCircle
  },
  paid: {
    label: 'مدفوع بالكامل',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    icon: CheckCircle
  },
  ordered: {
    label: 'تم الطلب',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    icon: ShoppingCart
  },
  shipped: {
    label: 'مشحون',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    icon: Truck
  },
  linked: {
    label: 'مرتبط بشحنة',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
    icon: Package
  },
  arrived: {
    label: 'وصل للمخزن',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 border-teal-200',
    icon: MapPin
  },
  weight_paid: {
    label: 'مدفوع الوزن',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    icon: Weight
  },
  in_delivery: {
    label: 'في التوصيل',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: Truck
  },
  delivered: {
    label: 'تم التسليم',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 border-gray-200',
    icon: CheckCircle
  }
};

// إعدادات الشحن الافتراضية
export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  weightPricePerKg: 1000, // 1000 أوقية للكيلو الواحد (سيتم تحديدها من الإعدادات)
  normalShippingFromDubai: 280, // 280 أوقية للشحن العادي من دبي
  expressShippingFromDubai: 450, // 450 أوقية للشحن السريع من دبي
  localDeliveryPrice: 500, // 500 أوقية للتوصيل داخل نواكشوط
};

// شحنات وهمية للتجربة
const mockShipments: Shipment[] = [
  {
    id: 'SH001',
    name: 'شحنة دبي #001',
    origin: 'دبي',
    destination: 'نواكش��ط',
    totalWeight: 50,
    availableWeight: 25.5,
    shippingType: 'normal',
    pricePerKg: DEFAULT_SHIPPING_SETTINGS.weightPricePerKg,
    status: 'arrived',
    trackingNumber: 'DXB2024001',
    notes: 'شحنة من مجموعة متنوعة من المتاجر'
  },
  {
    id: 'SH002',
    name: 'شحنة دبي السريعة #002',
    origin: 'دبي',
    destination: 'نواكشو',
    totalWeight: 30,
    availableWeight: 12.3,
    shippingType: 'express',
    pricePerKg: DEFAULT_SHIPPING_SETTINGS.weightPricePerKg,
    status: 'in_transit',
    trackingNumber: 'DXB2024002',
    arrivalDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // بعد 3 أيام
    notes: 'شحنة سريعة للطلبات العاجلة'
  }
];

// بيانات وهمية للجربة
const mockOrders: Order[] = [
  {
    id: '1',
    orderId: 1001,
    customer: {
      id: 'c1',
      name: 'أحمد محمد',
      phone: '+222 12345678',
      orderCount: 5
    },
    store: {
      id: 's1',
      name: 'أمازون الولايات المتحدة',
      country: 'USA',
      currency: 'USD'
    },
    productLinks: [
      { url: 'https://amazon.com/product1', quantity: 2, notes: 'لون أزرق' },
      { url: 'https://amazon.com/product2', quantity: 1, notes: 'مقاس كبير' }
    ],
    productCount: 3,
    originalPrice: 150,
    originalCurrency: 'USD',
    finalPrice: 65000,
    commission: 5000,
    discount: 0,
    status: 'arrived',
    weight: 2.5,
    storageLocation: 'الدرج A-15',
    trackingNumber: 'US123456789',
    shipmentId: 'SH001',
    weightCalculation: {
      weight: 2.5,
      shippingType: 'normal',
      weightCost: 2500, // 2.5 × 1000
      shippingCost: 280, // شحن عادي من دبي
      localDeliveryCost: 500, // توصيل نواكشوط
      totalShippingCost: 3280, // الإجمالي
      shipmentId: 'SH001'
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-16')
  },
  {
    id: '2',
    orderId: 1002,
    customer: {
      id: 'c2',
      name: 'فاطمة أحمد',
      phone: '+222 87654321',
      orderCount: 2
    },
    store: {
      id: 's2',
      name: 'علي إكسبريس',
      country: 'China',
      currency: 'USD'
    },
    productLinks: [
      { url: 'https://aliexpress.com/item1', quantity: 1 }
    ],
    productCount: 1,
    originalPrice: 25,
    originalCurrency: 'USD',
    finalPrice: 12000,
    commission: 2000,
    discount: 1000,
    status: 'shipped',
    trackingNumber: 'LP123456789CN',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18')
  },
  {
    id: '3',
    orderId: 1003,
    customer: {
      id: 'c3',
      name: 'أحمد الأمي',
      phone: '+222 55443322',
      orderCount: 8
    },
    store: {
      id: 's3',
      name: 'إيباي الولايات المتحدة',
      country: 'USA',
      currency: 'USD'
    },
    productLinks: [
      { url: 'https://ebay.com/item1', quantity: 1, notes: 'مستعمل بحالة جيدة' },
      { url: 'https://ebay.com/item2', quantity: 2 },
      { url: 'https://ebay.com/item3', quantity: 1, notes: 'مع الصندوق الأصلي' }
    ],
    productCount: 4,
    originalPrice: 280,
    originalCurrency: 'USD',
    finalPrice: 125000,
    commission: 12000,
    discount: 5000,
    status: 'delivered',
    weight: 5.2,
    storageLocation: 'تم التسليم',
    trackingNumber: 'US987654321',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '4',
    orderId: 1004,
    customer: {
      id: 'c4',
      name: 'عايشة بنت محمد',
      phone: '+222 77889900',
      orderCount: 1
    },
    store: {
      id: 's1',
      name: 'أمازون الولايات المتحدة',
      country: 'USA',
      currency: 'USD'
    },
    productLinks: [
      { url: 'https://amazon.com/cosmetics1', quantity: 3, notes: 'مستحضرات تجميل' }
    ],
    productCount: 3,
    originalPrice: 85,
    originalCurrency: 'USD',
    finalPrice: 38000,
    commission: 3500,
    discount: 2000,
    status: 'new',
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-01-22')
  },
  {
    id: '5',
    orderId: 1005,
    customer: {
      id: 'c5',
      name: 'عبد الرحمن ولد أحمد',
      phone: '+222 33221100',
      orderCount: 12
    },
    store: {
      id: 's4',
      name: 'نيوآيغ',
      country: 'USA',
      currency: 'USD'
    },
    productLinks: [
      { url: 'https://newegg.com/laptop1', quantity: 1, notes: 'لابتوب جيمنغ' }
    ],
    productCount: 1,
    originalPrice: 1200,
    originalCurrency: 'USD',
    finalPrice: 525000,
    commission: 45000,
    discount: 0,
    status: 'in_delivery',
    weight: 3.8,
    storageLocation: 'خارج منطقة التوصيل',
    trackingNumber: 'US555777999',
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-21')
  },
  {
    id: '6',
    orderId: 1006,
    customer: {
      id: 'c6',
      name: 'مريم بنت الطالب',
      phone: '+222 99887766',
      orderCount: 3
    },
    store: {
      id: 's2',
      name: 'علي إكسبريس',
      country: 'China',
      currency: 'USD'
    },
    productLinks: [
      { url: 'https://aliexpress.com/clothes1', quantity: 2, notes: 'فستان صيفي' },
      { url: 'https://aliexpress.com/shoes1', quantity: 1, notes: 'حذاء رياضي' }
    ],
    productCount: 3,
    originalPrice: 45,
    originalCurrency: 'USD',
    finalPrice: 22000,
    commission: 2500,
    discount: 1500,
    status: 'linked',
    trackingNumber: 'LP987654321CN',
    shipmentId: 'SH001',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-19')
  },
  {
    id: '7',
    orderId: 1007,
    customer: {
      id: 'c7',
      name: 'خديجة بنت سالم',
      phone: '+222 44556677',
      orderCount: 4
    },
    store: {
      id: 's1',
      name: 'أمازون الولايات المتحدة',
      country: 'USA',
      currency: 'USD'
    },
    productLinks: [
      { url: 'https://amazon.com/electronics1', quantity: 1, notes: 'جهاز إلكتروني' }
    ],
    productCount: 1,
    originalPrice: 200,
    originalCurrency: 'USD',
    finalPrice: 85000,
    commission: 8000,
    discount: 3000,
    status: 'partially_paid',
    paymentAmount: 50000, // دفع جزئي - نصف المبلغ
    paymentMethod: 'bank_transfer',
    paymentDate: new Date('2024-01-20'),
    paymentNotes: 'دفعة أولى - باقي المبلغ عند الوصول',
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '8',
    orderId: 1008,
    customer: {
      id: 'c8',
      name: 'محمد ولد أحمد الشيخ',
      phone: '+222 66778899',
      orderCount: 6
    },
    store: {
      id: 's1',
      name: 'أمازون الولايات المتحدة',
      country: 'USA',
      currency: 'USD'
    },
    productLinks: [
      { url: 'https://amazon.com/laptop1', quantity: 1, notes: 'لابتوب للعمل' }
    ],
    productCount: 1,
    originalPrice: 800,
    originalCurrency: 'USD',
    finalPrice: 350000,
    commission: 30000,
    discount: 10000,
    status: 'arrived', // وصل للمخزن لكن مدفوع جزئياً
    weight: 2.8,
    storageLocation: 'الدرج B-12',
    trackingNumber: 'US777888999',
    shipmentId: 'SH002',
    weightCalculation: {
      weight: 2.8,
      shippingType: 'express',
      weightCost: 2800, // 2.8 × 1000
      shippingCost: 450, // شحن سريع من دبي
      localDeliveryCost: 500, // توصيل نوكشوط
      totalShippingCost: 3750, // الإجمالي
      shipmentId: 'SH002'
    },
    paymentAmount: 200000, // دفع جزئي - أقل من المطلوب
    paymentMethod: 'cash',
    paymentDate: new Date('2024-01-15'),
    paymentNotes: 'دفعة أولى نقداً - الباقي عند التسليم',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-22')
  }
];

const Orders: React.FC = () => {
  const { settings } = useSettings();
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  useEffect(() => {
    const off = eventBus.on('settings.currencies.changed', () => {
      try {
        if (!confirm('تم تعديل أسعار الصرف. هل تريد إعادة تسعير العروض المفتوحة الآن؟')) return;
        setOrders(prev => prev.map(o => {
          if (o.status === 'paid' || o.status === 'delivered' || o.status === 'arrived') return o;
          // naive recalculation: convert originalPrice from originalCurrency to MRU using settings.currencies.rates
          const rate = (settings.currencies.rates as any)[o.originalCurrency] || 1;
          const converted = Math.round(o.originalPrice * rate);
          // recompute commission with policies
          const policies = settings.ordersInvoices.commissionPolicies || [];
          const now = new Date();
          const active = policies.find(p => (!p.storeId || p.storeId === o.store.id) && (!p.effectiveFrom || new Date(p.effectiveFrom) <= now) && (!p.effectiveTo || new Date(p.effectiveTo) >= now));
          const commission = active ? (active.type === 'percentage' ? Math.round((active.value / 100) * converted) : Math.round(active.value)) : Math.round((settings.ordersInvoices.defaultCommissionPercent / 100) * converted);
          const discount = o.discountType === 'percentage' ? Math.round((o.discountValue || 0) / 100 * converted) : (o.discountValue || 0);
          const final = converted - commission - discount;
          return { ...o, finalPrice: final, commission, discount };
        }));
        alert('تمت إعادة تسعير العروض المفتوحة.');
      } catch (e) { console.error(e); }
    });
    return () => off();
  }, [settings]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>(mockOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [trackingFilter, setTrackingFilter] = useState<'all' | 'tracked' | 'untracked'>('all');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });

  // فلاتر ذكية للمخزن
  const [warehouseFilter, setWarehouseFilter] = useState<'all' | 'arrived' | 'weighed' | 'stored'>('all');
  const [weightRange, setWeightRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [arrivalDateFilter, setArrivalDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const [sortBy, setSortBy] = useState<'date' | 'price' | 'status' | 'id' | 'weight' | 'arrival'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showQuickFilters, setShowQuickFilters] = useState(false); // إخفاء الفلاتر السريعة افتراضياً
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightModalOrder, setWeightModalOrder] = useState<Order | null>(null);

  // Printed invoices map by orderId
  const [printedMap, setPrintedMap] = useState<Record<number, any[]>>({});
  useEffect(() => {
    try {
      const invs: any[] = getInvoices();
      const printed = (invs || []).filter(i => i && i.printed);
      const map: Record<number, any[]> = {};
      printed.forEach(i => {
        if (i.orderNumber) {
          const key = Number(i.orderNumber);
          if (!map[key]) map[key] = [];
          map[key].push(i);
        }
      });
      setPrintedMap(map);
    } catch {}
  }, []);

  // التبديل اتلائي لعرض ابطاقات على الشاشات الصغير
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && viewMode === 'table') {
        setViewMode('cards');
      }
    };

    handleResize(); // تشغيل عند التحميل
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // دالة مساعدة لتحديد ما إذا كان الطلب مدفوع جزئياً
  const isPartiallyPaid = (order: Order): boolean => {
    return !!(order.paymentAmount && order.paymentAmount > 0 && order.paymentAmount < order.finalPrice);
  };

  // تطبيق الفلاتر والترتيب مع الترتيب حسب اأحدث أولاً كفتراضي
  const sortedOrders = React.useMemo(() => {
    let filtered = [...orders];

    // فلتر البحث
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderId.toString().includes(searchTerm) ||
        order.customer.name.includes(searchTerm) ||
        order.customer.phone.includes(searchTerm) ||
        order.trackingNumber?.includes(searchTerm) ||
        order.store.name.includes(searchTerm)
      );
    }

    // فلتر الحالة مع مراعاة الطلبات المدفوع جزئياً
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => {
        // إذا كان الفلتر للطلبات المدفوعة جزئياً، نتحقق م�� لمبلغ المفوع
        if (statusFilter === 'partially_paid') {
          return isPartiallyPaid(order);
        }
        // للحالات الأخرى، نتحقق من الحالة المعتادة مع استثناء الطلبات المدفوعة جزئيا
        return order.status === statusFilter && !isPartiallyPaid(order);
      });
    }

    // فلتر المتجر
    if (storeFilter !== 'all') {
      filtered = filtered.filter(order => order.store.id === storeFilter);
    }

    // فلر لتتبع
    if (trackingFilter === 'tracked') {
      filtered = filtered.filter(order => order.trackingNumber);
    } else if (trackingFilter === 'untracked') {
      filtered = filtered.filter(order => !order.trackingNumber);
    }

    // فلتر التاريخ
    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch (dateFilter) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(order => order.createdAt >= cutoffDate);
    }

    // فلتر النطاق السعري
    if (priceRange.min) {
      const minPrice = parseFloat(priceRange.min) * 100; // تحوي إلى أوقية
      filtered = filtered.filter(order => order.finalPrice >= minPrice);
    }
    if (priceRange.max) {
      const maxPrice = parseFloat(priceRange.max) * 100; // تحويل إلى أوقية
      filtered = filtered.filter(order => order.finalPrice <= maxPrice);
    }

    // فلاتر ذكية للمخزن
    if (warehouseFilter === 'arrived') {
      filtered = filtered.filter(order => order.status === 'arrived' || order.status === 'weight_paid' || order.status === 'in_delivery' || order.status === 'delivered');
    } else if (warehouseFilter === 'weighed') {
      filtered = filtered.filter(order => order.weight && order.weight > 0);
    } else if (warehouseFilter === 'stored') {
      filtered = filtered.filter(order => order.storageLocation && order.storageLocation.trim() !== '');
    }

    // ملاظة: تم حذف فلتر إخفاء الطلبات المدفوعة جزئياً

    // فلتر نطاق الوزن
    if (weightRange.min) {
      const minWeight = parseFloat(weightRange.min);
      filtered = filtered.filter(order => order.weight && order.weight >= minWeight);
    }
    if (weightRange.max) {
      const maxWeight = parseFloat(weightRange.max);
      filtered = filtered.filter(order => order.weight && order.weight <= maxWeight);
    }

    // فلتر تاريخ الوصول
    if (arrivalDateFilter !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch (arrivalDateFilter) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(order => {
        // فلترة الطلبات التي صل الخزن في ال��ترة المحددة
        if (order.status === 'arrived' || order.status === 'weight_paid' || order.status === 'in_delivery' || order.status === 'delivered') {
          return order.updatedAt >= cutoffDate;
        }
        return false;
      });
    }

    // ترتيب النتائج مع التركيز على الترتيب الزمني (الأحدث أولاً) كافتراضي
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = b.createdAt.getTime() - a.createdAt.getTime(); // الأحدث أولاً (تنازلي افتراضي)
          break;
        case 'price':
          comparison = a.finalPrice - b.finalPrice;
          break;
        case 'id':
          comparison = b.orderId - a.orderId; // الأرقام الأكبر أولاً (الأحدث)
          break;
        case 'weight':
          const weightA = a.weight || 0;
          const weightB = b.weight || 0;
          comparison = weightA - weightB;
          break;
        case 'arrival':
          // ترتيب حسب تاريخ الوصول (فقط للطلبات التي وصلت المخزن)
          const isArrivedA = ['arrived', 'weight_paid', 'in_delivery', 'delivered'].includes(a.status);
          const isArrivedB = ['arrived', 'weight_paid', 'in_delivery', 'delivered'].includes(b.status);

          if (isArrivedA && isArrivedB) {
            comparison = b.updatedAt.getTime() - a.updatedAt.getTime();
          } else if (isArrivedA && !isArrivedB) {
            comparison = -1; // الطلبات التي وصلت أولاً
          } else if (!isArrivedA && isArrivedB) {
            comparison = 1;
          } else {
            comparison = b.createdAt.getTime() - a.createdAt.getTime();
          }
          break;
        case 'status':
          const statusOrder = ['new', 'paid', 'ordered', 'shipped', 'linked', 'arrived', 'weight_paid', 'in_delivery', 'delivered'];
          comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
          break;
      }

      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return filtered;
  }, [orders, searchTerm, statusFilter, storeFilter, trackingFilter, dateFilter, priceRange, warehouseFilter, weightRange, arrivalDateFilter, sortBy, sortOrder]);

  // تحديث القائمة المفلترة
  useEffect(() => {
    setFilteredOrders(sortedOrders);
  }, [sortedOrders]);

  // الحصول على قائمة المتاجر المتاحة
  const availableStores = Array.from(new Set(orders.map(order => order.store.id)))
    .map(storeId => orders.find(order => order.store.id === storeId)?.store)
    .filter(Boolean);

  // إضافة طلب جديد
  const handleOrderCreated = (newOrder: Order) => {
    setOrders(prevOrders => [newOrder, ...prevOrders]);
  };

  // فتح تفاصيل الطلب
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  // تعديل الطلب
  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
    // يمكن إضافة منطق إضافي هنا لفتح نافذة في وضع التعديل
  };

  // طباعة الطلب
  const handlePrintOrder = (order: Order) => {
    const invoiceData = {
      orderNumber: order.orderId,
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      storeName: order.store.name,
      products: order.productLinks,
      originalPrice: order.originalPrice,
      originalCurrency: order.originalCurrency,
      finalPrice: order.finalPrice,
      commission: order.commission,
      discount: order.discount,
      date: formatDate(new Date()),
      qrCode: `FC-${order.orderId}-${Date.now()}`
    };

    const isQuote = order.status === 'new';

    const invoiceWindow = window.open('', '_blank');
    if (invoiceWindow) {
      invoiceWindow.document.write(generateInvoiceHTML(invoiceData, isQuote));
      invoiceWindow.document.close();
    }
  };

  // مشاركة الطلب
  const handleShareOrder = async (order: Order) => {
    const shareData = {
      title: `طلب رقم #${order.orderId} - Fast Command`,
      text: `طلب ${order.customer.name} بقيمة ${formatPrice(order.finalPrice)}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Error sharing:', error);
        // fallback to copy link
        try {
          await navigator.clipboard.writeText(window.location.href);
          alert('ت نسخ الرابط بنجاح!');
        } catch (clipboardError) {
          console.error('Failed to copy link:', clipboardError);
        }
      }
    } else {
      // fallback to copy link
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('تم نسخ الرابط بنجاح!');
      } catch (error) {
        console.error('Failed to copy link:', error);
      }
    }
  };

  // تحديث طلب موجود
  const handleOrderUpdated = (updatedOrder: Order) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );
    setSelectedOrder(updatedOrder);
    try { eventBus.emit('order.updated', updatedOrder); } catch (e) { console.error(e); }
  };

  // فتح نموذج حساب الوزن
  const handleWeightCalculation = (order: Order) => {
    setWeightModalOrder(order);
    setShowWeightModal(true);
  };

  // تحديث الطلب بعد حساب الوزن
  const handleWeightUpdated = (updatedOrder: Order) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );
    setWeightModalOrder(null);
    try { eventBus.emit('order.updated', updatedOrder); } catch (e) { console.error(e); }
  };

  // حساب الطلبات بدون رقم تتبع

  // مكون محسّن لرض الحالة مع الأخذ في الاعتبار الدفع لزئي
  const StatusBadge: React.FC<{ order: Order }> = ({ order }) => {
    // إعطاء أووية لحالة الدفع الجزئي
    const effectiveStatus = isPartiallyPaid(order) ? 'partially_paid' : order.status;
    const config = ORDER_STATUS_CONFIG[effectiveStatus];
    const Icon = config.icon;

    return (
      <Badge className={cn(
        'flex items-center gap-1 px-2 py-1 text-xs font-medium border arabic-safe',
        config.color,
        config.bgColor
      )}>
        <Icon size={12} />
        {config.label}
      </Badge>
    );
  };

  const ordersWithoutTracking = orders.filter(o => !o.trackingNumber);

  // حساب الطلبات حسب فئات الخزن
  const arrivedOrders = orders.filter(o => ['arrived', 'weight_paid', 'in_delivery', 'delivered'].includes(o.status));
  const weighedOrders = orders.filter(o => o.weight && o.weight > 0);
  const storedOrders = orders.filter(o => o.storageLocation && o.storageLocation.trim() !== '');


  // فلاتر سريعة
  const quickFilters = [
    { key: 'all', label: 'الكل', count: orders.length },
    { key: 'untracked', label: 'بدون تتبع', count: ordersWithoutTracking.length, isAlert: true },
    { key: 'partially_paid', label: 'مدفوع جزئياً', count: orders.filter(o => isPartiallyPaid(o)).length, isPartiallyPaid: true },
    { key: 'warehouse-arrived', label: 'وصلت المخزن', count: arrivedOrders.length, isWarehouse: true },
    { key: 'warehouse-weighed', label: 'بوزن محدد', count: weighedOrders.length, isWarehouse: true },
    { key: 'warehouse-stored', label: 'مخزنة', count: storedOrders.length, isWarehouse: true },
    { key: 'new', label: 'جديد', count: orders.filter(o => o.status === 'new').length },
    { key: 'paid', label: 'مدفوع', count: orders.filter(o => o.status === 'paid').length },
    { key: 'shipped', label: 'مشحون', count: orders.filter(o => o.status === 'shipped').length },
    { key: 'delivered', label: 'مسلم', count: orders.filter(o => o.status === 'delivered').length },
  ];

  const formatPrice = (price: number) => formatCurrencyMRU(price);
  const formatDate = (date: Date) => fmtDate(date);

  const OrderCard: React.FC<{ order: Order }> = ({ order }) => (
    <Card className={cn(
      "w-full bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] touch-manipulation",
      !order.trackingNumber
        ? "border-l-4 border-l-red-500 border-t border-r border-b border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10"
        : "border border-gray-200 dark:border-gray-700"
    )}>
      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-t-lg p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash size={16} className="text-gray-500" />
            <span className="font-bold text-lg text-gray-900 dark:text-white">#{order.orderId}</span>
            {!order.trackingNumber && (
              <AlertCircle size={18} className="text-red-500 animate-pulse" title="الطلب بدون رقم تتبع" />
            )}
          </div>
          <StatusBadge order={order} />
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-2 numeric">
          <Calendar size={14} />
          {formatDate(order.createdAt)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {/* معلومات العميل */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Users size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white arabic-safe break-words no-text-break">{order.customer.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 numeric break-words">{order.customer.phone}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 arabic-safe">
              {order.customer.orderCount} طلب سابق
            </div>
          </div>
        </div>

        {/* معلومات المتجر */}
        <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <Store size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white arabic-safe break-words no-text-break">{order.store.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 arabic-safe break-words">{order.store.country}</div>
          </div>
        </div>

        {/* تفاصيل لمنتجات والروبط */}
        <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <Package size={18} className="text-purple-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-medium text-gray-900 dark:text-white arabic-safe break-words emergency-text-fix no-text-break">{order.productCount} منتج</span>
              <span className="text-sm text-gray-600 dark:text-gray-400 numeric break-words emergency-text-fix">
                {order.originalPrice} {order.originalCurrency}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                <Link size={12} />
                <span className="arabic-safe break-words emergency-text-fix">{order.productLinks.length} روابط</span>
              </div>
              {order.commission > 0 && (
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  <span className="arabic-safe break-words emergency-text-fix">عمولة: {formatPrice(order.commission)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* معلومات إضافية (الوزن ومكان التخين) */}
        {(order.weight || order.storageLocation) && (
          <div className="flex items-start gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
            <MapPin size={18} className="text-teal-500 mt-0.5" />
            <div className="flex-1">
              {order.weight && (
                <div className="text-sm text-gray-900 dark:text-white">
                  الوزن: {order.weight} كجم
                </div>
              )}
              {order.storageLocation && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  المكان: {order.storageLocation}
                </div>
              )}
            </div>
          </div>
        )}

        {/* السعر النهائي م تفاصيل */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 arabic-safe break-words emergency-text-fix">السعر النهائي:</span>
            <span className="font-bold text-xl text-green-600 dark:text-green-400 numeric break-words emergency-text-fix">
              {formatPrice(order.finalPrice)}
            </span>
          </div>
          {order.discount > 0 && (
            <div className="flex items-center justify-between mt-1 flex-wrap gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400 arabic-safe break-words emergency-text-fix">خصم مطبق:</span>
              <span className="text-xs font-medium text-red-500 numeric break-words emergency-text-fix">
                -{formatPrice(order.discount)}
              </span>
            </div>
          )}
        </div>

        {/* فواتير مطبوعة مرتبطة بهذا الطلب */}
        {printedMap[order.orderId] && printedMap[order.orderId].length > 0 && (
          <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-xs text-green-700 dark:text-green-300 arabic-safe mb-1">فواتير مطبوعة</div>
            <div className="text-sm text-green-800 dark:text-green-200 arabic-safe">
              {printedMap[order.orderId].map((inv: any) => `#${inv.invoiceNumber}`).join('، ')}
            </div>
          </div>
        )}

        {/* حالة الفاتورة */}
        {order.invoiceSent && order.status !== 'new' && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs text-green-700 dark:text-green-300 mb-1 arabic-safe break-words emergency-text-fix">تم الإرسال:</div>
              <span className="text-sm font-medium text-green-600 dark:text-green-400 arabic-safe break-words emergency-text-fix">
                تم إرسال الفاتورة
              </span>
            </div>
          </div>
        )}

        {/* رقم التتبع */}
        {order.trackingNumber ? (
          <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
            <Truck size={16} className="text-orange-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs text-orange-700 dark:text-orange-300 mb-1 arabic-safe break-words emergency-text-fix">رقم التتبع:</div>
              <span className="text-sm font-mono font-medium text-gray-900 dark:text-white numeric break-words emergency-text-fix">
                {order.trackingNumber}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 flex-wrap">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-red-700 dark:text-red-300 mb-1 arabic-safe break-words emergency-text-fix">تنبيه:</div>
              <span className="text-sm font-medium text-red-600 dark:text-red-400 arabic-safe break-words emergency-text-fix">
                الطلب بدون رقم تتبع
              </span>
            </div>
            <Badge variant="destructive" className="text-xs arabic-safe break-words emergency-text-fix flex-shrink-0">
              يتطلب إدخال رقم تتبع
            </Badge>
          </div>
        )}

        {/* الأزرار */}
        <div className="pt-3 space-y-2">
          {/* زر حساب الوزن - يظهر للطلبات التي وصلت المخزن */}
          {['arrived', 'weight_paid', 'in_delivery', 'delivered'].includes(order.status) && (
            <Button
              size="sm"
              variant={order.weightCalculation ? "default" : "outline"}
              className={cn(
                "w-full flex items-center justify-center gap-2 h-11 touch-manipulation transition-colors emergency-text-fix",
                order.weightCalculation
                  ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                  : "hover:bg-orange-50 hover:border-orange-300 text-orange-600 border-orange-200"
              )}
              onClick={() => handleWeightCalculation(order)}
              title={order.weightCalculation ? "تعيل حساب الوزن والشن" : "حساب الوزن والشحن"}
            >
              <Weight size={18} className="flex-shrink-0" />
              <span className="text-sm font-medium arabic-safe break-words emergency-text-fix">
                {order.weightCalculation ? "تعديل الوزن" : "حساب الوزن"}
              </span>
            </Button>
          )}

          {/* عض تفاصيل حساب الوزن إذ كان موجوداً */}
          {order.weightCalculation && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-xs text-green-700 mb-2 arabic-safe">تفصيل الشحن:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="arabic-safe">الوزن:</span>
                  <span className="font-medium">{order.weightCalculation.weight} كجم</span>
                </div>
                <div className="flex justify-between">
                  <span className="arabic-safe">تكلفة الوزن:</span>
                  <span className="font-medium">{formatCurrencyMRU(order.weightCalculation.weightCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="arabic-safe">الشحن:</span>
                  <span className="font-medium">
                    {order.weightCalculation.shippingType === 'express' ? 'سريع' : 'عادي'}
                    ({formatCurrencyMRU(order.weightCalculation.shippingCost)} أوقية)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="arabic-safe">التوصيل:</span>
                  <span className="font-medium">{formatCurrencyMRU(order.weightCalculation.localDeliveryCost)}</span>
                </div>
                <div className="border-t border-green-300 pt-1 flex justify-between font-medium">
                  <span className="arabic-safe">الإجمالي:</span>
                  <span className="text-green-600">{formatCurrencyMRU(order.weightCalculation.totalShippingCost)}</span>
                </div>
              </div>
            </div>
          )}

          {/* زر عرض التفاصيل */}
          <Button
            size="sm"
            variant="outline"
            className="w-full flex items-center justify-center gap-2 h-11 touch-manipulation hover:bg-blue-50 hover:border-blue-300 transition-colors emergency-text-fix"
            onClick={() => handleViewOrder(order)}
            title="عرض تفاصيل الطلب الكاملة"
          >
            <Eye size={18} className="flex-shrink-0" />
            <span className="text-sm font-medium arabic-safe break-words emergency-text-fix">عرض تفاصيل الطلب</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* رأس الصفحة */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white arabic-safe no-text-break">
              إدارة الطلبات
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 arabic-safe no-text-break">
              إدار جميع طلبات العملاء ومتابعة حالتها
            </p>
          </div>
          
          <Button
            onClick={() => setShowAddOrderModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto h-12 sm:h-10 arabic-safe no-text-break"
          >
            <Plus size={20} />
            طلب جديد
          </Button>
        </div>

        {/* تنبيه: طلبات دون رقم تتبع */}
        {settings.notifications.missingTracking && ordersWithoutTracking.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200 arabic-safe">
                  تنبيه: طلبات بدون رقم تتبع
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1 arabic-safe">
                  ديك {ordersWithoutTracking.length} طلب{ordersWithoutTracking.length > 1 ? 'ات' : ''} د��ن رقم تتبع. يرجى إضافة أرقام التبع لمتابعة حالة الشحن.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTrackingFilter('untracked');
                  setStatusFilter('all');
                }}
                className="border-red-300 text-red-700 hover:bg-red-100 arabic-safe"
              >
                عرض الطلبات
              </Button>
            </div>
          </div>
        )}

        {/* زر إظهار/إ��اء الفلاتر السريعة */}
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => setShowQuickFilters(!showQuickFilters)}
            className="flex items-center gap-2 arabic-safe"
          >
            <Filter size={16} />
            {showQuickFilters ? 'إخفاء الفلتر السريعة' : 'إظهار الفلاتر السريعة'}
            <Badge variant="secondary" className="text-xs">
              {quickFilters.reduce((acc, filter) => acc + filter.count, 0)}
            </Badge>
          </Button>
        </div>

        {/* فلاتر سريعة - مخفية افتراضياً */}
        {showQuickFilters && (
          <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
            {quickFilters.map((filter) => (
              <Button
                key={filter.key}
                variant={
                  (filter.key === 'untracked' && trackingFilter === 'untracked') ||
                  (filter.key === 'partially_paid' && statusFilter === 'partially_paid') ||
                  (filter.key.startsWith('warehouse-') && warehouseFilter === filter.key.replace('warehouse-', '')) ||
                  (filter.key !== 'untracked' && filter.key !== 'partially_paid' && !filter.key.startsWith('warehouse-') && statusFilter === filter.key)
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => {
                  if (filter.key === 'untracked') {
                    setTrackingFilter('untracked');
                    setStatusFilter('all');
                    setWarehouseFilter('all');
                  } else if (filter.key === 'partially_paid') {
                    setStatusFilter('partially_paid');
                    setTrackingFilter('all');
                    setWarehouseFilter('all');
                  } else if (filter.key.startsWith('warehouse-')) {
                    const warehouseType = filter.key.replace('warehouse-', '') as 'arrived' | 'weighed' | 'stored';
                    setWarehouseFilter(warehouseType);
                    setStatusFilter('all');
                    setTrackingFilter('all');
                  } else {
                    setStatusFilter(filter.key as any);
                    setTrackingFilter('all');
                    setWarehouseFilter('all');
                  }
                }}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap min-h-[40px] px-4",
                  filter.isAlert && filter.count > 0 && "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100",
                  filter.isWarehouse && "border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100",
                  filter.isPartiallyPaid && "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                )}
              >
                {filter.isAlert && filter.count > 0 && (
                  <AlertCircle size={16} className="text-orange-500" />
                )}
                {filter.isWarehouse && (
                  <Package size={16} className="text-teal-500" />
                )}
                {filter.isPartiallyPaid && (
                  <DollarSign size={16} className="text-yellow-500" />
                )}
                {filter.label}
                <Badge
                  variant={filter.isAlert && filter.count > 0 ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {filter.count}
                </Badge>
              </Button>
            ))}

            {/* زر مسح جميع الفلاتر السريعة */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setTrackingFilter('all');
                setWarehouseFilter('all');
              }}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 arabic-safe"
            >
              <X size={16} />
              مسح الفلاتر
            </Button>
          </div>
        )}

        {/* أدوات البحث والفلترة */}
        <Card className="mb-6">
          <CardContent className="p-4 space-y-4">
            {/* الصف الأول - البحث والفلاتر الأساسية */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* البحث */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="بحث برقم الطلب، اسم العميل، رقم التتبع..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* فلتر الحالة */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">جميع الحالات</option>
                {Object.entries(ORDER_STATUS_CONFIG).map(([status, config]) => (
                  <option key={status} value={status}>
                    {config.label}
                  </option>
                ))}
              </select>

              {/* نمط العرض - مخفي على الهواتف لأن البطاقات هي الأفضل */}
              <div className="hidden lg:flex border border-gray-300 rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('cards')}
                  className={cn(
                    'flex-1 px-3 py-2 text-sm transition-colors',
                    viewMode === 'cards'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  بطاقات
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'flex-1 px-3 py-2 text-sm transition-colors',
                    viewMode === 'table'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  جدول
                </button>
              </div>
            </div>

            {/* زر الفلاتر المتقدمة */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2"
              >
                <Filter size={16} />
                فلاتر ��تقدمة
                {showAdvancedFilters ? '▲' : '↓'}
              </Button>

              {/* خيارات الترتيب */}
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 arabic-safe"
                >
                  <option value="date">التاريخ</option>
                  <option value="id">رقم الطلب</option>
                  <option value="price">السعر</option>
                  <option value="status">الحالة</option>
                  <option value="weight">الوزن</option>
                  <option value="arrival">تاريخ الوصول</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>

            {/* لفلاتر امتقدمة */}
            {showAdvancedFilters && (
              <div className="border-t pt-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* فلتر التاريخ */}
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">جميع التواريخ</option>
                    <option value="week">آخر أسبوع</option>
                    <option value="month">آخر شهر</option>
                    <option value="year">آخر سنة</option>
                  </select>

                  {/* فلتر لمتجر */}
                  <select
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">جميع المتاجر</option>
                    {availableStores.map((store) => (
                      <option key={store!.id} value={store!.id}>
                        {store!.name}
                      </option>
                    ))}
                  </select>

                  {/* فلتر التتبع */}
                  <select
                    value={trackingFilter}
                    onChange={(e) => setTrackingFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">جميع الطلبات</option>
                    <option value="tracked">مع رم تتبع</option>
                    <option value="untracked">بدون رقم تتبع</option>
                  </select>

                  {/* فلتر المخن */}
                  <select
                    value={warehouseFilter}
                    onChange={(e) => setWarehouseFilter(e.target.value as any)}
                    className="px-3 py-2 border border-teal-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50 arabic-safe"
                  >
                    <option value="all">جميع المخازن</option>
                    <option value="arrived">وصلت المخزن</option>
                    <option value="weighed">بوزن محدد</option>
                    <option value="stored">مخزنة</option>
                  </select>

                  {/* مسح الفاتر */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setStoreFilter('all');
                      setTrackingFilter('all');
                      setDateFilter('all');
                      setPriceRange({ min: '', max: '' });
                      setWarehouseFilter('all');
                      setWeightRange({ min: '', max: '' });
                      setArrivalDateFilter('all');
                    }}
                    className="flex items-center gap-2 arabic-safe"
                  >
                    <X size={16} />
                    مسح جميع الفلاتر
                  </Button>
                </div>

                {/* فلاتر امخزن المتقدمة */}
                <div className="mt-4 bg-teal-50 p-4 rounded-lg border border-teal-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Package size={16} className="text-teal-600" />
                    <h4 className="font-medium text-teal-800 arabic-safe">فلتر ذكية ��لمخزن</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* فلتر تاريخ الوصول */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 arabic-safe">
                        تاريخ الوصول:
                      </label>
                      <select
                        value={arrivalDateFilter}
                        onChange={(e) => setArrivalDateFilter(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 arabic-safe"
                      >
                        <option value="all">جميع التواريخ</option>
                        <option value="today">وصلت اليوم</option>
                        <option value="week">آخر أسبوع</option>
                        <option value="month">آخر شهر</option>
                      </select>
                    </div>

                    {/* نطاق الوزن */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 arabic-safe">
                        نطاق الوزن (جم):
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        <NumericInput
                          value={String(weightRange.min || '')}
                          onChange={(v) => setWeightRange({ ...weightRange, min: v })}
                          className="text-center text-xs"
                        />
                        <NumericInput
                          value={String(weightRange.max || '')}
                          onChange={(v) => setWeightRange({ ...weightRange, max: v })}
                          className="text-center text-xs"
                        />
                      </div>
                    </div>

                    {/* إحصائيات المخزن */}
                    <div className="bg-white rounded-lg p-3 border border-teal-200">
                      <div className="text-xs text-gray-600 mb-2 arabic-safe">إحصايات المخزن:</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="arabic-safe">وصلت:</span>
                          <span className="font-medium text-teal-600">{arrivedOrders.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="arabic-safe">مزونة:</span>
                          <span className="font-medium text-blue-600">{weighedOrders.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="arabic-safe">مخزنة:</span>
                          <span className="font-medium text-green-600">{storedOrders.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* فلتر النطاق السعر */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    النطا السعري (أوقي)
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-w-md">
                    <NumericInput
                      value={String(priceRange.min || '')}
                      onChange={(v) => setPriceRange({ ...priceRange, min: v })}
                    />
                    <NumericInput
                      value={String(priceRange.max || '')}
                      onChange={(v) => setPriceRange({ ...priceRange, max: v })}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* عرض النتائج */}
        <div className="mb-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span className="arabic-safe">
            عرض {sortedOrders.length} من أصل {orders.length} طلب
          </span>
          {settings.notifications.missingTracking && ordersWithoutTracking.length > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400 arabic-safe">
              <AlertCircle size={14} />
              {ordersWithoutTracking.length} بدون رقم تتبع
            </span>
          )}
        </div>

        {/* عرض الطلبات */}
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {sortedOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          // عرض الجدول للسطح المتب
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-safe">
                      رقم الطلب
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-safe">
                      الميل
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-safe">
                      المتجر
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-safe">
                      المنتجات
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-safe">
                      السعر الألي
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-safe">
                      السعر النهائي
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-safe">
                      الوزن واشحن
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-safe">
                      احالة
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-safe">
                      رقم التتبع
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-safe">
                      التاريخ
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-safe">
                      الإجراءا
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className={cn(
                        "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                        !order.trackingNumber && "bg-red-50/50 dark:bg-red-900/10 border-l-4 border-l-red-500"
                      )}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Hash size={16} className="text-gray-400 ml-1" />
                          <span className="font-bold text-sm">#{order.orderId}</span>
                          {!order.trackingNumber && (
                            <AlertCircle size={14} className="text-red-500 mr-1 animate-pulse" title="الطلب بدن رقم تتبع" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {order.customer.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.customer.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {order.store.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.store.country}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package size={16} className="text-purple-500 ml-1" />
                          <span className="text-sm font-medium">{order.productCount}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.productLinks.length} روابطط
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">
                          {order.originalPrice} {order.originalCurrency}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-green-600">
                          {formatPrice(order.finalPrice)}
                        </div>
                        {order.discount > 0 && (
                          <div className="text-xs text-red-500">
                            خصم: {formatPrice(order.discount)}
                          </div>
                        )}
                        {order.invoiceSent && order.status !== 'new' && (
                          <div className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle size={12} />
                            فاتورة مرسلة
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {order.weightCalculation ? (
                          <div className="text-xs space-y-1">
                            <div className="flex items-center gap-1">
                              <Weight size={12} className="text-green-500" />
                              <span className="font-medium">{order.weightCalculation.weight} كجم</span>
                            </div>
                            <div className="text-green-600 font-medium">
                              {formatPrice(order.weightCalculation.totalShippingCost)}
                            </div>
                            <div className="text-gray-500">
                              {order.weightCalculation.shippingType === 'express' ? 'سريع' : 'عادي'}
                            </div>
                          </div>
                        ) : (
                          ['arrived', 'weight_paid', 'in_delivery', 'delivered'].includes(order.status) ? (
                            <div className="text-xs text-orange-600 text-center">
                              <Weight size={12} className="mx-auto mb-1" />
                              <div>غير محسوب</div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 text-center">-</div>
                          )
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge order={order} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {order.trackingNumber ? (
                          <div className="flex items-center">
                            <Truck size={16} className="text-orange-500 ml-1" />
                            <span className="text-sm font-mono">
                              {order.trackingNumber}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertCircle size={16} className="text-red-500" />
                            <Badge variant="destructive" className="text-xs arabic-safe">
                              بدون تتبع
                            </Badge>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewOrder(order)}
                            title="عرض تفصيل الطلب"
                          >
                            <Eye size={16} />
                          </Button>
                          {/* زر حساب الوزن للطلبات التي وصلت المخزن */}
                          {['arrived', 'weight_paid', 'in_delivery', 'delivered'].includes(order.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className={cn(
                                "h-8 w-8 p-0",
                                order.weightCalculation ? "text-green-600" : "text-orange-600"
                              )}
                              onClick={() => handleWeightCalculation(order)}
                              title={order.weightCalculation ? "تعديل حساب الوزن" : "حساب الوزن والشحن"}
                            >
                              <Weight size={16} />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditOrder(order)}
                            title="تعديل اطلب"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handlePrintOrder(order)}
                            title={order.status === 'new' ? 'طباعة عرض سعر' : 'طباعة فترة'}
                          >
                            <Printer size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleShareOrder(order)}
                            title="مشاركة الطلب"
                          >
                            <Share2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* سالة عدم وجود نتائج */}
        {sortedOrders.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                لا توجد طلبات
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                لم يتم العثر على أي طلبات تطابق البحث أو الفلاتر ��حددة.
              </p>
            </CardContent>
          </Card>
        )}

        {/* نافذة إضافة طلب جدي */}
        <NewOrderModal
          isOpen={showAddOrderModal}
          onClose={() => setShowAddOrderModal(false)}
          onOrderCreated={handleOrderCreated}
        />

        {/* نافذة تفاصيل اطلب */}
        <OrderDetailsModal
          isOpen={showOrderDetails}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onOrderUpdated={handleOrderUpdated}
        />

        {/* نافذة حساب الوزن والشحن */}
        {weightModalOrder && (
          <WeightModal
            isOpen={showWeightModal}
            onClose={() => {
              setShowWeightModal(false);
              setWeightModalOrder(null);
            }}
            order={weightModalOrder}
            onWeightUpdated={handleWeightUpdated}
            shipments={mockShipments}
            shippingSettings={DEFAULT_SHIPPING_SETTINGS}
          />
        )}
      </div>
    </div>
  );
};

export default Orders;
