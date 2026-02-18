import Dexie, { type Table } from 'dexie';
import type { StoredQuote, StoredCustomer, StoredTemplate, AuditLogEntry, StoredConfigurationMatrix, StoredPriceListSeries, StoredTelematicsPackage, StoredContainerMapping, StoredCompany, StoredContact, StoredActivity, StoredNotification } from './interfaces';
// Extended interfaces for database tables
export interface StoredUser {
  id?: string;
  username: string;
  passwordHash: string;
  role: string; // Role type from permissions.ts — 6 new roles
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  permissionOverrides: string; // JSON stringified PermissionOverrides
}

export interface StoredSetting {
  key: string;
  value: string;
}

export interface StoredApprovalTier {
  id?: number;
  tierLevel: number;       // 1 = lowest (Sales), 4 = highest (Final Signoff)
  tierName: string;
  minValue: number;        // Minimum deal value in ZAR
  maxValue: number;        // Maximum deal value in ZAR
  approvers: string[];     // User emails that can approve at this tier
  approverUserIds: string[]; // User IDs from the users table
  description: string;     // Human-readable description of this tier
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

// Main Database Class
export class BisedgeDatabase extends Dexie {
  // Quote-related tables
  quotes!: Table<StoredQuote, string>;
  customers!: Table<StoredCustomer, string>;
  auditLog!: Table<AuditLogEntry, string>;
  templates!: Table<StoredTemplate, string>;
  settings!: Table<StoredSetting, string>;

  // Configuration tables
  batteryModels!: Table<any, string>;
  approvalTiers!: Table<StoredApprovalTier, number>;
  commissionTiers!: Table<StoredCommissionTier, number>;
  residualCurves!: Table<StoredResidualCurve, string>;
  configurationMatrices!: Table<StoredConfigurationMatrix, string>;

  // User management
  users!: Table<StoredUser, string>;

  // Price List tables (v3)
  priceListSeries!: Table<StoredPriceListSeries, string>;
  telematicsPackages!: Table<StoredTelematicsPackage, string>;
  containerMappings!: Table<StoredContainerMapping, number>;

  // CRM tables (v4)
  companies!: Table<StoredCompany, string>;
  contacts!: Table<StoredContact, string>;
  activities!: Table<StoredActivity, string>;

  // Notifications (v6)
  notifications!: Table<StoredNotification, string>;

  constructor() {
    super('BisedgeQuotationDB');

    // Version 1: Original schema
    this.version(1).stores({
      // Quote storage with compound indexes for performance
      quotes: 'id, quoteRef, [quoteRef+version], status, clientName, createdAt, updatedAt',

      // Customer storage
      customers: 'id, name, email, createdAt',

      // Audit log
      auditLog: '++id, timestamp, entityType, [entityType+entityId], userId',

      // Templates
      templates: 'id, type, [type+isDefault], name',

      // System settings (key-value store)
      settings: 'key',

      // Configuration tables - indexed by primary key
      forkliftModels: 'modelCode, category, modelName',
      batteryModels: 'id, chemistry',
      approvalTiers: '++id, tierName',
      commissionTiers: '++id',
      residualCurves: 'id, chemistry',
      attachments: 'id, category',
      configurationMatrices: 'id, baseModelFamily',

      // Users
      users: 'id, username, role, isActive',
    });

    // Version 2: Add missing indexes for orderBy queries and
    // expand approvalTiers with tierLevel, description, and user references
    this.version(2).stores({
      // Quote storage (unchanged)
      quotes: 'id, quoteRef, [quoteRef+version], status, clientName, createdAt, updatedAt',

      // Customer storage (unchanged)
      customers: 'id, name, email, createdAt',

      // Audit log (unchanged)
      auditLog: '++id, timestamp, entityType, [entityType+entityId], userId',

      // Templates (unchanged)
      templates: 'id, type, [type+isDefault], name',

      // System settings (unchanged)
      settings: 'key',

      // Configuration tables (unchanged)
      forkliftModels: 'modelCode, category, modelName',
      batteryModels: 'id, chemistry',

      // FIXED: Added minValue index for orderBy('minValue') queries
      // Added tierLevel for tier-based lookups
      approvalTiers: '++id, tierName, tierLevel, minValue',

      // FIXED: Added minMargin index for orderBy('minMargin') queries
      commissionTiers: '++id, minMargin',

      residualCurves: 'id, chemistry',
      attachments: 'id, category',
      configurationMatrices: 'id, baseModelFamily',

      // Users - added email index for approval tier user linking
      users: 'id, username, email, role, isActive',
    }).upgrade(async (tx) => {
      // Migrate existing approvalTiers records to the new schema shape.
      // Existing rows may lack tierLevel, description, and approverUserIds.
      const approvalTiersTable = tx.table('approvalTiers');
      const existingTiers = await approvalTiersTable.toArray();

      if (existingTiers.length > 0) {
        // Sort by minValue so we can assign tier levels in order
        existingTiers.sort((a: any, b: any) => (a.minValue ?? 0) - (b.minValue ?? 0));

        for (let i = 0; i < existingTiers.length; i++) {
          const tier = existingTiers[i] as any;
          await approvalTiersTable.update(tier.id, {
            tierLevel: tier.tierLevel ?? (i + 1),
            description: tier.description ?? tier.tierName ?? `Tier ${i + 1}`,
            approverUserIds: tier.approverUserIds ?? [],
            // Ensure approvers array exists
            approvers: tier.approvers ?? [],
          });
        }

        console.log(`Migrated ${existingTiers.length} approval tiers to v2 schema`);
      }
    });

    // Version 3: Add price list tables for Fleet Builder redesign
    this.version(3).stores({
      // All existing tables (unchanged)
      quotes: 'id, quoteRef, [quoteRef+version], status, clientName, createdAt, updatedAt',
      customers: 'id, name, email, createdAt',
      auditLog: '++id, timestamp, entityType, [entityType+entityId], userId',
      templates: 'id, type, [type+isDefault], name',
      settings: 'key',
      forkliftModels: 'modelCode, category, modelName',
      batteryModels: 'id, chemistry',
      approvalTiers: '++id, tierName, tierLevel, minValue',
      commissionTiers: '++id, minMargin',
      residualCurves: 'id, chemistry',
      attachments: 'id, category',
      configurationMatrices: 'id, baseModelFamily',
      users: 'id, username, email, role, isActive',

      // NEW: Price List tables
      priceListSeries: 'seriesCode, seriesName',
      telematicsPackages: 'id',
      containerMappings: '++id, seriesCode',
    });

    // Version 4: CRM tables — companies, contacts, activities
    this.version(4).stores({
      // All existing tables (unchanged from v3)
      quotes: 'id, quoteRef, [quoteRef+version], status, clientName, createdAt, updatedAt, companyId',
      customers: 'id, name, email, createdAt',
      auditLog: '++id, timestamp, entityType, [entityType+entityId], userId',
      templates: 'id, type, [type+isDefault], name',
      settings: 'key',
      forkliftModels: 'modelCode, category, modelName',
      batteryModels: 'id, chemistry',
      approvalTiers: '++id, tierName, tierLevel, minValue',
      commissionTiers: '++id, minMargin',
      residualCurves: 'id, chemistry',
      attachments: 'id, category',
      configurationMatrices: 'id, baseModelFamily',
      users: 'id, username, email, role, isActive',
      priceListSeries: 'seriesCode, seriesName',
      telematicsPackages: 'id',
      containerMappings: '++id, seriesCode',

      // NEW: CRM tables
      companies: 'id, name, pipelineStage, assignedTo, createdAt, updatedAt',
      contacts: 'id, companyId, email, isPrimary, createdAt',
      activities: 'id, companyId, contactId, quoteId, type, createdBy, createdAt',
    }).upgrade(async (tx) => {
      // Migrate existing StoredCustomer records → Company + Contact
      const customersTable = tx.table('customers');
      const companiesTable = tx.table('companies');
      const contactsTable = tx.table('contacts');
      const quotesTable = tx.table('quotes');

      const existingCustomers = await customersTable.toArray();

      for (const cust of existingCustomers) {
        const c = cust as any;
        const companyId = c.id || crypto.randomUUID();
        const now = new Date().toISOString();

        // Create company from customer
        await companiesTable.put({
          id: companyId,
          name: c.name || '',
          tradingName: '',
          registrationNumber: '',
          vatNumber: '',
          industry: '',
          website: '',
          address: c.address || [],
          city: '',
          province: '',
          postalCode: '',
          country: 'South Africa',
          phone: c.phone || '',
          email: c.email || '',
          pipelineStage: 'lead',
          assignedTo: '',
          estimatedValue: 0,
          creditLimit: 0,
          paymentTerms: 30,
          tags: [],
          notes: '',
          createdAt: c.createdAt || now,
          updatedAt: c.updatedAt || now,
        });

        // Create contact from customer's contact person
        if (c.contactPerson) {
          const nameParts = (c.contactPerson as string).split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          await contactsTable.put({
            id: crypto.randomUUID(),
            companyId,
            firstName,
            lastName,
            title: '',
            email: c.email || '',
            phone: c.phone || '',
            isPrimary: true,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Link matching quotes by clientName
        const matchingQuotes = await quotesTable
          .filter((q: any) => q.clientName && q.clientName.toLowerCase() === (c.name || '').toLowerCase())
          .toArray();

        for (const quote of matchingQuotes) {
          await quotesTable.update((quote as any).id, { companyId });
        }
      }

      if (existingCustomers.length > 0) {
        console.log(`Migrated ${existingCustomers.length} customers to CRM companies/contacts`);
      }
    });

    // Version 5: Role-based approval chain & permission overrides
    this.version(5).stores({
      // Quotes — add currentAssigneeId index
      quotes: 'id, quoteRef, [quoteRef+version], status, clientName, createdAt, updatedAt, companyId, currentAssigneeId',
      customers: 'id, name, email, createdAt',
      auditLog: '++id, timestamp, entityType, [entityType+entityId], userId',
      templates: 'id, type, [type+isDefault], name',
      settings: 'key',
      forkliftModels: 'modelCode, category, modelName',
      batteryModels: 'id, chemistry',
      approvalTiers: '++id, tierName, tierLevel, minValue',
      commissionTiers: '++id, minMargin',
      residualCurves: 'id, chemistry',
      attachments: 'id, category',
      configurationMatrices: 'id, baseModelFamily',
      users: 'id, username, email, role, isActive',
      priceListSeries: 'seriesCode, seriesName',
      telematicsPackages: 'id',
      containerMappings: '++id, seriesCode',
      companies: 'id, name, pipelineStage, assignedTo, createdAt, updatedAt',
      contacts: 'id, companyId, email, isPrimary, createdAt',
      activities: 'id, companyId, contactId, quoteId, type, createdBy, createdAt',
    }).upgrade(async (tx) => {
      // ─── Migrate user roles ───────────────────────────────────────
      const ROLE_MIGRATION: Record<string, string> = {
        admin: 'system_admin',
        manager: 'sales_manager',
        sales: 'sales_rep',
        viewer: 'sales_rep',
      };

      const usersTable = tx.table('users');
      const existingUsers = await usersTable.toArray();

      for (const user of existingUsers) {
        const u = user as any;
        const oldRole = u.role as string;
        const newRole = ROLE_MIGRATION[oldRole] || oldRole;
        const isViewerMigration = oldRole === 'viewer';

        await usersTable.update(u.id, {
          role: newRole,
          permissionOverrides: u.permissionOverrides || '{}',
          // Deactivate former viewers
          ...(isViewerMigration ? { isActive: false } : {}),
        });
      }

      if (existingUsers.length > 0) {
        console.log(`Migrated ${existingUsers.length} user roles to v5 schema`);
      }

      // ─── Add approval chain fields to quotes ─────────────────────
      const quotesTable = tx.table('quotes');
      const existingQuotes = await quotesTable.toArray();

      for (const quote of existingQuotes) {
        const q = quote as any;
        await quotesTable.update(q.id, {
          currentAssigneeId: q.currentAssigneeId ?? null,
          currentAssigneeRole: q.currentAssigneeRole ?? null,
          approvalChain: q.approvalChain ?? '[]',
        });
      }

      if (existingQuotes.length > 0) {
        console.log(`Added approval chain fields to ${existingQuotes.length} quotes`);
      }
    });

    // Version 6: Notifications table
    this.version(6).stores({
      quotes: 'id, quoteRef, [quoteRef+version], status, clientName, createdAt, updatedAt, companyId, currentAssigneeId',
      customers: 'id, name, email, createdAt',
      auditLog: '++id, timestamp, entityType, [entityType+entityId], userId',
      templates: 'id, type, [type+isDefault], name',
      settings: 'key',
      forkliftModels: 'modelCode, category, modelName',
      batteryModels: 'id, chemistry',
      approvalTiers: '++id, tierName, tierLevel, minValue',
      commissionTiers: '++id, minMargin',
      residualCurves: 'id, chemistry',
      attachments: 'id, category',
      configurationMatrices: 'id, baseModelFamily',
      users: 'id, username, email, role, isActive',
      priceListSeries: 'seriesCode, seriesName',
      telematicsPackages: 'id',
      containerMappings: '++id, seriesCode',
      companies: 'id, name, pipelineStage, assignedTo, createdAt, updatedAt',
      contacts: 'id, companyId, email, isPrimary, createdAt',
      activities: 'id, companyId, contactId, quoteId, type, createdBy, createdAt',

      // NEW: Notifications
      notifications: 'id, userId, type, isRead, createdAt',
    });
  }
}

// Create singleton instance
export const db = new BisedgeDatabase();

// Helper to check if database is initialized
export async function isDatabaseSeeded(): Promise<boolean> {
  try {
    const count = await db.forkliftModels.count();
    return count > 0;
  } catch (error) {
    console.error('Error checking database seed status:', error);
    return false;
  }
}

// Helper to clear all data (for development/testing)
export async function clearDatabase(): Promise<void> {
  await db.quotes.clear();
  await db.customers.clear();
  await db.auditLog.clear();
  await db.templates.clear();
  await db.settings.clear();
  await db.approvalTiers.clear();
  await db.commissionTiers.clear();
  await db.residualCurves.clear();
  await db.configurationMatrices.clear();
  await db.users.clear();
  await db.priceListSeries.clear();
  await db.telematicsPackages.clear();
  await db.containerMappings.clear();
  await db.companies.clear();
  await db.contacts.clear();
  await db.activities.clear();
  await db.notifications.clear();
  console.log('Database cleared successfully');
}
