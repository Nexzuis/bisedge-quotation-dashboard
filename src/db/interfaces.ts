import type { QuoteState, QuoteStatus, BatteryChemistry } from '../types/quote';
import type { Company, Contact, Activity } from '../types/crm';
import type { Lead, LeadFilter, LeadPaginationOptions, LeadStats } from '../types/leads';

// Stored Quote - runtime state with Date objects converted to ISO strings
export interface StoredQuote {
  id: string;
  quoteRef: string;
  version: number;
  quoteDate: string; // ISO string
  status: QuoteStatus;

  // Customer Info
  clientName: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  clientAddress: string[];

  // Pricing Configuration
  factoryROE: number;
  customerROE: number;
  discountPct: number;
  annualInterestRate: number;

  // Terms
  defaultLeaseTermMonths: number;
  batteryChemistryLock: BatteryChemistry | null;
  quoteType: string;

  // Fleet Configuration (serialized)
  slots: string; // JSON stringified slots array
  shippingEntries?: string; // JSON stringified shipping entries

  // Approval Workflow
  approvalTier: number;
  approvalStatus: QuoteStatus;
  approvalNotes: string;
  overrideIRR: boolean;
  submittedBy: string;
  submittedAt: string | null; // ISO string
  approvedBy: string;
  approvedAt: string | null; // ISO string

  // Chain-based approval workflow
  currentAssigneeId: string | null;
  currentAssigneeRole: string | null;
  approvalChain: string; // JSON stringified ApprovalChainEntry[]

  // Multi-User Ownership & Locking
  createdBy: string;           // User ID who created this quote
  assignedTo: string | null;   // User ID assigned to this quote
  lockedBy: string | null;     // User ID currently editing
  lockedAt: string | null;     // ISO string

  // CRM Integration
  companyId?: string;          // Links quote to a CRM company

  // Validity
  validityDays?: number;

  // Metadata
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Save Result with optimistic locking
export interface SaveResult {
  success: boolean;
  id: string;
  version: number;
  error?: string;
}

// Query and pagination types
export interface QuoteFilter {
  status?: QuoteStatus;
  customerName?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'quoteRef';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Quote Repository Interface
export interface IQuoteRepository {
  save(quote: QuoteState): Promise<SaveResult>;
  load(id: string): Promise<QuoteState | null>;
  list(options: PaginationOptions, filters?: QuoteFilter): Promise<PaginatedResult<StoredQuote>>;
  search(query: string): Promise<StoredQuote[]>;
  duplicate(id: string): Promise<SaveResult>;
  createRevision(id: string): Promise<SaveResult>;
  delete(id: string): Promise<void>;
  getNextQuoteRef(): Promise<string>;
  getMostRecent(): Promise<QuoteState | null>;
}

// Customer Storage
export interface StoredCustomer {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string[];
  createdAt: string;
  updatedAt: string;
}

// Customer Repository Interface
export interface ICustomerRepository {
  save(customer: Omit<StoredCustomer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  search(query: string): Promise<StoredCustomer[]>;
  getById(id: string): Promise<StoredCustomer | null>;
  list(): Promise<StoredCustomer[]>;
}

// Template Storage
export interface StoredTemplate {
  id: string;
  type: 'terms-and-conditions' | 'email' | 'quote-header' | 'cover-letter';
  name: string;
  content: any; // Can be string or structured object (e.g., TermsTemplate)
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Template Repository Interface
export interface ITemplateRepository {
  save(template: Omit<StoredTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  getByType(type: StoredTemplate['type']): Promise<StoredTemplate[]>;
  getDefault(type: StoredTemplate['type']): Promise<StoredTemplate | null>;
  delete(id: string): Promise<void>;
}

// Audit Log Entry
export interface AuditLogEntry {
  id?: string;
  timestamp: string;
  userId: string;
  userName?: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'submit' | 'login' | 'logout' | 'escalate' | 'return' | 'comment' | 'edit_review' | 'login_failed' | 'lockout';
  entityType: 'quote' | 'customer' | 'template' | 'user' | 'approvalTiers' | 'commissionTiers' | 'residualCurves' | 'settings' | 'forkliftModel' | 'batteryModel' | 'attachment' | 'company' | 'contact' | 'lead';
  entityId: string;
  changes: Record<string, any>;
  oldValues?: any;
  newValues?: any;
  notes?: string;
  targetUserId?: string;
  targetUserName?: string;
}

// Audit Repository Interface
export interface IAuditRepository {
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
  getByEntity(entityType: string, entityId: string): Promise<AuditLogEntry[]>;
  getRecent(limit: number): Promise<AuditLogEntry[]>;
}

// Configuration Matrix Types
export type AvailabilityLevel = 0 | 1 | 2 | 3;

export interface StoredConfigurationOption {
  optionCode: string;                  // "127500000021135005"
  specCode: string;                    // "1135"
  description: string;                 // "Lead acid batteries"
  availability: AvailabilityLevel;     // 0, 1, 2, or 3
  eurCostDelta: number;                // Additional cost (0 for level 1, >0 for 2&3)
  isDefault?: boolean;                 // Auto-select this option if multiple 1's exist
}

export interface StoredSpecificationGroup {
  groupCode: string;                   // "1100", "1200", "2200", etc.
  groupName: string;                   // "MODEL", "PEDAL SYSTEM", etc.
  category: string;                    // "Basic", "Battery", "Mast", "Hydraulics", etc.
  options: StoredConfigurationOption[];
}

export interface StoredConfigurationVariant {
  variantCode: string;                 // "EG16", "EG16P", "EG16H"
  variantName: string;                 // "3-wheel", "4-wheel", "High-lift"
  modelCode: string;                   // Links to forkliftModels.modelCode
  baseEurCost: number;                 // Base cost for this variant
  specifications: StoredSpecificationGroup[]; // Organized spec codes
}

export interface StoredConfigurationMatrix {
  id: string;                          // Auto-generated
  baseModelFamily: string;             // "EG16", "E20", etc.
  variants: StoredConfigurationVariant[]; // Array of model variants
  createdAt: string;
  updatedAt: string;
}

// Configuration Repository Interface
export interface IConfigurationMatrixRepository {
  getMatrixByModelFamily(family: string): Promise<StoredConfigurationMatrix | null>;
  getVariantByCode(variantCode: string): Promise<StoredConfigurationVariant | null>;
  saveMatrix(matrix: Omit<StoredConfigurationMatrix, 'createdAt' | 'updatedAt'>): Promise<string>;
  updateOption(matrixId: string, variantCode: string, specCode: string, optionCode: string, updates: Partial<StoredConfigurationOption>): Promise<void>;
  list(): Promise<StoredConfigurationMatrix[]>;
  delete(id: string): Promise<void>;
}

// --- New Price List tables (v3) ---

export interface StoredPriceListSeries {
  seriesCode: string;       // Primary key
  seriesName: string;
  models: string;           // JSON stringified PriceListModel[]
  options: string;          // JSON stringified PriceListOption[]
}

export interface StoredTelematicsPackage {
  id: string;               // Primary key
  name: string;
  description: string;
  tags: string;
  costZAR: number;
}

export interface StoredContainerMapping {
  id?: number;              // Auto-increment primary key
  seriesCode: string;
  category: string;
  model: string;
  qtyPerContainer: number;
  containerType: string;
  containerCostEUR: number;
  notes: string;
}

// --- CRM Tables (v4) ---

// StoredCompany is the same shape as Company (all strings/numbers, no Date objects)
export type StoredCompany = Company;

// StoredContact is the same shape as Contact
export type StoredContact = Contact;

// StoredActivity is the same shape as Activity
export type StoredActivity = Activity;

// Company Repository Interface
export interface ICompanyRepository {
  save(company: Omit<StoredCompany, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  update(id: string, updates: Partial<StoredCompany>): Promise<void>;
  getById(id: string): Promise<StoredCompany | null>;
  list(): Promise<StoredCompany[]>;
  search(query: string): Promise<StoredCompany[]>;
  updateStage(id: string, stage: StoredCompany['pipelineStage']): Promise<void>;
  delete(id: string): Promise<void>;
}

// Contact Repository Interface
export interface IContactRepository {
  save(contact: Omit<StoredContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  update(id: string, updates: Partial<StoredContact>): Promise<void>;
  getByCompany(companyId: string): Promise<StoredContact[]>;
  getPrimary(companyId: string): Promise<StoredContact | null>;
  getById(id: string): Promise<StoredContact | null>;
  delete(id: string): Promise<void>;
}

// Activity Repository Interface
export interface IActivityRepository {
  save(activity: Omit<StoredActivity, 'id' | 'createdAt'>): Promise<string>;
  getByCompany(companyId: string, limit?: number): Promise<StoredActivity[]>;
  getRecent(limit: number): Promise<StoredActivity[]>;
  getByQuote(quoteId: string): Promise<StoredActivity[]>;
  delete(id: string): Promise<void>;
}

// --- Notifications (v6) ---

export interface StoredNotification {
  id: string;
  userId: string;
  type: 'approval_needed' | 'approval_result' | 'quote_assigned' | 'company_assigned' | 'stage_change' | 'activity_mention' | 'system';
  title: string;
  message: string;
  entityType?: 'quote' | 'company' | 'activity';
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

// --- User and Configuration Types ---

export interface StoredUser {
  id?: string;
  username: string;
  role: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  permissionOverrides: string;
}

export interface StoredCommissionTier {
  id?: number;
  minMargin: number;
  maxMargin: number;
  commissionRate: number;
}

export interface StoredResidualCurve {
  id?: string;
  chemistry: string;
  term36: number;
  term48: number;
  term60: number;
  term72: number;
  term84: number;
}

// --- Leads (v7) ---

// StoredLead is the same shape as Lead (all strings/numbers, no Date objects)
export type StoredLead = Lead;

// Lead Repository Interface
export interface ILeadRepository {
  save(lead: Omit<StoredLead, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  update(id: string, updates: Partial<StoredLead>): Promise<void>;
  getById(id: string): Promise<StoredLead | null>;
  list(options: LeadPaginationOptions, filters?: LeadFilter): Promise<PaginatedResult<StoredLead>>;
  search(query: string): Promise<StoredLead[]>;
  delete(id: string): Promise<void>;
  getStats(): Promise<LeadStats>;
  bulkUpdateStatus(ids: string[], status: StoredLead['qualificationStatus']): Promise<void>;
}
