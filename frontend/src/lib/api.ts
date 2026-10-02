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

// The backend works out "today" in the user's own timezone from this header.
// Without it, everything between midnight and 05:30 IST would count as
// yesterday (the server runs on UTC).
function timezoneHeader(): Record<string, string> {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz ? { 'X-Timezone': tz } : {};
  } catch {
    return {};
  }
}

// Fired when the session can't be refreshed any more, so AuthContext can
// send the user back to the login screen.
export const SESSION_EXPIRED_EVENT = 'ascend:session-expired';

// Refresh this long before the access token actually expires, so a request
// never goes out with a token that dies in flight.
const REFRESH_MARGIN_SECONDS = 60;

let refreshInFlight: Promise<Session | null> | null = null;

// Swaps the refresh token for a new session. Concurrent callers share one
// request: Supabase refresh tokens are single-use, so two parallel refreshes
// would log the user out.
export function refreshSession(): Promise<Session | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const saved = getSession();
    if (!saved) return null;
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...timezoneHeader() },
        body: JSON.stringify({ refresh_token: saved.refresh_token }),
      });
      // Rate limited or server trouble: the refresh token may still be fine,
      // so don't log the user out; a later request will try again.
      if (response.status === 429 || response.status >= 500) return null;
      const result = await response.json();
      if (result?.access_token && result?.refresh_token && result?.expires_at && result?.user) {
        const refreshed: Session = {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          expires_at: result.expires_at,
          user: result.user,
        };
        setSession(refreshed);
        return refreshed;
      }
    } catch {
      // Network failure: keep the saved session so the next request can try
      // again, rather than logging the user out over a blip.
      return null;
    }
    clearSession();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    return null;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

// Plain fetch with no auth header attached and no throw-on-error -- used for
// the auth endpoints, which return { error: "..." } in the body for expected
// failures like bad passwords, so the UI can always show `result.error`.
export async function publicFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...timezoneHeader(),
        ...(options.headers as Record<string, string> | undefined),
      },
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
// catch/handle it. Refreshes the session when the access token is about to
// expire, and retries once if the server still says 401.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let session = getSession();
  if (session && session.expires_at - REFRESH_MARGIN_SECONDS <= Math.floor(Date.now() / 1000)) {
    session = (await refreshSession()) ?? getSession();
  }

  const send = (current: Session | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...timezoneHeader(),
      ...(options.headers as Record<string, string> | undefined),
    };
    if (current) {
      headers.Authorization = `Bearer ${current.access_token}`;
    }
    return fetch(`${API_BASE}${path}`, { ...options, headers });
  };

  let response = await send(session);

  if (response.status === 401 && session) {
    const refreshed = await refreshSession();
    if (refreshed) response = await send(refreshed);
  }

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

// CIPHER v2: every number is computed by the backend
// (backend/services/cipher_metrics.py); the AI only writes the notes.
export type Trend = 'up' | 'down' | 'flat';

export interface CipherMetric {
  key: string;
  label: string;
  value: string;
  caption: string;
  baseline: string;
  trend: Trend;
}

export interface CipherHabit {
  name: string;
  rate7: number;
  rate30: number;
  trend: Trend;
  streak: number;
  pointsLost7: number;
  note: string;
}

export interface CipherAnalysis {
  version: 2;
  analyzedAt: string;
  narrative: boolean;
  status: CipherStatus;
  isNewUser: boolean;
  daysTracked: number;
  score: { value: number; baseline: number; weekAgo: number; momentum: number; maxToday: number };
  metrics: CipherMetric[];
  verdict: string;
  personality: { type: string; tagline: string; evidence: string; insight: string };
  working: CipherHabit[];
  holdingBack: CipherHabit[];
  weekdays: Array<{ day: string; pct: number | null; samples: number }>;
  bestWeekday: string | null;
  worstWeekday: string | null;
  patternNote: string;
  plan: Array<{ habitId: string; name: string; impact: number; action: string }>;
  changes: Array<{ label: string; delta: string; direction: 'up' | 'down' }>;
}

export const aiApi = {
  brief: (recentQuotes: string[]) => api.post<BriefOutput | null>('/ai/brief', { recent_quotes: recentQuotes }),
  coach: () => api.get<CoachOutput | null>('/ai/coach'),
  // Runs a new analysis (the server may return the latest one instead when the
  // daily limit is reached or nothing changed).
  cipher: () => api.get<CipherAnalysis | null>('/ai/cipher'),
  // The last stored analysis, without generating: shown instantly on page load.
  cipherLatest: () => api.get<CipherAnalysis | null>('/ai/cipher/latest'),
};
