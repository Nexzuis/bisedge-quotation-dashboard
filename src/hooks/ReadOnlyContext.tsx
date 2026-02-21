import { createContext, useContext, type ReactNode } from 'react';

export interface ReadOnlyState {
  isReadOnly: boolean;
  readOnlyReason: string | null;
}

const ReadOnlyContext = createContext<ReadOnlyState>({ isReadOnly: false, readOnlyReason: null });

export function ReadOnlyProvider({
  isReadOnly,
  readOnlyReason,
  children,
}: {
  isReadOnly: boolean;
  readOnlyReason?: string | null;
  children: ReactNode;
}) {
  return (
    <ReadOnlyContext.Provider value={{ isReadOnly, readOnlyReason: readOnlyReason ?? null }}>
      {children}
    </ReadOnlyContext.Provider>
  );
}

export function useIsReadOnly(): ReadOnlyState {
  return useContext(ReadOnlyContext);
}
