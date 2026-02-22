import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';
import type { Role, PermissionOverrides } from '../../auth/permissions';

interface AuthContextType {
  user: {
    id: string;
    username: string;
    role: Role;
    fullName: string;
    email: string;
    permissionOverrides: PermissionOverrides;
  } | null;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// How often to re-validate the user's is_active flag against the DB (ms).
const REVALIDATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated, login, logout, checkAuth, forceLogout, refreshUserFromDB } =
    useAuthStore();

  // Initial auth check on mount.
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ---------------------------------------------------------------------------
  // Supabase auth state listener
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_OUT') {
          // The Supabase session ended (e.g. token expired, signed out in
          // another tab, or an admin revoked the session).
          useAuthStore.setState({ user: null, isAuthenticated: false });
          window.location.hash = '#/login';
        } else if (event === 'TOKEN_REFRESHED') {
          // The JWT was refreshed. Re-check is_active and role against the DB
          // to catch any account changes that happened while the token was live.
          const result = await refreshUserFromDB();
          if (result.kicked) {
            toast.error('Your account has been deactivated', {
              description: 'Please contact your administrator.',
              duration: 6000,
            });
            window.location.hash = '#/login';
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUserFromDB]);

  // ---------------------------------------------------------------------------
  // Periodic is_active re-validation (every 5 minutes)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Only run the timer when a user is actively logged in.
    if (!isAuthenticated) return;

    const intervalId = setInterval(async () => {
      const result = await refreshUserFromDB();
      if (result.kicked) {
        toast.error('Your account has been deactivated', {
          description: 'Please contact your administrator.',
          duration: 6000,
        });
        window.location.hash = '#/login';
      }
    }, REVALIDATION_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated, refreshUserFromDB]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
