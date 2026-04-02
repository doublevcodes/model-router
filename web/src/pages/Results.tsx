import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { BenchmarkRun, ModelSummary, BenchmarkResult } from '../types';
import ModelTable from '../components/ModelTable';
import ScoreChart from '../components/ScoreChart';
import RadarChart from '../components/RadarChart';
import ScatterPlot from '../components/ScatterPlot';

interface RunDetail {
  run: {
    id: string;
    use_case?: string;
    useCase?: string;
    status: string;
    created_at?: string;
    createdAt?: string;
    completed_at?: string | null;
    completedAt?: string | null;
  };
  summaries: ModelSummary[];
  detailed: BenchmarkResult[];
}

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/runs/${id}/results`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load results');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-switchboard-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 text-lg mb-4">{error || 'No data found'}</p>
        <Link to="/" className="text-switchboard-accent hover:underline">
          Back to benchmarks
        </Link>
      </div>
    );
  }

  const { run, summaries, detailed } = data;
  const useCase = run.use_case || run.useCase || 'Unknown';
  const createdAt = run.created_at || run.createdAt || '';
  const winner = summaries[0];

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <Link
          to="/"
          className="text-sm text-gray-500 hover:text-switchboard-accent-light transition-colors mb-4 inline-block"
        >
          &larr; All benchmarks
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">{useCase}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <StatusBadge status={run.status} />
          {createdAt && (
            <span>
              {new Date(createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          <span className="font-mono text-xs text-gray-500">{id}</span>
        </div>
      </div>

      {winner && (
        <div className="animate-fade-in animate-fade-in-delay-1 bg-gradient-to-r from-switchboard-accent/10 via-switchboard-card to-switchboard-card border border-switchboard-accent/20 rounded-xl p-6">
          <div className="text-xs uppercase tracking-wider text-switchboard-accent-light mb-3 font-medium">
            Best performing model
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">{winner.modelName}</h2>
              <p className="text-gray-400 text-sm font-mono mt-1">
                {winner.modelId}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-switchboard-accent-light">
                {winner.overallScore.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500 uppercase">score / 100</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-switchboard-border">
            <Stat label="Safety" value={winner.safetyScore ? `${Math.round(winner.safetyScore)}` : 'N/A'} />
            <Stat label="Avg Latency" value={`${winner.avgLatencyMs.toLocaleString()}ms`} />
            <Stat label="Avg Tokens" value={winner.avgTokensOut.toLocaleString()} />
          </div>
        </div>
      )}

      <div className="animate-fade-in animate-fade-in-delay-2">
        <ModelTable summaries={summaries} detailed={detailed} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in animate-fade-in-delay-3">
        <ScoreChart summaries={summaries} />
        <RadarChart summaries={summaries} />
      </div>

      <div className="animate-fade-in animate-fade-in-delay-3">
        <ScatterPlot summaries={summaries} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    running: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    pending: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
    failed: 'bg-red-500/15 text-red-400 border-red-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
