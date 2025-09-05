export interface CommissionPolicy {
  id: string;
  storeId?: string;
  type: 'percentage' | 'fixed';
  value: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface ShippingTypeCfg {
  id: string;
  kind: string;
  country?: string;
  pricePerKgMRU: number;
  durationDays?: number;
  companyId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export function normalizeDate(d?: string | Date) {
  if (!d) return null;
  const t = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(t.getTime())) return null;
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

export function isInRange(date: Date, from?: string, to?: string) {
  const d = normalizeDate(date);
  if (!d) return false;
  const f = normalizeDate(from as any);
  const t = normalizeDate(to as any);
  if (f && d.getTime() < f.getTime()) return false;
  if (t && d.getTime() > t.getTime()) return false;
  return true;
}

export function findActiveCommissionPolicy(policies: CommissionPolicy[] = [], storeId?: string, at?: Date) {
  const now = at || new Date();
  // prefer store-specific policies then general, latest effectiveFrom first
  const candidates = policies.filter(p => (!p.storeId || p.storeId === storeId) && isInRange(now, p.effectiveFrom, p.effectiveTo));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const aFrom = a.effectiveFrom ? new Date(a.effectiveFrom).getTime() : 0;
    const bFrom = b.effectiveFrom ? new Date(b.effectiveFrom).getTime() : 0;
    return bFrom - aFrom;
  });
  return candidates[0];
}

export function calculateCommissionAmount(amountMRU: number, policies: CommissionPolicy[] | undefined, storeId?: string, defaultPercent = 5, at?: Date) {
  const policy = findActiveCommissionPolicy(policies || [], storeId, at);
  if (!policy) return Math.round((defaultPercent / 100) * amountMRU);
  if (policy.type === 'percentage') return Math.round((policy.value / 100) * amountMRU);
  return Math.round(policy.value);
}

export function applyDiscount(amountMRU: number, discountType?: 'percentage' | 'fixed' | 'none', discountValue?: number) {
  if (!discountType || discountType === 'none') return 0;
  if (discountType === 'percentage') return Math.round((discountValue || 0) / 100 * amountMRU);
  return Math.round(discountValue || 0);
}

export function chooseShippingTypeFor(types: ShippingTypeCfg[] = [], kind?: string, country?: string, at?: Date) {
  const date = at || new Date();
  // prefer exact kind+country with active effective range
  const candidates = types.filter(t => t.kind === kind && (!t.country || t.country === country));
  // try active dated ones first
  const active = candidates.filter(t => (!t.effectiveFrom && !t.effectiveTo) || isInRange(date, t.effectiveFrom, t.effectiveTo));
  if (active.length > 0) {
    // prefer most specific (country present), then earliest effectiveFrom
    active.sort((a, b) => {
      const aScore = a.country ? 1 : 0;
      const bScore = b.country ? 1 : 0;
      if (bScore !== aScore) return bScore - aScore;
      const aFrom = a.effectiveFrom ? new Date(a.effectiveFrom).getTime() : 0;
      const bFrom = b.effectiveFrom ? new Date(b.effectiveFrom).getTime() : 0;
      return bFrom - aFrom;
    });
    return active[0];
  }
  // fallback to any candidate ignoring dates
  if (candidates.length > 0) return candidates[0];
  // fallback to any type matching country only
  const countryOnly = types.filter(t => t.country === country);
  if (countryOnly.length > 0) return countryOnly[0];
  return null;
}

export function calculateShippingCostByWeight(weightKg: number, selectedType: ShippingTypeCfg | null) {
  if (!selectedType) return 0;
  return Math.round((selectedType.pricePerKgMRU || 0) * weightKg);
}
