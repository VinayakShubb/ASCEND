import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Check, Flame, Minus, Play, RefreshCw, Sparkles } from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { aiApi, type CipherAnalysis, type CipherHabit, type CipherStatus, type Trend } from '../../lib/api';
import { CipherAvatar } from '../UI/CipherAvatar';
import { AppFooter } from '../UI/AppFooter';
import './cipherV2.css';

/* CIPHER v2. Every number on this page comes from the backend
   (backend/services/cipher_metrics.py); CIPHER's AI only writes the notes.
   Layout follows a "score first, then what drives it" reading order:
   score -> what changed -> key metrics -> today's plan -> drivers ->
   weekly rhythm -> execution type. */

const STATUS: Record<CipherStatus, { color: string; label: string }> = {
  elite: { color: '#00e08a', label: 'Elite' },
  solid: { color: '#3ecf8e', label: 'Solid' },
  slipping: { color: '#ffb020', label: 'Slipping' },
  critical: { color: '#ff4d4d', label: 'Critical' },
};

const TREND_COLOR: Record<Trend, string> = { up: '#3ecf8e', down: '#ff6b5b', flat: 'var(--text-muted)' };

const formatImpact = (impact: number) => `+${impact >= 1 ? Math.round(impact) : impact.toFixed(1)} DI`;

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

/* Counts a number up from 0 when it first appears (skipped for reduced motion). */
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const reduced = prefersReducedMotion();
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);
  return reduced ? target : value;
}

function ScoreRing({ value, color }: { value: number; color: string }) {
  const shown = useCountUp(value);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="cx-ring" style={{ ['--ring-color' as string]: color }}>
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <circle cx="64" cy="64" r={radius} className="cx-ring-track" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          className="cx-ring-value"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (value / 100) * circumference}
        />
      </svg>
      <div className="cx-ring-center">
        <span className="cx-ring-number">{shown}</span>
        <span className="cx-ring-label">Discipline Index</span>
      </div>
    </div>
  );
}

function TrendIcon({ trend, size = 14 }: { trend: Trend; size?: number }) {
  if (trend === 'up') return <ArrowUpRight size={size} color={TREND_COLOR.up} aria-label="up" />;
  if (trend === 'down') return <ArrowDownRight size={size} color={TREND_COLOR.down} aria-label="down" />;
  return <Minus size={size} color={TREND_COLOR.flat} aria-label="steady" />;
}

function RateBars({ habit }: { habit: CipherHabit }) {
  return (
    <div className="cx-rates">
      <div className="cx-rate-row">
        <span>7 days</span>
        <div className="cx-rate-bar"><div style={{ width: `${habit.rate7}%` }} /></div>
        <strong>{habit.rate7}%</strong>
      </div>
      <div className="cx-rate-row is-muted">
        <span>30 days</span>
        <div className="cx-rate-bar"><div style={{ width: `${habit.rate30}%` }} /></div>
        <strong>{habit.rate30}%</strong>
      </div>
    </div>
  );
}

function SkeletonPage() {
  return (
    <div className="cx-skeleton" aria-busy="true" aria-label="Loading analysis">
      <div className="cx-sk cx-sk-hero" />
      <div className="cx-metrics">
        {[0, 1, 2, 3].map(i => <div key={i} className="cx-sk cx-sk-card" />)}
      </div>
      <div className="cx-sk cx-sk-block" />
    </div>
  );
}

export const CipherPage = () => {
  const { user } = useAuth();
  const { habits } = useData();
  const [analysis, setAnalysis] = useState<CipherAnalysis | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  const activeHabits = useMemo(() => habits.filter(h => !h.archived), [habits]);
  const hasHabits = activeHabits.length > 0;

  // Show the last stored analysis immediately; running a new one is explicit.
  useEffect(() => {
    if (!user || !hasHabits) {
      setInitialLoading(false);
      return;
    }
    let cancelled = false;
    aiApi
      .cipherLatest()
      .then(result => { if (!cancelled) setAnalysis(result); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setInitialLoading(false); });
    return () => { cancelled = true; };
  }, [user, hasHabits]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const runAnalysis = useCallback(async () => {
    setRunning(true);
    setError(null);
    const previousAt = analysis?.analyzedAt;
    try {
      const result = await aiApi.cipher();
      if (!result) {
        setError('Add at least one active habit to get an analysis.');
        return;
      }
      setAnalysis(result);
      // The server returns the previous analysis when nothing changed or the
      // daily limit is used up. Say so, instead of pretending it's new.
      const message = result.analyzedAt === previousAt
        ? 'Nothing new to analyse yet. Showing your latest analysis.'
        : !result.narrative
          ? "CIPHER's notes are unavailable right now. Your numbers are up to date."
          : null;
      setFlash(message);
      window.clearTimeout(flashTimer.current);
      if (message) flashTimer.current = window.setTimeout(() => setFlash(null), 5000);
    } catch {
      setError('Could not reach CIPHER. Check your connection and try again.');
    } finally {
      setRunning(false);
    }
  }, [analysis?.analyzedAt]);

  if (!user) return null;

  const status = analysis ? STATUS[analysis.status] : null;
  const avatarMood = running ? 'analyzing' : analysis ? analysis.status : 'idle';

  return (
    <div className="cx-page fade-in">
      <header className="cx-header">
        <div className="cx-header-title">
          <CipherAvatar mood={avatarMood} size="sm" />
          <div>
            <h1>CIPHER</h1>
            <p>
              Performance analysis for <strong>{user.username}</strong>
              {analysis && <span className="cx-updated"> · updated {timeAgo(analysis.analyzedAt)}</span>}
            </p>
          </div>
        </div>
        {hasHabits && (analysis || running) && (
          <button className="cx-run" onClick={runAnalysis} disabled={running || initialLoading}>
            {running
              ? <><RefreshCw size={15} className="cx-spin" /> Analysing</>
              : analysis
                ? <><RefreshCw size={15} /> Re-run analysis</>
                : <><Play size={15} fill="currentColor" /> Run analysis</>}
          </button>
        )}
      </header>

      {flash && <div className="cx-flash" role="status">{flash}</div>}
      {error && <div className="cx-error" role="alert">{error}</div>}

      {!hasHabits && (
        <div className="cx-empty">
          <CipherAvatar mood="idle" size="md" />
          <h2>Nothing to analyse yet</h2>
          <p>Add a habit on the Command Center, check it off for a few days, and CIPHER will start reading your patterns.</p>
        </div>
      )}

      {hasHabits && initialLoading && <SkeletonPage />}

      {hasHabits && !initialLoading && !analysis && !running && (
        <div className="cx-empty">
          <CipherAvatar mood="idle" size="lg" />
          <h2>Your first analysis</h2>
          <p>CIPHER reads your last 60 days: your score, what is driving it, your weekly rhythm and the best moves for today.</p>
          <button className="cx-run" onClick={runAnalysis}><Play size={15} fill="currentColor" /> Run analysis</button>
        </div>
      )}

      {hasHabits && !analysis && running && <SkeletonPage />}

      {analysis && status && (
        <div className={`cx-report${running ? ' is-refreshing' : ''}`} key={analysis.analyzedAt}>
          {analysis.isNewUser && (
            <div className="cx-note cx-reveal">
              <Sparkles size={16} />
              <span>Day {analysis.daysTracked} of tracking. CIPHER is in teaching mode for your first 3 days; full analysis starts on day 4.</span>
            </div>
          )}

          {/* Score */}
          <section className="cx-hero cx-reveal" style={{ ['--status' as string]: status.color }}>
            <ScoreRing value={analysis.score.value} color={status.color} />
            <div className="cx-hero-body">
              <span className="cx-status-pill">{status.label}</span>
              <p className="cx-verdict">{analysis.verdict}</p>
              <dl className="cx-baselines">
                <div><dt>30-day average</dt><dd>{analysis.score.baseline}</dd></div>
                <div>
                  <dt>7 days ago</dt>
                  <dd>
                    {analysis.score.weekAgo}
                    <span style={{ color: analysis.score.momentum >= 0 ? TREND_COLOR.up : TREND_COLOR.down }}>
                      {' '}({analysis.score.momentum >= 0 ? '+' : ''}{analysis.score.momentum})
                    </span>
                  </dd>
                </div>
                <div><dt>Max possible today</dt><dd>{analysis.score.maxToday}</dd></div>
              </dl>
            </div>
          </section>

          {/* What changed since the previous analysis */}
          {analysis.changes.length > 0 && (
            <section className="cx-changes cx-reveal" aria-label="Changes since your last analysis">
              <span className="cx-changes-title">Since last analysis</span>
              {analysis.changes.map(change => (
                <span key={change.label} className={`cx-change is-${change.direction}`}>
                  {change.direction === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {change.label} <strong>{change.delta}</strong>
                </span>
              ))}
            </section>
          )}

          {/* Key metrics, each against the user's own baseline */}
          <section className="cx-metrics cx-reveal">
            {analysis.metrics.map(metric => (
              <article key={metric.key} className="cx-metric">
                <span className="cx-metric-label">{metric.label}</span>
                <span className="cx-metric-value">{metric.value}</span>
                <span className="cx-metric-caption">{metric.caption}</span>
                <span className="cx-metric-baseline">
                  <TrendIcon trend={metric.trend} /> {metric.baseline}
                </span>
              </article>
            ))}
          </section>

          {/* Today's plan */}
          <section className="cx-card cx-reveal">
            <div className="cx-card-head">
              <h2>Today's best moves</h2>
              <span className="cx-card-sub">
                {analysis.score.value} now, up to {analysis.score.maxToday} if you finish everything
              </span>
            </div>
            <div className="cx-ceiling" aria-hidden="true">
              <div className="cx-ceiling-now" style={{ width: `${analysis.score.value}%`, background: status.color }} />
              <div
                className="cx-ceiling-max"
                style={{ left: `${analysis.score.value}%`, width: `${Math.max(0, analysis.score.maxToday - analysis.score.value)}%` }}
              />
            </div>
            {analysis.plan.length === 0 ? (
              <p className="cx-done"><Check size={16} /> Everything is done today. Your score is at today's maximum.</p>
            ) : (
              <ol className="cx-plan">
                {analysis.plan.map((item, i) => (
                  <li key={item.habitId}>
                    <span className="cx-plan-rank">{i + 1}</span>
                    <div className="cx-plan-body">
                      <strong>{item.name}</strong>
                      <span>{item.action}</span>
                    </div>
                    <span className="cx-impact">{formatImpact(item.impact)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Drivers */}
          {(analysis.working.length > 0 || analysis.holdingBack.length > 0) && (
            <div className="cx-split cx-reveal">
              <section className="cx-card is-good">
                <div className="cx-card-head"><h2>What's working</h2></div>
                {analysis.working.length === 0
                  ? <p className="cx-muted">Nothing above 50% this week yet. One habit done 4 of 7 days changes that.</p>
                  : analysis.working.map(h => (
                    <article key={h.name} className="cx-habit">
                      <div className="cx-habit-head">
                        <strong>{h.name}</strong>
                        {h.streak > 1 && <span className="cx-streak"><Flame size={13} /> {h.streak}d</span>}
                      </div>
                      <RateBars habit={h} />
                      <p>{h.note}</p>
                    </article>
                  ))}
              </section>
              <section className="cx-card is-bad">
                <div className="cx-card-head"><h2>Holding you back</h2></div>
                {analysis.holdingBack.length === 0
                  ? <p className="cx-muted">No missed days cost you points this week. Keep it that way.</p>
                  : analysis.holdingBack.map(h => (
                    <article key={h.name} className="cx-habit">
                      <div className="cx-habit-head">
                        <strong>{h.name}</strong>
                        <span className="cx-cost">{h.pointsLost7} DI lost this week</span>
                      </div>
                      <RateBars habit={h} />
                      <p>{h.note}</p>
                    </article>
                  ))}
              </section>
            </div>
          )}

          {/* Weekly rhythm */}
          <section className="cx-card cx-reveal">
            <div className="cx-card-head">
              <h2>Weekly rhythm</h2>
              <span className="cx-card-sub">Average completion by weekday, last 8 weeks</span>
            </div>
            {analysis.weekdays.some(d => d.pct !== null) ? (
              <div className="cx-chart">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analysis.weekdays.map(d => ({ ...d, pct: d.pct ?? 0 }))} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)', borderRadius: 8, fontSize: 12 }}
                      formatter={(value) => [`${value}%`, 'Completion']}
                    />
                    <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {analysis.weekdays.map(d => (
                        <Cell
                          key={d.day}
                          fill={d.day === analysis.bestWeekday ? '#3ecf8e' : d.day === analysis.worstWeekday ? '#ff6b5b' : 'rgba(255,255,255,0.22)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="cx-muted">Your weekly rhythm appears after a week of tracking.</p>
            )}
            {analysis.bestWeekday && (
              <p className="cx-pattern">
                <span className="cx-tag is-good">Best: {analysis.bestWeekday}</span>
                <span className="cx-tag is-bad">Weakest: {analysis.worstWeekday}</span>
                {analysis.patternNote && <span>{analysis.patternNote}</span>}
              </p>
            )}
          </section>

          {/* Execution type */}
          <section className="cx-card cx-personality cx-reveal">
            <span className="cx-eyebrow">Execution type</span>
            <h2>{analysis.personality.type === 'CALIBRATING' ? 'Calibrating' : analysis.personality.type.toLowerCase()}</h2>
            <p className="cx-tagline">{analysis.personality.tagline}</p>
            <p className="cx-evidence">{analysis.personality.evidence}</p>
            {analysis.personality.insight && <p className="cx-insight">{analysis.personality.insight}</p>}
          </section>
        </div>
      )}

      <AppFooter />
    </div>
  );
};
