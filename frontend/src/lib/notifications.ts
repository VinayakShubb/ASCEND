import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { remindersApi, type HabitReminder } from './api';

/* On-device habit reminders. Each active habit gets a local notification at
   the time the user usually checks it off (learned by the backend), but only
   while it's still open. Everything here no-ops on the web build — reminders
   exist only in the native app. */

const NATIVE = Capacitor.isNativePlatform();
// Schedule a few days ahead so reminders keep firing even if the app isn't
// opened; each foreground re-syncs against the latest "done today" state.
const DAYS_AHEAD = 3;
const ENABLED_KEY = 'ascend_reminders_enabled';

export const remindersEnabled = () => localStorage.getItem(ENABLED_KEY) === '1';
export const setRemindersEnabled = (on: boolean) => localStorage.setItem(ENABLED_KEY, on ? '1' : '0');
export const remindersSupported = () => NATIVE;

// A stable 31-bit id per habit+day so we can cancel and replace cleanly.
function idFor(habitId: string, dayOffset: number): number {
  let h = 0;
  for (let i = 0; i < habitId.length; i++) h = (h * 31 + habitId.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1_000_000) * 10 + dayOffset;
}

function parseTime(value: string): { h: number; m: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return { h: Number(match[1]), m: Number(match[2]) };
}

export async function reminderPermissionGranted(): Promise<boolean> {
  if (!NATIVE) return false;
  const status = await LocalNotifications.checkPermissions();
  return status.display === 'granted';
}

export async function requestReminderPermission(): Promise<boolean> {
  if (!NATIVE) return false;
  const status = await LocalNotifications.requestPermissions();
  return status.display === 'granted';
}

async function cancelAllPending(): Promise<void> {
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
  }
}

/* Re-reads the learned times and reschedules. Call on app foreground and after
   toggling reminders on. */
export async function syncReminders(): Promise<void> {
  if (!NATIVE || !remindersEnabled()) return;
  if (!(await reminderPermissionGranted())) return;

  let reminders: HabitReminder[];
  try {
    reminders = await remindersApi.list();
  } catch {
    return; // offline or backend asleep: keep whatever is already scheduled
  }

  await cancelAllPending();

  const now = new Date();
  const notifications = [];
  for (const reminder of reminders) {
    if (!reminder.suggested_time) continue;
    const time = parseTime(reminder.suggested_time);
    if (!time) continue;
    for (let day = 0; day < DAYS_AHEAD; day++) {
      const at = new Date(now);
      at.setDate(now.getDate() + day);
      at.setHours(time.h, time.m, 0, 0);
      // Skip today if it's already done or the usual time has passed.
      if (day === 0 && (reminder.done_today || at <= now)) continue;
      notifications.push({
        id: idFor(reminder.habit_id, day),
        title: reminder.name,
        body: "Your usual time — check it off once it's done.",
        schedule: { at },
      });
    }
  }
  if (notifications.length) {
    await LocalNotifications.schedule({ notifications });
  }
}

/* Drop today's reminder for a habit the instant it's checked off, so it never
   fires right after you've done it. */
export async function cancelTodayReminder(habitId: string): Promise<void> {
  if (!NATIVE || !remindersEnabled()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: idFor(habitId, 0) }] });
  } catch {
    // Nothing scheduled for it — fine.
  }
}

/* Turn reminders off and clear anything scheduled. */
export async function disableReminders(): Promise<void> {
  setRemindersEnabled(false);
  if (NATIVE) await cancelAllPending();
}
