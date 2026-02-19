import { describe, expect, it } from 'vitest';
import { hasPermission } from '../permissions';

describe('hasPermission', () => {
  it('uses role permissions when no overrides are provided', () => {
    expect(hasPermission('sales_manager', 'admin:pricing', 'read')).toBe(true);
    expect(hasPermission('sales_rep', 'admin:users', 'read')).toBe(false);
  });

  it('allows explicit grant overrides', () => {
    expect(
      hasPermission('sales_rep', 'admin:users', 'update', {
        can_manage_users: true,
      })
    ).toBe(true);
  });

  it('enforces explicit deny overrides', () => {
    expect(
      hasPermission('sales_manager', 'admin:pricing', 'read', {
        can_manage_pricing: false,
      })
    ).toBe(false);
  });

  it('does not deny unrelated resources', () => {
    expect(
      hasPermission('sales_manager', 'quotes', 'read', {
        can_manage_pricing: false,
      })
    ).toBe(true);
  });
});
