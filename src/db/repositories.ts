import type {
  IQuoteRepository,
  ICustomerRepository,
  ITemplateRepository,
  IAuditRepository,
  ICompanyRepository,
  IContactRepository,
  IActivityRepository,
  StoredQuote,
  SaveResult,
  QuoteFilter,
  PaginationOptions,
  PaginatedResult,
} from './interfaces';
import type { QuoteState } from '../types/quote';
import { getDb } from './DatabaseAdapter';

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
    const db = getDb();
    quoteRepository = {
      save: (quote: QuoteState): Promise<SaveResult> => db.saveQuote(quote),
      load: (id: string): Promise<QuoteState | null> => db.loadQuote(id),
      list: (options: PaginationOptions, filters?: QuoteFilter): Promise<PaginatedResult<StoredQuote>> => db.listQuotes(options, filters),
      search: (query: string): Promise<StoredQuote[]> => db.searchQuotes(query),
      duplicate: (id: string): Promise<SaveResult> => db.duplicateQuote(id),
      createRevision: (id: string): Promise<SaveResult> => db.createRevision(id),
      delete: (id: string): Promise<void> => db.deleteQuote(id),
      getNextQuoteRef: (): Promise<string> => db.getNextQuoteRef(),
      getMostRecent: (): Promise<QuoteState | null> => db.getMostRecentQuote(),
    };
  }
  return quoteRepository;
}

/**
 * Get Customer Repository singleton
 */
export function getCustomerRepository(): ICustomerRepository {
  if (!customerRepository) {
    const db = getDb();
    customerRepository = {
      save: (customer) => db.saveCustomer(customer),
      search: (query) => db.searchCustomers(query),
      getById: (id) => db.getCustomer(id),
      list: () => db.listCustomers(),
    };
  }
  return customerRepository;
}

/**
 * Get Template Repository singleton
 */
export function getTemplateRepository(): ITemplateRepository {
  if (!templateRepository) {
    const db = getDb();
    templateRepository = {
      save: (template) => db.saveTemplate(template),
      getByType: (type) => db.getTemplatesByType(type),
      getDefault: (type) => db.getDefaultTemplate(type),
      delete: (id) => db.deleteTemplate(id),
    };
  }
  return templateRepository;
}

/**
 * Get Audit Repository singleton
 */
export function getAuditRepository(): IAuditRepository {
  if (!auditRepository) {
    const db = getDb();
    auditRepository = {
      log: (entry) => db.logAudit(entry),
      getByEntity: (entityType, entityId) => db.getAuditLog(entityType, entityId),
      getRecent: (limit) => db.listAuditLog().then((logs) => logs.slice(0, limit)),
    };
  }
  return auditRepository;
}

/**
 * Get Company Repository singleton
 */
export function getCompanyRepository(): ICompanyRepository {
  if (!companyRepository) {
    const db = getDb();
    companyRepository = {
      save: (company) => db.saveCompany(company),
      update: (id, updates) => db.updateCompany(id, updates),
      getById: (id) => db.getCompany(id),
      list: () => db.listCompanies(),
      search: (query) => db.searchCompanies(query),
      updateStage: (id, stage) => db.updateCompany(id, { pipelineStage: stage }),
      delete: (id) => db.deleteCompany(id),
    };
  }
  return companyRepository;
}

/**
 * Get Contact Repository singleton
 */
export function getContactRepository(): IContactRepository {
  if (!contactRepository) {
    const db = getDb();
    contactRepository = {
      save: (contact) => db.saveContact(contact),
      update: (id, updates) => db.updateContact(id, updates),
      getByCompany: (companyId) => db.getContactsByCompany(companyId),
      getPrimary: async (companyId) => {
        const contacts = await db.getContactsByCompany(companyId);
        return contacts.find((c) => c.isPrimary) || null;
      },
      getById: (id) => db.getContact(id),
      delete: (id) => db.deleteContact(id),
    };
  }
  return contactRepository;
}

/**
 * Get Activity Repository singleton
 */
export function getActivityRepository(): IActivityRepository {
  if (!activityRepository) {
    const db = getDb();
    activityRepository = {
      save: (activity) => db.saveActivity(activity),
      getByCompany: (companyId, limit?) => db.getActivitiesByCompany(companyId, limit),
      getRecent: (limit) => db.getRecentActivities(limit),
      getByQuote: (quoteId) => db.getActivitiesByQuote(quoteId),
      delete: (id) => db.deleteActivity(id),
    };
  }
  return activityRepository;
}
