import { useId, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, SignOut } from '@phosphor-icons/react';
import { format, isValid, parseISO } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/cn';
import {
  disableReminders,
  remindersEnabled,
  remindersSupported,
  requestReminderPermission,
  setRemindersEnabled,
  syncReminders,
} from '../../lib/notifications';

function memberSince(createdAt?: string): string | null {
  if (!createdAt) return null;
  const date = parseISO(createdAt);
  return isValid(date) ? format(date, 'd MMMM yyyy') : null;
}

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  const username = user?.username ?? '';
  const since = memberSince(user?.created_at);

  const handleLogout = async () => {
    setLeaving(true);
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="max-w-[860px]">
      <PageHeader title="Settings" />

      <Section title="Account">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
          <Bib name={username} />
          <dl className="grid gap-4">
            <div>
              <dt className="text-[13px] text-lane-mute">User ID</dt>
              <dd className="mt-0.5 break-all text-[17px] font-semibold">{username || 'Not available'}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-lane-mute">Member since</dt>
              <dd className="tabular mt-0.5 text-[17px] font-semibold">{since ?? 'Not available'}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-6 text-[14px] text-lane-dim">Log in with your user ID or the email you signed up with.</p>
      </Section>

      <Section title="Session">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-[15px] text-lane-dim">Log out of ASCEND on this device. Your habits and history stay saved.</p>
          <Button
            variant="secondary"
            onClick={handleLogout}
            loading={leaving}
            icon={<SignOut className="size-[18px]" aria-hidden />}
          >
            Log out
          </Button>
        </div>
      </Section>

      <RemindersSection />

      <Section title="Help">
        <ul className="-my-3 divide-y divide-lane-line">
          <HelpLink to="/how-it-works" title="How ASCEND scores you">
            Difficulty weights, the daily score and the 7-day Discipline Index, explained.
          </HelpLink>
          <HelpLink to="/app/cipher" title="Run CIPHER analysis">
            CIPHER reads your recent history and explains what is moving your numbers.
          </HelpLink>
        </ul>
      </Section>

      <Section title="About" last>
        <p className="text-[15px] text-lane-dim">
          <span className="font-semibold text-lane">ASCEND</span> turns daily discipline into one number, the Discipline
          Index, and CIPHER explains what drives it.
        </p>
        <p className="mt-3 text-[15px] text-lane">Built by Vinayak</p>
      </Section>
    </div>
  );
}

/* Habit reminders, scheduled on-device in the native app at the time you
   usually check each habit off. On the web it only explains itself. */
function RemindersSection() {
  const native = remindersSupported();
  const [enabled, setEnabled] = useState(remindersEnabled());
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!enabled) {
        const ok = await requestReminderPermission();
        if (!ok) {
          setDenied(true);
          return;
        }
        setRemindersEnabled(true);
        setEnabled(true);
        setDenied(false);
        await syncReminders();
      } else {
        await disableReminders();
        setEnabled(false);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Reminders">
      {native ? (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-[15px] text-lane-dim">
              Get a nudge for each habit at the time you usually check it off — only while it's still open.
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Habit reminders"
              disabled={busy}
              onClick={toggle}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                enabled ? 'bg-track' : 'bg-night-700',
                busy && 'opacity-60',
              )}
            >
              <span
                className={cn(
                  'absolute top-1 size-5 rounded-full bg-lane transition-transform',
                  enabled ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </div>
          {denied && (
            <p className="mt-3 text-[14px] text-dnf">
              Notifications are blocked. Enable them for ASCEND in your phone's settings, then try again.
            </p>
          )}
          {enabled && (
            <p className="mt-3 text-[13px] text-lane-mute">
              Times are learned from your history. A new habit needs a few days of check-offs before it gets a reminder.
            </p>
          )}
        </>
      ) : (
        <p className="text-[15px] text-lane-dim">
          Habit reminders run in the ASCEND Android app — scheduled on your device at the time you usually do each habit.
        </p>
      )}
    </Section>
  );
}

/* A settings group: title on the left from md up, content on the right,
   divided from the next group by a lane line. */
function Section({ title, children, last = false }: { title: string; children: ReactNode; last?: boolean }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={`grid gap-5 border-t border-lane-line py-8 md:grid-cols-[200px_minmax(0,1fr)] md:gap-10 ${last ? 'border-b' : ''}`}
    >
      <h2 id={id} className="font-display text-[28px] uppercase leading-none md:pt-0.5">
        {title}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function HelpLink({ to, title, children }: { to: string; title: string; children: ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="group -mx-2 flex min-h-16 items-center justify-between gap-4 rounded-xl px-2 py-3 transition-colors duration-200 hover:bg-night-850/70"
      >
        <span className="min-w-0">
          <span className="block text-[16px] font-semibold text-lane">{title}</span>
          <span className="mt-0.5 block text-[14px] text-lane-dim">{children}</span>
        </span>
        <ArrowRight
          className="size-5 shrink-0 text-lane-mute transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-lane"
          aria-hidden
        />
      </Link>
    </li>
  );
}

/* The athlete's race bib: the user ID printed under the meet's name. */
function Bib({ name }: { name: string }) {
  return (
    <div
      aria-hidden
      className="relative w-full max-w-[240px] shrink-0 overflow-hidden rounded-md bg-lane text-night-950 shadow-[0_14px_28px_-14px_rgb(0_0_0/0.9)]"
    >
      <div className="bg-track px-4 py-1.5 font-display text-[13px] uppercase tracking-[0.18em] text-track-ink">Ascend</div>
      <div className="px-4 pb-4 pt-3">
        <span className="font-display block break-all text-[34px] leading-[0.95]">{name || 'Athlete'}</span>
      </div>
      {[
        'left-1.5 top-1.5',
        'right-1.5 top-1.5',
        'bottom-1.5 left-1.5',
        'bottom-1.5 right-1.5',
      ].map(pos => (
        <span key={pos} className={`absolute size-1.5 rounded-full bg-night-950/25 ${pos}`} />
      ))}
    </div>
  );
}
