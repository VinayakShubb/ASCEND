import type { CapacitorConfig } from '@capacitor/cli';

/* The native wrapper bundles the built web app (dist) and points it at the
   production API via VITE_API_URL at build time. Habit reminders are scheduled
   on-device with @capacitor/local-notifications. */
const config: CapacitorConfig = {
  appId: 'com.vinayak.ascend',
  appName: 'ASCEND Beta',
  webDir: 'dist',
};

export default config;
