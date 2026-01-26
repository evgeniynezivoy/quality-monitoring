import React, { createContext, useContext, useState } from 'react';
import { AuthState } from '@/types';

// Mock user for development - replace with corporate auth before release
const MOCK_USER = {
  id: 1,
  email: 'admin@quality.local',
  full_name: 'Admin User',
  role: 'admin' as const,
  team: 'QA',
};

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // TODO: Replace with corporate auth module before release
  const [state] = useState<AuthState>({
    user: MOCK_USER,
    isAuthenticated: true,
    isLoading: false,
  });

  const login = async () => {
    // No-op for mock auth
  };

  const logout = async () => {
    // No-op for mock auth
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
