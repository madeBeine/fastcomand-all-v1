import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumericInput from '@/components/NumericInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, Hash, Calendar, Search, Link as LinkIcon, X, Plus, Copy, Edit, Settings as SettingsIcon, Weight, DollarSign, MapPin, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrencyMRU, formatNumberEN, formatDate as fmtDate } from '@/utils/format';
import { eventBus } from '@/lib/eventBus';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';

// Types
export type ShippingType = 'air_standard' | 'air_express' | 'sea' | 'land';

export interface ShippingSettings {
  priceAirStandardPerKg: number;
  priceAirExpressPerKg: number;
  priceSeaPerKg: number;
  priceLandPerKg: number;
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
  paymentStatus: 'paid' | 'unpaid';
  trackingNumber?: string;
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
  priceLandPerKg: 900,
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
    arrivalDate: new Date('2024-01-17'),
    totalWeight: 50,
    pricePerKg: DEFAULT_SHIPPING_SETTINGS.priceAirStandardPerKg,
    status: 'arrived',
    paymentStatus: 'paid',
    trackingNumber: 'ARX-UAE-001',
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
    paymentStatus: 'unpaid',
    trackingNumber: 'DHL-EXP-002',
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
  const shipCurrency: 'MRU'|'USD'|'AED'|'EUR' = (settings.shipping as any).preferredCurrency || 'MRU';
  const convertFromMRU = (mru: number): { amount: number; label: string } => {
    if (shipCurrency === 'MRU') return { amount: mru, label: 'MRU' };
    const rate = (settings.currencies.rates as any)[shipCurrency] || 1;
    const val = rate > 0 ? mru / rate : mru;
    return { amount: val, label: shipCurrency };
  };
  const fmtShipCurrency = (mru: number) => {
    const { amount, label } = convertFromMRU(mru);
    const formatted = label === 'MRU' ? formatCurrencyMRU(Math.round(amount)) : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return label === 'MRU' ? formatted : `${formatted} ${label}`;
  };
  
  const [shipments, setShipments] = useState<Shipment[]>(() =>
    [...initialShipments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  );
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [shipmentsTab, setShipmentsTab] = useState<'active'|'arrived'|'distributed'|'all'>('active');
  const [searchShipments, setSearchShipments] = useState('');
  const [sortBy, setSortBy] = useState<'created_desc'|'origin'|'type'|'status'|'payment'|'arrival'>('created_desc');
  const [viewMode, setViewMode] = useState<'table'|'cards'>('cards');
  
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setViewMode('cards');
    if (mq.matches) apply();
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setViewMode('cards'); };
    mq.addEventListener?.('change', handler);
    return () => { mq.removeEventListener?.('change', handler as any); };
  }, []);
  
  const filteredShipments = React.useMemo(() => {
    let list = [...shipments];
    if (shipmentsTab !== 'all') {
      if (shipmentsTab === 'active') list = list.filter(s => s.status === 'pending' || s.status === 'in_transit');
      else list = list.filter(s => s.status === shipmentsTab);
    }
    const q = searchShipments.trim().toLowerCase();
    if (q) list = list.filter(s => s.id.toLowerCase().includes(q) || s.origin.toLowerCase().includes(q) || s.destination.toLowerCase().includes(q));
    switch (sortBy) {
      case 'origin':
        list.sort((a,b) => a.origin.localeCompare(b.origin)); break;
      case 'type':
        list.sort((a,b) => a.shippingType.localeCompare(b.shippingType)); break;
      case 'status':
        list.sort((a,b) => a.status.localeCompare(b.status)); break;
      case 'payment':
        list.sort((a,b) => (a.paymentStatus||'unpaid').localeCompare(b.paymentStatus||'unpaid')); break;
      case 'arrival':
        list.sort((a,b) => (a.arrivalDate?.getTime()||0) - (b.arrivalDate?.getTime()||0)); break;
      default:
        list.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    return list;
  }, [shipments, shipmentsTab, searchShipments, sortBy]);

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
  const [showSettings, setShowSettings] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState<{ open: boolean; shipmentId?: string }>({ open: false });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // Derive from Settings
  const shippingSettings: ShippingSettings = React.useMemo(() => {
    const types = settings.shipping.types;
    const std = types.find(t => t.kind === 'air_standard')?.pricePerKgMRU ?? DEFAULT_SHIPPING_SETTINGS.priceAirStandardPerKg;
    const exp = types.find(t => t.kind === 'air_express')?.pricePerKgMRU ?? DEFAULT_SHIPPING_SETTINGS.priceAirExpressPerKg;
    const sea = types.find(t => t.kind === 'sea')?.pricePerKgMRU ?? DEFAULT_SHIPPING_SETTINGS.priceSeaPerKg;
    const land = types.find(t => t.kind === 'land')?.pricePerKgMRU ?? DEFAULT_SHIPPING_SETTINGS.priceLandPerKg;
    return { priceAirStandardPerKg: std, priceAirExpressPerKg: exp, priceSeaPerKg: sea, priceLandPerKg: land };
  }, [settings]);

  const availableCountries = React.useMemo(() => {
    const codeToLabel: Record<string,string> = {
      UAE: 'الإمارات (دبي)',
      CN: 'الصين',
      TR: 'تركيا',
      SA: 'السعودية',
      QA: 'قطر',
      EG: 'مصر',
      MA: 'المغرب',
      DZ: 'الجزائر',
      TN: 'تونس',
    };
    const base = ['UAE','CN','TR'];
    const list = [
      ...base,
      ...settings.shipping.types.map(t=> t.country).filter(Boolean) as string[],
      ...settings.shipping.companies.flatMap(c=> c.countries).filter(Boolean) as string[],
    ];
    const unique = Array.from(new Set(list));
    return unique.map(code => ({ code, label: codeToLabel[code] || code })).sort((a,b)=> a.label.localeCompare(b.label));
  }, [settings]);

  const originLabel = React.useCallback((v: string) => {
    const f = availableCountries.find(c=> c.code === v);
    if (f) return f.label;
    const nameToLabel: Record<string,string> = {
      'dubai': 'الإمارات (دبي)',
      'uae': 'الإمارات (دبي)',
      'china': 'الصين',
      'cn': 'الصين',
      'turkey': 'تركيا',
      'riyadh': 'السعودية',
      'saudi': 'السعودية',
      'morocco': 'المغرب',
    };
    const k = (v || '').toLowerCase();
    return nameToLabel[k] || v;
  }, [availableCountries]);

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
      partial.shippingType === 'air_express' ? shippingSettings.priceAirExpressPerKg : partial.shippingType === 'sea' ? shippingSettings.priceSeaPerKg : partial.shippingType === 'land' ? shippingSettings.priceLandPerKg : shippingSettings.priceAirStandardPerKg
    );

    const createdAt = new Date();
    const typeDurations: Record<ShippingType, number> = { air_express: 3, air_standard: 7, sea: 30, land: 15 } as any;
    const candidates = settings.shipping.types.filter(x => x.kind === (partial.shippingType || 'air_standard') && (!x.country || x.country === partial.origin));
    const t = candidates.sort((a,b) => (new Date(b.effectiveFrom || '1970-01-01').getTime()) - (new Date(a.effectiveFrom || '1970-01-01').getTime()))[0];
    const days = t?.durationDays ?? typeDurations[(partial.shippingType || 'air_standard') as ShippingType] ?? 7;
    const arrivalDate = new Date(createdAt.getTime() + days*24*60*60*1000);

    const newShipment: Shipment = {
      id,
      name: partial.name || `Shipment ${id}`,
      shippingType: partial.shippingType || 'air_standard',
      origin: partial.origin || '',
      destination: 'Nouakchott',
      createdAt,
      arrivalDate,
      totalWeight: partial.totalWeight,
      pricePerKg,
      status: 'pending',
      paymentStatus: (partial.paymentStatus as any) || 'unpaid',
      trackingNumber: partial.trackingNumber,
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

  const updateShipmentStatus = (shipmentId: string, action: 'next' | 'prev' | Shipment['status']) => {
    const updatedList = shipments.map(s => {
      if (s.id !== shipmentId) return s;
      const idx = STATUS_FLOW.indexOf(s.status);
      let newStatus: Shipment['status'] = s.status;
      let history = s.history ?? [];
      if (action === 'prev') {
        const prevStatus = history.length > 0 ? history[history.length - 1] : (idx > 0 ? STATUS_FLOW[idx - 1] : s.status);
        history = history.slice(0, Math.max(0, history.length - 1));
        newStatus = prevStatus as Shipment['status'];
      } else if (action === 'next') {
        const nextIdx = Math.min(STATUS_FLOW.length - 1, idx + 1);
        if (STATUS_FLOW[nextIdx] !== s.status) {
          history = [...(history || []), s.status];
          newStatus = STATUS_FLOW[nextIdx];
        }
      } else {
        if (STATUS_FLOW.includes(action)) {
          if (action !== s.status) history = [...(history || []), s.status];
          newStatus = action;
        }
      }

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

  const statusLabel = (s: Shipment['status']) => {
    switch (s) {
      case 'pending': return 'قيد المعالجة';
      case 'in_transit': return 'في الطريق';
      case 'arrived': return 'وصلت';
      case 'distributed': return 'موزعة';
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
    const [autoName, setAutoName] = useState(true);
    const LAST_PREFS = 'shipments_last_prefs_v1';
    const savePrefs = (p: any) => { try { localStorage.setItem(LAST_PREFS, JSON.stringify(p)); } catch {} };
    const readPrefs = (): any => { try { const raw = localStorage.getItem(LAST_PREFS); return raw? JSON.parse(raw): {}; } catch { return {}; } };
    const [shippingType, setShippingType] = useState<ShippingType>('air_standard');
    const [origin, setOrigin] = useState('');
    const destination = 'Nouakchott';
    const [useLast, setUseLast] = useState(true);
    const [notes, setNotes] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<'paid'|'unpaid'>('unpaid');
    const [weight, setWeight] = useState<string>('');
    const computePricePerKg = (t: ShippingType) => t==='air_express'? shippingSettings.priceAirExpressPerKg : t==='sea'? shippingSettings.priceSeaPerKg : t==='land'? shippingSettings.priceLandPerKg : shippingSettings.priceAirStandardPerKg;
    const pricePerKg = computePricePerKg(shippingType);
    const durationDays = React.useMemo(() => {
      const candidates = settings.shipping.types.filter(x => x.kind === shippingType && (!x.country || x.country === origin));
      const t = candidates.sort((a,b) => (new Date(b.effectiveFrom || '1970-01-01').getTime()) - (new Date(a.effectiveFrom || '1970-01-01').getTime()))[0];
      if (t?.durationDays) return t.durationDays;
      return shippingType==='air_express'?3: shippingType==='sea'?30: shippingType==='land'?15:7;
    }, [shippingType, origin, settings]);
    const eta = React.useMemo(() => {
      const d = new Date();
      d.setDate(d.getDate() + durationDays);
      return d;
    }, [durationDays]);

    useEffect(() => {
      if (isOpen) {
        setId(generateNextShipmentId());
        const prefs = readPrefs();
        const lastType = (prefs.shippingType as ShippingType) || 'air_standard';
        const lastOrigin = prefs.origin || '';
        setShippingType(useLast ? lastType : 'air_standard');
        setOrigin(useLast ? lastOrigin : '');
        setNotes((settings.shipping as any).defaultInstructions || '');
        setAutoName(true);
        setName('');
        setTrackingNumber('');
        setPaymentStatus('unpaid');
        setWeight('');
      }
    }, [isOpen, useLast]);

    // lock background scroll when modal is open
    useEffect(() => {
      if (!isOpen) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }, [isOpen]);

    React.useEffect(()=>{
      if (autoName) {
        const typeLabel = shippingType==='air_express'? 'شحنة سريعة' : shippingType==='sea'? 'شحنة بحرية' : shippingType==='land'? 'شحنة برية' : 'شحنة جوية';
        setName(`${typeLabel} ${id}`);
      }
    }, [shippingType, id, autoName]);

    if (!isOpen) return null;

    const currentCost = ((Number(weight||0) || 0) * pricePerKg);

    return (
      <div className="fixed inset-0 z-40 modal-overlay overflow-y-auto">
        <div className="min-h-full flex items-start sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full mx-auto" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-brand-blue to-brand-orange text-white rounded-t-xl">
              <div className="flex items-center gap-3">
                <Package className="text-white" size={24} />
                <h3 className="font-bold text-xl">إنشاء شحنة جديدة</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="text-white" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto modal-content-scrollable scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {/* بطاقات معلومات الشحنة */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* بطاقة معلومات الشحنة */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Hash size={20} className="text-brand-blue" />
                      معلومات الشحنة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">رقم الشحنة</label>
                        <Input 
                          value={id} 
                          onChange={(e) => setId(e.target.value)} 
                          className="font-mono bg-gray-50 border-2 focus:border-brand-blue transition-colors" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">اس�� الشحنة</label>
                        <Input 
                          value={name} 
                          onChange={(e) => { setName(e.target.value); setAutoName(false); }} 
                          className="border-2 focus:border-brand-blue transition-colors" 
                        />
                        <label className="inline-flex items-center gap-2 text-xs mt-2 text-gray-600">
                          <input 
                            type="checkbox" 
                            checked={autoName} 
                            onChange={(e)=> setAutoName(e.target.checked)} 
                            className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                          /> 
                          تسمية تلقائية
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">نوع الشحن</label>
                        <select 
                          value={shippingType} 
                          onChange={(e) => setShippingType(e.target.value as ShippingType)} 
                          className="w-full px-3 py-2 border-2 rounded-lg focus:border-brand-blue transition-colors"
                        >
                          <option value="air_standard">جوي عادي - {fmtShipCurrency(shippingSettings.priceAirStandardPerKg)}/kg</option>
                          <option value="air_express">جوي سريع - {fmtShipCurrency(shippingSettings.priceAirExpressPerKg)}/kg</option>
                          <option value="sea">بحري - {fmtShipCurrency(shippingSettings.priceSeaPerKg)}/kg</option>
                          <option value="land">بري - {fmtShipCurrency(shippingSettings.priceLandPerKg)}/kg</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">رقم التتبع (اختياري)</label>
                        <Input 
                          value={trackingNumber} 
                          onChange={(e)=> setTrackingNumber(e.target.value)} 
                          className="font-mono border-2 focus:border-brand-blue transition-colors" 
                          placeholder="مثال: DHL-12345"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* بطاقة التكاليف والوزن */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign size={20} className="text-brand-orange" />
                      التكاليف والوزن
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">الوزن الكلي (اختياري)</label>
                      <div className="relative">
                        <NumericInput 
                          value={weight} 
                          onChange={setWeight} 
                          className="border-2 focus:border-brand-orange transition-colors pl-8" 
                          placeholder="0.0"
                        />
                        <Weight size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">السعر/كجم</label>
                      <div className="p-3 border rounded-lg bg-gray-50 text-sm font-medium">
                        {fmtCurrency(pricePerKg)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">التكلفة المتوقعة</label>
                      <div className={cn(
                        "p-3 border rounded-lg text-lg font-bold transition-all duration-300",
                        currentCost > 0 ? "bg-brand-orange/10 border-brand-orange text-brand-orange" : "bg-gray-50 text-gray-600"
                      )}>
                        {fmtShipCurrency(currentCost)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">حالة الدفع</label>
                      <select 
                        value={paymentStatus} 
                        onChange={(e)=> setPaymentStatus(e.target.value as any)} 
                        className="w-full px-3 py-2 border-2 rounded-lg focus:border-brand-orange transition-colors"
                      >
                        <option value="unpaid">غير مدفوع</option>
                        <option value="paid">مدفوع</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>

                {/* بطاقة الوجهة والتوقيت */}
                <Card className="lg:col-span-3">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MapPin size={20} className="text-green-600" />
                      الوجهة والتوقيت
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">من (الدولة المرسلة)</label>
                        <select 
                          value={origin} 
                          onChange={(e)=> setOrigin(e.target.value)} 
                          className="w-full px-3 py-2 border-2 rounded-lg focus:border-green-500 transition-colors"
                        >
                          <option value="">اختر الدولة</option>
                          {availableCountries.map(c => (
                            <option key={c.code} value={c.code}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">إلى</label>
                        <div className="p-3 border rounded-lg bg-green-50 text-sm font-medium text-green-700">
                          🇲🇷 نواكشوط (الوجهة الثابتة)
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الوصول المتوقع</label>
                        <div className="flex items-center gap-2 p-3 border rounded-lg bg-blue-50">
                          <Clock size={16} className="text-blue-600" />
                          <span className="text-sm font-medium text-blue-700">
                            {new Intl.DateTimeFormat('ar-SA', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            }).format(eta)} ({durationDays} أيام)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                      <textarea 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        className="w-full p-3 border-2 rounded-lg focus:border-brand-blue transition-colors" 
                        rows={3} 
                        placeholder="ملاحظات أو تعليمات خاصة بالشحنة..."
                      />
                    </div>

                    <div className="mt-4">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                        <input 
                          type="checkbox" 
                          checked={useLast} 
                          onChange={(e)=> setUseLast(e.target.checked)} 
                          className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                        /> 
                        حفظ آخر قيم (المنشأ/النوع) للاستخدام التالي
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 modal-footer bg-gray-50 rounded-b-xl">
              <div className="text-sm text-gray-600">
                التاريخ: {new Intl.DateTimeFormat('ar-SA', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }).format(new Date())}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={onClose} className="border-2">
                  إلغاء
                </Button>
                <Button 
                  onClick={() => { 
                    if (!origin.trim()) { 
                      alert('البلد المرسل منه إلزامي'); 
                      return; 
                    } 
                    savePrefs({ origin, shippingType }); 
                    onCreate({ 
                      id, 
                      name, 
                      shippingType, 
                      origin, 
                      destination: 'Nouakchott', 
                      notes, 
                      pricePerKg, 
                      trackingNumber, 
                      paymentStatus, 
                      totalWeight: weight? Number(weight): undefined 
                    }); 
                  }}
                  className="bg-gradient-to-r from-brand-blue to-brand-orange border-0 text-white px-6"
                >
                  <Plus size={16} className="mr-2" />
                  إنشاء الشحنة
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LinkOrdersModal: React.FC<{ isOpen: boolean; shipment?: Shipment; onClose: () => void; onLink: (ids: string[]) => void }> = ({ isOpen, shipment, onClose, onLink }) => {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [bulk, setBulk] = useState('');

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <textarea value={bulk} onChange={(e)=> setBulk(e.target.value)} placeholder="ألصق أرقام الطلبات/التتبعات مفصولة بفواصل أو أسطر" className="md:col-span-2 p-2 border rounded text-sm" rows={2} />
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => {
                    const ids = bulk.split(/\s|,|\n/).map(s=> s.trim()).filter(Boolean);
                    const next: Record<string, boolean> = { ...selected };
                    results.forEach(o => { if (ids.includes(String(o.orderId)) || ids.includes(o.trackingNumber||'')) next[o.id] = true; });
                    setSelected(next);
                  }}>تحديد جماعي</Button>
                  <Button variant="ghost" onClick={() => setSelected({})}>مسح التحديد</Button>
                </div>
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
                  <Badge className="text-xs">{localShipment.shippingType === 'air_express' ? 'جوي سريع' : localShipment.shippingType === 'sea' ? 'بحري' : localShipment.shippingType === 'land' ? 'بري' : 'جوي عادي'}</Badge>
                  <button className="p-2" onClick={() => handleCopy(localShipment.id)} title="Copy shipment id"><Copy size={16} /></button>
                </div>
                <div className="text-sm text-gray-600">{localShipment.origin} → {localShipment.destination} • {new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(localShipment.createdAt)}</div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => {
                  // advance status
                  updateShipmentStatus(localShipment.id, 'next');
                  const updated = shipments.find(s => s.id === localShipment.id)!;
                  setLocalShipment(updated);
                  onUpdate(updated);
                }}>تحديث الحال��</Button>

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
                      <Button variant="outline" onClick={() => { onUpdate(localShipment); alert('Updated'); }}>حفظ</Button>
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
                    <div className="flex items-center justify-between mt-2">
                      <span>الحالة الحالية</span>
                      <Badge className={cn(
                        "text-xs",
                        localShipment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        localShipment.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                        localShipment.status === 'arrived' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {statusLabel(localShipment.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span>تغيير الحالة</span>
                      <select
                        value={localShipment.status}
                        onChange={(e) => {
                          const ns = e.target.value as Shipment['status'];
                          updateShipmentStatus(localShipment.id, ns);
                          const updated = shipments.find(s => s.id === localShipment.id)!;
                          setLocalShipment({ ...updated });
                          onUpdate(updated);
                        }}
                        className="px-2 py-1 border rounded text-xs"
                      >
                        <option value="pending">قيد المعالجة</option>
                        <option value="in_transit">في الطريق</option>
                        <option value="arrived">وصلت</option>
                        <option value="distributed">موزعة</option>
                      </select>
                    </div>
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
                  <div className="text-sm text-gray-600">المحصّلة من الطلبات</div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <Card className="border-0 bg-gradient-to-r from-brand-blue via-brand-blue to-brand-orange text-white shadow-2xl rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                    <Package size={32} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold mb-1">إدارة الشحنات</h1>
                    <p className="text-white/90">نظام ذكي ومتطور لإدارة الشحنات والطلبات</p>
                  </div>
                </div>
                
                <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch md:items-center gap-2">
                  <Button
                    onClick={() => setShowSettings(true)} 
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur"
                  >
                    <SettingsIcon size={16} className="mr-2" />
                    ⚙️ إعدادات الشحنات
                  </Button>
                  <Button 
                    onClick={() => setShowCreateModal(true)} 
                    className="bg-white text-brand-blue hover:bg-white/90 font-medium"
                  >
                    <Plus size={16} className="mr-2" />
                    شحنة جديدة
                  </Button>
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-sm">إجمالي الشحنات</p>
                      <p className="text-2xl font-bold text-white">{shipments.length}</p>
                    </div>
                    <Package className="text-white/60" size={24} />
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-sm">النشطة</p>
                      <p className="text-2xl font-bold text-white">
                        {shipments.filter(s => s.status === 'pending' || s.status === 'in_transit').length}
                      </p>
                    </div>
                    <Clock className="text-white/60" size={24} />
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-sm">وصلت</p>
                      <p className="text-2xl font-bold text-white">
                        {shipments.filter(s => s.status === 'arrived').length}
                      </p>
                    </div>
                    <CheckCircle className="text-white/60" size={24} />
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-sm">غير مدفوعة</p>
                      <p className="text-2xl font-bold text-white">
                        {shipments.filter(s => s.paymentStatus === 'unpaid').length}
                      </p>
                    </div>
                    <AlertCircle className="text-white/60" size={24} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="بحث برقم الشحنة، المنشأ، الوجهة..."
                  className="pl-10 border-2 focus:border-brand-blue"
                  onChange={(e) => setSearchShipments(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                {[
                  { key: 'active', label: 'النشطة', color: 'bg-blue-500' },
                  { key: 'arrived', label: 'وصلت', color: 'bg-green-500' },
                  { key: 'distributed', label: 'موزعة', color: 'bg-gray-500' },
                  { key: 'all', label: 'الكل', color: 'bg-brand-orange' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setShipmentsTab(tab.key as any)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      shipmentsTab === tab.key
                        ? `${tab.color} text-white shadow-lg`
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <select
                className="px-4 py-2 border-2 rounded-lg focus:border-brand-blue"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="created_desc">الأحدث أولاً</option>
                <option value="origin">البلد</option>
                <option value="type">النوع</option>
                <option value="status">الحالة</option>
                <option value="payment">حالة الدفع</option>
                <option value="arrival">تاريخ الوصول</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Shipments Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredShipments.map(s => {
            const { linkedOrders, totalOrderWeight, collected, companyCost } = shipmentMetrics(s);

            return (
              <Card key={s.id} className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-4 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-blue rounded-lg">
                        <Hash className="text-white" size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{s.id}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {originLabel(s.origin)} → نواكشوط
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge 
                        className={cn(
                          "text-xs font-medium",
                          s.shippingType === 'air_express' ? 'bg-red-100 text-red-700' :
                          s.shippingType === 'sea' ? 'bg-blue-100 text-blue-700' :
                          s.shippingType === 'land' ? 'bg-green-100 text-green-700' :
                          'bg-yellow-100 text-yellow-700'
                        )}
                      >
                        {s.shippingType === 'air_express' ? '✈️ جوي سريع' : 
                         s.shippingType === 'sea' ? '🚢 بحري' : 
                         s.shippingType === 'land' ? '🚛 بري' : '✈️ جوي عادي'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  {/* بطاقة معلومات الحالة */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <AlertCircle size={16} />
                      الحالة وال��واريخ
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">الحالة</span>
                        <Badge className={cn(
                          "text-xs",
                          s.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          s.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                          s.status === 'arrived' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        )}>
                          {statusLabel(s.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">تغيير الحالة</span>
                        <select
                          value={s.status}
                          onChange={(e) => updateShipmentStatus(s.id, e.target.value as any)}
                          className="px-2 py-1 border rounded text-xs"
                        >
                          <option value="pending">قيد المعالجة</option>
                          <option value="in_transit">في الطريق</option>
                          <option value="arrived">وصلت</option>
                          <option value="distributed">موزعة</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">تاريخ الإنشاء</span>
                        <span className="text-sm font-medium">
                          {new Intl.DateTimeFormat('ar-SA', {
                            month: 'short',
                            day: 'numeric'
                          }).format(s.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">الوصول المتوقع</span>
                        <span className="text-sm font-medium">
                          {s.arrivalDate ? new Intl.DateTimeFormat('ar-SA', {
                            month: 'short',
                            day: 'numeric'
                          }).format(s.arrivalDate) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* بطاقة الأوزان والتكاليف */}
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
                    <h4 className="font-semibold text-sm text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
                      <Weight size={16} />
                      الأوزان والتكاليف
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">الوزن المدخل</span>
                        <span className="text-sm font-medium">
                          {s.totalWeight ? `${fmtNumber(s.totalWeight)} كجم` : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">مجموع الطلبات</span>
                        <span className="text-sm font-medium">{fmtNumber(totalOrderWeight)} كجم</span>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="text-sm font-medium text-orange-700">التكلفة المتوقعة</span>
                        <span className="text-lg font-bold text-orange-700">
                          {fmtShipCurrency(companyCost)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* بطاقة الطلبات */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                    <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                      <Package size={16} />
                      الطلبات المرتبطة
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">عدد الطلبات</span>
                        <span className="text-sm font-medium">{linkedOrders.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">المحصّل</span>
                        <span className="text-sm font-medium">{fmtCurrency(collected)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">حالة الدفع</span>
                        <Badge className={cn(
                          "text-xs",
                          s.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        )}>
                          {s.paymentStatus === 'paid' ? '✅ مدفوع' : '❌ غير مدفوع'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowLinkModal({ open: true, shipmentId: s.id })}
                      className="flex-1 border-2 hover:border-brand-blue"
                    >
                      <LinkIcon size={14} className="mr-1" />
                      ربط طلبات
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => updateShipmentStatus(s.id, 'next')}
                      className="flex-1 bg-brand-blue hover:bg-brand-blue/90"
                    >
                      تحديث الحالة
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedShipment(s);
                        setShowDetailsModal(true);
                      }}
                      className="px-3"
                    >
                      <Edit size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <CreateShipmentModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        onCreate={handleCreateShipment} 
      />

      <LinkOrdersModal 
        isOpen={showLinkModal.open} 
        shipment={shipments.find(s => s.id === showLinkModal.shipmentId)} 
        onClose={() => setShowLinkModal({ open: false })} 
        onLink={(ids) => handleLinkOrders(showLinkModal.shipmentId!, ids)} 
      />

      <ShipmentDetailsModalInner 
        isOpen={showDetailsModal} 
        shipment={selectedShipment} 
        onClose={() => { 
          setShowDetailsModal(false); 
          setSelectedShipment(null); 
        }} 
        onUpdate={(u) => {
          setShipments(prev => prev.map(s => s.id === u.id ? u : s));
          setSelectedShipment(u);
        }} 
      />

      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="right" className="w-full sm:max-w-lg max-h-screen overflow-y-auto p-0">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <SettingsIcon size={20} />
              ⚙️ إعدادات الشحنات المتقدمة
            </SheetTitle>
          </SheetHeader>
          <ShipmentsSettingsPanel onClose={() => setShowSettings(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
};

const ShipmentsSettingsPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { settings, update } = useSettings();
  const { toast } = useToast();
  const find = (kind: ShippingType) => settings.shipping.types.find(t => t.kind === kind && !t.country);
  const [priceStd, setPriceStd] = useState<number>(find('air_standard')?.pricePerKgMRU ?? DEFAULT_SHIPPING_SETTINGS.priceAirStandardPerKg);
  const [daysStd, setDaysStd] = useState<number>(find('air_standard')?.durationDays ?? 7);
  const [priceExp, setPriceExp] = useState<number>(find('air_express')?.pricePerKgMRU ?? DEFAULT_SHIPPING_SETTINGS.priceAirExpressPerKg);
  const [daysExp, setDaysExp] = useState<number>(find('air_express')?.durationDays ?? 3);
  const [priceSea, setPriceSea] = useState<number>(find('sea')?.pricePerKgMRU ?? DEFAULT_SHIPPING_SETTINGS.priceSeaPerKg);
  const [daysSea, setDaysSea] = useState<number>(find('sea')?.durationDays ?? 30);
  const [priceLand, setPriceLand] = useState<number>(settings.shipping.types.find(t => t.kind === 'land' && !t.country)?.pricePerKgMRU ?? DEFAULT_SHIPPING_SETTINGS.priceLandPerKg);
  const [daysLand, setDaysLand] = useState<number>(settings.shipping.types.find(t => t.kind === 'land' && !t.country)?.durationDays ?? 15);
  const [preferredCurrency, setPreferredCurrency] = useState<'MRU'|'USD'|'AED'|'EUR'>(((settings.shipping as any).preferredCurrency) || 'MRU');
  const [defaultInstructions, setDefaultInstructions] = useState<string>(((settings.shipping as any).defaultInstructions) || '');

  const save = async () => {
    const nextTypes = [...settings.shipping.types];
    const upsert = (kind: ShippingType | 'land', price: number, days: number) => {
      const idx = nextTypes.findIndex(t => t.kind === (kind as any) && !t.country);
      const base = { id: idx >= 0 ? nextTypes[idx].id : `${kind}-default`, kind: kind as any, pricePerKgMRU: price, durationDays: days } as any;
      if (idx >= 0) nextTypes[idx] = { ...nextTypes[idx], pricePerKgMRU: price, durationDays: days } as any;
      else nextTypes.push(base);
    };
    upsert('air_standard', priceStd, daysStd);
    upsert('air_express', priceExp, daysExp);
    upsert('sea', priceSea, daysSea);
    upsert('land', priceLand, daysLand);
    await update({ shipping: { ...settings.shipping, types: nextTypes, preferredCurrency, defaultInstructions } });
    try { toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات الشحنات بنجاح.' }); } catch {}
    onClose?.();
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="space-y-4">
        {/* جوي عادي */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              ✈️ جوي عادي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">السعر/كجم (MRU)</label>
                <Input 
                  type="number" 
                  value={priceStd} 
                  onChange={(e) => setPriceStd(Number(e.target.value || 0))} 
                  className="border-2 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">أيام الوصول</label>
                <Input 
                  type="number" 
                  value={daysStd} 
                  onChange={(e) => setDaysStd(Number(e.target.value || 0))} 
                  className="border-2 focus:border-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* جوي سريع */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              ⚡ جوي سريع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">السعر/كجم (MRU)</label>
                <Input 
                  type="number" 
                  value={priceExp} 
                  onChange={(e) => setPriceExp(Number(e.target.value || 0))} 
                  className="border-2 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">أيام الوصول</label>
                <Input 
                  type="number" 
                  value={daysExp} 
                  onChange={(e) => setDaysExp(Number(e.target.value || 0))} 
                  className="border-2 focus:border-red-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* بحري */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              🚢 بحري
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">السعر/كجم (MRU)</label>
                <Input 
                  type="number" 
                  value={priceSea} 
                  onChange={(e) => setPriceSea(Number(e.target.value || 0))} 
                  className="border-2 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">أيام الوصول</label>
                <Input 
                  type="number" 
                  value={daysSea} 
                  onChange={(e) => setDaysSea(Number(e.target.value || 0))} 
                  className="border-2 focus:border-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* بري */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              🚛 بري
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">السعر/كجم (MRU)</label>
                <Input 
                  type="number" 
                  value={priceLand} 
                  onChange={(e) => setPriceLand(Number(e.target.value || 0))} 
                  className="border-2 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">أيام ا��وصول</label>
                <Input 
                  type="number" 
                  value={daysLand} 
                  onChange={(e) => setDaysLand(Number(e.target.value || 0))} 
                  className="border-2 focus:border-green-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* العملة المعتمدة */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              💱 العملة المعتمدة للشحنات الكبيرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select 
              value={preferredCurrency} 
              onChange={(e) => setPreferredCurrency(e.target.value as any)} 
              className="w-full px-3 py-2 border-2 rounded-lg focus:border-brand-orange"
            >
              <option value="MRU">🇲🇷 أوقية موريتانية (MRU)</option>
              <option value="USD">🇺🇸 دولار أمريكي (USD)</option>
              <option value="AED">🇦🇪 درهم ��ماراتي (AED)</option>
              <option value="EUR">🇪🇺 يورو (EUR)</option>
            </select>
          </CardContent>
        </Card>

        {/* ملاحظات افتراضية */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              📝 ملاحظات/تعليمات افتراضية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea 
              className="w-full p-3 border-2 rounded-lg focus:border-brand-blue" 
              rows={4} 
              value={defaultInstructions} 
              onChange={(e) => setDefaultInstructions(e.target.value)}
              placeholder="اكتب الملاحظات أو التعليمات الافتراضية للشحنات..."
            />
          </CardContent>
        </Card>
      </div>

      <SheetFooter className="pt-6">
        <Button 
          onClick={save} 
          className="w-full bg-gradient-to-r from-brand-blue to-brand-orange text-white font-medium py-3"
        >
          💾 حفظ جميع الإعدادات
        </Button>
      </SheetFooter>
    </div>
  );
};

export default Shipments;
