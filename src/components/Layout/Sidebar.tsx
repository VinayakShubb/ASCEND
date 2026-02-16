import { LayoutDashboard, CheckSquare, BarChart2, Settings, LogOut, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Dispatch, SetStateAction } from 'react';
import type { View } from '../../types';

interface SidebarProps {
  currentView: View;
  setView: Dispatch<SetStateAction<View>>;
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
}

export const Sidebar = ({ currentView, setView, collapsed, setCollapsed }: SidebarProps) => {
  const { logout } = useAuth();
  
  const mainNav = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'habits' as View, label: 'Protocols', icon: CheckSquare },
    { id: 'calendar' as View, label: 'Calendar', icon: Calendar },
    { id: 'analytics' as View, label: 'Intelligence', icon: BarChart2 },
  ];

  const systemNav = [
    { id: 'settings' as View, label: 'System Config', icon: Settings },
  ];

  return (
    <aside className="sidebar" style={{ width: collapsed ? '72px' : undefined }}>
      <div className="sidebar-header">
        {/* ASCEND Logo → About page */}
        <button 
          className="sidebar-brand" 
          onClick={() => setView('about')}
          style={{ cursor: 'pointer', width: '100%', background: 'none', border: 'none', padding: 0 }}
          title="About ASCEND"
        >
          <div style={{ 
            width: 28, height: 28, 
            border: '2px solid var(--accent-primary)', 
            borderRadius: 6, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-primary)',
            fontSize: '0.7rem',
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            flexShrink: 0,
            boxShadow: currentView === 'about' ? '0 0 10px var(--accent-glow)' : 'none',
            transition: 'all 0.2s ease'
          }}>
            A
          </div>
          {!collapsed && (
            <h2>Ascend</h2>
          )}
        </button>
      </div>

      <nav className="sidebar-nav">
        {!collapsed && <div className="sidebar-section-label">Navigation</div>}
        {mainNav.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}

        {!collapsed && <div className="sidebar-section-label" style={{ marginTop: '0.5rem' }}>System</div>}
        {systemNav.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button 
          className="nav-item" 
          onClick={logout}
          style={{ color: 'var(--text-muted)', width: '100%' }}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>

        <button 
          className="icon-btn" 
          onClick={() => setCollapsed(!collapsed)}
          style={{ margin: '0.5rem auto 0', display: 'flex' }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
};
