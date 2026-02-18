import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
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
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated, login, logout, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
