import {
  RadarChart as RechartsRadar,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { ModelSummary } from '../types';

interface RadarChartProps {
  summaries: ModelSummary[];
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b'];

export default function RadarChart({ summaries }: RadarChartProps) {
  const top3 = summaries.slice(0, 3);

  if (top3.length === 0) return null;

  const latencies = summaries.map((s) => s.avgLatencyMs);
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  const latencyRange = maxLatency - minLatency;

  const data = [
    {
      metric: 'Accuracy',
      ...Object.fromEntries(top3.map((s) => [s.modelId, s.accuracyScore])),
    },
    {
      metric: 'Safety',
      ...Object.fromEntries(top3.map((s) => [s.modelId, s.safetyScore || 0])),
    },
    {
      metric: 'Speed',
      ...Object.fromEntries(
        top3.map((s) => [
          s.modelId,
          latencyRange > 0
            ? Math.round((1 - (s.avgLatencyMs - minLatency) / latencyRange) * 100)
            : 100,
        ])
      ),
    },
    {
      metric: 'Conciseness',
      ...Object.fromEntries(
        top3.map((s) => [
          s.modelId,
          Math.max(0, Math.min(100, 100 - s.avgTokensOut / 10)),
        ])
      ),
    },
  ];

  return (
    <div className="bg-switchboard-card rounded-xl border border-switchboard-border p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
        Top 3 Comparison
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <RechartsRadar data={data}>
          <PolarGrid stroke="#1e1e2e" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fill: '#4b5563', fontSize: 10 }}
            axisLine={false}
          />
          {top3.map((s, i) => (
            <Radar
              key={s.modelId}
              name={s.modelName}
              dataKey={s.modelId}
              stroke={COLORS[i]}
              fill={COLORS[i]}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          ))}
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#d1d5db' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#12121a',
              border: '1px solid #1e1e2e',
              borderRadius: '8px',
              color: '#fff',
              fontSize: 12,
            }}
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
