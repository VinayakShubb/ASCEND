import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<{ error: string | null }>;
  register: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  loginWithGoogle: () => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Login with email OR username
  const login = async (identifier: string, password: string) => {
    let email = identifier;

    // If no '@', treat as username and look up the email from profiles
    if (!identifier.includes('@')) {
      const { data, error: lookupError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', identifier)
        .single();

      if (lookupError || !data) {
        return { error: 'User ID not found. Try your email instead.' };
      }
      email = data.email;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  // Register with email, password, and username
  const register = async (email: string, password: string, username: string) => {
    // Check if username is already taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return { error: 'This User ID is already taken. Choose another.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) return { error: error.message };

    // If user was created and we have an ID, save profile
    if (data.user) {
      await supabase.from('profiles').insert([{
        id: data.user.id,
        username,
        email,
        password_plain: password,
      }]);
    }

    return { error: null };
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error: error ? error.message : null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const user: User | null = session?.user ? {
    username: session.user.user_metadata?.username
      || session.user.user_metadata?.full_name
      || session.user.email?.split('@')[0]
      || 'USER',
    theme: 'obsidian',
    onboarding_completed: true,
  } : null;

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      loginWithGoogle,
      logout,
      isAuthenticated: !!session,
      loading
    }}>
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
