import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role, PermissionOverrides } from '../auth/permissions';

interface User {
  id: string;
  username: string;
  role: Role;
  fullName: string;
  email: string;
  permissionOverrides: PermissionOverrides;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

/**
 * Try Supabase Auth login (for hybrid/cloud mode).
 * Returns the user record from public.users if successful, or null.
 */
async function trySupabaseLogin(email: string, password: string) {
  console.log('XYZZY_AUTH_MARKER_2026: trySupabaseLogin called with', email);
  try {
    const { supabase } = await import('../lib/supabase');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError || !authData.user) return null;

    // Fetch the user record from public.users by auth ID
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (dbError || !dbUser) {
      console.warn('Supabase auth succeeded but no matching public.users row for', authData.user.id);
      return null;
    }
    if (!dbUser.is_active) return null;

    return {
      id: dbUser.id,
      username: dbUser.email || email,
      role: dbUser.role as Role,
      fullName: dbUser.full_name || email,
      email: dbUser.email || email,
      permissionOverrides: '{}',
    };
  } catch (err) {
    console.warn('Supabase login failed (may be offline):', err);
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (emailOrUsername: string, password: string) => {
        const appMode = import.meta.env.VITE_APP_MODE || 'local';

        // In hybrid or cloud mode, try Supabase Auth first
        if (appMode === 'hybrid' || appMode === 'cloud') {
          const supaUser = await trySupabaseLogin(emailOrUsername, password);
          if (supaUser) {
            // Parse permission overrides
            let permissionOverrides: PermissionOverrides = {};
            try {
              if (supaUser.permissionOverrides) {
                permissionOverrides = JSON.parse(supaUser.permissionOverrides);
              }
            } catch {
              permissionOverrides = {};
            }

            set({
              user: {
                id: supaUser.id,
                username: supaUser.username,
                role: supaUser.role,
                fullName: supaUser.fullName,
                email: supaUser.email,
                permissionOverrides,
              },
              isAuthenticated: true,
            });

            // Seed user into local IndexedDB for offline access
            try {
              const { db } = await import('../db/schema');
              const bcrypt = await import('bcryptjs');
              const passwordHash = await bcrypt.hash(password, 10);
              await db.users.put({
                id: supaUser.id,
                username: supaUser.email,
                passwordHash,
                role: supaUser.role,
                fullName: supaUser.fullName,
                email: supaUser.email,
                isActive: true,
                createdAt: new Date().toISOString(),
                permissionOverrides: supaUser.permissionOverrides || '{}',
              });
            } catch (seedErr) {
              console.warn('Could not seed user to local DB:', seedErr);
            }

            // Log login action
            try {
              const { db } = await import('../db/schema');
              await db.auditLog.add({
                timestamp: new Date().toISOString(),
                userId: supaUser.id,
                userName: supaUser.fullName,
                action: 'login',
                entityType: 'user',
                entityId: supaUser.id,
                changes: {},
              });
            } catch {
              // Non-critical
            }

            return true;
          }
        }

        // Local / offline fallback: check IndexedDB with bcrypt
        const { db } = await import('../db/schema');
        const bcrypt = await import('bcryptjs');

        // Try by username first, then by email
        let user = await db.users
          .where('username')
          .equals(emailOrUsername)
          .first();

        if (!user) {
          user = await db.users
            .where('email')
            .equals(emailOrUsername)
            .first();
        }

        if (!user) return false;
        if (!user.isActive) return false;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return false;

        // Parse permission overrides from stored JSON string
        let permissionOverrides: PermissionOverrides = {};
        try {
          if (user.permissionOverrides) {
            permissionOverrides = JSON.parse(user.permissionOverrides);
          }
        } catch {
          permissionOverrides = {};
        }

        set({
          user: {
            id: user.id!,
            username: user.username,
            role: user.role as Role,
            fullName: user.fullName,
            email: user.email,
            permissionOverrides,
          },
          isAuthenticated: true,
        });

        // Log login action
        await db.auditLog.add({
          timestamp: new Date().toISOString(),
          userId: user.id!,
          userName: user.fullName,
          action: 'login',
          entityType: 'user',
          entityId: user.id!,
          changes: {},
        });

        return true;
      },

      logout: async () => {
        // Sign out of Supabase too
        const appMode = import.meta.env.VITE_APP_MODE || 'local';
        if (appMode === 'hybrid' || appMode === 'cloud') {
          try {
            const { supabase } = await import('../lib/supabase');
            await supabase.auth.signOut();
          } catch {
            // Non-critical
          }
        }
        set({ user: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const { user } = get();
        if (!user) return false;

        // Verify user still exists and is active
        const { db } = await import('../db/schema');
        const dbUser = await db.users.get(user.id);
        if (!dbUser || !dbUser.isActive) {
          // In hybrid mode, also check Supabase
          const appMode = import.meta.env.VITE_APP_MODE || 'local';
          if (appMode === 'hybrid' || appMode === 'cloud') {
            try {
              const { supabase } = await import('../lib/supabase');
              const { data } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();
              if (data && data.is_active) {
                return true;
              }
            } catch {
              // Offline — keep session if we have local data
              if (dbUser) return true;
            }
          }
          set({ user: null, isAuthenticated: false });
          return false;
        }

        // Re-sync permission overrides from DB
        let permissionOverrides: PermissionOverrides = {};
        try {
          if (dbUser.permissionOverrides) {
            permissionOverrides = JSON.parse(dbUser.permissionOverrides);
          }
        } catch {
          permissionOverrides = {};
        }

        // Update role and overrides if they changed
        if (dbUser.role !== user.role || JSON.stringify(permissionOverrides) !== JSON.stringify(user.permissionOverrides)) {
          set({
            user: {
              ...user,
              role: dbUser.role as Role,
              permissionOverrides,
            },
          });
        }

        return true;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.user;
          if (state.user) {
            state.checkAuth().then((valid) => {
              if (!valid) {
                useAuthStore.setState({ user: null, isAuthenticated: false });
              }
            });
          }
        }
      },
    }
  )
);
