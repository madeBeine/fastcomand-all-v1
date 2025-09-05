import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumericInput from '@/components/NumericInput';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { Calculator } from 'lucide-react';

const OrdersSettings: React.FC = () => {
  const { settings, update, formatCurrency, formatNumber } = useSettings();
  const { toast } = useToast();

  // Currencies
  const [displayCurrency, setDisplayCurrency] = React.useState(settings.ordersPreferences?.displayCurrency || 'MRU');
  const [rates, setRates] = React.useState(settings.currencies.rates);

  // Commissions & Discounts
  const [commissionPercent, setCommissionPercent] = React.useState(settings.ordersInvoices.defaultCommissionPercent);
  const [enableDiscounts, setEnableDiscounts] = React.useState(!!settings.ordersInvoices.enableDiscounts);
  const [discountType, setDiscountType] = React.useState(settings.ordersInvoices.defaultDiscountType);
  const [discountValue, setDiscountValue] = React.useState(settings.ordersInvoices.defaultDiscountValue);

  // Warranty
  const [warrantyDays, setWarrantyDays] = React.useState(settings.ordersWarranty?.defaultDays || 7);

  // Customer shipping rates
  const [customerRates, setCustomerRates] = React.useState(settings.ordersCustomerShipping || {
    air_standard_perKg: 1000,
    air_express_perKg: 1800,
    sea_perKg: 600,
    land_perKg: 900,
  });

  // Extras
  const [minOrderValue, setMinOrderValue] = React.useState(settings.ordersExtras?.minOrderValueMRU || 0);
  const [extraFeeType, setExtraFeeType] = React.useState(settings.ordersExtras?.extraFeeType || 'fixed');
  const [extraFeeValue, setExtraFeeValue] = React.useState(settings.ordersExtras?.extraFeeValue || 0);
  const [defaultNotes, setDefaultNotes] = React.useState(settings.ordersExtras?.defaultNotes || '');

  // Estimation helper
  const [estWeight, setEstWeight] = React.useState<number>(0);
  const [estType, setEstType] = React.useState<'air_standard'|'air_express'|'sea'|'land'>('air_standard');
  const estRatePerKg = React.useMemo(() => {
    switch (estType) {
      case 'air_express': return customerRates.air_express_perKg;
      case 'sea': return customerRates.sea_perKg;
      case 'land': return customerRates.land_perKg;
      default: return customerRates.air_standard_perKg;
    }
  }, [estType, customerRates]);
  const estShippingCost = React.useMemo(() => {
    const base = estWeight * (estRatePerKg || 0);
    const total = base + (settings.delivery?.insideNKCPrice || 0);
    return Math.max(0, Math.round(total));
  }, [estWeight, estRatePerKg, settings.delivery?.insideNKCPrice]);

  const saveCurrencies = () => {
    const invalid = Object.values(rates).some((v) => !(Number(v) > 0));
    if (invalid) { toast({ title: 'خطأ', description: 'أسعار الصرف يجب أن تكون أرقامًا موجبة.' }); return; }
    update({ currencies: { rates }, ordersPreferences: { displayCurrency } });
    toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات العملات.' });
  };
  const saveCommissions = () => {
    const pct = Math.round(Number(commissionPercent) || 0);
    if (pct < 0 || pct > 100) { toast({ title: 'خطأ', description: 'نسبة العمولة يجب أن تكون بين 0 و 100.' }); return; }
    update({ ordersInvoices: { ...settings.ordersInvoices, defaultCommissionPercent: pct, defaultDiscountType: discountType, defaultDiscountValue: Math.max(0, Math.round(Number(discountValue) || 0)), enableDiscounts } });
    toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات العمولات والخصومات.' });
  };
  const saveWarranty = () => {
    update({ ordersWarranty: { defaultDays: Math.max(0, Math.round(Number(warrantyDays) || 0)) } });
    toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات الضمان.' });
  };
  const saveShipping = () => {
    const ratesSanitized = {
      air_standard_perKg: Math.max(0, Math.round(Number(customerRates.air_standard_perKg) || 0)),
      air_express_perKg: Math.max(0, Math.round(Number(customerRates.air_express_perKg) || 0)),
      sea_perKg: Math.max(0, Math.round(Number(customerRates.sea_perKg) || 0)),
      land_perKg: Math.max(0, Math.round(Number(customerRates.land_perKg) || 0)),
    };
    update({ ordersCustomerShipping: ratesSanitized });
    toast({ title: 'تم الحفظ', description: 'تم حفظ أسعار الشحن للزبون.' });
  };
  const saveExtras = () => {
    update({ ordersExtras: { minOrderValueMRU: Math.max(0, Math.round(Number(minOrderValue) || 0)), extraFeeType: extraFeeType as 'fixed'|'percentage', extraFeeValue: Math.max(0, Math.round(Number(extraFeeValue) || 0)), defaultNotes } });
    toast({ title: 'تم الحفظ', description: 'تم حفظ الإعدادات الإضافية.' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white arabic-safe">إعدادات الطلبات</h1>
            <p className="text-gray-600 dark:text-gray-400 arabic-safe mt-1">تحكم كامل بالعملات والعمولات والخصومات والشحن والضمان وإعدادات إضافية</p>
          </div>
          <Button variant="outline" onClick={() => window.history.back()} className="arabic-safe">رجوع</Button>
        </div>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <Tabs defaultValue="currencies" className="w-full">
              <TabsList className="flex gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto whitespace-nowrap">
                <TabsTrigger value="currencies" className="px-3 py-2 text-sm arabic-safe">العملات</TabsTrigger>
                <TabsTrigger value="commission" className="px-3 py-2 text-sm arabic-safe">العمولات والخصومات</TabsTrigger>
                <TabsTrigger value="shipping" className="px-3 py-2 text-sm arabic-safe">أسعار الشحن للزبون</TabsTrigger>
                <TabsTrigger value="warranty" className="px-3 py-2 text-sm arabic-safe">الضمان</TabsTrigger>
                <TabsTrigger value="extras" className="px-3 py-2 text-sm arabic-safe">إعدادات إضافية</TabsTrigger>
              </TabsList>

              <TabsContent value="currencies" className="mt-4">
                <Card>
                  <CardHeader />
                  <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">العملة الافتراضية للعرض</label>
                      <select value={displayCurrency} onChange={(e)=> setDisplayCurrency(e.target.value as any)} className="w-full px-3 py-2 border rounded">
                        <option value="MRU">الأوقية (MRU)</option>
                        <option value="AED">الدرهم (AED)</option>
                        <option value="USD">الدولار (USD)</option>
                        <option value="EUR">اليورو (EUR)</option>
                      </select>
                    </div>

                    {(['USD','AED','EUR'] as const).map((c) => (
                      <div key={c} className="p-3 rounded border">
                        <div className="text-sm font-medium">{c}</div>
                        <Input type="number" value={rates[c]} onChange={(e)=> setRates({ ...rates, [c]: parseFloat(e.target.value)||0 })} />
                        <div className="text-xs text-gray-500 mt-1 arabic-safe">السعر مقابل الأوقية</div>
                      </div>
                    ))}

                    <div className="md:col-span-3">
                      <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 arabic-safe" onClick={saveCurrencies}>حفظ التغييرات</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="commission" className="mt-4">
                <Card>
                  <CardHeader />
                  <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">نسبة العمولة (%)</label>
                      <NumericInput value={String(commissionPercent)} onChange={(v)=> setCommissionPercent(parseInt(v)||0)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">تفعيل الخصومات</label>
                      <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={enableDiscounts} onChange={(e)=> setEnableDiscounts(e.target.checked)} /> مفعل</label>
                    </div>
                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">نوع الخصم</label>
                        <select value={discountType} onChange={(e)=> setDiscountType(e.target.value as any)} className="w-full px-3 py-2 border rounded">
                          <option value="none">بدون</option>
                          <option value="percentage">نسبة %</option>
                          <option value="fixed">مبلغ ثابت</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">قيمة الخصم</label>
                        <NumericInput value={String(discountValue)} onChange={(v)=> setDiscountValue(parseInt(v)||0)} />
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 arabic-safe" onClick={saveCommissions}>حفظ التغييرات</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="shipping" className="mt-4">
                <Card>
                  <CardHeader />
                  <CardContent className="p-4 sm:p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">جوي عادي (MRU/كجم)</label>
                        <NumericInput value={String(customerRates.air_standard_perKg)} onChange={(v)=> setCustomerRates({ ...customerRates, air_standard_perKg: parseInt(v)||0 })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">جوي سريع (MRU/كجم)</label>
                        <NumericInput value={String(customerRates.air_express_perKg)} onChange={(v)=> setCustomerRates({ ...customerRates, air_express_perKg: parseInt(v)||0 })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">بحري (MRU/كجم)</label>
                        <NumericInput value={String(customerRates.sea_perKg)} onChange={(v)=> setCustomerRates({ ...customerRates, sea_perKg: parseInt(v)||0 })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">بري (MRU/كجم)</label>
                        <NumericInput value={String(customerRates.land_perKg)} onChange={(v)=> setCustomerRates({ ...customerRates, land_perKg: parseInt(v)||0 })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader />
                        <CardContent className="p-4 space-y-3">
                          <div className="font-medium arabic-safe flex items-center gap-2"><Calculator size={16} /> حاسبة تقدير الشحن للزبون</div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">الوزن (كجم)</label>
                              <NumericInput value={String(estWeight || '')} onChange={(v)=> setEstWeight(parseFloat(v)||0)} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">نوع الشحن</label>
                              <select value={estType} onChange={(e)=> setEstType(e.target.value as any)} className="w-full px-3 py-2 border rounded">
                                <option value="air_standard">جوي عادي</option>
                                <option value="air_express">جوي سريع</option>
                                <option value="sea">بحري</option>
                                <option value="land">بري</option>
                              </select>
                            </div>
                            <div className="flex items-end">
                              <div className="w-full p-3 bg-blue-50 rounded border border-blue-200 text-center">
                                <div className="text-xs text-gray-600 arabic-safe">MRU/كجم</div>
                                <div className="font-bold">{formatNumber(estRatePerKg)}</div>
                              </div>
                            </div>
                          </div>
                          <div className="p-3 rounded border bg-gray-50">
                            <div className="flex justify-between text-sm">
                              <span className="arabic-safe">تكلفة الوزن:</span>
                              <span className="font-medium">{formatCurrency(estWeight * estRatePerKg)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="arabic-safe">توصيل نواكشوط (من إعدادات مهام التوصيل):</span>
                              <span className="font-medium">{formatCurrency(settings.delivery?.insideNKCPrice || 0)}</span>
                            </div>
                            <div className="border-t mt-2 pt-2 flex justify-between font-medium">
                              <span className="arabic-safe">الإجمالي التقريبي:</span>
                              <span className="text-green-600 font-bold">{formatCurrency(estShippingCost)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="flex items-end justify-start lg:justify-end">
                        <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 arabic-safe" onClick={saveShipping}>حفظ التغييرات</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="warranty" className="mt-4">
                <Card>
                  <CardHeader />
                  <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">أيام الضمان الافتراضية</label>
                      <NumericInput value={String(warrantyDays)} onChange={(v)=> setWarrantyDays(parseInt(v)||0)} />
                    </div>
                    <div className="md:col-span-3">
                      <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 arabic-safe" onClick={saveWarranty}>حفظ التغييرات</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="extras" className="mt-4">
                <Card>
                  <CardHeader />
                  <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">الحد الأدنى لقيمة الطلب (MRU)</label>
                      <NumericInput value={String(minOrderValue)} onChange={(v)=> setMinOrderValue(parseInt(v)||0)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">الرسوم الإضافية</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={extraFeeType} onChange={(e)=> setExtraFeeType(e.target.value as any)} className="w-full px-3 py-2 border rounded">
                          <option value="fixed">مبلغ ثابت</option>
                          <option value="percentage">نسبة %</option>
                        </select>
                        <NumericInput value={String(extraFeeValue)} onChange={(v)=> setExtraFeeValue(parseInt(v)||0)} />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 arabic-safe mb-1">ملاحظات افتراضية تظهر للزبون</label>
                      <Input value={defaultNotes} onChange={(e)=> setDefaultNotes(e.target.value)} placeholder="اكتب ملاحظات افتراضية للزبون..." />
                    </div>
                    <div className="md:col-span-2">
                      <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 arabic-safe" onClick={saveExtras}>حفظ التغييرات</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrdersSettings;
