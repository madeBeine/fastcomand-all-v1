import React, { useState, useEffect } from 'react';
import { X, Calculator, Package, Truck, MapPin, DollarSign, Weight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumericInput from '@/components/NumericInput';
import { formatCurrencyMRU } from '@/utils/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Order, Shipment, ShippingType, WeightCalculation, ShippingSettings } from '@/pages/Orders';

interface WeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onWeightUpdated: (order: Order) => void;
  shipments?: Shipment[];
  shippingSettings?: ShippingSettings;
}

// إعدادات افتراضية للشحن
const defaultSettings = {
  weightPricePerKg: 1000,
  normalShippingFromDubai: 280,
  expressShippingFromDubai: 450,
  localDeliveryPrice: 500,
};

const WeightModal: React.FC<WeightModalProps> = ({
  isOpen,
  onClose,
  order,
  onWeightUpdated,
  shipments = [],
  shippingSettings = defaultSettings
}) => {
  const [weight, setWeight] = useState<number>(order.weight || 0);
  const [shippingType, setShippingType] = useState<ShippingType>('normal');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(order.shipmentId || '');
  const [isManualEntry, setIsManualEntry] = useState<boolean>(!order.shipmentId);
  const [manualShippingCost, setManualShippingCost] = useState<number>(0);
  
  // حساب التكاليف
  const airStandardPerKg = (shippingSettings as any).airStandardPerKg ?? shippingSettings.weightPricePerKg;
  const airExpressPerKg = (shippingSettings as any).airExpressPerKg ?? shippingSettings.weightPricePerKg;
  const effectivePerKg = shippingType === 'express' ? airExpressPerKg : airStandardPerKg;
  const weightCost = weight * effectivePerKg;
  const shippingCost = isManualEntry
    ? manualShippingCost
    : (shippingType === 'express'
        ? shippingSettings.expressShippingFromDubai
        : shippingSettings.normalShippingFromDubai);
  const localDeliveryCost = shippingSettings.localDeliveryPrice;
  const totalShippingCost = weightCost + shippingCost + localDeliveryCost;

  // المبلغ المدفوع سابقاً
  const paidAmount = order.paymentAmount || 0;
  
  // المبلغ المتبقي من قيمة الطلب
  const remainingOrderAmount = order.finalPrice - paidAmount;
  
  // الإجمالي النهائي
  const finalTotal = remainingOrderAmount + totalShippingCost;

  // تحديث البيانات عند تغيير الشحنة المحددة
  useEffect(() => {
    if (selectedShipmentId && shipments.length > 0) {
      const selectedShipment = shipments.find(s => s.id === selectedShipmentId);
      if (selectedShipment) {
        setShippingType(selectedShipment.shippingType);
        setIsManualEntry(false);
      }
    }
  }, [selectedShipmentId, shipments]);

  // تطبيق التحديث
  const handleSave = () => {
    const weightCalculation: WeightCalculation = {
      weight,
      shippingType,
      weightCost,
      shippingCost,
      localDeliveryCost,
      totalShippingCost,
      shipmentId: selectedShipmentId || undefined
    };

    const updatedOrder: Order = {
      ...order,
      weight,
      shipmentId: selectedShipmentId || undefined,
      weightCalculation,
      status: order.status === 'arrived' ? 'weight_paid' : order.status,
      updatedAt: new Date()
    };

    onWeightUpdated(updatedOrder);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Weight size={24} className="text-blue-500" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white arabic-safe">
                حساب الوزن والشحن
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 arabic-safe">
                طلب #{order.orderId} - {order.customer.name}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* الجانب الأيسر - إدخال البيانات */}
            <div className="space-y-6">
              {/* اختيار الشحنة */}
              <Card>
                <CardHeader>
                  <h3 className="font-medium flex items-center gap-2">
                    <Package size={16} />
                    اختيار الشحنة
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* التبديل بين الشحنة ولإدخال اليدوي */}
                  <div className="flex gap-2">
                    <Button
                      variant={!isManualEntry ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsManualEntry(false)}
                      className="flex-1 arabic-safe"
                    >
                      ربط بشحنة
                    </Button>
                    <Button
                      variant={isManualEntry ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsManualEntry(true)}
                      className="flex-1 arabic-safe"
                    >
                      إدخال يدوي
                    </Button>
                  </div>

                  {!isManualEntry && (
                    <div>
                      <label className="block text-sm font-medium mb-2 arabic-safe">
                        اختر الشحنة:
                      </label>
                      <select
                        value={selectedShipmentId}
                        onChange={(e) => setSelectedShipmentId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 arabic-safe"
                      >
                        <option value="">اختر شحنة...</option>
                        {shipments.map((shipment) => (
                          <option key={shipment.id} value={shipment.id}>
                            {shipment.name} - متاح: {shipment.availableWeight} كجم
                          </option>
                        ))}
                      </select>
                      
                      {/* تفاصيل الشحنة المختارة */}
                      {selectedShipmentId && shipments.find(s => s.id === selectedShipmentId) && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          {(() => {
                            const shipment = shipments.find(s => s.id === selectedShipmentId)!;
                            return (
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="arabic-safe">الوجهة:</span>
                                  <span>{shipment.origin} → {shipment.destination}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="arabic-safe">نوع الشحن:</span>
                                  <Badge variant={shipment.shippingType === 'express' ? 'default' : 'secondary'}>
                                    {shipment.shippingType === 'express' ? 'سريع' : 'عادي'}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="arabic-safe">الوزن المتاح:</span>
                                  <span>{shipment.availableWeight} كجم</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="arabic-safe">سعر الكيلو:</span>
                                  <span>{formatCurrencyMRU(shipment.pricePerKg)} أوقية</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {isManualEntry && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 arabic-safe">
                          نوع الشحن:
                        </label>
                        <div className="flex gap-2">
                          <Button
                            variant={shippingType === 'normal' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShippingType('normal')}
                            className="flex-1 arabic-safe"
                          >
                            عادي ({shippingSettings.normalShippingFromDubai} أوقية)
                          </Button>
                          <Button
                            variant={shippingType === 'express' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShippingType('express')}
                            className="flex-1 arabic-safe"
                          >
                            سريع ({shippingSettings.expressShippingFromDubai} أوقية)
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 arabic-safe">
                          تكلفة الشحن المخصصة (اختياري):
                        </label>
                        <NumericInput
                      value={String(manualShippingCost || '')}
                      onChange={(v) => setManualShippingCost(parseFloat(v) || 0)}
                    />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* إدخال الوزن */}
              <Card>
                <CardHeader>
                  <h3 className="font-medium flex items-center gap-2">
                    <Weight size={16} />
                    الوزن
                  </h3>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="block text-sm font-medium mb-2 arabic-safe">
                      وزن الطلب (كيلوجرام):
                    </label>
                    <NumericInput
                      value={String(weight || '')}
                      onChange={(v) => setWeight(parseFloat(v) || 0)}
                      className="text-center text-lg font-bold"
                    />
                    <p className="text-xs text-gray-500 mt-1 arabic-safe text-center">
                      سعر اكيلو: {formatCurrencyMRU(shippingSettings.weightPricePerKg)} أوقية
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* الجانب الأيمن - حساب التكاليف */}
            <div className="space-y-6">
              {/* ملخص الطلب الحالي */}
              <Card>
                <CardHeader>
                  <h3 className="font-medium flex items-center gap-2">
                    <DollarSign size={16} />
                    ملخص الطلب
                  </h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="arabic-safe">قيمة الطلب:</span>
                    <span className="font-medium">{formatCurrencyMRU(order.finalPrice)} أوقية</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="arabic-safe">المبلغ المدفوع:</span>
                    <span className="font-medium text-green-600">-{formatCurrencyMRU(paidAmount)} أوقية</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span className="arabic-safe">المتبقي من الطلب:</span>
                    <span className={cn(
                      "font-bold",
                      remainingOrderAmount > 0 ? "text-red-600" : "text-green-600"
                    )}>
                      {formatCurrencyMRU(remainingOrderAmount)} أوقية
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* حساب تكاليف الشحن */}
              {weight > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <h3 className="font-medium flex items-center gap-2">
                      <Calculator size={16} />
                      حساب تكايف الشحن
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="arabic-safe">تكلفة الوزن ({weight} كجم):</span>
                      <span className="font-medium">{formatCurrencyMRU(weightCost)} أوقية</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="arabic-safe">
                        شحن {shippingType === 'express' ? 'سريع' : 'عادي'}:
                      </span>
                      <span className="font-medium">{formatCurrencyMRU(shippingCost)} أوقية</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="arabic-safe">توصيل نواكشوط:</span>
                      <span className="font-medium">{formatCurrencyMRU(localDeliveryCost)} أوقية</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span className="arabic-safe">إجمالي تكاليف الشحن:</span>
                      <span className="font-bold text-blue-600">{formatCurrencyMRU(totalShippingCost)} أوقية</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* الإجمالي النهائي */}
              {weight > 0 && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <h3 className="font-medium flex items-center gap-2">
                      <DollarSign size={16} />
                      الإجمالي النهائي
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="arabic-safe">المتبقي من الطلب:</span>
                        <span>{formatCurrencyMRU(remainingOrderAmount)} أوقية</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="arabic-safe">تكاليف الشحن:</span>
                        <span>+{formatCurrencyMRU(totalShippingCost)} أوقية</span>
                      </div>
                    </div>
                    <div className="border-t mt-3 pt-3 flex justify-between">
                      <span className="font-bold text-lg arabic-safe">المطلوب دفعه:</span>
                      <span className="font-bold text-2xl text-green-600">
                        {formatCurrencyMRU(finalTotal)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} className="arabic-safe">
            إلغاء
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={weight <= 0}
            className="bg-green-600 hover:bg-green-700 arabic-safe"
          >
            حفظ وتطبيق الحساب
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WeightModal;
