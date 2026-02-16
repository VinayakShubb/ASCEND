import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Habit, HabitLog } from '../types';
import { storage } from '../utils/storage';
import { useAuth } from './AuthContext';

const generateId = () => crypto.randomUUID();

interface DataContextType {
  habits: Habit[];
  logs: HabitLog[];
  addHabit: (habitData: Omit<Habit, 'id' | 'created_at' | 'archived'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitCompletion: (habitId: string, date: string) => void;
  getHabitStatus: (habitId: string, date: string) => 'completed' | 'missed' | 'skipped' | 'pending';
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const username = user?.username || '__guest__';
  
  // Per-user storage keys
  const habitsKey = `${username}_habits`;
  const logsKey = `${username}_logs`;

  const [habits, setHabits] = useState<Habit[]>(() => storage.get<Habit[]>(habitsKey, []));
  const [logs, setLogs] = useState<HabitLog[]>(() => storage.get<HabitLog[]>(logsKey, []));

  // When user changes (login/logout), reload their data
  useEffect(() => {
    setHabits(storage.get<Habit[]>(habitsKey, []));
    setLogs(storage.get<HabitLog[]>(logsKey, []));
  }, [username, habitsKey, logsKey]);

  // Persist habits whenever they change
  useEffect(() => {
    storage.set(habitsKey, habits);
  }, [habits, habitsKey]);

  // Persist logs whenever they change
  useEffect(() => {
    storage.set(logsKey, logs);
  }, [logs, logsKey]);

  const addHabit = (habitData: Omit<Habit, 'id' | 'created_at' | 'archived'>) => {
    const newHabit: Habit = {
      ...habitData,
      id: generateId(),
      created_at: new Date().toISOString(),
      archived: false,
    };
    setHabits(prev => [...prev, newHabit]);
  };

  const updateHabit = (id: string, updates: Partial<Habit>) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };
   
  const deleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const toggleHabitCompletion = (habitId: string, date: string) => {
    setLogs(prev => {
      const existingLogIndex = prev.findIndex(l => l.habit_id === habitId && l.date === date);
      
      if (existingLogIndex >= 0) {
        const newLogs = [...prev];
        newLogs.splice(existingLogIndex, 1);
        return newLogs;
      } else {
        const newLog: HabitLog = {
          id: generateId(),
          habit_id: habitId,
          date,
          status: 'completed',
          timestamp: new Date().toISOString()
        };
        return [...prev, newLog];
      }
    });
  };

  const getHabitStatus = (habitId: string, date: string): 'completed' | 'missed' | 'skipped' | 'pending' => {
    const log = logs.find(l => l.habit_id === habitId && l.date === date);
    return log ? log.status : 'pending';
  };

  return (
    <DataContext.Provider value={{ habits, logs, addHabit, updateHabit, deleteHabit, toggleHabitCompletion, getHabitStatus }}>
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
