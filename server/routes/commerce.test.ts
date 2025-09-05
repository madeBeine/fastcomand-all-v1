import { describe, it, expect } from 'vitest';
import { calculateCommissionAmount, applyDiscount, chooseShippingTypeFor, calculateShippingCostByWeight } from '../../shared/commerce';

describe('commerce utilities', () => {
  it('calculates commission using percentage default', () => {
    const amount = 10000; // MRU
    const commission = calculateCommissionAmount(amount, undefined, undefined, 5);
    expect(commission).toBe(500);
  });

  it('applies fixed commission policy', () => {
    const policies = [{ id: 'p1', type: 'fixed', value: 200 }];
    const commission = calculateCommissionAmount(10000, policies as any, undefined, 5);
    expect(commission).toBe(200);
  });

  it('applies percentage commission policy for store', () => {
    const policies = [{ id: 'p2', type: 'percentage', value: 10, storeId: 's1' }];
    const commission = calculateCommissionAmount(20000, policies as any, 's1', 5);
    expect(commission).toBe(2000);
  });

  it('applies discount percentage and fixed', () => {
    expect(applyDiscount(10000, 'percentage', 10)).toBe(1000);
    expect(applyDiscount(10000, 'fixed', 250)).toBe(250);
    expect(applyDiscount(10000, 'none', 0)).toBe(0);
  });

  it('chooses active shipping type by date and calculates cost', () => {
    const types = [
      { id: 's1', kind: 'air_standard', country: 'UAE', pricePerKgMRU: 1000, effectiveFrom: '2024-01-01', effectiveTo: '2024-02-01' },
      { id: 's2', kind: 'air_standard', country: 'UAE', pricePerKgMRU: 1200, effectiveFrom: '2024-02-02' },
      { id: 's3', kind: 'air_standard', country: 'CN', pricePerKgMRU: 600 }
    ];
    const selected = chooseShippingTypeFor(types as any, 'air_standard', 'UAE', new Date('2024-01-15'));
    expect(selected?.id).toBe('s1');
    expect(calculateShippingCostByWeight(2.5, selected as any)).toBe(2500);
  });
});
