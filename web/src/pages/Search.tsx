import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { BenchmarkRunRow } from '../types';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import { RunListSkeleton } from '../components/Skeleton';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputFocused, setInputFocused] = useState(false);

  const url = debouncedQuery.trim()
    ? `/api/search?q=${encodeURIComponent(debouncedQuery.trim())}`
    : '/api/runs';

  const { data, loading, error, retry } = useFetch<{ runs: BenchmarkRunRow[] }>(
    url,
    { keepPreviousData: true },
  );
  const runs = data?.runs || [];

  useEffect(() => {
    const next: Record<string, string> = {};
    if (debouncedQuery.trim()) next.q = debouncedQuery.trim();
    setParams(next, { replace: true });
  }, [debouncedQuery, setParams]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const statusBadge = (status: string) => {
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
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Benchmark Runs</h1>
        <p className="text-gray-400">
          Browse shared benchmark results from the community.
        </p>
      </div>

      <div className="relative mb-6">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Search use cases..."
            className="w-full bg-switchboard-card border border-switchboard-border rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-switchboard-accent/50 focus:border-switchboard-accent pr-10"
          />
          {!inputFocused && !query && (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-gray-500 border border-switchboard-border rounded bg-switchboard-bg">
              /
            </kbd>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-center justify-between">
          <span className="text-red-400 text-sm">{error}</span>
          <button
            onClick={retry}
            className="text-sm text-red-400 hover:text-red-300 font-medium underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {loading && !data ? (
        <RunListSkeleton />
      ) : runs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">
            {query.trim()
              ? 'No matching benchmarks found'
              : 'No benchmark runs found'}
          </p>
          <p className="text-sm">
            {query.trim()
              ? 'Try a different search term.'
              : 'Use the Switchboard MCP in Cursor to create your first benchmark.'}
          </p>
        </div>
      ) : (
        <div
          className={`space-y-3 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}
        >
          {runs.map((run) => (
            <Link
              key={run.id}
              to={`/runs/${run.id}`}
              className="block bg-switchboard-card border border-switchboard-border rounded-xl p-5 hover:border-switchboard-accent/30 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-medium group-hover:text-switchboard-accent-light transition-colors">
                    {run.use_case}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>
                      {new Date(run.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="font-mono">{run.id.slice(0, 8)}</span>
                  </div>
                </div>
                {statusBadge(run.status)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
