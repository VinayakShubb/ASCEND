import { useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { InlineError } from '../../components/ui/Feedback';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout } from './AuthLayout';
import { GoogleButton, OrDivider, PasswordToggle, SwitchLine } from './AuthParts';
import { afterLoginPath } from './authRules';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const errors: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) errors.identifier = 'Enter your email or user ID.';
    if (!password) errors.password = 'Enter your password.';
    setFieldErrors(errors);
    if (errors.identifier) return identifierRef.current?.focus();
    if (errors.password) return passwordRef.current?.focus();

    setSubmitting(true);
    try {
      const { error } = await login(identifier.trim(), password);
      if (error) {
        setFormError(error);
        setSubmitting(false);
        return;
      }
      navigate(afterLoginPath(location.state), { replace: true });
    } catch {
      setFormError('Could not reach ASCEND. Check your connection and try again.');
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Log in"
      intro="ASCEND weighs each habit by difficulty and turns your last 7 days into one number: the Discipline Index."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field
          ref={identifierRef}
          label="Email or user ID"
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={identifier}
          onChange={e => {
            setIdentifier(e.target.value);
            if (fieldErrors.identifier) setFieldErrors(f => ({ ...f, identifier: undefined }));
          }}
          error={fieldErrors.identifier}
        />
        <Field
          ref={passwordRef}
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
            if (fieldErrors.password) setFieldErrors(f => ({ ...f, password: undefined }));
          }}
          error={fieldErrors.password}
          trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword(s => !s)} />}
        />

        {formError && <InlineError message={formError} />}

        <Button type="submit" size="lg" loading={submitting} className="mt-1 w-full">
          {submitting ? 'Logging in' : 'Log in'}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton onError={setGoogleError} disabled={submitting} />
      {googleError && (
        <div className="mt-3">
          <InlineError message={googleError} />
        </div>
      )}

      <SwitchLine prompt="New here?" to="/signup" state={location.state}>
        Create an account
      </SwitchLine>
    </AuthLayout>
  );
}
