import { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { statsApi, type StatsSummary } from '../lib/api';

const EMPTY_SUMMARY: StatsSummary = { discipline_index: 0, today_completion_pct: 0, today_weighted_score: 0 };

// Discipline Index / today's completion / today's weighted score, refetched
// whenever habits or logs change (e.g. right after toggling a habit) so
// these numbers stay in sync with the rest of the UI.
export function useStatsSummary(): StatsSummary {
  const { habits, logs } = useData();
  const [summary, setSummary] = useState<StatsSummary>(EMPTY_SUMMARY);

  useEffect(() => {
    statsApi
      .summary()
      .then(setSummary)
      .catch(() => setSummary(EMPTY_SUMMARY));
  }, [habits, logs]);

  return summary;
}

// Current streak per active habit, keyed by habit id.
export function useStreaks(): Record<string, number> {
  const { habits, logs } = useData();
  const [streaks, setStreaks] = useState<Record<string, number>>({});

  useEffect(() => {
    statsApi
      .streaks()
      .then(setStreaks)
      .catch(() => setStreaks({}));
  }, [habits, logs]);

  return streaks;
}
