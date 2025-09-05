import { describe, it, expect } from 'vitest';
import { validateSettings } from './settings';

describe('validateSettings', () => {
  it('accepts valid base settings', () => {
    const issues = validateSettings({
      currencies: { rates: { USD: 40, AED: 11, EUR: 43 } },
      shipping: { types: [{ id: 't1', kind: 'air_standard', country: 'UAE', pricePerKgMRU: 1000, durationDays: 7 }] },
      warehouse: { drawers: [{ id: 'A', name: 'A', capacity: 10 }], fullAlertThresholdPercent: 90 },
      ordersInvoices: { defaultCommissionPercent: 5 },
      delivery: { courierProfitPercent: 20 }
    });
    expect(issues.length).toBe(0);
  });

  it('flags overlapping shipping effective dates as error', () => {
    const issues = validateSettings({
      currencies: { rates: { USD: 40 } },
      shipping: { types: [
        { id: 't1', kind: 'air_standard', country: 'UAE', pricePerKgMRU: 1000, effectiveFrom: '2024-01-01', effectiveTo: '2024-02-01' },
        { id: 't2', kind: 'air_standard', country: 'UAE', pricePerKgMRU: 1200, effectiveFrom: '2024-01-15', effectiveTo: '2024-03-01' },
      ]},
      warehouse: { drawers: [{ id: 'A', name: 'A', capacity: 10 }], fullAlertThresholdPercent: 90 },
      ordersInvoices: { defaultCommissionPercent: 5 },
      delivery: { courierProfitPercent: 20 }
    });
    expect(issues.some(i => i.severity === 'error' && i.path === 'shipping.types')).toBe(true);
  });

  it('flags invalid rates and capacities', () => {
    const issues = validateSettings({
      currencies: { rates: { USD: 0 } },
      warehouse: { drawers: [{ id: 'A', name: 'A', capacity: 0 }], fullAlertThresholdPercent: 150 },
      ordersInvoices: { defaultCommissionPercent: 101 },
      delivery: { courierProfitPercent: -1 }
    });
    expect(issues.some(i => i.path.includes('currencies.rates'))).toBe(true);
    expect(issues.some(i => i.path.includes('warehouse.drawers.A.capacity'))).toBe(true);
    expect(issues.some(i => i.path === 'warehouse.fullAlertThresholdPercent')).toBe(true);
    expect(issues.some(i => i.path === 'ordersInvoices.defaultCommissionPercent')).toBe(true);
    expect(issues.some(i => i.path === 'delivery.courierProfitPercent')).toBe(true);
  });
});
