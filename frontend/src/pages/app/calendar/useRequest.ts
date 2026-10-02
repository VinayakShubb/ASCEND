import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { format } from 'date-fns';

interface RequestState<T> {
  key: string | null;
  data: T | undefined;
  error: string | null;
}

export interface RequestResult<T> {
  /* Latest successful data (kept while a newer request is in flight). */
  data: T | undefined;
  /* Error of the current request, if it failed. */
  error: string | null;
  /* True only before the first data arrives (show a skeleton). */
  loading: boolean;
  /* True while a newer request than the shown data is in flight. */
  refreshing: boolean;
  retry: () => void;
}

/* Runs `load` whenever `key` changes (null skips). An older response never
   overwrites a newer one: each effect run marks itself stale on cleanup. The
   previous data stays on screen during a refetch, so nothing flashes. */
export function useRequest<T>(key: string | null, load: () => Promise<T>): RequestResult<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<RequestState<T>>({ key: null, data: undefined, error: null });
  const fullKey = key === null ? null : `${key}#${attempt}`;
  const run = useEffectEvent(load);

  useEffect(() => {
    if (fullKey === null) return;
    let stale = false;
    run()
      .then(data => {
        if (!stale) setState({ key: fullKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (stale) return;
        const message = err instanceof Error ? err.message : 'Request failed';
        setState(prev => ({ key: fullKey, data: prev.data, error: message }));
      });
    return () => {
      stale = true;
    };
  }, [fullKey]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);
  const current = state.key === fullKey;
  const error = current ? state.error : null;
  return {
    data: state.data,
    error,
    loading: state.data === undefined && !error,
    refreshing: !current,
    retry,
  };
}

/* The user's local "today" as yyyy-MM-dd, fixed for the life of the page. */
export function useTodayStr(): string {
  const [today] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  return today;
}
