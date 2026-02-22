import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { BuilderProgressBar } from './BuilderProgressBar';
import { BuilderBottomBar } from './BuilderBottomBar';
import { BuilderTopBar } from './shared/BuilderTopBar';
import { useAutoSaveContext } from '../../hooks/AutoSaveContext';

interface BuilderLayoutProps {
  children: ReactNode;
}

/** Inline save-status indicator shown between the progress bar and step content. */
function SaveStatusBanner() {
  const { status, persistentError } = useAutoSaveContext();

  if (status === 'error' || persistentError) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-lg border border-danger-500/50 bg-danger-500/10 px-4 py-2.5 mb-3 text-sm text-danger-400"
      >
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Save failed — your changes may not be saved. Check your connection and try again.</span>
      </div>
    );
  }

  if (status === 'saving') {
    return (
      <div
        aria-live="polite"
        className="flex items-center gap-2 px-4 py-2 mb-3 text-sm text-surface-400"
      >
        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
        <span>Saving…</span>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div
        aria-live="polite"
        className="flex items-center gap-2 px-4 py-2 mb-3 text-sm text-success-400"
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Saved</span>
      </div>
    );
  }

  // idle — render nothing but keep layout stable
  return null;
}

export function BuilderLayout({ children }: BuilderLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Top navigation bar */}
        <BuilderTopBar />

        {/* Progress bar */}
        <BuilderProgressBar />

        {/* Save status indicator */}
        <SaveStatusBanner />

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
