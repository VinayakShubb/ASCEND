import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useStreaks } from '../../hooks/useStats';
import { statsApi, type DayStat } from '../../lib/api';
import { format, subDays, addDays } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, BarChart2, Target, Flame, Activity } from 'lucide-react';
import { PerformanceChart } from '../UI/PerformanceChart';
import { AppFooter } from '../UI/AppFooter';

type TrendWindow =
  | { mode: 'journey'; start: Date; end: Date; registrationDate: Date; todayDate: Date }
  | { mode: 'rolling'; start: Date; end: Date; registrationDate: Date; todayDate: Date };

export const AnalyticsPage = () => {
  const { habits, logs } = useData();
  const { user } = useAuth();
  const activeHabits = habits.filter(h => !h.archived);
  const streaks = useStreaks();

  const [rangeStats, setRangeStats] = useState<DayStat[]>([]);
  const [disciplineIndex, setDisciplineIndex] = useState(0);
  const [todayCompletion, setTodayCompletion] = useState(0);
  const [lastWeekAvg, setLastWeekAvg] = useState(0);

  // MODE 1: Journey Mode (first 30 days from registration).
  // MODE 2: Rolling Window (last 30 days) once the user is older than that.
  const trendWindow: TrendWindow | null = useMemo(() => {
    if (!user?.created_at) return null;

    const registrationDate = new Date(user.created_at);
    registrationDate.setHours(0, 0, 0, 0);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(todayDate.getTime() - registrationDate.getTime());
    const daysSinceRegistration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysSinceRegistration <= 30) {
      return { mode: 'journey', start: registrationDate, end: addDays(registrationDate, 29), registrationDate, todayDate };
    }
    return { mode: 'rolling', start: subDays(new Date(), 29), end: new Date(), registrationDate, todayDate };
  }, [user]);

  // Fetch the day-by-day series once per trend window (clamped to today --
  // there's nothing to fetch for future days, they render as a gap instead).
  useEffect(() => {
    if (!trendWindow) return;
    const clampedEnd = trendWindow.end > trendWindow.todayDate ? trendWindow.todayDate : trendWindow.end;
    // Only unreachable in practice (registration date is never after today),
    // but guarded rather than assumed.
    if (clampedEnd < trendWindow.start) return;
    statsApi
      .range(format(trendWindow.start, 'yyyy-MM-dd'), format(clampedEnd, 'yyyy-MM-dd'))
      .then(setRangeStats)
      .catch(() => setRangeStats([]));
  }, [trendWindow]);

  // Discipline Index (= this week's 7-day average) and last week's 7-day
  // average, both computed server-side to avoid re-deriving a rolling
  // average from already-rounded per-day numbers.
  useEffect(() => {
    statsApi
      .summary()
      .then(s => {
        setDisciplineIndex(s.discipline_index);
        setTodayCompletion(s.today_completion_pct);
      })
      .catch(() => {});
    statsApi
      .summary(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
      .then(s => setLastWeekAvg(s.discipline_index))
      .catch(() => {});
  }, [habits, logs]);

  const thisWeekAvg = disciplineIndex;
  const weekDelta = thisWeekAvg - lastWeekAvg;

  const trendData = useMemo(() => {
    if (!trendWindow) return [];
    const byDate = new Map(rangeStats.map(d => [d.date, d]));

    if (trendWindow.mode === 'journey') {
      return Array.from({ length: 30 }, (_, i) => {
        const date = addDays(trendWindow.registrationDate, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        if (date > trendWindow.todayDate) {
          return { date: format(date, 'MMM d'), score: null };
        }
        return { date: format(date, 'MMM d'), score: byDate.get(dateStr)?.weighted_score ?? 0 };
      });
    }

    return Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      return { date: format(date, 'MMM d'), score: byDate.get(dateStr)?.weighted_score ?? 0 };
    });
  }, [trendWindow, rangeStats]);

  // Per-habit detailed analysis. Week/month completion counts are plain
  // lookups over already-fetched logs -- this was never calculations.ts
  // logic, just filtering, so it stays exactly as it was.
  const habitAnalysis = useMemo(() => {
    return activeHabits
      .map(habit => {
        const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));
        const last30Days = Array.from({ length: 30 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));

        const weekCompletions = last7Days.filter(d =>
          logs.some(l => l.habit_id === habit.id && l.date === d && l.status === 'completed')
        ).length;

        const monthCompletions = last30Days.filter(d =>
          logs.some(l => l.habit_id === habit.id && l.date === d && l.status === 'completed')
        ).length;

        const weekConsistency = Math.round((weekCompletions / 7) * 100);
        const monthConsistency = Math.round((monthCompletions / 30) * 100);
        const streak = streaks[habit.id] ?? 0;

        const weekPattern = last7Days.reverse().map(d => ({
          day: format(new Date(d + 'T00:00:00'), 'EEE'),
          completed: logs.some(l => l.habit_id === habit.id && l.date === d && l.status === 'completed'),
        }));

        const totalCompletions = logs.filter(l => l.habit_id === habit.id && l.status === 'completed').length;

        return {
          ...habit,
          weekCompletions,
          monthCompletions,
          weekConsistency,
          monthConsistency,
          streak,
          weekPattern,
          totalCompletions,
        };
      })
      .sort((a, b) => b.weekConsistency - a.weekConsistency);
  }, [activeHabits, logs, streaks]);

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="page-title">Intelligence // Analytics</div>
        <div className="page-subtitle">Deep analysis of discipline patterns and performance metrics</div>
      </div>

      {/* Top Stats */}
      <div className="stat-grid mb-2">
        <div className="stat-card">
          <Target size={18} className="stat-icon" />
          <div className="stat-value">{disciplineIndex}</div>
          <div className="stat-label">Discipline Index</div>
        </div>
        <div className="stat-card">
          <Activity size={18} className="stat-icon" />
          <div className="stat-value">{todayCompletion}%</div>
          <div className="stat-label">Today's Completion</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            {weekDelta > 0 ? <TrendingUp size={18} style={{ color: '#00FF66' }} /> :
             weekDelta < 0 ? <TrendingDown size={18} style={{ color: '#FF4444' }} /> :
             <Minus size={18} />}
          </div>
          <div className="stat-value" style={{ color: weekDelta > 0 ? '#00FF66' : weekDelta < 0 ? '#FF4444' : undefined }}>
            {weekDelta > 0 ? '+' : ''}{weekDelta}%
          </div>
          <div className="stat-label">Week Change</div>
        </div>
        <div className="stat-card">
          <BarChart2 size={18} className="stat-icon" />
          <div className="stat-value">{activeHabits.length}</div>
          <div className="stat-label">Total Protocols</div>
        </div>
      </div>

      {/* 30-Day Trend Chart */}
      <div className="chart-container mb-2">
        <div className="card-title mb-1">30-Day Performance Trend</div>
        <PerformanceChart data={trendData} />
      </div>

      {/* Detailed Per-Protocol Analysis */}
      <div>
        <div className="card-title mb-1" style={{ fontSize: '0.85rem' }}>
          Detailed Protocol Analysis — {activeHabits.length} Active Protocol{activeHabits.length !== 1 ? 's' : ''}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {habitAnalysis.map(habit => (
            <div key={habit.id} className="card">
              {/* Habit Header */}
              <div className="flex-between mb-1">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{habit.name}</span>
                  <span className="badge">{habit.difficulty}</span>
                  <span className="badge">{habit.category}</span>
                </div>
                {habit.streak > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Flame size={14} className="text-accent" />
                    <span className="mono text-accent" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{habit.streak}d streak</span>
                  </div>
                )}
              </div>

              {/* Stats Row */}
              <div className="stat-grid mb-1">
                <div style={{ background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: 4, textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: '1rem', fontWeight: 600 }}>{habit.weekConsistency}%</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>7d Consistency</div>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: 4, textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: '1rem', fontWeight: 600 }}>{habit.monthConsistency}%</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>30d Consistency</div>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: 4, textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: '1rem', fontWeight: 600 }}>{habit.weekCompletions}/7</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>This Week</div>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: 4, textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: '1rem', fontWeight: 600 }}>{habit.totalCompletions}</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>All Time</div>
                </div>
              </div>

              {/* 7-Day Consistency Bar */}
              <div>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weekly Progress</span>
                  <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>{habit.weekConsistency}%</span>
                </div>
                <div style={{
                  width: '100%', height: '6px', background: 'var(--bg-primary)',
                  borderRadius: '3px', overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${habit.weekConsistency}%`, height: '100%',
                    background: habit.weekConsistency >= 80 ? 'var(--accent-primary)' : habit.weekConsistency >= 50 ? '#FF9800' : '#FF4444',
                    borderRadius: '3px', transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>

              {/* Week Pattern Dots */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Last 7d:</span>
                {habit.weekPattern.map((d, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 3,
                      background: d.completed ? 'var(--accent-primary)' : 'var(--bg-primary)',
                      border: d.completed ? 'none' : '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.5rem', color: d.completed ? 'var(--bg-primary)' : 'var(--text-muted)'
                    }}>
                      {d.completed ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {habitAnalysis.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p className="text-muted">No protocols to analyze. Add habits to begin tracking.</p>
            </div>
          )}
        </div>
      </div>

      <AppFooter />
    </div>
  );
};
