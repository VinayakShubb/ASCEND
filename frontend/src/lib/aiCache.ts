// Same-day localStorage caching for AI responses. This logic used to live
// inline inside utils/aiBrief.ts and utils/aiCoach.ts; it stays client-side
// on purpose (the backend is now stateless per AI request -- see
// backend/services/ai_brief.py) using the exact same key formats as before,
// via raw localStorage rather than the storage.ts helper (which would
// double-prefix these keys).

const BRIEF_CACHE_VERSION = 'v2';
const COACH_CACHE_VERSION = 'v2';
const CIPHER_CACHE_VERSION = 'v4';

interface CachedBrief<T> {
  date: string;
  insight: T;
}

export function getBriefCache<T>(username: string, todayIsoDate: string): T | null {
  const raw = localStorage.getItem(`ascend_ai_brief_${BRIEF_CACHE_VERSION}_${username}`);
  if (!raw) return null;
  try {
    const cached: CachedBrief<T> = JSON.parse(raw);
    return cached.date === todayIsoDate ? cached.insight : null;
  } catch {
    return null;
  }
}

export function setBriefCache<T>(username: string, todayIsoDate: string, insight: T): void {
  localStorage.setItem(
    `ascend_ai_brief_${BRIEF_CACHE_VERSION}_${username}`,
    JSON.stringify({ date: todayIsoDate, insight })
  );
}

export function getQuoteHistory(username: string): string[] {
  const raw = localStorage.getItem(`ascend_ai_quote_history_${username}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function pushQuoteHistory(username: string, quote: string): void {
  const history = getQuoteHistory(username);
  history.push(quote);
  localStorage.setItem(`ascend_ai_quote_history_${username}`, JSON.stringify(history));
}

function getDayCache<T>(prefix: string, version: string, userId: string, dateStr: string): T | null {
  const raw = localStorage.getItem(`${prefix}_${version}_${userId}_${dateStr}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function setDayCache<T>(prefix: string, version: string, userId: string, dateStr: string, value: T): void {
  localStorage.setItem(`${prefix}_${version}_${userId}_${dateStr}`, JSON.stringify(value));
}

// Coach/Cipher cache keys are keyed by Date.toDateString() (e.g. "Mon Aug 16
// 2026"), not an ISO date -- kept as-is from the original implementation.
export const todayKey = () => new Date().toDateString();

export const getCoachCache = <T>(userId: string) => getDayCache<T>('ascend_ai_coach', COACH_CACHE_VERSION, userId, todayKey());
export const setCoachCache = <T>(userId: string, value: T) => setDayCache('ascend_ai_coach', COACH_CACHE_VERSION, userId, todayKey(), value);

export const getCipherCache = <T>(userId: string) => getDayCache<T>('ascend_ai_cipher', CIPHER_CACHE_VERSION, userId, todayKey());
export const setCipherCache = <T>(userId: string, value: T) => setDayCache('ascend_ai_cipher', CIPHER_CACHE_VERSION, userId, todayKey(), value);
