import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    setTimeout(() => {
      if (login(username, password)) {
        setError('');
      } else {
        setError('ACCESS DENIED. INVALID CREDENTIALS.');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="login-page">
      <div className="login-grid" />
      
      {/* Floating orbs for atmosphere */}
      <div className="landing-orbs">
        <div className="landing-orb landing-orb-1" style={{ opacity: 0.15 }} />
        <div className="landing-orb landing-orb-2" style={{ opacity: 0.1 }} />
      </div>
      
      <div className="login-card">
        {/* Logo */}
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
          textTransform: 'uppercase', marginBottom: '2rem', textAlign: 'center'
        }}>
          Personal Evolution System
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Identity</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="form-input"
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Access Key</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="form-input"
              autoComplete="off"
            />
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.85rem' }}
            disabled={loading}
          >
            {loading ? 'AUTHENTICATING...' : 'INITIALIZE SYSTEM'}
          </button>
        </form>

        {error && (
          <p style={{ 
            color: '#FF4444', fontSize: '0.7rem', textAlign: 'center', 
            marginTop: '1rem', fontFamily: "'JetBrains Mono', monospace" 
          }}>
            {error}
          </p>
        )}
        
        <p style={{ 
          textAlign: 'center', marginTop: '1.5rem', fontSize: '0.55rem', 
          color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.08em'
        }}>
          ENCRYPTED // PRIVATE
        </p>
      </div>
    </div>
  );
};
