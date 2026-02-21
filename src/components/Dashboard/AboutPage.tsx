import { useEffect, useRef, useState } from 'react';
import { Target, Flame, Calendar, BarChart2, Zap, Shield, ArrowRight, ChevronDown, Cpu, Brain, Crosshair, BookOpen } from 'lucide-react';
import { CipherAvatar } from '../UI/CipherAvatar';
import type { View } from '../../types';

interface AboutPageProps {
  setView: (view: View) => void;
}

/* Intersection Observer hook for scroll-reveal — re-triggers on every scroll */
const useScrollReveal = () => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          } else {
            entry.target.classList.remove('revealed');
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    
    const items = el.querySelectorAll('.scroll-reveal');
    items.forEach(item => observer.observe(item));
    
    return () => observer.disconnect();
  }, []);
  
  return ref;
};

export const AboutPage = ({ setView }: AboutPageProps) => {
  const scrollRef = useScrollReveal();

  /* Cycling CIPHER avatar mood */
  const moods = ['elite', 'solid', 'slipping', 'critical'] as const;
  const [moodIdx, setMoodIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setMoodIdx(i => (i + 1) % moods.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: Target,
      title: 'Protocol Tracking',
      tagline: 'Define. Execute. Evolve.',
      desc: 'Transform habits into quantifiable protocols with calibrated difficulty multipliers. Easy (1.0×), Medium (1.2×), Hard (1.5×), Extreme (2.0×) — each level amplifies your score, rewarding you for tackling harder goals. One-tap daily completions. Zero friction.',
      accent: '#FF3B3B',
      targetView: 'habits' as View,
    },
    {
      icon: Shield,
      title: 'Discipline Index',
      tagline: 'Your single number of truth.',
      desc: 'A sophisticated 7-day rolling average of your weighted completion scores. This isn\'t just a percentage — it factors in difficulty, active protocols, and consistency to generate one metric that captures your true discipline. Watch it climb as you compound effort.',
      accent: '#00E5FF',
      targetView: 'dashboard' as View,
    },
    {
      icon: Cpu,
      title: 'CIPHER Analysis',
      tagline: 'AI-Powered Performance Autopsy.',
      desc: 'Full-spectrum analysis of your execution history. CIPHER identifies your personality type, calculates your index ceiling, pinpoints your biggest mistake, and gives you 3 orders to execute tonight. 10 personality types. Brutally honest.',
      accent: '#00ff88',
      targetView: 'cipher' as View,
    },
    {
      icon: BarChart2,
      title: 'AI Intelligence Engine',
      tagline: 'Analytics meets AI analysis.',
      desc: '30-day performance trend charts, per-protocol consistency breakdowns, week-over-week delta analysis, and AI-powered coaching insights. Every data point is tracked, scored, and visualized — with CIPHER providing real-time performance verdicts.',
      accent: '#9D4EDD',
      targetView: 'analytics' as View,
    },
    {
      icon: Calendar,
      title: 'Calendar Heatmap',
      tagline: 'See your effort across time.',
      desc: 'A full monthly heatmap showing completion intensity by day. Color-coded cells reveal your strongest and weakest periods at a glance. Click any date to view the detailed protocol breakdown — see exactly what was completed and what was missed.',
      accent: '#FF6B00',
      targetView: 'calendar' as View,
    },
    {
      icon: Flame,
      title: 'Streak Engine',
      tagline: 'Momentum is everything.',
      desc: 'Automatic consecutive-day streak tracking for every protocol. The streak counter builds visible momentum — a psychological tool to keep you locked in. Analytics highlight which streaks are thriving and which need reinforcement before they break.',
      accent: '#00FF66',
      targetView: null,
    },
  ];

  const aiFeatures = [
    { num: '01', title: 'DAILY MISSION BRIEF', location: 'Command Center', desc: 'Every morning, CIPHER reads your protocols and index trend, then generates a personalized mission brief for the day ahead.' },
    { num: '02', title: 'LIVE AI COACH', location: 'Analytics Sidebar', desc: 'Real-time performance verdict based on your current streak data and Discipline Index. Updates daily. Brutally honest.' },
    { num: '03', title: 'PROTOCOL DIFFICULTY AI', location: 'New Protocol Modal', desc: 'Type a habit name, AI recommends the correct difficulty level with reasoning. Learns from your existing protocol patterns.' },
    { num: '04', title: 'WEEKLY INTELLIGENCE', location: 'Intelligence Page', desc: 'On-demand deep analysis covering 30 days of data. Pattern recognition, correlation insights, weak link identification.' },
  ];

  return (
    <div className="landing-page" ref={scrollRef}>
      {/* ─── Hero Section ─── */}
      <section className="landing-hero">
        <div className="landing-grid" />
        <div className="landing-orbs">
          <div className="landing-orb landing-orb-1" />
          <div className="landing-orb landing-orb-2" />
          <div className="landing-orb landing-orb-3" />
        </div>

        <div className="landing-content">
          <div className="landing-badge">
            <span className="landing-badge-dot" />
            AI-Powered Personal Evolution System
          </div>

          <h1 className="landing-title">
            <span className="landing-title-accent">Ascend</span>
          </h1>

          <div className="landing-divider" />

          <p className="landing-subtitle">
            Transform discipline into measurable evolution with CIPHER —
            your brutally honest AI performance coach.
            <br />
            Track protocols. Predict patterns. Execute without excuses.
          </p>

          <div className="landing-cta-group">
            <button className="landing-cta landing-cta-primary" onClick={() => setView('dashboard')}>
              <Zap size={16} /> Enter Command Center
            </button>
            <button className="landing-cta landing-cta-secondary" onClick={() => {
              document.querySelector('.cipher-intro-section')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Explore Features <ChevronDown size={16} />
            </button>
          </div>
        </div>

        <div className="landing-footer">
          <div className="landing-scroll-indicator">
            <div className="landing-scroll-dot" />
          </div>
          <span className="landing-footer-text">Scroll to explore</span>
        </div>
      </section>

      {/* ─── MEET CIPHER Section ─── */}
      <section className="cipher-intro-section scroll-reveal">
        <div className="cipher-intro-grid">
          <div className="cipher-avatar-showcase">
            <div className="cipher-avatar-glow" />
            <CipherAvatar mood={moods[moodIdx]} size="lg" />
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.15em', marginTop: 12, textAlign: 'center' }}>
              MODE: {moods[moodIdx].toUpperCase()}
            </div>
          </div>
          <div className="cipher-intro-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Zap size={16} color="#00ff88" />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '0.15em', color: '#00ff88', fontWeight: 700 }}>MEET CIPHER</span>
            </div>
            <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px', lineHeight: 1.3 }}>
              Your AI Performance Analyst
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 20px' }}>
              CIPHER doesn't track habits. CIPHER reads your execution history,
              identifies patterns you can't see, and tells you exactly what's
              broken and how to fix it tonight.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Full-spectrum performance autopsy after every session',
                '10 execution personality types detected from your data',
                'Predictive ceiling calculations for your maximum index',
                'Brutally honest. Zero fluff. Uses your actual numbers.',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#00ff88', fontWeight: 700, flexShrink: 0 }}>•</span>
                  {item}
                </div>
              ))}
            </div>
            <button
              className="landing-cta landing-cta-secondary"
              onClick={() => setView('cipher')}
              style={{ marginTop: 20, fontSize: 12 }}
            >
              <ArrowRight size={14} /> View CIPHER Analysis
            </button>
          </div>
        </div>
      </section>

      {/* ─── Horizontal Feature Cards ─── */}
      <section className="landing-features-section">
        <div className="landing-section-header scroll-reveal">
          <span className="landing-section-tag">System Capabilities</span>
          <h2 className="landing-section-title">Built for Discipline</h2>
          <p className="landing-section-desc">
            Six interconnected modules — including AI-powered CIPHER analysis — working together to quantify, track, and optimize your personal evolution.
          </p>
        </div>

        <div className="landing-horizontal-features">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className={`landing-hcard scroll-reveal${feature.targetView === 'cipher' ? ' cipher-hcard' : ''}`}
              style={{ '--card-accent': feature.accent, cursor: feature.targetView ? 'pointer' : 'default' } as React.CSSProperties}
              onClick={() => feature.targetView && setView(feature.targetView)}
            >
              <div className="landing-hcard-left">
                <div className="landing-hcard-icon">
                  {feature.targetView === 'cipher' ? (
                    <CipherAvatar mood="elite" size="sm" />
                  ) : (
                    <feature.icon size={28} />
                  )}
                </div>
                <div className="landing-hcard-number">
                  {String(i + 1).padStart(2, '0')}
                </div>
              </div>
              <div className="landing-hcard-right">
                <h3 className="landing-hcard-title">{feature.title}</h3>
                <p className="landing-hcard-tagline">{feature.tagline}</p>
                <p className="landing-hcard-desc">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── AI Features Grid ─── */}
      <section className="ai-features-section scroll-reveal">
        <div className="landing-section-header scroll-reveal">
          <span className="landing-section-tag" style={{ color: '#00ff88' }}>
            <Brain size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            AI-Powered
          </span>
          <h2 className="landing-section-title">Intelligence Built Into Every Page</h2>
          <p className="landing-section-desc">
            CIPHER's AI isn't a separate tool — it's woven into every page of ASCEND.
          </p>
        </div>
        <div className="ai-features-grid">
          {aiFeatures.map((f, i) => (
            <div key={i} className="ai-feature-card scroll-reveal">
              <div className="ai-feature-number">{f.num}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-primary)', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: '#00ff88', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', marginBottom: 12 }}>{f.location}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section className="landing-bottom-cta scroll-reveal">
        <div className="landing-bottom-cta-line" />
        <h2 className="landing-bottom-title">Begin Your Evolution</h2>
        <p className="landing-bottom-subtitle">Your discipline. Quantified. AI-analyzed. Evolved.</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>
          CIPHER is waiting. Your protocols are ready. Start building your system.
        </p>
        <button className="landing-cta landing-cta-primary" onClick={() => setView('dashboard')} style={{ marginTop: '1rem' }}>
          <Zap size={16} /> Launch System <ArrowRight size={16} />
        </button>
        <div style={{ marginTop: 24, display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
          <button
            onClick={() => setView('logic-engine')}
            style={{ background: 'none', border: '1px solid var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: 11, padding: '6px 16px', borderRadius: 4, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <BookOpen size={12} /> LOGIC ENGINE
          </button>
        </div>
        <p className="landing-footer-credit" style={{ textTransform: 'uppercase' }}>
          ASCEND © 2026 • Built by VINAYAK // ShubV
        </p>
      </section>
    </div>
  );
};
