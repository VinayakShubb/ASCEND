import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { Check, Plus, Trash2, Flame, RefreshCw } from 'lucide-react';
import type { Difficulty } from '../../types';
import { calculateDailyCompletion, getStreak } from '../../utils/calculations';
import { getDailyBrief, type BriefOutput } from '../../utils/aiBrief';
import { CipherAvatar } from '../UI/CipherAvatar';
import { AppFooter } from '../UI/AppFooter';

export const DashboardPage = () => {
  const { habits, logs, addHabit, deleteHabit, toggleHabitCompletion, getHabitStatus } = useData();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  const activeHabits = habits.filter(h => !h.archived);
  const completedCount = activeHabits.filter(h => getHabitStatus(h.id, today) === 'completed').length;
  const dailyCompletion = Math.round(calculateDailyCompletion(habits, logs, today));

  const [aiBrief, setAiBrief] = useState<BriefOutput | null>(null);
  const [isBriefLoading, setIsBriefLoading] = useState(false);

  useEffect(() => {
    const fetchBrief = async () => {
      if (!user || activeHabits.length === 0) return;
      setIsBriefLoading(true);
      const brief = await getDailyBrief(user.username, habits, logs);
      setAiBrief(brief);
      setIsBriefLoading(false);
    };
    fetchBrief();
  }, [user, habits, logs, activeHabits.length]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'elite': return '#00ff88';
      case 'solid': return '#00cc66';
      case 'slipping': return '#ffaa00';
      case 'critical': return '#ff4444';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="flex-between">
          <div>
            <div className="page-title">Command Center</div>
            <div className="page-subtitle">{format(new Date(), 'EEEE, MMMM do yyyy')}</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Protocol
          </button>
        </div>
      </div>

      {/* Daily Mission Brief (AI) */}
      {isBriefLoading ? (
        <div className="card mb-2" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
          <RefreshCw size={16} className="spin text-accent" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Generating Daily Mission Brief...</span>
        </div>
      ) : aiBrief && activeHabits.length > 0 ? (
        <div 
          className="card mb-2 ai-brief-card flex-center fade-in" 
          style={{ 
            borderTop: `2px solid ${getStatusColor(aiBrief.status)}`,
            padding: '1.25rem 1rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Status Label Top Left */}
          <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CipherAvatar mood={aiBrief.status as any} size="sm" />
            <div style={{ fontSize: '0.55rem', color: getStatusColor(aiBrief.status), fontWeight: 700, letterSpacing: '0.1em' }}>
              [{aiBrief.status.toUpperCase()}]
            </div>
          </div>

          
          <div style={{ 
            maxWidth: '600px', 
            margin: '1.25rem auto 0 auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem' 
          }}>
            <h2 style={{ 
              fontFamily: 'Orbitron, sans-serif', 
              fontSize: 'clamp(0.9rem, 2vw, 1.15rem)', 
              fontWeight: 800, 
              color: '#fff',
              margin: 0,
              lineHeight: 1.3,
              letterSpacing: '0.01em',
              textTransform: 'uppercase'
            }}>
              "{aiBrief.quote}"
            </h2>
            
            <p style={{ 
              fontSize: 'clamp(0.7rem, 1.2vw, 0.8rem)', 
              color: 'var(--text-secondary)', 
              lineHeight: 1.6, 
              whiteSpace: 'pre-wrap', 
              margin: 0,
              fontWeight: 400
            }}>
              {aiBrief.motivation}
            </p>
          </div>
        </div>
      ) : null}

      {/* Stats Row */}
      <div className="stat-grid mb-2">
        <div className="stat-card">
          <div className="stat-value">{dailyCompletion}%</div>
          <div className="stat-label">Today's Completion</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{completedCount}/{activeHabits.length}</div>
          <div className="stat-label">Protocols Executed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{activeHabits.length}</div>
          <div className="stat-label">Active Protocols</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card mb-2">
        <div className="flex-between mb-1">
          <span className="card-title">Daily Progress</span>
          <span className="mono text-accent" style={{ fontSize: '0.8rem' }}>{dailyCompletion}%</span>
        </div>
        <div style={{ 
          width: '100%', 
          height: '6px', 
          background: 'var(--bg-primary)', 
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: `${dailyCompletion}%`, 
            height: '100%', 
            background: 'var(--accent-primary)',
            borderRadius: '3px',
            transition: 'width 0.5s ease',
            boxShadow: dailyCompletion > 0 ? '0 0 8px var(--accent-glow)' : 'none'
          }} />
        </div>
      </div>

      {/* Habit List */}
      <div>
        <div className="flex-between mb-1" style={{ padding: '0 0.25rem' }}>
          <span className="card-title">Today's Protocols</span>
          <span className="text-muted" style={{ fontSize: '0.7rem' }}>{completedCount} of {activeHabits.length}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activeHabits.map(habit => {
            const status = getHabitStatus(habit.id, today);
            const isCompleted = status === 'completed';
            const streak = getStreak(habit.id, logs, today);
            
            return (
              <div key={habit.id} className={`habit-item ${isCompleted ? 'completed' : ''}`}>
                <button
                  className={`habit-check ${isCompleted ? 'checked' : ''}`}
                  onClick={() => toggleHabitCompletion(habit.id, today)}
                >
                  {isCompleted && <Check size={14} />}
                </button>
                
                <div className="habit-info">
                  <div className={`habit-name ${isCompleted ? 'completed' : ''}`}>{habit.name}</div>
                  <div className="habit-meta">
                    <span className="badge">{habit.difficulty}</span>
                    <span className="badge">{habit.category}</span>
                    {streak > 0 && (
                      <span className="badge badge-accent">
                        <Flame size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
                        {streak}d
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="habit-actions">
                  <button 
                    className="icon-btn danger"
                    onClick={() => { if (confirm('Delete this protocol permanently?')) deleteHabit(habit.id); }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          
          {activeHabits.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p className="text-muted" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>NO PROTOCOLS ACTIVE</p>
              <p className="text-muted" style={{ fontSize: '0.75rem' }}>Initialize habits to begin system calibration.</p>
              <button className="btn btn-ghost mt-2" onClick={() => setShowModal(true)}>
                <Plus size={14} /> Add First Protocol
              </button>
            </div>
          )}
        </div>
      </div>
      
      <AppFooter />

      {/* Add Habit Modal */}
      {showModal && <AddHabitModal onClose={() => setShowModal(false)} onAdd={addHabit} />}
    </div>
  );
};

// ─── Add Habit Modal ───
interface AddHabitModalProps {
  onClose: () => void;
  onAdd: (data: Omit<import('../../types').Habit, 'id' | 'created_at' | 'archived'>) => void;
}

const AddHabitModal = ({ onClose, onAdd }: AddHabitModalProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), category, difficulty, frequency: 'daily' });
    onClose();
  };

  const categories = ['General', 'Health', 'Fitness', 'Learning', 'Mindfulness', 'Career', 'Creative'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Initialize New Protocol</div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Protocol Name</label>
            <input 
              autoFocus
              className="form-input" 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Morning Meditation"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select className="form-select" value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}>
                <option value="easy">EASY (1.0x)</option>
                <option value="medium">MEDIUM (1.2x)</option>
                <option value="hard">HARD (1.5x)</option>
                <option value="extreme">EXTREME (2.0x)</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Confirm</button>
          </div>
        </form>
      </div>
    </div>
  );
};
