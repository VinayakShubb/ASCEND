import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { Login } from './components/Auth/Login';
import { MainLayout } from './components/Layout/MainLayout';
import { AboutPage } from './components/Dashboard/AboutPage';
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { HabitsPage } from './components/Dashboard/HabitsPage';
import { CalendarPage } from './components/Dashboard/CalendarPage';
import { AnalyticsPage } from './components/Dashboard/AnalyticsPage';
import { SettingsPage } from './components/Dashboard/SettingsPage';
import type { View } from './types';

const VALID_VIEWS: View[] = ['about', 'dashboard', 'habits', 'calendar', 'analytics', 'settings'];

function getViewFromPath(): View {
  const hash = window.location.hash.replace('#', '');
  if (VALID_VIEWS.includes(hash as View)) {
    return hash as View;
  }
  return 'about';
}

function App() {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>(getViewFromPath);

  // Navigate to a view and push to browser history
  const navigateTo = useCallback((view: View) => {
    setCurrentView(view);
    const newHash = `#${view}`;
    // Only push if hash actually changed (avoid duplicates)
    if (window.location.hash !== newHash) {
      window.history.pushState({ view }, '', newHash);
    }
  }, []);

  // On mount: set initial history entry and listen for popstate (back/forward)
  useEffect(() => {
    // Replace initial state so the first entry has our view data
    const initialView = getViewFromPath();
    window.history.replaceState({ view: initialView }, '', `#${initialView}`);

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setCurrentView(event.state.view as View);
      } else {
        // Fallback: read from hash
        setCurrentView(getViewFromPath());
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (loading) {
    return <div style={{ background: '#0D0D0D', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>LOADING...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
  }


  const renderContent = () => {
    switch (currentView) {
      case 'about':
        return <AboutPage setView={navigateTo} />;
      case 'dashboard':
        return <DashboardPage />;
      case 'habits':
        return <HabitsPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <AboutPage setView={navigateTo} />;
    }
  };

  return (
    <MainLayout currentView={currentView} setView={navigateTo}>
      {renderContent()}
    </MainLayout>
  );
}

export default App;
