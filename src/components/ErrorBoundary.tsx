import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Detect stale chunk errors after deployment (dynamic import fails because
// old JS filenames no longer exist on the server).
function isChunkLoadError(error: Error): boolean {
  const msg = error.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);

    // Auto-reload once on stale chunk errors (new deployment invalidated old chunks).
    // sessionStorage flag prevents infinite reload loops.
    if (isChunkLoadError(error) && !sessionStorage.getItem('chunk_reload')) {
      sessionStorage.setItem('chunk_reload', '1');
      window.location.reload();
      return;
    }
    // Clear the flag on non-chunk errors so next deployment can auto-reload again
    sessionStorage.removeItem('chunk_reload');
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 flex items-center justify-center p-8">
          <div className="glass rounded-xl p-8 max-w-lg w-full text-center">
            <div className="text-red-400 text-2xl font-bold mb-4">
              Something went wrong
            </div>
            <p className="text-surface-300 mb-4">
              {this.props.fallbackLabel ?? 'An unexpected error occurred.'}
            </p>
            {this.state.error && (
              <div className="text-surface-400 text-sm font-mono bg-surface-800 p-4 rounded mb-6 text-left overflow-auto max-h-40">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="btn btn-primary px-6 py-2"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="btn bg-surface-700 hover:bg-surface-600 text-surface-200 px-6 py-2"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
