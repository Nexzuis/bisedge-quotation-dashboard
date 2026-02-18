import type { QuoteState, SlotIndex, UnitSlot } from '../types/quote';
import type { StoredQuote } from './interfaces';

/**
 * Create empty slot helper (needed for JSON.parse fallback)
 * Must include ALL fields from UnitSlot to prevent undefined/NaN
 */
function createEmptySlot(index: SlotIndex): UnitSlot {
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
    discountPct: 0,
    quantity: 1,
    operatingHoursPerMonth: 180,
    leaseTermMonths: 60,

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

    // Clearing Charges
    clearingCharges: {
      inlandFreight: 0,
      seaFreight: 0,
      portCharges: 0,
      transport: 0,
      destuffing: 0,
      duties: 0,
      warranty: 0,
    },

    // Local Costs
    localCosts: {
      assembly: 0,
      loadTest: 0,
      delivery: 0,
      pdi: 0,
      extras: 0,
    },

    // Commercial Fields
    markupPct: 0,
    residualValueTruckPct: 15,
    residualValueBatteryPct: 0,
    residualValueAttachmentPct: 0,
    financeCostPct: 9.5,
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
    telematicsCostPerMonth: 250,
    mastType: '',
    selectedVariant: '',
  };
}

/**
 * Convert runtime QuoteState (with Date objects) to StoredQuote (with ISO strings)
 */
export function quoteToStored(state: QuoteState): StoredQuote {
  return {
    id: state.id,
    quoteRef: state.quoteRef,
    version: state.version,
    quoteDate: state.quoteDate.toISOString(),
    status: state.status,

    // Customer Info
    clientName: state.clientName,
    contactName: state.contactName,
    contactTitle: state.contactTitle,
    contactEmail: state.contactEmail,
    contactPhone: state.contactPhone,
    clientAddress: state.clientAddress,

    // Pricing Configuration
    factoryROE: state.factoryROE,
    customerROE: state.customerROE,
    discountPct: state.discountPct,
    annualInterestRate: state.annualInterestRate,

    // Terms
    defaultLeaseTermMonths: state.defaultLeaseTermMonths,
    batteryChemistryLock: state.batteryChemistryLock,
    quoteType: state.quoteType,

    // Fleet Configuration (serialize slots to JSON)
    slots: JSON.stringify(state.slots),

    // Approval Workflow
    approvalTier: state.approvalTier,
    approvalStatus: state.approvalStatus,
    approvalNotes: state.approvalNotes,
    overrideIRR: state.overrideIRR,
    submittedBy: state.submittedBy,
    submittedAt: state.submittedAt ? state.submittedAt.toISOString() : null,
    approvedBy: state.approvedBy,
    approvedAt: state.approvedAt ? state.approvedAt.toISOString() : null,

    // Chain-based approval workflow
    currentAssigneeId: state.currentAssigneeId ?? null,
    currentAssigneeRole: state.currentAssigneeRole ?? null,
    approvalChain: JSON.stringify(state.approvalChain || []),

    // Multi-User Ownership & Locking
    createdBy: state.createdBy,
    assignedTo: state.assignedTo,
    lockedBy: state.lockedBy,
    lockedAt: state.lockedAt ? state.lockedAt.toISOString() : null,

    // CRM Integration
    companyId: state.companyId,

    // Validity
    validityDays: state.validityDays,

    // Metadata
    createdAt: state.createdAt.toISOString(),
    updatedAt: state.updatedAt.toISOString(),
  };
}

/**
 * Convert StoredQuote (with ISO strings) to runtime QuoteState (with Date objects)
 */
export function storedToQuote(stored: StoredQuote): QuoteState {
  return {
    id: stored.id,
    quoteRef: stored.quoteRef,
    version: stored.version,
    quoteDate: new Date(stored.quoteDate),
    status: stored.status,

    // Customer Info
    clientName: stored.clientName,
    contactName: stored.contactName,
    contactTitle: stored.contactTitle,
    contactEmail: stored.contactEmail,
    contactPhone: stored.contactPhone,
    clientAddress: stored.clientAddress,

    // Pricing Configuration
    factoryROE: stored.factoryROE,
    customerROE: stored.customerROE,
    discountPct: stored.discountPct,
    annualInterestRate: stored.annualInterestRate,

    // Terms
    defaultLeaseTermMonths: stored.defaultLeaseTermMonths as QuoteState['defaultLeaseTermMonths'],
    batteryChemistryLock: stored.batteryChemistryLock,
    quoteType: stored.quoteType as QuoteState['quoteType'],

    // Fleet Configuration (deserialize slots from JSON with error handling)
    slots: (() => {
      try {
        const parsed = JSON.parse(stored.slots);
        // Validate that parsed data is an array with 6 slots
        if (!Array.isArray(parsed) || parsed.length !== 6) {
          console.error('Invalid slots data structure, using defaults');
          return Array.from({ length: 6 }, (_, i) => createEmptySlot(i as SlotIndex));
        }
        return parsed;
      } catch (error) {
        console.error('Failed to parse slots JSON:', error);
        // Return 6 empty slots as fallback
        return Array.from({ length: 6 }, (_, i) => createEmptySlot(i as SlotIndex));
      }
    })(),

    // Approval Workflow
    approvalTier: stored.approvalTier,
    approvalStatus: stored.approvalStatus,
    approvalNotes: stored.approvalNotes,
    overrideIRR: stored.overrideIRR,
    submittedBy: stored.submittedBy,
    submittedAt: stored.submittedAt ? new Date(stored.submittedAt) : null,
    approvedBy: stored.approvedBy,
    approvedAt: stored.approvedAt ? new Date(stored.approvedAt) : null,

    // Chain-based approval workflow
    currentAssigneeId: stored.currentAssigneeId ?? null,
    currentAssigneeRole: stored.currentAssigneeRole ?? null,
    approvalChain: (() => {
      try {
        const chain = stored.approvalChain;
        if (!chain) return [];
        return typeof chain === 'string' ? JSON.parse(chain) : chain;
      } catch {
        return [];
      }
    })(),

    // Multi-User Ownership & Locking
    createdBy: stored.createdBy || '',
    assignedTo: stored.assignedTo || null,
    lockedBy: stored.lockedBy || null,
    lockedAt: stored.lockedAt ? new Date(stored.lockedAt) : null,

    // CRM Integration
    companyId: stored.companyId || undefined,

    // Validity
    validityDays: stored.validityDays ?? 30,

    // Metadata
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  };
}
