import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumericInput from '@/components/NumericInput';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, Hash, Calendar, Search, Link as LinkIcon, X, Plus, Copy, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrencyMRU, formatNumberEN, formatDate as fmtDate } from '@/utils/format';
import { eventBus } from '@/lib/eventBus';

// Types
export type ShippingType = 'air_standard' | 'air_express' | 'sea';

export interface ShippingSettings {
  priceAirStandardPerKg: number;
  priceAirExpressPerKg: number;
  priceSeaPerKg: number;
}

export interface Shipment {
  id: string;
  name: string;
  shippingType: ShippingType;
  origin: string;
  destination: string;
  createdAt: Date;
  arrivalDate?: Date;
  totalWeight?: number; // kg
  pricePerKg: number; // MRU per kg
  status: 'pending' | 'in_transit' | 'arrived' | 'distributed';
  notes?: string;
  orderIds: string[]; // linked order ids
  history?: string[]; // previous statuses for undo
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

export interface Order {
  id: string;
  orderId: number;
  customerName: string;
  trackingNumber?: string;
  internationalShippingNumbers?: string[];
  paymentAmount?: number; // MRU
  status: OrderStatus;
  weight?: number; // kg
  weightCalculation?: { totalShippingCost: number } | null;
  shipmentId?: string | null;
}

const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  priceAirStandardPerKg: 1000,
  priceAirExpressPerKg: 1800,
  priceSeaPerKg: 600,
};

// Mock data (minimal) — in real app this would come from API
const initialShipments: Shipment[] = [
  {
    id: 'SH001',
    name: 'دبي شحنة 001',
    shippingType: 'air_standard',
    origin: 'Dubai',
    destination: 'Nouakchott',
    createdAt: new Date('2024-01-10'),
    arrivalDate: new Date('2024-01-20'),
    totalWeight: 50,
    pricePerKg: DEFAULT_SHIPPING_SETTINGS.priceAirStandardPerKg,
    status: 'arrived',
    notes: 'شحنة مجموعة متاجر',
    orderIds: ['1', '6']
  },
  {
    id: 'SH002',
    name: 'دبي شحنة سريعة 002',
    shippingType: 'air_express',
    origin: 'Dubai',
    destination: 'Nouakchott',
    createdAt: new Date('2024-02-01'),
    arrivalDate: undefined,
    totalWeight: 30,
    pricePerKg: DEFAULT_SHIPPING_SETTINGS.priceAirExpressPerKg,
    status: 'in_transit',
    notes: 'شحنة عاجلة',
    orderIds: []
  }
];

const initialOrders: Order[] = [
  {
    id: '1',
    orderId: 1001,
    customerName: 'Ahmed Mohamed',
    trackingNumber: 'US123456789',
    internationalShippingNumbers: ['INT123'],
    paymentAmount: 65000,
    status: 'arrived',
    weight: 2.5,
    weightCalculation: { totalShippingCost: 3280 },
    shipmentId: 'SH001'
  },
  {
    id: '2',
    orderId: 1002,
    customerName: 'Fatima Ahmed',
    trackingNumber: 'LP123456789CN',
    internationalShippingNumbers: ['INT222'],
    paymentAmount: 12000,
    status: 'shipped',
    weight: 1.2,
    weightCalculation: null,
    shipmentId: null
  },
  {
    id: '3',
    orderId: 1003,
    customerName: 'Khalid Ali',
    trackingNumber: 'US987654321',
    internationalShippingNumbers: ['INT333'],
    paymentAmount: 125000,
    status: 'delivered',
    weight: 5.2,
    weightCalculation: null,
    shipmentId: null
  }
];

const fmtNumber = (n?: number) => formatNumberEN(n || 0);
const fmtCurrency = (n?: number) => formatCurrencyMRU(n || 0);

const Shipments: React.FC = () => {
  const { settings } = useSettings();
  const [shipments, setShipments] = useState<Shipment[]>(() =>
    [...initialShipments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  );
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  useEffect(() => {
    const off1 = eventBus.on('order.updated', (updated: Order) => {
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    });

    const off2 = eventBus.on('settings.shipping.changed', () => {
      try {
        if (!confirm('تم تعديل إعدادات الشحن. هل تريد إعادة تسعير الشحنات المفتوحة الآن؟')) return;
        const now = new Date();
        setShipments(prev => prev.map(s => {
          if (s.status === 'arrived' || s.status === 'distributed') return s;
          const candidates = settings.shipping.types.filter(x => x.kind === s.shippingType && (!x.country || x.country === s.origin));
          const valid = candidates.filter(x => (!x.effectiveFrom || new Date(x.effectiveFrom) <= now) && (!x.effectiveTo || new Date(x.effectiveTo) >= now));
          const t = (valid.length ? valid : candidates).sort((a, b) => new Date(b.effectiveFrom || '1970-01-01').getTime() - new Date(a.effectiveFrom || '1970-01-01').getTime())[0];
          const fallback = s.shippingType === 'air_express' ? DEFAULT_SHIPPING_SETTINGS.priceAirExpressPerKg : s.shippingType === 'sea' ? DEFAULT_SHIPPING_SETTINGS.priceSeaPerKg : DEFAULT_SHIPPING_SETTINGS.priceAirStandardPerKg;
          const newPrice = t ? t.pricePerKgMRU : fallback;
          return { ...s, pricePerKg: newPrice };
        }));
        alert('تمت إعادة تسعير الشحنات المفتوحة.');
      } catch (e) { console.error(e); }
    });

    return () => { off1(); off2(); };
  }, [settings]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState<{ open: boolean; shipmentId?: string }>({ open: false });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // Derive from Settings
  const shippingSettings: ShippingSettings = React.useMemo(() => {
    const types = settings.shipping.types;
    const std = types.find(t => t.kind === 'air_standard')?.pricePerKgMRU ?? DEFAULT_SHIPPING_SETTINGS.priceAirStandardPerKg;
    const exp = types.find(t => t.kind === 'air_express')?.pricePerKgMRU ?? DEFAULT_SHIPPING_SETTINGS.priceAirExpressPerKg;
    const sea = types.find(t => t.kind === 'sea')?.pricePerKgMRU ?? DEFAULT_SHIPPING_SETTINGS.priceSeaPerKg;
    return { priceAirStandardPerKg: std, priceAirExpressPerKg: exp, priceSeaPerKg: sea };
  }, [settings]);

  // Generate next shipment id
  const generateNextShipmentId = () => {
    const max = shipments
      .map(s => s.id.replace(/^SH/i, ''))
      .map(x => parseInt(x || '0', 10))
      .filter(n => !isNaN(n))
      .reduce((a, b) => Math.max(a, b), 0);
    const next = max + 1;
    return `SH${String(next).padStart(3, '0')}`;
  };

  // Create shipment handler
  const handleCreateShipment = (partial: Partial<Shipment>) => {
    const id = partial.id || generateNextShipmentId();
    const pricePerKg = partial.pricePerKg ?? (
      partial.shippingType === 'air_express' ? shippingSettings.priceAirExpressPerKg : partial.shippingType === 'sea' ? shippingSettings.priceSeaPerKg : shippingSettings.priceAirStandardPerKg
    );

    const newShipment: Shipment = {
      id,
      name: partial.name || `Shipment ${id}`,
      shippingType: partial.shippingType || 'air_standard',
      origin: partial.origin || '',
      destination: partial.destination || '',
      createdAt: new Date(),
      arrivalDate: partial.arrivalDate,
      totalWeight: partial.totalWeight,
      pricePerKg,
      status: 'pending',
      notes: partial.notes,
      orderIds: [],
      history: []
    };

    setShipments(prev => [newShipment, ...prev]);
    setShowCreateModal(false);
  };

  // Search eligible orders for linking
  const searchEligibleOrders = (query: string, shipmentId?: string) => {
    const q = query.trim().toLowerCase();
    return orders.filter(o => {
      // must be paid (partially or fully)
      if (!o.paymentAmount || o.paymentAmount <= 0) return false;
      // must have tracking and international numbers
      if (!o.trackingNumber && (!o.internationalShippingNumbers || o.internationalShippingNumbers.length === 0)) return false;
      // not linked to another shipment (or linked to this same one)
      if (o.shipmentId && o.shipmentId !== shipmentId) return false;
      // not arrived/delivered
      if (o.status === 'arrived' || o.status === 'delivered') return false;

      if (!q) return true;
      return (
        o.orderId.toString().includes(q) ||
        (o.trackingNumber || '').toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        (o.internationalShippingNumbers || []).some(n => n.toLowerCase().includes(q))
      );
    });
  };

  // Link orders to a shipment
  const handleLinkOrders = (shipmentId: string, orderIdsToLink: string[]) => {
    setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, orderIds: Array.from(new Set([...s.orderIds, ...orderIdsToLink])) } : s));
    setOrders(prev => prev.map(o => orderIdsToLink.includes(o.id) ? { ...o, shipmentId, status: 'linked' } : o));
    setShowLinkModal({ open: false });
  };

  // Update shipment status with history for undo
  const STATUS_FLOW: Shipment['status'][] = ['pending', 'in_transit', 'arrived', 'distributed'];

  const updateShipmentStatus = (shipmentId: string, nextStatus: Shipment['status'] | 'prev') => {
    // compute updated shipments list and emit event for the updated shipment
    const updatedList = shipments.map(s => {
      if (s.id !== shipmentId) return s;
      const idx = STATUS_FLOW.indexOf(s.status);
      let newStatus: Shipment['status'] = s.status;
      let history = s.history ?? [];
      if (nextStatus === 'prev') {
        const prevStatus = history.length > 0 ? history[history.length - 1] : (idx > 0 ? STATUS_FLOW[idx - 1] : s.status);
        history = history.slice(0, Math.max(0, history.length - 1));
        newStatus = prevStatus as Shipment['status'];
      } else {
        const nextIdx = Math.min(STATUS_FLOW.length - 1, idx + 1);
        if (STATUS_FLOW[nextIdx] !== s.status) {
          history = [...(history || []), s.status];
          newStatus = nextStatus === 'pending' ? 'pending' : STATUS_FLOW[nextIdx];
        }
      }

      // update linked orders status to match
      setOrders(prevOrders => prevOrders.map(o => s.orderIds.includes(o.id) ? ({ ...o, status: shipmentStatusToOrderStatus(newStatus) }) : o));

      return { ...s, status: newStatus, history };
    });

    setShipments(updatedList);

    const updatedShipment = updatedList.find(s => s.id === shipmentId);
    if (updatedShipment) {
      try {
        // compute metrics: linked orders, collected amount and company cost
        const linkedOrders = orders.filter(o => updatedShipment.orderIds.includes(o.id));
        const totalOrderWeight = linkedOrders.reduce((acc, o) => acc + (o.weight || 0), 0);
        const collected = linkedOrders.reduce((acc, o) => acc + (o.weightCalculation?.totalShippingCost || 0) + (o.paymentAmount || 0), 0);
        const companyCost = (updatedShipment.totalWeight || totalOrderWeight) * updatedShipment.pricePerKg;
        eventBus.emit('shipment.updated', { shipment: updatedShipment, linkedOrders, totalOrderWeight, collected, companyCost });
      } catch (e) { console.error(e); }
    }
  };

  const shipmentStatusToOrderStatus = (s: Shipment['status']): OrderStatus => {
    switch (s) {
      case 'pending':
        return 'linked';
      case 'in_transit':
        return 'in_delivery';
      case 'arrived':
        return 'arrived';
      case 'distributed':
        return 'delivered';
    }
  };

  // Update per-order weight (when scanning in warehouse) and re-evaluate shipment collected
  const updateOrderWeight = (orderId: string, weight: number) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, weight, weightCalculation: { totalShippingCost: Math.round((o.weight ?? weight) * 1000) } } : o));
  };

  // Compute shipment aggregated metrics
  const shipmentMetrics = (s: Shipment) => {
    const linkedOrders = orders.filter(o => s.orderIds.includes(o.id));
    const totalOrderWeight = linkedOrders.reduce((acc, o) => acc + (o.weight || 0), 0);
    const collected = linkedOrders.reduce((acc, o) => acc + (o.weightCalculation?.totalShippingCost || 0) + (o.paymentAmount || 0), 0);
    const companyCost = (s.totalWeight || totalOrderWeight) * s.pricePerKg;
    return { linkedOrders, totalOrderWeight, collected, companyCost };
  };

  // UI Components: CreateShipmentModal, LinkOrdersModal
  const CreateShipmentModal: React.FC<{ isOpen: boolean; onClose: () => void; onCreate: (s: Partial<Shipment>) => void }> = ({ isOpen, onClose, onCreate }) => {
    const [id, setId] = useState(generateNextShipmentId());
    const [name, setName] = useState('');
    const [shippingType, setShippingType] = useState<ShippingType>('air_standard');
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
      if (isOpen) {
        setId(generateNextShipmentId());
        setName('');
        setShippingType('air_standard');
        setOrigin('');
        setDestination('');
        setNotes('');
      }
    }, [isOpen]);

    // lock background scroll when modal is open
    useEffect(() => {
      if (!isOpen) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }, [isOpen]);

    if (!isOpen) return null;

    const pricePerKg = shippingType === 'air_express' ? shippingSettings.priceAirExpressPerKg : shippingType === 'sea' ? shippingSettings.priceSeaPerKg : shippingSettings.priceAirStandardPerKg;

    return (
      <div className="fixed inset-0 z-40 modal-overlay overflow-y-auto">
        <div className="min-h-full flex items-start sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full mx-auto" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium text-lg">إنشاء شحنة جديدة</h3>
              <button onClick={onClose} className="p-2"><X /></button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto modal-content-scrollable scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600">رقم الشحنة</label>
                  <Input value={id} onChange={(e) => setId(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">ام الشحنة</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">نوع الشحن</label>
                  <select value={shippingType} onChange={(e) => setShippingType(e.target.value as ShippingType)} className="w-full px-3 py-2 border rounded">
                    <option value="air_standard">جوي عادي - {fmtCurrency(shippingSettings.priceAirStandardPerKg)}/kg</option>
                    <option value="air_express">جوي سريع - {fmtCurrency(shippingSettings.priceAirExpressPerKg)}/kg</option>
                    <option value="sea">بحري - {fmtCurrency(shippingSettings.priceSeaPerKg)}/kg</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">من</label>
                  <Input value={origin} onChange={(e) => setOrigin(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">إلى</label>
                  <Input value={destination} onChange={(e) => setDestination(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">السعر/كجم</label>
                  <div className="p-2 border rounded bg-gray-50 text-sm">{fmtCurrency(pricePerKg)}</div>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm text-gray-600">ملاحظات</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-2 border rounded text-sm" rows={3} />
              </div>

              <div className="mt-3 text-sm text-gray-600">
                <div>التاريخ: {new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date())}</div>
                <div className="mt-1">العملة: MRU (عرض القيم بالأرقام الإنجليزية)</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 modal-footer">
              <Button variant="outline" onClick={onClose}>إلغاء</Button>
              <Button onClick={() => onCreate({ id, name, shippingType, origin, destination, notes, pricePerKg })}>إنشاء</Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LinkOrdersModal: React.FC<{ isOpen: boolean; shipment?: Shipment; onClose: () => void; onLink: (ids: string[]) => void }> = ({ isOpen, shipment, onClose, onLink }) => {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<Record<string, boolean>>({});

    useEffect(() => {
      if (isOpen) {
        setQuery('');
        setSelected({});
      }
    }, [isOpen]);

    // lock background scroll when modal open
    useEffect(() => {
      if (!isOpen) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    if (!isOpen || !shipment) return null;

    const results = searchEligibleOrders(query, shipment.id);

    return (
      <div className="fixed inset-0 z-40 modal-overlay overflow-y-auto">
        <div className="min-h-full flex items-start sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-3xl w-full mx-auto" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium text-lg">ربط الطلبات بالشحن {shipment.id}</h3>
              <button onClick={onClose} className="p-2"><X /></button>
            </div>

            <div className="p-4 modal-content-scrollable overflow-y-auto" style={{ maxHeight: '70vh' }}>
              <div className="flex items-center gap-2 mb-3">
                <Search />
                <Input placeholder="بحث برقم الطلب، رقم التتبع، اسم العميل..." value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>

              <div className="space-y-2">
                {results.length === 0 && <div className="text-sm text-gray-600">لا توجد طلبات مطابقة</div>}
                {results.map(o => (
                  <div key={o.id} className="p-3 border rounded flex items-center justify-between">
                    <div>
                      <div className="font-medium">#{o.orderId} — {o.customerName}</div>
                      <div className="text-xs text-gray-600">تتبع: {o.trackingNumber || '-'} — حالة: {o.status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!selected[o.id]} onChange={() => setSelected(prev => ({ ...prev, [o.id]: !prev[o.id] }))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 modal-footer">
              <Button variant="outline" onClick={onClose}>إلغاء</Button>
              <Button onClick={() => onLink(Object.keys(selected).filter(k => selected[k]))}>ربط {Object.keys(selected).filter(k => selected[k]).length} طلب</Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Shipment Details Modal defined INSIDE component so it has access to orders/updateOrderWeight/etc
  const ShipmentDetailsModalInner: React.FC<{ isOpen: boolean; shipment: Shipment | null; onClose: () => void; onUpdate: (s: Shipment) => void }> = ({ isOpen, shipment, onClose, onUpdate }) => {
    const [localShipment, setLocalShipment] = useState<Shipment | null>(shipment);
    const [orderFilter, setOrderFilter] = useState<'all' | 'paid' | 'partially_paid' | 'weight_entered' | 'weight_missing'>('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
      setLocalShipment(shipment ? { ...shipment } : null);
    }, [shipment]);

    useEffect(() => {
      if (!isOpen) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    if (!isOpen || !localShipment) return null;

    const linkedOrders = orders.filter(o => localShipment.orderIds.includes(o.id));
    const filtered = linkedOrders.filter(o => {
      if (orderFilter === 'paid') return (o.paymentAmount || 0) >= (o.weightCalculation?.totalShippingCost || 0);
      if (orderFilter === 'partially_paid') return !!(o.paymentAmount && o.paymentAmount > 0 && o.paymentAmount < (o.weightCalculation?.totalShippingCost || 1));
      if (orderFilter === 'weight_entered') return !!o.weight;
      if (orderFilter === 'weight_missing') return !o.weight;
      return true;
    }).filter(o => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return o.orderId.toString().includes(q) || (o.trackingNumber || '').toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || (o.internationalShippingNumbers || []).some(n => n.toLowerCase().includes(q));
    });

    const handleCopy = async (text: string) => {
      try { await navigator.clipboard.writeText(text); alert('Copied to clipboard'); } catch (e) { console.error(e); }
    };

    return (
      <div className="fixed inset-0 z-50 modal-overlay overflow-y-auto">
        <div className="min-h-full flex items-start sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-4xl w-full mx-auto" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <div className="flex items-center gap-3">
                  <div className="font-bold text-lg">{localShipment.id}</div>
                  <Badge className="text-xs">{localShipment.shippingType === 'air_express' ? 'جوي سريع' : localShipment.shippingType === 'sea' ? 'بحري' : 'جوي عادي'}</Badge>
                  <button className="p-2" onClick={() => handleCopy(localShipment.id)} title="Copy shipment id"><Copy size={16} /></button>
                </div>
                <div className="text-sm text-gray-600">{localShipment.origin} → {localShipment.destination} • {new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(localShipment.createdAt)}</div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => {
                  // advance status
                  updateShipmentStatus(localShipment.id, 'pending');
                  const updated = shipments.find(s => s.id === localShipment.id)!;
                  setLocalShipment(updated);
                  onUpdate(updated);
                }}>ت��ديث الحا��ة</Button>

                <Button variant="ghost" onClick={() => {
                  updateShipmentStatus(localShipment.id, 'prev');
                  const updated = shipments.find(s => s.id === localShipment.id)!;
                  setLocalShipment(updated);
                  onUpdate(updated);
                }}>تراجع</Button>

                <button className="p-2" onClick={onClose}><X /></button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto modal-content-scrollable" style={{ maxHeight: '70vh' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600">رقم الشحنة</label>
                    <div className="flex items-center gap-2">
                      <Input value={localShipment.id} onChange={(e) => setLocalShipment({ ...localShipment, id: e.target.value })} className="text-sm" />
                      <Button variant="outline" onClick={() => { onUpdate(localShipment); alert('Updated'); }}>حظ</Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600">الوزن الكلي للشحنة (kg)</label>
                    <div className="flex items-center gap-2">
                      <NumericInput value={String(localShipment.totalWeight || '')} onChange={(v) => setLocalShipment({ ...localShipment, totalWeight: v ? parseFloat(v) : undefined })} className="text-sm" />
                      <Button variant="outline" onClick={() => { onUpdate(localShipment); alert('Total weight updated'); }}>حفظ الوزن</Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600">ملاحظات</label>
                    <textarea value={localShipment.notes || ''} onChange={(e) => setLocalShipment({ ...localShipment, notes: e.target.value })} className="w-full p-2 border rounded text-sm" rows={3} />
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    <div>سعر/كجم: {fmtCurrency(localShipment.pricePerKg)}</div>
                    <div>حالة الشحنة: <span className="font-medium">{localShipment.status}</span></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">الطلبات المرتبطة ({linkedOrders.length})</div>
                    <div className="flex items-center gap-2">
                      <Input placeholder="بحث" value={search} onChange={(e) => setSearch(e.target.value)} className="text-sm" />
                      <select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value as any)} className="px-2 py-1 border rounded text-sm">
                        <option value="all">الكل</option>
                        <option value="paid">مدفوعة كلياً</option>
                        <option value="partially_paid">مدفوعة جزئياً</option>
                        <option value="weight_entered">الوزن مدخل</option>
                        <option value="weight_missing">الوزن غير مدخل</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filtered.map(o => (
                      <div key={o.id} className="p-3 border rounded flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">#{o.orderId}</div>
                            <div className="text-sm text-gray-600">{o.customerName}</div>
                          </div>
                          <div className="text-xs text-gray-600">تتبع: <span className="font-mono">{o.trackingNumber || '-'}</span></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <NumericInput value={String(o.weight || '')} onChange={(v) => updateOrderWeight(o.id, Number(v))} className="w-24 text-sm" />
                          <Button variant="outline" onClick={() => { if (o.trackingNumber) { navigator.clipboard.writeText(o.trackingNumber); alert('Copied'); } }}>نسخ تتبع</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t pt-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">مجموع أوزان الطلبات</div>
                  <div className="font-medium">{fmtNumber(linkedOrders.reduce((acc, o) => acc + (o.weight || 0), 0))} kg</div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm text-gray-600">تكلفة الشحن التقريبية</div>
                  <div className="font-medium">{fmtCurrency((localShipment.totalWeight || linkedOrders.reduce((acc, o) => acc + (o.weight || 0), 0)) * localShipment.pricePerKg)}</div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm text-gray-600">ال��حصّلة من الطلبات</div>
                  <div className="font-medium">{fmtCurrency(linkedOrders.reduce((acc, o) => acc + (o.weightCalculation?.totalShippingCost || 0) + (o.paymentAmount || 0), 0))}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 modal-footer">
              <Button variant="outline" onClick={onClose}>إغلاق</Button>
              <Button onClick={() => {
                // persist changes
                onUpdate(localShipment);
                alert('Saved');
              }}>حفظ وتحديث</Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">إدارة الشحنات</h1>
            <p className="text-sm text-gray-600">إنشاء وإدارة الشحنات وربط الطلبات — الأحدث أولاً</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2"><Plus />شحنة جدية</Button>
          </div>
        </div>

        {/* Shipments list as cards (newest first) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shipments.map(s => {
            const { linkedOrders, totalOrderWeight, collected, companyCost } = shipmentMetrics(s);

            return (
              <Card key={s.id} className={cn('overflow-hidden', 'bg-white dark:bg-gray-800')}>
                <CardHeader className="p-4 border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Hash className="text-gray-400" />
                        <div className="font-bold text-lg">{s.id}</div>
                        <Badge className="text-xs">{s.shippingType === 'air_express' ? 'جوي سريع' : s.shippingType === 'sea' ? 'بحري' : 'جوي عادي'}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{s.origin} → {s.destination}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500">{new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(s.createdAt)}</div>
                      <div className="mt-2">
                        <Badge className="text-xs">{s.status.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">عدد الطلبات</div>
                    <div className="font-medium">{linkedOrders.length}</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">الوزن الكلي (مدخل)</div>
                    <div className="font-medium">{s.totalWeight ? fmtNumber(s.totalWeight) + ' kg' : '-'} </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">مجموع أوزان الطلبات</div>
                    <div className="font-medium">{fmtNumber(totalOrderWeight)} kg</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">تكلفة الشحن (تقريبي)</div>
                    <div className="font-medium">{fmtCurrency(companyCost)}</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">المحصّلة من الطلبات</div>
                    <div className="font-medium">{fmtCurrency(collected)}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setShowLinkModal({ open: true, shipmentId: s.id })}>ربط طلبات</Button>
                    <Button onClick={() => updateShipmentStatus(s.id, 'pending')}>تحديث إلى التالي</Button>
                    <Button variant="ghost" onClick={() => updateShipmentStatus(s.id, 'prev')}>تراجع</Button>
                  </div>

                  <div className="pt-2 border-t">
                    <Button variant="link" className="text-sm" onClick={() => {
                      setSelectedShipment(s);
                      setShowDetailsModal(true);
                    }}>
                      عرض تفاصيل الطلبات ({linkedOrders.length})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <CreateShipmentModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateShipment} />

      <LinkOrdersModal isOpen={showLinkModal.open} shipment={shipments.find(s => s.id === showLinkModal.shipmentId)} onClose={() => setShowLinkModal({ open: false })} onLink={(ids) => handleLinkOrders(showLinkModal.shipmentId!, ids)} />

      <ShipmentDetailsModalInner isOpen={showDetailsModal} shipment={selectedShipment} onClose={() => { setShowDetailsModal(false); setSelectedShipment(null); }} onUpdate={(u) => {
        // update shipment in-place
        setShipments(prev => prev.map(s => s.id === u.id ? u : s));
        setSelectedShipment(u);
      }} />
    </div>
  );
};

export default Shipments;
