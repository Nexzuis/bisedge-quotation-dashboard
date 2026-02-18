/**
 * Local Database Adapter
 *
 * Wraps the existing IndexedDB repositories to conform to the
 * IDatabaseAdapter interface. This is the current implementation
 * that works entirely offline with no cloud sync.
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
import type { IDatabaseAdapter } from './DatabaseAdapter';
import {
  IndexedDBQuoteRepository,
  IndexedDBCustomerRepository,
  IndexedDBTemplateRepository,
  IndexedDBAuditRepository,
  IndexedDBCompanyRepository,
  IndexedDBContactRepository,
  IndexedDBActivityRepository,
} from './IndexedDBRepository';
import { db } from './schema';

/**
 * Local-only database adapter using IndexedDB
 */
export class LocalDatabaseAdapter implements IDatabaseAdapter {
  private quoteRepo: IndexedDBQuoteRepository;
  private customerRepo: IndexedDBCustomerRepository;
  private templateRepo: IndexedDBTemplateRepository;
  private auditRepo: IndexedDBAuditRepository;
  private companyRepo: IndexedDBCompanyRepository;
  private contactRepo: IndexedDBContactRepository;
  private activityRepo: IndexedDBActivityRepository;

  constructor() {
    this.quoteRepo = new IndexedDBQuoteRepository();
    this.customerRepo = new IndexedDBCustomerRepository();
    this.templateRepo = new IndexedDBTemplateRepository();
    this.auditRepo = new IndexedDBAuditRepository();
    this.companyRepo = new IndexedDBCompanyRepository();
    this.contactRepo = new IndexedDBContactRepository();
    this.activityRepo = new IndexedDBActivityRepository();
  }

  // ===== Quote Operations =====
  async saveQuote(quote: QuoteState): Promise<SaveResult> {
    return this.quoteRepo.save(quote);
  }

  async loadQuote(id: string): Promise<QuoteState | null> {
    return this.quoteRepo.load(id);
  }

  async listQuotes(
    options: PaginationOptions,
    filters?: QuoteFilter
  ): Promise<PaginatedResult<StoredQuote>> {
    return this.quoteRepo.list(options, filters);
  }

  async searchQuotes(query: string): Promise<StoredQuote[]> {
    return this.quoteRepo.search(query);
  }

  async duplicateQuote(id: string): Promise<SaveResult> {
    return this.quoteRepo.duplicate(id);
  }

  async createRevision(id: string): Promise<SaveResult> {
    return this.quoteRepo.createRevision(id);
  }

  async deleteQuote(id: string): Promise<void> {
    return this.quoteRepo.delete(id);
  }

  async getNextQuoteRef(): Promise<string> {
    return this.quoteRepo.getNextQuoteRef();
  }

  async getMostRecentQuote(): Promise<QuoteState | null> {
    return this.quoteRepo.getMostRecent();
  }

  // ===== Customer Operations =====
  async saveCustomer(customer: Omit<StoredCustomer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.customerRepo.save(customer);
  }

  async searchCustomers(query: string): Promise<StoredCustomer[]> {
    return this.customerRepo.search(query);
  }

  async getCustomer(id: string): Promise<StoredCustomer | null> {
    return this.customerRepo.getById(id);
  }

  async listCustomers(): Promise<StoredCustomer[]> {
    return this.customerRepo.list();
  }

  // ===== User Operations =====
  async getUser(id: string): Promise<any | null> {
    // Local mode: Get from IndexedDB users table
    try {
      return await db.users.get(id) || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async listUsers(): Promise<any[]> {
    // Local mode: Get from IndexedDB users table
    try {
      return await db.users.toArray();
    } catch (error) {
      console.error('Error listing users:', error);
      return [];
    }
  }

  // ===== User Query Operations =====
  async getUsersByRole(role: string): Promise<any[]> {
    try {
      return await db.users.where('role').equals(role).and(u => u.isActive).toArray();
    } catch (error) {
      console.error('Error getting users by role:', error);
      return [];
    }
  }

  // ===== Configuration Operations =====
  async getCommissionTiers(): Promise<any[]> {
    try {
      return await db.commissionTiers.orderBy('minMargin').toArray();
    } catch (error) {
      console.error('Error getting commission tiers:', error);
      return [];
    }
  }

  async getResidualCurves(): Promise<any[]> {
    try {
      return await db.residualCurves.toArray();
    } catch (error) {
      console.error('Error getting residual curves:', error);
      return [];
    }
  }

  // ===== Audit Operations =====
  async logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    return this.auditRepo.log(entry);
  }

  async getAuditLog(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    return this.auditRepo.getByEntity(entityType, entityId);
  }

  // ===== Template Operations =====
  async saveTemplate(template: Omit<StoredTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.templateRepo.save(template);
  }

  async getTemplatesByType(type: StoredTemplate['type']): Promise<StoredTemplate[]> {
    return this.templateRepo.getByType(type);
  }

  async getDefaultTemplate(type: StoredTemplate['type']): Promise<StoredTemplate | null> {
    return this.templateRepo.getDefault(type);
  }

  async deleteTemplate(id: string): Promise<void> {
    return this.templateRepo.delete(id);
  }

  // ===== Company Operations (CRM) =====
  async saveCompany(company: Omit<StoredCompany, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.companyRepo.save(company);
  }

  async updateCompany(id: string, updates: Partial<StoredCompany>): Promise<void> {
    return this.companyRepo.update(id, updates);
  }

  async getCompany(id: string): Promise<StoredCompany | null> {
    return this.companyRepo.getById(id);
  }

  async listCompanies(): Promise<StoredCompany[]> {
    return this.companyRepo.list();
  }

  async searchCompanies(query: string): Promise<StoredCompany[]> {
    return this.companyRepo.search(query);
  }

  async deleteCompany(id: string): Promise<void> {
    return this.companyRepo.delete(id);
  }

  // ===== Contact Operations (CRM) =====
  async saveContact(contact: Omit<StoredContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.contactRepo.save(contact);
  }

  async updateContact(id: string, updates: Partial<StoredContact>): Promise<void> {
    return this.contactRepo.update(id, updates);
  }

  async getContactsByCompany(companyId: string): Promise<StoredContact[]> {
    return this.contactRepo.getByCompany(companyId);
  }

  async deleteContact(id: string): Promise<void> {
    return this.contactRepo.delete(id);
  }

  // ===== Activity Operations (CRM) =====
  async saveActivity(activity: Omit<StoredActivity, 'id' | 'createdAt'>): Promise<string> {
    return this.activityRepo.save(activity);
  }

  async getActivitiesByCompany(companyId: string, limit?: number): Promise<StoredActivity[]> {
    return this.activityRepo.getByCompany(companyId, limit);
  }

  async getRecentActivities(limit: number): Promise<StoredActivity[]> {
    return this.activityRepo.getRecent(limit);
  }

  async deleteActivity(id: string): Promise<void> {
    return this.activityRepo.delete(id);
  }

  // ===== Notification Operations =====
  async saveNotification(notification: Omit<StoredNotification, 'id' | 'createdAt'>): Promise<string> {
    try {
      const id = crypto.randomUUID();
      await db.notifications.put({
        ...notification,
        id,
        createdAt: new Date().toISOString(),
      });
      return id;
    } catch (error) {
      console.error('Error saving notification:', error);
      throw error;
    }
  }

  async getNotifications(userId: string, limit = 50): Promise<StoredNotification[]> {
    try {
      return await db.notifications
        .where('userId')
        .equals(userId)
        .reverse()
        .limit(limit)
        .sortBy('createdAt')
        .then((arr) => arr.reverse());
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  async markNotificationRead(id: string): Promise<void> {
    try {
      await db.notifications.update(id, { isRead: true });
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    try {
      const unread = await db.notifications
        .where('userId')
        .equals(userId)
        .and((n) => !n.isRead)
        .toArray();

      await Promise.all(
        unread.map((n) => db.notifications.update(n.id, { isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications read:', error);
    }
  }

  // ===== Sync Operations (Not applicable in local mode) =====
  async getSyncStatus() {
    return {
      pendingOperations: 0,
      lastSyncedAt: null,
      isOnline: navigator.onLine,
    };
  }

  async forceSyncNow() {
    // No-op in local mode
    console.log('Sync not available in local mode');
  }
}
