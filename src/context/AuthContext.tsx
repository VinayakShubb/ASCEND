import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { storage } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const USERS: Record<string, string> = {
  SHUB: 'SHUB123',
  MANJU: 'MANJU123',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// One-time cleanup of old shared key
(() => {
  try {
    localStorage.removeItem('ascend_user');
  } catch (_) { /* ignore */ }
})();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const currentUsername = storage.get<string | null>('current_user', null);
    if (currentUsername) {
      const profile = storage.get<User | null>(`profile_${currentUsername}`, null);
      return profile;
    }
    return null;
  });

  // Persist user profile whenever it changes
  useEffect(() => {
    if (user) {
      storage.set(`profile_${user.username}`, user);
      storage.set('current_user', user.username);
    }
  }, [user]);

  const login = (username: string, password: string): boolean => {
    const key = username.toUpperCase();
    if (USERS[key] && USERS[key] === password) {
      // Load existing profile or create new
      const existing = storage.get<User | null>(`profile_${key}`, null);
      const userData: User = existing || {
        username: key,
        theme: 'obsidian',
        onboarding_completed: false,
      };
      // Always ensure username is correct
      userData.username = key;
      setUser(userData);
      storage.set(`profile_${key}`, userData);
      storage.set('current_user', key);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    storage.remove('current_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
