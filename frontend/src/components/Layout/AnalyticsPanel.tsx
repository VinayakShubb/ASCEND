import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { calculateDisciplineIndex, calculateDailyCompletion, calculateWeightedScore, getStreak } from '../../utils/calculations';
import { getCoachInsight, type CoachOutput } from '../../utils/aiCoach';
import { format, subDays, isBefore, startOfDay } from 'date-fns';
import { Activity, Flame, Target, AlertTriangle, RefreshCw } from 'lucide-react';
import { CipherAvatar } from '../UI/CipherAvatar';
export const AnalyticsPanel = () => {
  const { habits, logs } = useData();
  const { user } = useAuth();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDate = startOfDay(new Date());
  
  const disciplineIndex = calculateDisciplineIndex(habits, logs);
  const dailyCompletion = Math.round(calculateDailyCompletion(habits, logs, today));
  const activeHabits = habits.filter(h => !h.archived);
  
  const [aiInsight, setAiInsight] = useState<CoachOutput | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const fetchInsight = async () => {
      // User object from AuthProvider doesn't have an ID, so we use their username for caching
      if (!user || activeHabits.length === 0) return;
      setIsAiLoading(true);
      const insight = await getCoachInsight(user.username, habits, logs);
      setAiInsight(insight);
      setIsAiLoading(false);
    };
    
    fetchInsight();
  }, [user, habits, logs, activeHabits.length]);

  const handleRefreshAi = async () => {
    if (!user || activeHabits.length === 0) return;
    setIsAiLoading(true);
    const insight = await getCoachInsight(user.username, habits, logs, true);
    setAiInsight(insight);
    setIsAiLoading(false);
  };
  
  const habitStreaks = activeHabits.map(h => ({
    name: h.name,
    streak: getStreak(h.id, logs, today)
  }));
  
  // Top Streak: only show a protocol name if at least one has streak > 0
  const maxStreak = habitStreaks.length > 0 
    ? Math.max(...habitStreaks.map(h => h.streak), 0)
    : 0;

  const topStreakEntries = maxStreak > 0
    ? habitStreaks.filter(h => h.streak === maxStreak)
    : [];

  const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));
  const habitCompletions = activeHabits.map(h => {
    const completions = last7Days.filter(d => 
      logs.some(l => l.habit_id === h.id && l.date === d && l.status === 'completed')
    ).length;
    return { name: h.name, completions, total: 7 };
  });

  // Attention Required: show ALL protocols that need attention (< 5/7 completions), sorted by worst first
  const attentionNeeded = habitCompletions
    .filter(h => h.completions < 5 && h.name && h.name !== 'NaN')
    .sort((a, b) => a.completions - b.completions);

  // Weekly heatmap with past day detection
  const heatmapDays = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const score = calculateWeightedScore(habits, logs, dateStr);
    const dayLabel = format(date, 'EEE').charAt(0);
    const isPastDay = isBefore(startOfDay(date), todayDate) && dateStr !== today;
    const isToday = dateStr === today;
    let level = 0;
    if (score >= 100) level = 4;
    else if (score >= 75) level = 3;
    else if (score >= 50) level = 2;
    else if (score > 0) level = 1;
    return { dayLabel, level, score: Math.round(score), isPastDay, isToday };
  });

  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (disciplineIndex / 100) * circumference;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'elite': return '#00ff88';
      case 'solid': return '#00cc66';
      case 'slipping': return '#ffaa00';
      case 'critical': return '#ff4444';
      default: return 'var(--text-secondary)';
    }
  };

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

      {/* Week Heatmap — past days show × like calendar */}
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
          {heatmapDays.map((d, i) => {
            const missed = d.isPastDay && d.score === 0;
            return (
              <div 
                key={i} 
                className={`heatmap-cell level-${d.level}`} 
                title={`${d.score}%`}
                style={{ 
                  position: 'relative', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  outline: d.isToday ? '2px solid var(--accent-primary)' : undefined,
                  outlineOffset: d.isToday ? '-1px' : undefined,
                  background: missed ? 'rgba(255, 68, 68, 0.18)' : undefined,
                }}
              >
                {missed && (
                  <span style={{ 
                    fontSize: '0.65rem', 
                    color: '#FF4444', 
                    fontWeight: 700, 
                    lineHeight: 1, 
                    pointerEvents: 'none' 
                  }}>×</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex-between" style={{ marginTop: 4 }}>
          <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>
            {format(subDays(new Date(), 6), 'MMM d')}
          </span>
          <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>Today</span>
        </div>
      </div>
      
      {/* Streak — only show protocol name when streak > 0 */}
      <div>
        <div className="analytics-section-title">Top Streak</div>
        <div className="card" style={{ padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame size={16} className="text-accent" />
            <div>
              <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{maxStreak} days</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {topStreakEntries.length > 0 
                  ? (
                    topStreakEntries.length > 2 
                      ? `${topStreakEntries.slice(0, 2).map(h => h.name).join(', ')} and ${topStreakEntries.length - 2} others`
                      : topStreakEntries.map(h => h.name).join(', ')
                  )
                  : 'No active streaks'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attention Required — show ALL protocols that need attention */}
      {attentionNeeded.length > 0 && activeHabits.length > 0 && (
        <div>
          <div className="analytics-section-title">Attention Required</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {attentionNeeded.map((item, idx) => (
              <div key={idx} className="card" style={{ padding: '0.75rem 1rem', borderColor: 'rgba(255,68,68,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} style={{ color: '#FF6B6B', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {item.completions}/7 days — {item.completions === 0 ? 'Not started' : 'Needs focus'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live AI Coach Insight */}
      <div>
        <div className="analytics-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>System Analysis</span>
          <button 
            onClick={handleRefreshAi} 
            disabled={isAiLoading || activeHabits.length === 0}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: (isAiLoading || activeHabits.length === 0) ? 'not-allowed' : 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              opacity: (isAiLoading || activeHabits.length === 0) ? 0.5 : 1
            }}
            title="Refresh Coach Insight"
          >
            <RefreshCw size={14} className={isAiLoading ? 'spin' : ''} />
          </button>
        </div>
        
        {isAiLoading ? (
            <div className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
                <RefreshCw size={16} className="spin text-accent" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Analyzing protocols...</span>
            </div>
        ) : aiInsight && activeHabits.length > 0 ? (
            <div className="card" style={{ padding: '1rem', borderTop: `2px solid ${getStatusColor(aiInsight.status)}` }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    marginBottom: '1rem',
                    flexWrap: 'wrap' // allows mobile wrapping
                }}>
                    <div style={{ flexShrink: 0 }}>
                        <CipherAvatar mood={aiInsight.status as any} size="md" />
                    </div>
                    <div style={{ flex: '1 1 min-content' }}>
                        <div style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 700, 
                            letterSpacing: '0.1em', 
                            color: getStatusColor(aiInsight.status),
                            textTransform: 'uppercase',
                            marginBottom: '0.25rem'
                        }}>
                            [{aiInsight.status}]
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', textTransform: 'uppercase', lineHeight: 1.3 }}>
                            {aiInsight.headline}
                        </div>
                    </div>
                </div>
                
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                    {aiInsight.insight}
                </div>
                
                <div style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.5rem 0.75rem', 
                    background: 'rgba(0,0,0,0.2)', 
                    borderRadius: '4px',
                    borderLeft: '2px solid var(--accent-primary)'
                }}>
                    <strong style={{ color: 'var(--accent-primary)', marginRight: '0.5rem' }}>NOW →</strong>
                    <span style={{ color: '#fff' }}>{aiInsight.action}</span>
                </div>
            </div>
        ) : (
            <div className="card" style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
                {activeHabits.length === 0 
                    ? '» No active protocols. Initialize habits to begin analysis.'
                    : '» Fresh start. Complete protocols to generate your index.'}
                </p>
            </div>
        )}
      </div>
    </>
  );
};
