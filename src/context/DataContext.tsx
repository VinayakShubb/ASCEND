import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Habit, HabitLog } from '../types';
import { supabase } from '../lib/supabase';
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

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch initial data
  useEffect(() => {
    if (!isAuthenticated) {
      setHabits([]);
      setLogs([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      const { data: habitsData } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: true });

      const { data: logsData } = await supabase
        .from('habit_logs')
        .select('*');

      if (habitsData) setHabits(habitsData as Habit[]);
      if (logsData) setLogs(logsData as HabitLog[]);
      
      setLoading(false);
    };

    fetchData();
  }, [isAuthenticated]);

  const addHabit = async (habitData: Omit<Habit, 'id' | 'created_at' | 'archived'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('habits')
      .insert([{
        ...habitData,
        user_id: user.id,
      }])
      .select()
      .single();

    if (data && !error) {
      setHabits(prev => [...prev, data as Habit]);
    }
  };

  const updateHabit = async (id: string, updates: Partial<Habit>) => {
    const { error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
    }
  };
   
  const deleteHabit = async (id: string) => {
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', id);

    if (!error) {
      setHabits(prev => prev.filter(h => h.id !== id));
    }
  };

  const toggleHabitCompletion = async (habitId: string, date: string) => {
    const existingLog = logs.find(l => l.habit_id === habitId && l.date === date);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    if (existingLog) {
      // DELETE
      const { error } = await supabase
        .from('habit_logs')
        .delete()
        .eq('id', existingLog.id);

      if (!error) {
        setLogs(prev => prev.filter(l => l.id !== existingLog.id));
      }
    } else {
      // INSERT
      const { data, error } = await supabase
        .from('habit_logs')
        .insert([{
          habit_id: habitId,
          date,
          status: 'completed',
          user_id: user.id
        }])
        .select()
        .single();

      if (data && !error) {
        setLogs(prev => [...prev, data as HabitLog]);
      }
    }
  };

  const getHabitStatus = (habitId: string, date: string): 'completed' | 'missed' | 'skipped' | 'pending' => {
    const log = logs.find(l => l.habit_id === habitId && l.date === date);
    return log ? log.status as any : 'pending';
  };

  return (
    <DataContext.Provider value={{ 
      habits, logs, loading, addHabit, updateHabit, deleteHabit, toggleHabitCompletion, getHabitStatus 
    }}>
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

