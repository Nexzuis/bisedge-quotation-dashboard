import { useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, FileText, Wand2, Settings, User, LogOut, ChevronDown, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../ui/Badge';
import { NotificationBell } from '../notifications/NotificationBell';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/crm/reports', label: 'Reports', icon: BarChart3 },
  { path: '/quote', label: 'Quote Dashboard', icon: FileText },
  { path: '/builder', label: 'Quote Builder', icon: Wand2 },
];

export function CrmTopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'system_admin' || user?.role === 'sales_manager' || user?.role === 'local_leader' || user?.role === 'ceo';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
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
    return location.pathname.startsWith(path);
  };

  const allNavItems = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ path: '/admin', label: 'Admin', icon: Settings }] : []),
  ];

  return (
    <div className="glass rounded-xl p-3 mb-4 relative z-30">
      <div className="flex items-center justify-between">
        {/* Left — Nav */}
        <div className="flex items-center gap-1 relative">
          {allNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
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
                className="absolute right-0 top-full mt-2 w-56 bg-surface-800 border border-surface-600 rounded-lg shadow-xl overflow-hidden z-50"
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
  );
}
