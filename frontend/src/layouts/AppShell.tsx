import { GearSix, SignOut } from '@phosphor-icons/react';
import { Suspense, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { syncReminders } from '../lib/notifications';
import { CipherMark } from '../components/brand/CipherMark';
import { Skeleton } from '../components/ui/Feedback';
import { useAuth } from '../context/AuthContext';
import { duration, ease } from '../design/motion';
import { cn } from '../lib/cn';
import { NAV, type NavItem } from '../design/nav';

/* CIPHER sits in the middle of the phone tab bar — it's the hero surface and
   the most thumb-reachable slot. The rail keeps the plain reading order. */
const MOBILE_NAV: NavItem[] = (() => {
  const rest = NAV.filter(n => n.to !== '/app/cipher');
  const cipher = NAV.find(n => n.to === '/app/cipher')!;
  return [rest[0], rest[1], cipher, rest[2], rest[3]];
})();

/* Desktop: a slim glass rail that expands to labels on hover or keyboard
   focus, floating over the page so content never shifts. Phones: a glass top
   bar (centered wordmark) and a glass bottom tab bar with a raised CIPHER. */
export function AppShell() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  // Reschedule habit reminders whenever the app opens or returns to the
  // foreground, so they reflect what's already done today. No-ops on web.
  useEffect(() => {
    void syncReminders();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncReminders();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return (
    <div className="relative min-h-dvh">
      <div className="stadium-ground" aria-hidden />

      {/* Desktop rail — 72px collapsed, 248px on hover/focus */}
      <aside
        className={cn(
          'group fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col overflow-hidden lg:flex',
          'border-r border-lane-line bg-night-900/60 px-3 pb-5 pt-6 backdrop-blur-xl',
          'shadow-[8px_0_32px_-24px_rgba(0,0,0,0.9)] transition-[width] duration-300 ease-out',
          'hover:w-[248px] focus-within:w-[248px]',
        )}
      >
        <NavLink to="/app/today" className="mb-9 flex h-10 items-center gap-2.5 px-1.5" aria-label="ASCEND home">
          <img src="/logo-mark.png" alt="" width={38} height={38} className="size-[38px] shrink-0 object-contain" />
          <span className="whitespace-nowrap font-display text-[23px] uppercase leading-none tracking-[0.04em] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            Ascend
          </span>
        </NavLink>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {[...NAV, { to: '/app/settings', label: 'Settings', icon: GearSix }].map(item => (
            <RailLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="mt-auto border-t border-lane-line px-2 pt-4">
          <p className="truncate text-[14px] font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            {user?.username}
          </p>
          <button
            onClick={handleLogout}
            className="mt-2 inline-flex min-h-9 items-center gap-3 text-[13px] text-lane-mute transition-colors hover:text-lane"
          >
            <SignOut className="size-5 shrink-0" />
            <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
              Log out
            </span>
          </button>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-center border-b border-lane-line bg-night-900/60 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
        <NavLink to="/app/today" aria-label="ASCEND home" className="flex items-center gap-2.5">
          <img src="/logo-mark.png" alt="" width={34} height={34} className="size-[34px] shrink-0 object-contain" />
          <span className="font-display text-[21px] uppercase leading-none tracking-[0.05em]">Ascend</span>
        </NavLink>
        <NavLink
          to="/app/settings"
          aria-label="Settings"
          className={({ isActive }) =>
            cn('absolute right-2 grid size-11 place-items-center rounded-full transition-colors', isActive ? 'text-lane' : 'text-lane-dim')
          }
        >
          <GearSix className="size-6" />
        </NavLink>
      </header>

      <div className="relative z-10 lg:pl-[72px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: duration.page, ease: ease.out } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="mx-auto w-full max-w-[1180px] px-4 pb-32 pt-8 sm:px-8 lg:pb-16 lg:pt-12"
          >
            {/* Pages load as separate chunks; keep the shell in place meanwhile. */}
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Phone tab bar — CIPHER raised in the centre */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-lane-line bg-night-900/65 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        {MOBILE_NAV.map(item => (
          <TabLink key={item.to} item={item} />
        ))}
      </nav>
    </div>
  );
}

function RailLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const isCipher = item.to === '/app/cipher';
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex h-11 items-center gap-3 rounded-xl px-[14px] text-[15px] font-medium transition-colors duration-200',
          isActive ? 'bg-night-800 text-lane' : 'text-lane-dim hover:bg-night-850 hover:text-lane',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isCipher ? (
            <CipherMark filled={isActive} className={cn('size-5 shrink-0', isActive && 'text-track-bright')} />
          ) : (
            <Icon weight={isActive ? 'fill' : 'regular'} className={cn('size-5 shrink-0', isActive && 'text-track-bright')} />
          )}
          <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

function TabLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const isCipher = item.to === '/app/cipher';

  if (isCipher) {
    return (
      <NavLink to={item.to} className="relative flex min-h-[60px] flex-col items-center justify-end gap-1 pb-1.5">
        {({ isActive }) => (
          <>
            <span
              className={cn(
                'absolute -top-5 grid size-14 place-items-center rounded-full ring-4 ring-night-950 transition-colors',
                isActive ? 'bg-track text-track-ink shadow-[0_8px_24px_-6px_rgba(184,67,43,0.7)]' : 'bg-night-700 text-lane-dim',
              )}
            >
              <CipherMark filled className="size-7" />
            </span>
            <span className={cn('mt-9 text-[11px] font-medium', isActive ? 'text-lane' : 'text-lane-mute')}>{item.label}</span>
          </>
        )}
      </NavLink>
    );
  }

  return (
    <NavLink to={item.to} className="relative flex min-h-[60px] flex-col items-center justify-center gap-1">
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="tab-marker"
              className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-track-bright"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
          <Icon weight={isActive ? 'fill' : 'regular'} className={cn('size-6', isActive ? 'text-lane' : 'text-lane-mute')} />
          <span className={cn('text-[11px] font-medium', isActive ? 'text-lane' : 'text-lane-mute')}>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function PageLoading() {
  return (
    <div aria-busy="true" aria-label="Loading page" className="flex flex-col gap-4">
      <Skeleton className="h-14 w-56" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
