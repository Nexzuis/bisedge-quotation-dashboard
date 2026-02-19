import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role, PermissionOverrides } from '../auth/permissions';
import { supabase } from '../lib/supabase';
import { getDb } from '../db/DatabaseAdapter';

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

// ---------------------------------------------------------------------------
// In-memory rate limiting / lockout (no persistence needed)
// ---------------------------------------------------------------------------

interface LoginAttemptState {
  failedCount: number;
  lockUntil: number | null;
}

const LOGIN_ATTEMPTS = new Map<string, LoginAttemptState>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000;
const MAX_DELAY_MS = 4000;

function normalizeLoginKey(emailOrUsername: string): string {
  return emailOrUsername.trim().toLowerCase();
}

function getProgressiveDelayMs(failedCount: number): number {
  if (failedCount <= 1) return 0;
  return Math.min(500 * Math.pow(2, failedCount - 2), MAX_DELAY_MS);
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function logAuthSecurityEvent(
  action: 'login_failed' | 'lockout',
  identifier: string
): Promise<void> {
  try {
    await getDb().logAudit({
      userId: 'system',
      action,
      entityType: 'user',
      entityId: identifier,
      changes: { identifier },
    });
  } catch {
    // Non-critical
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (emailOrUsername: string, password: string) => {
        const loginKey = normalizeLoginKey(emailOrUsername);
        const existingAttempt = LOGIN_ATTEMPTS.get(loginKey);
        const now = Date.now();

        // Lockout check
        if (existingAttempt?.lockUntil && now < existingAttempt.lockUntil) {
          await logAuthSecurityEvent('lockout', loginKey);
          return false;
        }

        // Progressive delay
        await sleep(getProgressiveDelayMs(existingAttempt?.failedCount ?? 0));

        const registerFailedAttempt = async () => {
          const current = LOGIN_ATTEMPTS.get(loginKey) || { failedCount: 0, lockUntil: null };
          const nextFailedCount = current.failedCount + 1;
          const shouldLock = nextFailedCount >= MAX_FAILED_ATTEMPTS;
          const nextState: LoginAttemptState = {
            failedCount: nextFailedCount,
            lockUntil: shouldLock ? Date.now() + LOCKOUT_DURATION_MS : null,
          };
          LOGIN_ATTEMPTS.set(loginKey, nextState);
          await logAuthSecurityEvent('login_failed', loginKey);
          if (shouldLock) {
            await logAuthSecurityEvent('lockout', loginKey);
          }
          return false;
        };

        const clearFailedAttempts = () => {
          LOGIN_ATTEMPTS.delete(loginKey);
        };

        // Supabase authentication
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: emailOrUsername,
          password,
        });

        if (authError || !authData.user) {
          return await registerFailedAttempt();
        }

        // Fetch user row from public.users
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (dbError || !dbUser || !dbUser.is_active) {
          set({ user: null, isAuthenticated: false });
          return await registerFailedAttempt();
        }

        // Parse permission overrides
        let permissionOverrides: PermissionOverrides = {};
        try {
          if (dbUser.permission_overrides) {
            permissionOverrides = JSON.parse(dbUser.permission_overrides);
          }
        } catch {
          permissionOverrides = {};
        }

        const userId = dbUser.id as string;

        set({
          user: {
            id: userId,
            username: dbUser.email || emailOrUsername,
            role: dbUser.role as Role,
            fullName: dbUser.full_name || emailOrUsername,
            email: dbUser.email || emailOrUsername,
            permissionOverrides,
          },
          isAuthenticated: true,
        });

        // Audit log
        try {
          await getDb().logAudit({
            userId,
            action: 'login',
            entityType: 'user',
            entityId: userId,
            changes: {},
          });
        } catch {
          // Non-critical
        }

        clearFailedAttempts();
        return true;
      },

      logout: async () => {
        // Sign out of Supabase
        try {
          await supabase.auth.signOut();
        } catch {
          // Non-critical
        }

        // Reset quote store to prevent stale data in memory
        try {
          const { useQuoteStore } = await import('./useQuoteStore');
          useQuoteStore.getState().resetAll();
        } catch {
          // Non-critical
        }

        // Clear auth state
        set({ user: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          set({ user: null, isAuthenticated: false });
          return false;
        }

        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (dbError || !dbUser || !dbUser.is_active) {
          set({ user: null, isAuthenticated: false });
          return false;
        }

        // Parse permission overrides
        let permissionOverrides: PermissionOverrides = {};
        try {
          if (dbUser.permission_overrides) {
            permissionOverrides = JSON.parse(dbUser.permission_overrides);
          }
        } catch {
          permissionOverrides = {};
        }

        const { user } = get();

        // Update role and overrides if they changed
        if (
          !user ||
          dbUser.role !== user.role ||
          JSON.stringify(permissionOverrides) !== JSON.stringify(user.permissionOverrides)
        ) {
          set({
            user: {
              id: dbUser.id,
              username: dbUser.email,
              role: dbUser.role as Role,
              fullName: dbUser.full_name,
              email: dbUser.email,
              permissionOverrides,
            },
            isAuthenticated: true,
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
