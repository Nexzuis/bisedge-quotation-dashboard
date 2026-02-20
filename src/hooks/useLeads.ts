import { useCallback } from 'react';
import { getLeadRepository, getCompanyRepository, getContactRepository } from '../db/repositories';
import type { StoredLead, PaginatedResult } from '../db/interfaces';
import type { LeadFilter, LeadPaginationOptions } from '../types/leads';
import { useAuth } from '../components/auth/AuthContext';

export function useLeads() {
  const repo = getLeadRepository();
  const companyRepo = getCompanyRepository();
  const contactRepo = getContactRepository();
  const { user } = useAuth();

  const listLeads = useCallback(
    async (options: LeadPaginationOptions, filters?: LeadFilter): Promise<PaginatedResult<StoredLead>> => {
      try {
        return await repo.list(options, filters);
      } catch (error) {
        console.error('Failed to list leads:', error);
        return { items: [], total: 0, page: options.page, pageSize: options.pageSize, totalPages: 0 };
      }
    },
    [repo]
  );

  const searchLeads = useCallback(
    async (query: string): Promise<StoredLead[]> => {
      try {
        return await repo.search(query);
      } catch (error) {
        console.error('Failed to search leads:', error);
        return [];
      }
    },
    [repo]
  );

  const getById = useCallback(
    async (id: string): Promise<StoredLead | null> => {
      try {
        return await repo.getById(id);
      } catch (error) {
        console.error('Failed to get lead:', error);
        return null;
      }
    },
    [repo]
  );

  const saveLead = useCallback(
    async (lead: Omit<StoredLead, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
      const payload = { ...lead };
      if (user && !payload.createdBy) {
        payload.createdBy = user.id;
      }
      return await repo.save(payload);
    },
    [repo, user]
  );

  const updateLead = useCallback(
    async (id: string, updates: Partial<StoredLead>): Promise<void> => {
      await repo.update(id, updates);
    },
    [repo]
  );

  const deleteLead = useCallback(
    async (id: string): Promise<void> => {
      await repo.delete(id);
    },
    [repo]
  );

  const bulkUpdateStatus = useCallback(
    async (ids: string[], status: StoredLead['qualificationStatus']): Promise<void> => {
      await repo.bulkUpdateStatus(ids, status);
    },
    [repo]
  );

  const qualifyLead = useCallback(
    async (id: string): Promise<void> => {
      const lead = await repo.getById(id);
      if (!lead) throw new Error('Lead not found');
      if (!lead.decisionMakerEmail || !lead.decisionMakerPhone) {
        throw new Error('Lead must have both decision maker email and phone to qualify');
      }
      await repo.update(id, {
        qualificationStatus: 'qualified',
        qualifiedBy: user?.id || '',
        qualifiedAt: new Date().toISOString(),
      });
    },
    [repo, user]
  );

  const rejectLead = useCallback(
    async (id: string, reason: string): Promise<void> => {
      await repo.update(id, {
        qualificationStatus: 'rejected',
        qualifiedBy: user?.id || '',
        qualifiedAt: new Date().toISOString(),
        rejectionReason: reason,
      });
    },
    [repo, user]
  );

  const convertLead = useCallback(
    async (lead: StoredLead): Promise<{ companyId: string; contactId: string }> => {
      // Create Company from lead data
      const companyId = await companyRepo.save({
        name: lead.companyName,
        tradingName: lead.tradingName,
        registrationNumber: '',
        vatNumber: '',
        industry: lead.industry,
        website: lead.website,
        address: lead.address ? [lead.address] : [],
        city: lead.city,
        province: lead.province,
        postalCode: '',
        country: lead.country,
        phone: lead.decisionMakerPhone,
        email: lead.decisionMakerEmail,
        pipelineStage: 'lead',
        assignedTo: lead.assignedTo || user?.id || '',
        estimatedValue: 0,
        creditLimit: 0,
        paymentTerms: 30,
        tags: lead.tags,
        notes: lead.notes,
      });

      // Split decision maker name into first/last
      const nameParts = (lead.decisionMakerName || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Create Contact from lead data
      const contactId = await contactRepo.save({
        companyId,
        firstName,
        lastName,
        title: lead.decisionMakerTitle,
        email: lead.decisionMakerEmail,
        phone: lead.decisionMakerPhone,
        isPrimary: true,
      });

      // Update lead with conversion info
      await repo.update(lead.id, {
        qualificationStatus: 'converted',
        convertedCompanyId: companyId,
        convertedContactId: contactId,
        convertedAt: new Date().toISOString(),
        convertedBy: user?.id || '',
      });

      return { companyId, contactId };
    },
    [repo, companyRepo, contactRepo, user]
  );

  return {
    listLeads,
    searchLeads,
    getById,
    saveLead,
    updateLead,
    deleteLead,
    bulkUpdateStatus,
    qualifyLead,
    rejectLead,
    convertLead,
  };
}
