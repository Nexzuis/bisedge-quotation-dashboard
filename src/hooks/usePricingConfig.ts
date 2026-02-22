import { useState, useEffect } from 'react';
import { getDb } from '../db/DatabaseAdapter';
import type { StoredCommissionTier, StoredResidualCurve } from '../db/interfaces';
import { logger } from '../utils/logger';

export const useCommissionTiers = () => {
  const [tiers, setTiers] = useState<StoredCommissionTier[] | undefined>(undefined);
  useEffect(() => {
    getDb().getCommissionTiers().then(setTiers).catch(() => setTiers([]));
  }, []);
  return tiers;
};

export const useResidualCurves = () => {
  const [curves, setCurves] = useState<StoredResidualCurve[] | undefined>(undefined);
  useEffect(() => {
    getDb().getResidualCurves().then(setCurves).catch(() => setCurves([]));
  }, []);
  return curves;
};

export const useDefaultValues = () => {
  const [values, setValues] = useState<Record<string, string> | undefined>(undefined);
  useEffect(() => {
    getDb().getSettings().then(setValues).catch(() => setValues({}));
  }, []);
  return values;
};

export const saveCommissionTiers = async (tiers: StoredCommissionTier[], userId: string) => {
  const oldTiers = await getDb().getCommissionTiers().catch(() => null);
  await getDb().saveCommissionTiers(tiers);
  await getDb().logAudit({
    userId,
    action: 'update',
    entityType: 'commissionTiers',
    entityId: 'all',
    changes: { tiers },
    oldValues: oldTiers,
    newValues: tiers,
  });
};

export const saveResidualCurves = async (curves: StoredResidualCurve[], userId: string) => {
  const oldCurves = await getDb().getResidualCurves().catch(() => null);
  await getDb().saveResidualCurves(curves);
  await getDb().logAudit({
    userId,
    action: 'update',
    entityType: 'residualCurves',
    entityId: 'all',
    changes: { curves },
    oldValues: oldCurves,
    newValues: curves,
  });
};

export const saveDefaultValues = async (values: Record<string, string>, userId: string) => {
  const oldValues = await getDb().getSettings().catch(() => null);
  await getDb().saveSettings(Object.entries(values).map(([key, value]) => ({ key, value })));
  await getDb().logAudit({
    userId,
    action: 'update',
    entityType: 'settings',
    entityId: 'defaults',
    changes: { values },
    oldValues,
    newValues: values,
  });
};

export const getResidualCurveImpact = async (chemistry: string): Promise<number> => {
  try {
    const result = await getDb().listQuotes({ page: 1, pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' });
    const allQuotes = result.items;

    let count = 0;
    for (const quote of allQuotes) {
      try {
        const slots = typeof quote.slots === 'string' ? JSON.parse(quote.slots) : quote.slots;

        if (Array.isArray(slots)) {
          const hasChemistry = slots.some((s: any) => !s.isEmpty && s.batteryChemistry === chemistry);
          if (hasChemistry) {
            count++;
          }
        }
      } catch {
        // Skip quotes with invalid slot data
      }
    }

    return count;
  } catch (error) {
    logger.error('Error calculating residual curve impact:', { error });
    return 0;
  }
};
