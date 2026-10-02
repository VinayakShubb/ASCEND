import { StartCta } from './PublicChrome';

/* The final call: a start line painted on the track. */
export function CloseSection() {
  return (
    <section aria-labelledby="close-title" className="tartan relative overflow-hidden">
      {/* Lane lines frame the call, the start line crosses them. */}
      <span aria-hidden className="absolute inset-x-0 top-[12%] h-[3px] bg-lane/45" />
      <span aria-hidden className="absolute inset-x-0 bottom-[12%] h-[3px] bg-lane/45" />
      <span aria-hidden className="absolute inset-y-0 left-[8%] w-[6px] bg-lane/80 md:left-[12%]" />

      <div className="relative mx-auto flex max-w-[1400px] flex-col items-start gap-6 px-4 py-24 pl-[calc(8%+1.75rem)] sm:px-8 sm:pl-[calc(8%+2.5rem)] md:py-32 md:pl-[calc(12%+3rem)]">
        <h2 id="close-title" className="font-display text-[clamp(3rem,10vw,6rem)] uppercase text-lane">
          Take your mark.
        </h2>
        <p className="max-w-[40ch] text-[17px] leading-relaxed text-track-ink sm:text-[19px]">
          Free to use. Add your habits, check off today, and the board has your first score.
        </p>
        <StartCta size="lg" className="mt-2" />
      </div>
    </section>
  );
}
