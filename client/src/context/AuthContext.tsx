import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { api, getErrorMessage } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: Record<string, unknown>) => Promise<User>;
  logout: () => void;
  updateUser: (updated: Partial<User>) => void;
  quickLogin: (role: UserRole) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('medilink_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('medilink_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Verify / fetch latest profile on load if token exists
  useEffect(() => {
    const initAuth = async () => {
      const currentToken = localStorage.getItem('medilink_token');
      if (currentToken) {
        try {
          const res = await api.get('/users/profile');
          if (res.data?.success && res.data?.data?.user) {
            setUser(res.data.data.user);
            localStorage.setItem('medilink_user', JSON.stringify(res.data.data.user));
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem('medilink_token');
          localStorage.removeItem('medilink_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    localStorage.setItem('medilink_token', receivedToken);
    localStorage.setItem('medilink_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const register = async (payload: Record<string, unknown>): Promise<User> => {
    const res = await api.post('/auth/register', payload);
    const { token: receivedToken, user: receivedUser } = res.data.data;
    localStorage.setItem('medilink_token', receivedToken);
    localStorage.setItem('medilink_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const logout = useCallback(() => {
    try {
      api.post('/auth/logout').catch(() => {});
    } finally {
      localStorage.removeItem('medilink_token');
      localStorage.removeItem('medilink_user');
      setUser(null);
      setToken(null);
    }
  }, []);

  const updateUser = (updated: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      localStorage.setItem('medilink_user', JSON.stringify(next));
      return next;
    });
  };

  const quickLogin = async (role: UserRole): Promise<User> => {
    const credentials: Record<UserRole, { email: string; pass: string }> = {
      PATIENT: { email: 'patient@demo.medilink', pass: 'DemoPassword123!' },
      DOCTOR: { email: 'doctor@demo.medilink', pass: 'DemoPassword123!' },
      DIAGNOSTIC_CENTRE: { email: 'centre@demo.medilink', pass: 'DemoPassword123!' },
      ADMIN: { email: 'admin@medilink.health', pass: 'ChangeThisSecurePassword123!' },
    };

    const cred = credentials[role];
    return await login(cred.email, cred.pass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        quickLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
