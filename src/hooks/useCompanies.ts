import { useCallback } from 'react';
import { getCompanyRepository } from '../db/repositories';
import type { StoredCompany } from '../db/interfaces';
import type { PipelineStage } from '../types/crm';

export function useCompanies() {
  const repo = getCompanyRepository();

  const listCompanies = useCallback(async (): Promise<StoredCompany[]> => {
    try {
      return await repo.list();
    } catch (error) {
      console.error('Failed to list companies:', error);
      return [];
    }
  }, [repo]);

  const searchCompanies = useCallback(
    async (query: string): Promise<StoredCompany[]> => {
      try {
        if (!query.trim()) return await repo.list();
        return await repo.search(query);
      } catch (error) {
        console.error('Failed to search companies:', error);
        return [];
      }
    },
    [repo]
  );

  const getById = useCallback(
    async (id: string): Promise<StoredCompany | null> => {
      try {
        return await repo.getById(id);
      } catch (error) {
        console.error('Failed to get company:', error);
        return null;
      }
    },
    [repo]
  );

  const saveCompany = useCallback(
    async (
      company: Omit<StoredCompany, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<string> => {
      return await repo.save(company);
    },
    [repo]
  );

  const updateCompany = useCallback(
    async (id: string, updates: Partial<StoredCompany>): Promise<void> => {
      await repo.update(id, updates);
    },
    [repo]
  );

  const updateStage = useCallback(
    async (id: string, stage: PipelineStage): Promise<void> => {
      await repo.updateStage(id, stage);
    },
    [repo]
  );

  const deleteCompany = useCallback(
    async (id: string): Promise<void> => {
      await repo.delete(id);
    },
    [repo]
  );

  return {
    listCompanies,
    searchCompanies,
    getById,
    saveCompany,
    updateCompany,
    updateStage,
    deleteCompany,
  };
}
