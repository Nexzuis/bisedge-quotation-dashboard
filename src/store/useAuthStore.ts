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
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        // Import db here to avoid circular dependency
        const { db } = await import('../db/schema');
        const bcrypt = await import('bcryptjs');

        const user = await db.users
          .where('username')
          .equals(username)
          .first();

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

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const { user } = get();
        if (!user) return false;

        // Verify user still exists and is active
        const { db } = await import('../db/schema');
        const dbUser = await db.users.get(user.id);
        if (!dbUser || !dbUser.isActive) {
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
