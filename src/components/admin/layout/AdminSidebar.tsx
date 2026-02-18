import { NavLink } from 'react-router-dom';
import { DollarSign, Users, FileText, History, Database, Settings, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, type Role } from '../../../auth/permissions';

const AdminSidebar = () => {
  const { user } = useAuth();

  const navItems = [
    { path: '/admin/pricing', label: 'Pricing Config', icon: DollarSign, resource: 'admin:pricing' },
    { path: '/admin/configuration', label: 'Configuration Matrices', icon: Settings, resource: 'admin:catalog' },
    { path: '/admin/approvals', label: 'Approvals', icon: ClipboardCheck, resource: 'approval:approve' },
    { path: '/admin/users', label: 'Users', icon: Users, resource: 'admin:users' },
    { path: '/admin/templates', label: 'Templates', icon: FileText, resource: 'admin:templates' },
    { path: '/admin/audit', label: 'Audit Log', icon: History, resource: 'admin:audit' },
    { path: '/admin/backup', label: 'Backup & Restore', icon: Database, resource: 'admin:backup' },
  ];

  // Safely filter nav items - guard against user being null during transitions
  const visibleItems = user
    ? navItems.filter(item => hasPermission(user.role as Role, item.resource, 'read', user.permissionOverrides))
    : [];

  return (
    <div className="w-64 bg-surface-800/40 backdrop-blur-xl border-r border-surface-600/50 min-h-screen p-4">
      <nav className="space-y-2">
        {visibleItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-brand-600/30 text-surface-100 border border-teal-500/50'
                  : 'text-surface-100/60 hover:text-surface-100 hover:bg-surface-800/40'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AdminSidebar;
