/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { getCipherAnalysis } from '../../utils/aiCoach';
import type { CipherAnalysisOutput } from '../../utils/aiCoach';
import { calculateDisciplineIndex, calculateWeightedScore } from '../../utils/calculations';
import { CipherAvatar } from '../UI/CipherAvatar';
import { CipherRing } from '../UI/CipherRing';
import { RefreshCw, Play, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import './cipherAnimations.css';
import { AppFooter } from '../UI/AppFooter';

/* ─── EXECUTION TYPE DETECTION ─── */
const EXECUTION_TYPES = [
  "BURST EXECUTOR", "CONSISTENT BUILDER", "SLOW STARTER", "WEEKEND WARRIOR",
  "ALL OR NOTHING", "DECLINING PERFORMER", "GHOST MODE", "EARLY QUITTER",
  "COMEBACK KID", "SELECTIVE EXECUTOR"
];

const TYPE_QUOTES: Record<string, string> = {
  "BURST EXECUTOR": "You can do it. You just refuse to do it consistently.",
  "CONSISTENT BUILDER": "Rare. Keep this energy — most people never reach it.",
  "SLOW STARTER": "Late ignition. The engine is warming up. Do not stop now.",
  "WEEKEND WARRIOR": "Your discipline has an on/off switch tied to the calendar. Fix that.",
  "ALL OR NOTHING": "Perfectionism is killing your streak. A 50% day beats a 0% day every time.",
  "DECLINING PERFORMER": "You started stronger than you are finishing. That trend reverses today or it does not.",
  "GHOST MODE": "You built the system. You just forgot to use it.",
  "EARLY QUITTER": "You start every week ready. Wednesday disagrees.",
  "COMEBACK KID": "You keep falling. You keep getting up. That counts for something.",
  "SELECTIVE EXECUTOR": "You are doing the easy things and avoiding the hard ones. The index sees everything.",
};

const STATUS_COLORS: Record<string, string> = {
  elite: '#00ff88',
  solid: '#00cc66',
  slipping: '#ffaa00',
  critical: '#ff4444',
};

export const CipherPage = () => {
  const { user } = useAuth();
  const { habits, logs } = useData();
  const [analysis, setAnalysis] = useState<CipherAnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayDi, setDisplayDi] = useState(0);
  const [displayMax, setDisplayMax] = useState(0);
  const [showTransition, setShowTransition] = useState(false);

  const activeHabits = useMemo(() => habits.filter(h => !h.archived), [habits]);

  /* ─── COMPUTED DATA ─── */
  const computed = useMemo(() => {
    if (!user || activeHabits.length === 0) {
      return {
        daysSinceReg: 0, disciplineIndex: 0, maxDi: 100, habitStats: [],
        worstHabitMissedDays: 0, longestDeadStreak: 0,
        worstDay: { date: 'N/A', score: 0, total: 0 },
        mostBrokenHabit: 'N/A', biggestDrop: 0,
      };
    }

    const regDate = new Date(user.created_at || new Date());
    regDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(today.getTime() - regDate.getTime());
    const daysSinceReg = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const currentDi = Math.round(calculateDisciplineIndex(habits, logs));

    // Max possible DI if user completes everything today
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const mockLogs = [...logs];
    activeHabits.forEach(h => {
      if (!mockLogs.some(l => l.habit_id === h.id && l.date === todayStr && l.status === 'completed')) {
        mockLogs.push({ id: `mock-${h.id}`, habit_id: h.id, date: todayStr, status: 'completed', created_at: new Date().toISOString() } as any);
      }
    });
    const maxDi = Math.min(100, Math.ceil(calculateDisciplineIndex(habits, mockLogs)));

    // Per-habit stats
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const validDays = Math.min(30, daysSinceReg);

    const habitStats = activeHabits.map(h => {
      const hLogs = logs.filter(l => l.habit_id === h.id && l.status === 'completed');
      const comp30d = hLogs.filter(l => new Date(l.date) >= cutoff).length;
      const rate30d = validDays > 0 ? Math.round((comp30d / validDays) * 100) : 0;
      return { ...h, rate30d, totalCompletions: hLogs.length, missedDays: validDays - comp30d };
    });

    // Worst habit missed days for key stat
    const sorted = [...habitStats].sort((a, b) => a.rate30d - b.rate30d);
    const worstHabitMissedDays = sorted.length > 0 ? sorted[0].missedDays : 0;
    const mostBrokenHabit = sorted.length > 0 ? sorted[0].name : 'N/A';

    // Daily scores for lowlights computation
    const dailyScores: { date: string; score: number }[] = [];
    for (let d = new Date(regDate); d <= today; d.setDate(d.getDate() + 1)) {
      const ds = format(new Date(d), 'yyyy-MM-dd');
      const score = Math.round(calculateWeightedScore(habits, logs, ds));
      dailyScores.push({ date: ds, score });
    }

    // Longest dead streak (consecutive days at 0)
    let longestDeadStreak = 0;
    let currentStreak = 0;
    for (const day of dailyScores) {
      if (day.score === 0) { currentStreak++; longestDeadStreak = Math.max(longestDeadStreak, currentStreak); }
      else { currentStreak = 0; }
    }

    // Worst single day
    const worstDay = dailyScores.length > 0
      ? dailyScores.reduce((w, d) => d.score < w.score ? d : w, dailyScores[0])
      : { date: 'N/A', score: 0 };

    // Biggest single-day drop
    let biggestDrop = 0;
    for (let i = 1; i < dailyScores.length; i++) {
      const drop = dailyScores[i - 1].score - dailyScores[i].score;
      if (drop > biggestDrop) biggestDrop = drop;
    }

    return {
      daysSinceReg, disciplineIndex: currentDi, maxDi, habitStats,
      worstHabitMissedDays, longestDeadStreak,
      worstDay: { date: worstDay.date, score: worstDay.score, total: activeHabits.length },
      mostBrokenHabit, biggestDrop,
    };
  }, [user, activeHabits, habits, logs]);

  const isNewUser = computed.daysSinceReg <= 3;
  const isDayFourTransition = computed.daysSinceReg >= 4 && !localStorage.getItem('cipher_veteran_seen');

  /* ─── CACHE LOAD ─── */
  useEffect(() => {
    if (!user || activeHabits.length === 0) return;
    const dateStr = new Date().toDateString();
    const cacheKey = `ascend_ai_cipher_${user.username}_${dateStr}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setAnalysis(JSON.parse(cached));
      } catch {
        console.error('Failed to parse cached CIPHER analysis');
      }
    }
  }, [user, activeHabits.length]);

  /* ─── RUN ANALYSIS ─── */
  const handleRunAnalysis = async (force: boolean = false) => {
    if (!user || activeHabits.length === 0) return;
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setDisplayDi(0);
    setDisplayMax(0);

    try {
      const result = await getCipherAnalysis(user.username, user.created_at, habits, logs, force, isNewUser);
      if (result) {
        setAnalysis(result);
      } else {
        setError("Connection error or rate limit reached. Try again in a moment.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ─── SCROLL ANIMATIONS ─── */
  useEffect(() => {
    if (!analysis || isLoading) return;

    setDisplayDi(0);
    setDisplayMax(0);

    // General scroll observer for CSS animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        } else {
          entry.target.classList.remove('is-visible');
        }
      });
    }, { threshold: 0.15 });

    // Ensure DOM is ready, then observe
    const timer = setTimeout(() => {
      const animatedEls = document.querySelectorAll('.scroll-animate, .scroll-slide-left, .scroll-slide-right, .scroll-scale, .cipher-timeline-node, .directive-card');
      animatedEls.forEach(el => observer.observe(el));

      // Specific observer for Ceiling count-up
      const ceilingObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          // Count-up for ceiling numbers
          let frame = 0;
          const totalFrames = 40;
          const animate = () => {
            frame++;
            const easeOut = 1 - Math.pow(1 - frame / totalFrames, 3);
            setDisplayDi(Math.min(computed.disciplineIndex, Math.round(computed.disciplineIndex * easeOut)));
            setDisplayMax(Math.min(computed.maxDi, Math.round(computed.maxDi * easeOut)));
            if (frame < totalFrames) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);

          // Ceiling bar fill
          const pct = computed.maxDi > 0 ? Math.round((computed.disciplineIndex / computed.maxDi) * 100) : 0;
          const track = document.querySelector('.ceiling-fill') as HTMLElement;
          if (track) track.style.width = `${pct}%`;

          // Disconnect after triggering once
          ceilingObserver.disconnect();
        }
      }, { threshold: 0.5 });

      const ceilingEl = document.querySelector('.ceiling-numbers');
      if (ceilingEl) ceilingObserver.observe(ceilingEl);
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, isLoading]);

  /* ─── HELPERS ─── */
  const getHabitRate = (name: string) => {
    const h = computed.habitStats.find(hs => hs.name.toLowerCase() === name?.toLowerCase());
    return h ? h.rate30d : 0;
  };
  const getHabitTotal = (name: string) => {
    const h = computed.habitStats.find(hs => hs.name.toLowerCase() === name?.toLowerCase());
    return h ? h.totalCompletions : 0;
  };

  const getTimelineDotColor = (key: string, idx: number, total: number): string => {
    if (idx === 0) return 'var(--accent-primary)'; // registration = milestone
    if (idx === total - 1) return 'var(--accent-primary)'; // today = milestone
    const lk = key.toLowerCase();
    if (lk.includes('dead') || lk.includes('drop') || lk.includes('worst') || lk.includes('collapse')) return '#ff4444';
    if (lk.includes('best') || lk.includes('record') || lk.includes('100')) return '#00ff88';
    return '#888888'; // neutral
  };

  const statusColor = analysis
    ? (isNewUser ? '#00cc66' : (STATUS_COLORS[analysis.status] || '#ffaa00'))
    : '#ffaa00';

  if (!user) return null;

  /* ─── NO HABITS STATE ─── */
  if (activeHabits.length === 0) {
    return (
      <div className="cipher-page fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: 24, marginBottom: 32 }}>
          <CipherAvatar mood="idle" size="sm" />
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>CIPHER ANALYSIS</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Full spectrum performance audit // {user.username}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 16 }}>
          <CipherAvatar mood="idle" size="md" />
          <div style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.15em' }}>No protocols to analyze.</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, opacity: 0.6 }}>Add protocols in Command Center first.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="cipher-page fade-in" style={{ paddingBottom: 80 }}>

      {/* ════════════════════════════════════════════
          SECTION 1: PAGE HEADER
          ════════════════════════════════════════════ */}
      <div className="scroll-animate is-visible cipher-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <CipherAvatar mood={isLoading ? 'analyzing' : (analysis ? analysis.status as any : 'idle')} size="sm" />
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>CIPHER ANALYSIS</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Full spectrum performance audit // <span style={{ color: 'var(--text-primary)' }}>{user.username}</span></div>
          </div>
        </div>

        <div className="cipher-header-right" style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 6 }}>
          <button
            className="cipher-run-btn"
            onClick={() => handleRunAnalysis(!!analysis)}
            disabled={isLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 24px', borderRadius: 6, cursor: isLoading ? 'not-allowed' : 'pointer',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase' as const, border: 'none',
              background: analysis && !isLoading ? 'transparent' : 'var(--accent-primary)',
              color: analysis && !isLoading ? 'var(--text-primary)' : 'var(--bg-primary)',
              ...(analysis && !isLoading ? { border: '1px solid var(--bg-tertiary)' } : {}),
              transition: 'all 200ms ease',
            }}
          >
            {isLoading ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> CIPHER PROCESSING...</>
              : analysis ? <><RefreshCw size={14} /> RE-ANALYZE</>
              : <><Play size={14} fill="currentColor" /> RUN ANALYSIS</>}
          </button>
          {analysis && !isLoading && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              LAST ANALYZED: {analysis.analyzedAt ? new Date(analysis.analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>

      {/* SCROLL INDICATOR */}
      {analysis && !isLoading && (
        <div className="scroll-indicator scroll-animate is-visible">
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>SCROLL TO ANALYZE</div>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, var(--text-muted), transparent)' }} />
        </div>
      )}

      {/* SPARSE DATA BANNER */}
      {computed.daysSinceReg < 3 && !isLoading && (
        <div style={{ border: '1px solid rgba(255,170,0,0.2)', background: 'rgba(255,170,0,0.04)', padding: '12px 16px', borderRadius: 6, marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <AlertTriangle size={16} style={{ color: '#ffaa00', flexShrink: 0, marginTop: 2 }} />
          <span style={{ color: '#ffaa00', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>
            LIMITED DATA — {computed.daysSinceReg} days of history available. Analysis improves significantly after 7 days.
          </span>
        </div>
      )}

      {/* ERROR STATE */}
      {error && (
        <div style={{ textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 16 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>ANALYSIS FAILED</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{error}</div>
          <button onClick={() => handleRunAnalysis(true)} style={{ padding: '8px 20px', border: '1px solid var(--bg-tertiary)', background: 'transparent', color: 'var(--text-primary)', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>RETRY</button>
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 24, padding: '80px 20px' }}>
          <CipherAvatar mood="analyzing" size="lg" />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>CIPHER PROCESSING...</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Scanning {activeHabits.length} protocols across {computed.daysSinceReg} days...</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)', animation: `pulse 1.4s ease-in-out ${i * 200}ms infinite` }} />
            ))}
          </div>
        </div>
      )}

      {/* IDLE STATE */}
      {!analysis && !isLoading && !error && (
        <div style={{ textAlign: 'center', padding: '100px 20px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 20 }}>
          <CipherAvatar mood="idle" size="lg" />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'var(--text-muted)', letterSpacing: '0.2em' }}>AWAITING COMMAND</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.6 }}>Press RUN ANALYSIS to begin performance audit</div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          RENDERED ANALYSIS — ALL 9 SECTIONS
          ════════════════════════════════════════════ */}
      {analysis && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 32 }}>

          {/* ─── GRACE PERIOD BANNER (new users only) ─── */}
          {isNewUser && (
            <div className="grace-period-banner">
              <span className="banner-icon">🌱</span>
              <div className="banner-text">
                <strong>GRACE PERIOD ACTIVE</strong>
                <span>Day {computed.daysSinceReg} of 3 — CIPHER is in teaching mode. Full performance analysis begins on day 4.</span>
              </div>
            </div>
          )}

          {/* ─── DAY 4 TRANSITION BANNER (inline, non-blocking) ─── */}
          {isDayFourTransition && !showTransition && (
            <div className="grace-period-banner" style={{ background: 'rgba(0,204,102,0.08)', border: '1px solid rgba(0,204,102,0.3)', textAlign: 'center', flexDirection: 'column' as const, gap: 12, padding: '24px 20px' }}>
              <CipherAvatar size="md" mood="solid" />
              <div style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.15em', color: 'var(--accent-primary)', fontSize: 16, fontWeight: 700, marginTop: 8 }}>GRACE PERIOD COMPLETE</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {user.username}, you've completed the onboarding phase. CIPHER now operates in full analysis mode. Expect honesty. Expect precision. Expect accountability.
              </div>
              <button
                onClick={() => {
                  localStorage.setItem('cipher_veteran_seen', 'true');
                  setShowTransition(true);
                }}
                style={{
                  background: 'var(--accent-primary)', color: '#000', border: 'none',
                  padding: '10px 32px', borderRadius: 6, fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', cursor: 'pointer',
                  marginTop: 4,
                }}
              >
                UNDERSTOOD
              </button>
            </div>
          )}

          {/* ─── SECTION 2: CIPHER STATUS BLOCK ───────── */}
          <div
            className="scroll-scale cipher-status-grid cipher-card"
            style={{
              background: `${statusColor}08`,
              borderLeft: `4px solid ${statusColor}`,
              borderRadius: 8,
            }}
          >
            {/* Left: Avatar + Badge */}
            <div className="cipher-status-avatar-col" style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 12 }}>
              <CipherAvatar mood={isNewUser ? 'solid' : (analysis.status as any)} size="lg" />
              <div
                className="cipher-status-badge"
                style={{
                  background: `${statusColor}1F`,
                  border: `1px solid ${statusColor}66`,
                  color: statusColor,
                  fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' as const, fontWeight: 700,
                  padding: '4px 16px', borderRadius: 100,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {analysis.status}
              </div>
            </div>

            {/* Right: Verdict */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, justifyContent: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.15em', marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>CIPHER READS:</div>
              <p className="cipher-verdict" style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>
                {analysis.operatorVerdict}
              </p>
            </div>
          </div>

          {/* ─── SECTION 3: YOUR STORY SO FAR ─────────── */}
          <div className="scroll-slide-left" style={{ paddingTop: 8 }}>
            <div className="cipher-section-title" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 8, height: 8, background: 'var(--accent-primary)', borderRadius: 2, flexShrink: 0 }} />
              YOUR STORY SO FAR
            </div>

            <div className="cipher-timeline-wrapper">
              <div className="cipher-timeline-line" />
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 32 }}>
                {Object.entries(analysis.timelineComments).map(([dateKey, comment], idx, arr) => {
                  const dotColor = getTimelineDotColor(dateKey, idx, arr.length);
                  return (
                    <div key={dateKey} className="cipher-timeline-node scroll-slide-left" style={{ position: 'relative', paddingLeft: 0 }}>
                      <div
                        className="cipher-timeline-dot"
                        style={{
                          border: `2px solid ${dotColor}`,
                          background: `${dotColor}33`,
                          boxShadow: `0 0 8px ${dotColor}66`,
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6, flexWrap: 'wrap' as const }}>
                        <span className="cipher-timeline-date" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.12em' }}>
                          {dateKey}
                        </span>
                        <span className="cipher-timeline-title" style={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' as const }}>
                          {dateKey === 'today' ? 'THE PRESENT' : dateKey.includes('-') ? 'SYSTEM EVENT' : dateKey.toUpperCase()}
                        </span>
                      </div>
                      <div className="cipher-timeline-comment" style={{ fontStyle: 'italic', color: 'var(--text-secondary)', borderLeft: '2px solid var(--bg-tertiary)', paddingLeft: 12, marginLeft: 0 }}>
                        {comment}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── SECTION 4: EXECUTION PERSONALITY TYPE ─── */}
          <div className="scroll-slide-right cipher-personality-grid cipher-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)', borderTop: '3px solid var(--accent-primary)', borderRadius: 8 }}>
            {/* Left: Type Name */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.15em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 16 }}>◈ YOUR EXECUTION TYPE</div>
              <div className="cipher-type-name" style={{ fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', lineHeight: 1.1, marginBottom: 12 }}>
                {analysis.executionType}
              </div>
              <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {TYPE_QUOTES[analysis.executionType] || ''}
              </div>
            </div>

            {/* Right: Insight + Chips */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 24 }}>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-primary)', margin: 0 }}>
                {analysis.personalityInsight}
              </p>

              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.15em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>OTHER TYPES:</div>
                <div className="type-chips-container" style={{ display: 'flex', gap: 8 }}>
                  {EXECUTION_TYPES.map(type => (
                    <span key={type} className={`type-chip ${type === analysis.executionType ? 'active' : ''}`}>
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── SECTION 5: HALL OF FAME vs HALL OF SHAME ─── */}
          <div className="hall-grid">
            {/* FAME */}
            <div className="scroll-slide-right hall-card cipher-card" style={{ borderTop: '3px solid #00ff88', background: 'rgba(0,255,136,0.03)', borderRadius: 8, display: 'flex', flexDirection: 'column' as const }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#00ff88', marginBottom: 24, fontFamily: "'JetBrains Mono', monospace" }}>🏆 HALL OF FAME</div>

              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>BEST PROTOCOL:</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{analysis.hallOfFame.bestProtocol}</div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <CipherRing percentage={getHabitRate(analysis.hallOfFame.bestProtocol)} color="#00ff88" size={100} label="30D RATE" />
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginBottom: 24 }}>
                {getHabitTotal(analysis.hallOfFame.bestProtocol)} completions since registration
              </div>

              <div style={{ borderTop: '1px solid rgba(0,255,136,0.15)', paddingTop: 16, marginTop: 'auto' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>PERSONAL BEST:</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontStyle: 'italic', marginBottom: 12 }}>"{analysis.hallOfFame.bestDayComment}"</div>
                <div style={{ background: 'rgba(0,255,136,0.08)', padding: 12, borderRadius: 6, fontSize: 12, color: '#00ff88', lineHeight: 1.6 }}>
                  CIPHER: "{analysis.hallOfFame.bestProtocolComment}"
                </div>
              </div>
            </div>

            {/* SHAME */}
            <div className="scroll-slide-left hall-card cipher-card" style={{ borderTop: '3px solid #ff4444', background: 'rgba(255,68,68,0.03)', borderRadius: 8, display: 'flex', flexDirection: 'column' as const }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#ff4444', marginBottom: 24, fontFamily: "'JetBrains Mono', monospace" }}>💀 HALL OF SHAME</div>

              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>WORST PROTOCOL:</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#ff4444', marginBottom: 20, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{analysis.hallOfShame.worstProtocol}</div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <CipherRing percentage={getHabitRate(analysis.hallOfShame.worstProtocol)} color="#ff4444" size={100} label="30D RATE" />
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginBottom: 24 }}>
                {computed.worstHabitMissedDays} missed days since registration
              </div>

              <div style={{ borderTop: '1px solid rgba(255,68,68,0.15)', paddingTop: 16, marginTop: 'auto' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>WORST DEAD STREAK:</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontStyle: 'italic', marginBottom: 12 }}>"{analysis.hallOfShame.worstStreakComment}"</div>
                <div style={{ background: 'rgba(255,68,68,0.08)', padding: 12, borderRadius: 6, fontSize: 12, color: '#ff4444', lineHeight: 1.6 }}>
                  CIPHER: "{analysis.hallOfShame.worstProtocolComment}"
                </div>
              </div>
            </div>
          </div>

          {/* ─── SECTION 6: THE LOWLIGHTS REEL ─────────── */}
          <div className="scroll-scale lowlights-reel cipher-card" style={{ background: isNewUser ? 'rgba(0,204,102,0.04)' : 'rgba(255,68,68,0.04)', border: `1px solid ${isNewUser ? 'rgba(0,204,102,0.15)' : 'rgba(255,68,68,0.15)'}`, borderRadius: 8 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: isNewUser ? '#00cc66' : '#ff4444', fontFamily: "'JetBrains Mono', monospace" }}>{isNewUser ? 'ℹ EARLY PATTERNS' : '⚠ INCIDENT REPORT'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{isNewUser ? `${user.username}'s first steps` : `${user.username}'s low points`}</div>
            </div>

            {computed.daysSinceReg < 1 ? (
              <div style={{ fontSize: 14, color: 'var(--text-primary)', fontStyle: 'italic', padding: '16px 0' }}>
                "No incidents on record yet. {user.username}, keep it that way."
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const }}>
                {[
                  { label: 'LONGEST DEAD STREAK', value: `${computed.longestDeadStreak} consecutive day${computed.longestDeadStreak !== 1 ? 's' : ''}, zero completions`, comment: analysis.lowlightsComments.longestDeadStreak },
                  { label: 'WORST SINGLE DAY', value: `${computed.worstDay.date} — ${computed.worstDay.score} of ${computed.worstDay.total} protocols`, comment: analysis.lowlightsComments.worstDay },
                  { label: 'MOST BROKEN HABIT', value: computed.mostBrokenHabit, comment: analysis.lowlightsComments.mostBrokenHabit },
                  { label: 'BIGGEST SINGLE DROP', value: computed.biggestDrop > 0 ? `-${computed.biggestDrop} points` : 'No drops recorded', comment: analysis.lowlightsComments.biggestDrop },
                ].map((item, i, arr) => (
                  <div key={item.label} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: i < arr.length - 1 ? '1px solid var(--bg-tertiary)' : 'none' }}>
                    <div className="lowlight-row">
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' as const }}>{item.label}</span>
                      <span className="lowlight-value" style={{ color: 'var(--accent-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{item.value}</span>
                    </div>
                    <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-muted)', marginTop: 8 }}>"{item.comment}"</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── SECTION 7: INDEX CEILING CALCULATOR ────── */}
          <div className="scroll-animate cipher-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)', borderLeft: '3px solid var(--accent-primary)', borderRadius: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 28 }}>◈ YOUR INDEX CEILING</div>

            {/* Two Big Numbers — grid 1fr auto 1fr */}
            <div className="ceiling-numbers">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>CURRENT INDEX</div>
                <div className="ceiling-number" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-primary)' }}>{displayDi}</div>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'var(--text-muted)', opacity: 0.4 }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>MAX TODAY IF YOU EXECUTE EVERYTHING</div>
                <div className="ceiling-number" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}>{displayMax}</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="ceiling-track" style={{ marginTop: 20, marginBottom: 28 }}>
              <div className="ceiling-fill" />
            </div>

            {/* Insight */}
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', padding: 20, borderRadius: 6 }}>
              <p style={{ fontSize: 14, color: 'var(--text-primary)', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
                CIPHER: "{analysis.ceilingInsight}"
              </p>
            </div>
          </div>

          {/* ─── SECTION 8: BIGGEST WIN & BIGGEST MISTAKE ─── */}
          <div className="hall-grid">
            {/* BIGGEST WIN */}
            <div
              className="scroll-slide-right cipher-card"
              style={{
                background: 'rgba(0,255,136,0.04)',
                border: '1px solid rgba(0,255,136,0.2)',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column' as const
              }}
            >
              <div style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>◈ CIPHER APPRECIATES:</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.05em', color: '#00cc66', marginBottom: 20 }}>BIGGEST WIN</div>
              
              <div className="biggest-mistake-name" style={{ fontWeight: 700, color: '#00cc66', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 12 }}>
                {analysis.biggestWinName || analysis.hallOfFame.bestProtocol}
              </div>
              
              <div className="biggest-mistake-body" style={{ color: 'var(--text-primary)', marginBottom: 20, flexGrow: 1 }}>
                {analysis.biggestWin || analysis.hallOfFame.bestProtocolComment}
              </div>

              <div className="biggest-win-stat" style={{ fontFamily: "'JetBrains Mono', monospace", borderTop: '1px solid rgba(0,255,136,0.15)', paddingTop: 16 }}>
                KEPT CONSISTENCY
              </div>
            </div>

            {/* BIGGEST MISTAKE */}
            <div
              className="scroll-slide-left biggest-mistake cipher-card"
              style={{
                background: isNewUser ? 'rgba(0,204,102,0.04)' : (statusColor === '#00ff88' || statusColor === '#00cc66' ? 'rgba(255,170,0,0.04)' : 'rgba(255,68,68,0.04)'),
                border: `1px solid ${isNewUser ? 'rgba(0,204,102,0.2)' : (statusColor === '#00ff88' || statusColor === '#00cc66' ? 'rgba(255,170,0,0.2)' : 'rgba(255,68,68,0.2)')}`,
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column' as const
              }}
            >
              <div style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>◈ CIPHER IDENTIFIES:</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.05em', color: isNewUser ? '#00cc66' : (statusColor === '#00ff88' || statusColor === '#00cc66' ? '#ffaa00' : '#ff4444'), marginBottom: 20 }}>
                {isNewUser ? 'FOCUS AREA' : 'YOUR BIGGEST MISTAKE'}
              </div>
  
              <div className="biggest-mistake-name" style={{ fontWeight: 700, color: statusColor === '#00ff88' || statusColor === '#00cc66' ? '#ffaa00' : '#ff4444', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 12 }}>
                {analysis.biggestMistakeName}
              </div>
  
              <div className="biggest-mistake-body" style={{ color: 'var(--text-primary)', marginBottom: 20, flexGrow: 1 }}>
                {analysis.biggestMistake}
              </div>
  
              <div className="biggest-mistake-stat" style={{ color: statusColor === '#00ff88' || statusColor === '#00cc66' ? '#ffaa00' : '#ff4444', fontFamily: "'JetBrains Mono', monospace", borderTop: '1px solid var(--bg-tertiary)', paddingTop: 16 }}>
                {computed.worstHabitMissedDays} MISSED DAYS
              </div>
            </div>
          </div>

          {/* ─── SECTION 9: CIPHER'S ORDERS ─────────────── */}
          <div className="scroll-animate">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-primary)', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--accent-primary)' }}>{isNewUser ? '🌱' : '⚡'}</span> {isNewUser ? 'GETTING STARTED TASKS' : "CIPHER'S ORDERS"}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{isNewUser ? 'Suggestions to build your habit' : 'What happens tonight'}</div>
              </div>
              <CipherAvatar mood="elite" size="sm" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const }}>
              {analysis.orders.map((order) => (
                <div key={order.rank} className="directive-card scroll-slide-left" style={{ borderRadius: 6 }}>
                  <div className="directive-card-inner" style={{ display: 'flex', flexDirection: 'column' as const }}>
                    <div className="directive-top-row" style={{ display: 'flex' }}>
                      <div className="directive-rank" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--accent-primary)' }}>
                        0{order.rank}
                      </div>
                      <div className="impact-badge" style={{
                        background: 'rgba(0,204,102,0.1)', border: '1px solid rgba(0,204,102,0.3)',
                        color: '#00cc66', fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                        letterSpacing: '0.1em', borderRadius: 3, padding: '4px 10px',
                      }}>
                        {order.estimatedImpact.toUpperCase()}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--bg-tertiary)', margin: '10px 0' }} />

                    <div className="directive-action" style={{ color: 'var(--text-primary)' }}>
                      {order.action}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      <AppFooter />
    </div>
  );
};
