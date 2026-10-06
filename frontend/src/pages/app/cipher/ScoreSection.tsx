import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BoardNumber, ResultsBoard } from '../../../components/brand/Scoreboard';
import { StatusTag } from '../../../components/brand/StatusTag';
import { duration, ease } from '../../../design/motion';
import { STATUS_META } from '../../../design/status';
import type { CipherAnalysis } from '../../../lib/api';
import { cn } from '../../../lib/cn';

/* CIPHER has a temperament, not just a threshold: delighted when you're
   flying, steady when you're holding, uneasy when you slip, and urgent when
   it's bad. Computed from the status, never the AI, so the feeling can never
   contradict the number on the board. */
const VERDICT: Record<CipherAnalysis['status'], { tag: string; line: string }> = {
  elite: { tag: 'this is your best work', line: "You're flying. Protect this." },
  solid: { tag: 'steady, and it shows', line: "You're holding the line." },
  slipping: { tag: 'this one worries me', line: "You're slipping. Let's stop the slide." },
  critical: { tag: 'I want you back', line: 'This is critical. One move, right now.' },
};

/* The first days are not a performance to judge, so CIPHER just sounds glad
   you're here. */
const WELCOME = { tag: 'just getting started', line: "Good to have you here. Let's build the first days." };

/* The score: the Discipline Index on the results board with the last 7 daily
   scores, the strict verdict and CIPHER's note beside it, then the baselines. */
export function ScoreSection({ analysis }: { analysis: CipherAnalysis }) {
  const { score } = analysis;
  const momentumUp = score.momentum >= 0;
  const starting = analysis.isNewUser;
  const verdict = starting ? WELCOME : VERDICT[analysis.status];

  return (
    <section aria-labelledby="cipher-score">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <ScoreBoard analysis={analysis} />

        <div className="min-w-0 lg:pt-2">
          <p
            className={cn(
              'text-[13px] font-semibold uppercase tracking-[0.18em]',
              starting ? 'text-[#f7dfa5]' : STATUS_META[analysis.status].text,
            )}
          >
            {starting ? `Day ${analysis.daysTracked}` : STATUS_META[analysis.status].label} · {verdict.tag}
          </p>
          <h2 id="cipher-score" className="mt-3 font-display text-[38px] uppercase sm:text-[52px]">
            {verdict.line}
          </h2>
          <p className="mt-5 max-w-[66ch] border-t border-lane-line pt-4 text-[14px] text-lane-dim">
            <strong className="font-semibold text-lane">Discipline Index {score.value}:</strong> {score.explain.value}
          </p>
          {analysis.verdict && (
            <p className="mt-5 max-w-[62ch] border-l-2 border-track pl-4 text-[16px] leading-relaxed text-lane">
              {analysis.verdict}
              <span className="mt-1 block text-[12px] uppercase tracking-[0.12em] text-lane-mute">CIPHER's read</span>
            </p>
          )}
        </div>
      </div>

      <dl className="mt-10 grid border-t border-lane-line md:grid-cols-3">
        <Baseline label="30-day average" value={<span className="tabular">{score.baseline}</span>} explain={score.explain.baseline} />
        <Baseline
          label="7 days ago"
          value={
            <>
              <span className="tabular">{score.weekAgo}</span>
              <span className={cn('tabular ml-2 text-[0.55em]', momentumUp ? 'text-infield' : 'text-dnf')}>
                ({momentumUp ? '+' : ''}
                {score.momentum})
              </span>
            </>
          }
          explain={score.explain.weekAgo}
        />
        <Baseline label="Max possible today" value={<span className="tabular">{score.maxToday}</span>} explain={score.explain.maxToday} />
      </dl>
    </section>
  );
}

function Baseline({ label, value, explain }: { label: string; value: ReactNode; explain: string }) {
  return (
    <div className="border-lane-line py-5 not-first:border-t md:px-6 md:not-first:border-t-0 md:not-first:border-l md:first:pl-0 md:last:pr-0">
      <dt className="text-[13px] font-medium text-lane-dim">{label}</dt>
      <dd className="mt-2 font-display text-[44px] leading-none">{value}</dd>
      <dd className="mt-3 text-[13.5px] leading-snug text-lane-mute">{explain}</dd>
    </div>
  );
}

function ScoreBoard({ analysis }: { analysis: CipherAnalysis }) {
  const reduce = useReducedMotion();

  return (
    <ResultsBoard className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-lane-dim">Discipline Index</span>
        {analysis.isNewUser ? (
          <span className="rounded-full border border-[#f7dfa5]/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#f7dfa5]">
            Day {analysis.daysTracked}
          </span>
        ) : (
          <StatusTag status={analysis.status} />
        )}
      </div>

      <div className="mt-3 flex items-end gap-3">
        {/* Doto sits low in its 1em cell and loses its bottom row of dots; lift the glyphs to centre them. */}
        <BoardNumber value={analysis.score.value} pad={2} flipOnMount className="text-[112px] text-lane sm:text-[132px]" />
        <span className="tabular mb-3 text-[13px] text-lane-mute">/ 100</span>
      </div>

      <div className="mt-6 border-t border-lane-line pt-4">
        <p className="mb-3 text-[12px] font-medium text-lane-dim">Daily score, last 7 days</p>
        <ol className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Daily score, last 7 days">
          {analysis.daily7.map((d, i) => {
            // Days before the account existed aren't a zero score, they're no
            // score at all -- show them as empty rather than as a failure.
            const untracked = d.tracked === false;
            return (
              <li key={d.date} className="flex flex-col items-center gap-1.5">
                <span className="sr-only">
                  {untracked ? `${d.day}: before you started` : `${d.isToday ? 'Today' : d.day}: ${d.score}`}
                </span>
                <span
                  className={cn(
                    'tabular text-[12px] font-semibold',
                    untracked ? 'text-lane-mute/60' : d.isToday ? 'text-lane' : 'text-lane-dim',
                  )}
                  aria-hidden
                >
                  {untracked ? '--' : d.score}
                </span>
                <span
                  className={cn(
                    'relative flex h-20 w-full items-end overflow-hidden rounded-[3px]',
                    untracked ? 'bg-night-800/40' : 'bg-night-800',
                  )}
                  aria-hidden
                >
                  {/* Full-height bar scaled from the bottom: transform animates on the
                      GPU, where animating height would re-run layout every frame. */}
                  {!untracked && (
                    <motion.span
                      className="block h-full w-full origin-bottom rounded-t-[3px]"
                      style={{ backgroundColor: d.isToday ? 'var(--color-track)' : 'rgb(179 174 165 / 0.7)' }}
                      initial={reduce ? false : { scaleY: 0 }}
                      animate={{ scaleY: Math.max(4, d.score) / 100 }}
                      transition={{ duration: duration.slow, ease: ease.out, delay: 0.25 + i * 0.05 }}
                    />
                  )}
                </span>
                <span
                  className={cn(
                    'text-[11px]',
                    untracked ? 'text-lane-mute/60' : d.isToday ? 'font-semibold text-lane' : 'text-lane-mute',
                  )}
                  aria-hidden
                >
                  {d.isToday ? 'Today' : d.day}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </ResultsBoard>
  );
}
