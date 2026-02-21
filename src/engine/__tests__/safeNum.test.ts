import { describe, it, expect } from 'vitest';
import { safeNum } from '../../store/useQuoteStore';

// ─── safeNum production function tests ────────────────────────
// Tests the actual exported safeNum function from useQuoteStore.ts.
// safeNum safely coerces a value to a finite number, defaulting
// to 0. This ensures that getSlotPricing and getQuoteTotals never
// suffer NaN propagation from undefined/null slot fields
// (Phase 2 bug: "NaN propagation from undefined slot fields").

describe('safeNum (production export)', () => {

  // ── Non-finite inputs should return 0 ────────────────────

  it('should return 0 for undefined', () => {
    expect(safeNum(undefined)).toBe(0);
  });

  it('should return 0 for null', () => {
    expect(safeNum(null)).toBe(0);
  });

  it('should return 0 for NaN', () => {
    expect(safeNum(NaN)).toBe(0);
  });

  it('should return 0 for Infinity', () => {
    expect(safeNum(Infinity)).toBe(0);
  });

  it('should return 0 for -Infinity', () => {
    expect(safeNum(-Infinity)).toBe(0);
  });

  it('should return 0 for non-numeric string', () => {
    expect(safeNum('abc')).toBe(0);
  });

  it('should return 0 for empty string', () => {
    expect(safeNum('')).toBe(0);
  });

  it('should return 0 for an object', () => {
    expect(safeNum({})).toBe(0);
  });

  it('should return 0 for an array with multiple elements', () => {
    expect(safeNum([1, 2])).toBe(0);
  });

  it('should return 0 for boolean false', () => {
    // Number(false) === 0, which is finite, so safeNum returns 0
    expect(safeNum(false)).toBe(0);
  });

  // ── Valid numeric inputs should pass through ─────────────

  it('should return number for numeric string', () => {
    expect(safeNum('42')).toBe(42);
  });

  it('should return number for float string', () => {
    expect(safeNum('3.14')).toBeCloseTo(3.14);
  });

  it('should pass through valid positive numbers', () => {
    expect(safeNum(3.14)).toBeCloseTo(3.14);
  });

  it('should handle negative numbers', () => {
    expect(safeNum(-5)).toBe(-5);
  });

  it('should handle zero', () => {
    expect(safeNum(0)).toBe(0);
  });

  it('should handle very large finite numbers', () => {
    expect(safeNum(1e15)).toBe(1e15);
  });

  it('should handle very small positive numbers', () => {
    expect(safeNum(1e-10)).toBeCloseTo(1e-10);
  });

  it('should return 1 for boolean true', () => {
    // Number(true) === 1, which is finite
    expect(safeNum(true)).toBe(1);
  });

  // ── Arithmetic safety: using safeNum outputs never produces NaN ─

  it('should ensure multiplication with safeNum output is never NaN', () => {
    const badInputs: unknown[] = [undefined, null, NaN, Infinity, 'abc', {}, []];
    for (const input of badInputs) {
      const result = safeNum(input) * 100;
      expect(Number.isFinite(result)).toBe(true);
    }
  });

  it('should ensure addition chain with safeNum outputs is never NaN', () => {
    const sum =
      safeNum(undefined) +
      safeNum(null) +
      safeNum(NaN) +
      safeNum('abc') +
      safeNum(42);
    expect(sum).toBe(42);
  });
});
