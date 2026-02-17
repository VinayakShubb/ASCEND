import { useEffect, useRef } from 'react';
import { Target, Flame, Calendar, BarChart2, Zap, Shield, ArrowRight, ChevronDown } from 'lucide-react';
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
            // Remove when out of view so animation replays on re-entry
            entry.target.classList.remove('revealed');
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    
    // Observe all children with .scroll-reveal
    const items = el.querySelectorAll('.scroll-reveal');
    items.forEach(item => observer.observe(item));
    
    return () => observer.disconnect();
  }, []);
  
  return ref;
};

export const AboutPage = ({ setView }: AboutPageProps) => {
  const scrollRef = useScrollReveal();

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
      icon: BarChart2,
      title: 'Deep Intelligence',
      tagline: 'Data-driven self-improvement.',
      desc: '30-day performance trend charts, per-protocol consistency breakdowns, week-over-week delta analysis, and automated system insights. Every data point is tracked, scored, and visualized so you can identify patterns invisible to manual tracking.',
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
            Personal Evolution System
          </div>

          <h1 className="landing-title">
            <span className="landing-title-accent">Ascend</span>
          </h1>

          <div className="landing-divider" />

          <p className="landing-subtitle">
            Transform daily discipline into measurable evolution.
            Track protocols, analyze patterns, build unbreakable consistency.
          </p>

          <div className="landing-cta-group">
            <button className="landing-cta landing-cta-primary" onClick={() => setView('dashboard')}>
              <Zap size={16} /> Enter Command Center
            </button>
            <button className="landing-cta landing-cta-secondary" onClick={() => {
              document.querySelector('.landing-features-section')?.scrollIntoView({ behavior: 'smooth' });
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

      {/* ─── Horizontal Feature Cards ─── */}
      <section className="landing-features-section">
        <div className="landing-section-header scroll-reveal">
          <span className="landing-section-tag">System Capabilities</span>
          <h2 className="landing-section-title">Built for Discipline</h2>
          <p className="landing-section-desc">
            Five interconnected modules working together to quantify, track, and optimize your personal evolution.
          </p>
        </div>

        <div className="landing-horizontal-features">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className="landing-hcard scroll-reveal"
              style={{ '--card-accent': feature.accent, cursor: feature.targetView ? 'pointer' : 'default' } as React.CSSProperties}
              onClick={() => feature.targetView && setView(feature.targetView)}
            >
              <div className="landing-hcard-left">
                <div className="landing-hcard-icon">
                  <feature.icon size={28} />
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

      {/* ─── Bottom CTA ─── */}
      <section className="landing-bottom-cta scroll-reveal">
        <div className="landing-bottom-cta-line" />
        <h2 className="landing-bottom-title">Begin Your Evolution</h2>
        <p className="landing-bottom-subtitle">Your discipline. Quantified. Optimized. Evolved.</p>
        <button className="landing-cta landing-cta-primary" onClick={() => setView('dashboard')} style={{ marginTop: '1.5rem' }}>
          <Zap size={16} /> Launch System <ArrowRight size={16} />
        </button>
        <p className="landing-footer-credit" style={{ textTransform: 'uppercase' }}>
          an evolution system by VINAYAK // ShubV
        </p>
      </section>
    </div>
  );
};
