import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Habit, HabitLog } from '../types';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface DataContextType {
  habits: Habit[];
  logs: HabitLog[];
  loading: boolean;
  addHabit: (habitData: Omit<Habit, 'id' | 'created_at' | 'archived'>) => Promise<void>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabitCompletion: (habitId: string, date: string) => Promise<void>;
  getHabitStatus: (habitId: string, date: string) => 'completed' | 'missed' | 'skipped' | 'pending';
}

const DataContext = createContext<DataContextType | undefined>(undefined);

interface ToggleResponse {
  action: 'completed' | 'uncompleted';
  log: HabitLog | null;
}

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch initial data. Junk-name filtering now happens server-side
  // (services/user_data.py) instead of here.
  useEffect(() => {
    if (!isAuthenticated) {
      setHabits([]);
      setLogs([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [habitsData, logsData] = await Promise.all([
          api.get<Habit[]>('/habits'),
          api.get<HabitLog[]>('/logs'),
        ]);
        setHabits(habitsData);
        setLogs(logsData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  const addHabit = async (habitData: Omit<Habit, 'id' | 'created_at' | 'archived'>) => {
    // Server silently returns null for an invalid/blank name instead of an
    // error, same as the old client-side check did.
    const created = await api.post<Habit | null>('/habits', habitData);
    if (created) {
      setHabits(prev => [...prev, created]);
    }
  };

  const updateHabit = async (id: string, updates: Partial<Habit>) => {
    await api.patch<Habit>(`/habits/${id}`, updates);
    setHabits(prev => prev.map(h => (h.id === id ? { ...h, ...updates } : h)));
  };

  const deleteHabit = async (id: string) => {
    await api.delete(`/habits/${id}`);
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const toggleHabitCompletion = async (habitId: string, date: string) => {
    const existingLog = logs.find(l => l.habit_id === habitId && l.date === date);

    // OPTIMISTIC UPDATE: Update UI immediately
    if (existingLog) {
      setLogs(prev => prev.filter(l => l.id !== existingLog.id));
    } else {
      const tempLog: HabitLog = {
        id: `temp-${Date.now()}`,
        habit_id: habitId,
        date,
        status: 'completed',
        timestamp: new Date().toISOString(),
      };
      setLogs(prev => [...prev, tempLog]);
    }

    try {
      const result = await api.post<ToggleResponse>(`/habits/${habitId}/toggle`, { date });

      if (result.action === 'completed' && result.log) {
        // Replace temp log with the real one from the server.
        const realLog = result.log;
        setLogs(prev =>
          prev.map(l => (l.id.startsWith('temp-') && l.habit_id === habitId && l.date === date ? realLog : l))
        );
      }
      // For 'uncompleted' the optimistic removal above already matches
      // server state, nothing further to reconcile.
    } catch (error) {
      console.error('Error toggling habit:', error);
      // REVERT optimistic update on error
      if (existingLog) {
        setLogs(prev => [...prev, existingLog]);
      } else {
        setLogs(prev => prev.filter(l => !(l.habit_id === habitId && l.date === date && l.id.startsWith('temp-'))));
      }
    }
  };

  const getHabitStatus = (habitId: string, date: string): 'completed' | 'missed' | 'skipped' | 'pending' => {
    const log = logs.find(l => l.habit_id === habitId && l.date === date);
    return log ? log.status : 'pending';
  };

  return (
    <DataContext.Provider
      value={{ habits, logs, loading, addHabit, updateHabit, deleteHabit, toggleHabitCompletion, getHabitStatus }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
