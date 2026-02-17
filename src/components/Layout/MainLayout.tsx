import { useState, useEffect, useRef, type ReactNode } from 'react';
import { LayoutDashboard, CheckSquare, BarChart2, Settings, Calendar, X, Activity, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { View } from '../../types';

interface MainLayoutProps {
  children: ReactNode;
  currentView: View;
  setView: (view: View) => void;
}

export const MainLayout = ({ children, currentView, setView }: MainLayoutProps) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Track scroll for navbar transparency
  useEffect(() => {
    const el = mainContentRef.current;
    if (!el) return;

    const handleScroll = () => {
      const isScrolled = el.scrollTop > 20;
      setScrolled(isScrolled);
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const mainNav = [
    { id: 'dashboard' as View, label: 'Command Center', icon: LayoutDashboard },
    { id: 'habits' as View, label: 'Protocol Registry', icon: CheckSquare },
    { id: 'calendar' as View, label: 'Calendar', icon: Calendar },
    { id: 'analytics' as View, label: 'Intelligence', icon: BarChart2 },
    { id: 'settings' as View, label: 'System Config', icon: Settings },
  ];

  const handleNav = (view: View) => {
    setView(view);
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      {/* ─── Top Navbar ─── */}
      <nav className={`top-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-left">
          <button 
            className={`hamburger-btn ${sidebarOpen ? 'active' : ''}`}
            onClick={() => { setSidebarOpen(!sidebarOpen); setAnalyticsOpen(false); }}
            aria-label="Toggle navigation"
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>

        <button className="navbar-brand" onClick={() => handleNav('about')}>
          <span className="navbar-brand-name">Ascend</span>
        </button>

        <div className="navbar-right">
          <button 
            className={`navbar-icon-btn accent`}
            onClick={() => { setAnalyticsOpen(!analyticsOpen); setSidebarOpen(false); }}
            title="Discipline Index"
          >
            <Activity size={18} />
          </button>
        </div>
      </nav>

      {/* ─── Backdrop ─── */}
      <div 
        className={`panel-backdrop ${(sidebarOpen || analyticsOpen) ? 'visible' : ''}`}
        onClick={() => { setSidebarOpen(false); setAnalyticsOpen(false); }}
      />

      {/* ─── Sidebar Panel ─── */}
      <aside className={`sidebar-panel ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-panel-header">
          <h2>Navigation</h2>
          <button className="sidebar-panel-close" onClick={() => setSidebarOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <div className="sidebar-nav-section">
          <div className="sidebar-section-label">Pages</div>
          {mainNav.map((item, i) => (
            <button
              key={item.id}
              className={`nav-item ${currentView === item.id ? 'active' : ''} fade-in-left delay-${i + 1}`}
              onClick={() => handleNav(item.id)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)',
            marginBottom: '0.5rem'
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--accent-primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, color: '#000',
              flexShrink: 0, textTransform: 'uppercase'
            }}>
              {user?.username?.slice(0, 2) || 'U'}
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username || 'User'}
            </span>
          </div>
          <button 
            className="nav-item" 
            onClick={logout}
            style={{ color: 'var(--text-muted)', width: '100%', justifyContent: 'flex-start', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ─── Analytics Panel ─── */}
      <AnalyticsPanelOverlay open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />

      {/* ─── Main Content ─── */}
      <main className="main-content" ref={mainContentRef}>
        {children}
      </main>
    </div>
  );
};

/* Analytics Panel uses the existing component but wraps in overlay */
import { AnalyticsPanel } from './AnalyticsPanel';

const AnalyticsPanelOverlay = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  return (
    <div className={`analytics-overlay ${open ? 'open' : ''}`}>
      <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
        <span className="analytics-section-title" style={{ margin: 0 }}>Discipline Overview</span>
        <button className="sidebar-panel-close" onClick={onClose} style={{ width: 28, height: 28 }}>
          <X size={14} />
        </button>
      </div>
      <AnalyticsPanel />
    </div>
  );
};
