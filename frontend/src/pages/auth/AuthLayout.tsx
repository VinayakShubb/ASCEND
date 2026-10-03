import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Logo } from '../../components/brand/Logo';
import { AuthShowcase } from './AuthShowcase';

/* Sign-in pages: the form stands on the night ground, with a product preview
   alongside. Phones: logo, form, then the preview underfoot. Laptops: the
   form column on the left, the preview filling the right side. */
export function AuthLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)]">
      <div className="stadium-ground" aria-hidden />

      <div className="relative z-10 flex flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8 lg:min-h-dvh lg:px-14 lg:pb-10 lg:pt-9 xl:px-20">
        <header className="flex h-12 items-center">
          <Link to="/" aria-label="ASCEND home" className="-mx-1 inline-flex min-h-11 items-center rounded-lg px-1">
            <Logo />
          </Link>
        </header>

        <main className="mx-auto flex w-full max-w-[400px] flex-col pb-10 pt-7 sm:pt-12 lg:mx-0 lg:flex-1 lg:justify-center lg:pb-6 lg:pt-10">
          <h1 className="font-display text-[48px] uppercase sm:text-[60px]">{title}</h1>
          <p className="mt-3 max-w-[40ch] text-[15px] text-lane-dim">{intro}</p>
          <div className="mt-8">{children}</div>
        </main>
      </div>

      <AuthShowcase className="relative z-10 min-h-[260px] flex-1 lg:sticky lg:top-0 lg:h-dvh lg:self-start" />
    </div>
  );
}
