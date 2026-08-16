import { storage } from '../utils/storage';

// Replaces lib/supabase.ts: the frontend no longer talks to Supabase or Groq
// directly, only to our own FastAPI backend. The backend owns the Supabase
// and Groq credentials now.
//
// Uses 127.0.0.1 rather than localhost: on some Windows setups the browser
// resolves "localhost" to the IPv6 loopback (::1) while uvicorn's default
// --host only binds IPv4, so fetch() fails even though curl/navigation (which
// fall back to IPv4 more readily) succeed. 127.0.0.1 sidesteps that ambiguity.
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface SessionUser {
  username: string;
  theme: string;
  onboarding_completed: boolean;
  created_at?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  user: SessionUser;
}

const SESSION_KEY = 'session';

export const getSession = (): Session | null => storage.get<Session | null>(SESSION_KEY, null);
export const setSession = (session: Session): void => storage.set(SESSION_KEY, session);
export const clearSession = (): void => storage.remove(SESSION_KEY);

export const isSessionExpired = (session: Session): boolean => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return session.expires_at <= nowSeconds;
};

// Used only during the Google OAuth redirect handshake in AuthContext,
// before a Session object exists yet to pull a token from.
export async function fetchCurrentUser(accessToken: string): Promise<SessionUser | null> {
  const response = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) return null;
  return response.json();
}

// Plain fetch with no auth header attached and no throw-on-error -- used for
// the auth endpoints, which return { error: "..." } with a 200 status
// instead of an HTTP error status for expected failures like bad passwords.
export async function publicFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> | undefined) },
    });
  } catch {
    // fetch() itself throws on network failure (backend down, CORS blocked,
    // wrong VITE_API_URL, etc.) -- surface a clear message instead of an
    // opaque "Failed to fetch" that callers weren't set up to catch.
    throw new Error('Could not reach the server. Is the backend running and is VITE_API_URL correct?');
  }
  return response.json();
}

// Authenticated fetch for everything else. Throws on non-2xx so callers can
// catch/handle it.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (session) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || `Request failed: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

// ─── Stats (replaces client-side utils/calculations.ts) ───

export interface DayStat {
  date: string;
  completion_pct: number;
  weighted_score: number;
}

export interface StatsSummary {
  discipline_index: number;
  today_completion_pct: number;
  today_weighted_score: number;
}

export interface StatsCeiling {
  current: number;
  max_today: number;
}

export const statsApi = {
  range: (start: string, end: string) => api.get<DayStat[]>(`/stats/range?start=${start}&end=${end}`),
  streaks: () => api.get<Record<string, number>>('/stats/streaks'),
  summary: (end?: string) => api.get<StatsSummary>(end ? `/stats/summary?end=${end}` : '/stats/summary'),
  ceiling: () => api.get<StatsCeiling>('/stats/ceiling'),
};

// ─── AI (replaces client-side utils/aiBrief.ts + utils/aiCoach.ts) ───

export type CipherStatus = 'elite' | 'solid' | 'slipping' | 'critical';

export interface BriefOutput {
  status: CipherStatus;
  quote: string;
  motivation: string;
}

export interface CoachOutput {
  status: CipherStatus;
  headline: string;
  insight: string;
  action: string;
}

export interface CipherAnalysisOutput {
  status: CipherStatus;
  operatorVerdict: string;
  timelineComments: Record<string, string>;
  executionType: string;
  personalityInsight: string;
  hallOfFame: { bestProtocol: string; bestProtocolComment: string; bestDayComment: string };
  hallOfShame: { worstProtocol: string; worstProtocolComment: string; worstStreakComment: string };
  lowlightsComments: { longestDeadStreak: string; worstDay: string; mostBrokenHabit: string; biggestDrop: string };
  ceilingInsight: string;
  biggestMistakeName: string;
  biggestMistake: string;
  biggestWinName: string;
  biggestWin: string;
  orders: Array<{ rank: number; action: string; estimatedImpact: string }>;
  analyzedAt?: string;
}

export const aiApi = {
  brief: (recentQuotes: string[]) => api.post<BriefOutput | null>('/ai/brief', { recent_quotes: recentQuotes }),
  coach: () => api.get<CoachOutput | null>('/ai/coach'),
  cipher: (isNewUser: boolean) => api.get<CipherAnalysisOutput | null>(`/ai/cipher?is_new_user=${isNewUser}`),
};
