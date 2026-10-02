import { useTheme } from '../../context/ThemeContext';

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  
  const themes = [
    { id: 'obsidian', label: 'Obsidian' },
    { id: 'midnight-cyber', label: 'Midnight' },
    { id: 'void-purple', label: 'Void' },
    { id: 'ember', label: 'Ember' },
    { id: 'matrix', label: 'Matrix' },
  ] as const;

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>System Aesthetics</h2>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {themes.map(t => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            style={{
              padding: '1rem',
              textAlign: 'left',
              background: theme === t.id ? 'var(--bg-tertiary)' : 'transparent',
              border: `1px solid ${theme === t.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              color: theme === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderRadius: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
};
