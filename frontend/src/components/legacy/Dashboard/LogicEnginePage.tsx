import { useEffect, useRef } from 'react';
import { ArrowLeft, Zap, TrendingUp, Calendar, Cpu, Shield, Activity, BookOpen } from 'lucide-react';
import { CipherAvatar } from '../UI/CipherAvatar';
import type { View } from '../../types';
import './logicEngine.css';

interface Props {
  setView: (view: View) => void;
}

const useScrollReveal = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('le-revealed');
          } else {
            entry.target.classList.remove('le-revealed');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    const items = el.querySelectorAll('.le-animate');
    items.forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return ref;
};

const Formula = ({ children }: { children: string }) => (
  <code className="le-formula">{children}</code>
);

const MetricCard = ({ num, title, calc, significance, direction }: {
  num: string; title: string; calc: string; significance: string; direction: 'left' | 'right';
}) => (
  <div className={`le-metric-card le-animate le-slide-${direction}`}>
    <div className="le-metric-header">
      <span className="le-metric-num">{num}</span>
      <span className="le-metric-title">{title}</span>
    </div>
    <div className="le-metric-body">
      <div className="le-metric-row">
        <span className="le-metric-label">CALCULATION</span>
        <Formula>{calc}</Formula>
      </div>
      <div className="le-metric-row">
        <span className="le-metric-label">SIGNIFICANCE</span>
        <p className="le-metric-desc">{significance}</p>
      </div>
    </div>
  </div>
);

export const LogicEnginePage = ({ setView }: Props) => {
  const scrollRef = useScrollReveal();

  const statusThresholds = [
    { range: '80 – 100', status: 'ELITE', color: '#00ff88', desc: 'System performing at maximum capacity.' },
    { range: '50 – 79', status: 'SOLID', color: '#00cc66', desc: 'Baseline discipline maintained.' },
    { range: '20 – 49', status: 'SLIPPING', color: '#ffaa00', desc: 'Structural failures identified. Action required.' },
    { range: '0 – 19', status: 'CRITICAL', color: '#ff4444', desc: 'System collapse imminent. Immediate intervention.' },
  ];

  const executionTypes = [
    { name: 'BURST EXECUTOR', quote: 'You can do it. You just refuse to do it consistently.' },
    { name: 'CONSISTENT BUILDER', quote: 'Rare. Keep this energy — most people never reach it.' },
    { name: 'SLOW STARTER', quote: 'Late ignition. The engine is warming up. Do not stop now.' },
    { name: 'WEEKEND WARRIOR', quote: 'Your discipline has an on/off switch tied to the calendar.' },
    { name: 'ALL OR NOTHING', quote: 'Perfectionism is killing your streak. A 50% day beats a 0% day.' },
    { name: 'DECLINING PERFORMER', quote: 'You started stronger than you are finishing.' },
    { name: 'GHOST MODE', quote: 'You built the system. You just forgot to use it.' },
    { name: 'EARLY QUITTER', quote: 'You start every week ready. Wednesday disagrees.' },
    { name: 'COMEBACK KID', quote: 'You keep falling. You keep getting up. That counts.' },
    { name: 'SELECTIVE EXECUTOR', quote: 'Doing the easy things and avoiding the hard ones.' },
  ];

  return (
    <div className="le-page" ref={scrollRef}>
      {/* Header */}
      <div className="le-header le-animate le-fade">
        <button className="le-back-btn" onClick={() => setView('about')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="le-header-content">
          <div className="le-header-icon"><BookOpen size={20} /></div>
          <div>
            <div className="le-header-tag">SYSTEM DOCUMENTATION</div>
            <h1 className="le-header-title">Logic Engine</h1>
            <p className="le-header-desc">The definitive reference for every number in ASCEND.</p>
          </div>
        </div>
      </div>

      {/* ══════ Section 1: Core Scoring Engine ══════ */}
      <div className="le-section-divider le-animate le-fade">
        <Zap size={14} />
        <span>CORE SCORING ENGINE</span>
      </div>

      {/* Multiplier System */}
      <div className="le-multiplier-card le-animate le-slide-left">
        <div className="le-metric-header">
          <span className="le-metric-num">01</span>
          <span className="le-metric-title">The Multiplier System</span>
        </div>
        <p className="le-metric-desc" style={{ margin: '12px 0 16px' }}>
          Every protocol is assigned a difficulty weight. Harder tasks contribute more to your growth.
        </p>
        <div className="le-multiplier-grid">
          {[
            { level: 'EASY', mult: '1.0×', color: '#00cc66' },
            { level: 'MEDIUM', mult: '1.2×', color: '#00E5FF' },
            { level: 'HARD', mult: '1.5×', color: '#ffaa00' },
            { level: 'EXTREME', mult: '2.0×', color: '#ff4444' },
          ].map(m => (
            <div key={m.level} className="le-multiplier-item" style={{ borderColor: m.color }}>
              <div className="le-mult-level">{m.level}</div>
              <div className="le-mult-value" style={{ color: m.color }}>{m.mult}</div>
            </div>
          ))}
        </div>
      </div>

      <MetricCard num="02" title="Daily Weighted Score" direction="right"
        calc="(Σ completed × multiplier) / (Σ all active × multiplier) × 100"
        significance="Reflects the quality of your effort. Completing one Extreme habit outweighs missing one Easy habit."
      />

      <MetricCard num="03" title="Today's Completion Rate" direction="left"
        calc="(Habits Completed Today / Total Active Habits) × 100"
        significance="A raw binary progress check. Treats every protocol as equal — no difficulty weighting."
      />

      <MetricCard num="04" title="Discipline Index (DI)" direction="right"
        calc="7-Day Rolling Average of Daily Weighted Scores"
        significance="The single most important number. Measures your momentum over a full week — one good day alone won't inflate it."
      />

      {/* ══════ Section 2: Analytics & Trends ══════ */}
      <div className="le-section-divider le-animate le-fade">
        <TrendingUp size={14} />
        <span>ANALYTICS & TRENDS</span>
      </div>

      <MetricCard num="05" title="Week Change (Delta)" direction="left"
        calc="(This Week Avg DI) – (Last Week Avg DI)"
        significance="A 'momentum of momentum' metric. Are you structurally improving, or declining over time?"
      />

      <MetricCard num="06" title="Habit Consistency (7D & 30D)" direction="right"
        calc="(Days Completed in Window / Total Days in Window) × 100"
        significance="Identifies slipping habits before they break your Discipline Index."
      />

      <MetricCard num="07" title="Total Completions" direction="left"
        calc="Cumulative count of all 'completed' logs for a protocol"
        significance="Your lifetime execution counter. A reminder of how far you've come."
      />

      {/* ══════ Section 3: Calendar & Streaks ══════ */}
      <div className="le-section-divider le-animate le-fade">
        <Calendar size={14} />
        <span>CALENDAR & STREAKS</span>
      </div>

      {/* Heatmap Levels */}
      <div className="le-metric-card le-animate le-slide-right">
        <div className="le-metric-header">
          <span className="le-metric-num">08</span>
          <span className="le-metric-title">Heatmap Intensity Levels</span>
        </div>
        <div className="le-heatmap-demo">
          {[
            { level: 0, label: '0%', color: 'rgba(255,255,255,0.03)', mark: '×' },
            { level: 1, label: '1-49%', color: 'rgba(0,255,136,0.15)', mark: '' },
            { level: 2, label: '50-74%', color: 'rgba(0,255,136,0.35)', mark: '' },
            { level: 3, label: '75-99%', color: 'rgba(0,255,136,0.55)', mark: '' },
            { level: 4, label: '100%', color: 'rgba(0,255,136,0.85)', mark: '✓' },
          ].map(h => (
            <div key={h.level} className="le-heatmap-cell">
              <div className="le-heat-box" style={{ background: h.color }}>{h.mark}</div>
              <span className="le-heat-label">{h.label}</span>
            </div>
          ))}
        </div>
      </div>

      <MetricCard num="09" title="Day Streaks" direction="left"
        calc="Consecutive days with at least one completion"
        significance="Streaks remain alive until end of day. Missing today doesn't reset until tomorrow arrives."
      />

      <MetricCard num="10" title="Active vs. Missed Days" direction="right"
        calc="Active: days with ≥1 completion. Missed: days with 0 completions."
        significance="Shows how many days you actually engaged with the system versus how many you ghosted."
      />

      {/* ══════ Section 4: CIPHER Intelligence ══════ */}
      <div className="le-section-divider le-animate le-fade">
        <Cpu size={14} />
        <span>CIPHER INTELLIGENCE CORE</span>
      </div>

      <MetricCard num="11" title="Day-of-Week Efficiency" direction="left"
        calc="(Completions on [Day] / Total [Day]s since registration) × 100"
        significance="Reveals psychological patterns. Are you 80% efficient on Mondays but only 20% on Sundays?"
      />

      <MetricCard num="12" title="Weak Link Selector" direction="right"
        calc="Lowest 30D consistency. If tied → highest multiplier wins."
        significance="The most expensive failure in your system — the habit dragging your index down the most."
      />

      <MetricCard num="13" title="Estimated Impact (Orders)" direction="left"
        calc="AI-estimated DI gain if you follow the directive for 7 days"
        significance="Synthetic projection. Shows how much following a specific CIPHER order would raise your index."
      />

      {/* ══════ Section 5: Status Thresholds ══════ */}
      <div className="le-section-divider le-animate le-fade">
        <Shield size={14} />
        <span>SYSTEM STATUS THRESHOLDS</span>
      </div>

      <div className="le-status-table le-animate le-scale">
        {statusThresholds.map(s => (
          <div key={s.status} className="le-status-row" style={{ borderLeftColor: s.color }}>
            <div className="le-status-range">{s.range}</div>
            <div className="le-status-name" style={{ color: s.color }}>{s.status}</div>
            <div className="le-status-desc">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* ══════ Section 6: CIPHER Modes ══════ */}
      <div className="le-section-divider le-animate le-fade">
        <Activity size={14} />
        <span>CIPHER AVATAR MODES</span>
      </div>

      <div className="le-modes-grid le-animate le-scale">
        {[
          {
            mood: 'elite' as const,
            label: 'ELITE',
            range: 'DI 80–100',
            color: '#00ff88',
            personality: 'CIPHER is proud. Small smile appears. Eyebrows relaxed. Antenna glowing bright.',
            visual: 'Green glow. Gentle breathing animation. This is the goal state.',
          },
          {
            mood: 'solid' as const,
            label: 'SOLID',
            range: 'DI 50–79',
            color: '#00cc66',
            personality: 'CIPHER is neutral. No smile. Flat eyebrows. Steady presence.',
            visual: 'Muted green. Calm. CIPHER is watching but not alarmed.',
          },
          {
            mood: 'slipping' as const,
            label: 'SLIPPING',
            range: 'DI 20–49',
            color: '#ffaa00',
            personality: 'CIPHER is concerned. Eyebrows tilt inward. Body twitches subtly.',
            visual: 'Amber glow. Micro-twitch animation. A warning sign.',
          },
          {
            mood: 'critical' as const,
            label: 'CRITICAL',
            range: 'DI 0–19',
            color: '#ff4444',
            personality: 'CIPHER is angry. Sharp V-shaped eyebrows. Aggressive shake.',
            visual: 'Red glow. Rage animation. System collapse detected.',
          },
        ].map(m => (
          <div key={m.mood} className="le-mode-card le-animate le-fade" style={{ borderLeftColor: m.color }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <CipherAvatar mood={m.mood} size="md" />
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: m.color, letterSpacing: '0.1em' }}>{m.label}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{m.range}</div>
              </div>
            </div>
            <p className="le-metric-desc" style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text-primary)' }}>Personality:</strong> {m.personality}</p>
            <p className="le-metric-desc"><strong style={{ color: 'var(--text-primary)' }}>Visual:</strong> {m.visual}</p>
          </div>
        ))}
      </div>

      {/* ══════ Section 7: CIPHER Explained ══════ */}
      <div className="le-section-divider le-animate le-fade">
        <Cpu size={14} />
        <span>CIPHER — YOUR AI ANALYST</span>
      </div>

      <div className="le-cipher-card le-animate le-slide-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <CipherAvatar mood="elite" size="md" />
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: '#00ff88', letterSpacing: '0.1em' }}>CIPHER</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Performance Autopsy Engine • Llama 3.1 via Groq</div>
          </div>
        </div>
        <div className="le-cipher-steps">
          {[
            'Reads your entire habit_logs table since registration',
            'Computes per-protocol stats: rates, streaks, missed days',
            'Builds a daily score timeline from day 1 to today',
            'Detects your execution personality type (10 types)',
            'Identifies timeline events: best day, dead streaks, collapses',
            'Calculates your index ceiling (max possible score today)',
            'Pinpoints your single biggest mistake',
            'Generates 3 ranked orders with estimated index impact',
          ].map((step, i) => (
            <div key={i} className="le-cipher-step">
              <span className="le-step-num">{String(i + 1).padStart(2, '0')}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
        <div className="le-cipher-note">
          Runs once per day. Cached in localStorage by date. Speaks directly to you using your username.
        </div>
      </div>

      {/* Execution Types */}
      <div className="le-types-grid le-animate le-fade">
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 16 }}>◈ 10 EXECUTION PERSONALITY TYPES</div>
        <div className="le-types-list">
          {executionTypes.map((t, i) => (
            <div key={i} className={`le-type-chip le-animate le-slide-${i % 2 === 0 ? 'left' : 'right'}`}>
              <span className="le-type-name">{t.name}</span>
              <span className="le-type-quote">"{t.quote}"</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grace Period */}
      <div className="le-grace-card le-animate le-slide-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>🌱</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: '#00cc66', letterSpacing: '0.1em' }}>NEW USER GRACE PERIOD</span>
        </div>
        <p className="le-metric-desc">
          For your first 3 days, CIPHER operates in teaching mode: encouraging, patient, and educational.
          Status never shows "critical." Visual theme stays green. No harsh judgment.
        </p>
        <p className="le-metric-desc" style={{ marginTop: 8 }}>
          <strong style={{ color: 'var(--text-primary)' }}>ON DAY 4:</strong> CIPHER switches to full analysis mode.
          A one-time transition message appears. From then on, performance is judged honestly.
        </p>
      </div>

      {/* ══════ Footer ══════ */}
      <div className="le-footer le-animate le-fade">
        <div className="le-footer-line" />
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          ASCEND v2.2.0 // Built by ShubV // 2026
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          The math is deterministic. The AI is transparent. Your data stays yours.
        </p>
        <button className="le-back-btn" onClick={() => setView('about')} style={{ marginTop: 16 }}>
          <ArrowLeft size={14} /> Back to Landing
        </button>
      </div>
    </div>
  );
};
