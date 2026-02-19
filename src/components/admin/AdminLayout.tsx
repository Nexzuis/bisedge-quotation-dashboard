import { Routes, Route, Navigate } from 'react-router-dom';
import { Component, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminTopBar from './layout/AdminTopBar';
import AdminSidebar from './layout/AdminSidebar';
import PricingManagement from './pricing/PricingManagement';
import ConfigurationMatrixManagement from './configuration/ConfigurationMatrixManagement';
import UserManagement from './users/UserManagement';
import TemplateManagement from './templates/TemplateManagement';
import AuditLogViewer from './audit/AuditLogViewer';
import BackupRestore from './backup/BackupRestore';
import { ApprovalDashboard } from './approvals/ApprovalDashboard';
import { AlertCircle, RotateCcw, Menu, X, ShieldX } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { hasPermission, type Role } from '../../auth/permissions';

function RequirePermission({ resource, children }: { resource: string; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const allowed = hasPermission(user.role as Role, resource, 'read', user.permissionOverrides);
  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ShieldX className="w-12 h-12 text-red-400" />
        <h3 className="text-xl font-bold text-surface-100">Access Denied</h3>
        <p className="text-surface-400 text-sm">You do not have permission to access this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * Error Boundary for Admin pages.
 * Catches render errors in child components and displays a recovery UI
 * instead of a blank screen.
 */
class AdminErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Admin page error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 m-4">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-red-400 mb-2">
                Something went wrong
              </h3>
              <p className="text-surface-400 mb-4">
                An error occurred while rendering this admin page.
              </p>
              {this.state.error && (
                <pre className="text-red-300 text-sm bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-4 overflow-x-auto">
                  {this.state.error.message}
                </pre>
              )}
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
      <AdminTopBar />

      <div className="flex min-h-[calc(100vh-73px)]">
        {/* Hamburger button — visible only on small screens */}
        <button
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface-800/80 backdrop-blur-sm border border-surface-600/50 text-surface-100 lg:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Sidebar — always visible on lg+, drawer on mobile */}
        <div className="hidden lg:block">
          <AdminSidebar />
        </div>

        {/* Mobile drawer overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              {/* Slide-out sidebar panel */}
              <motion.div
                key="drawer"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed top-0 left-0 z-50 h-full lg:hidden"
              >
                <div className="relative h-full">
                  <button
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700/50 transition-colors"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close navigation"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <AdminSidebar />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 p-8 overflow-auto">
          <AdminErrorBoundary>
            <Routes>
              <Route index element={<Navigate to="pricing" replace />} />
              <Route path="pricing" element={<RequirePermission resource="admin:pricing"><PricingManagement /></RequirePermission>} />
              <Route path="configuration" element={<RequirePermission resource="admin:catalog"><ConfigurationMatrixManagement /></RequirePermission>} />
              <Route path="approvals" element={<RequirePermission resource="approval:review"><ApprovalDashboard /></RequirePermission>} />
              <Route path="users" element={<RequirePermission resource="admin:users"><UserManagement /></RequirePermission>} />
              <Route path="templates" element={<RequirePermission resource="admin:templates"><TemplateManagement /></RequirePermission>} />
              <Route path="audit" element={<RequirePermission resource="admin:audit"><AuditLogViewer /></RequirePermission>} />
              <Route path="backup" element={<RequirePermission resource="admin:backup"><BackupRestore /></RequirePermission>} />
              <Route path="*" element={<Navigate to="pricing" replace />} />
            </Routes>
          </AdminErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
