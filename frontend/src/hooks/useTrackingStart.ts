import { useMemo } from 'react';
import { format, parseISO, startOfDay } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { HabitLog } from '../types';

/* The day a user's history starts: the earlier of account creation and their
   first completed log. History can predate the account (imported or seeded
   data), and pages that start their date range at signup would hide it.
   Mirrors calculations.tracking_start_date on the backend. */
export function trackingStartDate(createdAt: string | undefined, logs: HabitLog[], today = new Date()): Date {
  const todayStart = startOfDay(today);
  let start = createdAt ? startOfDay(parseISO(createdAt)) : todayStart;
  for (const log of logs) {
    if (log.status !== 'completed') continue;
    const day = parseISO(log.date); // date-only strings parse as local midnight
    if (day < start) start = day;
  }
  return start > todayStart ? todayStart : start;
}

/* Stable across renders unless the start day actually changes. */
export function useTrackingStart(): Date {
  const { user } = useAuth();
  const { logs } = useData();
  const key = format(trackingStartDate(user?.created_at, logs), 'yyyy-MM-dd');
  return useMemo(() => parseISO(key), [key]);
}
