/**
 * Quote Management Hook with Role-Based Filtering
 *
 * Provides quote operations with automatic role-based access control:
 * - Sales Rep / Key Account: See only their own quotes
 * - Sales Manager+: See all quotes
 * - System Admin: See all quotes
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { getDb } from '../db/DatabaseAdapter';
import { ROLE_HIERARCHY, type Role } from '../auth/permissions';
import type { StoredQuote, QuoteFilter, PaginationOptions } from '../db/interfaces';
import type { QuoteState } from '../types/quote';

export function useQuotes() {
  const { user } = useAuthStore();
  const [quotes, setQuotes] = useState<StoredQuote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load quotes with role-based filtering
   */
  const loadQuotes = useCallback(
    async (options?: PaginationOptions, filters?: QuoteFilter) => {
      if (!user) {
        setQuotes([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const db = getDb();

        // Default pagination
        const paginationOptions: PaginationOptions = options || {
          page: 1,
          pageSize: 50,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        };

        // Apply role-based filtering
        let roleFilters: QuoteFilter = { ...filters };

        // Fetch quotes (RLS policies in Supabase handle filtering automatically)
        const result = await db.listQuotes(paginationOptions, roleFilters);

        setQuotes(result.items);
        console.log(`✅ Loaded ${result.items.length} quotes for role: ${user.role}`);
      } catch (err) {
        console.error('Error loading quotes:', err);
        setError(err instanceof Error ? err.message : 'Failed to load quotes');
        setQuotes([]);
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  /**
   * Search quotes
   */
  const searchQuotes = useCallback(
    async (query: string) => {
      if (!user || !query) {
        setQuotes([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const db = getDb();
        const results = await db.searchQuotes(query);

        setQuotes(results);
        console.log(`🔍 Found ${results.length} quotes matching: "${query}"`);
      } catch (err) {
        console.error('Error searching quotes:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setQuotes([]);
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  /**
   * Get quote by ID (with permission check)
   */
  const getQuote = useCallback(
    async (id: string): Promise<QuoteState | null> => {
      if (!user) return null;

      try {
        const db = getDb();
        const quote = await db.loadQuote(id);

        if (!quote) return null;

        // Permission check
        if (!canViewQuote(quote, user.id, user.role)) {
          console.warn('User does not have permission to view this quote');
          return null;
        }

        return quote;
      } catch (err) {
        console.error('Error getting quote:', err);
        return null;
      }
    },
    [user]
  );

  // Auto-load on mount
  useEffect(() => {
    if (user) {
      loadQuotes();
    }
  }, [user, loadQuotes]);

  return {
    quotes,
    isLoading,
    error,
    loadQuotes,
    searchQuotes,
    getQuote,
    refresh: loadQuotes,
  };
}

/**
 * Check if user can view a specific quote
 */
export function canViewQuote(quote: QuoteState, userId: string, userRole: string): boolean {
  // Sales manager+ and system_admin can see all quotes
  if ((ROLE_HIERARCHY[userRole as Role] || 0) >= 2) {
    return true;
  }

  // Sales rep / key account: own quotes or assigned quotes
  return quote.createdBy === userId || quote.assignedTo === userId;
}

/**
 * Check if user can edit a specific quote
 */
export function canEditQuote(quote: QuoteState, userId: string, userRole: string): boolean {
  // System admin can edit any quote
  if (userRole === 'system_admin') {
    return true;
  }

  // Sales manager+ can edit any quote
  if ((ROLE_HIERARCHY[userRole as Role] || 0) >= 2) {
    return true;
  }

  // Draft / changes-requested quotes: owner or assignee can edit
  if (quote.status === 'draft' || quote.status === 'changes-requested') {
    return quote.createdBy === userId || quote.assignedTo === userId;
  }

  // In-review: current assignee can edit
  if (quote.status === 'in-review' && quote.currentAssigneeId === userId) {
    return true;
  }

  return false;
}

/**
 * Check if user can delete a specific quote
 */
export function canDeleteQuote(quote: QuoteState, userId: string, userRole: string): boolean {
  // System admin can delete any quote
  if (userRole === 'system_admin') {
    return true;
  }

  // Owner can delete own draft quotes
  if (quote.status === 'draft' && quote.createdBy === userId) {
    return true;
  }

  return false;
}
