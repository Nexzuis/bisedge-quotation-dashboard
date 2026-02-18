// CRM Pipeline Stages
export type PipelineStage =
  | 'lead'
  | 'contacted'
  | 'site-assessment'
  | 'quoted'
  | 'negotiation'
  | 'won'
  | 'lost';

// Activity types for the interaction timeline
export type ActivityType =
  | 'note'
  | 'call'
  | 'email'
  | 'meeting'
  | 'site-visit'
  | 'quote-created'
  | 'quote-sent'
  | 'stage-change';

// Company — the main CRM entity (replaces flat customers table)
export interface Company {
  id: string;
  name: string;
  tradingName: string;
  registrationNumber: string;
  vatNumber: string;
  industry: string;
  website: string;
  address: string[];
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  pipelineStage: PipelineStage;
  assignedTo: string; // userId
  estimatedValue: number;
  creditLimit: number;
  paymentTerms: number; // days
  tags: string[];
  notes: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Contact — people at companies
export interface Contact {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Activity — interaction timeline entries
export interface Activity {
  id: string;
  companyId: string;
  contactId: string;
  quoteId: string;
  type: ActivityType;
  title: string;
  description: string;
  dueDate: string; // ISO string or empty
  createdBy: string; // userId
  createdAt: string; // ISO string
}

// Pipeline metrics for dashboard
export interface PipelineMetrics {
  totalPipelineValue: number;
  activeLeads: number;
  quotesThisMonth: number;
  wonThisMonth: number;
  countByStage: Record<PipelineStage, number>;
  valueByStage: Record<PipelineStage, number>;
}
