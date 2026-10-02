import { format, parseISO } from 'date-fns';
import { useReducedMotion } from 'motion/react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface TrendPoint {
  date: string;
  score: number | null;
  completion: number | null;
}

/* Chart roles: one series, so track red is the only data colour; axes and
   grid are recessive lane hairlines; text wears lane tokens. */
const C = {
  line: '#d4573b', // track-bright
  surface: '#08090b', // night-950, ring around the end dot
  grid: 'rgba(238, 234, 226, 0.11)', // lane-line
  axis: '#8a857d', // lane-mute
  avg: '#b3aea5', // lane-dim
  text: '#eeeae2', // lane
};

const short = (date: string) => format(parseISO(date), 'MMM d');

/* Daily weighted score over 30 days (straight segments: only the daily
   values are real), with the period average as a reference line keyed in the
   facts row below, and the latest value labelled at the end. Hover or arrow keys give a
   crosshair readout; every value is also in the table below the chart. */
export function TrendChart({ data, average }: { data: TrendPoint[]; average: number | null }) {
  const reduce = useReducedMotion();
  const known = data.filter((d): d is TrendPoint & { score: number } => d.score !== null);
  const last = known[known.length - 1];
  const ticks = [0, 7, 14, 21, 29].map(i => data[i]?.date).filter(Boolean) as string[];

  return (
    <div className="h-[260px] w-full min-w-0 sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 260 }}>
        <AreaChart data={data} margin={{ top: 24, right: 16, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="trend-wash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.line} stopOpacity={0.18} />
              <stop offset="100%" stopColor={C.line} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis
            dataKey="date"
            ticks={ticks}
            interval={0}
            tickFormatter={short}
            tick={{ fill: C.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: C.grid }}
            tickMargin={10}
            height={32}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tick={{ fill: C.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          {average !== null && (
            <ReferenceLine
              y={average}
              stroke={C.avg}
              strokeWidth={1}
            />
          )}
          <Tooltip
            cursor={{ stroke: 'rgba(238, 234, 226, 0.35)', strokeWidth: 1 }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as TrendPoint | undefined;
              if (!active || !point) return null;
              return (
                <div className="rounded-lg border border-lane-line-strong bg-night-850 px-3 py-2 shadow-[0_10px_24px_-8px_rgb(0_0_0/0.8)]">
                  {point.score === null ? (
                    <p className="text-[13px] text-lane-dim">{format(parseISO(point.date), 'EEE, MMM d')}: not reached yet</p>
                  ) : (
                    <>
                      <p className="flex items-baseline gap-2">
                        <span className="font-display text-[24px] leading-none text-lane">{point.score}</span>
                        <span className="text-[13px] text-lane-dim">score</span>
                        <span className="tabular text-[13px] text-lane-dim">{point.completion}% done</span>
                      </p>
                      <p className="mt-1 text-[12px] text-lane-mute">{format(parseISO(point.date), 'EEEE, MMM d')}</p>
                    </>
                  )}
                </div>
              );
            }}
          />
          <Area
            type="linear"
            dataKey="score"
            stroke={C.line}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="url(#trend-wash)"
            dot={false}
            activeDot={{ r: 5, fill: C.line, stroke: C.surface, strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={!reduce}
            animationDuration={900}
            animationEasing="ease-out"
          />
          {last && (
            <ReferenceDot
              x={last.date}
              y={last.score}
              r={5}
              fill={C.line}
              stroke={C.surface}
              strokeWidth={2}
              label={{ value: last.score, position: 'top', fill: C.text, fontSize: 14, fontWeight: 700, offset: 10 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
