import type { AuditLogEntry } from './interfaces';

/**
 * Safely parse a JSON value that may arrive as a string, object, null, or undefined.
 * Returns undefined for null/undefined, empty object for malformed JSON strings,
 * and the parsed/passthrough value otherwise.
 */
export function parseAuditJson(val: unknown): Record<string, unknown> | undefined {
  if (val == null) return undefined;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return {}; }
  }
  return val as Record<string, unknown>;
}

/**
 * Map a raw Supabase audit_log row (snake_case) to an AuditLogEntry (camelCase).
 *
 * Extracted from SupabaseAdapter.mapAuditLogEntry so tests can import the
 * production function instead of reimplementing it.
 */
export function mapAuditLogEntry(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row.id as string,
    timestamp: (row.timestamp || row.created_at) as string,
    userId: (row.user_id as string) || '',
    action: row.action as AuditLogEntry['action'],
    entityType: row.entity_type as AuditLogEntry['entityType'],
    entityId: row.entity_id as string,
    changes: parseAuditJson(row.changes) || {},
    oldValues: parseAuditJson(row.old_values),
    newValues: parseAuditJson(row.new_values),
  };
}
