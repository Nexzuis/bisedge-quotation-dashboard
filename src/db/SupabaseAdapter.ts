/**
 * Supabase Database Adapter
 *
 * Implements IDatabaseAdapter using Supabase as the backend.
 * Handles cloud storage, real-time sync, and role-based access control.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { QuoteState, LeaseTermMonths } from '../types/quote';
import type { Database } from '../lib/database.types';
import type {
  SaveResult,
  QuoteFilter,
  PaginationOptions,
  PaginatedResult,
  StoredQuote,
  StoredCustomer,
  StoredTemplate,
  StoredCompany,
  StoredContact,
  StoredActivity,
  StoredNotification,
  StoredLead,
  AuditLogEntry,
} from './interfaces';
import type { LeadFilter, LeadPaginationOptions, LeadStats, QualificationStatus } from '../types/leads';
import type { IDatabaseAdapter } from './DatabaseAdapter';
import { sanitizePostgrestValue } from '../utils/sanitize';

type QuotesInsert = Database['public']['Tables']['quotes']['Insert'];
type DbQuoteStatus = Database['public']['Tables']['quotes']['Row']['status'];
type DbUserRole = Database['public']['Tables']['users']['Row']['role'];

/**
 * Map a raw Supabase quotes row (snake_case) to StoredQuote (camelCase).
 * Used by list/search methods that return summary rows.
 */
function dbRowToStoredQuote(row: any): StoredQuote {
  return {
    id: row.id,
    quoteRef: row.quote_ref ?? '',
    version: row.version ?? 1,
    quoteDate: row.quote_date ?? row.created_at ?? '',
    status: row.status ?? 'draft',
    clientName: row.client_name ?? '',
    contactName: row.contact_name ?? '',
    contactTitle: row.contact_title ?? '',
    contactEmail: row.contact_email ?? '',
    contactPhone: row.contact_phone ?? '',
    clientAddress: typeof row.client_address === 'string'
      ? JSON.parse(row.client_address || '[]')
      : (row.client_address ?? []),
    factoryROE: row.factory_roe ?? 0,
    customerROE: row.customer_roe ?? 0,
    discountPct: row.discount_pct ?? 0,
    annualInterestRate: row.annual_interest_rate ?? 0,
    defaultLeaseTermMonths: row.default_lease_term_months ?? 60,
    batteryChemistryLock: row.battery_chemistry_lock ?? null,
    quoteType: row.quote_type ?? 'rental',
    slots: row.slots ?? '[]',
    shippingEntries: row.shipping_entries,
    approvalTier: row.approval_tier ?? 1,
    approvalStatus: row.approval_status ?? 'draft',
    approvalNotes: row.approval_notes ?? '',
    overrideIRR: row.override_irr ?? false,
    submittedBy: row.submitted_by ?? '',
    submittedAt: row.submitted_at ?? null,
    approvedBy: row.approved_by ?? '',
    approvedAt: row.approved_at ?? null,
    currentAssigneeId: row.current_assignee_id ?? null,
    currentAssigneeRole: row.current_assignee_role ?? null,
    approvalChain: row.approval_chain ?? '[]',
    createdBy: row.created_by ?? '',
    assignedTo: row.assigned_to ?? null,
    lockedBy: row.locked_by ?? null,
    lockedAt: row.locked_at ?? null,
    companyId: row.company_id,
    validityDays: row.validity_days,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

/**
 * Cloud database adapter using Supabase
 */
export class SupabaseDatabaseAdapter implements IDatabaseAdapter {
  constructor() {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase is not properly configured. ' +
        'Please check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
      );
    }
    // Non-blocking startup health check for required RPCs
    this.verifyRequiredRpcs();
  }

  // ===== Quote Operations =====
  async saveQuote(quote: QuoteState): Promise<SaveResult> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          id: quote.id,
          version: quote.version,
          error: 'User not authenticated',
        };
      }

      // Prepare quote for database — explicit snake_case payload
      const newVersion = quote.version + 1;
      const dbQuote: Record<string, any> = {
        id: quote.id,
        quote_ref: quote.quoteRef,
        version: newVersion,
        status: quote.status,
        created_by: quote.createdBy || user.id,
        assigned_to: quote.assignedTo || null,
        company_id: quote.companyId || null,
        customer_id: null,
        client_name: quote.clientName,
        contact_name: quote.contactName,
        contact_title: quote.contactTitle || '',
        contact_email: quote.contactEmail || null,
        contact_phone: quote.contactPhone || null,
        client_address: quote.clientAddress,
        factory_roe: quote.factoryROE,
        customer_roe: quote.customerROE,
        discount_pct: quote.discountPct,
        annual_interest_rate: quote.annualInterestRate,
        default_lease_term_months: quote.defaultLeaseTermMonths,
        battery_chemistry_lock: quote.batteryChemistryLock,
        quote_type: quote.quoteType,
        slots: quote.slots,
        shipping_entries: quote.shippingEntries ?? [],
        approval_tier: quote.approvalTier ?? null,
        approval_status: quote.approvalStatus || null,
        approval_notes: quote.approvalNotes || null,
        override_irr: quote.overrideIRR,
        submitted_by: quote.submittedBy || null,
        submitted_at: quote.submittedAt instanceof Date ? quote.submittedAt.toISOString() : quote.submittedAt || null,
        approved_by: quote.approvedBy || null,
        approved_at: quote.approvedAt instanceof Date ? quote.approvedAt.toISOString() : quote.approvedAt || null,
        rejected_by: (quote as any).rejectedBy || null,
        rejected_at: (quote as any).rejectedAt instanceof Date ? (quote as any).rejectedAt.toISOString() : (quote as any).rejectedAt || null,
        rejection_reason: (quote as any).rejectionReason || null,
        locked_by: quote.lockedBy || null,
        locked_at: quote.lockedAt instanceof Date ? quote.lockedAt.toISOString() : quote.lockedAt || null,
        quote_date: quote.quoteDate instanceof Date ? quote.quoteDate.toISOString().split('T')[0] : quote.quoteDate,
        created_at: quote.createdAt instanceof Date ? quote.createdAt.toISOString() : quote.createdAt,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        current_assignee_id: quote.currentAssigneeId || null,
        current_assignee_role: quote.currentAssigneeRole || null,
        approval_chain: quote.approvalChain || [],
        validity_days: quote.validityDays ?? 30,
        last_synced_at: null,
        sync_status: null,
      };

      // Atomic save via RPC — SELECT ... FOR UPDATE + version check + upsert in one call
      const { data: rpcResult, error: rpcError } = await supabase.rpc('save_quote_if_version', {
        p_id: quote.id,
        p_expected_version: quote.version,
        p_data: dbQuote,
      });

      if (rpcError) {
        console.error('Supabase RPC error saving quote:', rpcError);
        return {
          success: false,
          id: quote.id,
          version: quote.version,
          error: rpcError.message,
        };
      }

      // Parse JSONB result from RPC
      const result = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult;

      if (!result.success) {
        return {
          success: false,
          id: quote.id,
          version: result.version ?? quote.version,
          error: result.error || 'Version conflict - quote was modified remotely',
        };
      }

      // Log audit entry
      await this.logAudit({
        userId: user.id,
        action: quote.version === 0 ? 'create' : 'update',
        entityType: 'quote',
        entityId: quote.id,
        changes: {},
      });

      return {
        success: true,
        id: quote.id,
        version: newVersion,
      };
    } catch (error) {
      console.error('Error saving quote to Supabase:', error);
      return {
        success: false,
        id: quote.id,
        version: quote.version,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async loadQuote(id: string): Promise<QuoteState | null> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading quote:', error);
        return null;
      }

      if (!data) return null;

      // Convert from database format to QuoteState
      return this.dbQuoteToQuoteState(data);
    } catch (error) {
      console.error('Error loading quote from Supabase:', error);
      return null;
    }
  }

  async listQuotes(
    options: PaginationOptions,
    filters?: QuoteFilter
  ): Promise<PaginatedResult<StoredQuote>> {
    try {
      // Build query with role-based filtering (RLS policies handle this)
      let query = supabase.from('quotes').select('*', { count: 'exact' });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status as DbQuoteStatus);
      }
      if (filters?.customerName) {
        query = query.ilike('client_name', `%${filters.customerName}%`);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString());
      }

      // Apply sorting — map camelCase sortBy to snake_case Postgres columns
      const SORT_COLUMN_MAP: Record<string, string> = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        quoteRef: 'quote_ref',
      };
      const rawSortBy = options.sortBy || 'createdAt';
      const sortBy = SORT_COLUMN_MAP[rawSortBy] || rawSortBy;
      const ascending = options.sortOrder === 'asc';
      query = query.order(sortBy, { ascending });

      // Apply pagination
      const offset = (options.page - 1) * options.pageSize;
      query = query.range(offset, offset + options.pageSize - 1);

      const { data, count, error } = await query;

      if (error) {
        console.error('Error listing quotes:', error);
        return {
          items: [],
          total: 0,
          page: options.page,
          pageSize: options.pageSize,
          totalPages: 0,
        };
      }

      return {
        items: (data || []).map(dbRowToStoredQuote),
        total: count || 0,
        page: options.page,
        pageSize: options.pageSize,
        totalPages: Math.ceil((count || 0) / options.pageSize),
      };
    } catch (error) {
      console.error('Error listing quotes from Supabase:', error);
      return {
        items: [],
        total: 0,
        page: options.page,
        pageSize: options.pageSize,
        totalPages: 0,
      };
    }
  }

  async searchQuotes(query: string): Promise<StoredQuote[]> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .or(`quote_ref.ilike.%${sanitizePostgrestValue(query)}%,client_name.ilike.%${sanitizePostgrestValue(query)}%,contact_name.ilike.%${sanitizePostgrestValue(query)}%`)
        .limit(20);

      if (error) {
        console.error('Error searching quotes:', error);
        return [];
      }

      return (data || []).map(dbRowToStoredQuote);
    } catch (error) {
      console.error('Error searching quotes from Supabase:', error);
      return [];
    }
  }

  async duplicateQuote(id: string): Promise<SaveResult> {
    try {
      const original = await this.loadQuote(id);
      if (!original) {
        return {
          success: false,
          id,
          version: 0,
          error: 'Quote not found',
        };
      }

      const nextRef = await this.getNextQuoteRef();

      const newQuote: QuoteState = {
        ...original,
        id: crypto.randomUUID(),
        quoteRef: nextRef,
        version: 1,
        status: 'draft',
        approvalStatus: 'draft',
        submittedBy: '',
        submittedAt: null,
        approvedBy: '',
        approvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return await this.saveQuote(newQuote);
    } catch (error) {
      console.error('Error duplicating quote:', error);
      return {
        success: false,
        id,
        version: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async createRevision(id: string): Promise<SaveResult> {
    try {
      const original = await this.loadQuote(id);
      if (!original) {
        return {
          success: false,
          id,
          version: 0,
          error: 'Quote not found',
        };
      }

      const parts = original.quoteRef.split('.');
      const baseRef = parts[0];
      const revision = parts.length > 1 ? parseInt(parts[1]) : 0;
      const newRevision = revision + 1;
      const newRef = `${baseRef}.${newRevision}`;

      const newQuote: QuoteState = {
        ...original,
        id: crypto.randomUUID(),
        quoteRef: newRef,
        version: 1,
        status: 'draft',
        approvalStatus: 'draft',
        submittedBy: '',
        submittedAt: null,
        approvedBy: '',
        approvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return await this.saveQuote(newQuote);
    } catch (error) {
      console.error('Error creating revision:', error);
      return {
        success: false,
        id,
        version: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deleteQuote(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('quotes').delete().eq('id', id);

      if (error) {
        console.error('Error deleting quote:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error deleting quote from Supabase:', error);
      throw error;
    }
  }

  async getNextQuoteRef(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('generate_next_quote_ref');
      if (error) {
        console.error('getNextQuoteRef RPC error:', error);
        return '2140.0'; // fallback
      }
      return data as string;
    } catch (error) {
      console.error('Error getting next quote ref from Supabase:', error);
      return '2140.0';
    }
  }

  async getMostRecentQuote(): Promise<QuoteState | null> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      return this.dbQuoteToQuoteState(data);
    } catch (error) {
      console.error('Error getting most recent quote:', error);
      return null;
    }
  }

  // ===== Customer Operations =====
  async saveCustomer(customer: Omit<StoredCustomer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error } = await supabase.from('customers').insert({
        id,
        name: customer.name,
        contact_person: customer.contactPerson,
        contact_email: customer.email,
        contact_phone: customer.phone,
        address: customer.address ? JSON.stringify(customer.address) : null,
        created_by: user.id,
        created_at: now,
        updated_at: now,
      });

      if (error) {
        console.error('Error saving customer:', error);
        throw new Error(error.message);
      }

      return id;
    } catch (error) {
      console.error('Error saving customer to Supabase:', error);
      throw error;
    }
  }

  async searchCustomers(query: string): Promise<StoredCustomer[]> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${sanitizePostgrestValue(query)}%,contact_person.ilike.%${sanitizePostgrestValue(query)}%,contact_email.ilike.%${sanitizePostgrestValue(query)}%`)
        .limit(20);

      if (error) {
        console.error('Error searching customers:', error);
        return [];
      }

      return (data || []).map(this.dbCustomerToStored);
    } catch (error) {
      console.error('Error searching customers from Supabase:', error);
      return [];
    }
  }

  async getCustomer(id: string): Promise<StoredCustomer | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;

      return this.dbCustomerToStored(data);
    } catch (error) {
      console.error('Error getting customer:', error);
      return null;
    }
  }

  async listCustomers(): Promise<StoredCustomer[]> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error listing customers:', error);
        return [];
      }

      return (data || []).map(this.dbCustomerToStored);
    } catch (error) {
      console.error('Error listing customers from Supabase:', error);
      return [];
    }
  }

  // ===== User Operations =====
  async getUser(id: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;

      return data;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async listUsers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error listing users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error listing users from Supabase:', error);
      return [];
    }
  }

  // ===== User Query Operations =====
  async getUsersByRole(role: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', role as DbUserRole)
        .eq('is_active', true);

      if (error) {
        console.error('Error getting users by role:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting users by role from Supabase:', error);
      return [];
    }
  }

  // ===== Configuration Operations =====
  async getCommissionTiers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('commission_tiers')
        .select('*')
        .order('min_margin', { ascending: true });

      if (error) {
        console.error('Error getting commission tiers:', error);
        return [];
      }

      return (data || []).map(this.mapCommissionTier);
    } catch (error) {
      console.error('Error getting commission tiers from Supabase:', error);
      return [];
    }
  }

  async getResidualCurves(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('residual_curves')
        .select('*');

      if (error) {
        console.error('Error getting residual curves:', error);
        return [];
      }

      return (data || []).map(this.mapResidualCurve);
    } catch (error) {
      console.error('Error getting residual curves from Supabase:', error);
      return [];
    }
  }

  // ===== Audit Operations =====
  async logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const { error } = await supabase.from('audit_log').insert({
        user_id: entry.userId,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        changes: entry.changes ? JSON.stringify(entry.changes) : null,
      });
      if (error) {
        console.error('Audit log insert failed:', error.message);
      }
    } catch (error) {
      console.error('Error logging audit entry:', error);
    }
  }

  async getAuditLog(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error getting audit log:', error);
        return [];
      }

      return (data || []).map(this.mapAuditLogEntry);
    } catch (error) {
      console.error('Error getting audit log from Supabase:', error);
      return [];
    }
  }

  // ===== Template Operations =====
  async saveTemplate(template: Omit<StoredTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error } = await supabase.from('templates').insert({
        id,
        type: template.type,
        name: template.name,
        content: template.content,
        is_default: template.isDefault,
        created_at: now,
        updated_at: now,
      });

      if (error) throw new Error(error.message);
      return id;
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }

  async getTemplatesByType(type: StoredTemplate['type']): Promise<StoredTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('type', type)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error getting templates:', error);
        return [];
      }

      return (data || []).map(this.dbTemplateToStored);
    } catch (error) {
      console.error('Error getting templates from Supabase:', error);
      return [];
    }
  }

  async getDefaultTemplate(type: StoredTemplate['type']): Promise<StoredTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('type', type)
        .eq('is_default', true)
        .limit(1)
        .single();

      if (error || !data) return null;
      return this.dbTemplateToStored(data);
    } catch (error) {
      console.error('Error getting default template:', error);
      return null;
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('templates').delete().eq('id', id);
      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  // ===== Company Operations (CRM) =====
  async saveCompany(company: Omit<StoredCompany, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error } = await supabase.from('companies').insert({
        id,
        name: company.name,
        trading_name: company.tradingName || '',
        registration_number: company.registrationNumber || '',
        vat_number: company.vatNumber || '',
        industry: company.industry || '',
        website: company.website || '',
        address: company.address || [],
        city: company.city || '',
        province: company.province || '',
        postal_code: company.postalCode || '',
        country: company.country || 'South Africa',
        phone: company.phone || '',
        email: company.email || '',
        pipeline_stage: company.pipelineStage || 'lead',
        assigned_to: company.assignedTo || null,
        estimated_value: company.estimatedValue || 0,
        credit_limit: company.creditLimit || 0,
        payment_terms: company.paymentTerms || 30,
        tags: company.tags || [],
        notes: company.notes || '',
        created_at: now,
        updated_at: now,
      });

      if (error) throw new Error(error.message);
      return id;
    } catch (error) {
      console.error('Error saving company:', error);
      throw error;
    }
  }

  async updateCompany(id: string, updates: Partial<StoredCompany>): Promise<void> {
    try {
      const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.tradingName !== undefined) dbUpdates.trading_name = updates.tradingName;
      if (updates.registrationNumber !== undefined) dbUpdates.registration_number = updates.registrationNumber;
      if (updates.vatNumber !== undefined) dbUpdates.vat_number = updates.vatNumber;
      if (updates.industry !== undefined) dbUpdates.industry = updates.industry;
      if (updates.website !== undefined) dbUpdates.website = updates.website;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.city !== undefined) dbUpdates.city = updates.city;
      if (updates.province !== undefined) dbUpdates.province = updates.province;
      if (updates.postalCode !== undefined) dbUpdates.postal_code = updates.postalCode;
      if (updates.country !== undefined) dbUpdates.country = updates.country;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.pipelineStage !== undefined) dbUpdates.pipeline_stage = updates.pipelineStage;
      if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo || null;
      if (updates.estimatedValue !== undefined) dbUpdates.estimated_value = updates.estimatedValue;
      if (updates.creditLimit !== undefined) dbUpdates.credit_limit = updates.creditLimit;
      if (updates.paymentTerms !== undefined) dbUpdates.payment_terms = updates.paymentTerms;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { error } = await supabase.from('companies').update(dbUpdates).eq('id', id);
      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  }

  async getCompany(id: string): Promise<StoredCompany | null> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return this.dbCompanyToStored(data);
    } catch (error) {
      console.error('Error getting company:', error);
      return null;
    }
  }

  async listCompanies(): Promise<StoredCompany[]> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error listing companies:', error);
        return [];
      }

      return (data || []).map(this.dbCompanyToStored);
    } catch (error) {
      console.error('Error listing companies from Supabase:', error);
      return [];
    }
  }

  async searchCompanies(query: string): Promise<StoredCompany[]> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .or(`name.ilike.%${sanitizePostgrestValue(query)}%,trading_name.ilike.%${sanitizePostgrestValue(query)}%,email.ilike.%${sanitizePostgrestValue(query)}%`)
        .limit(20);

      if (error) {
        console.error('Error searching companies:', error);
        return [];
      }

      return (data || []).map(this.dbCompanyToStored);
    } catch (error) {
      console.error('Error searching companies from Supabase:', error);
      return [];
    }
  }

  async deleteCompany(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  }

  // ===== Contact Operations (CRM) =====
  async saveContact(contact: Omit<StoredContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error } = await supabase.from('contacts').insert({
        id,
        company_id: contact.companyId,
        first_name: contact.firstName,
        last_name: contact.lastName || '',
        title: contact.title || '',
        email: contact.email || '',
        phone: contact.phone || '',
        is_primary: contact.isPrimary || false,
        created_at: now,
        updated_at: now,
      });

      if (error) throw new Error(error.message);
      return id;
    } catch (error) {
      console.error('Error saving contact:', error);
      throw error;
    }
  }

  async updateContact(id: string, updates: Partial<StoredContact>): Promise<void> {
    try {
      const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.isPrimary !== undefined) dbUpdates.is_primary = updates.isPrimary;

      const { error } = await supabase.from('contacts').update(dbUpdates).eq('id', id);
      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  async getContactsByCompany(companyId: string): Promise<StoredContact[]> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('is_primary', { ascending: false });

      if (error) {
        console.error('Error getting contacts:', error);
        return [];
      }

      return (data || []).map(this.dbContactToStored);
    } catch (error) {
      console.error('Error getting contacts from Supabase:', error);
      return [];
    }
  }

  async deleteContact(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  // ===== Activity Operations (CRM) =====
  async saveActivity(activity: Omit<StoredActivity, 'id' | 'createdAt'>): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error } = await supabase.from('activities').insert({
        id,
        company_id: activity.companyId,
        contact_id: activity.contactId || null,
        quote_id: activity.quoteId || null,
        type: activity.type,
        title: activity.title,
        description: activity.description || '',
        due_date: activity.dueDate || null,
        created_by: activity.createdBy || null,
        created_at: now,
      });

      if (error) throw new Error(error.message);
      return id;
    } catch (error) {
      console.error('Error saving activity:', error);
      throw error;
    }
  }

  async getActivitiesByCompany(companyId: string, limit = 50): Promise<StoredActivity[]> {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting activities:', error);
        return [];
      }

      return (data || []).map(this.dbActivityToStored);
    } catch (error) {
      console.error('Error getting activities from Supabase:', error);
      return [];
    }
  }

  async getRecentActivities(limit: number): Promise<StoredActivity[]> {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting recent activities:', error);
        return [];
      }

      return (data || []).map(this.dbActivityToStored);
    } catch (error) {
      console.error('Error getting recent activities from Supabase:', error);
      return [];
    }
  }

  async deleteActivity(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  }

  // ===== Notification Operations =====
  async saveNotification(notification: Omit<StoredNotification, 'id' | 'createdAt'>): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error } = await supabase.from('notifications').insert({
        id,
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message || '',
        entity_type: notification.entityType || null,
        entity_id: notification.entityId || null,
        is_read: false,
        created_at: now,
      });

      if (error) throw new Error(error.message);
      return id;
    } catch (error) {
      console.error('Error saving notification:', error);
      throw error;
    }
  }

  async getNotifications(userId: string, limit = 50): Promise<StoredNotification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting notifications:', error);
        return [];
      }

      return (data || []).map(this.dbNotificationToStored);
    } catch (error) {
      console.error('Error getting notifications from Supabase:', error);
      return [];
    }
  }

  async markNotificationRead(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Error marking notification read:', error);
      throw error;
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Error marking all notifications read:', error);
      throw error;
    }
  }

  // ===== Extended Query Operations =====

  async getContact(id: string): Promise<StoredContact | null> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return this.dbContactToStored(data);
    } catch (error) {
      console.error('Error getting contact:', error);
      return null;
    }
  }

  async getActivitiesByQuote(quoteId: string): Promise<StoredActivity[]> {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting activities by quote:', error);
        return [];
      }

      return (data || []).map(this.dbActivityToStored);
    } catch (error) {
      console.error('Error getting activities by quote from Supabase:', error);
      return [];
    }
  }

  async getQuotesByCompany(companyId: string): Promise<StoredQuote[]> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting quotes by company:', error);
        return [];
      }

      return (data || []).map(dbRowToStoredQuote);
    } catch (error) {
      console.error('Error getting quotes by company from Supabase:', error);
      return [];
    }
  }

  async getQuoteRevisions(baseRef: string): Promise<StoredQuote[]> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .like('quote_ref', `${baseRef}.%`)
        .order('quote_ref', { ascending: false });

      if (error) {
        console.error('Error getting quote revisions:', error);
        return [];
      }

      return (data || []).map(dbRowToStoredQuote);
    } catch (error) {
      console.error('Error getting quote revisions from Supabase:', error);
      return [];
    }
  }

  async getTemplate(id: string): Promise<StoredTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return this.dbTemplateToStored(data);
    } catch (error) {
      console.error('Error getting template:', error);
      return null;
    }
  }

  async listAllActivities(): Promise<StoredActivity[]> {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error listing all activities:', error);
        return [];
      }

      return (data || []).map(this.dbActivityToStored);
    } catch (error) {
      console.error('Error listing all activities from Supabase:', error);
      return [];
    }
  }

  async getTableCounts(): Promise<Record<string, number>> {
    try {
      const tables = ['quotes', 'companies', 'contacts', 'activities', 'users', 'notifications'] as const;
      const results = await Promise.all(
        tables.map(async (table) => {
          let { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          if (error) {
            const fallback = await supabase
              .from(table)
              .select('id', { count: 'exact' })
              .limit(1);
            count = fallback.count;
            error = fallback.error;
          }
          return { table, count: error ? 0 : (count || 0) };
        })
      );

      return results.reduce((acc, { table, count }) => {
        acc[table] = count;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      console.error('Error getting table counts:', error);
      return {};
    }
  }

  async listAuditLog(filters?: { entityType?: string; userId?: string }): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error listing audit log:', error);
        return [];
      }

      return (data || []).map(this.mapAuditLogEntry);
    } catch (error) {
      console.error('Error listing audit log from Supabase:', error);
      return [];
    }
  }

  async getSettings(): Promise<Record<string, string>> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*');

      if (error) {
        console.error('Error getting settings:', error);
        return {};
      }

      return (data || []).reduce((acc: Record<string, string>, row: any) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
    } catch (error) {
      console.error('Error getting settings from Supabase:', error);
      return {};
    }
  }

  async saveSettings(entries: { key: string; value: string }[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert(entries, { onConflict: 'key' });

      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  async saveCommissionTiers(tiers: any[]): Promise<void> {
    try {
      // Clear existing tiers
      const { error: deleteError } = await supabase.from('commission_tiers').delete().neq('id', '');
      if (deleteError) throw new Error(deleteError.message);

      if (tiers.length > 0) {
        const dbTiers = tiers.map((t) => ({
          id: t.id || crypto.randomUUID(),
          min_margin: t.minMargin,
          max_margin: t.maxMargin,
          commission_rate: t.commissionRate,
        })) as unknown as Database['public']['Tables']['commission_tiers']['Insert'][];

        const { error } = await supabase.from('commission_tiers').insert(dbTiers);
        if (error) throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error saving commission tiers:', error);
      throw error;
    }
  }

  async saveResidualCurves(curves: any[]): Promise<void> {
    try {
      // Clear existing curves
      const { error: deleteError } = await supabase.from('residual_curves').delete().neq('id', '');
      if (deleteError) throw new Error(deleteError.message);

      if (curves.length > 0) {
        const dbCurves = curves.map((c) => ({
          id: c.id || crypto.randomUUID(),
          term: c.term,
          residual_pct: c.residualPct,
          model_family: c.modelFamily || '',
        })) as unknown as Database['public']['Tables']['residual_curves']['Insert'][];

        const { error } = await supabase.from('residual_curves').insert(dbCurves);
        if (error) throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error saving residual curves:', error);
      throw error;
    }
  }

  async getAttachmentsByIds(ids: string[]): Promise<{ id: string; eurCost: number }[]> {
    try {
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from('attachments')
        .select('id, eur_cost')
        .in('id', ids);

      if (error) {
        console.error('Error getting attachments by IDs:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        eurCost: Number(row.eur_cost) || 0,
      }));
    } catch (error) {
      console.error('Error getting attachments from Supabase:', error);
      return [];
    }
  }

  async countQuotesSince(date: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', date);

      if (error) {
        console.error('Error counting quotes since date:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error counting quotes from Supabase:', error);
      return 0;
    }
  }

  // ===== Lead Operations =====
  async saveLead(lead: Omit<StoredLead, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error } = await supabase.from('leads').insert({
        id,
        company_name: lead.companyName,
        trading_name: lead.tradingName || '',
        industry: lead.industry || '',
        website: lead.website || '',
        company_size: lead.companySize || '',
        annual_revenue_estimate: lead.annualRevenueEstimate || '',
        address: lead.address || '',
        city: lead.city || '',
        province: lead.province || '',
        country: lead.country || 'South Africa',
        decision_maker_name: lead.decisionMakerName || '',
        decision_maker_title: lead.decisionMakerTitle || '',
        decision_maker_email: lead.decisionMakerEmail || '',
        decision_maker_phone: lead.decisionMakerPhone || '',
        decision_maker_linkedin: lead.decisionMakerLinkedin || '',
        source_name: lead.sourceName || 'manual',
        source_url: lead.sourceUrl || '',
        ai_confidence: lead.aiConfidence || 0,
        ai_reasoning: lead.aiReasoning || '',
        scraped_at: lead.scrapedAt || null,
        buy_probability: lead.buyProbability || 5,
        qualification_status: lead.qualificationStatus || 'new',
        qualified_by: lead.qualifiedBy || null,
        qualified_at: lead.qualifiedAt || null,
        rejection_reason: lead.rejectionReason || '',
        converted_company_id: lead.convertedCompanyId || null,
        converted_contact_id: lead.convertedContactId || null,
        converted_at: lead.convertedAt || null,
        converted_by: lead.convertedBy || null,
        tags: lead.tags || [],
        notes: lead.notes || '',
        assigned_to: lead.assignedTo || null,
        created_by: lead.createdBy || null,
        created_at: now,
        updated_at: now,
      });

      if (error) throw new Error(error.message);
      return id;
    } catch (error) {
      console.error('Error saving lead:', error);
      throw error;
    }
  }

  async updateLead(id: string, updates: Partial<StoredLead>): Promise<void> {
    try {
      const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName;
      if (updates.tradingName !== undefined) dbUpdates.trading_name = updates.tradingName;
      if (updates.industry !== undefined) dbUpdates.industry = updates.industry;
      if (updates.website !== undefined) dbUpdates.website = updates.website;
      if (updates.companySize !== undefined) dbUpdates.company_size = updates.companySize;
      if (updates.annualRevenueEstimate !== undefined) dbUpdates.annual_revenue_estimate = updates.annualRevenueEstimate;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.city !== undefined) dbUpdates.city = updates.city;
      if (updates.province !== undefined) dbUpdates.province = updates.province;
      if (updates.country !== undefined) dbUpdates.country = updates.country;
      if (updates.decisionMakerName !== undefined) dbUpdates.decision_maker_name = updates.decisionMakerName;
      if (updates.decisionMakerTitle !== undefined) dbUpdates.decision_maker_title = updates.decisionMakerTitle;
      if (updates.decisionMakerEmail !== undefined) dbUpdates.decision_maker_email = updates.decisionMakerEmail;
      if (updates.decisionMakerPhone !== undefined) dbUpdates.decision_maker_phone = updates.decisionMakerPhone;
      if (updates.decisionMakerLinkedin !== undefined) dbUpdates.decision_maker_linkedin = updates.decisionMakerLinkedin;
      if (updates.sourceName !== undefined) dbUpdates.source_name = updates.sourceName;
      if (updates.sourceUrl !== undefined) dbUpdates.source_url = updates.sourceUrl;
      if (updates.aiConfidence !== undefined) dbUpdates.ai_confidence = updates.aiConfidence;
      if (updates.aiReasoning !== undefined) dbUpdates.ai_reasoning = updates.aiReasoning;
      if (updates.scrapedAt !== undefined) dbUpdates.scraped_at = updates.scrapedAt;
      if (updates.buyProbability !== undefined) dbUpdates.buy_probability = updates.buyProbability;
      if (updates.qualificationStatus !== undefined) dbUpdates.qualification_status = updates.qualificationStatus;
      if (updates.qualifiedBy !== undefined) dbUpdates.qualified_by = updates.qualifiedBy || null;
      if (updates.qualifiedAt !== undefined) dbUpdates.qualified_at = updates.qualifiedAt || null;
      if (updates.rejectionReason !== undefined) dbUpdates.rejection_reason = updates.rejectionReason;
      if (updates.convertedCompanyId !== undefined) dbUpdates.converted_company_id = updates.convertedCompanyId || null;
      if (updates.convertedContactId !== undefined) dbUpdates.converted_contact_id = updates.convertedContactId || null;
      if (updates.convertedAt !== undefined) dbUpdates.converted_at = updates.convertedAt || null;
      if (updates.convertedBy !== undefined) dbUpdates.converted_by = updates.convertedBy || null;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo || null;

      const { error } = await supabase.from('leads').update(dbUpdates).eq('id', id);
      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  }

  async getLead(id: string): Promise<StoredLead | null> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return this.dbLeadToStored(data);
    } catch (error) {
      console.error('Error getting lead:', error);
      return null;
    }
  }

  async listLeads(
    options: LeadPaginationOptions,
    filters?: LeadFilter
  ): Promise<PaginatedResult<StoredLead>> {
    try {
      let query = supabase.from('leads').select('*', { count: 'exact' });

      // Apply filters
      if (filters?.status) {
        query = query.eq('qualification_status', filters.status);
      }
      if (filters?.source) {
        query = query.eq('source_name', filters.source);
      }
      if (filters?.province) {
        query = query.eq('province', filters.province);
      }
      if (filters?.industry) {
        query = query.ilike('industry', `%${sanitizePostgrestValue(filters.industry)}%`);
      }
      if (filters?.minScore) {
        query = query.gte('buy_probability', filters.minScore);
      }
      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }
      if (filters?.search) {
        const term = `%${sanitizePostgrestValue(filters.search)}%`;
        query = query.or(`company_name.ilike.${term},decision_maker_name.ilike.${term},decision_maker_email.ilike.${term},industry.ilike.${term},city.ilike.${term}`);
      }

      // Apply sorting
      const SORT_COLUMN_MAP: Record<string, string> = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        buyProbability: 'buy_probability',
        companyName: 'company_name',
        aiConfidence: 'ai_confidence',
      };
      const rawSortBy = options.sortBy || 'createdAt';
      const sortBy = SORT_COLUMN_MAP[rawSortBy] || rawSortBy;
      const ascending = options.sortOrder === 'asc';
      query = query.order(sortBy, { ascending });

      // Apply pagination
      const offset = (options.page - 1) * options.pageSize;
      query = query.range(offset, offset + options.pageSize - 1);

      const { data, count, error } = await query;

      if (error) {
        console.error('Error listing leads:', error);
        return { items: [], total: 0, page: options.page, pageSize: options.pageSize, totalPages: 0 };
      }

      return {
        items: (data || []).map(this.dbLeadToStored),
        total: count || 0,
        page: options.page,
        pageSize: options.pageSize,
        totalPages: Math.ceil((count || 0) / options.pageSize),
      };
    } catch (error) {
      console.error('Error listing leads from Supabase:', error);
      return { items: [], total: 0, page: options.page, pageSize: options.pageSize, totalPages: 0 };
    }
  }

  async searchLeads(query: string): Promise<StoredLead[]> {
    try {
      const q = sanitizePostgrestValue(query);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .or(`company_name.ilike.%${q}%,decision_maker_name.ilike.%${q}%,decision_maker_email.ilike.%${q}%,industry.ilike.%${q}%,city.ilike.%${q}%`)
        .limit(50);

      if (error) {
        console.error('Error searching leads:', error);
        return [];
      }

      return (data || []).map(this.dbLeadToStored);
    } catch (error) {
      console.error('Error searching leads from Supabase:', error);
      return [];
    }
  }

  async deleteLead(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw error;
    }
  }

  async getLeadStats(): Promise<LeadStats> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('qualification_status, buy_probability, ai_confidence, source_name, industry, province');

      if (error || !data) {
        console.error('Error getting lead stats:', error);
        return this.emptyLeadStats();
      }

      const allStatuses: QualificationStatus[] = ['new', 'reviewing', 'qualified', 'rejected', 'contacted', 'converted', 'stale'];
      const byStatus = {} as Record<QualificationStatus, number>;
      allStatuses.forEach((s) => { byStatus[s] = 0; });

      const bySource: Record<string, number> = {};
      const byIndustry: Record<string, number> = {};
      const byProvince: Record<string, number> = {};
      const scoreDistribution: Record<number, number> = {};
      for (let i = 1; i <= 10; i++) scoreDistribution[i] = 0;

      let totalScore = 0;
      let totalConfidence = 0;
      let hotLeads = 0;

      for (const row of data) {
        const status = row.qualification_status as QualificationStatus;
        if (byStatus[status] !== undefined) byStatus[status]++;

        const score = Number(row.buy_probability) || 0;
        const confidence = Number(row.ai_confidence) || 0;
        totalScore += score;
        totalConfidence += confidence;

        if (score >= 8) hotLeads++;
        if (score >= 1 && score <= 10) scoreDistribution[score]++;

        const src = row.source_name || 'unknown';
        bySource[src] = (bySource[src] || 0) + 1;

        const ind = row.industry || 'Unknown';
        if (ind) byIndustry[ind] = (byIndustry[ind] || 0) + 1;

        const prov = row.province || 'Unknown';
        if (prov) byProvince[prov] = (byProvince[prov] || 0) + 1;
      }

      const total = data.length;
      return {
        total,
        byStatus,
        averageScore: total > 0 ? Math.round((totalScore / total) * 10) / 10 : 0,
        averageConfidence: total > 0 ? Math.round(totalConfidence / total) : 0,
        bySource,
        byIndustry,
        byProvince,
        hotLeads,
        scoreDistribution,
      };
    } catch (error) {
      console.error('Error getting lead stats from Supabase:', error);
      return this.emptyLeadStats();
    }
  }

  async bulkUpdateLeadStatus(ids: string[], status: StoredLead['qualificationStatus']): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ qualification_status: status, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Error bulk updating lead status:', error);
      throw error;
    }
  }

  // ===== Helper Methods =====
  /**
   * Convert database quote to QuoteState format
   */
  private dbQuoteToQuoteState(dbQuote: any): QuoteState {
    return {
      id: dbQuote.id,
      quoteRef: dbQuote.quote_ref,
      quoteDate: new Date(dbQuote.quote_date || Date.now()),
      status: dbQuote.status,
      clientName: dbQuote.client_name,
      contactName: dbQuote.contact_name,
      contactTitle: dbQuote.contact_title || '',
      contactEmail: dbQuote.contact_email || '',
      contactPhone: dbQuote.contact_phone || '',
      clientAddress: (() => { try { return JSON.parse(dbQuote.client_address || '[]'); } catch { return []; } })(),
      factoryROE: Number(dbQuote.factory_roe) || 0,
      customerROE: Number(dbQuote.customer_roe) || 0,
      discountPct: Number(dbQuote.discount_pct) || 0,
      annualInterestRate: Number(dbQuote.annual_interest_rate) || 0,
      defaultLeaseTermMonths: (Number(dbQuote.default_lease_term_months) || 60) as LeaseTermMonths,
      batteryChemistryLock: dbQuote.battery_chemistry_lock,
      quoteType: dbQuote.quote_type,
      slots: (() => { try { return JSON.parse(dbQuote.slots || '[]'); } catch { return []; } })(),
      shippingEntries: (() => {
        const defaultEntry = [{
          id: crypto.randomUUID(),
          description: '',
          containerType: "40' standard",
          quantity: 1,
          costZAR: 0,
          source: 'manual' as const,
        }];
        try {
          const raw = dbQuote.shipping_entries;
          let entries: any[];
          if (Array.isArray(raw)) {
            entries = raw.length > 0 ? raw : defaultEntry;
          } else {
            const parsed = raw ? JSON.parse(raw) : [];
            entries = Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultEntry;
          }
          // Normalize: ensure every entry has source field
          return entries.map((entry: any) => ({
            ...entry,
            source: entry.source || 'manual',
          }));
        } catch {
          return defaultEntry;
        }
      })(),

      // Approval Workflow
      approvalTier: dbQuote.approval_tier || undefined,
      approvalStatus: dbQuote.approval_status || undefined,
      approvalNotes: dbQuote.approval_notes || undefined,
      overrideIRR: dbQuote.override_irr || false,
      submittedBy: dbQuote.submitted_by || undefined,
      submittedAt: dbQuote.submitted_at ? new Date(dbQuote.submitted_at) : null,
      approvedBy: dbQuote.approved_by || undefined,
      approvedAt: dbQuote.approved_at ? new Date(dbQuote.approved_at) : null,

      // Chain-based approval
      currentAssigneeId: dbQuote.current_assignee_id || null,
      currentAssigneeRole: dbQuote.current_assignee_role || null,
      approvalChain: (() => { try { return JSON.parse(dbQuote.approval_chain || '[]'); } catch { return []; } })(),

      // Multi-User Ownership & Locking
      createdBy: dbQuote.created_by || '',
      assignedTo: dbQuote.assigned_to || null,
      lockedBy: dbQuote.locked_by || null,
      lockedAt: dbQuote.locked_at ? new Date(dbQuote.locked_at) : null,

      // CRM Integration
      companyId: dbQuote.company_id || undefined,

      // Validity
      validityDays: dbQuote.validity_days ?? 30,

      // Metadata
      createdAt: new Date(dbQuote.created_at || Date.now()),
      updatedAt: new Date(dbQuote.updated_at || Date.now()),
      version: Number(dbQuote.version) || 1,
    };
  }

  private dbCustomerToStored(row: any): StoredCustomer {
    let address: string[] = [];
    if (Array.isArray(row.address)) {
      address = row.address as string[];
    } else if (typeof row.address === 'string') {
      try { address = JSON.parse(row.address); } catch { address = []; }
    }
    return {
      id: row.id,
      name: row.name,
      contactPerson: row.contact_person || '',
      email: row.contact_email || '',
      phone: row.contact_phone || '',
      address,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private dbTemplateToStored(row: any): StoredTemplate {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      content: row.content,
      isDefault: row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private dbCompanyToStored(row: any): StoredCompany {
    return {
      id: row.id,
      name: row.name,
      tradingName: row.trading_name || '',
      registrationNumber: row.registration_number || '',
      vatNumber: row.vat_number || '',
      industry: row.industry || '',
      website: row.website || '',
      address: row.address || [],
      city: row.city || '',
      province: row.province || '',
      postalCode: row.postal_code || '',
      country: row.country || 'South Africa',
      phone: row.phone || '',
      email: row.email || '',
      pipelineStage: row.pipeline_stage || 'lead',
      assignedTo: row.assigned_to || '',
      estimatedValue: Number(row.estimated_value) || 0,
      creditLimit: Number(row.credit_limit) || 0,
      paymentTerms: row.payment_terms || 30,
      tags: row.tags || [],
      notes: row.notes || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private dbContactToStored(row: any): StoredContact {
    return {
      id: row.id,
      companyId: row.company_id,
      firstName: row.first_name,
      lastName: row.last_name || '',
      title: row.title || '',
      email: row.email || '',
      phone: row.phone || '',
      isPrimary: row.is_primary || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private dbActivityToStored(row: any): StoredActivity {
    return {
      id: row.id,
      companyId: row.company_id,
      contactId: row.contact_id || '',
      quoteId: row.quote_id || '',
      type: row.type,
      title: row.title,
      description: row.description || '',
      dueDate: row.due_date || '',
      createdBy: row.created_by || '',
      createdAt: row.created_at,
    };
  }

  private dbNotificationToStored(row: any): StoredNotification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message || '',
      entityType: row.entity_type,
      entityId: row.entity_id,
      isRead: row.is_read,
      createdAt: row.created_at,
    };
  }

  private mapCommissionTier(row: any): any {
    return {
      id: row.id,
      minMargin: Number(row.min_margin) || 0,
      maxMargin: Number(row.max_margin) || 0,
      commissionRate: Number(row.commission_rate) || 0,
    };
  }

  private mapResidualCurve(row: any): any {
    return {
      id: row.id,
      term: Number(row.term) || 0,
      residualPct: Number(row.residual_pct) || 0,
      modelFamily: row.model_family || '',
    };
  }

  private mapAuditLogEntry(row: any): any {
    return {
      id: row.id,
      timestamp: row.timestamp || row.created_at,
      userId: row.user_id,
      userName: row.user_name,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      changes: typeof row.changes === 'string' ? (() => { try { return JSON.parse(row.changes); } catch { return {}; } })() : (row.changes || {}),
      oldValues: row.old_values,
      newValues: row.new_values,
      notes: row.notes,
      targetUserId: row.target_user_id,
      targetUserName: row.target_user_name,
    };
  }

  private dbLeadToStored(row: any): StoredLead {
    return {
      id: row.id,
      companyName: row.company_name || '',
      tradingName: row.trading_name || '',
      industry: row.industry || '',
      website: row.website || '',
      companySize: row.company_size || '',
      annualRevenueEstimate: row.annual_revenue_estimate || '',
      address: row.address || '',
      city: row.city || '',
      province: row.province || '',
      country: row.country || 'South Africa',
      decisionMakerName: row.decision_maker_name || '',
      decisionMakerTitle: row.decision_maker_title || '',
      decisionMakerEmail: row.decision_maker_email || '',
      decisionMakerPhone: row.decision_maker_phone || '',
      decisionMakerLinkedin: row.decision_maker_linkedin || '',
      sourceName: row.source_name || 'manual',
      sourceUrl: row.source_url || '',
      aiConfidence: Number(row.ai_confidence) || 0,
      aiReasoning: row.ai_reasoning || '',
      scrapedAt: row.scraped_at || '',
      buyProbability: Number(row.buy_probability) || 5,
      qualificationStatus: row.qualification_status || 'new',
      qualifiedBy: row.qualified_by || '',
      qualifiedAt: row.qualified_at || '',
      rejectionReason: row.rejection_reason || '',
      convertedCompanyId: row.converted_company_id || '',
      convertedContactId: row.converted_contact_id || '',
      convertedAt: row.converted_at || '',
      convertedBy: row.converted_by || '',
      tags: row.tags || [],
      notes: row.notes || '',
      assignedTo: row.assigned_to || '',
      createdBy: row.created_by || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
    };
  }

  /**
   * Verify that required RPC functions exist in Supabase.
   * Log-only, non-blocking — called on adapter init.
   */
  async verifyRequiredRpcs(): Promise<void> {
    const rpcs = ['generate_next_quote_ref', 'save_quote_if_version'] as const;
    for (const rpc of rpcs) {
      try {
        const { error } = await supabase.rpc(
          rpc,
          rpc === 'generate_next_quote_ref'
            ? undefined
            : { p_id: '00000000-0000-0000-0000-000000000000', p_expected_version: -1, p_data: '{}' }
        );
        // We expect either success or a controlled error — NOT "function does not exist"
        if (error?.message?.includes('does not exist')) {
          console.error(`[HEALTH CHECK] Required RPC "${rpc}" is missing. Run Supabase migrations (supabase-migrations-round4.sql).`);
        }
      } catch {
        // Network errors are fine — we only care about "does not exist"
      }
    }
  }

  private emptyLeadStats(): LeadStats {
    const allStatuses: QualificationStatus[] = ['new', 'reviewing', 'qualified', 'rejected', 'contacted', 'converted', 'stale'];
    const byStatus = {} as Record<QualificationStatus, number>;
    allStatuses.forEach((s) => { byStatus[s] = 0; });
    const scoreDistribution: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) scoreDistribution[i] = 0;
    return { total: 0, byStatus, averageScore: 0, averageConfidence: 0, bySource: {}, byIndustry: {}, byProvince: {}, hotLeads: 0, scoreDistribution };
  }
}
