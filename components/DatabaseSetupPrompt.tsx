import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { Copy, ExternalLink, RefreshCw, Database } from 'lucide-react-native';
import { checkDatabaseSetup } from '@/lib/supabase';

interface DatabaseSetupPromptProps {
  onSetupComplete: () => void;
}

const DATABASE_SETUP_SQL = `-- Database Setup for Grind App
-- Run this SQL in your Supabase SQL Editor

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Enable RLS for goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for goals
CREATE POLICY "Users can view their own goals"
  ON public.goals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON public.goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.goals
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.goals
  FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Create milestones table
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Enable RLS for milestones
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for milestones
CREATE POLICY "Users can view milestones of their goals"
  ON public.milestones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = milestones.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert milestones for their goals"
  ON public.milestones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = milestones.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update milestones of their goals"
  ON public.milestones
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = milestones.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete milestones of their goals"
  ON public.milestones
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = milestones.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

-- 10. Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Enable RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for tasks
CREATE POLICY "Users can view their own tasks"
  ON public.tasks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON public.tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks
  FOR DELETE
  USING (auth.uid() = user_id);

-- 13. Create journal_entries table
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  mood TEXT CHECK (mood IN ('great', 'good', 'neutral', 'bad', 'terrible')),
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Enable RLS for journal_entries
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- 15. Create RLS policies for journal_entries
CREATE POLICY "Users can view their own journal entries"
  ON public.journal_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries"
  ON public.journal_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries"
  ON public.journal_entries
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
  ON public.journal_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- 16. Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Create trigger to call the function on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 18. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 19. Add updated_at triggers to all tables
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 20. Create storage bucket for profile pictures (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- 21. Create storage policy for profile pictures
CREATE POLICY "Users can upload their own profile pictures"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view profile pictures"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profiles');

CREATE POLICY "Users can update their own profile pictures"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile pictures"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);`;

export default function DatabaseSetupPrompt({ onSetupComplete }: DatabaseSetupPromptProps) {
  const [isChecking, setIsChecking] = useState(false);

  const copyToClipboard = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web fallback
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(DATABASE_SETUP_SQL);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = DATABASE_SETUP_SQL;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
      } else {
        // For mobile, use dynamic import to avoid bundling issues
        try {
          const Clipboard = await import('expo-clipboard');
          await Clipboard.setStringAsync(DATABASE_SETUP_SQL);
        } catch (clipboardError) {
          console.warn('Expo Clipboard not available, using fallback');
          // Fallback - just show the SQL in an alert
          Alert.alert('Copy SQL', 'Please copy the SQL from the database-setup.sql file in your project.');
          return;
        }
      }
      Alert.alert('Copied!', 'Database setup SQL has been copied to your clipboard.');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard. Please copy the SQL from the database-setup.sql file in your project.');
    }
  };

  const openSupabase = async () => {
    try {
      const url = 'https://supabase.com/dashboard';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open Supabase dashboard.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open Supabase dashboard.');
    }
  };

  const checkSetup = async () => {
    setIsChecking(true);
    try {
      const result = await checkDatabaseSetup();
      if (result.isSetup) {
        Alert.alert('Success!', 'Database is now set up correctly.', [
          { text: 'Continue', onPress: onSetupComplete }
        ]);
      } else {
        Alert.alert('Not Ready', result.error || 'Database tables are still not found.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check database setup.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Database size={48} color="#6366f1" />
          <Text style={styles.title}>Database Setup Required</Text>
          <Text style={styles.subtitle}>
            To use Grind, you need to set up the database tables in your Supabase project.
          </Text>
        </View>

        <View style={styles.steps}>
          <Text style={styles.stepsTitle}>Follow these steps:</Text>
          
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Copy the SQL setup script below</Text>
          </View>
          
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Open your Supabase dashboard</Text>
          </View>
          
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Go to SQL Editor and paste the script</Text>
          </View>
          
          <View style={styles.step}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>Run the script and check setup</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
            <Copy size={20} color="#ffffff" />
            <Text style={styles.copyButtonText}>Copy SQL Script</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.openButton} onPress={openSupabase}>
            <ExternalLink size={20} color="#6366f1" />
            <Text style={styles.openButtonText}>Open Supabase</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.checkButton, isChecking && styles.checkButtonDisabled]} 
            onPress={checkSetup}
            disabled={isChecking}
          >
            <RefreshCw size={20} color="#059669" />
            <Text style={styles.checkButtonText}>
              {isChecking ? 'Checking...' : 'Check Setup'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  steps: {
    marginBottom: 32,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  stepText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  actions: {
    gap: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  openButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  checkButtonDisabled: {
    opacity: 0.6,
  },
  checkButtonText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
  },
});