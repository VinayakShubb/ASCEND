import type { CapacitorConfig } from '@capacitor/cli';

/* The shell loads the live site rather than a copy baked into the APK, so
   anything shipped to Vercel reaches the phone on the next open and only
   native changes (icon, name, plugins) need a new build. The bundled dist is
   still built as the offline fallback. Habit reminders are scheduled
   on-device with @capacitor/local-notifications. */
const config: CapacitorConfig = {
  appId: 'com.vinayak.ascend',
  appName: 'ASCEND Beta',
  webDir: 'dist',
  server: {
    url: 'https://ascend-iota-one.vercel.app',
    // Shown instead of a blank WebView when the site can't be reached.
    errorPath: 'offline.html',
  },
};

export default config;
