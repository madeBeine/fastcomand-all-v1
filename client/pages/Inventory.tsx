import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Filter, Plus, Eye, Edit, Printer, Share2,
  Package, Truck, MapPin, Calendar, DollarSign,
  CheckCircle, Clock, AlertCircle, ShoppingCart,
  Users, Store, Link, Hash, Weight, X, Archive,
  Grid3x3, Copy, FileText, CheckSquare, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import NumericInput from '@/components/NumericInput';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { useSettings } from '@/contexts/SettingsContext';
import { eventBus } from '@/lib/eventBus';
import { formatCurrencyMRU, formatDate as fmtDate } from '@/utils/format';

// إعادة استخدام الواجهات من صفحة الطلبات
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
}

export type OrderStatus = 
  | 'new'
  | 'partially_paid'
  | 'paid'
  | 'ordered'
  | 'shipped'
  | 'linked'
  | 'arrived'
  | 'weight_paid'
  | 'in_delivery'
  | 'delivered';

// واجهات جديدة لنظام المخزن
export type WarehouseStatus = 
  | 'pending_storage'    // في انتظار التخزين
  | 'stored'            // مخزن
  | 'ready_delivery'    // جاهز للتسليم
  | 'delivered';        // تم التسليم

export interface Drawer {
  id: string;
  code: string; // مثل A1, B2, C3
  section: string; // القسم الرئيسي A, B, C
  position: number; // الرقم 1, 2, 3
  status: 'empty' | 'occupied' | 'partial';
  capacity: number; // عدد الطلبات القصوى
  currentCount: number; // عدد الطلبات الحالية
  orders: string[]; // معرفات الطلبات
}

export interface WarehouseOrder {
  id: string;
  orderId: number;
  customer: Customer;
  store: Store;
  originalPrice: number;
  finalPrice: number;
  weight: number; // الوزن المحدد عند الفرز
  status: OrderStatus;
  warehouseStatus: WarehouseStatus;
  drawerCode?: string; // رمز الدرج
  drawerId?: string; // معرف الدرج
  storedAt?: Date; // تاريخ التخزين
  deliveredAt?: Date; // تاريخ التسليم
  notes?: string;
  trackingNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

// إعدادات الأدراج
const DRAWER_SECTIONS = ['A', 'B', 'C', 'D', 'E'];
const DRAWER_POSITIONS_PER_SECTION = 12;
const DRAWER_CAPACITY = 3; // عدد الطلبات القصوى لكل درج

// إنشاء الأدراج الافتراضية
const generateDrawers = (): Drawer[] => {
  const drawers: Drawer[] = [];
  
  DRAWER_SECTIONS.forEach(section => {
    for (let position = 1; position <= DRAWER_POSITIONS_PER_SECTION; position++) {
      drawers.push({
        id: `${section}${position}`,
        code: `${section}${position}`,
        section,
        position,
        status: 'empty',
        capacity: DRAWER_CAPACITY,
        currentCount: 0,
        orders: []
      });
    }
  });
  
  return drawers;
};

// بيانات وهمية للطلبات المخزنية
const mockWarehouseOrders: WarehouseOrder[] = [
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
    originalPrice: 150,
    finalPrice: 65000,
    weight: 2.5,
    status: 'arrived',
    warehouseStatus: 'stored',
    drawerCode: 'A1',
    drawerId: 'A1',
    storedAt: new Date('2024-01-16'),
    trackingNumber: 'US123456789',
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
    originalPrice: 25,
    finalPrice: 12000,
    weight: 1.2,
    status: 'arrived',
    warehouseStatus: 'pending_storage',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18')
  },
  {
    id: '3',
    orderId: 1003,
    customer: {
      id: 'c3',
      name: 'محمد الأمين',
      phone: '+222 55443322',
      orderCount: 8
    },
    store: {
      id: 's3',
      name: 'إيباي الولايات المتحدة',
      country: 'USA',
      currency: 'USD'
    },
    originalPrice: 280,
    finalPrice: 125000,
    weight: 5.2,
    status: 'weight_paid',
    warehouseStatus: 'ready_delivery',
    drawerCode: 'B3',
    drawerId: 'B3',
    storedAt: new Date('2024-01-12'),
    trackingNumber: 'US987654321',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-20')
  }
];

// ألوان وأيقونات حالات المخزن
const WAREHOUSE_STATUS_CONFIG: Record<WarehouseStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<any>;
}> = {
  pending_storage: {
    label: 'في انتظار التخزين',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    icon: Clock
  },
  stored: {
    label: 'مخزن',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    icon: Archive
  },
  ready_delivery: {
    label: 'جاهز للتسليم',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: Package
  },
  delivered: {
    label: 'تم ا��تسليم',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 border-gray-200',
    icon: CheckCircle
  }
};

const Inventory: React.FC = () => {
  const { settings } = useSettings();
  const [orders, setOrders] = useState<WarehouseOrder[]>(mockWarehouseOrders);

  useEffect(() => {
    const off = eventBus.on('order.updated', (updated: any) => {
      setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
    });
    return () => off();
  }, []);
  const [drawers, setDrawers] = useState<Drawer[]>(generateDrawers());
  const [filteredOrders, setFilteredOrders] = useState<WarehouseOrder[]>(mockWarehouseOrders);
  
  // فلاتر البحث
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WarehouseStatus | 'all'>('all');
  const [drawerFilter, setDrawerFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  
  // الن��افذ المنبثقة
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showDrawerModal, setShowDrawerModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WarehouseOrder | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // قفل التمرير عند فتح النوافذ
  useLockBodyScroll(showStoreModal || showDeliveryModal || showDrawerModal);

  // تحديث حالة الأدراج بناءً على الطلبات
  useEffect(() => {
    const updatedDrawers = drawers.map(drawer => {
      const drawerOrders = orders.filter(order => order.drawerId === drawer.id && order.warehouseStatus === 'stored');
      const currentCount = drawerOrders.length;
      
      let status: 'empty' | 'occupied' | 'partial' = 'empty';
      if (currentCount >= drawer.capacity) {
        status = 'occupied';
      } else if (currentCount > 0) {
        status = 'partial';
      }
      
      return {
        ...drawer,
        currentCount,
        status,
        orders: drawerOrders.map(o => o.id)
      };
    });
    
    setDrawers(updatedDrawers);
  }, [orders]);

  // تطبيق الفلاتر
  const filteredResults = useMemo(() => {
    let filtered = [...orders];

    // فلتر البحث
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderId.toString().includes(searchLower) ||
        order.customer.name.toLowerCase().includes(searchLower) ||
        order.customer.phone.includes(searchLower) ||
        (order.drawerCode && order.drawerCode.toLowerCase().includes(searchLower)) ||
        (order.trackingNumber && order.trackingNumber.toLowerCase().includes(searchLower))
      );
    }

    // فلتر الحالة
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.warehouseStatus === statusFilter);
    }

    // فلتر الدرج
    if (drawerFilter !== 'all') {
      filtered = filtered.filter(order => order.drawerCode === drawerFilter);
    }

    // فلتر القسم
    if (sectionFilter !== 'all') {
      filtered = filtered.filter(order => order.drawerCode && order.drawerCode.startsWith(sectionFilter));
    }

    return filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [orders, searchTerm, statusFilter, drawerFilter, sectionFilter]);

  useEffect(() => {
    setFilteredOrders(filteredResults);
  }, [filteredResults]);

  // اقتراح درج فارغ ذكي
  const suggestDrawer = (): Drawer | null => {
    // البحث عن ��رج فارغ أولاً
    const emptyDrawers = drawers.filter(d => d.status === 'empty');
    if (emptyDrawers.length > 0) {
      return emptyDrawers[0];
    }
    
    // ��لبحث عن درج جزئي
    const partialDrawers = drawers.filter(d => d.status === 'partial');
    if (partialDrawers.length > 0) {
      return partialDrawers[0];
    }
    
    return null;
  };

  // خزين طلب في درج
  const handleStoreOrder = (orderId: string, drawerId: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        const drawer = drawers.find(d => d.id === drawerId);
        return {
          ...order,
          warehouseStatus: 'stored' as WarehouseStatus,
          drawerId,
          drawerCode: drawer?.code,
          storedAt: new Date(),
          updatedAt: new Date()
        };
      }
      return order;
    }));
  };

  // تسليم طلب من المخزن
  const handleDeliverOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          warehouseStatus: 'delivered' as WarehouseStatus,
          status: 'delivered' as OrderStatus,
          deliveredAt: new Date(),
          updatedAt: new Date(),
          drawerId: undefined,
          drawerCode: undefined
        };
      }
      return order;
    }));
  };

  // فتح نافذة تخزين الطل
  const handleOpenStoreModal = (order: WarehouseOrder) => {
    setSelectedOrder(order);
    setShowStoreModal(true);
  };

  // فتح نافذة تسليم الطلب
  const handleOpenDeliveryModal = (order: WarehouseOrder) => {
    setSelectedOrder(order);
    setShowDeliveryModal(true);
  };

  // توليد وصل التسليم
  const generateDeliveryReceipt = (order: WarehouseOrder) => {
    const receiptData = {
      orderNumber: order.orderId,
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      weight: order.weight,
      drawerCode: order.drawerCode,
      deliveryDate: formatDate(new Date()),
      finalPrice: order.finalPrice
    };

    const receiptHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>وصل تسليم - طلب #${receiptData.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: white; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .content { margin: 20px 0; }
          .row { display: flex; justify-content: space-between; margin: 10px 0; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>وصل تسليم</h1>
          <h2>${settings.general.businessName} - نظام إدارة الطلبات</h2>
        </div>
        <div class="content">
          <div class="row"><strong>رقم الطلب:</strong> <span>#${receiptData.orderNumber}</span></div>
          <div class="row"><strong>اسم العميل:</strong> <span>${receiptData.customerName}</span></div>
          <div class="row"><strong>رقم الهاتف:</strong> <span>${receiptData.customerPhone}</span></div>
          <div class="row"><strong>الوزن:</strong> <span>${receiptData.weight} كجم</span></div>
          <div class="row"><strong>مكان التخزين:</strong> <span>الدرج ${receiptData.drawerCode}</span></div>
          <div class="row"><strong>تاريخ التسليم:</strong> <span>${receiptData.deliveryDate}</span></div>
          <div class="row"><strong>القيمة الإجمالية:</strong> <span>${formatPrice(receiptData.finalPrice)}</span></div>
        </div>
        <div class="footer">
          <p>تم إنشاء هذا الوصل تلقائياً من نظام Fast Command</p>
          <p>التاريخ: ${formatDate(new Date())}</p>
        </div>
      </body>
      </html>
    `;

    const receiptWindow = window.open('', '_blank');
    if (receiptWindow) {
      receiptWindow.document.write(receiptHTML);
      receiptWindow.document.close();
    }
  };

  const formatPrice = (price: number) => formatCurrencyMRU(price);
  const formatDate = (date: Date) => fmtDate(date);

  // مكون عرض حالة المخزن
  const WarehouseStatusBadge: React.FC<{ status: WarehouseStatus }> = ({ status }) => {
    const config = WAREHOUSE_STATUS_CONFIG[status];
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

  // بطاقة الطلب
  const OrderCard: React.FC<{ order: WarehouseOrder }> = ({ order }) => (
    <Card className={cn(
      "w-full bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] touch-manipulation",
      order.warehouseStatus === 'pending_storage' 
        ? "border-l-4 border-l-orange-500 border-t border-r border-b border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/10"
        : "border border-gray-200 dark:border-gray-700"
    )}>
      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-t-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash size={16} className="text-gray-500" />
            <span className="font-bold text-lg text-gray-900 dark:text-white numeric">#{order.orderId}</span>
            {order.warehouseStatus === 'pending_storage' && (
              <AlertCircle size={18} className="text-orange-500 animate-pulse" aria-label="في انتظار التخزين" />
            )}
          </div>
          <WarehouseStatusBadge status={order.warehouseStatus} />
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-2 numeric">
          <Calendar size={14} />
          {formatDate(order.updatedAt)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {/* معلومات الميل */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Users size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white arabic-safe break-words">{order.customer.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 numeric break-words">{order.customer.phone}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 arabic-safe">
              {order.customer.orderCount} طلب سابق
            </div>
          </div>
        </div>

        {/* معل��مات المتجر */}
        <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <Store size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white arabic-safe break-words">{order.store.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 arabic-safe">{order.store.country}</div>
          </div>
        </div>

        {/* معلومات الوزن والموقع */}
        <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <Weight size={18} className="text-purple-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-white numeric">{order.weight} كجم</span>
              {order.drawerCode && (
                <Badge variant="outline" className="text-sm arabic-safe">
                  <MapPin size={12} className="mr-1" />
                  الدرج {order.drawerCode}
                </Badge>
              )}
            </div>
            {order.storedAt && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 arabic-safe">
                مخزن منذ: {formatDate(order.storedAt)}
              </div>
            )}
          </div>
        </div>

        {/* السعر النهائي */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 arabic-safe">السعر النهائي:</span>
            <span className="font-bold text-xl text-green-600 dark:text-green-400 numeric">
              {formatPrice(order.finalPrice)}
            </span>
          </div>
        </div>

        {/* رقم التتبع */}
        {order.trackingNumber && (
          <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
            <Truck size={16} className="text-orange-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs text-orange-700 dark:text-orange-300 mb-1 arabic-safe">رقم التتبع:</div>
              <span className="text-sm font-mono font-medium text-gray-900 dark:text-white numeric">
                {order.trackingNumber}
              </span>
            </div>
          </div>
        )}

        {/* الأزرار */}
        <div className="pt-3 space-y-2">
          {order.warehouseStatus === 'pending_storage' && (
            <Button
              size="sm"
              className="w-full flex items-center justify-center gap-2 h-11 bg-orange-600 hover:bg-orange-700"
              onClick={() => handleOpenStoreModal(order)}
            >
              <Archive size={18} />
              <span className="text-sm font-medium arabic-safe">تخزين في درج</span>
            </Button>
          )}

          {order.warehouseStatus === 'stored' && (
            <Button
              size="sm"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 h-11 hover:bg-blue-50"
              onClick={() => handleOpenDeliveryModal(order)}
            >
              <Package size={18} />
              <span className="text-sm font-medium arabic-safe">جاهز للتسليم</span>
            </Button>
          )}

          {order.warehouseStatus === 'ready_delivery' && (
            <Button
              size="sm"
              className="w-full flex items-center justify-center gap-2 h-11 bg-blue-600 hover:bg-blue-700"
              onClick={() => handleOpenDeliveryModal(order)}
            >
              <CheckCircle size={18} />
              <span className="text-sm font-medium arabic-safe">تسليم الطلب</span>
            </Button>
          )}

          {order.warehouseStatus === 'delivered' && (
            <Button
              size="sm"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 h-11 bg-green-50 border-green-200"
              onClick={() => generateDeliveryReceipt(order)}
            >
              <FileText size={18} />
              <span className="text-sm font-medium arabic-safe">طاعة وصل التسليم</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // إحصائيات سريعة
  const stats = {
    pendingStorage: orders.filter(o => o.warehouseStatus === 'pending_storage').length,
    stored: orders.filter(o => o.warehouseStatus === 'stored').length,
    readyDelivery: orders.filter(o => o.warehouseStatus === 'ready_delivery').length,
    delivered: orders.filter(o => o.warehouseStatus === 'delivered').length,
    emptyDrawers: drawers.filter(d => d.status === 'empty').length,
    occupiedDrawers: drawers.filter(d => d.status === 'occupied').length
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* رأس الصفحة */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white arabic-safe">
              إدارة المخزن الذكي
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 arabic-safe">
              نظام ذكي لتخزين وإدارة الطلبات في الأدراج مع التسليم الآلي
            </p>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setShowSettings(true)}
              className="w-full sm:w-auto h-12 sm:h-10 arabic-safe"
              title="إعدادات المخزن"
            >
              <Settings size={18} />
              إعدادات
            </Button>
            <Button
              onClick={() => setShowDrawerModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto h-12 sm:h-10 arabic-safe"
            >
              <Grid3x3 size={20} />
              عرض خريطة الأدراج
            </Button>
          </div>
        </div>

        <Sheet open={showSettings} onOpenChange={setShowSettings}>
          <SheetContent side="right" className="w-full sm:max-w-2xl max-h-screen overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Settings size={18} />
                إعدادات المخزن
              </SheetTitle>
            </SheetHeader>
            <InventorySettingsPanel onClose={() => setShowSettings(false)} />
          </SheetContent>
        </Sheet>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 numeric">{stats.pendingStorage}</div>
              <div className="text-xs text-orange-700 arabic-safe">في انتظار التخزين</div>
            </div>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 numeric">{stats.stored}</div>
              <div className="text-xs text-green-700 arabic-safe">مخزن</div>
            </div>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 numeric">{stats.readyDelivery}</div>
              <div className="text-xs text-blue-700 arabic-safe">جاهز للتسليم</div>
            </div>
          </Card>
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600 numeric">{stats.delivered}</div>
              <div className="text-xs text-gray-700 arabic-safe">تم التسليم</div>
            </div>
          </Card>
          <Card className="p-4 bg-teal-50 border-teal-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600 numeric">{stats.emptyDrawers}</div>
              <div className="text-xs text-teal-700 arabic-safe">أدراج فارغة</div>
            </div>
          </Card>
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 numeric">{stats.occupiedDrawers}</div>
              <div className="text-xs text-red-700 arabic-safe">أدراج ممتلئة</div>
            </div>
          </Card>
        </div>

        {/* تنبيه الطلبا في انتظار التخزين */}
        {stats.pendingStorage > 0 && (
          <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-orange-500 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200 arabic-safe">
                  تنبيه: طلبات في انتظار التخزين
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1 arabic-safe">
                  لديك {stats.pendingStorage} طلب{stats.pendingStorage > 1 ? 'ات' : ''} في انتظار التخزين في الأدراج.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatusFilter('pending_storage')}
                className="border-orange-300 text-orange-700 hover:bg-orange-100 arabic-safe"
              >
                عرض الطلبات
              </Button>
            </div>
          </div>
        )}

        {/* تنبيه الأدراج الممتلئة تقريباً */}
        {drawers.some(d => (d.currentCount / Math.max(1, d.capacity)) * 100 >= settings.warehouse.fullAlertThresholdPercent) && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200 arabic-safe">تنبيه: أدراج قريبة من الامتلاء</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1 arabic-safe">
                  بعض الأدراج تجاوزت {settings.warehouse.fullAlertThresholdPercent}% من السعة. يرجى تفريغ الأدراج أو زيادة السعة من الإعدادات.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* أدوات البحث والفلترة */}
        <Card className="mb-6">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* البحث */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="بحث برقم الطب، اسم العميل، رقم الدرج..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* فلتر حالة المخزن */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as WarehouseStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 arabic-safe"
              >
                <option value="all">جميع الحالات</option>
                <option value="pending_storage">في انتظار التخزين</option>
                <option value="stored">مخزن</option>
                <option value="ready_delivery">جاهز للتسليم</option>
                <option value="delivered">تم السليم</option>
              </select>

              {/* فلتر القسم */}
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 arabic-safe"
              >
                <option value="all">جميع الأقسام</option>
                {DRAWER_SECTIONS.map(section => (
                  <option key={section} value={section}>القسم {section}</option>
                ))}
              </select>
            </div>

            {/* مسح الفلاتر */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDrawerFilter('all');
                  setSectionFilter('all');
                }}
                className="flex items-center gap-2 arabic-safe"
              >
                <X size={16} />
                مسح جميع الفلاتر
              </Button>
              
              <div className="text-sm text-gray-600 arabic-safe">
                عرض {filteredOrders.length} من {orders.length} طلب
              </div>
            </div>
          </CardContent>
        </Card>

        {/* عرض الطلبات */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>

        {/* رسالة عدم وجود نتائج */}
        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg arabic-safe">
              لا توجد طلبات تطابق معايير البحث
            </p>
          </div>
        )}
      </div>

      {/* نافذة تخزين الطلب */}
      {showStoreModal && selectedOrder && (
        <StoreOrderModal
          order={selectedOrder}
          drawers={drawers}
          suggestedDrawer={suggestDrawer()}
          onStore={handleStoreOrder}
          onClose={() => {
            setShowStoreModal(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* نافذة تسليم الطلب */}
      {showDeliveryModal && selectedOrder && (
        <DeliveryModal
          order={selectedOrder}
          onDeliver={(orderId) => {
            handleDeliverOrder(orderId);
            generateDeliveryReceipt(selectedOrder);
          }}
          onClose={() => {
            setShowDeliveryModal(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* نافذة خريطة الأراج */}
      {showDrawerModal && (
        <DrawerMapModal
          drawers={drawers}
          onClose={() => setShowDrawerModal(false)}
        />
      )}
    </div>
  );
};

// مكونات النوافذ المنبثقة
const StoreOrderModal: React.FC<{
  order: WarehouseOrder;
  drawers: Drawer[];
  suggestedDrawer: Drawer | null;
  onStore: (orderId: string, drawerId: string) => void;
  onClose: () => void;
}> = ({ order, drawers, suggestedDrawer, onStore, onClose }) => {
  const [selectedDrawerId, setSelectedDrawerId] = useState(suggestedDrawer?.id || '');

  const availableDrawers = drawers.filter(d => d.status !== 'occupied');

  const handleStore = () => {
    if (selectedDrawerId) {
      onStore(order.id, selectedDrawerId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 modal-overlay">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full mx-auto" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg arabic-safe">تخزين الطلب #{order.orderId}</h3>
          <Button variant="ghost" onClick={onClose}>إلاق</Button>
        </div>
        
        <div className="p-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800 arabic-safe mb-2">معلومات الطلب:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><strong>العميل:</strong> {order.customer.name}</div>
                <div><strong>الوزن:</strong> {order.weight} كجم</div>
              </div>
            </div>

            {suggestedDrawer && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-800 arabic-safe mb-2">الدرج المقترح:</div>
                <div className="font-medium text-green-900">الدرج {suggestedDrawer.code}</div>
                <div className="text-xs text-green-700">
                  ({suggestedDrawer.currentCount}/{suggestedDrawer.capacity} طلبات)
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">
                اختر الدرج:
              </label>
              <select
                value={selectedDrawerId}
                onChange={(e) => setSelectedDrawerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- اختر درج --</option>
                {availableDrawers.map(drawer => (
                  <option key={drawer.id} value={drawer.id}>
                    الدرج {drawer.code} ({drawer.currentCount}/{drawer.capacity})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button 
            onClick={handleStore} 
            disabled={!selectedDrawerId}
            className="bg-blue-600 hover:bg-blue-700"
          >
            تخزين الطلب
          </Button>
        </div>
      </div>
    </div>
  );
};

const DeliveryModal: React.FC<{
  order: WarehouseOrder;
  onDeliver: (orderId: string) => void;
  onClose: () => void;
}> = ({ order, onDeliver, onClose }) => {
  const handleDeliver = () => {
    onDeliver(order.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 modal-overlay">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg arabic-safe">تسليم الطلب</h3>
          <Button variant="ghost" onClick={onClose}>إغلاق</Button>
        </div>
        
        <div className="p-4">
          <div className="space-y-3">
            <div className="text-center">
              <Package size={48} className="text-blue-500 mx-auto mb-4" />
              <p className="text-gray-700 arabic-safe mb-2">هل أنت متأكد من تسليم هذا الطلب؟</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
              <div><strong>رقم الطلب:</strong> #{order.orderId}</div>
              <div><strong>العميل:</strong> {order.customer.name}</div>
              <div><strong>الهاتف:</strong> {order.customer.phone}</div>
              <div><strong>الموقع:</strong> الدرج {order.drawerCode}</div>
              <div><strong>الوزن:</strong> {order.weight} كجم</div>
            </div>
            
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm arabic-safe">
                ⚠️ سيتم إفراغ الدرج تلقائياً وطباعة وصل التسليم
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleDeliver} className="bg-green-600 hover:bg-green-700">
            تأكيد التسليم
          </Button>
        </div>
      </div>
    </div>
  );
};

const DrawerMapModal: React.FC<{
  drawers: Drawer[];
  onClose: () => void;
}> = ({ drawers, onClose }) => {
  const drawersBySection = drawers.reduce((acc, drawer) => {
    if (!acc[drawer.section]) {
      acc[drawer.section] = [];
    }
    acc[drawer.section].push(drawer);
    return acc;
  }, {} as Record<string, Drawer[]>);

  const getDrawerColor = (drawer: Drawer) => {
    switch (drawer.status) {
      case 'empty': return 'bg-green-100 border-green-300 text-green-800';
      case 'partial': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'occupied': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 modal-overlay">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-6xl w-full mx-auto" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg arabic-safe">خريطة الأدراج</h3>
          <Button variant="ghost" onClick={onClose}>إغلاق</Button>
        </div>
        
        <div className="p-4 overflow-y-auto" style={{ maxHeight: '80vh' }}>
          <div className="space-y-6">
            {/* مفتاح الألوان */}
            <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span className="text-sm arabic-safe">فارغ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span className="text-sm arabic-safe">جزي</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <span className="text-sm arabic-safe">ممتلئ</span>
              </div>
            </div>
            
            {/* الأدراج حسب القسم */}
            {DRAWER_SECTIONS.map(section => (
              <div key={section} className="space-y-3">
                <h4 className="font-medium text-lg arabic-safe">القسم {section}</h4>
                <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                  {drawersBySection[section]?.sort((a, b) => a.position - b.position).map(drawer => (
                    <div
                      key={drawer.id}
                      className={cn(
                        'p-2 rounded border text-center text-xs font-medium transition-colors',
                        getDrawerColor(drawer)
                      )}
                      title={`الدرج ${drawer.code}: ${drawer.currentCount}/${drawer.capacity} طلبات`}
                    >
                      <div className="font-bold">{drawer.code}</div>
                      <div className="text-xs">{drawer.currentCount}/{drawer.capacity}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t flex justify-end">
          <Button onClick={onClose}>إغلاق</Button>
        </div>
      </div>
    </div>
  );
};

const InventorySettingsPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { settings, update } = useSettings();
  const [categories, setCategories] = useState(settings.warehouse.categories || []);
  const [catForm, setCatForm] = useState<{ id: string; name: string; minStock: number }>({ id: '', name: '', minStock: 0 });
  const [conv, setConv] = useState<Record<string, number>>({ ...(settings.warehouse.conversions || {}) });
  const [pricing, setPricing] = useState({ ...(settings.warehouse.pricingInventory || { enablePurchasePrice: true, enableSalePrice: true, defaultMarginPercent: 10, showOutOfStock: true, showStockOnProductCard: true, allowNegativeStock: false }) });
  const [alerts, setAlerts] = useState({ ...(settings.warehouse.alerts || { lowStockEnabled: true, lowStockThreshold: 10, periodicReports: { enabled: false, frequency: 'weekly' as const } }) });

  useEffect(()=> setCategories(settings.warehouse.categories || []), [settings.warehouse.categories]);
  useEffect(()=> setConv({ ...(settings.warehouse.conversions || {}) }), [settings.warehouse.conversions]);

  const saveCategory = () => {
    if (!catForm.name.trim()) return;
    const id = catForm.id && catForm.id.trim()!=='' ? catForm.id : 'cat_' + Date.now();
    const item = { ...catForm, id, minStock: Math.max(0, Math.round(Number(catForm.minStock)||0)) };
    const next = categories.some(c=> c.id===id) ? categories.map(c=> c.id===id? item: c) : [item, ...categories];
    setCategories(next);
    update({ warehouse: { ...settings.warehouse, categories: next } });
    setCatForm({ id:'', name:'', minStock:0 });
  };
  const removeCategory = (id: string) => {
    const next = categories.filter(c=> c.id !== id);
    setCategories(next);
    update({ warehouse: { ...settings.warehouse, categories: next } });
  };

  const saveConversions = async () => {
    await update({ warehouse: { ...settings.warehouse, conversions: conv, unitsDefault: settings.warehouse.unitsDefault } });
  };
  const savePricing = async () => {
    await update({ warehouse: { ...settings.warehouse, pricingInventory: pricing } });
  };
  const saveAlerts = async () => {
    await update({ warehouse: { ...settings.warehouse, alerts } });
    onClose?.();
  };

  const unitKeys = Array.from(new Set([...(Object.keys(conv||{})), 'g','kg','unit']));

  return (
    <div className="mt-4">
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="flex gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto whitespace-nowrap sticky top-0 z-10">
          <TabsTrigger value="categories">إدارة الأصناف</TabsTrigger>
          <TabsTrigger value="pricing">الأسعار والمخزون</TabsTrigger>
          <TabsTrigger value="alerts">التنبيهات</TabsTrigger>
          <TabsTrigger value="units">الوحدات والمقاييس</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4">
          <Card><CardContent className="p-4 sm:p-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input placeholder="اسم الفئة" value={catForm.name} onChange={(e)=> setCatForm({ ...catForm, name: e.target.value })} />
              <Input type="number" placeholder="حد أدنى للتنبيه" value={catForm.minStock} onChange={(e)=> setCatForm({ ...catForm, minStock: parseInt(e.target.value)||0 })} />
              <Button onClick={saveCategory}>حفظ</Button>
              <Button variant="outline" onClick={()=> setCatForm({ id:'', name:'', minStock:0 })}>جديد</Button>
            </div>
            <div className="space-y-2">
              {categories.map(c=> (
                <div key={c.id} className="p-2 rounded border flex items-center justify-between text-sm">
                  <div>{c.name} • حد أدنى: {c.minStock}</div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={()=> setCatForm(c)}>تعديل</Button>
                    <Button size="sm" variant="destructive" onClick={()=> removeCategory(c.id)}>حذف</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <Card><CardContent className="p-4 sm:p-6 space-y-3">
            <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!pricing.enablePurchasePrice} onChange={(e)=> setPricing({ ...pricing, enablePurchasePrice: e.target.checked })} /> تفعيل سعر الشراء</label>
            <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!pricing.enableSalePrice} onChange={(e)=> setPricing({ ...pricing, enableSalePrice: e.target.checked })} /> تفعيل سعر البيع</label>
            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">هامش الربح الافتراضي (%)</label>
              <NumericInput value={String(pricing.defaultMarginPercent || 0)} onChange={(v)=> setPricing({ ...pricing, defaultMarginPercent: Math.max(0, Math.round(Number(v)||0)) })} />
            </div>
            <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!pricing.showOutOfStock} onChange={(e)=> setPricing({ ...pricing, showOutOfStock: e.target.checked })} /> عرض المنتجات غير المتوفرة</label>
            <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!pricing.showStockOnProductCard} onChange={(e)=> setPricing({ ...pricing, showStockOnProductCard: e.target.checked })} /> عرض الكمية في بطاقة المنتج</label>
            <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!pricing.allowNegativeStock} onChange={(e)=> setPricing({ ...pricing, allowNegativeStock: e.target.checked })} /> السماح بالمخزون السالب</label>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={()=> setPricing(settings.warehouse.pricingInventory || pricing)}>إلغاء</Button><Button className="bg-blue-600 hover:bg-blue-700" onClick={savePricing}>حفظ</Button></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <Card><CardContent className="p-4 sm:p-6 space-y-3">
            <label className="inline-flex items-center gap-2 text-sm arabic-safe"><input type="checkbox" checked={!!alerts.lowStockEnabled} onChange={(e)=> setAlerts({ ...alerts, lowStockEnabled: e.target.checked })} /> تفعيل تنبيهات انخفاض المخزون</label>
            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">حد التنبيه العام</label>
              <NumericInput value={String(alerts.lowStockThreshold || 0)} onChange={(v)=> setAlerts({ ...alerts, lowStockThreshold: Math.max(0, Math.round(Number(v)||0)) })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">تقارير دورية</label>
                <select value={alerts.periodicReports?.enabled ? 'enabled' : 'disabled'} onChange={(e)=> setAlerts({ ...alerts, periodicReports: { ...(alerts.periodicReports||{ frequency:'weekly', enabled:false }), enabled: e.target.value==='enabled' } })} className="w-full px-3 py-2 border rounded"><option value="disabled">معطلة</option><option value="enabled">مفعلة</option></select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">التكرار</label>
                <select value={alerts.periodicReports?.frequency || 'weekly'} onChange={(e)=> setAlerts({ ...alerts, periodicReports: { ...(alerts.periodicReports||{ enabled:false }), frequency: e.target.value as any } })} className="w-full px-3 py-2 border rounded"><option value="daily">يومي</option><option value="weekly">أسبوعي</option><option value="monthly">شهري</option></select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">بريد للتنبيهات</label>
                <Input value={alerts.email || ''} onChange={(e)=> setAlerts({ ...alerts, email: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end"><Button className="bg-blue-600 hover:bg-blue-700" onClick={saveAlerts}>حفظ الإعدادات</Button></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="units" className="mt-4">
          <Card><CardContent className="p-4 sm:p-6 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">الوحدة الافتراضية</label>
              <select value={settings.warehouse.unitsDefault || 'kg'} onChange={(e)=> update({ warehouse: { ...settings.warehouse, unitsDefault: e.target.value as any } })} className="w-full px-3 py-2 border rounded">
                {unitKeys.map(u=> (<option key={u} value={u}>{u}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium arabic-safe">تحويلات الوحدات (إلى g)</div>
                <Button size="sm" onClick={()=> setConv({ ...conv, unit: (conv as any).unit ?? 1 })}>إضافة</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.keys(conv).map(k=> (
                  <div key={k} className="p-3 rounded border">
                    <div className="text-sm font-medium">{k}</div>
                    <Input type="number" value={conv[k]} onChange={(e)=> setConv({ ...conv, [k]: parseFloat(e.target.value)||0 })} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={()=> setConv({ ...(settings.warehouse.conversions||{}) })}>إلغاء</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={saveConversions}>حفظ</Button>
              </div>
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Inventory;
