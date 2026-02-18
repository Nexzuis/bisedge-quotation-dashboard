import { useState, useEffect } from 'react';
import { toast } from '../../ui/Toast';
import { Plus, Eye, EyeOff, RotateCcw, KeyRound } from 'lucide-react';
import DataTable from '../shared/DataTable';
import EditModal from '../shared/EditModal';
import ConfirmDialog from '../shared/ConfirmDialog';
import { db, type StoredUser } from '../../../db/schema';
import { getAuditRepository } from '../../../db/repositories';
import { useAuth } from '../../auth/AuthContext';
import bcrypt from 'bcryptjs';
import { Badge } from '../../ui/Badge';
import { supabase, isCloudMode } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import {
  ALL_ROLES,
  ROLE_DISPLAY_NAMES,
  DEFAULT_PERMISSION_OVERRIDES,
  PERMISSION_OVERRIDE_LABELS,
  type Role,
  type PermissionOverrides,
  type PermissionOverrideKey,
} from '../../../auth/permissions';

interface UserFormData {
  username: string;
  fullName: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
  permissionOverrides: PermissionOverrides;
}

const UserManagement = () => {
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StoredUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    fullName: '',
    email: '',
    password: '',
    role: 'sales_rep',
    isActive: true,
    permissionOverrides: { ...DEFAULT_PERMISSION_OVERRIDES.sales_rep },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState('');
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { user: currentUser } = useAuth();
  const auditRepo = getAuditRepository();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await db.users.toArray();
      // Sort by createdAt desc
      allUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!selectedUser && !formData.password) {
      errors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = () => {
    setSelectedUser(null);
    setFormData({
      username: '',
      fullName: '',
      email: '',
      password: '',
      role: 'sales_rep',
      isActive: true,
      permissionOverrides: { ...DEFAULT_PERMISSION_OVERRIDES.sales_rep },
    });
    setValidationErrors({});
    setShowPassword(false);
    setShowEditModal(true);
  };

  const handleEdit = (user: StoredUser) => {
    setSelectedUser(user);
    let overrides: PermissionOverrides = {};
    try {
      overrides = user.permissionOverrides ? JSON.parse(user.permissionOverrides) : {};
    } catch { overrides = {}; }
    setFormData({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      password: '', // Don't pre-fill password
      role: user.role,
      isActive: user.isActive,
      permissionOverrides: overrides,
    });
    setValidationErrors({});
    setShowPassword(false);
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      // Check username uniqueness
      if (!selectedUser || selectedUser.username !== formData.username) {
        const existingUser = await db.users.where('username').equals(formData.username).first();
        if (existingUser) {
          setValidationErrors({ username: 'Username already exists' });
          setSaving(false);
          return;
        }
      }

      // Check email uniqueness
      if (!selectedUser || selectedUser.email !== formData.email) {
        const existingEmail = await db.users.where('email').equals(formData.email).first();
        if (existingEmail) {
          setValidationErrors({ email: 'Email already exists' });
          setSaving(false);
          return;
        }
      }

      if (selectedUser) {
        // Update existing user
        const updates: Partial<StoredUser> = {
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive,
          permissionOverrides: JSON.stringify(formData.permissionOverrides),
        };

        // Only update password if provided
        if (formData.password) {
          const salt = await bcrypt.genSalt(10);
          updates.passwordHash = await bcrypt.hash(formData.password, salt);
        }

        await db.users.update(selectedUser.id!, updates);

        // Sync to Supabase public.users in cloud/hybrid mode
        if (isCloudMode()) {
          try {
            const { error: updateError } = await supabase.from('users').update({
              email: formData.email,
              full_name: formData.fullName,
              role: formData.role,
              is_active: formData.isActive,
            }).eq('id', selectedUser.id!);
            if (updateError) {
              console.warn('public.users update failed:', updateError.message);
              toast.warning('User updated locally but cloud sync failed: ' + updateError.message);
            }
          } catch (syncError) {
            console.warn('Cloud sync error during user update:', syncError);
            toast.warning('User updated locally but cloud sync encountered an error');
          }
        }

        // Audit log
        await auditRepo.log({
          userId: currentUser!.id,
          action: 'update',
          entityType: 'user',
          entityId: selectedUser.id!,
          changes: updates,
          oldValues: selectedUser,
          newValues: { ...selectedUser, ...updates },
        });
      } else {
        // Create new user
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(formData.password, salt);

        const newUser: StoredUser = {
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
          passwordHash,
          role: formData.role,
          isActive: formData.isActive,
          permissionOverrides: JSON.stringify(formData.permissionOverrides),
          createdAt: new Date().toISOString(),
        };

        await db.users.add(newUser);

        // Sync to Supabase Auth + public.users in cloud/hybrid mode
        if (isCloudMode()) {
          try {
            // Use a non-persisting client so admin's own session is not disturbed
            const signUpClient = createClient(
              import.meta.env.VITE_SUPABASE_URL,
              import.meta.env.VITE_SUPABASE_ANON_KEY,
              { auth: { persistSession: false } }
            );
            const { data: authData, error: authError } = await signUpClient.auth.signUp({
              email: formData.email,
              password: formData.password,
            });

            if (authError) {
              console.warn('Supabase auth signUp failed:', authError.message);

              // Handle re-creating a previously deleted user:
              // signUp fails because the auth user still exists, but public.users
              // has is_active=false from the soft-delete. Reactivate the row.
              const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', formData.email)
                .single();

              if (existingUser) {
                await supabase.from('users').update({
                  full_name: formData.fullName,
                  role: formData.role,
                  is_active: formData.isActive,
                }).eq('id', existingUser.id);

                // Update local user ID to match the Supabase ID
                await db.users.delete(newUser.id!);
                newUser.id = existingUser.id;
                await db.users.add(newUser);

                toast.info('Reactivated existing cloud user. Note: the user must log in with their previous Supabase password or use password reset.');
              } else {
                toast.warning('User created locally but cloud sync failed: ' + authError.message);
              }
            } else if (authData.user) {
              // Brand new user — insert into public.users with the Supabase auth ID
              const { error: insertError } = await supabase.from('users').insert({
                id: authData.user.id,
                email: formData.email,
                full_name: formData.fullName,
                role: formData.role,
                is_active: formData.isActive,
              });
              if (insertError) {
                console.warn('public.users insert failed:', insertError.message);
              }

              // Update local user ID to match Supabase auth ID for consistency
              await db.users.delete(newUser.id!);
              newUser.id = authData.user.id;
              await db.users.add(newUser);
            }
          } catch (syncError) {
            console.warn('Cloud sync error during user creation:', syncError);
            toast.warning('User created locally but cloud sync encountered an error');
          }
        }

        // Audit log
        await auditRepo.log({
          userId: currentUser!.id,
          action: 'create',
          entityType: 'user',
          entityId: newUser.id!,
          changes: { created: true },
          newValues: newUser,
        });
      }

      setShowEditModal(false);
      toast.success(selectedUser ? 'User updated successfully' : 'User created successfully');
      await loadUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
      toast.error('Failed to save user: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (user: StoredUser) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    // Check if this is the last active system admin
    const activeAdmins = users.filter(
      u => u.role === 'system_admin' && u.isActive && u.id !== selectedUser.id
    );

    if (selectedUser.role === 'system_admin' && selectedUser.isActive && activeAdmins.length === 0) {
      alert('Cannot delete the last active system admin user');
      setShowDeleteDialog(false);
      return;
    }

    try {
      // Soft-delete in Supabase (can't delete auth user without service role key)
      if (isCloudMode()) {
        try {
          const { error: softDeleteError } = await supabase
            .from('users')
            .update({ is_active: false })
            .eq('id', selectedUser.id!);
          if (softDeleteError) {
            console.warn('public.users soft-delete failed:', softDeleteError.message);
            toast.warning('User deleted locally but cloud sync failed: ' + softDeleteError.message);
          }
        } catch (syncError) {
          console.warn('Cloud sync error during user delete:', syncError);
          toast.warning('User deleted locally but cloud sync encountered an error');
        }
      }

      await db.users.delete(selectedUser.id!);

      // Audit log
      await auditRepo.log({
        userId: currentUser!.id,
        action: 'delete',
        entityType: 'user',
        entityId: selectedUser.id!,
        changes: { deleted: true },
        oldValues: selectedUser,
      });

      setShowDeleteDialog(false);
      await loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handlePasswordResetClick = (user: StoredUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowNewPassword(false);
    setNewPasswordError('');
    setShowPasswordResetDialog(true);
  };

  const handlePasswordResetConfirm = async () => {
    if (!selectedUser || !currentUser) return;

    if (!newPassword) {
      setNewPasswordError('New password is required');
      return;
    }

    if (newPassword.length < 8) {
      setNewPasswordError('Password must be at least 8 characters');
      return;
    }

    setNewPasswordError('');
    setResettingPassword(true);

    try {
      const passwordHash = await bcrypt.hash(newPassword, 10);

      await db.users.update(selectedUser.id!, { passwordHash });

      // Send password reset email via Supabase in cloud/hybrid mode
      if (isCloudMode()) {
        try {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(selectedUser.email);
          if (resetError) {
            console.warn('Supabase password reset email failed:', resetError.message);
          } else {
            toast.info('Password reset email sent to ' + selectedUser.email);
          }
        } catch (syncError) {
          console.warn('Cloud sync error during password reset:', syncError);
        }
      }

      // Audit log
      await auditRepo.log({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'update',
        entityType: 'user',
        entityId: selectedUser.id!,
        changes: { passwordReset: true },
        targetUserId: selectedUser.id!,
        targetUserName: selectedUser.fullName,
      });

      toast.success(`Password reset successfully for ${selectedUser.username}`);
      setShowPasswordResetDialog(false);
    } catch (error) {
      console.error('Failed to reset password:', error);
      toast.error('Failed to reset password: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setResettingPassword(false);
    }
  };

  const getRoleBadgeVariant = (role: string): 'danger' | 'warning' | 'info' | 'success' | 'brand' => {
    switch (role) {
      case 'system_admin':
        return 'danger';
      case 'ceo':
        return 'warning';
      case 'local_leader':
        return 'brand';
      case 'sales_manager':
        return 'success';
      case 'key_account':
        return 'info';
      case 'sales_rep':
        return 'info';
      default:
        return 'info';
    }
  };

  const isAdmin = currentUser?.role === 'system_admin';

  const columns = [
    {
      key: 'username',
      label: 'Username',
      sortable: true,
    },
    {
      key: 'fullName',
      label: 'Full Name',
      sortable: true,
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (role: string) => (
        <Badge variant={getRoleBadgeVariant(role)}>
          {ROLE_DISPLAY_NAMES[role as Role] || role}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      render: (isActive: boolean) => (
        <Badge variant={isActive ? 'success' : 'info'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    ...(isAdmin
      ? [
          {
            key: 'id',
            label: 'Reset Password',
            sortable: false,
            render: (_: string, row: StoredUser) => (
              <button
                onClick={() => handlePasswordResetClick(row)}
                title={`Reset password for ${row.username}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 hover:text-amber-300 rounded-lg transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Reset
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="bg-surface-700/50 backdrop-blur-xl border border-surface-600/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-surface-100 mb-1">User Management</h2>
          <p className="text-surface-100/60">Manage system users, roles, and permissions</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-100 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        loading={loading}
        emptyMessage="No users found"
      />

      {/* Edit Modal */}
      <EditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={selectedUser ? 'Edit User' : 'Add User'}
        onSave={handleSave}
        loading={saving}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-100 mb-2">
              Username <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 placeholder:text-surface-100/30 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter username"
            />
            {validationErrors.username && (
              <p className="text-red-400 text-sm mt-1">{validationErrors.username}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-100 mb-2">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 placeholder:text-surface-100/30 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter full name"
            />
            {validationErrors.fullName && (
              <p className="text-red-400 text-sm mt-1">{validationErrors.fullName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-100 mb-2">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 placeholder:text-surface-100/30 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter email"
            />
            {validationErrors.email && (
              <p className="text-red-400 text-sm mt-1">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-100 mb-2">
              Password {!selectedUser && <span className="text-red-400">*</span>}
              {selectedUser && <span className="text-surface-100/60 text-xs">(leave blank to keep current)</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 pr-10 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 placeholder:text-surface-100/30 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder={selectedUser ? 'Enter new password (optional)' : 'Enter password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-100/60 hover:text-surface-100"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {validationErrors.password && (
              <p className="text-red-400 text-sm mt-1">{validationErrors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-100 mb-2">
              Role <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => {
                const newRole = e.target.value as Role;
                setFormData({
                  ...formData,
                  role: newRole,
                  permissionOverrides: { ...DEFAULT_PERMISSION_OVERRIDES[newRole] },
                });
              }}
              className="w-full px-4 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_DISPLAY_NAMES[r]}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 bg-surface-800/40 border border-surface-700/50 rounded focus:ring-2 focus:ring-teal-500"
            />
            <label htmlFor="isActive" className="text-sm text-surface-100">
              Active (user can login)
            </label>
          </div>

          {/* Permission Overrides */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-surface-100">
                Permission Overrides
              </label>
              <button
                type="button"
                onClick={() => setFormData({
                  ...formData,
                  permissionOverrides: { ...DEFAULT_PERMISSION_OVERRIDES[formData.role as Role] },
                })}
                className="flex items-center gap-1 text-xs text-surface-100/50 hover:text-surface-100 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(PERMISSION_OVERRIDE_LABELS) as PermissionOverrideKey[]).map((key) => {
                const { label, description } = PERMISSION_OVERRIDE_LABELS[key];
                const isEnabled = formData.permissionOverrides[key] === true;
                const isDefault = DEFAULT_PERMISSION_OVERRIDES[formData.role as Role]?.[key] === true;
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                      isEnabled
                        ? 'bg-brand-600/10 border-brand-500/30'
                        : 'bg-surface-800/30 border-surface-700/30'
                    }`}
                    onClick={() => {
                      const newOverrides = { ...formData.permissionOverrides };
                      if (isEnabled) {
                        delete newOverrides[key];
                      } else {
                        newOverrides[key] = true;
                      }
                      setFormData({ ...formData, permissionOverrides: newOverrides });
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-surface-100 flex items-center gap-1.5">
                        {label}
                        {isDefault && (
                          <span className="text-[10px] text-surface-100/40 font-normal">(default)</span>
                        )}
                      </div>
                      <div className="text-[10px] text-surface-100/40 truncate">{description}</div>
                    </div>
                    <div className={`w-8 h-4.5 rounded-full flex-shrink-0 relative transition-colors ${
                      isEnabled ? 'bg-brand-500' : 'bg-surface-600'
                    }`}>
                      <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
                        isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </EditModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete user "${selectedUser?.username}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Password Reset Dialog — admin only */}
      {showPasswordResetDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-reset-dialog-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !resettingPassword) setShowPasswordResetDialog(false);
          }}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { if (!resettingPassword) setShowPasswordResetDialog(false); }}
            aria-hidden="true"
          />
          <div className="relative bg-slate-900 border border-surface-600/50 rounded-2xl shadow-2xl w-full max-w-md p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <KeyRound className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 id="password-reset-dialog-title" className="text-xl font-bold text-surface-100">
                  Reset Password
                </h3>
                <p className="text-sm text-surface-100/50">Admin action — audit logged</p>
              </div>
            </div>

            <p className="text-surface-100/60 mb-4 text-sm">
              Set a new password for{' '}
              <strong className="text-surface-100">{selectedUser?.username}</strong>
              {selectedUser?.fullName ? ` (${selectedUser.fullName})` : ''}.
              The user will need to use this password on their next login.
            </p>

            {/* New password input with show/hide toggle */}
            <div className="mb-1">
              <label className="block text-sm font-medium text-surface-100 mb-2">
                New Password <span className="text-red-400">*</span>
                <span className="text-surface-100/40 font-normal ml-1">(min. 8 characters)</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (newPasswordError) setNewPasswordError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !resettingPassword) handlePasswordResetConfirm();
                  }}
                  placeholder="Enter new password"
                  autoFocus
                  className={`w-full px-4 py-2 pr-10 bg-surface-800/40 border rounded-lg text-surface-100 placeholder:text-surface-100/30 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
                    newPasswordError ? 'border-red-500/60' : 'border-surface-700/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-100/60 hover:text-surface-100 transition-colors"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPasswordError && (
                <p className="text-red-400 text-sm mt-1.5">{newPasswordError}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowPasswordResetDialog(false)}
                disabled={resettingPassword}
                className="flex-1 px-4 py-2 bg-surface-800/40 hover:bg-surface-700/50 border border-surface-700/50 rounded-lg text-surface-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordResetConfirm}
                disabled={resettingPassword}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {resettingPassword ? (
                  <>
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Resetting...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Reset Password
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
