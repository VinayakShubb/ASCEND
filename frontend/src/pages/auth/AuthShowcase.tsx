import { motion, useReducedMotion } from 'motion/react';
import { BoardNumber, ResultsBoard } from '../../components/brand/Scoreboard';
import { CipherAvatar } from '../../components/brand/CipherAvatar';
import { StatusTag } from '../../components/brand/StatusTag';
import { duration, ease } from '../../design/motion';
import { statusFromIndex } from '../../design/status';
import { cn } from '../../lib/cn';
import { DAILY_EXACT, DAYS, SAMPLE_DI } from '../landing/sampleWeek';

/* The other half of the sign-in pages: not a billboard, a preview of what
   you're signing in to. The orb reads a sample Discipline Index on the night
   ground, with the track kept to quiet lane hairlines. */
export function AuthShowcase({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const status = statusFromIndex(SAMPLE_DI);

  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden bg-night-900/40 px-6 py-10 lg:px-12', className)}>
      {/* Quiet track backdrop. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {[22, 40, 58, 76].map(top => (
          <span key={top} className="absolute inset-x-0 h-px bg-lane/[0.07]" style={{ top: `${top}%` }} />
        ))}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(55% 45% at 85% -10%, rgb(250 246 236 / 0.10), transparent 70%), radial-gradient(70% 55% at 50% 118%, rgb(184 67 43 / 0.10), transparent 70%)',
          }}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-[22rem] flex-col items-center gap-7 text-center">
        <CipherAvatar mood="solid" size="lg" />

        <div>
          <h2 className="font-display text-[clamp(2rem,5vw,3rem)] uppercase leading-[0.9]">
            Discipline,
            <br />
            <span className="text-track-bright">scored.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-[32ch] text-[14px] leading-relaxed text-lane-dim">
            One honest number from your week — and an analyst that tells you what's moving it.
          </p>
        </div>

        <ResultsBoard className="w-full">
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lane-mute">Discipline Index</span>
              <StatusTag status={status} />
            </div>
            <div className="flex items-end gap-3">
              <BoardNumber value={SAMPLE_DI} pad={3} className="text-[64px] leading-none text-lane" />
              <span className="tabular mb-2 text-[12px] text-lane-mute">/ 100</span>
            </div>
            <ol className="grid grid-cols-7 gap-1.5 border-t border-lane-line pt-4" aria-hidden>
              {DAILY_EXACT.map((score, i) => (
                <li key={DAYS[i]} className="flex flex-col items-center gap-1.5">
                  <span className="relative flex h-12 w-full items-end overflow-hidden rounded-[3px] bg-night-800">
                    <motion.span
                      className="block w-full origin-bottom rounded-t-[3px] bg-[rgb(179_174_165/0.7)]"
                      style={{ height: '100%' }}
                      initial={reduce ? false : { scaleY: 0 }}
                      animate={{ scaleY: Math.max(0.04, score / 100) }}
                      transition={{ duration: duration.base, ease: ease.out, delay: 0.3 + i * 0.05 }}
                    />
                  </span>
                  <span className={cn('text-[10px]', i === 6 ? 'font-semibold text-lane' : 'text-lane-mute')}>{DAYS[i].slice(0, 1)}</span>
                </li>
              ))}
            </ol>
          </div>
        </ResultsBoard>
      </div>
    </div>
  );
}
