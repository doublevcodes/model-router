import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ModelSummary } from '../types';

interface ScoreChartProps {
  summaries: ModelSummary[];
}

const COLORS = [
  '#6366f1',
  '#818cf8',
  '#a5b4fc',
  '#c7d2fe',
  '#ddd6fe',
  '#e9d5ff',
  '#f3e8ff',
  '#faf5ff',
  '#f5f3ff',
  '#ede9fe',
];

export default function ScoreChart({ summaries }: ScoreChartProps) {
  const data = [...summaries]
    .sort((a, b) => b.overallScore - a.overallScore)
    .map((s) => ({
      name: s.modelName.length > 20 ? s.modelName.slice(0, 18) + '...' : s.modelName,
      score: Math.round(s.overallScore * 10) / 10,
      fullName: s.modelName,
    }));

  return (
    <div className="bg-switchboard-card rounded-xl border border-switchboard-border p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
        Overall Scores
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(250, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={160}
            tick={{ fill: '#d1d5db', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#12121a',
              border: '1px solid #1e1e2e',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value: number, _name: string, props: any) => [
              `${value}/100`,
              props.payload.fullName,
            ]}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
