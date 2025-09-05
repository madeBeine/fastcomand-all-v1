import React, { useState } from 'react';
import {
  X, Edit, Save, Package, Truck, MapPin, Calendar,
  DollarSign, User, Store as StoreIcon, Link as LinkIcon,
  CheckCircle, Clock, AlertCircle, Weight, Archive,
  Phone, Hash, CreditCard, FileText, Printer,
  Receipt, Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumericInput from '@/components/NumericInput';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Order, OrderStatus, ORDER_STATUS_CONFIG } from '@/pages/Orders';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { generateInvoiceHTML } from '@/utils/invoiceTemplate';
import { formatCurrencyMRU, formatDate as fmtDate } from '@/utils/format';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onOrderUpdated: (updatedOrder: Order) => void;
}

interface StatusTransition {
  from: OrderStatus;
  to: OrderStatus;
  label: string;
  requiresInput?: 'payment_confirmation' | 'international_shipping' | 'tracking' | 'weight_storage' | 'delivery_choice' | 'remaining_payment_with_weight';
  description: string;
  icon?: React.ComponentType<any>;
  canGoBack?: boolean;
  backToStatus?: OrderStatus;
  isBackward?: boolean;
}

// نظام الانتقالات الذكي الشامل - يغطي جميع مراحل الطلب خطوة بخطو
const SMART_STATUS_TRANSITIONS: StatusTransition[] = [
  // المرحلة 1: من جيد إلى مدوع
  {
    from: 'new',
    to: 'paid',
    label: 'تأكيد الدفع وبدء المعالجة',
    requiresInput: 'payment_confirmation',
    description: 'تأكيد اتلام الدفع من العميل مع إدخال فاصيل الدفع',
    icon: CreditCard,
    canGoBack: false
  },

  // المرحلة 1.5: من مدفوع جزئياً إلى مدفوع ب��لكامل
  {
    from: 'partially_paid',
    to: 'paid',
    label: 'إكمال باقي الدفع',
    requiresInput: 'payment_confirmation',
    description: 'إدخال الدفعة المتبقية لإكمال الدفع بالكامل',
    icon: CreditCard,
    canGoBack: true,
    backToStatus: 'new'
  },

  // المرحلة 1.6: السماح للطلبات المدفوعة جزئياً بالانتقال للطلب
  {
    from: 'partially_paid',
    to: 'ordered',
    label: 'المتابعة للطلب (دفع جزي)',
    requiresInput: 'international_shipping',
    description: 'إدخال رقم الشحن الدولي والمتابعة مع الحفاظ على حالة الدفع الجزئي',
    icon: Package,
    canGoBack: true,
    backToStatus: 'new'
  },

  // المحلة 2: من مدفوع بالامل إلى طلب (رقم الشحن الدولي)
  {
    from: 'paid',
    to: 'ordered',
    label: 'إدخال رقم الشحن الدولي',
    requiresInput: 'international_shipping',
    description: 'دخل رقم الشحن الدلي من المتجر أو شركة الشحن',
    icon: Package,
    canGoBack: true,
    backToStatus: 'new'
  },

  // المرحة 3: من طلب إلى مشحون (رقم التتبع)
  {
    from: 'ordered',
    to: 'shipped',
    label: 'إضاف رقم التتبع الدولي',
    requiresInput: 'tracking',
    description: 'إدخال رقم تتبع الشحنة الدولية من شركة الشحن',
    icon: Truck,
    canGoBack: true,
    backToStatus: 'paid'
  },

  // المرحلة 4: من مشحون إلى في الطريق
  {
    from: 'shipped',
    to: 'linked',
    label: 'تحديث: في الطرق إلى موريتانيا',
    description: 'الطلب في طريقه وي الطريق لموريتانا',
    icon: MapPin,
    canGoBack: true,
    backToStatus: 'ordered'
  },

  // المرحة 5: من في الطريق إلى وصل امخزن
  {
    from: 'linked',
    to: 'arrived',
    label: 'وص للمخزن + قياس اوزن',
    requiresInput: 'weight_storage',
    description: 'تسجيل وصل الطلب للمخز مع قياس الوزن وتحديد مقع التخزي��',
    icon: Archive,
    canGoBack: true,
    backToStatus: 'shipped'
  },

  // المرحلة 6: من وصل المخزن إلى ��دفوع الوزن
  {
    from: 'arrived',
    to: 'weight_paid',
    label: 'تأكيد دفع رسوم الوزن',
    description: 'تأكيد دفع العميل لرسوم الوزن الإضافية',
    icon: DollarSign,
    canGoBack: true,
    backToStatus: 'linked'
  },

  // المرحلة 6.5: دفع المتبقي مع الوزن للطلبات المدفوعة جزئياً
  {
    from: 'arrived',
    to: 'weight_paid',
    label: 'دفع المتبقي مع رسوم الوزن',
    requiresInput: 'remaining_payment_with_weight',
    description: 'دفع المبلغ المبقي ن الطلب مع رسوم الوزن الإضافية',
    icon: CreditCard,
    canGoBack: true,
    backToStatus: 'linked'
  },

  // المرحلة 7: من مدفوع الوزن إلى التسليم
  {
    from: 'weight_paid',
    to: 'in_delivery',
    label: 'بدء عملية التسليم',
    requiresInput: 'delivery_choice',
    description: 'ختيار طريقة التسليم (توصيل منزلي أو استلام من المعرض)',
    icon: Truck,
    canGoBack: true,
    backToStatus: 'arrived'
  },

  // المرحلة 7.5: د��ع المتبقي في مرحلة التسليم (للطلبات المدفوعة جزئياً)
  {
    from: 'in_delivery',
    to: 'delivered',
    label: 'تحصيل المتبقي وإتمام التسليم',
    requiresInput: 'payment_confirmation',
    description: 'تحصيل المبلغ المتبقي من العميل عند التسليم وإتمام الطلب',
    icon: CreditCard,
    canGoBack: true,
    backToStatus: 'weight_paid'
  },

  // المرحلة 8: من في التوصيل إلى تم التسليم
  {
    from: 'in_delivery',
    to: 'delivered',
    label: 'تأكيد إتمام التسليم',
    description: 'تكيد تسليم الطلب للعميل نهائياً وإغاق الملف',
    icon: CheckCircle,
    canGoBack: true,
    backToStatus: 'weight_paid'
  }
];

// نتقالا اعود للخلف (لتصحيح البيانات)
const BACKWARD_TRANSITIONS: StatusTransition[] = [
  {
    from: 'partially_paid',
    to: 'new',
    label: 'تعديل بيانات الدفع الجزئي',
    description: 'العودة لحالة جديد لتعديل أو إلغاء الدفع الجزئي',
    icon: Edit,
    isBackward: true
  },
  {
    from: 'paid',
    to: 'new',
    label: 'تعديل حالة الدفع',
    description: 'العو��ة لحالة جديد لتعديل بيانات الدفع',
    icon: Edit,
    isBackward: true
  },
  {
    from: 'ordered',
    to: 'paid',
    label: 'تعديل رقم الشحن الدلي',
    description: 'العودة لتعديل رقم الشحن الدولي',
    icon: Edit,
    isBackward: true
  },
  {
    from: 'shipped',
    to: 'ordered',
    label: 'تعديل ر��م التتبع',
    description: 'العودة لتعديل رقم التتبع الدول',
    icon: Edit,
    isBackward: true
  },
  {
    from: 'linked',
    to: 'shipped',
    label: 'تعديل حالة الشحن',
    description: 'العودة لتعديل حالة أو أرقام التتبع',
    icon: Edit,
    isBackward: true
  },
  {
    from: 'arrived',
    to: 'linked',
    label: 'تعديل يانات الوصول',
    description: 'العودة لتعديل لزن أو مكان التخزين',
    icon: Edit,
    isBackward: true
  },
  {
    from: 'weight_paid',
    to: 'arrived',
    label: 'تعديل رسوم الوزن',
    description: 'العودة لعديل بيانات الوزن أو الرسوم',
    icon: Edit,
    isBackward: true
  },
  {
    from: 'in_delivery',
    to: 'weight_paid',
    label: 'تعديل طريقة التسليم',
    description: 'العودة لتعديل طريقة التسليم',
    icon: Edit,
    isBackward: true
  },
  {
    from: 'delivered',
    to: 'in_delivery',
    label: 'تعديل حالة التليم',
    description: 'العودة لتعديل حالة التسليم',
    icon: Edit,
    isBackward: true
  }
];

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  onOrderUpdated
}) => {
  // قفل التمرير في لخلفية عند فتح النافذة
  useLockBodyScroll(isOpen);

  const [isEditing, setIsEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Order | null>(null);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState<StatusTransition | null>(null);
  const [showBackwardOptions, setShowBackwardOptions] = useState(false);

  // ��الات الإدخال المختلف كل مرحلة
  const [inputValue, setInputValue] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [internationalShipping, setInternationalShipping] = useState('');
  const [internationalShippingList, setInternationalShippingList] = useState<string[]>([]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingNumberList, setTrackingNumberList] = useState<string[]>([]);
  const [weightValue, setWeightValue] = useState('');
  const [deliveryChoice, setDeliveryChoice] = useState<'delivery' | 'pickup' | ''>('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // يانات تأكيد الفع
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'mobile_money' | 'card' | 'other' | ''>('');
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [paymentNotes, setPaymentNotes] = useState('');

  // إداد ليانات للتعديل
  React.useEffect(() => {
    if (order) {
      setEditedOrder({ ...order });
      setStorageLocation(order.storageLocation || '');
      setTrackingNumber(order.trackingNumber || '');
      setWeightValue(order.weight?.toString() || '');

      // تحميل أرقام الشحن الدولي والتتبع الموجودة
      setInternationalShippingList(order.internationalShippingNumbers || []);
      setTrackingNumberList(order.trackingNumbers || []);

      // تعيين المبلغ الافتراضي لبيانات الدفع (للطلبات الجديدة)
      if (order.status === 'new' && !paymentAmount) {
        setPaymentAmount(order.finalPrice.toString());
      }

      // الحصول ع��ى الاتقالات المتاحة للحالة الحالية
      const availableTransitions = SMART_STATUS_TRANSITIONS.filter(
        transition => transition.from === order.status
      );

      // اختيار الانتقال التالي لقائياً إذا لم يكن هناك اختيار
      const currentNextTransition = availableTransitions.length === 1 ? availableTransitions[0] : null;
      if (currentNextTransition && !selectedTransition) {
        setSelectedTransition(currentNextTransition);
      }
    }
  }, [order, selectedTransition]);

  if (!isOpen || !order) return null;

  // دالة مساعدة لتحديد ما إذا كن الطلب مدفوع جزئياً
  const isPartiallyPaidOrder = (order: Order): boolean => {
    return !!(order.paymentAmount && order.paymentAmount > 0 && order.paymentAmount < order.finalPrice);
  };

  // دالة لتحديد الحالة الفعلية للعرض (مع إعطاء أولوية للدفع الجزئي)
  const getEffectiveStatus = (order: Order): OrderStatus => {
    if (isPartiallyPaidOrder(order)) {
      return 'partially_paid';
    }
    return order.status;
  };

  // الحصول على الانتقالات المتاحة للحالة الحاية مع منطق ذكي للدفع
  const getAvailableTransitions = () => {
    const effectiveStatus = getEffectiveStatus(order);
    let transitions = SMART_STATUS_TRANSITIONS.filter(
      transition => transition.from === order.status ||
      (isPartiallyPaidOrder(order) && transition.from === 'partially_paid')
    );

    // منطق خاص للطلبات الواصلة للمخزن
    if (order.status === 'arrived') {
      const isPartiallyPaid = order.paymentAmount && order.paymentAmount < order.finalPrice;

      if (isPartiallyPaid) {
        // إظهار خيار دفع المتبقي مع الوزن فقط
        transitions = transitions.filter(t =>
          t.requiresInput === 'remaining_payment_with_weight' ||
          t.requiresInput === 'weight_storage'
        );
      } else {
        // إظهار خيار دفع رسوم الوزن فقط
        transitions = transitions.filter(t =>
          t.requiresInput !== 'remaining_payment_with_weight'
        );
      }
    }

    // منطق خاص لمرحلة التسليم
    if (order.status === 'in_delivery') {
      const isPartiallyPaid = order.paymentAmount && order.paymentAmount < order.finalPrice;

      if (isPartiallyPaid) {
        // إظهار خيار تحصيل المتبقي وإتما التسليم
        transitions = transitions.filter(t =>
          t.requiresInput === 'payment_confirmation'
        );
      } else {
        // إظهار خيار إتمام التسليم فقط
        transitions = transitions.filter(t =>
          t.requiresInput !== 'payment_confirmation'
        );
      }
    }

    return transitions;
  };

  const availableTransitions = getAvailableTransitions();

  // الحصول على انتقالات العودة للخلف
  const availableBackwardTransitions = BACKWARD_TRANSITIONS.filter(
    transition => transition.from === order.status
  );

  // تحديد ما إذا كان هناك انتقال تلقائي وحد فقط
  const hasAutoTransition = availableTransitions.length === 1 &&
    !availableTransitions[0].requiresInput &&
    order.status !== 'partially_paid'; // للطلبات المدفوعة جزئياً، نريد دائماً إظهار الخيارات

  // الحصول على الانتقال التالي المقترح
  const getNextTransition = () => {
    if (availableTransitions.length === 1 && order.status !== 'partially_paid') {
      return availableTransitions[0];
    }
    // ��لطلبات المدفوعة جزئياً، نعطي الأولوية لإكمال الدفع
    if (order.status === 'partially_paid') {
      return availableTransitions.find(t => t.to === 'paid') || availableTransitions[0];
    }
    return null;
  };

  const nextTransition = getNextTransition();

  // داة التحقق من صحة البيانات المطلوبة
  const validateTransitionInputs = (transition: StatusTransition): boolean => {
    switch (transition.requiresInput) {
      case 'payment_confirmation':
        return paymentAmount.trim() !== '' && parseFloat(paymentAmount) > 0 && paymentMethod !== '';
      case 'international_shipping':
        return internationalShippingList.length > 0;
      case 'tracking':
        return trackingNumberList.length > 0;
      case 'weight_storage':
        return inputValue.trim() !== '' && parseFloat(inputValue) > 0 && storageLocation.trim() !== '';
      case 'delivery_choice':
        return deliveryChoice !== '';
      case 'remaining_payment_with_weight':
        return paymentAmount.trim() !== '' && parseFloat(paymentAmount) > 0 && paymentMethod !== '' &&
               inputValue.trim() !== '' && parseFloat(inputValue) > 0 && storageLocation.trim() !== '';
      default:
        return true;
    }
  };

  // تنفيذ انتقال الحالة الذكي
  const handleSmartStatusTransition = async () => {
    if (!selectedTransition) return;

    // التحقق من صحة البيانات المطلوبة
    if (!validateTransitionInputs(selectedTransition)) {
      alert('يرج�� ملء جميع البيانات المطلوة');
      return;
    }

    const updatedOrder: Order = {
      ...order,
      status: selectedTransition.to,
      updatedAt: new Date(),
    };

    // معالجة خاصة لطلبات المدفوعة جزئياً - نحافظ على المعلومة
    const isCurrentlyPartiallyPaid = isPartiallyPaidOrder(order);
    const isMovingToNextStep = selectedTransition.from === 'partially_paid' &&
                               selectedTransition.to !== 'paid' &&
                               selectedTransition.requiresInput !== 'payment_confirmation';

    // إضافة لبيانات المطلوبة حسب نوع الانتقال
    switch (selectedTransition.requiresInput) {
      case 'payment_confirmation':
        // حفظ بيانات الدفع
        // حساب إجمالي المبلغ المدفوع
        const paidAmount = parseFloat(paymentAmount);
        const totalAmount = order.finalPrice;
        const currentPaidAmount = order.paymentAmount || 0;
        const totalPaidAmount = currentPaidAmount + paidAmount;

        updatedOrder.paymentAmount = totalPaidAmount;
        updatedOrder.paymentMethod = (paymentMethod ? (paymentMethod as any) : undefined);
        updatedOrder.paymentDate = new Date();
        updatedOrder.paymentNotes = paymentNotes.trim() || undefined;

        // تحديد احالة الصحيحة بناءً على ا��مبلغ المدفوع
        if (totalPaidAmount >= totalAmount) {
          updatedOrder.status = 'paid'; // مدفوع بالكامل
        } else {
          updatedOrder.status = 'partially_paid'; // مدفوع جزئاً
        }

        // معالجة صورة الإيصال إذا تم رفعها
        if (paymentReceipt) {
          try {
            const receiptUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(paymentReceipt);
            });
            updatedOrder.paymentReceipt = receiptUrl;
          } catch (error) {
            console.error('خطأ في تحميل الصورة:', error);
          }
        }
        break;

      case 'international_shipping':
        // إضافة رق الشحن الدوي الجديد للمصفوفة
        const currentInternationalNumbers = order.internationalShippingNumbers || [];
        const newInternationalNumbers = [...currentInternationalNumbers, ...internationalShippingList];
        updatedOrder.internationalShippingNumbers = newInternationalNumbers;

        // حفظ رقم الشحن الول في الملاحظات أيضاً
        const internationalShippingNotes = internationalShippingList.map(num => `رقم الشحن الدولي: ${num}`).join('\n');
        updatedOrder.notes = (updatedOrder.notes || '') + `\n${internationalShippingNotes}`;
        break;

      case 'tracking':
        // إضافة رقم التتبع الجديد للمصفوفة
        const currentTrackingNumbers = order.trackingNumbers || [];
        const newTrackingNumbers = [...currentTrackingNumbers, ...trackingNumberList];
        updatedOrder.trackingNumbers = newTrackingNumbers;

        // للتوافق مع النسخة السابقة، حفظ أول رقم في trackingNumber
        if (newTrackingNumbers.length > 0) {
          updatedOrder.trackingNumber = newTrackingNumbers[0];
        }
        break;

      case 'weight_storage':
        updatedOrder.weight = parseFloat(inputValue);
        updatedOrder.storageLocation = storageLocation.trim();
        break;

      case 'delivery_choice':
        const deliveryNote = deliveryChoice === 'delivery' ? 'توصيل منزلي' : 'استلام من المعرض';
        const fullDeliveryNote = deliveryNotes.trim()
          ? `${deliveryNote} - ${deliveryNotes.trim()}`
          : deliveryNote;
        updatedOrder.notes = (updatedOrder.notes || '') + `\nطريقة التسليم: ${fullDeliveryNote}`;
        break;

      case 'remaining_payment_with_weight':
        // دفع المتبقي مع رسوم الوزن
        const remainingPaidAmount = parseFloat(paymentAmount);
        const totalOrderAmount = order.finalPrice;
        const currentOrderPaidAmount = order.paymentAmount || 0;
        const totalOrderPaidAmount = currentOrderPaidAmount + remainingPaidAmount;

        updatedOrder.paymentAmount = totalOrderPaidAmount;
        updatedOrder.paymentMethod = (paymentMethod ? (paymentMethod as any) : undefined);
        updatedOrder.paymentDate = new Date();
        updatedOrder.paymentNotes = paymentNotes.trim() || undefined;
        updatedOrder.weight = parseFloat(inputValue);
        updatedOrder.storageLocation = storageLocation.trim();

        // تحديد الحالة بناءً على المبلغ المدفوع
        if (totalOrderPaidAmount >= totalOrderAmount) {
          updatedOrder.status = 'weight_paid'; // مدفوع بالكامل مع الوزن
        } else {
          updatedOrder.status = 'partially_paid'; // لا يزال مدفوعاً جزئياً
        }

        // معالجة ��ورة الإيصال إذا تم رفعها
        if (paymentReceipt) {
          try {
            const receiptUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(paymentReceipt);
            });
            updatedOrder.paymentReceipt = receiptUrl;
          } catch (error) {
            console.error('خطأ في تحميل الصورة:', error);
          }
        }
        break;
    }

    // معالجة خاصة للطلبات المدفوعة جزئياً التي تنتقل لمراحل تالية
    if (isMovingToNextStep && isCurrentlyPartiallyPaid) {
      // نحافظ على المعلومة أن الطلب مدفوع جزئياً في الملاحظات أو في مكان آخر
      // هذا يسمح بالفرز والبحث عن الطلبات المدفوعة جزئياً حتى لو تقدمت في المراحل
      const partialPaymentNote = `دفع جزئي: ${formatPrice(order.paymentAmount || 0)} من أصل ${formatPrice(order.finalPrice)}`;
      updatedOrder.notes = updatedOrder.notes ?
        `${updatedOrder.notes}\n${partialPaymentNote}` :
        partialPaymentNote;
    }

    // تنفيذ التحديث
    onOrderUpdated(updatedOrder);

    // إعادة ��عيين النافذة
    setShowStatusChange(false);
    setSelectedTransition(null);
    resetInputFields();

    // إنتاج الفاتورة تل��ائياً عند تأكيد الدفع
    if (selectedTransition.requiresInput === 'payment_confirmation' ||
        selectedTransition.requiresInput === 'remaining_payment_with_weight') {
      setTimeout(() => {
        handleGenerateInvoice();
      }, 500);
    }

    // إشعار المستخدم
    const statusLabel = ORDER_STATUS_CONFIG[selectedTransition.to]?.label || selectedTransition.to;
    alert(`تم تحيث حالة الطلب إلى: ${statusLabel}`);
  };

  // إعادة تعين حقول الإدخل
  const resetInputFields = () => {
    setInputValue('');
    setInternationalShipping('');
    setInternationalShippingList([]);
    setTrackingNumber(order?.trackingNumber || '');
    setTrackingNumberList([]);
    setWeightValue(order?.weight?.toString() || '');
    setStorageLocation(order?.storageLocation || '');
    setDeliveryChoice('');
    setDeliveryNotes('');
    // إعادة تعيين بيانات الدفع
    setPaymentAmount('');
    setPaymentMethod('');
    setPaymentReceipt(null);
    setPaymentNotes('');
  };

  // تفيذ انتقا�� العودة للخلف مع حذف البيانا�� المتعلقة
  const handleBackwardTransition = (transition: StatusTransition) => {
    const updatedOrder: Order = {
      ...order,
      status: transition.to,
      updatedAt: new Date(),
    };

    // حذف لبيانات المتعلق بالخطوات التي تم التراجع عنها
    switch (transition.from) {
      case 'partially_paid':
        // حذف بيانات الدفع الجزئي عند العودة من "مدفوع جزئياً" إلى "جديد"
        updatedOrder.paymentAmount = undefined;
        updatedOrder.paymentMethod = undefined;
        updatedOrder.paymentDate = undefined;
        updatedOrder.paymentNotes = undefined;
        updatedOrder.paymentReceipt = undefined;
        break;

      case 'ordered':
        // حذف أرقا الشحن الدوي عند العودة من "طلب" إلى "مدفوع"
        updatedOrder.internationalShippingNumbers = [];
        // إزالة أرقام الشحن الدولي من الملاحظات
        if (updatedOrder.notes) {
          updatedOrder.notes = updatedOrder.notes
            .split('\n')
            .filter(line => !line.includes('رقم الشحن الدولي:'))
            .join('\n');
        }
        break;

      case 'shipped':
        // حذف أرقام التت��ع عند العودة من "مشحون" إلى "طلب"
        updatedOrder.trackingNumber = undefined;
        updatedOrder.trackingNumbers = [];
        break;

      case 'linked':
        // حذف بيانات الشحن عن العودة من "في الطريق" إلى "شحون"
        // (لا توجد بيانات خاصة لحذفها في هذه المرحلة)
        break;

      case 'arrived':
        // حذف بيانات الوزن والتخزين عند العودة من "وص المخزن" إلى "في الطريق"
        updatedOrder.weight = undefined;
        updatedOrder.storageLocation = undefined;
        break;

      case 'weight_paid':
        // حذف تأكيد دفع الزن عند الودة من "مدفوع الوزن" إلى "وصل المخزن"
        // (لا توجد بيانات خاصة لحذفها)
        break;

      case 'in_delivery':
        // حذف بيانات التسليم عند العودة من "في التوصيل" إلى "مدفوع الوزن"
        if (updatedOrder.notes) {
          updatedOrder.notes = updatedOrder.notes
            .split('\n')
            .filter(line => !line.includes('طريقة التليم:'))
            .join('\n');
        }
        break;

      case 'delivered':
        // حذف تأكد التسليم عند العودة من "تم لتسليم" إلى "في التوصيل"
        // (لا توجد بيانات خاصة لح��فه)
        break;
    }

    onOrderUpdated(updatedOrder);
    setShowBackwardOptions(false);

    const statusLabel = ORDER_STATUS_CONFIG[transition.to]?.label || transition.to;
    alert(`تم العودة إلى حالة: ${statusLabel} وحذف البيانات المرتبطة بالخطوات اللاحقة`);
  };

  // حفظ التعديلات
  const handleSaveEdit = () => {
    if (editedOrder) {
      onOrderUpdated(editedOrder);
      setIsEditing(false);
    }
  };

  // إلغاء التعيل
  const handleCancelEdit = () => {
    setEditedOrder({ ...order });
    setIsEditing(false);
  };

  // فتح نافذة تأكيد الدفع
  const handlePaymentConfirmation = () => {
    setShowPaymentConfirmation(true);
    // تعيين المبلغ المتوقع كافتراضي
    setPaymentAmount(order.finalPrice.toString());
  };

  // تأكيد الدفع مع البيانات
  const handleConfirmPaymentWithDetails = async () => {
    if (!order) return;

    // للتحقق من البيانات المطلوبة
    if (!paymentAmount || !paymentMethod) {
      alert('يرجى ملء جميع البياات المطلوبة');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('يرجى إدخال ملغ صحيح');
      return;
    }

    let receiptUrl = '';
    if (paymentReceipt) {
      // تحويل الصوة إلى base64 للحفظ (في التطبيق الحقيقي، يفضل رفعها لخادم)
      receiptUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(paymentReceipt);
      });
    }

    const updatedOrder: Order = {
      ...order,
      status: 'paid',
      updatedAt: new Date(),
      paymentAmount: amount,
      paymentMethod: paymentMethod,
      paymentReceipt: receiptUrl,
      paymentDate: new Date(),
      paymentNotes: paymentNotes.trim() || undefined,
    };

    onOrderUpdated(updatedOrder);
    setShowPaymentConfirmation(false);

    // إعادة تعيين البيانات
    setPaymentAmount('');
    setPaymentMethod('');
    setPaymentReceipt(null);
    setPaymentNotes('');

    // Generate and show invoice after payment confirmation (فقط للدع الجديد)
    if (!order.paymentAmount) {
      setTimeout(() => {
        handleGenerateInvoice();
      }, 500);
    }

    const message = order.paymentAmount ? 'تم تحديث بيانات لدفع بنجاح' : 'تم تأكيد الدفع بنجا��';
    alert(message);
  };

  // مشاركة الطلب
  const handleShareOrder = async () => {
    if (!order) return;

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
          alert('تم نسخ الرابط بنجاح!');
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

  // توليد الفاتورة أو عض السعر
  const handleGenerateInvoice = () => {
    if (!order) return;

    const invoiceData = {
      orderNumber: order.orderId,
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      customerEmail: order.customer.email,
      storeName: order.store.name,
      products: order.productLinks,
      originalPrice: order.originalPrice,
      originalCurrency: order.originalCurrency,
      finalPrice: order.finalPrice,
      commission: order.commission,
      discount: order.discount,
      paidAmount: order.paymentAmount || 0,
      date: formatDate(new Date()),
      qrCode: `FC-${order.orderId}-${Date.now()}`
    };

    // تديد نوع المستند: عرض سعر للطلبات الجديدة، فاتورة لطلبات المدفوعة
    const isQuote = order.status === 'new';
    const isPartiallyPaid = order.status === 'partially_paid';
    const documentType = isQuote ? 'عض سعر' : isPartiallyPaid ? 'فاتورة مدفوعة جزئياً' : 'فاتورة رسمية';

    // التأكد من عدم طباعة فاتورة لطلب غير مدفوع
    if (!isQuote || order.status === 'new') {
      // إنشء المستند في نافذة جددة للطباعة
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(generateInvoiceHTML(invoiceData, isQuote, isPartiallyPaid));
        printWindow.document.close();

        // إضافة معلج حدث إغلق النا��ذة
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }
    }

    // تحدي ��لة إرسال الفاتورة (فقط للطلبات المدفوعة)
    if (!isQuote && !order.invoiceSent) {
      const updatedOrder = {
        ...order,
        invoiceSent: true,
        updatedAt: new Date()
      };
      onOrderUpdated(updatedOrder);

      // إشعار الستخدم
      setTimeout(() => {
        alert(`ت إنشاء ${documentType} بنجاح وتم تحديث حالة الطلب`);
      }, 500);
    } else if (isQuote) {
      // إشعار لعرض السعر
      setTimeout(() => {
        alert('تم إنشاء عرض السعر بنجاح');
      }, 500);
    }
  };


  // توليد وصل الوزن
  const handleGenerateWeightReceipt = () => {
    if (!order || !order.weight) return;

    const receiptData = {
      orderNumber: order.orderId,
      customerName: order.customer.name,
      weight: order.weight,
      storageLocation: order.storageLocation,
      date: formatDate(new Date())
    };

    const receiptWindow = window.open('', '_blank');
    if (receiptWindow) {
      receiptWindow.document.write(generateWeightReceiptHTML(receiptData));
      receiptWindow.document.close();
    }
  };

  // Generate weight receipt HTML
  const generateWeightReceiptHTML = (data: any) => {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>وصل تسليم - طلب رقم ${data.orderNumber}</title>
        <style>
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; }
          .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #2563eb; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #2563eb; }
          .subtitle { color: #666; margin-top: 5px; }
          .details { margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px; }
          .detail-row:nth-child(even) { background: #f1f5f9; }
          .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
          .signature-area { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }
          .signature-box { text-align: center; }
          .signature-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 30px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="title">وصل تسليم</div>
            <div class="subtitle">FAST COMMAND</div>
          </div>

          <div class="details">
            <div class="detail-row">
              <strong>رقم الطلب:</strong>
              <span>#${data.orderNumber}</span>
            </div>
            <div class="detail-row">
              <strong>سم العميل:</strong>
              <span>${data.customerName}</span>
            </div>
            <div class="detail-row">
              <strong>الوزن:</strong>
              <span>${data.weight} كجم</span>
            </div>
            <div class="detail-row">
              <strong>مكان التخزين:</strong>
              <span>${data.storageLocation}</span>
            </div>
            <div class="detail-row">
              <strong>تاريخ الوصول:</strong>
              <span>${data.date}</span>
            </div>
          </div>

          <div class="signature-area">
            <div class="signature-box">
              <div class="signature-line"></div>
              <p>توقيع الستلم</p>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <p>توقيع ال��سؤول</p>
            </div>
          </div>

          <div class="footer">
            <p>تم إنشء هذا الوصل إلكترنياً في ${data.date}</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;
  };

  const formatDate = (date: Date) => fmtDate(date);
  const formatPrice = (price: number) => formatCurrencyMRU(price);

  const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
    const config = ORDER_STATUS_CONFIG[status];
    const Icon = config.icon;
    
    return (
      <Badge className={cn(
        'flex items-center gap-2 px-3 py-1 text-sm font-medium border',
        config.color,
        config.bgColor
      )}>
        <Icon size={16} />
        {config.label}
      </Badge>
    );
  };

  const currentOrder = isEditing ? editedOrder : order;
  if (!currentOrder) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
        {/* رأس النافذة */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Hash size={20} />
                طلب رقم #{currentOrder.orderId}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                تم الإنشاء في {formatDate(currentOrder.createdAt)}
              </p>
            </div>
            <StatusBadge status={currentOrder.status} />
          </div>
          
          <Button variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
            <X size={20} />
          </Button>
        </div>

        {/* محتوى النافذة */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto modal-content-scrollable space-y-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {/* معلمات العميل والمتجر */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* معلومات الميل */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <User size={16} className="text-blue-500" />
                  معلومات الميل
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <User size={16} className="text-gray-400" />
                  <div>
                    <div className="font-medium">{currentOrder.customer.name}</div>
                    <div className="text-sm text-gray-500">العميل</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-gray-400" />
                  <div>
                    <div className="font-medium">{currentOrder.customer.phone}</div>
                    <div className="text-sm text-gray-500">رقم الهاتف</div>
                  </div>
                </div>
                
                {currentOrder.customer.email && (
                  <div className="flex items-center gap-3">
                    <LinkIcon size={16} className="text-gray-400" />
                    <div>
                      <div className="font-medium">{currentOrder.customer.email}</div>
                      <div className="text-sm text-gray-500">البريد الإلكتروني</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <Package size={16} className="text-gray-400" />
                  <div>
                    <div className="font-medium">{currentOrder.customer.orderCount} طلب</div>
                    <div className="text-sm text-gray-500">إجمالي الطلبات</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* معلومات المتجر */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <StoreIcon size={16} className="text-green-500" />
                  معلومات المتجر
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <StoreIcon size={16} className="text-gray-400" />
                  <div>
                    <div className="font-medium">{currentOrder.store.name}</div>
                    <div className="text-sm text-gray-500">سم المتجر</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-gray-400" />
                  <div>
                    <div className="font-medium">{currentOrder.store.country}</div>
                    <div className="text-sm text-gray-500">البلد</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <DollarSign size={16} className="text-gray-400" />
                  <div>
                    <div className="font-medium">{currentOrder.store.currency}</div>
                    <div className="text-sm text-gray-500">العملة</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* تفاصيل المنتجات */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-medium flex items-center gap-2">
                <Package size={16} className="text-purple-500" />
                تفاصيل المنتجات ({currentOrder.productCount} منتج)
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentOrder.productLinks.map((link, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-start gap-3">
                      <LinkIcon size={16} className="text-blue-500 mt-1" />
                      <div className="flex-1">
                        <div className="text-sm text-blue-600 dark:text-blue-400 break-words">
                          {link.url}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                          <span>الكمية: {link.quantity}</span>
                          {link.notes && <span>ملاحظة: {link.notes}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* تفاصيل السعر */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-medium flex items-center gap-2">
                <DollarSign size={16} className="text-green-500" />
                تفاصيل السعر
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">السعر الأصلي:</span>
                  <span className="font-medium">
                    {currentOrder.originalPrice} {currentOrder.originalCurrency}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">العمولة:</span>
                  <span className="font-medium text-blue-600">
                    {formatPrice(currentOrder.commission)}
                  </span>
                </div>

                {currentOrder.discount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">الخصم:</span>
                    <span className="font-medium text-red-600">
                      -{formatPrice(currentOrder.discount)}
                    </span>
                  </div>
                )}

                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-medium text-lg">السعر النهائي:</span>
                  <span className="font-bold text-xl text-green-600">
                    {formatPrice(currentOrder.finalPrice)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* معلومات الدفع */}
          {currentOrder.status !== 'new' && currentOrder.paymentAmount && (
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <CreditCard size={16} className="text-green-500" />
                  معلومات الدع
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">المبلغ المستلم:</span>
                    <span className="font-medium text-green-600">
                      {formatPrice(currentOrder.paymentAmount)}
                    </span>
                  </div>

                  {/* عرض المبلغ المتبقي للدفع ��لجزئي */}
                  {currentOrder.status === 'partially_paid' && (
                    <div className="flex justify-between items-center bg-yellow-50 p-3 rounded-lg border">
                      <span className="text-gray-600">المبلغ المتبقي:</span>
                      <span className="font-medium text-yellow-700">
                        {formatPrice(currentOrder.finalPrice - currentOrder.paymentAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">وسيلة الدفع:</span>
                    <span className="font-medium">
                      {currentOrder.paymentMethod === 'cash' && 'نقداً'}
                      {currentOrder.paymentMethod === 'bank_transfer' && 'تحويل بنكي'}
                      {currentOrder.paymentMethod === 'mobile_money' && 'محفظة إلكترونية'}
                      {currentOrder.paymentMethod === 'card' && 'بطاقة ائتمان/خم'}
                      {currentOrder.paymentMethod === 'other' && 'وسيلة أخرى'}
                    </span>
                  </div>

                  {currentOrder.paymentDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">تاريخ الدفع:</span>
                      <span className="font-medium">
                        {formatDate(currentOrder.paymentDate)}
                      </span>
                    </div>
                  )}

                  {/* مقارنة المبالغ */}
                  {currentOrder.paymentAmount !== currentOrder.finalPrice && (
                    <div className={cn(
                      "p-3 rounded-lg flex items-center gap-2",
                      currentOrder.paymentAmount > currentOrder.finalPrice
                        ? "bg-green-50 text-green-800"
                        : "bg-orange-50 text-orange-800"
                    )}>
                      <AlertCircle size={16} />
                      <div className="text-sm arabic-safe">
                        {currentOrder.paymentAmount > currentOrder.finalPrice ? (
                          <>زيادة ي الدفع: {formatPrice(currentOrder.paymentAmount - currentOrder.finalPrice)}</>
                        ) : (
                          <>نقص في الدفع: {formatPrice(currentOrder.finalPrice - currentOrder.paymentAmount)}</>
                        )}
                      </div>
                    </div>
                  )}

                  {/* صورة الإيصل */}
                  <div className="border-t pt-3">
                    <label className="text-sm font-medium text-gray-600 mb-2 block">إيصل الدفع:</label>
                    {currentOrder.paymentReceipt ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={currentOrder.paymentReceipt}
                          alt="إيصال الدفع"
                          className="w-20 h-20 object-cover rounded border cursor-pointer"
                          onClick={() => window.open(currentOrder.paymentReceipt, '_blank')}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(currentOrder.paymentReceipt, '_blank')}
                          className="arabic-safe"
                        >
                          عرض الصورة
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 arabic-safe">لم يتم إرفاق إيصال</div>
                    )}
                  </div>

                  {/* ملحظات الدفع */}
                  {currentOrder.paymentNotes && (
                    <div className="border-t pt-3">
                      <label className="text-sm font-medium text-gray-600 mb-1 block">ملاحظات الدفع:</label>
                      <p className="text-sm text-gray-700">{currentOrder.paymentNotes}</p>
                    </div>
                  )}

                  {/* أزرار إدرة الدفع */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPaymentAmount(currentOrder.paymentAmount?.toString() || '');
                          setPaymentMethod(currentOrder.paymentMethod || '');
                          setPaymentNotes(currentOrder.paymentNotes || '');
                          setShowPaymentConfirmation(true);
                        }}
                        className="arabic-safe"
                      >
                        <Edit size={16} className="ml-1" />
                        تعديل بيانات الدفع
                      </Button>

                      {/*  تحديث حالة الدفع يدواً */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowStatusChange(true)}
                        className="arabic-safe border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <DollarSign size={16} className="ml-1" />
                        تحديث حالة الدفع
                      </Button>
                    </div>

                    {/* معلومات إضافية للطلبات المدفوعة جزئياً */}
                    {currentOrder.status === 'partially_paid' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle size={16} className="text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800 arabic-safe">
                            خيارات للطلب المدفوع جزئياً
                          </span>
                        </div>
                        <div className="text-xs text-yellow-700 arabic-safe">
                          يمكنك إم إكمال الدفع المتبقي أو تخطي الدفع والمتابعة للمرحلة التالية من خلال زر "لمرحلة التالية" أعلاه.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* معلومات ا��شحن والتخزين */}
          {(currentOrder.trackingNumber || currentOrder.trackingNumbers?.length || currentOrder.internationalShippingNumbers?.length || currentOrder.weight || currentOrder.storageLocation) && (
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Truck size={16} className="text-orange-500" />
                  معلومات لشحن التخزين
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* أرقام الشحن الدولي المتعددة */}
                {currentOrder.internationalShippingNumbers?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Package size={16} className="text-blue-400 mt-1" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-2">أرقام الشحن الدولي</div>
                      <div className="space-y-1">
                        {currentOrder.internationalShippingNumbers.map((number, index) => (
                          <div key={index} className="font-mono text-sm bg-blue-50 px-2 py-1 rounded border">
                            {number}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* أرام التتبع المتعددة */}
                {currentOrder.trackingNumbers?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Truck size={16} className="text-orange-400 mt-1" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-2">أرقام التتبع لدولي</div>
                      <div className="space-y-1">
                        {currentOrder.trackingNumbers.map((number, index) => (
                          <div key={index} className="font-mono text-sm bg-orange-50 px-2 py-1 rounded border">
                            {number}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* رقم التتبع الواحد (للتوافق مع انسخة السابقة) */}
                {currentOrder.trackingNumber && !currentOrder.trackingNumbers?.length && (
                  <div className="flex items-center gap-3">
                    <Truck size={16} className="text-gray-400" />
                    <div>
                      <div className="font-medium font-mono">{currentOrder.trackingNumber}</div>
                      <div className="text-sm text-gray-500">رقم التتبع</div>
                    </div>
                  </div>
                )}

                {currentOrder.weight && (
                  <div className="flex items-center gap-3">
                    <Weight size={16} className="text-gray-400" />
                    <div>
                      <div className="font-medium">{currentOrder.weight} كجم</div>
                      <div className="text-sm text-gray-500">الوزن</div>
                    </div>
                  </div>
                )}

                {currentOrder.storageLocation && (
                  <div className="flex items-center gap-3">
                    <Archive size={16} className="text-gray-400" />
                    <div>
                      <div className="font-medium">{currentOrder.storageLocation}</div>
                      <div className="text-sm text-gray-500">مكان التخزين</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ملاحظات */}
          {currentOrder.notes && (
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <FileText size={16} className="text-gray-500" />
                  ملاحظات
                </h3>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300">{currentOrder.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* أزرار الإجاءات */}
        {isEditing ? (
          <div className="flex-shrink-0 modal-footer flex items-center justify-end gap-2 p-4 sm:p-6 bg-gray-50 dark:bg-gray-900">
            <Button variant="outline" onClick={handleCancelEdit} className="arabic-safe">
              إلغاء
            </Button>
            <Button onClick={handleSaveEdit} className="flex items-center gap-2 arabic-safe">
              <Save size={16} />
              حفظ التغييرا
            </Button>
          </div>
        ) : (
          <div className="flex-shrink-0 modal-footer p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            {/* الأ��رار في شاشة الهاتف - أزرار أ��اسية منمة */}
            <div className="block sm:hidden space-y-3">
              {/* زر تأكيد الدفع للطلبات الجديدة */}

              {/* زر التحديث الذكي الشامل */}
              {(availableTransitions.length > 0 || availableBackwardTransitions.length > 0) && (
                <div className="space-y-2">
                  {/* زر التقدم للمرحلة التالية */}
                  {availableTransitions.length > 0 && (
                    <Button
                      onClick={() => setShowStatusChange(true)}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 arabic-safe py-3 relative overflow-hidden",
                        hasAutoTransition
                          ? "bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                      )}
                    >
                      {nextTransition?.icon && <nextTransition.icon size={18} />}
                      <span className="font-medium">
                        {hasAutoTransition
                          ? `تقدم إلى: ${ORDER_STATUS_CONFIG[nextTransition.to].label}`
                          : "المرحلة اتالية"
                        }
                      </span>
                      {hasAutoTransition && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                      )}
                    </Button>
                  )}

                  {/* زر العودة لللف */}
                  {availableBackwardTransitions.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setShowBackwardOptions(true)}
                      className="w-full flex items-center justify-center gap-2 arabic-safe py-3 border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <Edit size={16} />
                      تعديل أو العودة لمرحلة سبقة
                    </Button>
                  )}
                </div>
              )}

              {/* أزرار العملات الأساسية */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={handleGenerateInvoice}
                  className={cn(
                    "flex items-center justify-center gap-1 arabic-safe py-3",
                    currentOrder.status === 'new'
                      ? 'border-blue-400 text-blue-700'
                      : currentOrder.invoiceSent
                        ? 'border-green-400 text-green-700'
                        : 'border-purple-400 text-purple-700'
                  )}
                >
                  <FileText size={16} />
                  <span className="text-xs">
                    {currentOrder.status === 'new'
                      ? 'عرض سر'
                      : currentOrder.invoiceSent
                        ? 'مرسلة ✓'
                        : 'فاتورة'
                    }
                  </span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-1 arabic-safe py-3"
                >
                  <Printer size={16} />
                  <span className="text-xs">طباعة</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleShareOrder}
                  className="flex items-center justify-center gap-1 arabic-safe py-3"
                >
                  <Share2 size={16} />
                  <span className="text-xs">مشاركة</span>
                </Button>
              </div>

              {/* زر الإغلاق */}
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full arabic-safe py-3"
              >
                إغلاق
              </Button>
            </div>

            {/* الأزرار في الشاشات الكبيرة - أزرار أساسية منظم */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex gap-2">

                {/* زر التحديث الذكي الشامل */}
                {(availableTransitions.length > 0 || availableBackwardTransitions.length > 0) && (
                  <div className="flex gap-2">
                    {/* زر التق للمرحلة التالية */}
                    {availableTransitions.length > 0 && (
                      <Button
                        onClick={() => setShowStatusChange(true)}
                        className={cn(
                          "flex items-center gap-2 arabic-safe relative overflow-hidden",
                          hasAutoTransition
                            ? "bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                        )}
                        title={nextTransition?.description || "المرحلة التالة في معالج الطلب"}
                      >
                        {nextTransition?.icon && <nextTransition.icon size={16} />}
                        <span className="font-medium">
                          {hasAutoTransition
                            ? `تقد إلى: ${ORDER_STATUS_CONFIG[nextTransition.to].label}`
                            : "المرحلة التالية"
                          }
                        </span>
                        {hasAutoTransition && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                        )}
                      </Button>
                    )}

                    {/* زر اعودة للخلف */}
                    {availableBackwardTransitions.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setShowBackwardOptions(true)}
                        className="flex items-center gap-2 arabic-safe border-amber-300 text-amber-700 hover:bg-amber-50"
                        title="العودة لمرحلة سابقة لتصحيح البيانات"
                      >
                        <Edit size={16} />
                        <span className="text-sm">تعديل</span>
                      </Button>
                    )}
                  </div>
                )}

                {/* أزرار العمليات لأساسية */}
                <Button
                  variant="outline"
                  onClick={handleGenerateInvoice}
                  className={cn(
                    "flex items-center gap-2 arabic-safe",
                    currentOrder.status === 'new'
                      ? 'border-blue-500 text-blue-700 hover:bg-blue-50'
                      : currentOrder.invoiceSent
                        ? 'border-green-500 text-green-700 hover:bg-green-50'
                        : 'border-purple-500 text-purple-700 hover:bg-purple-50'
                  )}
                  title={currentOrder.status === 'new'
                    ? 'إنشاء وطباعة عرض سعر للعميل'
                    : currentOrder.invoiceSent
                      ? 'إعادة طباعة ���لفاتورة المرسلة'
                      : 'إنشاء اتورة رسمية وتحديث حالة الطلب'
                  }
                >
                  <FileText size={16} />
                  {currentOrder.status === 'new'
                    ? 'عرض سعر'
                    : currentOrder.invoiceSent
                      ? 'فاتورة مرسلة'
                      : 'فاتورة رسمية'
                  }
                  {currentOrder.invoiceSent && <CheckCircle size={14} className="text-green-500" />}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 arabic-safe"
                >
                  <Printer size={16} />
                  طباعة
                </Button>

                <Button
                  variant="outline"
                  onClick={handleShareOrder}
                  className="flex items-center gap-2 arabic-safe"
                >
                  <Share2 size={16} />
                  مشاركة
                </Button>
              </div>

              <Button variant="outline" onClick={onClose} className="arabic-safe">
                إغلاق
              </Button>
            </div>
          </div>
        )}

        {/* نافذة تأكيد الدفع */}
        {showPaymentConfirmation && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200">
              <CardHeader>
                <h3 className="font-medium arabic-safe">
                  {currentOrder.paymentAmount ? 'تعديل بيانات الدفع' : 'تأكيد الدفع'}
                </h3>
                <div className="text-sm text-gray-600 arabic-safe flex items-center gap-2">
                  <span>طلب رقم:</span>
                  <span className="font-medium">#{currentOrder.orderId}</span>
                  {currentOrder.paymentAmount && (
                    <Badge className="bg-green-100 text-green-800">مدفوع</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-800 arabic-safe mb-1">المبلغ المطلوب:</div>
                  <div className="text-lg font-bold text-blue-900">{formatPrice(currentOrder.finalPrice)}</div>
                  {currentOrder.paymentAmount && (
                    <div className="text-xs text-blue-600 mt-1 arabic-safe">
                      تم دفع: {formatPrice(currentOrder.paymentAmount)} سابقاً
                    </div>
                  )}
                </div>

                {/* المبلغ المستلم */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                    المبلغ المسلم فعلياً <span className="text-red-500">*</span>
                  </label>
                  <NumericInput
                    value={paymentAmount}
                    onChange={(v) => setPaymentAmount(v)}
                    className="text-center font-medium"
                  />
                  <p className="text-xs text-gray-500 mt-1 arabic-safe">
                    المبلغ الذي م استلامه من العميل بالأوقية الموريتانية
                  </p>
                </div>

                {/* وسيلة الدفع */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                    وس���لة الدف <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={(e) => setPaymentMethod('cash')}
                        className="text-green-600"
                      />
                      <DollarSign size={16} className="text-green-600" />
                      <span className="arabic-safe">نقداً</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bank_transfer"
                        checked={paymentMethod === 'bank_transfer'}
                        onChange={(e) => setPaymentMethod('bank_transfer')}
                        className="text-blue-600"
                      />
                      <CreditCard size={16} className="text-blue-600" />
                      <span className="arabic-safe">تحويل بنكي</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="mobile_money"
                        checked={paymentMethod === 'mobile_money'}
                        onChange={(e) => setPaymentMethod('mobile_money')}
                        className="text-purple-600"
                      />
                      <Phone size={16} className="text-purple-600" />
                      <span className="arabic-safe">محفظة إلكترونية</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={paymentMethod === 'card'}
                        onChange={(e) => setPaymentMethod('card')}
                        className="text-indigo-600"
                      />
                      <CreditCard size={16} className="text-indigo-600" />
                      <span className="arabic-safe">بطاقة ائتمان/خصم</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="other"
                        checked={paymentMethod === 'other'}
                        onChange={(e) => setPaymentMethod('other')}
                        className="text-gray-600"
                      />
                      <FileText size={16} className="text-gray-600" />
                      <span className="arabic-safe">وسيلة أخرى</span>
                    </label>
                  </div>
                </div>

                {/* إراق صورة اإيصال */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                    صورة اإيصال أو إثبات الفع
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPaymentReceipt(file);
                        }
                      }}
                      className="hidden"
                      id="paymentReceipt"
                    />
                    <label
                      htmlFor="paymentReceipt"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      {paymentReceipt ? (
                        <div className="text-green-600">
                          <CheckCircle size={32} />
                          <p className="text-sm font-medium">{paymentReceipt.name}</p>
                        </div>
                      ) : (
                        <div className="text-gray-400">
                          <Package size={32} />
                          <p className="text-sm">اضغط لإرفاق صرة</p>
                        </div>
                      )}
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 arabic-safe">
                    يفضل إرفاق صورة الإيصال أو إثبات الدفع (اختياري)
                  </p>
                </div>

                {/* ملاحظات إضافية */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                    ملاحظات إضافية (اختياري)
                  </label>
                  <Input
                    placeholder="أي ملاحظات ول عمية الدفع..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>

                {/* مقارنة المبالغ */}
                {paymentAmount && parseFloat(paymentAmount) !== currentOrder.finalPrice && (
                  <div className={cn(
                    "p-3 rounded-lg flex items-center gap-2",
                    parseFloat(paymentAmount) > currentOrder.finalPrice
                      ? "bg-green-50 text-green-800"
                      : "bg-orange-50 text-orange-800"
                  )}>
                    <AlertCircle size={16} />
                    <div className="text-sm arabic-safe">
                      {parseFloat(paymentAmount) > currentOrder.finalPrice ? (
                        <>المبلغ المستلم أكبر من المطلوب بـ {formatPrice(parseFloat(paymentAmount) - currentOrder.finalPrice)}</>
                      ) : (
                        <>المبلغ المستلم أقل م المطلوب بـ {formatPrice(currentOrder.finalPrice - parseFloat(paymentAmount))}</>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPaymentConfirmation(false);
                      setPaymentAmount('');
                      setPaymentMethod('');
                      setPaymentReceipt(null);
                      setPaymentNotes('');
                    }}
                    className="flex-1 arabic-safe"
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleConfirmPaymentWithDetails}
                    disabled={!paymentAmount || !paymentMethod}
                    className="flex-1 bg-green-600 hover:bg-green-700 arabic-safe"
                  >
                    <CheckCircle size={16} className="ml-1" />
                    {currentOrder.paymentAmount ? 'حفظ التعديلات' : 'تأكيد الدف'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* نافذة العودة للخلف */}
        {showBackwardOptions && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
            <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200">
              <CardHeader>
                <h3 className="font-medium arabic-safe">العودة لمرحلة سابقة</h3>
                <div className="text-sm text-gray-600 arabic-safe flex items-center gap-2">
                  <span>الحالة الحالية:</span>
                  <StatusBadge status={currentOrder.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg arabic-safe">
                  <AlertCircle size={14} className="inline ml-1" />
                  العودة للخلف ستتيح لك تعديل البيانات في المرحلة السابقة
                </p>

                <div className="space-y-2">
                  <label className="text-sm font-medium">اختر المرحلة للعودة إليها:</label>
                  {availableBackwardTransitions.map((transition) => {
                    const Icon = ORDER_STATUS_CONFIG[transition.to].icon;
                    return (
                      <div
                        key={`backward-${transition.from}-${transition.to}`}
                        className="p-4 border border-amber-200 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:border-amber-400 hover:bg-amber-50"
                        onClick={() => handleBackwardTransition(transition)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center',
                              ORDER_STATUS_CONFIG[transition.to].bgColor
                            )}>
                              <Icon size={20} className={ORDER_STATUS_CONFIG[transition.to].color} />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold arabic-safe">{transition.label}</span>
                              <StatusBadge status={transition.to} />
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 arabic-safe">
                              {transition.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowBackwardOptions(false)}
                    className="flex-1 arabic-safe"
                  >
                    إلغاء
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* نافذة تحديث احالة */}
        {showStatusChange && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
            <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200">
              <CardHeader>
                <h3 className="font-medium arabic-safe">تحديث حالة الطلب</h3>
                <div className="text-sm text-gray-600 arabic-safe flex items-center gap-2">
                  <span>احالة الحالية:</span>
                  <StatusBadge status={currentOrder.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">اختر الحال الجديدة:</label>
                  {availableTransitions.map((transition) => {
                  const Icon = ORDER_STATUS_CONFIG[transition.to].icon;
                  const isInternationalShipping = transition.requiresInput === 'tracking';
                  const isWarehouseArrival = transition.requiresInput === 'weight_storage';

                  return (
                    <div
                      key={`forward-${transition.from}-${transition.to}`}
                      className={cn(
                        'p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
                        selectedTransition?.to === transition.to
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )}
                      onClick={() => setSelectedTransition(transition)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            ORDER_STATUS_CONFIG[transition.to].bgColor
                          )}>
                            <Icon size={20} className={ORDER_STATUS_CONFIG[transition.to].color} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold arabic-safe">{transition.label}</span>
                            <StatusBadge status={transition.to} />
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 arabic-safe">
                            {transition.description}
                          </p>

                          {/* عر المتطلبت الإضافة */}
                          {isInternationalShipping && (
                            <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                              <Truck size={12} />
                              <span className="arabic-safe">يتطلب رقم تتبع دولي</span>
                            </div>
                          )}

                          {transition.requiresInput === 'payment_confirmation' && (
                            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                              <CreditCard size={12} />
                              <span className="arabic-safe">يتطلب تفاصيل الدفع</span>
                            </div>
                          )}

                          {transition.requiresInput === 'international_shipping' && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              <Package size={12} />
                              <span className="arabic-safe">يتطلب ق الشحن الولي</span>
                            </div>
                          )}

                          {isWarehouseArrival && (
                            <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                              <Weight size={12} />
                              <span className="arabic-safe">يتطلب بيانات الوزن والتخين</span>
                            </div>
                          )}

                          {transition.requiresInput === 'delivery_choice' && (
                            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                              <Truck size={12} />
                              <span className="arabic-safe">يتطلب اختيار طريقة التسليم</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>

                {/* حقول إدخال إضافية ��كية */}
                {selectedTransition?.requiresInput === 'payment_confirmation' && (
                  <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard size={16} className="text-green-600" />
                      <h4 className="font-medium text-green-800 dark:text-green-200 arabic-safe">
                        تفاصي الدفع
                      </h4>
                    </div>

                    <div className="space-y-3">
                      {/* المبلغ المطلوب */}
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm text-blue-800 arabic-safe mb-1">المبلغ المطلوب:</div>
                        <div className="text-lg font-bold text-blue-900">{formatPrice(currentOrder.finalPrice)}</div>
                        {currentOrder.paymentAmount && currentOrder.paymentAmount > 0 && (
                          <div className="text-xs text-blue-600 mt-1 arabic-safe">
                            تم دفع: {formatPrice(currentOrder.paymentAmount)} سابقاً
                          </div>
                        )}
                      </div>

                      {/* المبلغ المتب��ي للدفع الجزئي */}
                      {currentOrder.status === 'partially_paid' && (
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          <div className="text-sm text-yellow-800 arabic-safe mb-1">المبلغ المبقي للدفع:</div>
                          <div className="text-lg font-bold text-yellow-900">
                            {formatPrice(currentOrder.finalPrice - currentOrder.paymentAmount)}
                          </div>
                        </div>
                      )}

                      {/* المبلغ المستلم */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                          {currentOrder.status === 'partially_paid' ? 'المبلغ الجديد المدفوع' : 'المبلغ المستلم فعلياً'} <span className="text-red-500">*</span>
                        </label>
                        <NumericInput
                          value={paymentAmount}
                          onChange={(v) => setPaymentAmount(v)}
                          className="text-center font-medium"
                        />
                      </div>

                      {/* وسيلة الفع */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                          وسيلة الدفع <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                          <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="cash"
                              checked={paymentMethod === 'cash'}
                              onChange={(e) => setPaymentMethod('cash')}
                              className="text-green-600"
                            />
                            <DollarSign size={16} className="text-green-600" />
                            <span className="arabic-safe text-sm">نقداً</span>
                          </label>

                          <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="bank_transfer"
                              checked={paymentMethod === 'bank_transfer'}
                              onChange={(e) => setPaymentMethod('bank_transfer')}
                              className="text-blue-600"
                            />
                            <CreditCard size={16} className="text-blue-600" />
                            <span className="arabic-safe text-sm">تحويل بنكي</span>
                          </label>

                          <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="mobile_money"
                              checked={paymentMethod === 'mobile_money'}
                              onChange={(e) => setPaymentMethod('mobile_money')}
                              className="text-purple-600"
                            />
                            <Phone size={16} className="text-purple-600" />
                            <span className="arabic-safe text-sm">محفظة إلكت��ونية</span>
                          </label>

                          <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="other"
                              checked={paymentMethod === 'other'}
                              onChange={(e) => setPaymentMethod('other')}
                              className="text-gray-600"
                            />
                            <FileText size={16} className="text-gray-600" />
                            <span className="arabic-safe text-sm">وسيلة أخرى</span>
                          </label>
                        </div>
                      </div>

                      {/* إرفاق صورة الإيصال */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                          صورة الإيصال (اختياري)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setPaymentReceipt(file);
                              }
                            }}
                            className="hidden"
                            id="smartPaymentReceipt"
                          />
                          <label
                            htmlFor="smartPaymentReceipt"
                            className="cursor-pointer flex flex-col items-center gap-1"
                          >
                            {paymentReceipt ? (
                              <div className="text-green-600">
                                <CheckCircle size={24} />
                                <p className="text-xs font-medium">{paymentReceipt.name}</p>
                              </div>
                            ) : (
                              <div className="text-gray-400">
                                <Package size={24} />
                                <p className="text-xs">اضغط لإرفاق صورة</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* ملاحظات */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                          ملاحظات (اختياري)
                        </label>
                        <Input
                          placeholder="ملاحظت حول الدفع..."
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                        />
                      </div>

                      {/* ��قارنة المبا��غ */}
                      {paymentAmount && (
                        <div>
                          {(() => {
                            const currentPayment = parseFloat(paymentAmount);
                            const previousPayment = currentOrder.paymentAmount || 0;
                            const totalPayment = previousPayment + currentPayment;
                            const totalRequired = currentOrder.finalPrice;

                            if (totalPayment === totalRequired) {
                              return (
                                <div className="p-2 rounded text-xs flex items-center gap-1 bg-green-100 text-green-800">
                                  <CheckCircle size={12} />
                                  <span className="arabic-safe">سيت دفع المبلغ بالكامل</span>
                                </div>
                              );
                            } else if (totalPayment > totalRequired) {
                              return (
                                <div className="p-2 rounded text-xs flex items-center gap-1 bg-blue-100 text-blue-800">
                                  <AlertCircle size={12} />
                                  <span className="arabic-safe">
                                    زيادة في الدفع: {formatPrice(totalPayment - totalRequired)}
                                  </span>
                                </div>
                              );
                            } else {
                              return (
                                <div className="p-2 rounded text-xs flex items-center gap-1 bg-yellow-100 text-yellow-800">
                                  <AlertCircle size={12} />
                                  <span className="arabic-safe">
                                    سيبقى مبلغ: {formatPrice(totalRequired - totalPayment)} (دفع جزئي)
                                  </span>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-100 p-2 rounded">
                        <CheckCircle size={12} />
                        <span className="arabic-safe">
                          سيتم تأكيد الدفع وإنتاج الفاتور لقائياً
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTransition?.requiresInput === 'international_shipping' && (
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Package size={16} className="text-blue-600" />
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 arabic-safe">
                        رقم الشحن الدولي
                      </h4>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                          إضافة رقم شن دلي:
                        </label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="مثال: SH123456789, INT-456789, إلخ..."
                            value={internationalShipping}
                            onChange={(e) => setInternationalShipping(e.target.value)}
                            className="font-mono"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && internationalShipping.trim()) {
                                setInternationalShippingList([...internationalShippingList, internationalShipping.trim()]);
                                setInternationalShipping('');
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              if (internationalShipping.trim()) {
                                setInternationalShippingList([...internationalShippingList, internationalShipping.trim()]);
                                setInternationalShipping('');
                              }
                            }}
                            disabled={!internationalShipping.trim()}
                            size="sm"
                            className="arabic-safe"
                          >
                            إضافة
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 arabic-safe">
                          اكتب الرم واضغط Enter أو زر الإضافة. يمكن إضافة عدة أرقام.
                        </p>
                      </div>

                      {/* عض الأرقام المضافة */}
                      {internationalShippingList.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                            أرقام الشحن لدولي المضافة:
                          </label>
                          <div className="space-y-1">
                            {internationalShippingList.map((number, index) => (
                              <div key={index} className="flex items-center justify-between bg-blue-50 p-2 rounded border">
                                <span className="font-mono text-sm">{number}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setInternationalShippingList(internationalShippingList.filter((_, i) => i !== index));
                                  }}
                                  className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-100 p-2 rounded">
                        <Package size={12} />
                        <span className="arabic-safe">
                          أرقام الشحن الدولي مطلوبة لبدء تتبع الطلب دولياً
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTransition?.requiresInput === 'tracking' && (
                  <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Truck size={16} className="text-orange-600" />
                      <h4 className="font-medium text-orange-800 dark:text-orange-200 arabic-safe">
                        بيانات الشحن الدوي
                      </h4>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                          إضافة رقم تبع دولي:
                        </label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="US123456789, LP123456789CN, إلخ..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="font-mono"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && inputValue.trim()) {
                                setTrackingNumberList([...trackingNumberList, inputValue.trim()]);
                                setInputValue('');
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              if (inputValue.trim()) {
                                setTrackingNumberList([...trackingNumberList, inputValue.trim()]);
                                setInputValue('');
                              }
                            }}
                            disabled={!inputValue.trim()}
                            size="sm"
                            className="arabic-safe"
                          >
                            إضافة
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 arabic-safe">
                          اكتب الرقم واضط Enter أو زر الإضاف. يمكن إضافة عدة أرقام تتبع.
                        </p>
                      </div>

                      {/* عرض أرقام التتبع المضافة */}
                      {trackingNumberList.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                            أرقا التتبع المضفة:
                          </label>
                          <div className="space-y-1">
                            {trackingNumberList.map((number, index) => (
                              <div key={index} className="flex items-center justify-between bg-orange-50 p-2 rounded border">
                                <span className="font-mono text-sm">{number}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setTrackingNumberList(trackingNumberList.filter((_, i) => i !== index));
                                  }}
                                  className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-100 p-2 rounded">
                        <AlertCircle size={12} />
                        <span className="arabic-safe">
                          أرقام التتبع ضرورية لمتابعة لشحة دوليا
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTransition?.requiresInput === 'weight_storage' && (
                  <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Weight size={16} className="text-purple-600" />
                      <h4 className="font-medium text-purple-800 dark:text-purple-200 arabic-safe">
                        بيانات وصول المخزن
                      </h4>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                          الوزن لفعلي (كيلوجرام):
                        </label>
                        <NumericInput
                          value={inputValue}
                          onChange={(v) => setInputValue(v)}
                          className="text-center font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                          رقم/موقع التخزي:
                        </label>
                        <Input
                          placeholder="الدرج A-15, الرف B-23, إلخ..."
                          value={storageLocation}
                          onChange={(e) => setStorageLocation(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1 arabic-safe">
                          موقع تخزين الطلب في المخزن
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-100 p-2 rounded">
                        <Package size={12} />
                        <span className="arabic-safe">
                          سيتم حساب رسوم الوزن بناء على الزن المدخل
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTransition?.requiresInput === 'remaining_payment_with_weight' && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard size={16} className="text-yellow-600" />
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-200 arabic-safe no-text-break">
                        دفع المتبقي مع رسوم الوزن
                      </h4>
                    </div>

                    <div className="space-y-4">
                      {/* معلومات المبالغ */}
                      <div className="bg-white p-3 rounded border">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="arabic-safe no-text-break">إجمالي المطلوب:</span>
                            <span className="font-bold text-green-600 numeric">{formatPrice(order.finalPrice)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="arabic-safe no-text-break">المدفوع سابقاً:</span>
                            <span className="font-medium text-blue-600 numeric">{formatPrice(order.paymentAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="arabic-safe no-text-break font-medium">المتبقي:</span>
                            <span className="font-bold text-red-600 numeric">{formatPrice(order.finalPrice - (order.paymentAmount || 0))}</span>
                          </div>
                        </div>
                      </div>

                      {/* مبل الدفع */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe no-text-break">
                          المبلغ المدفوع الآن (أوقية):
                        </label>
                        <NumericInput
                          value={paymentAmount}
                          onChange={(v) => setPaymentAmount(v)}
                          className="text-center font-bold text-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1 arabic-safe no-text-break">
                          ادخل المبلغ المستلم من العميل
                        </p>
                      </div>

                      {/* وسيلة الدفع */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe no-text-break">
                          وسيلة الدفع:
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 arabic-safe no-text-break"
                        >
                          <option value="">اختر وسيلة الدفع</option>
                          <option value="cash">نقداً</option>
                          <option value="bank_transfer">تحويل بنكي</option>
                          <option value="mobile_money">محفظة إلكترونية</option>
                          <option value="card">بطاقة ائتمان</option>
                          <option value="other">أخرى</option>
                        </select>
                      </div>

                      {/* بيانات الوزن */}
                      <div className="border-t pt-4">
                        <h5 className="font-medium text-gray-800 mb-3 arabic-safe no-text-break">بيانات الوزن والتخزين:</h5>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe no-text-break">
                              الوزن العلي (كجم):
                            </label>
                            <NumericInput
                          value={inputValue}
                          onChange={(v) => setInputValue(v)}
                          className="text-center font-medium"
                        />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe no-text-break">
                              موقع التخزين:
                            </label>
                            <Input
                              placeholder="الدرج A-15"
                              value={storageLocation}
                              onChange={(e) => setStorageLocation(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* صورة لإيصال */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe no-text-break">
                          صورة إيصا الدفع (ختياري):
                        </label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setPaymentReceipt(e.target.files?.[0] || null)}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold"
                        />
                      </div>

                      {/* ملاحظات */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe no-text-break">
                          ملاحظات إضافية (اختياري):
                        </label>
                        <Input
                          placeholder="أي ملاحظات عن الدفع..."
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                        <AlertCircle size={12} />
                        <span className="arabic-safe no-text-break">
                          سيم تحديد حالة الطلب بناءً على المبلغ المدفوع إجمالياً
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTransition?.requiresInput === 'delivery_choice' && (
                  <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Truck size={16} className="text-green-600" />
                      <h4 className="font-medium text-green-800 dark:text-green-200 arabic-safe">
                        طريقة التسليم
                      </h4>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                          اختر طريقة التسليم:
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="delivery"
                              value="delivery"
                              checked={deliveryChoice === 'delivery'}
                              onChange={(e) => setDeliveryChoice('delivery')}
                              className="text-green-600"
                            />
                            <Truck size={16} className="text-green-600" />
                            <span className="arabic-safe">توصيل منزلي</span>
                          </label>
                          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="delivery"
                              value="pickup"
                              checked={deliveryChoice === 'pickup'}
                              onChange={(e) => setDeliveryChoice('pickup')}
                              className="text-green-600"
                            />
                            <StoreIcon size={16} className="text-green-600" />
                            <span className="arabic-safe">استلام من المعرض</span>
                          </label>
                        </div>
                      </div>

                      {deliveryChoice && (
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 arabic-safe">
                            ملاحظات إضافية (اختيار):
                          </label>
                          <Input
                            placeholder="أي ملاظات خاصة بالتسليم..."
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-100 p-2 rounded">
                        <CheckCircle size={12} />
                        <span className="arabic-safe">
                          سيت إشعار العميل بريقة السليم المختارة
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowStatusChange(false);
                      setSelectedTransition(null);
                      setInputValue('');
                      setStorageLocation(currentOrder.storageLocation || '');
                    }}
                    className="flex-1 arabic-safe"
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleSmartStatusTransition}
                    disabled={!selectedTransition ||
                      (selectedTransition.requiresInput === 'payment_confirmation' && (!paymentAmount || !paymentMethod)) ||
                      (selectedTransition.requiresInput === 'international_shipping' && internationalShippingList.length === 0) ||
                      (selectedTransition.requiresInput === 'tracking' && trackingNumberList.length === 0) ||
                      (selectedTransition.requiresInput === 'weight_storage' && (!inputValue || !storageLocation.trim())) ||
                      (selectedTransition.requiresInput === 'delivery_choice' && !deliveryChoice) ||
                      (selectedTransition.requiresInput === 'remaining_payment_with_weight' && (!paymentAmount || !paymentMethod || !inputValue || !storageLocation.trim()))
                    }
                    className={cn(
                      "flex-2 arabic-safe min-w-[120px]",
                      selectedTransition ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
                    )}
                  >
                    <CheckCircle size={16} className="ml-1" />
                    {selectedTransition ?
                      `تحديث إلى: ${ORDER_STATUS_CONFIG[selectedTransition.to].label}` :
                      'تحديث احالة'
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsModal;
