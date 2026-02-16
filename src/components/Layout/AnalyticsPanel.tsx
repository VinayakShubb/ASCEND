import { useData } from '../../context/DataContext';
import { calculateDisciplineIndex, calculateDailyCompletion, calculateWeightedScore, getStreak } from '../../utils/calculations';
import { format, subDays } from 'date-fns';
import { Activity, Flame, Target, AlertTriangle } from 'lucide-react';

export const AnalyticsPanel = () => {
  const { habits, logs } = useData();
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const disciplineIndex = calculateDisciplineIndex(habits, logs);
  const dailyCompletion = Math.round(calculateDailyCompletion(habits, logs, today));
  const activeHabits = habits.filter(h => !h.archived);
  
  const habitStreaks = activeHabits.map(h => ({
    name: h.name,
    streak: getStreak(h.id, logs, today)
  }));
  
  const longestStreak = habitStreaks.length > 0 
    ? habitStreaks.reduce((a, b) => a.streak > b.streak ? a : b, { name: 'None', streak: 0 })
    : { name: 'None', streak: 0 };

  const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));
  const habitCompletions = activeHabits.map(h => {
    const completions = last7Days.filter(d => 
      logs.some(l => l.habit_id === h.id && l.date === d && l.status === 'completed')
    ).length;
    return { name: h.name, completions, total: 7 };
  });

  const mostMissed = habitCompletions.length > 0
    ? habitCompletions.reduce((worst, current) => current.completions < worst.completions ? current : worst)
    : null;

  const heatmapDays = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const score = calculateWeightedScore(habits, logs, dateStr);
    const dayLabel = format(date, 'EEE').charAt(0);
    let level = 0;
    if (score >= 100) level = 4;
    else if (score >= 75) level = 3;
    else if (score >= 50) level = 2;
    else if (score > 0) level = 1;
    return { dayLabel, level, score: Math.round(score) };
  });

  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (disciplineIndex / 100) * circumference;

  return (
    <>
      {/* Discipline Ring */}
      <div>
        <div className="analytics-section-title">Discipline Index</div>
        <div className="discipline-ring">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle className="discipline-ring-bg" cx="80" cy="80" r={radius} />
            <circle 
              className="discipline-ring-progress" 
              cx="80" cy="80" r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="discipline-ring-value">
            <div className="discipline-ring-number">{disciplineIndex}</div>
            <div className="discipline-ring-label">7-Day Avg</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div>
        <div className="analytics-section-title">Today</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div className="stat-card">
            <Activity size={16} className="stat-icon" />
            <div className="stat-value" style={{ fontSize: '1.4rem' }}>{dailyCompletion}%</div>
            <div className="stat-label">Daily Load</div>
          </div>
          <div className="stat-card">
            <Target size={16} className="stat-icon" />
            <div className="stat-value" style={{ fontSize: '1.4rem' }}>{activeHabits.length}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
      </div>

      {/* Week Heatmap */}
      <div>
        <div className="analytics-section-title">Weekly Heatmap</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          {heatmapDays.map((d, i) => (
            <span key={i} style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center', flex: 1 }}>
              {d.dayLabel}
            </span>
          ))}
        </div>
        <div className="week-heatmap">
          {heatmapDays.map((d, i) => (
            <div key={i} className={`heatmap-cell level-${d.level}`} title={`${d.score}%`} />
          ))}
        </div>
        <div className="flex-between" style={{ marginTop: 4 }}>
          <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>
            {format(subDays(new Date(), 6), 'MMM d')}
          </span>
          <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>Today</span>
        </div>
      </div>

      {/* Streak */}
      <div>
        <div className="analytics-section-title">Top Streak</div>
        <div className="card" style={{ padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame size={16} className="text-accent" />
            <div>
              <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{longestStreak.streak} days</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{longestStreak.name}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Attention Required */}
      {mostMissed && activeHabits.length > 0 && mostMissed.completions < 5 && (
        <div>
          <div className="analytics-section-title">Attention Required</div>
          <div className="card" style={{ padding: '0.75rem 1rem', borderColor: 'rgba(255,68,68,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} style={{ color: '#FF6B6B' }} />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{mostMissed.name}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {mostMissed.completions}/7 days — {mostMissed.completions === 0 ? 'Not started' : 'Needs focus'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insight */}
      <div>
        <div className="analytics-section-title">System Analysis</div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>
          {activeHabits.length === 0 
            ? '» No active protocols. Initialize habits to begin.'
            : disciplineIndex >= 80 
              ? '» Peak efficiency. Maintain protocol.' 
              : disciplineIndex >= 50 
                ? '» Acceptable variance. Optimize weak protocols.' 
                : disciplineIndex > 0 
                  ? '» Warning: Below threshold. Re-engage protocols.' 
                  : '» Insufficient data. Complete protocols to generate analysis.'}
        </p>
      </div>
    </>
  );
};
