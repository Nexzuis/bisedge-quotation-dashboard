// Core Currency Types
export type EUR = number;
export type ZAR = number;

// Domain Types
export type MaterialNumber = string;
export type BatteryChemistry = 'lead-acid' | 'lithium-ion';
export type SlotIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type QuoteStatus = 'draft' | 'pending-approval' | 'in-review' | 'changes-requested' | 'approved' | 'sent-to-customer' | 'rejected' | 'expired';
export type QuoteType = 'rental' | 'rent-to-own' | 'dual';
export type LeaseTermMonths = 36 | 48 | 60 | 72 | 84;

// --- Price List Data Types ---

export interface PriceListModel {
  materialNumber: string;
  modelName: string;
  baseEurCost: EUR;
  indxColumn: number;
}

export interface PriceListOption {
  materialNumber: string;
  specCode: string;
  description: string;
  eurPrice: EUR;
  availability: number[]; // per INDX column
  isNA?: boolean;
  notes?: string;  // TEXT1 from Price List EU column AL
}

export interface PriceListSeries {
  seriesCode: string;
  seriesName: string;
  models: PriceListModel[];
  options: PriceListOption[];
}

export interface TelematicsPackage {
  id: string;
  name: string;
  description: string;
  tags: string;
  costZAR: ZAR;
}

export interface ContainerMapping {
  seriesCode: string;
  category: string;
  model: string;
  qtyPerContainer: number;
  containerType: string;
  containerCostEUR: EUR;
  notes: string;
}

// Clearing Charges (from EU1 rows 100-109)
export interface ClearingCharges {
  inlandFreight: ZAR;
  seaFreight: ZAR;
  portCharges: ZAR;
  transport: ZAR;
  destuffing: ZAR;
  duties: ZAR;
  warranty: ZAR;
}

// Local Costs (from EU1 rows 111-121)
export interface LocalCosts {
  assembly: ZAR;
  loadTest: ZAR;
  delivery: ZAR;
  pdi: ZAR;
  extras: ZAR;
}

// Unit Slot Configuration
export interface UnitSlot {
  slotIndex: SlotIndex;
  isEmpty: boolean;

  // --- Series / Model selection ---
  seriesCode: string;              // "12750000000"
  modelCode: MaterialNumber;       // short model code like "E16C" (kept for compat)
  modelName: string;
  modelDescription: string;
  modelMaterialNumber: string;     // Full material number for pricing
  indxColumn: number;              // Which INDX column applies to this model
  eurCost: EUR;                    // base EUR cost from Price List EU
  discountPct: number;             // EU1 Column I - discount % applied to EUR costs before ROE
  quantity: number;
  operatingHoursPerMonth: number;
  leaseTermMonths: LeaseTermMonths;

  // --- Configuration ---
  configuration: Record<string, string>; // { specCode: optionMaterialNumber }
  configurationCost: EUR;              // Total EUR cost of optional/non-standard selections
  configurationSummary: string[];      // Human-readable summary for display
  isConfigured: boolean;

  // --- Battery (local, manual) ---
  batteryCompartmentOption: string;    // Selected spec 2200 option material number
  localBatteryCostZAR: ZAR;           // Manual battery cost in ZAR
  localBatteryDescription: string;    // Battery description text

  // --- Telematics ---
  telematicsPackageId: string;         // Selected telematics package
  telematicsPackageCostZAR: ZAR;       // Telematics package cost

  // --- Local costs ---
  localAttachmentCostZAR: ZAR;        // Manual local attachment cost
  localTelematicsCostZAR: ZAR;        // Local telematics cost (hardware etc.)

  // --- Attachments (factory) ---
  attachments: string[];               // Array of attachment IDs
  attachmentsCost: EUR;                // Cached total EUR cost of selected attachments

  // --- Clearing Charges ---
  clearingCharges: ClearingCharges;

  // --- Local Costs ---
  localCosts: LocalCosts;

  // --- Commercial Fields ---
  markupPct: number;                           // Column O - markup percentage
  residualValueTruckPct: number;               // Column X
  residualValueBatteryPct: number;             // Column Y
  residualValueAttachmentPct: number;          // Column Z
  financeCostPct: number;                      // Column AE - annual finance cost %
  maintenanceRateTruckPerHr: ZAR;              // Column AH
  maintenanceRateTiresPerHr: ZAR;              // Column AI
  maintenanceRateAttachmentPerHr: ZAR;         // Column AJ
  telematicsSubscriptionCostPerMonth: ZAR;     // Column AN
  telematicsSubscriptionSellingPerMonth: ZAR;  // Column AO
  operatorPricePerMonth: ZAR;                  // Column AQ

  // --- Container dimensions (kept for compat) ---
  containerLength: number; // cm
  containerWidth: number;  // cm
  containerHeight: number; // cm
  containerWeight: number; // kg

  // --- Deprecated (kept for migration, stop using in new code) ---
  batteryId: string;
  batteryChemistry: BatteryChemistry | null;
  batteryName: string;
  batteryCost: EUR;
  maintenanceCostPerMonth: ZAR;
  fleetMgmtCostPerMonth: ZAR;
  telematicsCostPerMonth: ZAR;
  mastType: string;
  selectedVariant: string;
}

// Calculated Pricing for a Slot
export interface SlotPricing {
  factoryCostEUR: EUR;
  factoryCostZAR: ZAR;
  landedCostZAR: ZAR;
  sellingPriceZAR: ZAR;
  margin: number; // percentage
  residualValue: ZAR;
  leaseRate: ZAR;
  maintenanceMonthly: ZAR;
  totalMonthly: ZAR;
  costPerHour: ZAR;
  totalContractValue: ZAR;
  // Keep old field names for backward compat in UI
  salesPrice: ZAR;
  factoryCost: ZAR;
}

// Quote Totals
export interface QuoteTotals {
  totalSalesPrice: ZAR;
  totalFactoryCost: ZAR;
  averageMargin: number;
  totalLeaseRate: ZAR;
  totalMonthly: ZAR;
  totalContractValue: ZAR;
  irr: number | null;
  npv: ZAR;
  commission: ZAR;
  unitCount: number;
  calculatedApprovalTier?: number; // deprecated, kept for backward compat
}

// Main Quote State
export interface QuoteState {
  // Identity
  id: string;
  quoteRef: string;
  quoteDate: Date;
  status: QuoteStatus;

  // Customer Info
  clientName: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  clientAddress: string[];

  // Pricing Configuration (Dual ROE!)
  factoryROE: number;
  customerROE: number;
  discountPct: number;
  annualInterestRate: number;

  // Terms
  defaultLeaseTermMonths: LeaseTermMonths;
  batteryChemistryLock: BatteryChemistry | null;
  quoteType: QuoteType;

  // Fleet Configuration (6 slots)
  slots: UnitSlot[];

  // Approval Workflow (legacy fields kept for migration compat)
  approvalTier: number;
  approvalStatus: QuoteStatus;
  approvalNotes: string;
  overrideIRR: boolean;
  submittedBy: string;
  submittedAt: Date | null;
  approvedBy: string;
  approvedAt: Date | null;

  // Chain-based approval workflow
  currentAssigneeId: string | null;
  currentAssigneeRole: string | null;
  approvalChain: ApprovalChainEntry[];

  // Multi-User Ownership & Locking
  createdBy: string;
  assignedTo: string | null;
  lockedBy: string | null;
  lockedAt: Date | null;

  // CRM Integration
  companyId?: string;

  // Validity
  validityDays?: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// Forklift Model (legacy - kept for backward compat)
export interface ForkliftModel {
  modelCode: MaterialNumber;
  modelName: string;
  description: string;
  category: string;
  capacity: number;
  eurCost: EUR;
  defaultMast: string;
  availableMasts: string[];
  compatibleBatteries: string[];
  dimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  specifications: Record<string, string>;
  imageBase64?: string;
}

// Battery Model (legacy - kept for backward compat)
export interface BatteryModel {
  id: string;
  name: string;
  chemistry: BatteryChemistry;
  voltage: number;
  capacity: number;
  eurCost: EUR;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  compatibleModels: MaterialNumber[];
  warrantyYears: number;
}

// Container Type
export interface ContainerType {
  id: string;
  name: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  maxWeight: number;
  costZAR: ZAR;
}

// Container Optimization Result
export interface ContainerOptimization {
  containers: {
    type: ContainerType;
    units: UnitSlot[];
    utilization: number;
    weightUtilization: number;
  }[];
  totalCost: ZAR;
  costPerUnit: ZAR;
  totalContainers: number;
}

// Approval Chain Entry — one step in the chain-based approval flow
export interface ApprovalChainEntry {
  id: string;
  timestamp: string; // ISO string
  fromUserId: string;
  fromUserName: string;
  fromRole: string;
  toUserId: string;
  toUserName: string;
  toRole: string;
  action: 'submitted' | 'escalated' | 'returned' | 'approved' | 'rejected' | 'commented' | 'edited';
  notes: string;
  changesDescription?: string;
}

// Commission Tier
export interface CommissionTier {
  minMargin: number;
  maxMargin: number;
  commissionPct: number;
}

// Residual Value Curve
export interface ResidualCurve {
  chemistry: BatteryChemistry;
  values: Record<string, number>;
}

// Validation Error
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// Financial Analysis Data
export interface FinancialAnalysis {
  cashFlows: {
    month: number;
    inflow: ZAR;
    outflow: ZAR;
    net: ZAR;
    cumulative: ZAR;
  }[];
  irr: number | null;
  npv: ZAR;
  paybackPeriod: number;
  profitability: number;
}
