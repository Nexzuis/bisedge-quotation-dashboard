import {
  IndexedDBQuoteRepository,
  IndexedDBCustomerRepository,
  IndexedDBTemplateRepository,
  IndexedDBAuditRepository,
  IndexedDBCompanyRepository,
  IndexedDBContactRepository,
  IndexedDBActivityRepository,
} from './IndexedDBRepository';
import type {
  IQuoteRepository,
  ICustomerRepository,
  ITemplateRepository,
  IAuditRepository,
  ICompanyRepository,
  IContactRepository,
  IActivityRepository,
  StoredCompany,
  StoredContact,
  StoredActivity,
  StoredQuote,
  SaveResult,
  QuoteFilter,
  PaginationOptions,
  PaginatedResult,
} from './interfaces';
import type { QuoteState } from '../types/quote';
import { getDb } from './DatabaseAdapter';

// Determine mode once at module level
const mode = import.meta.env.VITE_APP_MODE || 'local';
const useHybrid = mode === 'hybrid' || mode === 'cloud';

// ===== Hybrid Wrapper Classes =====
// These delegate to getDb() (HybridDatabaseAdapter) so all saves
// go through the sync queue instead of only to IndexedDB.

class HybridQuoteRepository implements IQuoteRepository {
  async save(quote: QuoteState): Promise<SaveResult> {
    return getDb().saveQuote(quote);
  }
  async load(id: string): Promise<QuoteState | null> {
    return getDb().loadQuote(id);
  }
  async list(options: PaginationOptions, filters?: QuoteFilter): Promise<PaginatedResult<StoredQuote>> {
    return getDb().listQuotes(options, filters);
  }
  async search(query: string): Promise<StoredQuote[]> {
    return getDb().searchQuotes(query);
  }
  async duplicate(id: string): Promise<SaveResult> {
    return getDb().duplicateQuote(id);
  }
  async createRevision(id: string): Promise<SaveResult> {
    return getDb().createRevision(id);
  }
  async delete(id: string): Promise<void> {
    return getDb().deleteQuote(id);
  }
  async getNextQuoteRef(): Promise<string> {
    return getDb().getNextQuoteRef();
  }
  async getMostRecent(): Promise<QuoteState | null> {
    return getDb().getMostRecentQuote();
  }
}

class HybridCompanyRepository implements ICompanyRepository {
  async save(company: Omit<StoredCompany, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return getDb().saveCompany(company);
  }
  async update(id: string, updates: Partial<StoredCompany>): Promise<void> {
    return getDb().updateCompany(id, updates);
  }
  async getById(id: string): Promise<StoredCompany | null> {
    return getDb().getCompany(id);
  }
  async list(): Promise<StoredCompany[]> {
    return getDb().listCompanies();
  }
  async search(query: string): Promise<StoredCompany[]> {
    return getDb().searchCompanies(query);
  }
  async updateStage(id: string, stage: StoredCompany['pipelineStage']): Promise<void> {
    return getDb().updateCompany(id, { pipelineStage: stage });
  }
  async delete(id: string): Promise<void> {
    return getDb().deleteCompany(id);
  }
}

class HybridContactRepository implements IContactRepository {
  async save(contact: Omit<StoredContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return getDb().saveContact(contact);
  }
  async update(id: string, updates: Partial<StoredContact>): Promise<void> {
    return getDb().updateContact(id, updates);
  }
  async getByCompany(companyId: string): Promise<StoredContact[]> {
    return getDb().getContactsByCompany(companyId);
  }
  async getPrimary(companyId: string): Promise<StoredContact | null> {
    const contacts = await getDb().getContactsByCompany(companyId);
    return contacts.find(c => c.isPrimary) || null;
  }
  async getById(id: string): Promise<StoredContact | null> {
    // IDatabaseAdapter doesn't have getContactById — fall back to IndexedDB
    // This is safe because HybridAdapter caches cloud data locally
    const fallback = new IndexedDBContactRepository();
    return fallback.getById(id);
  }
  async delete(id: string): Promise<void> {
    return getDb().deleteContact(id);
  }
}

class HybridActivityRepository implements IActivityRepository {
  async save(activity: Omit<StoredActivity, 'id' | 'createdAt'>): Promise<string> {
    return getDb().saveActivity(activity);
  }
  async getByCompany(companyId: string, limit?: number): Promise<StoredActivity[]> {
    return getDb().getActivitiesByCompany(companyId, limit);
  }
  async getRecent(limit: number): Promise<StoredActivity[]> {
    return getDb().getRecentActivities(limit);
  }
  async getByQuote(quoteId: string): Promise<StoredActivity[]> {
    // IDatabaseAdapter doesn't have getByQuote — fall back to IndexedDB
    // This is safe because HybridAdapter caches cloud data locally
    const fallback = new IndexedDBActivityRepository();
    return fallback.getByQuote(quoteId);
  }
  async delete(id: string): Promise<void> {
    return getDb().deleteActivity(id);
  }
}

// Singleton instances
let quoteRepository: IQuoteRepository | null = null;
let customerRepository: ICustomerRepository | null = null;
let templateRepository: ITemplateRepository | null = null;
let auditRepository: IAuditRepository | null = null;
let companyRepository: ICompanyRepository | null = null;
let contactRepository: IContactRepository | null = null;
let activityRepository: IActivityRepository | null = null;

/**
 * Get Quote Repository singleton
 */
export function getQuoteRepository(): IQuoteRepository {
  if (!quoteRepository) {
    quoteRepository = useHybrid ? new HybridQuoteRepository() : new IndexedDBQuoteRepository();
  }
  return quoteRepository;
}

/**
 * Get Customer Repository singleton
 */
export function getCustomerRepository(): ICustomerRepository {
  if (!customerRepository) {
    customerRepository = new IndexedDBCustomerRepository();
  }
  return customerRepository;
}

/**
 * Get Template Repository singleton
 */
export function getTemplateRepository(): ITemplateRepository {
  if (!templateRepository) {
    templateRepository = new IndexedDBTemplateRepository();
  }
  return templateRepository;
}

/**
 * Get Audit Repository singleton
 */
export function getAuditRepository(): IAuditRepository {
  if (!auditRepository) {
    auditRepository = new IndexedDBAuditRepository();
  }
  return auditRepository;
}

/**
 * Get Company Repository singleton
 */
export function getCompanyRepository(): ICompanyRepository {
  if (!companyRepository) {
    companyRepository = useHybrid ? new HybridCompanyRepository() : new IndexedDBCompanyRepository();
  }
  return companyRepository;
}

/**
 * Get Contact Repository singleton
 */
export function getContactRepository(): IContactRepository {
  if (!contactRepository) {
    contactRepository = useHybrid ? new HybridContactRepository() : new IndexedDBContactRepository();
  }
  return contactRepository;
}

/**
 * Get Activity Repository singleton
 */
export function getActivityRepository(): IActivityRepository {
  if (!activityRepository) {
    activityRepository = useHybrid ? new HybridActivityRepository() : new IndexedDBActivityRepository();
  }
  return activityRepository;
}
