import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Eye, EyeOff } from 'lucide-react';

export const Login = () => {
  const { login, register } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      // If no error, onAuthStateChange will auto-redirect
    } else {
      const { error: authError } = await login(identifier, password);
      if (authError) {
        setError(authError.toUpperCase());
      }
    }

    setLoading(false);
  };


  return (
    <div className="login-page">
      <div className="login-grid" />
      <div className="landing-orbs">
        <div className="landing-orb landing-orb-1" style={{ opacity: 0.15 }} />
        <div className="landing-orb landing-orb-2" style={{ opacity: 0.1 }} />
      </div>

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
          {/* Registration: Email field */}
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

          {/* Registration: User ID / Login: Email or User ID */}
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

          {/* Password with show/hide toggle */}
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

        {/* Toggle Login/Register */}
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setPassword(''); // Clear sensitive data
              // Optional: clear other fields if desired, but password is the main concern
              if (!isRegistering) {
                 // Switching TO register mode
                 setUsername('');
                 setEmail('');
              } else {
                 // Switching TO login mode
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

        {/* Error */}
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

        <p style={{
          textAlign: 'center', marginTop: '1rem', fontSize: '0.5rem',
          color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.08em', textTransform: 'uppercase'
        }}>
          an evolution system by VINAYAK // ShubV
        </p>
      </div>
    </div>
  );
};
