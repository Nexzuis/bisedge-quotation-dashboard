/**
 * LLM-Ready Lead Scraper Interfaces
 *
 * These interfaces define the contract for an AI-powered lead scraper.
 * The actual LLM integration is deferred — these types enable future
 * plug-in of any scraping/enrichment engine.
 */

import type { Lead, LeadSourceName } from '../types/leads';

export interface ScrapingConfig {
  sources: LeadSourceName[];
  targetIndustries: string[];
  targetProvinces: string[];
  maxResults: number;
  keywords: string[];
  excludeCompanyNames?: string[];
  minConfidence?: number;
}

export interface ScrapingResult {
  lead: Partial<Lead>;
  duplicateOf?: string; // existing lead id if duplicate detected
}

export interface ScrapingJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  config: ScrapingConfig;
  startedAt: string;
  completedAt?: string;
  resultsFound: number;
  resultsSaved: number;
  duplicatesSkipped: number;
  errors: string[];
}

export interface ILeadScraper {
  scrape(config: ScrapingConfig): Promise<ScrapingResult[]>;
  checkDuplicate(lead: Partial<Lead>): Promise<{ isDuplicate: boolean; existingId?: string }>;
  enrich(leadId: string): Promise<Partial<Lead>>;
  getJobStatus(jobId: string): Promise<ScrapingJob>;
}
