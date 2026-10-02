/* Client-side rules for the sign-in forms. They mirror the backend's
   RegisterRequest (backend/models/auth.py) so people hear about a problem
   before the request goes out. */

const USER_ID_CHARS = /^[A-Za-z0-9_.-]+$/;
const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const PASSWORD_MIN = 8;

export function emailError(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter your email address.';
  if (!EMAIL_SHAPE.test(v)) return 'That email address looks incomplete. Check it and try again.';
  return null;
}

export function userIdError(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Choose a user ID.';
  if (!USER_ID_CHARS.test(v)) return 'Use only letters, numbers, dots (.), dashes (-) and underscores (_). No spaces.';
  if (v.length < 3) return 'Your user ID needs at least 3 characters.';
  if (v.length > 24) return 'Your user ID can be at most 24 characters.';
  return null;
}

export function passwordHint(value: string): string {
  if (!value) return `At least ${PASSWORD_MIN} characters.`;
  const left = PASSWORD_MIN - value.length;
  if (left > 0) return `${left} more ${left === 1 ? 'character' : 'characters'} to reach ${PASSWORD_MIN}.`;
  return 'Long enough.';
}

/* Where to go after logging in: back to the app page that sent the user
   here, otherwise Today. Only paths inside the app are honoured. */
export function afterLoginPath(state: unknown): string {
  if (state && typeof state === 'object' && 'from' in state) {
    const from = (state as { from?: unknown }).from;
    if (typeof from === 'string' && from.startsWith('/app')) return from;
  }
  return '/app/today';
}
