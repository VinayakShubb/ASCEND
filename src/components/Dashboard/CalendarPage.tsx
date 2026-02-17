import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { format, eachDayOfInterval, startOfDay, isBefore, getDay, differenceInCalendarWeeks, isFuture, parseISO, addYears } from 'date-fns';
import { Check, X } from 'lucide-react';
import { calculateDailyCompletion } from '../../utils/calculations';

export const CalendarPage = () => {
  const { habits, logs, toggleHabitCompletion, getHabitStatus } = useData();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayDate = startOfDay(today);
  const activeHabits = habits.filter(h => !h.archived);

  // 12-month window starting from registration date
  const yearStart = useMemo(() => {
    return user?.created_at ? startOfDay(parseISO(user.created_at)) : todayDate;
  }, [user?.created_at]);
  const yearEnd = useMemo(() => {
    const end = addYears(yearStart, 1);
    return new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1); // 12 months exactly
  }, [yearStart]);

  // Generate all days from registration to registration + 12 months
  const allDays = useMemo(() => {
    return eachDayOfInterval({ start: yearStart, end: yearEnd });
  }, [yearStart, yearEnd]);

  // Build heatmap data
  const heatmapData = useMemo(() => {
    return allDays.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const score = calculateDailyCompletion(habits, logs, dateStr);
      const dayOfWeek = getDay(date); // 0=Sunday
      const futureDay = isFuture(date);
      const isPast = isBefore(startOfDay(date), todayDate) && dateStr !== todayStr;

      let level = 0;
      if (futureDay) level = -1; // future
      else if (score >= 100) level = 4;
      else if (score >= 75) level = 3;
      else if (score >= 50) level = 2;
      else if (score > 0) level = 1;

      return { date: dateStr, score: Math.round(score), level, dayOfWeek, isPast, futureDay };
    });
  }, [allDays, habits, logs, todayStr]);

  // Group into week columns (Sun=start)
  const weekColumns = useMemo(() => {
    const cols: Array<typeof heatmapData> = [];
    let currentWeek: typeof heatmapData = [];
    let lastWeekNum = -1;

    heatmapData.forEach((day, _i) => {
      const weekNum = differenceInCalendarWeeks(new Date(day.date + 'T00:00:00'), yearStart, { weekStartsOn: 0 });
      if (weekNum !== lastWeekNum) {
        if (currentWeek.length > 0) cols.push(currentWeek);
        currentWeek = [];
        lastWeekNum = weekNum;
      }
      currentWeek.push(day);
    });
    if (currentWeek.length > 0) cols.push(currentWeek);

    return cols;
  }, [heatmapData]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: Array<{ label: string; colIndex: number }> = [];
    let lastMonth = -1;

    weekColumns.forEach((week, colIndex) => {
      // Use the first day of each week to determine month
      const firstDay = week[0];
      const month = new Date(firstDay.date + 'T00:00:00').getMonth();
      if (month !== lastMonth) {
        labels.push({ label: format(new Date(firstDay.date + 'T00:00:00'), 'MMM'), colIndex });
        lastMonth = month;
      }
    });
    return labels;
  }, [weekColumns]);

  const selectedDateHabits = activeHabits.map(h => ({
    ...h,
    status: getHabitStatus(h.id, selectedDate)
  }));

  const selectedDayScore = calculateDailyCompletion(habits, logs, selectedDate);
  const isPastDay = isBefore(new Date(selectedDate + 'T00:00:00'), todayDate) && selectedDate !== todayStr;
  const isFutureDay = isFuture(new Date(selectedDate + 'T00:00:00'));

  // Stats
  const currentStreak = useMemo(() => {
    let streak = 0;
    const d = new Date(today);
    while (streak < 365) {
      const dateStr = format(d, 'yyyy-MM-dd');
      if (calculateDailyCompletion(habits, logs, dateStr) > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  }, [habits, logs, todayStr]);

  const totalActiveDays = useMemo(() => heatmapData.filter(d => d.score > 0).length, [heatmapData]);
  const totalMissedDays = useMemo(() => heatmapData.filter(d => d.isPast && d.score === 0).length, [heatmapData]);

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="page-title">Calendar</div>
        <div className="page-subtitle">Protocol execution — since {format(yearStart, 'MMM d, yyyy')}</div>
      </div>

      {/* Stats Row */}
      <div className="stat-grid mb-2">
        <div className="stat-card">
          <div className="stat-value">{currentStreak}</div>
          <div className="stat-label">Day Streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalActiveDays}</div>
          <div className="stat-label">Active Days</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: totalMissedDays > 0 ? '#FF4444' : undefined }}>{totalMissedDays}</div>
          <div className="stat-label">Missed Days</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(selectedDayScore)}%</div>
          <div className="stat-label">Selected Day</div>
        </div>
      </div>

      {/* GitHub-style Heatmap */}
      <div className="card mb-2 heatmap-container">
        <div className="heatmap-scroll">
          {/* Month labels row */}
          <div className="heatmap-month-row">
            <div className="heatmap-day-spacer" />
            {weekColumns.map((_week, colIdx) => {
              const label = monthLabels.find(m => m.colIndex === colIdx);
              return (
                <div key={colIdx} className="heatmap-month-cell">
                  {label ? label.label : ''}
                </div>
              );
            })}
          </div>

          {/* Grid: day labels + cells */}
          <div className="heatmap-body">
            {/* Day-of-week labels */}
            <div className="heatmap-day-labels">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                <div key={i} className="heatmap-day-label">{d}</div>
              ))}
            </div>

            {/* Week columns */}
            <div className="heatmap-grid">
              {weekColumns.map((week, wIdx) => (
                <div key={wIdx} className="heatmap-week-col">
                  {/* Pad first week if it doesn't start on Sunday */}
                  {wIdx === 0 && week[0].dayOfWeek > 0 &&
                    Array.from({ length: week[0].dayOfWeek }).map((_, i) => (
                      <div key={`pad-${i}`} className="heatmap-cell-empty" />
                    ))
                  }
                  {week.map(day => {
                    const isToday = day.date === todayStr;
                    const isSelected = day.date === selectedDate;
                    const missed = day.isPast && day.score === 0;
                    
                    return (
                      <div
                        key={day.date}
                        className={[
                          'hm-cell',
                          `lv-${day.level === -1 ? 'future' : day.level}`,
                          isToday ? 'is-today' : '',
                          isSelected ? 'is-selected' : '',
                          missed ? 'is-missed' : '',
                        ].join(' ')}
                        onClick={() => !day.futureDay && setSelectedDate(day.date)}
                      >
                        <span className="hm-tooltip">
                          {format(new Date(day.date + 'T00:00:00'), 'MMM d, yyyy')}
                          {!day.futureDay && ` · ${day.score}%`}
                        </span>
                        {missed && <span className="hm-x">×</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="heatmap-legend">
          <span className="heatmap-legend-text">Missed</span>
          <div className="hm-cell lv-0 is-missed" style={{ cursor: 'default', position: 'relative' }}>
            <span className="hm-x">×</span>
          </div>
          <div style={{ width: 8 }} />
          <span className="heatmap-legend-text">Less</span>
          <div className="hm-cell lv-0" style={{ cursor: 'default' }} />
          <div className="hm-cell lv-1" style={{ cursor: 'default' }} />
          <div className="hm-cell lv-2" style={{ cursor: 'default' }} />
          <div className="hm-cell lv-3" style={{ cursor: 'default' }} />
          <div className="hm-cell lv-4" style={{ cursor: 'default' }} />
          <span className="heatmap-legend-text">More</span>
        </div>
      </div>

      {/* Selected Day Detail */}
      {!isFutureDay && (
        <div className="card">
          <div className="flex-between mb-1">
            <div>
              <div className="card-title" style={{ fontSize: '0.75rem' }}>
                {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
              </div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {isPastDay ? '🔒 READ ONLY' : selectedDate === todayStr ? '🟢 TODAY — ACTIVE' : ''}
              </div>
            </div>
            <span className="mono text-accent" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {Math.round(selectedDayScore)}%
            </span>
          </div>

          <div style={{ 
            width: '100%', height: '3px', background: 'var(--bg-primary)', 
            borderRadius: '2px', overflow: 'hidden', marginBottom: '1rem' 
          }}>
            <div style={{ 
              width: `${Math.min(selectedDayScore, 100)}%`, height: '100%', 
              background: selectedDayScore >= 100 ? '#00FF66' : selectedDayScore >= 50 ? 'var(--accent-primary)' : '#FF4444',
              borderRadius: '2px', transition: 'width 0.3s ease'
            }} />
          </div>

          <div className="card-title" style={{ marginBottom: '0.5rem', fontSize: '0.6rem' }}>
            Protocols ({selectedDateHabits.filter(h => h.status === 'completed').length}/{selectedDateHabits.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {selectedDateHabits.map(habit => {
              const isCompleted = habit.status === 'completed';
              return (
                <div
                  key={habit.id}
                  className={`habit-item ${isCompleted ? 'completed' : ''}`}
                  style={{ padding: '0.55rem 0.85rem', opacity: isPastDay ? 0.65 : 1 }}
                >
                  <button
                    className={`habit-check ${isCompleted ? 'checked' : ''}`}
                    onClick={() => !isPastDay && toggleHabitCompletion(habit.id, selectedDate)}
                    style={{ 
                      width: 16, height: 16, 
                      cursor: isPastDay ? 'not-allowed' : 'pointer',
                      opacity: isPastDay && !isCompleted ? 0.3 : 1
                    }}
                    disabled={isPastDay}
                  >
                    {isCompleted ? <Check size={10} /> : (isPastDay && <X size={8} style={{ color: '#FF4444', opacity: 0.5 }} />)}
                  </button>
                  <div className="habit-info">
                    <div className={`habit-name ${isCompleted ? 'completed' : ''}`} style={{ fontSize: '0.8rem' }}>
                      {habit.name}
                    </div>
                  </div>
                  <span className="badge" style={{ fontSize: '0.5rem' }}>{habit.difficulty}</span>
                </div>
              );
            })}

            {activeHabits.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                <p className="text-muted" style={{ fontSize: '0.75rem' }}>No active protocols.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
