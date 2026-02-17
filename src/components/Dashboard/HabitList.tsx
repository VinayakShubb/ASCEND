import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { format } from 'date-fns';
import { Check, Plus, Trash2 } from 'lucide-react';
import type { Difficulty } from '../../types';
// Standard CSS implies we use style objects or classes defined in global.css
// I will use inline styles for speed/colocation as per React patterns unless complex.

const HabitItem = ({ habit, isCompleted, onToggle, onDelete }: { 
  habit: any, 
  isCompleted: boolean, 
  onToggle: (id: string) => void, 
  onDelete: (id: string) => void 
}) => {
  // Local state for INSTANT visual feedback
  const [optimisticCompleted, setOptimisticCompleted] = useState(isCompleted);

  // Sync with prop changes (e.g., when database confirms or reverts)
  useEffect(() => {
    setOptimisticCompleted(isCompleted);
  }, [isCompleted]);

  const handleClick = () => {
    // 1. Update visual state immediately (no delay)
    setOptimisticCompleted(!optimisticCompleted);
    // 2. Trigger actual data update in background
    onToggle(habit.id);
  };

  return (
    <div style={{
      background: 'var(--bg-tertiary)',
      padding: '1rem 1.5rem',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderLeft: `2px solid ${optimisticCompleted ? 'var(--accent-primary)' : 'transparent'}`,
      transition: 'all 0.2s ease',
      opacity: optimisticCompleted ? 0.6 : 1
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={handleClick}
          style={{
            width: '24px',
            height: '24px',
            border: `1px solid ${optimisticCompleted ? 'var(--accent-primary)' : 'var(--text-muted)'}`,
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: optimisticCompleted ? 'rgba(var(--accent-primary), 0.1)' : 'transparent',
            color: 'var(--accent-primary)',
            cursor: 'pointer'
          }}
        >
          {optimisticCompleted && <Check size={16} />}
        </button>
        
        <div>
          <h3 style={{ 
            fontSize: '1rem', 
            textDecoration: optimisticCompleted ? 'line-through' : 'none',
            color: optimisticCompleted ? 'var(--text-muted)' : 'var(--text-primary)'
          }}>
            {habit.name}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '4px' }}>
            <span style={{ 
              fontSize: '0.6rem', 
              textTransform: 'uppercase', 
              padding: '2px 6px', 
              background: 'var(--bg-primary)', 
              borderRadius: '2px',
              color: 'var(--text-secondary)'
            }}>
              {habit.difficulty}
            </span>
          </div>
        </div>
      </div>
      
      <button 
        onClick={() => {
          if(confirm('Delete protocol?')) onDelete(habit.id);
        }}
        className="delete-btn"
        style={{ color: 'var(--text-muted)', opacity: 0.5, cursor: 'pointer' }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export const HabitList = () => {
  const { habits, addHabit, deleteHabit, toggleHabitCompletion, getHabitStatus } = useData();
  const [showAddForm, setShowAddForm] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  // ... (keep form state and handlers) ...
  // Form State
  const [newHabitName, setNewHabitName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    
    addHabit({
      name: newHabitName,
      category: 'General',
      difficulty,
      frequency: 'daily'
    });
    
    setNewHabitName('');
    setShowAddForm(false);
  };

  const activeHabits = habits.filter(h => !h.archived);

  return (
    <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Protocol // Daily</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{format(new Date(), 'EEEE, MMMM do')}</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          style={{ 
            background: 'var(--bg-tertiary)', 
            border: '1px solid var(--border-color)',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            cursor: 'pointer'
          }}
        >
          <Plus size={16} /> Add Protocol
        </button>
      </header>

      {showAddForm && (
        <form onSubmit={handleAdd} style={{ 
          background: 'var(--bg-tertiary)', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          marginBottom: '2rem',
          border: '1px solid var(--accent-primary)'
        }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <input 
              autoFocus
              type="text" 
              placeholder="PROTOCOL NAME"
              value={newHabitName}
              onChange={e => setNewHabitName(e.target.value)}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '0.8rem',
                flex: 1,
                outline: 'none'
              }}
            />
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as Difficulty)}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="easy">EASY</option>
              <option value="medium">MEDIUM</option>
              <option value="hard">HARD</option>
              <option value="extreme">EXTREME</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" onClick={() => setShowAddForm(false)} style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', cursor: 'pointer' }}>Confirm</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {activeHabits.map(habit => (
          <HabitItem 
            key={habit.id} 
            habit={habit} 
            isCompleted={getHabitStatus(habit.id, today) === 'completed'} 
            onToggle={(id) => toggleHabitCompletion(id, today)}
            onDelete={deleteHabit}
          />
        ))}
        
        {activeHabits.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <p>NO PROTOCOLS ACTIVE</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Initiate new habits to begin ascension.</p>
          </div>
        )}
      </div>
    </div>
  );
};
