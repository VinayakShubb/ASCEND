import { useState, useEffect, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { LayoutDashboard, CheckSquare, BarChart2, Settings, LogOut, Calendar, X, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { View } from '../../types';

interface MainLayoutProps {
  children: ReactNode;
  currentView: View;
  setView: Dispatch<SetStateAction<View>>;
}

export const MainLayout = ({ children, currentView, setView }: MainLayoutProps) => {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll for navbar transparency
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
          <button 
            className="nav-item" 
            onClick={logout}
            style={{ color: 'var(--text-muted)', width: '100%', justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ─── Analytics Panel ─── */}
      <AnalyticsPanelOverlay open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />

      {/* ─── Main Content ─── */}
      <main className="main-content">
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
