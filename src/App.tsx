import { useState } from 'react';
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

function App() {
  const { isAuthenticated } = useAuth();
  const [currentView, setView] = useState<View>('about');

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'about':
        return <AboutPage setView={setView} />;
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
        return <AboutPage setView={setView} />;
    }
  };

  return (
    <MainLayout currentView={currentView} setView={setView}>
      {renderContent()}
    </MainLayout>
  );
}

export default App;
