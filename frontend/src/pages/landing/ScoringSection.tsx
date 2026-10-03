import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import { DIFFICULTY_OPTIONS, WEIGHT_VALUE } from '../../design/habits';
import { Reveal } from './Reveal';

/* How the score works: the rule book, in the meet's vocabulary. The weight
   strip is drawn to scale, so 2.0x is visibly twice 1.0x. */
const BANDS = [
  { label: 'Critical', range: 'below 20', from: 0, to: 20, color: 'bg-dnf', text: 'text-dnf' },
  { label: 'Slipping', range: '20+', from: 20, to: 50, color: 'bg-amber', text: 'text-amber' },
  { label: 'Solid', range: '50+', from: 50, to: 80, color: 'bg-infield/70', text: 'text-infield' },
  { label: 'Elite', range: '80+', from: 80, to: 100, color: 'bg-infield', text: 'text-infield' },
];

export function ScoringSection() {
  return (
    <section aria-labelledby="rules-title" className="relative border-t border-lane-line pb-24 pt-28 md:pb-32 md:pt-36">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <Reveal>
          <h2 id="rules-title" className="font-display max-w-[18ch] text-[clamp(2.25rem,6vw,4rem)] uppercase">
            How a day becomes a number.
          </h2>
          <p className="mt-4 max-w-[60ch] text-[16px] text-lane-dim sm:text-[17px]">
            Every habit gets a difficulty when you add it. That weight decides how much of the day it is worth.
          </p>
        </Reveal>

        {/* Weights, drawn to scale. */}
        <Reveal delay={0.08} className="mt-12">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2" role="list" aria-label="Difficulty weights">
            {DIFFICULTY_OPTIONS.map((d) => (
              <div
                key={d.value}
                role="listitem"
                style={{ '--w': WEIGHT_VALUE[d.value] } as CSSProperties}
                className="tartan flex w-[calc(var(--w)*50%)] min-w-0 items-end justify-between gap-3 rounded-[6px] px-3 py-2.5 sm:w-auto sm:grow-[var(--w)] sm:basis-0 sm:flex-col sm:items-stretch sm:gap-6 sm:px-5 sm:py-4"
              >
                <span className="truncate text-[13px] font-semibold text-track-ink sm:text-[14px]">{d.label}</span>
                <span className="font-display tabular text-[30px] leading-none text-lane sm:text-[clamp(2rem,4.5vw,3.5rem)]">{d.detail}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.12} as="div">
          <dl className="mt-16 border-t border-lane-line">
          <Rule term="Daily score">
            <p>
              The weights of the habits you finished, divided by the weights of all your habits, times 100. Finish Gym (1.5) and Read
              (1.0) out of the sample's 5.7 total and the day scores 44.
            </p>
          </Rule>
          <Rule term="Discipline Index">
            <p>
              The average of your last 7 daily scores, today included as it stands. One good day can't carry a bad week, and one bad
              day can't sink a good one.
            </p>
          </Rule>
          <Rule term="Status">
            <p>Where the index lands on the board.</p>
            <div className="mt-5 max-w-[40rem]">
              <div className="flex h-2.5 gap-1" aria-hidden>
                {BANDS.map((b) => (
                  <span key={b.label} className={`${b.color} rounded-full`} style={{ flexGrow: b.to - b.from, flexBasis: 0 }} />
                ))}
              </div>
              <ul className="mt-3 flex gap-1 text-[13px]">
                {BANDS.map((b) => (
                  <li key={b.label} className="min-w-0" style={{ flexGrow: b.to - b.from, flexBasis: 0 }}>
                    <span className={`block font-semibold ${b.text}`}>{b.label}</span>
                    <span className="tabular block text-lane-mute">{b.range}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Rule>
          </dl>
        </Reveal>

        <Reveal delay={0.08}>
          <Link
            to="/how-it-works"
            className="mt-10 inline-flex h-11 items-center gap-2 text-[15px] font-semibold text-lane underline decoration-lane-line-strong underline-offset-[6px] transition-colors hover:decoration-lane"
          >
            Read the full rules
            <ArrowRight weight="bold" className="size-4" aria-hidden />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function Rule({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-lane-line py-7 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10 md:py-9">
      <dt className="font-display text-[26px] uppercase leading-none md:text-[32px]">{term}</dt>
      <dd className="max-w-[62ch] text-[16px] leading-relaxed text-lane-dim">{children}</dd>
    </div>
  );
}
