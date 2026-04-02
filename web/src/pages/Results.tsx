import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { ModelSummary, BenchmarkResult, TestCase } from '../types';
import { useFetch } from '../hooks/useFetch';
import { ResultsSkeleton } from '../components/Skeleton';
import CopyButton from '../components/CopyButton';
import ModelTable from '../components/ModelTable';
import ScoreChart from '../components/ScoreChart';
import RadarChart from '../components/RadarChart';
import ScatterPlot from '../components/ScatterPlot';

interface RunDetail {
  run: {
    id: string;
    use_case?: string;
    useCase?: string;
    use_case_slug?: string;
    status: string;
    created_at?: string;
    createdAt?: string;
    completed_at?: string | null;
    completedAt?: string | null;
  };
  summaries: ModelSummary[];
  detailed: BenchmarkResult[];
  testCases?: TestCase[];
}

export default function Results() {
  const { id } = useParams<{ id: string }>();

  const [refreshInterval, setRefreshInterval] = useState<number | undefined>();
  const { data, loading, error, retry } = useFetch<RunDetail>(
    id ? `/api/runs/${id}/results` : null,
    { refreshInterval },
  );

  useEffect(() => {
    setRefreshInterval(data?.run?.status === 'running' ? 10_000 : undefined);
  }, [data?.run?.status]);

  // Comparison mode
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      return next;
    });
  };

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // JSON copy feedback
  const [jsonCopied, setJsonCopied] = useState(false);

  if (loading && !data) return <ResultsSkeleton />;

  if (error && !data) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 text-lg mb-4">{error}</p>
        <button
          onClick={retry}
          className="text-switchboard-accent hover:text-switchboard-accent-light font-medium underline underline-offset-2"
        >
          Try again
        </button>
        <div className="mt-4">
          <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm">
            &larr; Back to benchmarks
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { run, summaries, detailed, testCases = [] } = data;
  const useCase = run.use_case || run.useCase || 'Unknown';
  const createdAt = run.created_at || run.createdAt || '';
  const slug =
    run.use_case_slug || useCase.toLowerCase().replace(/\s+/g, '-');

  // Categories derived from test cases
  const categoryMap = new Map(testCases.map((tc) => [tc.id, tc.category]));
  const categories = [...new Set(testCases.map((tc) => tc.category))];

  // Filtered detailed results (by category)
  const filteredDetailed = selectedCategory
    ? detailed.filter(
        (d) => categoryMap.get(d.testCaseId) === selectedCategory,
      )
    : detailed;

  // Chart summaries filtered by comparison selection
  const chartSummaries =
    selectedModels.size > 0
      ? summaries.filter((s) => selectedModels.has(s.modelId))
      : summaries;

  const winner = summaries[0];
  const runnerUp = summaries[1];
  const leadMargin =
    winner && runnerUp
      ? winner.overallScore - runnerUp.overallScore
      : null;

  // Export helpers
  const exportCSV = () => {
    const escape = (v: unknown) => {
      const s = String(v);
      return s.includes(',') || s.includes('"')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const headers = [
      'Rank',
      'Model',
      'Model ID',
      'Score',
      'Accuracy',
      'Safety',
      'Avg Latency (ms)',
      'Avg Tokens Out',
    ];
    const rows = summaries.map((s) =>
      [
        s.rank,
        s.modelName,
        s.modelId,
        s.overallScore.toFixed(1),
        s.accuracyScore.toFixed(1),
        s.safetyScore ?? 'N/A',
        s.avgLatencyMs,
        s.avgTokensOut,
      ]
        .map(escape)
        .join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `switchboard-${slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJSON = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  const isInProgress = run.status === 'running' || run.status === 'pending';

  return (
    <div className="animate-fade-in space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          to="/"
          className="text-gray-500 hover:text-switchboard-accent-light transition-colors"
        >
          Benchmarks
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-gray-400 truncate">{useCase}</span>
      </div>

      {/* Header */}
      <div>
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
          <span className="flex items-center gap-1.5 font-mono text-xs text-gray-500">
            {id?.slice(0, 8)}
            <CopyButton text={id || ''} />
          </span>
        </div>
      </div>

      {/* In-progress banner */}
      {run.status === 'running' && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full" />
            <div>
              <p className="text-blue-400 font-medium text-sm">
                Benchmark in progress
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                Auto-refreshing every 10 seconds
              </p>
            </div>
          </div>
        </div>
      )}

      {summaries.length === 0 ? (
        /* Empty state for in-progress or failed benchmarks */
        <div className="text-center py-12">
          {isInProgress ? (
            <>
              <p className="text-gray-400 text-lg mb-1">
                Waiting for results...
              </p>
              <p className="text-gray-500 text-sm">
                Models are being evaluated. Results will appear here as they
                come in.
              </p>
            </>
          ) : run.status === 'failed' ? (
            <>
              <p className="text-red-400 text-lg mb-1">Benchmark failed</p>
              <p className="text-gray-500 text-sm">
                This benchmark did not complete successfully.
              </p>
            </>
          ) : (
            <p className="text-gray-500 text-lg">No results available.</p>
          )}
        </div>
      ) : (
        <>
          {/* Winner card */}
          {winner && (
            <div className="animate-fade-in animate-fade-in-delay-1 bg-gradient-to-r from-switchboard-accent/10 via-switchboard-card to-switchboard-card border border-switchboard-accent/20 rounded-xl p-6">
              <div className="text-xs uppercase tracking-wider text-switchboard-accent-light mb-3 font-medium">
                Best performing model
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {winner.modelName}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-gray-400 text-sm font-mono">
                      {winner.modelId}
                    </p>
                    <CopyButton text={winner.modelId} />
                  </div>
                  {leadMargin != null && leadMargin > 0 && (
                    <p className="text-gray-500 text-sm mt-2">
                      {leadMargin.toFixed(1)} points ahead of{' '}
                      {runnerUp!.modelName}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-switchboard-accent-light">
                    {winner.overallScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 uppercase">
                    score / 100
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-switchboard-border">
                <Stat
                  label="Safety"
                  value={
                    winner.safetyScore
                      ? `${Math.round(winner.safetyScore)}`
                      : 'N/A'
                  }
                />
                <Stat
                  label="Avg Latency"
                  value={`${winner.avgLatencyMs.toLocaleString()}ms`}
                />
                <Stat
                  label="Avg Tokens"
                  value={winner.avgTokensOut.toLocaleString()}
                />
              </div>
            </div>
          )}

          {/* Toolbar: category filter + export */}
          <div className="animate-fade-in animate-fade-in-delay-2 flex flex-wrap items-center justify-between gap-4">
            {categories.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">
                  Category
                </span>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    !selectedCategory
                      ? 'bg-switchboard-accent text-white'
                      : 'bg-switchboard-card text-gray-400 hover:text-white border border-switchboard-border'
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === cat ? null : cat,
                      )
                    }
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-switchboard-accent text-white'
                        : 'bg-switchboard-card text-gray-400 hover:text-white border border-switchboard-border'
                    }`}
                  >
                    {cat.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-switchboard-card border border-switchboard-border rounded-lg transition-colors"
              >
                <DownloadIcon />
                Export CSV
              </button>
              <button
                onClick={copyJSON}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-switchboard-card border border-switchboard-border rounded-lg transition-colors"
              >
                {jsonCopied ? (
                  <>
                    <CheckIcon />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <ClipboardIcon />
                    Copy JSON
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Comparison mode indicator */}
          {selectedModels.size > 0 && (
            <div className="flex items-center justify-between bg-switchboard-accent/10 border border-switchboard-accent/20 rounded-lg px-4 py-2.5">
              <span className="text-sm text-switchboard-accent-light">
                Comparing {selectedModels.size} of {summaries.length} models
                &mdash; charts filtered
              </span>
              <button
                onClick={() => setSelectedModels(new Set())}
                className="text-xs text-gray-400 hover:text-white transition-colors font-medium"
              >
                Show all
              </button>
            </div>
          )}

          {/* Model table (always shows all models for selection) */}
          <div className="animate-fade-in animate-fade-in-delay-2">
            <ModelTable
              summaries={summaries}
              detailed={filteredDetailed}
              selectedModels={selectedModels}
              onToggleModel={toggleModel}
            />
          </div>

          {/* Charts (filtered by comparison selection) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in animate-fade-in-delay-3">
            <ScoreChart summaries={chartSummaries} />
            <RadarChart summaries={chartSummaries} />
          </div>

          <div className="animate-fade-in animate-fade-in-delay-3">
            <ScatterPlot summaries={chartSummaries} />
          </div>
        </>
      )}
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
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[status] || styles.pending}`}
    >
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

function DownloadIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 text-emerald-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
