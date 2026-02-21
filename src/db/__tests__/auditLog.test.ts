import { describe, it, expect } from 'vitest';
import { mapAuditLogEntry } from '../auditLogMapper';

// ─── mapAuditLogEntry production function tests ───────────────
// Tests the actual exported mapAuditLogEntry function from
// auditLogMapper.ts. This guards against regressions in the
// audit log mapping fix (Phase 1 bug: "audit_log write/read
// mismatch — logAudit drops old_values/new_values; reads
// phantom columns").

describe('mapAuditLogEntry', () => {
  it('should map a complete row with old_values and new_values as JSON strings', () => {
    const row = {
      id: 'audit-001',
      timestamp: '2025-06-15T10:00:00.000Z',
      user_id: 'user-1',
      action: 'update',
      entity_type: 'quote',
      entity_id: 'quote-123',
      changes: '{"factoryROE": "19.73 -> 20.60"}',
      old_values: '{"factoryROE": 19.73}',
      new_values: '{"factoryROE": 20.60}',
    };

    const entry = mapAuditLogEntry(row);

    expect(entry.id).toBe('audit-001');
    expect(entry.timestamp).toBe('2025-06-15T10:00:00.000Z');
    expect(entry.userId).toBe('user-1');
    expect(entry.action).toBe('update');
    expect(entry.entityType).toBe('quote');
    expect(entry.entityId).toBe('quote-123');
    expect(entry.changes).toEqual({ factoryROE: '19.73 -> 20.60' });
    expect(entry.oldValues).toEqual({ factoryROE: 19.73 });
    expect(entry.newValues).toEqual({ factoryROE: 20.60 });
  });

  it('should handle old_values and new_values as pre-parsed objects', () => {
    const row = {
      id: 'audit-002',
      timestamp: '2025-06-15T11:00:00.000Z',
      user_id: 'user-2',
      action: 'create',
      entity_type: 'company',
      entity_id: 'company-456',
      changes: { name: 'New Company' },
      old_values: null,
      new_values: { name: 'New Company' },
    };

    const entry = mapAuditLogEntry(row);

    expect(entry.changes).toEqual({ name: 'New Company' });
    expect(entry.oldValues).toBeUndefined();
    expect(entry.newValues).toEqual({ name: 'New Company' });
  });

  it('should handle null old_values and new_values', () => {
    const row = {
      id: 'audit-003',
      timestamp: '2025-06-15T12:00:00.000Z',
      user_id: 'user-3',
      action: 'login',
      entity_type: 'user',
      entity_id: 'user-3',
      changes: null,
      old_values: null,
      new_values: null,
    };

    const entry = mapAuditLogEntry(row);

    expect(entry.changes).toEqual({});
    expect(entry.oldValues).toBeUndefined();
    expect(entry.newValues).toBeUndefined();
  });

  it('should handle malformed JSON in changes field', () => {
    const row = {
      id: 'audit-004',
      timestamp: '2025-06-15T13:00:00.000Z',
      user_id: 'user-4',
      action: 'update',
      entity_type: 'quote',
      entity_id: 'quote-789',
      changes: '{broken json!!!',
      old_values: '{also broken',
      new_values: null,
    };

    const entry = mapAuditLogEntry(row);

    // Malformed JSON should fall back to empty object, not throw
    expect(entry.changes).toEqual({});
    expect(entry.oldValues).toEqual({});
    expect(entry.newValues).toBeUndefined();
  });

  it('should default userId to empty string when user_id is null', () => {
    const row = {
      id: 'audit-005',
      timestamp: '2025-06-15T14:00:00.000Z',
      user_id: null,
      action: 'delete',
      entity_type: 'template',
      entity_id: 'tmpl-001',
      changes: '{}',
      old_values: null,
      new_values: null,
    };

    const entry = mapAuditLogEntry(row);
    expect(entry.userId).toBe('');
  });

  it('should default userId to empty string when user_id is undefined', () => {
    const row = {
      id: 'audit-006',
      timestamp: '2025-06-15T15:00:00.000Z',
      user_id: undefined,
      action: 'approve',
      entity_type: 'quote',
      entity_id: 'quote-999',
      changes: '{}',
      old_values: null,
      new_values: null,
    };

    const entry = mapAuditLogEntry(row);
    expect(entry.userId).toBe('');
  });

  it('should pass through timestamp directly from row', () => {
    const row = {
      id: 'audit-007',
      timestamp: '2025-12-25T00:00:00.000Z',
      user_id: 'user-x',
      action: 'comment',
      entity_type: 'quote',
      entity_id: 'quote-xmas',
      changes: null,
      old_values: null,
      new_values: null,
    };

    const entry = mapAuditLogEntry(row);
    expect(entry.timestamp).toBe('2025-12-25T00:00:00.000Z');
  });

  it('should handle undefined changes field', () => {
    const row = {
      id: 'audit-008',
      timestamp: '2025-06-15T16:00:00.000Z',
      user_id: 'user-5',
      action: 'login',
      entity_type: 'user',
      entity_id: 'user-5',
      changes: undefined,
      old_values: undefined,
      new_values: undefined,
    };

    const entry = mapAuditLogEntry(row);

    // parseJson(undefined) returns undefined, then || {} kicks in for changes
    expect(entry.changes).toEqual({});
    expect(entry.oldValues).toBeUndefined();
    expect(entry.newValues).toBeUndefined();
  });

  it('should handle nested JSON objects in old_values and new_values', () => {
    const row = {
      id: 'audit-009',
      timestamp: '2025-06-15T17:00:00.000Z',
      user_id: 'user-6',
      action: 'update',
      entity_type: 'quote',
      entity_id: 'quote-nested',
      changes: '{"slots": "modified"}',
      old_values: '{"clearingCharges": {"inlandFreight": 1000, "seaFreight": 2000}}',
      new_values: '{"clearingCharges": {"inlandFreight": 1500, "seaFreight": 2500}}',
    };

    const entry = mapAuditLogEntry(row);

    expect(entry.oldValues).toEqual({
      clearingCharges: { inlandFreight: 1000, seaFreight: 2000 },
    });
    expect(entry.newValues).toEqual({
      clearingCharges: { inlandFreight: 1500, seaFreight: 2500 },
    });
  });

  it('should handle empty JSON string in changes', () => {
    const row = {
      id: 'audit-010',
      timestamp: '2025-06-15T18:00:00.000Z',
      user_id: 'user-7',
      action: 'submit',
      entity_type: 'quote',
      entity_id: 'quote-empty',
      changes: '{}',
      old_values: '{}',
      new_values: '{}',
    };

    const entry = mapAuditLogEntry(row);

    expect(entry.changes).toEqual({});
    expect(entry.oldValues).toEqual({});
    expect(entry.newValues).toEqual({});
  });
});
