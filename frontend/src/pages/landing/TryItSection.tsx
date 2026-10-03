import { useState } from 'react';
import { LaneRow } from '../../components/app/LaneRow';
import { Reveal } from './Reveal';
import { BoardNumber, ResultsBoard } from '../../components/brand/Scoreboard';
import { StatusTag } from '../../components/brand/StatusTag';
import { statusFromIndex } from '../../design/status';
import { DAILY_EXACT, SAMPLE_HABITS, dayScore, joinNames, streakOn } from './sampleWeek';

/* The real lane rows from the app, with local state: the visitor runs Sunday
   of the sample week. Monday to Saturday are already on the board, so the
   index moves the way it would in the app. */
const SUNDAY = 6;
const FIRST_SIX = DAILY_EXACT.slice(0, SUNDAY).reduce((s, x) => s + x, 0);
const diWith = (today: number) => Math.round((FIRST_SIX + today) / 7);

export function TryItSection() {
  const [done, setDone] = useState<boolean[]>(() => SAMPLE_HABITS.map(() => false));

  const today = dayScore(done);
  const di = diWith(today);
  const maxDi = diWith(100);
  const doneCount = done.filter(Boolean).length;
  const open = SAMPLE_HABITS.filter((_, i) => !done[i]).map((h) => h.name);

  const toggle = (i: number) => setDone((prev) => prev.map((v, j) => (j === i ? !v : v)));

  return (
    <section aria-labelledby="try-title" className="relative pb-24 pt-28 md:pb-32 md:pt-40">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-x-16 lg:gap-y-10">
        <Reveal className="lg:col-start-1 lg:row-start-1">
          <h2 id="try-title" className="font-display text-[clamp(2.25rem,6vw,4rem)] uppercase">
            Your turn. Run Sunday.
          </h2>
          <p className="mt-4 max-w-[52ch] text-[16px] text-lane-dim sm:text-[17px]">
            These are the lanes from the app. Monday to Saturday of the sample week are already scored; tap a habit to finish it
            and watch the board.
          </p>
        </Reveal>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-6">
          <ResultsBoard className="lg:sticky lg:top-8">
            <div className="flex flex-col gap-5 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-lane-mute">Sunday</span>
                <span className="rounded-[4px] border border-lane-line-strong px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.14em] text-lane-dim">
                  Sample
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4" aria-live="polite">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] text-lane-mute">Today's score</span>
                  <BoardNumber value={Math.round(today)} pad={3} className="text-[44px] text-lane sm:text-[52px]" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[12px] text-lane-mute">Discipline Index</span>
                  <BoardNumber value={di} pad={3} className="text-[44px] text-lane sm:text-[52px]" />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-lane-line pt-4 text-[14px]">
                <span className="tabular text-lane-dim">
                  {doneCount} of {SAMPLE_HABITS.length} done
                </span>
                <StatusTag status={statusFromIndex(di)} />
              </div>

              <p className="text-[14px] leading-relaxed text-lane-dim">
                {open.length ? (
                  <>
                    Finishing {joinNames(open)} adds <span className="tabular font-semibold text-lane">+{maxDi - di}</span> to the
                    index.
                  </>
                ) : (
                  <>Everything is done. {maxDi} is the best this week can score.</>
                )}
              </p>
            </div>
          </ResultsBoard>
        </div>

        <Reveal delay={0.1} className="lg:col-start-1 lg:row-start-2">
          <div className="border-t border-lane-line" role="group" aria-label="Sample habits for Sunday">
            {SAMPLE_HABITS.map((h, i) => (
              <LaneRow
                key={h.id}
                lane={i + 1}
                name={h.name}
                difficulty={h.difficulty}
                done={done[i]}
                streak={streakOn(h.week, SUNDAY, done[i])}
                onToggle={() => toggle(i)}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
