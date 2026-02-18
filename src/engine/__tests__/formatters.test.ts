import { describe, it, expect } from 'vitest';
import {
  formatZAR,
  formatEUR,
  formatPercentage,
  formatDate,
  formatDateFilename,
  formatNumber,
  formatQuoteRef,
  parseZAR,
  formatDuration,
  formatAddress,
  formatPhone,
  truncate,
  formatCompact,
} from '../formatters';

// ─── formatZAR ─────────────────────────────────────────────────
describe('formatZAR', () => {
  it('formats with decimals by default', () => {
    const result = formatZAR(125450);
    expect(result).toContain('R');
    expect(result).toContain('125');
    expect(result).toContain('450');
  });

  it('formats without decimals when specified', () => {
    const result = formatZAR(125450.99, false);
    expect(result).not.toContain('.99');
  });

  it('handles 0', () => {
    const result = formatZAR(0);
    expect(result).toContain('R');
    expect(result).toContain('0');
  });
});

// ─── formatEUR ─────────────────────────────────────────────────
describe('formatEUR', () => {
  it('formats with EUR symbol', () => {
    const result = formatEUR(12450.5);
    expect(result).toContain('€');
    expect(result).toContain('12');
  });
});

// ─── formatPercentage ──────────────────────────────────────────
describe('formatPercentage', () => {
  it('formats with default 2 decimals', () => {
    expect(formatPercentage(12.456)).toBe('12.46%');
  });

  it('formats with custom decimals', () => {
    expect(formatPercentage(12.456, 1)).toBe('12.5%');
  });

  it('formats integer percentages', () => {
    expect(formatPercentage(50, 0)).toBe('50%');
  });
});

// ─── formatDate ────────────────────────────────────────────────
describe('formatDate', () => {
  it('formats as DD/MM/YYYY', () => {
    const date = new Date(2025, 11, 4); // Dec 4, 2025
    expect(formatDate(date)).toBe('04/12/2025');
  });

  it('pads single digits', () => {
    const date = new Date(2025, 0, 5); // Jan 5, 2025
    expect(formatDate(date)).toBe('05/01/2025');
  });
});

// ─── formatDateFilename ────────────────────────────────────────
describe('formatDateFilename', () => {
  it('formats as YYYYMMDD', () => {
    const date = new Date(2025, 11, 4);
    expect(formatDateFilename(date)).toBe('20251204');
  });
});

// ─── formatNumber ──────────────────────────────────────────────
describe('formatNumber', () => {
  it('formats with thousands separator', () => {
    const result = formatNumber(125450);
    // Locale-dependent, but should have some separator
    expect(result).toContain('125');
    expect(result).toContain('450');
  });

  it('formats with decimals', () => {
    const result = formatNumber(1234.567, 2);
    expect(result).toContain('1');
    expect(result).toContain('234');
  });
});

// ─── formatQuoteRef ────────────────────────────────────────────
describe('formatQuoteRef', () => {
  it('formats quote reference', () => {
    expect(formatQuoteRef(2142)).toBe('2142.0');
    expect(formatQuoteRef(2142, 3)).toBe('2142.3');
  });
});

// ─── parseZAR ──────────────────────────────────────────────────
describe('parseZAR', () => {
  it('parses formatted ZAR string', () => {
    expect(parseZAR('R 125,450.00')).toBe(125450);
  });

  it('parses plain number string', () => {
    expect(parseZAR('125450')).toBe(125450);
  });

  it('parses string with R prefix', () => {
    expect(parseZAR('R125450')).toBe(125450);
  });
});

// ─── formatDuration ────────────────────────────────────────────
describe('formatDuration', () => {
  it('formats even years', () => {
    expect(formatDuration(60)).toBe('5 years');
    expect(formatDuration(12)).toBe('1 year');
  });

  it('formats months when not even years', () => {
    expect(formatDuration(18)).toBe('18 months');
    expect(formatDuration(7)).toBe('7 months');
  });
});

// ─── formatAddress ─────────────────────────────────────────────
describe('formatAddress', () => {
  it('joins non-empty lines', () => {
    expect(formatAddress(['123 Main St', '', 'Johannesburg'])).toBe('123 Main St\nJohannesburg');
  });

  it('returns empty string for empty array', () => {
    expect(formatAddress([])).toBe('');
  });
});

// ─── formatPhone ───────────────────────────────────────────────
describe('formatPhone', () => {
  it('formats SA international number', () => {
    const result = formatPhone('27728399058');
    expect(result).toBe('+27 72 839 9058');
  });

  it('formats 10-digit local number', () => {
    const result = formatPhone('0728399058');
    expect(result).toBe('072 839 9058');
  });

  it('returns unrecognized formats as-is', () => {
    expect(formatPhone('12345')).toBe('12345');
  });
});

// ─── truncate ──────────────────────────────────────────────────
describe('truncate', () => {
  it('truncates long text', () => {
    expect(truncate('Hello, World!', 8)).toBe('Hello...');
  });

  it('returns short text unchanged', () => {
    expect(truncate('Hi', 10)).toBe('Hi');
  });

  it('handles exact length', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });
});

// ─── formatCompact ─────────────────────────────────────────────
describe('formatCompact', () => {
  it('formats millions', () => {
    expect(formatCompact(1_500_000)).toBe('1.5M');
  });

  it('formats thousands', () => {
    expect(formatCompact(450_000)).toBe('450.0K');
  });

  it('formats small numbers', () => {
    expect(formatCompact(999)).toBe('999');
  });
});
