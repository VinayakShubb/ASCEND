import { CipherAvatar } from '../../components/brand/CipherAvatar';
import { CIPHER_SAMPLE, SAMPLE_HABITS } from './sampleWeek';

const POINTS = [
  'Every number is computed from your check-offs — never guessed.',
  'It names what moved your index, and the one move that lifts it.',
  'Honest, not hype: it calls the problem and the fix, plainly.',
];

/* CIPHER, the analyst: an official result sheet in lane white on the night
   ground. The lines are computed from the sample week with the backend's
   rules; only the coach note is the kind of text the AI writes. */
export function CipherSection() {
  return (
    <section aria-labelledby="cipher-title" className="relative pb-28 pt-28 md:pb-36 md:pt-40">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-20">
        <div className="flex flex-col items-start lg:pt-6">
          <CipherAvatar mood="solid" size="lg" />
          <h2 id="cipher-title" className="font-display mt-7 text-[clamp(2.25rem,6vw,4rem)] uppercase">
            CIPHER reads the sheet.
          </h2>
          <p className="mt-4 max-w-[46ch] text-[16px] leading-relaxed text-lane-dim sm:text-[17px]">
            Your analyst. It reads the same figures you see and tells you what they mean — like an honest coach, not a chatbot.
          </p>
          <ul className="mt-7 flex flex-col gap-3.5 border-t border-lane-line pt-6">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[15px] leading-snug text-lane">
                <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-track-bright" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <article
          aria-label="Sample CIPHER result sheet"
          className="relative rounded-[4px] bg-lane px-5 py-7 text-night-950 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] sm:px-10 sm:py-10 lg:-rotate-[0.6deg]"
        >
          <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-night-950 pb-5">
            <div>
              <h3 className="font-display text-[30px] uppercase leading-none sm:text-[38px]">Result sheet</h3>
              <p className="mt-2 text-[14px] text-night-700">
                {SAMPLE_HABITS.length} habits, Monday to Sunday
              </p>
            </div>
            <span className="rounded-[3px] border-2 border-track-deep px-2 py-1 text-[12px] font-bold uppercase tracking-[0.14em] text-track-deep">
              Sample
            </span>
          </header>

          <dl>
            {CIPHER_SAMPLE.lines.map((line) => (
              <div key={line.label} className="grid gap-1 border-b border-night-950/12 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
                <dt className="font-display text-[17px] uppercase leading-tight text-track-deep sm:text-[19px]">{line.label}</dt>
                <dd className="tabular text-[15px] leading-relaxed text-night-900 sm:text-[16px]">{line.text}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-col gap-2">
            <p className="text-[16px] italic leading-relaxed text-night-900 sm:text-[17px]">
              “Read 20 pages is automatic now. The week was decided by Deep work 2h: both days it slipped, the day scored under 45.
              Give it a fixed slot on Wednesday and Friday.”
            </p>
            <p className="text-[13px] text-night-700">Coach note, written by CIPHER. The figures above are calculated, never generated.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
