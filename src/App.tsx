import { useEffect, useState, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/auth/AuthContext';
import LoginPage from './components/auth/LoginPage';
import Dashboard from './Dashboard';
import { lazy, Suspense } from 'react';

const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const QuoteBuilder = lazy(() => import('./components/builder/QuoteBuilder'));
const HomeDashboard = lazy(() => import('./components/dashboard/HomeDashboard'));
const CrmDashboardPage = lazy(() => import('./components/crm/CrmDashboardPage'));
const CustomerListPage = lazy(() => import('./components/crm/CustomerListPage'));
const CustomerDetailPage = lazy(() => import('./components/crm/CustomerDetailPage'));
const ReportsPage = lazy(() => import('./components/crm/reporting/ReportsPage'));
const NotificationsPage = lazy(() => import('./components/notifications/NotificationsPage'));
const QuotesListPage = lazy(() => import('./components/quotes/QuotesListPage'));
const LeadExplorerPage = lazy(() => import('./components/leads/LeadExplorerPage'));
const LeadDetailPage = lazy(() => import('./components/leads/LeadDetailPage'));
const LeadDashboardPage = lazy(() => import('./components/leads/LeadDashboardPage'));
const HotLeadsPage = lazy(() => import('./components/leads/HotLeadsPage'));

import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import NotFoundPage from './components/NotFoundPage';
import { GlobalSearch } from './components/GlobalSearch';

import { useQuoteDB } from './hooks/useQuoteDB';
import { useConfigStore } from './store/useConfigStore';
import { useUnsavedChanges } from './hooks/useUnsavedChanges';
import { useAutoSave } from './hooks/useAutoSave';
import { AutoSaveContextProvider } from './hooks/AutoSaveContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Loader2 } from 'lucide-react';

// Protected route wrapper
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Admin route wrapper - allows any user with admin-level permissions
const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  // system_admin always has access; other roles need at least one admin resource permission
  const isAdmin = user?.role === 'system_admin' ||
    user?.role === 'sales_manager' ||
    user?.role === 'local_leader' ||
    user?.role === 'ceo';
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
};

// Lazy loading fallback
function LazyFallback({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 flex items-center justify-center">
      <div className="glass rounded-xl p-8 flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-brand-500" />
        <div className="text-surface-100 text-lg">{label}</div>
      </div>
    </div>
  );
}

function AppContent() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const { loadMostRecent } = useQuoteDB();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const initialQuoteLoadRef = useRef(false);
  const configLoadedRef = useRef(false);

  // Expose saveNow for the keyboard shortcut so Ctrl+S reuses the same
  // save path as the auto-save debounce (handles version locking, toasts, etc.).
  const autoSave = useAutoSave();

  // Enable unsaved changes warning
  useUnsavedChanges(autoSave.lastSavedAt);

  // Global keyboard shortcuts: Ctrl+S (save), Ctrl+N (new quote), Ctrl+P (PDF)
  // Ctrl+K is intentionally excluded — GlobalSearch.tsx owns that shortcut.
  useKeyboardShortcuts({ onSave: autoSave.saveNow });

  // One-time config load
  useEffect(() => {
    if (configLoadedRef.current) return;
    configLoadedRef.current = true;

    const initializeApp = async () => {
      try {
        await useConfigStore.getState().loadConfig();
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  // Auth-dependent quote load with cancellation
  useEffect(() => {
    if (!isAuthenticated) {
      initialQuoteLoadRef.current = false;
      return;
    }
    if (initialQuoteLoadRef.current) return;
    initialQuoteLoadRef.current = true;

    // /quote route performs id-aware loading in Dashboard.tsx
    if (location.pathname === '/quote') return;
    let cancelled = false;

    const loadQuote = async () => {
      try {
        const loaded = await loadMostRecent();
        if (!cancelled && loaded) {
          // quote loaded
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load recent quote:', error);
        }
      }
    };

    loadQuote();
    return () => { cancelled = true; };
  }, [isAuthenticated, location.pathname, loadMostRecent]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 flex items-center justify-center">
        <div className="glass rounded-xl p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-brand-500" />
          <div className="text-surface-100 text-lg">Initializing Bisedge Quotation Dashboard...</div>
          <div className="text-surface-400 text-sm">Setting up database and loading data</div>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 flex items-center justify-center">
        <div className="glass rounded-xl p-8 max-w-lg">
          <div className="text-red-400 text-xl font-bold mb-4">Initialization Error</div>
          <div className="text-surface-300 mb-4">
            Failed to initialize the application database.
          </div>
          <div className="text-surface-400 text-sm font-mono bg-surface-800 p-4 rounded">
            {initError}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 btn btn-primary w-full"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <AutoSaveContextProvider value={autoSave}>
      <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Home Dashboard — role-aware landing page */}
      <Route path="/" element={
        <RequireAuth>
          <Suspense fallback={<LazyFallback label="Loading Dashboard..." />}>
            <HomeDashboard />
          </Suspense>
        </RequireAuth>
      } />

      {/* CRM Dashboard — legacy route */}
      <Route path="/crm" element={
        <RequireAuth>
          <Suspense fallback={<LazyFallback label="Loading CRM Dashboard..." />}>
            <CrmDashboardPage />
          </Suspense>
        </RequireAuth>
      } />

      {/* Quotes List */}
      <Route path="/quotes" element={
        <RequireAuth>
          <Suspense fallback={<LazyFallback label="Loading Quotes..." />}>
            <QuotesListPage />
          </Suspense>
        </RequireAuth>
      } />

      {/* Customer List */}
      <Route path="/customers" element={
        <RequireAuth>
          <Suspense fallback={<LazyFallback label="Loading Customers..." />}>
            <CustomerListPage />
          </Suspense>
        </RequireAuth>
      } />

      {/* Customer Detail */}
      <Route path="/customers/:id" element={
        <RequireAuth>
          <Suspense fallback={<LazyFallback label="Loading Customer..." />}>
            <CustomerDetailPage />
          </Suspense>
        </RequireAuth>
      } />

      {/* CRM Reports */}
      <Route path="/crm/reports" element={
        <RequireAuth>
          <Suspense fallback={<LazyFallback label="Loading Reports..." />}>
            <ReportsPage />
          </Suspense>
        </RequireAuth>
      } />

      {/* Lead Dashboard — must come before /leads/:id */}
      <Route path="/leads/dashboard" element={
        <RequireAuth>
          <Suspense fallback={<LazyFallback label="Loading Lead Dashboard..." />}>
            <LeadDashboardPage />
          </Suspense>
        </RequireAuth>
      } />

      {/* Hot Leads — must come before /leads/:id */}
      <Route path="/leads/hot" element={
        <RequireAuth>
          <Suspense fallback={<LazyFallback label="Loading Hot Leads..." />}>
            <HotLeadsPage />
          </Suspense>
        </RequireAuth>
      } />

      {/* Lead Explorer */}
      <Route path="/leads" element={
        <RequireAuth>
          <Suspense fallback={<LazyFallback label="Loading Leads..." />}>
            <LeadExplorerPage />
          </Suspense>
        </RequireAuth>
      } />

      {/* Lead Detail */}
      <Route path="/leads/:id" element={
        <RequireAuth>
          <Suspense fallback={<LazyFallback label="Loading Lead..." />}>
            <LeadDetailPage />
          </Suspense>
        </RequireAuth>
      } />

      {/* Quote Dashboard (moved from /) */}
      <Route path="/quote" element={
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      } />

      <Route path="/builder" element={
        <RequireAuth>
          <Suspense fallback={<LazyFallback label="Loading Quote Builder..." />}>
            <QuoteBuilder />
          </Suspense>
        </RequireAuth>
      } />

      <Route path="/admin/*" element={
        <RequireAuth>
          <RequireAdmin>
            <Suspense fallback={<LazyFallback label="Loading Admin..." />}>
              <AdminLayout />
            </Suspense>
          </RequireAdmin>
        </RequireAuth>
      } />

      {/* Notification inbox */}
      <Route path="/notifications" element={
        <RequireAuth>
          <Suspense fallback={<LazyFallback label="Loading Notifications..." />}>
            <NotificationsPage />
          </Suspense>
        </RequireAuth>
      } />

      {/* 404 catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AutoSaveContextProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <ToastProvider />
          <GlobalSearch />
          <AppContent />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
