import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';
import { CipherAvatar } from '../../../components/brand/CipherAvatar';
import { Skeleton } from '../../../components/ui/Feedback';
import { STATUS_META } from '../../../design/status';
import { cn } from '../../../lib/cn';
import type { Habit, HabitLog } from '../../../types';
import { useTrackingStart } from '../../../hooks/useTrackingStart';
import { useCoachLine, useWeekStats } from './useTodayData';

interface CoachRailProps {
  habits: Habit[];
  logs: HabitLog[];
  streaks: Record<string, number>;
}

/* The coach panel: the week at a glance, the habits that are slipping and
   CIPHER's line for the day. A side rail on wide screens, below the lanes
   on smaller ones. */
export function CoachRail({ habits, logs, streaks }: CoachRailProps) {
  // Re-ask CIPHER for its note whenever the habits or today's check-offs
  // change, so it never keeps insisting on something you have just done.
  // The first three days are an introduction, not an assessment.
  const trackingStart = useTrackingStart();
  const starting = differenceInCalendarDays(new Date(), trackingStart) + 1 <= 3;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const signature = useMemo(() => {
    const done = logs
      .filter(l => l.date === todayStr && l.status === 'completed')
      .map(l => l.habit_id)
      .sort()
      .join(',');
    return `${habits.length}:${done}`;
  }, [habits.length, logs, todayStr]);

  return (
    <aside aria-label="Coach" className="grid gap-x-10 md:grid-cols-2 xl:grid-cols-1">
      <WeekStrip habits={habits} streaks={streaks} />
      <NeedsAttention habits={habits} logs={logs} />
      <CoachLine enabled={habits.length > 0} signature={signature} starting={starting} />
    </aside>
  );
}

function RailSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  const id = `rail-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <section aria-labelledby={id} className={cn('min-w-0 border-t border-lane-line-strong py-6', className)}>
      <h2 id={id} className="mb-4 font-display text-[22px] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function WeekStrip({ habits, streaks }: { habits: Habit[]; streaks: Record<string, number> }) {
  const { days, failed } = useWeekStats();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const byDate = new Map((days ?? []).map(d => [d.date, d.weighted_score]));
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(parseISO(todayStr), 6 - i);
    const key = format(date, 'yyyy-MM-dd');
    return { key, label: format(date, 'EEE'), long: format(date, 'EEEE'), score: byDate.get(key) ?? 0, isToday: key === todayStr };
  });

  const top = habits.reduce<{ name: string; streak: number } | null>((best, h) => {
    const s = streaks[h.id] ?? 0;
    return s > 0 && (!best || s > best.streak) ? { name: h.name, streak: s } : best;
  }, null);

  return (
    <RailSection title="This week" className="border-t-0 pt-0 xl:pt-1">
      {failed && !days ? (
        <p className="text-[14px] text-lane-mute">Could not load the last seven days. They will show the next time this page loads.</p>
      ) : (
        <ol className="grid grid-cols-7 gap-1.5" aria-label="Daily score, last seven days">
          {week.map(day => (
            <li key={day.key} className="flex flex-col items-center gap-1.5" aria-label={`${day.isToday ? 'Today' : day.long}: ${days ? day.score : 'loading'}`}>
              <span aria-hidden className={cn('tabular font-display text-[15px] leading-none', day.isToday ? 'text-lane' : day.score === 0 ? 'text-lane-mute' : 'text-lane-dim')}>
                {days ? day.score : ' '}
              </span>
              <span aria-hidden className="relative flex h-20 w-full items-end overflow-hidden rounded-[3px] bg-night-850">
                {days ? (
                  <span
                    className={cn('block h-full w-full origin-bottom rounded-[3px] transition-transform duration-500 ease-out-expo', day.isToday ? 'bg-track' : 'bg-lane-dim/70')}
                    style={{ transform: `scaleY(${day.score > 0 ? Math.max(day.score, 4) / 100 : 0.025})` }}
                  />
                ) : (
                  <span className="skeleton absolute inset-0" />
                )}
              </span>
              <span aria-hidden className={cn('text-[11px]', day.isToday ? 'font-semibold text-lane' : 'text-lane-mute')}>
                {day.isToday ? 'Today' : day.label}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 flex items-baseline justify-between gap-3 border-t border-lane-line pt-3 text-[13px]">
        <span className="text-lane-dim">Best current streak</span>
        {top ? (
          <span className="min-w-0 truncate text-right">
            <span className="tabular font-semibold text-lane">{top.streak} days</span>
            <span className="text-lane-mute">, {top.name}</span>
          </span>
        ) : (
          <span className="text-lane-mute">None yet</span>
        )}
      </p>
    </RailSection>
  );
}

/* Active habits not done for two days or more, longest gap first. */
function NeedsAttention({ habits, logs }: { habits: Habit[]; logs: HabitLog[] }) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const items = useMemo(() => {
    const today = parseISO(todayStr);
    const lastDone = new Map<string, string>();
    for (const log of logs) {
      if (log.status !== 'completed') continue;
      const prev = lastDone.get(log.habit_id);
      if (!prev || log.date > prev) lastDone.set(log.habit_id, log.date);
    }
    return habits
      .map(h => {
        const last = lastDone.get(h.id);
        const since = last ? parseISO(last) : parseISO(h.created_at.slice(0, 10));
        return { habit: h, days: differenceInCalendarDays(today, since), never: !last };
      })
      .filter(item => item.days >= 2)
      .sort((a, b) => b.days - a.days);
  }, [habits, logs, todayStr]);

  return (
    <RailSection title="Needs attention" className="md:border-t-0 md:pt-0 xl:border-t xl:pt-6">
      {items.length === 0 ? (
        <p className="text-[14px] text-lane-dim">Nothing slipping. Every habit was done in the last two days.</p>
      ) : (
        <ul className="flex flex-col">
          {items.map(({ habit, days, never }) => (
            <li key={habit.id} className="flex items-center justify-between gap-3 border-b border-lane-line py-2.5 last:border-b-0">
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-lane">{habit.name}</span>
                <span className="block text-[12px] text-lane-mute">{never ? 'Not done since it was added' : 'Days since last done'}</span>
              </span>
              <span className="shrink-0 text-amber">
                <span className="tabular font-display text-[26px] leading-none">{days}</span>
                <span className="ml-1 text-[12px] font-medium">{days === 1 ? 'day' : 'days'}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </RailSection>
  );
}

function CoachLine({ enabled, signature, starting }: { enabled: boolean; signature: string; starting: boolean }) {
  const coach = useCoachLine(enabled, signature);

  return (
    <RailSection title="Coach" className="md:col-span-2 xl:col-span-1">
      {coach.state === 'loading' ? (
        <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Loading CIPHER's note">
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ) : coach.state === 'ready' ? (
        <div>
          <div className="flex items-start gap-3">
            <CipherAvatar mood={starting ? 'welcome' : coach.value.status} size="sm" className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p
                className={cn(
                  'text-[12px] font-semibold',
                  starting ? 'text-[#f7dfa5]' : STATUS_META[coach.value.status].text,
                )}
              >
                {starting ? "CIPHER, glad you're here" : `CIPHER, ${STATUS_META[coach.value.status].label.toLowerCase()}`}
              </p>
              <p className="mt-0.5 text-[15px] font-semibold leading-snug text-lane">{coach.value.headline}</p>
            </div>
          </div>
          <p className="mt-3 max-w-[68ch] text-[14px] leading-relaxed text-lane-dim">{coach.value.insight}</p>
          <p className="mt-3 border-t border-lane-line pt-3 text-[14px] leading-relaxed text-lane">
            <span className="font-semibold text-track-bright">Next: </span>
            {coach.value.action}
          </p>
          {coach.value.generatedAt && (
            <p className="mt-2 text-[12px] text-lane-mute">Written at {format(parseISO(coach.value.generatedAt), 'HH:mm')}</p>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <CipherAvatar mood={starting ? 'welcome' : 'idle'} size="sm" className="mt-0.5 shrink-0" />
          <p className="text-[14px] leading-relaxed text-lane-dim">
            {enabled
              ? 'No note from CIPHER yet today. Keep checking off habits; the coach writes one line a day once there is history to read.'
              : 'CIPHER starts coaching once you have habits to track.'}
          </p>
        </div>
      )}
      <Link
        to="/app/cipher"
        className="group mt-5 inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold text-lane underline-offset-4 hover:underline"
      >
        Open the full CIPHER analysis
        <ArrowRight weight="bold" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </RailSection>
  );
}
