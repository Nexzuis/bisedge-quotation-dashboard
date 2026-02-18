import { db } from './schema';
import type {
  IQuoteRepository,
  ICustomerRepository,
  ITemplateRepository,
  IAuditRepository,
  ICompanyRepository,
  IContactRepository,
  IActivityRepository,
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
  AuditLogEntry,
} from './interfaces';
import type { QuoteState } from '../types/quote';
import { quoteToStored, storedToQuote } from './serialization';

/**
 * IndexedDB Quote Repository Implementation
 */
export class IndexedDBQuoteRepository implements IQuoteRepository {
  /**
   * Save quote with optimistic locking
   */
  async save(quote: QuoteState): Promise<SaveResult> {
    try {
      // Check for version conflicts (optimistic locking)
      const existing = await db.quotes.get(quote.id);
      if (existing && existing.version !== quote.version) {
        return {
          success: false,
          id: quote.id,
          version: existing.version,
          error: 'Version conflict - quote was modified by another session',
        };
      }

      // Increment version and update timestamp
      const updatedQuote = {
        ...quote,
        version: quote.version + 1,
        updatedAt: new Date(),
      };

      // Convert to stored format
      const storedQuote = quoteToStored(updatedQuote);

      // Save to database
      await db.quotes.put(storedQuote);

      return {
        success: true,
        id: updatedQuote.id,
        version: updatedQuote.version,
      };
    } catch (error) {
      console.error('Error saving quote:', error);
      return {
        success: false,
        id: quote.id,
        version: quote.version,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Load quote by ID
   */
  async load(id: string): Promise<QuoteState | null> {
    try {
      const stored = await db.quotes.get(id);
      if (!stored) return null;
      return storedToQuote(stored);
    } catch (error) {
      console.error('Error loading quote:', error);
      return null;
    }
  }

  /**
   * List quotes with pagination and filters
   */
  async list(
    options: PaginationOptions,
    filters?: QuoteFilter
  ): Promise<PaginatedResult<StoredQuote>> {
    try {
      let collection = db.quotes.orderBy(options.sortBy || 'createdAt');

      // Apply sort order
      if (options.sortOrder === 'asc') {
        collection = collection;
      } else {
        collection = collection.reverse();
      }

      // Apply filters
      if (filters) {
        if (filters.status) {
          collection = collection.filter((q) => q.status === filters.status);
        }
        if (filters.customerName) {
          const searchTerm = filters.customerName.toLowerCase();
          collection = collection.filter((q) =>
            q.clientName.toLowerCase().includes(searchTerm)
          );
        }
        if (filters.dateFrom) {
          collection = collection.filter(
            (q) => new Date(q.createdAt) >= filters.dateFrom!
          );
        }
        if (filters.dateTo) {
          collection = collection.filter(
            (q) => new Date(q.createdAt) <= filters.dateTo!
          );
        }
      }

      // Get total count
      const total = await collection.count();

      // Apply pagination
      const offset = (options.page - 1) * options.pageSize;
      const items = await collection.offset(offset).limit(options.pageSize).toArray();

      return {
        items,
        total,
        page: options.page,
        pageSize: options.pageSize,
        totalPages: Math.ceil(total / options.pageSize),
      };
    } catch (error) {
      console.error('Error listing quotes:', error);
      return {
        items: [],
        total: 0,
        page: options.page,
        pageSize: options.pageSize,
        totalPages: 0,
      };
    }
  }

  /**
   * Search quotes by query string
   */
  async search(query: string): Promise<StoredQuote[]> {
    try {
      const searchTerm = query.toLowerCase();
      return await db.quotes
        .filter(
          (q) =>
            q.quoteRef.toLowerCase().includes(searchTerm) ||
            q.clientName.toLowerCase().includes(searchTerm) ||
            q.contactName.toLowerCase().includes(searchTerm)
        )
        .limit(20)
        .toArray();
    } catch (error) {
      console.error('Error searching quotes:', error);
      return [];
    }
  }

  /**
   * Duplicate quote - create new quote with incremented quote ref
   */
  async duplicate(id: string): Promise<SaveResult> {
    try {
      const original = await this.load(id);
      if (!original) {
        return {
          success: false,
          id,
          version: 0,
          error: 'Quote not found',
        };
      }

      // Get next quote reference
      const nextRef = await this.getNextQuoteRef();

      // Create new quote
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

      // Save new quote
      return await this.save(newQuote);
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

  /**
   * Create revision - increment decimal (2142.0 → 2142.1)
   */
  async createRevision(id: string): Promise<SaveResult> {
    try {
      const original = await this.load(id);
      if (!original) {
        return {
          success: false,
          id,
          version: 0,
          error: 'Quote not found',
        };
      }

      // Parse current quote ref
      const parts = original.quoteRef.split('.');
      const baseRef = parts[0];
      const revision = parts.length > 1 ? parseInt(parts[1]) : 0;
      const newRevision = revision + 1;
      const newRef = `${baseRef}.${newRevision}`;

      // Create new quote with incremented revision
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

      // Save new quote
      return await this.save(newQuote);
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

  /**
   * Delete quote
   */
  async delete(id: string): Promise<void> {
    try {
      await db.quotes.delete(id);
    } catch (error) {
      console.error('Error deleting quote:', error);
      throw error;
    }
  }

  /**
   * Get next quote reference (auto-increment)
   */
  async getNextQuoteRef(): Promise<string> {
    try {
      // Get all quotes and find max base reference number
      const allQuotes = await db.quotes.toArray();

      if (allQuotes.length === 0) {
        return '2140.0';
      }

      let maxRef = 2139; // Start from 2139 so first is 2140

      allQuotes.forEach((quote) => {
        // Extract base number (before decimal)
        const parts = quote.quoteRef.split('.');
        const baseNum = parseInt(parts[0]);
        if (!isNaN(baseNum) && baseNum > maxRef) {
          maxRef = baseNum;
        }
      });

      // Return next reference
      return `${maxRef + 1}.0`;
    } catch (error) {
      console.error('Error getting next quote ref:', error);
      return '2140.0';
    }
  }

  /**
   * Get most recently updated quote
   */
  async getMostRecent(): Promise<QuoteState | null> {
    try {
      const quotes = await db.quotes.orderBy('updatedAt').reverse().limit(1).toArray();
      if (quotes.length === 0) return null;
      return storedToQuote(quotes[0]);
    } catch (error) {
      console.error('Error getting most recent quote:', error);
      return null;
    }
  }
}

/**
 * IndexedDB Customer Repository Implementation
 */
export class IndexedDBCustomerRepository implements ICustomerRepository {
  async save(
    customer: Omit<StoredCustomer, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const storedCustomer: StoredCustomer = {
        ...customer,
        id,
        createdAt: now,
        updatedAt: now,
      };

      await db.customers.put(storedCustomer);
      return id;
    } catch (error) {
      console.error('Error saving customer:', error);
      throw error;
    }
  }

  async search(query: string): Promise<StoredCustomer[]> {
    try {
      const searchTerm = query.toLowerCase();
      return await db.customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(searchTerm) ||
            c.contactPerson.toLowerCase().includes(searchTerm) ||
            c.email.toLowerCase().includes(searchTerm)
        )
        .limit(20)
        .toArray();
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  }

  async getById(id: string): Promise<StoredCustomer | null> {
    try {
      return (await db.customers.get(id)) || null;
    } catch (error) {
      console.error('Error getting customer:', error);
      return null;
    }
  }

  async list(): Promise<StoredCustomer[]> {
    try {
      return await db.customers.orderBy('name').toArray();
    } catch (error) {
      console.error('Error listing customers:', error);
      return [];
    }
  }
}

/**
 * IndexedDB Template Repository Implementation
 */
export class IndexedDBTemplateRepository implements ITemplateRepository {
  async save(
    template: Omit<StoredTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const storedTemplate: StoredTemplate = {
        ...template,
        id,
        createdAt: now,
        updatedAt: now,
      };

      await db.templates.put(storedTemplate);
      return id;
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }

  async getByType(type: StoredTemplate['type']): Promise<StoredTemplate[]> {
    try {
      return await db.templates.where('type').equals(type).toArray();
    } catch (error) {
      console.error('Error getting templates by type:', error);
      return [];
    }
  }

  async getDefault(type: StoredTemplate['type']): Promise<StoredTemplate | null> {
    try {
      const templates = await db.templates
        .where('type')
        .equals(type)
        .and((t) => t.isDefault === true)
        .first();
      return templates || null;
    } catch (error) {
      console.error('Error getting default template:', error);
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await db.templates.delete(id);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }
}

/**
 * IndexedDB Audit Repository Implementation
 */
export class IndexedDBAuditRepository implements IAuditRepository {
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };

      await db.auditLog.add(auditEntry);
    } catch (error) {
      console.error('Error logging audit entry:', error);
      throw error;
    }
  }

  async getByEntity(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    try {
      return await db.auditLog
        .where(['entityType', 'entityId'])
        .equals([entityType, entityId])
        .reverse()
        .toArray();
    } catch (error) {
      console.error('Error getting audit logs by entity:', error);
      return [];
    }
  }

  async getRecent(limit: number): Promise<AuditLogEntry[]> {
    try {
      return await db.auditLog.orderBy('timestamp').reverse().limit(limit).toArray();
    } catch (error) {
      console.error('Error getting recent audit logs:', error);
      return [];
    }
  }
}

/**
 * IndexedDB Company Repository Implementation
 */
export class IndexedDBCompanyRepository implements ICompanyRepository {
  async save(company: Omit<StoredCompany, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await db.companies.put({
      ...company,
      id,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  async update(id: string, updates: Partial<StoredCompany>): Promise<void> {
    await db.companies.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async getById(id: string): Promise<StoredCompany | null> {
    return (await db.companies.get(id)) || null;
  }

  async list(): Promise<StoredCompany[]> {
    return await db.companies.orderBy('name').toArray();
  }

  async search(query: string): Promise<StoredCompany[]> {
    const term = query.toLowerCase();
    return await db.companies
      .filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.tradingName.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term)
      )
      .limit(30)
      .toArray();
  }

  async updateStage(id: string, stage: StoredCompany['pipelineStage']): Promise<void> {
    await db.companies.update(id, {
      pipelineStage: stage,
      updatedAt: new Date().toISOString(),
    });
  }

  async delete(id: string): Promise<void> {
    await db.companies.delete(id);
  }
}

/**
 * IndexedDB Contact Repository Implementation
 */
export class IndexedDBContactRepository implements IContactRepository {
  async save(contact: Omit<StoredContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await db.contacts.put({
      ...contact,
      id,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  async update(id: string, updates: Partial<StoredContact>): Promise<void> {
    await db.contacts.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async getByCompany(companyId: string): Promise<StoredContact[]> {
    return await db.contacts.where('companyId').equals(companyId).toArray();
  }

  async getPrimary(companyId: string): Promise<StoredContact | null> {
    return (
      (await db.contacts
        .where('companyId')
        .equals(companyId)
        .and((c) => c.isPrimary === true)
        .first()) || null
    );
  }

  async getById(id: string): Promise<StoredContact | null> {
    return (await db.contacts.get(id)) || null;
  }

  async delete(id: string): Promise<void> {
    await db.contacts.delete(id);
  }
}

/**
 * IndexedDB Activity Repository Implementation
 */
export class IndexedDBActivityRepository implements IActivityRepository {
  async save(activity: Omit<StoredActivity, 'id' | 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID();
    await db.activities.put({
      ...activity,
      id,
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  async getByCompany(companyId: string, limit = 50): Promise<StoredActivity[]> {
    return await db.activities
      .where('companyId')
      .equals(companyId)
      .reverse()
      .limit(limit)
      .sortBy('createdAt')
      .then((arr) => arr.reverse());
  }

  async getRecent(limit: number): Promise<StoredActivity[]> {
    return await db.activities.orderBy('createdAt').reverse().limit(limit).toArray();
  }

  async getByQuote(quoteId: string): Promise<StoredActivity[]> {
    return await db.activities.where('quoteId').equals(quoteId).toArray();
  }

  async delete(id: string): Promise<void> {
    await db.activities.delete(id);
  }
}
