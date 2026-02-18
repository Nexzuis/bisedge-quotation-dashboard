/**
 * Hybrid Database Adapter
 *
 * Combines local IndexedDB cache with Supabase cloud sync.
 * Provides offline-first architecture with background synchronization.
 *
 * Strategy:
 * - Writes: Save to local IndexedDB first (instant), queue for cloud sync
 * - Reads: Check local cache first, fallback to cloud, update cache
 * - Sync: Background sync when online, conflict resolution on conflicts
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
import { LocalDatabaseAdapter } from './LocalAdapter';
import { SupabaseDatabaseAdapter } from './SupabaseAdapter';
import { syncQueue } from '../sync/SyncQueue';
import { resolveQuoteConflict } from '../sync/ConflictResolver';
import { supabase } from '../lib/supabase';

/**
 * Hybrid adapter - local cache + cloud sync
 */
export class HybridDatabaseAdapter implements IDatabaseAdapter {
  private localAdapter: LocalDatabaseAdapter;
  private cloudAdapter: SupabaseDatabaseAdapter;

  constructor() {
    this.localAdapter = new LocalDatabaseAdapter();
    this.cloudAdapter = new SupabaseDatabaseAdapter();
  }

  // ===== Quote Operations =====

  /**
   * Save quote - OFFLINE FIRST
   * 1. Save to local IndexedDB immediately (instant, works offline)
   * 2. Queue for cloud sync (background)
   */
  async saveQuote(quote: QuoteState): Promise<SaveResult> {
    // Step 1: Save to local cache (instant)
    const localResult = await this.localAdapter.saveQuote(quote);

    if (!localResult.success) {
      return localResult;
    }

    // Step 2: Queue for cloud sync
    if (navigator.onLine) {
      try {
        // Try to sync immediately if online
        await syncQueue.enqueue({
          type: quote.version === 1 ? 'create' : 'update',
          entity: 'quote',
          entityId: quote.id,
          data: this.prepareQuoteForSupabase(quote),
        });
      } catch (error) {
        console.warn('Failed to queue sync, will retry later:', error);
      }
    }

    return localResult;
  }

  /**
   * Load quote - LOCAL FIRST
   * 1. Check local cache (fast)
   * 2. If not found, fetch from cloud and cache it
   */
  async loadQuote(id: string): Promise<QuoteState | null> {
    // Step 1: Try local cache first
    const localQuote = await this.localAdapter.loadQuote(id);

    if (localQuote) {
      console.log('📦 Quote loaded from local cache:', id);

      // Background: Check cloud for updates if online
      if (navigator.onLine) {
        this.syncQuoteFromCloud(id).catch((err) =>
          console.warn('Background sync failed:', err)
        );
      }

      return localQuote;
    }

    // Step 2: Not in cache, fetch from cloud
    if (navigator.onLine) {
      console.log('☁️  Quote not in cache, fetching from cloud:', id);
      const cloudQuote = await this.cloudAdapter.loadQuote(id);

      if (cloudQuote) {
        // Cache it locally
        await this.localAdapter.saveQuote(cloudQuote);
        return cloudQuote;
      }
    }

    return null;
  }

  /**
   * List quotes - CLOUD with LOCAL CACHE
   * Fetches from cloud (most up-to-date), caches results locally
   */
  async listQuotes(
    options: PaginationOptions,
    filters?: QuoteFilter
  ): Promise<PaginatedResult<StoredQuote>> {
    if (navigator.onLine) {
      try {
        // Fetch from cloud (has role-based filtering)
        const cloudResult = await this.cloudAdapter.listQuotes(options, filters);

        // Cache results in background (don't await)
        this.cacheQuotes(cloudResult.items).catch((err) =>
          console.warn('Failed to cache quotes:', err)
        );

        return cloudResult;
      } catch (error) {
        console.warn('Cloud fetch failed, falling back to local cache:', error);
      }
    }

    // Fallback to local cache if offline or cloud fails
    console.log('📦 Listing quotes from local cache (offline or cloud unavailable)');
    return this.localAdapter.listQuotes(options, filters);
  }

  /**
   * Search quotes - LOCAL FIRST for speed
   */
  async searchQuotes(query: string): Promise<StoredQuote[]> {
    // Always search local cache (instant)
    return this.localAdapter.searchQuotes(query);
  }

  /**
   * Duplicate quote
   */
  async duplicateQuote(id: string): Promise<SaveResult> {
    const result = await this.localAdapter.duplicateQuote(id);

    if (result.success && navigator.onLine) {
      // Queue for cloud sync
      const newQuote = await this.localAdapter.loadQuote(result.id);
      if (newQuote) {
        await syncQueue.enqueue({
          type: 'create',
          entity: 'quote',
          entityId: result.id,
          data: this.prepareQuoteForSupabase(newQuote),
        });
      }
    }

    return result;
  }

  /**
   * Create revision
   */
  async createRevision(id: string): Promise<SaveResult> {
    const result = await this.localAdapter.createRevision(id);

    if (result.success && navigator.onLine) {
      // Queue for cloud sync
      const newQuote = await this.localAdapter.loadQuote(result.id);
      if (newQuote) {
        await syncQueue.enqueue({
          type: 'create',
          entity: 'quote',
          entityId: result.id,
          data: this.prepareQuoteForSupabase(newQuote),
        });
      }
    }

    return result;
  }

  /**
   * Delete quote
   */
  async deleteQuote(id: string): Promise<void> {
    // Delete from local cache
    await this.localAdapter.deleteQuote(id);

    // Queue for cloud deletion
    if (navigator.onLine) {
      await syncQueue.enqueue({
        type: 'delete',
        entity: 'quote',
        entityId: id,
        data: { id },
      });
    }
  }

  /**
   * Get next quote reference
   */
  async getNextQuoteRef(): Promise<string> {
    // Always use local adapter for quote ref generation
    // This ensures offline capability
    return this.localAdapter.getNextQuoteRef();
  }

  /**
   * Get most recent quote
   */
  async getMostRecentQuote(): Promise<QuoteState | null> {
    return this.localAdapter.getMostRecentQuote();
  }

  // ===== Customer Operations =====

  async saveCustomer(customer: Omit<StoredCustomer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = await this.localAdapter.saveCustomer(customer);

    if (navigator.onLine) {
      // Queue for cloud sync
      await syncQueue.enqueue({
        type: 'create',
        entity: 'customer',
        entityId: id,
        data: { ...customer, id },
      });
    }

    return id;
  }

  async searchCustomers(query: string): Promise<StoredCustomer[]> {
    return this.localAdapter.searchCustomers(query);
  }

  async getCustomer(id: string): Promise<StoredCustomer | null> {
    return this.localAdapter.getCustomer(id);
  }

  async listCustomers(): Promise<StoredCustomer[]> {
    if (navigator.onLine) {
      try {
        const cloudCustomers = await this.cloudAdapter.listCustomers();
        // Cache in background
        this.cacheCustomers(cloudCustomers);
        return cloudCustomers;
      } catch (error) {
        console.warn('Cloud fetch failed, using local cache:', error);
      }
    }

    return this.localAdapter.listCustomers();
  }

  // ===== User Operations =====

  async getUser(id: string): Promise<any | null> {
    if (navigator.onLine) {
      return this.cloudAdapter.getUser(id);
    }
    return this.localAdapter.getUser(id);
  }

  async listUsers(): Promise<any[]> {
    if (navigator.onLine) {
      return this.cloudAdapter.listUsers();
    }
    return this.localAdapter.listUsers();
  }

  // ===== User Query Operations =====

  async getUsersByRole(role: string): Promise<any[]> {
    if (navigator.onLine) {
      try {
        return await this.cloudAdapter.getUsersByRole(role);
      } catch (error) {
        console.warn('Cloud fetch failed, using local cache:', error);
      }
    }
    return this.localAdapter.getUsersByRole(role);
  }

  // ===== Configuration Operations =====

  async getCommissionTiers(): Promise<any[]> {
    if (navigator.onLine) {
      try {
        return await this.cloudAdapter.getCommissionTiers();
      } catch (error) {
        console.warn('Cloud fetch failed, using local cache:', error);
      }
    }
    return this.localAdapter.getCommissionTiers();
  }

  async getResidualCurves(): Promise<any[]> {
    if (navigator.onLine) {
      try {
        return await this.cloudAdapter.getResidualCurves();
      } catch (error) {
        console.warn('Cloud fetch failed, using local cache:', error);
      }
    }
    return this.localAdapter.getResidualCurves();
  }

  // ===== Audit Operations =====

  async logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    await this.localAdapter.logAudit(entry);

    if (navigator.onLine) {
      await this.cloudAdapter.logAudit(entry);
    }
  }

  async getAuditLog(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    if (navigator.onLine) {
      return this.cloudAdapter.getAuditLog(entityType, entityId);
    }
    return this.localAdapter.getAuditLog(entityType, entityId);
  }

  // ===== Template Operations =====

  async saveTemplate(template: Omit<StoredTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.localAdapter.saveTemplate(template);
  }

  async getTemplatesByType(type: StoredTemplate['type']): Promise<StoredTemplate[]> {
    return this.localAdapter.getTemplatesByType(type);
  }

  async getDefaultTemplate(type: StoredTemplate['type']): Promise<StoredTemplate | null> {
    return this.localAdapter.getDefaultTemplate(type);
  }

  async deleteTemplate(id: string): Promise<void> {
    return this.localAdapter.deleteTemplate(id);
  }

  // ===== Company Operations (CRM) =====

  async saveCompany(company: Omit<StoredCompany, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = await this.localAdapter.saveCompany(company);

    if (navigator.onLine) {
      await syncQueue.enqueue({
        type: 'create',
        entity: 'company',
        entityId: id,
        data: { ...company, id },
      });
    }

    return id;
  }

  async updateCompany(id: string, updates: Partial<StoredCompany>): Promise<void> {
    await this.localAdapter.updateCompany(id, updates);

    if (navigator.onLine) {
      await syncQueue.enqueue({
        type: 'update',
        entity: 'company',
        entityId: id,
        data: { id, ...updates },
      });
    }
  }

  async getCompany(id: string): Promise<StoredCompany | null> {
    return this.localAdapter.getCompany(id);
  }

  async listCompanies(): Promise<StoredCompany[]> {
    if (navigator.onLine) {
      try {
        const cloudCompanies = await this.cloudAdapter.listCompanies();
        this.cacheCompanies(cloudCompanies).catch((err) =>
          console.warn('Failed to cache companies:', err)
        );
        return cloudCompanies;
      } catch (error) {
        console.warn('Cloud fetch failed, using local cache:', error);
      }
    }
    return this.localAdapter.listCompanies();
  }

  async searchCompanies(query: string): Promise<StoredCompany[]> {
    return this.localAdapter.searchCompanies(query);
  }

  async deleteCompany(id: string): Promise<void> {
    await this.localAdapter.deleteCompany(id);

    if (navigator.onLine) {
      await syncQueue.enqueue({
        type: 'delete',
        entity: 'company',
        entityId: id,
        data: { id },
      });
    }
  }

  // ===== Contact Operations (CRM) =====

  async saveContact(contact: Omit<StoredContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = await this.localAdapter.saveContact(contact);

    if (navigator.onLine) {
      await syncQueue.enqueue({
        type: 'create',
        entity: 'contact',
        entityId: id,
        data: { ...contact, id },
      });
    }

    return id;
  }

  async updateContact(id: string, updates: Partial<StoredContact>): Promise<void> {
    await this.localAdapter.updateContact(id, updates);

    if (navigator.onLine) {
      await syncQueue.enqueue({
        type: 'update',
        entity: 'contact',
        entityId: id,
        data: { id, ...updates },
      });
    }
  }

  async getContactsByCompany(companyId: string): Promise<StoredContact[]> {
    return this.localAdapter.getContactsByCompany(companyId);
  }

  async deleteContact(id: string): Promise<void> {
    await this.localAdapter.deleteContact(id);

    if (navigator.onLine) {
      await syncQueue.enqueue({
        type: 'delete',
        entity: 'contact',
        entityId: id,
        data: { id },
      });
    }
  }

  // ===== Activity Operations (CRM) =====

  async saveActivity(activity: Omit<StoredActivity, 'id' | 'createdAt'>): Promise<string> {
    const id = await this.localAdapter.saveActivity(activity);

    if (navigator.onLine) {
      await syncQueue.enqueue({
        type: 'create',
        entity: 'activity',
        entityId: id,
        data: { ...activity, id },
      });
    }

    return id;
  }

  async getActivitiesByCompany(companyId: string, limit?: number): Promise<StoredActivity[]> {
    return this.localAdapter.getActivitiesByCompany(companyId, limit);
  }

  async getRecentActivities(limit: number): Promise<StoredActivity[]> {
    return this.localAdapter.getRecentActivities(limit);
  }

  async deleteActivity(id: string): Promise<void> {
    await this.localAdapter.deleteActivity(id);

    if (navigator.onLine) {
      await syncQueue.enqueue({
        type: 'delete',
        entity: 'activity',
        entityId: id,
        data: { id },
      });
    }
  }

  // ===== Notification Operations =====

  async saveNotification(notification: Omit<StoredNotification, 'id' | 'createdAt'>): Promise<string> {
    const id = await this.localAdapter.saveNotification(notification);

    if (navigator.onLine) {
      await syncQueue.enqueue({
        type: 'create',
        entity: 'notification',
        entityId: id,
        data: { ...notification, id },
      });
    }

    return id;
  }

  async getNotifications(userId: string, limit?: number): Promise<StoredNotification[]> {
    return this.localAdapter.getNotifications(userId, limit);
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.localAdapter.markNotificationRead(id);

    if (navigator.onLine) {
      await syncQueue.enqueue({
        type: 'update',
        entity: 'notification',
        entityId: id,
        data: { id, is_read: true },
      });
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.localAdapter.markAllNotificationsRead(userId);
    // Bulk update handled via individual sync ops is not ideal;
    // for now just sync by re-fetching on next online event.
  }

  // ===== Sync Operations =====

  async getSyncStatus() {
    return syncQueue.getStatus();
  }

  async forceSyncNow() {
    await syncQueue.forceSyncNow();
  }

  // ===== Helper Methods =====

  /**
   * Sync a quote from cloud to local cache (background)
   */
  private async syncQuoteFromCloud(id: string): Promise<void> {
    try {
      const cloudQuote = await this.cloudAdapter.loadQuote(id);
      if (!cloudQuote) return;

      const localQuote = await this.localAdapter.loadQuote(id);

      if (!localQuote) {
        // Not in cache, just save it
        await this.localAdapter.saveQuote(cloudQuote);
        return;
      }

      // Check for conflicts
      if (localQuote.version !== cloudQuote.version) {
        console.log('⚠️  Version mismatch detected - resolving conflict');
        const resolution = resolveQuoteConflict(localQuote, cloudQuote);

        // Update local cache with resolved version
        await this.localAdapter.saveQuote(resolution.resolved);

        // If local wins or merged, sync back to cloud
        if (resolution.strategy !== 'remote-wins') {
          await syncQueue.enqueue({
            type: 'update',
            entity: 'quote',
            entityId: resolution.resolved.id,
            data: this.prepareQuoteForSupabase(resolution.resolved),
          });
        }
      }
    } catch (error) {
      console.warn('Background sync from cloud failed:', error);
    }
  }

  /**
   * Cache quotes in local IndexedDB (background)
   */
  private async cacheQuotes(quotes: StoredQuote[]): Promise<void> {
    for (const quote of quotes) {
      try {
        await this.localAdapter.saveQuote(quote as any);
      } catch (error) {
        console.warn('Failed to cache quote:', quote.id, error);
      }
    }
  }

  /**
   * Cache customers in local IndexedDB (background)
   */
  private async cacheCustomers(customers: StoredCustomer[]): Promise<void> {
    for (const customer of customers) {
      try {
        await this.localAdapter.saveCustomer(customer as any);
      } catch (error) {
        console.warn('Failed to cache customer:', customer.id, error);
      }
    }
  }

  /**
   * Cache companies in local IndexedDB (background)
   */
  private async cacheCompanies(companies: StoredCompany[]): Promise<void> {
    for (const company of companies) {
      try {
        // Use put-like behavior: save with existing ID
        const existing = await this.localAdapter.getCompany(company.id);
        if (!existing) {
          await this.localAdapter.saveCompany(company as any);
        } else {
          await this.localAdapter.updateCompany(company.id, company);
        }
      } catch (error) {
        console.warn('Failed to cache company:', company.id, error);
      }
    }
  }

  /**
   * Prepare quote for Supabase (convert formats)
   */
  private prepareQuoteForSupabase(quote: QuoteState): any {
    return {
      id: quote.id,
      quote_ref: quote.quoteRef,
      version: quote.version,
      status: quote.status,
      client_name: quote.clientName,
      contact_name: quote.contactName,
      contact_email: quote.contactEmail || null,
      contact_phone: quote.contactPhone || null,
      client_address: JSON.stringify(quote.clientAddress),
      factory_roe: quote.factoryROE,
      customer_roe: quote.customerROE,
      discount_pct: quote.discountPct,
      annual_interest_rate: quote.annualInterestRate,
      default_lease_term_months: quote.defaultLeaseTermMonths,
      battery_chemistry_lock: quote.batteryChemistryLock,
      quote_type: quote.quoteType,
      slots: JSON.stringify(quote.slots),
      override_irr: quote.overrideIRR,
      current_assignee_id: quote.currentAssigneeId || null,
      current_assignee_role: quote.currentAssigneeRole || null,
      approval_chain: JSON.stringify(quote.approvalChain || []),
      quote_date: quote.quoteDate.toISOString(),
      created_at: quote.createdAt.toISOString(),
      updated_at: quote.updatedAt.toISOString(),
    };
  }
}
