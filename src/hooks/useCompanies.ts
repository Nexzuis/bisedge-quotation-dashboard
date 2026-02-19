import { useCallback } from 'react';
import { getCompanyRepository } from '../db/repositories';
import type { StoredCompany } from '../db/interfaces';
import type { PipelineStage } from '../types/crm';
import { useAuth } from '../components/auth/AuthContext';

export function useCompanies() {
  const repo = getCompanyRepository();
  const { user } = useAuth();
  const isRestrictedRole = user?.role === 'sales_rep' || user?.role === 'key_account';
  const canAccessCompany = useCallback(
    (company: StoredCompany) => {
      if (!isRestrictedRole || !user) return true;
      return company.assignedTo === user.id;
    },
    [isRestrictedRole, user]
  );

  const listCompanies = useCallback(async (): Promise<StoredCompany[]> => {
    try {
      const companies = await repo.list();
      return companies.filter(canAccessCompany);
    } catch (error) {
      console.error('Failed to list companies:', error);
      return [];
    }
  }, [repo, canAccessCompany]);

  const searchCompanies = useCallback(
    async (query: string): Promise<StoredCompany[]> => {
      try {
        const companies = !query.trim() ? await repo.list() : await repo.search(query);
        return companies.filter(canAccessCompany);
      } catch (error) {
        console.error('Failed to search companies:', error);
        return [];
      }
    },
    [repo, canAccessCompany]
  );

  const getById = useCallback(
    async (id: string): Promise<StoredCompany | null> => {
      try {
        const company = await repo.getById(id);
        if (!company) return null;
        return canAccessCompany(company) ? company : null;
      } catch (error) {
        console.error('Failed to get company:', error);
        return null;
      }
    },
    [repo, canAccessCompany]
  );

  const saveCompany = useCallback(
    async (
      company: Omit<StoredCompany, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<string> => {
      const payload = { ...company };
      if (isRestrictedRole && user && !payload.assignedTo) {
        payload.assignedTo = user.id;
      }
      return await repo.save(payload);
    },
    [repo, isRestrictedRole, user]
  );

  const updateCompany = useCallback(
    async (id: string, updates: Partial<StoredCompany>): Promise<void> => {
      if (isRestrictedRole) {
        const existing = await repo.getById(id);
        if (!existing || !canAccessCompany(existing)) return;
      }
      await repo.update(id, updates);
    },
    [repo, isRestrictedRole, canAccessCompany]
  );

  const updateStage = useCallback(
    async (id: string, stage: PipelineStage): Promise<void> => {
      if (isRestrictedRole) {
        const existing = await repo.getById(id);
        if (!existing || !canAccessCompany(existing)) return;
      }
      await repo.updateStage(id, stage);
    },
    [repo, isRestrictedRole, canAccessCompany]
  );

  const deleteCompany = useCallback(
    async (id: string): Promise<void> => {
      if (isRestrictedRole) {
        const existing = await repo.getById(id);
        if (!existing || !canAccessCompany(existing)) return;
      }
      await repo.delete(id);
    },
    [repo, isRestrictedRole, canAccessCompany]
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
