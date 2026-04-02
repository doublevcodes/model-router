import { useState, Fragment } from 'react';
import type { ModelSummary, BenchmarkResult } from '../types';
import SafetyBadge from './SafetyBadge';
import CopyButton from './CopyButton';

interface ModelTableProps {
  summaries: ModelSummary[];
  detailed?: BenchmarkResult[];
  selectedModels?: Set<string>;
  onToggleModel?: (modelId: string) => void;
}

type SortKey =
  | 'rank'
  | 'overallScore'
  | 'safetyScore'
  | 'avgLatencyMs'
  | 'avgTokensOut';

export default function ModelTable({
  summaries,
  detailed = [],
  selectedModels,
  onToggleModel,
}: ModelTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'avgLatencyMs' ? 'asc' : 'desc');
    }
  };

  const sorted = [...summaries].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1;
    return ((a[sortKey] ?? 0) - (b[sortKey] ?? 0)) * mul;
  });

  const bestScore = Math.max(...summaries.map((s) => s.overallScore), 1);

  const scoreColor = (score: number) => {
    if (score >= bestScore * 0.95) return 'text-emerald-400';
    if (score >= bestScore * 0.8) return 'text-blue-400';
    if (score >= bestScore * 0.6) return 'text-amber-400';
    return 'text-red-400';
  };

  const showCompare = !!onToggleModel;
  const colSpan = showCompare ? 7 : 6;

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      {label}
      {sortKey === field && (
        <span className="ml-1">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
      )}
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-switchboard-border">
      <table className="w-full">
        <thead className="bg-switchboard-card">
          <tr>
            {showCompare && (
              <th className="px-3 py-3 w-10">
                <span className="sr-only">Compare</span>
              </th>
            )}
            <SortHeader label="Rank" field="rank" />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Model
            </th>
            <SortHeader label="Score" field="overallScore" />
            <SortHeader label="Safety" field="safetyScore" />
            <SortHeader label="Latency" field="avgLatencyMs" />
            <SortHeader label="Tokens Out" field="avgTokensOut" />
          </tr>
        </thead>
        <tbody className="divide-y divide-switchboard-border">
          {sorted.map((summary) => {
            const modelResults = detailed.filter(
              (d) => d.modelId === summary.modelId,
            );
            const isExpanded = expandedModel === summary.modelId;
            const isSelected = selectedModels?.has(summary.modelId);
            const delta = summary.overallScore - bestScore;

            return (
              <Fragment key={summary.modelId}>
                <tr
                  className="hover:bg-switchboard-card/50 transition-colors cursor-pointer"
                  onClick={() =>
                    setExpandedModel(isExpanded ? null : summary.modelId)
                  }
                >
                  {showCompare && (
                    <td
                      className="px-3 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => onToggleModel!(summary.modelId)}
                        className="rounded border-switchboard-border bg-switchboard-bg text-switchboard-accent focus:ring-switchboard-accent/50 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        summary.rank === 1
                          ? 'bg-switchboard-accent text-white'
                          : summary.rank <= 3
                            ? 'bg-switchboard-accent/20 text-switchboard-accent-light'
                            : 'bg-switchboard-border text-gray-400'
                      }`}
                    >
                      {summary.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white text-sm">
                      {summary.modelName}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-500 font-mono">
                        {summary.modelId}
                      </span>
                      <CopyButton text={summary.modelId} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-lg font-bold ${scoreColor(summary.overallScore)}`}
                    >
                      {summary.overallScore.toFixed(1)}
                    </span>
                    {delta < -0.05 && (
                      <span className="ml-1.5 text-xs text-gray-500">
                        {delta.toFixed(1)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <SafetyBadge score={summary.safetyScore} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {summary.avgLatencyMs.toLocaleString()}ms
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {summary.avgTokensOut.toLocaleString()}
                  </td>
                </tr>
                {isExpanded && modelResults.length > 0 && (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-4 bg-switchboard-bg">
                      <div className="space-y-3">
                        <div className="text-xs font-medium text-gray-400 uppercase">
                          Per-test-case results
                        </div>
                        {modelResults.map((r) => (
                          <div
                            key={r.id}
                            className="bg-switchboard-card rounded-lg p-3 border border-switchboard-border"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-white">
                                Score: {r.score.toFixed(1)}
                              </span>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>{r.latencyMs}ms</span>
                                <span>{r.tokensOut} tokens</span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 mb-2">
                              {r.judgeReasoning}
                            </div>
                            {r.safetyScore != null && (
                              <div className="mb-2">
                                <SafetyBadge
                                  score={r.safetyScore}
                                  violations={r.safetyViolations}
                                />
                              </div>
                            )}
                            <details className="text-xs group/details">
                              <summary className="text-gray-500 cursor-pointer hover:text-gray-300">
                                Show output
                              </summary>
                              <div className="relative mt-2">
                                <div className="absolute top-2 right-2 z-10">
                                  <CopyButton text={r.output} label="Copy" />
                                </div>
                                <pre className="p-3 bg-switchboard-bg rounded text-gray-300 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed border border-switchboard-border">
                                  {r.output}
                                </pre>
                              </div>
                            </details>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
