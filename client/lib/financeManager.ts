import { eventBus } from './eventBus';

type ProcessedMap = Record<string, boolean>;

const AUTO_PROCESSED_KEY = 'finance-auto-processed';

const readProcessed = (): ProcessedMap => {
  try {
    const raw = localStorage.getItem(AUTO_PROCESSED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const saveProcessed = (m: ProcessedMap) => {
  try { localStorage.setItem(AUTO_PROCESSED_KEY, JSON.stringify(m)); } catch {}
};

const getEntries = (type: 'revenue' | 'expense') => {
  try {
    const raw = localStorage.getItem(`finance-entries-${type}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveEntries = (type: 'revenue' | 'expense', entries: any[]) => {
  try { localStorage.setItem(`finance-entries-${type}`, JSON.stringify(entries)); } catch {}
};

const pushEntry = (type: 'revenue' | 'expense', entry: any) => {
  const list = getEntries(type);
  saveEntries(type, [entry, ...list]);
  try { eventBus.emit('finance.updated', { type }); } catch {}
};

const makeEntry = (overrides: Partial<any> = {}) => {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    description: overrides.description || 'Automatic entry',
    date: (overrides.date || new Date().toISOString()),
    amount: overrides.amount || 0,
    category: overrides.category || 'تلقائي',
    notes: overrides.notes || '',
    attachments: overrides.attachments || [],
    createdBy: overrides.createdBy || 'system',
    createdAt: overrides.createdAt || new Date().toISOString(),
    automatic: true,
    source: overrides.source || null,
  };
};

// Listen for order updates
eventBus.on('order.updated', (order: any) => {
  try {
    if (!order || !order.id) return;
    const processed = readProcessed();

    // Commission on delivered
    if (order.status === 'delivered' && order.commission && order.commission > 0) {
      const key = `order:commission:${order.id}`;
      if (!processed[key]) {
        const entry = makeEntry({
          description: `عمولة طلب #${order.orderId || order.id}`,
          amount: order.commission,
          category: 'مبيعات',
          notes: `تسجيل تلقائي للعمولة من الطلب ${order.orderId || order.id}`,
          source: { type: 'order', id: order.id, subtype: 'commission' }
        });
        pushEntry('revenue', entry);
        processed[key] = true;
        saveProcessed(processed);
      }
    }

    // Cancellation expense (if explicitly emitted with status cancelled/refunded)
    if ((order.status === 'cancelled' || order.status === 'refunded') && order.commission && order.commission > 0) {
      const key = `order:cancel:${order.id}`;
      if (!processed[key]) {
        const entry = makeEntry({
          description: `إلغاء عمولة طلب #${order.orderId || order.id}`,
          amount: order.commission,
          category: 'إلغاء',
          notes: `سجل تلقائي لمصاريف إلغاء الطلب ${order.orderId || order.id}`,
          source: { type: 'order', id: order.id, subtype: 'cancel' }
        });
        pushEntry('expense', entry);
        processed[key] = true;
        saveProcessed(processed);
      }
    }
  } catch (e) {
    console.error('financeManager order.updated handler error', e);
  }
});

// Listen for explicit order cancellation event
eventBus.on('order.cancelled', (payload: any) => {
  try {
    if (!payload || !payload.order) return;
    const order = payload.order;
    const processed = readProcessed();
    const key = `order:cancel:${order.id}`;
    if (!processed[key] && order.commission && order.commission > 0) {
      const entry = makeEntry({
        description: `إلغاء عمولة طلب #${order.orderId || order.id}`,
        amount: order.commission,
        category: 'إلغاء',
        notes: `سجل تلقائي لمصاريف إلغاء الطلب ${order.orderId || order.id}`,
        source: { type: 'order', id: order.id, subtype: 'cancel' }
      });
      pushEntry('expense', entry);
      processed[key] = true;
      saveProcessed(processed);
    }
  } catch (e) { console.error(e); }
});

// Listen for shipment updates
eventBus.on('shipment.updated', (payload: any) => {
  try {
    if (!payload || !payload.shipment) return;
    const shipment = payload.shipment;
    const collected = Number(payload.collected || 0);
    const companyCost = Number(payload.companyCost || 0);
    const profit = Math.round(collected - companyCost);
    const processed = readProcessed();
    const key = `shipment:profit:${shipment.id}:${shipment.status}`;
    if (!processed[key] && profit !== 0) {
      if (profit > 0) {
        const entry = makeEntry({
          description: `ربح شحنة ${shipment.id}`,
          amount: profit,
          category: 'شحنات',
          notes: `تسجيل تلقائي لربح الشحنة ${shipment.id} (collected:${collected}, cost:${companyCost})`,
          source: { type: 'shipment', id: shipment.id, subtype: shipment.status }
        });
        pushEntry('revenue', entry);
      } else {
        const entry = makeEntry({
          description: `خسارة شحنة ${shipment.id}`,
          amount: Math.abs(profit),
          category: 'شحنات',
          notes: `تسجيل تلقائي لخسارة الشحنة ${shipment.id} (collected:${collected}, cost:${companyCost})`,
          source: { type: 'shipment', id: shipment.id, subtype: shipment.status }
        });
        pushEntry('expense', entry);
      }
      processed[key] = true;
      saveProcessed(processed);
    }
  } catch (e) {
    console.error('financeManager shipment.updated handler error', e);
  }
});

// Export nothing; module runs on import to register listeners
export {};
