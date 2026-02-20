import { useCallback } from 'react';
import { getLeadRepository } from '../db/repositories';
import type { LeadStats } from '../types/leads';

export function useLeadStats() {
  const repo = getLeadRepository();

  const getStats = useCallback(async (): Promise<LeadStats> => {
    try {
      return await repo.getStats();
    } catch (error) {
      console.error('Failed to get lead stats:', error);
      const allStatuses = ['new', 'reviewing', 'qualified', 'rejected', 'contacted', 'converted', 'stale'] as const;
      const byStatus = {} as Record<string, number>;
      allStatuses.forEach((s) => { byStatus[s] = 0; });
      const scoreDistribution: Record<number, number> = {};
      for (let i = 1; i <= 10; i++) scoreDistribution[i] = 0;
      return { total: 0, byStatus: byStatus as any, averageScore: 0, averageConfidence: 0, bySource: {}, byIndustry: {}, byProvince: {}, hotLeads: 0, scoreDistribution };
    }
  }, [repo]);

  return { getStats };
}
