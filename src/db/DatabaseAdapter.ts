/**
 * Database Adapter Abstraction Layer
 *
 * Provides a unified interface for database operations that works with both:
 * - Local mode: IndexedDB (current implementation)
 * - Cloud mode: Supabase PostgreSQL
 * - Hybrid mode: IndexedDB with Supabase sync
 *
 * This allows the app to switch between local and cloud storage without
 * changing any component code.
 */

import type { QuoteState } from '../types/quote';
import type {
  SaveResult,
  QuoteFilter,
  PaginationOptions,
  PaginatedResult,
  StoredQuote,
  StoredCustomer,
  StoredTemplate,
  StoredCompany,
  StoredContact,
  StoredActivity,
  StoredNotification,
  AuditLogEntry,
} from './interfaces';

/**
 * Unified database adapter interface
 * All database implementations must conform to this interface
 */
export interface IDatabaseAdapter {
  // ===== Quote Operations =====
  /**
   * Save or update a quote
   * Returns success status and new version number
   */
  saveQuote(quote: QuoteState): Promise<SaveResult>;

  /**
   * Load a quote by ID
   * Returns null if not found
   */
  loadQuote(id: string): Promise<QuoteState | null>;

  /**
   * List quotes with pagination and filters
   * Applies role-based filtering in cloud mode
   */
  listQuotes(
    options: PaginationOptions,
    filters?: QuoteFilter
  ): Promise<PaginatedResult<StoredQuote>>;

  /**
   * Search quotes by query string
   */
  searchQuotes(query: string): Promise<StoredQuote[]>;

  /**
   * Duplicate a quote (create new with incremented quote ref)
   */
  duplicateQuote(id: string): Promise<SaveResult>;

  /**
   * Create revision (increment decimal: 2142.0 → 2142.1)
   */
  createRevision(id: string): Promise<SaveResult>;

  /**
   * Delete a quote
   */
  deleteQuote(id: string): Promise<void>;

  /**
   * Get next quote reference number
   */
  getNextQuoteRef(): Promise<string>;

  /**
   * Get most recently updated quote
   */
  getMostRecentQuote(): Promise<QuoteState | null>;

  // ===== Customer Operations =====
  /**
   * Save a customer
   */
  saveCustomer(customer: Omit<StoredCustomer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;

  /**
   * Search customers by query
   */
  searchCustomers(query: string): Promise<StoredCustomer[]>;

  /**
   * Get customer by ID
   */
  getCustomer(id: string): Promise<StoredCustomer | null>;

  /**
   * List all customers
   */
  listCustomers(): Promise<StoredCustomer[]>;

  // ===== User Operations (Cloud only) =====
  /**
   * Get user by ID
   */
  getUser(id: string): Promise<any | null>;

  /**
   * List all users
   */
  listUsers(): Promise<any[]>;

  // ===== User Query Operations =====
  /**
   * Get users by role
   */
  getUsersByRole(role: string): Promise<any[]>;

  // ===== Configuration Operations =====
  /**
   * Get commission tier configuration
   */
  getCommissionTiers(): Promise<any[]>;

  /**
   * Get residual curves
   */
  getResidualCurves(): Promise<any[]>;

  // ===== Audit Operations =====
  /**
   * Log an audit entry
   */
  logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;

  /**
   * Get audit log for an entity
   */
  getAuditLog(entityType: string, entityId: string): Promise<AuditLogEntry[]>;

  // ===== Template Operations =====
  /**
   * Save a template
   */
  saveTemplate(template: Omit<StoredTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;

  /**
   * Get templates by type
   */
  getTemplatesByType(type: StoredTemplate['type']): Promise<StoredTemplate[]>;

  /**
   * Get default template by type
   */
  getDefaultTemplate(type: StoredTemplate['type']): Promise<StoredTemplate | null>;

  /**
   * Delete a template
   */
  deleteTemplate(id: string): Promise<void>;

  // ===== Company Operations (CRM) =====
  saveCompany(company: Omit<StoredCompany, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  updateCompany(id: string, updates: Partial<StoredCompany>): Promise<void>;
  getCompany(id: string): Promise<StoredCompany | null>;
  listCompanies(): Promise<StoredCompany[]>;
  searchCompanies(query: string): Promise<StoredCompany[]>;
  deleteCompany(id: string): Promise<void>;

  // ===== Contact Operations (CRM) =====
  saveContact(contact: Omit<StoredContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  updateContact(id: string, updates: Partial<StoredContact>): Promise<void>;
  getContactsByCompany(companyId: string): Promise<StoredContact[]>;
  deleteContact(id: string): Promise<void>;

  // ===== Activity Operations (CRM) =====
  saveActivity(activity: Omit<StoredActivity, 'id' | 'createdAt'>): Promise<string>;
  getActivitiesByCompany(companyId: string, limit?: number): Promise<StoredActivity[]>;
  getRecentActivities(limit: number): Promise<StoredActivity[]>;
  deleteActivity(id: string): Promise<void>;

  // ===== Notification Operations =====
  saveNotification(notification: Omit<StoredNotification, 'id' | 'createdAt'>): Promise<string>;
  getNotifications(userId: string, limit?: number): Promise<StoredNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // ===== Sync Operations (Hybrid mode only) =====
  /**
   * Get sync status
   */
  getSyncStatus?(): Promise<{
    pendingOperations: number;
    lastSyncedAt: Date | null;
    isOnline: boolean;
  }>;

  /**
   * Force sync now
   */
  forceSyncNow?(): Promise<void>;
}

// Static imports are safe here because the adapter files use `import type`
// for IDatabaseAdapter, breaking the circular dependency at runtime.
import { LocalDatabaseAdapter } from './LocalAdapter';
import { SupabaseDatabaseAdapter } from './SupabaseAdapter';
import { HybridDatabaseAdapter } from './HybridAdapter';

/**
 * Singleton instance of the database adapter
 * Use this throughout the app for all database operations
 */
let adapterInstance: IDatabaseAdapter | null = null;

export function getDb(): IDatabaseAdapter {
  if (!adapterInstance) {
    const mode = import.meta.env.VITE_APP_MODE || 'local';

    switch (mode) {
      case 'cloud':
        adapterInstance = new SupabaseDatabaseAdapter();
        break;
      case 'hybrid':
        adapterInstance = new HybridDatabaseAdapter();
        break;
      case 'local':
      default:
        adapterInstance = new LocalDatabaseAdapter();
        break;
    }
  }
  return adapterInstance;
}

/**
 * Reset the adapter instance (useful for testing or mode switching)
 */
export function resetDbAdapter(): void {
  adapterInstance = null;
}
