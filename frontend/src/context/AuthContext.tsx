import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import {
  type Session,
  type SessionUser,
  getSession,
  setSession,
  clearSession,
  isSessionExpired,
  publicFetch,
  fetchCurrentUser,
  refreshSession,
  SESSION_EXPIRED_EVENT,
} from '../lib/api';

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

// Shape returned by /auth/login, /auth/register, /auth/refresh. On failure
// (wrong password, validation, rate limit) the body always carries a
// readable `error` field, whatever the HTTP status, so the UI can show it.
interface AuthResponse {
  error: string | null;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  user?: SessionUser;
}

const toSession = (result: AuthResponse): Session | null => {
  if (!result.access_token || !result.refresh_token || !result.expires_at || !result.user) return null;
  return {
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    expires_at: result.expires_at,
    user: result.user,
  };
};

// Supabase's Google OAuth redirect lands back on the app with tokens in the
// URL hash fragment (#access_token=...&refresh_token=...&expires_at=...).
// That has to be parsed client-side -- a Python backend can't intercept a
// browser redirect -- so this is the one piece of auth logic that stays in
// the frontend on purpose.
function extractOAuthTokensFromHash(): { access_token: string; refresh_token: string; expires_at: number } | null {
  const hash = window.location.hash;
  if (!hash.includes('access_token')) return null;

  const params = new URLSearchParams(hash.slice(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresAt = params.get('expires_at');
  if (!accessToken || !refreshToken || !expiresAt) return null;

  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return { access_token: accessToken, refresh_token: refreshToken, expires_at: Number(expiresAt) };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const oauthTokens = extractOAuthTokensFromHash();
        if (oauthTokens) {
          const user = await fetchCurrentUser(oauthTokens.access_token);
          if (user) {
            const newSession: Session = { ...oauthTokens, user };
            setSession(newSession);
            setSessionState(newSession);
            // App.tsx sends the user from the landing page into the app.
            sessionStorage.setItem('ascend_after_oauth', '1');
          } else {
            clearSession();
          }
          return;
        }

        const saved = getSession();
        if (!saved) return;

        if (!isSessionExpired(saved)) {
          setSessionState(saved);
          return;
        }

        // Saved session expired -- refresh it. While the app is open, apiFetch
        // keeps the session fresh on its own (see refreshSession in api.ts).
        const refreshed = await refreshSession();
        if (refreshed) {
          setSessionState(refreshed);
        } else if (getSession()) {
          // Refresh failed for a temporary reason (network, rate limit): keep
          // the user signed in; the next API call retries the refresh.
          setSessionState(getSession());
        }
      } catch {
        // Network failure on startup (backend unreachable, etc) -- fall
        // through to logged-out rather than getting stuck on the loading
        // screen forever. The user will just see the login page.
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // apiFetch fires this when the session can no longer be refreshed (e.g.
  // the user signed out on another device): drop back to the login screen.
  useEffect(() => {
    const onExpired = () => setSessionState(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      const result = await publicFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      const newSession = toSession(result);
      if (!newSession) return { error: result.error || 'Login failed.' };

      setSession(newSession);
      setSessionState(newSession);
      return { error: null };
    } catch (err) {
      // publicFetch throws on network-level failure (backend unreachable,
      // CORS, etc). Surfaced as a normal { error } result so the UI can
      // show it instead of leaving the caller stuck on a loading state.
      return { error: err instanceof Error ? err.message : 'Login failed.' };
    }
  };

  const register = async (email: string, password: string, username: string) => {
    try {
      const result = await publicFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, username }),
      });
      if (result.error) return { error: result.error };

      // No session yet if the project requires email confirmation -- that's
      // not an error, the user just isn't logged in until they confirm.
      const newSession = toSession(result);
      if (newSession) {
        setSession(newSession);
        setSessionState(newSession);
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Registration failed.' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await publicFetch<{ url?: string }>('/auth/google');
      if (!result.url) return { error: 'Could not start Google sign-in.' };
      window.location.href = result.url;
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not start Google sign-in.' };
    }
  };

  const logout = async () => {
    clearSession();
    setSessionState(null);
  };

  const user: User | null = session
    ? {
        username: session.user.username,
        theme: session.user.theme,
        onboarding_completed: session.user.onboarding_completed,
        created_at: session.user.created_at,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{ user, login, register, loginWithGoogle, logout, isAuthenticated: !!session, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
