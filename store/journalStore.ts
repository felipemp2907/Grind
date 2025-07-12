import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalEntry } from '@/types';

interface JournalState {
  entries: JournalEntry[];
  addEntry: (entry: JournalEntry) => void;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => void;
  getEntryById: (id: string) => JournalEntry | undefined;
  getEntriesByDate: (date: string) => JournalEntry[];
  getTaskValidationEntry: (taskId: string) => JournalEntry | undefined;
  deleteEntry: (id: string) => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      
      addEntry: (entry) => set((state) => ({ 
        entries: [...state.entries, entry] 
      })),
      
      updateEntry: (id, updates) => set((state) => ({
        entries: state.entries.map(entry => 
          entry.id === id ? { ...entry, ...updates } : entry
        )
      })),
      
      getEntryById: (id) => {
        return get().entries.find(entry => entry.id === id);
      },
      
      getEntriesByDate: (date) => {
        return get().entries.filter(entry => entry.date === date);
      },
      
      getTaskValidationEntry: (taskId) => {
        return get().entries.find(entry => entry.taskId === taskId);
      },
      
      deleteEntry: (id) => set((state) => ({
        entries: state.entries.filter(entry => entry.id !== id)
      })),
    }),
    {
      name: 'grind-journal-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);