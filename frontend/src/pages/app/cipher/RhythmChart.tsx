import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CipherAnalysis } from '../../../lib/api';
import { SectionHead } from './parts';

const BEST = 'var(--color-infield)';
const WORST = 'var(--color-dnf)';
const NEUTRAL = 'rgb(238 234 226 / 0.26)';

/* Weekly rhythm: average completion per weekday. Best day green, weakest red,
   the rest neutral. Each bar carries its value, so phones need no hover. */
export function RhythmSection({ analysis }: { analysis: CipherAnalysis }) {
  const hasData = analysis.weekdays.some(d => d.pct !== null);
  const data = analysis.weekdays.map(d => ({ day: d.day, pct: d.pct ?? 0, label: d.pct === null ? '' : `${d.pct}%` }));

  return (
    <section aria-labelledby="cipher-rhythm" className="border-t border-lane-line pt-10">
      <SectionHead id="cipher-rhythm" title="Weekly rhythm" sub="Average completion by weekday, last 8 weeks" />

      {hasData ? (
        <div className="h-[220px] w-full min-w-0 overflow-hidden" role="img" aria-label={analysis.weekdays.map(d => `${d.day} ${d.pct ?? 'no data'}${d.pct === null ? '' : '%'}`).join(', ')}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 220 }}>
            <BarChart data={data} margin={{ top: 24, right: 0, left: -28, bottom: 0 }} barCategoryGap="22%">
              <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: 'var(--color-lane-line-strong)' }} tick={{ fill: 'var(--color-lane-dim)', fontSize: 12 }} />
              <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-lane-mute)', fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: 'rgb(238 234 226 / 0.04)' }}
                contentStyle={{
                  background: 'var(--color-night-850)',
                  border: '1px solid var(--color-lane-line-strong)',
                  borderRadius: 10,
                  fontSize: 12,
                  color: 'var(--color-lane)',
                }}
                labelStyle={{ color: 'var(--color-lane-dim)' }}
                itemStyle={{ color: 'var(--color-lane)' }}
                formatter={value => [`${value}%`, 'Completion']}
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
                {data.map(d => (
                  <Cell key={d.day} fill={d.day === analysis.bestWeekday ? BEST : d.day === analysis.worstWeekday ? WORST : NEUTRAL} />
                ))}
                <LabelList dataKey="label" position="top" offset={8} fill="var(--color-lane-dim)" fontSize={12} className="tabular" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="border-y border-lane-line py-5 text-[14px] text-lane-mute">Your weekly rhythm appears after a week of tracking.</p>
      )}

      {analysis.rhythmExplain && <p className="mt-5 max-w-[68ch] text-[14px] text-lane-dim">{analysis.rhythmExplain}</p>}
      {analysis.bestWeekday && (
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-lane">
          <span className="rounded-full bg-infield/14 px-2.5 py-1 text-[12px] font-semibold text-infield">Best: {analysis.bestWeekday}</span>
          <span className="rounded-full bg-dnf/14 px-2.5 py-1 text-[12px] font-semibold text-dnf">Weakest: {analysis.worstWeekday}</span>
          {analysis.patternNote && <span>{analysis.patternNote}</span>}
        </p>
      )}
    </section>
  );
}
