import { Suspense, lazy, useEffect, type ComponentType, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { useAuth } from './context/AuthContext';
import { AppShell } from './layouts/AppShell';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { SplashScreen } from './components/brand/SplashScreen';

/* Each page is its own chunk: the landing page's scroll animation (GSAP,
   Lenis) and the charts (recharts) only download where they are used. */
const named = <K extends string>(loader: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => loader().then(m => ({ default: m[name] })));
const LandingPage = named(() => import('./pages/landing/LandingPage'), 'LandingPage');
const HowItWorksPage = named(() => import('./pages/public/HowItWorksPage'), 'HowItWorksPage');
const LoginPage = named(() => import('./pages/auth/LoginPage'), 'LoginPage');
const SignupPage = named(() => import('./pages/auth/SignupPage'), 'SignupPage');
const TodayPage = named(() => import('./pages/app/TodayPage'), 'TodayPage');
const HabitsPage = named(() => import('./pages/app/HabitsPage'), 'HabitsPage');
const CalendarPage = named(() => import('./pages/app/CalendarPage'), 'CalendarPage');
const InsightsPage = named(() => import('./pages/app/InsightsPage'), 'InsightsPage');
const CipherPage = named(() => import('./pages/app/CipherPage'), 'CipherPage');
const SettingsPage = named(() => import('./pages/app/SettingsPage'), 'SettingsPage');

/* Old hash URLs (#dashboard, #cipher, ...) from before real routes. */
const LEGACY_HASH_ROUTES: Record<string, string> = {
  dashboard: '/app/today',
  habits: '/app/habits',
  calendar: '/app/calendar',
  analytics: '/app/insights',
  cipher: '/app/cipher',
  settings: '/app/settings',
  'logic-engine': '/how-it-works',
  about: '/',
};

function LegacyHashRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const key = location.hash.replace('#', '');
    const target = LEGACY_HASH_ROUTES[key];
    if (target && target !== location.pathname) navigate(target, { replace: true });
  }, [location.hash, location.pathname, navigate]);
  return null;
}

/* Sends a user who just came back from Google sign-in into the app. */
function AfterOAuthRedirect() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isAuthenticated && sessionStorage.getItem('ascend_after_oauth')) {
      sessionStorage.removeItem('ascend_after_oauth');
      navigate('/app/today', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  return null;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <SplashScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (isAuthenticated) return <Navigate to="/app/today" replace />;
  return <>{children}</>;
}

/* The landing page is the marketing site for signed-out visitors. Once you're
   logged in, the home of the product is the app, so "/" goes straight there. */
function Landing() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (isAuthenticated) return <Navigate to="/app/today" replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <LegacyHashRedirect />
        <AfterOAuthRedirect />
        <Suspense fallback={<SplashScreen />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/signup" element={<GuestOnly><SignupPage /></GuestOnly>} />
          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="today" replace />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="habits" element={<HabitsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="cipher" element={<CipherPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </MotionConfig>
  );
}
