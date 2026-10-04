import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import './styles/app.css';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

/* In the native app the page is an app surface, not a document: pin the scale
   so the WebView can't zoom the whole page out and back when something is
   briefly wider than the screen. The website keeps pinch-zoom. */
if (Capacitor.isNativePlatform()) {
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover',
    );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </AuthProvider>
  </StrictMode>,
);
