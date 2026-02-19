import type { ZAR } from '../types/quote';
import { getDb } from '../db/DatabaseAdapter';

export interface CommissionTier {
  minMargin: number;
  maxMargin: number;
  commissionPct: number;
  description: string;
}

/**
 * Calculate commission based on margin percentage
 * Commission is tiered - higher margins earn higher commission rates
 * Now fetches data from database instead of hardcoded JSON
 *
 * @param totalSales - Total sales amount
 * @param marginPct - Margin percentage (0-100)
 * @returns Commission amount
 */
export async function calcCommission(totalSales: ZAR, marginPct: number): Promise<ZAR> {
  try {
    const tiers = await getDb().getCommissionTiers();
    const tier = tiers.find(
      (t) => marginPct >= t.minMargin && marginPct < t.maxMargin
    );

    if (!tier) return 0;

    return totalSales * (tier.commissionRate / 100);
  } catch (error) {
    console.error('Error calculating commission:', error);
    return 0;
  }
}

/**
 * Synchronous version using cached data from store
 * Used when commission needs to be calculated in non-async context
 *
 * @param totalSales - Total sales amount
 * @param marginPct - Margin percentage
 * @param cachedTiers - Pre-loaded commission tiers from store
 * @returns Commission amount
 */
export function calcCommissionSync(
  totalSales: ZAR,
  marginPct: number,
  cachedTiers: Array<{ minMargin: number; maxMargin: number; commissionRate: number }>
): ZAR {
  const tier = cachedTiers.find(
    (t) => marginPct >= t.minMargin && marginPct < t.maxMargin
  );

  if (!tier) return 0;

  return totalSales * (tier.commissionRate / 100);
}

/**
 * Get commission tier for a given margin
 *
 * @param marginPct - Margin percentage
 * @returns Commission tier configuration
 */
export async function getCommissionTier(marginPct: number): Promise<CommissionTier | null> {
  try {
    const tiers = await getDb().getCommissionTiers();
    const tier = tiers.find(
      (t) => marginPct >= t.minMargin && marginPct < t.maxMargin
    );

    if (!tier) return null;

    return {
      minMargin: tier.minMargin,
      maxMargin: tier.maxMargin,
      commissionPct: tier.commissionRate,
      description: `${tier.minMargin}% - ${tier.maxMargin}% margin`,
    };
  } catch (error) {
    console.error('Error getting commission tier:', error);
    return null;
  }
}

/**
 * Get all commission tiers
 *
 * @returns Array of commission tier configurations
 */
export async function getAllCommissionTiers(): Promise<CommissionTier[]> {
  try {
    const tiers = await getDb().getCommissionTiers();
    return tiers.map((t) => ({
      minMargin: t.minMargin,
      maxMargin: t.maxMargin,
      commissionPct: t.commissionRate,
      description: `${t.minMargin}% - ${t.maxMargin}% margin`,
    }));
  } catch (error) {
    console.error('Error getting commission tiers:', error);
    return [];
  }
}
