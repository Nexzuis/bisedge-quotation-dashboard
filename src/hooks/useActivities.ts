import { useCallback } from 'react';
import { getActivityRepository } from '../db/repositories';
import type { StoredActivity } from '../db/interfaces';
import type { ActivityType } from '../types/crm';

export function useActivities() {
  const repo = getActivityRepository();

  const getByCompany = useCallback(
    async (companyId: string, limit?: number): Promise<StoredActivity[]> => {
      try {
        return await repo.getByCompany(companyId, limit);
      } catch (error) {
        console.error('Failed to get activities:', error);
        return [];
      }
    },
    [repo]
  );

  const getRecent = useCallback(
    async (limit = 15): Promise<StoredActivity[]> => {
      try {
        return await repo.getRecent(limit);
      } catch (error) {
        console.error('Failed to get recent activities:', error);
        return [];
      }
    },
    [repo]
  );

  const getByQuote = useCallback(
    async (quoteId: string): Promise<StoredActivity[]> => {
      try {
        return await repo.getByQuote(quoteId);
      } catch (error) {
        console.error('Failed to get quote activities:', error);
        return [];
      }
    },
    [repo]
  );

  const saveActivity = useCallback(
    async (activity: Omit<StoredActivity, 'id' | 'createdAt'>): Promise<string> => {
      return await repo.save(activity);
    },
    [repo]
  );

  const logStageChange = useCallback(
    async (
      companyId: string,
      fromStage: string,
      toStage: string,
      userId: string
    ): Promise<string> => {
      return await repo.save({
        companyId,
        contactId: '',
        quoteId: '',
        type: 'stage-change' as ActivityType,
        title: `Stage changed: ${fromStage} → ${toStage}`,
        description: '',
        dueDate: '',
        createdBy: userId,
      });
    },
    [repo]
  );

  const logQuoteCreated = useCallback(
    async (
      companyId: string,
      quoteId: string,
      quoteRef: string,
      userId: string
    ): Promise<string> => {
      return await repo.save({
        companyId,
        contactId: '',
        quoteId,
        type: 'quote-created' as ActivityType,
        title: `Quote ${quoteRef} created`,
        description: '',
        dueDate: '',
        createdBy: userId,
      });
    },
    [repo]
  );

  const logQuoteSent = useCallback(
    async (
      companyId: string,
      quoteId: string,
      quoteRef: string,
      userId: string
    ): Promise<string> => {
      return await repo.save({
        companyId,
        contactId: '',
        quoteId,
        type: 'quote-sent' as ActivityType,
        title: `Quote ${quoteRef} sent to customer`,
        description: '',
        dueDate: '',
        createdBy: userId,
      });
    },
    [repo]
  );

  const deleteActivity = useCallback(
    async (id: string): Promise<void> => {
      await repo.delete(id);
    },
    [repo]
  );

  return {
    getByCompany,
    getRecent,
    getByQuote,
    saveActivity,
    logStageChange,
    logQuoteCreated,
    logQuoteSent,
    deleteActivity,
  };
}
