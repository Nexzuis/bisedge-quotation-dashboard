import { useCallback } from 'react';
import { useQuoteStore } from '../store/useQuoteStore';
import { getQuoteRepository } from '../db/repositories';
import type { PaginationOptions, QuoteFilter, PaginatedResult, StoredQuote } from '../db/interfaces';
import { logger } from '../utils/logger';

export interface UseQuoteDBResult {
  loadFromDB: (id: string) => Promise<boolean>;
  createNewQuote: () => Promise<void>;
  duplicateQuote: (id: string) => Promise<boolean>;
  createRevision: (id: string) => Promise<boolean>;
  deleteQuote: (id: string) => Promise<void>;
  listQuotes: (
    options: PaginationOptions,
    filters?: QuoteFilter
  ) => Promise<PaginatedResult<StoredQuote>>;
  searchQuotes: (query: string) => Promise<StoredQuote[]>;
  loadMostRecent: () => Promise<boolean>;
}

/**
 * Hook for quote database operations
 */
export function useQuoteDB(): UseQuoteDBResult {
  const loadQuote = useQuoteStore((state) => state.loadQuote);
  const resetQuote = useQuoteStore((state) => state.resetQuote);
  const repository = getQuoteRepository();

  /**
   * Load quote from database and update store
   */
  const loadFromDB = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const quote = await repository.load(id);
        if (quote) {
          loadQuote(quote);
          return true;
        }
        return false;
      } catch (error) {
        logger.error('Error loading quote from DB:', error);
        return false;
      }
    },
    [repository, loadQuote]
  );

  /**
   * Create new quote with next quote reference
   */
  const createNewQuote = useCallback(async () => {
    try {
      // Reset to default state
      resetQuote();

      // Get next quote reference
      const nextRef = await repository.getNextQuoteRef();

      // Update quote ref in store
      loadQuote({
        ...useQuoteStore.getState(),
        quoteRef: nextRef,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      logger.error('Error creating new quote:', error);
      throw error;
    }
  }, [repository, resetQuote, loadQuote]);

  /**
   * Duplicate quote (creates new quote with new ref)
   */
  const duplicateQuote = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const result = await repository.duplicate(id);
        if (result.success) {
          // Load the duplicated quote
          await loadFromDB(result.id);
          return true;
        } else {
          logger.error('Failed to duplicate quote:', result.error);
          return false;
        }
      } catch (error) {
        logger.error('Error duplicating quote:', error);
        return false;
      }
    },
    [repository, loadFromDB]
  );

  /**
   * Create revision (increments decimal: 2142.0 → 2142.1)
   */
  const createRevision = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const result = await repository.createRevision(id);
        if (result.success) {
          // Load the revision
          await loadFromDB(result.id);
          return true;
        } else {
          logger.error('Failed to create revision:', result.error);
          return false;
        }
      } catch (error) {
        logger.error('Error creating revision:', error);
        return false;
      }
    },
    [repository, loadFromDB]
  );

  /**
   * Delete quote
   */
  const deleteQuote = useCallback(
    async (id: string): Promise<void> => {
      try {
        await repository.delete(id);
      } catch (error) {
        logger.error('Error deleting quote:', error);
        throw error;
      }
    },
    [repository]
  );

  /**
   * List quotes with pagination and filters
   */
  const listQuotes = useCallback(
    async (
      options: PaginationOptions,
      filters?: QuoteFilter
    ): Promise<PaginatedResult<StoredQuote>> => {
      try {
        return await repository.list(options, filters);
      } catch (error) {
        logger.error('Error listing quotes:', error);
        return {
          items: [],
          total: 0,
          page: options.page,
          pageSize: options.pageSize,
          totalPages: 0,
        };
      }
    },
    [repository]
  );

  /**
   * Search quotes by query string
   */
  const searchQuotes = useCallback(
    async (query: string): Promise<StoredQuote[]> => {
      try {
        return await repository.search(query);
      } catch (error) {
        logger.error('Error searching quotes:', error);
        return [];
      }
    },
    [repository]
  );

  /**
   * Load most recently updated quote
   */
  const loadMostRecent = useCallback(async (): Promise<boolean> => {
    try {
      const quote = await repository.getMostRecent();
      if (quote) {
        loadQuote(quote);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error loading most recent quote:', error);
      return false;
    }
  }, [repository, loadQuote]);

  return {
    loadFromDB,
    createNewQuote,
    duplicateQuote,
    createRevision,
    deleteQuote,
    listQuotes,
    searchQuotes,
    loadMostRecent,
  };
}
