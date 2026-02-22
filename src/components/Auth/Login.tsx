import React, { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CipherAvatar } from '../UI/CipherAvatar';
import type { CipherMood } from '../UI/CipherAvatar';
import {
  Eye, EyeOff, Brain, Target, CheckSquare, Shield,
  Calendar, BarChart3, ChevronDown
} from 'lucide-react';

/* ─── Bi-directional Scroll-Reveal Hook ─── */
const useScrollReveal = (rootSelector?: string) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Detect mobile breakpoint
    const isMobile = window.innerWidth <= 960;
    
    // CRITICAL FIX: On mobile, the window scrolls, not the info panel. 
    // Therefore, root must be null (viewport) on mobile.
    const root = (!isMobile && rootSelector) ? document.querySelector(rootSelector) : null;
    
    // Tighter rootMargin on mobile since screen is smaller. 
    // CRITICAL: Negative values on both TOP and BOTTOM ensure the animation triggers accurately when scrolling UP and DOWN.
    const margin = isMobile ? '-40px 0px -40px 0px' : '-50px 0px -50px 0px';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          } else {
            // Remove class so it animates again when scrolling back
            entry.target.classList.remove('revealed');
          }
        });
      },
      { threshold: 0.12, rootMargin: margin, root: root }
    );

    const items = el.querySelectorAll('.scroll-reveal');
    items.forEach(item => observer.observe(item));

    return () => observer.disconnect();
  }, [rootSelector]);

  return ref;
};

export const Login = () => {
  const leftRef = useScrollReveal('.login-info-panel');
  const { login, register } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Force scroll to top on initial load
  useEffect(() => {
    window.scrollTo(0, 0);
    const scrollContainer = document.querySelector('.login-info-panel');
    if (scrollContainer) {
      scrollContainer.scrollTo(0, 0);
    }
  }, []);

  // Cycle through CIPHER moods for the demo
  const [moodIndex, setMoodIndex] = useState(0);
  const moods: CipherMood[] = ['elite', 'solid', 'slipping', 'critical'];
  useEffect(() => {
    const interval = setInterval(() => {
      setMoodIndex(prev => (prev + 1) % moods.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isRegistering) {
      if (!username.trim()) {
        setError('USER ID IS REQUIRED.');
        setLoading(false);
        return;
      }
      const { error: authError } = await register(email, password, username.trim());
      if (authError) {
        setError(authError.toUpperCase());
      }
    } else {
      const { error: authError } = await login(identifier, password);
      if (authError) {
        setError(authError.toUpperCase());
      }
    }

    setLoading(false);
  };

  const moodLabels: Record<'elite' | 'solid' | 'slipping' | 'critical', { label: string; color: string; desc: string }> = {
    elite: { label: 'ELITE', color: '#00ff88', desc: 'Top-tier execution. CIPHER approves.' },
    solid: { label: 'SOLID', color: '#00cc66', desc: 'Consistent discipline. Keep pushing.' },
    slipping: { label: 'SLIPPING', color: '#ffaa00', desc: 'Performance declining. Intervention needed.' },
    critical: { label: 'CRITICAL', color: '#ff4444', desc: 'System failure. Immediate course correction.' },
  };

  const currentMood = moods[moodIndex] as 'elite' | 'solid' | 'slipping' | 'critical';

  return (
    <div className="login-page split-layout">

      {/* ═══ LEFT: INFO SHOWCASE (Scrollable) ═══ */}
      <div className="login-info-panel" ref={leftRef}>
        <div className="login-grid" />
        <div className="landing-orbs">
          <div className="landing-orb landing-orb-1" style={{ opacity: 0.12 }} />
          <div className="landing-orb landing-orb-2" style={{ opacity: 0.08 }} />
          <div className="landing-orb landing-orb-3" style={{ opacity: 0.06 }} />
        </div>

        <div className="info-content">

          {/* ─── HERO: Only ASCEND visible initially ─── */}
          <div className="login-hero-section">
            <h1 className="login-glow-title">ASCEND</h1>
            <p className="info-subtitle" style={{ opacity: 0, animation: 'fadeIn 1s ease 0.5s forwards' }}>
              The Discipline Operating System.<br/>
              Track. Quantify. Evolve.
            </p>
            <div style={{ width: 60, height: 2, background: 'var(--accent-primary)', boxShadow: '0 0 12px var(--accent-glow)', margin: '1.5rem 0 0', opacity: 0, animation: 'lineExpand 0.8s ease 0.8s forwards' }}></div>

            {/* ─── Scroll Indicator (Animated pulse line) ─── */}
            <div className="login-scroll-indicator-v2">
              <div className="scroll-pulse-line"></div>
              <span>EXPLORE</span>
              <ChevronDown size={14} className="scroll-bounce-chevron" />
              <ChevronDown size={14} className="scroll-bounce-chevron" style={{ marginTop: '-8px', opacity: 0.4 }} />
            </div>
          </div>

          {/* ─── SECTION 1: HABIT TRACKING (Slide from Left) ─── */}
          <div className="scroll-reveal slide-left info-section">
            <div className="info-section-header">
              <CheckSquare size={22} className="text-accent" />
              <span>PROTOCOL SYSTEM</span>
            </div>
            <h3 className="info-section-title">Your Habits. Weaponized.</h3>
            <p className="info-section-desc">
              Every habit is a <strong>protocol</strong> — assigned a difficulty multiplier from <code>1.0x</code> to <code>2.0x</code>.
              Skipping a hard task decays your system score exponentially faster than missing an easy one.
              This isn't a checkbox app. It's a ruthless accountability engine.
            </p>

            {/* Mock Habit UI */}
            <div className="mock-ui-card">
              <div className="mock-habit-row">
                <div className="mock-habit-left">
                  <div className="mock-checkbox checked"></div>
                  <span className="mono" style={{ fontSize: '0.8rem' }}>Deep Work Session (90m)</span>
                </div>
                <span className="mock-difficulty extreme">2.0x EXTREME</span>
              </div>
              <div className="mock-habit-row">
                <div className="mock-habit-left">
                  <div className="mock-checkbox checked"></div>
                  <span className="mono" style={{ fontSize: '0.8rem' }}>Gym / Strength Training</span>
                </div>
                <span className="mock-difficulty hard">1.5x HARD</span>
              </div>
              <div className="mock-habit-row">
                <div className="mock-habit-left">
                  <div className="mock-checkbox"></div>
                  <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Read 20 Pages</span>
                </div>
                <span className="mock-difficulty easy">1.0x EASY</span>
              </div>
              <div className="mock-habit-row">
                <div className="mock-habit-left">
                  <div className="mock-checkbox"></div>
                  <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Journal Entry</span>
                </div>
                <span className="mock-difficulty easy">1.0x EASY</span>
              </div>
            </div>
          </div>

          {/* ─── SECTION 2: DISCIPLINE INDEX (Slide from Right) ─── */}
          <div className="scroll-reveal slide-right info-section">
            <div className="info-section-header">
              <Target size={22} className="text-accent" />
              <span>THE DISCIPLINE INDEX</span>
            </div>
            <h3 className="info-section-title">One Number. Zero Lies.</h3>
            <p className="info-section-desc">
              A rolling <strong>7-day weighted average</strong> that acts as your single source of truth.
              One good day is irrelevant — sustained execution builds the index.
              Your DI determines your rank, CIPHER's mood, and the system's tone toward you.
            </p>

            {/* Mock DI Display */}
            <div className="mock-ui-card" style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#00ff88', textShadow: '0 0 30px rgba(0,255,136,0.4)' }}>
                87.3
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '0.5rem' }}>
                DISCIPLINE INDEX // ELITE STATUS
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>14</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>STREAK</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: '1.1rem', color: '#00ff88' }}>+4.2</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>TREND</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>92%</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>TODAY</div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── SECTION 3: CIPHER AI (Slide from Right) ─── */}
          <div className="scroll-reveal slide-right info-section">
            <div className="info-section-header">
              <Brain size={22} className="text-accent" />
              <span>CIPHER AI ENGINE</span>
            </div>
            <h3 className="info-section-title">Your AI Drill Sergeant.</h3>
            <p className="info-section-desc">
              CIPHER monitors your behavioral patterns and generates
              tactical orders when your discipline slips. It doesn't motivate — it <em>diagnoses</em>.
              Four dynamic mood states reflect your performance in real time.
            </p>

            {/* CIPHER Mood Showcase */}
            <div className="mock-ui-card cipher-mood-showcase">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <CipherAvatar mood={currentMood} size="lg" />
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    CIPHER STATUS
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: moodLabels[currentMood].color, transition: 'color 0.5s ease' }}>
                    {moodLabels[currentMood].label}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', borderLeft: `2px solid ${moodLabels[currentMood].color}`, paddingLeft: '1rem', transition: 'border-color 0.5s ease' }}>
                "{moodLabels[currentMood].desc}"
              </p>
              {/* Mood indicator bar */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                {moods.map((m, i) => {
                  const moodKey = m as 'elite' | 'solid' | 'slipping' | 'critical';
                  const label = moodLabels[moodKey];
                  return (
                    <div key={m} style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: i === moodIndex ? label.color : 'rgba(255,255,255,0.08)',
                      boxShadow: i === moodIndex ? `0 0 8px ${label.color}` : 'none',
                      transition: 'all 0.5s ease'
                    }}></div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── SECTION 4: CALENDAR HEATMAP (Slide from Left) ─── */}
          <div className="scroll-reveal slide-left info-section">
            <div className="info-section-header">
              <Calendar size={22} className="text-accent" />
              <span>EXECUTION CALENDAR</span>
            </div>
            <h3 className="info-section-title">Your Year. One Glance.</h3>
            <p className="info-section-desc">
              A GitHub-style contribution heatmap tracks every single day.
              See your streaks, missed days, and patterns at a glance.
              Click any cell to drill down into that day's protocol execution.
            </p>
          </div>

          {/* ─── SECTION 5: ANALYTICS (Slide from Right) ─── */}
          <div className="scroll-reveal slide-right info-section">
            <div className="info-section-header">
              <BarChart3 size={22} className="text-accent" />
              <span>PERFORMANCE ANALYTICS</span>
            </div>
            <h3 className="info-section-title">30-Day Performance Graph.</h3>
            <p className="info-section-desc">
              Visualize your Discipline Index over time with an interactive line chart.
              Time-window breakdowns show morning, afternoon, and evening execution rates.
              Spot your strongest and weakest windows — then exploit them.
            </p>
          </div>

          {/* ─── FOOTER (at the very bottom of info panel) ─── */}
          <div className="scroll-reveal fade-in desktop-footer" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>
            <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>
              ARCHITECT: VINAYAK // SHUBV<br/>
              ASCEND // DISCIPLINE OPERATING SYSTEM
            </p>
          </div>

        </div>
      </div>

      {/* ═══ RIGHT: AUTH FORM (Fixed/Sticky) ═══ */}
      <div className="login-form-panel sticky-panel">
        {/* Glowing border train wrapper */}
        <div className="login-card-glow-wrapper">
          <div className="login-card">
            <div className="login-logo">
              <Shield size={24} />
            </div>

            <h1 style={{
              fontSize: '1.6rem', fontWeight: 800, letterSpacing: '0.25em',
              textTransform: 'uppercase', marginBottom: '0.25rem', textAlign: 'center'
            }}>
              ASCEND
            </h1>
            <p style={{
              fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: '1.5rem', textAlign: 'center'
            }}>
              {isRegistering ? 'CREATE NEW IDENTITY' : 'Personal Evolution System'}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {isRegistering && (
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="form-input"
                    autoComplete="email"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">{isRegistering ? 'User ID' : 'Email / User ID'}</label>
                {isRegistering ? (
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a unique User ID"
                    className="form-input"
                    autoComplete="username"
                    autoFocus
                    required
                  />
                ) : (
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Email or User ID"
                    className="form-input"
                    autoComplete="username"
                    autoFocus
                    required
                  />
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Access Key</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="form-input"
                    style={{ paddingRight: '2.5rem' }}
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem', padding: '0.85rem' }}
                disabled={loading}
              >
                {loading ? 'PROCESSING...' : isRegistering ? 'CREATE IDENTITY' : 'INITIALIZE SYSTEM'}
              </button>
            </form>

            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                  setPassword('');
                  if (!isRegistering) {
                    setUsername('');
                    setEmail('');
                  } else {
                    setIdentifier('');
                  }
                }}
                style={{
                  background: 'none', border: 'none', color: 'var(--accent-primary)',
                  fontSize: '0.65rem', cursor: 'pointer', textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}
              >
                {isRegistering ? 'Already have an identity? Sign In' : 'Need a new identity? Create Account'}
              </button>
            </div>

            {error && (
              <p style={{
                color: '#FF4444', fontSize: '0.65rem', textAlign: 'center',
                marginTop: '0.75rem', fontFamily: "'JetBrains Mono', monospace",
                padding: '0.5rem', border: '1px solid rgba(255, 68, 68, 0.2)',
                background: 'rgba(255, 68, 68, 0.05)', borderRadius: '4px'
              }}>
                {error}
              </p>
            )}

          </div>
        </div>
      </div>

      {/* ─── FOOTER (Mobile only: strictly at the bottom of the stacked page) ─── */}
      <div className="scroll-reveal fade-in mobile-footer" style={{ padding: '2rem 0 4rem 0', width: '100%' }}>
        <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>
          ARCHITECT: VINAYAK // SHUBV<br/>
          ASCEND // DISCIPLINE OPERATING SYSTEM
        </p>
      </div>

    </div>
  );
};
