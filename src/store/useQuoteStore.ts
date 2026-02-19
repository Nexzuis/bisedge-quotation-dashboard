import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  QuoteState,
  UnitSlot,
  SlotIndex,
  BatteryChemistry,
  LeaseTermMonths,
  QuoteType,
  SlotPricing,
  QuoteTotals,
  ClearingCharges,
  LocalCosts,
  ShippingEntry,
} from '../types/quote';
import {
  calcMargin,
  calcLeaseRate,
  calcCostPerHour,
  calcTotalContractValue,
  irr,
  npv,
  generateCashFlows,
  sumClearingCharges,
  sumLocalCosts,
} from '../engine/calculationEngine';
import { calcCommissionSync } from '../engine/commissionEngine';
import clearingChargeDefaults from '../data/clearingChargeDefaults.json';
import { logger } from '../utils/logger';
import { getDb } from '../db/DatabaseAdapter';
import { useConfigStore, getConfigDefaults } from './useConfigStore';

const LOCK_STALE_MS = 60 * 60 * 1000; // 1 hour

// Default clearing charges from EU1 — uses config ROE for EUR→ZAR conversion
function getDefaultClearing(): ClearingCharges {
  const { factoryROE } = getConfigDefaults();
  return {
    inlandFreight: clearingChargeDefaults.clearingCharges.inlandFreightEUR * factoryROE,
    seaFreight: clearingChargeDefaults.clearingCharges.seaFreightEUR * factoryROE,
    portCharges: clearingChargeDefaults.clearingCharges.portChargesZAR,
    transport: clearingChargeDefaults.clearingCharges.transportZAR,
    destuffing: clearingChargeDefaults.clearingCharges.destuffingZAR,
    duties: 0,
    warranty: 0,
  };
}

const DEFAULT_LOCAL_COSTS: LocalCosts = {
  assembly: clearingChargeDefaults.localCosts.assemblyZAR,
  loadTest: clearingChargeDefaults.localCosts.loadTestZAR,
  delivery: clearingChargeDefaults.localCosts.deliveryZAR,
  pdi: clearingChargeDefaults.localCosts.pdiZAR,
  extras: 0,
};

// Create empty slot helper — reads defaults from config store
function createEmptySlot(index: SlotIndex): UnitSlot {
  const cfg = getConfigDefaults();
  return {
    slotIndex: index,
    isEmpty: true,

    // Series / Model
    seriesCode: '',
    modelCode: '0',
    modelName: '',
    modelDescription: '',
    modelMaterialNumber: '',
    indxColumn: 0,
    eurCost: 0,
    discountPct: cfg.discountPct,
    quantity: 1,
    operatingHoursPerMonth: cfg.operatingHours,
    leaseTermMonths: cfg.leaseTerm as LeaseTermMonths,

    // Configuration
    configuration: {},
    configurationCost: 0,
    configurationSummary: [],
    isConfigured: true,

    // Battery (local, manual)
    batteryCompartmentOption: '',
    localBatteryCostZAR: 0,
    localBatteryDescription: '',

    // Telematics
    telematicsPackageId: '',
    telematicsPackageCostZAR: 0,

    // Local costs
    localAttachmentCostZAR: 0,
    localTelematicsCostZAR: 0,

    // Attachments (factory)
    attachments: [],
    attachmentsCost: 0,

    // Clearing Charges (defaults from EU1)
    clearingCharges: getDefaultClearing(),

    // Local Costs (defaults from EU1)
    localCosts: { ...DEFAULT_LOCAL_COSTS },

    // Commercial Fields
    markupPct: 0,
    residualValueTruckPct: cfg.residualTruckPct,
    residualValueBatteryPct: 0,
    residualValueAttachmentPct: 0,
    financeCostPct: cfg.interestRate,
    maintenanceRateTruckPerHr: 0,
    maintenanceRateTiresPerHr: 0,
    maintenanceRateAttachmentPerHr: 0,
    telematicsSubscriptionCostPerMonth: 0,
    telematicsSubscriptionSellingPerMonth: 0,
    operatorPricePerMonth: 0,

    // Container dimensions
    containerLength: 0,
    containerWidth: 0,
    containerHeight: 0,
    containerWeight: 0,

    // Deprecated (kept for migration)
    batteryId: '',
    batteryChemistry: null,
    batteryName: '',
    batteryCost: 0,
    maintenanceCostPerMonth: 0,
    fleetMgmtCostPerMonth: 0,
    telematicsCostPerMonth: cfg.telematicsCost,
    mastType: '',
    selectedVariant: '',
  };
}

function createDefaultShippingEntry(): ShippingEntry {
  return {
    id: crypto.randomUUID(),
    description: '',
    containerType: "40' standard",
    quantity: 1,
    costZAR: 0,
  };
}

// Helper to calculate attachment costs from database
export async function calculateAttachmentCost(attachmentIds: string[]): Promise<number> {
  if (!attachmentIds || attachmentIds.length === 0) return 0;

  try {
    const attachments = await getDb().getAttachmentsByIds(attachmentIds);

    return attachments.reduce((sum, att) => sum + att.eurCost, 0);
  } catch (error) {
    logger.error('Error calculating attachment cost:', error);
    return 0;
  }
}

type CustomerField = 'clientName' | 'contactName' | 'contactTitle' | 'contactEmail' | 'contactPhone' | 'clientAddress' | 'companyId';
type CommercialField = 'markupPct' | 'residualValueTruckPct' | 'residualValueBatteryPct' | 'residualValueAttachmentPct' | 'financeCostPct' | 'maintenanceRateTruckPerHr' | 'maintenanceRateTiresPerHr' | 'maintenanceRateAttachmentPerHr' | 'telematicsSubscriptionCostPerMonth' | 'telematicsSubscriptionSellingPerMonth' | 'operatorPricePerMonth';

interface QuoteStore extends QuoteState {
  // Actions - Customer
  setCustomerField: (field: CustomerField, value: QuoteState[CustomerField]) => void;
  setCustomerInfo: (info: Partial<QuoteState>) => void;

  // Actions - Pricing
  setFactoryROE: (roe: number) => void;
  setCustomerROE: (roe: number) => void;
  setDiscount: (pct: number) => void;
  setInterestRate: (rate: number) => void;

  // Actions - Terms
  setDefaultLeaseTermMonths: (months: LeaseTermMonths) => void;
  setBatteryChemistryLock: (chemistry: BatteryChemistry | null) => void;
  setQuoteType: (type: QuoteType) => void;

  // Actions - Slots (generic)
  updateSlot: (slotId: SlotIndex, updates: Partial<UnitSlot>) => void;
  clearSlot: (slotId: SlotIndex) => void;
  clearAllSlots: () => void;

  // Actions - New Fleet Builder flow
  selectSeries: (slotIndex: SlotIndex, seriesCode: string) => void;
  selectModel: (slotIndex: SlotIndex, materialNumber: string, modelName: string, baseEurCost: number, indxColumn: number) => void;
  toggleOption: (slotIndex: SlotIndex, specCode: string, materialNumber: string) => void;
  setLocalBatteryCost: (slotIndex: SlotIndex, cost: number, description: string) => void;
  selectTelematicsPackage: (slotIndex: SlotIndex, packageId: string, costZAR: number) => void;
  setClearingCharge: (slotIndex: SlotIndex, field: keyof ClearingCharges, value: number) => void;
  setLocalCost: (slotIndex: SlotIndex, field: keyof LocalCosts, value: number) => void;
  setCommercialField: (slotIndex: SlotIndex, field: CommercialField, value: number) => void;
  setManualContainerCost: (slotIndex: SlotIndex, cost: number) => void;
  addShippingEntry: () => void;
  updateShippingEntry: (id: string, updates: Partial<ShippingEntry>) => void;
  removeShippingEntry: (id: string) => void;

  // Actions - Configuration (legacy compat)
  setConfiguration: (
    slotIndex: SlotIndex,
    config: {
      variant: string;
      selections: Record<string, string>;
      cost: number;
      summary: string[];
    }
  ) => void;
  clearConfiguration: (slotIndex: SlotIndex) => void;
  validateAllConfigured: () => boolean;

  // Actions - Approval
  setApprovalStatus: (status: QuoteState['approvalStatus']) => void;
  setApprovalNotes: (notes: string) => void;
  setOverrideIRR: (override: boolean) => void;
  submitForApproval: (submittedBy: string) => void;
  approveQuote: (approvedBy: string) => void;
  rejectQuote: (reason: string) => void;

  // Actions - Ownership & Locking
  setCreatedBy: (userId: string) => void;
  assignTo: (userId: string | null) => void;
  acquireLock: (userId: string) => boolean;
  releaseLock: (userId: string) => void;
  isLockedByOther: (currentUserId: string) => boolean;
  canEdit: (userId: string) => boolean;

  // Computed Getters (derived state)
  getSlotPricing: (slotId: SlotIndex) => SlotPricing | null;
  getQuoteTotals: () => QuoteTotals;
  getActiveSlots: () => UnitSlot[];

  // Actions - Status Transitions
  markAsSentToCustomer: () => void;
  markAsExpired: () => void;

  // Actions - Validity
  setValidityDays: (days: number) => void;

  // Actions - Reset
  resetQuote: () => void;
  resetAll: () => void;
  setQuoteRef: (quoteRef: string) => void;
  setVersion: (version: number) => void;
  loadQuote: (quote: QuoteState) => void;
}

// Initial state factory — reads defaults from config store
function createInitialState(): QuoteState {
  const cfg = getConfigDefaults();
  return {
    id: crypto.randomUUID(),
    quoteRef: '0000.0',
    quoteDate: new Date(),
    status: 'draft',
    clientName: '',
    contactName: '',
    contactTitle: '',
    contactEmail: '',
    contactPhone: '',
    clientAddress: ['', '', '', ''],
    factoryROE: cfg.factoryROE,
    customerROE: cfg.customerROE,
    discountPct: cfg.discountPct,
    annualInterestRate: cfg.interestRate,
    defaultLeaseTermMonths: cfg.leaseTerm as LeaseTermMonths,
    batteryChemistryLock: null,
    quoteType: 'rental',
    slots: [
      createEmptySlot(0),
      createEmptySlot(1),
      createEmptySlot(2),
      createEmptySlot(3),
      createEmptySlot(4),
      createEmptySlot(5),
    ],
    shippingEntries: [createDefaultShippingEntry()],
    approvalTier: 1,
    approvalStatus: 'draft',
    approvalNotes: '',
    overrideIRR: false,
    submittedBy: '',
    submittedAt: null,
    approvedBy: '',
    approvedAt: null,
    currentAssigneeId: null,
    currentAssigneeRole: null,
    approvalChain: [],
    createdBy: '',
    assignedTo: null,
    lockedBy: null,
    lockedAt: null,
    companyId: undefined,
    validityDays: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };
}

export const useQuoteStore = create<QuoteStore>()(
  immer((set, get) => ({
    ...createInitialState(),

    // Customer Actions
    setCustomerField: (field: CustomerField, value) =>
      set((state) => {
        (state[field] as typeof value) = value;
        state.updatedAt = new Date();
      }),

    setCustomerInfo: (info) =>
      set((state) => {
        Object.assign(state, info);
        state.updatedAt = new Date();
      }),

    // Pricing Actions
    setFactoryROE: (roe) =>
      set((state) => {
        if (!isFinite(roe) || roe <= 0) return;
        state.factoryROE = roe;
        state.updatedAt = new Date();
      }),

    setCustomerROE: (roe) =>
      set((state) => {
        if (!isFinite(roe) || roe <= 0) return;
        state.customerROE = roe;
        state.updatedAt = new Date();
      }),

    setDiscount: (pct) =>
      set((state) => {
        if (!isFinite(pct)) return;
        state.discountPct = Math.max(0, Math.min(100, pct));
        state.updatedAt = new Date();
      }),

    setInterestRate: (rate) =>
      set((state) => {
        if (!isFinite(rate) || rate < 0 || rate > 100) return;
        state.annualInterestRate = rate;
        state.updatedAt = new Date();
      }),

    // Terms Actions
    setDefaultLeaseTermMonths: (months) =>
      set((state) => {
        state.defaultLeaseTermMonths = months;
        state.updatedAt = new Date();
      }),

    setBatteryChemistryLock: (chemistry) =>
      set((state) => {
        if (state.batteryChemistryLock !== chemistry) {
          const hasAssignedBatteries = state.slots.some((s) => s.batteryId !== '');
          if (hasAssignedBatteries && chemistry !== state.batteryChemistryLock) {
            state.slots.forEach((slot) => {
              slot.batteryId = '';
              slot.batteryChemistry = null;
              slot.batteryName = '';
              slot.batteryCost = 0;
            });
          }
          state.batteryChemistryLock = chemistry;
        }
        state.updatedAt = new Date();
      }),

    setQuoteType: (type) =>
      set((state) => {
        state.quoteType = type;
        state.updatedAt = new Date();
      }),

    // Slot Actions
    updateSlot: (slotId, updates) =>
      set((state) => {
        const slot = state.slots[slotId];

        if (updates.quantity !== undefined) {
          updates.quantity = Math.max(1, Math.min(99, Math.round(updates.quantity)));
        }
        if (updates.operatingHoursPerMonth !== undefined) {
          updates.operatingHoursPerMonth = Math.max(0, Math.min(720, updates.operatingHoursPerMonth));
        }

        Object.assign(slot, updates);

        if (updates.modelCode && updates.modelCode !== '0') {
          slot.isEmpty = false;
        }
        if (updates.modelCode === '0') {
          slot.isEmpty = true;
        }

        state.updatedAt = new Date();
      }),

    clearSlot: (slotId) =>
      set((state) => {
        state.slots[slotId] = createEmptySlot(slotId);
        state.updatedAt = new Date();
      }),

    clearAllSlots: () =>
      set((state) => {
        state.slots = [
          createEmptySlot(0),
          createEmptySlot(1),
          createEmptySlot(2),
          createEmptySlot(3),
          createEmptySlot(4),
          createEmptySlot(5),
        ];
        state.batteryChemistryLock = null;
        state.updatedAt = new Date();
      }),

    // --- New Fleet Builder Actions ---

    selectSeries: (slotIndex, seriesCode) =>
      set((state) => {
        const slot = state.slots[slotIndex];
        slot.seriesCode = seriesCode;
        // Reset model/config when series changes
        slot.modelCode = '0';
        slot.modelName = '';
        slot.modelDescription = '';
        slot.modelMaterialNumber = '';
        slot.indxColumn = 0;
        slot.eurCost = 0;
        slot.isEmpty = !seriesCode;
        slot.configuration = {};
        slot.configurationCost = 0;
        slot.configurationSummary = [];
        state.updatedAt = new Date();
      }),

    selectModel: (slotIndex, materialNumber, modelName, baseEurCost, indxColumn) =>
      set((state) => {
        const slot = state.slots[slotIndex];
        slot.modelMaterialNumber = materialNumber;
        slot.modelCode = modelName; // Use modelName as modelCode for compat
        slot.modelName = modelName;
        slot.eurCost = baseEurCost;
        slot.indxColumn = indxColumn;
        slot.isEmpty = false;
        slot.isConfigured = true;
        // Reset configuration when model changes (standard options will be auto-set by UI)
        slot.configuration = {};
        slot.configurationCost = 0;
        slot.configurationSummary = [];
        state.updatedAt = new Date();
      }),

    toggleOption: (slotIndex, specCode, materialNumber) =>
      set((state) => {
        const slot = state.slots[slotIndex];
        const currentConfig = slot.configuration || {};

        if (currentConfig[specCode] === materialNumber) {
          // Deselect
          delete currentConfig[specCode];
        } else {
          // Select (replaces any previous selection for this spec)
          currentConfig[specCode] = materialNumber;
        }

        slot.configuration = { ...currentConfig };
        state.updatedAt = new Date();
      }),

    setLocalBatteryCost: (slotIndex, cost, description) =>
      set((state) => {
        const slot = state.slots[slotIndex];
        slot.localBatteryCostZAR = Math.max(0, cost);
        slot.localBatteryDescription = description;
        state.updatedAt = new Date();
      }),

    selectTelematicsPackage: (slotIndex, packageId, costZAR) =>
      set((state) => {
        const slot = state.slots[slotIndex];
        slot.telematicsPackageId = packageId;
        slot.telematicsPackageCostZAR = costZAR;
        state.updatedAt = new Date();
      }),

    setClearingCharge: (slotIndex, field, value) =>
      set((state) => {
        const slot = state.slots[slotIndex];
        slot.clearingCharges[field] = Math.max(0, value);
        state.updatedAt = new Date();
      }),

    setLocalCost: (slotIndex, field, value) =>
      set((state) => {
        const slot = state.slots[slotIndex];
        slot.localCosts[field] = Math.max(0, value);
        state.updatedAt = new Date();
      }),

    setCommercialField: (slotIndex, field: CommercialField, value) =>
      set((state) => {
        const slot = state.slots[slotIndex];
        slot[field] = value;
        state.updatedAt = new Date();
      }),

    setManualContainerCost: (_slotIndex, _cost) => {
      logger.warn('setManualContainerCost is not implemented - container cost is managed at quote level in LogisticsPanel');
    },

    addShippingEntry: () =>
      set((state) => {
        state.shippingEntries.push(createDefaultShippingEntry());
        state.updatedAt = new Date();
      }),

    updateShippingEntry: (id, updates) =>
      set((state) => {
        const entry = state.shippingEntries.find((line) => line.id === id);
        if (!entry) return;

        Object.assign(entry, updates);
        if (!isFinite(entry.quantity) || entry.quantity < 1) {
          entry.quantity = 1;
        }
        if (!isFinite(entry.costZAR) || entry.costZAR < 0) {
          entry.costZAR = 0;
        }
        state.updatedAt = new Date();
      }),

    removeShippingEntry: (id) =>
      set((state) => {
        if (state.shippingEntries.length <= 1) return;
        state.shippingEntries = state.shippingEntries.filter((line) => line.id !== id);
        state.updatedAt = new Date();
      }),

    // Configuration Actions (legacy compat)
    setConfiguration: (slotIndex, config) =>
      set((state) => {
        const slot = state.slots[slotIndex];
        slot.selectedVariant = config.variant;
        slot.configuration = config.selections;
        slot.configurationCost = config.cost;
        slot.configurationSummary = config.summary;
        slot.isConfigured = true;
        state.updatedAt = new Date();
      }),

    clearConfiguration: (slotIndex) =>
      set((state) => {
        const slot = state.slots[slotIndex];
        slot.selectedVariant = '';
        slot.configuration = {};
        slot.configurationCost = 0;
        slot.configurationSummary = [];
        slot.isConfigured = false;
        state.updatedAt = new Date();
      }),

    validateAllConfigured: () => {
      const state = get();
      const activeSlots = state.slots.filter((s) => !s.isEmpty && s.modelCode !== '0');
      return activeSlots.every((slot) => slot.isConfigured);
    },

    // Approval Actions
    setApprovalStatus: (status) =>
      set((state) => {
        state.approvalStatus = status;
        state.updatedAt = new Date();
      }),

    setApprovalNotes: (notes) =>
      set((state) => {
        state.approvalNotes = notes;
        state.updatedAt = new Date();
      }),

    setOverrideIRR: (override) =>
      set((state) => {
        state.overrideIRR = override;
        state.updatedAt = new Date();
      }),

    submitForApproval: (submittedBy) =>
      set((state) => {
        state.approvalStatus = 'pending-approval';
        state.submittedBy = submittedBy;
        state.submittedAt = new Date();
        state.updatedAt = new Date();
      }),

    approveQuote: (approvedBy) =>
      set((state) => {
        state.approvalStatus = 'approved';
        state.status = 'approved';
        state.approvedBy = approvedBy;
        state.approvedAt = new Date();
        state.updatedAt = new Date();
      }),

    rejectQuote: (reason) =>
      set((state) => {
        state.approvalStatus = 'rejected';
        state.status = 'rejected';
        state.approvalNotes = reason;
        state.updatedAt = new Date();
      }),

    // Computed Getters
    getSlotPricing: (slotId) => {
      const state = get();
      const slot = state.slots[slotId];

      if (slot.isEmpty || slot.modelCode === '0') {
        return null;
      }

      // 1. Factory cost in EUR = base EUR + configuration options
      const grossEUR = slot.eurCost + (slot.configurationCost || 0) + (slot.attachmentsCost || 0);

      // 2. Apply discount (EU1 Column I) to get nett EUR
      const discountMultiplier = (100 - (slot.discountPct || 0)) / 100;
      const factoryCostEUR = grossEUR * discountMultiplier;

      // 3. Factory cost in ZAR = nett EUR × factoryROE
      const factoryCostZAR = factoryCostEUR * state.factoryROE;

      // 3. Clearing charges total
      const clearingTotal = sumClearingCharges(slot.clearingCharges);

      // 4. Local costs total
      const localCostsTotal = sumLocalCosts(slot.localCosts);

      // 5. Landed cost = factory ZAR + clearing + local + battery + attachments + telematics
      const landedCostZAR =
        factoryCostZAR +
        clearingTotal +
        localCostsTotal +
        slot.localBatteryCostZAR +
        slot.localAttachmentCostZAR +
        slot.localTelematicsCostZAR;

      // 6. Selling price = landed cost × (1 + markup%)
      const sellingPriceZAR = landedCostZAR * (1 + slot.markupPct / 100);

      // 7. Margin (landed-cost basis for go-live financial correctness)
      const margin = calcMargin(sellingPriceZAR, landedCostZAR);

      // 8. Residual value using per-slot residual percentages
      const residualValue = sellingPriceZAR * (slot.residualValueTruckPct / 100);

      // 9. Lease rate using per-slot finance cost %
      const leaseRate = calcLeaseRate(
        sellingPriceZAR,
        slot.financeCostPct,
        slot.leaseTermMonths,
        residualValue
      );

      // 10. Maintenance = (truck + tires + attachment) × operating hours
      const maintenanceMonthly =
        (slot.maintenanceRateTruckPerHr + slot.maintenanceRateTiresPerHr + slot.maintenanceRateAttachmentPerHr) *
        slot.operatingHoursPerMonth;

      // 11. Total monthly = lease + maintenance + telematics selling + operator
      const totalMonthly =
        leaseRate +
        maintenanceMonthly +
        slot.telematicsSubscriptionSellingPerMonth +
        slot.operatorPricePerMonth;

      // 12. Cost per hour
      const costPerHour = calcCostPerHour(totalMonthly, slot.operatingHoursPerMonth);

      // 13. Total contract value
      const totalContractValue = calcTotalContractValue(
        totalMonthly,
        slot.leaseTermMonths,
        slot.quantity
      );

      return {
        factoryCostEUR,
        factoryCostZAR,
        landedCostZAR,
        sellingPriceZAR,
        margin,
        residualValue,
        leaseRate,
        maintenanceMonthly,
        totalMonthly,
        costPerHour,
        totalContractValue,
        // Backward compat aliases
        salesPrice: sellingPriceZAR,
        factoryCost: factoryCostZAR,
      };
    },

    getQuoteTotals: () => {
      const state = get();
      const activeSlots = state.slots.filter((s) => !s.isEmpty && s.modelCode !== '0');

      if (activeSlots.length === 0) {
        return {
          totalSalesPrice: 0,
          totalFactoryCost: 0,
          averageMargin: 0,
          totalLeaseRate: 0,
          totalMonthly: 0,
          totalContractValue: 0,
          irr: null,
          npv: 0,
          commission: 0,
          unitCount: 0,
          calculatedApprovalTier: undefined,
        };
      }

      let totalSalesPrice = 0;
      let totalFactoryCost = 0;
      let totalLandedCost = 0;
      let totalLeaseRate = 0;
      let totalMonthly = 0;
      let totalContractValue = 0;
      let weightedMargin = 0;
      let totalMonthlyCosts = 0;
      let totalResidualValue = 0;

      activeSlots.forEach((slot) => {
        const pricing = get().getSlotPricing(slot.slotIndex);
        if (pricing) {
          totalSalesPrice += pricing.salesPrice * slot.quantity;
          totalFactoryCost += pricing.factoryCost * slot.quantity;
          totalLandedCost += pricing.landedCostZAR * slot.quantity;
          totalLeaseRate += pricing.leaseRate * slot.quantity;
          totalMonthly += pricing.totalMonthly * slot.quantity;
          totalContractValue += pricing.totalContractValue;
          weightedMargin += pricing.margin * pricing.salesPrice * slot.quantity;
          totalMonthlyCosts += pricing.maintenanceMonthly * slot.quantity;
          totalResidualValue += pricing.residualValue * slot.quantity;
        }
      });

      const averageMargin = totalSalesPrice > 0 ? weightedMargin / totalSalesPrice : 0;

      const avgTerm = Math.round(
        activeSlots.reduce((sum, s) => sum + s.leaseTermMonths, 0) / activeSlots.length
      );

      const cashFlows = generateCashFlows(
        totalLandedCost,
        totalLeaseRate,
        totalMonthlyCosts,
        avgTerm,
        totalResidualValue
      );

      const calculatedIRR = irr(cashFlows);
      const monthlyRate = state.annualInterestRate / 12 / 100;
      const calculatedNPV = npv(monthlyRate, cashFlows);

      const configStore = useConfigStore.getState();
      const commission = configStore.isLoaded
        ? calcCommissionSync(totalSalesPrice, averageMargin, configStore.commissionTiers)
        : 0;

      return {
        totalSalesPrice,
        totalFactoryCost,
        averageMargin,
        totalLeaseRate,
        totalMonthly,
        totalContractValue,
        irr: calculatedIRR,
        npv: calculatedNPV,
        commission,
        unitCount: activeSlots.reduce((sum, s) => sum + s.quantity, 0),
        calculatedApprovalTier: undefined,
      };
    },

    getActiveSlots: () => {
      const state = get();
      return state.slots.filter((s) => !s.isEmpty && s.modelCode !== '0');
    },

    // Ownership & Locking Actions
    setCreatedBy: (userId) =>
      set((state) => {
        state.createdBy = userId;
        state.updatedAt = new Date();
      }),

    assignTo: (userId) =>
      set((state) => {
        state.assignedTo = userId;
        state.updatedAt = new Date();
      }),

    acquireLock: (userId) => {
      const state = get();
      if (state.lockedBy && state.lockedBy !== userId) {
        logger.warn(`Quote is locked by user ${state.lockedBy}`);
        return false;
      }
      set((draft) => {
        draft.lockedBy = userId;
        draft.lockedAt = new Date();
        draft.updatedAt = new Date();
      });
      return true;
    },

    releaseLock: (userId) =>
      set((state) => {
        if (state.lockedBy === userId) {
          state.lockedBy = null;
          state.lockedAt = null;
          state.updatedAt = new Date();
        }
      }),

    isLockedByOther: (currentUserId) => {
      const state = get();
      if (!state.lockedBy || state.lockedBy === currentUserId) return false;
      if (state.lockedAt) {
        const lockAge = Date.now() - new Date(state.lockedAt).getTime();
        if (lockAge > LOCK_STALE_MS) return false;
      }
      return true;
    },

    canEdit: (userId) => {
      const state = get();
      const notLocked = !state.lockedBy || state.lockedBy === userId;
      const isOwner = state.createdBy === userId;
      const isAssignee = state.assignedTo === userId;
      const isCurrentApprover = state.currentAssigneeId === userId;

      if (state.status === 'draft') {
        return (isOwner || isAssignee) && notLocked;
      }
      if (state.status === 'in-review' && isCurrentApprover) {
        return notLocked;
      }
      if (state.status === 'changes-requested' && isOwner) {
        return notLocked;
      }
      return false;
    },

    // Status Transition Actions
    markAsSentToCustomer: () =>
      set((state) => {
        if (state.status === 'approved') {
          state.status = 'sent-to-customer';
          state.updatedAt = new Date();
        }
      }),

    markAsExpired: () =>
      set((state) => {
        if (state.status !== 'expired') {
          state.status = 'expired';
          state.updatedAt = new Date();
        }
      }),

    // Validity Actions
    setValidityDays: (days) =>
      set((state) => {
        const clamped = Math.max(1, Math.min(365, Math.round(days)));
        state.validityDays = clamped;
        state.updatedAt = new Date();
      }),

    // Reset Actions
    resetQuote: () => set(createInitialState()),

    resetAll: () => set(createInitialState()),

    setQuoteRef: (quoteRef) =>
      set((state) => {
        state.quoteRef = quoteRef;
      }),

    setVersion: (version) =>
      set((state) => {
        state.version = version;
      }),

    loadQuote: (quote) =>
      set(() => {
        return { ...createInitialState(), ...quote };
      }),
  }))
);

