/**
 * Database Adapter Abstraction Layer
 *
 * Provides a unified interface for database operations using Supabase.
 * All data operations go through SupabaseDatabaseAdapter as the single source of truth.
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
  StoredLead,
  AuditLogEntry,
} from './interfaces';
import type { LeadFilter, LeadPaginationOptions, LeadStats } from '../types/leads';

/**
 * Unified database adapter interface
 * All database implementations must conform to this interface
 */
export interface IDatabaseAdapter {
  // ===== Quote Operations =====
  saveQuote(quote: QuoteState): Promise<SaveResult>;
  loadQuote(id: string): Promise<QuoteState | null>;
  listQuotes(options: PaginationOptions, filters?: QuoteFilter): Promise<PaginatedResult<StoredQuote>>;
  searchQuotes(query: string): Promise<StoredQuote[]>;
  duplicateQuote(id: string): Promise<SaveResult>;
  createRevision(id: string): Promise<SaveResult>;
  deleteQuote(id: string): Promise<void>;
  getNextQuoteRef(): Promise<string>;
  getMostRecentQuote(): Promise<QuoteState | null>;
  getQuotesByCompany(companyId: string): Promise<StoredQuote[]>;
  getQuoteRevisions(baseRef: string): Promise<StoredQuote[]>;
  countQuotesSince(date: string): Promise<number>;

  // ===== Customer Operations =====
  saveCustomer(customer: Omit<StoredCustomer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  searchCustomers(query: string): Promise<StoredCustomer[]>;
  getCustomer(id: string): Promise<StoredCustomer | null>;
  listCustomers(): Promise<StoredCustomer[]>;

  // ===== User Operations =====
  getUser(id: string): Promise<any | null>;
  listUsers(): Promise<any[]>;
  getUsersByRole(role: string): Promise<any[]>;

  // ===== Configuration Operations =====
  getCommissionTiers(): Promise<any[]>;
  getResidualCurves(): Promise<any[]>;
  saveCommissionTiers(tiers: any[]): Promise<void>;
  saveResidualCurves(curves: any[]): Promise<void>;
  getSettings(): Promise<Record<string, string>>;
  saveSettings(entries: { key: string; value: string }[]): Promise<void>;

  // ===== Audit Operations =====
  logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
  getAuditLog(entityType: string, entityId: string): Promise<AuditLogEntry[]>;
  listAuditLog(filters?: { entityType?: string; userId?: string }): Promise<AuditLogEntry[]>;

  // ===== Template Operations =====
  saveTemplate(template: Omit<StoredTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  getTemplatesByType(type: StoredTemplate['type']): Promise<StoredTemplate[]>;
  getDefaultTemplate(type: StoredTemplate['type']): Promise<StoredTemplate | null>;
  deleteTemplate(id: string): Promise<void>;
  getTemplate(id: string): Promise<StoredTemplate | null>;

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
  getContact(id: string): Promise<StoredContact | null>;
  deleteContact(id: string): Promise<void>;

  // ===== Activity Operations (CRM) =====
  saveActivity(activity: Omit<StoredActivity, 'id' | 'createdAt'>): Promise<string>;
  getActivitiesByCompany(companyId: string, limit?: number): Promise<StoredActivity[]>;
  getRecentActivities(limit: number): Promise<StoredActivity[]>;
  getActivitiesByQuote(quoteId: string): Promise<StoredActivity[]>;
  listAllActivities(): Promise<StoredActivity[]>;
  deleteActivity(id: string): Promise<void>;

  // ===== Notification Operations =====
  saveNotification(notification: Omit<StoredNotification, 'id' | 'createdAt'>): Promise<string>;
  getNotifications(userId: string, limit?: number): Promise<StoredNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // ===== Lead Operations =====
  saveLead(lead: Omit<StoredLead, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  updateLead(id: string, updates: Partial<StoredLead>): Promise<void>;
  getLead(id: string): Promise<StoredLead | null>;
  listLeads(options: LeadPaginationOptions, filters?: LeadFilter): Promise<PaginatedResult<StoredLead>>;
  searchLeads(query: string): Promise<StoredLead[]>;
  deleteLead(id: string): Promise<void>;
  getLeadStats(): Promise<LeadStats>;
  bulkUpdateLeadStatus(ids: string[], status: StoredLead['qualificationStatus']): Promise<void>;

  // ===== Aggregate Operations =====
  getTableCounts(): Promise<Record<string, number>>;
  getAttachmentsByIds(ids: string[]): Promise<{ id: string; eurCost: number }[]>;
}

import { SupabaseDatabaseAdapter } from './SupabaseAdapter';

/**
 * Singleton instance of the database adapter
 * Always returns SupabaseDatabaseAdapter (cloud-only architecture)
 */
let adapterInstance: IDatabaseAdapter | null = null;

export function getDb(): IDatabaseAdapter {
  if (!adapterInstance) {
    adapterInstance = new SupabaseDatabaseAdapter();
  }
  return adapterInstance;
}

/**
 * Reset the adapter instance (useful for testing)
 */
export function resetDbAdapter(): void {
  adapterInstance = null;
}
