import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useInView, useReducedMotion, useScroll } from 'motion/react';
import { Check } from '@phosphor-icons/react';
import { CipherAvatar } from '../../components/brand/CipherAvatar';
import { StatusTag } from '../../components/brand/StatusTag';
import { WEIGHT } from '../../design/habits';
import { duration, ease } from '../../design/motion';
import { statusFromIndex } from '../../design/status';
import { cn } from '../../lib/cn';
import { CIPHER_SAMPLE, DAILY_EXACT, DAYS, SAMPLE_DI, SAMPLE_HABITS } from './sampleWeek';
import { Reveal } from './Reveal';

/* Replaces the pinned race. One scroll-told story in three beats — check off a
   day, seven days become the Discipline Index, CIPHER reads it — each beat
   animating in as it arrives, tied together by a filling spine. Every figure
   is the real sample-week arithmetic. */

/* Counts up to `to` once the element scrolls into view. */
function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -20% 0px' });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, to, { duration: 1.1, ease: ease.out, onUpdate: v => setVal(Math.round(v)) });
    return () => controls.stop();
  }, [inView, to, reduce]);
  return (
    <span ref={ref} className="tabular">
      {val}
    </span>
  );
}

const holding = CIPHER_SAMPLE.lines.find(l => l.label === 'Holding back');
const next = CIPHER_SAMPLE.lines.find(l => l.label === 'Next week');

export function ScoreStory() {
  const reduce = useReducedMotion();
  const spineRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: spineRef, offset: ['start 65%', 'end 75%'] });

  return (
    <section id="race" aria-labelledby="story-title" className="relative scroll-mt-4 py-24 md:py-32">
      <div className="mx-auto max-w-[980px] px-4 sm:px-8">
        <Reveal>
          <h2 id="story-title" className="font-display max-w-[18ch] text-[clamp(2.25rem,6vw,4rem)] uppercase">
            From check-off to verdict.
          </h2>
          <p className="mt-4 max-w-[56ch] text-[16px] text-lane-dim sm:text-[17px]">
            One sample week, start to finish: tick off a day, watch it become a score, and see CIPHER read the result.
          </p>
        </Reveal>

        <ol ref={spineRef} className="relative mt-16 flex flex-col gap-14 md:gap-20">
          {/* Spine: a faint track, filled by scroll. */}
          <span aria-hidden className="absolute left-[18px] top-1 bottom-1 w-px bg-lane-line" />
          <motion.span
            aria-hidden
            className="absolute left-[18px] top-1 h-[calc(100%-0.5rem)] w-px origin-top bg-track-bright"
            style={reduce ? { scaleY: 1 } : { scaleY: scrollYProgress }}
          />

          <Beat n={1} title="Check off your day">
            <DayCard />
          </Beat>
          <Beat n={2} title="Seven days make one number">
            <IndexCard />
          </Beat>
          <Beat n={3} title="CIPHER reads it">
            <AnalysisCard />
          </Beat>
        </ol>
      </div>
    </section>
  );
}

function Beat({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="relative grid grid-cols-[38px_minmax(0,1fr)] gap-x-4 sm:gap-x-6">
      <span className="z-10 grid size-9 place-items-center rounded-full border border-lane-line-strong bg-night-900 font-display text-[18px] text-lane">
        {n}
      </span>
      <div className="min-w-0 pt-1">
        <Reveal>
          <h3 className="font-display text-[22px] uppercase leading-tight text-lane sm:text-[26px]">{title}</h3>
        </Reveal>
        <div className="mt-5">{children}</div>
      </div>
    </li>
  );
}

const CARD = 'rounded-2xl border border-lane-line bg-night-900/50 p-5 backdrop-blur-sm sm:p-6';
const LABEL = 'text-[12px] font-semibold uppercase tracking-[0.14em] text-lane-mute';

/* Beat 1: a strong day — all four habits done, scored out of their weights. */
function DayCard() {
  const reduce = useReducedMotion();
  return (
    <Reveal as="div" className={CARD}>
      <div className="flex items-end justify-between gap-3">
        <span className={LABEL}>Monday's score</span>
        <span className="font-display text-[52px] leading-none text-lane sm:text-[60px]">
          <CountUp to={100} />
        </span>
      </div>
      <ul className="mt-4 border-t border-lane-line">
        {SAMPLE_HABITS.map((h, i) => (
          <li key={h.id} className="flex items-center justify-between gap-3 border-b border-lane-line py-3 last:border-b-0">
            <span className="min-w-0 truncate text-[15px] text-lane">
              {h.name} <span className="tabular text-lane-mute">· {WEIGHT[h.difficulty]}</span>
            </span>
            <motion.span
              className="grid size-6 shrink-0 place-items-center rounded-md bg-infield text-night-950"
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, margin: '0px 0px -15% 0px' }}
              transition={{ duration: duration.base, ease: ease.out, delay: 0.25 + i * 0.14 }}
            >
              <Check weight="bold" className="size-3.5" />
            </motion.span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] leading-snug text-lane-mute">
        Each habit is worth its difficulty. Finish them all and the day scores the full 100.
      </p>
    </Reveal>
  );
}

/* Beat 2: the week's seven daily scores average into the Discipline Index. */
function IndexCard() {
  const reduce = useReducedMotion();
  return (
    <Reveal as="div" className={CARD}>
      <div className="flex items-center justify-between gap-3">
        <span className={LABEL}>Discipline Index</span>
        <StatusTag status={statusFromIndex(SAMPLE_DI)} />
      </div>
      <div className="mt-2 flex items-end gap-3">
        <span className="font-display text-[64px] leading-none text-lane sm:text-[76px]">
          <CountUp to={SAMPLE_DI} />
        </span>
        <span className="tabular mb-3 text-[13px] text-lane-mute">/ 100</span>
      </div>
      <ol className="mt-4 grid grid-cols-7 gap-1.5 border-t border-lane-line pt-5 sm:gap-2" aria-hidden>
        {DAILY_EXACT.map((score, i) => (
          <li key={DAYS[i]} className="flex flex-col items-center gap-1.5">
            <span className="tabular text-[11px] font-semibold text-lane-dim">{Math.round(score)}</span>
            <span className="relative flex h-24 w-full items-end overflow-hidden rounded-[3px] bg-night-800">
              <motion.span
                className="block w-full origin-bottom rounded-t-[3px] bg-[rgb(179_174_165/0.7)]"
                style={{ height: '100%' }}
                initial={reduce ? false : { scaleY: 0 }}
                whileInView={{ scaleY: Math.max(0.04, score / 100) }}
                viewport={{ once: true, margin: '0px 0px -15% 0px' }}
                transition={{ duration: duration.slow, ease: ease.out, delay: 0.15 + i * 0.07 }}
              />
            </span>
            <span className="text-[11px] text-lane-mute">{DAYS[i].slice(0, 1)}</span>
          </li>
        ))}
      </ol>
      <p className="tabular mt-4 text-[13px] leading-snug text-lane-mute">
        The average of the seven days: {DAILY_EXACT.map(s => Math.round(s)).join(', ')}.
      </p>
    </Reveal>
  );
}

/* Beat 3: CIPHER's read — the real holding-back and next-week lines. */
function AnalysisCard() {
  const reduce = useReducedMotion();
  const notes = [holding, next].filter(Boolean) as { label: string; text: string }[];
  return (
    <Reveal as="div" className={cn(CARD, 'flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6')}>
      <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-start">
        <CipherAvatar cycle size="lg" />
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        {notes.map((note, i) => (
          <motion.div
            key={note.label}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -15% 0px' }}
            transition={{ duration: duration.slow, ease: ease.out, delay: 0.2 + i * 0.18 }}
          >
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-track-bright">{note.label}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-lane sm:text-[16px]">{note.text}</p>
          </motion.div>
        ))}
        <p className="text-[13px] text-lane-mute">Every figure above is calculated from the week — CIPHER only writes the read.</p>
      </div>
    </Reveal>
  );
}
