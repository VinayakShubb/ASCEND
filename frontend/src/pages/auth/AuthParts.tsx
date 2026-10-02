import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Eye, EyeSlash, GoogleLogo } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

/* Show/hide control that sits in the password Field's trailing slot. */
export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
      aria-pressed={shown}
      className="grid size-11 place-items-center rounded-lg text-lane-mute transition-colors duration-200 hover:text-lane"
    >
      {shown ? <EyeSlash className="size-5" /> : <Eye className="size-5" />}
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-4 text-[13px] text-lane-mute">
      <span className="h-px flex-1 bg-lane-line" aria-hidden />
      or
      <span className="h-px flex-1 bg-lane-line" aria-hidden />
    </div>
  );
}

/* Starts Google sign-in. On success the browser leaves for Google, so the
   button stays in its loading state; on failure the message goes back up. */
export function GoogleButton({ onError, disabled }: { onError: (message: string | null) => void; disabled?: boolean }) {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const start = async () => {
    onError(null);
    setLoading(true);
    const { error } = await loginWithGoogle();
    if (error) {
      onError(error);
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      className="w-full"
      loading={loading}
      disabled={disabled}
      onClick={start}
      icon={<GoogleLogo weight="bold" className="size-[18px]" aria-hidden />}
    >
      Continue with Google
    </Button>
  );
}

/* "New here? Create an account" style line under the form. */
export function SwitchLine({ prompt, to, state, children }: { prompt: string; to: string; state?: unknown; children: ReactNode }) {
  return (
    <p className="mt-6 flex flex-wrap items-center gap-x-1.5 text-[14px] text-lane-dim">
      {prompt}
      <Link
        to={to}
        state={state}
        className="inline-flex min-h-11 items-center font-semibold text-lane underline decoration-lane-line-strong underline-offset-4 transition-colors hover:decoration-lane"
      >
        {children}
      </Link>
    </p>
  );
}
