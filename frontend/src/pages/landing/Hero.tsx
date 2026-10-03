import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from '@phosphor-icons/react';
import { BoardNumber, ResultsBoard } from '../../components/brand/Scoreboard';
import { CipherAvatar } from '../../components/brand/CipherAvatar';
import { StatusTag } from '../../components/brand/StatusTag';
import { duration, ease } from '../../design/motion';
import { statusFromIndex } from '../../design/status';
import { cn } from '../../lib/cn';
import { PublicNav, StartCta } from './PublicChrome';
import { DAILY_EXACT, DAYS, SAMPLE_DI } from './sampleWeek';

/* First viewport: the thesis, stated plainly. A clean headline and the one
   number ASCEND exists to produce, with CIPHER reading it. The track stays as
   a quiet backdrop of lane lines, not a painted billboard. */
export function Hero({ onSeeScoring }: { onSeeScoring: () => void }) {
  const reduce = useReducedMotion();
  const status = statusFromIndex(SAMPLE_DI);

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: duration.slow, ease: ease.out, delay },
        };

  return (
    <section className="relative flex min-h-dvh flex-col overflow-hidden" aria-labelledby="hero-title">
      <PublicNav />

      {/* Quiet track backdrop: receding lane hairlines + a floodlight wash. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        {[18, 34, 50, 66, 82].map(top => (
          <span key={top} className="absolute inset-x-0 h-px bg-lane/[0.07]" style={{ top: `${top}%` }} />
        ))}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(45% 40% at 85% -8%, rgb(250 246 236 / 0.10), transparent 70%), radial-gradient(60% 50% at 50% 120%, rgb(184 67 43 / 0.10), transparent 70%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 items-center px-4 sm:px-8">
        <div className="grid w-full gap-x-16 gap-y-12 py-14 md:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,24rem)] lg:items-center">
          {/* The thesis */}
          <div className="max-w-[40rem]">
            <motion.p
              {...rise(0.05)}
              className="text-[13px] font-semibold uppercase tracking-[0.22em] text-track-bright"
            >
              Weighted habit tracking
            </motion.p>
            <motion.h1
              {...rise(0.12)}
              id="hero-title"
              className="font-display mt-5 text-[clamp(3rem,9vw,6.5rem)] uppercase leading-[0.86]"
            >
              Discipline,
              <br />
              <span className="text-track-bright">scored.</span>
            </motion.h1>
            <motion.p {...rise(0.2)} className="mt-6 max-w-[42ch] text-[17px] leading-relaxed text-lane-dim sm:text-[19px]">
              ASCEND weights every habit by difficulty and turns your week into one honest number — then CIPHER, your analyst,
              tells you exactly what's moving it.
            </motion.p>
            <motion.div {...rise(0.28)} className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <StartCta size="lg" tone="track" />
              <a
                href="#race"
                onClick={e => {
                  e.preventDefault();
                  onSeeScoring();
                }}
                className="group inline-flex h-11 items-center gap-1.5 text-[15px] font-semibold text-lane transition-colors hover:text-track-bright"
              >
                See how it's scored
                <ArrowRight weight="bold" className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </a>
            </motion.div>
            <motion.p {...rise(0.36)} className="mt-7 text-[13px] text-lane-mute">
              Free · No ads · Your data stays yours
            </motion.p>
          </div>

          {/* The number, read by CIPHER */}
          <motion.div {...rise(0.3)} className="relative mx-auto w-full max-w-[24rem] lg:mx-0">
            <div className="absolute -top-7 right-4 z-10">
              <CipherAvatar mood="solid" size="md" />
            </div>
            <ResultsBoard>
              <div className="flex flex-col gap-5 p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-lane-mute">Discipline Index</span>
                  <span className="rounded-[4px] border border-lane-line-strong px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.14em] text-lane-dim">
                    Sample
                  </span>
                </div>

                <div className="flex items-end justify-between gap-3">
                  <BoardNumber value={SAMPLE_DI} pad={3} flipOnMount mountDelay={0.5} className="text-[84px] leading-none text-lane" />
                  <StatusTag status={status} className="mb-3" />
                </div>

                <div className="border-t border-lane-line pt-4">
                  <p className="mb-3 text-[12px] font-medium text-lane-dim">Daily score, last 7 days</p>
                  <ol className="grid grid-cols-7 gap-1.5" aria-hidden>
                    {DAILY_EXACT.map((score, i) => (
                      <li key={DAYS[i]} className="flex flex-col items-center gap-1.5">
                        <span className="relative flex h-16 w-full items-end overflow-hidden rounded-[3px] bg-night-800">
                          <motion.span
                            className="block w-full origin-bottom rounded-t-[3px] bg-[rgb(179_174_165/0.7)]"
                            style={{ height: '100%' }}
                            initial={reduce ? false : { scaleY: 0 }}
                            animate={{ scaleY: Math.max(0.04, score / 100) }}
                            transition={{ duration: duration.slow, ease: ease.out, delay: 0.6 + i * 0.05 }}
                          />
                        </span>
                        <span className={cn('text-[11px]', i === 6 ? 'font-semibold text-lane' : 'text-lane-mute')}>
                          {DAYS[i].slice(0, 1)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </ResultsBoard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
