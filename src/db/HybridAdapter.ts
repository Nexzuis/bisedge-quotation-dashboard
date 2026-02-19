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
import { db } from './schema';

function getCurrentAuditUser(): { userId: string; userName: string } | null {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) return null;
    const parsed = JSON.parse(authStorage);
    const user = parsed?.state?.user;
    if (!user) return null;
    return { userId: user.id, userName: user.fullName || user.username };
  } catch {
    return null;
  }
}

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

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private parseQuoteBaseRef(quoteRef: string | null | undefined): number | null {
    if (!quoteRef) return null;
    const basePart = String(quoteRef).split('.')[0];
    const parsed = Number.parseInt(basePart, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async getCurrentSessionUserId(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Resolve a local user ID to a valid Supabase UUID.
   * Non-UUID values (e.g. 'default-admin' from local seed) are replaced
   * with the current Supabase auth user's UUID to avoid FK violations.
   */
  private async resolveSupabaseUserId(
    localId: string | null | undefined,
    opts?: { fallbackToSession?: boolean; sessionUserId?: string | null }
  ): Promise<string | null> {
    if (localId && this.isUuid(localId)) {
      return localId;
    }
    if (!localId && !opts?.fallbackToSession) return null;
    if (opts?.sessionUserId) return opts.sessionUserId;
    return this.getCurrentSessionUserId();
  }

  // ===== Quote Operations =====

  /**
   * Save quote - OFFLINE FIRST
   * 1. Save to local IndexedDB immediately (instant, works offline)
   * 2. Queue for cloud sync (background)
   */
  async saveQuote(quote: QuoteState): Promise<SaveResult> {
    // Ensure createdBy is set from auth session if missing
    if (!quote.createdBy) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          quote = { ...quote, createdBy: session.user.id };
        }
      } catch { /* proceed with original quote */ }
    }

    // Determine if this is a new quote before local save increments version
    const isNew = quote.version === 1;

    // Step 1: Save to local cache (instant) — this increments version
    const localResult = await this.localAdapter.saveQuote(quote);

    if (!localResult.success) {
      console.warn('Quote local save failed:', localResult.error);
      return localResult;
    }

    try {
      const auditUser = getCurrentAuditUser();
      if (auditUser) {
        await db.auditLog.add({
          timestamp: new Date().toISOString(),
          userId: auditUser.userId,
          userName: auditUser.userName,
          action: isNew ? 'create' : 'update',
          entityType: 'quote',
          entityId: quote.id,
          changes: { quoteRef: quote.quoteRef, status: quote.status, clientName: quote.clientName },
        });
      }
    } catch { /* non-critical */ }

    // Step 2: Queue for cloud sync — re-fetch the saved quote so we send
    // the version-incremented data (same pattern as saveCompany)
    if (navigator.onLine) {
      try {
        const sessionUserId = await this.getCurrentSessionUserId();
        if (!sessionUserId) {
          console.warn('Skipping quote sync enqueue: no authenticated Supabase session');
          return localResult;
        }

        const saved = await this.localAdapter.loadQuote(quote.id);
        if (saved) {
          // Ensure referenced company is enqueued first (FK dependency)
          if (saved.companyId) {
            try {
              const company = await this.localAdapter.getCompany(saved.companyId);
              if (company) {
                await syncQueue.enqueue({
                  type: 'update',
                  entity: 'company',
                  entityId: company.id,
                  data: await this.prepareCompanyForSupabase(company as StoredCompany),
                });
              }
            } catch { /* company sync is best-effort here */ }
          }

          const quotePayload = await this.prepareQuoteForSupabase(saved, sessionUserId);
          if (!quotePayload.created_by) {
            console.warn('Skipping quote sync enqueue: created_by is missing for quote', quote.id);
            return localResult;
          }

          await syncQueue.enqueue({
            type: isNew ? 'create' : 'update',
            entity: 'quote',
            entityId: quote.id,
            data: quotePayload,
          });
        } else {
          console.warn('Quote saved locally but could not re-fetch for sync:', quote.id);
        }
      } catch (error) {
        console.warn('Failed to queue quote sync, will retry later:', error);
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
      console.log('Quote loaded from local cache:', id);

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
      console.log('Quote not in cache, fetching from cloud:', id);
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
    // Always start with local data so nothing "disappears"
    const localResult = await this.localAdapter.listQuotes(options, filters);

    if (navigator.onLine) {
      try {
        const cloudResult = await this.cloudAdapter.listQuotes(options, filters);

        // Cache cloud items locally in background
        this.cacheQuotes(cloudResult.items).catch((err) =>
          console.warn('Failed to cache quotes:', err)
        );

        // Merge: cloud items take precedence (newer), local-only items are kept
        const cloudIds = new Set(cloudResult.items.map(q => q.id));
        const localOnly = localResult.items.filter(q => !cloudIds.has(q.id));
        const merged = [...cloudResult.items, ...localOnly];
        merged.sort((a, b) =>
          new Date(b.updatedAt || b.createdAt || Date.now()).getTime() - new Date(a.updatedAt || a.createdAt || Date.now()).getTime()
        );

        return {
          items: merged.slice(0, options.pageSize || merged.length),
          total: merged.length,
          page: options.page || 1,
          pageSize: options.pageSize || merged.length,
          totalPages: Math.ceil(merged.length / (options.pageSize || merged.length)),
        };
      } catch (error) {
        console.warn('Cloud fetch failed, using local cache:', error);
      }
    }

    return localResult;
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
      const sessionUserId = await this.getCurrentSessionUserId();
      if (!sessionUserId) {
        console.warn('Skipping duplicate quote sync enqueue: no authenticated Supabase session');
      } else {
      // Queue for cloud sync
      const newQuote = await this.localAdapter.loadQuote(result.id);
      if (newQuote) {
        await syncQueue.enqueue({
          type: 'create',
          entity: 'quote',
          entityId: result.id,
          data: await this.prepareQuoteForSupabase(newQuote, sessionUserId),
        });
      }
      }
    }

    if (result.success) {
      try {
        const auditUser = getCurrentAuditUser();
        if (auditUser) {
          await db.auditLog.add({
            timestamp: new Date().toISOString(),
            userId: auditUser.userId,
            userName: auditUser.userName,
            action: 'create',
            entityType: 'quote',
            entityId: result.id,
            changes: { duplicatedFrom: id },
          });
        }
      } catch { /* non-critical */ }
    }

    return result;
  }

  /**
   * Create revision
   */
  async createRevision(id: string): Promise<SaveResult> {
    const result = await this.localAdapter.createRevision(id);

    if (result.success && navigator.onLine) {
      const sessionUserId = await this.getCurrentSessionUserId();
      if (!sessionUserId) {
        console.warn('Skipping revision sync enqueue: no authenticated Supabase session');
      } else {
      // Queue for cloud sync
      const newQuote = await this.localAdapter.loadQuote(result.id);
      if (newQuote) {
        await syncQueue.enqueue({
          type: 'create',
          entity: 'quote',
          entityId: result.id,
          data: await this.prepareQuoteForSupabase(newQuote, sessionUserId),
        });
      }
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

    try {
      const auditUser = getCurrentAuditUser();
      if (auditUser) {
        await db.auditLog.add({
          timestamp: new Date().toISOString(),
          userId: auditUser.userId,
          userName: auditUser.userName,
          action: 'delete',
          entityType: 'quote',
          entityId: id,
          changes: {},
        });
      }
    } catch { /* non-critical */ }

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
    const localNextRef = await this.localAdapter.getNextQuoteRef();
    const localBase = this.parseQuoteBaseRef(localNextRef);
    if (!navigator.onLine) return localNextRef;

    const sessionUserId = await this.getCurrentSessionUserId();
    if (!sessionUserId) return localNextRef;

    try {
      const cloudNextRef = await this.cloudAdapter.getNextQuoteRef();
      const cloudBase = this.parseQuoteBaseRef(cloudNextRef);
      if (localBase === null && cloudBase === null) {
        return localNextRef;
      }
      const winningBase = Math.max(localBase ?? Number.NEGATIVE_INFINITY, cloudBase ?? Number.NEGATIVE_INFINITY);
      return `${winningBase}.0`;
    } catch (error) {
      console.warn('Cloud quote reference lookup failed, falling back to local sequence:', error);
      return localNextRef;
    }
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
    // Always start with local data
    const localCustomers = await this.localAdapter.listCustomers();

    if (navigator.onLine) {
      try {
        const cloudCustomers = await this.cloudAdapter.listCustomers();
        // Cache in background
        this.cacheCustomers(cloudCustomers);

        // Merge: cloud takes precedence, keep local-only items
        const cloudIds = new Set(cloudCustomers.map(c => c.id));
        const localOnly = localCustomers.filter(c => !cloudIds.has(c.id));
        return [...cloudCustomers, ...localOnly];
      } catch (error) {
        console.warn('Cloud fetch failed, using local cache:', error);
      }
    }

    return localCustomers;
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

    try {
      const auditUser = getCurrentAuditUser();
      if (auditUser) {
        await db.auditLog.add({
          timestamp: new Date().toISOString(),
          userId: auditUser.userId,
          userName: auditUser.userName,
          action: 'create',
          entityType: 'company',
          entityId: id,
          changes: { name: company.name },
        });
      }
    } catch { /* non-critical */ }

    if (navigator.onLine) {
      const full = await this.localAdapter.getCompany(id);
      await syncQueue.enqueue({
        type: 'create',
        entity: 'company',
        entityId: id,
        data: full ? await this.prepareCompanyForSupabase(full) : await this.prepareCompanyForSupabase({ ...company, id } as StoredCompany),
      });
    }

    return id;
  }

  async updateCompany(id: string, updates: Partial<StoredCompany>): Promise<void> {
    await this.localAdapter.updateCompany(id, updates);

    try {
      const auditUser = getCurrentAuditUser();
      if (auditUser) {
        await db.auditLog.add({
          timestamp: new Date().toISOString(),
          userId: auditUser.userId,
          userName: auditUser.userName,
          action: 'update',
          entityType: 'company',
          entityId: id,
          changes: {},
        });
      }
    } catch { /* non-critical */ }

    if (navigator.onLine) {
      const full = await this.localAdapter.getCompany(id);
      if (full) {
        await syncQueue.enqueue({
          type: 'update',
          entity: 'company',
          entityId: id,
          data: await this.prepareCompanyForSupabase(full),
        });
      }
    }
  }

  async getCompany(id: string): Promise<StoredCompany | null> {
    return this.localAdapter.getCompany(id);
  }

  async listCompanies(): Promise<StoredCompany[]> {
    // Always start with local data
    const localCompanies = await this.localAdapter.listCompanies();

    if (navigator.onLine) {
      try {
        const cloudCompanies = await this.cloudAdapter.listCompanies();
        this.cacheCompanies(cloudCompanies).catch((err) =>
          console.warn('Failed to cache companies:', err)
        );

        // Merge: cloud takes precedence, keep local-only items
        const cloudIds = new Set(cloudCompanies.map(c => c.id));
        const localOnly = localCompanies.filter(c => !cloudIds.has(c.id));
        return [...cloudCompanies, ...localOnly];
      } catch (error) {
        console.warn('Cloud fetch failed, using local cache:', error);
      }
    }

    return localCompanies;
  }

  async searchCompanies(query: string): Promise<StoredCompany[]> {
    return this.localAdapter.searchCompanies(query);
  }

  async deleteCompany(id: string): Promise<void> {
    await this.localAdapter.deleteCompany(id);

    try {
      const auditUser = getCurrentAuditUser();
      if (auditUser) {
        await db.auditLog.add({
          timestamp: new Date().toISOString(),
          userId: auditUser.userId,
          userName: auditUser.userName,
          action: 'delete',
          entityType: 'company',
          entityId: id,
          changes: {},
        });
      }
    } catch { /* non-critical */ }

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

    try {
      const auditUser = getCurrentAuditUser();
      if (auditUser) {
        await db.auditLog.add({
          timestamp: new Date().toISOString(),
          userId: auditUser.userId,
          userName: auditUser.userName,
          action: 'create',
          entityType: 'contact',
          entityId: id,
          changes: { name: contact.name },
        });
      }
    } catch { /* non-critical */ }

    if (navigator.onLine) {
      const contacts = await this.localAdapter.getContactsByCompany(contact.companyId);
      const full = contacts.find(c => c.id === id);
      await syncQueue.enqueue({
        type: 'create',
        entity: 'contact',
        entityId: id,
        data: full ? this.prepareContactForSupabase(full) : this.prepareContactForSupabase({ ...contact, id } as StoredContact),
      });
    }

    return id;
  }

  async updateContact(id: string, updates: Partial<StoredContact>): Promise<void> {
    await this.localAdapter.updateContact(id, updates);

    try {
      const auditUser = getCurrentAuditUser();
      if (auditUser) {
        await db.auditLog.add({
          timestamp: new Date().toISOString(),
          userId: auditUser.userId,
          userName: auditUser.userName,
          action: 'update',
          entityType: 'contact',
          entityId: id,
          changes: {},
        });
      }
    } catch { /* non-critical */ }

    if (navigator.onLine) {
      // Need to get the full contact; use companyId from updates if available
      if (updates.companyId) {
        const contacts = await this.localAdapter.getContactsByCompany(updates.companyId);
        const full = contacts.find(c => c.id === id);
        if (full) {
          await syncQueue.enqueue({
            type: 'update',
            entity: 'contact',
            entityId: id,
            data: this.prepareContactForSupabase(full),
          });
        }
      } else {
        // Fallback: send the partial update with snake_case conversion
        await syncQueue.enqueue({
          type: 'update',
          entity: 'contact',
          entityId: id,
          data: this.prepareContactForSupabase({ id, ...updates } as StoredContact),
        });
      }
    }
  }

  async getContactsByCompany(companyId: string): Promise<StoredContact[]> {
    return this.localAdapter.getContactsByCompany(companyId);
  }

  async deleteContact(id: string): Promise<void> {
    await this.localAdapter.deleteContact(id);

    try {
      const auditUser = getCurrentAuditUser();
      if (auditUser) {
        await db.auditLog.add({
          timestamp: new Date().toISOString(),
          userId: auditUser.userId,
          userName: auditUser.userName,
          action: 'delete',
          entityType: 'contact',
          entityId: id,
          changes: {},
        });
      }
    } catch { /* non-critical */ }

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
      const activities = await this.localAdapter.getActivitiesByCompany(activity.companyId);
      const full = activities.find(a => a.id === id);
      await syncQueue.enqueue({
        type: 'create',
        entity: 'activity',
        entityId: id,
        data: full ? await this.prepareActivityForSupabase(full) : await this.prepareActivityForSupabase({ ...activity, id } as StoredActivity),
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
      const notifications = await this.localAdapter.getNotifications(notification.userId);
      const full = notifications.find(n => n.id === id);
      await syncQueue.enqueue({
        type: 'create',
        entity: 'notification',
        entityId: id,
        data: full ? await this.prepareNotificationForSupabase(full) : await this.prepareNotificationForSupabase({ ...notification, id } as StoredNotification),
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
        data: { id, is_read: true, updated_at: new Date().toISOString() },
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

  // ===== Repair Operations =====

  /**
   * Re-enqueue all local companies (and their contacts) for sync.
   * Call after clearing the permanent failure blocklist to recover
   * from entities that were previously blocked by FK violations.
   */
  async repairStuckSyncs(): Promise<number> {
    const sessionUserId = await this.getCurrentSessionUserId();
    if (!sessionUserId) {
      console.warn('Skipping sync repair: no authenticated Supabase session');
      return 0;
    }

    syncQueue.clearPermanentFailures();
    syncQueue.clearQueue();

    let enqueued = 0;

    // Re-enqueue companies (priority 0 — must sync first)
    const companies = await this.localAdapter.listCompanies();
    for (const company of companies) {
      await syncQueue.enqueue({
        type: 'update',
        entity: 'company',
        entityId: company.id,
        data: await this.prepareCompanyForSupabase(company as StoredCompany),
      });
      enqueued++;

      // Re-enqueue contacts for this company (priority 1)
      const contacts = await this.localAdapter.getContactsByCompany(company.id);
      for (const contact of contacts) {
        await syncQueue.enqueue({
          type: 'update',
          entity: 'contact',
          entityId: contact.id,
          data: this.prepareContactForSupabase(contact),
        });
        enqueued++;
      }
    }

    // Re-enqueue all local quotes (priority 3 — processed after companies)
    const allQuotes = await db.quotes.toArray();
    for (const storedQuote of allQuotes) {
      try {
        const quote = await this.localAdapter.loadQuote(storedQuote.id);
        if (quote) {
          await syncQueue.enqueue({
            type: 'update',
            entity: 'quote',
            entityId: quote.id,
            data: await this.prepareQuoteForSupabase(quote, sessionUserId),
          });
          enqueued++;
        }
      } catch {
        // Skip quotes that can't be loaded
      }
    }

    // Trigger processing
    await syncQueue.processQueue();
    return enqueued;
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
        console.log('Version mismatch detected - resolving conflict');
        const resolution = resolveQuoteConflict(localQuote, cloudQuote);

        // Update local cache with resolved version
        await this.localAdapter.saveQuote(resolution.resolved);

        // If local wins or merged, sync back to cloud
        if (resolution.strategy !== 'remote-wins') {
          await syncQueue.enqueue({
            type: 'update',
            entity: 'quote',
            entityId: resolution.resolved.id,
            data: await this.prepareQuoteForSupabase(resolution.resolved),
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
   * Prepare quote for Supabase (convert formats, resolve user IDs)
   */
  private async prepareQuoteForSupabase(quote: QuoteState, sessionUserId?: string | null): Promise<any> {
    const createdBy = await this.resolveSupabaseUserId(quote.createdBy, {
      fallbackToSession: true,
      sessionUserId,
    });
    if (!createdBy) {
      throw new Error(`Missing created_by for quote ${quote.id}; deferring sync until authenticated session is available`);
    }

    return {
      id: quote.id,
      quote_ref: quote.quoteRef,
      version: quote.version,
      status: quote.status,
      created_by: createdBy,
      assigned_to: await this.resolveSupabaseUserId(quote.assignedTo),
      company_id: quote.companyId || null,
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
      approval_tier: quote.approvalTier ?? null,
      approval_status: quote.approvalStatus || null,
      approval_notes: quote.approvalNotes || null,
      override_irr: quote.overrideIRR,
      submitted_by: await this.resolveSupabaseUserId(quote.submittedBy),
      submitted_at: quote.submittedAt instanceof Date ? quote.submittedAt.toISOString() : quote.submittedAt || null,
      approved_by: await this.resolveSupabaseUserId(quote.approvedBy),
      approved_at: quote.approvedAt instanceof Date ? quote.approvedAt.toISOString() : quote.approvedAt || null,
      locked_by: await this.resolveSupabaseUserId(quote.lockedBy),
      locked_at: quote.lockedAt instanceof Date ? quote.lockedAt.toISOString() : quote.lockedAt || null,
      quote_date: quote.quoteDate instanceof Date ? quote.quoteDate.toISOString() : quote.quoteDate,
      created_at: quote.createdAt instanceof Date ? quote.createdAt.toISOString() : quote.createdAt,
      updated_at: quote.updatedAt instanceof Date ? quote.updatedAt.toISOString() : quote.updatedAt,
    };
  }

  /**
   * Prepare company for Supabase (camelCase to snake_case, resolve user IDs)
   */
  private async prepareCompanyForSupabase(company: StoredCompany): Promise<any> {
    return {
      id: company.id,
      name: company.name,
      trading_name: company.tradingName || null,
      registration_number: company.registrationNumber || null,
      vat_number: company.vatNumber || null,
      industry: company.industry || null,
      website: company.website || null,
      address: company.address || null,
      city: company.city || null,
      province: company.province || null,
      postal_code: company.postalCode || null,
      country: company.country || null,
      phone: company.phone || null,
      email: company.email || null,
      pipeline_stage: company.pipelineStage || null,
      assigned_to: await this.resolveSupabaseUserId(company.assignedTo),
      estimated_value: company.estimatedValue ?? 0,
      credit_limit: company.creditLimit ?? 0,
      payment_terms: company.paymentTerms ?? 0,
      tags: company.tags || [],
      notes: company.notes || null,
      created_at: company.createdAt,
      updated_at: company.updatedAt,
    };
  }

  /**
   * Prepare contact for Supabase (camelCase to snake_case)
   */
  private prepareContactForSupabase(contact: StoredContact): any {
    return {
      id: contact.id,
      company_id: contact.companyId,
      first_name: contact.firstName,
      last_name: contact.lastName,
      title: contact.title || null,
      email: contact.email || null,
      phone: contact.phone || null,
      is_primary: contact.isPrimary || false,
      created_at: contact.createdAt,
      updated_at: contact.updatedAt,
    };
  }

  /**
   * Prepare activity for Supabase (camelCase to snake_case, resolve user IDs)
   */
  private async prepareActivityForSupabase(activity: StoredActivity): Promise<any> {
    return {
      id: activity.id,
      company_id: activity.companyId || null,
      contact_id: activity.contactId || null,
      quote_id: activity.quoteId || null,
      type: activity.type,
      title: activity.title,
      description: activity.description || null,
      due_date: activity.dueDate || null,
      created_by: await this.resolveSupabaseUserId(activity.createdBy),
      created_at: activity.createdAt,
    };
  }

  /**
   * Prepare notification for Supabase (camelCase to snake_case, resolve user IDs)
   */
  private async prepareNotificationForSupabase(notification: StoredNotification): Promise<any> {
    return {
      id: notification.id,
      user_id: await this.resolveSupabaseUserId(notification.userId),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      entity_type: notification.entityType || null,
      entity_id: notification.entityId || null,
      is_read: notification.isRead || false,
      created_at: notification.createdAt,
    };
  }
}

