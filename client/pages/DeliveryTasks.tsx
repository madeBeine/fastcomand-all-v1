import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Filter, Plus, Eye, Edit, MapPin, Clock,
  CheckCircle, AlertCircle, User, Phone, Truck,
  Package, Calendar, DollarSign, Hash, X, Users,
  ClipboardList, FileText, RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { eventBus } from '@/lib/eventBus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumericInput from '@/components/NumericInput';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrencyMRU, formatDate as fmtDate } from '@/utils/format';

// Helpers available to all modal components in this file
const formatPrice = (price: number) => formatCurrencyMRU(price);
const formatDate = (date: Date) => fmtDate(date);

// واجهات البيانات
export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
}

export interface Courier {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  activeTasksCount: number;
}

export type DeliveryStatus = 
  | 'pending'       // بانتظار التوصيل
  | 'assigned'      // مسندة لموصل
  | 'in_progress'   // في الطريق
  | 'delivered'     // تم التسليم
  | 'failed';       // فشل التوصيل

export interface DeliveryTask {
  id: string;
  taskNumber: number;
  orderId: string;
  orderNumber: number;
  customer: Customer;
  deliveryAddress: string;
  deliveryCost: number;
  status: DeliveryStatus;
  courierId?: string;
  courierName?: string;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  deliveryReceipt?: string;
}

// ألوان وأيقونات الحالات
const DELIVERY_STATUS_CONFIG: Record<DeliveryStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<any>;
}> = {
  pending: {
    label: 'بانتظار التوصيل',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 border-gray-200',
    icon: Clock
  },
  assigned: {
    label: 'مسندة لموصل',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: User
  },
  in_progress: {
    label: 'في الطريق',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    icon: Truck
  },
  delivered: {
    label: 'تم التسليم',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    icon: CheckCircle
  },
  failed: {
    label: 'فشل التوصيل',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    icon: AlertCircle
  }
};

// موصلين وهميين للتجربة
const mockCouriers: Courier[] = [
  {
    id: 'courier1',
    name: 'محمد ولد أحمد',
    phone: '+222 11223344',
    isActive: true,
    activeTasksCount: 3
  },
  {
    id: 'courier2',
    name: 'أحمد ولد محمد',
    phone: '+222 22334455',
    isActive: true,
    activeTasksCount: 2
  },
  {
    id: 'courier3',
    name: 'عبد الله ولد سالم',
    phone: '+222 33445566',
    isActive: true,
    activeTasksCount: 1
  },
  {
    id: 'courier4',
    name: 'عثمان ولد الحسن',
    phone: '+222 44556677',
    isActive: false,
    activeTasksCount: 0
  }
];

// قائمة عملاء وهمية ��لاختيار عند إنشاء مهمة جديدة
const mockCustomers: Customer[] = [
  { id: 'c1', name: 'أحمد محمد', phone: '+222 12345678', address: 'حي عرفات، شارع الجمهورية' },
  { id: 'c2', name: 'فاطمة أحمد', phone: '+222 87654321', address: 'حي النصر، شارع المدينة' },
  { id: 'c3', name: 'محمد الأمين', phone: '+222 55443322', address: 'حي دار النعيم، شارع لاستقلال' },
  { id: 'c4', name: 'عائشة بنت محمد', phone: '+222 77889900', address: 'حي الرياض، شارع عبد الناصر' },
  { id: 'c5', name: 'عبد الرحمن ولد أحمد', phone: '+222 33221100', address: 'حي السلام، شارع الوحدة' },
];

// مهام وهمية للتجربة
const mockDeliveryTasks: DeliveryTask[] = [
  {
    id: 'task1',
    taskNumber: 2001,
    orderId: 'order1',
    orderNumber: 1001,
    customer: {
      id: 'c1',
      name: 'أحمد محمد',
      phone: '+222 12345678',
      address: 'حي عرفات، شارع الجمهورية'
    },
    deliveryAddress: 'حي عرفات، شارع الجمهورية، بجانب محطة الوقود',
    deliveryCost: 500,
    status: 'in_progress',
    courierId: 'courier1',
    courierName: 'محمد ولد أحمد',
    assignedAt: new Date('2024-01-20T09:00:00'),
    startedAt: new Date('2024-01-20T10:30:00'),
    createdAt: new Date('2024-01-20T08:00:00'),
    updatedAt: new Date('2024-01-20T10:30:00'),
    estimatedDeliveryTime: new Date('2024-01-20T12:00:00'),
    notes: 'العميل طلب التوصيل بعد العصر'
  },
  {
    id: 'task2',
    taskNumber: 2002,
    orderId: 'order2',
    orderNumber: 1002,
    customer: {
      id: 'c2',
      name: 'فاطمة أحمد',
      phone: '+222 87654321',
      address: 'حي النصر، شارع المدينة'
    },
    deliveryAddress: 'حي النصر، شارع المدينة، عمارة رقم 15',
    deliveryCost: 500,
    status: 'assigned',
    courierId: 'courier2',
    courierName: 'أحمد ولد محمد',
    assignedAt: new Date('2024-01-20T11:00:00'),
    createdAt: new Date('2024-01-20T10:00:00'),
    updatedAt: new Date('2024-01-20T11:00:00'),
    estimatedDeliveryTime: new Date('2024-01-20T14:00:00')
  },
  {
    id: 'task3',
    taskNumber: 2003,
    orderId: 'order3',
    orderNumber: 1003,
    customer: {
      id: 'c3',
      name: 'محمد الأمين',
      phone: '+222 55443322',
      address: 'حي دار النعيم، شرع الاستقلال'
    },
    deliveryAddress: 'حي دار النعيم، شارع الاستقلال، قرب السوق الكبير',
    deliveryCost: 700,
    status: 'delivered',
    courierId: 'courier1',
    courierName: 'محمد ولد أحمد',
    assignedAt: new Date('2024-01-19T09:00:00'),
    startedAt: new Date('2024-01-19T10:00:00'),
    completedAt: new Date('2024-01-19T11:30:00'),
    actualDeliveryTime: new Date('2024-01-19T11:30:00'),
    createdAt: new Date('2024-01-19T08:30:00'),
    updatedAt: new Date('2024-01-19T11:30:00')
  },
  {
    id: 'task4',
    taskNumber: 2004,
    orderId: 'order4',
    orderNumber: 1004,
    customer: {
      id: 'c4',
      name: 'عائشة بنت محمد',
      phone: '+222 77889900',
      address: 'حي الرياض، شارع عبد الناصر'
    },
    deliveryAddress: 'حي الرياض، شارع عبد الناصر، بجانب المسجد',
    deliveryCost: 500,
    status: 'pending',
    createdAt: new Date('2024-01-20T12:00:00'),
    updatedAt: new Date('2024-01-20T12:00:00'),
    estimatedDeliveryTime: new Date('2024-01-20T16:00:00')
  },
  {
    id: 'task5',
    taskNumber: 2005,
    orderId: 'order5',
    orderNumber: 1005,
    customer: {
      id: 'c5',
      name: 'عبد الرحمن ولد أحمد',
      phone: '+222 33221100',
      address: 'حي السلام، شارع الوحدة'
    },
    deliveryAddress: 'حي السلام، شارع الوحدة، عمارة البركة',
    deliveryCost: 600,
    status: 'failed',
    courierId: 'courier2',
    courierName: 'أحمد ولد محمد',
    assignedAt: new Date('2024-01-19T13:00:00'),
    startedAt: new Date('2024-01-19T14:00:00'),
    completedAt: new Date('2024-01-19T15:30:00'),
    failureReason: 'العميل غير متواجد - رقم الاتف مغلق',
    createdAt: new Date('2024-01-19T12:30:00'),
    updatedAt: new Date('2024-01-19T15:30:00')
  }
];

const DeliveryTasks: React.FC = () => {
  const { settings } = useSettings();
  const [tasks, setTasks] = useState<DeliveryTask[]>(mockDeliveryTasks);
  const [couriers, setCouriers] = useState<Courier[]>(mockCouriers);
  const [filteredTasks, setFilteredTasks] = useState<DeliveryTask[]>(mockDeliveryTasks);
  
  // فلاتر البحث
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  const [courierFilter, setCourierFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  // النوافذ المنبثقة
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DeliveryTask | null>(null);

  // قفل التمرير عند فتح النوافذ
  useLockBodyScroll(showAssignModal || showStatusModal || showDetailsModal || showNewTaskModal);

  // استمع لتحديثات الأوامر من باقي النُظم (مزامنة عبر eventBus)
  useEffect(() => {
    const off = eventBus.on('order.updated', (updated: any) => {
      const orderNum = (updated.orderId ?? updated.orderNumber);
      if (!orderNum) return;
      setTasks(prev => prev.map(task => {
        if (task.orderNumber === orderNum) {
          let newStatus: DeliveryStatus = task.status;
          if (updated.status === 'in_delivery') newStatus = 'in_progress';
          if (updated.status === 'delivered') newStatus = 'delivered';
          if (updated.status === 'arrived') newStatus = 'assigned';
          if (newStatus !== task.status) {
            return { ...task, status: newStatus, updatedAt: new Date() };
          }
        }
        return task;
      }));
    });
    return () => off();
  }, []);

  // تطبيق الفلاتر
  const filteredResults = useMemo(() => {
    let filtered = [...tasks];

    // فلتر البحث
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.taskNumber.toString().includes(searchLower) ||
        task.orderNumber.toString().includes(searchLower) ||
        task.customer.name.toLowerCase().includes(searchLower) ||
        task.customer.phone.includes(searchLower) ||
        (task.courierName && task.courierName.toLowerCase().includes(searchLower))
      );
    }

    // فلت الحالة
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // فلتر الموصل
    if (courierFilter !== 'all') {
      filtered = filtered.filter(task => task.courierId === courierFilter);
    }

    // فلتر التاريخ
    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch (dateFilter) {
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

      filtered = filtered.filter(task => task.createdAt >= cutoffDate);
    }

    return filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [tasks, searchTerm, statusFilter, courierFilter, dateFilter]);

  useEffect(() => {
    setFilteredTasks(filteredResults);
  }, [filteredResults]);

  // إسناد مهمة لموصل
  const handleAssignTask = (taskId: string, courierId: string) => {
    const courier = couriers.find(c => c.id === courierId);
    if (!courier) return;

    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          status: 'assigned' as DeliveryStatus,
          courierId,
          courierName: courier.name,
          assignedAt: new Date(),
          updatedAt: new Date()
        };
      }
      return task;
    }));

    // تحديث عدد المهام للموصل
    setCouriers(prev => prev.map(c => 
      c.id === courierId 
        ? { ...c, activeTasksCount: c.activeTasksCount + 1 }
        : c
    ));
  };

  // تحديث حالة المهمة
  const handleUpdateStatus = (taskId: string, newStatus: DeliveryStatus, notes?: string, failureReason?: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updatedTask = {
          ...task,
          status: newStatus,
          updatedAt: new Date(),
          notes: notes || task.notes,
          failureReason: failureReason || task.failureReason
        };

        // تحديث الأوقات حسب الحالة
        if (newStatus === 'in_progress' && !task.startedAt) {
          updatedTask.startedAt = new Date();
        } else if (newStatus === 'delivered' || newStatus === 'failed') {
          updatedTask.completedAt = new Date();
          if (newStatus === 'delivered') {
            updatedTask.actualDeliveryTime = new Date();
          }
        }

        return updatedTask;
      }
      return task;
    }));
  };

  // فتح نافذة الإسناد
  const handleOpenAssignModal = (task: DeliveryTask) => {
    setSelectedTask(task);
    setShowAssignModal(true);
  };

  // فتح نفذة تحديث الحالة
  const handleOpenStatusModal = (task: DeliveryTask) => {
    setSelectedTask(task);
    setShowStatusModal(true);
  };

  // فتح نافذة التفاصيل
  const handleOpenDetailsModal = (task: DeliveryTask) => {
    setSelectedTask(task);
    setShowDetailsModal(true);
  };

  // إنشاء مهمة جديدة
  const handleCreateNewTask = (taskData: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryCost: number;
    orderNumber?: number;
    notes?: string;
  }) => {
    const newTask: DeliveryTask = {
      id: `task_${Date.now()}`,
      taskNumber: Math.max(...tasks.map(t => t.taskNumber)) + 1,
      orderId: taskData.orderNumber ? `order_${taskData.orderNumber}` : `order_${Date.now()}`,
      orderNumber: taskData.orderNumber || Math.floor(Math.random() * 9000) + 1000,
      customer: {
        id: `customer_${Date.now()}`,
        name: taskData.customerName,
        phone: taskData.customerPhone,
        address: taskData.deliveryAddress
      },
      deliveryAddress: taskData.deliveryAddress,
      deliveryCost: taskData.deliveryCost,
      status: 'pending',
      notes: taskData.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setTasks(prev => [newTask, ...prev]);
  };

  // توليد وصل التسليم
  const generateDeliveryReceipt = (task: DeliveryTask) => {
    const courierProfit = Math.round(task.deliveryCost * (settings.delivery.courierProfitPercent / 100));
    const receiptHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>وصل تسليم - مهمة #${task.taskNumber}</title>
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
          <h2>${settings.general.businessName} - نظام إدارة التوصيل</h2>
        </div>
        <div class="content">
          <div class="row"><strong>رقم المهمة:</strong> <span>#${task.taskNumber}</span></div>
          <div class="row"><strong>رقم الطلب:</strong> <span>#${task.orderNumber}</span></div>
          <div class="row"><strong>اسم العميل:</strong> <span>${task.customer.name}</span></div>
          <div class="row"><strong>رقم الهاتف:</strong> <span>${task.customer.phone}</span></div>
          <div class="row"><strong>عنوان التوصيل:</strong> <span>${task.deliveryAddress}</span></div>
          <div class="row"><strong>تكلفة التوصيل:</strong> <span>${formatPrice(task.deliveryCost)}</span></div>
          <div class="row"><strong>نسبة الموصل:</strong> <span>${settings.delivery.courierProfitPercent}% (${formatPrice(courierProfit)})</span></div>
          <div class="row"><strong>الموصل:</strong> <span>${task.courierName || 'غير محدد'}</span></div>
          <div class="row"><strong>تاريخ التسليم:</strong> <span>${task.actualDeliveryTime ? formatDate(task.actualDeliveryTime) : formatDate(new Date())}</span></div>
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

  // مكون عر حالة المهمة
  const StatusBadge: React.FC<{ status: DeliveryStatus }> = ({ status }) => {
    const config = DELIVERY_STATUS_CONFIG[status];
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

  // بطاقة المهمة
  const TaskCard: React.FC<{ task: DeliveryTask }> = ({ task }) => (
    <Card className={cn(
      "w-full bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] touch-manipulation",
      task.status === 'pending' && "border-l-4 border-l-gray-500 bg-gray-50/30",
      task.status === 'assigned' && "border-l-4 border-l-blue-500 bg-blue-50/30",
      task.status === 'in_progress' && "border-l-4 border-l-orange-500 bg-orange-50/30",
      task.status === 'delivered' && "border-l-4 border-l-green-500 bg-green-50/30",
      task.status === 'failed' && "border-l-4 border-l-red-500 bg-red-50/30"
    )}>
      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-t-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash size={16} className="text-gray-500" />
            <span className="font-bold text-lg text-gray-900 dark:text-white numeric">#{task.taskNumber}</span>
            <span className="text-sm text-gray-500 numeric">طلب #{task.orderNumber}</span>
          </div>
          <StatusBadge status={task.status} />
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-2 numeric">
          <Calendar size={14} />
          {formatDate(task.createdAt)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {/* معلومات العميل */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <User size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white arabic-safe">{task.customer.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 numeric">{task.customer.phone}</div>
          </div>
        </div>

        {/* عنوان التوصيل */}
        <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <MapPin size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white arabic-safe">عنوان التوصيل:</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 arabic-safe mt-1">{task.deliveryAddress}</div>
          </div>
        </div>

        {/* تكلفة التوصيل */}
        <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <DollarSign size={18} className="text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-white arabic-safe">تكلفة التوصيل:</span>
              <span className="font-bold text-lg text-yellow-600 dark:text-yellow-400 numeric">
                {formatPrice(task.deliveryCost)}
              </span>
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300 mt-1 arabic-safe">
              <span>نصيب الموصل: </span>
              <span className="numeric">{formatPrice(Math.round(task.deliveryCost * (settings.delivery.courierProfitPercent / 100)))}</span>
              <span> • نصيب الشركة: </span>
              <span className="numeric">{formatPrice(task.deliveryCost - Math.round(task.deliveryCost * (settings.delivery.courierProfitPercent / 100)))}</span>
            </div>
          </div>
        </div>

        {/* معلومات الموصل */}
        {task.courierName && (
          <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Truck size={18} className="text-purple-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white arabic-safe">الموصل:</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 arabic-safe">{task.courierName}</div>
              {task.assignedAt && (
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1 arabic-safe">
                  مسندة نذ: {formatDate(task.assignedAt)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ملاحظات أو سبب الفشل */}
        {(task.notes || task.failureReason) && (
          <div className={cn(
            "flex items-start gap-3 p-3 rounded-lg",
            task.failureReason ? "bg-red-50 dark:bg-red-900/20" : "bg-gray-50 dark:bg-gray-900/20"
          )}>
            <FileText size={18} className={cn(
              "mt-0.5 flex-shrink-0",
              task.failureReason ? "text-red-500" : "text-gray-500"
            )} />
            <div className="flex-1">
              <div className={cn(
                "font-medium dark:text-white arabic-safe",
                task.failureReason ? "text-red-800" : "text-gray-900"
              )}>
                {task.failureReason ? 'سبب الفشل:' : 'ملاحظات:'}
              </div>
              <div className={cn(
                "text-sm mt-1 arabic-safe",
                task.failureReason ? "text-red-600" : "text-gray-600"
              )}>
                {task.failureReason || task.notes}
              </div>
            </div>
          </div>
        )}

        {/* الأزرار */}
        <div className="pt-3 space-y-2">
          {task.status === 'pending' && (
            <Button
              size="sm"
              className="w-full flex items-center justify-center gap-2 h-11 bg-blue-600 hover:bg-blue-700"
              onClick={() => handleOpenAssignModal(task)}
            >
              <Users size={18} />
              <span className="text-sm font-medium arabic-safe">إسناد لموصل</span>
            </Button>
          )}

          {(task.status === 'assigned' || task.status === 'in_progress') && (
            <Button
              size="sm"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 h-11 hover:bg-orange-50"
              onClick={() => handleOpenStatusModal(task)}
            >
              <ClipboardList size={18} />
              <span className="text-sm font-medium arabic-safe">تحديث الحالة</span>
            </Button>
          )}

          {task.status === 'failed' && (
            <Button
              size="sm"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 h-11 hover:bg-blue-50"
              onClick={() => handleOpenAssignModal(task)}
            >
              <RotateCcw size={18} />
              <span className="text-sm font-medium arabic-safe">إعادة إسناد</span>
            </Button>
          )}

          {task.status === 'delivered' && (
            <Button
              size="sm"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 h-11 hover:bg-green-50"
              onClick={() => generateDeliveryReceipt(task)}
            >
              <FileText size={18} />
              <span className="text-sm font-medium arabic-safe">طباعة وصل التسليم</span>
            </Button>
          )}

          {/* زر عرض التفاصيل */}
          <Button
            size="sm"
            variant="ghost"
            className="w-full flex items-center justify-center gap-2 h-11 hover:bg-gray-50"
            onClick={() => handleOpenDetailsModal(task)}
          >
            <Eye size={18} />
            <span className="text-sm font-medium arabic-safe">عرض التفاصيل</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // إحصائيات سريعة
  const stats = {
    pending: tasks.filter(t => t.status === 'pending').length,
    assigned: tasks.filter(t => t.status === 'assigned').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    delivered: tasks.filter(t => t.status === 'delivered').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    activeCouriers: couriers.filter(c => c.isActive).length
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* رأس الصفحة */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white arabic-safe">
              إدارة مهام التوصيل
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 arabic-safe">
              نظام ذكي لإدارة وتتبع مهام التوصيل للموصلين
            </p>
          </div>
          
          <Button
            onClick={() => setShowNewTaskModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto h-12 sm:h-10 arabic-safe"
          >
            <Plus size={20} />
            مهمة جديدة
          </Button>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600 numeric">{stats.pending}</div>
              <div className="text-xs text-gray-700 arabic-safe">بانتظار التوصيل</div>
            </div>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 numeric">{stats.assigned}</div>
              <div className="text-xs text-blue-700 arabic-safe">مسندة</div>
            </div>
          </Card>
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 numeric">{stats.inProgress}</div>
              <div className="text-xs text-orange-700 arabic-safe">في الطريق</div>
            </div>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 numeric">{stats.delivered}</div>
              <div className="text-xs text-green-700 arabic-safe">تم التسليم</div>
            </div>
          </Card>
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 numeric">{stats.failed}</div>
              <div className="text-xs text-red-700 arabic-safe">فشل التوصيل</div>
            </div>
          </Card>
          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 numeric">{stats.activeCouriers}</div>
              <div className="text-xs text-purple-700 arabic-safe">موصلين نشطين</div>
            </div>
          </Card>
        </div>

        {/* أدوات البحث والفلترة */}
        <Card className="mb-6">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* البحث */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="بحث برقم المهمة، الطلب، العميل أو الموصل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* فلتر الحالة */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as DeliveryStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 arabic-safe"
              >
                <option value="all">جميع الحالات</option>
                <option value="pending">بانتظار التوصيل</option>
                <option value="assigned">مسندة لموصل</option>
                <option value="in_progress">في الطريق</option>
                <option value="delivered">تم التسليم</option>
                <option value="failed">فشل التوصيل</option>
              </select>

              {/* فلتر الموصل */}
              <select
                value={courierFilter}
                onChange={(e) => setCourierFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 arabic-safe"
              >
                <option value="all">جميع الموصلين</option>
                {couriers.map(courier => (
                  <option key={courier.id} value={courier.id}>
                    {courier.name}
                  </option>
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
                  setCourierFilter('all');
                  setDateFilter('all');
                }}
                className="flex items-center gap-2 arabic-safe"
              >
                <X size={16} />
                مسح جميع الفلاتر
              </Button>
              
              <div className="text-sm text-gray-600 arabic-safe">
                عرض {filteredTasks.length} من {tasks.length} مهمة
              </div>
            </div>
          </CardContent>
        </Card>

        {/* عرض المهام */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>

        {/* رسالة عدم وجود نتائج */}
        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg arabic-safe">
              لا توجد مهام تطابق معايير البحث
            </p>
          </div>
        )}
      </div>

      {/* نافذة إسناد المهمة */}
      {showAssignModal && selectedTask && (
        <AssignTaskModal
          task={selectedTask}
          couriers={couriers}
          onAssign={(taskId, courierId) => {
            handleAssignTask(taskId, courierId);
            setShowAssignModal(false);
            setSelectedTask(null);
          }}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedTask(null);
          }}
        />
      )}

      {/* نافذة تحديث الحالة */}
      {showStatusModal && selectedTask && (
        <StatusUpdateModal
          task={selectedTask}
          onUpdate={(taskId, status, notes, failureReason) => {
            handleUpdateStatus(taskId, status, notes, failureReason);
            if (status === 'delivered') {
              generateDeliveryReceipt(selectedTask);
            }
            setShowStatusModal(false);
            setSelectedTask(null);
          }}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedTask(null);
          }}
        />
      )}

      {/* نافذة التفاصيل */}
      {showDetailsModal && selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedTask(null);
          }}
        />
      )}

      {/* نافذة إنشاء مهمة جديدة */}
      {showNewTaskModal && (
        <NewTaskModal
          customers={mockCustomers}
          onCreateTask={(taskData) => {
            handleCreateNewTask(taskData);
            setShowNewTaskModal(false);
          }}
          onClose={() => setShowNewTaskModal(false)}
        />
      )}
    </div>
  );
};

// مكونات النوافذ المنبثقة
const AssignTaskModal: React.FC<{
  task: DeliveryTask;
  couriers: Courier[];
  onAssign: (taskId: string, courierId: string) => void;
  onClose: () => void;
}> = ({ task, couriers, onAssign, onClose }) => {
  const [selectedCourierId, setSelectedCourierId] = useState('');

  const availableCouriers = couriers.filter(c => c.isActive);

  const handleAssign = () => {
    if (selectedCourierId) {
      onAssign(task.id, selectedCourierId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 modal-overlay">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg arabic-safe">إسناد المهمة #{task.taskNumber}</h3>
          <Button variant="ghost" onClick={onClose}>إغلاق</Button>
        </div>
        
        <div className="p-4">
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <div><strong>العميل:</strong> {task.customer.name}</div>
              <div><strong>العنوان:</strong> {task.deliveryAddress}</div>
              <div><strong>التكلفة:</strong> {formatPrice(task.deliveryCost)} </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">
                اختر الموصل:
              </label>
              <select
                value={selectedCourierId}
                onChange={(e) => setSelectedCourierId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 arabic-safe"
              >
                <option value="">-- اختر موصل --</option>
                {availableCouriers.map(courier => (
                  <option key={courier.id} value={courier.id}>
                    {courier.name} ({courier.activeTasksCount} مهام نشطة)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedCourierId}
            className="bg-blue-600 hover:bg-blue-700"
          >
            إسناد المهم
          </Button>
        </div>
      </div>
    </div>
  );
};

const StatusUpdateModal: React.FC<{
  task: DeliveryTask;
  onUpdate: (taskId: string, status: DeliveryStatus, notes?: string, failureReason?: string) => void;
  onClose: () => void;
}> = ({ task, onUpdate, onClose }) => {
  const [newStatus, setNewStatus] = useState<DeliveryStatus>(task.status);
  const [notes, setNotes] = useState(task.notes || '');
  const [failureReason, setFailureReason] = useState(task.failureReason || '');

  const handleUpdate = () => {
    onUpdate(task.id, newStatus, notes, failureReason);
  };

  const getNextStatus = (currentStatus: DeliveryStatus): DeliveryStatus[] => {
    switch (currentStatus) {
      case 'assigned':
        return ['in_progress', 'failed'];
      case 'in_progress':
        return ['delivered', 'failed'];
      default:
        return [];
    }
  };

  const availableStatuses = getNextStatus(task.status);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 modal-overlay">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg arabic-safe">تحديث حلة المهمة #{task.taskNumber}</h3>
          <Button variant="ghost" onClick={onClose}>إغلاق</Button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <div><strong>العميل:</strong> {task.customer.name}</div>
            <div><strong>الحالة الحالية:</strong> {DELIVERY_STATUS_CONFIG[task.status].label}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">
              الحالة الجديدة:
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as DeliveryStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 arabic-safe"
            >
              <option value={task.status}>{DELIVERY_STATUS_CONFIG[task.status].label}</option>
              {availableStatuses.map(status => (
                <option key={status} value={status}>
                  {DELIVERY_STATUS_CONFIG[status].label}
                </option>
              ))}
            </select>
          </div>

          {newStatus === 'failed' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">
                سبب الفشل:
              </label>
              <textarea
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="اكب سبب فشل التوصيل..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">
              ملاحظات إضافية:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف أي ملاحظات..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>
        </div>
        
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button 
            onClick={handleUpdate}
            className={cn(
              newStatus === 'delivered' ? "bg-green-600 hover:bg-green-700" :
              newStatus === 'failed' ? "bg-red-600 hover:bg-red-700" :
              "bg-blue-600 hover:bg-blue-700"
            )}
          >
            تحديث الحالة
          </Button>
        </div>
      </div>
    </div>
  );
};

const TaskDetailsModal: React.FC<{
  task: DeliveryTask;
  onClose: () => void;
}> = ({ task, onClose }) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 modal-overlay">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full mx-auto" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg arabic-safe">تفاصيل المهمة #{task.taskNumber}</h3>
          <Button variant="ghost" onClick={onClose}>إغلاق</Button>
        </div>

        <div className="p-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 arabic-safe mb-2">معلومات المهمة</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>رقم المهمة:</strong> #{task.taskNumber}</div>
                  <div><strong>رقم الطلب:</strong> #{task.orderNumber}</div>
                  <div><strong>تاريخ الإنشاء:</strong> {formatDate(task.createdAt)}</div>
                  <div><strong>آخر تحديث:</strong> {formatDate(task.updatedAt)}</div>
                </div>
              </div>

              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 arabic-safe mb-2">معلومات العميل</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>الاسم:</strong> {task.customer.name}</div>
                  <div><strong>الهاتف:</strong> {task.customer.phone}</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 arabic-safe mb-2">عنوان التوصيل</h4>
              <p className="text-sm arabic-safe">{task.deliveryAddress}</p>
            </div>

            {task.courierName && (
              <div className="p-3 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800 arabic-safe mb-2">ملومات الموصل</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>الاسم:</strong> {task.courierName}</div>
                  {task.assignedAt && <div><strong>تاريخ الإسناد:</strong> {formatDate(task.assignedAt)}</div>}
                  {task.startedAt && <div><strong>بدء التوصيل:</strong> {formatDate(task.startedAt)}</div>}
                  {task.completedAt && <div><strong>انتهاء المهمة:</strong> {formatDate(task.completedAt)}</div>}
                </div>
              </div>
            )}

            {(task.notes || task.failureReason) && (
              <div className={cn(
                "p-3 rounded-lg",
                task.failureReason ? "bg-red-50" : "bg-yellow-50"
              )}>
                <h4 className={cn(
                  "font-medium arabic-safe mb-2",
                  task.failureReason ? "text-red-800" : "text-yellow-800"
                )}>
                  {task.failureReason ? 'سبب الفشل' : 'ملاحظات'}
                </h4>
                <p className="text-sm arabic-safe">{task.failureReason || task.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <Button onClick={onClose}>إغلاق</Button>
        </div>
      </div>
    </div>
  );
};

const NewTaskModal: React.FC<{
  customers: Customer[];
  onCreateTask: (taskData: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryCost: number;
    orderNumber?: number;
    notes?: string;
  }) => void;
  onClose: () => void;
}> = ({ customers, onCreateTask, onClose }) => {
  const { settings } = useSettings();
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [area, setArea] = useState<'inside'|'outside'>('inside');
  const [deliveryCost, setDeliveryCost] = useState<number>(settings.delivery.insideNKCPrice);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [notes, setNotes] = useState('');

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    const cust = customers.find(c => c.id === id);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone);
      if (cust.address) setDeliveryAddress(cust.address);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId && (!customerName.trim() || !customerPhone.trim())) {
      alert('يرجى اختيار عميل من القائمة أو إدخال اسم ورقم هاتف');
      return;
    }
    if (!deliveryAddress.trim()) {
      alert('يرجى إدخال عنوان التوصيل');
      return;
    }

    onCreateTask({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      deliveryCost,
      orderNumber: orderNumber ? parseInt(orderNumber) : undefined,
      notes: notes.trim() || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 modal-overlay">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full mx-auto" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg arabic-safe">إنشاء مهمة توصيل جدية</h3>
          <Button variant="ghost" onClick={onClose}>إغلاق</Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4" style={{ maxHeight: '70vh' }}>
            {/* اختيار العميل مع بحث */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">اختر العميل</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="ابحث بالاسم أو الهاتف..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 arabic-safe flex-1"
                  >
                    <option value="">-- اختر عميل --</option>
                    {filteredCustomers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">رقم الطلب (اختياري)</label>
                <NumericInput
                  value={orderNumber}
                  onChange={(v) => setOrderNumber(v)}
                  placeholder="1001"
                />
              </div>
            </div>

            {/* حقول تُعبأ تلقائياً بعد اختيار العميل ويمكن تعديلها */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">اسم العميل</label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="أدخل اسم العميل" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">رقم الهاتف</label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+222 12345678" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">عنوان التوصيل *</label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="أدخل عنوان التوصيل الكامل..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">داخل/خارج نواكشوط</label>
                <select
                  value={area}
                  onChange={(e) => {
                    const val = e.target.value as 'inside'|'outside';
                    setArea(val);
                    setDeliveryCost(val === 'inside' ? settings.delivery.insideNKCPrice : settings.delivery.outsideNKCPrice);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 arabic-safe"
                >
                  <option value="inside">داخل نواكشوط</option>
                  <option value="outside">خارج نواكشوط</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">تكلفة التوصيل (أوقية) *</label>
                <NumericInput
                  value={String(deliveryCost)}
                  onChange={(v) => setDeliveryCost(parseInt(v) || 0)}
                  placeholder={String(settings.delivery.insideNKCPrice)}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-2">
                ملاحظات إضافية
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف أي ملاحظات مهمة..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
          </div>
        </form>

        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} type="button">إلغاء</Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700"
          >
            إنشاء المهمة
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryTasks;
