import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Wand2, Settings, User, LogOut, ChevronDown, BarChart3, ClipboardCheck, List, Zap, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../ui/Badge';
import { NotificationBell } from '../notifications/NotificationBell';
import { ROLE_HIERARCHY, type Role } from '../../auth/permissions';
import { useApprovalCount } from '../../hooks/useApprovalCount';
import { useQuoteDB } from '../../hooks/useQuoteDB';
import { toast } from 'sonner';
import { logger } from '../../utils/logger';

export function CrmTopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const roleLevel = ROLE_HIERARCHY[(user?.role || 'sales_rep') as Role] || 0;
  const isManager = roleLevel >= 2;
  const isAdmin = user?.role === 'system_admin' || user?.role === 'sales_manager' || user?.role === 'local_leader' || user?.role === 'ceo';

  const { count: pendingApprovalCount } = useApprovalCount();
  const { createNewQuote } = useQuoteDB();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await logout();
      } catch {
        toast.error('Logout failed', {
          description: 'Your session could not be closed cleanly. Redirecting to login.',
          duration: 4000,
        });
      }
      navigate('/login');
    }
  };

  const handleNewQuote = async () => {
    try {
      await createNewQuote();
      navigate('/builder');
    } catch (error) {
      logger.error('Failed to create new quote from CrmTopBar:', error);
      toast.error('Failed to start a new quote');
    }
  };

  const getRoleBadgeVariant = (role: string): 'danger' | 'warning' | 'info' | 'brand' | 'success' => {
    switch (role) {
      case 'system_admin': return 'danger';
      case 'ceo': return 'warning';
      case 'local_leader': return 'brand';
      case 'sales_manager': return 'success';
      case 'key_account': return 'info';
      case 'sales_rep': return 'info';
      default: return 'brand';
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Build nav items based on role
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/quotes', label: 'Quotes', icon: List },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/leads', label: 'Leads', icon: Zap },
    { path: '/crm/reports', label: 'Reports', icon: BarChart3 },
    { path: '/builder', label: 'New Quote', icon: Wand2 },
  ];

  // Manager+ gets Approvals with badge
  // Admin gets Admin panel link
  const extraNavItems = [
    ...(isAdmin ? [{ path: '/admin', label: 'Admin', icon: Settings }] : []),
  ];

  const allNavItems = [...navItems, ...extraNavItems];

  return (
    <>
    <div className="glass rounded-xl p-3 mb-4 relative z-30">
      <div className="flex items-center justify-between">
        {/* Left — Nav */}
        {/* Mobile hamburger button */}
        <button
          className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700/50 transition-colors"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop nav items - hidden on mobile */}
        <div className="hidden md:flex items-center gap-1 relative">
          {allNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <motion.button
                key={item.path}
                onClick={() => item.path === '/builder' ? handleNewQuote() : navigate(item.path)}
                whileHover={{ scale: 1.02 }}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'text-brand-400'
                    : 'text-surface-400 hover:text-surface-100 hover:bg-surface-700/50'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 bg-brand-600/20 rounded-lg"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="hidden sm:inline relative z-10">{item.label}</span>
              </motion.button>
            );
          })}

          {/* Approvals nav with badge — Manager+ only */}
          {isManager && (
            <motion.button
              onClick={() => navigate('/admin/approvals')}
              whileHover={{ scale: 1.02 }}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/admin/approvals')
                  ? 'text-brand-400'
                  : 'text-surface-400 hover:text-surface-100 hover:bg-surface-700/50'
              }`}
            >
              {isActive('/admin/approvals') && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 bg-brand-600/20 rounded-lg"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <div className="relative z-10">
                <ClipboardCheck className="w-4 h-4" />
                {pendingApprovalCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                    {pendingApprovalCount > 9 ? '9+' : pendingApprovalCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline relative z-10">Approvals</span>
            </motion.button>
          )}
        </div>

        {/* Right — Notification Bell + User Menu */}
        <div className="flex items-center gap-2">
          <NotificationBell />

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-surface-800/50 hover:bg-surface-700/50 border border-surface-600 rounded-lg transition-colors"
          >
            <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-left hidden md:block">
              <div className="text-sm font-medium text-surface-100">{user?.fullName || user?.username}</div>
              <Badge variant={getRoleBadgeVariant(user?.role || '')} className="text-xs">
                {user?.role?.toUpperCase()}
              </Badge>
            </div>
            <ChevronDown className={`w-4 h-4 text-surface-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 bg-[#111218] border border-surface-600 rounded-lg shadow-xl overflow-hidden z-50"
              >
                <div className="p-3 border-b border-surface-600">
                  <div className="text-sm font-medium text-surface-100">{user?.fullName}</div>
                  <div className="text-xs text-surface-400">{user?.email}</div>
                </div>
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-surface-100 hover:bg-surface-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>{/* end right-side flex wrapper */}
      </div>
    </div>

    {/* Mobile navigation drawer — portaled to body to escape .glass backdrop-filter containing block */}
    {createPortal(
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              className="fixed top-0 left-0 z-50 h-full w-64 bg-[#0c0d12] border-r border-surface-700 p-4 md:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Close button */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-surface-100">Menu</h2>
                <button
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav items */}
              <nav className="flex flex-col gap-1">
                {allNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        if (item.path === '/builder') {
                          handleNewQuote();
                        } else {
                          navigate(item.path);
                        }
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-brand-600/20 text-brand-400'
                          : 'text-surface-400 hover:text-surface-100 hover:bg-surface-700/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                {/* Approvals button with badge — Manager+ only */}
                {isManager && (
                  <button
                    onClick={() => {
                      navigate('/admin/approvals');
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin/approvals')
                        ? 'bg-brand-600/20 text-brand-400'
                        : 'text-surface-400 hover:text-surface-100 hover:bg-surface-700/50'
                    }`}
                  >
                    <div className="relative">
                      <ClipboardCheck className="w-5 h-5" />
                      {pendingApprovalCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                          {pendingApprovalCount > 9 ? '9+' : pendingApprovalCount}
                        </span>
                      )}
                    </div>
                    <span>Approvals</span>
                  </button>
                )}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  );
}
