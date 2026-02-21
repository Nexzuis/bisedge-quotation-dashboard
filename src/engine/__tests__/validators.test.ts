import { describe, it, expect } from 'vitest';
import { validatePassword } from '../../engine/validators';

// ─── validatePassword ─────────────────────────────────────────
// Regression tests for the password strength validator added as
// part of the Phase 2 "weak form validation" fix.

describe('validatePassword', () => {
  it('should reject passwords shorter than 8 characters', () => {
    const result = validatePassword('Ab1cdef');
    expect(result).not.toBeNull();
    expect(result).toContain('8 characters');
  });

  it('should reject a 7-character password', () => {
    expect(validatePassword('Abcde1f')).not.toBeNull();
  });

  it('should reject passwords without uppercase', () => {
    const result = validatePassword('abcdef1234');
    expect(result).not.toBeNull();
    expect(result).toContain('uppercase');
  });

  it('should reject passwords without lowercase', () => {
    const result = validatePassword('ABCDEF1234');
    expect(result).not.toBeNull();
    expect(result).toContain('lowercase');
  });

  it('should reject passwords without numbers', () => {
    const result = validatePassword('AbcdefGhij');
    expect(result).not.toBeNull();
    expect(result).toContain('number');
  });

  it('should accept valid passwords', () => {
    expect(validatePassword('Abcdef12')).toBeNull();
    expect(validatePassword('StrongPass1')).toBeNull();
    expect(validatePassword('MyP@ssw0rd')).toBeNull();
  });

  it('should accept passwords exactly 8 characters', () => {
    expect(validatePassword('Abcdef1x')).toBeNull();
  });

  it('should accept very long valid passwords', () => {
    expect(validatePassword('Abcdefghijklmnopqrstuvwxyz1')).toBeNull();
  });

  it('should handle empty string', () => {
    const result = validatePassword('');
    expect(result).not.toBeNull();
    expect(result).toContain('required');
  });

  it('should return specific error messages for each failure', () => {
    // Empty
    expect(validatePassword('')).toBe('Password is required');

    // Too short
    expect(validatePassword('Ab1')).toBe('Password must be at least 8 characters');

    // No uppercase
    expect(validatePassword('abcdefg1')).toBe('Password must contain at least one uppercase letter');

    // No lowercase
    expect(validatePassword('ABCDEFG1')).toBe('Password must contain at least one lowercase letter');

    // No number
    expect(validatePassword('Abcdefgh')).toBe('Password must contain at least one number');
  });

  it('should return null for a fully valid password', () => {
    expect(validatePassword('SecurePass1')).toBeNull();
  });

  it('should check rules in priority order (length before content)', () => {
    // A 5-char string without uppercase, lowercase, or numbers
    // should report the length issue first, not the content issues
    const result = validatePassword('12345');
    expect(result).toBe('Password must be at least 8 characters');
  });

  it('should handle passwords with special characters', () => {
    expect(validatePassword('P@ssw0rd!')).toBeNull();
    expect(validatePassword('$ecure1A')).toBeNull();
  });

  it('should handle whitespace-only strings', () => {
    // 8 spaces — meets length but no uppercase/lowercase/number
    const result = validatePassword('        ');
    expect(result).not.toBeNull();
  });
});
