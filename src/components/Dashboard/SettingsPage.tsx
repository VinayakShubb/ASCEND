import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Palette, Shield, Database, Trash2, Download } from 'lucide-react';
import { storage } from '../../utils/storage';

export const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { habits, logs } = useData();

  const themes = [
    { id: 'obsidian', label: 'Obsidian', desc: 'Crimson on black', color: '#FF3B3B', bg: '#0D0D0D' },
    { id: 'midnight-cyber', label: 'Midnight Cyber', desc: 'Cyan neon pulse', color: '#00E5FF', bg: '#0B1220' },
    { id: 'void-purple', label: 'Void Purple', desc: 'Deep ultraviolet', color: '#9D4EDD', bg: '#0E0A1F' },
    { id: 'ember', label: 'Ember', desc: 'Warm orange glow', color: '#FF6B00', bg: '#121212' },
    { id: 'matrix', label: 'Matrix', desc: 'Terminal green', color: '#00FF66', bg: '#000000' },
  ] as const;

  const handleExport = () => {
    const data = {
      habits: storage.get('habits', []),
      logs: storage.get('logs', []),
      user: storage.get('user', null),
      theme: storage.get('theme', 'obsidian'),
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ascend-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    if (confirm('⚠ This will permanently delete all habits, logs, and settings. Continue?')) {
      if (confirm('This is IRREVERSIBLE. Are you absolutely sure?')) {
        storage.clear();
        window.location.reload();
      }
    }
  };

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="page-title">System Configuration</div>
        <div className="page-subtitle">Customize and manage ASCEND preferences</div>
      </div>

      {/* Theme Section */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Palette size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Visual Theme
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {themes.map(t => (
            <button
              key={t.id}
              className={`theme-option ${theme === t.id ? 'active' : ''}`}
              onClick={() => setTheme(t.id)}
            >
              <div className="theme-swatch" style={{ background: `linear-gradient(135deg, ${t.bg}, ${t.color})` }} />
              <div>
                <div className="theme-name">{t.label}</div>
                <div className="theme-desc">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Shield size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
          System Information
        </div>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
            <div>
              <div className="form-label" style={{ marginBottom: '0.3rem' }}>Operator</div>
              <div className="mono" style={{ fontSize: '0.9rem' }}>{user?.username || 'SHUB'}</div>
            </div>
            <div>
              <div className="form-label" style={{ marginBottom: '0.3rem' }}>Active Protocols</div>
              <div className="mono" style={{ fontSize: '0.9rem' }}>{habits.filter(h => !h.archived).length}</div>
            </div>
            <div>
              <div className="form-label" style={{ marginBottom: '0.3rem' }}>Total Logs</div>
              <div className="mono" style={{ fontSize: '0.9rem' }}>{logs.length}</div>
            </div>
            <div>
              <div className="form-label" style={{ marginBottom: '0.3rem' }}>System Version</div>
              <div className="mono" style={{ fontSize: '0.9rem' }}>v1.0.0</div>
            </div>
            <div>
              <div className="form-label" style={{ marginBottom: '0.3rem' }}>Active Theme</div>
              <div className="mono" style={{ fontSize: '0.9rem' }}>{theme}</div>
            </div>
            <div>
              <div className="form-label" style={{ marginBottom: '0.3rem' }}>Storage</div>
              <div className="mono" style={{ fontSize: '0.9rem' }}>LocalStorage</div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Database size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Data Management
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={handleExport}>
            <Download size={14} /> Export Backup
          </button>
          <button className="btn btn-ghost" style={{ borderColor: 'rgba(255,68,68,0.3)', color: '#FF6B6B' }} onClick={handleClearData}>
            <Trash2 size={14} /> Clear All Data
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="settings-section">
        <button className="btn btn-ghost" onClick={logout}>
          <Shield size={14} /> Disconnect System
        </button>
      </div>
    </div>
  );
};
