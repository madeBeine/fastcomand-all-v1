// Utilities for consistent formatting across the app (Gregorian dates, English numbers, MRU currency)

// Convert Arabic-Indic and Extended Arabic-Indic digits to ASCII digits
export function toEnglishDigits(input: string): string {
  const arabicIndic = /[\u0660-\u0669]/g; // ٠-٩
  const extendedArabicIndic = /[\u06F0-\u06F9]/g; // ۰-۹
  return input
    .replace(arabicIndic, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(extendedArabicIndic, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function formatNumberEN(value: number | string, options?: Intl.NumberFormatOptions): string {
  const n = typeof value === 'string' ? Number(toEnglishDigits(value)) : value;
  const safe = Number.isFinite(n) ? (n as number) : 0;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, ...(options || {}) }).format(safe);
}

export function formatCurrencyMRU(value: number | string): string {
  const n = typeof value === 'string' ? Number(toEnglishDigits(value)) : value;
  const safe = Number.isFinite(n) ? (n as number) : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MRU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(d);
}

// Normalize numeric input to English digits and a safe numeric string (keeps one decimal separator)
export function normalizeNumericInput(value: string): string {
  const ascii = toEnglishDigits(value);
  // Keep digits and a single dot
  let cleaned = ascii.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
  return cleaned;
}
