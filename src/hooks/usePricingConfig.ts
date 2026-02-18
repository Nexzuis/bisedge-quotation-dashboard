import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import type { StoredCommissionTier, StoredResidualCurve } from '../db/schema';

/**
 * Hook to get commission tiers from database (live query)
 */
export const useCommissionTiers = () => {
  return useLiveQuery(() => db.commissionTiers.orderBy('minMargin').toArray(), []);
};

/**
 * Hook to get residual curves from database (live query)
 */
export const useResidualCurves = () => {
  return useLiveQuery(() => db.residualCurves.toArray(), []);
};

/**
 * Hook to get default values from settings table (live query)
 */
export const useDefaultValues = () => {
  return useLiveQuery(async () => {
    const settings = await db.settings.toArray();
    return settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);
  }, []);
};

/**
 * Save commission tiers to database
 */
export const saveCommissionTiers = async (tiers: StoredCommissionTier[], userId: string) => {
  await db.transaction('rw', db.commissionTiers, db.auditLog, async () => {
    await db.commissionTiers.clear();
    await db.commissionTiers.bulkAdd(tiers);

    await db.auditLog.add({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId,
      action: 'update',
      entityType: 'commissionTiers',
      entityId: 'all',
      changes: { tiers },
      oldValues: null,
      newValues: tiers,
    });
  });
};

/**
 * Save residual curves to database
 */
export const saveResidualCurves = async (curves: StoredResidualCurve[], userId: string) => {
  await db.transaction('rw', db.residualCurves, db.auditLog, async () => {
    await db.residualCurves.clear();
    await db.residualCurves.bulkAdd(curves);

    await db.auditLog.add({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId,
      action: 'update',
      entityType: 'residualCurves',
      entityId: 'all',
      changes: { curves },
      oldValues: null,
      newValues: curves,
    });
  });
};

/**
 * Save default values to settings table
 */
export const saveDefaultValues = async (values: Record<string, string>, userId: string) => {
  await db.transaction('rw', db.settings, db.auditLog, async () => {
    for (const [key, value] of Object.entries(values)) {
      await db.settings.put({ key, value });
    }

    await db.auditLog.add({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId,
      action: 'update',
      entityType: 'settings',
      entityId: 'defaults',
      changes: { values },
      oldValues: null,
      newValues: values,
    });
  });
};

/**
 * Get impact analysis for residual curve changes
 */
export const getResidualCurveImpact = async (chemistry: string): Promise<number> => {
  try {
    const allQuotes = await db.quotes.toArray();

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
    console.error('Error calculating residual curve impact:', error);
    return 0;
  }
};
