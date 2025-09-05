/* Simple localStorage persistence for invoices */
const STORAGE_KEY = 'fc_invoices';

export type StoredInvoice = any; // Keep flexible across pages

const reviveDates = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const copy: any = { ...obj };
  if (copy.createdAt && typeof copy.createdAt === 'string') copy.createdAt = new Date(copy.createdAt);
  if (copy.printedAt && typeof copy.printedAt === 'string') copy.printedAt = new Date(copy.printedAt);
  if (copy.expectedDeliveryDate && typeof copy.expectedDeliveryDate === 'string') copy.expectedDeliveryDate = new Date(copy.expectedDeliveryDate);
  if (Array.isArray(copy.items)) copy.items = copy.items.map((it: any) => ({ ...it }));
  return copy;
};

export const getInvoices = (): StoredInvoice[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(reviveDates);
  } catch {
    return [];
  }
};

export const setInvoices = (invoices: StoredInvoice[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  } catch {
    // ignore
  }
};

export const addInvoice = (invoice: StoredInvoice) => {
  const current = getInvoices();
  const next = [invoice, ...current];
  setInvoices(next);
  return next;
};
