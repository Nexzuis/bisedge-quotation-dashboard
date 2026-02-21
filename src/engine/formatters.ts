import type { ZAR, EUR } from '../types/quote';

/**
 * Format ZAR currency with R prefix
 *
 * @param amount - Amount in ZAR
 * @param includeDecimals - Whether to include cents (default true)
 * @returns Formatted string (e.g., "R 125,450.00")
 */
export function formatZAR(amount: ZAR, includeDecimals: boolean = true): string {
  if (!Number.isFinite(amount)) return 'R 0.00';
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  };

  return `R ${amount.toLocaleString('en-ZA', options)}`;
}

/**
 * Format EUR currency with € prefix
 *
 * @param amount - Amount in EUR
 * @param includeDecimals - Whether to include cents (default true)
 * @returns Formatted string (e.g., "€ 12,450.50")
 */
export function formatEUR(amount: EUR, includeDecimals: boolean = true): string {
  if (!Number.isFinite(amount)) return '€ 0.00';
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  };

  return `€ ${amount.toLocaleString('en-ZA', options)}`;
}

/**
 * Format percentage
 *
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places (default 2)
 * @returns Formatted string (e.g., "12.45%")
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) return '0.00%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date as DD/MM/YYYY
 *
 * @param date - Date to format
 * @returns Formatted string (e.g., "04/12/2025")
 */
export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format date as YYYYMMDD for filenames
 *
 * @param date - Date to format
 * @returns Formatted string (e.g., "20251204")
 */
export function formatDateFilename(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${year}${month}${day}`;
}

/**
 * Format number with thousands separator
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places (default 0)
 * @returns Formatted string (e.g., "125,450")
 */
export function formatNumber(value: number, decimals: number = 0): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format quote reference number
 *
 * @param quoteNumber - Quote number (e.g., 2142)
 * @param revision - Revision number (default 0)
 * @returns Formatted reference (e.g., "2142.0")
 */
export function formatQuoteRef(quoteNumber: number, revision: number = 0): string {
  return `${quoteNumber}.${revision}`;
}

/**
 * Parse ZAR string to number
 *
 * @param value - String value (e.g., "R 125,450.00" or "125450")
 * @returns Parsed number
 */
export function parseZAR(value: string): number {
  return parseFloat(value.replace(/[R,\s]/g, ''));
}

/**
 * Format duration in months
 *
 * @param months - Number of months
 * @returns Formatted string (e.g., "60 months" or "5 years")
 */
export function formatDuration(months: number): string {
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }
  return `${months} months`;
}

/**
 * Format address array as multiline string
 *
 * @param addressLines - Array of address lines
 * @returns Formatted address string
 */
export function formatAddress(addressLines: string[]): string {
  return addressLines.filter((line) => line.trim()).join('\n');
}

/**
 * Format phone number (South African format)
 *
 * @param phone - Phone number string
 * @returns Formatted phone (e.g., "+27 72 839 9058")
 */
export function formatPhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // If starts with 27, format as international
  if (digits.startsWith('27')) {
    const country = digits.substring(0, 2);
    const area = digits.substring(2, 4);
    const part1 = digits.substring(4, 7);
    const part2 = digits.substring(7, 11);
    return `+${country} ${area} ${part1} ${part2}`;
  }

  // Otherwise, assume local format
  if (digits.length === 10) {
    const area = digits.substring(0, 3);
    const part1 = digits.substring(3, 6);
    const part2 = digits.substring(6, 10);
    return `${area} ${part1} ${part2}`;
  }

  return phone; // Return as-is if format not recognized
}

/**
 * Truncate text with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format compact number (e.g., 1.2M, 450K)
 *
 * @param value - Number to format
 * @returns Compact string
 */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}
