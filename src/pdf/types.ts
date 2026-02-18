/**
 * PDF Quote Data Types
 */

export interface PdfQuoteData {
  quoteRef: string;
  version: number;
  date: string;
  validUntil: string;

  customer: {
    name: string;
    contactPerson: string;
    address: string[];
    phone?: string;
    email?: string;
  };

  units: Array<{
    itemNo: number;
    model: {
      code: string;
      name: string;
      category: string;
      specifications: Record<string, string>;
    };
    battery?: {
      id: string;
      name: string;
      chemistry: string;
      voltage: number;
      capacity: number;
    };
    quantity: number;
    operatingHours: number;
    leaseTerm: number;
    monthlyLeaseRate: number;
    additionalCosts: {
      maintenance: number;
      fleetManagement: number;
      telematics: number;
    };
    totalMonthly: number;
  }>;

  totals: {
    totalMonthly: number;
    leaseTerm: number | null; // null if mixed terms
    totalContractValue: number;
  };

  options: {
    includeSpecs: boolean;
    includeMarketing: boolean;
    quoteType: 'rental' | 'rent-to-own' | 'dual';
    customNotes?: string;
  };

  termsTemplate: TermsTemplate;

  signatory: {
    name: string;
    title: string;
    signature?: string; // base64 image
  };
}

export interface TermsTemplate {
  title: string;
  sections: TermsSection[];
  footer?: string;
}

export interface TermsSection {
  number: string;
  title: string;
  content: string[];
}

export interface PageNumbers {
  cover: number;
  coverLetter: number;
  toc: number;
  lindeFactorStart?: number;
  bisedgePartnerStart?: number;
  specsStart?: number;
  quotationStart: number;
  termsStart: number;
  signatureStart: number;
  total: number;
}
