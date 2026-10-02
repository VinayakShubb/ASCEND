import { MISSED_COLOR, SCORE_STEPS } from './season';

/* Key for the day colours: neutral states first, then the score scale. */
export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-lane-dim">
      <span className="inline-flex items-center gap-2">
        <span className="size-3.5 rounded-[3px] border border-lane-line" aria-hidden />
        Not reached yet
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="size-3.5 rounded-[3px]" style={{ backgroundColor: MISSED_COLOR }} aria-hidden />
        Missed (nothing done)
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="size-3.5 rounded-[3px] ring-1 ring-inset ring-lane" aria-hidden />
        Today
      </span>
      <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-2">
        <span>Day score</span>
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-2">
          {SCORE_STEPS.map(step => (
            <span key={step.label} className="inline-flex items-center gap-1.5">
              <span className="size-3.5 rounded-[3px]" style={{ backgroundColor: step.color }} aria-hidden />
              <span className="tabular">{step.label}</span>
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}
