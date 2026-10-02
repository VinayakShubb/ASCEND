import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import { Logo } from '../../components/brand/Logo';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/cn';

/* Shared chrome for the public pages (landing and How it works): a link
   styled like the app's Button, the top nav and the footer. */

type Tone = 'primary' | 'track' | 'secondary';
type Size = 'sm' | 'md' | 'lg';

const tones: Record<Tone, string> = {
  primary: 'bg-lane text-night-950 hover:bg-white',
  track: 'bg-track text-track-ink hover:bg-track-bright',
  secondary: 'border border-lane-line-strong text-lane hover:border-lane-dim hover:bg-night-800',
};

const sizes: Record<Size, string> = {
  sm: 'h-11 px-4 text-[14px] gap-1.5 sm:h-10',
  md: 'h-12 px-6 text-[15px] gap-2',
  lg: 'h-14 px-8 text-[16px] gap-2.5',
};

export function LinkButton({
  to,
  tone = 'primary',
  size = 'md',
  className,
  children,
  arrow = false,
}: {
  to: string;
  tone?: Tone;
  size?: Size;
  className?: string;
  children: ReactNode;
  arrow?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-semibold no-underline',
        'transition-[background-color,border-color,color,transform] duration-200 ease-out-quart active:scale-[0.97]',
        tones[tone],
        sizes[size],
        className,
      )}
    >
      {children}
      {arrow && <ArrowRight weight="bold" className="size-4" aria-hidden />}
    </Link>
  );
}

/* The one sign-up action on the public pages. A signed-in visitor gets a way
   back into the app instead. */
export function StartCta({ tone = 'primary', size = 'md', className }: { tone?: Tone; size?: Size; className?: string }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? (
    <LinkButton to="/app/today" tone={tone} size={size} className={className} arrow>
      Open app
    </LinkButton>
  ) : (
    <LinkButton to="/signup" tone={tone} size={size} className={className} arrow>
      Start free
    </LinkButton>
  );
}

const navLink =
  'inline-flex h-11 items-center rounded-full px-3 text-[14px] font-medium text-lane-dim no-underline transition-colors duration-200 hover:text-lane';

export function PublicNav({ current }: { current?: 'how' }) {
  const { isAuthenticated } = useAuth();
  return (
    <header className="relative z-20">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-8">
        <Link to="/" className="inline-flex h-11 items-center no-underline" aria-label="ASCEND home">
          <Logo />
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-2">
          <Link
            to="/how-it-works"
            aria-current={current === 'how' ? 'page' : undefined}
            className={cn(navLink, 'hidden sm:inline-flex', current === 'how' && 'text-lane')}
          >
            How it works
          </Link>
          {isAuthenticated ? (
            <LinkButton to="/app/today" size="sm">
              Open app
            </LinkButton>
          ) : (
            <>
              <Link to="/login" className={navLink}>
                Log in
              </Link>
              <LinkButton to="/signup" size="sm">
                Start free
              </LinkButton>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  const { isAuthenticated } = useAuth();
  const links = isAuthenticated
    ? [
        { to: '/how-it-works', label: 'How it works' },
        { to: '/app/today', label: 'Open app' },
      ]
    : [
        { to: '/how-it-works', label: 'How it works' },
        { to: '/login', label: 'Log in' },
        { to: '/signup', label: 'Sign up' },
      ];
  return (
    <footer className="relative border-t border-lane-line">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-4 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3">
          <Link to="/" className="inline-flex w-fit items-center no-underline" aria-label="ASCEND home">
            <Logo />
          </Link>
          <p className="text-[14px] text-lane-mute">Built by Vinayak</p>
        </div>
        <ul className="flex flex-wrap gap-x-2 gap-y-1" aria-label="Footer">
          {links.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className={cn(navLink, 'px-2 sm:px-3')}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
