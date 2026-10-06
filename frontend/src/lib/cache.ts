/* Last-known server data, kept so the app can paint the moment it opens and
   refresh in the background, instead of holding a skeleton while a slow
   request finishes. Treated as disposable: anything here is replaced by the
   server's answer as soon as it arrives, and cleared on logout. */

const PREFIX = 'ascend_cache_';

export const CACHE_HABITS = 'habits';
export const CACHE_LOGS = 'logs';
export const CACHE_BOARD = 'board';
export const CACHE_WEEK = 'week';

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // Private mode, cleared storage, or corrupt JSON: just fetch as before.
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Out of quota or storage blocked; caching is an optimisation only.
  }
}

export function clearCache(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
