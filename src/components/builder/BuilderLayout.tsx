import type { ReactNode } from 'react';
import { BuilderProgressBar } from './BuilderProgressBar';
import { BuilderBottomBar } from './BuilderBottomBar';

interface BuilderLayoutProps {
  children: ReactNode;
}

export function BuilderLayout({ children }: BuilderLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress bar */}
        <BuilderProgressBar />

        {/* Step content */}
        <div className="min-h-[60vh]">
          {children}
        </div>

        {/* Bottom bar */}
        <BuilderBottomBar />
      </div>
    </div>
  );
}
