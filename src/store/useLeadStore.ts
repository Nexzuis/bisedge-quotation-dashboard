import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QualificationStatus, LeadSourceName } from '../types/leads';

interface LeadState {
  viewMode: 'cards' | 'table';
  searchQuery: string;
  statusFilter: QualificationStatus | 'all';
  sourceFilter: LeadSourceName | 'all';
  provinceFilter: string;
  industryFilter: string;
  minScoreFilter: number;
  assignedToFilter: string;
  sortBy: 'createdAt' | 'updatedAt' | 'buyProbability' | 'companyName' | 'aiConfidence';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
  setViewMode: (mode: 'cards' | 'table') => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: QualificationStatus | 'all') => void;
  setSourceFilter: (source: LeadSourceName | 'all') => void;
  setProvinceFilter: (province: string) => void;
  setIndustryFilter: (industry: string) => void;
  setMinScoreFilter: (score: number) => void;
  setAssignedToFilter: (userId: string) => void;
  setSortBy: (sort: LeadState['sortBy']) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS = {
  searchQuery: '',
  statusFilter: 'all' as const,
  sourceFilter: 'all' as const,
  provinceFilter: '',
  industryFilter: '',
  minScoreFilter: 0,
  assignedToFilter: '',
  sortBy: 'createdAt' as const,
  sortOrder: 'desc' as const,
  page: 1,
};

export const useLeadStore = create<LeadState>()(
  persist(
    (set) => ({
      viewMode: 'cards',
      ...DEFAULT_FILTERS,
      pageSize: 24,
      setViewMode: (mode) => set({ viewMode: mode }),
      setSearchQuery: (query) => set({ searchQuery: query, page: 1 }),
      setStatusFilter: (status) => set({ statusFilter: status, page: 1 }),
      setSourceFilter: (source) => set({ sourceFilter: source, page: 1 }),
      setProvinceFilter: (province) => set({ provinceFilter: province, page: 1 }),
      setIndustryFilter: (industry) => set({ industryFilter: industry, page: 1 }),
      setMinScoreFilter: (score) => set({ minScoreFilter: score, page: 1 }),
      setAssignedToFilter: (userId) => set({ assignedToFilter: userId, page: 1 }),
      setSortBy: (sort) => set({ sortBy: sort, page: 1 }),
      setSortOrder: (order) => set({ sortOrder: order, page: 1 }),
      setPage: (page) => set({ page }),
      setPageSize: (size) => set({ pageSize: size, page: 1 }),
      resetFilters: () => set(DEFAULT_FILTERS),
    }),
    {
      name: 'lead-ui-storage',
      partialize: (state) => ({ viewMode: state.viewMode, pageSize: state.pageSize }),
    }
  )
);
