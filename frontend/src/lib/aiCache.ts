// Same-day localStorage caching for AI responses. This logic used to live
// inline inside utils/aiBrief.ts and utils/aiCoach.ts; it stays client-side
// on purpose (the backend is now stateless per AI request -- see
// backend/services/ai_brief.py) using the exact same key formats as before,
// via raw localStorage rather than the storage.ts helper (which would
// double-prefix these keys).

const BRIEF_CACHE_VERSION = 'v2';

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
