import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function makeSupabase(url: string, anonKey: string) {
  return createClient(url, anonKey);
}

const key = (userId: string) => `welcome_seen_v2:${userId}`;

export async function hasSeenWelcome(userId: string) {
  return (await AsyncStorage.getItem(key(userId))) === '1';
}

export async function markWelcomeSeen(userId: string) {
  await AsyncStorage.setItem(key(userId), '1');
  try {
    const supa: any = (global as any).__supabase__;
    if (supa) await supa.from('profiles').update({ has_seen_welcome: true }).eq('id', userId);
  } catch {}
}

export async function isNewUserNoGoals(supa: ReturnType<typeof makeSupabase>, userId: string) {
  const { count, error } = await supa.from('goals').select('id', { count: 'exact' }).eq('user_id', userId).limit(1);
  if (error) return false;
  return (count ?? 0) === 0;
}