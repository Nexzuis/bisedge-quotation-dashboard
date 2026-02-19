import { useState, useCallback } from 'react';
import { getDb } from '../db/DatabaseAdapter';
import type { StoredCompany, StoredActivity, StoredUser } from '../db/interfaces';
import type { PipelineStage, ActivityType } from '../types/crm';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FunnelStageData {
  stage: PipelineStage;
  label: string;
  count: number;
  value: number;
  pct: number; // percentage relative to max count across all stages
}

export interface MonthlyWinData {
  month: string; // e.g. "Jan", "Feb"
  year: number;
  wins: number;
}

export interface ConversionMetrics {
  leadToWonRate: number; // 0–100
  avgDaysInPipeline: number;
  monthlyWins: MonthlyWinData[];
  totalWon: number;
  totalCompanies: number;
}

export interface SalesRepRow {
  userId: string;
  fullName: string;
  role: string;
  totalAssigned: number;
  pipelineValue: number;
  wonCount: number;
  wonValue: number;
  activitiesThisMonth: number;
}

export interface ActivityTypeCount {
  type: ActivityType;
  label: string;
  count: number;
  pct: number; // percentage relative to max count
  color: string; // Tailwind bg class
}

export interface RevenueForecast {
  negotiationValue: number;
  quotedValue: number;
  weightedTotal: number;
  negotiationCount: number;
  quotedCount: number;
}

export interface ReportingData {
  funnel: FunnelStageData[];
  conversion: ConversionMetrics;
  salesReps: SalesRepRow[];
  activitySummary: ActivityTypeCount[];
  forecast: RevenueForecast;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_ORDER: PipelineStage[] = [
  'lead',
  'contacted',
  'site-assessment',
  'quoted',
  'negotiation',
  'won',
  'lost',
];

const STAGE_LABELS: Record<PipelineStage, string> = {
  lead: 'Lead',
  contacted: 'Contacted',
  'site-assessment': 'Site Assessment',
  quoted: 'Quoted',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

const ACTIVITY_TYPE_META: Record<ActivityType, { label: string; color: string }> = {
  note: { label: 'Notes', color: 'bg-surface-500' },
  call: { label: 'Calls', color: 'bg-blue-500' },
  email: { label: 'Emails', color: 'bg-purple-500' },
  meeting: { label: 'Meetings', color: 'bg-teal-500' },
  'site-visit': { label: 'Site Visits', color: 'bg-amber-500' },
  'quote-created': { label: 'Quotes Created', color: 'bg-brand-500' },
  'quote-sent': { label: 'Quotes Sent', color: 'bg-green-500' },
  'stage-change': { label: 'Stage Changes', color: 'bg-orange-500' },
};

const SALES_ROLES = new Set(['sales_rep', 'key_account']);

// Weighted probability per stage for revenue forecast
const STAGE_PROBABILITY: Partial<Record<PipelineStage, number>> = {
  negotiation: 0.6,
  quoted: 0.4,
};

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Helper utilities ─────────────────────────────────────────────────────────

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
}

function computeFunnel(companies: StoredCompany[]): FunnelStageData[] {
  const countByStage: Record<string, number> = {};
  const valueByStage: Record<string, number> = {};

  for (const stage of STAGE_ORDER) {
    countByStage[stage] = 0;
    valueByStage[stage] = 0;
  }

  for (const c of companies) {
    const s = c.pipelineStage as PipelineStage;
    countByStage[s] = (countByStage[s] ?? 0) + 1;
    valueByStage[s] = (valueByStage[s] ?? 0) + (c.estimatedValue ?? 0);
  }

  const maxCount = Math.max(1, ...STAGE_ORDER.map((s) => countByStage[s] ?? 0));

  return STAGE_ORDER.map((stage) => {
    const count = countByStage[stage] ?? 0;
    return {
      stage,
      label: STAGE_LABELS[stage],
      count,
      value: valueByStage[stage] ?? 0,
      pct: (count / maxCount) * 100,
    };
  });
}

function computeConversion(companies: StoredCompany[]): ConversionMetrics {
  const total = companies.length;
  const wonCompanies = companies.filter((c) => c.pipelineStage === 'won');
  const totalWon = wonCompanies.length;

  const leadToWonRate = total > 0 ? (totalWon / total) * 100 : 0;

  // Average days from createdAt → updatedAt for won companies
  let sumDays = 0;
  let validCount = 0;
  for (const c of wonCompanies) {
    const created = Date.parse(c.createdAt);
    const updated = Date.parse(c.updatedAt);
    if (!isNaN(created) && !isNaN(updated) && updated > created) {
      sumDays += (updated - created) / (1000 * 60 * 60 * 24);
      validCount++;
    }
  }
  const avgDaysInPipeline = validCount > 0 ? Math.round(sumDays / validCount) : 0;

  // Last 6 months win trend — initialise all 6 buckets
  const now = new Date();
  const monthlyWins: MonthlyWinData[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyWins.push({
      month: MONTH_SHORT[d.getMonth()],
      year: d.getFullYear(),
      wins: 0,
    });
  }

  // Map key → index for quick lookup
  const keyToIndex: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keyToIndex[monthKey(d)] = 5 - i;
  }

  for (const c of wonCompanies) {
    const updatedDate = new Date(c.updatedAt);
    const key = monthKey(updatedDate);
    const idx = keyToIndex[key];
    if (idx !== undefined) {
      monthlyWins[idx].wins++;
    }
  }

  return { leadToWonRate, avgDaysInPipeline, monthlyWins, totalWon, totalCompanies: total };
}

function computeSalesReps(
  companies: StoredCompany[],
  activities: StoredActivity[],
  users: StoredUser[]
): SalesRepRow[] {
  const salesUsers = users.filter((u) => SALES_ROLES.has(u.role) && u.isActive);

  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();

  // Pre-group activities by createdBy and filter to this month
  const activitiesThisMonthByUser: Record<string, number> = {};
  for (const a of activities) {
    if (a.createdAt >= monthStart && a.createdBy) {
      activitiesThisMonthByUser[a.createdBy] = (activitiesThisMonthByUser[a.createdBy] ?? 0) + 1;
    }
  }

  return salesUsers.map((u): SalesRepRow => {
    const userId = u.id ?? '';
    const assigned = companies.filter((c) => c.assignedTo === userId);
    const won = assigned.filter((c) => c.pipelineStage === 'won');
    const active = assigned.filter((c) => c.pipelineStage !== 'won' && c.pipelineStage !== 'lost');

    return {
      userId,
      fullName: u.fullName || u.username,
      role: u.role,
      totalAssigned: assigned.length,
      pipelineValue: active.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0),
      wonCount: won.length,
      wonValue: won.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0),
      activitiesThisMonth: activitiesThisMonthByUser[userId] ?? 0,
    };
  });
}

function computeActivitySummary(activities: StoredActivity[]): ActivityTypeCount[] {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const recent = activities.filter((a) => a.createdAt >= thirtyDaysAgo);

  const countByType: Partial<Record<ActivityType, number>> = {};
  for (const a of recent) {
    const t = a.type as ActivityType;
    countByType[t] = (countByType[t] ?? 0) + 1;
  }

  const allTypes = Object.keys(ACTIVITY_TYPE_META) as ActivityType[];
  const counts = allTypes.map((t) => countByType[t] ?? 0);
  const maxCount = Math.max(1, ...counts);

  return allTypes.map((type): ActivityTypeCount => {
    const count = countByType[type] ?? 0;
    return {
      type,
      label: ACTIVITY_TYPE_META[type].label,
      count,
      pct: (count / maxCount) * 100,
      color: ACTIVITY_TYPE_META[type].color,
    };
  });
}

function computeForecast(companies: StoredCompany[]): RevenueForecast {
  const negotiation = companies.filter((c) => c.pipelineStage === 'negotiation');
  const quoted = companies.filter((c) => c.pipelineStage === 'quoted');

  const negotiationValue = negotiation.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0);
  const quotedValue = quoted.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0);

  const prob = STAGE_PROBABILITY;
  const weightedTotal =
    negotiationValue * (prob.negotiation ?? 0.6) + quotedValue * (prob.quoted ?? 0.4);

  return {
    negotiationValue,
    quotedValue,
    weightedTotal,
    negotiationCount: negotiation.length,
    quotedCount: quoted.length,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseReportingDataResult {
  data: ReportingData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useReportingData(): UseReportingDataResult {
  const [data, setData] = useState<ReportingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const [companies, activities, users] = await Promise.all([
        getDb().listCompanies(),
        getDb().listAllActivities(),
        getDb().listUsers(),
      ]);

      const funnel = computeFunnel(companies);
      const conversion = computeConversion(companies);
      const salesReps = computeSalesReps(companies, activities, users as unknown as StoredUser[]);
      const activitySummary = computeActivitySummary(activities);
      const forecast = computeForecast(companies);

      setData({ funnel, conversion, salesReps, activitySummary, forecast });
    } catch (err) {
      console.error('[useReportingData] Failed to compute metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reporting data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount using a one-time effect handled by the page component
  // which calls refresh() inside its own useEffect. This keeps the hook
  // dependency-free and composable.

  return { data, loading, error, refresh };
}
