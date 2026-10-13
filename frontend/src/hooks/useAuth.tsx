/** React Authentication Context — provides user state, login, logout across the app. */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
import type { UserRole } from "../types";

interface AuthUser {
  id: number;
  full_name: string;
  role: UserRole;
  email?: string | null;
  phone?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string | undefined, phone: string | undefined, password: string) => Promise<AuthUser>;
  register: (fullName: string, email: string | undefined, phone: string | undefined, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updated: Partial<AuthUser>) => void;
  refreshUser: () => Promise<AuthUser | null>;
}

const defaultAuthContext: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => ({ id: 0, full_name: "", role: "citizen" as UserRole }),
  register: async () => {},
  logout: () => {},
  updateUser: () => {},
  refreshUser: async () => null,
};

const AuthContext = createContext<AuthContextValue>(defaultAuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refresh user details from backend
  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      if (authService.isAuthenticated()) {
        const u = await authService.me();
        const updated: AuthUser = {
          id: u.id,
          full_name: u.full_name,
          role: u.role,
          email: u.email,
          phone: u.phone,
        };
        setUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        return updated;
      }
    } catch {
      // offline or token expired
    }
    return null;
  }, []);

  // Hydrate from localStorage on mount and fetch fresh profile
  useEffect(() => {
    const stored = authService.getStoredUser();
    if (stored && authService.isAuthenticated()) {
      setUser(stored as AuthUser);
      // Fetch latest profile in background
      authService.me().then(u => {
        const fresh: AuthUser = {
          id: u.id,
          full_name: u.full_name,
          role: u.role,
          email: u.email,
          phone: u.phone,
        };
        setUser(fresh);
        localStorage.setItem("user", JSON.stringify(fresh));
      }).catch(() => {});
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email?: string, phone?: string, password?: string): Promise<AuthUser> => {
    const res = await authService.login({ email, phone, password: password! });
    const authUser: AuthUser = { id: res.user_id, full_name: res.full_name, role: res.user_role, email, phone };
    setUser(authUser);
    return authUser;
  }, []);

  const register = useCallback(async (fullName: string, email?: string, phone?: string, password?: string) => {
    await authService.register({ full_name: fullName, email, phone, password: password! });
  }, []);

  const updateUser = useCallback((updated: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
