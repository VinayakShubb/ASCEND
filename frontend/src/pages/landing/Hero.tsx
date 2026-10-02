import { ResultsBoard, BoardNumber } from '../../components/brand/Scoreboard';
import { StatusTag } from '../../components/brand/StatusTag';
import { statusFromIndex } from '../../design/status';
import { PublicNav, StartCta } from './PublicChrome';
import { SAMPLE_DI } from './sampleWeek';

/* First viewport: the track itself. Four full-bleed lanes fill the lower part
   of the screen with the headline painted across them; the copy and the
   results board sit on the night ground above. */
export function Hero({ onSeeScoring }: { onSeeScoring: () => void }) {
  const status = statusFromIndex(SAMPLE_DI);
  return (
    <section className="relative flex min-h-dvh flex-col" aria-labelledby="hero-title">
      <PublicNav />

      {/* Above the track: copy left, board right. */}
      <div className="relative z-10 mx-auto grid w-full max-w-[1400px] gap-7 px-4 pb-8 pt-6 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-10 md:pb-10 md:pt-10">
        <div className="flex max-w-[34rem] flex-col gap-6">
          <p className="text-[17px] leading-relaxed text-lane-dim sm:text-[19px]">
            ASCEND weights every habit by difficulty and turns your week into one honest number.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <StartCta size="lg" />
            <a
              href="#race"
              onClick={(e) => {
                e.preventDefault();
                onSeeScoring();
              }}
              className="inline-flex h-11 items-center text-[15px] font-semibold text-lane underline decoration-lane-line-strong underline-offset-[6px] transition-colors hover:decoration-lane"
            >
              See how it's scored
            </a>
          </div>
        </div>

        <ResultsBoard className="w-full md:w-[19.5rem]">
          <div className="flex items-center justify-between gap-4 px-5 py-4 md:flex-col md:items-stretch md:gap-3 md:py-5">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-lane-mute">
                <span>Discipline Index</span>
                <span className="rounded-[4px] border border-lane-line-strong px-1.5 py-px text-[10px] tracking-[0.14em] text-lane-dim">
                  Sample
                </span>
              </div>
              <StatusTag status={status} className="w-fit" />
            </div>
            <BoardNumber
              value={SAMPLE_DI}
              pad={3}
              flipOnMount
              mountDelay={0.35}
              className="text-[60px] text-lane md:self-end md:text-[88px]"
            />
          </div>
        </ResultsBoard>
      </div>

      {/* The track: lower ~60% of the viewport, full bleed. */}
      <div className="tartan relative flex min-h-[50dvh] flex-1 flex-col overflow-hidden md:min-h-[56dvh]">
        {[1, 2, 3, 4].map((lane) => (
          <div key={lane} className="relative flex flex-1 items-center border-t-[3px] border-lane/85 last:border-b-[3px]">
            <span
              aria-hidden
              className="font-display w-[3.75rem] select-none text-center text-[clamp(3.25rem,10dvh,7.5rem)] leading-none text-lane/90 sm:w-[6.5rem] md:w-[9rem]"
            >
              {lane}
            </span>
          </div>
        ))}
        {/* Start line just past the painted numerals, finish line near the right edge. */}
        <span aria-hidden className="absolute inset-y-0 left-[3.75rem] w-[3px] bg-lane/85 sm:left-[6.5rem] md:left-[9rem]" />
        <span aria-hidden className="absolute inset-y-0 right-[6%] hidden w-[3px] bg-lane/60 sm:block" />

        <h1
          id="hero-title"
          className="font-display pointer-events-none absolute left-[calc(3.75rem+1rem)] right-4 top-1/2 -translate-y-1/2 text-[clamp(3rem,13vw,4.25rem)] uppercase leading-[0.9] text-lane sm:left-[calc(6.5rem+1.75rem)] sm:text-[clamp(4rem,9vw,5.5rem)] md:left-[calc(9rem+2.5rem)] lg:text-[6rem]"
        >
          Discipline,
          <br className="lg:hidden" /> scored.
        </h1>
      </div>
    </section>
  );
}
