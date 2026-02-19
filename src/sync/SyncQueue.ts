/**
 * Offline Sync Queue
 *
 * Handles synchronization of local changes to Supabase when offline.
 * Operations are queued in IndexedDB and processed when connection is restored.
 */

import { useState, useEffect } from 'react';
import { db } from '../db/schema';
import { supabase } from '../lib/supabase';
import type { QuoteState } from '../types/quote';

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'quote' | 'customer' | 'user' | 'company' | 'contact' | 'activity' | 'notification';
  entityId: string;
  data: any;
  timestamp: number;
  retries: number;
  lastError?: string;
}

// Entity sync priority — parents must sync before children that reference them via FK
const ENTITY_PRIORITY: Record<string, number> = {
  company: 0,
  contact: 1,
  customer: 1,
  activity: 2,
  notification: 2,
  quote: 3,
  user: 0,
};

// Postgres error codes that are permanent — retrying won't fix them
// NOTE: 23503 (FK violation) is NOT here — FK errors are usually ordering
// problems (parent not synced yet) and resolve on retry after the parent syncs.
const PERMANENT_PG_CODES = new Set(['42703', '42P01']);

export interface SyncStatus {
  pendingOperations: number;
  lastSyncedAt: Date | null;
  isOnline: boolean;
  isSyncing: boolean;
}

/**
 * Sync Queue Manager
 * Handles offline operation queuing and background sync
 */
export class SyncQueue {
  private isProcessing = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private lastSyncedAt: Date | null = null;
  private _processingPromise: Promise<void> = Promise.resolve();
  private permanentlyFailed: Set<string>;

  constructor() {
    // Load persistent blocklist of permanently-failed entities
    this.permanentlyFailed = this.loadPermanentlyFailed();

    // Listen for online/offline events
    window.addEventListener('online', () => this.processQueue());

    // Start processing if already online
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  private entityKey(entity: string, entityId: string): string {
    return `${entity}:${entityId}`;
  }

  /**
   * Regenerate quote_ref after a unique-conflict error and update both queue payload and local cache.
   */
  private async remediateQuoteRefConflict(op: SyncOperation): Promise<string | null> {
    try {
      const { getDb } = await import('../db/DatabaseAdapter');
      const nextRef = await getDb().getNextQuoteRef();
      if (!nextRef) return null;

      op.data = {
        ...op.data,
        quote_ref: nextRef,
        updated_at: new Date().toISOString(),
      };

      try {
        await db.quotes.update(op.entityId, {
          quoteRef: nextRef,
          updatedAt: new Date().toISOString(),
        } as any);
      } catch (localErr) {
        console.warn('Quote ref remediation updated queue payload but failed local quote update:', localErr);
      }

      return nextRef;
    } catch (error) {
      console.warn('Failed to remediate quote_ref conflict:', error);
      return null;
    }
  }

  /**
   * Add an operation to the sync queue (deduplicates by entity+entityId)
   */
  async enqueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    // Skip if this entity has been permanently rejected
    const key = this.entityKey(operation.entity, operation.entityId);
    if (this.permanentlyFailed.has(key)) {
      console.log('⏭️  Skipping enqueue — entity permanently failed:', key);
      return;
    }

    console.log('📝 Enqueuing sync operation:', operation.type, operation.entity, operation.entityId);

    try {
      const queue = this.getLocalQueue();

      // Deduplicate: if same entity+entityId already queued, update it instead
      const existingIdx = queue.findIndex(
        (q) => q.entity === operation.entity && q.entityId === operation.entityId
      );

      if (existingIdx !== -1) {
        queue[existingIdx].data = operation.data;
        queue[existingIdx].type = operation.type;
        queue[existingIdx].retries = 0;
        queue[existingIdx].lastError = undefined;
        console.log('🔄 Updated existing queue entry for', operation.entity, operation.entityId);
      } else {
        queue.push({
          ...operation,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          retries: 0,
        });
      }

      this.saveLocalQueue(queue);

      // Notify listeners
      this.notifyListeners();

      // Try to process if online
      if (navigator.onLine) {
        this.processQueue();
      }
    } catch (error) {
      console.error('Error enqueuing sync operation:', error);
    }
  }

  /**
   * Process the sync queue (serialized via Promise chain to prevent concurrent runs)
   */
  async processQueue(): Promise<void> {
    this._processingPromise = this._processingPromise
      .catch(() => {}) // swallow previous errors
      .then(() => this._doProcessQueue());
    return this._processingPromise;
  }

  /**
   * Internal: actual queue processing logic
   */
  private async _doProcessQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) {
      return;
    }

    // Verify authenticated session — RLS requires it
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('⏸️  Skipping sync — no authenticated Supabase session');
        return;
      }
    } catch {
      console.warn('⏸️  Skipping sync — failed to check auth session');
      return;
    }

    this.isProcessing = true;
    this.notifyListeners();

    console.log('🔄 Processing sync queue...');

    const queue = this.getLocalQueue();

    if (queue.length === 0) {
      console.log('✅ Sync queue is empty');
      this.isProcessing = false;
      this.notifyListeners();
      return;
    }

    console.log(`📤 Syncing ${queue.length} pending operations...`);

    // Sort by entity priority — parents (companies) before children (quotes)
    queue.sort((a, b) => {
      const pa = ENTITY_PRIORITY[a.entity] ?? 99;
      const pb = ENTITY_PRIORITY[b.entity] ?? 99;
      return pa - pb;
    });

    let processedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < queue.length; i++) {
      const op = queue[i];

      try {
        await this.syncToSupabase(op);
        console.log(`✅ Synced ${op.type} ${op.entity}:`, op.entityId);

        // Remove from queue on success
        queue.splice(i, 1);
        i--; // Adjust index after removal
        processedCount++;
      } catch (error: any) {
        const pgCode = error?.code;
        const isPermanent = PERMANENT_PG_CODES.has(pgCode);
        const isFkViolation = pgCode === '23503';
        const isQuoteRefConflict = pgCode === '23505' && op.entity === 'quote';

        if (isQuoteRefConflict) {
          const remediatedRef = await this.remediateQuoteRefConflict(op);
          op.retries++;
          op.lastError = error instanceof Error ? error.message : String(error);
          console.warn(
            `⚠️ Quote reference conflict for ${op.type} quote ${op.entityId} (quote_ref: ${op.data?.quote_ref || 'unknown'}, remediated_to: ${remediatedRef || 'none'}, retry ${op.retries}/10)`
          );
          if (op.retries > 10) {
            console.error(`💀 Quote reference conflict persisted after ${op.retries} retries, removing from queue`);
            queue.splice(i, 1);
            i--;
            failedCount++;
          }
          continue;
        }

        if (isPermanent) {
          const failKey = this.entityKey(op.entity, op.entityId);
          this.permanentlyFailed.add(failKey);
          this.savePermanentlyFailed();
          console.error(`💀 Permanent error for ${op.type} ${op.entity} (PG ${pgCode}), removing:`, error.message);
          queue.splice(i, 1);
          i--;
          failedCount++;
          continue;
        }

        if (isFkViolation) {
          // FK violation — parent probably hasn't synced yet. Keep in queue
          // and retry on next processQueue() pass (after parent syncs).
          op.retries++;
          op.lastError = error instanceof Error ? error.message : String(error);
          console.warn(`⏳ FK dependency missing for ${op.type} ${op.entity} (retry ${op.retries}/10):`, error.message);

          if (op.retries > 10) {
            console.error(`💀 FK violation persisted after ${op.retries} retries, removing from queue`);
            queue.splice(i, 1);
            i--;
            failedCount++;
          }
          continue;
        }

        console.error(`❌ Failed to sync ${op.type} ${op.entity}:`, error);

        // Transient error — increment retry count
        op.retries++;
        op.lastError = error instanceof Error ? error.message : String(error);

        // If too many retries, mark as failed and remove
        if (op.retries > 5) {
          console.error(`💀 Operation failed after ${op.retries} retries, removing from queue`);
          queue.splice(i, 1);
          i--;
          failedCount++;
        }
        // No inline backoff — queue retries on next processQueue() call
      }
    }

    // Save updated queue
    this.saveLocalQueue(queue);

    this.lastSyncedAt = new Date();
    this.isProcessing = false;
    this.notifyListeners();

    console.log(`✅ Sync complete: ${processedCount} synced, ${failedCount} failed, ${queue.length} remaining`);
  }

  /**
   * Sync a single operation to Supabase
   */
  private async syncToSupabase(op: SyncOperation): Promise<void> {
    switch (op.entity) {
      case 'quote':
        await this.syncQuote(op);
        break;
      case 'customer':
        await this.syncCustomer(op);
        break;
      case 'company':
        await this.syncEntity(op, 'companies');
        break;
      case 'contact':
        await this.syncEntity(op, 'contacts');
        break;
      case 'activity':
        await this.syncEntity(op, 'activities');
        break;
      case 'notification':
        await this.syncEntity(op, 'notifications');
        break;
      default:
        throw new Error(`Unknown entity type: ${op.entity}`);
    }
  }

  /**
   * Sync a quote operation
   */
  private async syncQuote(op: SyncOperation): Promise<void> {
    const tableName = 'quotes';

    switch (op.type) {
      case 'create':
      case 'update': {
        // Upsert with .select() to detect silent RLS rejections
        const { data, error: upsertError } = await supabase
          .from(tableName)
          .upsert(op.data, { onConflict: 'id' })
          .select();

        if (upsertError) throw upsertError;
        if (!data || data.length === 0) {
          throw new Error(`Sync rejected by RLS for ${tableName} (id: ${op.entityId})`);
        }
        break;
      }
      case 'delete': {
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .eq('id', op.entityId);

        if (deleteError) throw deleteError;
        break;
      }
    }
  }

  /**
   * Sync a customer operation
   */
  private async syncCustomer(op: SyncOperation): Promise<void> {
    const tableName = 'customers';

    switch (op.type) {
      case 'create':
      case 'update': {
        const { data, error: upsertError } = await supabase
          .from(tableName)
          .upsert(op.data, { onConflict: 'id' })
          .select();

        if (upsertError) throw upsertError;
        if (!data || data.length === 0) {
          throw new Error(`Sync rejected by RLS for ${tableName} (id: ${op.entityId})`);
        }
        break;
      }
      case 'delete': {
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .eq('id', op.entityId);

        if (deleteError) throw deleteError;
        break;
      }
    }
  }

  /**
   * Sync a generic entity (company, contact, activity, notification)
   */
  private async syncEntity(op: SyncOperation, tableName: string): Promise<void> {
    switch (op.type) {
      case 'create':
      case 'update': {
        const { data, error } = await supabase
          .from(tableName)
          .upsert(op.data, { onConflict: 'id' })
          .select();

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error(`Sync rejected by RLS for ${tableName} (id: ${op.entityId})`);
        }
        break;
      }
      case 'delete': {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', op.entityId);

        if (error) throw error;
        break;
      }
    }
  }

  /**
   * Get sync status
   */
  getStatus(): SyncStatus {
    const queue = this.getLocalQueue();
    return {
      pendingOperations: queue.length,
      lastSyncedAt: this.lastSyncedAt,
      isOnline: navigator.onLine,
      isSyncing: this.isProcessing,
    };
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Force sync now (manual trigger)
   */
  async forceSyncNow(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }
    await this.processQueue();
  }

  /**
   * Clear all pending operations (dangerous!)
   */
  clearQueue(): void {
    this.saveLocalQueue([]);
    this.notifyListeners();
    console.log('🗑️  Sync queue cleared');
  }

  /**
   * Clear the permanent failure blocklist (allows re-sync of previously failed entities)
   */
  clearPermanentFailures(): void {
    this.permanentlyFailed.clear();
    this.savePermanentlyFailed();
    console.log('🗑️  Permanent failure blocklist cleared');
  }

  /**
   * Get queue from localStorage (temporary - will move to IndexedDB)
   */
  private getLocalQueue(): SyncOperation[] {
    try {
      const stored = localStorage.getItem('bisedge_sync_queue');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading sync queue:', error);
      return [];
    }
  }

  /**
   * Save queue to localStorage (temporary - will move to IndexedDB)
   */
  private saveLocalQueue(queue: SyncOperation[]): void {
    try {
      localStorage.setItem('bisedge_sync_queue', JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  private loadPermanentlyFailed(): Set<string> {
    try {
      const stored = localStorage.getItem('bisedge_sync_permanent_failures');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }

  private savePermanentlyFailed(): void {
    try {
      localStorage.setItem(
        'bisedge_sync_permanent_failures',
        JSON.stringify([...this.permanentlyFailed])
      );
    } catch { /* non-critical */ }
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => listener(status));
  }
}

/**
 * Singleton instance
 */
export const syncQueue = new SyncQueue();

/**
 * React hook for sync status
 */
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(syncQueue.getStatus());

  useEffect(() => {
    const unsubscribe = syncQueue.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return status;
}
