import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import type { ModelSummary } from '../types';

interface ScatterPlotProps {
  summaries: ModelSummary[];
}

export default function ScatterPlot({ summaries }: ScatterPlotProps) {
  const data = summaries.map((s) => ({
    latency: s.avgLatencyMs,
    score: s.overallScore,
    name: s.modelName,
    tokens: s.avgTokensOut,
  }));

  return (
    <div className="bg-switchboard-card rounded-xl border border-switchboard-border p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
        Latency vs Quality
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
          <XAxis
            type="number"
            dataKey="latency"
            name="Latency"
            unit="ms"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            label={{
              value: 'Latency (ms)',
              position: 'bottom',
              fill: '#6b7280',
              fontSize: 12,
            }}
          />
          <YAxis
            type="number"
            dataKey="score"
            name="Score"
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            label={{
              value: 'Score',
              angle: -90,
              position: 'insideLeft',
              fill: '#6b7280',
              fontSize: 12,
            }}
          />
          <ZAxis
            type="number"
            dataKey="tokens"
            range={[40, 400]}
            name="Avg Tokens"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#12121a',
              border: '1px solid #1e1e2e',
              borderRadius: '8px',
              color: '#fff',
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => {
              if (name === 'Latency') return [`${value}ms`, name];
              if (name === 'Score') return [`${value}/100`, name];
              return [value, name];
            }}
            labelFormatter={(_: any, payload: any[]) =>
              payload?.[0]?.payload?.name || ''
            }
          />
          <Scatter data={data} fill="#6366f1" fillOpacity={0.8} />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Dot size represents average tokens generated. Top-left is ideal (fast + high quality).
      </p>
    </div>
  );
}
