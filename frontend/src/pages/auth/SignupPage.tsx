import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { EnvelopeSimple } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { InlineError } from '../../components/ui/Feedback';
import { useAuth } from '../../context/AuthContext';
import { getSession } from '../../lib/api';
import { AuthLayout } from './AuthLayout';
import { GoogleButton, OrDivider, PasswordToggle, SwitchLine } from './AuthParts';
import { PASSWORD_MIN, emailError, passwordHint, userIdError } from './authRules';

type FieldName = 'email' | 'userId' | 'password';

export function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({ email: false, userId: false, password: false });
  const [formError, setFormError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const userIdRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const errors: Record<FieldName, string | null> = {
    email: emailError(email),
    userId: userIdError(userId),
    password: password.length >= PASSWORD_MIN ? null : `Use at least ${PASSWORD_MIN} characters.`,
  };
  const shown = (name: FieldName) => (touched[name] ? errors[name] : null);
  const touch = (name: FieldName) => () => setTouched(t => ({ ...t, [name]: true }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setTouched({ email: true, userId: true, password: true });

    const firstInvalid = (['email', 'userId', 'password'] as const).find(name => errors[name]);
    if (firstInvalid) {
      const target = { email: emailRef, userId: userIdRef, password: passwordRef }[firstInvalid];
      target.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await register(email.trim(), password, userId.trim());
      if (error) {
        setFormError(error);
        setSubmitting(false);
        return;
      }
      // No session after a clean register means the account waits for
      // email confirmation before it can log in.
      if (getSession()) {
        navigate('/app/today', { replace: true });
      } else {
        setConfirmFor(email.trim());
        setSubmitting(false);
      }
    } catch {
      setFormError('Could not reach ASCEND. Check your connection and try again.');
      setSubmitting(false);
    }
  };

  if (confirmFor) {
    return (
      <AuthLayout title="Check your email" intro="One more step before your first day on the track.">
        <div className="flex flex-col items-start gap-5 border-y border-lane-line py-7">
          <EnvelopeSimple className="size-8 text-lane-dim" aria-hidden />
          <p className="text-[16px] text-lane" role="status">
            We sent a confirmation link to <span className="font-semibold break-all">{confirmFor}</span>. Open it to confirm
            your account, then log in.
          </p>
          <p className="text-[14px] text-lane-mute">Nothing there after a few minutes? Check your spam folder.</p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/login"
            className="inline-flex h-13 min-h-11 items-center justify-center rounded-full bg-lane px-7 text-[15px] font-semibold text-night-950 transition-colors duration-200 hover:bg-white"
          >
            Go to log in
          </Link>
          <Button variant="ghost" onClick={() => setConfirmFor(null)}>
            Use a different email
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create account"
      intro="Free to use. List your habits with a difficulty, check them off each day, and ASCEND scores your week."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field
          ref={emailRef}
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={e => setEmail(e.target.value)}
          onBlur={() => email && touch('email')()}
          error={shown('email')}
        />
        <Field
          ref={userIdRef}
          label="User ID"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={24}
          value={userId}
          onChange={e => setUserId(e.target.value)}
          onBlur={() => userId && touch('userId')()}
          hint="You can log in with it. 3 to 24 characters: letters, numbers, dots, dashes, underscores."
          error={shown('userId')}
        />
        <Field
          ref={passwordRef}
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          maxLength={128}
          value={password}
          onChange={e => setPassword(e.target.value)}
          hint={passwordHint(password)}
          error={shown('password')}
          trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword(s => !s)} />}
        />

        {formError && <InlineError message={formError} />}

        <Button type="submit" size="lg" loading={submitting} className="mt-1 w-full">
          {submitting ? 'Creating account' : 'Create account'}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton onError={setGoogleError} disabled={submitting} />
      {googleError && (
        <div className="mt-3">
          <InlineError message={googleError} />
        </div>
      )}

      <SwitchLine prompt="Already have an account?" to="/login" state={location.state}>
        Log in
      </SwitchLine>
    </AuthLayout>
  );
}
