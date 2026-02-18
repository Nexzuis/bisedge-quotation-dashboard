import { useCallback } from 'react';
import { db } from '../db/schema';
import type { PipelineStage, PipelineMetrics } from '../types/crm';

const ALL_STAGES: PipelineStage[] = [
  'lead',
  'contacted',
  'site-assessment',
  'quoted',
  'negotiation',
  'won',
  'lost',
];

function computeMetrics(
  companies: { pipelineStage: string; estimatedValue?: number; updatedAt: string; assignedTo?: string }[],
  startOfMonth: string,
): Omit<PipelineMetrics, 'quotesThisMonth'> {
  const countByStage = {} as Record<PipelineStage, number>;
  const valueByStage = {} as Record<PipelineStage, number>;

  for (const stage of ALL_STAGES) {
    countByStage[stage] = 0;
    valueByStage[stage] = 0;
  }

  let totalPipelineValue = 0;
  let activeLeads = 0;
  let wonThisMonth = 0;

  for (const company of companies) {
    const stage = company.pipelineStage as PipelineStage;
    countByStage[stage] = (countByStage[stage] || 0) + 1;
    valueByStage[stage] = (valueByStage[stage] || 0) + (company.estimatedValue || 0);

    if (stage !== 'won' && stage !== 'lost') {
      totalPipelineValue += company.estimatedValue || 0;
    }

    if (stage !== 'won' && stage !== 'lost') {
      activeLeads++;
    }

    if (stage === 'won' && company.updatedAt >= startOfMonth) {
      wonThisMonth++;
    }
  }

  return { totalPipelineValue, activeLeads, wonThisMonth, countByStage, valueByStage };
}

export function usePipelineMetrics() {
  const getMetrics = useCallback(async (userId?: string): Promise<PipelineMetrics> => {
    const allCompanies = await db.companies.toArray();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const companies = userId
      ? allCompanies.filter((c) => c.assignedTo === userId)
      : allCompanies;

    const base = computeMetrics(companies, startOfMonth);

    // Quotes created this month
    const quotesThisMonth = await db.quotes
      .filter((q) => q.createdAt >= startOfMonth)
      .count();

    return { ...base, quotesThisMonth };
  }, []);

  return { getMetrics };
}
