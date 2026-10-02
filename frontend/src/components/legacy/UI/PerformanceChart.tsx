import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface TrendDataPoint {
  date: string;
  score: number | null;
}

interface PerformanceChartProps {
  data: TrendDataPoint[];
  height?: number;
}

export const PerformanceChart = ({ data, height = 220 }: PerformanceChartProps) => {
  const chartTooltipStyle = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    fontSize: '0.75rem',
    color: 'var(--text-primary)',
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="99%" height="100%">
        <AreaChart 
          data={data}
          margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            tick={{ fill: '#525252', fontSize: 10 }}
            axisLine={{ stroke: '#333' }}
            tickLine={false}
            interval={6} 
          />
          <YAxis 
            tick={{ fill: '#525252', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={chartTooltipStyle}
            formatter={(value: any) => [`${value}%`, 'Score']}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--accent-primary)"
            strokeWidth={2}
            fill="url(#scoreGradient)"
            dot={{ r: 4, strokeWidth: 0, fill: 'var(--accent-primary)' }}
            activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--accent-primary)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
