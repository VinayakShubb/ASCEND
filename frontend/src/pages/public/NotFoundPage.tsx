import { Link } from 'react-router';
import { Logo } from '../../components/brand/Logo';

export function NotFoundPage() {
  return (
    <div className="relative grid min-h-dvh place-items-center px-6">
      <div className="stadium-ground" aria-hidden />
      <div className="relative flex max-w-md flex-col items-start gap-5">
        <Logo />
        <h1 className="font-display text-[64px] uppercase">Off track</h1>
        <p className="text-[16px] text-lane-dim">This page does not exist. It may have moved when ASCEND got its new look.</p>
        <Link to="/" className="inline-flex h-11 items-center rounded-full bg-lane px-5 text-[14px] font-semibold text-night-950 transition-colors hover:bg-white">
          Back to the start
        </Link>
      </div>
    </div>
  );
}
