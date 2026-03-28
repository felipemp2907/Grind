import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useUserStore } from '@/store/userStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Ids = { agendaId?: string; recapId?: string };
const key = 'grind.notification.ids';

async function loadIds(): Promise<Ids> {
  try {
    const s = await AsyncStorage.getItem(key);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

async function saveIds(ids: Ids) {
  await AsyncStorage.setItem(key, JSON.stringify(ids));
}

function parseHHMM(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return { hour: h ?? 0, minute: m ?? 0 };
}

export async function ensurePermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED) {
    return true;
  }
  const req = await Notifications.requestPermissionsAsync();
  return !!(req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED);
}

export async function configureChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('agenda', {
      name: 'Daily Agenda',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      vibrationPattern: [200, 100, 200],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync('recap', {
      name: 'Nightly Recap',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }
}

export async function scheduleDaily(idHint: 'agenda' | 'recap', hhmm: string, body: string) {
  const ok = await ensurePermissions();
  if (!ok) throw new Error('notifications-permission-denied');
  await configureChannels();

  const { hour, minute } = parseHHMM(hhmm);
  
  // Calculate seconds until the target time
  const now = new Date();
  const targetTime = new Date();
  targetTime.setHours(hour, minute, 0, 0);
  
  // If the time has already passed today, schedule for tomorrow
  if (targetTime <= now) {
    targetTime.setDate(targetTime.getDate() + 1);
  }
  
  const secondsUntilTarget = Math.floor((targetTime.getTime() - now.getTime()) / 1000);
  
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: idHint === 'agenda' ? 'Daily Agenda' : 'Nightly Recap',
      body,
      sound: Platform.select({ ios: 'default', android: 'default' }) as any,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, secondsUntilTarget), // Ensure at least 1 second
      repeats: false,
    },
  });
  
  const ids = await loadIds();
  if (idHint === 'agenda') ids.agendaId = id;
  else ids.recapId = id;
  await saveIds(ids);
  return id;
}

export async function cancelAllScheduled() {
  const ids = await loadIds();
  if (ids.agendaId) {
    await Notifications.cancelScheduledNotificationAsync(ids.agendaId).catch(() => {});
  }
  if (ids.recapId) {
    await Notifications.cancelScheduledNotificationAsync(ids.recapId).catch(() => {});
  }
  await saveIds({});
}

export function useNotificationsBinding() {
  const { coachSettings } = useUserStore();
  const enabled = coachSettings.notificationsEnabled;
  const agenda = coachSettings.agendaTime;
  const recap = coachSettings.recapTime;
  const mounted = useRef(false);

  useEffect(() => {
    (async () => {
      if (!mounted.current) {
        mounted.current = true;
      }
      // Whenever any pref changes, reschedule accordingly.
      if (!enabled) {
        await cancelAllScheduled();
        return;
      }
      // enabled
      await cancelAllScheduled();
      try {
        await scheduleDaily(
          'agenda',
          agenda,
          'Hustle prepared your plan. Open Grind to focus on the 3 highest-leverage tasks.'
        );
        await scheduleDaily(
          'recap',
          recap,
          'How did today go? Log proofs, close loops, and prep tomorrow in 2 minutes.'
        );
      } catch (error) {
        console.error('Failed to schedule notifications:', error);
      }
    })();
  }, [enabled, agenda, recap]);
}