import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalEntry } from '@/types';
import { supabase, setupDatabase, serializeError } from '@/lib/supabase';
import { useAuthStore } from './authStore';

interface JournalState {
  entries: JournalEntry[];
  addEntry: (entry: Omit<JournalEntry, 'id'>) => Promise<JournalEntry | null>;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  getEntryById: (id: string) => JournalEntry | undefined;
  getEntriesByDate: (date: string) => JournalEntry[];
  getTaskValidationEntry: (taskId: string) => JournalEntry | undefined;
  deleteEntry: (id: string) => Promise<void>;
  fetchEntries: () => Promise<void>;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      
      addEntry: async (entry) => {
        // Save to Supabase first to get the generated UUID
        try {
          const { user } = useAuthStore.getState();
          if (!user?.id) return null;
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return null;
          }
          
          const { data, error } = await supabase
            .from('journal_entries')
            .insert({
              user_id: user.id,
              title: entry.title,
              content: entry.content,
              mood: entry.mood,
              tags: entry.tags
            })
            .select()
            .single();
            
          if (error) {
            console.error('Error saving journal entry to Supabase:', serializeError(error));
            return null;
          }
          
          // Add to local state with the UUID from database
          if (data) {
            const entryWithUUID = {
              ...entry,
              id: data.id,
              createdAt: data.created_at,
              updatedAt: data.updated_at
            };
            
            set((state) => ({ 
              entries: [...state.entries, entryWithUUID] 
            }));
            
            return entryWithUUID;
          }
          
          return null;
        } catch (error) {
          console.error('Error saving journal entry:', serializeError(error));
          return null;
        }
      },
      
      updateEntry: async (id, updates) => {
        // Update local state first
        set((state) => ({
          entries: state.entries.map(entry => 
            entry.id === id ? { ...entry, ...updates } : entry
          )
        }));
        
        // Update in Supabase
        try {
          const { user } = useAuthStore.getState();
          if (!user?.id) return;
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return;
          }
          
          const supabaseUpdates: any = {};
          if (updates.title !== undefined) supabaseUpdates.title = updates.title;
          if (updates.content !== undefined) supabaseUpdates.content = updates.content;
          if (updates.mood !== undefined) supabaseUpdates.mood = updates.mood;
          if (updates.tags !== undefined) supabaseUpdates.tags = updates.tags;
          
          const { error } = await supabase
            .from('journal_entries')
            .update(supabaseUpdates)
            .eq('id', id)
            .eq('user_id', user.id);
            
          if (error) {
            console.error('Error updating journal entry in Supabase:', serializeError(error));
          }
        } catch (error) {
          console.error('Error updating journal entry:', serializeError(error));
        }
      },
      
      getEntryById: (id) => {
        return get().entries.find(entry => entry.id === id);
      },
      
      getEntriesByDate: (date) => {
        return get().entries.filter(entry => entry.date === date);
      },
      
      getTaskValidationEntry: (taskId) => {
        return get().entries.find(entry => entry.taskId === taskId);
      },
      
      deleteEntry: async (id) => {
        // Remove from local state
        set((state) => ({
          entries: state.entries.filter(entry => entry.id !== id)
        }));
        
        // Delete from Supabase
        try {
          const { user } = useAuthStore.getState();
          if (!user?.id) return;
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return;
          }
          
          const { error } = await supabase
            .from('journal_entries')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);
            
          if (error) {
            console.error('Error deleting journal entry from Supabase:', serializeError(error));
          }
        } catch (error) {
          console.error('Error deleting journal entry:', serializeError(error));
        }
      },
      
      fetchEntries: async () => {
        try {
          const { user } = useAuthStore.getState();
          if (!user?.id) return;
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return;
          }
          
          const { data, error } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (error) {
            console.error('Error fetching journal entries:', serializeError(error));
            return;
          }
          
          if (data) {
            const entries: JournalEntry[] = data.map(entry => ({
              id: entry.id,
              title: entry.title,
              content: entry.content,
              mood: entry.mood as JournalEntry['mood'],
              tags: entry.tags || [],
              date: entry.created_at.split('T')[0], // Extract date from timestamp
              taskId: entry.task_id,
              createdAt: entry.created_at,
              updatedAt: entry.updated_at
            }));
            
            set({ entries });
          }
        } catch (error) {
          console.error('Error fetching journal entries:', serializeError(error));
        }
      }
    }),
    {
      name: 'grind-journal-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);