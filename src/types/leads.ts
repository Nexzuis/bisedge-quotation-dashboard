export type QualificationStatus = 'new' | 'reviewing' | 'qualified' | 'rejected' | 'contacted' | 'converted' | 'stale';
export type LeadSourceName = 'google' | 'linkedin' | 'industry_directory' | 'trade_show' | 'referral' | 'website' | 'manual' | 'ai_scraper';
export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+' | '';

export interface Lead {
  id: string;
  companyName: string;
  tradingName: string;
  industry: string;
  website: string;
  companySize: CompanySize;
  annualRevenueEstimate: string;
  address: string;
  city: string;
  province: string;
  country: string;
  decisionMakerName: string;
  decisionMakerTitle: string;
  decisionMakerEmail: string;
  decisionMakerPhone: string;
  decisionMakerLinkedin: string;
  sourceName: LeadSourceName;
  sourceUrl: string;
  aiConfidence: number;        // 0-100
  aiReasoning: string;
  scrapedAt: string;
  buyProbability: number;      // 1-10
  qualificationStatus: QualificationStatus;
  qualifiedBy: string;
  qualifiedAt: string;
  rejectionReason: string;
  convertedCompanyId: string;
  convertedContactId: string;
  convertedAt: string;
  convertedBy: string;
  tags: string[];
  notes: string;
  assignedTo: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilter {
  status?: QualificationStatus;
  source?: LeadSourceName;
  province?: string;
  industry?: string;
  minScore?: number;
  assignedTo?: string;
  search?: string;
}

export interface LeadPaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'buyProbability' | 'companyName' | 'aiConfidence';
  sortOrder?: 'asc' | 'desc';
}

export interface LeadStats {
  total: number;
  byStatus: Record<QualificationStatus, number>;
  averageScore: number;
  averageConfidence: number;
  bySource: Record<string, number>;
  byIndustry: Record<string, number>;
  byProvince: Record<string, number>;
  hotLeads: number;
  scoreDistribution: Record<number, number>; // buy_probability 1-10 → count
}
