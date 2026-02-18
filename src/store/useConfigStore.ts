import { create } from 'zustand';
import type { StoredCommissionTier, StoredResidualCurve } from '../db/schema';

interface ConfigState {
  commissionTiers: StoredCommissionTier[];
  residualCurves: StoredResidualCurve[];
  defaultValues: Record<string, string>;
  isLoaded: boolean;
  loadError: string | null;
  loadConfig: () => Promise<void>;
  refreshConfig: () => Promise<void>;
}

// Typed defaults — used by quote store and serialization
// Falls back to hardcoded values only when config hasn't loaded yet
export function getConfigDefaults(): {
  factoryROE: number;
  customerROE: number;
  interestRate: number;
  cpiRate: number;
  operatingHours: number;
  leaseTerm: number;
  telematicsCost: number;
  residualTruckPct: number;
} {
  const { defaultValues, isLoaded } = useConfigStore.getState();
  if (!isLoaded) {
    return {
      factoryROE: 19.20,
      customerROE: 20.60,
      interestRate: 9.5,
      cpiRate: 5.5,
      operatingHours: 180,
      leaseTerm: 60,
      telematicsCost: 250,
      residualTruckPct: 15,
    };
  }
  return {
    factoryROE: parseFloat(defaultValues.defaultFactoryROE || defaultValues.defaultROE || '19.20'),
    customerROE: parseFloat(defaultValues.defaultROE || '20.60'),
    interestRate: parseFloat(defaultValues.defaultInterestRate || '9.5'),
    cpiRate: parseFloat(defaultValues.defaultCPIRate || '5.5'),
    operatingHours: parseInt(defaultValues.defaultOperatingHours || '180', 10),
    leaseTerm: parseInt(defaultValues.defaultLeaseTerm || '60', 10),
    telematicsCost: parseFloat(defaultValues.defaultTelematicsCost || '250'),
    residualTruckPct: parseFloat(defaultValues.defaultResidualTruckPct || '15'),
  };
}

export const useConfigStore = create<ConfigState>((set) => ({
  commissionTiers: [],
  residualCurves: [],
  defaultValues: {},
  isLoaded: false,
  loadError: null,

  loadConfig: async () => {
    try {
      const { db } = await import('../db/schema');
      const [commissionTiers, residualCurves, settingsArray] = await Promise.all([
        db.commissionTiers.orderBy('minMargin').toArray(),
        db.residualCurves.toArray(),
        db.settings.toArray(),
      ]);

      const defaultValues = settingsArray.reduce(
        (acc, s) => ({ ...acc, [s.key]: s.value }),
        {} as Record<string, string>
      );

      set({ commissionTiers, residualCurves, defaultValues, isLoaded: true, loadError: null });
    } catch (error) {
      console.error('Error loading config:', error);
      set({
        isLoaded: false,
        loadError: error instanceof Error ? error.message : 'Failed to load configuration'
      });
    }
  },

  refreshConfig: async () => {
    await useConfigStore.getState().loadConfig();
  },
}));
