import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PipelineStage } from '../types/crm';

interface CrmState {
  viewMode: 'kanban' | 'table';
  stageFilter: PipelineStage | 'all';
  stageFilters: (PipelineStage | 'all')[];
  searchQuery: string;
  setViewMode: (mode: 'kanban' | 'table') => void;
  setStageFilter: (stage: PipelineStage | 'all') => void;
  setStageFilters: (stages: (PipelineStage | 'all')[]) => void;
  toggleStageFilter: (stage: PipelineStage) => void;
  setSearchQuery: (query: string) => void;
}

export const useCrmStore = create<CrmState>()(
  persist(
    (set) => ({
      viewMode: 'kanban',
      stageFilter: 'all',
      stageFilters: [],
      searchQuery: '',
      setViewMode: (mode) => set({ viewMode: mode }),
      setStageFilter: (stage) => set({ stageFilter: stage }),
      setStageFilters: (stages) => set({ stageFilters: stages }),
      toggleStageFilter: (stage) =>
        set((state) => {
          const current = state.stageFilters;
          const isSelected = current.includes(stage);
          return {
            stageFilters: isSelected
              ? current.filter((s) => s !== stage)
              : [...current, stage],
          };
        }),
      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    {
      name: 'crm-ui-storage',
      partialize: (state) => ({ viewMode: state.viewMode }),
    }
  )
);
