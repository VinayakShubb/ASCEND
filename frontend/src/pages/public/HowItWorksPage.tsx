import { useEffect, useState, type ReactNode } from 'react';
import { PublicFooter, PublicNav, StartCta } from '../landing/PublicChrome';
import { DIFFICULTY_OPTIONS } from '../../design/habits';
import { cn } from '../../lib/cn';

/* How it works (Read mode): the scoring rules in plain words, matching the
   backend exactly (backend/services/calculations.py, cipher_metrics.py). */

const SECTIONS = [
  { id: 'weights', title: 'Difficulty weights' },
  { id: 'daily-score', title: 'Daily score' },
  { id: 'completion', title: 'Completion' },
  { id: 'discipline-index', title: 'Discipline Index' },
  { id: 'streaks', title: 'Streaks' },
  { id: 'status', title: 'Status' },
  { id: 'cipher', title: 'CIPHER' },
  { id: 'execution-types', title: 'Execution types' },
] as const;

const SECTION_IDS = SECTIONS.map((s) => s.id);

/* From cipher_metrics.PERSONALITY_TAGLINES, in the order CIPHER checks them. */
const EXECUTION_TYPES = [
  ['Ghost mode', 'The system is set up. It just isn’t being used yet.'],
  ['Weekend warrior', 'Your consistency depends on the day of the week.'],
  ['Early quitter', 'Strong at the start of the week, fading after.'],
  ['Burst executor', 'Strong days, then long gaps. The ability is there, the rhythm isn’t.'],
  ['All or nothing', 'Perfect days or zero days. A half day beats a zero day every time.'],
  ['Selective executor', 'The easy habits get done. The hard ones get skipped.'],
  ['Declining performer', 'You started stronger than you are going now.'],
  ['Slow starter', 'A slow start, but the trend is clearly upward.'],
  ['Comeback kid', 'You fall off, and you keep coming back. That matters.'],
  ['Consistent builder', 'Steady, day after day. This is the hardest pattern to build.'],
] as const;

const BANDS = [
  { label: 'Elite', range: '80 to 100', text: 'text-infield' },
  { label: 'Solid', range: '50 to 79', text: 'text-infield' },
  { label: 'Slipping', range: '20 to 49', text: 'text-amber' },
  { label: 'Critical', range: 'below 20', text: 'text-dnf' },
];

function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string>(ids[0]);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

export function HowItWorksPage() {
  const active = useActiveSection(SECTION_IDS);

  useEffect(() => {
    const previous = document.title;
    document.title = 'How it works: ASCEND';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="relative overflow-x-clip">
      <div className="stadium-ground" aria-hidden />
      <div className="relative">
        <PublicNav current="how" />

        <main>
          <header className="mx-auto max-w-[1400px] px-4 pb-10 pt-14 sm:px-8 md:pb-14 md:pt-20">
            <h1 className="font-display max-w-[14ch] text-[clamp(2.75rem,8vw,5.5rem)] uppercase">How ASCEND keeps score</h1>
            <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-lane-dim sm:text-[18px]">
              Everything in ASCEND comes back to one number, the Discipline Index. This page explains how each figure is calculated,
              using the same rules the app runs on. No figure is estimated or written by AI.
            </p>
          </header>

          <div className="mx-auto grid max-w-[1400px] gap-10 px-4 sm:px-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
            <nav aria-label="On this page" className="lg:sticky lg:top-8 lg:self-start">
              <p className="mb-3 text-[13px] font-semibold text-lane-mute">On this page</p>
              <ol className="flex flex-wrap gap-2 lg:flex-col lg:gap-0 lg:border-l lg:border-lane-line">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      aria-current={active === s.id ? 'location' : undefined}
                      className={cn(
                        'inline-flex min-h-11 items-center rounded-full border border-lane-line px-3.5 text-[14px] no-underline transition-colors duration-200 hover:text-lane',
                        'lg:-ml-px lg:min-h-10 lg:rounded-none lg:border-0 lg:border-l-2 lg:border-transparent lg:px-4',
                        active === s.id ? 'text-lane lg:border-track-bright' : 'text-lane-dim',
                      )}
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <article className="max-w-[70ch] pb-8 text-[16px] leading-[1.7] text-lane-dim sm:text-[17px]">
              <Section id="weights" title="Difficulty weights">
                <p>
                  Every habit has a difficulty, chosen when you add it. The difficulty sets the habit's weight: how much of a day it is
                  worth. Harder habits count for more, so a day of hard work is never scored the same as a day of easy wins.
                </p>
                <table className="mt-6 w-full max-w-[28rem] text-left">
                  <caption className="sr-only">Difficulty weights</caption>
                  <thead>
                    <tr className="border-b border-lane-line-strong text-[13px] text-lane-mute">
                      <th scope="col" className="py-2 font-semibold">
                        Difficulty
                      </th>
                      <th scope="col" className="py-2 text-right font-semibold">
                        Weight
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <tr key={d.value} className="border-b border-lane-line">
                        <th scope="row" className="py-3 font-semibold text-lane">
                          {d.label}
                        </th>
                        <td className="font-display tabular py-3 text-right text-[24px] text-lane">{d.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-6">
                  Only active habits count. When you archive a habit it leaves every score from then on, so a habit you have retired
                  can't drag your numbers down.
                </p>
              </Section>

              <Section id="daily-score" title="Daily score">
                <p>Each day gets a score from 0 to 100: the weights of the habits you finished, divided by the weights of all your habits.</p>
                <Formula>daily score = done weight ÷ total weight × 100</Formula>
                <p>
                  Say you track Read (easy, 1.0), Meditate (medium, 1.2), Gym (hard, 1.5) and Deep work (extreme, 2.0). The total weight
                  is 5.7. Finish Read and Deep work and the day scores 3.0 ÷ 5.7 × 100 = 52.6. You did half your habits, but the half
                  that included the hardest one, so the score is a little over 50.
                </p>
              </Section>

              <Section id="completion" title="Completion">
                <p>
                  Completion is the plain share of habits you finished, with every habit counting the same. In the example above it is 2
                  of 4, so 50%.
                </p>
                <p>
                  CIPHER uses completion for your completion rate, your active days (days with at least one habit done) and your weekday
                  pattern. The Discipline Index always uses the weighted daily score.
                </p>
              </Section>

              <Section id="discipline-index" title="Discipline Index">
                <p>
                  The Discipline Index (DI) is the average of your daily scores over the last 7 calendar days, ending today. It is
                  rounded to a whole number once, at the end.
                </p>
                <Formula>DI = (sum of the last 7 daily scores) ÷ 7</Formula>
                <ul className="mt-2 flex flex-col gap-3 pl-5 marker:text-track-bright [list-style:square]">
                  <li>
                    <strong className="font-semibold text-lane">Today counts as it stands.</strong> The index rises as you check off
                    habits during the day.
                  </li>
                  <li>
                    <strong className="font-semibold text-lane">A day with nothing done counts as 0.</strong> The window is always 7
                    calendar days, so in your first week the days before you started count as 0 too.
                  </li>
                  <li>
                    <strong className="font-semibold text-lane">Each finished habit is worth a set number of points.</strong> One day of a
                    habit adds its share of a day's weight × 100 ÷ 7. With the example habits, a day of Deep work (2.0 of 5.7) adds about
                    5.0 to the index; a day of Read (1.0 of 5.7) adds about 2.5.
                  </li>
                </ul>
                <p className="mt-5">
                  Example: daily scores of 100, 73.7, 43.9, 100, 38.6, 78.9 and 100 add up to 535.1. Divided by 7 that is 76.4, so the
                  index is 76. Averages are taken from the exact scores, so adding up rounded figures can be one point off.
                </p>
              </Section>

              <Section id="streaks" title="Streaks">
                <p>A streak is the number of days in a row you finished a habit, counting back from today.</p>
                <p>
                  A streak stays alive until the end of today if yesterday was done. If you finished Gym on Monday, Tuesday and Wednesday,
                  it shows a 3-day streak all through Thursday while you still have time. If Thursday ends without it, the streak resets
                  to 0. CIPHER also keeps your longest streak ever for each habit.
                </p>
              </Section>

              <Section id="status" title="Status">
                <p>Your status is the band your Discipline Index falls in. CIPHER's avatar changes mood with it.</p>
                <dl className="mt-6 max-w-[28rem] border-t border-lane-line-strong">
                  {BANDS.map((b) => (
                    <div key={b.label} className="flex items-center justify-between border-b border-lane-line py-3">
                      <dt className={cn('font-semibold', b.text)}>{b.label}</dt>
                      <dd className="tabular text-lane">{b.range}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-6">
                  In your first three days of tracking the status never drops to critical, because the index still includes days before
                  you started.
                </p>
              </Section>

              <Section id="cipher" title="CIPHER">
                <p>
                  CIPHER is your analyst. Every number it shows is computed in code from your check-offs: completion, active days,
                  momentum against last week, streaks, what each missed day cost, and what finishing a habit today adds. The AI only
                  receives those results and writes short notes around them. It never produces a figure, and your numbers still appear
                  if the AI is unavailable.
                </p>
                <ul className="mt-2 flex flex-col gap-3 pl-5 marker:text-track-bright [list-style:square]">
                  <li>
                    <strong className="font-semibold text-lane">Daily brief:</strong> a quote and a line of motivation, once per day.
                  </li>
                  <li>
                    <strong className="font-semibold text-lane">Coach line:</strong> one short coaching note, once per day.
                  </li>
                  <li>
                    <strong className="font-semibold text-lane">CIPHER analysis:</strong> run it up to 20 times a day as your day changes.
                  </li>
                </ul>
                <p className="mt-5">
                  Weekday patterns use your last 8 weeks and leave today out, since today isn't over. Weekly focus suggestions project
                  your index assuming next week repeats this one except for the habit in focus.
                </p>
              </Section>

              <Section id="execution-types" title="Execution types">
                <p>
                  After 14 days of tracking, CIPHER names your execution type: the pattern in how you get things done, with the evidence
                  behind it. Until then you are calibrating, so one rough week can't define you. These are the ten types:
                </p>
                <dl className="mt-8 grid gap-x-10 sm:grid-cols-2">
                  {EXECUTION_TYPES.map(([name, tagline]) => (
                    <div key={name} className="border-t border-lane-line py-4">
                      <dt className="font-display text-[22px] uppercase leading-tight text-lane">{name}</dt>
                      <dd className="mt-1 text-[15px] leading-relaxed">{tagline}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
            </article>
          </div>

          <section aria-labelledby="hiw-cta" className="tartan relative mt-16 overflow-hidden">
            <span aria-hidden className="absolute inset-y-0 left-[8%] w-[6px] bg-lane/80" />
            <div className="relative mx-auto flex max-w-[1400px] flex-col items-start gap-5 px-4 py-20 pl-[calc(8%+1.75rem)] sm:px-8 sm:pl-[calc(8%+2.5rem)] md:py-24">
              <h2 id="hiw-cta" className="font-display text-[clamp(2.5rem,7vw,4.5rem)] uppercase text-lane">
                Put your habits on the track.
              </h2>
              <p className="max-w-[44ch] text-[17px] leading-relaxed text-track-ink">
                Free to use. Add your habits with honest difficulties and your first score is on the board today.
              </p>
              <StartCta size="lg" className="mt-1" />
            </div>
          </section>
        </main>

        <PublicFooter />
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-8 border-t border-lane-line pb-6 pt-12 first:border-t-0 first:pt-0 [&>p+p]:mt-4">
      <h2 id={`${id}-title`} className="font-display mb-5 text-[clamp(2rem,4.5vw,2.75rem)] uppercase text-lane">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <p className="tabular my-6 rounded-[10px] border border-lane-line-strong bg-night-900 px-5 py-4 text-[16px] font-semibold text-lane sm:text-[18px]">
      {children}
    </p>
  );
}
