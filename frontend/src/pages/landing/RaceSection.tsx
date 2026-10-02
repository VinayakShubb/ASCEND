import { useRef, useState, type CSSProperties, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Check, X } from '@phosphor-icons/react';
import { BoardNumber, ResultsBoard } from '../../components/brand/Scoreboard';
import { StatusTag } from '../../components/brand/StatusTag';
import { statusFromIndex } from '../../design/status';
import { WEIGHT } from '../../design/habits';
import { cn } from '../../lib/cn';
import {
  DAILY_EXACT,
  DAYS,
  DAYS_FULL,
  MAX_WEIGHT,
  SAMPLE_HABITS,
  TOTAL_WEIGHT,
  disciplineIndex,
  doneOnDay,
  doneWeightsText,
  fmt1,
  weightOf,
} from './sampleWeek';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* Media conditions for the three versions of the race:
   - desktop: the section pins and the week advances as you scroll;
   - phone: a tall section with a CSS-sticky stage (lighter than a pin);
   - otherwise (reduced motion, very short screens): the finished week. */
const DESKTOP = '(min-width: 768px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)';
const PHONE = '(max-width: 767.98px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)';

/* Share of each day's scroll spent running; the rest holds the result. */
const RUN = 0.62;

interface RaceView {
  /* Day being raced (0 = Monday). */
  day: number;
  /* Number of days whose result is on the board. */
  posted: number;
}

const FINAL: RaceView = { day: 6, posted: 7 };

const smooth = (t: number) => t * t * (3 - 2 * t);

export function RaceSection() {
  const outerRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const laneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const viewRef = useRef<RaceView>(FINAL);
  const [view, setView] = useState<RaceView>(FINAL);

  useGSAP(
    () => {
      /* Scroll progress (0..1) -> which day, how far the runners are, and
         which results are posted. Runners move through a CSS variable so
         React re-renders never fight the animation. */
      const apply = (progress: number) => {
        const f = Math.min(Math.max(progress, 0), 1) * 7;
        const day = Math.min(6, Math.floor(f));
        const phase = progress >= 1 ? 1 : f - Math.floor(f);
        const t = smooth(Math.min(1, phase / RUN));
        const posted = progress >= 1 ? 7 : day + (phase >= RUN ? 1 : 0);
        SAMPLE_HABITS.forEach((h, i) => {
          laneRefs.current[i]?.style.setProperty('--t', String(h.week[day] ? t : 0));
        });
        const prev = viewRef.current;
        if (prev.day !== day || prev.posted !== posted) {
          viewRef.current = { day, posted };
          setView({ day, posted });
        }
      };
      const showFinal = () => {
        laneRefs.current.forEach((el) => el?.style.setProperty('--t', '1'));
        viewRef.current = FINAL;
        setView(FINAL);
      };

      const mm = gsap.matchMedia();
      mm.add({ desktop: DESKTOP, phone: PHONE }, (ctx) => {
        const { desktop, phone } = ctx.conditions as { desktop: boolean; phone: boolean };
        if (!desktop && !phone) {
          showFinal();
          return;
        }
        const st = desktop
          ? ScrollTrigger.create({
              trigger: stageRef.current,
              start: 'top top',
              end: () => `+=${Math.round(window.innerHeight * 4.2)}`,
              pin: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: (self) => apply(self.progress),
              onRefresh: (self) => apply(self.progress),
            })
          : ScrollTrigger.create({
              trigger: outerRef.current,
              start: 'top top',
              end: 'bottom bottom',
              invalidateOnRefresh: true,
              onUpdate: (self) => apply(self.progress),
              onRefresh: (self) => apply(self.progress),
            });
        apply(st.progress);
        return () => showFinal();
      });
      return () => mm.revert();
    },
    { scope: outerRef },
  );

  const { day, posted } = view;
  const dayPosted = posted > day;
  const dayDone = doneOnDay(day);
  const dayScore = Math.round(DAILY_EXACT[day]);
  // Days not run yet count as 0 in the 7-day average.
  const di = disciplineIndex(DAILY_EXACT.map((s, d) => (d < posted ? s : 0)));

  return (
    <section
      id="race"
      ref={outerRef}
      aria-labelledby="race-title"
      className={cn(
        'relative scroll-mt-0',
        '[@media(max-width:767.98px)_and_(min-height:700px)_and_(prefers-reduced-motion:no-preference)]:h-[320svh]',
      )}
    >
      <div
        ref={stageRef}
        className={cn(
          'relative flex flex-col justify-center gap-6 py-16 md:min-h-dvh md:gap-8 md:py-12',
          '[@media(max-width:767.98px)_and_(min-height:700px)_and_(prefers-reduced-motion:no-preference)]:sticky',
          '[@media(max-width:767.98px)_and_(min-height:700px)_and_(prefers-reduced-motion:no-preference)]:top-0',
          '[@media(max-width:767.98px)_and_(min-height:700px)_and_(prefers-reduced-motion:no-preference)]:h-svh',
          '[@media(max-width:767.98px)_and_(min-height:700px)_and_(prefers-reduced-motion:no-preference)]:py-6',
        )}
      >
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-8">
          <h2 id="race-title" className="font-display max-w-[16ch] text-[clamp(2.25rem,7vw,4.5rem)] uppercase">
            Harder habits run further.
          </h2>
          <p className="mt-3 max-w-[60ch] text-[15px] text-lane-dim sm:text-[17px] md:mt-4">
            A sample week, one day per scroll. Each lane's distance is its difficulty weight, so finishing Deep work counts twice
            as much as finishing Read.
          </p>
        </div>

        <div className="mx-auto grid w-full max-w-[1400px] gap-5 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-center lg:gap-10">
          <RaceBoard day={day} dayPosted={dayPosted} dayDone={dayDone} dayScore={dayScore} di={di} posted={posted} />
          <Track day={day} posted={posted} laneRefs={laneRefs} />
        </div>

        <WeekTable />
      </div>
    </section>
  );
}

function Track({
  day,
  posted,
  laneRefs,
}: {
  day: number;
  posted: number;
  laneRefs: RefObject<(HTMLDivElement | null)[]>;
}) {
  return (
    <div aria-hidden className="lg:order-first">
      {/* Header: start and finish, and the result columns. */}
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-lane-mute md:grid-cols-[10.5rem_minmax(0,1fr)_14rem] md:gap-x-0">
        <span />
        <span className="flex justify-between px-1 md:px-6">
          <span>Staggered start</span>
          <span>Finish</span>
        </span>
        <span className="hidden grid-cols-7 gap-1 pl-4 md:grid">
          {DAYS.map((d, i) => (
            <span key={d} className={cn('text-center', i === day && 'text-lane')}>
              {d.slice(0, 1)}
            </span>
          ))}
        </span>
      </div>

      <div className="tartan overflow-hidden rounded-[6px]">
        {SAMPLE_HABITS.map((h, i) => {
          const w = weightOf(h);
          const startPct = (1 - w / MAX_WEIGHT) * 100;
          const doneToday = h.week[day];
          return (
            <div
              key={h.id}
              ref={(el) => {
                laneRefs.current[i] = el;
              }}
              style={{ '--t': 1 } as CSSProperties}
              className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-stretch border-t-2 border-lane/80 first:border-t-0 md:grid-cols-[10.5rem_minmax(0,1fr)_14rem]"
            >
              {/* Lane number and habit */}
              <div className="row-span-2 flex items-center justify-center border-r-2 border-lane/80 md:row-span-1 md:justify-start md:gap-3 md:px-3">
                <span className="font-display text-[34px] leading-none text-lane md:text-[44px]">{i + 1}</span>
                <span className="hidden min-w-0 md:block">
                  <span className="block truncate text-[14px] font-semibold text-track-ink">{h.name}</span>
                  <span className="tabular block text-[12px] text-track-ink/75">
                    <span className="capitalize">{h.difficulty}</span> {WEIGHT[h.difficulty]}
                  </span>
                </span>
              </div>

              {/* Name row on phones */}
              <div className="flex items-baseline justify-between gap-2 px-3 pt-2 text-[13px] md:hidden">
                <span className="truncate font-semibold text-track-ink">{h.name}</span>
                <span className="tabular shrink-0 text-track-ink/75">{WEIGHT[h.difficulty]}</span>
              </div>

              {/* The run: staggered start line, distance covered, the runner. */}
              <div className="relative h-10 md:h-[4.5rem]">
                <div className="absolute inset-y-0 left-5 right-5 md:left-7 md:right-7">
                  <span className="absolute inset-y-0 w-[2px] bg-lane/80" style={{ left: `${startPct}%` }} />
                  <span className="absolute inset-y-0 right-0 w-[4px] bg-lane" />
                  <div className="absolute inset-y-0 right-0" style={{ left: `${startPct}%` }}>
                    <span
                      className="absolute left-0 top-1/2 h-[6px] w-full -translate-y-1/2 origin-left rounded-full bg-lane/35"
                      style={{ transform: 'scaleX(var(--t))' }}
                    />
                    <div className="absolute inset-0" style={{ transform: 'translateX(calc(var(--t) * 100%))' }}>
                      <span
                        className={cn(
                          'font-display absolute left-0 top-1/2 grid h-7 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[5px] text-[18px] leading-none transition-opacity duration-200 md:h-9 md:w-11 md:text-[22px]',
                          doneToday ? 'bg-lane text-track-deep' : 'border-2 border-lane/60 text-lane/70 opacity-70',
                        )}
                      >
                        {i + 1}
                      </span>
                    </div>
                  </div>
                  {!doneToday && (
                    <span
                      className="absolute top-1/2 -translate-y-1/2 pl-7 text-[12px] font-semibold uppercase tracking-[0.1em] text-track-ink/85 md:pl-9"
                      style={{ left: `${startPct}%` }}
                    >
                      Missed
                    </span>
                  )}
                </div>
              </div>

              {/* Results past the finish line (tablet and up) */}
              <div className="hidden grid-cols-7 items-center gap-1 border-l-2 border-lane/80 pl-4 pr-3 md:grid">
                {DAYS.map((d, di) => {
                  const isPosted = di < posted;
                  const done = h.week[di];
                  return (
                    <span
                      key={d}
                      className={cn(
                        'mx-auto grid size-6 place-items-center rounded-[4px] transition-colors duration-300',
                        !isPosted && 'border border-lane/25',
                        isPosted && done && 'bg-lane text-track-deep',
                        isPosted && !done && 'border border-lane/55 text-lane/80',
                      )}
                    >
                      {isPosted && (done ? <Check weight="bold" className="size-3.5" /> : <X weight="bold" className="size-3" />)}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RaceBoard({
  day,
  dayPosted,
  dayDone,
  dayScore,
  di,
  posted,
}: {
  day: number;
  dayPosted: boolean;
  dayDone: boolean[];
  dayScore: number;
  di: number;
  posted: number;
}) {
  const label = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-lane-mute';
  return (
    <ResultsBoard>
      <div className="grid grid-cols-3 gap-x-3 gap-y-3 p-4 sm:p-5 lg:grid-cols-2 lg:gap-y-4">
        <div className="flex flex-col gap-1.5">
          <span className={label}>Sample week</span>
          <BoardNumber value={DAYS[day].toUpperCase()} className="text-[26px] text-lane sm:text-[30px] lg:text-[40px]" />
        </div>
        <div className="flex flex-col items-center gap-1.5 lg:items-end">
          <span className={label}>Day score</span>
          <BoardNumber value={dayPosted ? dayScore : '--'} pad={3} className="text-[26px] text-lane sm:text-[30px] lg:text-[40px]" />
        </div>

        <div className="flex flex-col items-end gap-1.5 lg:col-span-2 lg:items-stretch lg:border-t lg:border-lane-line lg:pt-4">
          <div className="flex items-center gap-2 lg:min-h-7 lg:justify-between">
            <span className={label}>
              <span className="lg:hidden">Index</span>
              <span className="hidden lg:inline">Discipline Index</span>
            </span>
            {posted > 0 && <StatusTag status={statusFromIndex(di)} className="hidden lg:inline-flex" />}
          </div>
          <BoardNumber value={di} pad={3} className="text-[26px] text-lane sm:text-[30px] lg:self-end lg:text-[84px]" />
        </div>

        <p className="tabular col-span-3 text-[12px] leading-snug text-lane-dim sm:text-[13px] lg:col-span-2">
          {dayPosted ? (
            <>
              {DAYS_FULL[day]}: ({doneWeightsText(dayDone)}) / {fmt1(TOTAL_WEIGHT)} × 100 = {dayScore}.
            </>
          ) : (
            <>{DAYS_FULL[day]} is running.</>
          )}{' '}
          <span className="text-lane-mute">The index averages 7 days; days not run yet count as 0.</span>
        </p>

        <ol className="col-span-3 grid grid-cols-7 gap-1 border-t border-lane-line pt-3 lg:col-span-2" aria-label="Daily scores">
          {DAYS.map((d, i) => (
            <li key={d} className="flex flex-col items-center gap-1">
              <span className={cn('text-[11px] font-semibold', i === day ? 'text-lane' : 'text-lane-mute')}>{d.slice(0, 2)}</span>
              <span className={cn('font-board tabular text-[15px] font-bold', i < posted ? 'text-lane' : 'text-lane-mute/60')}>
                {i < posted ? Math.round(DAILY_EXACT[i]) : '--'}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </ResultsBoard>
  );
}

/* The same week as a table for screen readers. */
function WeekTable() {
  return (
    <table className="sr-only">
      <caption>Sample week: habits done each day, daily score and Discipline Index</caption>
      <thead>
        <tr>
          <th scope="col">Habit</th>
          {DAYS_FULL.map((d) => (
            <th key={d} scope="col">
              {d}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {SAMPLE_HABITS.map((h) => (
          <tr key={h.id}>
            <th scope="row">
              {h.name} ({h.difficulty}, {WEIGHT[h.difficulty]})
            </th>
            {h.week.map((done, i) => (
              <td key={i}>{done ? 'Done' : 'Missed'}</td>
            ))}
          </tr>
        ))}
        <tr>
          <th scope="row">Daily score</th>
          {DAILY_EXACT.map((s, i) => (
            <td key={i}>{Math.round(s)}</td>
          ))}
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Discipline Index</th>
          <td colSpan={7}>{disciplineIndex(DAILY_EXACT)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
