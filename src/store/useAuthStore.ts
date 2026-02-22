// TODO: REQUIRES SUPABASE CONFIG — Add RLS policies that enforce role-based access
// server-side, so even if client-side role checks are bypassed, the database
// refuses unauthorized operations. The client-side role gating in this store
// is defence-in-depth only.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role, PermissionOverrides } from '../auth/permissions';
import { supabase } from '../lib/supabase';
import { getDb } from '../db/DatabaseAdapter';
import { logger } from '../utils/logger';

interface User {
  id: string;
  username: string;
  role: Role;
  fullName: string;
  email: string;
  permissionOverrides: PermissionOverrides;
}

interface RefreshResult {
  kicked: boolean;
  reason?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  /**
   * Immediately signs out from Supabase and clears local auth state.
   * Does NOT navigate — the caller is responsible for redirecting.
   * Respects any in-progress auto-save with a 5-second grace period to
   * prevent data loss from interrupted saves.
   */
  forceLogout: () => Promise<void>;
  /**
   * Re-fetches the current user's row from public.users and checks:
   * - If is_active === false, calls forceLogout and returns { kicked: true }.
   * - If role has changed, updates the local store role.
   * Returns { kicked: false } when everything is healthy.
   */
  refreshUserFromDB: () => Promise<RefreshResult>;
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
      userId: '00000000-0000-0000-0000-000000000000',
      action,
      entityType: 'user',
      entityId: '00000000-0000-0000-0000-000000000000',
      changes: { identifier },
    });
  } catch {
    // Non-critical
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Module-level flag: set to true while an auto-save is actively running.
// useAutoSave sets this via the exported setter below so forceLogout can
// honour the grace period without importing React hooks into the store.
// ---------------------------------------------------------------------------

let _autoSaveInProgress = false;

/** Called by useAutoSave to signal that a DB write is in flight. */
export function setAutoSaveInProgress(inProgress: boolean): void {
  _autoSaveInProgress = inProgress;
}

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
            permissionOverrides = typeof dbUser.permission_overrides === 'string'
              ? JSON.parse(dbUser.permission_overrides)
              : dbUser.permission_overrides as PermissionOverrides;
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
        // Release quote lock and presence BEFORE sign-out (session is still valid)
        try {
          const currentUser = get().user;
          if (currentUser) {
            const { useQuoteStore } = await import('./useQuoteStore');
            const quoteId = useQuoteStore.getState().id;
            if (quoteId) {
              const db = getDb();
              await Promise.allSettled([
                db.releaseQuoteLock(quoteId, currentUser.id),
                db.deletePresence(quoteId, currentUser.id),
              ]);
            }
          }
        } catch {
          // Best-effort — proceed with logout regardless
        }

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

        // Reset repository singletons so the next user gets fresh adapters
        try {
          const { resetRepositories } = await import('../db/repositories');
          resetRepositories();
        } catch (err) {
          logger.warn('Failed to reset repositories on logout:', err);
        }

        // Bug #6 fix: also reset the database adapter singleton
        try {
          const { resetDbAdapter } = await import('../db/DatabaseAdapter');
          resetDbAdapter();
        } catch (err) {
          logger.warn('Failed to reset DB adapter on logout:', err);
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
            permissionOverrides = typeof dbUser.permission_overrides === 'string'
              ? JSON.parse(dbUser.permission_overrides)
              : dbUser.permission_overrides as PermissionOverrides;
          }
        } catch {
          permissionOverrides = {};
        }

        // Always set user from the server-authoritative DB row.
        // This ensures the role and overrides cannot be tampered with
        // via localStorage edits between sessions.
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

        return true;
      },

      forceLogout: async () => {
        // Grace period: if an auto-save is actively writing, wait up to 5 s
        // before signing out so we don't truncate the in-flight DB write.
        if (_autoSaveInProgress) {
          logger.info('forceLogout: auto-save in progress — waiting up to 5 s before logout');
          await new Promise<void>((resolve) => {
            const deadline = Date.now() + 5000;
            const poll = setInterval(() => {
              if (!_autoSaveInProgress || Date.now() >= deadline) {
                clearInterval(poll);
                resolve();
              }
            }, 100);
          });
        }

        // Release quote lock and presence BEFORE sign-out (session is still valid)
        try {
          const currentUser = get().user;
          if (currentUser) {
            const { useQuoteStore } = await import('./useQuoteStore');
            const quoteId = useQuoteStore.getState().id;
            if (quoteId) {
              const db = getDb();
              await Promise.allSettled([
                db.releaseQuoteLock(quoteId, currentUser.id),
                db.deletePresence(quoteId, currentUser.id),
              ]);
            }
          }
        } catch {
          // Best-effort — proceed with logout regardless
        }

        try {
          await supabase.auth.signOut();
        } catch {
          // Non-critical
        }

        // Reset quote store to prevent stale data leaking to the next session.
        try {
          const { useQuoteStore } = await import('./useQuoteStore');
          useQuoteStore.getState().resetAll();
        } catch {
          // Non-critical
        }

        // Reset repository singletons so the next user gets fresh adapters.
        try {
          const { resetRepositories } = await import('../db/repositories');
          resetRepositories();
        } catch (err) {
          logger.warn('forceLogout: failed to reset repositories:', err);
        }

        // Reset the database adapter singleton.
        try {
          const { resetDbAdapter } = await import('../db/DatabaseAdapter');
          resetDbAdapter();
        } catch (err) {
          logger.warn('forceLogout: failed to reset DB adapter:', err);
        }

        set({ user: null, isAuthenticated: false });
      },

      refreshUserFromDB: async (): Promise<RefreshResult> => {
        const currentUser = get().user;

        if (!currentUser) {
          return { kicked: false };
        }

        try {
          const { data: dbUser, error: dbError } = await supabase
            .from('users')
            .select('id, role, is_active')
            .eq('id', currentUser.id)
            .single();

          if (dbError || !dbUser) {
            // Cannot reach DB — do not kick; treat as a transient network issue.
            logger.warn('refreshUserFromDB: failed to fetch user row:', dbError);
            return { kicked: false };
          }

          if (!dbUser.is_active) {
            await get().forceLogout();
            return { kicked: true, reason: 'Account deactivated' };
          }

          // If the role has changed server-side, update the local store so
          // the UI reflects the new permissions without a full re-login.
          if (dbUser.role !== currentUser.role) {
            logger.info(
              `refreshUserFromDB: role changed from "${currentUser.role}" to "${dbUser.role}" — updating store`
            );
            set((state) => ({
              user: state.user
                ? { ...state.user, role: dbUser.role as Role }
                : null,
            }));
          }

          return { kicked: false };
        } catch (err) {
          logger.warn('refreshUserFromDB: unexpected error:', err);
          return { kicked: false };
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Security: do NOT trust the persisted role or mark the session
          // as authenticated until checkAuth() re-validates against the DB.
          // This closes the window where a tampered localStorage role could
          // grant elevated UI access before server verification completes.
          state.isAuthenticated = false;
          if (state.user) {
            state.checkAuth().then((valid) => {
              if (!valid) {
                useAuthStore.setState({ user: null, isAuthenticated: false });
              }
              // On success, checkAuth() already calls set() with the
              // server-authoritative role and isAuthenticated: true.
            });
          }
        }
      },
    }
  )
);
