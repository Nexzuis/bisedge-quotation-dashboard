// ─── Role Definitions ───────────────────────────────────────────────────────

export type Role = 'sales_rep' | 'key_account' | 'sales_manager' | 'local_leader' | 'ceo' | 'system_admin';

export const ROLE_HIERARCHY: Record<Role, number> = {
  sales_rep: 1,
  key_account: 1,
  sales_manager: 2,
  local_leader: 3,
  ceo: 4,
  system_admin: 5,
};

export const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  sales_rep: 'Sales Rep',
  key_account: 'Key Account Manager',
  sales_manager: 'Sales Manager',
  local_leader: 'Local Leader',
  ceo: 'CEO',
  system_admin: 'System Admin',
};

export const ALL_ROLES: Role[] = ['sales_rep', 'key_account', 'sales_manager', 'local_leader', 'ceo', 'system_admin'];

// ─── Permission Override Infrastructure ─────────────────────────────────────

export type PermissionOverrideKey =
  | 'can_view_all_quotes'
  | 'can_skip_approval_levels'
  | 'can_edit_any_quote'
  | 'can_approve_quotes'
  | 'can_manage_users'
  | 'can_manage_pricing'
  | 'can_view_audit_log'
  | 'can_export_data'
  | 'can_manage_templates'
  | 'can_manage_backups';

export type PermissionOverrides = Partial<Record<PermissionOverrideKey, boolean>>;

export const PERMISSION_OVERRIDE_LABELS: Record<PermissionOverrideKey, { label: string; description: string }> = {
  can_view_all_quotes: { label: 'View All Quotes', description: 'Can see quotes from all users, not just their own' },
  can_skip_approval_levels: { label: 'Skip Approval Levels', description: 'Can submit quotes directly to higher-level approvers' },
  can_edit_any_quote: { label: 'Edit Any Quote', description: 'Can edit quotes created by other users' },
  can_approve_quotes: { label: 'Approve Quotes', description: 'Can approve or reject quotes submitted for review' },
  can_manage_users: { label: 'Manage Users', description: 'Can create, edit, and deactivate user accounts' },
  can_manage_pricing: { label: 'Manage Pricing', description: 'Can edit commission tiers, residual curves, and defaults' },
  can_view_audit_log: { label: 'View Audit Log', description: 'Can view the system audit trail' },
  can_export_data: { label: 'Export Data', description: 'Can export quotes and reports to PDF/Excel' },
  can_manage_templates: { label: 'Manage Templates', description: 'Can create and edit document templates' },
  can_manage_backups: { label: 'Manage Backups', description: 'Can create and restore database backups' },
};

export const DEFAULT_PERMISSION_OVERRIDES: Record<Role, PermissionOverrides> = {
  sales_rep: {},
  key_account: { can_view_all_quotes: true },
  sales_manager: { can_approve_quotes: true, can_view_all_quotes: true, can_export_data: true },
  local_leader: { can_approve_quotes: true, can_view_all_quotes: true, can_export_data: true, can_view_audit_log: true },
  ceo: { can_approve_quotes: true, can_view_all_quotes: true, can_export_data: true, can_view_audit_log: true, can_skip_approval_levels: true },
  system_admin: {
    can_view_all_quotes: true,
    can_skip_approval_levels: true,
    can_edit_any_quote: true,
    can_approve_quotes: true,
    can_manage_users: true,
    can_manage_pricing: true,
    can_view_audit_log: true,
    can_export_data: true,
    can_manage_templates: true,
    can_manage_backups: true,
  },
};

// ─── Role-Based Permissions ─────────────────────────────────────────────────

export interface Permission {
  resource: string;
  action: 'read' | 'create' | 'update' | 'delete' | '*';
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  system_admin: [
    { resource: 'quotes', action: '*' },
    { resource: 'quotes:view_all', action: 'read' },
    { resource: 'crm:companies', action: '*' },
    { resource: 'crm:activities', action: '*' },
    { resource: 'admin:pricing', action: '*' },
    { resource: 'admin:catalog', action: '*' },
    { resource: 'admin:users', action: '*' },
    { resource: 'admin:templates', action: '*' },
    { resource: 'admin:audit', action: 'read' },
    { resource: 'admin:backup', action: '*' },
    { resource: 'approval:review', action: '*' },
    { resource: 'approval:approve', action: '*' },
    { resource: 'approval:escalate', action: '*' },
    { resource: 'approval:return', action: '*' },
  ],
  ceo: [
    { resource: 'quotes', action: '*' },
    { resource: 'quotes:view_all', action: 'read' },
    { resource: 'crm:companies', action: '*' },
    { resource: 'crm:activities', action: '*' },
    { resource: 'admin:pricing', action: 'read' },
    { resource: 'admin:audit', action: 'read' },
    { resource: 'approval:review', action: '*' },
    { resource: 'approval:approve', action: '*' },
    { resource: 'approval:escalate', action: '*' },
    { resource: 'approval:return', action: '*' },
  ],
  local_leader: [
    { resource: 'quotes', action: '*' },
    { resource: 'quotes:view_all', action: 'read' },
    { resource: 'crm:companies', action: '*' },
    { resource: 'crm:activities', action: '*' },
    { resource: 'admin:pricing', action: 'read' },
    { resource: 'admin:audit', action: 'read' },
    { resource: 'approval:review', action: '*' },
    { resource: 'approval:approve', action: '*' },
    { resource: 'approval:escalate', action: '*' },
    { resource: 'approval:return', action: '*' },
  ],
  sales_manager: [
    { resource: 'quotes', action: '*' },
    { resource: 'quotes:view_all', action: 'read' },
    { resource: 'crm:companies', action: '*' },
    { resource: 'crm:activities', action: '*' },
    { resource: 'admin:pricing', action: 'read' },
    { resource: 'admin:catalog', action: 'read' },
    { resource: 'admin:templates', action: 'read' },
    { resource: 'approval:review', action: '*' },
    { resource: 'approval:approve', action: '*' },
    { resource: 'approval:escalate', action: '*' },
    { resource: 'approval:return', action: '*' },
  ],
  key_account: [
    { resource: 'quotes', action: 'create' },
    { resource: 'quotes', action: 'read' },
    { resource: 'quotes', action: 'update' },
    { resource: 'crm:companies', action: 'create' },
    { resource: 'crm:companies', action: 'read' },
    { resource: 'crm:companies', action: 'update' },
    { resource: 'crm:activities', action: 'create' },
    { resource: 'crm:activities', action: 'read' },
  ],
  sales_rep: [
    { resource: 'quotes', action: 'create' },
    { resource: 'quotes', action: 'read' },
    { resource: 'quotes', action: 'update' },
    { resource: 'crm:companies', action: 'create' },
    { resource: 'crm:companies', action: 'read' },
    { resource: 'crm:companies', action: 'update' },
    { resource: 'crm:activities', action: 'create' },
    { resource: 'crm:activities', action: 'read' },
  ],
};

// ─── Permission Checking ────────────────────────────────────────────────────

const OVERRIDE_TO_RESOURCE: Partial<Record<PermissionOverrideKey, { resource: string; action: string }>> = {
  can_view_all_quotes: { resource: 'quotes:view_all', action: 'read' },
  can_approve_quotes: { resource: 'approval:approve', action: '*' },
  can_manage_users: { resource: 'admin:users', action: '*' },
  can_manage_pricing: { resource: 'admin:pricing', action: '*' },
  can_view_audit_log: { resource: 'admin:audit', action: 'read' },
  can_export_data: { resource: 'quotes', action: 'read' },
  can_manage_templates: { resource: 'admin:templates', action: '*' },
  can_manage_backups: { resource: 'admin:backup', action: '*' },
  can_edit_any_quote: { resource: 'quotes', action: 'update' },
};

export const hasPermission = (
  role: Role,
  resource: string,
  action: 'read' | 'create' | 'update' | 'delete',
  overrides?: PermissionOverrides
): boolean => {
  const resourceMatches = (candidate: string, target: string) =>
    candidate === target || candidate === target.split(':')[0];

  // Check overrides first
  if (overrides) {
    for (const [key, mapping] of Object.entries(OVERRIDE_TO_RESOURCE)) {
      if (mapping && overrides[key as PermissionOverrideKey] === false) {
        if (resourceMatches(mapping.resource, resource) &&
            (mapping.action === action || mapping.action === '*')) {
          return false;
        }
      }

      if (mapping && overrides[key as PermissionOverrideKey] === true) {
        if (resourceMatches(mapping.resource, resource) &&
            (mapping.action === action || mapping.action === '*')) {
          return true;
        }
      }
    }
  }

  // Then check role-based permissions
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.some(
    p => resourceMatches(p.resource, resource) &&
         (p.action === action || p.action === '*')
  );
};

// ─── Approval Chain Helpers ─────────────────────────────────────────────────

export const canApproveQuotes = (role: Role, overrides?: PermissionOverrides): boolean => {
  if (overrides?.can_approve_quotes === true) return true;
  return hasPermission(role, 'approval:approve', 'create', overrides);
};

export const getApprovalTargetRoles = (role: Role): Role[] => {
  const level = ROLE_HIERARCHY[role];
  return ALL_ROLES.filter(r => ROLE_HIERARCHY[r] > level);
};

export const getReturnTargetRoles = (role: Role): Role[] => {
  const level = ROLE_HIERARCHY[role];
  return ALL_ROLES.filter(r => ROLE_HIERARCHY[r] < level);
};

export const getRolesAbove = (role: Role): Role[] => {
  const level = ROLE_HIERARCHY[role];
  return ALL_ROLES.filter(r => ROLE_HIERARCHY[r] > level);
};

export const getRolesBelow = (role: Role): Role[] => {
  const level = ROLE_HIERARCHY[role];
  return ALL_ROLES.filter(r => ROLE_HIERARCHY[r] < level);
};

// ─── Migration Map ──────────────────────────────────────────────────────────

export const ROLE_MIGRATION_MAP: Record<string, Role> = {
  admin: 'system_admin',
  manager: 'sales_manager',
  sales: 'sales_rep',
  viewer: 'sales_rep',
};

