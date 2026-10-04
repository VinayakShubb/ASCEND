import { useCallback, useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { aiApi, statsApi, type BriefOutput, type CoachOutput, type DayStat, type StatsCeiling, type StatsSummary } from '../../../lib/api';
import { getBriefCache, getQuoteHistory, pushQuoteHistory, setBriefCache } from '../../../lib/aiCache';

export interface BoardStats {
  summary: StatsSummary;
  ceiling: StatsCeiling;
}

/* Last board shown, so coming back to Today starts from real numbers and
   the digits flip to the fresh ones instead of blinking through a skeleton. */
let lastBoard: BoardStats | null = null;

/* Discipline Index, today's score and the ceiling, refetched after every
   check-off (whenever `logs` or `habits` change). Old values stay on screen
   while the new ones load, so the board flips rather than flashes. */
export function useBoardStats() {
  const { habits, logs } = useData();
  const [board, setBoard] = useState<BoardStats | null>(lastBoard);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([statsApi.summary(), statsApi.ceiling()])
      .then(([summary, ceiling]) => {
        if (cancelled) return;
        lastBoard = { summary, ceiling };
        setBoard(lastBoard);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load your numbers.');
      });
    return () => {
      cancelled = true;
    };
  }, [habits, logs, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt(n => n + 1);
  }, []);

  return { board, error, retry };
}

/* Daily weighted scores for the last seven days, oldest first. */
export function useWeekStats() {
  const { habits, logs } = useData();
  const [days, setDays] = useState<DayStat[] | null>(null);
  const [failed, setFailed] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    let cancelled = false;
    statsApi
      .range(format(subDays(new Date(), 6), 'yyyy-MM-dd'), today)
      .then(result => {
        if (cancelled) return;
        setDays(result);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [habits, logs, today]);

  return { days, failed };
}

type Load<T> = { state: 'loading' } | { state: 'ready'; value: T } | { state: 'none' };

/* The daily brief (quote + motivation). The server writes it once per day;
   the browser keeps the day's copy so revisits are instant. */
export function useDailyBrief(enabled: boolean): Load<BriefOutput> {
  const { user } = useAuth();
  const username = user?.username;
  const today = format(new Date(), 'yyyy-MM-dd');
  const cached = username ? getBriefCache<BriefOutput>(username, today) : null;
  const [fetched, setFetched] = useState<{ key: string; value: BriefOutput | null } | null>(null);
  const key = `${username}:${today}`;

  useEffect(() => {
    if (!enabled || !username || cached) return;
    let cancelled = false;
    aiApi
      .brief(getQuoteHistory(username))
      .then(brief => {
        if (brief) {
          setBriefCache(username, today, brief);
          pushQuoteHistory(username, brief.quote);
        }
        if (!cancelled) setFetched({ key, value: brief });
      })
      .catch(() => {
        if (!cancelled) setFetched({ key, value: null });
      });
    return () => {
      cancelled = true;
    };
    // `cached` is derived from the same inputs; listing it would refire after the write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, username, today, key]);

  if (!enabled || !username) return { state: 'none' };
  if (cached) return { state: 'ready', value: cached };
  if (!fetched || fetched.key !== key) return { state: 'loading' };
  return fetched.value ? { state: 'ready', value: fetched.value } : { state: 'none' };
}

/* CIPHER's coach line: one per day. Null from the server means there is no
   note yet (too little history) or the AI is unavailable. */
/* `signature` changes whenever the habits or today's check-offs do, which
   re-asks the server for the note. The server decides whether that is worth a
   new generation; caching it here as well used to freeze the note for the
   whole day, so it kept insisting you hadn't started a habit you just did. */
export function useCoachLine(enabled: boolean, signature: string): Load<CoachOutput> {
  const { user } = useAuth();
  const username = user?.username;
  const [fetched, setFetched] = useState<{ key: string; value: CoachOutput | null } | null>(null);
  const key = `${username}|${signature}`;

  useEffect(() => {
    if (!enabled || !username) return;
    let cancelled = false;
    aiApi
      .coach()
      .then(coach => {
        if (!cancelled) setFetched({ key, value: coach });
      })
      .catch(() => {
        if (!cancelled) setFetched({ key, value: null });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, username, key]);

  if (!enabled || !username) return { state: 'none' };
  // Keep the previous note on screen while a refresh is in flight rather than
  // dropping back to a skeleton on every check-off.
  if (!fetched) return { state: 'loading' };
  return fetched.value ? { state: 'ready', value: fetched.value } : { state: 'none' };
}
