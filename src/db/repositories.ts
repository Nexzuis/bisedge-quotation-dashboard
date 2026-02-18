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
} from './interfaces';

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
    quoteRepository = new IndexedDBQuoteRepository();
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
    companyRepository = new IndexedDBCompanyRepository();
  }
  return companyRepository;
}

/**
 * Get Contact Repository singleton
 */
export function getContactRepository(): IContactRepository {
  if (!contactRepository) {
    contactRepository = new IndexedDBContactRepository();
  }
  return contactRepository;
}

/**
 * Get Activity Repository singleton
 */
export function getActivityRepository(): IActivityRepository {
  if (!activityRepository) {
    activityRepository = new IndexedDBActivityRepository();
  }
  return activityRepository;
}
