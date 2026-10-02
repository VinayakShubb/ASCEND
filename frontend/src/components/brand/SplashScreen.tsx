import { Logo } from './Logo';

/* Shown while the saved session is checked on load. */
export function SplashScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-night-950" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-5">
        <Logo />
        <div className="h-[3px] w-28 overflow-hidden rounded-full bg-night-800">
          <div className="splash-bar h-full w-1/3 rounded-full bg-track-bright" />
        </div>
      </div>
    </div>
  );
}
