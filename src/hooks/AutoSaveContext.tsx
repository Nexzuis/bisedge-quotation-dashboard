import { createContext, useContext, type ReactNode } from 'react';
import type { UseAutoSaveResult } from './useAutoSave';

const AutoSaveContext = createContext<UseAutoSaveResult | null>(null);

export function AutoSaveContextProvider({
  value,
  children,
}: {
  value: UseAutoSaveResult;
  children: ReactNode;
}) {
  return <AutoSaveContext.Provider value={value}>{children}</AutoSaveContext.Provider>;
}

export function useAutoSaveContext(): UseAutoSaveResult {
  const context = useContext(AutoSaveContext);
  if (!context) {
    throw new Error('useAutoSaveContext must be used within AutoSaveContextProvider');
  }
  return context;
}
