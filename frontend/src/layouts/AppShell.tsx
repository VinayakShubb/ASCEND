import { GearSix, SignOut } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Logo } from '../components/brand/Logo';
import { useAuth } from '../context/AuthContext';
import { duration, ease } from '../design/motion';
import { cn } from '../lib/cn';
import { NAV, type NavItem } from '../design/nav';

/* Desktop: a left rail. Phones: a top bar (logo, settings) and a bottom tab
   bar within thumb reach. Pages cross-fade on route change. */
export function AppShell() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="relative min-h-dvh">
      <div className="stadium-ground" aria-hidden />

      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-lane-line bg-night-950/70 px-4 pb-5 pt-6 backdrop-blur-sm lg:flex">
        <NavLink to="/app/today" className="mb-10 px-3" aria-label="ASCEND home">
          <Logo />
        </NavLink>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {[...NAV, { to: '/app/settings', label: 'Settings', icon: GearSix }].map(item => (
            <RailLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="mt-auto border-t border-lane-line px-3 pt-4">
          <p className="truncate text-[14px] font-semibold">{user?.username}</p>
          <button
            onClick={handleLogout}
            className="mt-2 inline-flex min-h-9 items-center gap-2 text-[13px] text-lane-mute transition-colors hover:text-lane"
          >
            <SignOut className="size-4" /> Log out
          </button>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-lane-line bg-night-950/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
        <NavLink to="/app/today" aria-label="ASCEND home">
          <Logo />
        </NavLink>
        <NavLink
          to="/app/settings"
          aria-label="Settings"
          className={({ isActive }) =>
            cn('-mr-2 grid size-11 place-items-center rounded-full transition-colors', isActive ? 'text-lane' : 'text-lane-dim')
          }
        >
          <GearSix className="size-6" />
        </NavLink>
      </header>

      <div className="relative z-10 lg:pl-[248px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: duration.page, ease: ease.out } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="mx-auto w-full max-w-[1180px] px-4 pb-32 pt-8 sm:px-8 lg:pb-16 lg:pt-12"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Phone tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-lane-line bg-night-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        {NAV.map(item => (
          <TabLink key={item.to} item={item} />
        ))}
      </nav>
    </div>
  );
}

function RailLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'group flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors duration-200',
          isActive ? 'bg-night-800 text-lane' : 'text-lane-dim hover:bg-night-850 hover:text-lane',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon weight={isActive ? 'fill' : 'regular'} className={cn('size-5', isActive ? 'text-track-bright' : '')} />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

function TabLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
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
