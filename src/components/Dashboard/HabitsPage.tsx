import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { format } from 'date-fns';
import { Plus, Trash2, Check, Archive } from 'lucide-react';
import type { Difficulty } from '../../types';
import { getStreak } from '../../utils/calculations';
import { AppFooter } from '../UI/AppFooter';

export const HabitsPage = () => {
  const { habits, logs, addHabit, updateHabit, deleteHabit, toggleHabitCompletion, getHabitStatus } = useData();
  const [showModal, setShowModal] = useState(false);

  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('active');
  const today = format(new Date(), 'yyyy-MM-dd');

  const filteredHabits = habits.filter(h => {
    if (filter === 'active') return !h.archived;
    if (filter === 'archived') return h.archived;
    return true;
  });

  // Group by category
  const grouped = filteredHabits.reduce((acc, h) => {
    if (!acc[h.category]) acc[h.category] = [];
    acc[h.category].push(h);
    return acc;
  }, {} as Record<string, typeof filteredHabits>);

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="flex-between">
          <div>
            <div className="page-title">Protocol Registry</div>
            <div className="page-subtitle">Manage and configure all habit protocols</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Protocol
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem' }}>
        {(['active', 'archived', 'all'] as const).map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
          >
            {f.toUpperCase()} ({habits.filter(h => f === 'all' ? true : f === 'active' ? !h.archived : h.archived).length})
          </button>
        ))}
      </div>

      {/* Habit Groups */}
      {Object.entries(grouped).map(([category, categoryHabits]) => (
        <div key={category} style={{ marginBottom: '2rem' }}>
          <div style={{ 
            fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em',
            color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 500
          }}>
            {category} — {categoryHabits.length} protocol{categoryHabits.length !== 1 ? 's' : ''}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categoryHabits.map(habit => {
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
                      <span className="badge">{habit.frequency}</span>
                      {streak > 0 && <span className="badge badge-accent">🔥 {streak}d streak</span>}
                      <span className="text-muted" style={{ fontSize: '0.6rem' }}>
                        Created {format(new Date(habit.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>

                  <div className="habit-actions">
                    <button
                      className="icon-btn"
                      onClick={() => updateHabit(habit.id, { archived: !habit.archived })}
                      title={habit.archived ? 'Restore' : 'Archive'}
                    >
                      <Archive size={14} />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => { if (confirm('Permanently delete this protocol? This action cannot be undone.')) deleteHabit(habit.id); }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filteredHabits.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="text-muted" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            {filter === 'archived' ? 'No archived protocols.' : 'No protocols registered.'}
          </p>
          {filter !== 'archived' && (
            <button className="btn btn-ghost mt-2" onClick={() => setShowModal(true)}>
              <Plus size={14} /> Initialize Protocol
            </button>
          )}
        </div>
      )}

      <AppFooter />

      {/* Add Modal */}
      {showModal && <AddHabitModal onClose={() => setShowModal(false)} onAdd={addHabit} />}
    </div>
  );
};

// ─── Add Habit Modal (reused pattern) ───
const AddHabitModal = ({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (data: Omit<import('../../types').Habit, 'id' | 'created_at' | 'archived'>) => void;
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const categories = ['General', 'Health', 'Fitness', 'Learning', 'Mindfulness', 'Career', 'Creative'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), category, difficulty, frequency: 'daily' });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Initialize New Protocol</div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Protocol Name</label>
            <input autoFocus className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cold Shower" />
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
