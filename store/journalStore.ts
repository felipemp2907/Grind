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
  resetEntries: () => Promise<void>;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      
      addEntry: async (entry) => {
        // Save to Supabase first to get the generated UUID
        try {
          const { user } = useAuthStore.getState();
          if (!user?.id) {
            console.error('User not authenticated for journal entry creation');
            return null;
          }
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return null;
          }
          
          // First, try to create the entry with all fields including media_uri
          const insertData = {
            user_id: user.id,
            title: entry.title,
            content: entry.content,
            task_id: entry.taskId || null,
            media_uri: entry.mediaUri || null,
            reflection: entry.reflection || null,
            validation_status: entry.validationStatus || null,
            validation_feedback: entry.validationFeedback || null,
            validation_confidence: entry.validationConfidence || null,
            mood: entry.mood || null,
            tags: entry.tags || []
          };
          
          console.log('Creating journal entry:', {
            user_id: insertData.user_id,
            title: insertData.title,
            has_media_uri: !!insertData.media_uri,
            validation_status: insertData.validation_status
          });
          
          // Use a timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          try {
            const { data, error } = await supabase
              .from('journal_entries')
              .insert(insertData)
              .select()
              .abortSignal(controller.signal)
              .single();
              
            clearTimeout(timeoutId);
            
            if (error) {
              console.error('Error saving journal entry to Supabase:', serializeError(error));
              
              // If it's a schema-related error, try without problematic columns as fallback
              if (error.message?.includes('media_uri') || error.message?.includes('reflection') || error.message?.includes('column') || error.message?.includes('does not exist')) {
                console.log('Retrying without problematic columns due to schema issue...');
                const fallbackData: any = {
                  user_id: insertData.user_id,
                  title: insertData.title,
                  content: insertData.content,
                  task_id: insertData.task_id,
                  validation_status: insertData.validation_status,
                  validation_feedback: insertData.validation_feedback,
                  validation_confidence: insertData.validation_confidence,
                  mood: insertData.mood,
                  tags: insertData.tags
                };
                
                const { data: fallbackResult, error: fallbackError } = await supabase
                  .from('journal_entries')
                  .insert(fallbackData)
                  .select()
                  .single();
                  
                if (fallbackError) {
                  console.error('Fallback journal entry creation also failed:', serializeError(fallbackError));
                  return null;
                }
                
                if (fallbackResult) {
                  console.log('Journal entry created successfully without problematic columns');
                  const entryWithUUID = {
                    ...entry,
                    id: fallbackResult.id,
                    mediaUri: undefined, // Clear media URI since it wasn't saved
                    reflection: undefined, // Clear reflection since it wasn't saved
                    createdAt: fallbackResult.created_at,
                    updatedAt: fallbackResult.updated_at
                  };
                  
                  set((state) => ({ 
                    entries: [...state.entries, entryWithUUID] 
                  }));
                  
                  return entryWithUUID;
                }
              }
              
              return null;
            }
            
            // Add to local state with the UUID from database
            if (data) {
              console.log('Journal entry created successfully with ID:', data.id);
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
          } catch (insertError: any) {
            clearTimeout(timeoutId);
            if (insertError.name === 'AbortError') {
              console.log('Journal entry creation timed out');
              return null;
            }
            throw insertError;
          }
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
          if (updates.taskId !== undefined) supabaseUpdates.task_id = updates.taskId;
          if (updates.mediaUri !== undefined) supabaseUpdates.media_uri = updates.mediaUri;
          if (updates.reflection !== undefined) supabaseUpdates.reflection = updates.reflection;
          if (updates.validationStatus !== undefined) supabaseUpdates.validation_status = updates.validationStatus;
          if (updates.validationFeedback !== undefined) supabaseUpdates.validation_feedback = updates.validationFeedback;
          if (updates.validationConfidence !== undefined) supabaseUpdates.validation_confidence = updates.validationConfidence;
          if (updates.mood !== undefined) supabaseUpdates.mood = updates.mood;
          if (updates.tags !== undefined) supabaseUpdates.tags = updates.tags;
          
          console.log('Updating journal entry:', { id, updates: Object.keys(supabaseUpdates) });
          
          const { error } = await supabase
            .from('journal_entries')
            .update(supabaseUpdates)
            .eq('id', id)
            .eq('user_id', user.id);
            
          if (error) {
            console.error('Error updating journal entry in Supabase:', serializeError(error));
            
            // If it's a schema-related error with problematic columns, try without them
            if ((error.message?.includes('media_uri') || error.message?.includes('reflection') || error.message?.includes('column')) && 
                (supabaseUpdates.media_uri !== undefined || supabaseUpdates.reflection !== undefined)) {
              console.log('Retrying update without problematic columns due to schema issue...');
              const fallbackUpdates: any = { ...supabaseUpdates };
              delete fallbackUpdates.media_uri;
              delete fallbackUpdates.reflection;
              
              const { error: fallbackError } = await supabase
                .from('journal_entries')
                .update(fallbackUpdates)
                .eq('id', id)
                .eq('user_id', user.id);
                
              if (fallbackError) {
                console.error('Fallback journal entry update also failed:', serializeError(fallbackError));
              } else {
                console.log('Journal entry updated successfully without problematic columns');
              }
            }
          } else {
            console.log('Journal entry updated successfully');
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
        // Set a shorter timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Journal entries fetch timeout')), 5000);
        });
        
        try {
          const { user } = useAuthStore.getState();
          if (!user?.id) {
            console.log('User not authenticated, skipping journal entries fetch');
            return;
          }
          
          // Quick database check with timeout
          const dbCheckPromise = setupDatabase();
          const dbResult = await Promise.race([dbCheckPromise, timeoutPromise]) as any;
          if (!dbResult.success) {
            console.log('Database not ready, skipping journal entries fetch:', dbResult.error);
            return;
          }
          
          // Fetch entries with timeout
          const entriesPromise = supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50); // Limit results to improve performance
            
          const { data, error } = await Promise.race([entriesPromise, timeoutPromise]) as any;
            
          if (error) {
            console.log('Error fetching journal entries, continuing without data:', serializeError(error));
            return;
          }
          
          if (data) {
            const entries: JournalEntry[] = data.map((entry: any) => ({
              id: entry.id,
              title: entry.title,
              content: entry.content,
              date: entry.created_at.split('T')[0], // Extract date from timestamp
              taskId: entry.task_id,
              mediaUri: entry.media_uri || undefined, // Handle null/undefined media_uri
              reflection: entry.reflection,
              validationStatus: entry.validation_status as 'pending' | 'approved' | 'rejected',
              validationFeedback: entry.validation_feedback,
              validationConfidence: entry.validation_confidence as 'high' | 'medium' | 'low',
              mood: entry.mood as JournalEntry['mood'],
              tags: entry.tags || [],
              createdAt: entry.created_at,
              updatedAt: entry.updated_at
            }));
            
            set({ entries });
            console.log(`Successfully fetched ${entries.length} journal entries`);
          }
        } catch (error) {
          const errorMessage = serializeError(error);
          console.log('Journal entries fetch failed, continuing without data:', errorMessage);
          
          // Always continue without blocking the app
          return;
        }
      },
      
      resetEntries: async () => {
        try {
          const { user } = useAuthStore.getState();
          if (!user?.id) return;
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return;
          }
          
          // Delete all entries from Supabase
          const { error } = await supabase
            .from('journal_entries')
            .delete()
            .eq('user_id', user.id);
            
          if (error) {
            console.error('Error deleting all journal entries from Supabase:', serializeError(error));
          }
          
          // Clear local state
          set({ entries: [] });
        } catch (error) {
          console.error('Error resetting journal entries:', serializeError(error));
        }
      }
    }),
    {
      name: 'grind-journal-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);